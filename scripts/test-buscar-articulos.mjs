import assert from 'node:assert/strict';
import { buscarPorTexto, articuloDeTarifa, articuloDePropio, norm, indexar, buscarIndexado, proveedoresDelIndice, fotosDeLineas } from '../src/lib/buscarArticulos.js';
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
// sin escribir nada: elegir proveedor y ver sus artículos; y la lista de proveedores
assert.deepEqual(proveedoresDelIndice(L).map((p) => p.nombre), ['Frigicoll', 'Salvador Escoda', 'Sin proveedor', 'Zanotti']);
r = buscarIndexado(L, '', { proveedor: 'Zanotti' });
assert.equal(r.items.length, 1); assert.equal(r.items[0].ref, 'MDB635');
assert.equal(buscarIndexado(L, '').items.length, 0);
// proveedor + cualquier tipo de búsqueda
assert.equal(buscarIndexado(L, 'cu12', { proveedor: 'Frigicoll', campo: 'ref' }).items.length, 1);
assert.equal(buscarIndexado(L, 'cu12', { proveedor: 'Zanotti', campo: 'ref' }).items.length, 0);
// marca / categoría
const M = indexar([articuloDeTarifa({ product_code: 'A1', product_name: 'Compresor', brand: 'Danfoss', category: 'refrigeracion', supplier_name: 'X' })]);
assert.equal(buscarIndexado(M, 'danfoss', { campo: 'extra' }).total, 1);
assert.equal(buscarIndexado(M, 'danfoss', { campo: 'nombre' }).total, 0);
// ninguna con todas las palabras → las que tengan alguna, marcadas como parciales
r = buscarIndexado(L, 'cobre axial');
assert.equal(r.parcial, true); assert.ok(r.items.length >= 2);
assert.equal(buscarIndexado(L, 'cobre bobina').parcial, false);
// fotos de las líneas de un documento
const F = indexar([
  { ...articuloDeTarifa({ product_code: 'CU-12', product_name: 'Tubo cobre', supplier_name: 'Escoda' }), imagen: 'data:img/escoda' },
  { ...articuloDeTarifa({ product_code: 'CU-12', product_name: 'Tubo cobre', supplier_name: 'Frigicoll' }), imagen: 'data:img/frigi' },
  { ...articuloDeTarifa({ product_code: 'Z1', product_name: 'Sin foto', supplier_name: 'Escoda' }) },
  { ...articuloDePropio({ reference: 'P9', description: 'Bobina cable 3x2,5' }), imagen: 'data:img/propia' },
]);
const fl = fotosDeLineas(F, [
  { reference: 'cu 12', supplier_name: 'Frigicoll' },   // misma referencia con otro formato y proveedor concreto
  { reference: 'CU-12' },                               // sin proveedor: la primera que haya
  { reference: 'Z1', supplier_name: 'Escoda' },         // sin foto
  { description: 'bobina CABLE 3x2,5' },                // solo por descripción
  { reference: 'X', image_url: 'http://x/f.jpg' },      // ya traía su foto
]);
assert.equal(fl.get(0), 'data:img/frigi'); assert.equal(fl.get(1), 'data:img/escoda');
assert.equal(fl.has(2), false); assert.equal(fl.get(3), 'data:img/propia'); assert.equal(fl.get(4), 'http://x/f.jpg');
// rapidez: 100.000 artículos
const gran = indexar(Array.from({ length: 100000 }, (_, i) => articuloDeTarifa({ product_code: `R${i}`, product_name: `Artículo número ${i} tornillo`, supplier_name: `Prov${i % 40}` })));
const t0 = Date.now();
for (let i = 0; i < 20; i++) buscarIndexado(gran, 'tornillo 99');
const ms = (Date.now() - t0) / 20;
assert.ok(ms < 150, `búsqueda lenta: ${ms} ms`);
console.log('Buscar artículos: OK (' + ms.toFixed(0) + ' ms con 100.000 artículos)');
