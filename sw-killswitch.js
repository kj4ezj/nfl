// kill switch — deploy as sw.js to unregister and wipe everything
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(selfDestruct()));
async function selfDestruct() {
  const names = await caches.keys();
  await Promise.all(names.map(n => caches.delete(n)));
  await self.registration.unregister();
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.navigate(c.url));
}
