/**
 * Pruebas de las tablas de saturación (src/lib/saturacion.js) y de las presiones de trabajo
 * (src/lib/presionesRefrigerante.js).
 *
 *   npm run test:gases
 *
 * Qué comprueba:
 *   1. La integridad de los datos de los 29 gases (sin NaN, series crecientes, rocío ≥ burbuja).
 *   2. Que los nombres de los gases se reconocen con sus variantes y que (E) y (Z) no se confunden.
 *   3. Valores de libro de gases puros (NIST / ASHRAE) que se conocen de memoria: R-134a, R-22,
 *      R-744, R-717, R-290, R-600a, R-32. Tolerancia 0,3 %.
 *   4. Referencia hecha con CoolProp 8.0.0 en temperaturas que NO son nodos de la tabla
 *      (burbuja y rocío de los 29 gases): el error de la interpolación debe ser < 0,15 %.
 *   5. Que la función inversa (presión → temperatura) devuelve la temperatura de partida.
 *   6. Las propiedades físicas: la presión crece con la temperatura, el rocío necesita menos
 *      presión que la burbuja a la misma temperatura, el deslizamiento tiene el orden de magnitud
 *      que dan los fabricantes.
 *   7. Que fuera de la tabla se devuelve null (nunca se extrapola).
 *   8. La rejilla de temperaturas y las conversiones de manómetro.
 *   9. Las presiones de trabajo por gas e instalación (aspiración y alta con rocío, reposo con
 *      burbuja, condensación fija de la bomba de calor, CO₂ transcrítico).
 *  10. Que el manómetro → temperatura devuelve rocío y burbuja de las mezclas.
 *  11. El cálculo de carga de gas.
 *
 * Termina con código 1 si algo falla, para poder usarlo en la integración continua.
 */
import {
  ATM, idGasProps, tieneDatos, idsConDatos, gasPreparado, rangoSaturacion, presionSaturacion,
  temperaturaSaturacion, deslizamiento, temperaturaEbullicionNormal, tablaSaturacion,
  aManometro, aAbsoluta, barAPsi, vacioEnInHg,
} from '../src/lib/saturacion.js';
import { REFRIGERANT_PROPS } from '../src/lib/refrigerantProps.js';
import {
  GASES, gas, presionA, temperaturaA, presionesDeTrabajo, tablaPT, temperaturasDeTabla,
  APLICACIONES, calcularCarga, UMBRAL_DESLIZAMIENTO,
} from '../src/lib/presionesRefrigerante.js';

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

