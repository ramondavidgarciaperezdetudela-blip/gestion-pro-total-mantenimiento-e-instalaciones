/**
 * planoDxfImport.js — lee un plano de AutoCAD (DXF de texto) y lo convierte en
 * las paredes del editor de planos, con lo que el programa genera la vista 3D
 * y lo guarda en la ficha del plano y del cliente.
 *
 * Lee: LINE, LWPOLYLINE, POLYLINE/VERTEX (abiertas y cerradas), y cuenta
 * círculos, arcos, textos y bloques para informar de lo que no se convierte.
 * Los .dwg (formato cerrado de AutoCAD) no se pueden leer en el navegador:
 * en AutoCAD o similar hay que «Guardar como» → DXF.
 */

const UNIDADES = { 1: ['in', 0.0254], 2: ['ft', 0.3048], 4: ['mm', 0.001], 5: ['cm', 0.01], 6: ['m', 1], 10: ['yd', 0.9144] };
export const UNIDADES_MANUALES = [['auto', 'Detectar'], ['mm', 'Milímetros'], ['cm', 'Centímetros'], ['m', 'Metros']];
const A_METROS = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048, yd: 0.9144 };
const MAX_PAREDES = 4000;
const NOMBRES_MURO = /muro|pared|wall|tabique|cerr|fachada|obra|estruct|arq/i;
const NOMBRES_RUIDO = /cota|dim|texto|text|hatch|sombra|rayado|eje|mobil|mueble|furn|anot|marco|cajet|defpoints/i;

export function esDWG(nombre = '', cabecera = '') {
  return /\.dwg$/i.test(nombre) || /^AC10\d\d/.test(cabecera);
}

/** Pares (código, valor) del DXF de texto. */
function pares(texto) {
  const lineas = String(texto).split(/\r?\n/);
  const out = [];
  for (let i = 0; i + 1 < lineas.length; i += 2) out.push([parseInt(lineas[i].trim(), 10), lineas[i + 1].trim()]);
  return out;
}

/** @returns {{valido:boolean, error?:string, unidadDxf:string|null, capas:Object<string,{lineas:number, otros:number}>, segmentos:{capa:string,x1:number,y1:number,x2:number,y2:number}[], resumen:{circulos:number,arcos:number,textos:number,bloques:number,otros:number}}} */
export function parsearDXF(texto) {
  const vacio = { circulos: 0, arcos: 0, textos: 0, bloques: 0, otros: 0 };
  if (!/(^|\n)\s*0\s*\r?\n\s*SECTION/.test(String(texto)) || !/ENTITIES/.test(String(texto))) {
    return { valido: false, error: 'El archivo no parece un DXF de texto (si es un .dwg, guárdalo como DXF desde AutoCAD).', unidadDxf: null, capas: {}, segmentos: [], resumen: vacio };
  }
  const p = pares(texto);
  let unidadDxf = null;
  for (let i = 0; i < p.length - 1; i++) {
    if (p[i][0] === 9 && p[i][1] === '$INSUNITS' && p[i + 1][0] === 70) { const u = UNIDADES[parseInt(p[i + 1][1], 10)]; unidadDxf = u ? u[0] : null; break; }
  }
  // Sección ENTITIES
  let ini = -1; let fin = p.length;
  for (let i = 0; i < p.length - 1; i++) {
    if (p[i][0] === 2 && p[i][1] === 'ENTITIES' && p[i - 1]?.[1] === 'SECTION') { ini = i + 1; break; }
  }
  if (ini < 0) return { valido: false, error: 'No se encontró la sección de entidades del DXF.', unidadDxf, capas: {}, segmentos: [], resumen: vacio };
  for (let i = ini; i < p.length; i++) if (p[i][0] === 0 && p[i][1] === 'ENDSEC') { fin = i; break; }

  const ents = []; let cur = null;
  for (let i = ini; i < fin; i++) { const [c, v] = p[i]; if (c === 0) { cur = { tipo: v, g: [] }; ents.push(cur); } else if (cur) cur.g.push([c, v]); }

  const segmentos = []; const capas = {}; const resumen = { ...vacio };
  const capa = (e) => (e.g.find((x) => x[0] === 8)?.[1]) || '0';
  const marca = (c, clave) => { (capas[c] ||= { lineas: 0, otros: 0 })[clave]++; };
  const seg = (c, x1, y1, x2, y2) => { if ([x1, y1, x2, y2].every(Number.isFinite) && (x1 !== x2 || y1 !== y2)) { segmentos.push({ capa: c, x1, y1, x2, y2 }); marca(c, 'lineas'); } };
  const num = (e, code, n = 0) => { const a = e.g.filter((x) => x[0] === code); return a[n] ? parseFloat(a[n][1]) : NaN; };
  const cadena = (c, pts, cerrada) => { for (let i = 0; i + 1 < pts.length; i++) seg(c, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]); if (cerrada && pts.length > 2) seg(c, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]); };

  for (let i = 0; i < ents.length; i++) {
    const e = ents[i]; const c = capa(e);
    if (e.tipo === 'LINE') seg(c, num(e, 10), num(e, 20), num(e, 11), num(e, 21));
    else if (e.tipo === 'LWPOLYLINE') {
      const pts = []; let x = null;
      e.g.forEach(([cod, v]) => { if (cod === 10) x = parseFloat(v); else if (cod === 20 && x !== null) { pts.push([x, parseFloat(v)]); x = null; } });
      cadena(c, pts, (parseInt(e.g.find((q) => q[0] === 70)?.[1] ?? '0', 10) & 1) === 1);
    } else if (e.tipo === 'POLYLINE') {
      const cerrada = (parseInt(e.g.find((q) => q[0] === 70)?.[1] ?? '0', 10) & 1) === 1; const pts = [];
      while (ents[i + 1] && ents[i + 1].tipo === 'VERTEX') { i++; const x = num(ents[i], 10), y = num(ents[i], 20); if (Number.isFinite(x) && Number.isFinite(y)) pts.push([x, y]); }
      cadena(c, pts, cerrada);
    } else if (e.tipo === 'CIRCLE') { resumen.circulos++; marca(c, 'otros'); }
    else if (e.tipo === 'ARC') { resumen.arcos++; marca(c, 'otros'); }
    else if (e.tipo === 'TEXT' || e.tipo === 'MTEXT') { resumen.textos++; marca(c, 'otros'); }
    else if (e.tipo === 'INSERT') { resumen.bloques++; marca(c, 'otros'); }
    else if (!['VERTEX', 'SEQEND'].includes(e.tipo)) { resumen.otros++; }
  }
  return { valido: true, unidadDxf, capas, segmentos, resumen };
}

