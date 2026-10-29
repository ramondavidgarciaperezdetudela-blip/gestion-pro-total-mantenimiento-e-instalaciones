import { jsPDF } from 'jspdf';
import { elementoDe } from '@/lib/planoFrigorificoCatalogo';

// Esquema eléctrico de la instalación, generado a partir del plano.
//
// Solo dibuja las conexiones eléctricas (potencia y comunicaciones) y las
// máquinas a las que llegan, con su sección de cable, tipo de conexión y
// potencia. Es lo que se adjunta al informe técnico para que el electricista
// y la aseguradora vean cómo queda cableado el equipo.

const CANVAS = { w: 1400, h: 900 };
const POTENCIA = '#F5821F';
const COMUNICA = '#8b5cf6';

function hexToRgb(hex) {
  const h = (hex || '#888888').replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 120,
    parseInt(h.slice(2, 4), 16) || 120,
    parseInt(h.slice(4, 6), 16) || 120,
  ];
}

export function construirEsquemaElectrico(plan, elements, connections, empresa = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const margin = 12;

  // Cabecera
  doc.setFontSize(15); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
  doc.text('Esquema eléctrico de la instalación', margin, margin + 6);
  doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
  const sub = [
    plan.name || 'Plano',
    plan.contact_name ? `Cliente: ${plan.contact_name}` : null,
    `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
  ].filter(Boolean);
  doc.text(sub.join('     ·     '), margin, margin + 12);

  const elec = connections.filter((c) => c.type === 'electrica');
  const involved = new Set();
  elec.forEach((c) => { involved.add(c.from_id); involved.add(c.to_id); });
  const nodos = elements.filter((e) => involved.has(e.id) || e.type === 'cuadro_electrico');

  // Área de dibujo
  const drawW = PW - margin * 2;
  const drawH = PH - margin * 2 - 18;
  const ox = margin, oy = margin + 18;

  if (nodos.length === 0) {
    doc.setFontSize(11); doc.setTextColor(120);
    doc.text('No hay conexiones eléctricas en este plano. Usa «Conectar» · «Eléctrica» entre equipos.', ox, oy + 10);
    return doc;
  }

  // Escala de las posiciones del plano al área de dibujo
  const xs = nodos.map((n) => n.x), ys = nodos.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const pad = 26;
  const sc = Math.min((drawW - pad * 2) / spanX, (drawH - pad * 2) / spanY);
  const toX = (x) => ox + pad + (x - minX) * sc;
  const toY = (y) => oy + pad + (y - minY) * sc;

  // Conexiones primero (debajo de las cajas)
  elec.forEach((c) => {
    const a = elements.find((e) => e.id === c.from_id);
    const b = elements.find((e) => e.id === c.to_id);
    if (!a || !b) return;
    const esDatos = c.conn_kind === 'comunicacion';
    const color = esDatos ? COMUNICA : POTENCIA;
    const [r, g, bl] = hexToRgb(color);
    doc.setDrawColor(r, g, bl);
    doc.setLineWidth(esDatos ? 0.8 : 1.2);
    doc.setLineDash(esDatos ? [3, 2] : []);
    const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
    for (let i = 1; i < pts.length; i++) {
      doc.line(toX(pts[i - 1].x), toY(pts[i - 1].y), toX(pts[i].x), toY(pts[i].y));
    }
    doc.setLineDash([]);
    // Etiqueta
    const mx = toX((a.x + b.x) / 2), my = toY((a.y + b.y) / 2);
    const tag = esDatos
      ? (c.comm_type || 'Comunicación')
      : [c.section_mm2 ? `${c.section_mm2} mm²` : null, c.power_type, c.voltage ? `${c.voltage} V` : null].filter(Boolean).join(' · ') || 'Potencia';
    doc.setFontSize(7); doc.setTextColor(r, g, bl);
    const w = doc.getTextWidth(tag) + 4;
    doc.setFillColor(255, 255, 255); doc.setDrawColor(r, g, bl);
    doc.roundedRect(mx - w / 2, my - 4, w, 6, 1, 1, 'S');
    doc.text(tag, mx, my);
  });

  // Cajas de cada equipo
  nodos.forEach((el) => {
    const def = elementoDe(el.type) || {};
    const x = toX(el.x) - 14, y = toY(el.y) - 10;
    const w = 28, h = 20;
    const [r, g, bl] = hexToRgb(el.color || def.color || '#475569');
    doc.setDrawColor(r, g, bl); doc.setFillColor(255, 255, 255); doc.setLineWidth(0.5);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');
    doc.setFontSize(6); doc.setTextColor(r, g, bl); doc.setFont(undefined, 'bold');
    doc.text((el.label || def.label || el.type).slice(0, 24), x + w / 2, y + 6, { align: 'center' });
    doc.setFont(undefined, 'normal'); doc.setTextColor(70);
    const datos = el.datos || {};
    const pot = datos.potencia_kw ? `${datos.potencia_kw} kW` : '';
    if (pot) doc.text(pot, x + w / 2, y + 12, { align: 'center' });
    if (datos.tension) doc.text(`${datos.tension} V`, x + w / 2, y + 17, { align: 'center' });
  });

  // Leyenda
  const ly = PH - margin - 4;
  doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
  doc.text('Leyenda:', ox, ly - 8);
  doc.setDrawColor(...hexToRgb(POTENCIA)); doc.setLineWidth(1.2);
  doc.line(ox + 22, ly - 10, ox + 34, ly - 10);
  doc.setFont(undefined, 'normal'); doc.setTextColor(70);
  doc.text('Potencia', ox + 36, ly - 8);
  doc.setDrawColor(...hexToRgb(COMUNICA)); doc.setLineDash([3, 2]); doc.setLineWidth(0.8);
  doc.line(ox + 64, ly - 10, ox + 76, ly - 10); doc.setLineDash([]);
  doc.text('Comunicaciones', ox + 78, ly - 8);

  // Pie
  doc.setFontSize(7); doc.setTextColor(150);
  doc.text(`Generado desde el plano «${plan.name || ''}» · ${empresa.company_name || ''}`.trim(), ox, ly);

  return doc;
}

export function exportarEsquemaElectrico(plan, elements, connections, empresa) {
  const doc = construirEsquemaElectrico(plan, elements, connections, empresa);
  const filename = `esquema_electrico_${(plan.name || 'instalacion').replace(/[^\w\-]+/g, '_')}.pdf`;
  doc.save(filename);
}

export function imprimirEsquemaElectrico(plan, elements, connections, empresa) {
  const doc = construirEsquemaElectrico(plan, elements, connections, empresa);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
}