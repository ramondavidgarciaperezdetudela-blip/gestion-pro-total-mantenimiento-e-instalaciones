import assert from 'node:assert/strict';
import { parsePrecio, precioATexto, completarPrecios, construirArticulo } from '../src/lib/tarifaManual.js';

assert.equal(parsePrecio('12,5'), 12.5);
assert.equal(parsePrecio('12.5'), 12.5);
assert.equal(parsePrecio('1.250,75'), 1250.75);
assert.equal(parsePrecio('1,250.75'), 1250.75);
assert.equal(parsePrecio('12 €'), 12);
assert.equal(parsePrecio('0'), 0);
assert.equal(parsePrecio(''), null);
assert.equal(parsePrecio('abc'), null);
assert.equal(parsePrecio(null), null);
assert.equal(parsePrecio(7), 7);
assert.equal(precioATexto(10.5), '10.5');
assert.equal(precioATexto(null), '');

assert.deepEqual(completarPrecios({ cost: '10', margin: '50' }), { cost: 10, sale: 15, margin: 50 });
assert.deepEqual(completarPrecios({ cost: '10', sale: '15' }), { cost: 10, sale: 15, margin: 50 });
assert.deepEqual(completarPrecios({ sale: '15', margin: '50' }), { cost: 10, sale: 15, margin: 50 });
assert.deepEqual(completarPrecios({ cost: '10' }), { cost: 10, sale: null, margin: null });

const prov = { id: 'p1', name: 'KIDE' };
assert.ok(construirArticulo(null, { product_name: 'x', cost_price: '1' }).error);
assert.ok(construirArticulo(prov, { product_name: ' ', cost_price: '1' }).error);
assert.ok(construirArticulo(prov, { product_name: 'x' }).error);

const a = construirArticulo(prov, { product_name: ' Panel 80 ', product_code: 'P80', cost_price: '10,50', margin: '20', unit: 'm2', notes: '' }).registro;
assert.equal(a.supplier_id, 'p1');
assert.equal(a.supplier_name, 'KIDE');
assert.equal(a.product_name, 'Panel 80');
assert.equal(a.cost_price, 10.5);
assert.equal(a.sale_price, 12.6);
assert.equal(a.margin, 20);
assert.equal(a.unit, 'm2');
assert.equal('notes' in a, false);

const solo = construirArticulo(prov, { product_name: 'Tornillo', sale_price: '3' }).registro;
assert.equal(solo.cost_price, 3);
assert.equal(solo.sale_price, 3);
console.log('tarifa manual: OK');
