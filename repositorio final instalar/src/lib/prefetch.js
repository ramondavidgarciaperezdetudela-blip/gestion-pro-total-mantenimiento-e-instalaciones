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

  // Cargar de 1 en 1 con idle callback para no bloquear el hilo principal
  let i = 0;
  function loadNext() {
    if (i >= pagesToPrefetch.length) return;
    const p = pagesToPrefetch[i];
    i++;
    // requestIdleCallback garantiza que no interfiere con el scroll/render
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        import(/* @vite-ignore */ p);
        setTimeout(loadNext, 800);
      }, { timeout: 3000 });
    } else {
      setTimeout(() => {
        import(/* @vite-ignore */ p);
        loadNext();
      }, 1000);
    }
  }
  // Esperar más tiempo antes del primer prefetch
  setTimeout(loadNext, 2000);
}