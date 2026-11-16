import assert from 'node:assert/strict';
import { numeroTarifa as n } from '../src/lib/numeroTarifa.js';
for (const [v, e] of [['9,5', 9.5], ['1.949,69', 1949.69], ['1,949.69', 1949.69], ['12,50 €', 12.5], ['€ 3.5', 3.5], ['1.234.567,8', 1234567.8], ['45', 45], [7.25, 7.25], ['', null], [null, null], ['sin precio', null], ['3,00 EUR', 3]])
  assert.equal(n(v), e, `${v} → ${n(v)}`);
console.log('Números de tarifa: OK');
