const CACHE = 'kostkompas-v3-4';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './recipes.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './familien-forside.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const changing = /\/(?:index\.html|app\.js|styles\.css|recipes\.json)$/.test(url.pathname) || event.request.mode === 'navigate';
  if (changing) {
    event.respondWith(fetch(event.request).then(response => {
      const clone=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,clone)); return response;
    }).catch(()=>caches.match(event.request).then(r=>r||caches.match('./index.html'))));
  } else {
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{
      const clone=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,clone)); return response;
    })));
  }
});