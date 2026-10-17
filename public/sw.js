// Vision Storms Energy Exchanges — minimal service worker for installable "Add to Home Screen"
// play. Strategy is deliberately simple: stale-while-revalidate for the app's own static files
// (the hashed JS/CSS bundle, fonts, icons, 3D models, textures), and network-only for everything
// else (API calls to /api/*, the websocket, any cross-origin request). This means a repeat visit
// loads instantly from cache while a fresh copy downloads quietly in the background for next
// time — it never traps you on a stale build, and it never tries to cache live game data.
const CACHE = 'vsw-static-v1'
const STATIC_EXT = /\.(?:js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|webp|svg|glb|gltf)$/

self.addEventListener('install', (e) => { self.skipWaiting() })
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return
  if (!STATIC_EXT.test(url.pathname) && url.pathname !== '/manifest.webmanifest') return

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req)
      const fetchFresh = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone())
        return res
      }).catch(() => cached)
      return cached || fetchFresh
    })
  )
})