/** Capas que parecen muros; si ninguna lo parece, todas las que tienen líneas salvo las de cotas/textos. */
export function capasSugeridas(capas) {
  const con = Object.keys(capas).filter((k) => capas[k].lineas > 0);
  const muros = con.filter((k) => NOMBRES_MURO.test(k));
  if (muros.length) return muros;
  const limpias = con.filter((k) => !NOMBRES_RUIDO.test(k));
  return limpias.length ? limpias : con;
}

/** Factor a metros: el elegido, o el del DXF, o el que cuadra con el tamaño del dibujo. */
export function factorMetros(segmentos, unidadDxf, manual = 'auto') {
  if (manual !== 'auto' && A_METROS[manual]) return { unidad: manual, factor: A_METROS[manual] };
  if (unidadDxf && A_METROS[unidadDxf]) return { unidad: unidadDxf, factor: A_METROS[unidadDxf] };
  let mx = 0;
  if (segmentos.length) {
    const xs = segmentos.flatMap((s) => [s.x1, s.x2]); const ys = segmentos.flatMap((s) => [s.y1, s.y2]);
    mx = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  }
  const unidad = mx > 1000 ? 'mm' : mx > 150 ? 'cm' : 'm';
  return { unidad, factor: A_METROS[unidad] };
}

/**
 * Paredes del editor (px) a partir de los segmentos de las capas elegidas.
 * Se pasa a metros, se gira el eje Y (el DXF crece hacia arriba) y se coloca
 * cerca de la esquina superior izquierda del lienzo.
 */
export function dxfAParedes(parsed, { capas, unidad = 'auto', escala = 50, alto_m = 2.6, minimo_m = 0.05, margen = 40, uid = () => `cad-${Math.random().toString(36).slice(2, 10)}` } = {}) {
  const elegidas = new Set(capas || Object.keys(parsed.capas));
  const base = parsed.segmentos.filter((s) => elegidas.has(s.capa));
  const { unidad: u, factor } = factorMetros(parsed.segmentos, parsed.unidadDxf, unidad);
  const m = base.map((s) => ({ x1: s.x1 * factor, y1: s.y1 * factor, x2: s.x2 * factor, y2: s.y2 * factor })).filter((s) => Math.hypot(s.x2 - s.x1, s.y2 - s.y1) >= minimo_m);
  const vistos = new Set(); const unicos = [];
  m.forEach((s) => { const k = [s.x1, s.y1, s.x2, s.y2].map((n) => n.toFixed(3)).join('|'); const k2 = [s.x2, s.y2, s.x1, s.y1].map((n) => n.toFixed(3)).join('|'); if (!vistos.has(k) && !vistos.has(k2)) { vistos.add(k); unicos.push(s); } });
  const recortado = unicos.length > MAX_PAREDES;
  const usados = unicos.slice(0, MAX_PAREDES);
  if (!usados.length) return { paredes: [], unidad: u, ancho_m: 0, alto_plano_m: 0, recortado: false, descartadas: m.length - unicos.length };
  const minX = Math.min(...usados.flatMap((s) => [s.x1, s.x2])); const maxX = Math.max(...usados.flatMap((s) => [s.x1, s.x2]));
  const minY = Math.min(...usados.flatMap((s) => [s.y1, s.y2])); const maxY = Math.max(...usados.flatMap((s) => [s.y1, s.y2]));
  const px = (x) => Math.round((x - minX) * escala + margen); const py = (y) => Math.round((maxY - y) * escala + margen);
  const paredes = usados.map((s) => ({ id: uid(), x1: px(s.x1), y1: py(s.y1), x2: px(s.x2), y2: py(s.y2), alto_m, origen: 'cad' }));
  return { paredes, unidad: u, ancho_m: maxX - minX, alto_plano_m: maxY - minY, recortado, descartadas: m.length - unicos.length };
}
