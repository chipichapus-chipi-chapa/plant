// Игра переехала в app/. Этот файл снимает старый сервис-воркер, который
// был зарегистрирован на корне сайта до переезда, — чтобы он не отдавал старую страницу.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // только кэш сада до переезда: на этом домене (github.io) живут и другие сайты, например «Огонёк»
      .then((keys) => Promise.all(keys.filter((k) => k === 'where-grows-v1').map((k) => caches.delete(k))))
      .then(() => self.registration.unregister()),
  )
})
