/**
 * SATURACIÓN DE REFRIGERANTES — presión ↔ temperatura de los gases del programa.
 *
 * Es la base de todo lo que habla de presiones: las tablas P–T, el manómetro, el cálculo de
 * capilares y de filtros. Los números NO están escritos a mano: salen de `refrigerantProps.js`
 * (CoolProp 8.0.0, ecuaciones de estado de referencia) y se interpolan con PCHIP en ln P, que es
 * monótono y no oscila entre dos filas de la tabla (cada 2,5 K).
 *
 * Burbuja y rocío
 * ───────────────
 * En un gas puro (R-134a, R-32, R-290…) solo hay una temperatura de saturación. En las mezclas
 * zeótropas (R-407C, R-448A, R-449A…) la mezcla empieza a hervir en el punto de BURBUJA y acaba en
 * el de ROCÍO, que es más caliente: la diferencia es el deslizamiento («glide»). A una misma presión
 * hay, pues, dos temperaturas. Convenciones del oficio:
 *
 *   · Recalentamiento y presión de evaporación        →  ROCÍO (EN 12900)
 *   · Subenfriamiento                                  →  BURBUJA
 *   · Presión de condensación (temperatura nominal)   →  ROCÍO (EN 12900)
 *   · Presión en reposo, con líquido en el depósito   →  BURBUJA a la temperatura ambiente
 *
 * Unidades: temperaturas en °C, presiones en bar ABSOLUTOS salvo que el nombre diga «manómetro».
 * Fuera del rango de la tabla las funciones devuelven `null` (no se extrapola nunca).
 */
import { REFRIGERANT_PROPS } from './refrigerantProps.js';

export const ATM = 1.01325; // bar — presión atmosférica normal
export const PSI_POR_BAR = 14.5037738;
export const INHG_POR_BAR = 29.5299831; // para el vacío, que los manómetros dan en pulgadas de mercurio

/* ───────────────────────────── Interpolación monótona (PCHIP) ───────────────────────────── */

function derivadaExtremo(h0, h1, d0, d1) {
  let m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (Math.sign(m) !== Math.sign(d0)) m = 0;
  else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(m) > 3 * Math.abs(d0)) m = 3 * d0;
  return m;
}

/** Interpolador cúbico de Hermite monótono (Fritsch-Carlson). xs estrictamente creciente. */
export function crearPchip(xs, ys) {
  const n = xs.length;
  const h = new Array(n - 1);
  const d = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) {
    h[i] = xs[i + 1] - xs[i];
    d[i] = (ys[i + 1] - ys[i]) / h[i];
  }
  const m = new Array(n);
  if (n === 2) {
    m[0] = d[0];
    m[1] = d[0];
  } else {
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) m[i] = 0;
      else {
        const w1 = 2 * h[i] + h[i - 1];
        const w2 = h[i] + 2 * h[i - 1];
        m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
      }
    }
    m[0] = derivadaExtremo(h[0], h[1], d[0], d[1]);
    m[n - 1] = derivadaExtremo(h[n - 2], h[n - 3], d[n - 2], d[n - 3]);
  }
  const x0 = xs[0];
  const x1 = xs[n - 1];
  return (xIn) => {
    const x = xIn <= x0 ? x0 : xIn >= x1 ? x1 : xIn; // sin extrapolar: se limita al rango de la tabla
    let lo = 0;
    let hi = n - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (xs[mid] <= x) lo = mid;
      else hi = mid - 1;
    }
    const t = (x - xs[lo]) / h[lo];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[lo] +
      (t3 - 2 * t2 + t) * h[lo] * m[lo] +
      (-2 * t3 + 3 * t2) * ys[lo + 1] +
      (t3 - t2) * h[lo] * m[lo + 1]
    );
  };
}

/* ───────────────────────────── Identificación de gases ───────────────────────────── */

const CLAVES = Object.keys(REFRIGERANT_PROPS);
const POR_MINUSCULAS = new Map(CLAVES.map((k) => [k.toLowerCase(), k]));
// «R-1234ze» sin más se entiende como el isómero (E), que es el comercial.
for (const k of CLAVES) {
  const sinIsomero = k.toLowerCase().replace(/\(e\)$/, '');
  if (!POR_MINUSCULAS.has(sinIsomero)) POR_MINUSCULAS.set(sinIsomero, k);
}

/**
 * Identificador del gas en la tabla de propiedades, o `null` si no hay datos de ese gas.
 * Acepta variantes: «R404A», «r-404a», «R-744 (CO₂)», «R-1234ze». El isómero (Z) NO se confunde con el (E).
 */
export function idGasProps(id) {
  if (typeof id !== 'string') return null;
  const t = id.trim();
  if (REFRIGERANT_PROPS[t]) return t;
  const minus = t.toLowerCase().replace(/\s+/g, '');
  if (POR_MINUSCULAS.has(minus)) return POR_MINUSCULAS.get(minus);
  const sinNombre = minus.replace(/\((?![ez]\))[^)]*\)$/, ''); // «r-744(co₂)» → «r-744»; deja «(e)» y «(z)»
  if (POR_MINUSCULAS.has(sinNombre)) return POR_MINUSCULAS.get(sinNombre);
  const conGuion = sinNombre.replace(/^r-?/, 'r-');
  return POR_MINUSCULAS.get(conGuion) || null;
}

export const tieneDatos = (id) => idGasProps(id) !== null;

/** Identificadores de todos los gases con datos, en orden natural (R-22, R-32, R-134a, R-290…). */
export function idsConDatos() {
  return [...CLAVES].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
}

/* ───────────────────────────── Interpoladores de un gas ───────────────────────────── */

const CACHE_GASES = new Map();

