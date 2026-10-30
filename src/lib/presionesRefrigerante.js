/**
 * presionesRefrigerante.js — Presiones de trabajo y cálculo de carga de gas.
 *
 * ─── POR QUÉ ESTO NO ES UNA TABLA DE UN NÚMERO POR GAS ───────────────────────
 *
 * Circulan por ahí infografías con "R-410A: aspiración 120-130 psi, reposo
 * 225-230 psi". Ese número no está mal, está INCOMPLETO, y así engaña:
 *
 *   · La presión EN REPOSO es la presión de saturación del gas a la
 *     temperatura que haya. Los 225 psi del R-410A son a 25 °C. En agosto a
 *     40 °C, la misma máquina, con la carga perfecta, marca 336 psi. Si vas
 *     con el número de la infografía, "sobra gas" y no sobra nada.
 *
 *   · La presión de ASPIRACIÓN depende de a qué temperatura esté evaporando,
 *     que no es lo mismo en un split de oficina (unos 7 °C) que en una cámara
 *     de congelado (unos -28 °C).
 *
 * Así que aquí va lo que de verdad se usa: la tabla presión–temperatura de
 * cada gas, y las temperaturas de trabajo típicas según lo que sea la
 * instalación. Con esas dos cosas sacas la presión que te toca a ti, en tu
 * máquina y con el ambiente que tengas hoy.
 *
 * ─── DE DÓNDE SALEN LOS NÚMEROS ──────────────────────────────────────────────
 *
 * Ya no se teclean: salen de `saturacion.js`, que a su vez usa las propiedades
 * calculadas con CoolProp (ecuaciones de estado de referencia) para los 29
 * gases del programa. Las tablas que había escritas a mano se desviaban hasta
 * 5 bar en algunos gases (el R-32 a 50 °C, por ejemplo), y por eso se sustituyeron.
 *
 * Mezclas con deslizamiento (R-407C, R-448A, R-449A…): a una misma presión hay
 * dos temperaturas, la de BURBUJA (empieza a hervir) y la de ROCÍO (acaba). Se
 * dan las dos, y se usan así:
 *   · evaporación y recalentamiento  → ROCÍO
 *   · subenfriamiento                → BURBUJA
 *   · condensación nominal (EN 12900)→ ROCÍO
 *   · presión en reposo (hay líquido)→ BURBUJA a la temperatura ambiente
 *
 * Los valores de la tabla comercial de un fabricante pueden diferir unas décimas
 * de bar, porque las mezclas dependen de la composición real del cilindro.
 *
 * ─── LA CARGA ────────────────────────────────────────────────────────────────
 *
 * El cálculo de carga NO se inventa gramos por metro: los pone el fabricante
 * en la placa o en el manual, y cambian con el diámetro de la línea y con el
 * modelo. Aquí se piden y se hace la cuenta, que es donde se falla.
 */
import { REFRIGERANT_PROPS } from './refrigerantProps.js';
import { buscarRefrigerante } from './refrigerantes.js';
import {
  ATM, PSI_POR_BAR, INHG_POR_BAR, idGasProps, presionSaturacion, temperaturaSaturacion,
  rangoSaturacion, temperaturaEbullicionNormal,
} from './saturacion.js';

/** De presión absoluta (bar) a la que marca el manómetro (bar relativos). */
export const aRelativa = (absoluta) => Math.round((absoluta - ATM) * 100) / 100;
/** De bar a psi. */
export const aPsi = (bar) => Math.round(bar * PSI_POR_BAR);

/** Por debajo de este deslizamiento (K, a 0 °C) la mezcla se trata como un gas puro en las tablas. */
export const UMBRAL_DESLIZAMIENTO = 0.3;

// «+ 0» convierte −0 en 0: un −0,00 en pantalla desconcierta a quien lee el manómetro
const redondear2 = (n) => Math.round(n * 100) / 100 + 0;
const es1 = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Lo que se lee en un manómetro para una presión absoluta, con vacío incluido. */
function medir(pAbs) {
  const rel = pAbs - ATM;
  return {
    absoluta: redondear2(pAbs),
    relativa: redondear2(rel),
    psi: Math.round(rel * PSI_POR_BAR) + 0,
    vacioInHg: rel < 0 ? Math.round(-rel * INHG_POR_BAR * 10) / 10 : 0,
  };
}

/**
 * Avisos escritos a mano de los gases de uso más corriente. El resto de gases genera su aviso
 * a partir de su clasificación de seguridad, su estado normativo y su deslizamiento (ver `avisoDe`).
 * Lo que dependa de un número (el deslizamiento) NO se escribe aquí: sale de los datos.
 */
