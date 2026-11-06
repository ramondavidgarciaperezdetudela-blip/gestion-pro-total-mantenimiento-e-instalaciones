// Pruebas de la importación de presupuestos desde Excel, CSV, Word y PDF.
import { DOMParser } from '@xmldom/xmldom';
import * as XLSX from 'xlsx';
import { zipSync, strToU8 } from 'fflate';
import { numero, plazo, campoDeCabecera, lineasDeFilas, importarFichero, candidatosDeLinea, claveRef, parecido } from '../src/lib/importarPresupuesto.js';
import { filasEnColumnas } from '../src/lib/leerPdfTabla.js';
globalThis.DOMParser = DOMParser;

let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };

console.log('1. Números y plazos');
ok(numero('1.234,56 €') === 1234.56, 'español con miles', numero('1.234,56 €'));
ok(numero('1,234.56') === 1234.56, 'inglés con miles');
ok(numero('12,5 %') === 12.5, 'porcentaje');
ok(numero('1.250') === 1250, 'miles sin decimales');
ok(numero('0.125') === 0.125, 'decimal con punto');
ok(numero('45') === 45 && numero(7.5) === 7.5, 'simples');
ok(numero('abc') === null, 'texto no es número');
ok(plazo('5 días').dias === 5, '5 días');
ok(plazo('3 semanas').dias === 21, '3 semanas');
ok(plazo('2 meses').dias === 60, '2 meses');
ok(plazo('Stock').dias === 0, 'stock');
ok(plazo('10-15 días').dias === 15, 'rango de días');
ok(plazo('').dias === null, 'vacío');

console.log('2. Cabeceras');
ok(campoDeCabecera('Referencia') === 'ref', 'Referencia');
ok(campoDeCabecera('Descripción') === 'description', 'Descripción');
ok(campoDeCabecera('Cant.') === 'qty', 'Cant.');
ok(campoDeCabecera('PVP') === 'unit_price', 'PVP');
ok(campoDeCabecera('Precio unitario') === 'unit_price', 'Precio unitario');
ok(campoDeCabecera('Dto %') === 'discount', 'Dto %');
ok(campoDeCabecera('Importe') === 'total', 'Importe');
ok(campoDeCabecera('Precio total') === 'total', 'Precio total');
ok(campoDeCabecera('Plazo de entrega') === 'delivery', 'Plazo de entrega');

console.log('3. Líneas desde filas');
const FILAS = [
  ['PRESUPUESTO Nº 2025/118', null, null, null, null, null, null],
  ['Cliente: Bar Manolo'],
  [],
  ['Ref.', 'Descripción', 'Cant.', 'Precio unit.', 'Dto %', 'Importe', 'Plazo entrega'],
  ['KDE-120', 'Cámara frigorífica modular KIDE 2x2', 1, 1850, 10, 1665, '3 semanas'],
  ['EVA-300', 'Evaporador 300 W', 2, '120,50', 0, '241,00', '5 días'],
  ['TUB-1/4', 'Tubo cobre 1/4 rollo 25 m', 3, 45.2, null, 135.6, 'Stock'],
  ['Subtotal', null, null, null, null, 2041.6],
  ['IVA 21%', null, null, null, null, 428.74],
  ['TOTAL', null, null, null, null, 2470.34],
];
const r = lineasDeFilas(FILAS);
ok(r.lineas.length === 3, 'tres líneas (sin subtotales ni IVA)', r.lineas.length);
ok(r.lineas[0].reference === 'KDE-120' && r.lineas[0].discount === 10 && r.lineas[0].total === 1665, 'línea 1 con descuento', JSON.stringify(r.lineas[0]));
ok(r.lineas[0].delivery_days === 21, 'plazo 3 semanas = 21 días');
ok(r.lineas[1].unit_price === 120.5 && r.lineas[1].quantity === 2, 'línea 2 con coma decimal');
ok(r.lineas[2].delivery_days === 0, 'línea 3 en stock');
ok(r.lineas.every((l) => l.avisos.length === 0), 'sin avisos cuando todo cuadra');

