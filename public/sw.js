/*
 * Service Worker — caché para poder trabajar sin cobertura.
 *
 * ─── EL FALLO QUE ARREGLA ESTE FICHERO, PARA QUE NO VUELVA ──────────────────
 *
 * La versión anterior usaba un nombre de caché fijo ('sat-manager-v3') y
 * guardaba los ficheros con estrategia "primero la caché". Como el nombre no
 * cambiaba nunca, al activarse NO borraba nada: la caché iba acumulando los
 * ficheros de todas las versiones publicadas.
 *
 * Y ahí está el problema. Vite le pone a cada fichero un nombre con el hash de
 * su contenido (index-fShDFwNh.js), así que al actualizar cambian de nombre.
 * Los nuevos se bajaban de la red y los viejos seguían saliendo de la caché,
 * de modo que el programa acababa enlazando trozos de dos versiones distintas:
 *
 *     SyntaxError: The requested module './index-XXXX.js'
 *                  does not provide an export named 'bz'
 *
 * Resultado: pantalla en blanco, o el "La página no se cargó correctamente"
 * del móvil. Y no se arreglaba solo, porque la caché envenenada seguía ahí
 * después de reinstalar.
 *
 * ─── CÓMO SE EVITA AHORA ────────────────────────────────────────────────────
 *
 * 1. El nombre de la caché lleva la versión dentro. La versión llega en la URL
 *    con la que se registra (/sw.js?v=1.61.0), que la pone el propio programa
 *    al compilar. Cambia la versión → cambia el nombre → al activarse se
 *    borran TODAS las demás. Nunca conviven dos versiones.
 *
 * 2. El index.html no se pre-cachea al instalar. Se guarda cada vez que se
 *    carga bien de la red, así que la copia de emergencia es siempre la última
 *    que funcionó, no la del día que se instaló.
 *
 * 3. Si un fichero no se puede bajar, se deja pasar el error de red en vez de
 *    devolver una respuesta vacía. Una respuesta vacía se traga el fallo y
 *    deja la pantalla en blanco sin decir por qué; el error de verdad hace que
 *    el navegador lo cuente y que el rescate del index.html pueda actuar.
 */

const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE_NAME = `gestion-pro-total-${VERSION}`;
const SHELL = '/index.html';

self.addEventListener('install', (event) => {
  // Sin pre-caché del index: se guarda solo, y actualizado, en cada carga
  // buena. Solo se adelanta el manifiesto, que no cambia entre versiones.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(['/manifest.json']).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // Aquí está la clave: fuera todo lo que no sea de ESTA versión.
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  // Botón de emergencia: el programa puede pedir que se vacíe todo y se quite
  // el service worker de en medio, para poder arrancar limpio.
  if (event.data === 'limpiar-cache') {
    event.waitUntil(
      caches.keys()
        .then((claves) => Promise.all(claves.map((k) => caches.delete(k))))
        .then(() => self.registration.unregister())
        .catch(() => {}),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // Navegación (abrir el programa): primero la red, y se guarda lo que venga
  // para tenerlo cuando no haya cobertura.
  if (request.mode === 'navigate') {
    // Sin pasar por la caché del navegador: si no, al actualizar podía servir
    // el index.html viejo, que apunta a ficheros que ya no existen.
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => fetch(request))
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(SHELL, copia)).catch(() => {});
          }
          return respuesta;
        })
        .catch(() => caches.match(SHELL).then((guardado) => guardado
          || new Response('Sin conexión y sin copia guardada.', { status: 503 }))),
    );
    return;
  }

  // Las llamadas al servidor no se cachean nunca: son datos, y algunos
  // sensibles. Si no hay red, se contesta con un error claro.
  if (url.hostname.includes('base44') || url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(JSON.stringify({ error: 'offline' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })),
    );
    return;
  }

  // Ficheros del programa (js, css, imágenes, tipos de letra). Solo los de
  // esta versión están en la caché, así que "primero la caché" ya es seguro.
  const esFicheroDelPrograma = url.origin === self.location.origin
    && /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname);

  if (esFicheroDelPrograma) {
    event.respondWith(
      caches.match(request).then((guardado) => {
        if (guardado) return guardado;
        return fetch(request).then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copia)).catch(() => {});
          }
          return respuesta;
        });
        // Ojo: sin .catch(). Si falla, que falle de verdad y se vea.
      }),
    );
  }
});
