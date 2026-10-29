/**
 * equivalenciasGases.js — Conversión entre gases refrigerantes: todos los gases a los que se puede pasar,
 * con qué aceite, qué carga y qué presiones, a partir de una sola fuente de datos.
 *
 * Reúne tres cosas que antes vivían por separado y se contradecían:
 *   1. Las fichas de conversión curadas (`datosSustitucion.js`): tipo de conversión, aceite, carga y avisos.
 *   2. El catálogo (`refrigerantes.js`): GWP, seguridad, estado legal y aceite de cada gas.
 *   3. La física (`saturacion.js`, datos de CoolProp): presiones y capacidad volumétrica de cada gas en las
 *      condiciones de trabajo, y la densidad del líquido, con la que se estima la carga cuando el
 *      fabricante no publica una cifra.
 *
 * Una advertencia que se repite en pantalla: «parecido» no es «autorizado». Que dos gases tengan presiones
 * y capacidad parecidas no significa que el fabricante del compresor admita el cambio.
 */
import { REFRIGERANTES, buscarRefrigerante } from './refrigerantes.js';
import { SUSTITUCIONES, CONDICION_TIPICA, PASOS_CONVERSION } from './datosSustitucion.js';
import { gasPreparado, presionSaturacion, idGasProps, idsConDatos } from './saturacion.js';

export { PASOS_CONVERSION, SUSTITUCIONES };

/* ───────────────────────────── Tipos de conversión ───────────────────────────── */

export const TIPOS = {
  directo: {
    etiqueta: 'Sustitución directa',
    resumen: 'Mismo compresor y, normalmente, mismo aceite. Se cambia el filtro deshidratador y se ajustan la válvula y la carga.',
    color: 'bg-green-100 text-green-800 border-green-300',
    orden: 0,
  },
  conversion: {
    etiqueta: 'Conversión con cambios',
    resumen: 'Hay que cambiar el aceite y/o componentes (válvula, juntas, presostatos), o el gas es inflamable y el equipo debe admitirlo.',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    orden: 1,
  },
  nuevo: {
    etiqueta: 'Solo equipo nuevo',
    resumen: 'Solo en un equipo diseñado para ese gas: cambian las presiones, la inflamabilidad o el ciclo.',
    color: 'bg-sky-100 text-sky-800 border-sky-300',
    orden: 2,
  },
  sinFicha: {
    etiqueta: 'Sin ficha de conversión',
    resumen: 'El catálogo lo cita como sustituto, pero no hay una ficha con aceite y carga. Consulta la guía del fabricante.',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    orden: 3,
  },
};

export const CAMBIO_ACEITE = {
  no: { etiqueta: 'Se mantiene el aceite', color: 'text-green-700' },
  parcial: { etiqueta: 'Depende de la instalación', color: 'text-amber-700' },
  si: { etiqueta: 'Hay que cambiar el aceite', color: 'text-red-700' },
};

export const FUENTES = {
  fabricante: 'Guía del fabricante',
  general: 'Criterio general: confirma con el fabricante',
  catalogo: 'Citado en el catálogo',
};

const SEGURIDAD = {
  A2L: 'levemente inflamable',
  A2: 'inflamable',
  A3: 'muy inflamable',
  B1: 'tóxico',
  B2L: 'tóxico y levemente inflamable',
  B2: 'tóxico e inflamable',
  B3: 'tóxico y muy inflamable',
};

/** ¿Es inflamable según su clasificación ASHRAE 34 (A2L, A2, A3, B2L, B2, B3)? */
export const esInflamable = (clase) => /^[AB][23]/.test(String(clase || ''));

/** Qué avisar de la seguridad de un gas, a partir de su clasificación ASHRAE 34 (`null` si no hace falta). */
export function avisoSeguridad(clase) {
  return SEGURIDAD[clase] ? `${clase}: ${SEGURIDAD[clase]}` : null;
}

/* ───────────────────────────── Física: densidad y capacidad ───────────────────────────── */

const redondear = (n, d = 2) => {
  const f = 10 ** d;
  return Math.round(n * f) / f + 0; // «+ 0» convierte -0 en 0
};

/** Densidad del líquido saturado (kg/m³) a una temperatura, o `null` si el gas no tiene datos a esa temperatura. */
export function densidadLiquido(id, t = 35) {
  const g = gasPreparado(id);
  const p = presionSaturacion(id, t, 'burbuja');
  if (!g || p === null) return null;
  return Math.exp(g.lnRl(Math.log(p)));
}

/**
 * Relación entre las densidades del líquido de dos gases (gas nuevo / gas antiguo). En una instalación que
 * se convierte, el volumen de líquido es el mismo, así que la carga en peso cambia en esa proporción.
 */
export function relacionDensidad(de, a, t = 35) {
  const d1 = densidadLiquido(de, t);
  const d2 = densidadLiquido(a, t);
  return d1 && d2 ? d2 / d1 : null;
}

