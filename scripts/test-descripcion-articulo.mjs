import { tieneDescripcion, separarSinDescripcion } from '../src/lib/descripcionArticulo.js';
import { itemsDeLineas } from '../src/lib/tarifaPdf.js';
let fallos = 0; const ok = (c, t) => { if (!c) { fallos++; console.log('  ✗ ' + t); } else console.log('  ✓ ' + t); };
ok(!tieneDescripcion('12345'), 'solo números → no');
ok(!tieneDescripcion('0,75 / 12'), 'números y símbolos → no');
ok(!tieneDescripcion('AB-1234', 'ab-1234'), 'igual a su referencia → no');
ok(!tieneDescripcion('Sin nombre'), '«Sin nombre» → no');
ok(!tieneDescripcion('  '), 'vacío → no');
ok(!tieneDescripcion('A'), 'una sola letra → no');
ok(tieneDescripcion('Tubo cobre 1/2" rollo 25 m', 'TC12'), 'descripción real → sí');
ok(tieneDescripcion('Válvula Ø 12', ''), 'con acentos → sí');
ok(tieneDescripcion('R-410A 11 kg', '410'), 'gas refrigerante → sí');
const { validos, descartados } = separarSinDescripcion([{ product_name: '123', product_code: 'X' }, { product_name: 'Codo 90', product_code: 'C90' }, { product_name: 'Z9', product_code: 'Z9' }]);
ok(validos.length === 1 && descartados.length === 2, 'separa válidos y descartados');
const it = itemsDeLineas([
  { reference: '8431', description: '', unit_price: 5 },
  { reference: '8432', description: '8432', unit_price: 5 },
  { reference: '8433', description: '55 66', unit_price: 5 },
  { reference: '8434', description: 'Abrazadera 22 mm', unit_price: 1.2 },
]);
ok(it.length === 1 && it[0].product_code === '8434', 'tarifa PDF: solo entra la fila con descripción');
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
