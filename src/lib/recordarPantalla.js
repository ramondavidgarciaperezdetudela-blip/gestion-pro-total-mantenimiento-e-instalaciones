// Recuerda en qué pantalla estabas trabajando. Si la aplicación se reinicia (Android cierra la ventana al irse a
// WhatsApp o a la cámara, el ordenador la recarga, se actualiza…), al volver se abre ESA pantalla y no el menú.
// Solo se recupera si el reinicio es reciente (por defecto 15 min): abrir el programa al día siguiente sigue empezando en el menú.
const CLAVE = 'gpt_ultima_pantalla';
export const VENTANA_MS = 15 * 60 * 1000;
const PUBLICAS = ['/presupuesto-publico', '/sat-publico', '/verificar-documento', '/nota-publica'];

const esPublica = (r) => PUBLICAS.some((p) => String(r).toLowerCase().startsWith(p));
const esInicio = (ruta) => ruta === '/' || ruta === '';

export function guardarPantalla(ruta, almacen = globalThis.localStorage, ahora = Date.now()) {
  try {
    if (!ruta || esInicio(String(ruta).split('?')[0]) || esPublica(ruta)) { almacen.removeItem(CLAVE); return; }
    almacen.setItem(CLAVE, JSON.stringify({ ruta, t: ahora }));
  } catch { /* sin almacenamiento */ }
}

/** Devuelve la ruta a recuperar, o null si hay que quedarse donde se está. Solo se llama una vez, al arrancar. */
export function pantallaARecuperar(rutaActual, almacen = globalThis.localStorage, ahora = Date.now()) {
  try {
    if (!esInicio(String(rutaActual).split('?')[0])) return null;
    const g = JSON.parse(almacen.getItem(CLAVE) || 'null');
    if (!g?.ruta || esPublica(g.ruta) || ahora - g.t > VENTANA_MS || ahora - g.t < 0) return null;
    return g.ruta;
  } catch { return null; }
}
