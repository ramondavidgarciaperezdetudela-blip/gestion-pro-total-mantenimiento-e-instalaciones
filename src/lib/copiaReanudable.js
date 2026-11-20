// Copia de seguridad REANUDABLE (móvil).
//
// Si Android cierra el programa a mitad de una copia (se queda sin memoria, se va la pantalla…), lo ya escrito NO se pierde:
// la copia se escribe directamente en el fichero definitivo, página a página, y un diario apunta hasta dónde se llegó.
// Al volver, se sigue desde ese punto.
//
// Todo el acceso a ficheros va por `fs` (se inyecta), para poder probarlo sin móvil.
export const CLAVE_DIARIO = 'gpt_copia_en_curso';
export const EDAD_MAX = 3 * 24 * 60 * 60 * 1000;   // pasados 3 días ya no se retoma
export const MAX_REINTENTOS = 6;                    // si se cierra otra vez y otra vez, se deja de insistir solo

export function leerDiario(almacen = globalThis.localStorage, ahora = Date.now()) {
  try {
    const d = JSON.parse(almacen.getItem(CLAVE_DIARIO) || 'null');
    if (!d || !d.id || !d.nombre || !Array.isArray(d.entidades) || ahora - d.creado > EDAD_MAX) return null;
    return d;
  } catch { return null; }
}
export function guardarDiario(d, almacen = globalThis.localStorage) { try { almacen.setItem(CLAVE_DIARIO, JSON.stringify(d)); } catch { /* sin sitio */ } }
export function borrarDiario(almacen = globalThis.localStorage) { try { almacen.removeItem(CLAVE_DIARIO); } catch { /* da igual */ } }
export const nuevoDiario = (nombre, entidades, ahora = Date.now()) => ({
  id: String(ahora), nombre, creado: ahora, entidades: [...entidades], hechas: {}, actual: null, bytes: 0, intentos: 0, cabecera: false, dir: '', ruta: '',
});
/** Secciones que faltan por copiar (la que estaba a medias va la primera, porque el orden se respeta). */
export const pendientes = (d) => d.entidades.filter((e) => !(e in d.hechas));
/** Cada vez que se retoma tras un cierre, las páginas son la mitad de grandes (mínimo 100): menos memoria por vez. */
export const tamPaginaPara = (d, base = 1000) => Math.max(100, Math.floor(base / 2 ** Math.min(d?.intentos || 0, 4)));

const bytesDe = (t) => new TextEncoder().encode(t).length;

/**
 * Escritor DIRECTO: va escribiendo en el fichero definitivo (en la carpeta elegida) a medida que se lee, sin acumular nada.
 * Tras cada página apunta en el diario cuántos bytes lleva escritos; si el programa se cierra, al volver se comprueba el
 * fichero y se sigue por ahí.
 *
 * @param fs { anadir(texto), tamano():Promise<number>, recortar(bytes), cerrar():Promise<object>, cancelar() }
 */
export function crearEscritorReanudable({ fs, diario, guardar = () => {}, umbral = 256 * 1024 }) {
  let buf = '';
  let escritos = diario.bytes || 0;
  const volcar = async () => { if (!buf) return; const t = buf; buf = ''; await fs.anadir(t); escritos += bytesDe(t); };
  const obj = {
    /** Al retomar: el fichero debe tener justo lo apuntado. Si quedó un trozo de más (cierre en pleno guardado), se recorta. */
    async comprobarFichero() {
      const tam = await fs.tamano();
      if (tam === escritos) return true;
      if (tam > escritos) { await fs.recortar(escritos); return true; }
      return false;   // el fichero es más corto de lo apuntado: no se puede seguir
    },
    escribir: async (t) => { buf += t; if (buf.length >= umbral) await volcar(); },
    /** Punto seguro: todo lo escrito hasta aquí está en el fichero y apuntado. */
    punto: async (info = {}) => {
      await volcar();
      diario.bytes = escritos;
      if (info.cabecera) diario.cabecera = true;
      if (info.hecha) { diario.hechas[info.hecha] = info.n || 0; diario.actual = null; }
      else if (info.ent) diario.actual = { ent: info.ent, skip: info.skip || 0, n: info.n || 0 };
      guardar(diario);
    },
    cerrar: async () => {
      await volcar(); diario.bytes = escritos; guardar(diario);
      try { const fin = await fs.cerrar(); return { ...fin, bytes: escritos }; }
      catch (e) { return { ok: false, error: e?.message || String(e) }; }
    },
    cancelar: async () => { buf = ''; try { await fs.cancelar(); } catch { /* da igual */ } },
  };
  return obj;
}
