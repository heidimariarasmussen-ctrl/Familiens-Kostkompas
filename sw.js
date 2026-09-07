const CACHE = 'kostkompas-v4-2';
const CORE = [
  './',
  './index.html',
  './styles.css',
  './hotfix-v413.css',
  './fix-v414.css',
  './app.js',
  './recipes.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './familien-forside.png',
  './portions-v3.json',
  './shopping-v4.json',
  './ingredient-registry-v4.json',
  './planner-shared.png',
  './planner-flex.png',
  './profile-alex.png',
  './profile-heidi.png',
  './profile-kids.png',
  './images/alex-oatmeal.png',
  './images/heidi-skyr.png',
  './images/heidi-salmon.png',
  './images/comfort-01.webp',
  './images/comfort-02.webp',
  './images/comfort-03.webp',
  './images/comfort-04.webp',
  './images/comfort-05.webp',
  './images/comfort-06.webp',
  './images/comfort-07.webp',
  './images/comfort-08.webp',
  './images/comfort-09.webp',
  './images/comfort-10.webp'
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
  const changing = /\/(?:index\.html|app\.js|styles\.css|recipes\.json|shopping-v4\.json|ingredient-registry-v4\.json)$/.test(url.pathname) || event.request.mode === 'navigate';
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