import assert from 'node:assert/strict';
import { cambiarLargoPared, largoPared, espesorPared, MATERIALES_PARED } from '../src/lib/planoParedes.js';
const walls = [
  { id: 'a', x1: 0, y1: 0, x2: 100, y2: 0 },
  { id: 'b', x1: 100, y1: 0, x2: 100, y2: 100 },
  { id: 'c', x1: 500, y1: 500, x2: 600, y2: 500 },
];
assert.equal(largoPared(walls[0], 50), 2);
const r = cambiarLargoPared(walls, 'a', 3, 50);
assert.equal(r[0].x2, 150); assert.equal(r[0].y2, 0);
assert.equal(r[1].x1, 150, 'la pared encadenada sigue');
assert.deepEqual(r[2], walls[2]);
assert.equal(cambiarLargoPared(walls, 'a', 0, 50), walls);
assert.equal(espesorPared({ material: 'pladur' }), 0.078);
assert.equal(espesorPared({ material: 'pladur', espesor_mm: 150 }), 0.15);
assert.equal(espesorPared({}), 0.1);
assert.ok(MATERIALES_PARED.some((m) => m.id === 'bloque_hormigon'));
console.log('paredes OK');
