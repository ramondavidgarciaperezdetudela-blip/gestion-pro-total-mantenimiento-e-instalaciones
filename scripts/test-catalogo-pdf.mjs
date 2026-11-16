import assert from 'node:assert/strict';
import { articulosDeCatalogo } from '../src/lib/catalogoPdf.js';
const t = (txt, x, y) => ({ t: txt, x, y, w: txt.length * 5 });
// Líneas: REF  descripción  precio
let r = articulosDeCatalogo([
  t('Tarifa 2026 · Frío y clima', 40, 800), t('Página 3', 400, 790),
  t('CU12-50', 40, 700), t('Tubo de cobre recocido 1/2" rollo 50 m', 130, 700), t('145,20 €', 420, 700),
  t('MDB635', 40, 680), t('Equipo frigorífico partido axial', 130, 680), t('1.949,69 €', 420, 680),
  t('Total pagina', 300, 100), t('2.000,00 €', 420, 100),
]);
assert.equal(r.items.length, 2);
assert.deepEqual(r.items.map((i) => [i.product_code, i.cost_price]), [['CU12-50', 145.2], ['MDB635', 1949.69]]);
assert.match(r.items[0].product_name, /Tubo de cobre/);
// Bloque tipo catálogo: título arriba, y debajo referencia + precio
r = articulosDeCatalogo([
  t('Válvula de expansión termostática', 50, 600), t('R-404A / R-507', 50, 588),
  t('Ref. TEX2', 50, 570), t('PVP 89,90 €', 300, 570),
  t('Presostato de alta presión', 50, 500),
  t('KP5-060-1100', 50, 484), t('45,00', 300, 484),
]);
assert.equal(r.items.length, 2);
assert.match(r.items[0].product_name, /Válvula de expansión/);
assert.equal(r.items[0].cost_price, 89.9);
assert.equal(r.items[1].product_code, 'KP5-060-1100'); assert.match(r.items[1].product_name, /Presostato/);
// medidas y unidades no son códigos
r = articulosDeCatalogo([t('Resistencia 230V 50Hz calefactora', 40, 300), t('12,00 €', 400, 300)]);
assert.equal(r.items[0].product_code, ''); assert.equal(r.items[0].cost_price, 12);
// sin precios: nada
assert.equal(articulosDeCatalogo([t('Solo texto sin precios', 40, 100)]).items.length, 0);
console.log('Catálogo PDF por líneas: OK');
