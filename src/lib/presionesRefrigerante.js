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
 *     40 °C, la misma máquina, con la carga perfecta, marca 350 psi. Si vas
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
 * Son valores de referencia de las tablas de saturación de cada refrigerante,
 * redondeados a lo que se puede leer en un manómetro. Sirven para trabajar.
 * Para un cálculo fino, la referencia es la tabla del fabricante del gas o del
 * equipo. En las mezclas con deslizamiento (glide) se da el punto de burbuja,
 * que es el que se usa para la presión de alta; para el recalentamiento hay
 * que usar el de rocío, y eso lo indica cada tabla.
 *
 * ─── LA CARGA ────────────────────────────────────────────────────────────────
 *
 * El cálculo de carga NO se inventa gramos por metro: los pone el fabricante
 * en la placa o en el manual, y cambian con el diámetro de la línea y con el
 * modelo. Aquí se piden y se hace la cuenta, que es donde se falla.
 */

const PSI_POR_BAR = 14.5038;
const ATM = 1.013;

/** De presión absoluta (bar) a la que marca el manómetro (bar relativos). */
export const aRelativa = (absoluta) => Math.round((absoluta - ATM) * 100) / 100;
/** De bar a psi. */
export const aPsi = (bar) => Math.round(bar * PSI_POR_BAR);

/**
 * Tablas de saturación. `p` son bar ABSOLUTOS a esa temperatura en °C.
 * En las mezclas con glide, el punto de burbuja.
 */
