// Mesmo número de js/version.js.
const CACHE = 'treino-1.9.0';

const ASSETS = [
  './', './index.html', './manifest.webmanifest', './css/style.css',
  './js/app.js', './js/router.js', './js/store.js', './js/ui.js', './js/timer.js', './js/version.js',
  './js/dates.js', './js/strava.js', './js/shortcuts.js', './js/icons.js', './js/calc.js', './js/plan.js', './js/pickers.js', './js/bodymap.js',
  './js/data/exercises.js', './js/data/foods.js', './js/data/muscles.js',
  './js/views/day.js', './js/views/day-meals.js', './js/views/day-training.js', './js/views/day-results.js',
  './js/views/calendar.js', './js/views/workouts.js', './js/views/editor.js', './js/views/session.js',
  './js/views/history.js', './js/views/progress.js', './js/views/settings.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
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

// Rede primeiro (pega versão nova na hora); cache se estiver offline ou a rede demorar > 3 s.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const network = fetch(e.request, { cache: 'no-cache' }).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
    }
    return res;
  });
  const slow = new Promise((_, reject) => setTimeout(reject, 3000));
  e.respondWith(
    Promise.race([network, slow]).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || network))
  );
});
