const CACHE = 'woyz-stroke-notes-20261122-owner-roles';
const ASSETS = ['./master-admin.html', './index.html', './dashboard.html', './user.html', './offline.html', './access.js', './roles.js', './account-provisioning.js', './dashboard-access.js', './shared-key.js', './pwa.js', './protocol-dictation.js', './protocol-reference.js', './sidebar-controls.js', './protocol-viewer.js', './protocol-pages.js', './protocol-fields.js', './protocol-field-output.js', './protocol-form-overlay.js', './shared.css', './firebase-config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const root = new URL('./', self.location.href);
const paths = new Set(ASSETS.map(asset => new URL(asset, root).pathname));
const pagePaths = new Set(['master-admin.html', 'index.html', 'dashboard.html', 'user.html', ''].map(page => new URL(page, root).pathname));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(asset => new Request(new URL(asset, root), { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('woyz-stroke-notes-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Only public static assets are cached. Firebase/Gemini requests, keys, cases and audio never enter this cache.
  if (event.request.method !== 'GET' || url.origin !== root.origin) return;
  if (event.request.mode === 'navigate' && pagePaths.has(url.pathname)) {
    event.respondWith(fetch(event.request, { cache: 'no-cache' }).catch(() => caches.match(new URL('./offline.html', root).href)));
    return;
  }
  const blankProtocol = url.pathname.startsWith(new URL('./protocol/', root).pathname) && /\/page-[1-9]\.svg$/.test(url.pathname);
  if (!paths.has(url.pathname) && !blankProtocol) return;
  const key = new URL(url.pathname, root.origin).href;
  event.respondWith(fetch(event.request, { cache: 'no-cache' }).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)).catch(() => {})); }
    return response;
  }).catch(() => caches.match(key)));
});
