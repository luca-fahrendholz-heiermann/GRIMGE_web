// GRIMGE Prototype — service worker (user, 11 Nov 2026: the phone should pick up a new version by itself).
// Network first: every file is asked from the server with revalidation (no stale browser cache), so a reload always
// gets the current version; the last good copy is kept and used when there is no connection.
const CACHE = 'grimge-runtime-v1';

self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  /* The version stamp is never served from a cache (app_update.js compares it). */
  if (url.pathname.endsWith('/version.json')) return;
  event.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res.ok && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}));
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (hit) return hit;
      /* Last resort: the browser's own request, so a fault in here can never lock the game out. */
      return fetch(req);
    }
  })());
});
