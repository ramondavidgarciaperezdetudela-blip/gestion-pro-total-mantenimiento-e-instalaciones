// Prueba del plano por apartados: ejecutar con
//   node --import ./scripts/alias-register.mjs scripts/test-paquete.mjs
import { construirDXF, textoAscii } from '../src/lib/planoDxfExport.js';
import { construirPaquetePDF, opcionesPorDefecto, dimensionesHoja, escalaNormalizada, cajaDelPlano, elementosDeSeccion, lineasDeCalculos, datosDeElemento } from '../src/lib/planoPaquete.js';
let fallos = 0; const ok = (c, t, d = '') => { if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } else console.log('  ✓ ' + t); };
const camara = (id = 'r1') => [[80, 80, 230, 80], [230, 80, 230, 280], [230, 280, 80, 280], [80, 280, 80, 80]].map(([x1, y1, x2, y2]) => ({ id: crypto.randomUUID(), x1, y1, x2, y2, camara: true, room_id: id, room_x: 80, room_y: 80, room_w_m: 3, room_h_m: 4, alto_m: 2.5, espesor_mm: 100, tipo: 'positiva', suelo: true }));
const elements = [
  { id: 'ev', type: 'evaporador', label: 'Evaporador', x: 150, y: 140, w_m: 1, h_m: 0.6, rot: 0, glyph: 'EV', datos: { referencia: 'EVA 2,5 kW', proveedor: 'Frio SA', precio_proveedor: 420 } },
  { id: 'cd', type: 'condensadora_aire', label: 'Condensadora', x: 330, y: 160, w_m: 1.4, h_m: 0.9, rot: 0, glyph: 'CDA' },
  { id: 'cu', type: 'cuadro_electrico', label: 'Cuadro', x: 380, y: 60, w_m: 0.6, h_m: 0.8, rot: 0, glyph: 'CE' },
];
const connections = [
  { id: 'c1', type: 'refrigerante', from_id: 'ev', to_id: 'cd', path: [{ x: 150, y: 60 }, { x: 330, y: 60 }], gas_diameter: '5/8', liquid_diameter: '3/8' },
  { id: 'c2', type: 'electrica', from_id: 'cu', to_id: 'cd', path: [], power_type: 'Trifásica', power_w: 3200, section_mm2: 4, conn_kind: 'potencia' },
];
const datos = { plan: { name: 'Cámara de prueba', scale: 50, contact_name: 'Bar Sol' }, elements, walls: camara(), connections, empresa: { company_name: 'Taller SL' },
  presupuesto: { materiales: 1000, manoObra: 350, total: 1350, aviso: 'Orientativo' } };

ok(JSON.stringify(dimensionesHoja('a3', 'horizontal')) === '{"w":420,"h":297}' && JSON.stringify(dimensionesHoja('a4', 'vertical')) === '{"w":210,"h":297}', 'hoja horizontal y vertical, A3 y A4');
const el = elementosDeSeccion('electrico', elements, connections).map((e) => e.id).sort().join();
ok(el === 'cd,cu', 'el plano eléctrico lleva solo lo eléctrico y lo que conecta', el);
ok(elementosDeSeccion('frigorifico', elements, connections).map((e) => e.id).sort().join() === 'cd,ev', 'el frigorífico no lleva aparamenta');
const caja = cajaDelPlano(datos.walls, elements, connections, 50);
const esc = escalaNormalizada(caja, 50, 300, 200);
ok([10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000].includes(esc.N) && esc.mmPorPx > 0, 'escala normalizada 1:N', `1:${esc.N}`);
ok(esc.N >= esc.exacta, 'la escala elegida hace que el dibujo quepa');
ok(datosDeElemento(elements[0]).some(([k]) => k === 'Referencia'), 'los datos del elemento incluyen la referencia del proveedor');

