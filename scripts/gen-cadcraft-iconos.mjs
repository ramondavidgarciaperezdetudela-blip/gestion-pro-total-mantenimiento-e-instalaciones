// Saca los dibujos de los símbolos de un DXF guardado por CADCraft (después de crear todos los bloques EQ-*)
// y los deja como lista de trazos para pintar los iconos del menú HVAC.
//   node scripts/gen-cadcraft-iconos.mjs /ruta/todos.dxf
import fs from 'node:fs';
const src = process.argv[2];
if (!src) { console.error('Uso: node scripts/gen-cadcraft-iconos.mjs todos.dxf'); process.exit(1); }
const l = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const g = []; for (let i = 0; i + 1 < l.length; i += 2) g.push([parseInt(l[i].trim(), 10), l[i + 1].trim()]);
const r = (n) => String(Math.round(Number(n) * 1000) / 1000);
const salida = [];
let enBloques = false, bloque = null, prims = [], ent = null;
const cierra = () => {
  if (!ent) return;
  const f = (c) => ent.g.filter((q) => q[0] === c).map((q) => q[1]);
  const n1 = (c) => f(c)[0];
  if (ent.t === 'BLOCK') bloque = n1(2);
  else if (ent.t === 'LINE') prims.push(`L,${r(n1(10))},${r(n1(20))},${r(n1(11))},${r(n1(21))}`);
  else if (ent.t === 'CIRCLE') prims.push(`C,${r(n1(10))},${r(n1(20))},${r(n1(40))}`);
  else if (ent.t === 'ARC') prims.push(`A,${r(n1(10))},${r(n1(20))},${r(n1(40))},${r(n1(50))},${r(n1(51))}`);
  else if (ent.t === 'LWPOLYLINE') {
    const pts = []; let x = null;
    for (const [c, v] of ent.g) { if (c === 10) x = v; else if (c === 20 && x !== null) { pts.push(`${r(x)},${r(v)}`); x = null; } }
    const cerrada = (parseInt(n1(70) || '0', 10) & 1) === 1 ? 1 : 0;
    prims.push(`P,${cerrada},${pts.join(',')}`);
  }
  ent = null;
};
for (let i = 0; i < g.length; i++) {
  const [c, v] = g[i];
  if (c === 2 && v === 'BLOCKS') enBloques = true;
  if (c === 0 && v === 'ENDSEC' && enBloques) { cierra(); enBloques = false; }
  if (!enBloques) continue;
  if (c === 0) {
    cierra();
    if (v === 'BLOCK') { bloque = null; prims = []; ent = { t: 'BLOCK', g: [] }; }
    else if (v === 'ENDBLK') { if (bloque && /^EQ-/.test(bloque)) salida.push(`${bloque}\t${prims.join(';')}`); bloque = null; prims = []; }
    else ent = { t: v, g: [] };
  } else if (ent) ent.g.push([c, v]);
}
fs.writeFileSync('cadcraft-hvac/iconos.tsv', salida.join('\n') + '\n');
fs.mkdirSync('cadcraft/crates/ui-egui/src/hvac', { recursive: true });
fs.copyFileSync('cadcraft-hvac/iconos.tsv', 'cadcraft/crates/ui-egui/src/hvac/iconos.tsv');
console.log(salida.length, 'iconos');