/* Referencia CoolProp 8.0.0: [temperatura °C, presión de burbuja bar abs, presión de rocío bar abs] */
const REFERENCIA_COOLPROP = {
  'R-134a': [[-43.1,0.434,0.434],[-31.7,0.7778,0.7778],[-18.3,1.4277,1.4277],[-6.9,2.2635,2.2635],[4.4,3.4242,3.4242],[13.3,4.6226,4.6226],[27.7,7.2055,7.2055],[38.9,9.8693,9.8693],[52.2,13.9231,13.9231]],
  'R-32': [[-43.1,1.5381,1.5381],[-31.7,2.5477,2.5477],[-18.3,4.3244,4.3244],[-6.9,6.4791,6.4791],[4.4,9.3397,9.3397],[13.3,12.1953,12.1953],[27.7,18.1514,18.1514],[38.9,24.1251,24.1251],[52.2,33.0373,33.0373]],
  'R-290': [[-43.1,0.9699,0.9699],[-31.7,1.5689,1.5689],[-18.3,2.5983,2.5983],[-6.9,3.8208,3.8208],[4.4,5.4146,5.4146],[13.3,6.9815,6.9815],[27.7,10.1917,10.1917],[38.9,13.3496,13.3496],[52.2,17.9673,17.9673]],
  'R-600a': [[-43.1,0.2445,0.2445],[-31.7,0.4307,0.4307],[-18.3,0.7782,0.7782],[-6.9,1.2203,1.2203],[4.4,1.8294,1.8294],[13.3,2.4542,2.4542],[27.7,3.7914,3.7914],[38.9,5.1602,5.1602],[52.2,7.2269,7.2269]],
  'R-22': [[-43.1,0.909,0.909],[-31.7,1.5245,1.5245],[-18.3,2.6179,2.6179],[-6.9,3.953,3.953],[4.4,5.7322,5.7322],[13.3,7.5112,7.5112],[27.7,11.2201,11.2201],[38.9,14.9283,14.9283],[52.2,20.4254,20.4254]],
  'R-1234yf': [[-43.1,0.5335,0.5335],[-31.7,0.9172,0.9172],[-18.3,1.6146,1.6146],[-6.9,2.4827,2.4827],[4.4,3.6577,3.6577],[13.3,4.8469,4.8469],[27.7,7.359,7.359],[38.9,9.9035,9.9035],[52.2,13.7202,13.7202]],
  'R-1234ze(E)': [[-43.1,0.3105,0.3105],[-31.7,0.5623,0.5623],[-18.3,1.0433,1.0433],[-6.9,1.6669,1.6669],[4.4,2.5389,2.5389],[13.3,3.4439,3.4439],[27.7,5.405,5.405],[38.9,7.4377,7.4377],[52.2,10.5429,10.5429]],
  'R-12': [[-43.1,0.5528,0.5528],[-31.7,0.9319,0.9319],[-18.3,1.6093,1.6093],[-6.9,2.4403,2.4403],[4.4,3.552,3.552],[13.3,4.6667,4.6667],[27.7,6.9969,6.9969],[38.9,9.3316,9.3316],[52.2,12.7952,12.7952]],
  'R-717': [[-43.1,0.6051,0.6051],[-31.7,1.0982,1.0982],[-18.3,2.0481,2.0481],[-6.9,3.2914,3.2914],[4.4,5.0454,5.0454],[13.3,6.8796,6.8796],[27.7,10.8882,10.8882],[38.9,15.0765,15.0765],[52.2,21.5161,21.5161]],
  'R-744': [[-43.1,8.9461,8.9461],[-31.7,13.4793,13.4793],[-18.3,20.7486,20.7486],[-6.9,28.9014,28.9014],[4.4,39.0886,39.0886],[13.3,48.8213,48.8213]],
  'R-410A': [[-43.1,1.5217,1.516],[-31.7,2.5189,2.5099],[-18.3,4.2695,4.2549],[-6.9,6.3869,6.3657],[4.4,9.191,9.1612],[13.3,11.9839,11.9459],[27.7,17.7963,17.7419],[38.9,23.6157,23.5468],[52.2,32.2931,32.2111]],
  'R-404A': [[-43.1,1.1741,1.1345],[-31.7,1.9372,1.8839],[-18.3,3.2707,3.1992],[-6.9,4.8767,4.7885],[4.4,6.9956,6.8904],[13.3,9.0997,8.9814],[27.7,13.4631,13.3261],[38.9,17.8157,17.6687],[52.2,24.2844,24.1361]],
  'R-507A': [[-43.1,1.2036,1.2035],[-31.7,1.985,1.9846],[-18.3,3.3495,3.348],[-6.9,4.9916,4.9887],[4.4,7.157,7.1518],[13.3,9.3064,9.2989],[27.7,13.7625,13.7505],[38.9,18.2074,18.1917],[52.2,24.8164,24.7973]],
  'R-407A': [[-43.1,1.1105,0.8069],[-31.7,1.855,1.4076],[-18.3,3.1726,2.5116],[-6.9,4.7759,3.8977],[4.4,6.9073,5.7872],[13.3,9.0345,7.7109],[27.7,13.4623,11.8041],[38.9,17.884,15.9863],[52.2,24.4332,22.3292]],
  'R-407C': [[-43.1,1.0392,0.7303],[-31.7,1.7409,1.2821],[-18.3,2.9871,2.3033],[-6.9,4.5084,3.593],[4.4,6.5362,5.3596],[13.3,8.5641,7.165],[27.7,12.7941,11.021],[38.9,17.0254,14.9737],[52.2,23.2996,20.9813]],
  'R-407F': [[-43.1,1.1683,0.8515],[-31.7,1.9483,1.4818],[-18.3,3.3271,2.638],[-6.9,5.0038,4.0876],[4.4,7.2321,6.0618],[13.3,9.4558,8.0707],[27.7,14.0842,12.3435],[38.9,18.7064,16.7082]],
  'R-448A': [[-43.1,1.174,0.854],[-31.7,1.9498,1.4738],[-18.3,3.315,2.6024],[-6.9,4.9684,4.0092],[4.4,7.1574,5.9166],[13.3,9.3348,7.8512],[27.7,13.8494,11.9538],[38.9,18.3387,16.1351],[52.2,24.9589,22.469]],
  'R-449A': [[-43.1,1.1568,0.8613],[-31.7,1.922,1.4828],[-18.3,3.269,2.6117],[-6.9,4.9005,4.0158],[4.4,7.0608,5.916],[13.3,9.2098,7.8407],[27.7,13.6659,11.9156],[38.9,18.0976,16.062],[52.2,24.6336,22.3329]],
  'R-449B': [[-43.1,1.1586,0.8614],[-31.7,1.9257,1.4845],[-18.3,3.2765,2.6174],[-6.9,4.9132,4.0275],[4.4,7.0813,5.9369],[13.3,9.2388,7.8715],[27.7,13.7142,11.9691],[38.9,18.1671,16.1396],[52.2,24.7375,22.4481]],
  'R-452A': [[-43.1,1.2167,1.003],[-31.7,2.0141,1.6895],[-18.3,3.41,2.9131],[-6.9,5.0914,4.4117],[4.4,7.3071,6.4164],[13.3,9.5025,8.4296],[27.7,14.036,12.6578],[38.9,18.5276,16.9328],[52.2,25.1341,23.3762]],
  'R-454B': [[-43.1,1.4662,1.3835],[-31.7,2.4225,2.294],[-18.3,4.0992,3.8955],[-6.9,6.1252,5.8366],[4.4,8.8053,8.4125],[13.3,11.4715,10.9835],[27.7,17.0075,16.3473],[38.9,22.5296,21.7325],[52.2,30.7146,29.7866]],
  'R-454C': [[-43.1,1.1264,0.7617],[-31.7,1.8518,1.301],[-18.3,3.1148,2.2755],[-6.9,4.6296,3.4833],[4.4,6.618,5.1143],[13.3,8.5811,6.7639],[27.7,12.6154,10.2529],[38.9,16.588,13.801],[52.2,22.3853,19.1657]],
  'R-455A': [[-43.1,1.5218,0.8147],[-31.7,2.4216,1.3908],[-18.3,3.9445,2.4316],[-6.9,5.7286,3.7217],[4.4,8.0277,5.4646],[13.3,10.2654,7.229],[27.7,14.7957,10.9668],[38.9,19.1923,14.7779],[52.2,25.5228,20.5639]],
  'R-513A': [[-43.1,0.5258,0.5212],[-31.7,0.9146,0.9099],[-18.3,1.63,1.6257],[-6.9,2.5294,2.526],[4.4,3.7564,3.7544],[13.3,5.0061,5.005],[27.7,7.6624,7.6623],[38.9,10.3677,10.3675],[52.2,14.4429,14.4411]],
  'R-450A': [[-43.1,0.3889,0.3773],[-31.7,0.6966,0.6776],[-18.3,1.2781,1.2463],[-6.9,2.0255,1.979],[4.4,3.0629,2.9979],[13.3,4.1334,4.0511],[27.7,6.4389,6.3239],[38.9,8.8144,8.6709],[52.2,12.4246,12.246]],
  'R-456A': [[-43.1,0.5478,0.425],[-31.7,0.9477,0.7606],[-18.3,1.6825,1.3944],[-6.9,2.6061,2.2088],[4.4,3.8661,3.3397],[13.3,5.149,4.5073],[27.7,7.8744,7.0257],[38.9,10.6463,9.6266],[52.2,14.8118,13.5929]],
  'R-422D': [[-43.1,1.0275,0.7991],[-31.7,1.707,1.3865],[-18.3,2.9035,2.4568],[-6.9,4.3536,3.7892],[4.4,6.2757,5.5908],[13.3,8.1906,7.4122],[27.7,12.1718,11.2563],[38.9,16.1475,15.1507],[52.2,22.0466,21.0095]],
  'R-417A': [[-43.1,0.8381,0.6449],[-31.7,1.4122,1.1334],[-18.3,2.437,2.0365],[-6.9,3.6933,3.1746],[4.4,5.3738,4.7291],[13.3,7.0595,6.3131],[27.7,10.5886,9.6823],[38.9,14.1338,13.1185],[52.2,19.4163,18.3108]],
  'R-427A': [[-43.1,1.0095,0.716],[-31.7,1.6872,1.2555],[-18.3,2.8883,2.252],[-6.9,4.3522,3.5083],[4.4,6.301,5.226],[13.3,8.2484,6.9788],[27.7,12.3074,10.716],[38.9,16.3661,14.5399],[52.2,22.3843,20.3415]],
};

