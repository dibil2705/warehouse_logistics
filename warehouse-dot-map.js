(() => {
  'use strict';
  const shell = document.querySelector('.s-network-map');
  if (!shell) return;
  const stage = shell.querySelector('.warehouse-map-stage');
  const canvas = shell.querySelector('.warehouse-map-canvas');
  const message = shell.querySelector('[data-map-message]');
  const card = shell.querySelector('[data-map-card]');
  const modes = [...shell.querySelectorAll('[data-map-mode]')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const NS = 'http://www.w3.org/2000/svg';
  // The dot field is drawn directly, with no map SDK or image layer.
  class DotField {
    constructor(host, overlay) {
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'network-dot-canvas';
      this.canvas.setAttribute('aria-hidden', 'true');
      host.prepend(this.canvas);
      this.context = this.canvas.getContext('2d', { alpha: true });
      this.host = host; this.points = []; this.pointer = null;
      this.camera = { scale: 1, x: 0, y: 0 };
      this.active = false; this.raf = 0; this.lastTime = 0;
      this.resize = new ResizeObserver(() => this.measure());
      this.resize.observe(host); this.measure();
      overlay.addEventListener('pointermove', event => {
        const rect = this.host.getBoundingClientRect();
        this.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        this.requestDraw();
      }, { passive: true });
      overlay.addEventListener('pointerdown', event => {
        const rect = this.host.getBoundingClientRect();
        this.pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        this.requestDraw();
      }, { passive: true });
      overlay.addEventListener('pointerleave', () => { this.pointer = null; this.requestDraw(); });
      overlay.addEventListener('pointerup', event => { if (event.pointerType === 'touch') setTimeout(() => { this.pointer = null; this.requestDraw(); }, 280); });
      overlay.addEventListener('pointercancel', () => { this.pointer = null; this.requestDraw(); });
    }
    measure() {
      const rect = this.host.getBoundingClientRect();
      this.width = rect.width; this.height = rect.height;
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
      this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
      this.ratio = Math.min(this.width / 1000, this.height / 600);
      this.offsetX = (this.width - 1000 * this.ratio) / 2;
      this.offsetY = (this.height - 600 * this.ratio) / 2;
      this.onResize?.();
      this.requestDraw();
    }
    setPoints(points) {
      this.points = points.map(([x, y], index) => ({ x, y, radius: 0, offsetX: 0, offsetY: 0, driftX: 0, driftY: 0, phase: index * .37 }));
      this.requestDraw();
    }
    setCamera(camera) { this.camera = { ...camera }; this.requestDraw(); }
    setActive(active) {
      this.active = active;
      if (!active) { cancelAnimationFrame(this.raf); this.raf = 0; this.lastTime = 0; }
      else this.requestDraw();
    }
    requestDraw() {
      if (this.active && !this.raf) this.raf = requestAnimationFrame(time => this.draw(time));
    }
    draw(time) {
      this.raf = 0;
      if (!this.active || !this.width || !this.height) return;
      const dt = this.lastTime ? Math.min(50, time - this.lastTime) : 16;
      this.lastTime = time;
      const context = this.context, camera = this.camera;
      const baseRadius = Math.max(.85, Math.min(1.55, this.ratio * 2.05));
      const reach = Math.max(72, Math.min(132, this.width * .16));
      const ease = reduced.matches ? 1 : 1 - Math.exp(-dt / 90);
      const driftDecay = Math.exp(-dt / 1100), noise = Math.sqrt(dt / 1000) * 8;
      let nearest = -1, nearestDistance = Infinity;
      for (let index = 0; index < this.points.length; index++) {
        const point = this.points[index];
        point.screenX = this.offsetX + ((point.x - 500) * camera.scale + 500 + camera.x) * this.ratio;
        point.screenY = this.offsetY + ((point.y - 320) * camera.scale + 320 + camera.y) * this.ratio;
        point.distance = this.pointer ? Math.hypot(point.screenX - this.pointer.x, point.screenY - this.pointer.y) : Infinity;
        if (point.distance < nearestDistance) { nearestDistance = point.distance; nearest = index; }
      }
      context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      context.clearRect(0, 0, this.width, this.height);
      context.fillStyle = '#30332f';
      context.beginPath();
      for (let index = 0; index < this.points.length; index++) {
        const point = this.points[index];
        const proximity = Math.max(0, 1 - point.distance / reach);
        const influence = proximity * proximity * (3 - 2 * proximity);
        // Strong focal growth, softer neighbouring growth and a small outward displacement.
        const density = Math.min(1, this.ratio * 6.8 / (baseRadius * 4));
        const response = index === nearest && nearestDistance < reach * .4 ? 4 * influence : .95 * influence * density;
        const breath = reduced.matches ? 0 : Math.sin(time * .0009 + point.phase) * .025;
        const target = baseRadius * (1 + breath + response);
        point.radius += (target - point.radius) * ease;
        const push = this.pointer && !reduced.matches ? Math.min(18, Math.max(9, this.width * .018)) * influence : 0;
        const directionX = point.distance > .01 && this.pointer ? (point.screenX - this.pointer.x) / point.distance : Math.cos(point.phase);
        const directionY = point.distance > .01 && this.pointer ? (point.screenY - this.pointer.y) / point.distance : Math.sin(point.phase);
        // A bounded random walk keeps hovered dots alive even with a stationary cursor.
        if (influence > 0 && !reduced.matches) {
          point.driftX = Math.max(-5, Math.min(5, point.driftX * driftDecay + (Math.random() - .5) * noise));
          point.driftY = Math.max(-5, Math.min(5, point.driftY * driftDecay + (Math.random() - .5) * noise));
        } else {
          point.driftX = reduced.matches ? 0 : point.driftX * driftDecay;
          point.driftY = reduced.matches ? 0 : point.driftY * driftDecay;
        }
        point.offsetX += (directionX * push + point.driftX * influence - point.offsetX) * ease;
        point.offsetY += (directionY * push + point.driftY * influence - point.offsetY) * ease;
        const x = point.screenX + point.offsetX, y = point.screenY + point.offsetY;
        if (x < -10 || x > this.width + 10 || y < -10 || y > this.height + 10) continue;
        context.moveTo(x + point.radius, y);
        context.arc(x, y, Math.max(.1, point.radius), 0, Math.PI * 2);
      }
      context.fill();
      if (!reduced.matches) this.requestDraw();
    }
  }
  let inView = false, initialized = false;
  let svg, viewport, dotsLayer, nodesLayer, geography, locations, plots, mode = 'country', selectedId = '';
  let camera = { scale: 1, x: 0, y: 0 }, frame = 0, drag = null, activeNodes = [];
  let dotField;
  let fittedView = true;

  function updateMotion() {
    shell.dataset.motionPaused = String(!inView || document.hidden || reduced.matches);
    dotField?.setActive(inView && !document.hidden);
  }
  document.addEventListener('visibilitychange', updateMotion);
  reduced.addEventListener('change', updateMotion);
  updateMotion();

  function element(tag, attributes = {}, text = '') {
    const node = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    if (text) node.textContent = text;
    return node;
  }
  function positionNode(node, x, y) {
    const legibility = Math.max(1, .68 / (dotField?.ratio || 1));
    node.setAttribute('transform', `translate(${x} ${y}) scale(${legibility / camera.scale})`);
  }
  function paintCamera() {
    viewport.setAttribute('transform', `translate(${500 + camera.x} ${320 + camera.y}) scale(${camera.scale}) translate(-500 -320)`);
    activeNodes.forEach(item => positionNode(item.node, item.x, item.y));
    shell.dataset.zoom = camera.scale.toFixed(2);
    dotField?.setCamera(camera);
  }
  function initialCamera() {
    if (mode === 'country') return { scale: 1.3, x: 0, y: 0 };
    const xs = geography.region.dots.map(point => point[0]), ys = geography.region.dots.map(point => point[1]);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const { width, height, ratio, offsetX, offsetY } = dotField;
    const side = width < 500 ? 18 : 26, topInset = 86, bottomInset = 20;
    const scale = Math.min(2.8, Math.max(1.4, Math.min(
      (width - side * 2) / ((right - left) * ratio),
      (height - topInset - bottomInset) / ((bottom - top) * ratio)
    )));
    return {
      scale,
      x: (width / 2 - offsetX) / ratio - 500 - ((left + right) / 2 - 500) * scale,
      y: ((height + topInset - bottomInset) / 2 - offsetY) / ratio - 320 - ((top + bottom) / 2 - 320) * scale
    };
  }
  function moveCamera(target, duration = 550) {
    fittedView = false;
    cancelAnimationFrame(frame);
    target.scale = Math.min(7, Math.max(1, target.scale));
    const maxX = 500 * (target.scale - 1) + 90, maxY = 300 * (target.scale - 1) + 65;
    target.x = Math.max(-maxX, Math.min(maxX, target.x));
    target.y = Math.max(-maxY, Math.min(maxY, target.y));
    if (reduced.matches || duration === 0) { camera = target; paintCamera(); renderNodes(); return; }
    const from = { ...camera }, start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / duration), ease = 1 - (1 - t) ** 3;
      camera = { scale: from.scale + (target.scale - from.scale) * ease, x: from.x + (target.x - from.x) * ease, y: from.y + (target.y - from.y) * ease };
      paintCamera();
      if (t < 1) frame = requestAnimationFrame(tick);
      else renderNodes();
    };
    frame = requestAnimationFrame(tick);
  }
  function drawDots() {
    dotField.setPoints(geography[mode === 'country' ? 'country' : 'region'].dots);
    dotsLayer.replaceChildren();
  }
  function addStaticLabel(name, point) {
    const node = element('g', { class: 'network-city', 'aria-hidden': 'true' });
    node.append(element('circle', { r: 2.6 }), element('text', { x: 7, y: 4 }, name));
    nodesLayer.append(node); activeNodes.push({ node, x: point[0], y: point[1] });
  }
  function marker(point, rows, label = '', number = '') {
    const selected = rows.some(row => row.id === selectedId);
    const title = rows.length > 1 ? `${rows.length} склада: ${rows.map(row => row.name).join(', ')}. Нажмите, чтобы раскрыть.` : (number ? number + ' · ' : '') + rows[0].name + '. ' + rows[0].address;
    const node = element('g', { class: 'network-map-node' + (selected ? ' is-selected' : ''), role: 'button', tabindex: 0, 'aria-label': title });
    node.append(element('title', {}, title));
    node.append(element('circle', { r: number ? 32 : 36, class: 'network-node-hit' }));
    node.append(element('circle', { r: rows.length > 1 ? 25 : 19, class: 'network-node-pulse' }));
    node.append(element('circle', { r: rows.length > 1 ? 20 : 14, class: 'network-node-core' }));
    if (rows.length > 1 || number) node.append(element('text', { y: number ? 4 : 5, 'text-anchor': 'middle', class: 'network-node-count' + (number ? ' network-node-number' : '') }, number || String(rows.length)));
    else node.append(element('circle', { r: 3.3, class: 'network-node-center' }));
    if (label) node.append(element('text', { y: rows.length > 1 ? 45 : 35, 'text-anchor': 'middle', class: 'network-node-label' }, label || rows[0].name));
    const activate = e => {
      e.stopPropagation();
      if (mode === 'country') { setMode('warehouses'); svg.focus({ preventScroll: true }); }
      else openLocation(rows[0]);
    };
    node.addEventListener('click', activate);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e); } });
    nodesLayer.append(node); activeNodes.push({ node, x: point[0], y: point[1] });
  }
  function regionMarkers() {
    const ratio = dotField.ratio, effective = Math.max(ratio, .68);
    const gap = Math.max(48, 64 * effective + 4);
    const project = point => ({
      x: dotField.offsetX + ((point[0] - 500) * camera.scale + 500 + camera.x) * ratio,
      y: dotField.offsetY + ((point[1] - 320) * camera.scale + 320 + camera.y) * ratio
    });
    const positions = plots.map((plot, index) => {
      const anchor = project(plot.point);
      return { plot, anchor, x: anchor.x + Math.cos(index * 2.4), y: anchor.y + Math.sin(index * 2.4) };
    });
    // Resolve close sites into individual targets while retaining their geographic anchors.
    for (let pass = 0; pass < 180; pass++) {
      for (let i = 0; i < positions.length; i++) {
        const a = positions[i];
        if (pass < 90) { a.x += (a.anchor.x - a.x) * .015; a.y += (a.anchor.y - a.y) * .015; }
        for (let j = i + 1; j < positions.length; j++) {
          const b = positions[j], dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
          if (distance >= gap) continue;
          const angle = distance > .01 ? Math.atan2(dy, dx) : (i + j) * 2.4;
          const push = (gap - distance) * .51;
          a.x -= Math.cos(angle) * push; a.y -= Math.sin(angle) * push;
          b.x += Math.cos(angle) * push; b.y += Math.sin(angle) * push;
        }
        a.x = Math.max(28, Math.min(dotField.width - 28, a.x));
        a.y = Math.max(100, Math.min(dotField.height - 32, a.y));
      }
    }
    const unproject = (x, y) => [
      ((x - dotField.offsetX) / ratio - 500 - camera.x) / camera.scale + 500,
      ((y - dotField.offsetY) / ratio - 320 - camera.y) / camera.scale + 320
    ];
    return positions.map(item => ({ ...item, point: unproject(item.x, item.y) }));
  }
  function regionLandmarks(arranged) {
    const byId = id => plots.find(plot => plot.id === id).point;
    const landmarks = [
      ['Москва', geography.region.moscow, 155, 12, true],
      ['Дмитров', byId('warehouse-09'), 125, -65, true],
      ['Химки', byId('warehouse-24'), -155, -50, false],
      ['Мытищи', byId('warehouse-05'), 165, -45, false],
      ['Истра', byId('warehouse-19'), -120, 55, false],
      ['Домодедово', byId('warehouse-22'), 125, 75, true]
    ];
    const ratio = dotField.ratio, effective = Math.max(ratio, .68);
    const offsetScale = Math.min(1, dotField.width / 720), occupied = [];
    landmarks.forEach(([name, anchor, dx, dy, primary]) => {
      if (dotField.width < 500 && !primary) return;
      const desired = {
        x: dotField.offsetX + ((anchor[0] - 500) * camera.scale + 500 + camera.x) * ratio + dx * offsetScale,
        y: dotField.offsetY + ((anchor[1] - 320) * camera.scale + 320 + camera.y) * ratio + dy * offsetScale
      };
      const width = name.length * 7.5 * effective, height = 18 * effective;
      let best = { x: 12, y: 110, score: Infinity };
      for (let y = 100; y < dotField.height - 18; y += 10) {
        for (let x = 12; x < dotField.width - width - 12; x += 10) {
          const rect = { left: x - 5, right: x + width + 5, top: y - height, bottom: y + 7 };
          const blocked = arranged.some(site => Math.hypot(site.x - Math.max(rect.left, Math.min(rect.right, site.x)), site.y - Math.max(rect.top, Math.min(rect.bottom, site.y))) < 22 * effective) || occupied.some(other => rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top);
          const score = (x - desired.x) ** 2 + (y - desired.y) ** 2 + (blocked ? 1e7 : 0);
          if (score < best.score) best = { x, y, score, rect };
        }
      }
      occupied.push(best.rect);
      const point = [((best.x - dotField.offsetX) / ratio - 500 - camera.x) / camera.scale + 500, ((best.y - dotField.offsetY) / ratio - 320 - camera.y) / camera.scale + 320];
      const node = element('g', { class: 'network-landmark' + (primary ? ' is-primary' : ''), 'aria-hidden': 'true' });
      node.append(element('text', { x: 0, y: 4 }, name));
      nodesLayer.append(node); activeNodes.push({ node, x: point[0], y: point[1] });
    });
  }

  function renderNodes() {
    nodesLayer.replaceChildren(); activeNodes = [];
    if (mode === 'country') {
      geography.country.cities.forEach(city => addStaticLabel(city.name, city.point));
      marker(geography.country.moscow, locations, 'Москва и область');
    } else {
      const arranged = regionMarkers();
      arranged.forEach(({ plot, point }) => {
        nodesLayer.append(element('line', { x1: plot.point[0], y1: plot.point[1], x2: point[0], y2: point[1], class: 'network-site-line', 'vector-effect': 'non-scaling-stroke' }));
      });
      regionLandmarks(arranged);
      arranged.forEach(({ plot, point }, index) => {
        const row = locations.find(row => row.id === plot.id);
        if (row) marker(point, [row], '', String(index + 1).padStart(2, '0'));
      });
    }
    paintCamera();
  }
  function setMode(value) {
    if (!svg) return;
    cancelAnimationFrame(frame);
    mode = value; fittedView = true; camera = initialCamera();
    shell.dataset.mapView = mode;
    modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode)));
    svg.setAttribute('aria-label', mode === 'country' ? 'Интерактивная точечная карта России. Маркер Москвы открывает 24 склада.' : 'Точечная карта Москвы и области. Выберите склад на карте.');
    drawDots(); renderNodes();
  }
  function openLocation(row) {
    selectedId = row.id;
    card.querySelector('[data-map-card-title]').textContent = row.name;
    card.querySelector('[data-map-card-address]').textContent = row.address;
    card.querySelector('a').href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(row.address);
    card.hidden = false; updateMotion(); renderNodes();
    card.querySelector('[data-map-card-title]').focus({ preventScroll: true });
  }
  function closeCard() {
    selectedId = ''; card.hidden = true; updateMotion(); if (svg) renderNodes();
  }
  shell.querySelector('[data-map-card-close]').addEventListener('click', () => { closeCard(); svg?.focus({ preventScroll: true }); });

  async function initialize() {
    if (initialized) return;
    initialized = true;
    try {
      const mapData = window.LADSKLAD_MAP_DATA;
      if (!mapData?.geography || !mapData?.warehouses) throw new Error('Map data unavailable');
      geography = mapData.geography; locations = mapData.warehouses.locations; plots = geography.region.locations;
      if (!locations.length || !geography.country.dots.length) throw new Error('Map data is empty');
      svg = element('svg', { viewBox: '0 0 1000 600', role: 'group', tabindex: 0, class: 'network-map-svg' });
      const scene = element('g', { class: 'network-map-scene' });
      viewport = element('g'); dotsLayer = element('g', { 'aria-hidden': 'true' }); nodesLayer = element('g');
      viewport.append(dotsLayer, nodesLayer); scene.append(viewport); svg.append(scene); canvas.append(svg);
      dotField = new DotField(canvas, svg);
      dotField.onResize = () => { if (fittedView) camera = initialCamera(); renderNodes(); };
      dotField.setActive(inView && !document.hidden);
      modes.forEach(button => { button.disabled = false; button.addEventListener('click', () => { closeCard(); setMode(button.dataset.mapMode); }); });
      const zoom = direction => { moveCamera({ scale: camera.scale * direction, x: camera.x * direction, y: camera.y * direction }); };
      svg.addEventListener('keydown', event => {
        if (event.target !== svg) return;
        const offsets = { ArrowLeft: [45, 0], ArrowRight: [-45, 0], ArrowUp: [0, 45], ArrowDown: [0, -45] };
        if (offsets[event.key]) { event.preventDefault(); const [x, y] = offsets[event.key]; moveCamera({ ...camera, x: camera.x + x, y: camera.y + y }, 160); }
        if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(1.55); }
        if (event.key === '-') { event.preventDefault(); zoom(1 / 1.55); }
        if (event.key === 'Escape') { closeCard(); setMode('country'); }
      });
      const pointInSvg = event => { const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY; return point.matrixTransform(svg.getScreenCTM().inverse()); };
      svg.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('[role="button"]')) return;
        cancelAnimationFrame(frame); const point = pointInSvg(event); drag = { id: event.pointerId, point, x: camera.x, y: camera.y };
        svg.setPointerCapture(event.pointerId); svg.classList.add('is-dragging');
      });
      svg.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return;
        const point = pointInSvg(event); camera.x = drag.x + point.x - drag.point.x; camera.y = drag.y + point.y - drag.point.y; paintCamera();
      });
      const endDrag = () => { if (drag) { drag = null; svg.classList.remove('is-dragging'); moveCamera({ ...camera }, 0); } };
      svg.addEventListener('pointerup', endDrag); svg.addEventListener('pointercancel', endDrag);
      setMode('country'); message.hidden = true; shell.dataset.mapReady = 'true';
    } catch (error) {
      message.textContent = 'Карта временно недоступна. Адреса складов находятся в списке ниже.';
      message.hidden = false;
    }
  }
  new IntersectionObserver(entries => { inView = entries[0].isIntersecting; updateMotion(); if (inView) initialize(); }, { rootMargin: '180px' }).observe(shell);
})();
