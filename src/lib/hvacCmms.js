/**
 * HVAC CMMS — motor técnico de la ficha de activos de climatización.
 *
 * Cuatro bloques, todos funciones puras (sin pantalla, sin base de datos), para que se puedan
 * probar con `npm run test:hvac` y reutilizar igual en la web, en el móvil y en las funciones
 * del servidor:
 *
 *   1. Gases fluorados ............ toneladas de CO₂ equivalente, anexo I / anexo II y
 *                                   periodicidad del control de fugas (Reglamento (UE) 2024/573,
 *                                   artículos 5 y 6).
 *   2. Cálculo de carga térmica ... capacidad requerida (kW, Btu/h, TR) a partir del área y de
 *                                   las cargas sensible y latente, y comprobación de si el equipo
 *                                   asignado cubre la demanda real.
 *   3. Diagnóstico de campo ....... recalentamiento, subenfriamiento, saltos de aire y una matriz
 *                                   de reglas que propone causas probables con lo que hay que
 *                                   comprobar.
 *   4. Plan preventivo ............ tareas y alertas (vencida / próxima / en plazo) a partir de la
 *                                   ficha del equipo y del último control.
 *
 * Las propiedades de saturación NO se teclean aquí: salen de `saturacion.js` (CoolProp), igual que
 * en el resto del programa. Convenios de mezclas zeótropas (EN 12900):
 *   · recalentamiento → temperatura de ROCÍO a la presión de aspiración
 *   · subenfriamiento → temperatura de BURBUJA a la presión de descarga
 *
 * Unidades internas: °C, K para diferencias, bar, kg, kW. Las presiones que entran se aceptan en
 * bar o psi y en manométrica (lo que marca el manómetro) o absoluta.
 */
import { ATM, PSI_POR_BAR, temperaturaSaturacion, tieneDatos } from './saturacion.js';
import { buscarRefrigerante } from './refrigerantes.js';

/* ───────────────────────────── Utilidades ───────────────────────────── */

