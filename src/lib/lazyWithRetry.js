/**
 * lazyWithRetry — React.lazy que se autoarregla cuando un chunk stale
 * no se puede cargar (típico tras un deploy o un sync de Git: el navegador
 * tiene un index.html viejo que apunta a hashes de chunk que ya no existen).
 *
 * Sin esto, el intento de import() rechaza la promesa, el ErrorBoundary más
 * cercano muestra la pantalla "La página no se cargó correctamente" y el
 * usuario tiene que pulsar "Recargar página" a mano. Con esto, la primera
 * vez que un chunk falla se recarga la página una sola vez: el navegador
 * vuelve a pedir el index.html actual con los hashes correctos y la página
 * carga sola.
 *
 * ANTI-BUCLE: la marca de "ya recargué" se guarda en sessionStorage, no en
 * window. Si se guarda solo en window, al recargar la página la marca se
 * pierde y, si el chunk sigue sin cargar, se vuelve a recargar para siempre
 * ("se queda recargando y no abre"). Con sessionStorage, tras UNA recarga
 * fallida el error sube al ErrorBoundary y el usuario ve el botón de
 * "Recargar página" en vez de un bucle sin fin. La marca se limpia cuando la
 * página carga bien, para no bloquear recargas legítimas del futuro.
 */
import { lazy } from 'react';

const FLAG = '__lazyChunkReloaded';

// Si un chunk no carga, antes de recargar se tira la caché del service worker
// y se da de baja el propio SW. Sin esto, la recarga vuelve a servir el chunk
// envenenado y la página sigue sin cargar ("Recargar y no hace nada").
async function limpiarCacheYSW() {
  try {
    if (window.caches && caches.keys) {
      const ks = await caches.keys();
      await Promise.all(ks.map((k) => caches.delete(k)));
    }
  } catch { /* no hay caches disponibles */ }
  try {
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      const rs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(rs.map((r) => r.unregister()));
    }
  } catch { /* sin service worker */ }
}

function yaSeRecargo() {
  try { return sessionStorage.getItem(FLAG) === '1'; } catch { return false; }
}
function marcarRecargado() {
  try { sessionStorage.setItem(FLAG, '1'); } catch { /* sessionStorage no disponible */ }
}
function limpiarMarca() {
  try { sessionStorage.removeItem(FLAG); } catch { /* noop */ }
}

export function lazyWithRetry(loader) {
  return lazy(() =>
    loader()
      .then((mod) => { limpiarMarca(); return mod; })
      .catch(async (err) => {
        if (typeof window !== 'undefined' && !yaSeRecargo()) {
          marcarRecargado();
          await limpiarCacheYSW();
          window.location.reload();
        }
        throw err;
      })
  );
}