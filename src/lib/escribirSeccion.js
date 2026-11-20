// Escribe una sección de la copia de seguridad en trozos pequeños.
// Antes cada sección salía como UN solo texto (JSON.stringify de todos sus registros): con miles de fichas con fotos eran
// cientos de MB de golpe y Android cerraba la aplicación. Ahora ningún trozo pasa de ~1 MB (salvo una ficha suelta más grande).
export const TROZO_BYTES = 1024 * 1024;

export async function escribirSeccionPorTrozos(fichero, nombre, registros, { trozoBytes = TROZO_BYTES, respiro = () => new Promise((r) => setTimeout(r, 0)) } = {}) {
  await fichero.escribir(`,\n${JSON.stringify(nombre)}:[`);
  let partes = [];
  let tam = 0;
  let primero = true;
  const volcar = async () => {
    if (!partes.length) return;
    await fichero.escribir((primero ? '' : ',') + partes.join(','));
    primero = false; partes = []; tam = 0;
    await respiro();
  };
  for (const r of registros || []) {
    const s = JSON.stringify(r);
    if (partes.length && tam + s.length > trozoBytes) await volcar();
    partes.push(s); tam += s.length;
  }
  await volcar();
  await fichero.escribir(']');
}

/**
 * Igual, pero la sección se va leyendo por páginas mientras se escribe: `leer(anadir)` llama a `anadir(registros)` con cada
 * página y devuelve cuántos registros hubo. Solo hay una página en memoria a la vez.
 */
export async function escribirSeccionPorPaginas(fichero, nombre, leer, { trozoBytes = TROZO_BYTES, respiro = () => new Promise((r) => setTimeout(r, 0)), reanudar = null } = {}) {
  // reanudar: la sección ya estaba empezada en el fichero (copia retomada tras un cierre): no se vuelve a abrir ni se repite la coma.
  if (!reanudar) await fichero.escribir(`,\n${JSON.stringify(nombre)}:[`);
  let primero = !reanudar || !reanudar.n;
  const anadir = async (registros) => {
    let partes = []; let tam = 0;
    const volcar = async () => {
      if (!partes.length) return;
      await fichero.escribir((primero ? '' : ',') + partes.join(','));
      primero = false; partes = []; tam = 0;
      await respiro();
    };
    for (const r of registros || []) {
      const s = JSON.stringify(r);
      if (partes.length && tam + s.length > trozoBytes) await volcar();
      partes.push(s); tam += s.length;
    }
    await volcar();
  };
  const n = await leer(anadir);
  await fichero.escribir(']');
  return n;
}
