// Catálogo con la foto AL LADO de la tabla (página tipo «Split de pared» de un fabricante de climatización).
import assert from 'node:assert/strict';
import { articulosDePagina } from '../src/lib/catalogoRevista.js';
const T = (t, x, y) => ({ t, x, y, w: t.length * 5 });
const tr = [];
const tabla = (titulo, yTit, filas, y0, paso) => {
  tr.push(T(titulo, 198, yTit), T('Código', 225, yTit - 28), T('Artículo', 380, yTit - 28), T('€', 556, yTit - 28));
  filas.forEach(([cod, mod, d1, d2, precio], k) => {
    const y = y0 - k * paso;
    tr.push(T(cod, 207, y), T(mod, 262, y - 1), T(d1, 262 + mod.length * 5 + 6, y - 1), T(precio, 545, y));
    if (d2) tr.push(T(d2, 262, y - 15));
  });
};
tabla('Serie H14X', 700, [
  ['CL20060', 'MUPR-09-H14X', '', 'Refrigeración 2.720 W - Calefacción 3.130 W', '975,00'],
  ['CL20061', 'MUPR-12-H14X', '', 'Refrigeración 3.520 W - Calefacción 3.960 W', '1.055,00'],
  ['CL20062', 'MUPR-18-H14X', '', 'Refrigeración 5.280 W - Calefacción 5.570 W', '1.715,00'],
  ['CL20063', 'MUPR-24-H14X', '', 'Refrigeración 7.030 W - Calefacción 7.330 W', '2.145,00'],
], 640, 37);
tabla('Serie H11', 480, [
  ['CL20055', 'MUPR-09-H11', '', 'Refrigeración 2.640 W - Calefacción 2.930 W', '710,00'],
  ['CL20056', 'MUPR-12-H11', '', 'Refrigeración 3.520 W - Calefacción 3.810 W', '740,00'],
  ['CL20057', 'MUPR-18-H11', '', 'Refrigeración 5.280 W - Calefacción 5.570 W', '1.385,00'],
  ['CL20058', 'MUPR-24-H11', '', 'Refrigeración 7.030 W - Calefacción 7.330 W', '1.815,00'],
], 420, 37);
// unidades exteriores: dos series en la MISMA tabla (banda amarilla «SERIE H11» y «SERIE H12»)
tr.push(T('Unidades exteriores', 198, 262), T('Código', 225, 246), T('Artículo', 380, 246));
tr.push(T('SERIE H11', 350, 228));
[['CL21400', 'MUEX-14-H11.2 (2 x 1)', 'Refrigeración 4.100 W', '1.380,00'], ['CL21401', 'MUEX-18-H11.2 (2 x 1)', 'Refrigeración 5.280 W', '1.515,00'], ['CL21402', 'MUEX-18-H11.3 (3 x 1)', 'Refrigeración 5.280 W', '1.750,00']]
  .forEach(([c, m, d, p], k) => { const y = 205 - k * 28; tr.push(T(c, 207, y), T(m, 262, y - 1), T(d, 262 + m.length * 5 + 6, y - 1), T(p, 545, y)); });
tr.push(T('SERIE H12', 350, 118));
[['CL21500', 'MUEX-20-H12.2 (2 x 1)', 'Refrigeración 6.000 W', '1.900,00'], ['CL21501', 'MUEX-24-H12.3 (3 x 1)', 'Refrigeración 7.000 W', '2.100,00']]
  .forEach(([c, m, d, p], k) => { const y = 95 - k * 28; tr.push(T(c, 207, y), T(m, 262, y - 1), T(d, 262 + m.length * 5 + 6, y - 1), T(p, 545, y)); });
const imagenes = [
  { id: 'split-H14X', x: 15, y: 560, w: 165, h: 110 },
  { id: 'qr', x: 130, y: 500, w: 55, h: 55 }, { id: 'ionizador', x: 120, y: 690, w: 55, h: 15 }, { id: 'seer', x: 20, y: 690, w: 38, h: 30 },
  { id: 'split-H11', x: 20, y: 345, w: 160, h: 90 },
  { id: 'exterior-H11', x: 30, y: 130, w: 130, h: 110 },
  { id: 'exterior-H12', x: 30, y: 20, w: 130, h: 90 },
  { id: 'novedad', x: 40, y: 150, w: 80, h: 30 },
];
const r = articulosDePagina(tr, imagenes);
const por = Object.fromEntries(r.map((a) => [a.product_code, a]));
assert.equal(r.length, 4 + 4 + 3 + 2, `15 artículos con su referencia CL (hay ${r.length}: ${r.map((a) => a.product_code).join(',')})`);
for (const c of ['CL20060', 'CL20061', 'CL20062', 'CL20063']) assert.equal(por[c]._foto, 'split-H14X', c + ' con la foto de la serie H14X');
for (const c of ['CL20055', 'CL20056', 'CL20057', 'CL20058']) assert.equal(por[c]._foto, 'split-H11', c + ' con la foto de la serie H11');
for (const c of ['CL21400', 'CL21401', 'CL21402']) assert.equal(por[c]._foto, 'exterior-H11', c + ' con la foto del exterior H11');
for (const c of ['CL21500', 'CL21501']) assert.equal(por[c]._foto, 'exterior-H12', c + ' con la foto del exterior H12 (cambia la serie)');
assert.match(por.CL20060.product_name, /MUPR-09-H14X.*Refrigeración 2\.720 W.*Calefacción 3\.130 W/);
assert.equal(por.CL20061.cost_price, 1055); assert.equal(por.CL20063.cost_price, 2145);
assert.match(por.CL21401.product_name, /MUEX-18-H11\.2 \(2 x 1\).*5\.280 W/);
assert.ok(!/^Art[ií]culo/.test(por.CL20055.product_name), 'la cabecera «Artículo» no entra en el nombre');
assert.match(por.CL20060.notes, /Serie H14X/);
console.log('revista lateral OK');
