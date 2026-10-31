/**
 * planoPaquete.js — El plano por APARTADOS, cada uno en su hoja.
 *
 *   1. Plano frigorífico   — planta con numeración + leyenda y datos de los elementos
 *   2. Plano eléctrico     — planta eléctrica + esquema, con su leyenda
 *   3. Cálculos y medidas  — aparte: cargas, cámaras, tuberías, cables, presupuesto
 *   4. Vista 3D            — aparte
 *
 * Cada apartado elige su orientación (vertical u horizontal) y todo comparte
 * papel (A4 o A3), cajetín y numeración de hojas. Sin React: se puede probar solo.
 */
import { jsPDF } from 'jspdf';
import { elementoDe } from './planoFrigorificoCatalogo.js';
import { longitudConexion, resumenTuberias } from './planoCalculo.js';
import { camarasDePlano, cargaFrigorifica } from './planoCargaFrigorifica.js';
import { hexToRgb } from './planoDibujoPdf.js';
import { generarVista3DDataUrl, VISTA3D_W, VISTA3D_H } from './planoVista3D.js';
import { construirEsquemaElectrico } from './planoEsquemaElectrico.js';

export const PAPELES = { a4: [210, 297], a3: [297, 420] };
export const SECCIONES = [
  { id: 'frigorifico', titulo: 'Plano frigorífico', cad: true },
  { id: 'electrico', titulo: 'Plano eléctrico', cad: true },
  { id: 'calculos', titulo: 'Cálculos y medidas', cad: true },
  { id: 'vista3d', titulo: 'Vista 3D', cad: false },
];
export const ESCALAS_NORMALIZADAS = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000];

export function opcionesPorDefecto() {
  return {
    papel: 'a3',
    secciones: SECCIONES.map((s) => ({ id: s.id, incluir: true, orientacion: s.id === 'calculos' ? 'vertical' : 'horizontal' })),
  };
}

/** Ancho y alto de la hoja según papel y orientación. */
export function dimensionesHoja(papel = 'a3', orientacion = 'horizontal') {
  const [corto, largo] = PAPELES[papel] || PAPELES.a3;
  return orientacion === 'vertical' ? { w: corto, h: largo } : { w: largo, h: corto };
}

const esElectrico = (el) => (elementoDe(el.type || el.id)?.cat || el.cat) === 'electrico';

/** Elementos que van en cada plano. */
export function elementosDeSeccion(seccion, elements = [], connections = []) {
  if (seccion === 'electrico') {
    const usados = new Set();
    connections.filter((c) => c.type === 'electrica').forEach((c) => { usados.add(c.from_id); usados.add(c.to_id); });
    return elements.filter((e) => esElectrico(e) || usados.has(e.id));
  }
  return elements.filter((e) => !esElectrico(e));
}
export function conexionesDeSeccion(seccion, connections = []) {
  return connections.filter((c) => (seccion === 'electrico' ? c.type === 'electrica' : c.type !== 'electrica'));
}

/** Caja que envuelve todo lo dibujado, en píxeles del plano. */
export function cajaDelPlano(walls = [], elements = [], connections = [], scale = 50) {
  const xs = []; const ys = [];
  walls.forEach((w) => { xs.push(w.x1, w.x2); ys.push(w.y1, w.y2); });
  elements.forEach((e) => {
    const w = (e.w_m || 0.5) * scale / 2, h = (e.h_m || 0.5) * scale / 2;
    xs.push(e.x - w, e.x + w); ys.push(e.y - h, e.y + h);
  });
  connections.forEach((c) => (c.path || []).forEach((p) => { xs.push(p.x); ys.push(p.y); }));
  if (!xs.length) return { x: 0, y: 0, w: 400, h: 300 };
  const pad = 0.6 * scale; // 60 cm de aire alrededor
  const x = Math.min(...xs) - pad, y = Math.min(...ys) - pad;
  return { x, y, w: Math.max(...xs) + pad - x, h: Math.max(...ys) + pad - y };
}