console.log('4. Faltan datos: se calculan');
const r2 = lineasDeFilas([['Artículo', 'Descripción', 'Uds', 'Importe'], ['A1', 'Válvula', 4, 100]]);
ok(r2.lineas[0].unit_price === 25, 'precio unitario sale del importe', r2.lineas[0].unit_price);
const r3 = lineasDeFilas([['Descripción', 'Cantidad', 'PVP', 'Total'], ['Compresor', 2, 500, 900]]);
ok(r3.lineas[0].avisos.length === 1, 'avisa si el importe no cuadra');
const r4 = lineasDeFilas([['Descripción', 'Cantidad', 'PVP', 'Dto', 'Total'], ['Filtro', 1, 80, 0.1, 72]]);
ok(r4.lineas[0].discount === 10, 'descuento en fracción de Excel (0,1) = 10 %', r4.lineas[0].discount);

console.log('5. Sin cabeceras');
const r5 = lineasDeFilas([['Compresor Copeland 2 CV', 1, 650, 650], ['Presostato alta', 2, 30, 60], ['Termostato digital', 1, 45, 45]]);
ok(r5.lineas.length === 3 && r5.avisos.length === 1, 'adivina columnas y lo avisa', JSON.stringify(r5));
ok(r5.lineas[1].quantity === 2 && r5.lineas[1].unit_price === 30, 'cantidad y precio bien');

console.log('6. Excel real en memoria');
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(FILAS), 'Presupuesto');
const xbuf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
const fx = { name: 'p.xlsx', arrayBuffer: async () => xbuf };
const rx = await importarFichero(fx);
ok(rx.lineas.length === 3 && rx.tipo === 'hoja', 'xlsx', rx.lineas.length);
const csv = 'Referencia;Descripcion;Cantidad;Precio;Descuento;Importe\nA-1;Tubo;2;10,5;;21,00\nA-2;Codo;10;1,2;5;11,40\n';
const rc = await importarFichero({ name: 'p.csv', arrayBuffer: async () => strToU8(csv).buffer });
ok(rc.lineas.length === 2 && rc.lineas[1].discount === 5 && rc.lineas[0].unit_price === 10.5, 'csv con punto y coma', JSON.stringify(rc.lineas));

