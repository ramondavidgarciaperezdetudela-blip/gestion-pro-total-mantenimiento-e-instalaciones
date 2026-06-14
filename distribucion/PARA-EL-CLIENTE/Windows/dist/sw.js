// Service Worker - Caché offline para SAT Manager
// Estrategia: Cache-first para assets estáticos, Network-first para API

const CACHE_NAME = 'sat-manager-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Instalación: pre-cachear assets estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activación: eliminar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: estrategia según tipo de recurso
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar peticiones GET
  if (request.method !== 'GET') return;

  // Ignorar extensiones de Chrome y peticiones de otros orígenes no relevantes
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Para assets estáticos (JS, CSS, imágenes): cache-first
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Para navegación (HTML/SPA): network-first con fallback a index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) => cached || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Para peticiones de API de base44: network-first, sin cachear (datos sensibles)
  if (url.hostname.includes('base44') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }
});
