// informeAseguradoraPlano.js — Genera un PDF estructurado para aseguradoras a
// partir de un plano frigorífico: portada con los datos del siniestro, esquema
// vectorial de la instalación, lista de materiales y cálculos (tuberías,
// conductos y conexiones eléctricas), fotos del estado antes/después/daño y
// bloque de doble firma digital (técnico y cliente).
//
// Es la versión "informe para la aseguradora" del plano: no lleva presupuesto,
// lleva la valoración técnica que pide el perito.

import { jsPDF } from 'jspdf';
import { dibujarPlanoVectorial } from '@/lib/planoDibujoPdf';
import { longitudConexion, resumenTuberias } from '@/lib/planoCalculo';
import { elementoDe } from '@/lib/planoFrigorificoCatalogo';
import { generarVista3DDataUrl, VISTA3D_W, VISTA3D_H } from '@/lib/planoVista3D';

const esc = (t) => String(t ?? '');
const eu = (n) => `${(Number(n) || 0).toFixed(2)} €`;

const TIPOS_EQUIPO = {
  aire_acondicionado: 'Aire acondicionado',
  bomba_calor: 'Bomba de calor',
  camara_frigorifica: 'Cámara frigorífica',
  electrico: 'Eléctrico',
  solar: 'Solar',
  fontaneria: 'Fontanería',
  otro: 'Otro',
};
const VIABILIDAD = {
  reparable: 'Reparable',
  irreparable: 'Irreparable',
  pendiente_valoracion: 'Pendiente de valoración',
};

function fmtFecha(f) {
  if (!f) return '';
  try { return new Date(f).toLocaleDateString('es-ES'); } catch { return f; }
}
function ahora() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Convierte cualquier src (URL firmada, pública o dataURL) a dataURL JPEG para
// jsPDF. Primero fetch (evita el taint del canvas por CORS); si no, Image+canvas.
async function aDataUrl(src) {
  if (!src) return null;
  if (String(src).startsWith('data:')) return src;
  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch');
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    const img = await new Promise((resolve) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = src;
    });
    if (!img) return null;
    try {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width;
      c.height = img.naturalHeight || img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/jpeg', 0.85);
    } catch { return null; }
  }
}

function addImg(doc, dataUrl, x, y, w, h) {
  if (!dataUrl) return false;
  const fmt = String(dataUrl).startsWith('data:image/png') ? 'PNG' : 'JPEG';
  try { doc.addImage(dataUrl, fmt, x, y, w, h); return true; }
  catch { try { doc.addImage(dataUrl, 'JPEG', x, y, w, h); return true; } catch { return false; } }
}

// Tabla de rejilla con cabecera azul y filas alternas. Devuelve la y tras la tabla.
function tabla(doc, { x, y, cols, headers, rows, lineH = 5, fontSize = 8, PH, M }) {
  const W = cols.reduce((a, b) => a + b, 0);
  const startY = y;
  doc.setFillColor(37, 99, 235); doc.rect(x, y, W, lineH, 'F');
  doc.setTextColor(255); doc.setFontSize(fontSize); doc.setFont(undefined, 'bold');
  let cx = x;
  headers.forEach((h, i) => { doc.text(esc(h), cx + 1.5, y + lineH - 1.7); cx += cols[i]; });
  y += lineH;
  doc.setFont(undefined, 'normal'); doc.setTextColor(30);
  rows.forEach((r, ri) => {
    if (y + lineH > PH - M) { doc.addPage(); y = M; doc.setFillColor(37, 99, 235); }
    if (ri % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(x, y, W, lineH, 'F'); }
    cx = x;
    r.forEach((c, i) => {
      const lines = doc.splitTextToSize(esc(c ?? '—'), cols[i] - 3);
      doc.text(lines, cx + 1.5, y + lineH - 1.7);
      cx += cols[i];
    });
    doc.setDrawColor(203); doc.setLineWidth(0.2);
    doc.line(x, y + lineH, x + W, y + lineH);
    y += lineH;
  });
  doc.setDrawColor(203);
  let bx = x;
  cols.forEach((cw) => { doc.line(bx, startY, bx, y); bx += cw; });
  doc.line(x + W, startY, x + W, y);
  doc.line(x, startY, x + W, startY);
  return y;
}