/** Número tolerante: acepta coma decimal; vacío o basura → null (nunca 0 por error). */
export function num(v) {
  if (v === null || v === undefined) return null;
  const texto = String(v).replace(',', '.').trim();
  if (texto === '') return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

export const redondear = (n, dec = 2) => (n == null ? null : Math.round(n * 10 ** dec) / 10 ** dec);

export const W_POR_BTUH = 0.29307107;      // 1 Btu/h = 0,293 W
export const KW_POR_TR = 3.51685284;       // 1 tonelada de refrigeración = 12 000 Btu/h
export const kwABtuh = (kw) => (kw == null ? null : (kw * 1000) / W_POR_BTUH);
export const btuhAKw = (btuh) => (btuh == null ? null : (btuh * W_POR_BTUH) / 1000);
export const kwATr = (kw) => (kw == null ? null : kw / KW_POR_TR);

/**
 * Presión introducida → bar ABSOLUTOS.
 * @param {number|string} valor
 * @param {'bar'|'psi'} unidad
 * @param {'manometrica'|'absoluta'} referencia
 */
export function aBarAbsoluto(valor, unidad = 'bar', referencia = 'manometrica') {
  const v = num(valor);
  if (v == null) return null;
  const bar = unidad === 'psi' ? v / PSI_POR_BAR : v;
  return referencia === 'absoluta' ? bar : bar + ATM;
}

/* ═════════════════════════ 1. GASES FLUORADOS ═════════════════════════ */

export const TIPOS_ACEITE = ['POE', 'PVE', 'Mineral', 'AB', 'PAG'];

/**
 * Fracción en masa de HFO (anexo II, sección 1 del Reglamento 2024/573) en los gases más
 * habituales. Para las mezclas, la parte HFO se controla por KILOS además de la parte HFC por
 * toneladas de CO₂e, y manda la periodicidad más exigente de las dos.
 * Composiciones nominales ASHRAE 34.
 */
export const FRACCION_HFO = {
  'R-1234yf': 1, 'R-1234ze(E)': 1, 'R-1233zd(E)': 1, 'R-1336mzz(Z)': 1,
  'R-454B': 0.311,   // R-32 68,9 / R-1234yf 31,1
  'R-454A': 0.65,    // R-32 35 / R-1234yf 65
  'R-454C': 0.785,   // R-32 21,5 / R-1234yf 78,5
  'R-455A': 0.755,   // R-744 3 / R-32 21,5 / R-1234yf 75,5
  'R-452B': 0.26,    // R-32 67 / R-125 7 / R-1234yf 26
  'R-513A': 0.56,    // R-1234yf 56 / R-134a 44
  'R-450A': 0.58,    // R-1234ze(E) 58 / R-134a 42
  'R-448A': 0.27,    // R-1234yf 20 + R-1234ze(E) 7
  'R-449A': 0.253,   // R-1234yf 25,3
  'R-449B': 0.253,
  'R-456A': 0.45,    // R-32 6 / R-134a 49 / R-1234ze(E) 45
};

/** Gases que NO son fluorados: fuera del control de fugas del Reglamento 2024/573. */
const NO_FLUORADOS = new Set(['R-290', 'R-600a', 'R-1270', 'R-717', 'R-744']);

/** Tabla del artículo 5, apartado 6: [umbral, meses sin detección, meses con detección]. */
const TRAMOS_ANEXO_I = [[500, 3, 6], [50, 6, 12], [5, 12, 24]];      // t CO₂e
const TRAMOS_ANEXO_II = [[100, 3, 6], [10, 6, 12], [1, 12, 24]];     // kg

function tramo(valor, tramos, conDetector) {
  for (const [umbral, sin, con] of tramos) if (valor >= umbral) return conDetector ? con : sin;
  return null;
}

/**
 * Situación de un equipo frente al Reglamento (UE) 2024/573.
 *
 * @param {object} p
 * @param {string} p.gas                 'R-410A', 'R-454B'…
 * @param {number} p.cargaKg             carga total del circuito
 * @param {number} [p.pcaManual]         PCA a usar si el del catálogo no vale
 * @param {boolean} [p.hermetico]        aparato sellado herméticamente y etiquetado como tal
 * @param {boolean} [p.conDetector]      sistema de detección de fugas instalado
 * @param {boolean} [p.residencial]      instalado en un edificio residencial (exención art. 5)
 * @returns {{aplica:boolean, tco2e:number|null, kgHfo:number|null, pca:number|null,
 *            mesesAnexoI:number|null, mesesAnexoII:number|null, meses:number|null,
 *            deteccionObligatoria:boolean, motivo:string, avisos:string[]}}
 */
export function situacionFGas({ gas, cargaKg, pcaManual = null, hermetico = false, conDetector = false, residencial = false } = {}) {
  const kg = num(cargaKg);
  const ficha = buscarRefrigerante(gas);
  const pca = num(pcaManual) ?? ficha?.gwp ?? null;
  const avisos = [];
  const r = { aplica: false, gas, kg, pca, tco2e: null, kgHfo: null, mesesAnexoI: null, mesesAnexoII: null, meses: null, deteccionObligatoria: false, motivo: '', avisos };

  if (kg == null || kg <= 0) { r.motivo = 'Falta la carga de refrigerante en kg.'; return r; }
  if (NO_FLUORADOS.has(gas)) { r.motivo = `${gas} no es un gas fluorado: no está sujeto al control de fugas del Reglamento (UE) 2024/573 (sí a la normativa de seguridad, p. ej. EN 378).`; return r; }
  if (pca == null) { r.motivo = 'No se conoce el PCA de este gas: introdúcelo a mano desde el anexo del Reglamento.'; return r; }

  const fHfo = FRACCION_HFO[gas] ?? 0;
  const kgHfo = kg * fHfo;
  // La parte HFC de la mezcla se valora en t CO₂e; un HFO puro no entra en el anexo I.
  const tco2e = fHfo >= 1 ? 0 : (kg * pca) / 1000;
  r.tco2e = redondear(tco2e, 2);
  r.kgHfo = fHfo > 0 ? redondear(kgHfo, 2) : null;

  // Exenciones del artículo 5 para aparatos herméticamente sellados.
  let exentoI = tco2e < 5;
  let exentoII = kgHfo < 1;
  if (hermetico) {
    if (tco2e < 10) exentoI = true;
    if (kgHfo < 2) exentoII = true;
    if (residencial && kgHfo < 3) exentoII = true;
  }

  r.mesesAnexoI = exentoI ? null : tramo(tco2e, TRAMOS_ANEXO_I, conDetector);
  r.mesesAnexoII = exentoII ? null : tramo(kgHfo, TRAMOS_ANEXO_II, conDetector);
  const plazos = [r.mesesAnexoI, r.mesesAnexoII].filter((m) => m != null);
  r.meses = plazos.length ? Math.min(...plazos) : null;
  r.aplica = r.meses != null;

  // Artículo 6: detección de fugas obligatoria a partir de 500 t CO₂e o 100 kg de HFO.
  r.deteccionObligatoria = tco2e >= 500 || kgHfo >= 100;
  if (r.deteccionObligatoria && !conDetector) avisos.push('Este equipo debe tener sistema de detección de fugas (art. 6) y no consta instalado.');
  if (ficha?.estado === 'prohibido') avisos.push(`${gas}: gas prohibido para recarga. Planificar sustitución.`);

  if (!r.aplica) r.motivo = 'Por debajo de los umbrales: sin control periódico de fugas obligatorio.';
  else {
    const partes = [];
    if (r.mesesAnexoI) partes.push(`${r.tco2e} t CO₂e → cada ${r.mesesAnexoI} meses`);
    if (r.mesesAnexoII) partes.push(`${r.kgHfo} kg de HFO → cada ${r.mesesAnexoII} meses`);
    r.motivo = `Control de fugas al menos cada ${r.meses} meses (${partes.join('; ')})${conDetector ? ', con detección instalada' : ''}.`;
  }
  return r;
}

/* ═════════════════════════ 2. CÁLCULO DE CARGA TÉRMICA ═════════════════════════ */

/**
 * Capacidad requerida por el local y comprobación del equipo asignado.
 *
 * Las cargas pueden darse en W totales o en W/m² (se multiplican por el área). El factor de
 * seguridad cubre infiltraciones e incertidumbre del cálculo (por defecto 10 %).
 *
 * @param {object} p
 * @param {number} p.areaM2
 * @param {number} [p.cargaSensibleW]      carga sensible total del local
 * @param {number} [p.cargaLatenteW]       carga latente total del local
 * @param {number} [p.densidadSensibleWm2] alternativa a cargaSensibleW
 * @param {number} [p.densidadLatenteWm2]  alternativa a cargaLatenteW
 * @param {number} [p.factorSeguridad]     0,10 = 10 %
 * @param {object} [p.equipo]
 * @param {number} [p.equipo.capacidadTotalKw]    potencia frigorífica nominal
 * @param {number} [p.equipo.capacidadSensibleKw] si el fabricante la da
 * @param {number} [p.equipo.factorCorreccion]    corrección por condiciones reales (temperatura
 *                                                exterior, longitud de línea…), 1 = nominal
 */
export function calcularCargaTermica({
  areaM2, cargaSensibleW, cargaLatenteW, densidadSensibleWm2, densidadLatenteWm2,
  factorSeguridad = 0.1, equipo = null,
} = {}) {
  const area = num(areaM2);
  const errores = [];
  let qs = num(cargaSensibleW);
  let ql = num(cargaLatenteW);
  if (qs == null && num(densidadSensibleWm2) != null && area != null) qs = num(densidadSensibleWm2) * area;
  if (ql == null && num(densidadLatenteWm2) != null && area != null) ql = num(densidadLatenteWm2) * area;
  if (qs == null) errores.push('Falta la carga sensible (W o W/m² con el área).');
  if (ql == null) ql = 0;
  if (errores.length) return { ok: false, errores };

  const fs = num(factorSeguridad) ?? 0;
  const sensibleKw = (qs / 1000) * (1 + fs);
  const latenteKw = (ql / 1000) * (1 + fs);
  const totalKw = sensibleKw + latenteKw;
  const shr = totalKw > 0 ? sensibleKw / totalKw : null;

  const requerido = {
    sensibleKw: redondear(sensibleKw, 2),
    latenteKw: redondear(latenteKw, 2),
    totalKw: redondear(totalKw, 2),
    totalBtuh: Math.round(kwABtuh(totalKw)),
    totalTR: redondear(kwATr(totalKw), 2),
    shr: redondear(shr, 2),
    ratioWm2: area ? Math.round((totalKw * 1000) / area) : null,
  };

  const res = { ok: true, errores: [], areaM2: area, factorSeguridad: fs, requerido, verificacion: null };
  if (!equipo || num(equipo.capacidadTotalKw) == null) return res;

  const corr = num(equipo.factorCorreccion) ?? 1;
  const capTotal = num(equipo.capacidadTotalKw) * corr;
  // Sin dato de sensible, un equipo de confort de expansión directa ronda un SHR de 0,75.
  const shrEquipo = num(equipo.capacidadSensibleKw) != null ? num(equipo.capacidadSensibleKw) / num(equipo.capacidadTotalKw) : 0.75;
  const capSensible = capTotal * shrEquipo;
  const capLatente = capTotal - capSensible;

  const cobTotal = capTotal / totalKw;
  const cobSensible = sensibleKw > 0 ? capSensible / sensibleKw : null;
  const cobLatente = latenteKw > 0 ? capLatente / latenteKw : null;

  const avisos = [];
  let veredicto;
  if (cobTotal < 0.95) veredicto = 'insuficiente';
  else if (cobTotal < 1.0) veredicto = 'justo';
  else if (cobTotal <= 1.3) veredicto = 'adecuado';
  else veredicto = 'sobredimensionado';

  if (cobSensible != null && cobSensible < 1) avisos.push(`La capacidad sensible (${redondear(capSensible, 2)} kW) no cubre la carga sensible (${redondear(sensibleKw, 2)} kW): el local no llegará a la consigna en los días de máxima carga.`);
  if (cobLatente != null && cobLatente < 1) avisos.push(`La capacidad latente (${redondear(capLatente, 2)} kW) no cubre la latente (${redondear(latenteKw, 2)} kW): humedad relativa alta en el local.`);
  if (veredicto === 'sobredimensionado') avisos.push('Equipo sobredimensionado: ciclos cortos, peor deshumectación y más desgaste del compresor. Valorar un equipo inverter o de menor potencia.');
  if (cobTotal >= 1 && cobSensible != null && cobSensible < 1) veredicto = 'insuficiente_sensible';

  res.verificacion = {
    capacidadTotalKw: redondear(capTotal, 2),
    capacidadSensibleKw: redondear(capSensible, 2),
    capacidadLatenteKw: redondear(capLatente, 2),
    coberturaTotal: redondear(cobTotal, 2),
    coberturaSensible: redondear(cobSensible, 2),
    coberturaLatente: redondear(cobLatente, 2),
    veredicto,
    cubreDemanda: cobTotal >= 1 && (cobSensible == null || cobSensible >= 1),
    avisos,
  };
  return res;
}

/**
 * Capacidad sensible real entregada por el aire: Q = ρ·cp·V·ΔT.
 * Útil para contrastar en campo la capacidad nominal con la que da de verdad la máquina.
 * @param {number} caudalM3h  caudal de aire medido en la batería
 * @param {number} dT         salto térmico del aire (K)
 */
export function capacidadSensibleAire(caudalM3h, dT) {
  const v = num(caudalM3h), t = num(dT);
  if (v == null || t == null) return null;
  return redondear((1.2 * 1.006 * (v / 3600) * t), 2); // kW (ρ = 1,2 kg/m³, cp = 1,006 kJ/kg·K)
}

/* ═════════════════════════ 3. DIAGNÓSTICO DE CAMPO ═════════════════════════ */

/** Rangos de referencia orientativos por tipo de expansión (equipos de confort, modo frío). */
export const RANGOS_DIAGNOSTICO = {
  recalentamiento: { valvula: { min: 4, max: 8 }, capilar: { min: 5, max: 12 }, electronica: { min: 3, max: 7 } },
  subenfriamiento: { valvula: { min: 4, max: 8 }, capilar: { min: 2, max: 8 }, electronica: { min: 3, max: 8 } },
  dtEvaporador: { min: 8, max: 14 },        // aire entrada − salida
  dtCondensador: { min: 6, max: 14 },       // aire salida − entrada
  aproximacionCondensador: { min: 8, max: 18 }, // T condensación − aire entrada condensador
  tdEvaporador: { min: 12, max: 22 },       // aire entrada evaporador − T evaporación
  descarga: { aviso: 105, alarma: 120 },    // °C en la línea de descarga
};

/** Campos obligatorios del formulario de avería: sin ellos no se diagnostica. */
export const CAMPOS_OBLIGATORIOS = [
  ['presionSuccion', 'Presión de succión'],
  ['presionDescarga', 'Presión de descarga'],
  ['tLineaAspiracion', 'Temperatura de la línea de aspiración'],
  ['tLineaLiquido', 'Temperatura de la línea de líquido'],
  ['tAireEvapEntrada', 'T bulbo seco aire entrada evaporador'],
  ['tAireEvapSalida', 'T bulbo seco aire salida evaporador'],
  ['tAireCondEntrada', 'T bulbo seco aire entrada condensador'],
  ['tAireCondSalida', 'T bulbo seco aire salida condensador'],
];

/** Valida el formulario de campo. Devuelve los errores que impiden guardar. */
export function validarMediciones(m = {}) {
  const errores = [];
  if (!m.gas) errores.push('Falta el refrigerante del equipo.');
  else if (!tieneDatos(m.gas)) errores.push(`No hay tablas de saturación para ${m.gas}.`);
  for (const [campo, etiqueta] of CAMPOS_OBLIGATORIOS) if (num(m[campo]) == null) errores.push(`Falta: ${etiqueta}.`);
  if (!errores.length) {
    const ps = aBarAbsoluto(m.presionSuccion, m.unidadPresion, m.referenciaPresion);
    const pd = aBarAbsoluto(m.presionDescarga, m.unidadPresion, m.referenciaPresion);
    if (ps != null && pd != null && pd <= ps) errores.push('La presión de descarga debe ser mayor que la de succión: revisa los latiguillos.');
    if (ps != null && ps <= 0) errores.push('Presión de succión imposible (por debajo del vacío absoluto).');
  }
  return errores;
}

function nivel(valor, rango) {
  if (valor == null || !rango) return null;
  if (valor < rango.min) return 'bajo';
  if (valor > rango.max) return 'alto';
  return 'normal';
}

/**
 * Cálculos termodinámicos a partir de las mediciones del técnico.
 *
 * @param {object} m
 * @param {string} m.gas
 * @param {'bar'|'psi'} [m.unidadPresion]
 * @param {'manometrica'|'absoluta'} [m.referenciaPresion]
 * @param {'valvula'|'capilar'|'electronica'} [m.expansion]
 * @param {number} m.presionSuccion, m.presionDescarga
 * @param {number} m.tLineaAspiracion  T del tubo de aspiración (a la salida del evaporador o
 *                                     antes del compresor, según dónde se mida)
 * @param {number} m.tLineaLiquido     T del tubo de líquido a la salida del condensador
 * @param {number} m.tAireEvapEntrada, m.tAireEvapSalida, m.tAireCondEntrada, m.tAireCondSalida
 * @param {number} [m.tDescarga]       T de la línea de descarga del compresor
 * @param {number} [m.caudalEvapM3h]   caudal de aire en el evaporador, si se ha medido
 */
export function calcularCiclo(m = {}) {
  const ps = aBarAbsoluto(m.presionSuccion, m.unidadPresion, m.referenciaPresion);
  const pd = aBarAbsoluto(m.presionDescarga, m.unidadPresion, m.referenciaPresion);

  const tEvap = ps != null ? temperaturaSaturacion(m.gas, ps, 'rocio') : null;
  const tEvapBurbuja = ps != null ? temperaturaSaturacion(m.gas, ps, 'burbuja') : null;
  const tCond = pd != null ? temperaturaSaturacion(m.gas, pd, 'rocio') : null;
  const tCondBurbuja = pd != null ? temperaturaSaturacion(m.gas, pd, 'burbuja') : null;

  const tAsp = num(m.tLineaAspiracion), tLiq = num(m.tLineaLiquido);
  const eIn = num(m.tAireEvapEntrada), eOut = num(m.tAireEvapSalida);
  const cIn = num(m.tAireCondEntrada), cOut = num(m.tAireCondSalida);

  const recalentamiento = tAsp != null && tEvap != null ? tAsp - tEvap : null;
  const subenfriamiento = tLiq != null && tCondBurbuja != null ? tCondBurbuja - tLiq : null;
  const dtEvaporador = eIn != null && eOut != null ? eIn - eOut : null;
  const dtCondensador = cIn != null && cOut != null ? cOut - cIn : null;
  const aproximacionCondensador = tCond != null && cIn != null ? tCond - cIn : null;
  const tdEvaporador = eIn != null && tEvap != null ? eIn - tEvap : null;
  const relacionCompresion = ps && pd ? pd / ps : null;

  return {
    presionSuccionAbs: redondear(ps, 3),
    presionDescargaAbs: redondear(pd, 3),
    presionSuccionPsig: ps != null ? redondear((ps - ATM) * PSI_POR_BAR, 1) : null,
    presionDescargaPsig: pd != null ? redondear((pd - ATM) * PSI_POR_BAR, 1) : null,
    tEvaporacion: redondear(tEvap, 1),
    tEvaporacionBurbuja: redondear(tEvapBurbuja, 1),
    tCondensacion: redondear(tCond, 1),
    tCondensacionBurbuja: redondear(tCondBurbuja, 1),
    deslizamientoEvap: tEvap != null && tEvapBurbuja != null ? redondear(tEvap - tEvapBurbuja, 1) : null,
    recalentamiento: redondear(recalentamiento, 1),
    subenfriamiento: redondear(subenfriamiento, 1),
    dtEvaporador: redondear(dtEvaporador, 1),
    dtCondensador: redondear(dtCondensador, 1),
    aproximacionCondensador: redondear(aproximacionCondensador, 1),
    tdEvaporador: redondear(tdEvaporador, 1),
    relacionCompresion: redondear(relacionCompresion, 2),
    tDescarga: num(m.tDescarga),
    capacidadSensibleEvapKw: capacidadSensibleAire(m.caudalEvapM3h, dtEvaporador),
  };
}

/**
 * Diagnóstico completo: valida, calcula y aplica la matriz de reglas.
 *
 * Cada hipótesis trae un código estable (para estadísticas de averías), un título, una
 * confianza 0–1 según cuántos síntomas encajan y la lista de comprobaciones a hacer en campo.
 *
 * @param {object} m  mismas mediciones que calcularCiclo
 * @param {object} [activo] ficha del equipo: presiones nominales de trabajo para comparar
 * @param {number} [activo.presionNominalBaja]  bar manométricos
 * @param {number} [activo.presionNominalAlta]  bar manométricos
 */
export function diagnosticar(m = {}, activo = null) {
  const errores = validarMediciones(m);
  if (errores.length) return { ok: false, errores, calculo: null, estados: {}, hipotesis: [], avisos: [] };

  const c = calcularCiclo(m);
  const exp = ['valvula', 'capilar', 'electronica'].includes(m.expansion) ? m.expansion : 'valvula';
  const R = RANGOS_DIAGNOSTICO;
  const estados = {
    recalentamiento: nivel(c.recalentamiento, R.recalentamiento[exp]),
    subenfriamiento: nivel(c.subenfriamiento, R.subenfriamiento[exp]),
    dtEvaporador: nivel(c.dtEvaporador, R.dtEvaporador),
    dtCondensador: nivel(c.dtCondensador, R.dtCondensador),
    aproximacionCondensador: nivel(c.aproximacionCondensador, R.aproximacionCondensador),
    tdEvaporador: nivel(c.tdEvaporador, R.tdEvaporador),
  };

  // Presión de evaporación respecto a lo esperado: TD del evaporador alto = evaporando bajo.
  const succion = estados.tdEvaporador === 'alto' ? 'baja' : estados.tdEvaporador === 'bajo' ? 'alta' : 'normal';
  const descarga = estados.aproximacionCondensador === 'alto' ? 'alta' : estados.aproximacionCondensador === 'bajo' ? 'baja' : 'normal';

  const avisos = [];
  if (activo) {
    const pbN = num(activo.presionNominalBaja), paN = num(activo.presionNominalAlta);
    const pbM = c.presionSuccionAbs - ATM, paM = c.presionDescargaAbs - ATM;
    if (pbN) { const d = (pbM - pbN) / pbN; if (Math.abs(d) > 0.15) avisos.push(`Succión ${redondear(pbM, 2)} bar frente a ${pbN} bar nominales (${d > 0 ? '+' : ''}${Math.round(d * 100)} %).`); }
    if (paN) { const d = (paM - paN) / paN; if (Math.abs(d) > 0.15) avisos.push(`Descarga ${redondear(paM, 2)} bar frente a ${paN} bar nominales (${d > 0 ? '+' : ''}${Math.round(d * 100)} %).`); }
  }
  if (c.tDescarga != null) {
    if (c.tDescarga >= R.descarga.alarma) avisos.push(`Temperatura de descarga ${c.tDescarga} °C: riesgo de carbonizar el aceite y dañar las válvulas del compresor. Parar y buscar la causa.`);
    else if (c.tDescarga >= R.descarga.aviso) avisos.push(`Temperatura de descarga alta (${c.tDescarga} °C).`);
  }
  if (c.relacionCompresion != null && c.relacionCompresion > 8) avisos.push(`Relación de compresión ${c.relacionCompresion}: muy alta para un equipo de climatización.`);
  if (c.deslizamientoEvap != null && c.deslizamientoEvap > 1) avisos.push(`${m.gas} tiene ${c.deslizamientoEvap} K de deslizamiento: el recalentamiento se ha calculado con la temperatura de rocío y el subenfriamiento con la de burbuja.`);

  const sh = estados.recalentamiento, sc = estados.subenfriamiento;
  const reglas = [
    { codigo: 'FALTA_CARGA', titulo: 'Falta de refrigerante (posible fuga)',
      sintomas: [sh === 'alto', sc === 'bajo', succion === 'baja', estados.dtEvaporador === 'bajo'], minimo: 2, clave: [0, 1],
      comprobar: ['Buscar la fuga con detector electrónico o espuma (uniones abocardadas, válvulas de servicio, baterías).', 'Reparar antes de recargar; prueba de estanqueidad con nitrógeno y vacío.', 'Anotar la carga añadida en el registro de gases fluorados del equipo.'] },
    { codigo: 'RESTRICCION_LIQUIDO', titulo: 'Restricción en la línea de líquido o en la expansión',
      sintomas: [sh === 'alto', sc === 'alto', succion === 'baja'], minimo: 3, clave: [0, 1],
      comprobar: ['Medir la caída de temperatura a través del filtro deshidratador (> 2 K = obstruido).', 'Comprobar la válvula de expansión: bulbo, ecualizador externo, filtro de entrada; capilar estrangulado.', 'Válvula de servicio de líquido completamente abierta.'] },
    { codigo: 'EXCESO_CARGA', titulo: 'Exceso de refrigerante',
      sintomas: [sh === 'bajo', sc === 'alto', descarga === 'alta', succion === 'alta'], minimo: 3, clave: [1, 2],
      comprobar: ['Recuperar refrigerante hasta llevar el subenfriamiento al valor del fabricante.', 'Descartar antes la batería del condensador sucia (daría también presión alta).'] },
    { codigo: 'CONDENSADOR_SUCIO', titulo: 'Condensación deficiente (batería sucia o ventilador)',
      sintomas: [descarga === 'alta', sc !== 'alto', estados.dtCondensador !== 'bajo'], minimo: 3, clave: [0],
      comprobar: ['Limpiar la batería del condensador.', 'Comprobar giro, velocidad y condensador del ventilador de la unidad exterior.', 'Revisar recirculación de aire caliente y obstáculos en la descarga.'] },
    { codigo: 'NO_CONDENSABLES', titulo: 'Gases no condensables en el circuito',
      sintomas: [descarga === 'alta', sc === 'alto', sh !== 'bajo', estados.dtCondensador === 'normal'], minimo: 4, clave: [0, 1, 2],
      comprobar: ['Con el equipo parado y estabilizado, comparar la presión con la de saturación a temperatura ambiente: si es mayor, hay no condensables.', 'Recuperar, hacer vacío por debajo de 500 micras y cargar por peso.'] },
    { codigo: 'BAJO_CAUDAL_EVAP', titulo: 'Poco caudal de aire en el evaporador',
      sintomas: [sh === 'bajo', succion === 'baja', estados.dtEvaporador === 'alto'], minimo: 3, clave: [1, 2],
      comprobar: ['Filtros de aire limpios.', 'Batería del evaporador limpia, sin hielo.', 'Velocidad del ventilador interior y estado de la turbina.'] },
    { codigo: 'EXPANSION_ABIERTA', titulo: 'Expansión sobrealimentando (válvula muy abierta o bulbo suelto)',
      sintomas: [sh === 'bajo', succion === 'alta', sc !== 'alto'], minimo: 3, clave: [0, 1],
      comprobar: ['Bulbo de la válvula termostática bien fijado y aislado a la salida del evaporador.', 'Ajuste del recalentamiento de la válvula; en electrónicas, sonda y parámetros.', 'Riesgo de retorno de líquido al compresor.'] },
    { codigo: 'COMPRESOR_INEFICIENTE', titulo: 'Compresor con poco rendimiento (válvulas o 4 vías con paso)',
      sintomas: [succion === 'alta', descarga === 'baja', c.relacionCompresion != null && c.relacionCompresion < 2.2, estados.dtEvaporador === 'bajo'], minimo: 3, clave: [0, 1],
      comprobar: ['Medir el consumo del compresor frente a la placa (bajo = no comprime).', 'Comprobar si la válvula de 4 vías tiene paso (temperatura en el tubo de aspiración común).', 'Prueba de bombeo en vacío, si procede.'] },
  ];

  const hipotesis = reglas
    .map((r) => {
      const cumple = r.sintomas.filter(Boolean).length;
      const claves = r.clave.every((i) => r.sintomas[i]);
      return { codigo: r.codigo, titulo: r.titulo, confianza: redondear(cumple / r.sintomas.length, 2), activa: claves && cumple >= r.minimo, comprobar: r.comprobar };
    })
    .filter((h) => h.activa)
    .sort((a, b) => b.confianza - a.confianza)
    .map(({ activa, ...h }) => h);

  const todoNormal = Object.values(estados).every((e) => e === 'normal' || e == null);
  const veredicto = hipotesis.length ? hipotesis[0].codigo : todoNormal ? 'FUNCIONAMIENTO_CORRECTO' : 'SIN_PATRON_CLARO';

  return { ok: true, errores: [], calculo: c, estados, presiones: { succion, descarga }, hipotesis, avisos, veredicto, expansion: exp };
}

/* ═════════════════════════ 4. PLAN PREVENTIVO Y ALERTAS ═════════════════════════ */

const DIA = 86400000;

/** Suma meses a una fecha ISO (AAAA-MM-DD), recortando al último día del mes si hace falta. */
export function sumarMeses(fechaIso, meses) {
  if (!fechaIso || meses == null) return null;
  const [a, m, d] = String(fechaIso).slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return null;
  const objetivo = new Date(Date.UTC(a, m - 1 + meses, 1));
  const ultimo = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(d, ultimo));
  return objetivo.toISOString().slice(0, 10);
}