export const GASES = [
  {
    id: 'R-22',
    nombre: 'R-22',
    familia: 'HCFC',
    seguridad: 'A1',
    ebullicion: -40.8,
    glide: 0,
    aceite: 'Mineral / alquilbenceno',
    aviso: 'Prohibido para recarga en la UE desde 2015. El dato está aquí porque las máquinas antiguas siguen montadas.',
    tabla: [[-30, 1.64], [-20, 2.45], [-10, 3.55], [-5, 4.22], [0, 4.98], [5, 5.84], [7, 6.22], [10, 6.81], [15, 7.89], [20, 9.10], [25, 10.44], [30, 11.92], [35, 13.55], [40, 15.34], [45, 17.30], [50, 19.42]],
  },
  {
    id: 'R-410A',
    nombre: 'R-410A',
    familia: 'HFC (mezcla)',
    seguridad: 'A1',
    ebullicion: -51.4,
    glide: 0.1,
    aceite: 'POE',
    aviso: 'Se carga SIEMPRE en fase líquida: es una mezcla y por vapor se descompensa.',
    tabla: [[-30, 2.72], [-20, 4.00], [-10, 5.72], [-5, 6.77], [0, 7.98], [5, 9.33], [7, 9.94], [10, 10.86], [15, 12.55], [20, 14.42], [25, 16.51], [30, 18.82], [35, 21.37], [40, 24.19], [45, 27.29], [50, 30.71]],
  },
  {
    id: 'R-32',
    nombre: 'R-32',
    familia: 'HFC',
    seguridad: 'A2L',
    ebullicion: -51.7,
    glide: 0,
    aceite: 'POE',
    aviso: 'A2L, levemente inflamable: carga máxima según el volumen del local (UNE-EN 378) y herramientas adecuadas.',
    tabla: [[-30, 3.30], [-20, 4.81], [-10, 6.85], [-5, 8.07], [0, 9.51], [5, 11.09], [7, 11.78], [10, 12.87], [15, 14.87], [20, 17.09], [25, 19.56], [30, 22.29], [35, 25.30], [40, 28.62], [45, 32.25], [50, 36.24]],
  },
  {
    id: 'R-454B',
    nombre: 'R-454B',
    familia: 'HFO (mezcla)',
    seguridad: 'A2L',
    ebullicion: -50.9,
    glide: 1.5,
    aceite: 'POE',
    aviso: 'A2L. Sustituto del R-410A: presiones parecidas pero NO es intercambiable sin comprobar el equipo.',
    tabla: [[-30, 2.62], [-20, 3.87], [-10, 5.54], [-5, 6.57], [0, 7.74], [5, 9.07], [7, 9.65], [10, 10.57], [15, 12.24], [20, 14.09], [25, 16.15], [30, 18.42], [35, 20.93], [40, 23.69], [45, 26.72], [50, 30.05]],
  },
  {
    id: 'R-134a',
    nombre: 'R-134a',
    familia: 'HFC',
    seguridad: 'A1',
    ebullicion: -26.1,
    glide: 0,
    aceite: 'POE',
    aviso: null,
    tabla: [[-30, 0.85], [-20, 1.33], [-10, 2.01], [-5, 2.43], [0, 2.93], [5, 3.50], [7, 3.75], [10, 4.15], [15, 4.88], [20, 5.72], [25, 6.65], [30, 7.70], [35, 8.87], [40, 10.17], [45, 11.60], [50, 13.18]],
  },
  {
    id: 'R-404A',
    nombre: 'R-404A',
    familia: 'HFC (mezcla)',
    seguridad: 'A1',
    ebullicion: -46.5,
    glide: 0.7,
    aceite: 'POE',
    aviso: 'GWP muy alto (3922). Sustitúyelo por R-448A, R-449A o R-454C cuando toque intervenir.',
    tabla: [[-40, 1.32], [-35, 1.64], [-30, 2.05], [-25, 2.49], [-20, 3.03], [-15, 3.65], [-10, 4.37], [-5, 5.19], [0, 6.13], [5, 7.19], [10, 8.38], [15, 9.72], [20, 11.21], [25, 12.88], [30, 14.72], [35, 16.76], [40, 19.00], [45, 21.46], [50, 24.15]],
  },
  {
    id: 'R-448A',
    nombre: 'R-448A',
    familia: 'HFO (mezcla)',
    seguridad: 'A1',
    ebullicion: -45.9,
    glide: 5.5,
    aceite: 'POE',
    aviso: 'Deslizamiento de unos 5-6 K: para el recalentamiento usa la temperatura de ROCÍO, no la de burbuja.',
    tabla: [[-40, 1.14], [-35, 1.44], [-30, 1.80], [-25, 2.22], [-20, 2.72], [-15, 3.30], [-10, 3.97], [-5, 4.74], [0, 5.62], [5, 6.62], [10, 7.75], [15, 9.02], [20, 10.44], [25, 12.02], [30, 13.78], [35, 15.73], [40, 17.87], [45, 20.23], [50, 22.81]],
  },
  {
    id: 'R-449A',
    nombre: 'R-449A',
    familia: 'HFO (mezcla)',
    seguridad: 'A1',
    ebullicion: -46.0,
    glide: 5.5,
    aceite: 'POE',
    aviso: 'Deslizamiento de unos 5-6 K: para el recalentamiento usa la temperatura de ROCÍO.',
    tabla: [[-40, 1.16], [-35, 1.46], [-30, 1.83], [-25, 2.26], [-20, 2.76], [-15, 3.35], [-10, 4.03], [-5, 4.81], [0, 5.70], [5, 6.72], [10, 7.86], [15, 9.14], [20, 10.58], [25, 12.18], [30, 13.96], [35, 15.93], [40, 18.09], [45, 20.47], [50, 23.08]],
  },
  {
    id: 'R-407C',
    nombre: 'R-407C',
    familia: 'HFC (mezcla)',
    seguridad: 'A1',
    ebullicion: -43.6,
    glide: 7,
    aceite: 'POE',
    aviso: 'Deslizamiento de unos 7 K, el mayor de los habituales. Cárgalo en líquido y usa rocío para el recalentamiento.',
    tabla: [[-30, 1.62], [-20, 2.51], [-10, 3.72], [-5, 4.47], [0, 5.33], [5, 6.32], [7, 6.75], [10, 7.44], [15, 8.71], [20, 10.14], [25, 11.75], [30, 13.55], [35, 15.55], [40, 17.77], [45, 20.22], [50, 22.92]],
  },
  {
    id: 'R-290',
    nombre: 'R-290 (propano)',
    familia: 'Natural (HC)',
    seguridad: 'A3',
    ebullicion: -42.1,
    glide: 0,
    aceite: 'Mineral / POE',
    aviso: 'A3, INFLAMABLE. Carga máxima muy limitada por el volumen del local. Herramientas y detección específicas.',
    tabla: [[-40, 1.11], [-30, 1.68], [-20, 2.45], [-10, 3.45], [-5, 4.05], [0, 4.74], [5, 5.51], [7, 5.85], [10, 6.38], [15, 7.34], [20, 8.37], [25, 9.52], [30, 10.79], [35, 12.17], [40, 13.69], [45, 15.34], [50, 17.13]],
  },
  {
    id: 'R-600a',
    nombre: 'R-600a (isobutano)',
    familia: 'Natural (HC)',
    seguridad: 'A3',
    ebullicion: -11.7,
    glide: 0,
    aceite: 'Mineral / POE',
    aviso: 'A3, INFLAMABLE. Cargas muy pequeñas (frigoríficos): se pesa en gramos, no en kilos.',
    tabla: [[-30, 0.37], [-25, 0.51], [-20, 0.72], [-15, 0.87], [-10, 1.09], [-5, 1.30], [0, 1.57], [5, 1.88], [10, 2.23], [15, 2.63], [20, 3.04], [25, 3.51], [30, 4.05], [35, 4.64], [40, 5.31], [45, 6.05], [50, 6.87]],
  },
  {
    id: 'R-744',
    nombre: 'R-744 (CO₂)',
    familia: 'Natural',
    seguridad: 'A1',
    ebullicion: -78.5,
    glide: 0,
    aceite: 'POE',
    aviso: '⚠️ PRESIONES MUY ALTAS. Punto crítico a 31 °C y 73,8 bar: por encima no hay condensación, trabaja en transcrítico. Manómetros y mangueras específicos.',
    tabla: [[-40, 10.05], [-35, 12.02], [-30, 14.28], [-25, 16.83], [-20, 19.70], [-15, 22.91], [-10, 26.49], [-5, 30.47], [0, 34.85], [5, 39.69], [10, 45.02], [15, 50.87], [20, 57.29], [25, 64.34], [30, 72.14]],
  },
  {
    id: 'R-717',
    nombre: 'R-717 (amoníaco)',
    familia: 'Natural',
    seguridad: 'B2L',
    ebullicion: -33.3,
    glide: 0,
    aceite: 'Mineral / PAO',
    aviso: '⚠️ TÓXICO. Sala de máquinas específica, detección y ventilación de emergencia. Nunca manómetros con latón.',
    tabla: [[-40, 0.72], [-35, 0.93], [-30, 1.19], [-25, 1.51], [-20, 1.90], [-15, 2.36], [-10, 2.91], [-5, 3.55], [0, 4.29], [5, 5.16], [10, 6.15], [15, 7.28], [20, 8.57], [25, 10.03], [30, 11.67], [35, 13.51], [40, 15.55], [45, 17.82], [50, 20.33]],
  },
];

