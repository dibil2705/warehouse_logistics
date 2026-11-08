from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
base = (root / 'rocket.html').read_text(encoding='utf-8')
for slug, label in [('mint','Мятная палитра'),('orange','Оранжевая палитра')]:
    s = base.replace('<body class="rocket-page">', f'<body class="rocket-page palette-page palette-{slug}">')
    s = s.replace('<title>Паллетика — находим склад для роста вашего бизнеса</title>', f'<title>Паллетика — {label.lower()}</title>')
    s = s.replace('  <script src="rocket.js" defer>', '  <link rel="stylesheet" href="palette-variants.css?v=1">\n  <script src="rocket.js" defer>')
    links = '<span>ПАЛИТРА</span><a href="rocket.html">← Дизайн 02</a>'
    for name, text in [('mint','Мятная'),('orange','Оранжевая')]:
        current = ' aria-current="page"' if name == slug else ''
        links += f'<a href="rocket-{name}.html"{current}>{text}</a>'
    s = re.sub(r'(<nav class="version-switcher"[^>]*>).*?(</nav>)', lambda m:m[1]+links+m[2], s, count=1, flags=re.S)
    if slug == 'mint':
        s = s.replace('content="#edeeef"','content="#f4f7f5"')
        s = s.replace('assets/rocket-logistics.png', 'assets/rocket-logistics-mint.png')
        s = s.replace('Оранжевый складской погрузчик', 'Мятный складской погрузчик')
    else:
        s = s.replace('assets/palletika/symbol-transparent.svg','assets/palletika/symbol-orange.svg')
    (root / f'rocket-{slug}.html').write_text(s,encoding='utf-8')

# The orange study uses the site's accent in the same transparent vector mark.
symbol = (root/'assets/palletika/symbol-transparent.svg').read_text(encoding='utf-8')
(root/'assets/palletika/symbol-orange.svg').write_text(symbol.replace('#82dbbf','#ef532b'),encoding='utf-8')

# Add one entry from the original second version; the first design stays separate.
p=root/'rocket.html'
s=p.read_text(encoding='utf-8').replace('>02 · Новый</a></nav>', '>02 · Новый</a><a href="rocket-mint.html">Цвета ↗</a></nav>')
p.write_text(s,encoding='utf-8')