/** La escala normalizada (1:N) más grande en la que cabe el dibujo en la caja. */
export function escalaNormalizada(caja, scale, boxW, boxH) {
  const mmPorPx = Math.min(boxW / caja.w, boxH / caja.h); // mm de papel por px de plano
  const exacta = 1000 / (mmPorPx * scale); // 1:N exacto
  const N = ESCALAS_NORMALIZADAS.find((n) => n >= exacta) ?? ESCALAS_NORMALIZADAS[ESCALAS_NORMALIZADAS.length - 1];
  return { N, mmPorPx: 1000 / (N * scale), exacta };
}

const fmt = (n, d = 2) => Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: d });
const nombreDe = (e) => e.label || elementoDe(e.type || e.id)?.label || e.type || '?';

/** Datos rellenados de un elemento, como [etiqueta, valor]. */
export function datosDeElemento(el) {
  const def = elementoDe(el.type || el.id);
  const filas = [];
  (def?.campos || []).forEach((c) => {
    const v = el.datos?.[c.id];
    if (v !== '' && v != null) filas.push([c.etiqueta, String(v)]);
  });
  const d = el.datos || {};
  if (d.referencia) filas.unshift(['Referencia', `${d.referencia}${d.proveedor ? ` (${d.proveedor})` : ''}`]);
  if (d.ancho_cm) filas.push(['Ancho hueco', `${fmt(d.ancho_cm / 100)} m`]);
  return filas;
}

// ───────────────────────── Hoja, cajetín y cursor de texto ─────────────────────────

const MARGEN = 10;
const ALTO_CAJETIN = 16;

function nuevaHoja(doc, papel, orientacion, primera) {
  const { w, h } = dimensionesHoja(papel, orientacion);
  const [corto, largo] = PAPELES[papel] || PAPELES.a3;
  if (!primera) doc.addPage([corto, largo], orientacion === 'vertical' ? 'portrait' : 'landscape');
  return { w, h };
}

function marco(doc, W, H, { plan, empresa, titulo, escala, continuacion }) {
  doc.setDrawColor(40); doc.setLineWidth(0.5);
  doc.rect(MARGEN, MARGEN, W - 2 * MARGEN, H - 2 * MARGEN);
  const y0 = H - MARGEN - ALTO_CAJETIN;
  doc.setLineWidth(0.3);
  doc.line(MARGEN, y0, W - MARGEN, y0);
  const c1 = MARGEN + (W - 2 * MARGEN) * 0.45, c2 = MARGEN + (W - 2 * MARGEN) * 0.72, c3 = W - MARGEN - 26;
  [c1, c2, c3].forEach((x) => doc.line(x, y0, x, H - MARGEN));
  doc.setTextColor(20);
  doc.setFont(undefined, 'bold'); doc.setFontSize(10);
  doc.text(String(plan.name || 'Plano frigorífico'), MARGEN + 2, y0 + 6);
  doc.setFont(undefined, 'normal'); doc.setFontSize(7.5); doc.setTextColor(70);
  doc.text([plan.contact_name ? `Cliente: ${plan.contact_name}` : '', empresa?.company_name || ''].filter(Boolean).join('  ·  ') || ' ', MARGEN + 2, y0 + 12);
  doc.setFontSize(6.5); doc.setTextColor(120); doc.text('APARTADO', c1 + 2, y0 + 4);
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
  doc.text(`${titulo}${continuacion ? ' (cont.)' : ''}`, c1 + 2, y0 + 10.5);
  doc.setFont(undefined, 'normal'); doc.setFontSize(6.5); doc.setTextColor(120); doc.text('ESCALA · FECHA', c2 + 2, y0 + 4);
  doc.setFontSize(8); doc.setTextColor(20);
  doc.text(`${escala || 'S/E'}  ·  ${new Date().toLocaleDateString('es-ES')}`, c2 + 2, y0 + 10.5);
  doc.setFontSize(6.5); doc.setTextColor(120); doc.text('HOJA', c3 + 2, y0 + 4);
  return { yMax: y0 - 2 };
}

