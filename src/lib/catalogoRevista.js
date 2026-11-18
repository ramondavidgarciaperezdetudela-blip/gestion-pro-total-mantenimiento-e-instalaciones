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
// «CL20060» es la referencia del proveedor; «MUPR-09-H14X» es el modelo (va en la descripción, no es otro artículo)
const esRefPura = (t) => /^(?:[A-Za-z]{1,4}\d{4,}|\d{5,13})$/.test(limpia(t));
const esModelo = (t) => /[A-Za-z]{2,}[-/]\d/.test(limpia(t));
const ES_SERIE = /^(serie|gama|l[ií]nea|modelo|colecci[oó]n)\b/i;
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
    // el modelo que viene justo después de la referencia («CL20060  MUPR-09-H14X …») es descripción, no otro artículo
    if (esModelo(c.t) && celdas.some((o) => o !== c && esRefPura(sinNota(o.t)) && o.x2 <= c.x + 2 && c.x - o.x2 < 60 && Math.abs(o.y - c.y) <= 10)) continue;
    const derecha = celdas.filter((o) => o !== c && o.x >= c.x2 - 2 && Math.abs(o.y - c.y) <= TOL_Y && esPrecioCelda(o.t)).sort((a, b) => a.x - b.x);
    if (!derecha.length) continue;
    const p = derecha[0];
    // si hay otro código entre medias, ese precio es de otro artículo
    const otroCodigo = celdas.some((o) => o !== c && o.x > c.x && o.x < p.x && Math.abs(o.y - c.y) <= TOL_Y && esCodigoRevista(sinNota(o.t)) && !(esRefPura(sinNota(c.t)) && esModelo(o.t)));
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
      // mismo título y descripción con otra medida = mismo producto (comparte la foto principal)
      _grupo: a.b.titulo ? limpia(`${a.b.titulo}|${a.b.descripcion || ''}`).toLowerCase() : '',
    });
  }
  // Foto al LADO de la tabla (no encima): cada foto va con todas las filas de su serie
  fotosLateralesDePagina(arts, out, celdas, fotos);
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


/**
 * Catálogos con la foto A UN LADO de la tabla (típico de climatización: foto del equipo a la izquierda y, a su
 * derecha, «Serie H14X» con su tabla Código | Artículo | €). Cada foto se asigna a TODAS las filas de la tabla
 * (o tramo de tabla) que tiene al lado, hasta que cambia la serie o la foto. Solo rellena los artículos que
 * la lectura normal (foto encima del título) dejó sin foto, y pone como nombre la descripción de la fila.
 */
