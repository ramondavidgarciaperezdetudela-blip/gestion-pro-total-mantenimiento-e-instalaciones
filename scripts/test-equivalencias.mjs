/**
 * Pruebas de las equivalencias entre gases (src/lib/equivalenciasGases.js, src/lib/datosSustitucion.js)
 * y de los datos del catálogo (src/lib/refrigerantes.js).
 *
 *   npm run test:equivalencias
 *
 * Qué comprueba:
 *   1. Que cada ficha de conversión es coherente: gases que existen, tipos válidos, sin conversiones de un
 *      gas a sí mismo, sin repetidos, y reglas de seguridad (una «sustitución directa» solo a un gas no
 *      inflamable; los gases inflamables llevan su aviso; ninguna ficha recomienda un gas prohibido).
 *   2. Que el GWP de cada mezcla del catálogo coincide con el calculado desde su composición (AR4, el de las
 *      etiquetas): así se detectan errores como el del R-449A (1.282 en vez de 1.397).
 *   3. Que la carga de las fichas con cifras del fabricante es compatible con la relación de densidades del
 *      líquido, y que esa estimación reproduce las guías publicadas de Honeywell y Arkema.
 *   4. Que la capacidad volumétrica, las presiones y la densidad coinciden con CoolProp 8.0.0 calculado
 *      directamente (81 puntos).
 *   5. Que cada gas del catálogo tiene todos sus sustitutos (curados y citados) y el orden es el esperado.
 *   6. El cálculo de la carga convertida.
 *   7. La búsqueda de gases de presiones parecidas.
 *   8. Que los textos están en español, sin mezclar términos en inglés.
 *
 * Termina con código 1 si algo falla, para poder usarlo en la integración continua.
 */
import { REFRIGERANTES, buscarRefrigerante } from '../src/lib/refrigerantes.js';
import { REFRIGERANT_PROPS } from '../src/lib/refrigerantProps.js';
import { SUSTITUCIONES, CONDICION_TIPICA, PASOS_CONVERSION } from '../src/lib/datosSustitucion.js';
import {
  TIPOS, CAMBIO_ACEITE, FUENTES, CONDICIONES, TOLERANCIA_ESTIMADA, CARGA_INICIAL_ESTANDAR,
  avisoSeguridad, esInflamable, densidadLiquido, relacionDensidad, capacidadVolumetrica, comparacionFisica,
  sustitucionesDe, buscarSustitucion, origenes, cargaConvertida, gasesParecidos, condicion, condicionTipica,
} from '../src/lib/equivalenciasGases.js';

let fallos = 0;
let pruebas = 0;
const ok = (cond, texto, detalle = '') => {
  pruebas++;
  if (!cond) {
    fallos++;
    console.log(`  ✗ ${texto}${detalle ? ' — ' + detalle : ''}`);
  }
};
const cerca = (a, b, tolRel, texto, tolAbs = 0) => {
  const dif = Math.abs(a - b);
  ok(dif <= Math.max(Math.abs(b) * tolRel, tolAbs), texto, `obtenido ${a}, esperado ${b} (dif ${(100 * dif / Math.abs(b)).toFixed(3)} %)`);
};

