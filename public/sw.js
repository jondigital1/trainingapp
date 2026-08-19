// Offline boot. Without this, opening the app with no signal gets you the
// browser's dinosaur rather than your training log, because the app itself has
// to come down the wire before it can show you anything.
//
// Two strategies, chosen by what the request is for. Build output is hashed and
// immutable, so it is served from the cache and never revalidated. Everything
// else goes to the network first and falls back to the cache, so you get the
// current version whenever there is a connection and the last one when there
// is not.
//
// What this does not do is make the data offline. That is the app's job, and
// it keeps its own copy of the last load in localStorage.

const VERSION = 'v3'
const SHELL = `shell-${VERSION}`
const ASSETS = `assets-${VERSION}`

// The pages worth having when there is no network. The root is the app; login
// is where an expired session lands.
const SHELL_URLS = ['/', '/login']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_URLS))
      // A shell that will not precache is not a reason to refuse to install.
      // The network first handler fills the cache on the first successful load.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

function isImmutable(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Anything not served by this origin is somebody else's problem, and
  // Supabase in particular must never be answered from a cache.
  if (url.origin !== self.location.origin) return

  if (isImmutable(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(ASSETS).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => (await caches.match(request)) ?? (await caches.match('/')) ?? Response.error()),
    )
  }
})

// The rest timer asks for this when it starts, so the alert can fire from here
// rather than from a page that may have been put to sleep.
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'rest-done') return
  event.waitUntil(
    self.registration.showNotification('Rest is up', {
      body: data.name ? `Next set of ${data.name}` : 'Next set',
      tag: 'training-log-rest',
      renotify: true,
      silent: false,
    }),
  )
})

// A message sent from the server, which is the only kind that reaches a phone
// locked in a pocket. The page that started the rest is asleep by then; this
// worker is woken by the push service to show it.
self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    // A push with an unreadable body still has to show something, because
    // every browser requires a visible notification for every push.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'Rest is up', {
      body: payload.body || 'Next set',
      // Same tag as the on-device one, so a phone that woke up and fired both
      // shows one notification rather than two.
      tag: 'training-log-rest',
      renotify: true,
      silent: false,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((all) => {
      const open = all.find((c) => 'focus' in c)
      return open ? open.focus() : self.clients.openWindow('/')
    }),
  )
})
