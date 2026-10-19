// Сервис-воркер приложения: игра открывается мгновенно и без сети показывает графику.
// Запросы к серверу игры (другой домен) не трогаем — прогресс всегда свежий.
const PREFIX = 'where-grows-'
const CACHE = PREFIX + 'v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      // только свои старые кэши: на этом же домене (github.io) живут другие сайты, например «Огонёк»
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Страница — сначала из сети (там новые версии), без сети — из кэша
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() => caches.match(request).then((hit) => hit ?? caches.match(self.registration.scope))),
    )
    return
  }

  // Скрипты, стили, атлас, иконки — из кэша сразу, а в фоне обновляем
  event.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((hit) => {
        const fresh = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => hit)
        return hit ?? fresh
      }),
    ),
  )
})
