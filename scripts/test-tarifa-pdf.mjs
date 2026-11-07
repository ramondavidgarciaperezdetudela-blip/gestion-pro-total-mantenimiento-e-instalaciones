import { itemsDeLineas } from '../src/lib/tarifaPdf.js';
import { filasEnColumnas } from '../src/lib/leerPdfTabla.js';
import { detectarColumnas, lineasDeFilas } from '../src/lib/importarPresupuesto.js';
let f = 0; const ok = (c, t) => { if (!c) { f++; console.log('✗', t); } };
// Un PDF simulado: trozos de texto con su posición, como los da pdfjs.
const fila = (y, cols) => cols.map(([x, t]) => ({ t, x, y, w: t.length * 5 }));
const trozos = [
  ...fila(700, [[20, 'Referencia'], [120, 'Descripción'], [380, 'Unidad'], [450, 'Precio']]),
  ...fila(680, [[20, 'TC-100'], [120, 'Tubo cobre 1/4 rollo 25 m'], [380, 'ud'], [450, '45,50']]),
  ...fila(660, [[20, 'CD-22'], [120, 'Codo cobre 22 mm'], [380, 'ud'], [450, '1,20']]),
  ...fila(640, [[20, 'XX-1'], [120, 'Sin precio'], [380, 'ud'], [450, '']]),
];
const filas = filasEnColumnas(trozos, detectarColumnas);
const { lineas } = lineasDeFilas(filas);
const items = itemsDeLineas(lineas);
ok(items.length === 2, 'dos artículos con precio, hay ' + items.length + ' ' + JSON.stringify(filas.slice(0, 2)));
ok(items[0]?.product_code === 'TC-100' && items[0].cost_price === 45.5 && /Tubo cobre/.test(items[0].product_name), 'primer artículo');
ok(itemsDeLineas([{ description: 'A', unit_price: 0 }]).length === 0, 'sin precio se descarta');
console.log(f ? `${f} fallos` : 'tarifa pdf ok'); process.exit(f ? 1 : 0);
