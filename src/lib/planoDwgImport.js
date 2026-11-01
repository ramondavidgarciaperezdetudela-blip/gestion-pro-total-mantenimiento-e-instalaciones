/**
 * planoDwgImport.js — lee archivos .dwg de AutoCAD en el propio navegador
 * (LibreDWG compilado a WebAssembly) y los deja con la misma forma que el
 * DXF de planoDxfImport.js, para que el resto del importador sea común.
 *
 * Se leen LINE, LWPOLYLINE, POLYLINE 2D/3D y el contenido de los bloques
 * (INSERT) con su posición, giro y escala. Solo se carga la librería (≈10 MB)
 * cuando alguien importa un .dwg.
 */
const UNIDAD_POR_CODIGO = { 1: 'in', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm', 10: 'yd' };
const MAX_PROFUNDIDAD = 4;

/** ¿Empieza como un DWG (AC10xx)? */
export const esCabeceraDWG = (bytes) => bytes && bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 4)) === 'AC10';

function transformar(p, t) {
  const x = p.x * t.sx, y = p.y * t.sy;
  return { x: t.dx + x * t.cos - y * t.sin, y: t.dy + x * t.sin + y * t.cos };
}
const IDENT = { dx: 0, dy: 0, sx: 1, sy: 1, cos: 1, sin: 0 };
function componer(padre, ins) {
  const a = ins.rotation || 0; const c = Math.cos(a), s = Math.sin(a);
  const o = transformar(ins.insertionPoint || { x: 0, y: 0 }, padre);
  return { dx: o.x, dy: o.y, sx: padre.sx * (ins.xScale ?? 1), sy: padre.sy * (ins.yScale ?? 1), cos: padre.cos * c - padre.sin * s, sin: padre.sin * c + padre.cos * s };
}

/**
 * @param {object} db resultado de LibreDwg.convert()
 * @returns {{valido:boolean, error?:string, unidadDxf:string|null, capas:object, segmentos:object[], resumen:object}}
 */
export function parsearDb(db) {
  const resumen = { circulos: 0, arcos: 0, textos: 0, bloques: 0, otros: 0 };
  const capas = {}; const segmentos = [];
  const marca = (c, k) => { (capas[c] ||= { lineas: 0, otros: 0 })[k]++; };
  const seg = (c, a, b) => { if ([a.x, a.y, b.x, b.y].every(Number.isFinite) && (a.x !== b.x || a.y !== b.y)) { segmentos.push({ capa: c, x1: a.x, y1: a.y, x2: b.x, y2: b.y }); marca(c, 'lineas'); } };
  const cadena = (c, pts, cerrada, t) => { const q = pts.map((p) => transformar(p, t)); for (let i = 0; i + 1 < q.length; i++) seg(c, q[i], q[i + 1]); if (cerrada && q.length > 2) seg(c, q[q.length - 1], q[0]); };

  const bloques = {};
  (db?.tables?.BLOCK_RECORD?.entries || []).forEach((b) => { bloques[String(b.name).toLowerCase()] = b; });
  const modelo = bloques['*model_space'];
  const base = modelo?.entities?.length ? modelo.entities : (db?.entities || []);

  const recorrer = (ents, t, prof) => {
    for (const e of ents) {
      const c = e.layer || '0';
      if (e.type === 'LINE') seg(c, transformar(e.startPoint, t), transformar(e.endPoint, t));
      else if (e.type === 'LWPOLYLINE') cadena(c, e.vertices || [], (e.flag & 512) === 512 || (e.flag & 1) === 1, t);
      else if (e.type === 'POLYLINE2D' || e.type === 'POLYLINE3D') cadena(c, e.vertices || [], (e.flag & 1) === 1, t);
      else if (e.type === 'INSERT') {
        const b = bloques[String(e.name).toLowerCase()];
        if (prof < MAX_PROFUNDIDAD && b?.entities?.length && !/^\*/.test(b.name)) recorrer(b.entities, componer(t, e), prof + 1);
        else { resumen.bloques++; marca(c, 'otros'); }
      } else if (e.type === 'CIRCLE') { resumen.circulos++; marca(c, 'otros'); }
      else if (e.type === 'ARC') { resumen.arcos++; marca(c, 'otros'); }
      else if (e.type === 'TEXT' || e.type === 'MTEXT') { resumen.textos++; marca(c, 'otros'); }
      else if (!['VIEWPORT', 'VERTEX2D', 'VERTEX3D', 'SEQEND'].includes(e.type)) resumen.otros++;
    }
  };
  recorrer(base, IDENT, 0);
  const unidadDxf = UNIDAD_POR_CODIGO[db?.header?.INSUNITS] || null;
  return { valido: true, unidadDxf, capas, segmentos, resumen };
}

/** Lee un .dwg (ArrayBuffer) en el navegador. Lanza si el archivo no se puede leer. */
export async function parsearDWG(buffer) {
  const [{ LibreDwg, createModule, Dwg_File_Type }, wasm] = await Promise.all([
    import('@mlightcad/libredwg-web'),
    import('../../node_modules/@mlightcad/libredwg-web/wasm/libredwg-web.wasm?url'),
  ]);
  const modulo = await createModule({ locateFile: (f) => (f.endsWith('.wasm') ? wasm.default : f) });
  const lib = LibreDwg.createByWasmInstance(modulo);
  const dwg = lib.dwg_read_data(buffer, Dwg_File_Type.DWG);
  if (dwg === undefined || dwg === null) throw new Error('No se pudo leer el DWG (versión no compatible o archivo dañado).');
  return parsearDb(lib.convert(dwg));
}
