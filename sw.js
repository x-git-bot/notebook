// Offline-first shell: the app opens with no internet. Notes data is cached in IndexedDB by index.html.
const CACHE = 'notes-shell-v11';
const SHELL = ['/', '/index.html', '/manifest.json', '/template.html', '/icons/icon-192.png', '/icons/icon-512.png'];
const FONTS = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.pathname.startsWith('/api/')) return;
  const store = r => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; };
  if (FONTS.test(u.hostname)) {           // fonts: cache once, reuse offline
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(store).catch(() => new Response('', { status: 504 }))));
    return;
  }
  if (u.origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {   // app files: cache first, refresh in background
    const net = fetch(req).then(store).catch(() => hit || caches.match('/index.html'));
    return hit || net;
  }));
});
