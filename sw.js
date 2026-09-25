// Offline support. Vault files are encrypted, so caching them is safe.
const SHELL = 'mt-shell-a7be51623f';
const ASSETS = 'mt-assets';
const CORE = ['./', 'index.html', 'vault/app.bin', 'manifest.webmanifest', 'icon.svg', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('mt-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isAsset = url.pathname.includes('/vault/') && !url.pathname.endsWith('/app.bin');
  if (isAsset) {
    // Content-addressed names never change: cache first.
    e.respondWith(caches.open(ASSETS).then(async c => {
      const hit = await c.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    }));
    return;
  }
  // Shell + trip data: network first so updates show up, cache when offline.
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(SHELL).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});
