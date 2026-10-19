/* Сайт «Там, где растёт»: инструкция для своего телефона, галерея, ссылка на бота, кнопка внизу экрана. */
(function () {
  'use strict';
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var mine = ios ? 'iphone' : android ? 'android' : null;

  // Меню: тонкая линия снизу, когда страница прокручена
  var nav = document.getElementById('nav');
  var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Инструкции: на телефоне видна одна — для своего телефона
  var ways = document.querySelector('.ways');
  var tabs = document.querySelectorAll('.os-tabs [data-os]');
  function show(os) {
    ways.dataset.show = os;
    tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t.dataset.os === os)); });
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.os); }); });
  document.querySelectorAll('[data-os-link]').forEach(function (a) {
    a.addEventListener('click', function () { show(a.dataset.osLink); });
  });
  if (mine) {
    document.getElementById(mine).classList.add('mine');
    show(mine);
  }

  // iPhone: APK не подходит — главная кнопка «Играть»
  var stickyBtn = document.getElementById('sticky-btn');
  if (ios) {
    document.getElementById('apk').classList.add('muted');
    stickyBtn.href = 'app/';
    stickyBtn.lastChild.textContent = 'Играть';
    stickyBtn.querySelector('use').setAttribute('href', '#i-play');
  }

  // Кнопка внизу экрана: видна, когда кнопки первого экрана ушли вверх, и прячется у инструкций
  var sticky = document.getElementById('sticky');
  var cta = document.querySelector('.hero .cta');
  var install = document.getElementById('install');
  if ('IntersectionObserver' in window && cta && install) {
    var pastHero = false, inInstall = false;
    var update = function () {
      var on = pastHero && !inInstall;
      sticky.classList.toggle('show', on);
      sticky.setAttribute('aria-hidden', String(!on));
      stickyBtn.tabIndex = on ? 0 : -1;
    };
    new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting && e[0].boundingClientRect.top < 0; update(); }).observe(cta);
    new IntersectionObserver(function (e) { inInstall = e[0].isIntersecting; update(); }, { threshold: 0.2 }).observe(install);
  }

  // Галерея: миниатюры переключают большой скриншот
  var shot = document.getElementById('shot');
  var caption = document.getElementById('shot-caption');
  var thumbs = document.querySelectorAll('.gallery-thumbs button');
  thumbs.forEach(function (b) {
    b.addEventListener('click', function () {
      shot.src = b.dataset.src;
      shot.alt = b.querySelector('img').alt;
      caption.textContent = b.dataset.caption;
      thumbs.forEach(function (t) { t.setAttribute('aria-selected', String(t === b)); });
    });
  });

  // Ссылка на бота: её знает сервер игры. Пока он не ответил (или спит) — кнопки Telegram скрыты
  var api = window.GARDEN_API;
  if (api) {
    fetch(api + '/api/auth/bot')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (bot) {
        if (!bot || !bot.url) return;
        document.querySelectorAll('[data-bot]').forEach(function (a) { a.href = bot.url; a.hidden = false; });
      })
      .catch(function () {});
  }
})();
