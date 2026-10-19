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

export function lazyWithRetry(loader) {
  return lazy(() =>
    loader().catch((err) => {
      if (typeof window !== 'undefined' && !window.__lazyChunkReloaded) {
        window.__lazyChunkReloaded = true;
        window.location.reload();
      }
      throw err;
    })
  );
}