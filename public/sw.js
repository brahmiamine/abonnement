const CACHE = 'subly-shell-v3'
// Chemin de base déduit du scope d'enregistrement (plus de chemin codé en dur).
const BASE = new URL(self.registration.scope).pathname
const CORE = [BASE, BASE + 'manifest.webmanifest', BASE + 'icon.svg', BASE + 'icon-192.png', BASE + 'icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(async () => {
        const cached = await caches.match(event.request)
        if (cached) return cached
        if (event.request.mode === 'navigate') return caches.match(BASE)
        return Response.error()
      }),
  )
})

// Notification push envoyée par la fonction send-reminders (application fermée comprise).
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Subly', {
      body: payload.body || '',
      icon: BASE + 'icon-192.png',
      badge: BASE + 'icon-192.png',
      tag: payload.tag,
      data: { url: payload.url || BASE },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || BASE
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes(BASE))
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    }),
  )
})