/* 1 ─ Integridad ────────────────────────────────────────────────────────── */
console.log('1. Integridad de los datos');
const ids = idsConDatos();
ok(ids.length === 29, 'hay 29 gases con datos', String(ids.length));
for (const id of ids) {
  const d = REFRIGERANT_PROPS[id];
  const n = d.P.length;
  const series = ['T', 'P', 'Td', 'rl', 'rv', 'hl', 'hv', 'ml', 'mv', 'cpv'];
  ok(series.every((k) => d[k].length === n), `${id}: todas las series tienen ${n} filas`);
  ok(series.every((k) => d[k].every(Number.isFinite)), `${id}: sin NaN ni infinitos`);
  let crec = true; let rocioMayor = true;
  for (let i = 1; i < n; i++) {
    if (!(d.P[i] > d.P[i - 1]) || !(d.T[i] > d.T[i - 1]) || !(d.Td[i] > d.Td[i - 1])) crec = false;
  }
  for (let i = 0; i < n; i++) if (d.Td[i] < d.T[i] - 1e-6) rocioMayor = false;
  ok(crec, `${id}: presión y temperaturas estrictamente crecientes`);
  ok(rocioMayor, `${id}: el rocío nunca está por debajo de la burbuja`);
}

/* 2 ─ Nombres ───────────────────────────────────────────────────────────── */
console.log('2. Reconocimiento de nombres');
const nombres = [
  ['R-404A', 'R-404A'], ['R404A', 'R-404A'], ['r-404a', 'R-404A'], [' R-404A ', 'R-404A'],
  ['R-744 (CO₂)', 'R-744'], ['R-744 (CO2)', 'R-744'], ['R-290 (propano)', 'R-290'], ['R-717 (amoniaco)', 'R-717'],
  ['R-1234ze', 'R-1234ze(E)'], ['R-1234ze(E)', 'R-1234ze(E)'], ['r1234ze', 'R-1234ze(E)'],
  ['R-1234ze(Z)', null], ['R-999', null], ['', null], [undefined, null], [null, null], [404, null],
];
for (const [entrada, esperado] of nombres) ok(idGasProps(entrada) === esperado, `«${entrada}» → ${esperado}`, String(idGasProps(entrada)));
ok(tieneDatos('R-410A') && !tieneDatos('R-123'), 'tieneDatos distingue los gases con y sin tabla');
ok(gasPreparado('R-999') === null, 'gasPreparado de un gas desconocido es null');