// Valores de referencia calculados DIRECTAMENTE con CoolProp 8.0.0 (HEOS), sin pasar por el dataset del programa.
// [gas, condición, Te, Tc, Pe(bar), Pc(bar), qv(kJ/m³)] con Te y Tc de ROCÍO; qv = ρv(Pe)·(hv(Pe) − hl(Pc)).
const REF_QV = [
  ['R-134a', 'clima', 5.0, 45.0, 3.49659, 11.5992, 2356.34],
  ['R-134a', 'media', -10.0, 40.0, 2.00603, 10.1659, 1368.16],
  ['R-134a', 'baja', -35.0, 40.0, 0.661442, 10.1659, 425.18],
  ['R-32', 'clima', 5.0, 45.0, 9.51448, 27.9478, 5949.67],
  ['R-32', 'media', -10.0, 40.0, 5.82632, 24.7831, 3767.58],
  ['R-32', 'baja', -35.0, 40.0, 2.2138, 24.7831, 1428.21],
  ['R-290', 'clima', 5.0, 45.0, 5.51117, 15.3431, 3094.35],
  ['R-290', 'media', -10.0, 40.0, 3.4528, 13.6942, 1957.66],
  ['R-290', 'baja', -35.0, 40.0, 1.37226, 13.6942, 728.317],
  ['R-22', 'clima', 5.0, 45.0, 5.84109, 17.2921, 3730.86],
  ['R-22', 'media', -10.0, 40.0, 3.54786, 15.3358, 2322.06],
  ['R-22', 'baja', -35.0, 40.0, 1.32026, 15.3358, 848.196],
  ['R-410A', 'clima', 5.0, 45.0, 9.33176, 27.2613, 5278.4],
  ['R-410A', 'media', -10.0, 40.0, 5.72676, 24.1861, 3333.91],
  ['R-410A', 'baja', -35.0, 40.0, 2.18138, 24.1861, 1219.37],
  ['R-404A', 'clima', 5.0, 45.0, 7.01858, 20.4433, 3573.4],
  ['R-404A', 'media', -10.0, 40.0, 4.30764, 18.1465, 2213.27],
  ['R-404A', 'baja', -35.0, 40.0, 1.63616, 18.1465, 749.274],
  ['R-507A', 'clima', 5.0, 45.0, 7.28355, 21.0265, 3625.71],
  ['R-507A', 'media', -10.0, 40.0, 4.49286, 18.68, 2256.65],
  ['R-507A', 'baja', -35.0, 40.0, 1.72685, 18.68, 767.93],
  ['R-407A', 'clima', 5.0, 45.0, 5.90398, 18.6933, 3651.86],
  ['R-407A', 'media', -10.0, 40.0, 3.4737, 16.4507, 2189.38],
  ['R-407A', 'baja', -35.0, 40.0, 1.20604, 16.4507, 719.963],
  ['R-407C', 'clima', 5.0, 45.0, 5.46906, 17.5365, 3525.95],
  ['R-407C', 'media', -10.0, 40.0, 3.19781, 15.4132, 2103.57],
  ['R-407C', 'baja', -35.0, 40.0, 1.09661, 15.4132, 690.994],
  ['R-407F', 'clima', 5.0, 45.0, 6.18384, 19.5333, 3891.42],
  ['R-407F', 'media', -10.0, 40.0, 3.64436, 17.1928, 2344.7],
  ['R-407F', 'baja', -35.0, 40.0, 1.27048, 17.1928, 785.015],
  ['R-448A', 'clima', 5.0, 45.0, 6.03423, 18.8388, 3713.5],
  ['R-448A', 'media', -10.0, 40.0, 3.57976, 16.5991, 2244.06],
  ['R-448A', 'baja', -35.0, 40.0, 1.26648, 16.5991, 753.041],
  ['R-449A', 'clima', 5.0, 45.0, 6.03315, 18.7402, 3688.9],
  ['R-449A', 'media', -10.0, 40.0, 3.58741, 16.5217, 2232.96],
  ['R-449A', 'baja', -35.0, 40.0, 1.27509, 16.5217, 750.87],
  ['R-449B', 'clima', 5.0, 45.0, 6.05458, 18.8338, 3715.02],
  ['R-449B', 'media', -10.0, 40.0, 3.5972, 16.6021, 2248.17],
  ['R-449B', 'baja', -35.0, 40.0, 1.27618, 16.6021, 756.147],
  ['R-452A', 'clima', 5.0, 45.0, 6.53933, 19.6862, 3576.27],
  ['R-452A', 'media', -10.0, 40.0, 3.9565, 17.4057, 2184.76],
  ['R-452A', 'baja', -35.0, 40.0, 1.46148, 17.4057, 728.588],
  ['R-454B', 'clima', 5.0, 45.0, 8.56989, 25.1836, 5163.68],
  ['R-454B', 'media', -10.0, 40.0, 5.24863, 22.3262, 3253.52],
  ['R-454B', 'baja', -35.0, 40.0, 1.99286, 22.3262, 1207.78],
  ['R-454C', 'clima', 5.0, 45.0, 5.21469, 16.0924, 3218.47],
  ['R-454C', 'media', -10.0, 40.0, 3.11517, 14.1943, 1945.81],
  ['R-454C', 'baja', -35.0, 40.0, 1.12107, 14.1943, 655.005],
  ['R-455A', 'clima', 5.0, 45.0, 5.57199, 17.2454, 3499.47],
  ['R-455A', 'media', -10.0, 40.0, 3.32838, 15.2011, 2122.5],
  ['R-455A', 'baja', -35.0, 40.0, 1.19863, 15.2011, 720.796],
  ['R-513A', 'clima', 5.0, 45.0, 3.83032, 12.111, 2342.82],
  ['R-513A', 'media', -10.0, 40.0, 2.25052, 10.6671, 1380.03],
  ['R-513A', 'baja', -35.0, 40.0, 0.77939, 10.6671, 434.475],
  ['R-450A', 'clima', 5.0, 45.0, 3.06149, 10.1962, 2048.19],
  ['R-450A', 'media', -10.0, 40.0, 1.7532, 8.93237, 1180.03],
  ['R-450A', 'baja', -35.0, 40.0, 0.575897, 8.93237, 359.051],
  ['R-456A', 'clima', 5.0, 45.0, 3.41019, 11.3179, 2331.82],
  ['R-456A', 'media', -10.0, 40.0, 1.95802, 9.91643, 1353.41],
  ['R-456A', 'baja', -35.0, 40.0, 0.647079, 9.91643, 420.825],
  ['R-422D', 'clima', 5.0, 45.0, 5.70176, 17.6574, 3140.07],
  ['R-422D', 'media', -10.0, 40.0, 3.38278, 15.5815, 1874.47],
  ['R-422D', 'baja', -35.0, 40.0, 1.1899, 15.5815, 588.401],
  ['R-417A', 'clima', 5.0, 45.0, 4.82528, 15.3378, 2879.94],
  ['R-417A', 'media', -10.0, 40.0, 2.82613, 13.4996, 1699.69],
  ['R-417A', 'baja', -35.0, 40.0, 0.96922, 13.4996, 531.276],
  ['R-427A', 'clima', 5.0, 45.0, 5.33231, 17.016, 3363.76],
  ['R-427A', 'media', -10.0, 40.0, 3.12352, 14.9646, 2004.76],
  ['R-427A', 'baja', -35.0, 40.0, 1.07423, 14.9646, 653.045],
  ['R-12', 'clima', 5.0, 45.0, 3.62012, 10.8208, 2304.89],
  ['R-12', 'media', -10.0, 40.0, 2.18781, 9.58823, 1409.66],
  ['R-12', 'baja', -35.0, 40.0, 0.805906, 9.58823, 494.772],
  ['R-600a', 'clima', 5.0, 45.0, 1.8672, 6.04446, 1262.98],
  ['R-600a', 'media', -10.0, 40.0, 1.0845, 5.31208, 736.818],
  ['R-600a', 'baja', -35.0, 40.0, 0.367969, 5.31208, 233.171],
  ['R-1234yf', 'clima', 5.0, 45.0, 3.73006, 11.5389, 2161.6],
  ['R-1234yf', 'media', -10.0, 40.0, 2.21785, 10.1847, 1277.69],
  ['R-1234yf', 'baja', -35.0, 40.0, 0.788899, 10.1847, 401.035],
  ['R-1234ze(E)', 'clima', 5.0, 45.0, 2.59344, 8.76147, 1744.87],
  ['R-1234ze(E)', 'media', -10.0, 40.0, 1.47435, 7.66451, 993.709],
  ['R-1234ze(E)', 'baja', -35.0, 40.0, 0.476846, 7.66451, 294.126],
];
// [gas, T(°C), densidad del líquido saturado (kg/m³)]
const REF_RHO = [
  ['R-134a', 30.0, 1187.46],
  ['R-134a', 35.0, 1167.5],
  ['R-134a', 40.0, 1146.74],
  ['R-32', 30.0, 939.624],
  ['R-32', 35.0, 917.049],
  ['R-32', 40.0, 893.039],
  ['R-290', 30.0, 484.391],
  ['R-290', 35.0, 476.105],
  ['R-290', 40.0, 467.461],
  ['R-22', 30.0, 1170.74],
  ['R-22', 35.0, 1150.06],
  ['R-22', 40.0, 1128.53],
  ['R-410A', 30.0, 1033.07],
  ['R-410A', 35.0, 1005.48],
  ['R-410A', 40.0, 975.716],
  ['R-404A', 30.0, 1019.41],
  ['R-404A', 35.0, 993.069],
  ['R-404A', 40.0, 964.648],
  ['R-507A', 30.0, 1022.56],
  ['R-507A', 35.0, 995.416],
  ['R-507A', 40.0, 966.029],
  ['R-407A', 30.0, 1121.61],
  ['R-407A', 35.0, 1096.87],
  ['R-407A', 40.0, 1070.65],
  ['R-407C', 30.0, 1115.36],
  ['R-407C', 35.0, 1092.15],
  ['R-407C', 40.0, 1067.67],
  ['R-407F', 30.0, 1094.04],
  ['R-407F', 35.0, 1069.95],
  ['R-407F', 40.0, 1044.45],
  ['R-448A', 30.0, 1074.98],
  ['R-448A', 35.0, 1051.31],
  ['R-448A', 40.0, 1026.24],
  ['R-449A', 30.0, 1074.83],
  ['R-449A', 35.0, 1051.12],
  ['R-449A', 40.0, 1025.99],
  ['R-449B', 30.0, 1075.23],
  ['R-449B', 35.0, 1051.53],
  ['R-449B', 40.0, 1026.43],
  ['R-452A', 30.0, 1098.03],
  ['R-452A', 35.0, 1070.96],
  ['R-452A', 40.0, 1041.96],
  ['R-454B', 30.0, 964.417],
  ['R-454B', 35.0, 941.359],
  ['R-454B', 40.0, 916.8],
  ['R-454C', 30.0, 1024.74],
  ['R-454C', 35.0, 1003.48],
  ['R-454C', 40.0, 981.063],
  ['R-455A', 30.0, 1011.57],
  ['R-455A', 35.0, 989.626],
  ['R-455A', 40.0, 966.429],
  ['R-513A', 30.0, 1115.12],
  ['R-513A', 35.0, 1095.18],
  ['R-513A', 40.0, 1074.34],
  ['R-450A', 30.0, 1161.88],
  ['R-450A', 35.0, 1143.4],
  ['R-450A', 40.0, 1124.23],
  ['R-456A', 30.0, 1147.02],
  ['R-456A', 35.0, 1128.01],
  ['R-456A', 40.0, 1108.25],
  ['R-422D', 30.0, 1118.97],
  ['R-422D', 35.0, 1092.97],
  ['R-422D', 40.0, 1065.22],
  ['R-417A', 30.0, 1129.58],
  ['R-417A', 35.0, 1106.17],
  ['R-417A', 40.0, 1081.44],
  ['R-427A', 30.0, 1107.62],
  ['R-427A', 35.0, 1084.39],
  ['R-427A', 40.0, 1059.87],
  ['R-12', 30.0, 1292.69],
  ['R-12', 35.0, 1273.79],
  ['R-12', 40.0, 1254.27],
  ['R-600a', 30.0, 544.311],
  ['R-600a', 35.0, 537.828],
  ['R-600a', 40.0, 531.187],
  ['R-1234yf', 30.0, 1073.14],
  ['R-1234yf', 35.0, 1053.78],
  ['R-1234yf', 40.0, 1033.56],
  ['R-1234ze(E)', 30.0, 1146.45],
  ['R-1234ze(E)', 35.0, 1129.28],
  ['R-1234ze(E)', 40.0, 1111.51],
];


