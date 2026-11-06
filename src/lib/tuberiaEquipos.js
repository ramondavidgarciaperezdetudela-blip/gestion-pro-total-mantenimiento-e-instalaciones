// Detección de equipos frigoríficos / de clima en una línea de presupuesto y cálculo de la tubería que necesitan.
// Sin dependencias de la app para poder probarse con node.
import { buscarFicha, identificarMaquina } from './fichasMaquinas.js';

export const DIAMETROS = [
  { pulg: '1/4"', mm: 6.35 }, { pulg: '3/8"', mm: 9.52 }, { pulg: '1/2"', mm: 12.7 }, { pulg: '5/8"', mm: 15.88 },
  { pulg: '3/4"', mm: 19.05 }, { pulg: '7/8"', mm: 22.22 }, { pulg: '1 1/8"', mm: 28.58 }, { pulg: '1 3/8"', mm: 34.92 },
  { pulg: '1 5/8"', mm: 41.28 }, { pulg: '2 1/8"', mm: 53.98 },
];

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const num = (s) => parseFloat(String(s).replace(/\./g, (m, i, all) => (/^\d{1,3}(\.\d{3})+$/.test(all) ? '' : '.')).replace(',', '.'));

export function diametroDePulgadas(txt) {
  const t = String(txt || '').replace(/["”″']/g, '').trim().replace(/\s+/g, ' ');
  return DIAMETROS.find((d) => d.pulg.replace('"', '') === t) || null;
}
export function diametroDeMm(mm) {
  const v = Number(mm);
  if (!Number.isFinite(v)) return null;
  let mejor = null;
  for (const d of DIAMETROS) { const dif = Math.abs(d.mm - v); if (dif <= 1.2 && (!mejor || dif < mejor.dif)) mejor = { d, dif }; }
  return mejor ? mejor.d : null;
}

// ── ¿Es un equipo? ─────────────────────────────────────────────────────────
const ACCESORIO = /^(tubo|tuberia|aislam|aislante|codo|manguito|union|soporte|bancada|mensula|kit|valvula|presostato|filtro|mando|control|termostato|bomba de condensados|canaleta|cable|manguera|sifon|antivibr|rejilla|pila|mano de obra|instalacion|desplazamiento|puesta en marcha|carga de gas|gas |botella|racor|abrazadera|cinta|soldadura|varilla|resistencia|sonda|ventilador|reductor|te |t de )/;
const CLIMA = /(split|multisplit|multi split|cassette|cassete|conductos?|suelo.?techo|inverter|aire acondicionado|bomba de calor|climatizador|mural|unidad (exterior|interior)|vrf|vrv|aerotermia|fan.?coil)/;
const INDUSTRIAL = /(camara|unidad condensadora|grupo (frigorifico|condensador|compresor)|central (frigorifica|de compresores)|evaporador|condensadora|enfriadora|bibloc|monobloc|rack |equipo frigorifico|maquina frigorifica|tunel de congelacion|cuba|vitrina frigor)/;
const MARCAS_FRIO = /(zanotti|intarcon|danfoss|bitzer|copeland|frascold|dorin|tecumseh|embraco|kide|taver|frigicoll|eurofred|friotherm|lu-ve|guntner|alfa laval|kelvion|carrier|dunham|bush)/;

export function potenciaDe(texto) {
  const t = sinTildes(texto);
  const r = { kw: null, hp: null, btu: null };
  let m = t.match(/(\d{1,3}(?:[.,]\d{3})+|\d{4,6})\s*(?:btu|btus|btu\/h)\b/);
  if (m) { r.btu = num(m[1]); r.kw = +(r.btu / 3412).toFixed(2); }
  m = t.match(/(\d{1,3}(?:[.,]\d{3})+|\d{3,6})\s*(?:frig|fg)/);
  if (m && !r.kw) { r.kw = +(num(m[1]) * 1.163 / 1000).toFixed(2); }
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:kw|kws)\b/);
  if (m && !r.kw) r.kw = num(m[1]);
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:cv|hp)\b/);
  if (m) r.hp = num(m[1]);
  if (!r.btu && !r.kw && !r.hp) {
    // «12000» o «2,5» sueltos en un nombre de split tipo «Split 12000»: solo se acepta el formato de 4-5 cifras múltiplo de 1000
    m = t.match(/(?:^|\D)(9|12|18|24|30|36|48|60)\.?000(?:\D|$)/);
    if (m) { r.btu = Number(m[1]) * 1000; r.kw = +(r.btu / 3412).toFixed(2); }
  }
  return r;
}

export function tipoDeEquipo(texto) {
  const t = sinTildes(texto);
  if (ACCESORIO.test(t.trim().slice(0, 30))) return null;
  const pot = potenciaDe(texto);
  const industrial = INDUSTRIAL.test(t);
  const clima = CLIMA.test(t);
  if (industrial && !clima) return 'industrial';
  if (clima && !industrial) return 'clima';
  if (industrial && clima) return /camara|condensadora|evaporador|grupo|central/.test(t) ? 'industrial' : 'clima';
  if (MARCAS_FRIO.test(t) && (pot.kw || pot.hp)) return 'industrial';
  return null;
}
export const esEquipoFrigorifico = (item) => !!tipoDeEquipo(item?.description);

