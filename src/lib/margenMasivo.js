// Cambiar el margen de muchos artículos de tarifa de una vez.
// Misma fórmula que el resto de tarifas: venta = coste × (1 + margen/100).
import { parsePrecio } from './tarifaManual.js';

const redondear = (n) => Math.round(n * 100) / 100;

/** Margen escrito como texto → número válido (−90 a 1000) o null. */
export function leerMargen(texto) {
  const n = parsePrecio(texto);
  return n !== null && n >= -90 && n <= 1000 ? n : null;
}

/** Margen que más se repite en los artículos (para mostrar «ahora está al 30 %»). */
export function margenMasComun(items) {
  const cuenta = new Map();
  for (const i of items) { const m = parsePrecio(i.margin); if (m !== null) cuenta.set(redondear(m), (cuenta.get(redondear(m)) || 0) + 1); }
  let mejor = null;
  for (const [m, n] of cuenta) if (!mejor || n > mejor.n) mejor = { margen: m, n };
  return mejor;
}

/**
 * @param {object[]} items  artículos (SupplierPrice)
 * @param {number} margen
 * @param {{soloSinVenta?:boolean}} opc
 * @returns {{cambios:{id:any,sale_price:number,margin:number}[], sinCoste:number, yaIgual:number}}
 */
export function planificar(items, margen, opc = {}) {
  const cambios = []; let sinCoste = 0; let yaIgual = 0;
  for (const i of items) {
    const coste = parsePrecio(i.cost_price);
    if (!(coste > 0)) { sinCoste++; continue; }
    if (opc.soloSinVenta && parsePrecio(i.sale_price) > 0) continue;
    const venta = redondear(coste * (1 + margen / 100));
    if (parsePrecio(i.sale_price) === venta && parsePrecio(i.margin) === margen) { yaIgual++; continue; }
    cambios.push({ id: i.id, sale_price: venta, margin: margen });
  }
  return { cambios, sinCoste, yaIgual };
}

/** Elige los artículos según el ámbito: todas las tarifas, unas seleccionadas o una sola. */
export function articulosDelAmbito(items, ambito, proveedoresIds = []) {
  if (ambito === 'todas') return items;
  const ids = new Set(proveedoresIds);
  return items.filter((i) => ids.has(i.supplier_id));
}

/** Aplica los cambios en lotes con varias peticiones a la vez; un fallo no detiene el resto. */
export async function aplicarEnLotes(cambios, actualizar, { concurrencia = 6, onProgreso = () => {}, senal } = {}) {
  let siguiente = 0; let hechos = 0; const fallos = [];
  const trabajador = async () => {
    while (siguiente < cambios.length && !senal?.aborted) {
      const c = cambios[siguiente++];
      try { await actualizar(c); hechos++; } catch (e) { fallos.push({ id: c.id, error: String(e?.message || e) }); }
      onProgreso(hechos + fallos.length, cambios.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrencia, cambios.length) }, trabajador));
  return { hechos, fallos, cancelado: !!senal?.aborted };
}