/** Un gas de la tabla. */
export function gas(id) {
  return GASES.find((g) => g.id === id) || null;
}

/**
 * Presión de saturación a una temperatura, interpolando entre los puntos de
 * la tabla. Devuelve bar absolutos, relativos y psi.
 */
export function presionA(idGas, temperatura) {
  const g = gas(idGas);
  const t = Number(temperatura);
  if (!g || !Number.isFinite(t)) return null;

  const tabla = g.tabla;
  if (t < tabla[0][0] || t > tabla[tabla.length - 1][0]) {
    return { fueraDeTabla: true, minimo: tabla[0][0], maximo: tabla[tabla.length - 1][0] };
  }
  let absoluta = null;
  for (let i = 0; i < tabla.length - 1; i++) {
    const [t1, p1] = tabla[i];
    const [t2, p2] = tabla[i + 1];
    if (t >= t1 && t <= t2) {
      absoluta = t2 === t1 ? p1 : p1 + ((p2 - p1) * (t - t1)) / (t2 - t1);
      break;
    }
  }
  if (absoluta === null) return null;
  const rel = aRelativa(absoluta);
  return {
    temperatura: t,
    absoluta: Math.round(absoluta * 100) / 100,
    relativa: rel,
    psi: aPsi(rel),
    fueraDeTabla: false,
  };
}

/**
 * Qué temperatura de saturación corresponde a una presión leída en el
 * manómetro (bar relativos). Es la operación que se hace de verdad en obra:
 * lees la presión y quieres saber a qué temperatura evapora.
 */
export function temperaturaA(idGas, barRelativos) {
  const g = gas(idGas);
  const pRel = Number(barRelativos);
  if (!g || !Number.isFinite(pRel)) return null;
  const pAbs = pRel + ATM;
  const tabla = g.tabla;
  if (pAbs < tabla[0][1] || pAbs > tabla[tabla.length - 1][1]) return { fueraDeTabla: true };
  for (let i = 0; i < tabla.length - 1; i++) {
    const [t1, p1] = tabla[i];
    const [t2, p2] = tabla[i + 1];
    if (pAbs >= p1 && pAbs <= p2) {
      const t = p2 === p1 ? t1 : t1 + ((t2 - t1) * (pAbs - p1)) / (p2 - p1);
      return { temperatura: Math.round(t * 10) / 10, fueraDeTabla: false };
    }
  }
  return null;
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
    recalentamiento: [3, 6],
    subenfriamiento: [2, 5],
    saltoAire: '—',
    nota: 'Cargas de 30 a 150 g: se pesa en balanza, no se carga por presión.',
  },
];

export function aplicacion(id) {
  return APLICACIONES.find((a) => a.id === id) || null;
}

/** Las presiones que le tocan a una instalación, ya calculadas. */
export function presionesDeTrabajo(idGas, idAplicacion, ambiente = 30) {
  const g = gas(idGas);
  const a = aplicacion(idAplicacion);
  if (!g || !a) return null;

  const evapMin = presionA(idGas, a.evaporacion[0]);
  const evapMax = presionA(idGas, a.evaporacion[1]);
  // La condensación se estima con el ambiente más el salto habitual.
  const condMin = presionA(idGas, Number(ambiente) + 10);
  const condMax = presionA(idGas, Number(ambiente) + 15);
  const reposo = presionA(idGas, Number(ambiente));

  return { gas: g, aplicacion: a, ambiente: Number(ambiente), evapMin, evapMax, condMin, condMax, reposo };
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
