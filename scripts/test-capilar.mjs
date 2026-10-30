/**
 * Pruebas del cálculo de capilares (src/lib/capilar.js) y de las unidades de potencia.
 *
 *   npm run test:capilar
 *
 * Qué comprueba:
 *   1. Tres casos contra la referencia hecha con CoolProp (resolviendo las ecuaciones sin
 *      interpolar), con tolerancia del 1 %.
 *   2. Que la función inversa (longitud → caudal) devuelve el caudal de partida.
 *   3. Las propiedades físicas que tiene que cumplir cualquier resultado: la longitud crece con
 *      el diámetro (≈ D^4,75), con la presión de condensación y con la restricción del caudal.
 *   4. Que los 29 gases dan números finitos y coherentes.
 *   5. Que los datos fuera de rango se rechazan con un mensaje en español.
 *
 * Termina con código 1 si algo falla, para poder usarlo en la integración continua.
 */
import {
  crearContexto,
  longitudParaCaudal,
  caudalParaLongitud,
  tablaDiametros,
  diametroSugerido,
  diametroExterior,
  listaGases,
  sensibilidadLongitud,
  cartaCapacidades,
  valorarLongitud,
} from '../src/lib/capilar.js';
import { aWatios, deWatios } from '../src/lib/potencia.js';

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

/* 1 ─ Referencia CoolProp ─────────────────────────────────────────────── */
console.log('1. Referencia CoolProp');
const casos = [
  { gas: 'R-134a', Te: -23.3, Tc: 54.4, subenf: 0, recal: 0, Q: 150, ref: { 0.6: 0.44, 0.7: 1.09, 0.8: 2.29, 0.9: 4.28, 1.0: 7.38, 1.2: 18.58 } },
  { gas: 'R-134a', Te: -25, Tc: 45, subenf: 5, recal: 10, Q: 120, ref: { 0.6: 1.3, 0.7: 2.95, 0.8: 5.84, 0.9: 10.55, 1.0: 17.77, 1.2: 43.29 } },
  { gas: 'R-600a', Te: -25, Tc: 45, subenf: 3, recal: 5, Q: 100, ref: { 0.6: 0.82, 0.7: 1.89, 0.8: 3.78, 0.9: 6.83 } },
];
for (const c of casos) {
  const ctx = crearContexto(c);
  ok(ctx.ok, `${c.gas}: contexto válido`, ctx.error);
  if (!ctx.ok) continue;
  const mdot = c.Q / (ctx.q0 * 1e3);
  for (const [d, Lref] of Object.entries(c.ref)) {
    const r = longitudParaCaudal(ctx, d / 1000, mdot);
    // la referencia está redondeada a 0,01 m: se admite ese error absoluto además del 1 %
    cerca(r.L, Lref, 0.01, `${c.gas} Te${c.Te}/Tc${c.Tc} Ø${d} mm`, 0.011);
  }
}

/* 2 ─ Inversa ──────────────────────────────────────────────────────────── */
console.log('2. Función inversa');
for (const c of casos) {
  const ctx = crearContexto(c);
  const mdot = c.Q / (ctx.q0 * 1e3);
  for (const d of [0.7, 0.9, 1.1]) {
    const dir = longitudParaCaudal(ctx, d / 1000, mdot);
    if (dir.imposible) continue;
    const inv = caudalParaLongitud(ctx, d / 1000, dir.L);
    cerca(inv.mdot, mdot, 1e-4, `${c.gas} Ø${d}: inversa(directa) = caudal de partida`);
    cerca(inv.Q, c.Q, 1e-4, `${c.gas} Ø${d}: potencia recuperada`);
  }
}