/** Cursor de texto que salta de hoja cuando no cabe. */
function crearCursor(doc, ctx, region) {
  const c = { x: region.x, y: region.y, w: region.w, yMax: region.yMax, x0: region.x, y0: region.y };
  const nueva = () => {
    nuevaHoja(doc, ctx.papel, ctx.orientacion, false);
    const { w, h } = dimensionesHoja(ctx.papel, ctx.orientacion);
    const m = marco(doc, w, h, { plan: ctx.plan, empresa: ctx.empresa, titulo: ctx.titulo, escala: ctx.escalaTexto, continuacion: true });
    ctx.hojas.push(doc.getNumberOfPages());
    c.x = MARGEN + 4; c.w = w - 2 * MARGEN - 8; c.x0 = c.x; c.y = MARGEN + 6; c.yMax = m.yMax;
  };
  c.sitio = (alto) => { if (c.y + alto > c.yMax) nueva(); };
  c.esc = (txt, { size = 8, negrita = false, sangria = 0, color = 40, alto } = {}) => {
    const paso = alto || (size <= 6.5 ? 3.3 : size <= 8 ? 3.9 : 4.6);
    const trozos = doc.setFontSize(size).splitTextToSize(String(txt), c.w - sangria);
    trozos.forEach((t) => {
      c.sitio(paso);
      doc.setFontSize(size); doc.setFont(undefined, negrita ? 'bold' : 'normal'); doc.setTextColor(color);
      doc.text(t, c.x + sangria, c.y + paso * 0.75);
      c.y += paso;
    });
  };
  c.titulo = (txt) => { c.y += 1.5; c.esc(txt, { size: 9.5, negrita: true, color: 20 }); doc.setDrawColor(190); doc.setLineWidth(0.2); doc.line(c.x, c.y - 0.6, c.x + c.w, c.y - 0.6); c.y += 0.8; };
  return c;
}

// ───────────────────────── Dibujo de la planta ─────────────────────────

