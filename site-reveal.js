(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;

  const targets = new Map();
  const add = (selector, step = 0) => {
    document.querySelectorAll(selector).forEach((element, index) => targets.set(element, index * step));
  };
  add('.platform-hero-copy>.overline,.platform-hero-copy>h1,.platform-hero-lead,.platform-hero-actions,.platform-hero-visual', 60);
  add('.s-how .s-heading,.s-flow');
  add('.s-platform-copy,.s-platform-grid>.s-app', 80);
  add('.s-network .s-heading,.s-network-map,.s-network-copy,.s-addresses');
  add('.s-journey-heading');
  add('.s-journey-card', 80);
  add('.orange-closing-main>div,.orange-closing-legal,.orange-closing-bottom', 60);

  const pending = new Set(targets.keys());
  const timers = new Map();
  const finish = element => {
    element.classList.remove('site-reveal', 'is-visible');
    element.style.removeProperty('--reveal-delay');
    pending.delete(element);
    clearTimeout(timers.get(element));
    timers.delete(element);
  };
  const show = element => {
    observer.unobserve(element);
    if (!pending.has(element) || element.classList.contains('is-visible')) return;
    element.classList.add('is-visible');
    // Keep content visible even if an animation is interrupted or CSS is unavailable.
    timers.set(element, setTimeout(() => finish(element), 800 + targets.get(element)));
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) show(entry.target); });
  }, { threshold: .12 });

  targets.forEach((delay, element) => {
    element.style.setProperty('--reveal-delay', `${delay}ms`);
    element.classList.add('site-reveal');
    element.addEventListener('animationend', event => {
      if (event.target === element && event.animationName === 'ladsklad-reveal') finish(element);
    });
    observer.observe(element);
  });
  // Keyboard and direct section navigation must never leave focused content hidden.
  document.addEventListener('focusin', event => {
    const element = event.target.closest('.site-reveal');
    if (element) { observer.unobserve(element); finish(element); }
  });
  const showAll = () => { observer.disconnect(); [...pending].forEach(finish); };
  reduced.addEventListener('change', event => { if (event.matches) showAll(); });
  window.addEventListener('pageshow', event => { if (event.persisted) showAll(); });
})();
