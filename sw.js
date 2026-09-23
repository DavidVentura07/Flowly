// data.js no toca el DOM: se reutiliza aquí para saber qué figuras precargar.
importScripts('data.js');

const CACHE = 'flowly-v7';
const FONTS = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
const ASSETS = [
  './', './index.html', './style.css', './app.js', './data.js', './manifest.json',
  './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png',
  ...new Set(ALL_SEED_EXERCISES.filter(e => e.fig).map(e => './' + exImageSrc(e.fig))),
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(ASSETS);
    try { await c.add(FONTS); } catch (err) { /* sin red para las fuentes: se usan las del sistema */ }
  }));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    // red primero para el código, así las actualizaciones llegan de inmediato
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // fuentes: caché primero
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    })));
  }
});