const AVISOS_MANUALES = {
  'R-22': 'Prohibido para recarga en la UE desde 2015. El dato está aquí porque las máquinas antiguas siguen montadas.',
  'R-410A': 'Se carga SIEMPRE en fase líquida: es una mezcla y por vapor se descompensa.',
  'R-32': 'A2L, levemente inflamable: carga máxima según el volumen del local (UNE-EN 378) y herramientas adecuadas.',
  'R-454B': 'A2L. Sustituto del R-410A: presiones parecidas pero NO es intercambiable sin comprobar el equipo.',
  'R-404A': 'GWP muy alto (3922). Sustitúyelo por R-448A, R-449A o R-454C cuando toque intervenir.',
  'R-290': 'A3, INFLAMABLE. Carga máxima muy limitada por el volumen del local. Herramientas y detección específicas.',
  'R-600a': 'A3, INFLAMABLE. Cargas muy pequeñas (frigoríficos): se pesa en gramos, no en kilos.',
  'R-744': '⚠️ PRESIONES MUY ALTAS. Punto crítico a 31 °C y 73,8 bar: por encima no hay condensación, trabaja en transcrítico y la presión ya no depende de la temperatura. Manómetros y mangueras específicos. La tabla llega a 25 °C.',
  'R-717': '⚠️ TÓXICO. Sala de máquinas específica, detección y ventilación de emergencia. Nunca manómetros con latón.',
};

/** Aviso de un gas: el escrito a mano si lo hay y, en las mezclas, la nota de deslizamiento sacada de los datos. */
function avisoDe(id, cat, d) {
  const partes = [];
  if (AVISOS_MANUALES[id]) partes.push(AVISOS_MANUALES[id]);
  else {
    if (cat?.estado === 'prohibido') partes.push('Prohibido para recargar en la UE: agota la capa de ozono. El dato está aquí porque las máquinas antiguas siguen montadas.');
    if (d.clase === 'A2L') partes.push('A2L, levemente inflamable: carga máxima según el volumen del local (UNE-EN 378) y herramientas adecuadas.');
    if (d.clase === 'A3') partes.push('A3, INFLAMABLE. Carga máxima muy limitada por el volumen del local. Herramientas y detección específicas.');
    if (d.clase.startsWith('B')) partes.push('Tóxico: sala de máquinas, detección y ventilación específicas.');
    if (cat?.estado === 'restringido') partes.push(`Gas fluorado de GWP alto${cat.gwp ? ` (${cat.gwp})` : ''}: sujeto a las cuotas y prohibiciones por tipo de equipo del Reglamento (UE) 2024/573.`);
  }
  if (d.mezcla && d.glide0 >= UMBRAL_DESLIZAMIENTO) {
    partes.push(`Deslizamiento de ${es1(d.glide0)} K a 0 °C: es una mezcla zeótropa. Cárgala en fase líquida; para el recalentamiento usa la temperatura de ROCÍO y para el subenfriamiento la de BURBUJA.`);
  } else if (d.mezcla && !AVISOS_MANUALES[id]) {
    partes.push('Es una mezcla: se carga siempre en fase líquida.');
  }
  return partes.length ? partes.join(' ') : null;
}

function familiaDe(cat, d) {
  if (!cat) return d.mezcla ? 'HFO (mezcla)' : 'Otro';
  return d.mezcla && !cat.familia.startsWith('Natural') ? `${cat.familia} (mezcla)` : cat.familia;
}

function construirGas(id) {
  const d = REFRIGERANT_PROPS[id];
  const cat = buscarRefrigerante(id);
  const r = rangoSaturacion(id);
  return {
    id,
    nombre: cat?.nombre || id,
    familia: familiaDe(cat, d),
    seguridad: d.clase,
    ebullicion: temperaturaEbullicionNormal(id) === null ? null : Math.round(temperaturaEbullicionNormal(id) * 10) / 10,
    glide: Math.round(d.glide0 * 10) / 10,
    mezcla: d.mezcla,
    composicion: d.composicion,
    zeotropo: d.mezcla && d.glide0 >= UMBRAL_DESLIZAMIENTO,
    aceite: cat?.aceite || null,
    gwp: cat?.gwp ?? null,
    estado: cat?.estado || null,
    uso: cat?.uso || null,
    tCritica: d.Tcrit,
    pCritica: d.Pcrit,
    tMin: r.rocio.tMin,
    tMax: Math.min(r.burbuja.tMax, r.rocio.tMax),
    aviso: avisoDe(id, cat, d),
  };
}

