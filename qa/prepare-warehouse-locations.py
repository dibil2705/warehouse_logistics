"""One-time, cached address lookup; never runs in the visitor's browser."""
import json
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'tmp' / 'warehouse-geocoding-cache.json'

class Addresses(HTMLParser):
    def __init__(self):
        super().__init__(); self.inside = False; self.item = None; self.rows = []
    def handle_starttag(self, tag, attrs):
        if tag == 'details' and 's-addresses' in dict(attrs).get('class', '').split(): self.inside = True
        if tag == 'li' and self.inside: self.item = ''
    def handle_data(self, data):
        if self.item is not None: self.item += data
    def handle_endtag(self, tag):
        if tag == 'li' and self.item is not None: self.rows.append(self.item.strip()); self.item = None
        if tag == 'details': self.inside = False

parser = Addresses(); parser.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
addresses = parser.rows
if len(addresses) == 25:
    addresses[9:11] = [' '.join(addresses[9:11])]
assert len(addresses) == 24
queries = [
    ('Бутово', 'Москва улица Поляны 50', 'Москва улица Поляны'),
    ('Саларьево', 'Саларьево Москва', 'Саларьево'),
    ('Подолино', 'Подолино Московская область', 'Подолино'),
    ('Ленинградское шоссе · Елино', 'Елино Химки', 'Елино Ленинградское шоссе'),
    ('Мытищи · Хлебозаводская', 'Мытищи Хлебозаводская улица 4', 'Мытищи Хлебозаводская улица'),
    ('Видное', 'Видное Северная промзона', 'Видное'),
    ('Одинцово', 'Одинцово Внуковская улица', 'Одинцово'),
    ('Белые Столбы', 'Белые Столбы Домодедово', 'Белые Столбы'),
    ('Дмитров · Левонабережная, 20', 'Дмитров 2-я Левонабережная улица 20', 'Дмитров Левонабережная'),
    ('Горки · Дмитровский округ', 'Горки Дмитровский городской округ', 'Горки Дмитров'),
    ('Дмитров · Левонабережная, 12', 'Дмитров 2-я Левонабережная улица 12', 'Дмитров Левонабережная'),
    ('Смирновское', 'Смирновка Солнечногорск', 'Солнечногорск'),
    ('Клязьма', 'Химки Клязьма 14Н', 'Химки Клязьма'),
    ('Мытищи · Волковское шоссе', 'Мытищи Волковское шоссе 5А', 'Мытищи Волковское шоссе'),
    ('Новосельцево', 'Новосельцево Мытищи', 'Новосельцево'),
    ('Моносеево', 'Моносеево Щёлково', 'Моносеево'),
    ('Запрудня', 'Запрудня улица Ленина 1', 'Запрудня'),
    ('Горки Ленинские', 'Горки Ленинские Западная улица', 'Горки Ленинские'),
    ('Давыдовское', 'Давыдовское Истра', 'Давыдовское'),
    ('Обухово · Атлант-Парк', 'Обухово Атлант Парк', 'Обухово Богородский округ'),
    ('Сынково', 'Сынково Подольск', 'Сынково'),
    ('Домодедово · Южные ворота', 'Домодедово Южные врата', 'Белые Столбы Склады 104'),
    ('Лешково', 'Лешково Истра', 'Лешково'),
    ('Химки · Заводская', 'Химки Заводская улица 9', 'Химки Заводская улица'),
]
cache = json.loads(CACHE.read_text(encoding='utf-8')) if CACHE.exists() else {}

def lookup(query):
    if query not in cache:
        params = urlencode({'q': query, 'limit': 5, 'bbox': '36,54.5,39,57', 'lat': 55.75, 'lon': 37.6})
        req = Request('https://photon.komoot.io/api/?' + params, headers={'User-Agent': 'LadskladAddressPreparation/1.0'})
        try:
            with urlopen(req, timeout=20) as response: cache[query] = json.load(response)
        except Exception as error:
            print(f'Lookup failed: {query}: {error}', flush=True)
            return []
        CACHE.parent.mkdir(exist_ok=True)
        CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding='utf-8')
        time.sleep(1.1)
    return [f for f in cache[query].get('features', []) if 36 <= f['geometry']['coordinates'][0] <= 39 and 54.5 <= f['geometry']['coordinates'][1] <= 57]

rows = []
for i, ((name, query, fallback), address) in enumerate(zip(queries, addresses), 1):
    matches = lookup(query) or lookup(fallback)
    if not matches: raise RuntimeError(f'No location for {name}; inspect this address manually.')
    if i == 10:
        matches = [f for f in matches if 'посёлок дома отдыха' in f['properties'].get('name', '')] or matches
    feature = matches[0]; lon, lat = feature['geometry']['coordinates']
    properties = feature['properties']
    source_url = None
    if i == 3:
        lat, lon = 55.948730, 37.272567
        source_url = 'https://rit.ru/kontakty'
    elif i == 4:
        source_url = 'https://kikown.ru/derevnya-elino-34-km-leningradskoe-21/'
    rows.append({'id': f'warehouse-{i:02}', 'name': name, 'address': address,
                 'lat': lat, 'lon': lon, 'approximate': True,
                 'source': 'OpenStreetMap / Photon', 'osmType': properties.get('osm_type'),
                 'osmId': properties.get('osm_id'), 'matchedAddress': properties,
                 'additionalSourceUrl': source_url})
    print(f'{i:02} {name}: {lat:.5f}, {lon:.5f} ({properties.get("name", properties.get("street", ""))})', flush=True)
(ROOT / 'assets' / 'warehouses.json').write_text(json.dumps({'networkTotal': 24, 'locations': rows, 'coordinateNote': 'Ориентировочное расположение по опубликованным адресам', 'preparedDate': '2026-11-09'}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