/* ───────────────────────────── 1. Integridad de las fichas ───────────────────────────── */
console.log('1. Integridad de las fichas de conversión');
{
  const ids = new Set(REFRIGERANTES.map((r) => r.id));
  ok(ids.size === REFRIGERANTES.length, 'el catálogo no tiene gases repetidos');
  const vistos = new Set();
  for (const s of SUSTITUCIONES) {
    const etq = `${s.de} → ${s.a}`;
    ok(ids.has(s.de), `${etq}: el gas de origen está en el catálogo`);
    ok(ids.has(s.a), `${etq}: el gas de destino está en el catálogo`);
    ok(s.de !== s.a, `${etq}: no se convierte un gas en sí mismo`);
    ok(!vistos.has(etq), `${etq}: ficha repetida`);
    vistos.add(etq);
    ok(['directo', 'conversion', 'nuevo'].includes(s.tipo), `${etq}: tipo válido`, s.tipo);
    ok(s.cambioAceite === null || CAMBIO_ACEITE[s.cambioAceite], `${etq}: cambioAceite válido`, String(s.cambioAceite));
    ok(['fabricante', 'general'].includes(s.fuente), `${etq}: fuente válida`, s.fuente);
    ok(s.fuente !== 'fabricante' || (typeof s.ref === 'string' && s.ref.length > 0), `${etq}: una ficha «del fabricante» cita cuál`);
    ok(typeof s.aceite === 'string' && s.aceite.length >= 3, `${etq}: indica el aceite`);
    ok(typeof s.nota === 'string' && s.nota.length > 20, `${etq}: lleva nota`);
    const dest = buscarRefrigerante(s.a);
    ok(dest?.estado !== 'prohibido', `${etq}: no se recomienda un gas prohibido`);
    if (s.tipo === 'directo') ok(dest?.seguridad === 'A1', `${etq}: una sustitución directa va a un gas no inflamable (A1)`, dest?.seguridad);
    if (esInflamable(dest?.seguridad)) ok(/inflamable/i.test(s.nota), `${etq}: el gas es ${dest.seguridad} y la nota avisa de que es inflamable`);
    if (s.tipo === 'nuevo') ok(s.carga === null, `${etq}: una conversión a equipo nuevo no lleva factor de carga`);
    if (s.carga) {
      const c = s.carga;
      ok(c.inicial > 0.5 && c.inicial <= 1.0, `${etq}: carga inicial razonable`, String(c.inicial));
      ok(c.desde > 0.5 && c.hasta >= c.desde && c.hasta < 1.3, `${etq}: rango de carga razonable`, `${c.desde}-${c.hasta}`);
      ok(c.inicial <= c.hasta, `${etq}: se empieza por debajo de la carga final`);
      ok(c.max === undefined || c.max >= c.hasta, `${etq}: el máximo no es menor que la carga final`);
      ok(s.fuente === 'fabricante', `${etq}: solo se escriben cifras de carga si salen de una guía del fabricante`);
    }
  }
  ok(SUSTITUCIONES.length >= 60, 'hay fichas suficientes', String(SUSTITUCIONES.length));
  ok(PASOS_CONVERSION.length >= 8 && PASOS_CONVERSION.every((p) => p.length > 30), 'el procedimiento tiene todos sus pasos');
  for (const k of Object.keys(CONDICION_TIPICA)) ok(buscarRefrigerante(k), `condición típica de ${k}: el gas existe`);
  for (const c of CONDICIONES) ok(c.te < c.tc, `condición ${c.id}: evaporación por debajo de condensación`);
  ok(avisoSeguridad('A1') === null && avisoSeguridad('A2L') === 'A2L: levemente inflamable' && avisoSeguridad('A3').includes('muy inflamable') && avisoSeguridad('B1') === 'B1: tóxico', 'avisos de seguridad');
  ok(esInflamable('A2L') && esInflamable('A3') && esInflamable('B2L') && !esInflamable('A1') && !esInflamable('B1') && !esInflamable('—'), 'qué gases son inflamables');
}

