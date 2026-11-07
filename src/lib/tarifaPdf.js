// Lee una tarifa de precios en PDF (con texto, no escaneada) y la devuelve como artículos del proveedor.
// Sin IA y sin internet: reconstruye las columnas por la posición del texto.
import { filasDePdf } from './leerPdfTabla.js';
import { lineasDeFilas } from './importarPresupuesto.js';

/** De las líneas leídas a los artículos de tarifa (referencia, nombre, precio, unidad). Descarta lo que no tiene precio. */
export function itemsDeLineas(lineas = []) {
  const vistos = new Set();
  const items = [];
  for (const l of lineas) {
    const precio = Number(l.unit_price);
    if (!(precio > 0)) continue;
    const nombre = String(l.description || l.reference || '').trim();
    if (!nombre) continue;
    const codigo = String(l.reference || '').trim();
    const clave = `${codigo.toLowerCase()}|${nombre.toLowerCase()}|${precio}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    items.push({
      product_code: codigo, product_name: nombre, cost_price: Math.round(precio * 100) / 100,
      brand: '', unit: l.unit || 'ud', category: 'material', notes: '', image_url: '',
    });
  }
  return items;
}

export async function leerTarifaPdf(file) {
  const filas = await filasDePdf(await file.arrayBuffer());
  const { lineas, avisos } = lineasDeFilas(filas);
  return { items: itemsDeLineas(lineas), avisos };
}
