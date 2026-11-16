// Catálogos en PDF que NO son una tabla: lista de artículos con su referencia, nombre y precio repartidos
// por la página (catálogos de fabricante, tarifas «de revista»). Sin IA: se busca en cada línea un
// precio y una referencia y se toma como nombre el texto que los acompaña; si la línea casi no tiene
// texto, el nombre está en las líneas de encima (título del artículo).
import { filasConPosicion } from './leerPdfTabla.js';

const PRECIO = /(?:^|[^\d.,])((?:\d{1,3}(?:\.\d{3})+|\d+),\d{2}|\d+\.\d{2})(?![\d.,]*\d)/;
const ES_PRECIO_SUELTO = /^(?:€\s*)?(?:\d{1,3}(?:\.\d{3})+|\d+)[,.]\d{2}\s*(?:€|eur|euros)?$/i;
const CODIGO = /^[A-Za-z0-9][A-Za-z0-9\-_./]{3,24}$/;
const UNIDAD_O_MEDIDA = /^\d+([.,]\d+)?\s*(v|w|kw|hz|mm|cm|m|kg|l|ml|a|bar|º|°|c|k|%|x\d+)$/i;
const ETIQUETA = /^(?:ref(?:erencia)?|cod(?:igo)?|código|art(?:[ií]culo)?|mod(?:elo)?)\.?\s*[:.\-]?\s*/i;
const PALABRA_PRECIO = /\b(?:pvp|p\.v\.p\.?|precio|tarifa|desde)\b\s*:?/gi;
const RUIDO = /^(total|subtotal|suma|iva|base|pág|página|page|tel|fax|www|http|email|e-mail|c\/|cif|nif)\b/i;

const aNumero = (t) => {
  const v = String(t).replace(/\s/g, '');
  const n = /,/.test(v) ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : NaN;
};

function esCodigo(t) {
  const c = String(t).trim();
  if (!CODIGO.test(c) || ES_PRECIO_SUELTO.test(c) || UNIDAD_O_MEDIDA.test(c)) return false;
  if (!/\d/.test(c)) return false;
  return /[A-Za-z]/.test(c) || c.length >= 5;
}

/**
 * @param trozos [{ t, x, y, w }]  texto con su posición (como lo da pdf.js)
 * @returns {{ items: object[], lineas: number }} artículos con la forma de las tarifas
 */
export function articulosDeCatalogo(trozos = []) {
  const filas = filasConPosicion(trozos);
  const out = []; const vistos = new Set();
  const ys = filas.map((f) => f[0]?.y ?? 0); // aproximación: la primera celda marca la altura
  let precioFilas = 0;
  filas.forEach((celdas, r) => {
    const textos = celdas.map((c) => c.t).filter(Boolean);
    if (!textos.length) return;
    // Precio: una celda que es solo un precio, o un precio con €/EUR dentro del texto.
    let precio = NaN; let celdaPrecio = -1;
    celdas.forEach((c, k) => {
      if (celdaPrecio >= 0) return;
      if (ES_PRECIO_SUELTO.test(c.t)) { precio = aNumero(c.t.replace(/[€a-z\s]/gi, '')); celdaPrecio = k; return; }
      const m = c.t.match(/(\d[\d.]*[,.]\d{2})\s*(?:€|eur)/i) || c.t.match(/(?:€|eur)\s*(\d[\d.]*[,.]\d{2})/i);
      if (m) { precio = aNumero(m[1]); celdaPrecio = k; }
    });
    if (!(precio > 0) || celdaPrecio < 0) return;
    precioFilas++;
    const sinPrecio = celdas.filter((_, k) => k !== celdaPrecio);
    // «Ref. TEX2», «Cód: 1234-A»: se quita la etiqueta y se mira si lo que queda es una referencia.
    const iCodigo = sinPrecio.findIndex((c) => esCodigo(c.t.replace(ETIQUETA, '')));
    const codigo = iCodigo >= 0 ? sinPrecio[iCodigo].t.replace(ETIQUETA, '').trim() : '';
    const resto = sinPrecio.filter((_, k) => k !== iCodigo).map((c) => c.t.replace(PALABRA_PRECIO, '').trim()).filter((t) => t && !ES_PRECIO_SUELTO.test(t));
    let nombre = resto.join(' ').replace(/\s+/g, ' ').trim();
    if (RUIDO.test(nombre) && !codigo) return;
    // Casi sin texto: el nombre es el título que hay encima (hasta 2 líneas sin precio, cerca).
    if (nombre.length < 8) {
      const previas = [];
      for (let k = r - 1; k >= 0 && previas.length < 2; k--) {
        const t = filas[k].map((c) => c.t).join(' ').replace(/\s+/g, ' ').trim();
        if (!t) continue;
        if (Math.abs(ys[k] - ys[r]) > 14 * (previas.length + 1) + 4) break;
        if (PRECIO.test(t) && /€|eur/i.test(t)) break;
        if (RUIDO.test(t)) break;
        previas.unshift(t);
      }
      nombre = `${previas.join(' ')} ${nombre}`.replace(/\s+/g, ' ').trim();
    }
    if (nombre.length < 3 && !codigo) return;
    if (!nombre) nombre = codigo;
    const clave = `${codigo.toLowerCase()}|${nombre.toLowerCase()}|${precio}`;
    if (vistos.has(clave)) return; vistos.add(clave);
    out.push({ product_code: codigo, product_name: nombre, cost_price: Math.round(precio * 100) / 100, brand: '', unit: 'ud', category: 'material', notes: '', image_url: '' });
  });
  return { items: out, lineas: precioFilas };
}