function esquinas(el, scale) {
  const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
  const a = ((el.rot || 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([dx, dy]) => ({ x: el.x + dx * cos - dy * sin, y: el.y + dx * sin + dy * cos }));
}

/** Dibuja la planta de un apartado y devuelve la numeración de sus elementos. */
export function dibujarPlanta(doc, { modo, plan, elements, walls, connections, box }) {
  const scale = plan.scale || 50;
  const els = elementosDeSeccion(modo, elements, connections);
  const cons = conexionesDeSeccion(modo, connections);
  const caja = cajaDelPlano(walls, els, cons, scale);
  const { N, mmPorPx } = escalaNormalizada(caja, scale, box.w, box.h);
  const dw = caja.w * mmPorPx, dh = caja.h * mmPorPx;
  const ox = box.x + (box.w - dw) / 2, oy = box.y + (box.h - dh) / 2;
  const X = (x) => ox + (x - caja.x) * mmPorPx, Y = (y) => oy + (y - caja.y) * mmPorPx;

  doc.setDrawColor(200); doc.setLineWidth(0.15); doc.rect(box.x, box.y, box.w, box.h);

  // Paredes (la cámara va en azul si es positiva y rojo si es negativa)
  const gris = modo === 'electrico' ? 170 : 90;
  walls.forEach((w) => {
    if (w.camara) doc.setDrawColor(...(w.tipo === 'negativa' ? [220, 38, 38] : [37, 99, 235]));
    else doc.setDrawColor(gris);
    doc.setLineWidth(w.camara ? 0.9 : 0.6);
    doc.line(X(w.x1), Y(w.y1), X(w.x2), Y(w.y2));
  });

  // Cotas de las cámaras
  if (modo !== 'electrico') {
    camarasDePlano(walls).forEach((c) => {
      const ref = walls.find((w) => w.room_id === c.room_id);
      if (!ref) return;
      doc.setFontSize(6); doc.setTextColor(60); doc.setFont(undefined, 'normal');
      const cx = X(ref.room_x + (c.ancho * scale) / 2), top = Y(ref.room_y) - 1.2;
      doc.text(`${fmt(c.ancho)} m`, cx, top, { align: 'center' });
      doc.text(`${fmt(c.largo)} m`, X(ref.room_x) - 1.5, Y(ref.room_y + (c.largo * scale) / 2), { align: 'right' });
      doc.setTextColor(30); doc.setFontSize(7); doc.setFont(undefined, 'bold');
      doc.text(`${c.tipo === 'negativa' ? 'Cámara negativa' : 'Cámara positiva'} · ${fmt(c.ancho * c.largo)} m²`, cx, Y(ref.room_y + (c.largo * scale) / 2), { align: 'center' });
    });
  }

  // Conexiones
  cons.forEach((c) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    if (!a || !b) return;
    const rgb = c.type === 'refrigerante' ? [0, 150, 220] : c.type === 'conducto' ? [34, 160, 90]
      : c.conn_kind === 'comunicacion' ? [139, 92, 246] : [235, 130, 30];
    doc.setDrawColor(...rgb); doc.setLineWidth(c.type === 'refrigerante' ? 0.55 : 0.4);
    doc.setLineDash(c.type === 'refrigerante' ? [2.5, 1.2] : c.conn_kind === 'comunicacion' ? [1.5, 1] : []);
    const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
    for (let i = 1; i < pts.length; i++) doc.line(X(pts[i - 1].x), Y(pts[i - 1].y), X(pts[i].x), Y(pts[i].y));
    doc.setLineDash([]);
  });

  // Elementos y numeración
  const numeros = new Map();
  els.forEach((el, i) => {
    numeros.set(el.id, i + 1);
    const col = hexToRgb(el.color || elementoDe(el.type || el.id)?.color);
    const q = esquinas(el, scale);
    doc.setDrawColor(...col); doc.setLineWidth(0.35); doc.setFillColor(255, 255, 255);
    doc.lines(q.slice(1).map((p, k) => [X(p.x) - X(q[k].x), Y(p.y) - Y(q[k].y)]).concat([[X(q[0].x) - X(q[3].x), Y(q[0].y) - Y(q[3].y)]]), X(q[0].x), Y(q[0].y), [1, 1], 'FD', true);
    const wmm = (el.w_m || 0.5) * scale * mmPorPx, hmm = (el.h_m || 0.5) * scale * mmPorPx;
    if (wmm > 4 && hmm > 3) {
      doc.setFontSize(Math.min(7, Math.max(3.5, hmm * 0.7))); doc.setTextColor(...col); doc.setFont(undefined, 'bold');
      doc.text(el.glyph || elementoDe(el.type || el.id)?.glyph || '', X(el.x), Y(el.y), { align: 'center', baseline: 'middle' });
    }
    // chapita con el número, en la esquina superior izquierda
    const nx = X(Math.min(...q.map((p) => p.x))), ny = Y(Math.min(...q.map((p) => p.y)));
    doc.setFillColor(15, 23, 42); doc.circle(nx, ny, 1.9, 'F');
    doc.setTextColor(255); doc.setFontSize(5.5); doc.setFont(undefined, 'bold');
    doc.text(String(i + 1), nx, ny + 0.1, { align: 'center', baseline: 'middle' });
  });

  // Barra de escala (2 m)
  const m2 = 2 * scale * mmPorPx;
  const bx = box.x + 4, by = box.y + box.h - 5;
  doc.setDrawColor(30); doc.setLineWidth(0.5); doc.line(bx, by, bx + m2, by);
  doc.line(bx, by - 1, bx, by + 1); doc.line(bx + m2, by - 1, bx + m2, by + 1); doc.line(bx + m2 / 2, by - 0.7, bx + m2 / 2, by + 0.7);
  doc.setFontSize(6); doc.setTextColor(30); doc.setFont(undefined, 'normal');
  doc.text('0', bx, by - 2, { align: 'center' }); doc.text('2 m', bx + m2, by - 2, { align: 'center' });

  return { numeros, elementos: els, conexiones: cons, escala: `1:${N}`, N, mmPorPx };
}

