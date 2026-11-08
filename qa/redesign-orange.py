from pathlib import Path
import re

root = Path(__file__).resolve().parent.parent
p = root / 'rocket.html'
s = p.read_text(encoding='utf-8')
s = s.replace('rocket-logistics-blue.png', 'rocket-logistics.png').replace('?v=blue', '?v=orange-own')
s = s.replace('02 · Rocket', '02 · Складно').replace('request-status blue', 'request-status orange')
hero = '''    <section class="rocket-hero" aria-labelledby="rocket-title"><div class="container">
      <div class="hero-heading"><div><p class="overline">СКЛАДСКАЯ ЛОГИСТИКА БЕЗ ЛИШНИХ СЛОЖНОСТЕЙ</p><h1 id="rocket-title">Больше места.<br><span>Больше возможностей.</span></h1></div><a class="hero-network" href="#about"><strong>120<span>+</span></strong><span>складов партнёров<br>для ваших задач ↗</span></a></div>
      <div class="hero-scene-grid"><div class="rocket-hero-copy"><p class="hero-lead">Ваш бизнес растёт.<br>Мы находим, где разместить груз.</p><p class="hero-description">Подбираем склад партнёра под ваш объём, город и условия хранения. Сопровождаем от первого запроса до согласованного решения.</p><div class="hero-actions"><button class="button" data-app-action="request">Подобрать склад <span aria-hidden="true">↗</span></button></div><a class="hero-process-link" href="#how">Как это работает <span aria-hidden="true">↓</span></a></div>
      <div class="rocket-hero-art"><div class="hero-art-top"><span>ГРУЗУ — МЕСТО.<br>БИЗНЕСУ — ДВИЖЕНИЕ.</span><span class="scene-cross" aria-hidden="true">+</span></div><svg class="scene-route" viewBox="0 0 800 430" fill="none" aria-hidden="true"><path d="M-20 330H120Q180 330 180 270V190Q180 135 240 135H620Q685 135 685 70V-20"/><path d="M-20 370H160Q220 370 220 310V230Q220 175 280 175H660Q725 175 725 110V-20"/><circle cx="180" cy="250" r="10"/><circle cx="590" cy="135" r="10"/></svg><span class="scene-location location-one">Москва</span><span class="scene-location location-two">Казань</span><img src="assets/rocket-logistics.png" width="1280" height="1280" alt="Оранжевый складской погрузчик с паллетой упакованного груза" fetchpriority="high"><span class="hero-art-label"><span class="scene-dot" aria-hidden="true"></span>От одной партии<br>до новых масштабов</span><span class="scene-footer">ПОДБОР · ХРАНЕНИЕ · СОПРОВОЖДЕНИЕ</span></div></div>
    </div></section>'''
s = re.sub(r'    <section class="rocket-hero".*?</section>', lambda _: hero, s, count=1, flags=re.S)
# Mission and evidence form one editorial spread.
s = s.replace('<p class="overline">ЛЮДИ И ВОЗМОЖНОСТИ</p>', '<div class="mission-story"><p class="overline">МЕСТО, ГДЕ СОВПАДАЮТ ВОЗМОЖНОСТИ</p>')
s = s.replace('<span class="accent-rule" aria-hidden="true"></span>', '</div><div class="mission-evidence">')
s = s.replace('Показатели приведены для макета и будут заменены подтверждёнными данными.</p>', 'Показатели и география приведены для макета.</p></div>')
# Services lead into the compact format band, rather than the reference sequence.
formats = re.search(r'    <section class="section formats".*?</section>', s, flags=re.S).group()
s = s.replace(formats + '\n', '')
end = s.index('</section>', s.index('<section class="section services"')) + len('</section>')
s = s[:end] + '\n\n' + formats + s[end:]
s = s.replace('Разный груз.<br>Подходящий формат хранения.', 'Что нужно разместить?')
s = s.replace('Сначала — требования вашего бизнеса.<br>Затем — площадка, которая им соответствует.', 'Подберём площадку под особенности вашего груза.')
# Side-by-side photo and numbered route.
start = s.index('<section class="section process"')
end = s.index('</section>', start)
part = s[start:end]
part = part.replace('<div class="process-grid">', '<div class="process-body"><div class="process-grid">', 1)
part += '</div>'
s = s[:start] + part + s[end:]
s = s.replace('<div class="partner-symbol" aria-hidden="true">↗</div>', '<div class="partner-symbol" aria-hidden="true"><span>ВАША ПЛОЩАДКА</span><div class="partner-warehouse">▥</div><span>СВОБОДНОЕ МЕСТО<br>НОВЫЕ ВОЗМОЖНОСТИ</span></div>')
s = s.replace('<div class="cta-graphic" aria-hidden="true"><span>С</span><div>ГРУЗ<br>СКЛАД<br>РЕШЕНИЕ.</div></div>', '<div class="cta-graphic" aria-hidden="true"><div class="cargo-block block-one">ВАШ<br>ГРУЗ</div><div class="cargo-block block-two">НАШ<br>ПОДБОР ↗</div><div class="cargo-block block-three">ПОДХОДЯЩИЙ СКЛАД</div></div>')
p.write_text(s, encoding='utf-8')
for name in ['index.html', 'version-switcher.css']:
    p = root / name
    v = p.read_text(encoding='utf-8').replace('?v=blue', '?v=orange-own').replace('02 · Rocket', '02 · Складно').replace('--version-accent:#245eea', '--version-accent:#ef532b')
    p.write_text(v, encoding='utf-8')
p = root / 'rocket.css'
v = p.read_text(encoding='utf-8')
colors = {'#245eea':'#ef532b','#1847c4':'#c83c19','#bed0ff':'#ffd1bd','#eef3ff':'#fff0e9','#eaf0ff':'#fcebe3','#6078a8':'#98604d','#3d68bd':'#b44323'}
for a,b in colors.items(): v=v.replace(a,b)
v=v.replace('.request-status.blue', '.request-status.orange')
p.write_text(v, encoding='utf-8')
