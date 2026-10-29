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
 * carga sola. El guardia `__lazyChunkReloaded` evita bucles si el chunk
 * realmente no existe (entonces el error sube al ErrorBoundary, como antes).
 */
import { lazy } from 'react';

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

export function lazyWithRetry(loader) {
  return lazy(() =>
    loader().catch(async (err) => {
      if (typeof window !== 'undefined' && !window.__lazyChunkReloaded) {
        window.__lazyChunkReloaded = true;
        await limpiarCacheYSW();
        window.location.reload();
      }
      throw err;
    })
  );
}