(() => {
  'use strict';
  const shell = document.querySelector('.s-network-map');
  if (!shell) return;
  const stage = shell.querySelector('.warehouse-map-stage');
  const canvas = shell.querySelector('.warehouse-map-canvas');
  const message = shell.querySelector('[data-map-message]');
  const finder = shell.querySelector('[data-map-finder]');
  const search = shell.querySelector('[data-map-search]');
  const results = shell.querySelector('[data-map-results]');
  const empty = shell.querySelector('[data-map-empty]');
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
      this.points = points.map(([x, y], index) => ({ x, y, radius: 0, phase: index * .37 }));
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
      const reach = Math.max(58, Math.min(100, this.width * .14));
      const ease = reduced.matches ? 1 : 1 - Math.exp(-dt / 90);
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
        // Nearby dots also grow, with a smaller response that fades with distance.
        const response = index === nearest && nearestDistance < reach * .4 ? 1.2 * influence : .42 * influence;
        const breath = reduced.matches ? 0 : Math.sin(time * .0009 + point.phase) * .025;
        const target = baseRadius * (1 + breath + response);
        point.radius += (target - point.radius) * ease;
        if (point.screenX < -8 || point.screenX > this.width + 8 || point.screenY < -8 || point.screenY > this.height + 8) continue;
        context.moveTo(point.screenX + point.radius, point.screenY);
        context.arc(point.screenX, point.screenY, Math.max(.1, point.radius), 0, Math.PI * 2);
      }
      context.fill();
      if (!reduced.matches) this.requestDraw();
    }
  }
  let inView = false, initialized = false;
  let svg, viewport, dotsLayer, nodesLayer, geography, locations, plots, mode = 'country', selectedId = '';
  let camera = { scale: 1, x: 0, y: 0 }, frame = 0, drag = null, activeNodes = [], spider = null;
  let dotField;

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
  function moveCamera(target, duration = 550) {
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
  function marker(point, rows, label = '') {
    const selected = rows.some(row => row.id === selectedId);
    const title = rows.length > 1 ? `${rows.length} склада: ${rows.map(row => row.name).join(', ')}. Нажмите, чтобы раскрыть.` : rows[0].name + '. ' + rows[0].address;
    const node = element('g', { class: 'network-map-node' + (selected ? ' is-selected' : ''), role: 'button', tabindex: 0, 'aria-label': title });
    node.append(element('title', {}, title));
    node.append(element('circle', { r: 36, class: 'network-node-hit' }));
    node.append(element('circle', { r: rows.length > 1 ? 25 : 19, class: 'network-node-pulse' }));
    node.append(element('circle', { r: rows.length > 1 ? 20 : 12, class: 'network-node-core' }));
    if (rows.length > 1) node.append(element('text', { y: 5, 'text-anchor': 'middle', class: 'network-node-count' }, String(rows.length)));
    else node.append(element('circle', { r: 3.3, class: 'network-node-center' }));
    if (label || selected) node.append(element('text', { y: rows.length > 1 ? 45 : 35, 'text-anchor': 'middle', class: 'network-node-label' }, label || rows[0].name));
    const activate = e => {
      e.stopPropagation();
      if (mode === 'country') { setMode('warehouses'); svg.focus({ preventScroll: true }); }
      else if (rows.length === 1) openLocation(rows[0]);
      else expandGroup(point, rows);
    };
    node.addEventListener('click', activate);
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(e); } });
    nodesLayer.append(node); activeNodes.push({ node, x: point[0], y: point[1] });
  }
  function groupsForRegion() {
    const groups = [];
    plots.forEach(plot => {
      const threshold = Math.max(41, 38 / (dotField?.ratio || 1)) / camera.scale;
      const group = groups.find(item => Math.hypot(item.x - plot.point[0], item.y - plot.point[1]) < threshold);
      const row = locations.find(item => item.id === plot.id);
      if (!row) return;
      if (group) {
        group.x = (group.x * group.rows.length + plot.point[0]) / (group.rows.length + 1);
        group.y = (group.y * group.rows.length + plot.point[1]) / (group.rows.length + 1);
        group.rows.push(row);
      } else groups.push({ x: plot.point[0], y: plot.point[1], rows: [row] });
    });
    return groups;
  }
  function renderNodes() {
    nodesLayer.replaceChildren(); activeNodes = [];
    if (mode === 'country') {
      geography.country.cities.forEach(city => addStaticLabel(city.name, city.point));
      marker(geography.country.moscow, locations, 'Москва и область');
    } else {
      addStaticLabel('Москва', geography.region.moscow);
      groupsForRegion().forEach(group => {
        if (spider && group.rows.some(row => spider.ids.includes(row.id))) return;
        marker([group.x, group.y], group.rows);
      });
      if (spider) {
        const center = spider.point;
        spider.ids.forEach((id, index) => {
          const angle = index / spider.ids.length * Math.PI * 2 - Math.PI / 2;
          const radius = 65 * Math.max(1, .68 / (dotField?.ratio || 1)) / camera.scale;
          const point = [center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius];
          nodesLayer.append(element('line', { x1: center[0], y1: center[1], x2: point[0], y2: point[1], class: 'network-spider-line', 'vector-effect': 'non-scaling-stroke' }));
          marker(point, [locations.find(row => row.id === id)]);
        });
      }
    }
    paintCamera();
  }
  function expandGroup(point, rows) {
    if (camera.scale >= 5) { spider = { point, ids: rows.map(row => row.id) }; renderNodes(); }
    else {
      spider = null;
      const scale = Math.min(7, camera.scale * 2.3);
      moveCamera({ scale, x: (500 - point[0]) * scale, y: (320 - point[1]) * scale });
    }
    svg.focus({ preventScroll: true });
  }
  function setMode(value) {
    if (!svg) return;
    cancelAnimationFrame(frame);
    mode = value; camera = { scale: 1, x: 0, y: 0 }; spider = null;
    shell.dataset.mapView = mode;
    modes.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mapMode === mode)));
    svg.setAttribute('aria-label', mode === 'country' ? 'Интерактивная точечная карта России. Маркер Москвы открывает 24 склада.' : 'Точечная карта Москвы и области. Выберите склад на карте или в списке.');
    drawDots(); renderNodes();
  }
  function openLocation(row) {
    selectedId = row.id;
    results.querySelectorAll('button').forEach(button => button.classList.toggle('is-selected', button.dataset.id === row.id));
    card.querySelector('[data-map-card-title]').textContent = row.name;
    card.querySelector('[data-map-card-address]').textContent = row.address;
    card.querySelector('a').href = 'https://yandex.ru/maps/?text=' + encodeURIComponent(row.address);
    card.hidden = false; updateMotion(); renderNodes();
  }
  function closeCard() {
    selectedId = ''; card.hidden = true; results.querySelectorAll('button').forEach(button => button.classList.remove('is-selected')); updateMotion(); if (svg) renderNodes();
  }
  shell.querySelector('[data-map-card-close]').addEventListener('click', () => { closeCard(); finder.open = true; search.focus({ preventScroll: true }); });

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
      dotField.onResize = () => renderNodes();
      dotField.setActive(inView && !document.hidden);
      locations.forEach(row => {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.id = row.id;
        const name = document.createElement('strong'); name.textContent = row.name;
        const address = document.createElement('span'); address.textContent = row.address;
        button.append(name, address);
        button.addEventListener('click', () => {
          setMode('warehouses');
          const plot = plots.find(item => item.id === row.id);
          openLocation(row);
          finder.open = false;
          if (plot) {
            const neighbours = plots.filter(item => item.id !== row.id && Math.hypot(item.point[0] - plot.point[0], item.point[1] - plot.point[1]) < 15);
            if (neighbours.length) spider = { point: plot.point, ids: [row.id, ...neighbours.map(item => item.id)] };
            moveCamera({ scale: 2.5, x: (500 - plot.point[0]) * 2.5, y: (320 - plot.point[1]) * 2.5 });
          }
        });
        results.append(button);
      });
      search.disabled = false;
      search.addEventListener('input', () => {
        const query = search.value.trim().toLocaleLowerCase('ru');
        let count = 0;
        results.querySelectorAll('button').forEach(button => {
          button.hidden = !button.textContent.toLocaleLowerCase('ru').includes(query);
          if (!button.hidden) count++;
        });
        empty.hidden = count > 0;
      });
      modes.forEach(button => { button.disabled = false; button.addEventListener('click', () => { closeCard(); setMode(button.dataset.mapMode); }); });
      const zoom = direction => { spider = null; moveCamera({ scale: camera.scale * direction, x: camera.x * direction, y: camera.y * direction }); };
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
