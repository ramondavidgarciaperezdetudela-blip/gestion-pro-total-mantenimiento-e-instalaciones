// Importar un presupuesto (o tarifa) desde Excel, CSV, Word o PDF.
// Detecta la fila de cabeceras y las columnas: referencia, descripción, cantidad, precio unitario,
// descuento %, importe y plazo de entrega, y devuelve líneas listas para el presupuesto.
// Todo se hace en el propio dispositivo, sin IA y sin conexión.

/** Quita tildes, signos y mayúsculas para comparar textos. */
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9%€ ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

const ALIAS = {
  ref: ['referencia', 'ref', 'ref.', 'codigo', 'cod', 'cod.', 'articulo', 'art', 'art.', 'n articulo', 'n de articulo', 'sku', 'modelo', 'part number', 'partida', 'item', 'no', 'num'],
  description: ['descripcion', 'concepto', 'detalle', 'denominacion', 'nombre', 'producto', 'designacion', 'articulo descripcion', 'description', 'texto'],
  qty: ['cantidad', 'cant', 'cant.', 'uds', 'ud', 'unidades', 'unid', 'qty', 'medicion', 'num uds'],
  unit_price: ['precio unitario', 'p unitario', 'p. unitario', 'precio unit', 'precio ud', 'precio/ud', 'precio', 'pvp', 'p.v.p', 'tarifa', 'importe unitario', 'unitario', 'eur ud', '€/ud', 'precio venta', 'pvp unitario', 'coste'],
  discount: ['descuento', 'dto', 'dto.', '% dto', 'dto %', 'dto%', '% descuento', 'descuento %', 'desc', 'desc.', '% desc'],
  total: ['importe', 'total', 'importe total', 'precio total', 'total linea', 'subtotal', 'neto', 'importe neto', 'total eur', 'total €'],
  delivery: ['plazo', 'plazo de entrega', 'plazo entrega', 'entrega', 'disponibilidad', 'dias entrega', 'tiempo de entrega', 'delivery', 'lead time', 'plazo (dias)'],
  unit: ['unidad', 'u m', 'um', 'medida', 'unidad de medida', 'u.m.'],
};

const CAMPOS = Object.keys(ALIAS);

/** ¿A qué campo corresponde esta cabecera? (null si a ninguno) */
export function campoDeCabecera(texto) {
  const t = normalizar(texto);
  if (!t) return null;
  // "precio total" / "importe total" son el importe, no el precio unitario
  if (/(precio|importe|total).*(total|importe)|^total/.test(t) && !/unit/.test(t)) return 'total';
  let mejor = null; let puntos = 0;
  for (const campo of CAMPOS) {
    for (const a of ALIAS[campo]) {
      const n = normalizar(a);
      let p = 0;
      if (t === n) p = 100 + n.length;
      else if (t.startsWith(n + ' ') || t.endsWith(' ' + n)) p = 50 + n.length;
      else if (n.length >= 4 && t.includes(n)) p = 20 + n.length;
      if (p > puntos) { puntos = p; mejor = campo; }
    }
  }
  return mejor;
}

