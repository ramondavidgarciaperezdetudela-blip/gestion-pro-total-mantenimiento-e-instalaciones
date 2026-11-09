import assert from 'node:assert/strict';
import { leerMargen, margenMasComun, planificar, articulosDelAmbito, aplicarEnLotes } from '../src/lib/margenMasivo.js';
import { formatearTiempo, estimarRestante } from '../src/lib/progresoTiempo.js';

assert.equal(leerMargen('35,5'), 35.5); assert.equal(leerMargen(''), null); assert.equal(leerMargen('5000'), null); assert.equal(leerMargen('-95'), null);
const items = [
  { id: 1, supplier_id: 'a', cost_price: 100, sale_price: 130, margin: 30 },
  { id: 2, supplier_id: 'a', cost_price: 10, sale_price: 13, margin: 30 },
  { id: 3, supplier_id: 'b', cost_price: 50, margin: 30 },
  { id: 4, supplier_id: 'b', cost_price: 0, margin: 30 },
  { id: 5, supplier_id: 'c', cost_price: 20, sale_price: 21, margin: 5 }
];
assert.deepEqual(margenMasComun(items), { margen: 30, n: 4 });
let p = planificar(items, 40);
assert.deepEqual(p.cambios.map((c) => [c.id, c.sale_price]), [[1, 140], [2, 14], [3, 70], [5, 28]]);
assert.equal(p.sinCoste, 1);
p = planificar(items, 30); assert.equal(p.yaIgual, 2); assert.deepEqual(p.cambios.map((c) => c.id), [3, 5], 'el 3 no tenía venta y el 5 tenía otro margen');
assert.deepEqual(planificar(items, 40, { soloSinVenta: true }).cambios.map((c) => c.id), [3]);
assert.equal(articulosDelAmbito(items, 'todas').length, 5);
assert.deepEqual(articulosDelAmbito(items, 'seleccion', ['a', 'c']).map((i) => i.id), [1, 2, 5]);
assert.deepEqual(articulosDelAmbito(items, 'una', ['b']).map((i) => i.id), [3, 4]);

const aplicados = []; const prog = [];
let r = await aplicarEnLotes(planificar(items, 40).cambios, async (c) => { if (c.id === 2) throw new Error('boom'); aplicados.push(c.id); }, { concurrencia: 2, onProgreso: (a, t) => prog.push([a, t]) });
assert.equal(r.hechos, 3); assert.deepEqual(r.fallos.map((f) => f.id), [2]); assert.deepEqual(prog.at(-1), [4, 4]);
const ctl = { aborted: false };
r = await aplicarEnLotes([{ id: 1 }, { id: 2 }, { id: 3 }], async (c) => { if (c.id === 1) ctl.aborted = true; }, { concurrencia: 1, senal: ctl });
assert.ok(r.cancelado && r.hechos === 1);

assert.equal(formatearTiempo(65), '01:05'); assert.equal(formatearTiempo(3725), '1:02:05'); assert.equal(formatearTiempo(null), '—');
assert.equal(estimarRestante(0.5, 30), 30); assert.equal(estimarRestante(0.01, 30), null); assert.equal(estimarRestante(0.5, 1), null); assert.equal(estimarRestante(1, 40), 0);
console.log('margen masivo y tiempos: OK');
