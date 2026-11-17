// Catálogos «de revista» en PDF: cada artículo tiene su foto, su título, su descripción y una pequeña
// tabla con variantes (medida/color, referencia y precio), y a veces dos o tres productos van uno al lado
// del otro. Sin IA: se reconstruye cada bloque por la posición del texto y de las fotos de la página.
//
// Funciones puras (sin pdf.js ni navegador) para poder probarlas:
//   articulosDePagina(trozos, imagenes) → artículos con la foto que les corresponde (`_foto`)
// La lectura del PDF y el reescalado de las fotos están en catalogoRevistaPdf.js.
import { filasConPosicion } from './leerPdfTabla.js';

const ES_PRECIO = /^(?:€\s*)?(?:(?:\d{1,3}(?:\.\d{3})+|\d+)[,.]\d{2}\s*(?:€|eur|euros)?|\d{1,6}\s*€)$/i;
const CODIGO = /^(?:\d{5,13}|[A-Za-z0-9][A-Za-z0-9\-_./]{4,19})$/;
const UNIDAD_O_MEDIDA = /^\d+([.,]\d+)?\s*(v|w|kw|hz|mm|cm|m|kg|l|ml|a|bar|º|°|c|k|%|x\d+|gr|g)$/i;
const NOTA = /^\(\d{1,2}\)$/;
const CABECERA = /^(unidad|litro|kilo|metro|ud|uds|pvp|precio|ref|referencia|código|codigo|color|gr|ml|l|kg|m|m2|m²|jgo|caja|bote|saco|cm|mm|medida|largo|ancho|grosor)$/i;
const TOL_Y = 4.6; // los códigos suelen ir ~4 pt más altos que el resto de su fila
const PASO_LINEA = 16; // separación máxima entre líneas seguidas de un mismo bloque