/** Número en formato español o inglés: «1.234,56», «1,234.56», «12,5 %», «45 €». */
export function numero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (valor == null) return null;
  let s = String(valor).replace(/[€%\s ]|eur|euros?|ud[s]?\.?/gi, '').trim();
  if (!s || !/\d/.test(s)) return null;
  if (!/^-?[\d.,]+$/.test(s)) return null;
  const comas = (s.match(/,/g) || []).length; const puntos = (s.match(/\./g) || []).length;
  const coma = s.lastIndexOf(','); const punto = s.lastIndexOf('.');
  if (comas && puntos) {
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (comas) {
    s = comas > 1 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (puntos > 1) {
    s = s.replace(/\./g, '');
  } else if (puntos === 1 && /^-?[1-9]\d{0,2}\.\d{3}$/.test(s)) {
    s = s.replace('.', ''); // «1.250» en un texto en español son mil doscientos cincuenta
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Plazo de entrega: «5 días», «3 semanas», «2 meses», «inmediata», «stock»… → días. */
export function plazo(valor) {
  if (valor == null || valor === '') return { dias: null, texto: '' };
  const texto = String(valor).trim();
  const t = normalizar(texto);
  if (/inmediat|stock|disponible|en almacen/.test(t)) return { dias: 0, texto };
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:a|-|y)?\s*(\d+(?:[.,]\d+)?)?\s*(dias?|d|laborables?|semanas?|sem|meses|mes|m)?/);
  if (!m) return { dias: null, texto };
  const n = parseFloat((m[2] || m[1]).replace(',', '.'));
  const unidad = m[3] || 'dias';
  let dias = n;
  if (/^sem/.test(unidad)) dias = n * 7;
  else if (/^mes|^m$/.test(unidad)) dias = n * 30;
  return { dias: Math.round(dias), texto };
}

const FILA_TOTALES = /^(total|subtotal|base imponible|iva|i v a|suma|importe total|total presupuesto|total general|descuento general|transporte|portes)\b/;

function filaVacia(f) { return !f || f.every((c) => c == null || String(c).trim() === ''); }

/** Busca la fila de cabeceras (en las primeras 40 filas) y asigna columnas a campos. */
export function detectarColumnas(filas) {
  let mejor = null;
  for (let r = 0; r < Math.min(40, filas.length); r++) {
    const fila = filas[r];
    if (filaVacia(fila)) continue;
    const mapa = {}; let aciertos = 0;
    fila.forEach((celda, c) => {
      if (typeof celda === 'number') return;
      const campo = campoDeCabecera(celda);
      if (campo && mapa[campo] === undefined) { mapa[campo] = c; aciertos++; }
    });
    const util = (mapa.description !== undefined || mapa.ref !== undefined) && (mapa.unit_price !== undefined || mapa.total !== undefined || mapa.qty !== undefined);
    if (util && (!mejor || aciertos > mejor.aciertos)) mejor = { fila: r, mapa, aciertos };
    if (mejor && mejor.aciertos >= 4) break;
  }
  return mejor;
}

/** Cuando no hay cabeceras: adivina por el contenido (texto largo = descripción, etc.). */
function adivinarColumnas(filas) {
  const datos = filas.filter((f) => !filaVacia(f)).slice(0, 30);
  if (datos.length < 2) return null;
  const ancho = Math.max(...datos.map((f) => f.length));
  const col = Array.from({ length: ancho }, (_, c) => {
    const v = datos.map((f) => f[c]).filter((x) => x != null && String(x).trim() !== '');
    const nums = v.filter((x) => numero(x) !== null).length;
    const largo = v.reduce((a, x) => a + String(x).length, 0) / Math.max(1, v.length);
    return { c, n: v.length, nums, largo };
  }).filter((x) => x.n >= datos.length * 0.5);
  const texto = col.filter((x) => x.nums < x.n * 0.3).sort((a, b) => b.largo - a.largo);
  const numeros = col.filter((x) => x.nums >= x.n * 0.7).sort((a, b) => a.c - b.c);
  if (!texto.length || numeros.length < 1) return null;
  const mapa = { description: texto[0].c };
  const otro = texto.find((x) => x.c !== texto[0].c && x.largo < 25);
  if (otro) mapa.ref = otro.c;
  const [a, b, c] = numeros.map((x) => x.c);
  if (numeros.length >= 3) { mapa.qty = a; mapa.unit_price = b; mapa.total = c; }
  else if (numeros.length === 2) { mapa.qty = a; mapa.unit_price = b; }
  else mapa.unit_price = a;
  return { fila: -1, mapa, aciertos: 0, adivinado: true };
}

/**
 * Convierte filas (array de arrays) en líneas de presupuesto.
 * @returns {{ lineas: object[], columnas: object, avisos: string[] }}
 */
export function lineasDeFilas(filas) {
  const avisos = [];
  const det = detectarColumnas(filas) || adivinarColumnas(filas);
  if (!det) return { lineas: [], columnas: {}, avisos: ['No he encontrado una tabla con descripción y precios en el fichero.'] };
  if (det.adivinado) avisos.push('El fichero no tiene cabeceras claras: he adivinado las columnas. Revisa los datos antes de añadirlos.');
  const { mapa } = det;
  const celda = (f, campo) => (mapa[campo] === undefined ? null : f[mapa[campo]]);
  const lineas = [];
  for (let r = det.fila + 1; r < filas.length; r++) {
    const f = filas[r];
    if (filaVacia(f)) continue;
    const ref = String(celda(f, 'ref') ?? '').trim();
    const descripcion = String(celda(f, 'description') ?? '').trim();
    const cabeceraRepetida = f.some((c) => typeof c === 'string' && campoDeCabecera(c) && normalizar(c) === normalizar(f[mapa.description] ?? ''));
    if (cabeceraRepetida && Object.values(mapa).filter((c) => campoDeCabecera(f[c])).length >= 2) continue;
    const t = normalizar(descripcion || ref);
    let cantidad = numero(celda(f, 'qty'));
    let precio = numero(celda(f, 'unit_price'));
    let descuento = numero(celda(f, 'discount'));
    let total = numero(celda(f, 'total'));
    const pz = plazo(celda(f, 'delivery'));
    const unidad = String(celda(f, 'unit') ?? '').trim();
    if (FILA_TOTALES.test(t) && (cantidad == null || cantidad === 0)) continue;
    if (!descripcion && !ref) continue;
    // Sin números: es un título de apartado o una nota, no una línea
    if (precio == null && total == null && cantidad == null) continue;
    if (descuento != null && descuento > 0 && descuento <= 1 && typeof celda(f, 'discount') === 'number') descuento *= 100;
    const aviso = [];
    if (cantidad == null) cantidad = 1;
    if (descuento == null) descuento = 0;
    if (precio == null && total != null && cantidad) precio = Math.round((total / (cantidad * (1 - descuento / 100))) * 100) / 100;
    if (precio == null) { precio = 0; aviso.push('Sin precio'); }
    const calculado = Math.round(cantidad * precio * (1 - descuento / 100) * 100) / 100;
    if (total == null) total = calculado;
    else if (Math.abs(total - calculado) > Math.max(0.05, Math.abs(calculado) * 0.01)) aviso.push(`El importe del fichero (${total.toFixed(2)} €) no coincide con cantidad × precio − dto (${calculado.toFixed(2)} €)`);
    lineas.push({
      reference: ref, description: descripcion || ref, quantity: cantidad, unit_price: precio, discount: descuento,
      total: calculado, total_fichero: total, delivery_days: pz.dias, delivery_text: pz.texto, unit: unidad, avisos: aviso,
      origen_fila: r + 1,
    });
  }
  if (!lineas.length) avisos.push('Hay cabeceras, pero no encuentro líneas con precio debajo.');
  return { lineas, columnas: mapa, avisos };
}

// ── Lectura de ficheros ────────────────────────────────────────────────────

export function tipoDeFichero(nombre = '') {
  const e = String(nombre).toLowerCase().split('.').pop();
  if (['xlsx', 'xls', 'xlsm', 'ods', 'csv', 'tsv', 'txt'].includes(e)) return 'hoja';
  if (e === 'docx') return 'word';
  if (e === 'pdf') return 'pdf';
  if (['doc', 'rtf', 'odt'].includes(e)) return 'word-antiguo';
  if (['png', 'jpg', 'jpeg', 'webp', 'heic'].includes(e)) return 'imagen';
  return 'desconocido';
}

export async function filasDeHoja(buffer, nombre = '') {
  const XLSX = await import('xlsx');
  const esTexto = /\.(csv|tsv|txt)$/i.test(nombre);
  let wb;
  if (esTexto) {
    const texto = new TextDecoder('utf-8').decode(new Uint8Array(buffer)).replace(/^﻿/, '');
    const cuerpo = /�/.test(texto) ? new TextDecoder('windows-1252').decode(new Uint8Array(buffer)) : texto;
    const sep = (cuerpo.split('\n')[0].match(/;/g) || []).length >= (cuerpo.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    wb = XLSX.read(cuerpo, { type: 'string', FS: /\.tsv$/i.test(nombre) ? '\t' : sep, raw: true });
  } else {
    wb = XLSX.read(buffer, { type: 'array', cellDates: false, dense: true });
  }
  // La hoja con más filas útiles; si hay varias con tabla, se juntan
  let mejor = [];
  for (const n of wb.SheetNames) {
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null, raw: true, blankrows: false });
    const r = lineasDeFilas(filas);
    if (r.lineas.length > (mejor.lineas?.length || 0)) mejor = { ...r, filas, hoja: n };
  }
  return mejor.filas || [];
}