/** Condiciones de referencia con las que se comparan los gases (temperaturas de ROCÍO, EN 12900). */
export const CONDICIONES = [
  { id: 'clima', nombre: 'Climatización', te: 5, tc: 45 },
  { id: 'media', nombre: 'Refrigeración media', te: -10, tc: 40 },
  { id: 'baja', nombre: 'Congelación', te: -35, tc: 40 },
];

export const condicion = (id) => CONDICIONES.find((c) => c.id === id) || null;
export const condicionTipica = (idGas) => CONDICION_TIPICA[idGas] || 'media';

/**
 * Capacidad volumétrica teórica de un gas: calor que absorbe por cada m³ de vapor que aspira el compresor.
 * Es el número que decide si un gas rinde igual con el MISMO compresor. Ciclo ideal sin subenfriamiento ni
 * recalentamiento: q = ρ_vapor(Pe) · (h_vapor(Pe) − h_líquido(Pc)).
 *
 * @returns {{pe, pc, compresion, rhoV, dh, qv}|null}  bar absolutos, relación Pc/Pe, kg/m³, kJ/kg, kJ/m³
 */
export function capacidadVolumetrica(id, tEvap, tCond) {
  const g = gasPreparado(id);
  const pe = presionSaturacion(id, tEvap, 'rocio');
  const pc = presionSaturacion(id, tCond, 'rocio');
  if (!g || pe === null || pc === null || pc <= pe) return null;
  const se = Math.log(pe);
  const sc = Math.log(pc);
  const rhoV = Math.exp(g.lnRv(se));
  const dh = g.hv(se) - g.hl(sc);
  return { pe, pc, compresion: pc / pe, rhoV, dh, qv: rhoV * dh };
}

/**
 * Comparación física entre dos gases en las tres condiciones de referencia.
 * Cada fila: `{condicion, de, a, razon:{pe, pc, qv, compresion}}`; `razon` es `null` si falta algún dato.
 * Devuelve `null` si ninguno de los dos gases tiene datos.
 */
export function comparacionFisica(de, a) {
  if (!gasPreparado(de) && !gasPreparado(a)) return null;
  return CONDICIONES.map((c) => {
    const A = capacidadVolumetrica(de, c.te, c.tc);
    const B = capacidadVolumetrica(a, c.te, c.tc);
    return {
      condicion: c,
      de: A,
      a: B,
      razon: A && B ? { pe: B.pe / A.pe, pc: B.pc / A.pc, qv: B.qv / A.qv, compresion: B.compresion / A.compresion } : null,
    };
  });
}

/* ───────────────────────────── Fichas de conversión ───────────────────────────── */

const RANGO_TIPO = (t) => TIPOS[t]?.orden ?? 9;

function resumenGas(id) {
  const g = buscarRefrigerante(id);
  if (!g) return null;
  return {
    id: g.id,
    nombre: g.nombre,
    familia: g.familia,
    gwp: g.gwp,
    seguridad: g.seguridad,
    estado: g.estado,
    aceite: g.aceite,
    uso: g.uso || '',
    nota: g.nota || '',
  };
}

function enriquecer(ficha) {
  const origen = resumenGas(ficha.de);
  const destino = resumenGas(ficha.a);
  const reduccionGWP =
    origen?.gwp > 0 && destino?.gwp != null ? redondear(((origen.gwp - destino.gwp) / origen.gwp) * 100, 0) : null;
  return {
    ...ficha,
    origen,
    destino,
    reduccionGWP,
    prohibido: destino?.estado === 'prohibido',
    avisoSeguridad: avisoSeguridad(destino?.seguridad),
    ratioDensidad: relacionDensidad(ficha.de, ficha.a),
    tieneFisica: !!(gasPreparado(ficha.de) && gasPreparado(ficha.a)),
  };
}

/**
 * Todos los gases a los que se puede pasar desde `id`: las fichas curadas y, además, los que el catálogo cita
 * como sustitutos y no tienen ficha (tipo «sinFicha»), de modo que no se pierde ninguno. Orden: primero los
 * que se pueden usar, y dentro de ellos de la conversión más sencilla a la más compleja; los prohibidos al final.
 */
export function sustitucionesDe(id) {
  const cat = buscarRefrigerante(id);
  if (!cat) return [];
  const curadas = SUSTITUCIONES.filter((s) => s.de === id);
  const citados = (cat.sustitutos || [])
    .filter((x) => buscarRefrigerante(x) && !curadas.some((c) => c.a === x) && x !== id)
    .map((x) => ({
      de: id,
      a: x,
      tipo: 'sinFicha',
      aceite: buscarRefrigerante(x).aceite || '—',
      cambioAceite: null,
      carga: null,
      fuente: 'catalogo',
      nota: 'Sin ficha de conversión. Consulta la guía de reconversión del fabricante del gas y del compresor antes de cambiar.',
    }));
  return [...curadas, ...citados]
    .map((f, i) => ({ ...enriquecer(f), indice: i }))
    .sort((x, y) => Number(x.prohibido) - Number(y.prohibido) || RANGO_TIPO(x.tipo) - RANGO_TIPO(y.tipo) || x.indice - y.indice);
}