/* ───────────────────────────── 2. GWP frente a composición ───────────────────────────── */
console.log('2. GWP del catálogo frente a la composición (AR4)');
{
  // GWP a 100 años (AR4) de los componentes, los del Reglamento (UE) 517/2014 y los de las etiquetas.
  const G = {
    'R-32': 675, 'R-125': 3500, 'R-143a': 4470, 'R-134a': 1430, 'R-152a': 124, 'R-1234yf': 4, 'R-1234ze(E)': 7,
    'R-600a': 3, 'R-600': 4, 'R-744': 1, 'R-218': 8830, 'R-227ea': 3220, 'R-22': 1810, 'R-124': 609, 'R-601a': 5,
    'CF3I': 0.4, 'R-1243zf': 0.8,
  };
  // Composiciones másicas (ASHRAE 34) de los gases que NO están en el dataset de CoolProp.
  const EXTRA = {
    'R-401B': { 'R-22': 0.61, 'R-152a': 0.11, 'R-124': 0.28 },
    'R-413A': { 'R-218': 0.09, 'R-134a': 0.88, 'R-600a': 0.03 },
    'R-417B': { 'R-125': 0.79, 'R-134a': 0.1825, 'R-600': 0.0275 },
    'R-453A': { 'R-32': 0.20, 'R-125': 0.20, 'R-134a': 0.538, 'R-227ea': 0.05, 'R-600': 0.006, 'R-601a': 0.006 },
    'R-459A': { 'R-32': 0.68, 'R-1234yf': 0.26, 'R-1234ze(E)': 0.06 },
    'R-466A': { 'R-32': 0.49, 'R-125': 0.115, 'CF3I': 0.395 },
    'R-516A': { 'R-1234yf': 0.775, 'R-134a': 0.085, 'R-152a': 0.14 },
    'R-469A': { 'R-744': 0.35, 'R-32': 0.325, 'R-125': 0.325 },
  };
  const composiciones = { ...EXTRA };
  for (const [id, d] of Object.entries(REFRIGERANT_PROPS)) {
    if (!d.composicion) continue;
    composiciones[id] = {};
    for (const parte of d.composicion.split('·')) {
      const m = parte.trim().match(/^(\S+)\s+([\d.]+)\s*%$/);
      ok(m, `${id}: composición legible`, parte);
      if (m) composiciones[id][m[1]] = Number(m[2]) / 100;
    }
  }
  let n = 0;
  for (const [id, comp] of Object.entries(composiciones)) {
    const suma = Object.values(comp).reduce((a, b) => a + b, 0);
    ok(Math.abs(suma - 1) < 0.0025, `${id}: las fracciones suman 1`, suma.toFixed(4));
    const faltan = Object.keys(comp).filter((k) => G[k] === undefined);
    ok(faltan.length === 0, `${id}: se conoce el GWP de todos sus componentes`, faltan.join(','));
    if (faltan.length) continue;
    const calc = Object.entries(comp).reduce((a, [k, f]) => a + f * G[k], 0);
    const cat = buscarRefrigerante(id);
    ok(cat, `${id}: está en el catálogo`);
    if (cat) { cerca(cat.gwp, calc, 0.01, `${id}: GWP del catálogo (${cat.gwp}) frente al calculado (${calc.toFixed(0)})`, 3); n++; }
  }
  ok(n === 26, 'se han comprobado las 26 mezclas (18 del dataset y 8 más)', String(n));
  // El que estaba mal: 1.282 era el valor de otro informe del IPCC.
  ok(buscarRefrigerante('R-449A').gwp === 1397, 'R-449A tiene el GWP de las etiquetas (1.397)');
  // Gases puros con GWP de libro (AR4)
  for (const [id, v] of Object.entries({ 'R-134a': 1430, 'R-32': 675, 'R-404A': 3922, 'R-410A': 2088, 'R-407C': 1774, 'R-22': 1810, 'R-12': 10900, 'R-744': 1, 'R-290': 3, 'R-717': 0 })) {
    ok(buscarRefrigerante(id)?.gwp === v, `GWP de ${id} = ${v}`, String(buscarRefrigerante(id)?.gwp));
  }
  // Todo gas con tabla de propiedades está en el catálogo
  for (const id of Object.keys(REFRIGERANT_PROPS)) ok(buscarRefrigerante(id), `${id} (con tabla P–T) está en el catálogo`);
  // Los sustitutos que cita el catálogo existen
  const ids = new Set(REFRIGERANTES.map((r) => r.id));
  for (const r of REFRIGERANTES) for (const x of r.sustitutos || []) ok(ids.has(x) || /Disolventes/.test(x), `${r.id}: el sustituto ${x} existe en el catálogo`);
}

