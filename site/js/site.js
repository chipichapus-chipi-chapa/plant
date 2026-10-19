/* Сайт установки: живая сцена из спрайтов игры, инструкция для своего телефона, ссылка на бота. */
(function () {
  'use strict';
  var ua = navigator.userAgent;
  var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /Android/.test(ua);
  var mine = ios ? 'iphone' : android ? 'android' : null;

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
  var sticky = document.getElementById('sticky');
  var stickyBtn = document.getElementById('sticky-btn');
  if (ios) {
    document.getElementById('apk').classList.add('muted');
    stickyBtn.href = 'app/';
    stickyBtn.textContent = 'Играть';
    stickyBtn.classList.replace('berry', 'glow');
  }

  // Закреплённая кнопка: видна, когда кнопки первого экрана ушли вверх, и прячется у инструкций
  var cta = document.querySelector('.cta');
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
    new IntersectionObserver(function (e) { inInstall = e[0].isIntersecting; update(); }, { threshold: 0.25 }).observe(install);
  }

  // Ссылка на бота: её знает сервер игры. Пока он не ответил (или спит) — кнопки Telegram скрыты
  var api = window.GARDEN_API;
  var botLinks = document.querySelectorAll('[data-bot]');
  if (api) {
    fetch(api + '/api/auth/bot')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (bot) {
        if (!bot || !bot.url) return;
        botLinks.forEach(function (a) { a.href = bot.url; a.hidden = false; });
      })
      .catch(function () {});
  }
  if (!api) document.getElementById('telegram').querySelector('[data-bot]').hidden = true;

  // Сцена: Мята между двумя исполинскими лилиями, светлячки — из атласа игры
  var canvas = document.getElementById('scene');
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Promise.all([
    fetch('app/assets/atlas.json').then(function (r) { return r.json(); }),
    new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = 'app/assets/atlas.png';
    }),
  ]).then(function (loaded) {
    var frames = loaded[0].frames, img = loaded[1];
    var lily = frames.prop_giant_lily_awakened;
    var cats = [frames.npc_myata_0, frames.npc_myata_1].filter(Boolean);
    var flies = [];
    for (var i = 0; i < 9; i++) flies.push({ x: Math.random() * 160, y: 10 + Math.random() * 70, p: Math.random() * 6.28 });

    function draw(t) {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, 160, 96);
      if (lily) {
        ctx.drawImage(img, lily.x, lily.y, lily.w, lily.h, -6, 0, lily.w, lily.h);
        ctx.save();
        ctx.translate(166, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, lily.x, lily.y, lily.w, lily.h, 0, 0, lily.w, lily.h);
        ctx.restore();
      }
      var cat = cats[Math.floor(t / 700) % cats.length];
      if (cat) ctx.drawImage(img, cat.x, cat.y, cat.w, cat.h, 64, 48, cat.w, cat.h);
      flies.forEach(function (f) {
        var a = 0.5 + 0.5 * Math.sin(t / 600 + f.p);
        ctx.fillStyle = 'rgba(255, 207, 122, ' + a.toFixed(2) + ')';
        ctx.fillRect(Math.round(f.x + 4 * Math.sin(t / 1900 + f.p)), Math.round(f.y + 3 * Math.cos(t / 1500 + f.p)), 1, 1);
      });
      if (!still) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }).catch(function () {
    canvas.hidden = true; // без картинки страница всё равно работает
  });
})();