/* 3 ─ Propiedades físicas ──────────────────────────────────────────────── */
console.log('3. Propiedades físicas');
{
  const c = casos[1];
  const ctx = crearContexto(c);
  const mdot = c.Q / (ctx.q0 * 1e3);
  const tabla = tablaDiametros(ctx, mdot);
  const validos = tabla.filter((r) => !r.imposible);
  for (let i = 1; i < validos.length; i++) ok(validos[i].L > validos[i - 1].L, `L crece con el diámetro (${validos[i - 1].dmm} → ${validos[i].dmm} mm)`);

  const L08 = longitudParaCaudal(ctx, 0.0008, mdot).L;
  const L10 = longitudParaCaudal(ctx, 0.001, mdot).L;
  const exponente = Math.log(L10 / L08) / Math.log(1.25);
  ok(exponente > 4.3 && exponente < 5.6, 'L ∝ D^n con n ≈ 4,75', `n = ${exponente.toFixed(2)}`);

  // más caudal ⇒ tubo más corto
  const L1 = longitudParaCaudal(ctx, 0.0009, mdot * 0.8).L;
  const L2 = longitudParaCaudal(ctx, 0.0009, mdot * 1.0).L;
  const L3 = longitudParaCaudal(ctx, 0.0009, mdot * 1.2).L;
  ok(L1 > L2 && L2 > L3, 'L decrece al aumentar el caudal', `${L1.toFixed(2)} > ${L2.toFixed(2)} > ${L3.toFixed(2)}`);

  // a caudal fijo, más presión de condensación ⇒ hay que disipar más presión ⇒ tubo más largo
  let previa = 0;
  for (const Tc of [35, 40, 45, 50, 55]) {
    const x = crearContexto({ gas: 'R-134a', Te: -20, Tc, subenf: 5, recal: 5 });
    const L = longitudParaCaudal(x, 0.0009, mdot).L;
    ok(L > previa, `a caudal fijo, L crece con Tc (${Tc} °C)`, `${L.toFixed(2)} m`);
    previa = L;
  }

  // flujo estrangulado ⇒ la presión de salida no baja de la del evaporador; sin estrangular ⇒ iguala la del evaporador
  for (const r of tabla.filter((t) => !t.imposible)) {
    if (r.estrangulado) ok(r.Psalida >= ctx.Pe * 0.999, `Ø${r.dmm}: estrangulado, Psalida ≥ Pe`, `${r.Psalida.toFixed(3)} vs ${ctx.Pe.toFixed(3)}`);
    else cerca(r.Psalida, ctx.Pe, 2e-3, `Ø${r.dmm}: sin estrangular, Psalida = Pe`);
    ok(r.xSalida >= 0 && r.xSalida <= 1, `Ø${r.dmm}: título de salida entre 0 y 1`);
    ok(Math.abs(r.L - (r.Lliq + r.L2f)) < 1e-9, `Ø${r.dmm}: L = Lliq + L2f`);
  }

  // sensibilidad: ±10 % de longitud mueve el caudal algo menos de ±10 %
  const dsug = diametroSugerido(tabla);
  const fila = tabla.find((t) => t.dmm === dsug);
  const s = sensibilidadLongitud(ctx, dsug / 1000, fila.L, 0.1);
  ok(s.masLargo < 0 && s.masCorto > 0, 'sensibilidad: más largo ⇒ menos caudal; más corto ⇒ más', `${s.masLargo.toFixed(1)} % / +${s.masCorto.toFixed(1)} %`);
  ok(Math.abs(s.masLargo) > 3 && Math.abs(s.masLargo) < 11 && s.masCorto > 3 && s.masCorto < 15, 'sensibilidad de orden razonable');

  // carta de selección: crece con el diámetro y decrece con la longitud
  const carta = cartaCapacidades(ctx, [0.7, 0.8, 0.9], [1, 2, 3]);
  for (let i = 0; i < carta.length; i++)
    for (let j = 0; j < 3; j++) {
      if (i > 0) ok(carta[i].celdas[j].Q > carta[i - 1].celdas[j].Q, `carta: capacidad crece con el diámetro (${carta[i].dmm} mm, ${carta[i].celdas[j].L} m)`);
      if (j > 0) ok(carta[i].celdas[j].Q < carta[i].celdas[j - 1].Q, `carta: capacidad decrece con la longitud (${carta[i].dmm} mm, ${carta[i].celdas[j].L} m)`);
    }
}

/* Diámetros exteriores y valoración */
ok(diametroExterior(0.8) === 2, 'Ø ext. de 0,8 mm = 2,0 mm');
ok(diametroExterior(1.0) === 2, 'Ø ext. de 1,0 mm = 2,0 mm');
ok(diametroExterior(1.1) === 2.5, 'Ø ext. de 1,1 mm = 2,5 mm');
ok(diametroExterior(1.6) === 3, 'Ø ext. de 1,6 mm = 3,0 mm');
ok(valorarLongitud({ L: 2 }).clave === 'optimo', 'valoración: 2 m recomendado');
ok(valorarLongitud({ L: 0.3 }).clave === 'corto', 'valoración: 0,3 m demasiado corto');
ok(valorarLongitud({ L: 9 }).clave === 'muylargo', 'valoración: 9 m demasiado largo');
ok(valorarLongitud({ imposible: true }).clave === 'imposible', 'valoración: imposible');