/** Los gases con tabla, en orden natural (R-12, R-22, R-32, R-134a, R-290, R-404A…). */
export const GASES = Object.keys(REFRIGERANT_PROPS)
  .sort((a, b) => a.localeCompare(b, 'es', { numeric: true }))
  .map(construirGas);

/** Un gas de la tabla (admite variantes del nombre: «R404A», «R-744 (CO₂)»…). */
export function gas(id) {
  const clave = idGasProps(id);
  return clave ? GASES.find((g) => g.id === clave) || null : null;
}

/**
 * Presión de saturación a una temperatura.
 * @param {string} idGas
 * @param {number|string} temperatura  °C
 * @param {'burbuja'|'rocio'} [punto='burbuja']  qué temperatura es en una mezcla (en un gas puro da igual)
 * @returns {{temperatura, punto, absoluta, relativa, psi, vacioInHg, fueraDeTabla:false}
 *          | {fueraDeTabla:true, minimo, maximo}|null}  bar absolutos, de manómetro y psi
 */
export function presionA(idGas, temperatura, punto = 'burbuja') {
  const g = gas(idGas);
  const t = Number(temperatura);
  if (!g || temperatura === '' || temperatura === null || !Number.isFinite(t)) return null;
  const pAbs = presionSaturacion(g.id, t, punto);
  if (pAbs === null) {
    const r = rangoSaturacion(g.id)[punto === 'burbuja' ? 'burbuja' : 'rocio'];
    return { fueraDeTabla: true, minimo: r.tMin, maximo: r.tMax };
  }
  return { temperatura: t, punto, ...medir(pAbs), fueraDeTabla: false };
}

/**
 * Qué temperatura de saturación corresponde a una presión leída en el
 * manómetro (bar relativos). Es la operación que se hace de verdad en obra:
 * lees la presión y quieres saber a qué temperatura evapora.
 *
 * En una mezcla con deslizamiento devuelve las dos: la de ROCÍO (la que vale para el recalentamiento)
 * en `temperatura`, y la de BURBUJA (la del subenfriamiento) en `burbuja`.
 */
export function temperaturaA(idGas, barRelativos) {
  const g = gas(idGas);
  const texto = String(barRelativos ?? '').replace(',', '.').trim();
  const pRel = Number(texto);
  if (!g || texto === '' || !Number.isFinite(pRel)) return null;
  const pAbs = pRel + ATM;
  const rocio = temperaturaSaturacion(g.id, pAbs, 'rocio');
  if (rocio === null) return { fueraDeTabla: true };
  const burbuja = temperaturaSaturacion(g.id, pAbs, 'burbuja');
  return {
    temperatura: Math.round(rocio * 10) / 10,
    burbuja: g.zeotropo && burbuja !== null ? Math.round(burbuja * 10) / 10 : null,
    zeotropo: g.zeotropo,
    fueraDeTabla: false,
  };
}

/**
 * Tabla presión–temperatura de un gas en una rejilla de temperaturas.
 * Cada fila: `{ t, burbuja, rocio }`, con `{absoluta, relativa, psi, vacioInHg}` o `null` si ese punto
 * queda fuera de la tabla del gas. En un gas puro (o casi azeótropo) `rocio` es igual que `burbuja`.
 */
export function tablaPT(idGas, { desde = -40, hasta = 60, paso = 5 } = {}) {
  const g = gas(idGas);
  if (!g || !(paso > 0)) return [];
  const n = Math.floor((hasta - desde) / paso + 1e-9);
  const filas = [];
  for (let i = 0; i <= n; i++) {
    const t = Math.round((desde + i * paso) * 1000) / 1000;
    const b = presionSaturacion(g.id, t, 'burbuja');
    const r = presionSaturacion(g.id, t, 'rocio');
    if (b === null && r === null) continue;
    filas.push({ t, burbuja: b === null ? null : medir(b), rocio: r === null ? null : medir(r) });
  }
  return filas;
}

/**
 * Temperaturas con las que se pinta la tabla de un gas: de 5 en 5 K entre −50 y 60 °C, recortadas a
 * lo que cubren los datos del gas.
 */
export function temperaturasDeTabla(idGas) {
  const g = gas(idGas);
  if (!g) return [];
  const desde = Math.max(-50, Math.ceil(g.tMin / 5) * 5);
  const hasta = Math.min(60, Math.floor(g.tMax / 5) * 5);
  const lista = [];
  for (let t = desde; t <= hasta; t += 5) lista.push(t);
  return lista;
}