function fotosLateralesDePagina(arts, out, celdas, fotos) {
  if (!arts.length) return;
  const candidatas = fotos.filter((f) => f.w * f.h >= 3000);
  // 1) columnas de tablas (por la posición de la referencia) y descripción de cada fila (entre la referencia y el precio)
  const columnas = [];
  arts.map((a, i) => ({ a, i })).sort((p, q) => q.a.cod.y - p.a.cod.y).forEach((r) => {
    const col = columnas.find((c) => Math.abs(c.x - r.a.cod.x) <= 8);
    if (col) col.filas.push(r); else columnas.push({ x: r.a.cod.x, filas: [r] });
  });
  for (const col of columnas) {
    const { filas } = col;
    filas.forEach((r, k) => {
      const a = r.a; const arriba = filas[k - 1]?.a; const abajo = filas[k + 1]?.a;
      const techo = arriba ? Math.min((a.cod.y + arriba.cod.y) / 2, a.cod.y + 22) : a.cod.y + 16;
      const suelo = abajo ? (a.cod.y + abajo.cod.y) / 2 : a.cod.y - 28;
      const cs = celdas.filter((o) => !o.tipo && o.x >= a.cod.x2 - 2 && o.x < a.pre.x - 2 && o.y < techo && o.y >= suelo && !ES_SERIE.test(limpia(o.t)) && !/^(art[ií]culo|descripci[oó]n|designaci[oó]n|pvp|precio|€)$/i.test(limpia(o.t)))
        .sort((p, q) => (Math.abs(p.y - q.y) <= 2.5 ? p.x - q.x : q.y - p.y));
      cs.forEach((o) => { o.tipo = 'desc'; });
      r.mid = limpia(cs.map((o) => o.t).join(' '));
    });
  }
  // 2) tramos: una tabla (o parte de ella) = filas seguidas sin título de serie, cabecera de tabla ni hueco grande entre medias
  const hayCorte = (xL, xR, yAlto, yBajo) => celdas.some((o) => !o.tipo && o.x >= xL - 6 && o.x2 <= xR + 6 && o.y < yAlto - TOL_Y && o.y > yBajo + TOL_Y
    && (ES_SERIE.test(limpia(o.t)) || /^c[oó]digo$/i.test(limpia(o.t)) || (mayusculas(o.t) >= 0.6 && /[A-Za-zÁÉÍÓÚÑ]{4}/.test(o.t))));
  const tramos = [];
  for (const col of columnas) {
    let cur = [];
    const pasos = col.filas.slice(1).map((r, k) => col.filas[k].a.cod.y - r.a.cod.y).sort((p, q) => p - q);
    const normal = pasos.length ? pasos[Math.floor(pasos.length / 2)] : 30;
    col.filas.forEach((r, k) => {
      if (k > 0) {
        const prev = col.filas[k - 1].a; const xR = Math.max(prev.pre.x2, r.a.pre.x2);
        if (prev.cod.y - r.a.cod.y > Math.max(2.2 * normal, 34) || hayCorte(col.x, xR, prev.cod.y, r.a.cod.y)) { tramos.push(cur); cur = []; }
      }
      cur.push(r);
    });
    if (cur.length) tramos.push(cur);
  }
  // 3) foto de cada tramo: la grande que tiene al lado (izquierda o derecha) a su altura; si hay dos fotos grandes
  //    una debajo de otra dentro del mismo tramo, ahí cambia el modelo y el tramo se parte
  const trabajo = [...tramos];
  while (trabajo.length) {
    const filas = trabajo.shift();
    const xL = Math.min(...filas.map((r) => r.a.cod.x)); const xR = Math.max(...filas.map((r) => r.a.pre.x2));
    const alto = filas[0].a.cod.y + 16; const bajo = filas[filas.length - 1].a.cod.y - 24;
    const sup = alto + 55; const inf = bajo - 12;
    const solapa = (f) => Math.max(0, Math.min(f.y + f.h, sup) - Math.max(f.y, inf));
    const buenas = candidatas.filter((f) => ((f.x + f.w <= xL + 14 && xL - (f.x + f.w) <= 140) || (f.x >= xR - 14 && f.x - xR <= 140)) && solapa(f) >= 0.35 * Math.min(f.h, sup - inf));
    if (!buenas.length) continue;
    const mayor = Math.max(...buenas.map((f) => f.w * f.h));
    const grandes = buenas.filter((f) => f.w * f.h >= 0.35 * mayor).sort((p, q) => (q.y + q.h) - (p.y + p.h));
    let cortado = false;
    for (let g = 0; g + 1 < grandes.length && !cortado; g++) {
      const A = grandes[g]; const B = grandes[g + 1];
      if (A.y >= B.y + B.h - 6) { // A encima de B, sin solaparse
        const corte = (A.y + (B.y + B.h)) / 2;
        const parteAlta = filas.filter((r) => r.a.cod.y >= corte); const parteBaja = filas.filter((r) => r.a.cod.y < corte);
        if (parteAlta.length && parteBaja.length) { trabajo.push(parteAlta, parteBaja); cortado = true; }
      }
    }
    if (cortado) continue;
    const foto = grandes.sort((p, q) => solapa(q) - solapa(p) || q.w * q.h - p.w * p.h)[0];
    // serie: el título más cercano por encima de la primera fila
    const serie = celdas.filter((o) => !o.tipo || o.tipo === 'titulo').filter((o) => ES_SERIE.test(limpia(o.t)) && o.y > filas[0].a.cod.y && o.y - filas[0].a.cod.y <= 60 && o.x >= xL - 25 && o.x <= xR)
      .sort((p, q) => p.y - q.y)[0];
    for (const r of filas) {
      const it = out[r.i];
      if (!it._foto) { it._foto = foto.id; it._grupo = ''; it._bloque = `lado|${foto.id}|${Math.round(alto)}`; }
      if (r.mid) { it.product_name = r.mid; if (serie && !it.notes) it.notes = limpia(serie.t); }
    }
  }
}