// ── Conexiones ─────────────────────────────────────────────────────────────
const FRAC = '(\\d(?: \\d)?\\/\\d{1,2})';
function aDiametro(valor, esMm) {
  if (esMm) return diametroDeMm(num(valor));
  return diametroDePulgadas(valor);
}

/** Lee las conexiones escritas en la descripción: «líquido 3/8" aspiración 5/8"», «1/4" - 1/2"», «Ø 6,35/12,7 mm»… */
export function conexionesDeTexto(texto) {
  const t = sinTildes(texto).replace(/[”″]/g, '"').replace(/,/g, '.');
  const valor = `(?:${FRAC}\\s*(?:"|''|pulg)?|(?:o|diam\\.?)?\\s*(\\d{1,2}(?:\\.\\d+)?)\\s*mm)`;
  const leer = (m, i) => (m[i] ? aDiametro(m[i], false) : m[i + 1] ? aDiametro(m[i + 1], true) : null);
  let liq = null, asp = null;
  const rl = new RegExp(`liquido[^0-9]{0,18}${valor}`).exec(t);
  if (rl) liq = leer(rl, 1);
  const ra = new RegExp(`(?:aspiracion|succion|gas)[^0-9]{0,18}${valor}`).exec(t);
  if (ra) asp = leer(ra, 1);
  if (!liq || !asp) {
    const par = new RegExp(`${FRAC}\\s*(?:"|'')?\\s*(?:-|–|/|x|y|\\+)\\s*${FRAC}\\s*(?:"|'')?`).exec(t);
    if (par) { const a = diametroDePulgadas(par[1]), b = diametroDePulgadas(par[2]); if (a && b) { liq = liq || (a.mm <= b.mm ? a : b); asp = asp || (a.mm <= b.mm ? b : a); } }
  }
  if (!liq || !asp) {
    const par = /(?:conex\w*|tuber\w*|diametro\w*|linea\w*|o)\D{0,12}?(\d{1,2}(?:\.\d+)?)\s*(?:-|–|\/|x|y)\s*(\d{1,2}(?:\.\d+)?)\s*(?:mm)?/.exec(t);
    if (par) { const a = diametroDeMm(Number(par[1])), b = diametroDeMm(Number(par[2])); if (a && b && a.mm !== b.mm) { liq = liq || (a.mm < b.mm ? a : b); asp = asp || (a.mm < b.mm ? b : a); } }
  }
  return liq && asp && liq.mm <= asp.mm ? { liquido: liq, aspiracion: asp } : null;
}

// Tablas orientativas (distancias cortas, hasta ~15 m). El dato bueno es siempre el de la ficha del fabricante.
const T_CLIMA = [ // [kW frigorificos hasta, liquido, aspiracion]
  [3.7, '1/4"', '3/8"'], [5.4, '1/4"', '1/2"'], [8.0, '3/8"', '5/8"'], [16.5, '3/8"', '5/8"'], [Infinity, '3/8"', '3/4"'],
];
const T_INDUSTRIAL = [ // [CV hasta, liquido, aspiracion]
  [1.5, '3/8"', '5/8"'], [2.5, '3/8"', '3/4"'], [4, '1/2"', '7/8"'], [6, '5/8"', '1 1/8"'], [10, '7/8"', '1 3/8"'], [Infinity, '7/8"', '1 5/8"'],
];

export function conexionesPorPotencia(tipo, pot) {
  if (tipo === 'clima') {
    const kw = pot.kw ?? (pot.hp ? pot.hp * 2.6 : null);
    if (!kw) return null;
    const f = T_CLIMA.find((x) => kw <= x[0]);
    return { liquido: diametroDePulgadas(f[1]), aspiracion: diametroDePulgadas(f[2]) };
  }
  const hp = pot.hp ?? (pot.kw ? pot.kw / 2.5 : null);
  if (!hp) return null;
  const f = T_INDUSTRIAL.find((x) => hp <= x[0]);
  return { liquido: diametroDePulgadas(f[1]), aspiracion: diametroDePulgadas(f[2]) };
}

const CLAVE_MEMORIA = 'gpt_tuberias_equipo';
const claveRef = (r) => String(r ?? '').toUpperCase().replace(/[\s.\-_/]+/g, '');
function leerMemoria() { try { return JSON.parse(globalThis.localStorage?.getItem(CLAVE_MEMORIA) || '{}'); } catch { return {}; } }
export function recordarConexiones(referencia, liquido, aspiracion) {
  const k = claveRef(referencia); if (!k || !liquido || !aspiracion) return;
  try { const m = leerMemoria(); m[k] = { liquido: liquido.pulg, aspiracion: aspiracion.pulg }; globalThis.localStorage?.setItem(CLAVE_MEMORIA, JSON.stringify(m)); } catch { /* sin almacenamiento */ }
}
function conexionesRecordadas(referencia) {
  const k = claveRef(referencia); if (!k) return null;
  const v = leerMemoria()[k]; if (!v) return null;
  const l = diametroDePulgadas(v.liquido), a = diametroDePulgadas(v.aspiracion);
  return l && a ? { liquido: l, aspiracion: a } : null;
}

