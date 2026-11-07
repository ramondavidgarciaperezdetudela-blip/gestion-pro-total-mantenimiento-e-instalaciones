import assert from 'node:assert/strict';
import { buscarPorTexto, articuloDeTarifa, articuloDePropio, norm } from '../src/lib/buscarArticulos.js';
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
console.log('Buscar artículos: OK');