/* ───────────────────────────── 3. Carga frente a densidades ───────────────────────────── */
console.log('3. Carga: guías de los fabricantes frente a la relación de densidades');
{
  let comprobadas = 0;
  for (const s of SUSTITUCIONES) {
    if (!s.carga) continue;
    const r = relacionDensidad(s.de, s.a);
    if (r === null) continue;
    comprobadas++;
    const dentro = r >= s.carga.desde - TOLERANCIA_ESTIMADA && r <= s.carga.hasta + TOLERANCIA_ESTIMADA;
    ok(dentro, `${s.de} → ${s.a}: relación de densidades ${r.toFixed(3)} frente a la guía ${s.carga.desde}–${s.carga.hasta}`);
  }
  ok(comprobadas >= 5, 'se comparan al menos 5 guías con la física', String(comprobadas));
  // Cifras publicadas (se escriben aquí a mano, tal como las dan los fabricantes)
  const rel = (a, b) => relacionDensidad(a, b);
  cerca(rel('R-404A', 'R-448A'), 1.05, 0.02, 'Honeywell: R-404A → R-448A, tamaño de carga relativo 105 %');
  const r407c = rel('R-22', 'R-407C');
  ok(r407c >= 0.90 && r407c <= 0.96, 'Arkema y Honeywell: R-22 → R-407C entre el 90 y el 96 %', r407c.toFixed(3));
  const r422d = rel('R-22', 'R-422D');
  ok(r422d >= 0.94 && r422d <= 0.97, 'Honeywell: R-22 → R-422D, entre un 4 y un 5 % menos', r422d.toFixed(3));
  const r427 = rel('R-22', 'R-427A');
  ok(r427 >= 0.92 && r427 <= 1.0, 'Arkema: R-22 → R-427A entre el 95 y el 100 % (estimación dentro de ±3 %)', r427.toFixed(3));
  const r407a = rel('R-22', 'R-407A');
  ok(r407a >= 0.92 && r407a <= 1.0, 'Arkema: R-22 → R-407A entre el 95 y el 100 %', r407a.toFixed(3));
  const r12 = rel('R-12', 'R-134a');
  ok(r12 >= 0.88 && r12 <= 0.96, 'Arkema: R-12 → R-134a entre el 90 y el 95 %', r12.toFixed(3));
  // Los hidrocarburos llevan menos de la mitad de carga en peso: orden de magnitud conocido
  const rhc = rel('R-404A', 'R-290');
  ok(rhc > 0.40 && rhc < 0.55, 'R-290 lleva en torno a la mitad de peso de gas que el R-404A', rhc.toFixed(3));
  ok(relacionDensidad('R-404A', 'R-502') === null && relacionDensidad('R-502', 'R-404A') === null, 'sin datos de un gas no hay relación de densidades');
  ok(relacionDensidad('R-744', 'R-404A', 35) === null, 'el CO₂ a 35 °C queda fuera de su tabla (transcrítico)');
}