/**
 * Cómo trabaja cada tipo de instalación. De aquí sale la temperatura de
 * evaporación y de condensación con las que consultar la tabla.
 */
export const APLICACIONES = [
  {
    id: 'clima',
    nombre: 'Climatización / split en frío',
    evaporacion: [5, 10],
    condensacion: 'Ambiente exterior + 10 a 15 K',
    condDelta: [10, 15],
    recalentamiento: [5, 8],
    subenfriamiento: [5, 10],
    saltoAire: '8 a 12 K entre retorno e impulsión',
    nota: 'Con 35 °C fuera, la condensación anda por 45-50 °C.',
  },
  {
    id: 'bomba-calor',
    nombre: 'Bomba de calor en calefacción',
    evaporacion: [-5, 5],
    condensacion: '45 a 55 °C',
    condFija: [45, 55],
    recalentamiento: [5, 8],
    subenfriamiento: [3, 8],
    saltoAire: '15 a 25 K en impulsión',
    nota: 'En desescarche los valores no sirven: espera a que termine el ciclo.',
  },
  {
    id: 'media',
    nombre: 'Refrigeración media temperatura (cámara 0 a 4 °C)',
    evaporacion: [-10, -5],
    condensacion: 'Ambiente + 10 a 15 K',
    condDelta: [10, 15],
    recalentamiento: [4, 8],
    subenfriamiento: [4, 8],
    saltoAire: '6 a 8 K en el evaporador',
    nota: 'El salto entre cámara y evaporación suele ser de 6 a 10 K.',
  },
  {
    id: 'baja',
    nombre: 'Congelación (cámara -18 a -22 °C)',
    evaporacion: [-32, -25],
    condensacion: 'Ambiente + 10 a 15 K',
    condDelta: [10, 15],
    recalentamiento: [4, 8],
    subenfriamiento: [3, 6],
    saltoAire: '5 a 8 K en el evaporador',
    nota: 'Vigila el desescarche: un evaporador con hielo falsea todas las lecturas.',
  },
  {
    id: 'mural',
    nombre: 'Mural / vitrina expositora',
    evaporacion: [-12, -6],
    condensacion: 'Ambiente + 10 a 15 K',
    condDelta: [10, 15],
    recalentamiento: [4, 8],
    subenfriamiento: [4, 8],
    saltoAire: '6 a 9 K',
    nota: null,
  },
  {
    id: 'domestico',
    nombre: 'Frigorífico doméstico',
    evaporacion: [-28, -20],
    condensacion: 'Ambiente + 12 a 20 K',
    condDelta: [12, 20],
    recalentamiento: [3, 6],
    subenfriamiento: [2, 5],
    saltoAire: '—',
    nota: 'Cargas de 30 a 150 g: se pesa en balanza, no se carga por presión.',
  },
];

export function aplicacion(id) {
  return APLICACIONES.find((a) => a.id === id) || null;
}

/**
 * Las presiones que le tocan a una instalación, ya calculadas.
 *
 *   · aspiración  → saturación en ROCÍO a la temperatura de evaporación de la instalación
 *   · alta        → saturación en ROCÍO a la temperatura de condensación (ambiente + salto, o la fija
 *                    de una bomba de calor)
 *   · reposo      → saturación en BURBUJA a la temperatura ambiente (hay líquido en el depósito)
 *
 * Cada presión es `{absoluta, relativa, psi,…}` o `{fueraDeTabla:true,…}` si la temperatura no cae dentro
 * de la tabla del gas (por ejemplo, el CO₂ por encima de 25 °C: ahí trabaja en transcrítico).
 */
export function presionesDeTrabajo(idGas, idAplicacion, ambiente = 30) {
  const g = gas(idGas);
  const a = aplicacion(idAplicacion);
  if (!g || !a) return null;
  const amb = Number(ambiente);

  const [cMin, cMax] = a.condFija
    ? a.condFija
    : [amb + (a.condDelta?.[0] ?? 10), amb + (a.condDelta?.[1] ?? 15)];

  return {
    gas: g,
    aplicacion: a,
    ambiente: amb,
    evapMin: presionA(g.id, a.evaporacion[0], 'rocio'),
    evapMax: presionA(g.id, a.evaporacion[1], 'rocio'),
    condMin: presionA(g.id, cMin, 'rocio'),
    condMax: presionA(g.id, cMax, 'rocio'),
    tCondensacion: [cMin, cMax],
    reposo: presionA(g.id, amb, 'burbuja'),
  };
}

// ─── Cálculo de la carga ─────────────────────────────────────────────────────

