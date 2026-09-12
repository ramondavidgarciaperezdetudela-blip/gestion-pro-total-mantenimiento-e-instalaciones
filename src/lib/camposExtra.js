/**
 * camposExtra.js — Guardar lo que el servidor no quiere guardar.
 *
 * EL PROBLEMA
 *
 * Base44 solo guarda los campos que están declarados en la ficha desde su
 * panel. Si se le manda uno que no tiene, NO da error: lo tira a la basura y
 * contesta "guardado". Eso es lo que pasaba con los datos del compresor y con
 * la hoja de inspección sanitaria: se escribían, se guardaba, y al reabrir la
 * ficha ya no estaban.
 *
 * Se podría pedir que se añadieran a mano en el panel, y de hecho es lo suyo.
 * Pero mientras eso no pase, el trabajo del día se sigue perdiendo — y quien
 * está delante de una cámara a las once de la noche no tiene por qué saber lo
 * que es declarar un campo en una entidad.
 *
 * LA SOLUCIÓN
 *
 * Lo que el servidor descarte se guarda aparte, en SystemSettings, que sí
 * existe y sí acepta texto libre: una fila por ficha, con la clave
 * "extra:MaintenanceSheet:<id>" y el contenido en JSON. Al cargar las fichas
 * se vuelve a pegar donde iba.
 *
 * No pisa nada: si algún día esos campos se declaran en el panel, el servidor
 * empezará a devolverlos y lo de aquí deja de usarse solo, porque solo se
 * rellena lo que viene vacío.
 */

export const PREFIJO = 'extra';

/** La clave con la que se guarda el sobrante de un registro. */
export function claveDe(entidad, id) {
  return `${PREFIJO}:${entidad}:${id}`;
}

/** Solo los campos indicados, y solo si traen algo. */
export function soloEstos(datos, campos) {
  const salida = {};
  for (const c of campos || []) {
    const v = datos?.[c];
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    salida[c] = v;
  }
  return salida;
}

/**
 * Pega el sobrante en los registros, SIN pisar lo que ya venga del servidor.
 *
 * @param {Array} registros
 * @param {Map<string, object>} sobrantes  id → campos guardados aparte
 */
export function conExtras(registros, sobrantes) {
  if (!sobrantes || sobrantes.size === 0) return registros || [];
  return (registros || []).map((r) => {
    const extra = sobrantes.get(r?.id);
    if (!extra) return r;
    const copia = { ...r };
    for (const [k, v] of Object.entries(extra)) {
      const actual = copia[k];
      const vacio = actual === undefined || actual === null || actual === ''
        || (Array.isArray(actual) && actual.length === 0)
        || (typeof actual === 'object' && !Array.isArray(actual) && Object.keys(actual).length === 0);
      if (vacio) copia[k] = v;      // el servidor manda; esto solo rellena huecos
    }
    return copia;
  });
}

/** Guarda (o actualiza) el sobrante de un registro. */
export async function guardarExtras(base44, entidad, id, datos) {
  if (!id) return { ok: false, motivo: 'sin_id' };
  const key = claveDe(entidad, id);
  const value = JSON.stringify(datos || {});
  try {
    const filas = await base44.entities.SystemSettings.filter({ key });
    if (filas?.[0]) await base44.entities.SystemSettings.update(filas[0].id, { key, value });
    else await base44.entities.SystemSettings.create({ key, value });
    return { ok: true };
  } catch (e) {
    return { ok: false, motivo: String(e?.message || e) };
  }
}

/** Todo el sobrante guardado de una entidad. Devuelve un Map id → campos. */
export async function leerExtras(base44, entidad) {
  const mapa = new Map();
  const inicio = `${PREFIJO}:${entidad}:`;
  try {
    const filas = await base44.entities.SystemSettings.filter({}, null, 2000, 0);
    for (const f of filas || []) {
      const k = String(f?.key || '');
      if (!k.startsWith(inicio)) continue;
      try { mapa.set(k.slice(inicio.length), JSON.parse(f.value || '{}')); }
      catch { /* una fila estropeada no puede tirar las demás */ }
    }
  } catch { /* sin conexión: se sigue sin el sobrante */ }
  return mapa;
}

/** Quita el sobrante de un registro que ya no existe. */
export async function borrarExtras(base44, entidad, id) {
  try {
    const filas = await base44.entities.SystemSettings.filter({ key: claveDe(entidad, id) });
    for (const f of filas || []) await base44.entities.SystemSettings.delete(f.id);
    return true;
  } catch {
    return false;
  }
}
