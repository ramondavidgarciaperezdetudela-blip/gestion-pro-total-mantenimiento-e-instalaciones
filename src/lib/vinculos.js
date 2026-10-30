/**
 * vinculos.js — Al restaurar una copia, que cada ficha siga unida a su cliente.
 *
 * Al volver a crear los registros el servidor les pone identificadores NUEVOS.
 * Las facturas, documentos, órdenes… guardan el identificador VIEJO del cliente
 * (`contact_id`), así que, restaurados, ya no apuntaban a nadie: el cliente salía
 * sin nada. Además, en copias hechas tras restauraciones anteriores, el
 * identificador ya no coincidía con ningún cliente de la propia copia y solo
 * quedaba el nombre (`contact_name`).
 *
 * Aquí, sin hablar con el servidor (para poder comprobarlo):
 *   · `mapaIds`  → de qué identificador viejo a cuál nuevo, comparando por la
 *                  clave natural de cada registro (NIF, correo, nombre…).
 *   · `reenlazarFilas` → cambia los identificadores viejos por los nuevos y, si
 *                  el de cliente no sirve, lo busca por el nombre.
 */

/** Nombre sin tildes, mayúsculas ni signos, para compararlo. */
export function normalizarNombre(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Identificador viejo → identificador actual, por clave natural. */
export function mapaIds(filasCopia, actuales, clave) {
  const mapa = new Map();
  if (!clave) return mapa;
  const porClave = new Map();
  for (const r of actuales || []) {
    const k = clave(r);
    if (k && r.id && !porClave.has(k)) porClave.set(k, r.id);
  }
  for (const f of filasCopia || []) {
    if (!f?.id) continue;
    const k = clave(f);
    const nuevo = k ? porClave.get(k) : null;
    if (nuevo) mapa.set(f.id, nuevo);
  }
  return mapa;
}

function nombresDe(c) {
  const persona = `${c.name || ''} ${c.surname || ''}`.trim();
  return [persona, c.name, c.company_name].map(normalizarNombre).filter(Boolean);
}

/**
 * Cliente que corresponde a un nombre: primero igual, y si no, el único que
 * lo contiene (o al que contiene). Si hay dudas (varios), no se adivina: null.
 */
export function clientePorNombre(nombre, clientes) {
  const n = normalizarNombre(nombre);
  if (!n) return null;
  const lista = (clientes || []).map((c) => ({ c, ns: nombresDe(c) }));
  const iguales = lista.filter((x) => x.ns.includes(n));
  if (iguales.length === 1) return iguales[0].c;
  // Varias fichas con el mismo nombre exacto (duplicadas): da igual a cuál, se coge la más antigua.
  if (iguales.length > 1) {
    return iguales.map((x) => x.c).sort((a, b) => String(a.created_date || '').localeCompare(String(b.created_date || '')))[0];
  }
  if (n.length < 5) return null;
  const parecidos = lista.filter((x) => x.ns.some((k) => k.length >= 5 && (k.includes(n) || n.includes(k))));
  return parecidos.length === 1 ? parecidos[0].c : null;
}

/**
 * Pone los identificadores nuevos en las filas.
 * @param filas      filas de la copia
 * @param idMap      Map identificador viejo → nuevo
 * @param clientes   clientes actuales (con id), para buscar por nombre
 * @returns {{filas:any[], porId:number, porNombre:number, sinVincular:number}}
 */
export function reenlazarFilas(filas, idMap, clientes) {
  let porId = 0, porNombre = 0, sinVincular = 0;
  const idsClientes = new Set((clientes || []).map((c) => c.id));
  const salida = (filas || []).map((f) => {
    const g = { ...f };
    let cambio = false;
    for (const k of Object.keys(g)) {
      if (k === 'id') continue;
      const v = g[k];
      if (typeof v === 'string' && idMap.has(v)) { g[k] = idMap.get(v); cambio = true; }
    }
    if (cambio) porId++;
    if (Object.prototype.hasOwnProperty.call(g, 'contact_id') || g.contact_name) {
      if (!g.contact_id || !idsClientes.has(g.contact_id)) {
        const c = clientePorNombre(g.contact_name, clientes);
        if (c) {
          g.contact_id = c.id;
          if (!cambio) porNombre++;
        } else if (g.contact_id || g.contact_name) {
          sinVincular++;
        }
      }
    }
    return g;
  });
  return { filas: salida, porId, porNombre, sinVincular };
}
