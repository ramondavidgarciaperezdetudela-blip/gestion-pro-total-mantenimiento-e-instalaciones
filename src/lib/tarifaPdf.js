// Lee una tarifa de precios en PDF (con texto, no escaneada) y la devuelve como artículos del proveedor.
// Sin IA y sin internet: reconstruye las columnas por la posición del texto.
import { filasDePdf, trozosDePdf } from './leerPdfTabla.js';
import { articulosDeCatalogo } from './catalogoPdf.js';
import { lineasDeFilas } from './importarPresupuesto.js';
import { tieneDescripcion, separarSinDescripcion } from './descripcionArticulo.js';
import { pareceCatalogoRevista, leerCatalogoRevista, fotosParaItems } from './catalogoRevistaPdf.js';

/** De las líneas leídas a los artículos de tarifa (referencia, nombre, precio, unidad). Descarta lo que no tiene precio. */
export function itemsDeLineas(lineas = []) {
  const vistos = new Set();
  const items = [];
  for (const l of lineas) {
    const precio = Number(l.unit_price);
    if (!(precio > 0)) continue;
    const codigo = String(l.reference || '').trim();
    const nombre = String(l.description || '').trim();
    if (!tieneDescripcion(nombre, codigo)) continue; // solo números o solo la referencia: no sabemos qué es
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

/** Pone a los artículos de `items` la foto que trae su misma referencia en `conFoto` (mapa código → foto). */
export function unirFotosPorCodigo(items, conFoto) {
  let n = 0;
  for (const it of items) {
    if (it.image_url) continue;
    const f = conFoto.get(String(it.product_code || '').trim().toLowerCase());
    if (f) { it.image_url = f; n++; }
  }
  return n;
}

/** Tarifa leída como tabla: le pone a cada artículo la foto de su página (la más cercana). */
async function ponerFotos(file, items, avisos, { onProgreso, senal, conFotos }) {
  if (!conFotos || !items.length) return;
  try {
    await fotosParaItems(file, items, { onProgreso, senal });
    const con = items.filter((i) => i.image_url).length;
    if (con) avisos.push(`Fotos del PDF: ${con.toLocaleString('es-ES')} de ${items.length.toLocaleString('es-ES')} artículos llevan la imagen de su página. Los demás se pueden completar con «Rellenar imágenes».`);
    else avisos.push('No encontré fotos de producto en este PDF. Usa «Rellenar imágenes» para buscarlas en internet por nombre o referencia.');
  } catch { avisos.push('No pude leer las fotos de este PDF. Usa «Rellenar imágenes» para buscarlas en internet.'); }
}

async function leerTarifaPdfCompleta(file, { onProgreso, senal, conFotos = true } = {}) {
  // Catálogo o folleto «de revista» (foto + título + tabla de referencias y precios): se leen artículos Y fotos.
  let revista = null;
  try {
    const sondeo = await pareceCatalogoRevista(file);
    if (sondeo.ok) {
      const r = await leerCatalogoRevista(file, { onProgreso, senal, conFotos });
      if (r.items.length) {
        const sinNombre = r.items.filter((i) => i.product_name === i.product_code).length;
        const sinFoto = r.items.length - r.conFoto;
        revista = {
          items: r.items, cancelado: r.cancelado, sinNombre,
          avisos: [
            `Catálogo con fotos: leí ${r.items.length.toLocaleString('es-ES')} artículos de ${r.paginas} páginas y encontré la foto de ${r.conFoto.toLocaleString('es-ES')}.${sinFoto > 0 ? ` Los ${sinFoto.toLocaleString('es-ES')} sin foto se pueden completar luego con «Rellenar imágenes» (búsqueda en internet por nombre o referencia).` : ''} Revisa los datos antes de añadirlos.`,
            ...r.avisos,
          ],
        };
        // Si casi todos tienen nombre propio, vale tal cual
        if (r.cancelado || sinNombre <= r.items.length * 0.4) return revista;
      }
    }
  } catch { /* si falla, se prueba con el método de siempre */ }
  const buffer = await file.arrayBuffer();
  const filas = await filasDePdf(buffer);
  const { lineas, avisos } = lineasDeFilas(filas);
  const items = itemsDeLineas(lineas);
  if (items.length) {
    // La tabla da mejores nombres; las fotos que encontró el lector de revista se unen por referencia
    if (revista) {
      const mapa = new Map(revista.items.filter((i) => i.image_url).map((i) => [String(i.product_code).trim().toLowerCase(), i.image_url]));
      const n = unirFotosPorCodigo(items, mapa);
      if (n) avisos.push(`He unido ${n.toLocaleString('es-ES')} fotos del PDF a los artículos por su referencia.`);
    }
    await ponerFotos(file, items, avisos, { onProgreso, senal, conFotos });
    return { items, avisos };
  }
  if (revista) return revista;
  // No hay tabla: catálogo con los artículos repartidos por la página → se lee línea a línea.
  try {
    const cat = articulosDeCatalogo(await trozosDePdf(buffer));
    if (cat.items.length) {
      const av = ['Este PDF no es una tabla: he leído cada artículo con su referencia y precio por líneas. Revisa los datos antes de añadirlos.'];
      await ponerFotos(file, cat.items, av, { onProgreso, senal, conFotos });
      return { items: cat.items, avisos: av };
    }
  } catch { /* se queda sin artículos */ }
  return { items, avisos };
}

/** Lee la tarifa en PDF y descarta los artículos sin descripción (solo números o solo la referencia). */
export async function leerTarifaPdf(file, opciones = {}) {
  const r = await leerTarifaPdfCompleta(file, opciones);
  const { validos, descartados } = separarSinDescripcion(r.items || []);
  if (!descartados.length) return r;
  return {
    ...r, items: validos, sinDescripcion: descartados.length,
    avisos: [...(r.avisos || []), `No he importado ${descartados.length.toLocaleString('es-ES')} artículos porque solo traían números o la referencia, sin descripción: no sabemos qué son ni se puede buscar su foto.`],
  };
}
