import assert from 'node:assert/strict';
import { buscarPorTexto, articuloDeTarifa, articuloDePropio, norm, indexar, buscarIndexado } from '../src/lib/buscarArticulos.js';
const lista = [
  articuloDeTarifa({ product_code: 'MDB635EB13XX', product_name: 'Equipo frigorífico ZANOTTI partido axial R134A 400V', supplier_name: 'Zanotti', sale_price: 19849.69 }),
  articuloDeTarifa({ product_code: 'ZX100', product_name: 'Evaporador cúbico 2 ventiladores', supplier_name: 'Zanotti', cost_price: 800 }),
  articuloDePropio({ reference: 'KIDE-PP', description: 'Puerta pivotante KIDE refrigeración 800x1900', unit_price: 640, supplier_name: 'KIDE' }),
  articuloDePropio({ reference: 'TUB-1/2', description: 'Tubería de cobre aislada 1/2"', unit_price: 9.5 }),
];
// por código (completo y parcial)
assert.equal(buscarPorTexto(lista, 'MDB635EB13XX')[0].ref, 'MDB635EB13XX');
assert.equal(buscarPorTexto(lista, 'mdb635')[0].ref, 'MDB635EB13XX');
// por nombre / trozo de descripción, sin tildes ni mayúsculas
assert.equal(buscarPorTexto(lista, 'frigorifico zanotti')[0].ref, 'MDB635EB13XX');
assert.equal(buscarPorTexto(lista, 'PIVOTANTE')[0].ref, 'KIDE-PP');
assert.equal(buscarPorTexto(lista, 'cobre 1/2')[0].ref, 'TUB-1/2');
// varias palabras en cualquier orden
assert.equal(buscarPorTexto(lista, '400v axial')[0].ref, 'MDB635EB13XX');
// lo que no está
assert.equal(buscarPorTexto(lista, 'compresor').length, 0);
assert.equal(buscarPorTexto(lista, 'a').length, 0);
// orden: código exacto antes que coincidencia en nombre
const l2 = [articuloDePropio({ description: 'Cable ZX100 especial', reference: 'C1' }), articuloDeTarifa({ product_code: 'ZX100', product_name: 'Otro' })];
assert.equal(buscarPorTexto(l2, 'zx100')[0].ref, 'ZX100');
// máximo y duplicados
const muchos = Array.from({ length: 30 }, (_, i) => articuloDePropio({ reference: `R${i}`, description: 'Tornillo cabeza plana' }));
assert.equal(buscarPorTexto(muchos, 'tornillo', 5).length, 5);
assert.equal(buscarPorTexto([muchos[0], muchos[0]], 'tornillo').length, 1);
assert.equal(norm('  ÁÉÍ  '), 'aei');

// ── Búsqueda indexada con filtro de proveedor ──
const L = indexar([
  articuloDeTarifa({ product_code: 'CU-1/2-A', product_name: 'Tubería de cobre aislada 1/2"', supplier_name: 'Salvador Escoda', sale_price: 9 }),
  articuloDeTarifa({ product_code: 'CU12', product_name: 'Tubo cobre recocido 1/2 pulgada', supplier_name: 'Frigicoll', sale_price: 8 }),
  articuloDeTarifa({ product_code: 'MDB635', product_name: 'Equipo frigorífico partido axial', supplier_name: 'Zanotti', sale_price: 100 }),
  articuloDePropio({ reference: 'PROP-1', description: 'Cobre en bobina', unit_price: 5 }),
]);
let r = buscarIndexado(L, 'cobre');
assert.equal(r.total, 3);
assert.deepEqual(r.proveedores.map((p) => p.nombre).sort(), ['Frigicoll', 'Salvador Escoda', 'Sin proveedor']);
// filtro por proveedor: solo ese, pero los recuentos siguen mostrando todos
r = buscarIndexado(L, 'cobre', { proveedor: 'frigicoll' });
assert.equal(r.items.length, 1); assert.equal(r.items[0].ref, 'CU12'); assert.equal(r.proveedores.length, 3);
// campo: solo referencia / solo nombre
assert.equal(buscarIndexado(L, 'cobre', { campo: 'ref' }).total, 0);
assert.equal(buscarIndexado(L, 'cu12', { campo: 'ref' }).items[0].ref, 'CU12');
assert.equal(buscarIndexado(L, 'zanotti', { campo: 'nombre' }).total, 0); // el proveedor no es nombre
assert.equal(buscarIndexado(L, 'zanotti').total, 1); // pero sí en «todo»
// referencia escrita con otros separadores
assert.equal(buscarIndexado(L, 'cu 1/2 a', { campo: 'ref' }).total, 1);
assert.equal(buscarIndexado(L, 'cu-12').items[0]?.ref, 'CU12');
assert.equal(buscarIndexado(L, 'MDB 635').items[0].ref, 'MDB635');
// palabras sueltas, tildes
assert.equal(buscarIndexado(L, 'FRIGORIFICO partido').items[0].ref, 'MDB635');
assert.equal(buscarIndexado(L, 'a').total, 0);
// rapidez: 100.000 artículos
const gran = indexar(Array.from({ length: 100000 }, (_, i) => articuloDeTarifa({ product_code: `R${i}`, product_name: `Artículo número ${i} tornillo`, supplier_name: `Prov${i % 40}` })));
const t0 = Date.now();
for (let i = 0; i < 20; i++) buscarIndexado(gran, 'tornillo 99');
const ms = (Date.now() - t0) / 20;
assert.ok(ms < 150, `búsqueda lenta: ${ms} ms`);
console.log('Buscar artículos: OK (' + ms.toFixed(0) + ' ms con 100.000 artículos)');