/* 3 ─ Valores de libro de gases puros ─────────────────────────────────────── */
console.log('3. Valores de libro (NIST / ASHRAE)');
const libro = [
  ['R-134a', 0, 2.928], ['R-134a', 25, 6.654], ['R-22', 0, 4.976], ['R-22', 20, 9.10],
  ['R-744', -20, 19.70], ['R-744', 0, 34.85], ['R-744', 20, 57.29],
  ['R-717', 0, 4.294], ['R-717', 20, 8.574], ['R-717', 40, 15.55],
  ['R-290', 20, 8.366], ['R-290', 40, 13.70],
  ['R-600a', 20, 3.02], ['R-600a', 40, 5.31],
  ['R-32', 25, 16.90],
];
for (const [id, t, p] of libro) cerca(presionSaturacion(id, t), p, 0.003, `${id} a ${t} °C: ${p} bar`);
const ebullicion = [['R-134a', -26.07], ['R-22', -40.81], ['R-717', -33.33], ['R-290', -42.1], ['R-600a', -11.75], ['R-32', -51.65], ['R-12', -29.75], ['R-1234yf', -29.5]];
for (const [id, t] of ebullicion) {
  const calc = temperaturaEbullicionNormal(id);
  ok(calc !== null && Math.abs(calc - t) < 0.2, `${id}: ebullición normal ${t} °C`, String(calc));
}
ok(temperaturaEbullicionNormal('R-744') === null, 'R-744 no hierve a 1 atm (sublima): queda fuera de la tabla');

/* 4 ─ Referencia CoolProp fuera de los nodos ───────────────────────────────── */
console.log('4. Referencia CoolProp fuera de los nodos');
let peor = 0; let peorTxt = ''; let puntos = 0;
for (const [id, filas] of Object.entries(REFERENCIA_COOLPROP)) {
  ok(filas.length >= 6, `${id}: hay al menos 6 puntos de referencia`, String(filas.length));
  for (const [t, pb, pd] of filas) {
    const b = presionSaturacion(id, t, 'burbuja');
    const r = presionSaturacion(id, t, 'rocio');
    ok(b !== null && r !== null, `${id} a ${t} °C: hay dato`);
    if (b === null || r === null) continue;
    for (const [calc, ref, punto] of [[b, pb, 'burbuja'], [r, pd, 'rocío']]) {
      const e = Math.abs(calc - ref) / ref;
      puntos++;
      if (e > peor) { peor = e; peorTxt = `${id} ${punto} ${t} °C`; }
      ok(e < 0.0015, `${id} ${punto} a ${t} °C`, `obtenido ${calc.toFixed(4)}, CoolProp ${ref} (${(100 * e).toFixed(3)} %)`);
    }
  }
}
console.log(`   ${puntos} puntos; peor desviación ${(100 * peor).toFixed(3)} % (${peorTxt})`);

/* 5 ─ Función inversa ──────────────────────────────────────────────────────── */
console.log('5. Presión → temperatura');
for (const id of ids) {
  const r = rangoSaturacion(id);
  for (const punto of ['burbuja', 'rocio']) {
    const { tMin, tMax } = r[punto];
    for (const f of [0.1, 0.37, 0.64, 0.9]) {
      const t = tMin + f * (tMax - tMin);
      const p = presionSaturacion(id, t, punto);
      const tb = temperaturaSaturacion(id, p, punto);
      ok(tb !== null && Math.abs(tb - t) < 0.05, `${id} ${punto}: T→P→T a ${t.toFixed(1)} °C`, String(tb));
    }
  }
}

