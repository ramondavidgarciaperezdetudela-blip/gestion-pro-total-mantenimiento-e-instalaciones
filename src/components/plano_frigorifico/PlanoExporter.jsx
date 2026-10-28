import { jsPDF } from 'jspdf';
import { longitudConexion, resumenTuberias } from '@/lib/planoCalculo';

// Exportación e impresión del plano frigorífico.
//
// En vez de serializar el SVG (que arrastra variables CSS que no resuelve un
// visor de PDF), se dibuja el plano directamente con primitivas vectoriales
// de jsPDF: rects, líneas y texto. Sale un PDF técnico nítido, ligero y con
// el resumen de la instalación (equipos, tuberías y conexiones eléctricas).

function hexToRgb(hex) {
  const h = (hex || '#888888').replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 120,
    parseInt(h.slice(2, 4), 16) || 120,
    parseInt(h.slice(4, 6), 16) || 120,
  ];
}

const CANVAS = { w: 1400, h: 900 };

export function construirPDF(plan, elements, walls, connections, { autoPrint = false } = {}) {
  const scale = plan.scale || 50;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const PW = 420, PH = 297, margin = 12;
  const titleH = 20;
  const legendW = 132;
  const drawW = PW - margin * 2 - legendW;
  const drawH = PH - margin - titleH - margin;
  const sc = Math.min(drawW / CANVAS.w, drawH / CANVAS.h);
  const ox = margin, oy = margin + titleH;
  const lx = margin + CANVAS.w * sc + 8;

  // Cabecera
  doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
  doc.text(plan.name || 'Plano frigorífico', margin, margin + 7);
  doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
  const sub = [
    plan.contact_name ? `Cliente: ${plan.contact_name}` : null,
    `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
    `Escala: 1 px = ${(1 / scale).toFixed(3)} m`,
  ].filter(Boolean);
  doc.text(sub.join('     ·     '), margin, margin + 15);

  // Marco del área de dibujo
  doc.setDrawColor(215); doc.setLineWidth(0.2);
  doc.rect(ox, oy, CANVAS.w * sc, CANVAS.h * sc);

  // Paredes
  doc.setDrawColor(120); doc.setLineWidth(0.8);
  walls.forEach((w) => doc.line(ox + w.x1 * sc, oy + w.y1 * sc, ox + w.x2 * sc, oy + w.y2 * sc));

  // Conexiones (debajo de los equipos)
  connections.forEach((c) => {
    const a = elements.find((e) => e.id === c.from_id);
    const b = elements.find((e) => e.id === c.to_id);
    if (!a || !b) return;
    const rgb = c.type === 'refrigerante' ? [0, 160, 233] : [245, 130, 35];
    doc.setDrawColor(...rgb);
    doc.setLineWidth(c.type === 'refrigerante' ? 1.1 : 0.7);
    if (c.type === 'refrigerante') doc.setLineDash([3, 1.5]); else doc.setLineDash([]);
    doc.line(ox + a.x * sc, oy + a.y * sc, ox + b.x * sc, oy + b.y * sc);
    doc.setLineDash([]);
  });

  // Equipos
  elements.forEach((el) => {
    const wpx = (el.w_m || 0.5) * scale, hpx = (el.h_m || 0.5) * scale;
    const x = ox + (el.x - wpx / 2) * sc, y = oy + (el.y - hpx / 2) * sc;
    const w = Math.max(wpx * sc, 1.5), h = Math.max(hpx * sc, 1.5);
    const rgb = hexToRgb(el.color);
    doc.setDrawColor(...rgb); doc.setFillColor(255, 255, 255); doc.setLineWidth(0.4);
    doc.roundRect(x, y, w, h, 1, 1, 'S');
    doc.setFontSize(Math.min(8, Math.max(4, h * 1.3)));
    doc.setTextColor(...rgb); doc.setFont(undefined, 'bold');
    if (w > 4 && h > 3) doc.text(el.glyph || '', x + w / 2, y + h / 2, { align: 'center', baseline: 'middle' });
    doc.setFontSize(5); doc.setFont(undefined, 'normal'); doc.setTextColor(70);
    doc.text(el.label || '', x + w / 2, y + h + 2, { align: 'center' });
  });

  // ── Resumen lateral ──
  let ly = oy;
  doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
  doc.text('Resumen de la instalación', lx, ly); ly += 6;

  const counts = {};
  elements.forEach((e) => { counts[e.label] = (counts[e.label] || 0) + (parseInt(e.qty) || 1); });
  doc.setFontSize(8); doc.setFont(undefined, 'bold'); doc.setTextColor(40);
  doc.text(`Equipos (${elements.length})`, lx, ly); ly += 5;
  doc.setFont(undefined, 'normal');
  Object.entries(counts).forEach(([k, v]) => { doc.text(`· ${k}: ${v}`, lx + 2, ly); ly += 4.5; });
  ly += 2;

  const { tub, gas, liq } = resumenTuberias(connections, elements, scale);
  doc.setFont(undefined, 'bold');
  doc.text(`Tuberías refrigerantes (${tub.length})`, lx, ly); ly += 5;
  doc.setFont(undefined, 'normal');
  if (tub.length === 0) { doc.text('—', lx + 2, ly); ly += 4.5; }
  tub.forEach((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    const L = longitudConexion(c, elements, scale);
    doc.text(`${i + 1}. ${(a?.label) || '?'} → ${(b?.label) || '?'} · ${L.toFixed(2)} m`, lx + 2, ly); ly += 4.5;
    doc.setFontSize(6.5);
    doc.text(`Gas: ${c.gas_diameter || '—'}   Líquido: ${c.liquid_diameter || '—'}`, lx + 4, ly); ly += 4;
    doc.setFontSize(8);
  });
  if (Object.keys(gas).length || Object.keys(liq).length) {
    ly += 1; doc.setFont(undefined, 'bold'); doc.text('Totales por diámetro', lx, ly); ly += 5;
    doc.setFont(undefined, 'normal');
    Object.entries(gas).forEach(([d, L]) => { doc.text(`Gas ${d}: ${L.toFixed(1)} m`, lx + 2, ly); ly += 4.5; });
    Object.entries(liq).forEach(([d, L]) => { doc.text(`Líquido ${d}: ${L.toFixed(1)} m`, lx + 2, ly); ly += 4.5; });
  }

  const ele = connections.filter((c) => c.type === 'electrica');
  ly += 2;
  doc.setFont(undefined, 'bold'); doc.text(`Conexiones eléctricas (${ele.length})`, lx, ly); ly += 5;
  doc.setFont(undefined, 'normal');
  if (ele.length === 0) { doc.text('—', lx + 2, ly); ly += 4.5; }
  ele.forEach((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    doc.text(`${i + 1}. ${(a?.label) || '?'} → ${(b?.label) || '?'}`, lx + 2, ly); ly += 4.5;
    doc.setFontSize(6.5);
    doc.text(`Potencia: ${c.power_type || '—'}`, lx + 4, ly); ly += 4;
    doc.text(`Comunic.: ${c.comm_type || '—'}`, lx + 4, ly); ly += 4;
    doc.setFontSize(8);
  });

  if (plan.description || plan.observations) {
    ly += 2;
    doc.setFont(undefined, 'bold'); doc.text('Observaciones', lx, ly); ly += 5;
    doc.setFont(undefined, 'normal'); doc.setFontSize(7);
    const lines = doc.splitTextToSize([plan.description, plan.observations].filter(Boolean).join(' — '), legendW - 4);
    doc.text(lines, lx, ly);
  }

  if (autoPrint) doc.autoPrint();
  return doc;
}

export function exportarPDF(plan, elements, walls, connections) {
  const doc = construirPDF(plan, elements, walls, connections);
  doc.save(`${(plan.name || 'plano').replace(/[^\w\-]+/g, '_')}.pdf`);
}

export function imprimirPlano(plan, elements, walls, connections) {
  const doc = construirPDF(plan, elements, walls, connections, { autoPrint: true });
  window.open(doc.output('bloburl'), '_blank');
}