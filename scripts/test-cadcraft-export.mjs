import assert from 'node:assert/strict';
import { construirDXFCadcraft } from '../src/lib/planoCadcraftExport.js';
import { parsearDXF, dxfAParedes, fusionarDesdeCadcraft } from '../src/lib/planoDxfImport.js';
const plan = {
  scale: 50,
  walls: [{ id: 'a', x1: 40, y1: 40, x2: 240, y2: 40, material: 'pladur', alto_m: 2.7 }, { id: 'b', x1: 240, y1: 40, x2: 240, y2: 190, material: 'ladrillo', espesor_mm: 150 }],
  elements: [{ id: 'e', type: 'compresor', x: 100, y: 100, rot: 90 }, { id: 'x', type: 'texto', x: 0, y: 0 }],
};
const r = construirDXFCadcraft(plan);
assert.equal(r.paredes, 2); assert.equal(r.equipos, 1);
const p = parsearDXF(r.texto);
assert.equal(p.valido, true); assert.equal(p.equipos.length, 1); assert.equal(p.equipos[0].nombre, 'EQ-COMPRESOR');
assert.ok(Object.keys(p.capas).includes('PARED-PLADUR'));
const back = dxfAParedes(p, { capas: ['PARED-PLADUR', 'PARED-LADRILLO'], unidad: 'm', escala: 50 });
assert.equal(back.paredes.length, 2);
assert.equal(back.paredes.find((w) => w.material === 'pladur').alto_m, 2.7);
assert.equal(back.paredes.find((w) => w.material === 'ladrillo').espesor_mm, 150);
assert.equal(back.elementos[0].type, 'compresor'); assert.equal(back.elementos[0].rot, 90);
const largo = (w) => Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
assert.equal(Math.round(largo(back.paredes.find((w) => w.material === 'pladur'))), 200);
// Vuelta de CADCraft: el equipo movido conserva su id (y sus conexiones).
const plan2 = { ...plan, elements: [{ id: 'e', type: 'compresor', x: 100, y: 100, rot: 90, brand: 'Bitzer' }, { id: 'v', type: 'evaporador', x: 300, y: 100 }, { id: 'tx', type: 'texto', x: 1, y: 1 }], connections: [{ id: 'c', from_id: 'e', to_id: 'v' }] };
const exp = construirDXFCadcraft(plan2);
const movido = exp.texto.replace(/10\n2\n20\n-2\n/, '10\n2.5\n20\n-2\n'); // compresor movido 0,5 m
const res = dxfAParedes(parsearDXF(movido), { capas: ['PARED-PLADUR', 'PARED-LADRILLO'], unidad: 'm', escala: 50, tal_cual: true });
const f = fusionarDesdeCadcraft(plan2, res);
assert.equal(f.elements.find((e) => e.id === 'e').brand, 'Bitzer');
assert.equal(Math.round(f.elements.find((e) => e.id === 'e').x), 125);
assert.ok(f.elements.some((e) => e.id === 'tx'));
assert.equal(f.connections.length, 1); assert.equal(f.nuevos, 0);
console.log('cadcraft-export OK');