console.log('7. Word (.docx) con tabla');
const celda = (t) => `<w:tc><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:tc>`;
const fila = (a) => `<w:tr>${a.map(celda).join('')}</w:tr>`;
const docXml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Oferta</w:t></w:r></w:p><w:tbl>${[
  ['Código', 'Concepto', 'Cantidad', 'P. unitario', 'Descuento', 'Importe', 'Plazo'],
  ['TAV-01', 'Cámara TAVER 3x2', '1', '2.400,00', '5', '2.280,00', '4 semanas'],
  ['TAV-02', 'Puerta pivotante', '2', '310,00', '0', '620,00', '10 días'],
].map(fila).join('')}</w:tbl></w:body></w:document>`;
const docx = zipSync({ 'word/document.xml': strToU8(docXml) });
const rw = await importarFichero({ name: 'o.docx', arrayBuffer: async () => docx.buffer.slice(docx.byteOffset, docx.byteOffset + docx.byteLength) });
ok(rw.lineas.length === 2 && rw.lineas[0].unit_price === 2400 && rw.lineas[0].delivery_days === 28, 'docx', JSON.stringify(rw.lineas[0]));

console.log('8. PDF: columnas por posición (celda vacía no desplaza)');
const T = (t, x, y, w = 40) => ({ t, x, y, w });
const trozos = [
  T('Ref', 30, 700), T('Descripción', 100, 700, 60), T('Cant', 300, 700, 25), T('Precio', 350, 700, 30), T('Dto', 410, 700, 20), T('Importe', 470, 700, 35),
  T('A-10', 30, 680), T('Compresor', 100, 680, 50), T('2', 310, 680, 6), T('500,00', 350, 680, 38), T('900,00', 472, 680, 38),
  T('B-20', 30, 660), T('Válvula', 100, 660, 40), T('1', 310, 660, 6), T('80,00', 355, 660, 30), T('10', 412, 660, 10), T('72,00', 478, 660, 30),
];
const { detectarColumnas } = await import('../src/lib/importarPresupuesto.js');
const rp = lineasDeFilas(filasEnColumnas(trozos, detectarColumnas));
ok(rp.lineas.length === 2, 'dos líneas del PDF', JSON.stringify(rp));
ok(rp.lineas[0].discount === 0 && rp.lineas[0].total === 1000 || rp.lineas[0].avisos.length === 1, 'línea sin descuento (importe distinto avisa)');
ok(rp.lineas[1].discount === 10 && rp.lineas[1].unit_price === 80, 'línea con descuento en su columna', JSON.stringify(rp.lineas[1]));

console.log('9. Búsqueda en las bases de datos');
const propios = [{ id: 'p1', reference: 'KDE-120', description: 'Cámara frigorífica modular KIDE 2x2', unit_price: 1900, supplier_name: 'KIDE', section: 'Cámaras frigoríficas KIDE' }];
const porRef = new Map([[claveRef('EVA-300'), [{ id: 's1', supplier_name: 'Frigicoll', product_code: 'eva 300', product_name: 'Evaporador 300', sale_price: 130, cost_price: 90 }]]]);
const c1 = candidatosDeLinea(r.lineas[0], { propios, porRef });
ok(c1.length === 1 && c1[0].origen === 'propia' && c1[0].exacto, 'encuentra por referencia en Mi base de datos');
const c2 = candidatosDeLinea(r.lineas[1], { propios, porRef });
ok(c2.length === 1 && c2[0].proveedor === 'Frigicoll' && c2[0].precio === 130, 'encuentra en proveedor aunque cambie el formato de la ref.');
const c3 = candidatosDeLinea(r.lineas[2], { propios, porRef });
ok(c3.length === 0, 'artículo nuevo: sin candidatos');
const c4 = candidatosDeLinea({ reference: '', description: 'Camara frigorifica modular KIDE 2x2 ' }, { propios, porRef });
ok(c4.length === 1 && !c4[0].exacto, 'encuentra por descripción parecida');
ok(parecido('tubo cobre 1/4', 'válvula solenoide') === 0, 'descripciones distintas no se parecen');

console.log('10. Artículo sin codificar: «.» y la descripción debajo');
const rp2 = lineasDeFilas([
  ['Ref.', 'Descripción', 'Cant.', 'Precio', 'Dto %', 'Importe'],
  ['KDE-1', 'Evaporador 300 W', 1, 100, 0, 100],
  ['', '.', 2, 50, 10, 90],
  ['', 'Válvula solenoide 1/4 con bobina', null, null, null, null],
  ['', ' 24 V CA', null, null, null, null],
  ['TUB-9', 'Tubo cobre', 1, 20, 0, 20],
  ['', '·', 1, 15, 0, 15],
  ['', 'Presostato mixto', null, null, null, null],
]);
ok(rp2.lineas.length === 4, 'cuatro líneas (las de debajo no son líneas aparte)', rp2.lineas.length);
ok(rp2.lineas[1].description === 'Válvula solenoide 1/4 con bobina 24 V CA', 'toma las dos líneas de debajo', rp2.lineas[1].description);
ok(rp2.lineas[1].quantity === 2 && rp2.lineas[1].discount === 10 && rp2.lineas[1].total === 90, 'conserva cantidad, descuento e importe de la línea del punto');
ok(rp2.lineas[3].description === 'Presostato mixto', 'también con otro signo y al final del fichero');
ok(rp2.lineas[2].description === 'Tubo cobre', 'no toca las líneas normales');
ok(rp2.avisos.some((a) => a.startsWith('2 líneas')), 'avisa de cuántas ha recuperado', JSON.stringify(rp2.avisos));
const rp3 = lineasDeFilas([['Ref.', 'Descripción', 'Cant.', 'Precio'], ['', '.', 1, 10], ['X-2', 'Codo', 1, 5]]);
ok(rp3.lineas[0].description === '.' && rp3.lineas[1].description === 'Codo', 'si debajo hay otra línea con datos, no se la come');

console.log('11. Referencia del presupuesto en pantalla, lista, búsqueda e impresión');
import fs from 'node:fs';
const docs = fs.readFileSync('src/pages/Documents.jsx', 'utf8');
ok(/doc_reference: ''/.test(docs), 'campo en el formulario nuevo');
ok(/referencia-en-lista/.test(docs), 'sale en la lista');
ok(/\$\{d\.doc_reference \|\| ''\}/.test(docs), 'se puede buscar por ella');
ok(/Ref\.: <strong>\$\{doc\.doc_reference\}/.test(docs), 'sale en el PDF impreso');
ok(/doc_reference/.test(fs.readFileSync('src/pages/PresupuestoPublico.jsx', 'utf8')), 'sale en la página del cliente');

console.log(`\n${total - fallos}/${total} comprobaciones correctas`);
process.exit(fallos ? 1 : 0);