/**
 * Genera el PDF del informe técnico para aseguradoras.
 * @param {object} plan    RefrigerationPlan
 * @param {Array}  elements  equipos del plano
 * @param {Array}  walls     paredes
 * @param {Array}  connections conexiones
 * @param {object} empresa   CompanySettings
 * @param {object} datos     metadatos del informe (aseguradora, póliza, siniestro…)
 * @param {object} fotos     { before:[], after:[], damage:[] } URLs firmadas/públicas
 * @param {object} firmas    { tecnico, cliente, fecha_tecnico, fecha_cliente, nombre_tecnico, nombre_cliente }
 * @returns {Promise<jsPDF>}
 */
export async function generarInformeAseguradora({
  plan = {}, elements = [], walls = [], connections = [],
  empresa = {}, datos = {}, fotos = {}, firmas = {},
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210, PH = 297, M = 14;
  const W = PW - M * 2;
  let y = M;
  const colW = (W - 4) / 2;

  const nuevoBloque = (alto) => { if (y + alto > PH - M) { doc.addPage(); y = M; } };
  const parrafo = (txt, size = 9) => {
    doc.setFontSize(size); doc.setFont(undefined, 'normal'); doc.setTextColor(30);
    doc.splitTextToSize(esc(txt || '—'), W).forEach((l) => {
      nuevoBloque(size * 0.5 + 1);
      doc.text(l, M, y); y += size * 0.5 + 1;
    });
  };
  const titulo = (txt) => {
    y += 3; nuevoBloque(10);
    doc.setFillColor(37, 99, 235); doc.rect(M, y - 4, W, 7, 'F');
    doc.setTextColor(255); doc.setFontSize(10); doc.setFont(undefined, 'bold');
    doc.text(esc(txt), M + 3, y + 0.5);
    y += 7; doc.setTextColor(30);
  };
  const campo = (etiqueta, valor, x, w) => {
    nuevoBloque(12);
    doc.setFontSize(7); doc.setTextColor(100); doc.setFont(undefined, 'bold');
    doc.text(esc(etiqueta).toUpperCase(), x, y);
    doc.setFontSize(9.5); doc.setTextColor(30); doc.setFont(undefined, 'normal');
    const v = doc.splitTextToSize(esc(valor || '—'), w);
    doc.text(v, x, y + 4.5);
    y += 4.5 + v.length * 4.2;
  };

  // ── Cabecera ──
  doc.setFillColor(15, 23, 42); doc.rect(M, y, W, 22, 'F');
  if (empresa.logo_url) { try { doc.addImage(empresa.logo_url, 'PNG', M + 3, y + 3, 16, 16); } catch {} }
  doc.setTextColor(255); doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text(esc(empresa.company_name || 'Mi empresa'), M + 23, y + 9);
  doc.setFontSize(7.5); doc.setFont(undefined, 'normal'); doc.setTextColor(200);
  doc.text([empresa.nif, empresa.address, empresa.city, empresa.phone].filter(Boolean).join(' · '), M + 23, y + 14);
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(255);
  doc.text('INFORME TÉCNICO PARA ASEGURADORA', M + 23, y + 19);
  y += 22 + 4;

  doc.setFontSize(8); doc.setTextColor(60);
  doc.text(`Nº informe: ${esc(datos.report_number || '—')}     Fecha informe: ${fmtFecha(datos.report_date) || ahora()}     Técnico: ${esc(datos.technician || '—')}`, M, y);
  y += 5;

  // ── Asegurado y póliza ──
  titulo('Datos del asegurado y póliza');
  campo('Asegurado / cliente', plan.contact_name || datos.contact_name, M, colW);
  campo('Ubicación del equipo', datos.location, M + colW + 4, colW);
  campo('Compañía aseguradora', datos.insurance_company, M, colW);
  campo('Nº de póliza', datos.insurance_policy, M + colW + 4, colW);
  campo('Referencia de siniestro', datos.insurance_claim_ref, M, colW);
  campo('Fecha del siniestro', fmtFecha(datos.claim_date), M + colW + 4, colW);

  // ── Equipo inspeccionado ──
  titulo('Equipo inspeccionado');
  campo('Tipo de equipo', TIPOS_EQUIPO[datos.equipment_type] || datos.equipment_type, M, colW);
  campo('Marca', datos.equipment_brand, M + colW + 4, colW);
  campo('Modelo', datos.equipment_model, M, colW);
  campo('Nº de serie', datos.equipment_serial, M + colW + 4, colW);

  // ── Valoración técnica ──
  titulo('Descripción de la avería / siniestro');
  parrafo(datos.failure_description);
  titulo('Valoración técnica de los daños');
  parrafo(datos.damage_assessment);
  titulo('Análisis de la causa probable');
  parrafo(datos.cause_analysis);
  titulo('Propuesta de reparación');
  parrafo(datos.repair_proposal);
  campo('Viabilidad de la reparación', VIABILIDAD[datos.repair_viable] || '—', M, colW);
  campo('Coste estimado de reparación', datos.estimated_cost != null ? eu(datos.estimated_cost) : '—', M + colW + 4, colW);

  // ── Esquema de la instalación ──
  doc.addPage(); y = M;
  titulo('Esquema de la instalación');
  const boxH = PH - M - y - 6;
  const { drawH } = dibujarPlanoVectorial(doc, { plan, elements, walls, connections, ox: M, oy: y, boxW: W, boxH: boxH });
  y += drawH + 4;
  doc.setFontSize(7); doc.setTextColor(110);
  doc.text(`Escala 1 px = ${(1 / (plan.scale || 50)).toFixed(3)} m · ${elements.length} equipos · ${connections.length} conexiones`, M, y);

  // ── Vista 3D de la instalación ──
  //
  // La misma vista isométrica que se guarda junto al plano, dibujada aquí a
  // partir del plano actual (nunca una imagen atrasada). El perito ve así el
  // volumen de la instalación, no solo la planta.
  const vista3D = generarVista3DDataUrl({
    walls: walls || [], elements: elements || [], connections: plan.connections || [], scale: plan.scale || 50,
  });
  if (vista3D) {
    doc.addPage(); y = M;
    titulo('Vista 3D de la instalación');
    const cajaW = W;
    const cajaH = PH - M - y - 6;
    const ratio = VISTA3D_W / VISTA3D_H;
    let w = cajaW, h = w / ratio;
    if (h > cajaH) { h = cajaH; w = h * ratio; }
    doc.setDrawColor(203); doc.setLineWidth(0.3);
    doc.rect(M, y, w, h, 'S');
    addImg(doc, vista3D, M, y, w, h);
    y += h + 4;
    doc.setFontSize(7); doc.setTextColor(110);
    doc.text(`Vista isométrica · ${elements.length} equipos · ${(walls || []).length} paredes`, M, y);
  }

  // ── Lista de materiales y cálculos ──
  doc.addPage(); y = M;
  titulo('Lista de materiales y cálculos de la instalación');

  // Equipos
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
  doc.text('Equipos del plano', M, y); y += 4;
  const counts = {};
  elements.forEach((e) => { counts[e.label || e.type] = (counts[e.label || e.type] || 0) + (parseInt(e.qty) || 1); });
  y = tabla(doc, { x: M, y, cols: [W * 0.7, W * 0.3], headers: ['Concepto', 'Cantidad'],
    rows: Object.entries(counts).map(([k, v]) => [k, String(v)]), PH, M }) + 3;

  // Datos técnicos por equipo
  const conDatos = elements.filter((e) => Object.values(e.datos || {}).some((v) => v !== '' && v != null));
  if (conDatos.length) {
    nuevoBloque(8);
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
    doc.text('Datos técnicos de los equipos', M, y); y += 4;
    const rows = conDatos.map((e) => {
      const def = elementoDe(e.type || e.id);
      const pares = (def?.campos || []).map((c) => `${c.etiqueta}: ${e.datos?.[c.id] ?? ''}`).filter((s) => !s.endsWith(': '));
      return [e.label || def?.label || '?', e.brand ? `${e.brand} ${e.model || ''}`.trim() : '—', pares.join(' · ') || '—'];
    });
    y = tabla(doc, { x: M, y, cols: [W * 0.28, W * 0.28, W * 0.44], headers: ['Equipo', 'Marca / modelo', 'Datos técnicos'],
      rows, lineH: 5, fontSize: 7.5, PH, M }) + 3;
  }

  // Tuberías refrigerantes
  const { tub, gas, liq } = resumenTuberias(connections, elements, plan.scale);
  doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
  doc.text(`Tuberías refrigerantes (${tub.length})`, M, y); y += 4;
  const tubRows = tub.map((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    const L = longitudConexion(c, elements, plan.scale);
    return [`${i + 1}`, `${a?.label || '?'} → ${b?.label || '?'}`, `${L.toFixed(2)} m`, c.gas_diameter || '—', c.liquid_diameter || '—', c.height_m ? `${c.height_m} m` : '—'];
  });
  y = tabla(doc, { x: M, y, cols: [W * 0.06, W * 0.4, W * 0.14, W * 0.13, W * 0.13, W * 0.14],
    headers: ['#', 'Tramo', 'Long.', 'Gas', 'Líquido', 'Desnivel'], rows: tubRows, lineH: 5, fontSize: 7.5, PH, M }) + 2;
  if (Object.keys(gas).length || Object.keys(liq).length) {
    doc.setFontSize(8); doc.setTextColor(60);
    doc.text('Totales por diámetro:', M, y); y += 3.5;
    const totRows = [
      ...Object.entries(gas).map(([d, L]) => ['Gas', d, `${L.toFixed(1)} m`]),
      ...Object.entries(liq).map(([d, L]) => ['Líquido', d, `${L.toFixed(1)} m`]),
    ];
    y = tabla(doc, { x: M, y, cols: [W * 0.3, W * 0.3, W * 0.4], headers: ['Línea', 'Diámetro', 'Longitud total'], rows: totRows, lineH: 5, fontSize: 7.5, PH, M }) + 3;
  }

  // Conductos
  const conductos = connections.filter((c) => c.type === 'conducto');
  if (conductos.length) {
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
    doc.text(`Conductos de ventilación (${conductos.length})`, M, y); y += 4;
    const rows = conductos.map((c, i) => {
      const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
      const L = longitudConexion(c, elements, plan.scale);
      return [`${i + 1}`, `${a?.label || '?'} → ${b?.label || '?'}`, `${L.toFixed(2)} m`, c.duct_section || '—', c.duct_shape || '—', c.duct_caudal_m3h ? `${c.duct_caudal_m3h} m³/h` : '—'];
    });
    y = tabla(doc, { x: M, y, cols: [W * 0.06, W * 0.36, W * 0.14, W * 0.14, W * 0.14, W * 0.16],
      headers: ['#', 'Tramo', 'Long.', 'Sección', 'Forma', 'Caudal'], rows, lineH: 5, fontSize: 7.5, PH, M }) + 3;
  }

  // Conexiones eléctricas
  const ele = connections.filter((c) => c.type === 'electrica');
  if (ele.length) {
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
    doc.text(`Conexiones eléctricas (${ele.length})`, M, y); y += 4;
    const rows = ele.map((c, i) => {
      const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
      const L = longitudConexion(c, elements, plan.scale);
      const tipo = c.conn_kind === 'comunicacion' ? 'Comunicación' : 'Potencia';
      return [`${i + 1}`, `${a?.label || '?'} → ${b?.label || '?'}`, `${L.toFixed(2)} m`, tipo, c.section_mm2 ? `${c.section_mm2} mm²` : '—', c.voltage || '—'];
    });
    y = tabla(doc, { x: M, y, cols: [W * 0.06, W * 0.36, W * 0.14, W * 0.18, W * 0.14, W * 0.12],
      headers: ['#', 'Tramo', 'Long.', 'Tipo', 'Sección', 'Tensión'], rows, lineH: 5, fontSize: 7.5, PH, M }) + 3;
  }

  if (datos.observations || plan.observations) {
    doc.setFontSize(9); doc.setFont(undefined, 'bold'); doc.setTextColor(30);
    doc.text('Observaciones', M, y); y += 4;
    parrafo(datos.observations || plan.observations);
  }

  // ── Fotos ──
  const secciones = [
    { key: 'damage', titulo: 'Fotos del daño / siniestro' },
    { key: 'before', titulo: 'Fotos del estado ANTES de la reparación' },
    { key: 'after', titulo: 'Fotos del estado DESPUÉS de la reparación' },
  ];
  for (const sec of secciones) {
    const urls = fotos[sec.key] || [];
    // Cargar todas las imágenes a dataURL (las que fallen se quedan a null)
    const dataUrls = await Promise.all(urls.map((u) => aDataUrl(u)));
    const validas = dataUrls.filter(Boolean);
    if (validas.length === 0) continue;
    doc.addPage(); y = M;
    titulo(sec.titulo);
    const imgW = (W - 6) / 2;
    const imgH = 60;
    let col = 0;
    for (const d of dataUrls) {
      if (!d) continue;
      const x = M + col * (imgW + 6);
      if (y + imgH + 6 > PH - M) { doc.addPage(); y = M; col = 0; }
      const x2 = M + col * (imgW + 6);
      doc.setDrawColor(203); doc.setLineWidth(0.3); doc.rect(x2, y, imgW, imgH, 'S');
      const ok = addImg(doc, d, x2 + 1, y + 1, imgW - 2, imgH - 2);
      if (!ok) { doc.setFontSize(8); doc.setTextColor(180); doc.text('(imagen no disponible)', x2 + 3, y + imgH / 2); }
      col++;
      if (col === 2) { col = 0; y += imgH + 6; }
    }
    if (col === 1) y += imgH + 6;
  }

  // ── Doble firma digital ──
  doc.addPage(); y = M;
  titulo('Conformidad y firmas');
  doc.setFontSize(9); doc.setTextColor(40); doc.setFont(undefined, 'normal');
  doc.splitTextToSize('El técnico abajo firmante certifica que los datos, el esquema y los cálculos de este informe reflejan el estado real de la instalación inspeccionada. El cliente manifiesta su conformidad con el contenido del presente informe.', W)
    .forEach((l) => { doc.text(l, M, y); y += 4.5; });
  y += 6;

  const firmW = (W - 6) / 2;
  const firmH = 34;
  const firmaBox = (x, etiqueta, dataUrl, nombre, fecha) => {
    doc.setDrawColor(120); doc.setLineWidth(0.3); doc.rect(x, y, firmW, firmH, 'S');
    doc.setFontSize(7); doc.setTextColor(100); doc.setFont(undefined, 'bold');
    doc.text(esc(etiqueta).toUpperCase(), x + 2, y + 4);
    if (dataUrl) addImg(doc, dataUrl, x + 4, y + 6, firmW - 8, firmH - 16);
    else { doc.setFontSize(8); doc.setTextColor(180); doc.setFont(undefined, 'normal'); doc.text('Sin firma', x + 4, y + firmH / 2); }
    doc.setDrawColor(160); doc.line(x + 4, y + firmH - 8, x + firmW - 4, y + firmH - 8);
    doc.setFontSize(8); doc.setTextColor(40); doc.setFont(undefined, 'normal');
    doc.text(`Nombre: ${esc(nombre || '—')}`, x + 4, y + firmH - 4);
    doc.text(`Fecha: ${esc(fecha || '—')}`, x + firmW / 2, y + firmH - 4);
  };
  firmaBox(M, 'Firma del técnico', firmas.tecnico, firmas.nombre_tecnico, firmas.fecha_tecnico);
  firmaBox(M + firmW + 6, 'Firma del cliente', firmas.cliente, firmas.nombre_cliente, firmas.fecha_cliente);

  // Pie del informe
  y += firmH + 6;
  doc.setFontSize(7); doc.setTextColor(140);
  doc.text(`Documento generado el ${ahora()} · ${esc(empresa.company_name || '')} · Informe técnico para aseguradoras`, M, y);

  return doc;
}

export function exportarInformeAseguradora(doc, nombre = 'informe_aseguradora') {
  doc.save(`${nombre.replace(/[^\w\-]+/g, '_')}.pdf`);
}