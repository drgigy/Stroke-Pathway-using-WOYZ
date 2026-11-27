const CACHE = 'woyz-stroke-notes-20261127-kpi-later-inputs-v1';
const ASSETS = ['./kpi-parameter-guide.js','./protocol-kpi-values.js','./dashboard-data.js','./kpi-policy.js','./protocol-timings.js','./account-session.js','./background-config.js','./background-upload.js','./entry-order.js','./protocol-print.js','./protocol-print.css','./dictation-panel.js','./dictation-panel.css','./dictation-output.js','./dictation-request.js','./master-admin.html', './master-admin.css', './master-admin-ui.js', './index.html', './admin-reference.css', './admin-review.css', './admin-review.js', './workspace-shell.js', './dashboard.html', './user.html', './offline.html', './access.js', './roles.js', './account-provisioning.js', './dashboard-access.js', './shared-key.js', './pwa.js', './page-mode.js', './protocol-dictation.js', './protocol-reference.js', './sidebar-controls.js', './protocol-viewer.js', './kpi-workspace.js', './kpi-workspace.css', './kpi-schema.js', './kpi-calculations.js', './kpi-data.js', './kpi-store.js', './protocol-zoom.js', './protocol-pages.js', './protocol-fields.js', './protocol-field-output.js', './protocol-form-overlay.js', './protocol-form-editor.js', './protocol-patient.js', './shared.css', './firebase-config.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const root = new URL('./', self.location.href);
const PROTOCOL_CACHE='woyz-stroke-protocol-e191e7e836f9-six-pages-v4';
const PROTOCOL_ASSETS=[1,2,3,4,6,9].map(number=>`./protocol/page-${number}.svg`);
const protocolPaths=new Set(PROTOCOL_ASSETS.map(asset=>new URL(asset,root).pathname));
let protocolWarmup;
self.addEventListener('message',event=>{
 if(event.data?.type!=='CACHE_PROTOCOL_FORMS')return;
 if(!protocolWarmup)protocolWarmup=caches.open(PROTOCOL_CACHE).then(cache=>Promise.allSettled(PROTOCOL_ASSETS.map(async asset=>{const url=new URL(asset,root).href;if(await cache.match(url))return;const response=await fetch(url,{cache:'no-cache'});if(response.ok)await cache.put(url,response);}))).finally(()=>{protocolWarmup=null;});
 event.waitUntil(protocolWarmup);
});
const paths = new Set(ASSETS.map(asset => new URL(asset, root).pathname));
const pagePaths = new Set(['master-admin.html', 'index.html', 'dashboard.html', 'user.html', ''].map(page => new URL(page, root).pathname));
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS.map(asset => new Request(new URL(asset, root), { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => (key.startsWith('woyz-stroke-notes-') && key !== CACHE)||(key.startsWith('woyz-stroke-protocol-') && key !== PROTOCOL_CACHE)).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Only public static assets are cached. Firebase/Gemini requests, keys, cases and audio never enter this cache.
  if (event.request.method !== 'GET' || url.origin !== root.origin) return;
  if (event.request.mode === 'navigate' && pagePaths.has(url.pathname)) {
    event.respondWith(fetch(event.request, { cache: 'no-cache' }).catch(() => caches.match(new URL('./offline.html', root).href)));
    return;
  }
  const blankProtocol=protocolPaths.has(url.pathname);
  if (!paths.has(url.pathname) && !blankProtocol) return;
  const key = new URL(url.pathname, root.origin).href;
  if(blankProtocol){
    event.respondWith((async()=>{let cache;try{cache=await caches.open(PROTOCOL_CACHE);const cached=await cache.match(key);if(cached)return cached;}catch{}const response=await fetch(event.request,{cache:'no-cache'});if(response.ok&&cache)event.waitUntil(cache.put(key,response.clone()).catch(()=>{}));return response;})());
    return;
  }
  event.respondWith(fetch(event.request, { cache: 'no-cache' }).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy)).catch(() => {})); }
    return response;
  }).catch(() => caches.match(key)));
});
