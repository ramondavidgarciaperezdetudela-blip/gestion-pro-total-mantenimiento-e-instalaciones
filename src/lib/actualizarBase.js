import { claveRef } from './importarPresupuesto.js';

const CAMPOS_ACTUALIZABLES = [
  { campo: 'description', etiqueta: 'Descripción', desde: 'description', texto: true },
  { campo: 'unit_price', etiqueta: 'Precio', desde: 'unit_price', dinero: true },
  { campo: 'unit', etiqueta: 'Unidad', desde: 'unit', texto: true },
  { campo: 'delivery_days', etiqueta: 'Plazo (días)', desde: 'delivery_days', entero: true },
];

/**
 * Compara las líneas de un documento con Mi base de datos (misma referencia) y devuelve lo que ha cambiado:
 * [{ articulo, referencia, cambios: [{ campo, etiqueta, antes, ahora }] }]. Solo cuenta lo que la línea trae relleno.
 */
export function diferenciasConBase(lineas, propios) {
  const porRef = new Map();
  for (const p of propios || []) {
    for (const r of [p.reference, p.supplier_ref]) {
      const k = claveRef(r);
      if (k && !porRef.has(k)) porRef.set(k, p);
    }
  }
  const vistos = new Set();
  const salida = [];
  for (const l of lineas || []) {
    const k = claveRef(l.reference);
    const art = k ? porRef.get(k) : null;
    if (!art || vistos.has(art.id)) continue;
    const cambios = [];
    for (const c of CAMPOS_ACTUALIZABLES) {
      let ahora = l[c.desde];
      if (ahora === undefined || ahora === null || ahora === '') continue;
      let antes = art[c.campo];
      if (c.texto) { ahora = String(ahora).trim(); antes = String(antes ?? '').trim(); if (!ahora || ahora === '.' || ahora === antes) continue; }
      else { ahora = Number(ahora); antes = Number(antes ?? 0); if (!Number.isFinite(ahora) || Math.abs(ahora - antes) < 0.005) continue; if (c.entero) ahora = Math.round(ahora); }
      cambios.push({ campo: c.campo, etiqueta: c.etiqueta, antes: c.texto ? antes : art[c.campo] ?? null, ahora });
    }
    if (cambios.length) { vistos.add(art.id); salida.push({ articulo: art, referencia: l.reference, cambios }); }
  }
  return salida;
}