/* 6 ─ Física ───────────────────────────────────────────────────────────────── */
console.log('6. Propiedades físicas');
for (const id of ids) {
  const r = rangoSaturacion(id);
  let anterior = 0; let sube = true;
  for (let t = r.burbuja.tMin; t <= r.burbuja.tMax; t += 0.5) {
    const p = presionSaturacion(id, t, 'burbuja');
    if (!(p > anterior)) sube = false;
    anterior = p;
  }
  ok(sube, `${id}: la presión crece con la temperatura (paso de 0,5 K)`);
  for (const t of [-20, 0, 20, 40]) {
    const b = presionSaturacion(id, t, 'burbuja'); const rr = presionSaturacion(id, t, 'rocio');
    if (b === null || rr === null) continue;
    ok(rr <= b + 1e-9, `${id} a ${t} °C: la presión de rocío no supera a la de burbuja`);
  }
}
for (const id of ['R-134a', 'R-32', 'R-290', 'R-22', 'R-744', 'R-717']) {
  const g = deslizamiento(id, 0);
  ok(g !== null && g < 0.01, `${id} (puro): deslizamiento nulo`, String(g));
}
const glides = [['R-407C', 4.5, 8.5], ['R-448A', 3.5, 7.5], ['R-449A', 3.5, 7.5], ['R-454B', 0.5, 2.5], ['R-404A', 0.2, 1.2], ['R-507A', 0, 0.1], ['R-410A', 0, 0.3], ['R-513A', 0, 0.3]];
for (const [id, a, b] of glides) {
  const g = deslizamiento(id, 0);
  ok(g !== null && g >= a && g <= b, `${id}: deslizamiento a 0 °C entre ${a} y ${b} K`, String(g?.toFixed(2)));
}
cerca(presionSaturacion('R-407C', 0, 'burbuja') - presionSaturacion('R-407C', 0, 'rocio'), 0.8, 0.5, 'R-407C a 0 °C: burbuja y rocío se separan unas décimas de bar', 0.2);

/* 7 ─ Fuera de la tabla ───────────────────────────────────────────────────── */
console.log('7. Fuera de la tabla');
ok(presionSaturacion('R-134a', -100) === null, 'R-134a a −100 °C: fuera');
ok(presionSaturacion('R-134a', 200) === null, 'R-134a a 200 °C: fuera');
ok(presionSaturacion('R-744', 40) === null, 'R-744 a 40 °C (supercrítico): fuera');
ok(presionSaturacion('R-134a', NaN) === null && presionSaturacion('R-134a', 'abc') === null, 'temperatura no numérica: null');
ok(presionSaturacion('R-999', 0) === null, 'gas desconocido: null');
ok(temperaturaSaturacion('R-134a', 0.001) === null && temperaturaSaturacion('R-134a', 500) === null, 'presión fuera de la tabla: null');
ok(temperaturaSaturacion('R-134a', -1) === null && temperaturaSaturacion('R-134a', 0) === null, 'presión ≤ 0: null');
const lim = rangoSaturacion('R-134a');
ok(presionSaturacion('R-134a', lim.burbuja.tMin) !== null && presionSaturacion('R-134a', lim.burbuja.tMax) !== null, 'los extremos exactos de la tabla sí tienen dato');

/* 8 ─ Rejilla y manómetro ─────────────────────────────────────────────────── */
console.log('8. Tabla en rejilla y manómetro');
const rej = tablaSaturacion('R-134a', { desde: -40, hasta: 60, paso: 10 });
ok(rej.length === 11, 'rejilla de 10 K entre −40 y 60 °C: 11 filas', String(rej.length));
ok(rej.every((f, i) => f.t === -40 + 10 * i), 'las temperaturas de la rejilla son exactas (sin error de coma flotante)');
ok(tablaSaturacion('R-134a', { desde: 60, hasta: -40, paso: 10 }).length === 0, 'rango invertido: sin filas');
ok(tablaSaturacion('R-134a', { desde: 0, hasta: 10, paso: 0 }).length === 0, 'paso 0: sin filas');
ok(tablaSaturacion('R-999').length === 0, 'gas desconocido: sin filas');
const rej744 = tablaSaturacion('R-744', { desde: 0, hasta: 50, paso: 10 });
ok(rej744.length === 3 && rej744[2].t === 20, 'R-744: la rejilla se corta antes del punto crítico (la tabla llega a 25 °C)', JSON.stringify(rej744.map((f) => f.t)));
cerca(aManometro(ATM), 0, 1, 'a presión atmosférica el manómetro marca 0', 1e-12);
cerca(aAbsoluta(aManometro(7.3)), 7.3, 1e-12, 'absoluta ↔ manómetro es reversible');
cerca(barAPsi(1), 14.5038, 1e-4, '1 bar = 14,5038 psi');
cerca(vacioEnInHg(-0.5), 14.765, 1e-3, '−0,5 bar de manómetro = 14,77 inHg de vacío');
ok(vacioEnInHg(0.3) === 0, 'con presión positiva no hay vacío');


