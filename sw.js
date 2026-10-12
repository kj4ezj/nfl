const CACHE = 'zanzu-vue-3.5.43'; // bump to invalidate everything below
const VUE = 'https://cdnjs.cloudflare.com/ajax/libs/vue/3.5.43/vue.global.prod.js';
const PRECACHE = ['/', '/favicon.ico', '/icon.png', '/icon.svg', '/index.html', VUE];

// pre-cache on install so the very first offline load works
self.addEventListener('install', event => event.waitUntil(precache()));
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(PRECACHE);
  await self.skipWaiting();
}

// drop every cache that isn't the current name, then take over open tabs
self.addEventListener('activate', event => event.waitUntil(cleanup()));
async function cleanup() {
  const names = await caches.keys();
  await Promise.all(names.filter(n => n !== CACHE).map(n => caches.delete(n)));
  await self.clients.claim();
}

async function fetchThenCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(CACHE)).put(request, response.clone());
    return response;
  } catch {
    return caches.match(request);
  }
}

// network-first: always fresh when online, cache only as the offline fallback
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const cacheable = event.request.method === 'GET' && (url.origin === self.location.origin || event.request.url === VUE) && !url.pathname.endsWith('/sw.js');
  if (cacheable) event.respondWith(fetchThenCache(event.request));
});