/* ───────────────────────────── 4. Física frente a CoolProp ───────────────────────────── */
console.log('4. Capacidad volumétrica, presiones y densidad frente a CoolProp');
{
  let peor = 0;
  let peorTxt = '';
  for (const [gas, cond, te, tc, pe, pc, qv] of REF_QV) {
    const c = capacidadVolumetrica(gas, te, tc);
    ok(c, `${gas} ${cond}: hay resultado`);
    if (!c) continue;
    cerca(c.pe, pe, 0.0015, `${gas} ${cond}: presión de evaporación`);
    cerca(c.pc, pc, 0.0015, `${gas} ${cond}: presión de condensación`);
    cerca(c.compresion, pc / pe, 0.003, `${gas} ${cond}: relación de compresión`);
    const err = Math.abs(c.qv - qv) / qv;
    if (err > peor) { peor = err; peorTxt = `${gas} ${cond}`; }
    ok(err < 0.01, `${gas} ${cond}: capacidad volumétrica ${c.qv.toFixed(1)} frente a ${qv.toFixed(1)} kJ/m³`, `${(100 * err).toFixed(2)} %`);
  }
  console.log(`   ${REF_QV.length} puntos de capacidad; peor desviación ${(100 * peor).toFixed(3)} % (${peorTxt})`);
  let peorRho = 0;
  for (const [gas, t, rho] of REF_RHO) {
    const d = densidadLiquido(gas, t);
    ok(d !== null, `${gas} ${t} °C: hay densidad`);
    if (d === null) continue;
    peorRho = Math.max(peorRho, Math.abs(d - rho) / rho);
    cerca(d, rho, 0.003, `${gas} ${t} °C: densidad del líquido`);
  }
  console.log(`   ${REF_RHO.length} densidades; peor desviación ${(100 * peorRho).toFixed(3)} %`);
  // Comportamientos físicos conocidos
  const a = capacidadVolumetrica('R-410A', 5, 45);
  const b = capacidadVolumetrica('R-22', 5, 45);
  ok(a.qv / b.qv > 1.3 && a.qv / b.qv < 1.7, 'el R-410A rinde un 30-70 % más por m³ aspirado que el R-22', (a.qv / b.qv).toFixed(2));
  ok(a.pc / b.pc > 1.4 && a.pc / b.pc < 1.8, 'el R-410A trabaja con un 40-80 % más de presión de condensación que el R-22', (a.pc / b.pc).toFixed(2));
  ok(capacidadVolumetrica('R-404A', 40, 10) === null, 'si la evaporación es más caliente que la condensación no hay ciclo');
  ok(capacidadVolumetrica('R-744', -10, 40) === null, 'el CO₂ a 40 °C de condensación no está en la tabla (transcrítico)');
  ok(capacidadVolumetrica('R-502', -10, 40) === null, 'sin tabla del gas no hay capacidad');
  ok(capacidadVolumetrica('R-404A', 'x', 40) === null, 'temperatura no numérica');
  const cmp = comparacionFisica('R-404A', 'R-448A');
  ok(cmp.length === 3 && cmp.every((f) => f.razon), 'la comparación da las tres condiciones');
  ok(cmp.every((f) => f.razon.qv > 0.95 && f.razon.qv < 1.1), 'R-448A rinde como el R-404A con el mismo compresor (±10 %)', cmp.map((f) => f.razon.qv.toFixed(3)).join(' '));
  ok(cmp.every((f) => f.razon.pe < 1 && f.razon.pc < 1), 'R-448A trabaja con presiones algo menores que el R-404A', cmp.map((f) => f.razon.pc.toFixed(3)).join(' '));
  ok(comparacionFisica('R-502', 'R-404A')[0].razon === null && comparacionFisica('R-502', 'R-404A')[0].a, 'con un solo gas con datos se devuelve la mitad y sin razón');
  ok(comparacionFisica('R-502', 'R-508B') === null, 'sin datos de ninguno de los dos, no hay comparación');
}

