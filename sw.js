/* Service worker: ¿A qué jugamos? — funciona sin conexión */
const CACHE = 'juegos-cartas-v3';

/* Núcleo de la app que se guarda nada más instalar */
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

// Al actualizarse solo borra sus cachés (juegos-cartas-*): en la misma web hay otras apps con las suyas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('juegos-cartas-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req).then((res) => {
        // Guarda en caché lo del propio origen y las fuentes de Google,
        // para que tras la primera visita online todo funcione offline.
        try {
          const url = new URL(req.url);
          const sameOrigin = url.origin === self.location.origin;
          const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.host);
          if (res && res.ok && (sameOrigin || isFont)) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
        } catch (_) { /* ignora */ }
        return res;
      }).catch(() => {
        // Sin conexión y sin caché: para navegaciones, devuelve la app.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