/* 9 ─ Presiones de trabajo ─────────────────────────────────────────────────── */
console.log('9. Presiones de trabajo');
ok(GASES.length === 29, 'GASES tiene los 29 gases', String(GASES.length));
ok(GASES.every((g, i) => i === 0 || GASES[i - 1].id.localeCompare(g.id, 'es', { numeric: true }) < 0), 'GASES está en orden natural (R-12, R-22, R-32, R-134a…)');
ok(GASES[0].id === 'R-12' && GASES[3].id === 'R-134a', 'R-134a va después de R-32 (no entre R-12 y R-22)', GASES.slice(0, 5).map((g) => g.id).join(' '));
ok(GASES.every((g) => g.nombre && g.familia && g.seguridad && Number.isFinite(g.tMin) && Number.isFinite(g.tMax) && g.tMax > g.tMin), 'todos los gases tienen nombre, familia, clase y rango');
ok(GASES.every((g) => g.zeotropo === (g.mezcla && g.glide >= UMBRAL_DESLIZAMIENTO - 0.05)), 'zeotropo = mezcla con deslizamiento ≥ umbral');
ok(gas('R404A')?.id === 'R-404A' && gas('R-744 (CO₂)')?.id === 'R-744' && gas('R-999') === null, 'gas() reconoce variantes del nombre');
for (const id of ['R-407C', 'R-448A', 'R-449A', 'R-454B', 'R-452A', 'R-455A', 'R-404A']) ok(gas(id).zeotropo, `${id} se trata como zeótropo`);
for (const id of ['R-134a', 'R-410A', 'R-507A', 'R-513A', 'R-32', 'R-290']) ok(!gas(id).zeotropo, `${id} se trata como un solo punto`);
ok(gas('R-407C').aviso.includes('Deslizamiento de 6,1 K'), 'el aviso del R-407C lleva el deslizamiento calculado (6,1 K)', gas('R-407C').aviso);
ok(gas('R-744').ebullicion === null && gas('R-717').ebullicion < -33 && gas('R-717').ebullicion > -34, 'ebullición: R-744 no tiene, R-717 −33,3 °C');

// El ejemplo de las infografías: R-410A en reposo
const p25 = presionA('R-410A', 25); const p40 = presionA('R-410A', 40);
ok(p25.psi >= 224 && p25.psi <= 228, 'R-410A a 25 °C: 224–228 psi de manómetro', String(p25.psi));
ok(p40.psi >= 335 && p40.psi <= 339, 'R-410A a 40 °C: 335–339 psi de manómetro', String(p40.psi));
// Los errores que tenían las tablas escritas a mano
const p32 = presionA('R-32', 50);
ok(p32.absoluta > 30.5 && p32.absoluta < 32.5, 'R-32 a 50 °C: ≈31,4 bar absolutos (la tabla antigua decía 36,2)', String(p32.absoluta));
const p404 = presionA('R-404A', 40, 'rocio'); const p404b = presionA('R-404A', 40, 'burbuja');
ok(p404.absoluta < p404b.absoluta, 'R-404A: a 40 °C el rocío necesita menos presión que la burbuja');
ok(presionA('R-134a', 'abc') === null && presionA('R-134a', '') === null && presionA('R-999', 0) === null, 'datos no válidos: null');
ok(presionA('R-134a', -30).relativa < 0 && presionA('R-134a', -30).vacioInHg > 4, 'R-134a a −30 °C: vacío en el manómetro', JSON.stringify(presionA('R-134a', -30)));
ok(presionA('R-134a', -100).fueraDeTabla && presionA('R-134a', -100).minimo === -60, 'fuera de la tabla indica el rango');

