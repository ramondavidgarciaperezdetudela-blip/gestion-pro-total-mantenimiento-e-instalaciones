// Fichas técnicas de máquinas: reconocer fabricante y modelo en una línea, encontrar la ficha ya guardada
// y, si no hay, preparar la búsqueda. Sin dependencias de la app para poder probarse con node.
import { PORTALES } from './documentacionTecnica.js';

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (t) => sinTildes(t).toUpperCase().replace(/[^A-Z0-9]/g, '');

export const FABRICANTES = [
  'Zanotti', 'Intarcon', 'Danfoss', 'Bitzer', 'Copeland', 'Frascold', 'Dorin', 'Tecumseh', 'Embraco', 'Kide', 'Taver',
  'Frigicoll', 'Eurofred', 'Friotherm', 'Lu-Ve', 'Guntner', 'Alfa Laval', 'Kelvion', 'Carrier', 'Dunham Bush',
  'Daikin', 'Mitsubishi Electric', 'Mitsubishi Heavy', 'Panasonic', 'LG', 'Samsung', 'Fujitsu', 'Toshiba', 'Hisense',
  'Midea', 'Haier', 'Gree', 'Airwell', 'Kaysun', 'Hitachi', 'Trane', 'York', 'Lennox', 'Johnson Controls', 'Sanyo',
  'Secop', 'Emerson', 'Frimetal', 'Ebm-papst', 'Ziehl-Abegg', 'Hubbard', 'Tecnac', 'Mehitsa', 'Cool Air',
];

/** Fabricante que aparece en un texto, con su nombre bonito, o ''. */
export function fabricanteDe(texto) {
  const t = ` ${norm(texto)} `;
  const crudo = ` ${sinTildes(texto).toUpperCase()} `;
  for (const f of FABRICANTES) {
    const n = norm(f);
    // las marcas cortas (LG, York) solo cuentan si van como palabra suelta
    if (n.length <= 3) { if (new RegExp(`(^|[^A-Z0-9])${n}([^A-Z0-9]|$)`).test(crudo)) return f; }
    else if (t.includes(n)) return f;
  }
  return '';
}

const NO_ES_MODELO = /^(R-?\d{2,3}[A-Z]?|\d+(V|W|KW|HZ|HP|CV|MM|M|KG|L|A|BTU|BTUS|HZ|PH|PHASE)|[AB]\+{1,3}|\d{4,6}BTU|IP\d{2}|\d+(\/\d+)?)$/i;

/** Modelo probable dentro de una descripción: la palabra con letras y cifras que más parece un código. */
export function modeloDe(texto, fabricante = '') {
  const limpio = sinTildes(texto).replace(/[()]/g, ' ');
  const palabras = limpio.split(/[\s,;:]+/).filter(Boolean);
  const fab = norm(fabricante);
  let mejor = null;
  palabras.forEach((p, i) => {
    const q = p.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
    if (q.length < 3 || NO_ES_MODELO.test(q) || norm(q) === fab) return;
    const letras = /[A-Za-z]/.test(q), cifras = /\d/.test(q);
    if (!cifras) return;
    let puntos = (letras ? 3 : 0) + (cifras ? 1 : 0) + Math.min(q.length, 12) / 4 + (/[-\/]/.test(q) ? 1 : 0);
    if (!letras) puntos -= 2.5; // un número a secas rara vez es un modelo
    if (fab && i > 0 && norm(palabras[i - 1]) === fab) puntos += 3; // «ZANOTTI GMS150»
    if (!mejor || puntos > mejor.puntos) mejor = { q, puntos };
  });
  return mejor && mejor.puntos >= 4.5 ? mejor.q : '';
}

/** Fabricante y modelo de una línea de presupuesto. */
export function identificarMaquina(item) {
  const texto = `${item?.description || ''} ${item?.notes || ''}`;
  const fabricante = fabricanteDe(texto);
  const ref = String(item?.reference || '').trim();
  const modelo = modeloDe(item?.description || '', fabricante) || (ref.length >= 4 ? ref : '');
  return { fabricante, modelo, referencia: ref };
}

export const claveFicha = (fabricante, modelo) => `${norm(fabricante)}|${norm(modelo)}`;

