// Copia de seguridad REANUDABLE (móvil).
//
// Si Android cierra el programa a mitad de una copia (se queda sin memoria, se va la pantalla…), lo ya escrito NO se pierde:
// la copia se va guardando en tramos pequeños y un diario apunta hasta dónde se llegó. Al volver, se sigue desde el último
// punto guardado y, al final, los tramos se unen en el fichero definitivo.
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
  id: String(ahora), nombre, creado: ahora, entidades: [...entidades], hechas: {}, actual: null, siguienteParte: 0, intentos: 0, cabecera: false,
});
/** Secciones que faltan por copiar (la que estaba a medias va la primera, porque el orden se respeta). */
export const pendientes = (d) => d.entidades.filter((e) => !(e in d.hechas));
/** Cada vez que se retoma tras un cierre, las páginas son la mitad de grandes (mínimo 100): menos memoria por vez. */
export const tamPaginaPara = (d, base = 1000) => Math.max(100, Math.floor(base / 2 ** Math.min(d?.intentos || 0, 4)));
export const nombreParte = (k) => `${String(k).padStart(6, '0')}.parte`;

/**
 * @param fs { escribirParte(nombre,texto), leerParte(nombre), crearFinal(), anadirFinal(texto), cerrarFinal(), borrarPartes(), cancelarFinal() }
 */
export function crearEscritorReanudable({ fs, diario, guardar = () => {}, umbral = 512 * 1024 }) {
  let buf = '';
  let sig = diario.siguienteParte || 0;     // las partes escritas tras el último punto se vuelven a escribir encima
  const volcar = async () => { if (!buf) return; const k = sig++; await fs.escribirParte(nombreParte(k), buf); buf = ''; };
  const obj = {
    alMontar: null, alProgreso: null,
    escribir: async (t) => { buf += t; if (buf.length >= umbral) await volcar(); },
    /** Punto seguro: todo lo escrito hasta aquí queda guardado y apuntado. Si el programa se cierra, se sigue desde aquí. */
    punto: async (info = {}) => {
      await volcar();
      diario.siguienteParte = sig;
      if (info.cabecera) diario.cabecera = true;
      if (info.hecha) { diario.hechas[info.hecha] = info.n || 0; diario.actual = null; }
      else if (info.ent) diario.actual = { ent: info.ent, skip: info.skip || 0, n: info.n || 0 };
      guardar(diario);
    },
    cerrar: async () => {
      await obj.punto();
      const total = diario.siguienteParte;
      try {
        await fs.crearFinal();
        let bytes = 0;
        for (let k = 0; k < total; k++) {
          const t = await fs.leerParte(nombreParte(k));
          await fs.anadirFinal(t);
          bytes += new TextEncoder().encode(t).length;
          if (obj.alMontar) await obj.alMontar(t);
          obj.alProgreso?.(k + 1, total);
        }
        const fin = await fs.cerrarFinal();
        await fs.borrarPartes();
        return { ...fin, bytes };
      } catch (e) {
        try { await fs.cancelarFinal(); } catch { /* da igual */ }
        return { ok: false, error: e?.message || String(e) };
      }
    },
    cancelar: async () => { try { await fs.cancelarFinal(); } catch { /* */ } try { await fs.borrarPartes(); } catch { /* */ } },
  };
  return obj;
}
