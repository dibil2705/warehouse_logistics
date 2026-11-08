from pathlib import Path
import re
import shutil
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
source = root / 'materials/palletika-2026-11-02'
assets = root / 'assets/palletika'
assets.mkdir(parents=True, exist_ok=True)
original = (source / '92790153 (1).svg').read_text(encoding='utf-8')
# Preserve the supplied artwork and its embedded JPEG. Only the viewport trims
# empty margins; the mark, lettering, colours and relative positions are intact.
for name, box, width, height in [
    ('logo.svg', '60 104 381 298', '381', '298'),
    ('symbol.svg', '168 126 165 165', '165', '165'),
]:
    svg = re.sub(r'<!DOCTYPE[^>]*>', '', original)
    svg = svg.replace('width="500" height="500" viewBox="0 0 500 500"', f'width="{width}" height="{height}" viewBox="{box}"')
    ET.fromstring(svg)
    (assets / name).write_text(svg, encoding='utf-8')
shutil.copy2(source / '92790153 (1).svg', assets / 'original-logo.svg')
shutil.copy2(source / '92790153.png', assets / 'original-logo.png')
(assets / 'README.md').write_text('''# Материалы бренда «Паллетика»

Источник: архив заказчика `02-11-2026_17-31-27.zip`, 3 ноября 2026.

- `original-logo.svg` и `original-logo.png` — исходные материалы без изменений.
- `logo.svg` — исходный SVG с более плотным окном просмотра. Сохранены знак, надпись, цвета и пропорции. Изменён только viewBox, удалена внешняя декларация DTD. Встроенное растровое изображение осталось исходным, поэтому файл не зависит от сторонних серверов.
- `symbol.svg` — окно просмотра того же файла вокруг исходного знака; используется в favicon и иллюстрациях кабинета и партнёрской сети.

Полный архив и брендбук сохранены локально в `materials/palletika-2026-11-02`; файлы печати и брендбук не публикуются. SVG из вложенного набора содержит ссылку на внешнее изображение; применён самодостаточный SVG из корня архива. Некоторые иконки вложенного набора экспортированы с пустым белым квадратом, поэтому не используются.

Оранжевые акценты интерфейса сохранены по последнему указанию заказчика. Логотип отображается в исходной серо-мятной палитре на белом фоне. Файл шрифта GetVoIP Grotesque в архиве отсутствует; сохранён локальный Manrope. Показатели и география остаются демонстрационными: подтверждающих материалов в архиве нет.
''', encoding='utf-8')

brand = '<img class="palletika-logo" src="assets/palletika/logo.svg" width="381" height="298" alt="Паллетика">'
symbol = '<img src="assets/palletika/symbol.svg" width="165" height="165" alt="">'
for name in ['index.html', 'rocket.html']:
    p = root / name
    s = p.read_text(encoding='utf-8')
    s = s.replace('Складно', 'Паллетика').replace('СКЛАДНО', 'ПАЛЛЕТИКА').replace('складно', 'Паллетика')
    s = s.replace('02 · Паллетика', '02 · Новый')
    s = s.replace('assets/favicon.svg', 'assets/palletika/symbol.svg')
    s = re.sub(r'(<a class="brand"[^>]*>).*?(</a>)', lambda m: m[1] + brand + m[2], s, flags=re.S)
    s = re.sub(r'<span class="dash-brand">.*?</span>', '<span class="dash-brand">' + symbol + 'Паллетика</span>', s)
    s = s.replace('<strong>Паллетика<span>.</span></strong>', '<strong class="cabinet-brand">' + symbol + 'Паллетика</strong>')
    s = re.sub(r'(<div class="network-core">)<svg.*?</svg>', lambda m: m[1] + symbol, s, flags=re.S)
    s = s.replace('Возможности Паллетика', 'Возможности Паллетики').replace('сервиса Паллетика', 'сервиса Паллетика')
    s = s.replace('УСЛУГИ ПАЛЛЕТИКА', 'УСЛУГИ ПАЛЛЕТИКИ').replace('сети Паллетика.', 'сети «Паллетика».')
    s = s.replace('название и показатели для примера', 'показатели для примера')
    s = s.replace('Давайте расти Паллетика. ↗', 'Растём вместе с вами. ↗')
    s = s.replace('  <script src="script.js" defer>', '  <link rel="stylesheet" href="brand-assets.css?v=palletika">\n  <script src="script.js?v=palletika" defer>')
    p.write_text(s, encoding='utf-8')

p = root / 'script.js'
s = p.read_text(encoding='utf-8').replace("name: 'Складно'", "name: 'Паллетика'").replace('СКЛАДНО', 'ПАЛЛЕТИКА').replace('skladno-partner-brief.txt','palletika-partner-brief.txt').replace('skladno-storage-brief.txt','palletika-storage-brief.txt')
p.write_text(s, encoding='utf-8')
p = root / 'index.php'
s = p.read_text(encoding='utf-8').replace("?? 'Складно'", "?? 'Паллетика'")
p.write_text(s, encoding='utf-8')
