"""Build local dotted geography from Natural Earth; no tile service at runtime."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'tmp' / 'map-geography'

def albers(lon, lat):
    if lon < 0: lon += 360
    phi, lam = math.radians(lat), math.radians(lon - 100)
    n = (math.sin(math.radians(50)) + math.sin(math.radians(70))) / 2
    c = math.cos(math.radians(50)) ** 2 + 2 * n * math.sin(math.radians(50))
    rho = math.sqrt(max(0, c - 2 * n * math.sin(phi))) / n
    return rho * math.sin(n * lam), rho * math.cos(n * lam)

def regional(lon, lat):
    return lon * math.cos(math.radians(56)), -lat

def polygons(feature):
    g = feature['geometry']
    return g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]

def simplify(points, tolerance=.6):
    if len(points) < 4: return points
    first, last = points[0], points[-1]
    dx, dy = last[0] - first[0], last[1] - first[1]
    length = dx * dx + dy * dy
    def distance(p):
        t = max(0, min(1, ((p[0] - first[0]) * dx + (p[1] - first[1]) * dy) / length)) if length else 0
        return (p[0] - first[0] - t * dx) ** 2 + (p[1] - first[1] - t * dy) ** 2
    index = max(range(1, len(points) - 1), key=lambda i: distance(points[i]))
    if distance(points[index]) <= tolerance * tolerance: return [first, last]
    return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)

def inside_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i, (xi, yi) in enumerate(ring):
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
        j = i
    return inside

def build(features, projection, box, step):
    projected = [[[projection(*p[:2]) for p in ring] for ring in poly] for f in features for poly in polygons(f)]
    flat = [p for poly in projected for p in poly[0]]
    min_x, max_x = min(p[0] for p in flat), max(p[0] for p in flat)
    min_y, max_y = min(p[1] for p in flat), max(p[1] for p in flat)
    bx, by, bw, bh = box
    scale = min(bw / (max_x - min_x), bh / (max_y - min_y))
    ox, oy = bx + (bw - (max_x - min_x) * scale) / 2, by + (bh - (max_y - min_y) * scale) / 2
    def fit(lon, lat):
        x, y = projection(lon, lat)
        return [round(ox + (x - min_x) * scale, 2), round(oy + (y - min_y) * scale, 2)]
    shapes = []
    for poly in projected:
        rings = [simplify([(ox + (x - min_x) * scale, oy + (y - min_y) * scale) for x, y in ring]) for ring in poly]
        outer = rings[0]
        shapes.append((rings, (min(p[0] for p in outer), min(p[1] for p in outer), max(p[0] for p in outer), max(p[1] for p in outer))))
    dots = []
    row = 0
    y = by
    while y <= by + bh:
        x = bx + (step / 2 if row % 2 else 0)
        while x <= bx + bw:
            for rings, bounds in shapes:
                if bounds[0] <= x <= bounds[2] and bounds[1] <= y <= bounds[3] and inside_ring(x, y, rings[0]) and not any(inside_ring(x, y, hole) for hole in rings[1:]):
                    dots.append([round(x, 1), round(y, 1)])
                    break
            x += step
        row += 1
        y += step * .866
    return dots, fit

countries = json.loads((SOURCE / 'countries.geojson').read_text(encoding='utf-8'))['features']
regions = json.loads((SOURCE / 'regions.geojson').read_text(encoding='utf-8'))['features']
russia = [f for f in countries if f['properties'].get('ADM0_A3') == 'RUS']
moscow = [f for f in regions if f['properties'].get('adm0_a3') == 'RUS' and f['properties'].get('name') in ('Moskovskaya', 'Moskva')]
assert len(russia) == 1 and len(moscow) == 2
country_dots, country_fit = build(russia, albers, (35, 140, 930, 375), 6.8)
region_dots, region_fit = build(moscow, regional, (95, 125, 810, 390), 6.5)
warehouses = json.loads((ROOT / 'assets' / 'warehouses.json').read_text(encoding='utf-8'))['locations']
data = {
    'country': {'dots': country_dots, 'moscow': country_fit(37.6173, 55.7558), 'cities': [
        {'name': name, 'point': country_fit(lon, lat)} for name, lon, lat in [
            ('Санкт-Петербург', 30.3159, 59.9391), ('Екатеринбург', 60.5975, 56.8389),
            ('Новосибирск', 82.9204, 55.0302), ('Владивосток', 131.8855, 43.1155)]]},
    'region': {'dots': region_dots, 'moscow': region_fit(37.6173, 55.7558), 'locations': [
        {'id': row['id'], 'point': region_fit(row['lon'], row['lat'])} for row in warehouses]},
    'source': 'Natural Earth: 1:110m countries; 1:10m administrative regions, public domain',
    'sourceUrl': 'https://www.naturalearthdata.com/'
}
assert len(country_dots) > 1500 and len(region_dots) > 1500
assert len(data['region']['locations']) == 24
(ROOT / 'assets' / 'russia-dot-map.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Russia: {len(country_dots)} dots; Moscow region: {len(region_dots)} dots; {len(warehouses)} locations')