export async function filasDeWord(buffer) {
  const { unzipSync, strFromU8 } = await import('fflate');
  const zip = unzipSync(new Uint8Array(buffer));
  const entrada = zip['word/document.xml'];
  if (!entrada) throw new Error('El Word no tiene contenido legible');
  const xml = new DOMParser().parseFromString(strFromU8(entrada), 'application/xml');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const textoDe = (nodo) => Array.from(nodo.getElementsByTagNameNS(W, 'p'))
    .map((p) => Array.from(p.getElementsByTagNameNS(W, 't')).map((t) => t.textContent).join('')).join(' ').trim();
  const filas = [];
  for (const tabla of Array.from(xml.getElementsByTagNameNS(W, 'tbl'))) {
    for (const tr of Array.from(tabla.getElementsByTagNameNS(W, 'tr'))) {
      const celdas = Array.from(tr.childNodes).filter((n) => n.localName === 'tc').map(textoDe);
      filas.push(celdas);
    }
    filas.push([]);
  }
  return filas;
}

/** Lee el fichero y devuelve las líneas detectadas. */
export async function importarFichero(file) {
  const tipo = tipoDeFichero(file.name);
  if (tipo === 'word-antiguo') throw new Error('Los Word antiguos (.doc) no se pueden leer. Guárdalo como .docx o PDF y vuelve a subirlo.');
  if (tipo === 'imagen') throw new Error('Las fotos no se pueden leer sin IA. Sube el Excel, el PDF o el Word.');
  if (tipo === 'desconocido') throw new Error('Formato no admitido. Usa Excel, CSV, Word (.docx) o PDF.');
  const buffer = await file.arrayBuffer();
  let filas;
  if (tipo === 'hoja') filas = await filasDeHoja(buffer, file.name);
  else if (tipo === 'word') filas = await filasDeWord(buffer);
  else {
    const { filasDePdf } = await import('./leerPdfTabla.js');
    filas = await filasDePdf(buffer);
  }
  const r = lineasDeFilas(filas);
  if (tipo === 'pdf' && !r.lineas.length) r.avisos.push('Si el PDF es una foto escaneada no tiene texto que leer: pide el Excel al proveedor o súbelo con IA activada.');
  return { ...r, tipo };
}

