// Troque a versão a cada deploy para o iPhone baixar os arquivos novos.
const CACHE = 'treino-v3';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/router.js',
  './js/store.js',
  './js/ui.js',
  './js/timer.js',
  './js/dates.js',
  './js/strava.js',
  './js/calc.js',
  './js/plan.js',
  './js/pickers.js',
  './js/bodymap.js',
  './js/data/exercises.js',
  './js/data/foods.js',
  './js/data/muscles.js',
  './js/views/day.js',
  './js/views/day-meals.js',
  './js/views/day-training.js',
  './js/views/day-results.js',
  './js/views/calendar.js',
  './js/views/workouts.js',
  './js/views/editor.js',
  './js/views/session.js',
  './js/views/history.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache primeiro (funciona offline na academia), rede como fallback.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request))
  );
});