// ───────────────────────── Apartados ─────────────────────────

function hojaConPlanta(doc, ctx, modo, primera) {
  const { plan, elements, walls, connections, empresa } = ctx.datos;
  const { w, h } = nuevaHoja(doc, ctx.papel, ctx.orientacion, primera);
  const vertical = ctx.orientacion === 'vertical';
  // Provisional: se calcula la escala para el cajetín antes de dibujar.
  const marcoInterior = { x: MARGEN + 2, y: MARGEN + 2, w: w - 2 * MARGEN - 4, h: h - 2 * MARGEN - ALTO_CAJETIN - 6 };
  const cajaLeyenda = vertical ? { w: marcoInterior.w, h: marcoInterior.h * 0.27 } : { w: marcoInterior.w * 0.30, h: marcoInterior.h };
  const box = vertical
    ? { x: marcoInterior.x, y: marcoInterior.y, w: marcoInterior.w, h: marcoInterior.h - cajaLeyenda.h - 2 }
    : { x: marcoInterior.x, y: marcoInterior.y, w: marcoInterior.w - cajaLeyenda.w - 2, h: marcoInterior.h };
  const regionLeyenda = vertical
    ? { x: marcoInterior.x + 2, y: box.y + box.h + 4, w: marcoInterior.w - 4 }
    : { x: box.x + box.w + 4, y: marcoInterior.y + 2, w: cajaLeyenda.w - 6 };

  const planta = dibujarPlanta(doc, { modo, plan, elements, walls, connections, box });
  const titulo = modo === 'electrico' ? 'Plano eléctrico' : 'Plano frigorífico';
  ctx.escalaTexto = planta.escala; ctx.titulo = titulo;
  const m = marco(doc, w, h, { plan, empresa, titulo, escala: planta.escala });
  ctx.hojas.push(doc.getNumberOfPages());
  const cur = crearCursor(doc, ctx, { ...regionLeyenda, yMax: vertical ? m.yMax : m.yMax });
  return { planta, cur };
}

/**
 * Leyenda y datos de un plano, como lista de líneas (sirve para PDF y CAD).
 * tipos: titulo · muestra (línea de color + texto) · negrita · dato · linea
 */
export function lineasLeyenda(modo, elementosNumerados, conexiones, datos) {
  const { elements, plan } = datos;
  const scale = plan.scale || 50;
  const out = [];
  const T = (t) => out.push({ tipo: 'titulo', t });
  const nombreNum = (el) => `${el.n}. ${nombreDe(el)}${el.brand ? ` — ${el.brand}` : ''}${el.model ? ` ${el.model}` : ''}`;
  T('Leyenda');
  if (modo === 'electrico') {
    [['Potencia / fuerza', [235, 130, 30]], ['Comunicación / datos', [139, 92, 246]], ['Pared / mampara', [90, 90, 90]]]
      .forEach(([t, rgb]) => out.push({ tipo: 'muestra', t, rgb }));
    T(`Líneas eléctricas (${conexiones.length})`);
    if (!conexiones.length) out.push({ tipo: 'linea', t: 'No hay conexiones eléctricas dibujadas.' });
    conexiones.forEach((c, i) => {
      const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
      out.push({ tipo: 'negrita', t: `L${i + 1}. ${nombreDe(a || {})} → ${nombreDe(b || {})} · ${fmt(longitudConexion(c, elements, scale))} m` });
      const ds = c.conn_kind === 'comunicacion'
        ? [`Bus: ${c.comm_type || '—'}${c.cable ? ` · Cable: ${c.cable}` : ''}`]
        : [`${c.power_type || 'Potencia'}${c.power_w ? ` · ${fmt(c.power_w, 0)} W` : ''}`, `Sección: ${c.section_mm2 ? `${c.section_mm2} mm²` : '—'}${c.voltage ? ` · ${c.voltage}` : ''}`];
      ds.forEach((t) => out.push({ tipo: 'dato', t }));
    });
  } else {
    [['Tubería refrigerante (gas / líquido)', [0, 150, 220]], ['Conducto de aire', [34, 160, 90]], ['Cámara positiva', [37, 99, 235]], ['Cámara negativa', [220, 38, 38]], ['Pared / mampara', [90, 90, 90]]]
      .forEach(([t, rgb]) => out.push({ tipo: 'muestra', t, rgb }));
  }
  T(`Elementos (${elementosNumerados.length})`);
  elementosNumerados.forEach((el) => {
    out.push({ tipo: 'negrita', t: nombreNum(el) });
    datosDeElemento(el).forEach(([k, v]) => out.push({ tipo: 'dato', t: `${k}: ${v}` }));
  });
  return out;
}

