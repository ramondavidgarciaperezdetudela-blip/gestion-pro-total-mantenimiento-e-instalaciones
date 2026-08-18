/**
 * Precarga silenciosa de páginas y datos frecuentes en segundo plano.
 * Se llama una vez desde el Layout para que las rutas más visitadas
 * ya estén listas antes de que el usuario navegue a ellas.
 *
 * OJO con cómo se escriben estas importaciones: tienen que ser literales
 * para que Vite las reconozca al compilar y las convierta en la ruta real del
 * fichero empaquetado. Si se le pasa una variable (aunque sea con
 * @vite-ignore), el navegador intenta resolver '../pages/SAT' contra la
 * carpeta /assets/ y pide '/pages/SAT', que no existe: la precarga no
 * precarga nada y encima deja promesas rechazadas sueltas.
 *
 * Por lo mismo, TODA precarga lleva su .catch(): esto es una mejora de
 * velocidad, y que falle no puede tumbar ni bloquear la aplicación.
 */

let precargaHecha = false;

// Literales, uno por página: es lo que permite a Vite empaquetarlas bien.
const CARGADORES = [
  () => import('../pages/SAT'),
  () => import('../pages/Contacts'),
  () => import('../pages/Agenda'),
  () => import('../pages/Documents'),
  () => import('../pages/Maintenance'),
  () => import('../pages/ContactDetail'),
  () => import('../pages/SATChat'),
];

export function prefetchPages() {
  if (precargaHecha) return;
  precargaHecha = true;

  // Datos de la pantalla de inicio primero, que es lo que se ve al entrar.
  import('./homeDataCache')
    .then(({ getHomeData }) => getHomeData())
    .catch(() => { /* sin conexión se cargará al entrar; no es un error */ });

  // Las páginas, de una en una y en los huecos libres, para no competir con
  // el primer dibujado ni con el scroll.
  let i = 0;
  function siguiente() {
    if (i >= CARGADORES.length) return;
    const cargar = CARGADORES[i];
    i++;
    const lanzar = () => {
      Promise.resolve()
        .then(cargar)
        .catch(() => { /* la página se cargará cuando se entre en ella */ });
      setTimeout(siguiente, 800);
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(lanzar, { timeout: 3000 });
    } else {
      setTimeout(lanzar, 1000);
    }
  }
  setTimeout(siguiente, 2000);
}