// ── Búsqueda de artículos en las bases de datos ───────────────────────────

function palabras(t) { return normalizar(t).split(' ').filter((p) => p.length > 2); }

/** Parecido entre dos descripciones (0 a 1), por palabras comunes. */
export function parecido(a, b) {
  const A = new Set(palabras(a)); const B = new Set(palabras(b));
  if (!A.size || !B.size) return 0;
  let comunes = 0; A.forEach((p) => { if (B.has(p)) comunes++; });
  return comunes / Math.max(A.size, B.size);
}

export function claveRef(ref) { return String(ref ?? '').toUpperCase().replace(/[\s.\-_/]+/g, ''); }

/**
 * Candidatos para una línea. `fuentes`:
 *  · propios: artículos de «Mi base de datos» (PriceItem)
 *  · porRef: Map(claveRef → SupplierPrice[]) ya consultado en proveedores
 * Cada candidato: { origen, proveedor, ref, descripcion, precio, id, exacto }
 */
export function candidatosDeLinea(linea, { propios = [], porRef = new Map() }) {
  const res = [];
  const clave = claveRef(linea.reference);
  if (clave) {
    for (const p of propios) {
      if (claveRef(p.reference) === clave || claveRef(p.supplier_ref) === clave) {
        res.push({ origen: 'propia', proveedor: p.supplier_name || '', ref: p.reference || p.supplier_ref, descripcion: p.description, precio: p.unit_price, id: p.id, seccion: p.section, plazo: p.delivery_days, exacto: true });
      }
    }
    for (const s of porRef.get(clave) || []) {
      res.push({ origen: 'proveedor', proveedor: s.supplier_name || '', ref: s.product_code, descripcion: s.product_name, precio: s.sale_price || s.cost_price || 0, coste: s.cost_price || 0, id: s.id, exacto: true });
    }
  }
  if (!res.length && linea.description) {
    for (const p of propios) {
      const sim = parecido(linea.description, p.description);
      if (sim >= 0.8) res.push({ origen: 'propia', proveedor: p.supplier_name || '', ref: p.reference || p.supplier_ref, descripcion: p.description, precio: p.unit_price, id: p.id, seccion: p.section, plazo: p.delivery_days, exacto: false, parecido: sim });
    }
  }
  return res.sort((a, b) => Number(b.exacto) - Number(a.exacto) || (b.parecido || 0) - (a.parecido || 0));
}