function pintarLineas(cur, lineas) {
  const doc = cur.doc;
  lineas.forEach((l) => {
    if (l.tipo === 'titulo') cur.titulo(l.t);
    else if (l.tipo === 'muestra') {
      cur.sitio(4.2);
      doc.setDrawColor(...l.rgb); doc.setLineWidth(0.8); doc.line(cur.x, cur.y + 1.6, cur.x + 8, cur.y + 1.6);
      doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(60); doc.text(l.t, cur.x + 10, cur.y + 2.4);
      cur.y += 4.2;
    } else if (l.tipo === 'negrita') cur.esc(l.t, { size: 8, negrita: true, color: 20 });
    else if (l.tipo === 'dato') cur.esc(l.t, { size: 6.8, sangria: 4, color: 70 });
    else cur.esc(l.t, { color: 100 });
  });
}

/** Líneas de texto de CÁLCULOS Y MEDIDAS (se usan en PDF y en CAD). */
export function lineasDeCalculos(datos) {
  const { plan, elements, walls, connections, presupuesto } = datos;
  const scale = plan.scale || 50;
  const out = [];
  const T = (t) => out.push({ t, tipo: 'titulo' });
  const L = (t, sangria = 0, tipo = 'linea') => out.push({ t, sangria, tipo });

  T('Resumen de la instalación');
  const cuenta = {};
  elements.forEach((e) => { const n = nombreDe(e); cuenta[n] = (cuenta[n] || 0) + (parseInt(e.qty, 10) || 1); });
  L(`Elementos: ${elements.length}`);
  Object.entries(cuenta).forEach(([k, v]) => L(`${k}: ${v}`, 4));
  const mParedes = walls.reduce((s, w) => s + Math.hypot(w.x2 - w.x1, w.y2 - w.y1) / scale, 0);
  L(`Paredes: ${walls.length} tramos · ${fmt(mParedes)} m lineales`);

  const camaras = camarasDePlano(walls);
  T(`Cámaras frigoríficas y cargas (${camaras.length})`);
  if (!camaras.length) L('No hay cámaras dibujadas.');
  camaras.forEach((c, i) => {
    const r = cargaFrigorifica(c);
    L(`Cámara ${i + 1} · ${c.tipo}: ${fmt(c.ancho)} × ${fmt(c.largo)} × ${fmt(c.alto)} m · ${fmt(c.ancho * c.largo)} m² · ${fmt(r.volumen, 1)} m³ · panel ${c.espesor_mm} mm`);
    L(`Carga ${fmt(r.kw_frio)} kW → equipo ${fmt(r.kw_equipo)} kW (${r.ajustes.horas_funcionamiento} h) → máquina de ${fmt(r.kw_comercial, 1)} kW · evaporación ${r.temp_evaporacion} °C`, 4);
    const d = r.desglose_w;
    L(`Transmisión ${d.transmision} W · producto ${d.producto} W · aire/puertas ${d.infiltracion} W · luz/personas ${d.internas} W · ventiladores ${d.ventiladores} W · desescarche ${d.desescarche} W`, 4);
    r.avisos.forEach((a) => L(`Aviso: ${a}`, 4));
  });

  const { tub, gas, liq } = resumenTuberias(connections, elements, scale);
  T(`Tuberías refrigerantes (${tub.length})`);
  if (!tub.length) L('No hay tuberías dibujadas.');
  tub.forEach((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    L(`${i + 1}. ${nombreDe(a || {})} → ${nombreDe(b || {})} · ${fmt(longitudConexion(c, elements, scale))} m · gas ${c.gas_diameter || '—'} · líquido ${c.liquid_diameter || '—'}${c.height_m ? ` · desnivel ${c.height_m} m` : ''}`);
  });
  Object.entries(gas).forEach(([d, m]) => L(`Total gas ${d}: ${fmt(m, 1)} m`, 4));
  Object.entries(liq).forEach(([d, m]) => L(`Total líquido ${d}: ${fmt(m, 1)} m`, 4));

  const ele = connections.filter((c) => c.type === 'electrica');
  const potencia = ele.reduce((s, c) => s + (Number(c.power_w) || 0), 0);
  T(`Instalación eléctrica (${ele.length} líneas)`);
  if (!ele.length) L('No hay líneas eléctricas dibujadas.');
  ele.forEach((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    L(`L${i + 1}. ${nombreDe(a || {})} → ${nombreDe(b || {})} · ${fmt(longitudConexion(c, elements, scale))} m · ${c.section_mm2 ? `${c.section_mm2} mm²` : 'sección —'}${c.power_w ? ` · ${fmt(c.power_w, 0)} W` : ''}`);
  });
  if (potencia > 0) L(`Potencia total declarada en líneas: ${fmt(potencia, 0)} W`, 4);

  const cond = connections.filter((c) => c.type === 'conducto');
  if (cond.length) { T(`Conductos (${cond.length})`); L(`Longitud total: ${fmt(cond.reduce((s, c) => s + longitudConexion(c, elements, scale), 0))} m`); }

  if (presupuesto && presupuesto.total > 0) {
    T('Presupuesto aproximado');
    L(`Material: ${fmt(presupuesto.materiales)} €`); L(`Mano de obra: ${fmt(presupuesto.manoObra)} €`);
    L(`TOTAL: ${fmt(presupuesto.total)} €`, 0, 'negrita');
    if (presupuesto.aviso) L(presupuesto.aviso, 0, 'aviso');
  }
  T('Aviso técnico');
  L('Valores ORIENTATIVOS de dimensionado: prevalecen la ficha técnica del fabricante, el RSIF y el REBT. Requiere revisión y firma de técnico cualificado.', 0, 'aviso');
  return out;
}

