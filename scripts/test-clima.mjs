// Pruebas del diagnóstico de splits: la presión y la temperatura de saturación salen de las tablas de cada gas.
import { tempSaturacion, presionSaturacion, calculoClima, GASES_CLIMA } from '../src/lib/diagnosticoClima.js';
import { presionSaturacion as presAbs, ATM } from '../src/lib/saturacion.js';

let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const cerca = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= tol;

console.log('1. Ida y vuelta presión ↔ temperatura');
for (const g of GASES_CLIMA) {
  for (const t of [-20, -10, 0, 5, 10, 20, 35, 45]) {
    const p = presionSaturacion(g, t);
    if (p == null) continue;
    ok(cerca(p, presAbs(g, t) - ATM, 0.006), `${g} ${t} °C: presión manométrica = absoluta − 1,013`, String(p));
    ok(cerca(tempSaturacion(g, p), t, 0.15), `${g} ${t} °C: vuelve a la misma temperatura`, String(tempSaturacion(g, p)));
  }
}

console.log('2. Valores conocidos (CoolProp)');
ok(cerca(presionSaturacion('R-410A', 5), 8.32, 0.05), 'R-410A a 5 °C: 8,3 bar');
ok(cerca(presionSaturacion('R-134a', 0), 1.91, 0.05), 'R-134a a 0 °C: 1,9 bar');
ok(cerca(presionSaturacion('R-22', 5), 4.83, 0.05), 'R-22 a 5 °C: 4,8 bar');
ok(cerca(presionSaturacion('R-32', 45), 26.8, 0.4), 'R-32 a 45 °C: ≈ 26,8 bar');

console.log('3. Mezclas: rocío por encima de burbuja');
for (const g of ['R-407C', 'R-454B']) {
  const p = 6;
  const r = tempSaturacion(g, p, 'rocio'), b = tempSaturacion(g, p, 'burbuja');
  ok(r > b, `${g}: a la misma presión el rocío es más caliente que la burbuja`, `${r} / ${b}`);
}
ok(cerca(tempSaturacion('R-410A', 8, 'rocio'), tempSaturacion('R-410A', 8, 'burbuja'), 0.4), 'R-410A (casi puro): rocío ≈ burbuja');
ok(tempSaturacion('R-407C', 6, 'rocio') - tempSaturacion('R-407C', 6, 'burbuja') > 4, 'R-407C: deslizamiento de más de 4 K');

console.log('4. Recalentamiento con rocío y subenfriamiento con burbuja');
{
  const pB = 4.57, pA = 16.08;
  const c = calculoClima({ gas: 'R-407C', pBaja: pB, pAlta: pA, tAspiracion: 12, tLiquido: 35 });
  ok(cerca(c.tEvap, tempSaturacion('R-407C', pB, 'rocio'), 0.01), 'evaporación = rocío');
  ok(cerca(c.recalentamiento, 12 - c.tEvap, 0.06), 'recalentamiento = aspiración − rocío', String(c.recalentamiento));
  const burbuja = tempSaturacion('R-407C', pA, 'burbuja');
  ok(cerca(c.subenfriamiento, burbuja - 35, 0.06), 'subenfriamiento = burbuja − líquido', String(c.subenfriamiento));
  ok(c.subenfriamiento < c.tCond - 35, 'con rocío saldría un subenfriamiento mayor (y falso)');
  ok(cerca(c.relacionCompresion, (pA + ATM) / (pB + ATM), 0.01), 'relación de compresión con presiones absolutas');
}
{
  // temperatura leída a mano: manda sobre la calculada
  const c = calculoClima({ gas: 'R-410A', pBaja: 8.3, tEvapManual: 4, tAspiracion: 10 });
  ok(c.tEvap === 4 && c.recalentamiento === 6, 'la temperatura leída en el manómetro manda');
  ok(c.desvioManometro != null && Math.abs(c.desvioManometro + 1) < 0.2, 'avisa del desvío del manómetro', String(c.desvioManometro));
}

console.log('5. Fuera de tabla y datos raros');
ok(presionSaturacion('R-410A', 90) === null, 'temperatura fuera de la tabla → null');
ok(tempSaturacion('R-410A', 300) === null, 'presión fuera de la tabla → null');
ok(tempSaturacion('R-999', 5) === null, 'gas sin tabla → null');
ok(tempSaturacion('R-410A', '') === null && tempSaturacion('R-410A', 'abc') === null, 'texto vacío o no numérico → null');
ok(cerca(tempSaturacion('R-410A', '8,3'), 5, 0.1), 'acepta la coma decimal');
{
  const c = calculoClima({ gas: 'R-999', pBaja: 5, tAspiracion: 10 });
  ok(c.tEvap === null && c.recalentamiento === null, 'sin tabla no inventa el recalentamiento');
}

console.log(`\n${total} comprobaciones, ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