/* ───────────────────────────── 5. Sustitutos completos y ordenados ───────────────────────────── */
console.log('5. Todos los sustitutos, sin perder ninguno');
{
  for (const r of REFRIGERANTES) {
    const lista = sustitucionesDe(r.id);
    const destinos = lista.map((s) => s.a);
    ok(new Set(destinos).size === destinos.length, `${r.id}: sin sustitutos repetidos`);
    for (const x of r.sustitutos || []) if (buscarRefrigerante(x)) ok(destinos.includes(x), `${r.id}: aparece el sustituto ${x} del catálogo`);
    for (const s of SUSTITUCIONES.filter((q) => q.de === r.id)) ok(destinos.includes(s.a), `${r.id}: aparece la ficha ${s.a}`);
    // los prohibidos van al final
    const iPro = lista.findIndex((s) => s.prohibido);
    if (iPro >= 0) ok(lista.slice(iPro).every((s) => s.prohibido), `${r.id}: los prohibidos van al final`);
    // dentro de los no prohibidos, el tipo no retrocede
    const noPro = lista.filter((s) => !s.prohibido);
    ok(noPro.every((s, i) => i === 0 || TIPOS[s.tipo].orden >= TIPOS[noPro[i - 1].tipo].orden), `${r.id}: de la conversión más sencilla a la más compleja`);
    for (const s of lista) {
      ok(s.origen?.id === r.id && s.destino?.id === s.a, `${r.id} → ${s.a}: lleva la ficha de los dos gases`);
      ok(TIPOS[s.tipo], `${r.id} → ${s.a}: tipo conocido`);
      if (s.tipo === 'sinFicha') ok(s.fuente === 'catalogo' && s.carga === null, `${r.id} → ${s.a}: lo citado sin ficha no inventa cargas`);
    }
  }
  const o = origenes();
  ok(o.length >= 70, 'hay muchos gases de origen', String(o.length));
  ok(o.every((g) => sustitucionesDe(g.id).length > 0), 'todo gas de origen tiene sustitutos');
  ok(!o.some((g) => g.id === 'otro' || g.id === 'R-718'), 'el comodín y el agua no son origen');
  // Casos concretos
  const r404 = sustitucionesDe('R-404A').map((s) => s.a);
  for (const x of ['R-448A', 'R-449A', 'R-449B', 'R-407F', 'R-407A', 'R-452A', 'R-454C', 'R-455A', 'R-290', 'R-744']) ok(r404.includes(x), `R-404A tiene como sustituto ${x}`);
  const r22 = sustitucionesDe('R-22').map((s) => s.a);
  for (const x of ['R-407C', 'R-422D', 'R-427A', 'R-407A', 'R-417A', 'R-438A', 'R-410A', 'R-32', 'R-454B']) ok(r22.includes(x), `R-22 tiene como sustituto ${x}`);
  ok(sustitucionesDe('R-1234yf').every((s) => s.a !== 'R-1234yf'), 'el R-1234yf ya no se «sustituye» por sí mismo');
  ok(sustitucionesDe('R-744').every((s) => s.a !== 'R-744'), 'el R-744 ya no se «sustituye» por sí mismo');
  ok(sustitucionesDe('desconocido').length === 0 && buscarSustitucion('R-22', 'R-22') === null && buscarSustitucion('R-22', 'xx') === null, 'gases inexistentes');
  const f = buscarSustitucion('R-404A', 'R-448A');
  ok(f.tipo === 'directo' && f.cambioAceite === 'no' && f.fuente === 'fabricante' && f.reduccionGWP === 65 && !f.prohibido && f.tieneFisica, 'ficha R-404A → R-448A', JSON.stringify({ t: f.tipo, r: f.reduccionGWP }));
  const g = buscarSustitucion('R-22', 'R-407C');
  ok(g.tipo === 'conversion' && g.cambioAceite === 'si' && /15 %/.test(g.aceite), 'R-22 → R-407C exige POE (mínimo 15 %)');
  const h = buscarSustitucion('R-22', 'R-422D');
  ok(h.cambioAceite === 'parcial', 'R-22 → R-422D: el aceite depende de la instalación (retorno de aceite)');
  const i = buscarSustitucion('R-410A', 'R-32');
  ok(i.tipo === 'nuevo' && i.avisoSeguridad === 'A2L: levemente inflamable', 'R-410A → R-32: solo equipo nuevo y avisa de que es A2L');
  const j = buscarSustitucion('R-12', 'R-401A');
  ok(j.prohibido && j.tipo === 'sinFicha', 'R-12 → R-401A (HCFC): aparece como prohibido y sin ficha');
  ok(buscarSustitucion('R-134a', 'R-513A').reduccionGWP === 56, 'R-134a → R-513A reduce el GWP un 56 %');
  ok(buscarSustitucion('R-12', 'R-134a').reduccionGWP === 87, 'R-12 → R-134a reduce el GWP un 87 %');
}

/* ───────────────────────────── 6. Carga convertida ───────────────────────────── */
console.log('6. Carga al convertir');
{
  const a = cargaConvertida('R-404A', 'R-448A', 10);
  ok(a.origen === 'fabricante' && a.kg.inicial === 8.5 && a.kg.desde === 10 && a.kg.hasta === 10.5 && a.kg.max === 10.7, 'R-404A → R-448A con 10 kg: empezar por 8,5, acabar entre 10 y 10,5, tope 10,7', JSON.stringify(a.kg));
  const b = cargaConvertida('R-22', 'R-407C', 10);
  ok(b.origen === 'fabricante' && b.kg.inicial === 8.5 && b.kg.desde === 9 && b.kg.hasta === 9.6 && b.kg.max === null, 'R-22 → R-407C con 10 kg', JSON.stringify(b.kg));
  const c = cargaConvertida('R-404A', 'R-449A', 10);
  ok(c.origen === 'estimada' && c.kg.inicial === 8.5 && c.kg.desde > 10 && c.kg.hasta < 11.2 && c.kg.hasta > c.kg.desde, 'R-404A → R-449A (sin guía): estimada por densidades', JSON.stringify(c.kg));
  cerca(c.factor.hasta - c.factor.desde, 2 * TOLERANCIA_ESTIMADA, 1e-9, 'la banda estimada mide el doble de la tolerancia');
  const d = cargaConvertida('R-410A', 'R-32', 10);
  ok(d.sinConversion && d.kg === null && d.tipo === 'nuevo', 'a un equipo nuevo no hay carga que convertir');
  const e = cargaConvertida('R-502', 'R-448A', 10);
  ok(e.origen === 'sinDato' && e.kg.inicial === 8.5 && e.kg.desde === null && e.kg.hasta === null, 'sin datos físicos ni guía: solo se da el 85 % inicial', JSON.stringify(e.kg));
  const f = cargaConvertida('R-12', 'R-134a', 2.5);
  ok(f.kg.desde === 2.25 && f.kg.hasta === 2.38 && f.kg.inicial === 2.13, 'R-12 → R-134a con 2,5 kg', JSON.stringify(f.kg));
  ok(Object.values(a.kg).every((v) => v === null || !Object.is(v, -0)), 'no hay ceros negativos');
  for (const malo of [0, -1, NaN, '', 'abc', null, undefined, Infinity]) ok(cargaConvertida('R-404A', 'R-448A', malo) === null, `peso no válido (${String(malo)}) → null`);
  ok(cargaConvertida('R-404A', 'R-404A', 5) === null && cargaConvertida('R-404A', 'xx', 5) === null && cargaConvertida('xx', 'R-448A', 5) === null, 'conversiones inexistentes → null');
  ok(CARGA_INICIAL_ESTANDAR === 0.85, 'las guías de los fabricantes empiezan por el 85 %');
  // Se escala linealmente
  const g1 = cargaConvertida('R-22', 'R-407C', 1);
  const g100 = cargaConvertida('R-22', 'R-407C', 100);
  cerca(g100.kg.hasta, g1.kg.hasta * 100, 1e-9, 'la carga es proporcional al peso');
  // «Sin conversión» tiene sentido para todos los pares nuevos
  for (const s of SUSTITUCIONES.filter((q) => q.tipo === 'nuevo')) ok(cargaConvertida(s.de, s.a, 5).sinConversion === true, `${s.de} → ${s.a}: equipo nuevo, sin carga`);
  for (const s of SUSTITUCIONES.filter((q) => q.tipo !== 'nuevo')) {
    const x = cargaConvertida(s.de, s.a, 5);
    ok(x && x.kg.inicial === 4.25 || (x && s.carga && x.kg.inicial <= 5 * s.carga.desde + 1e-9), `${s.de} → ${s.a}: la carga inicial es el 85 % o la de su guía`);
  }
}