function hojaCalculos(doc, ctx, primera) {
  const { plan, empresa } = ctx.datos;
  const { w, h } = nuevaHoja(doc, ctx.papel, ctx.orientacion, primera);
  ctx.titulo = 'Cálculos y medidas'; ctx.escalaTexto = '—';
  const m = marco(doc, w, h, { plan, empresa, titulo: ctx.titulo, escala: '—' });
  ctx.hojas.push(doc.getNumberOfPages());
  const cur = crearCursor(doc, ctx, { x: MARGEN + 4, y: MARGEN + 6, w: w - 2 * MARGEN - 8, yMax: m.yMax });
  cur.doc = doc;
  lineasDeCalculos(ctx.datos).forEach((l) => {
    if (l.tipo === 'titulo') cur.titulo(l.t);
    else cur.esc(l.t, { size: l.tipo === 'aviso' ? 7 : 8, negrita: l.tipo === 'negrita', sangria: l.sangria || 0, color: l.tipo === 'aviso' ? 110 : 40 });
  });
}

function hojaVista3D(doc, ctx, primera) {
  const { plan, elements, walls, connections, empresa } = ctx.datos;
  const { w, h } = nuevaHoja(doc, ctx.papel, ctx.orientacion, primera);
  const m = marco(doc, w, h, { plan, empresa, titulo: 'Vista 3D', escala: 'S/E' });
  ctx.hojas.push(doc.getNumberOfPages());
  let img = null;
  try { img = generarVista3DDataUrl({ walls, elements, connections, scale: plan.scale || 50 }); } catch { img = null; }
  const caja = { x: MARGEN + 4, y: MARGEN + 4, w: w - 2 * MARGEN - 8, h: m.yMax - MARGEN - 6 };
  if (!img) {
    doc.setFontSize(10); doc.setTextColor(120); doc.text('No hay nada dibujado para mostrar en 3D.', caja.x, caja.y + 8);
    return;
  }
  const ratio = VISTA3D_W / VISTA3D_H;
  let iw = caja.w, ih = iw / ratio;
  if (ih > caja.h) { ih = caja.h; iw = ih * ratio; }
  doc.addImage(img, 'PNG', caja.x + (caja.w - iw) / 2, caja.y + (caja.h - ih) / 2, iw, ih);
}

