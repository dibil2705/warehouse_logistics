(() => {
  'use strict';
  const tabs = [...document.querySelectorAll('[data-hero-variant]')];
  if (!tabs.length) return;

  function selectHero(tab, moveFocus = false, updateUrl = true) {
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
    }
    if (moveFocus) tab.focus({ preventScroll: true });
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('hero', tab.dataset.heroVariant);
      window.history.replaceState(null, '', url);
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectHero(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      selectHero(tabs[next], true);
    });
  });

  function syncFromUrl() {
    const variant = new URL(window.location.href).searchParams.get('hero');
    selectHero(tabs.find(tab => tab.dataset.heroVariant === variant) || tabs[0], false, false);
  }
  syncFromUrl();
  window.addEventListener('popstate', syncFromUrl);
})();