const num = (v) => {
  const t = String(v ?? '').replace(',', '.').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * Cuánto gas le toca a la máquina y cuánto hay que añadir o sacar.
 *
 * @param {object} d
 * @param {number|string} d.cargaFabrica     precarga de la placa, en gramos
 * @param {number|string} d.metrosIncluidos  metros de línea que cubre esa precarga
 * @param {number|string} d.metrosReales     metros de línea que hay montados
 * @param {number|string} d.gramosPorMetro   los que diga la placa o el manual
 * @param {number|string} [d.cargaActual]    lo que hay ahora dentro, si se ha pesado
 * @param {boolean} [d.restarSiCorta]        algunos fabricantes mandan quitar si la línea es más corta
 */
export function calcularCarga({
  cargaFabrica, metrosIncluidos, metrosReales, gramosPorMetro,
  cargaActual = null, restarSiCorta = false,
} = {}) {
  const base = num(cargaFabrica);
  const incl = num(metrosIncluidos);
  const real = num(metrosReales);
  const gm = num(gramosPorMetro);
  const actual = num(cargaActual);

  const faltan = [];
  if (base === null) faltan.push('la carga de fábrica que pone la placa');
  if (incl === null) faltan.push('los metros que cubre esa carga');
  if (real === null) faltan.push('los metros de línea montados');
  if (gm === null) faltan.push('los gramos por metro del fabricante');
  if (faltan.length) return { completo: false, faltan };

  const exceso = real - incl;
  const extra = exceso > 0
    ? exceso * gm
    : (restarSiCorta ? exceso * gm : 0);

  const total = Math.round(base + extra);
  const avisos = [];

  if (exceso > 0) {
    avisos.push(`La línea tiene ${redondear(exceso)} m de más sobre los ${incl} m que cubre la precarga.`);
  } else if (exceso < 0) {
    avisos.push(restarSiCorta
      ? `La línea es ${redondear(-exceso)} m más corta: se descuenta gas porque así lo indica el fabricante.`
      : `La línea es ${redondear(-exceso)} m más corta que los ${incl} m de la precarga. La mayoría de fabricantes NO manda quitar gas por eso; solo hazlo si tu manual lo dice.`);
  } else {
    avisos.push('La línea es justo la que cubre la precarga: no hay que añadir nada por longitud.');
  }

  const resultado = {
    completo: true,
    cargaFabrica: base,
    metrosIncluidos: incl,
    metrosReales: real,
    gramosPorMetro: gm,
    metrosDeMas: redondear(Math.max(0, exceso)),
    extra: Math.round(extra),
    total,
    totalKg: Math.round(total / 10) / 100,
    formula: exceso > 0
      ? `${base} g + (${redondear(real)} m − ${incl} m) × ${gm} g/m = ${base} g + ${Math.round(extra)} g = ${total} g`
      : `${base} g (la longitud no suma carga) = ${total} g`,
    avisos,
  };

  if (actual !== null) {
    const dif = total - actual;
    resultado.cargaActual = actual;
    resultado.diferencia = Math.round(dif);
    resultado.accion = Math.abs(dif) < 1 ? 'nada' : (dif > 0 ? 'anadir' : 'sacar');
    resultado.gramosAAnadir = dif > 0 ? Math.round(dif) : 0;
    resultado.gramosASacar = dif < 0 ? Math.round(-dif) : 0;
    resultado.desviacion = total > 0 ? Math.round((Math.abs(dif) / total) * 1000) / 10 : 0;
    resultado.formulaDiferencia = `${total} g que le tocan − ${actual} g que tiene = ${Math.round(dif)} g`;

    if (resultado.accion === 'anadir') {
      resultado.mensaje = `Faltan ${Math.round(dif)} g. Añade ${Math.round(dif)} g (${Math.round(dif) / 1000} kg).`;
    } else if (resultado.accion === 'sacar') {
      resultado.mensaje = `Sobran ${Math.round(-dif)} g. Recupera ${Math.round(-dif)} g (${Math.round(-dif) / 1000} kg) a botella de recuperación.`;
      resultado.avisos.push('El gas que sacas NO se libera a la atmósfera: se recupera en botella. Liberarlo es infracción y, además, se paga.');
    } else {
      resultado.mensaje = 'La carga es la correcta: no toques nada.';
    }
    if (resultado.desviacion > 20 && resultado.accion !== 'nada') {
      resultado.avisos.push(`La diferencia es del ${resultado.desviacion} % de la carga. Antes de cargar, comprueba que no haya fuga: una desviación así no aparece sola.`);
    }
  }

  return resultado;
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}
