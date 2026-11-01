// DXF sencillo del plano para abrirlo en CADCraft: paredes (polilínea con ancho =
// grosor y espesor = alto, en la capa PARED-<MATERIAL>) y equipos (bloques EQ-<id>).
// Unidades: metros. El eje Y del plano crece hacia abajo; el DXF, hacia arriba.
import { ELEMENTOS } from './planoFrigorificoCatalogo.js';
import { espesorPared } from './planoParedes.js';

const ACI_CAT = { refrigeracion: 4, clima: 30, ventilacion: 3, electrico: 2, seguridad: 1, estructura: 6 };
const ACI_MAT = { ladrillo: 30, bloque_hormigon: 8, hormigon: 9, cemento: 253, yeso: 254, pladur: 252, panel_sandwich: 140, madera: 32, cristal: 4, otro: 7 };
const CAPA_MAT = { ladrillo: 'LADRILLO', bloque_hormigon: 'BLOQUE', hormigon: 'HORMIGON', cemento: 'CEMENTO', yeso: 'YESO', pladur: 'PLADUR', panel_sandwich: 'PANEL', madera: 'MADERA', cristal: 'CRISTAL', otro: 'OTRO' };

const par = (c, v) => `${c}\n${v}\n`;
const n = (v) => (Number.isFinite(v) ? Number(v.toFixed(5)) : 0);
export const nombreBloque = (id) => 'EQ-' + String(id).toUpperCase().replace(/[^A-Z0-9]/g, '_');

function bloque(def) {
  const x = def.w_m / 2, y = def.h_m / 2, nombre = nombreBloque(def.id);
  const ln = (a, b, c, d) => par(0, 'LINE') + par(8, '0') + par(10, n(a)) + par(20, n(b)) + par(30, 0) + par(11, n(c)) + par(21, n(d)) + par(31, 0);
  return par(0, 'BLOCK') + par(8, '0') + par(2, nombre) + par(70, 0) + par(10, 0) + par(20, 0) + par(30, 0) + par(3, nombre)
    + ln(-x, -y, x, -y) + ln(x, -y, x, y) + ln(x, y, -x, y) + ln(-x, y, -x, -y) + ln(-x, -y, x, y) + ln(-x, y, x, -y)
    + par(0, 'TEXT') + par(8, '0') + par(10, 0) + par(20, 0) + par(30, 0) + par(40, n(0.3 * Math.min(def.w_m, def.h_m))) + par(1, def.glyph || def.label.slice(0, 3).toUpperCase()) + par(72, 1) + par(11, 0) + par(21, 0) + par(31, 0) + par(73, 2)
    + par(0, 'ENDBLK') + par(8, '0');
}

/** @returns {{texto:string, paredes:number, equipos:number}} */
export function construirDXFCadcraft({ walls = [], elements = [], scale = 50 } = {}) {
  const m = (px) => px / scale;
  const capas = new Map();
  const ents = [];
  for (const w of walls) {
    const mat = w.material && CAPA_MAT[w.material] ? w.material : (w.camara ? 'panel_sandwich' : 'otro');
    const capa = `PARED-${CAPA_MAT[mat]}`;
    capas.set(capa, ACI_MAT[mat]);
    const alto = Number(w.alto_m) > 0 ? Number(w.alto_m) : 2.6;
    ents.push(par(0, 'LWPOLYLINE') + par(5, (0x100 + ents.length).toString(16).toUpperCase()) + par(100, 'AcDbEntity') + par(8, capa) + par(100, 'AcDbPolyline')
      + par(90, 2) + par(70, 0) + par(43, n(espesorPared(w))) + par(39, n(alto))
      + par(10, n(m(w.x1))) + par(20, n(-m(w.y1))) + par(10, n(m(w.x2))) + par(20, n(-m(w.y2))));
  }
  const usados = new Map();
  let equipos = 0;
  for (const e of elements) {
    const def = ELEMENTOS.find((d) => d.id === e.type);
    if (!def || !ACI_CAT[def.cat]) continue;
    const capa = `EQUIPO-${def.cat.toUpperCase()}`;
    capas.set(capa, ACI_CAT[def.cat]);
    usados.set(def.id, def);
    equipos++;
    ents.push(par(0, 'INSERT') + par(5, (0x100 + ents.length).toString(16).toUpperCase()) + par(100, 'AcDbEntity') + par(8, capa) + par(100, 'AcDbBlockReference') + par(2, nombreBloque(def.id))
      + par(10, n(m(e.x))) + par(20, n(-m(e.y))) + par(30, 0) + par(41, 1) + par(42, 1) + par(43, 1) + par(50, n(-(Number(e.rot) || 0))));
  }
  const tablaCapas = [...capas].map(([nom, col]) => par(0, 'LAYER') + par(100, 'AcDbSymbolTableRecord') + par(100, 'AcDbLayerTableRecord') + par(2, nom) + par(70, 0) + par(62, col) + par(6, 'Continuous')).join('');
  const texto = par(0, 'SECTION') + par(2, 'HEADER') + par(9, '$ACADVER') + par(1, 'AC1015') + par(9, '$INSUNITS') + par(70, 6) + par(0, 'ENDSEC')
    + par(0, 'SECTION') + par(2, 'TABLES') + par(0, 'TABLE') + par(2, 'LAYER') + par(70, capas.size + 1)
    + par(0, 'LAYER') + par(100, 'AcDbSymbolTableRecord') + par(100, 'AcDbLayerTableRecord') + par(2, '0') + par(70, 0) + par(62, 7) + par(6, 'Continuous')
    + tablaCapas + par(0, 'ENDTAB') + par(0, 'ENDSEC')
    + par(0, 'SECTION') + par(2, 'BLOCKS') + [...usados.values()].map(bloque).join('') + par(0, 'ENDSEC')
    + par(0, 'SECTION') + par(2, 'ENTITIES') + ents.join('') + par(0, 'ENDSEC') + par(0, 'EOF');
  return { texto, paredes: walls.length, equipos };
}