/**
 * Analiza una línea: { tipo, potencia, conexiones, origen, aviso }.
 * origen: 'ficha' (Fichas técnicas guardadas) | 'recordada' (la que guardaste para esa referencia) | 'descripcion' (escrita en el texto) | 'potencia' (orientativa) | null.
 */
export function analizarEquipo(item, fichas = []) {
  const texto = `${item?.description || ''} ${item?.notes || ''}`;
  const tipo = tipoDeEquipo(item?.description);
  if (!tipo) return null;
  const potencia = potenciaDe(texto);
  const ficha = buscarFicha(fichas, item);
  const lf = diametroDePulgadas(ficha?.liquid_pipe), af = diametroDePulgadas(ficha?.suction_pipe);
  let conexiones = lf && af ? { liquido: lf, aspiracion: af } : null, origen = conexiones ? 'ficha' : null;
  if (!conexiones) { conexiones = conexionesRecordadas(item?.reference); if (conexiones) origen = 'recordada'; }
  if (!conexiones) { conexiones = conexionesDeTexto(texto); if (conexiones) origen = 'descripcion'; }
  if (!conexiones) { conexiones = conexionesPorPotencia(tipo, potencia); if (conexiones) origen = 'potencia'; }
  const avisos = [];
  if (/multi\s?split/.test(sinTildes(texto))) avisos.push('Multisplit: hace falta una línea de tubería por cada unidad interior.');
  if (tipo === 'industrial' && /(congel|baja temp|\blt\b|-\s?\d{2}\s?°?c)/.test(sinTildes(texto))) avisos.push('Baja temperatura: la aspiración suele subir una medida.');
  return { tipo, potencia, conexiones, origen, avisos, ficha, maquina: identificarMaquina(item) };
}

// ── Material ───────────────────────────────────────────────────────────────
/** Lo que se propone añadir. Cada elemento: { clave, descripcion, unidad, cantidad, marcado, busca:[regex...] } */
export function planDeMaterial({ liquido, aspiracion, metros = 5, codos = 4, uniones = 2, unidades = 1 }) {
  const n = Math.max(1, Number(unidades) || 1);
  const m = Math.max(0, Number(metros) || 0) * n;
  const l = liquido.pulg, a = aspiracion.pulg;
  const exp = (p) => p.replace(/\//g, '\\/').replace(/"/g, '');
  const dm = (d) => `(?<![\\d/])${exp(d.pulg)}|${String(d.mm).replace('.', '[.,]')}|(?<!\\d)${Math.round(d.mm)}\\s?mm`;
  const busca = (palabras, d) => [...palabras.map((w) => new RegExp(w)), new RegExp(dm(d))];
  const fila = (clave, descripcion, unidad, cantidad, marcado, palabras, d) => ({ clave, descripcion, unidad, cantidad, marcado, busca: busca(palabras, d) });
  return [
    fila('tubo-liq', `Tubo de cobre frigorífico ${l} (línea de líquido)`, 'm', m, true, ['tubo|tuberia', 'cobre'], liquido),
    fila('tubo-asp', `Tubo de cobre frigorífico ${a} (línea de aspiración)`, 'm', m, true, ['tubo|tuberia', 'cobre'], aspiracion),
    fila('aisl-liq', `Aislamiento de tubería ${l}`, 'm', m, true, ['aislam|aislante|coquilla|armaflex'], liquido),
    fila('aisl-asp', `Aislamiento de tubería ${a}`, 'm', m, true, ['aislam|aislante|coquilla|armaflex'], aspiracion),
    fila('codo-liq', `Codo de cobre 90º ${l}`, 'ud', codos * n, true, ['codo'], liquido),
    fila('codo-asp', `Codo de cobre 90º ${a}`, 'ud', codos * n, true, ['codo'], aspiracion),
    fila('union-liq', `Unión / manguito de cobre ${l}`, 'ud', uniones * n, true, ['manguito|union|empalme'], liquido),
    fila('union-asp', `Unión / manguito de cobre ${a}`, 'ud', uniones * n, true, ['manguito|union|empalme'], aspiracion),
    { clave: 'soldadura', descripcion: 'Varilla de soldadura de plata', unidad: 'ud', cantidad: n, marcado: false, busca: [/soldadura|varilla/, /plata/] },
    { clave: 'cinta', descripcion: 'Cinta vinílica y abrazaderas', unidad: 'ud', cantidad: n, marcado: false, busca: [/cinta|abrazadera/] },
  ];
}

/** Busca en una lista de artículos (Mi base de datos) el primero que cumpla todas las condiciones. */
export function buscarMaterial(articulos, busca) {
  for (const a of articulos || []) {
    const t = sinTildes(`${a.description || ''} ${a.reference || ''}`);
    if (busca.every((re) => re.test(t))) return a;
  }
  return null;
}