/** La ficha de una conversión concreta, o `null` si no existe. */
export function buscarSustitucion(de, a) {
  return sustitucionesDe(de).find((s) => s.a === a) || null;
}

/** Gases desde los que se puede convertir (los que tienen al menos un sustituto), en el orden del catálogo. */
export function origenes() {
  return REFRIGERANTES.filter((r) => r.id !== 'otro' && sustitucionesDe(r.id).length > 0).map((r) => resumenGas(r.id));
}

/* ───────────────────────────── Carga al convertir ───────────────────────────── */

/** Amplitud de la banda de la carga estimada por densidades (validada contra las guías de los fabricantes). */
export const TOLERANCIA_ESTIMADA = 0.04;
/** Fracción de la carga original con la que se empieza si la guía no dice otra cosa. */
export const CARGA_INICIAL_ESTANDAR = 0.85;

/**
 * Cuánto gas hay que cargar al convertir de `de` a `a` una instalación que llevaba `kg` kilos.
 *
 * Si hay guía del fabricante se usa su rango; si no, se estima con la relación de densidades del líquido a 35 °C
 * (marcado como «estimada»). En una conversión a equipo nuevo no hay carga que convertir.
 *
 * @returns {null|{ok, tipo, origen, factor, kg, ratioDensidad, pesoOriginal}}
 */
export function cargaConvertida(de, a, kg) {
  const ficha = buscarSustitucion(de, a);
  const peso = Number(kg);
  if (!ficha || !Number.isFinite(peso) || peso <= 0) return null;
  const base = { ok: true, de, a, tipo: ficha.tipo, pesoOriginal: peso, ratioDensidad: ficha.ratioDensidad };

  if (ficha.tipo === 'nuevo') return { ...base, sinConversion: true, origen: null, factor: null, kg: null };

  let factor = null;
  let origen = null;
  if (ficha.carga) {
    const c = ficha.carga;
    factor = {
      inicial: c.inicial ?? Math.min(CARGA_INICIAL_ESTANDAR, c.desde),
      desde: c.desde,
      hasta: c.hasta,
      max: c.max ?? null,
    };
    origen = 'fabricante';
  } else if (ficha.ratioDensidad) {
    factor = {
      inicial: CARGA_INICIAL_ESTANDAR,
      desde: ficha.ratioDensidad - TOLERANCIA_ESTIMADA,
      hasta: ficha.ratioDensidad + TOLERANCIA_ESTIMADA,
      max: null,
    };
    origen = 'estimada';
  } else {
    factor = { inicial: CARGA_INICIAL_ESTANDAR, desde: null, hasta: null, max: null };
    origen = 'sinDato';
  }
  const aKg = (f) => (f == null ? null : redondear(peso * f, 2));
  return {
    ...base,
    origen,
    factor,
    kg: { inicial: aKg(factor.inicial), desde: aKg(factor.desde), hasta: aKg(factor.hasta), max: aKg(factor.max) },
  };
}

/* ───────────────────────────── Gases de presiones parecidas ───────────────────────────── */

/** Intervalos de razón (gas nuevo / gas antiguo) que se consideran «parecidos». */
export const PARECIDO = { presion: [0.8, 1.25], capacidad: [0.75, 1.3] };

/**
 * Otros gases con tabla de propiedades cuyas presiones y capacidad volumétrica se parecen a las de `de` en la
 * condición dada. Es solo una comparación física: no es una autorización de conversión.
 *
 * @param {string} de
 * @param {string} [condId]   'clima' | 'media' | 'baja' (por defecto, la típica del gas)
 * @returns {Array<{id, gas, razon, puntuacion, citado}>}  de más a menos parecido
 */
export function gasesParecidos(de, condId, { maximo = 10 } = {}) {
  const c = condicion(condId || condicionTipica(de));
  const base = c && capacidadVolumetrica(de, c.te, c.tc);
  if (!base) return [];
  const origenId = idGasProps(de) || de;
  const citados = new Set(sustitucionesDe(de).map((s) => s.a));
  const salida = [];
  for (const id of idsConDatos()) {
    if (id === origenId) continue;
    const otro = capacidadVolumetrica(id, c.te, c.tc);
    if (!otro) continue;
    const razon = { pe: otro.pe / base.pe, pc: otro.pc / base.pc, qv: otro.qv / base.qv };
    const dentro = (r, [lo, hi]) => r >= lo && r <= hi;
    if (!dentro(razon.pe, PARECIDO.presion) || !dentro(razon.pc, PARECIDO.presion) || !dentro(razon.qv, PARECIDO.capacidad)) continue;
    const puntuacion = Math.max(Math.abs(Math.log(razon.pe)), Math.abs(Math.log(razon.pc)), Math.abs(Math.log(razon.qv)));
    salida.push({ id, gas: resumenGas(id), razon, puntuacion, citado: citados.has(id) });
  }
  return salida.sort((a, b) => a.puntuacion - b.puntuacion).slice(0, maximo);
}