const media = presionesDeTrabajo('R-134a', 'media', 30);
ok(media.evapMin.relativa > 0.9 && media.evapMin.relativa < 1.1, 'R-134a media temp.: aspiración a −10 °C ≈ 1,0 bar', String(media.evapMin.relativa));
ok(media.reposo.punto === 'burbuja' && media.evapMin.punto === 'rocio' && media.condMax.punto === 'rocio', 'reposo con burbuja; aspiración y alta con rocío');
{
  // en una mezcla las cinco presiones salen de la columna correcta (rocío para aspiración y alta, burbuja para reposo)
  const mz = presionesDeTrabajo('R-407C', 'media', 30);
  const pm = (t, punto) => Math.round((presionSaturacion('R-407C', t, punto) - ATM) * 100) / 100;
  ok(mz.evapMin.relativa === pm(-10, 'rocio') && mz.evapMax.relativa === pm(-5, 'rocio'), 'R-407C: aspiración con las presiones de rocío', JSON.stringify([mz.evapMin.relativa, pm(-10, 'rocio')]));
  ok(mz.condMin.relativa === pm(40, 'rocio') && mz.condMax.relativa === pm(45, 'rocio'), 'R-407C: alta con las presiones de rocío', JSON.stringify([mz.condMin.relativa, pm(40, 'rocio')]));
  ok(mz.reposo.relativa === pm(30, 'burbuja'), 'R-407C: reposo con la presión de burbuja', JSON.stringify([mz.reposo.relativa, pm(30, 'burbuja')]));
  ok(pm(30, 'burbuja') > pm(30, 'rocio') + 0.5, 'R-407C a 30 °C: burbuja y rocío se distinguen por más de medio bar');
  ok([mz.evapMin, mz.evapMax, mz.condMin, mz.condMax].every((x) => x.punto === 'rocio'), 'las cuatro presiones de trabajo declaran que son de rocío');
}
ok(media.tCondensacion[0] === 40 && media.tCondensacion[1] === 45, 'condensación = ambiente + 10…15 K', JSON.stringify(media.tCondensacion));
const dom = presionesDeTrabajo('R-600a', 'domestico', 25);
ok(dom.tCondensacion[0] === 37 && dom.tCondensacion[1] === 45, 'frigorífico doméstico: ambiente + 12…20 K', JSON.stringify(dom.tCondensacion));
const bc5 = presionesDeTrabajo('R-410A', 'bomba-calor', 5); const bc25 = presionesDeTrabajo('R-410A', 'bomba-calor', 25);
ok(bc5.tCondensacion[0] === 45 && bc25.tCondensacion[1] === 55, 'bomba de calor: la condensación es fija (45–55 °C), no depende del ambiente');
ok(bc5.condMax.absoluta === bc25.condMax.absoluta, 'bomba de calor: la presión de alta es la misma con 5 y con 25 °C de ambiente');
const co2 = presionesDeTrabajo('R-744', 'clima', 30);
ok(co2.condMin.fueraDeTabla && co2.reposo.fueraDeTabla, 'CO₂ a 30 °C de ambiente: fuera de la tabla (transcrítico)');
const co2f = presionesDeTrabajo('R-744', 'baja', 15);
ok(!co2f.evapMin.fueraDeTabla && co2f.evapMin.relativa > 10, 'CO₂ en congelación: presión de aspiración alta pero en tabla', JSON.stringify(co2f.evapMin));
for (const g of GASES) for (const a of APLICACIONES) {
  const t = presionesDeTrabajo(g.id, a.id, 25);
  ok(t && t.evapMin && t.condMin && t.reposo, `${g.id} / ${a.id}: devuelve todas las presiones (o su aviso de fuera de tabla)`);
}
ok(presionesDeTrabajo('R-999', 'clima') === null && presionesDeTrabajo('R-134a', 'nada') === null, 'gas o instalación desconocidos: null');

// Tablas por gas
ok(temperaturasDeTabla('R-134a').join() === '-50,-45,-40,-35,-30,-25,-20,-15,-10,-5,0,5,10,15,20,25,30,35,40,45,50,55,60', 'R-134a: de −50 a 60 °C de 5 en 5');
ok(temperaturasDeTabla('R-744').at(-1) === 25 && temperaturasDeTabla('R-744')[0] === -50, 'R-744: de −50 a 25 °C');
ok(temperaturasDeTabla('R-455A')[0] === -45, 'R-455A: empieza en −45 °C (su rocío no llega más abajo)', String(temperaturasDeTabla('R-455A')[0]));
ok(temperaturasDeTabla('R-999').length === 0, 'gas desconocido: sin temperaturas');
for (const g of GASES) {
  const temps = temperaturasDeTabla(g.id);
  const filas = tablaPT(g.id, { desde: temps[0], hasta: temps.at(-1), paso: 5 });
  ok(filas.length === temps.length, `${g.id}: la tabla tiene ${temps.length} filas`, String(filas.length));
  ok(filas.every((f) => f.burbuja && f.rocio), `${g.id}: cada fila tiene burbuja y rocío`);
  ok(filas.every((f, i) => i === 0 || f.burbuja.absoluta > filas[i - 1].burbuja.absoluta), `${g.id}: la presión de burbuja crece en cada fila`);
  if (!g.zeotropo) ok(filas.every((f) => Math.abs(f.burbuja.absoluta - f.rocio.absoluta) <= 0.12 + 0.01 * f.burbuja.absoluta), `${g.id}: burbuja y rocío casi iguales`);
}

