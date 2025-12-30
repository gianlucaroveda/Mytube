// service-worker.js

const CACHE_NAME = 'mytube-v1';
const TO_CACHE = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json'];

// Install: cache risorse
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(TO_CACHE))
      .catch(() => {})
  );
});

// Activate: claim immediato
self.addEventListener('activate', event => {
  self.clients.claim();
});

// Fetch handler
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.mode === 'navigate') {
    // Offline fallback su index.html
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  event.respondWith(
    caches.match(req).then(r => r || fetch(req))
  );
});
