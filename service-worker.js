// Cambia questa versione ogni volta che aggiorni i file dell'app,
// cosi il service worker invalida la cache vecchia e scarica quella nuova.
const CACHE_VERSION = 'v1';
const CACHE_NAME = `mytube-cache-${CACHE_VERSION}`;

// Elenca qui i file "core" dell'app da rendere disponibili offline.
// Adatta i percorsi ai nomi reali dei tuoi file (es. app.js, style.css, ecc.)
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app1.js',
  './manifest.json',
  './icons/icon-512.png',

];

// Installazione: precache dei file core
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Attivazione: elimina le cache vecchie
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Strategia di fetch:
// - Per le chiamate verso l'API di YouTube (o altre API esterne): sempre network,
//   MAI cache (dati dinamici, cambiano in continuazione).
// - Per gli asset dell'app (HTML/CSS/JS/icone): cache-first con fallback network,
//   cosi l'app si apre anche offline o con connessione scarsa.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Non intercettare chiamate API esterne (YouTube Data API, embed player, ecc.)
  if (
    url.origin.includes('googleapis.com') ||
    url.origin.includes('youtube.com') ||
    url.origin.includes('ytimg.com')
  ) {
    return; // lascia passare la richiesta normalmente, senza cache
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Metti in cache solo risposte valide e stesso-origine
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline e non in cache: se e' una pagina, prova a servire index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});