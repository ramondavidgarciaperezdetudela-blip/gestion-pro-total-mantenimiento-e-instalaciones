/**
 * novedades.js — leer el CHANGELOG del programa para enseñarlo por pantalla.
 *
 * Por qué existe: el historial interno de la app solo anota ediciones de DATOS
 * (clientes, documentos…), porque es lo único que pasa por ChangeLogger. Los
 * cambios del programa —arreglos, mejoras, cosas internas— se escriben en
 * CHANGELOG.md, que vive en el repositorio y no se veía desde el programa. Al
 * mirar el historial parecía que no había pasado nada en días enteros.
 *
 * Aquí se lee ese fichero, que se empaqueta DENTRO del programa al compilar,
 * así que funciona sin conexión y sin ir a buscar nada a GitHub.
 */

// El ?raw hace que Vite meta el fichero tal cual, como texto, en el programa.
import textoChangelog from '../../CHANGELOG.md?raw';

/** Los apartados que usa el CHANGELOG, con su color y su orden. */
export const APARTADOS = {
  'Añadido': { color: 'emerald', icono: '✨', orden: 1 },
  'Corregido': { color: 'red', icono: '🔧', orden: 2 },
  'Mejorado': { color: 'blue', icono: '⚡', orden: 3 },
  'Mejorado (rendimiento y fiabilidad)': { color: 'blue', icono: '⚡', orden: 3 },
  'Cambios internos': { color: 'slate', icono: '🔩', orden: 4 },
  'Eliminado': { color: 'amber', icono: '🗑️', orden: 5 },
  'Seguridad': { color: 'violet', icono: '🔒', orden: 6 },
};

const colorDe = (titulo) => APARTADOS[titulo]?.color || 'slate';
const iconoDe = (titulo) => APARTADOS[titulo]?.icono || '•';

/**
 * Parte el CHANGELOG en versiones, y cada versión en apartados.
 *
 * No se usa una librería de Markdown a propósito: el fichero tiene una forma
 * fija y conocida (## versión → ### apartado → lista), y meter un analizador
 * entero para esto sería cargar medio megabyte de más en el programa.
 *
 * @returns {Array<{version, fecha, apartados: Array<{titulo, color, icono, puntos: string[]}>}>}
 */
export function leerNovedades(texto = textoChangelog) {
  const versiones = [];
  let versionActual = null;
  let apartadoActual = null;

  const cerrarPunto = () => {
    if (apartadoActual && apartadoActual.pendiente) {
      apartadoActual.puntos.push(limpiar(apartadoActual.pendiente));
      apartadoActual.pendiente = '';
    }
  };

  for (const linea of String(texto || '').split('\n')) {
    // ## [1.70.0] — 2026-10-28
    const mVersion = linea.match(/^##\s+\[?([0-9][^\]\s]*)\]?\s*[—–-]?\s*(.*)$/);
    if (mVersion) {
      cerrarPunto();
      versionActual = { version: mVersion[1], fecha: (mVersion[2] || '').trim(), apartados: [] };
      apartadoActual = null;
      versiones.push(versionActual);
      continue;
    }
    if (!versionActual) continue;

    // ### Corregido
    const mApartado = linea.match(/^###\s+(.*)$/);
    if (mApartado) {
      cerrarPunto();
      const titulo = mApartado[1].trim();
      apartadoActual = { titulo, color: colorDe(titulo), icono: iconoDe(titulo), puntos: [], pendiente: '' };
      versionActual.apartados.push(apartadoActual);
      continue;
    }
    if (!apartadoActual) continue;

    // Sub-punto: va sangrado. Se mira ANTES que el punto normal, porque si no
    // una lista sangrada se tomaría por puntos sueltos y se perdería a quién
    // pertenecen (en el CHANGELOG la sangría es de dos espacios).
    const mSub = linea.match(/^\s{2,}[-*]\s+(.*)$/);
    if (mSub) {
      if (apartadoActual.pendiente) apartadoActual.pendiente += `\n· ${limpiar(mSub[1])}`;
      else apartadoActual.pendiente = mSub[1];
      continue;
    }

    // - Un punto nuevo (sin sangrar)
    const mPunto = linea.match(/^[-*]\s+(.*)$/);
    if (mPunto) {
      cerrarPunto();
      apartadoActual.pendiente = mPunto[1];
      continue;
    }

    // Continuación del punto anterior (el CHANGELOG parte las líneas largas).
    if (linea.trim() && apartadoActual.pendiente) {
      apartadoActual.pendiente += ` ${linea.trim()}`;
      continue;
    }
    if (!linea.trim()) cerrarPunto();
  }
  cerrarPunto();

  // Los apartados, en el orden de siempre y sin los que quedaron vacíos.
  for (const v of versiones) {
    v.apartados = v.apartados
      .filter((a) => a.puntos.length > 0)
      .sort((a, b) => (APARTADOS[a.titulo]?.orden || 9) - (APARTADOS[b.titulo]?.orden || 9))
      .map(({ pendiente, ...resto }) => resto);
  }
  return versiones;
}

/** Quita el marcado de Markdown que no se va a pintar. */
function limpiar(t) {
  return String(t)
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();
}

/** Trocea un punto en «título en negrita» y «explicación». */
export function partirPunto(texto) {
  const m = String(texto).match(/^\*\*(.+?)\*\*[.:]?\s*(.*)$/s);
  // El punto final suele ir DENTRO de la negrita; fuera del título queda mejor.
  if (m) return { titulo: m[1].trim().replace(/[.:]$/, ''), detalle: m[2].trim() };
  return { titulo: '', detalle: String(texto).replace(/\*\*/g, '').trim() };
}

/** Cuántos cambios hay en una versión, para enseñarlo de un vistazo. */
export function cuantosCambios(version) {
  return (version?.apartados || []).reduce((n, a) => n + a.puntos.length, 0);
}