/** Interpoladores de un gas (variable independiente: s = ln P[bar]). `null` si no hay datos. */
export function gasPreparado(idEntrada) {
  const id = idGasProps(idEntrada);
  if (!id) return null;
  if (CACHE_GASES.has(id)) return CACHE_GASES.get(id);
  const d = REFRIGERANT_PROPS[id];
  const s = d.P.map((p) => Math.log(p));
  const g = {
    id,
    datos: d,
    sMin: s[0],
    sMax: s[s.length - 1],
    Tb: crearPchip(s, d.T), // temperatura de burbuja (°C)
    Td: crearPchip(s, d.Td), // temperatura de rocío (°C)
    lnRl: crearPchip(s, d.rl.map(Math.log)),
    lnRv: crearPchip(s, d.rv.map(Math.log)),
    hl: crearPchip(s, d.hl), // kJ/kg
    hv: crearPchip(s, d.hv),
    lnMl: crearPchip(s, d.ml.map(Math.log)), // µPa·s
    lnMv: crearPchip(s, d.mv.map(Math.log)),
    cpv: crearPchip(s, d.cpv), // kJ/kg·K
    sDeTb: crearPchip(d.T, s),
    sDeTd: crearPchip(d.Td, s),
  };
  CACHE_GASES.set(id, g);
  return g;
}

/* ───────────────────────────── Presión ↔ temperatura ───────────────────────────── */

const esBurbuja = (punto) => punto === 'burbuja';

/**
 * Rango en el que hay datos. `burbuja` y `rocío` coinciden en un gas puro; en una mezcla el rango del
 * rocío está desplazado hacia arriba por el deslizamiento.
 */
export function rangoSaturacion(id) {
  const g = gasPreparado(id);
  if (!g) return null;
  const { T, Td, P } = g.datos;
  const n = P.length;
  return {
    burbuja: { tMin: T[0], tMax: T[n - 1] },
    rocio: { tMin: Td[0], tMax: Td[n - 1] },
    pMin: P[0],
    pMax: P[n - 1],
  };
}

/**
 * Presión de saturación (bar absolutos) a una temperatura.
 * @param {string} id        gas
 * @param {number} t         temperatura en °C
 * @param {'rocio'|'burbuja'} [punto='rocio']  a qué temperatura se refiere `t` en una mezcla
 * @returns {number|null}    `null` si no hay datos del gas o `t` queda fuera de la tabla
 */
export function presionSaturacion(id, t, punto = 'rocio') {
  const g = gasPreparado(id);
  const temp = Number(t);
  if (!g || !Number.isFinite(temp)) return null;
  const serie = esBurbuja(punto) ? g.datos.T : g.datos.Td;
  const EPS = 1e-9;
  if (temp < serie[0] - EPS || temp > serie[serie.length - 1] + EPS) return null;
  return Math.exp(esBurbuja(punto) ? g.sDeTb(temp) : g.sDeTd(temp));
}

/**
 * Temperatura de saturación (°C) a una presión absoluta (bar).
 * @returns {number|null}  `null` si no hay datos o la presión queda fuera de la tabla
 */
export function temperaturaSaturacion(id, pAbs, punto = 'rocio') {
  const g = gasPreparado(id);
  const p = Number(pAbs);
  if (!g || !Number.isFinite(p) || p <= 0) return null;
  const { P } = g.datos;
  const EPS = 1e-9;
  if (p < P[0] * (1 - EPS) || p > P[P.length - 1] * (1 + EPS)) return null;
  const s = Math.log(p);
  return esBurbuja(punto) ? g.Tb(s) : g.Td(s);
}

/**
 * Deslizamiento (K) de un gas a la temperatura de burbuja `t`: cuánto más caliente es el rocío a esa misma
 * presión. 0 en gases puros y azeótropos.
 */
export function deslizamiento(id, t) {
  const g = gasPreparado(id);
  const temp = Number(t);
  if (!g || !Number.isFinite(temp)) return null;
  const T = g.datos.T;
  if (temp < T[0] || temp > T[T.length - 1]) return null;
  const s = g.sDeTb(temp);
  return Math.max(0, g.Td(s) - temp);
}

/** Temperatura de ebullición a presión atmosférica normal (punto de burbuja), o `null` si queda fuera de la tabla. */
export function temperaturaEbullicionNormal(id) {
  return temperaturaSaturacion(id, ATM, 'burbuja');
}

/**
 * Filas de una tabla P–T en una rejilla regular de temperaturas.
 * Cada fila: `{ t, pBurbuja, pRocio }` (bar absolutos; `null` donde el gas no llega).
 */
export function tablaSaturacion(id, { desde = -40, hasta = 60, paso = 5 } = {}) {
  if (!gasPreparado(id) || !(paso > 0)) return [];
  const n = Math.floor((hasta - desde) / paso + 1e-9);
  const filas = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.round((desde + i * paso) * 1000) / 1000;
    const pBurbuja = presionSaturacion(id, t, 'burbuja');
    const pRocio = presionSaturacion(id, t, 'rocio');
    if (pBurbuja === null && pRocio === null) continue;
    filas.push({ t, pBurbuja, pRocio });
  }
  return filas;
}

/* ───────────────────────────── Lo que marca el manómetro ───────────────────────────── */

/** De bar absolutos a bar de manómetro (puede ser negativo: vacío). */
export const aManometro = (pAbs) => pAbs - ATM;
/** De bar de manómetro a bar absolutos. */
export const aAbsoluta = (pMan) => pMan + ATM;
/** De bar a psi. */
export const barAPsi = (bar) => bar * PSI_POR_BAR;
/** De bar de manómetro NEGATIVO a pulgadas de mercurio de vacío (positivas). */
export const vacioEnInHg = (pMan) => (pMan < 0 ? -pMan * INHG_POR_BAR : 0);