/** Estado de un vencimiento: 'vencida' | 'proxima' | 'en_plazo'. */
export function estadoVencimiento(fechaIso, hoy = new Date(), avisoDias = 30) {
  if (!fechaIso) return { estado: 'sin_fecha', dias: null };
  const f = Date.parse(String(fechaIso).slice(0, 10) + 'T00:00:00Z');
  const h = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dias = Math.round((f - h) / DIA);
  return { estado: dias < 0 ? 'vencida' : dias <= avisoDias ? 'proxima' : 'en_plazo', dias };
}

/**
 * Tareas preventivas de un activo. El control de fugas es NORMATIVO (art. 5 del Reglamento
 * 2024/573); el resto son tareas de buena práctica con periodicidad editable en la ficha
 * (`intervaloPreventivoMeses`) para ajustarlas al manual del fabricante y al programa de
 * mantenimiento RITE de la empresa mantenedora.
 *
 * @param {object} a  activo (campos de ClientMachine ampliados, ver base44/entities)
 * @param {Date} [hoy]
 */
export function planPreventivo(a = {}, hoy = new Date()) {
  const fgas = situacionFGas({
    gas: a.refrigerant_type, cargaKg: a.refrigerant_charge_kg, pcaManual: a.gwp_override,
    hermetico: a.hermetically_sealed, conDetector: a.leak_detection_system, residencial: a.residential,
  });
  const tareas = [];
  const base = a.installation_date || null;

  if (fgas.aplica) {
    const ultima = a.last_leak_check_date || null;
    const proxima = sumarMeses(ultima || base, fgas.meses);
    tareas.push({
      codigo: 'CONTROL_FUGAS', normativa: true, titulo: 'Control de fugas (Reglamento UE 2024/573, art. 5)',
      periodicidadMeses: fgas.meses, ultima, proxima, ...estadoVencimiento(proxima, hoy, 30),
      detalle: fgas.motivo,
    });
  }
  if (fgas.deteccionObligatoria) {
    const ultima = a.last_detector_check_date || null;
    const proxima = sumarMeses(ultima || base, 12);
    tareas.push({
      codigo: 'REVISION_DETECTOR', normativa: true, titulo: 'Revisión del sistema de detección de fugas (art. 6)',
      periodicidadMeses: 12, ultima, proxima, ...estadoVencimiento(proxima, hoy, 30),
      detalle: 'El sistema de detección se comprueba al menos una vez cada 12 meses.',
    });
  }

  const meses = num(a.maintenance_interval_months) || 6;
  const ultimaPrev = a.last_maintenance_date || null;
  const proxPrev = a.next_maintenance_date || sumarMeses(ultimaPrev || base, meses);
  tareas.push({
    codigo: 'PREVENTIVO_GENERAL', normativa: false,
    titulo: 'Mantenimiento preventivo (filtros, baterías, drenajes, eléctrico, mediciones)',
    periodicidadMeses: meses, ultima: ultimaPrev, proxima: proxPrev, ...estadoVencimiento(proxPrev, hoy, 15),
    detalle: 'Limpieza de filtros y baterías, bandeja y desagüe, apriete de bornas, consumos, presiones, recalentamiento y subenfriamiento.',
  });

  const orden = { vencida: 0, proxima: 1, sin_fecha: 2, en_plazo: 3 };
  tareas.sort((x, y) => orden[x.estado] - orden[y.estado]);
  return { fgas, tareas };
}

/** Alertas de toda la cartera de equipos, ordenadas por urgencia. */
export function alertasCartera(activos = [], hoy = new Date()) {
  const alertas = [];
  for (const a of activos) {
    const { tareas, fgas } = planPreventivo(a, hoy);
    for (const t of tareas) {
      if (t.estado === 'en_plazo') continue;
      alertas.push({ activoId: a.id, activo: a.name, cliente: a.contact_name, ...t });
    }
    for (const aviso of fgas.avisos) alertas.push({ activoId: a.id, activo: a.name, cliente: a.contact_name, codigo: 'AVISO_FGAS', normativa: true, titulo: aviso, estado: 'vencida', dias: null });
  }
  return alertas.sort((x, y) => (x.dias ?? -9999) - (y.dias ?? -9999));
}
