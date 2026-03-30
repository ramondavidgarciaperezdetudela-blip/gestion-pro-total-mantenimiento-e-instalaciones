/**
 * Precarga silenciosa de páginas y datos frecuentes en background.
 * Se llama una vez desde el Layout para que las rutas más visitadas
 * ya estén listas antes de que el usuario navegue a ellas.
 */

let prefetchDone = false;

export function prefetchPages() {
  if (prefetchDone) return;
  prefetchDone = true;

  // Delay corto para no competir con el render inicial
  setTimeout(() => {
    // Precargar chunks de las páginas más usadas
    import('../pages/SAT');
    import('../pages/Contacts');
    import('../pages/Agenda');
    import('../pages/Documents');
    import('../pages/Maintenance');
    import('../pages/ContactDetail');
  }, 800);

  // Precargar datos en cache
  setTimeout(() => {
    import('./homeDataCache').then(({ getHomeData }) => getHomeData());
  }, 200);
}