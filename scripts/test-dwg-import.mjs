// Lee DWG reales (LibreDWG) y comprueba que salen las paredes. Necesita los archivos de ejemplo; si no están, se salta.
import fs from 'fs';
import { LibreDwg, Dwg_File_Type } from '@mlightcad/libredwg-web';
import { parsearDb, esCabeceraDWG } from '../src/lib/planoDwgImport.js';
import { dxfAParedes, capasSugeridas } from '../src/lib/planoDxfImport.js';
const DIR = process.env.DWG_EJEMPLOS || '/home/claude/libredwg/libredwg/test/test-data';
let f = 0; const ok = (c, t, d = '') => { if (!c) { f++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } else console.log('  ✓ ' + t); };
if (!fs.existsSync(DIR + '/2000/Line.dwg')) { console.log('Sin archivos DWG de ejemplo: prueba omitida'); process.exit(0); }
const lib = await LibreDwg.create();
const leer = (rel) => { const b = fs.readFileSync(`${DIR}/${rel}`); ok(esCabeceraDWG(new Uint8Array(b.subarray(0, 6))), `${rel}: cabecera AC10xx`); return parsearDb(lib.convert(lib.dwg_read_data(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), Dwg_File_Type.DWG))); };
let p = leer('2000/Line.dwg'); ok(p.segmentos.length === 1, 'LINE → 1 segmento', String(p.segmentos.length));
p = leer('2018/Polygon.dwg'); ok(p.segmentos.length === 10 || p.segmentos.length === 9, 'LWPOLYLINE de 10 vértices cerrada/abierta', String(p.segmentos.length));
p = leer('2000/Polyline.dwg'); ok(p.segmentos.length === 4, 'POLYLINE leída (4 tramos)', String(p.segmentos.length));
p = leer('2000/entities-2d.dwg'); ok(p.segmentos.length === 4 && p.resumen.circulos === 1 && p.resumen.arcos === 1 && p.resumen.textos === 1, 'mezcla: 4 líneas y cuenta círculo, arco y texto', JSON.stringify(p.resumen));
p = leer('2018/PolyLine3D.dwg'); ok(p.segmentos.length >= 1, 'POLYLINE3D leída', String(p.segmentos.length));
const r = dxfAParedes(p, { capas: capasSugeridas(p.capas), escala: 50 }); ok(r.paredes.length >= 1, 'se convierte en paredes del plano', String(r.paredes.length));
console.log(f ? `\n${f} FALLOS` : '\nTODO OK'); process.exit(f ? 1 : 0);
