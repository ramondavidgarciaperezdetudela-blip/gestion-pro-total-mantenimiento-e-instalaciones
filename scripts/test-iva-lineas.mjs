import assert from 'node:assert/strict';
import { totalesDocumento, desgloseLinea, modoDeLinea, etiquetaIva } from '../src/lib/ivaLineas.js';
const cerca = (a, b) => assert.ok(Math.abs(a - b) < 0.005, `${a} != ${b}`);

// Sin modo = IVA aparte (documentos antiguos)
let t = totalesDocumento([{ quantity: 2, unit_price: 100 }], 21);
cerca(t.subtotal, 200); cerca(t.iva_amount, 42); cerca(t.total, 242);

// IVA incluido: el precio ya lleva el IVA
t = totalesDocumento([{ quantity: 1, unit_price: 121, iva_modo: 'incluido' }], 21);
cerca(t.subtotal, 100); cerca(t.iva_amount, 21); cerca(t.total, 121);

// Exenta
t = totalesDocumento([{ quantity: 1, unit_price: 500, iva_modo: 'exento' }], 21);
cerca(t.subtotal, 500); cerca(t.iva_amount, 0); cerca(t.total, 500);

// Mezcla + descuento
t = totalesDocumento([
  { quantity: 1, unit_price: 1000 },                                   // material aparte
  { quantity: 10, unit_price: 24.2, iva_modo: 'incluido' },            // mano de obra con IVA: 242
  { quantity: 1, unit_price: 50, discount: 10, iva_modo: 'exento' },   // 45 exenta
], 21);
cerca(t.subtotal, 1000 + 200 + 45); cerca(t.iva_amount, 210 + 42); cerca(t.total, 1000 + 210 + 242 + 45);

// IVA 0 % e IVA 10 %
cerca(totalesDocumento([{ quantity: 1, unit_price: 110, iva_modo: 'incluido' }], 10).subtotal, 100);
cerca(desgloseLinea({ quantity: 1, unit_price: 80 }, 0).iva, 0);
assert.equal(modoDeLinea({ iva_modo: 'raro' }), 'aparte');
assert.equal(etiquetaIva({ iva_modo: 'incluido' }), 'IVA incl.');
assert.equal(etiquetaIva({}), '');
assert.deepEqual(totalesDocumento([], 21), { subtotal: 0, iva_amount: 0, total: 0 });
console.log('IVA por línea: OK');
