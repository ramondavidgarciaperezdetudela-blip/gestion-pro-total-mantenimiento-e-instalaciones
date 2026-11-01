import { parsearDXF, dxfAParedes, capasSugeridas, esDWG } from '../src/lib/planoDxfImport.js';
let f = 0; const ok = (c, t, d = '') => { if (!c) { f++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } else console.log('  ✓ ' + t); };
const dxf = (ents, ins = '') => `0\nSECTION\n2\nHEADER\n${ins}0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${ents}0\nENDSEC\n0\nEOF\n`;
const linea = (c, x1, y1, x2, y2) => `0\nLINE\n8\n${c}\n10\n${x1}\n20\n${y1}\n30\n0\n11\n${x2}\n21\n${y2}\n31\n0\n`;
const lw = (c, pts, cerr) => `0\nLWPOLYLINE\n8\n${c}\n90\n${pts.length}\n70\n${cerr ? 1 : 0}\n` + pts.map(([x, y]) => `10\n${x}\n20\n${y}\n`).join('');
// habitación 4×3 m en milímetros: 4 líneas + polilínea cerrada de cota
let t = dxf(linea('MUROS', 0, 0, 4000, 0) + linea('MUROS', 4000, 0, 4000, 3000) + linea('MUROS', 4000, 3000, 0, 3000) + linea('MUROS', 0, 3000, 0, 0) + lw('COTAS', [[0, -500], [4000, -500]], false) + '0\nTEXT\n8\nTEXTO\n10\n0\n20\n0\n1\nhola\n0\nCIRCLE\n8\nPILARES\n10\n1\n20\n1\n40\n100\n0\nINSERT\n8\nEQ\n2\nSPLIT\n10\n1\n20\n1\n', '9\n$INSUNITS\n70\n4\n');
const p = parsearDXF(t);
ok(p.valido && p.unidadDxf === 'mm', 'lee DXF y unidades mm');
ok(p.segmentos.length === 5, '5 segmentos', String(p.segmentos.length));
ok(p.resumen.textos === 1 && p.resumen.circulos === 1 && p.resumen.bloques === 1, 'cuenta textos, círculos y bloques');
ok(JSON.stringify(capasSugeridas(p.capas)) === '["MUROS"]', 'sugiere la capa de muros', JSON.stringify(capasSugeridas(p.capas)));
const r = dxfAParedes(p, { capas: ['MUROS'], escala: 50 });
ok(r.paredes.length === 4 && r.unidad === 'mm', '4 paredes en mm');
ok(Math.abs(r.ancho_m - 4) < 1e-9 && Math.abs(r.alto_plano_m - 3) < 1e-9, 'mide 4 × 3 m');
const xs = r.paredes.flatMap((w) => [w.x1, w.x2]); ok(Math.max(...xs) - Math.min(...xs) === 200, 'a escala 50 px/m → 200 px', String(Math.max(...xs) - Math.min(...xs)));
ok(Math.min(...xs) === 40, 'colocado con margen');
// el eje Y se invierte: la pared de y=3000 queda arriba
const sup = r.paredes.filter((w) => w.y1 === w.y2).sort((a, b) => a.y1 - b.y1)[0]; ok(sup.y1 === 40, 'eje Y invertido');
// duplicados y cortas
const d = dxf(linea('A', 0, 0, 5, 0) + linea('A', 5, 0, 0, 0) + linea('A', 0, 0, 0.01, 0), '9\n$INSUNITS\n70\n6\n');
const rd = dxfAParedes(parsearDXF(d), {}); ok(rd.paredes.length === 1 && rd.descartadas >= 1, 'quita duplicadas y diminutas');
// polilínea cerrada y POLYLINE antigua
const pl = dxf(lw('M', [[0, 0], [2, 0], [2, 2], [0, 2]], true)); ok(parsearDXF(pl).segmentos.length === 4, 'LWPOLYLINE cerrada = 4 lados');
const viejo = dxf('0\nPOLYLINE\n8\nM\n70\n1\n0\nVERTEX\n8\nM\n10\n0\n20\n0\n0\nVERTEX\n8\nM\n10\n3\n20\n0\n0\nVERTEX\n8\nM\n10\n3\n20\n3\n0\nSEQEND\n'); ok(parsearDXF(viejo).segmentos.length === 3, 'POLYLINE/VERTEX cerrada = 3 lados (3 vértices)');
// sin unidades: adivina por tamaño
const sinU = dxf(linea('X', 0, 0, 12000, 0)); ok(dxfAParedes(parsearDXF(sinU), {}).unidad === 'mm', 'adivina mm'); ok(dxfAParedes(parsearDXF(dxf(linea('X', 0, 0, 12, 0))), {}).unidad === 'm', 'adivina m');
ok(dxfAParedes(parsearDXF(sinU), { unidad: 'cm' }).unidad === 'cm', 'unidad manual manda');
// inválidos
ok(!parsearDXF('hola').valido, 'texto cualquiera no vale'); ok(esDWG('plano.DWG') && esDWG('x', 'AC1032'), 'detecta DWG');


// ── Planos hechos con CADCraft: paredes con material/grosor/alto y equipos EQ-… ──
{
  const dxfC = ['0','SECTION','2','ENTITIES',
    '0','LWPOLYLINE','8','PARED-PLADUR','90','2','70','0','43','0.078','39','2.5','10','0','20','0','10','4','20','0',
    '0','INSERT','8','EQUIPO-REFRIGERACION','2','EQ-COMPRESOR','10','2','20','1','50','90',
    '0','ENDSEC','0','EOF',''].join('\n');
  const p = parsearDXF(dxfC);
  const r = dxfAParedes(p, { capas: ['PARED-PLADUR'], unidad: 'm', escala: 50 });
  ok(r.paredes.length === 1 && r.paredes[0].material === 'pladur' && r.paredes[0].espesor_mm === 78 && r.paredes[0].alto_m === 2.5, 'pared de CADCraft con material, grosor y alto');
  ok(r.elementos.length === 1 && r.elementos[0].type === 'compresor' && r.elementos[0].rot === 270, 'equipo EQ-COMPRESOR de CADCraft vuelve como elemento');
}
console.log(f ? `\n${f} FALLOS` : '\nTODO OK'); process.exit(f ? 1 : 0);
