// Lee una tarifa de precios en PDF (con texto, no escaneada) y la devuelve como artículos del proveedor.
// Sin IA y sin internet: reconstruye las columnas por la posición del texto.
import { filasDePdf, trozosDePdf } from './leerPdfTabla.js';
import { articulosDeCatalogo } from './catalogoPdf.js';
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
  const buffer = await file.arrayBuffer();
  const filas = await filasDePdf(buffer);
  const { lineas, avisos } = lineasDeFilas(filas);
  const items = itemsDeLineas(lineas);
  if (items.length) return { items, avisos };
  // No hay tabla: catálogo con los artículos repartidos por la página → se lee línea a línea.
  try {
    const cat = articulosDeCatalogo(await trozosDePdf(buffer));
    if (cat.items.length) return { items: cat.items, avisos: ['Este PDF no es una tabla: he leído cada artículo con su referencia y precio por líneas. Revisa los datos antes de añadirlos.'] };
  } catch { /* se queda sin artículos */ }
  return { items, avisos };
}
