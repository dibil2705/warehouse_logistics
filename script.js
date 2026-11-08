'use strict';

/* All illustrative company facts live here. Replace these with verified values. */
const COMPANY = { name: 'ЛАДСКЛАД', warehouses: '30' };

const APP = window.SKLADNO_APP || { routes: {} };
function applicationUrl(action, service = '') {
  const route = APP.routes?.[action];
  if (!route) return null;
  try {
    const url = new URL(route, window.location.href);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (action === 'request' && service) url.searchParams.set('service', service);
    return url;
  } catch {
    return null;
  }
}

document.querySelectorAll('[data-company]').forEach(element => {
  const value = COMPANY[element.dataset.company];
  if (value) element.innerHTML = value;
});
document.getElementById('current-year').textContent = new Date().getFullYear();

const menuToggle = document.querySelector('.menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
function closeMenu() {
  mobileNav.hidden = true;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Открыть меню');
}
menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  mobileNav.hidden = !open;
});
mobileNav.querySelectorAll('a, button').forEach(element => element.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
const mobileViewport = window.matchMedia('(max-width: 960px)');
mobileViewport.addEventListener('change', () => { if (!mobileViewport.matches) closeMenu(); });

const dialog = document.getElementById('info-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogDescription = document.getElementById('dialog-description');
const dialogList = document.getElementById('dialog-list');
const dialogAction = document.getElementById('dialog-action');
const dialogNote = document.getElementById('dialog-note');
const dialogFeedback = document.getElementById('dialog-feedback');
let activeBrief = 'client';
let activeService = '';
let selectedServiceName = '';
let dialogTrigger = null;
let dialogMode = 'brief';
let dialogFocusTarget = null;

const services = {
  storage: { title: 'Место для вашего груза', description: 'Подберём партнёрскую площадку с подходящим типом хранения. Условия и доступность подтверждаются индивидуально.', items: ['Паллетное и коробочное хранение', 'Размещение оборудования и негабаритных грузов', 'Подбор температурного режима по запросу', 'Согласование объёма, срока и состава услуг'], brief: 'Ответственное хранение' },
  handling: { title: 'Больше, чем хранение', description: 'Найдём партнёра, который возьмёт на себя необходимые складские операции — от приёмки до подготовки к отгрузке.', items: ['Проверка и приёмка товара', 'Комплектация и сборка заказов', 'Упаковка и маркировка', 'Подготовка груза к отгрузке'], brief: 'Хранение и складская обработка' },
  flexible: { title: 'Пространство для роста', description: 'Поможем найти складское решение, когда меняются объёмы, сроки или география бизнеса.', items: ['Запас на пиковый сезон', 'Размещение разовой партии', 'Хранение в новом регионе', 'Подбор дополнительной складской ёмкости'], brief: 'Гибкое складское решение' },
};

function setDialogItems(items) {
  dialogList.replaceChildren(...items.map(text => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));
}
function showDialog(trigger) {
  dialogTrigger = trigger;
  dialogFocusTarget = trigger;
  dialogFeedback.textContent = '';
  if (!dialog.open) dialog.showModal();
  document.body.classList.add('modal-open');
}
function openBrief(type, trigger, service = '') {
  const targetUrl = applicationUrl(type === 'partner' ? 'partner' : 'request', service);
  if (targetUrl) {
    window.location.assign(targetUrl);
    return;
  }
  dialogMode = 'brief';
  activeBrief = type;
  activeService = '';
  selectedServiceName = services[service]?.brief || '';
  const partner = type === 'partner';
  document.getElementById('dialog-eyebrow').textContent = partner ? 'РАСТЁМ ВМЕСТЕ' : 'ПЕРВЫЙ ШАГ К РЕШЕНИЮ';
  dialogTitle.textContent = partner ? 'Давайте познакомимся с вашим складом' : 'Подготовьте заявку на хранение';
  dialogDescription.textContent = partner ? 'Соберите информацию о площадке в коротком брифе. Он поможет обсудить подключение к партнёрской сети.' : 'Онлайн-подача заявки появится после запуска клиентского кабинета. Пока можно скачать список вопросов, заполнить его и передать вашему менеджеру.';
  setDialogItems(partner ? ['Адрес и тип вашей площадки', 'Свободная площадь и вместимость', 'Условия хранения и доступные операции', 'Контакт представителя склада'] : ['Город и удобный район размещения', 'Тип груза и объём партии', 'Сроки и условия хранения', 'Дополнительные операции и ваши контакты']);
  dialogAction.innerHTML = 'Скачать бриф <span aria-hidden="true">↓</span>';
  dialogNote.textContent = 'Бриф скачивается на ваше устройство. Заявка с этой страницы не отправляется.';
  showDialog(trigger);
}
document.querySelectorAll('[data-app-action]').forEach(element => {
  const action = element.dataset.appAction;
  const target = applicationUrl(action);
  if (element.tagName === 'A' && target) element.href = target.href;
  element.addEventListener('click', event => {
    // Keep normal link behavior, including opening in a new tab, for configured routes.
    if (element.tagName === 'A' && target) return;
    event.preventDefault();
    if (action !== 'login') {
      openBrief(action === 'partner' ? 'partner' : 'client', element);
      return;
    }
    dialogMode = 'login';
    activeService = '';
    document.getElementById('dialog-eyebrow').textContent = 'КЛИЕНТСКИЙ КАБИНЕТ';
    dialogTitle.textContent = 'Ваши заказы — в одном месте';
    dialogDescription.textContent = 'Клиентский кабинет готовится к запуску. Здесь вы сможете создавать обращения на хранение и возвращаться к истории своих заявок.';
    setDialogItems(['Новая заявка: груз, объём, город и сроки', 'Заказы и история их обработки', 'Документы и переписка по заказу']);
    dialogAction.innerHTML = 'Посмотреть возможности <span aria-hidden="true">↓</span>';
    dialogNote.textContent = 'На этой странице показан пример интерфейса. Вход и регистрация пока недоступны.';
    showDialog(element);
  });
});
document.querySelectorAll('[data-service]').forEach(button => button.addEventListener('click', () => {
  dialogMode = 'brief';
  activeService = button.dataset.service;
  const service = services[activeService];
  activeBrief = 'client';
  document.getElementById('dialog-eyebrow').textContent = 'РЕШЕНИЕ ДЛЯ ВАШЕГО БИЗНЕСА';
  dialogTitle.textContent = service.title;
  dialogDescription.textContent = service.description;
  setDialogItems(service.items);
  dialogAction.innerHTML = 'Создать заявку <span aria-hidden="true">↗</span>';
  dialogNote.textContent = 'Состав услуг зависит от выбранного партнёра и требований к грузу.';
  showDialog(button);
}));

function downloadBrief(type, serviceName) {
  const partner = type === 'partner';
  const lines = partner
    ? ['БРИФ СКЛАДСКОГО ПАРТНЁРА — ЛАДСКЛАД', '', 'Название компании:', 'Город и адрес склада:', 'Тип склада:', 'Общая и свободная площадь:', 'Количество свободных паллетомест:', 'Температурные режимы:', 'Доступные складские операции:', 'Режим работы и условия приёмки:', 'Контактное лицо:', 'Телефон / email:', 'Дополнительная информация:']
    : ['БРИФ НА ПОДБОР СКЛАДА — ЛАДСКЛАД', '', 'Компания:', 'Контактное лицо:', 'Телефон / email:', 'Город и желаемый район:', `Решение: ${serviceName || ''}`, 'Тип и описание груза:', 'Количество паллет / коробов:', 'Вес и габариты:', 'Предполагаемая дата размещения:', 'Срок хранения:', 'Температурный режим и особые условия:', 'Нужные операции (приёмка, комплектация, упаковка и т. д.):', 'Примерная частота приёмок и отгрузок:', 'Дополнительные пожелания:'];
  lines.push('', 'Заполните бриф и передайте вашему менеджеру. Скачивание файла не отправляет заявку.');
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = partner ? 'ladsklad-partner-brief.txt' : 'ladsklad-storage-brief.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  dialogFeedback.textContent = 'Бриф подготовлен к скачиванию. Заполните его и передайте менеджеру.';
}
dialogAction.addEventListener('click', () => {
  if (dialogMode === 'login') {
    dialogFocusTarget = document.getElementById('platform-title');
    dialog.close();
    document.getElementById('platform').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    return;
  }
  if (activeService) {
    const service = activeService;
    const trigger = dialogTrigger;
    openBrief('client', trigger, service);
    return;
  }
  downloadBrief(activeBrief, selectedServiceName);
});
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.getElementById('dialog-secondary').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  selectedServiceName = '';
  if (dialogFocusTarget) dialogFocusTarget.focus({ preventScroll: true });
});

// Keep one FAQ answer expanded to make the section easy to scan.
const faqItems = [...document.querySelectorAll('.faq-list details')];
faqItems.forEach(item => item.addEventListener('toggle', () => {
  if (item.open) faqItems.forEach(other => { if (other !== item) other.open = false; });
}));