/* 10 ─ Del manómetro a la temperatura ────────────────────────────────────── */
console.log('10. Manómetro → temperatura');
for (const g of GASES) {
  for (const t of [-20, 0, 20]) {
    const pAbs = presionSaturacion(g.id, t, 'rocio');
    if (pAbs === null) continue;
    const r = temperaturaA(g.id, String(pAbs - ATM));
    ok(r && !r.fueraDeTabla && Math.abs(r.temperatura - t) <= 0.06, `${g.id}: ${t} °C → manómetro → ${t} °C`, JSON.stringify(r));
  }
}
const lect = temperaturaA('R-407C', '3,5');
ok(lect.zeotropo && lect.burbuja !== null && lect.burbuja < lect.temperatura - 4, 'R-407C a 3,5 bar: el rocío es varios K más caliente que la burbuja', JSON.stringify(lect));
const puro = temperaturaA('R-134a', '2.0');
ok(!puro.zeotropo && puro.burbuja === null && puro.temperatura > 0.5 && puro.temperatura < 1.1, 'R-134a a 2,0 bar de manómetro (3,01 absolutos): un solo valor, ≈ 0,8 °C', JSON.stringify(puro));
ok(temperaturaA('R-134a', '999').fueraDeTabla, 'una presión imposible queda fuera de la tabla');
ok(temperaturaA('R-134a', '') === null && temperaturaA('R-134a', 'x') === null && temperaturaA('R-999', '1') === null, 'lectura vacía o inválida: null');
ok(temperaturaA('R-134a', '-0,5').temperatura < -10, 'con vacío (−0,5 bar) la temperatura es negativa y se calcula');

/* 11 ─ Carga de gas ───────────────────────────────────────────────────────── */
console.log('11. Carga de gas');
const c1 = calcularCarga({ cargaFabrica: 1000, metrosIncluidos: 5, metrosReales: 12, gramosPorMetro: 20 });
ok(c1.completo && c1.total === 1140 && c1.extra === 140 && c1.metrosDeMas === 7, 'precarga 1000 g + (12 − 5) m × 20 g/m = 1140 g', JSON.stringify(c1));
const c2 = calcularCarga({ cargaFabrica: 1000, metrosIncluidos: 5, metrosReales: 3, gramosPorMetro: 20 });
ok(c2.total === 1000, 'línea más corta que la precarga: no se resta gas por defecto', String(c2.total));
const c3 = calcularCarga({ cargaFabrica: 1000, metrosIncluidos: 5, metrosReales: 3, gramosPorMetro: 20, restarSiCorta: true });
ok(c3.total === 960, 'línea más corta con «restar»: 1000 − 2 m × 20 g/m = 960 g', String(c3.total));
const c4 = calcularCarga({ cargaFabrica: '1,2', metrosIncluidos: '5', metrosReales: '5', gramosPorMetro: '20' });
ok(c4.completo && c4.total === 1, 'admite coma decimal en los datos', JSON.stringify(c4));
const c5 = calcularCarga({ cargaFabrica: 1000, metrosIncluidos: 5, metrosReales: 12, gramosPorMetro: 20, cargaActual: 1000 });
ok(c5.accion === 'anadir' && c5.gramosAAnadir === 140 && c5.gramosASacar === 0, 'si tiene 1000 y le tocan 1140: añadir 140 g', JSON.stringify(c5));
const c6 = calcularCarga({ cargaFabrica: 1000, metrosIncluidos: 5, metrosReales: 12, gramosPorMetro: 20, cargaActual: 1300 });
ok(c6.accion === 'sacar' && c6.gramosASacar === 160, 'si tiene 1300 y le tocan 1140: sacar 160 g', JSON.stringify(c6));
const c7 = calcularCarga({ cargaFabrica: 1000, metrosIncluidos: 5, metrosReales: 12, gramosPorMetro: 20, cargaActual: 1140 });
ok(c7.accion === 'nada', 'si tiene lo que le toca: no tocar nada');
const c8 = calcularCarga({ cargaFabrica: '', metrosIncluidos: 5, metrosReales: 12, gramosPorMetro: '' });
ok(!c8.completo && c8.faltan.length === 2, 'faltan datos: lo dice', JSON.stringify(c8));
const c9 = calcularCarga({ cargaFabrica: 1000, metrosIncluidos: 5, metrosReales: 12, gramosPorMetro: 20, cargaActual: 500 });
ok(c9.avisos.some((a) => a.includes('fuga')), 'una desviación grande avisa de posible fuga');

/* Resumen ─────────────────────────────────────────────────────────────── */
console.log(fallos ? `\n${pruebas} comprobaciones, ${fallos} FALLOS` : `\n${pruebas} comprobaciones, 0 fallos`);
process.exit(fallos ? 1 : 0);