/**
 * La ficha ya guardada que corresponde a una línea: por referencia exacta, por modelo guardado que aparezca en
 * la descripción o por el modelo detectado. Si hay varias, gana la de modelo más largo (la más concreta).
 */
export function buscarFicha(fichas, item) {
  if (!fichas?.length || !item) return null;
  const ref = norm(item.reference);
  const desc = norm(`${item.description || ''} ${item.notes || ''}`);
  const { fabricante, modelo } = identificarMaquina(item);
  const m = norm(modelo);
  let mejor = null;
  for (const f of fichas) {
    const fm = norm(f.model), fr = norm(f.reference);
    let puntos = 0;
    if (ref && ((fr && fr === ref) || (fm && fm === ref))) puntos = 100 + fm.length;
    else if (m && fm && fm === m) puntos = 80 + fm.length;
    else if (fm.length >= 4 && desc.includes(fm)) puntos = 50 + fm.length;
    else if (fr.length >= 4 && desc.includes(fr)) puntos = 40 + fr.length;
    if (!puntos) continue;
    // un fabricante distinto descarta la coincidencia floja
    if (fabricante && f.manufacturer && norm(f.manufacturer) !== norm(fabricante) && puntos < 100) continue;
    if (!mejor || puntos > mejor.puntos) mejor = { f, puntos };
  }
  return mejor ? mejor.f : null;
}

/** Enlace que se abre al consultar una ficha: primero la copia guardada, luego el enlace. */
export const enlaceDeFicha = (f) => f?.file_url || f?.url || '';

export function urlValida(u) {
  try { const x = new URL(String(u).trim()); return x.protocol === 'http:' || x.protocol === 'https:'; } catch { return false; }
}

/** Enlaces para buscar la ficha a mano cuando no está guardada. */
export function enlacesDeBusqueda({ fabricante, modelo, descripcion }) {
  const nombre = [fabricante, modelo || descripcion].filter(Boolean).join(' ').trim();
  const q = nombre ? `${nombre} ficha técnica pdf` : '';
  const enlaces = [];
  if (q) enlaces.push({ etiqueta: 'Buscar la ficha en Google', url: `https://www.google.com/search?q=${encodeURIComponent(q)}` });
  const portal = fabricante && PORTALES.find((p) => norm(p.marca).startsWith(norm(fabricante).slice(0, 5)));
  if (portal) enlaces.push({ etiqueta: `Descargas de ${portal.marca}`, url: portal.url });
  return enlaces;
}

/** Petición a la IA con búsqueda en internet. Pide solo lo que se necesita y que no invente. */
export function encargoFichaIA({ fabricante, modelo, descripcion }) {
  return `Busca en internet la ficha técnica oficial de esta máquina frigorífica o de climatización y responde SOLO con datos que veas en la ficha o en la web del fabricante. Si no los encuentras, deja el campo vacío: no inventes nada ni adivines enlaces.
Fabricante: ${fabricante || '(desconocido)'}
Modelo: ${modelo || '(desconocido)'}
Descripción: ${descripcion || ''}
Devuelve: fabricante, modelo, url_ficha (enlace directo al PDF o a la página oficial del producto), conexion_liquido y conexion_aspiracion (diámetro de las conexiones de tubería en pulgadas, por ejemplo 3/8" y 5/8").`;
}

/** Limpia la respuesta de la IA: solo enlaces http(s) y diámetros reconocibles. */
export function limpiarRespuestaIA(r, normalizarDiametro) {
  const o = typeof r === 'object' && r ? r : {};
  const texto = (v) => (typeof v === 'string' && v.trim() && !/^(no |desconocid|n\/a|-|null)/i.test(v.trim()) ? v.trim() : '');
  const url = texto(o.url_ficha);
  const liq = normalizarDiametro?.(texto(o.conexion_liquido)) || null;
  const asp = normalizarDiametro?.(texto(o.conexion_aspiracion)) || null;
  return {
    fabricante: texto(o.fabricante), modelo: texto(o.modelo),
    url: urlValida(url) ? url : '',
    liquido: liq, aspiracion: asp && liq && asp.mm >= liq.mm ? asp : null,
  };
}