/* 4 ─ Los 29 gases ─────────────────────────────────────────────────────── */
console.log('4. Barrido de todos los gases');
const gases = listaGases();
ok(gases.length >= 29, `hay al menos 29 gases (${gases.length})`);
for (const gas of gases) {
  const Tc = Math.min(40, gas.TcMax - 2);
  const Te = Math.max(-25, gas.TeMin + 1);
  const ctx = crearContexto({ gas: gas.id, Te, Tc, subenf: 3, recal: 5 });
  ok(ctx.ok, `${gas.id}: contexto válido (Te ${Te}, Tc ${Tc})`, ctx.error);
  if (!ctx.ok) continue;
  ok(ctx.q0 > 20 && ctx.q0 < 1500, `${gas.id}: efecto frigorífico razonable`, `${ctx.q0.toFixed(1)} kJ/kg`);
  ok(ctx.Pc > ctx.Pe, `${gas.id}: Pc > Pe`);
  const mdot = 500 / (ctx.q0 * 1e3);
  const tabla = tablaDiametros(ctx, mdot);
  const malos = tabla.filter((r) => !r.imposible && (![r.L, r.Psalida, r.xSalida, r.velSalida, r.TSalida].every(Number.isFinite) || r.L < 0));
  ok(malos.length === 0, `${gas.id}: sin valores no finitos`, malos.map((m) => m.dmm).join(','));
  const Ls = tabla.filter((r) => !r.imposible).map((r) => r.L);
  ok(Ls.every((v, i) => i === 0 || v >= Ls[i - 1]), `${gas.id}: L no decrece con el diámetro`);
  const dsug = diametroSugerido(tabla);
  if (dsug) {
    const fila = tabla.find((r) => r.dmm === dsug);
    const inv = caudalParaLongitud(ctx, dsug / 1000, fila.L);
    cerca(inv.mdot, mdot, 2e-4, `${gas.id}: inversa en el diámetro sugerido (Ø${dsug})`);
  }
}

/* 5 ─ Datos no válidos ─────────────────────────────────────────────────── */
console.log('5. Rechazo de datos no válidos');
const malo = (cond, parte) => {
  const c = crearContexto(cond);
  ok(c.ok === false && typeof c.error === 'string' && c.error.length > 10, `rechaza ${parte}`, JSON.stringify(c.error));
};
malo({ gas: 'R-999', Te: -10, Tc: 40 }, 'un gas desconocido');
malo({ gas: 'R-134a', Te: -90, Tc: 40 }, 'Te por debajo del rango');
malo({ gas: 'R-134a', Te: -10, Tc: 200 }, 'Tc por encima del rango');
malo({ gas: 'R-134a', Te: 30, Tc: 20 }, 'Tc ≤ Te');
malo({ gas: 'R-134a', Te: -10, Tc: 40, subenf: 60 }, 'un subenfriamiento de 60 K');
malo({ gas: 'R-134a', Te: -10, Tc: 40, recal: -5 }, 'un recalentamiento negativo');
malo({ gas: 'R-134a', Te: NaN, Tc: 40 }, 'Te no numérica');

/* 6 ─ Unidades de potencia ─────────────────────────────────────────────── */
console.log('6. Unidades de potencia');
cerca(aWatios(1, 'kW'), 1000, 1e-12, '1 kW = 1000 W');
cerca(aWatios(1000, 'kcal/h'), 1163, 1e-9, '1000 kcal/h = 1163 W');
cerca(aWatios(12000, 'BTU/h'), 3516.85, 1e-5, '12 000 BTU/h = 3516,85 W');
cerca(aWatios(1, 'TR'), 3516.85, 1e-5, '1 TR = 3516,85 W');
cerca(deWatios(aWatios(750, 'kcal/h'), 'kcal/h'), 750, 1e-12, 'ida y vuelta kcal/h');
ok(Number.isNaN(aWatios(NaN, 'W')), 'NaN se propaga');

console.log(`\n${pruebas} comprobaciones, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
