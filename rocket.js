'use strict';

const backToTop = document.querySelector('.back-to-top');
const updateBackToTop = () => { backToTop.hidden = window.scrollY < 500; };
window.addEventListener('scroll', updateBackToTop, { passive: true });
updateBackToTop();

// Industry examples are editorial content, not client logos or claimed projects.
const industryTabs = [...document.querySelectorAll('.industry-tabs [role="tab"]')];
function selectIndustry(tab, moveFocus = false) {
  industryTabs.forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (moveFocus) tab.focus();
}
industryTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectIndustry(tab));
  tab.addEventListener('keydown', event => {
    let target;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) target = (index + 1) % industryTabs.length;
    if (['ArrowUp', 'ArrowLeft'].includes(event.key)) target = (index - 1 + industryTabs.length) % industryTabs.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = industryTabs.length - 1;
    if (target === undefined) return;
    event.preventDefault();
    selectIndustry(industryTabs[target], true);
  });
});