/* ───────────────────────────── 7. Gases de presiones parecidas ───────────────────────────── */
console.log('7. Gases de presiones parecidas');
{
  const p = gasesParecidos('R-404A', 'media');
  ok(p.length >= 5 && p.length <= 10, 'R-404A tiene varios gases parecidos', String(p.length));
  ok(p[0].id === 'R-507A', 'el más parecido al R-404A es el R-507A (casi el mismo)', p[0].id);
  for (const x of ['R-448A', 'R-449A', 'R-452A', 'R-407F']) ok(p.some((q) => q.id === x), `${x} se parece al R-404A`);
  ok(!p.some((q) => q.id === 'R-404A'), 'el gas no se compara consigo mismo');
  ok(p.every((q, i) => i === 0 || q.puntuacion >= p[i - 1].puntuacion), 'ordenados de más a menos parecido');
  ok(p.every((q) => q.razon.pe >= 0.8 && q.razon.pe <= 1.25 && q.razon.pc >= 0.8 && q.razon.pc <= 1.25 && q.razon.qv >= 0.75 && q.razon.qv <= 1.3), 'todos dentro de los intervalos de parecido');
  ok(p.find((q) => q.id === 'R-448A').citado === true, 'se marca cuáles ya tienen ficha de conversión');
  ok(p.some((q) => !q.citado), 'hay gases parecidos sin ficha (solo comparación física)');
  const q = gasesParecidos('R-410A', 'clima').map((x) => x.id);
  ok(q.includes('R-454B') && q.includes('R-32') && !q.includes('R-22'), 'R-410A se parece al R-454B y al R-32, no al R-22', q.join(','));
  const r = gasesParecidos('R-134a', 'media').map((x) => x.id);
  ok(r.includes('R-513A') && r.includes('R-450A') && r.includes('R-456A'), 'R-134a se parece al R-513A, R-450A y R-456A', r.join(','));
  ok(gasesParecidos('R-502', 'media').length === 0 && gasesParecidos('xx').length === 0, 'sin tabla del gas no hay parecidos');
  ok(gasesParecidos('R-404A').length > 0 && gasesParecidos('R-404A', 'condicion-que-no-existe').length === 0, 'condición por defecto y condición inexistente');
  ok(gasesParecidos('R-404A', 'media', { maximo: 3 }).length === 3, 'se puede limitar el número');
  ok(condicion('clima').te === 5 && condicion('x') === null && condicionTipica('R-22') === 'clima' && condicionTipica('R-404A') === 'media' && condicionTipica('R-507A') === 'baja', 'condiciones típicas');
}

/* ───────────────────────────── 8. Textos en español ───────────────────────────── */
console.log('8. Textos en español, sin mezclar términos en inglés');
{
  const INGLES = /\b(drop-in|dropin|retrofit|glide|charge|oil|valve|the|and|with|only|system)\b/i;
  const textos = [
    ...SUSTITUCIONES.flatMap((s) => [s.aceite, s.nota]),
    ...PASOS_CONVERSION,
    ...Object.values(TIPOS).flatMap((t) => [t.etiqueta, t.resumen]),
    ...Object.values(CAMBIO_ACEITE).map((c) => c.etiqueta),
    ...Object.values(FUENTES),
  ];
  for (const t of textos) ok(!INGLES.test(t), 'sin palabras en inglés', t.slice(0, 80));
  // las fichas no hablan de marcas comerciales en la nota (los nombres de los gases ya los lleva el catálogo)
  for (const s of SUSTITUCIONES) ok(!/Solstice|Opteon|Performax|ISCEON|Genetron|Forane/i.test(s.nota), `${s.de} → ${s.a}: la nota no usa marcas`);
}

console.log(fallos ? `\n${pruebas} comprobaciones, ${fallos} FALLOS` : `\n${pruebas} comprobaciones, 0 fallos`);
process.exit(fallos ? 1 : 0);