const aNumero = (t) => {
  const v = String(t).replace(/[€a-z\s]/gi, '');
  const n = /,/.test(v) ? Number(v.replace(/\./g, '').replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const limpia = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const sinNota = (t) => limpia(String(t).replace(/\s*\(\d{1,2}\)\s*$/g, ''));

export function esCodigoRevista(t) {
  const c = limpia(t);
  if (!CODIGO.test(c) || ES_PRECIO.test(c) || UNIDAD_O_MEDIDA.test(c) || NOTA.test(c)) return false;
  if (!/\d/.test(c)) return false;
  return /^\d{5,13}$/.test(c) || (/[A-Za-z]/.test(c) && /\d/.test(c));
}
const esPrecioCelda = (t) => ES_PRECIO.test(limpia(t)) || /^\d[\d.]*[,.]\d{2}\s*€$/.test(limpia(t));

/** Parte de mayúsculas entre las letras de un texto (0..1). */
function mayusculas(t) {
  const letras = String(t).replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  if (letras.length < 3) return 0;
  return letras.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '').length / letras.length;
}

/**
 * Artículos de una página.
 * @param trozos   [{ t, x, y, w }]  texto con posición (y hacia arriba, como en pdf.js)
 * @param imagenes [{ id, x, y, w, h }] fotos de la página (x,y = esquina inferior izquierda, en puntos)
 */
export function articulosDePagina(trozos = [], imagenes = []) {
  // Todas las celdas de texto de la página, con su posición
  const celdas = [];
  for (const fila of filasConPosicion(trozos)) {
    for (const c of fila) {
      if (!c.t) continue;
      // «Transparente 25034390» llegó pegado en una sola celda: se separa la referencia del resto
      const m = c.t.match(/^(.+?)\s+(\S+)$/);
      if (m && /^\d{6,13}$/.test(sinNota(m[2])) && !esCodigoRevista(sinNota(m[1])) && !esPrecioCelda(m[1])) {
        const corte = c.x + ((m[1].length + 1) / c.t.length) * (c.x2 - c.x);
        celdas.push({ t: m[1], x: c.x, x2: corte - 2, y: fila.y, tipo: '' }, { t: m[2], x: corte, x2: c.x2, y: fila.y, tipo: '' });
      } else celdas.push({ ...c, y: fila.y, tipo: '' });
    }
  }
  if (!celdas.length) return [];
  const fotos = imagenes.filter((i) => Math.max(i.w, i.h) >= 50 && Math.min(i.w, i.h) >= 18 && i.w * i.h >= 1500 && i.w <= 520 && i.h <= 700);

  // 1) Artículos: una referencia + el primer precio que tiene a la derecha, en su misma línea
  const arts = [];
  for (const c of celdas) {
    if (!esCodigoRevista(sinNota(c.t))) continue;
    const derecha = celdas.filter((o) => o !== c && o.x >= c.x2 - 2 && Math.abs(o.y - c.y) <= TOL_Y && esPrecioCelda(o.t)).sort((a, b) => a.x - b.x);
    if (!derecha.length) continue;
    const p = derecha[0];
    // si hay otro código entre medias, ese precio es de otro artículo
    const otroCodigo = celdas.some((o) => o !== c && o.x > c.x && o.x < p.x && Math.abs(o.y - c.y) <= TOL_Y && esCodigoRevista(sinNota(o.t)));
    if (otroCodigo) continue;
    const precio = aNumero(p.t.match(/\d[\d.]*[,.]\d{2}/)?.[0] ?? p.t);
    if (!(precio > 0)) continue;
    c.tipo = 'codigo'; p.tipo = 'precio';
    // el precio que sigue (por litro/kilo) no es otro artículo
    const p2 = derecha[1];
    if (p2 && p2.x - p.x2 < 40) p2.tipo = 'precio2';
    arts.push({ cod: c, pre: p, precio });
  }
  if (!arts.length) return [];

  // 2) Variante: las celdas pegadas a la izquierda del código en su misma línea (hasta un hueco grande o un precio/código)
  for (const a of arts) {
    const c = a.cod; const vars = [];
    let tope = c.x;
    const previas = celdas.filter((o) => o !== c && o.x2 <= tope + 1 && Math.abs(o.y - c.y) <= TOL_Y).sort((p, q) => q.x - p.x);
    for (const o of previas) {
      if (tope - o.x2 > 32) break;
      if (o.tipo === 'codigo' || o.tipo === 'precio' || o.tipo === 'precio2' || esPrecioCelda(o.t)) break;
      vars.unshift(o); tope = o.x;
    }
    a.vars = vars.filter((o) => !NOTA.test(limpia(o.t)));
    vars.forEach((o) => { o.tipo = o.tipo || 'variante'; });
    a.izq = (vars[0] || c).x;
  }
  // cabeceras de tabla (UNIDAD, LITRO, COLOR…): ni título ni descripción
  for (const o of celdas) {
    // una cabecera son varias palabras de éstas en la misma línea; «Unidad» suelto es la etiqueta del precio grande
    if (o.tipo || !CABECERA.test(limpia(o.t))) continue;
    const centro = (o.x + o.x2) / 2;
    const junto = celdas.some((q) => q !== o && Math.abs(q.y - o.y) <= 3 && CABECERA.test(limpia(q.t)));
    // o está justo encima de una columna de precios (cabecera con una sola palabra: «UNIDAD»)
    const sobrePrecio = celdas.some((q) => (q.tipo === 'precio' || q.tipo === 'precio2') && q.y < o.y && o.y - q.y <= 45 && Math.abs((q.x + q.x2) / 2 - centro) <= 25);
    if (junto || sobrePrecio) o.tipo = 'cabecera';
  }
  // Texto metido en la fila de cabeceras justo antes de una («LARGO 100 CM  UNIDAD  METRO»): es rótulo de columna, no título
  for (const o of celdas) {
    if (o.tipo || mayusculas(o.t) < 0.6) continue;
    if (celdas.some((h) => h.tipo === 'cabecera' && Math.abs(h.y - o.y) <= 3 && h.x > o.x2 && h.x - o.x2 <= 45)) o.tipo = 'rotulo';
  }
  const usada = (o) => o.tipo === 'codigo' || o.tipo === 'precio' || o.tipo === 'precio2' || o.tipo === 'variante' || o.tipo === 'cabecera' || o.tipo === 'rotulo';

  // 3) Título, descripción y foto de cada artículo
  const out = [];
  for (const a of arts) {
    const candidatas = [a.izq, ...arts.filter((o) => o !== a && Math.abs(o.cod.y - a.cod.y) <= TOL_Y && o.izq < a.izq).map((o) => o.izq).sort((p, q) => q - p)]
      .filter((v, i, l) => l.findIndex((w) => Math.abs(w - v) <= 6) === i);
    let b = null;
    for (const izq of candidatas) {
      const r = bloqueDe(celdas, usada, a.cod.y, izq, fotos, a.pre.x2 + 30);
      if (r.titulo) { b = r; break; }
    }
    if (!b) b = { titulo: '', descripcion: '', clave: `${Math.round(a.cod.y)}|${Math.round(a.izq)}` };
    a.b = b;
  }
  // Fotos: con todos los bloques conocidos se sabe dónde acaba la columna de cada uno
  const izqs = arts.filter((a) => a.b.titulo).map((a) => ({ izq: Math.round(a.b.izq), yTitulo: a.b.yTitulo }));
  const usadas = celdas.filter(usada);
  const fotoDe = new Map();
  for (const a of arts) {
    if (a.b.titulo && !fotoDe.has(a.b.clave)) fotoDe.set(a.b.clave, fotoDeBloque(a.b, fotos, izqs, usadas));
    const variante = limpia(a.vars.map((o) => limpia(o.t)).filter((t) => t && !CABECERA.test(t)).join(' ').replace(/\s*\(\d{1,2}\)/g, ''));
    const nombre = limpia(`${a.b.titulo || ''}${a.b.sub ? ` ${a.b.sub.toLowerCase()}` : ''}${variante ? ` — ${variante}` : ''}`) || sinNota(a.cod.t);
    out.push({
      product_code: sinNota(a.cod.t), product_name: nombre, cost_price: Math.round(a.precio * 100) / 100,
      brand: '', unit: 'ud', category: 'material', notes: a.b.descripcion || '', image_url: '', _foto: fotoDe.get(a.b.clave) || null, _bloque: a.b.clave,
    });
  }
  // Dos productos con el mismo título y medida en la página: se distinguen por su descripción («Cepillado», «Sin cepillar»…)
  const veces = new Map(); out.forEach((o) => veces.set(o.product_name, (veces.get(o.product_name) || 0) + 1));
  out.forEach((o) => { if (veces.get(o.product_name) > 1 && o.notes) o.product_name = limpia(`${o.product_name} · ${o.notes.slice(0, 40)}`); });
  return out;
}

/** Sube desde la tabla por la columna `izq`: primero la descripción, después el título (mayúsculas). */
function bloqueDe(celdas, usada, yTabla, izq, fotos, xDer) {
  const orden = celdas.filter((o) => o.y > yTabla - 1 && ((Math.abs(o.x - izq) <= 12) || (usada(o) && o.x >= izq - 12 && o.x <= xDer))).sort((p, q) => p.y - q.y);
  let y = yTabla; const lineas = []; let enTabla = true; let yTop = yTabla; let sub = '';
  for (;;) {
    const sig = orden.find((o) => o.y > y + 0.5 && o.y - y <= PASO_LINEA);
    if (!sig) break;
    if (usada(sig)) {
      if (enTabla) { // sigue subiendo por la tabla; el rótulo de columna más cercano («LARGO 240 CM») distingue artículos de igual título
        if (sig.tipo === 'rotulo' && !sub && Math.abs(sig.x - izq) <= 14) sub = sig.t;
        y = sig.y; continue;
      }
      // Había texto y encima vuelve a haber tabla. Si está pegada (≤ 13 pt) ese texto era un subtítulo DENTRO de la
      // tabla («LARGO 240 CM»); si no, es la tabla del producto de arriba y aquí acaba el bloque.
      if (sig.y - y > 13) break;
      if (!sub) sub = lineas[lineas.length - 1]?.t || '';
      lineas.length = 0; enTabla = true; y = sig.y; continue;
    }
    if (enTabla) yTop = y;
    enTabla = false;
    const mismaLinea = orden.filter((o) => Math.abs(o.y - sig.y) <= 2.5 && !usada(o));
    const t = limpia(mismaLinea.map((o) => o.t).join(' '));
    lineas.push({ t, y: sig.y, x2: Math.max(...mismaLinea.map((o) => o.x2)), mayus: mayusculas(t) });
    y = sig.y;
    if (lineas.length >= 8) break;
  }
  if (!lineas.length) return { titulo: '', descripcion: '' };
  // lineas va de abajo hacia arriba: descripción (minúsculas) y luego título (mayúsculas)
  let i = 0; const desc = [];
  while (i < lineas.length && lineas[i].mayus < 0.7) { desc.unshift(lineas[i].t); i++; }
  const tit = [];
  while (i < lineas.length && lineas[i].mayus >= 0.7) { tit.unshift(lineas[i].t); i++; }
  let titulo; let descripcion;
  if (tit.length) { titulo = tit.join(' '); descripcion = desc.join(' '); }
  else { titulo = desc[0] || ''; descripcion = desc.slice(1).join(' '); }
  titulo = sinNota(titulo);
  const usadas = lineas.slice(0, desc.length + tit.length);
  const yTitulo = usadas[usadas.length - 1]?.y ?? yTabla;
  const derecha = Math.max(izq + 60, ...usadas.map((l) => l.x2)) + 25;
  return { titulo, descripcion, sub, izq, yTitulo, yTabla: yTop, derecha, clave: `${Math.round(yTitulo)}|${Math.round(izq / 6)}` };
}

/** Foto de un bloque: dentro de su columna, a la altura del título o por encima, y sin otra tabla de por medio. */
function fotoDeBloque(b, fotos, izqs, usadas) {
  const sigue = izqs.filter((v) => v.izq > b.izq + 40 && Math.abs(v.yTitulo - b.yTitulo) <= 140).map((v) => v.izq).sort((p, q) => p - q)[0];
  const banda = [b.izq - 8, (sigue ?? b.izq + 400) - 4];
  const cand = [];
  for (const im of fotos) {
    const centro = im.y + im.h / 2;
    if (im.y < b.yTabla - 4) continue; // dentro de la tabla o por debajo
    if (im.y + im.h < b.yTitulo - 6 || im.y > b.yTitulo + 230) continue;
    const solape = Math.min(im.x + im.w, banda[1]) - Math.max(im.x, banda[0]);
    if (solape < im.w * 0.6) continue;
    // otra tabla entre la foto y este título → la foto es del producto de arriba
    if (usadas.some((o) => o.x >= banda[0] && o.x <= banda[1] && o.y > b.yTitulo + 8 && o.y < im.y)) continue;
    cand.push({ im, d: Math.abs(centro - b.yTitulo) });
  }
  if (!cand.length) return null;
  cand.sort((p, q) => p.d - q.d);
  const cerca = cand.filter((c) => c.d <= cand[0].d + 40);
  return cerca.sort((p, q) => q.im.w * q.im.h - p.im.w * p.im.h)[0].im.id;
}

/** Caja (x, y de la esquina inferior izquierda, ancho, alto) que ocupa una imagen con la matriz `m` de pdf.js (incluso girada). */
export function cajaDeMatriz(m) {
  const px = [m[4], m[4] + m[0], m[4] + m[2], m[4] + m[0] + m[2]];
  const py = [m[5], m[5] + m[1], m[5] + m[3], m[5] + m[1] + m[3]];
  const x = Math.min(...px); const y = Math.min(...py);
  return { x, y, w: Math.max(...px) - x, h: Math.max(...py) - y };
}
