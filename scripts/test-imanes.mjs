import assert from 'node:assert/strict';
import { puntosImantables, imanCercano, parsearMedida, extremoConLargo } from '../src/lib/planoImanes.js';
const pts = puntosImantables([{ x1: 0, y1: 0, x2: 100, y2: 0 }], [{ x: 50, y: 80 }]);
assert.equal(pts.length, 3);
assert.deepEqual(imanCercano({ x: 98, y: 3 }, pts, 10), { x: 100, y: 0, tipo: 'extremo' });
assert.equal(imanCercano({ x: 300, y: 300 }, pts, 10), null);
assert.deepEqual(imanCercano({ x: 52, y: 40 }, pts, 10), { x: 50, y: 40, tipo: 'alineado' });
assert.equal(parsearMedida('2,35'), 2.35); assert.equal(parsearMedida('abc'), null); assert.equal(parsearMedida('0'), null);
const e = extremoConLargo({ x: 0, y: 0 }, { x: 10, y: 0 }, 150); assert.deepEqual(e, { x: 150, y: 0 });
console.log('imanes OK');

import { distanciasAParedes, ladoMasCercano, colocarADistancia, cajaDeElemento, textoMetros } from '../src/lib/planoImanes.js';
// Los equipos ya no son puntos de imán (solo las paredes), salvo que se pida.
assert.equal(puntosImantables([{ x1: 0, y1: 0, x2: 100, y2: 0 }], [{ x: 50, y: 80 }]).some((q) => q.tipo === 'equipo'), false);
assert.equal(puntosImantables([], [{ x: 50, y: 80 }], { conElementos: true }).some((q) => q.tipo === 'equipo'), true);
// Habitación de 400×300 px a 50 px/m (8 × 6 m) y un equipo de 1 × 0,5 m dentro.
const paredes = [
  { id: 'a', x1: 0, y1: 0, x2: 400, y2: 0 }, { id: 'b', x1: 400, y1: 0, x2: 400, y2: 300 },
  { id: 'c', x1: 400, y1: 300, x2: 0, y2: 300 }, { id: 'd', x1: 0, y1: 300, x2: 0, y2: 0 },
];
const eq = { x: 100, y: 100, w_m: 1, h_m: 0.5, rot: 0 };
const d = distanciasAParedes(eq, paredes, 50);
assert.equal(Math.round(d.izq.m * 1000) / 1000, 1.5);   // (100-25)/50
assert.equal(Math.round(d.der.m * 1000) / 1000, 5.5);
assert.equal(Math.round(d.arriba.m * 1000) / 1000, 1.75); // (100-12,5)/50
assert.equal(Math.round(d.abajo.m * 1000) / 1000, 3.75);
assert.equal(ladoMasCercano(d), 'izq');
assert.equal(ladoMasCercano({ izq: null, der: null }), null);
// Poner el lado izquierdo a 37,5 cm exactos de la pared (milímetros, no solo 1 m o 0,5 m).
const n = colocarADistancia(eq, paredes, 50, 'izq', 0.375);
const d2 = distanciasAParedes({ ...eq, ...n }, paredes, 50);
assert.equal(Math.round(d2.izq.m * 1000) / 1000, 0.375);
assert.equal(n.y, eq.y);                         // solo se mueve en el eje de ese lado
const n2 = colocarADistancia(eq, paredes, 50, 'abajo', 1.2);
assert.equal(Math.round(distanciasAParedes({ ...eq, ...n2 }, paredes, 50).abajo.m * 1000) / 1000, 1.2);
// Con el equipo girado 90° la caja se intercambia.
const c90 = cajaDeElemento({ x: 100, y: 100, w_m: 1, h_m: 0.5, rot: 90 }, 50);
assert.ok(Math.abs((c90.x1 - c90.x0) - 25) < 1e-6 && Math.abs((c90.y1 - c90.y0) - 50) < 1e-6);
// Se mide hasta la CARA de la pared cuando tiene grueso (pared de 200 mm → 0,1 m menos).
const gruesas = paredes.map((w) => ({ ...w, espesor_mm: 200 }));
assert.equal(Math.round(distanciasAParedes(eq, gruesas, 50).izq.m * 1000) / 1000, 1.4);
// Sin pared en esa dirección: null; pared paralela no cuenta.
assert.equal(distanciasAParedes(eq, [{ x1: 0, y1: 0, x2: 400, y2: 0 }], 50).izq, null);
assert.equal(textoMetros(1.2345), '1,235 m');
assert.equal(colocarADistancia(eq, [], 50, 'izq', 1), null);
console.log('imanes y distancias ok');
