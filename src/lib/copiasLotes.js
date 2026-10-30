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

// ── Duplicados ──────────────────────────────────────────────────────────────
//
// Esta parte estaba escrita dentro de la pantalla y tenía tres cosas que, a la
// vez, se llevaron por delante datos de verdad:
//
//   1. Comparaba con JSON.stringify a pelo, que depende del ORDEN de los
//      campos. El servidor no garantiza ese orden, así que dos fichas
//      idénticas podían no parecerlo — y dos que sí lo parecían, serlo por
//      accidente. Aquí se usa firmaRegistro(), que ordena las claves.
//   2. Borraba sin mirar CUÁNTO iba a borrar. Si por lo que fuera todas las
//      fichas salían con la misma firma, se llevaba la sección entera.
//   3. Si un registro venía sin id, metía ese "sin id" en la lista de borrar.
//
// Ahora la decisión se toma aquí, sin tocar el servidor, y se puede enseñar
// antes de borrar nada.

/** Qué hace que dos registros sean "el mismo". Sin id ni fechas del servidor. */
export function firmaDeContenido(registro) {
  return firmaRegistro(sinMetadatos(registro));
}

/** El más antiguo de dos registros (el que se conserva por defecto). */
function esMasAntiguo(a, b) {
  const fa = Date.parse(a?.created_date || '') || Infinity;
  const fb = Date.parse(b?.created_date || '') || Infinity;
  if (fa !== fb) return fa < fb;
  return false;   // a igualdad, manda el que llegó primero
}
/** El más reciente de dos registros (el que se conserva al limpiar tras restaurar). */
function esMasReciente(a, b) {
  const fa = Date.parse(a?.created_date || '') || 0;
  const fb = Date.parse(b?.created_date || '') || 0;
  if (fa !== fb) return fa > fb;
  return false;
}

/**
 * Decide qué duplicados sobran, SIN borrar nada.
 *
 * Por defecto, de cada grupo de fichas iguales se conserva la MÁS ANTIGUA (la
 * original) y sobran las demás. Tras una restauración interesa lo contrario:
 * conservar la MÁS RECIENTE —el dato que ya estaba en vivo suele ser más
 * nuevo que el de la copia— y quitar el anterior. Se elige con
 * `opciones.conservar`: 'antiguo' (por defecto) o 'reciente'.
 *
 * Un registro sin id nunca se marca para borrar: no se puede borrar por id, y
 * meterlo en la lista era pedir un borrado a ciegas.
 *
 * @returns {{grupos: Array, aBorrar: Array, seConservan: number, total: number, sinId: number}}
 */
export function planDuplicados(registros, opciones = {}) {
  const conservar = opciones.conservar === 'reciente' ? 'reciente' : 'antiguo';
  const porFirma = new Map();
  let sinId = 0;

  for (const r of registros || []) {
    if (!r || typeof r !== 'object') continue;
    if (!r.id) { sinId++; continue; }          // no se toca lo que no se puede identificar
    const firma = firmaDeContenido(r);
    if (!porFirma.has(firma)) porFirma.set(firma, []);
    porFirma.get(firma).push(r);
  }

  const grupos = [];
  const aBorrar = [];
  let seConservan = 0;

  for (const [firma, lista] of porFirma) {
    seConservan++;
    if (lista.length < 2) continue;
    let original = lista[0];
    for (const r of lista) {
      if (conservar === 'reciente') { if (esMasReciente(r, original)) original = r; }
      else { if (esMasAntiguo(r, original)) original = r; }
    }
    const sobran = lista.filter((r) => r.id !== original.id);
    grupos.push({ firma, conserva: original, sobran });
    for (const r of sobran) aBorrar.push(r);
  }

  return {
    grupos,
    aBorrar,
    seConservan,
    sinId,
    total: (registros || []).length,
  };
}

/**
 * Cuánto es demasiado. Por encima de esto no se borra sin que alguien lo diga
 * expresamente, porque un plan que se lleva casi toda una sección casi nunca
 * es un plan bueno: es una comparación que ha salido mal.
 */
export const TOPE_BORRADO = 0.5;

/**
 * ¿Es razonable ejecutar este plan de borrado?
 *
 * @returns {{seguro: boolean, motivo: string, proporcion: number}}
 */
export function revisarPlanDuplicados(plan, tope = TOPE_BORRADO) {
  const total = plan?.total || 0;
  const cuantos = plan?.aBorrar?.length || 0;
  const proporcion = total > 0 ? cuantos / total : 0;

  if (cuantos === 0) {
    return { seguro: true, motivo: 'No hay duplicados que borrar.', proporcion: 0 };
  }
  if (plan.seConservan === 0) {
    return {
      seguro: false,
      proporcion,
      motivo: 'El plan no dejaría ni un registro. Eso no es un duplicado: es un fallo al comparar. No se borra nada.',
    };
  }
  if (proporcion > tope) {
    return {
      seguro: false,
      proporcion,
      motivo: `El plan borraría el ${Math.round(proporcion * 100)}% de la sección (${cuantos} de ${total}). `
        + 'Eso casi nunca son duplicados de verdad, así que no se hace solo: míralo antes en la lista.',
    };
  }
  return { seguro: true, motivo: '', proporcion };
}

/**
 * Deja una lista sin repetidos, para que la COPIA salga limpia sin tocar el
 * servidor. Es lo que se pidió: que la copia no se lleve el mismo fichero
 * cuatro veces.
 *
 * @returns {{limpios: Array, quitados: number}}
 */
export function quitarDuplicados(registros) {
  const plan = planDuplicados(registros);
  if (plan.aBorrar.length === 0) return { limpios: registros || [], quitados: 0 };
  const fuera = new Set(plan.aBorrar.map((r) => r.id));
  return {
    limpios: (registros || []).filter((r) => !(r?.id && fuera.has(r.id))),
    quitados: plan.aBorrar.length,
  };
}