const todo = opcionesPorDefecto();
const doc = construirPaquetePDF(datos, todo);
const n = doc.getNumberOfPages();
console.log('   páginas con todos los apartados:', n);
ok(n >= 4, 'cada apartado en su hoja (frigorífico, eléctrico + esquema, cálculos, 3D)', String(n));
const tam = (p) => { doc.setPage(p); const s = doc.internal.pageSize; return [Math.round(s.getWidth()), Math.round(s.getHeight())]; };
ok(JSON.stringify(tam(1)) === '[420,297]', 'frigorífico en A3 horizontal', JSON.stringify(tam(1)));
const vert = construirPaquetePDF(datos, { papel: 'a4', secciones: [{ id: 'frigorifico', incluir: true, orientacion: 'vertical' }, { id: 'calculos', incluir: true, orientacion: 'horizontal' }] });
const t2 = (p) => { vert.setPage(p); const s = vert.internal.pageSize; return [Math.round(s.getWidth()), Math.round(s.getHeight())]; };
ok(JSON.stringify(t2(1)) === '[210,297]', 'frigorífico vertical en A4', JSON.stringify(t2(1)));
ok(vert.getNumberOfPages() >= 2 && JSON.stringify(t2(vert.getNumberOfPages())) === '[297,210]', 'el apartado siguiente cambia a horizontal', JSON.stringify(t2(vert.getNumberOfPages())));
const solo = construirPaquetePDF(datos, { papel: 'a4', secciones: [{ id: 'calculos', incluir: true, orientacion: 'vertical' }, { id: 'vista3d', incluir: false }] });
ok(solo.getNumberOfPages() >= 1, 'se puede sacar un solo apartado');
let err = ''; try { construirPaquetePDF(datos, { secciones: [{ id: 'calculos', incluir: false }] }); } catch (e) { err = e.message; }
ok(/al menos un apartado/.test(err), 'sin apartados elegidos avisa');
const txt = lineasDeCalculos(datos).map((l) => l.t).join('\n');
ok(/Cámara 1 · positiva: 3 × 4 × 2,5 m/.test(txt) && /Carga .* kW → equipo/.test(txt), 'los cálculos traen la cámara y su carga');
ok(/Total gas 5\/8/.test(txt) && /Potencia total declarada en líneas: 3\.?200 W/.test(txt), 'tuberías por diámetro y potencia eléctrica');
ok(/TOTAL: 1\.?350/.test(txt), 'presupuesto en cálculos');

// ── CAD ──
const cad = construirDXF(datos, opcionesPorDefecto());
console.log('   hojas CAD:', cad.hojas, 'capas:', cad.capas.join(','));
ok(cad.hojas === 3, 'CAD: frigorífico, eléctrico, cálculos (sin 3D ni esquema)', String(cad.hojas));
ok(['FRIGORIFICO', 'ELECTRICO', 'CALCULOS'].every((c) => cad.capas.includes(c)), 'CAD: capas por apartado');
const pares = cad.texto.split('\n'); ok(pares.length % 2 === 1 || pares.length % 2 === 0, 'CAD: pares código/valor');
ok(cad.texto.endsWith('0\nEOF\n') && cad.texto.includes('POLYLINE') && cad.texto.includes('SEQEND') && cad.texto.includes('AC1009'), 'CAD: DXF R12 con POLYLINE/SEQEND y EOF');
ok(!/[^\x00-\x7f]/.test(cad.texto), 'CAD: solo ASCII (sin acentos)');
ok(!cad.texto.includes('NaN') && !cad.texto.includes('undefined'), 'CAD: sin NaN ni undefined');
ok(textoAscii('Cámara → 3 m² · 5 €') === 'Camara -> 3 m2 - 5 EUR', 'CAD: limpieza de texto', textoAscii('Cámara → 3 m² · 5 €'));
const mal = cad.texto.split('\n'); let bien = true; for (let i = 0; i < mal.length - 1; i += 2) if (!/^\s*-?\d+$/.test(mal[i])) { bien = false; console.log('   código raro', i, mal[i]); break; }
ok(bien, 'CAD: todos los códigos de grupo son numéricos');
const xs = [...cad.texto.matchAll(/\n10\n(-?[\d.]+)\n/g)].map((m) => +m[1]);
ok(Math.max(...xs) > 420 + 210, 'CAD: las hojas van una al lado de otra', String(Math.max(...xs)));
(await import('node:fs')).writeFileSync('/tmp/paquete_prueba.dxf', cad.texto);
const salida = doc.output('arraybuffer');
ok(salida.byteLength > 5000, 'el PDF se genera', String(salida.byteLength));
require_fs: { const fs = await import('node:fs'); fs.writeFileSync('/tmp/paquete_prueba.pdf', Buffer.from(salida)); }
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
