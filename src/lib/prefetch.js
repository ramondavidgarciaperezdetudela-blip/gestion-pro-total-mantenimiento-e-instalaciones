/**
 * Precarga silenciosa de páginas y datos frecuentes en background.
 * Se llama una vez desde el Layout para que las rutas más visitadas
 * ya estén listas antes de que el usuario navegue a ellas.
 */

let prefetchDone = false;

export function prefetchPages() {
  if (prefetchDone) return;
  prefetchDone = true;

  // Precargar datos en caché inmediatamente (mayor prioridad)
  import('./homeDataCache').then(({ getHomeData }) => getHomeData());

  // Precargar chunks de las páginas más usadas tras el render inicial
  const pagesToPrefetch = [
    '../pages/SAT',
    '../pages/Contacts',
    '../pages/Agenda',
    '../pages/Documents',
    '../pages/Maintenance',
    '../pages/ContactDetail',
    '../pages/SATChat',
  ];

  // Cargar de 2 en 2 para no saturar la red
  let i = 0;
  function loadNext() {
    if (i >= pagesToPrefetch.length) return;
    const batch = pagesToPrefetch.slice(i, i + 2);
    batch.forEach(p => import(/* @vite-ignore */ p));
    i += 2;
    setTimeout(loadNext, 600);
  }
  setTimeout(loadNext, 500);
}