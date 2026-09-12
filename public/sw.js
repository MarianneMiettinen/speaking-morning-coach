// Bumped on purpose: activating a new name purges every older cache below.
const CACHE = 'morning-coach-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Only the truly static shell bits. The HTML is deliberately NOT precached —
  // see the navigation handler below.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/manifest.json', '/favicon.svg']).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            // Leave the model/voice caches alone — they are ~90MB and are
            // managed by transformers.js, not by this worker.
            .filter((k) => k.startsWith('morning-coach-') && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Don't touch cross-origin traffic at all: the model weights come from
  // Hugging Face and already have their own Cache Storage entry. Mirroring
  // them here would store ~90MB twice.
  if (url.origin !== self.location.origin) return;

  // Navigations go to the network first. Serving a cached index.html
  // cache-first pins the app to whatever bundle was current at install time —
  // every future deploy becomes invisible until site data is cleared.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Build output is content-hashed, so a hit is always the right bytes.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Everything else same-origin (icons, character art): serve cached for speed
  // but refresh in the background so updates land on the next load.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