/**
 * Construye el PDF por apartados.
 * @param opciones { papel:'a3'|'a4', secciones:[{id, incluir, orientacion}] , autoPrint }
 */
export function construirPaquetePDF(datos, opciones = opcionesPorDefecto()) {
  const plan = datos.plan || {};
  const d = { ...datos, plan, elements: datos.elements || [], walls: datos.walls || [], connections: datos.connections || [], empresa: datos.empresa || {} };
  const elegidas = (opciones.secciones || []).filter((s) => s.incluir !== false);
  if (!elegidas.length) throw new Error('Elige al menos un apartado.');
  const papel = opciones.papel || 'a3';
  const primera = elegidas[0];
  const [corto, largo] = PAPELES[papel] || PAPELES.a3;
  const fabrica = opciones.fabrica || ((o) => new jsPDF(o));
  const doc = fabrica({ orientation: primera.orientacion === 'vertical' ? 'portrait' : 'landscape', unit: 'mm', format: [corto, largo] });
  const hojas = [];
  let esPrimera = true;
  for (const s of elegidas) {
    if (typeof doc.apartado === 'function') doc.apartado(s.id);
    const ctx = { doc, papel, orientacion: s.orientacion === 'vertical' ? 'vertical' : 'horizontal', datos: d, plan, empresa: d.empresa, hojas };
    if (s.id === 'frigorifico' || s.id === 'electrico') {
      const { planta, cur } = hojaConPlanta(doc, ctx, s.id, esPrimera);
      cur.doc = doc;
      pintarLineas(cur, lineasLeyenda(s.id, numerar(planta), planta.conexiones, d));
      if (s.id === 'electrico' && planta.conexiones.length && !opciones.soloCad) {
        // Esquema eléctrico (diagrama) como hoja siguiente del mismo apartado.
        construirEsquemaElectrico(plan, d.elements, d.connections, d.empresa, { doc, orientacion: ctx.orientacion, papel });
        hojas.push(doc.getNumberOfPages());
      }
    } else if (s.id === 'calculos') hojaCalculos(doc, ctx, esPrimera);
    else if (s.id === 'vista3d') hojaVista3D(doc, ctx, esPrimera);
    esPrimera = false;
  }
  // Numeración de hojas "n / total" en el cajetín.
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const { width: W, height: H } = doc.internal.pageSize;
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
    doc.text(`${p} / ${total}`, W - MARGEN - 24, H - MARGEN - 3.5);
  }
  if (opciones.autoPrint) doc.autoPrint();
  return doc;
}

/** Elementos de la planta con su número de chapita. */
export function numerar(planta) {
  return planta.elementos.map((e) => ({ ...e, n: planta.numeros.get(e.id) }));
}

export function nombreArchivo(plan, ext) {
  return `${String(plan?.name || 'plano').replace(/[^\w\-]+/g, '_')}.${ext}`;
}
