// Cambia CACHE_VERSION solo se vuoi forzare la pulizia della cache.
// Con la strategia "network-first" gli aggiornamenti su Git si vedono comunque da soli.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `mytube-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './footer.css',
  './libreria.css',
  './app1.js',
  './playlist.js',
  './animation.js',
  './cerca.js',
  './libreria.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // un file mancante non deve far fallire tutta l'installazione
      Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: prova sempre la rete (così vedi subito gli aggiornamenti),
// la cache serve solo da riserva se sei offline.
// YouTube, googleapis e immagini esterne NON vengono toccati.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
      )
  );
});
