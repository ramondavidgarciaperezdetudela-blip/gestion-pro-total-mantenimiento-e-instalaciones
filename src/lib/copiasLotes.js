/**
 * copiasLotes.js — La parte de la copia de seguridad que no habla con nadie.
 *
 * Aquí está lo que decide QUÉ hay que mandar al servidor y CÓMO agruparlo.
 * Va aparte del motor a propósito: sin depender del servidor se puede
 * comprobar de verdad, y es justo la parte donde estaba el problema de
 * lentitud, así que conviene tenerla vigilada.
 */

/** Campos que pone el servidor y que no deben viajar de vuelta. */
export const CAMPOS_DEL_SERVIDOR = ['id', 'created_date', 'updated_date', 'created_by'];

/** Quita del registro lo que pone el servidor. */
export function sinMetadatos(r) {
  const out = { ...r };
  for (const k of CAMPOS_DEL_SERVIDOR) delete out[k];
  return out;
}

// Cuántos registros van en cada petición en bloque. El servidor admite 500,
// pero un registro con fotos dentro puede ocupar mucho, así que también se
// corta por tamaño: manda lo que llegue antes de los dos límites.
export const LOTE_MAX = 250;
export const LOTE_BYTES = 2 * 1024 * 1024;

/**
 * Parte una lista en lotes por número de elementos Y por tamaño.
 *
 * Sin el corte por tamaño, 250 órdenes de SAT con fotos dentro se irían en una
 * sola petición de decenas de MB: o la rechaza el servidor o tarda una
 * eternidad. Sin el corte por número, 250 clientes de tres campos irían en
 * 250 peticiones distintas cuando caben de sobra en una.
 *
 * Un registro que por sí solo pase del límite se manda igual: mejor una
 * petición grande que perder el registro.
 */
export function enLotes(lista, maxElementos = LOTE_MAX, maxBytes = LOTE_BYTES) {
  const lotes = [];
  let actual = [];
  let bytes = 0;
  for (const item of lista || []) {
    const tam = JSON.stringify(item)?.length || 0;
    if (actual.length && (actual.length >= maxElementos || bytes + tam > maxBytes)) {
      lotes.push(actual);
      actual = [];
      bytes = 0;
    }
    actual.push(item);
    bytes += tam;
  }
  if (actual.length) lotes.push(actual);
  return lotes;
}

/**
 * Firma de un registro para saber si ha cambiado, sin que importe el orden de
 * los campos: el servidor puede devolver las claves en otro orden y seguiría
 * siendo el mismo registro.
 */
export function firmaRegistro(valor) {
  if (valor === null || typeof valor !== 'object') return JSON.stringify(valor) ?? 'null';
  if (Array.isArray(valor)) return `[${valor.map(firmaRegistro).join(',')}]`;
  const claves = Object.keys(valor).sort();
  return `{${claves.map((k) => `${JSON.stringify(k)}:${firmaRegistro(valor[k])}`).join(',')}}`;
}

/**
 * Decide qué hacer con cada registro de la copia: crearlo, actualizarlo o
 * dejarlo en paz.
 *
 * AQUÍ ESTABA LA LENTITUD. Antes se mandaba una petición de actualización por
 * CADA registro que ya existía, aunque no hubiera cambiado ni una coma. Al
 * restaurar tu propia copia eso es prácticamente todo: miles de peticiones
 * para dejar los datos exactamente como estaban. Ahora se compara y lo que
 * está igual no se toca.
 *
 * @param {Array} existentes  lo que hay ahora en el servidor
 * @param {Array} filas       lo que trae la copia
 * @param {Function|null} clave  cómo reconocer que dos registros son el mismo
 * @returns {{aCrear:Array, aActualizar:Array, sinCambios:number}}
 */
export function planRestauracion(existentes, filas, clave) {
  const aCrear = [];
  const aActualizar = [];
  let sinCambios = 0;

  if (clave) {
    const porClave = new Map();
    for (const r of existentes || []) {
      const k = clave(r);
      if (k) porClave.set(k, r);
    }
    for (const fila of filas || []) {
      const k = clave(fila);
      const datos = sinMetadatos(fila);
      const actual = k ? porClave.get(k) : null;
      if (!actual) { aCrear.push(datos); continue; }
      if (firmaRegistro(sinMetadatos(actual)) === firmaRegistro(datos)) { sinCambios++; continue; }
      // bulkUpdate quiere el id junto a los campos, no aparte.
      aActualizar.push({ id: actual.id, ...datos });
    }
    return { aCrear, aActualizar, sinCambios };
  }

  // Sin forma de reconocerlos (registros de tipo histórico, que solo se
  // añaden): se cotejan por contenido exacto para no duplicarlos.
  const firmas = new Set((existentes || []).map((r) => firmaRegistro(sinMetadatos(r))));
  for (const fila of filas || []) {
    const datos = sinMetadatos(fila);
    if (firmas.has(firmaRegistro(datos))) { sinCambios++; continue; }
    aCrear.push(datos);
  }
  return { aCrear, aActualizar, sinCambios };
}

/** Cuántas peticiones costaría un plan, para poder medirlo. */
export function peticionesDelPlan(plan) {
  return enLotes(plan.aCrear).length + enLotes(plan.aActualizar).length;
}
