'use strict';
(() => {
  const header = document.querySelector('.header');
  const menu = document.querySelector('.menu-toggle');
  if (!header) return;
  let lastY = Math.max(0, window.scrollY);
  let direction = 0;
  let travel = 0;
  let frame = 0;
  let holdUntil = 0;
  const reveal = () => {
    header.classList.remove('is-hidden');
    direction = 0;
    travel = 0;
  };
  const update = () => {
    frame = 0;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const y = Math.min(maxY, Math.max(0, window.scrollY));
    const delta = y - lastY;
    lastY = y;
    header.classList.toggle('is-scrolled', y > 24);
    const keyboardFocus = header.contains(document.activeElement) && document.activeElement.matches(':focus-visible');
    if (y < 96 || menu?.getAttribute('aria-expanded') === 'true' || keyboardFocus || performance.now() < holdUntil) {
      reveal();
      return;
    }
    if (Math.abs(delta) < 1) return;
    const nextDirection = Math.sign(delta);
    if (nextDirection !== direction) { direction = nextDirection; travel = 0; }
    travel += Math.abs(delta);
    if (direction > 0 && travel > 18) header.classList.add('is-hidden');
    if (direction < 0 && travel > 10) header.classList.remove('is-hidden');
  };
  window.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, { passive: true });
  // Keyboard navigation and smooth anchor jumps keep navigation reachable.
  header.addEventListener('focusin', reveal);
  header.addEventListener('click', () => { holdUntil = performance.now() + 1000; reveal(); });
  window.addEventListener('hashchange', () => { holdUntil = performance.now() + 1000; reveal(); });
  window.addEventListener('resize', () => { lastY = Math.max(0, window.scrollY); reveal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Home' || event.key === 'Tab') reveal(); });
  update();
})();
