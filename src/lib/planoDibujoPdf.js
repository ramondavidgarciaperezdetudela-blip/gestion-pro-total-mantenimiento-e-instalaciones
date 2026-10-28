// Dibujo vectorial del plano frigorífico compartido por el PDF del plano y por
// el informe técnico para aseguradoras. Dibuja paredes, conexiones (tubería,
// conducto y eléctrica) y equipos dentro de una caja de un jsPDF, sin añadir
// cabecera ni resumen: cada llamador sitúa el resto del contenido alrededor.

export const PLANO_CANVAS = { w: 1400, h: 900 };

export function hexToRgb(hex) {
  const h = (hex || '#888888').replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 120,
    parseInt(h.slice(2, 4), 16) || 120,
    parseInt(h.slice(4, 6), 16) || 120,
  ];
}

// Color de línea según el tipo de conexión.
export function colorConexion(type) {
  if (type === 'refrigerante') return [0, 160, 233];
  if (type === 'conducto') return [34, 197, 94];
  return [245, 130, 35]; // eléctrica
}

/**
 * Dibuja el plano (paredes, conexiones y equipos) dentro de una caja de un
 * jsPDF doc. Solo el dibujo técnico: ni cabecera ni leyenda ni resumen.
 * @returns {{ sc:number, drawW:number, drawH:number }}
 */
export function dibujarPlanoVectorial(doc, {
  plan = {}, elements = [], walls = [], connections = [],
  ox, oy, boxW, boxH,
}) {
  const sc = Math.min(boxW / PLANO_CANVAS.w, boxH / PLANO_CANVAS.h);
  const drawW = PLANO_CANVAS.w * sc;
  const drawH = PLANO_CANVAS.h * sc;

  // Marco del área de dibujo
  doc.setDrawColor(215); doc.setLineWidth(0.2);
  doc.rect(ox, oy, drawW, drawH);

  // Paredes
  doc.setDrawColor(120); doc.setLineWidth(0.8);
  walls.forEach((w) => doc.line(ox + w.x1 * sc, oy + w.y1 * sc, ox + w.x2 * sc, oy + w.y2 * sc));

  // Conexiones (debajo de los equipos): polilínea si tiene codos, si no recta
  connections.forEach((c) => {
    const a = elements.find((e) => e.id === c.from_id);
    const b = elements.find((e) => e.id === c.to_id);
    if (!a || !b) return;
    const rgb = colorConexion(c.type);
    doc.setDrawColor(...rgb);
    doc.setLineWidth(c.type === 'refrigerante' ? 1.1 : c.type === 'conducto' ? 0.9 : 0.7);
    if (c.type === 'refrigerante') doc.setLineDash([3, 1.5]); else doc.setLineDash([]);
    const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
    for (let i = 1; i < pts.length; i++) {
      doc.line(ox + pts[i - 1].x * sc, oy + pts[i - 1].y * sc, ox + pts[i].x * sc, oy + pts[i].y * sc);
    }
    doc.setLineDash([]);
  });

  // Equipos
  const scale = plan.scale || 50;
  elements.forEach((el) => {
    const wpx = (el.w_m || 0.5) * scale, hpx = (el.h_m || 0.5) * scale;
    const x = ox + (el.x - wpx / 2) * sc, y = oy + (el.y - hpx / 2) * sc;
    const w = Math.max(wpx * sc, 1.5), h = Math.max(hpx * sc, 1.5);
    const rgb = hexToRgb(el.color);
    doc.setDrawColor(...rgb); doc.setFillColor(255, 255, 255); doc.setLineWidth(0.4);
    doc.roundedRect(x, y, w, h, 1, 1, 'S');
    doc.setFontSize(Math.min(8, Math.max(4, h * 1.3)));
    doc.setTextColor(...rgb); doc.setFont(undefined, 'bold');
    if (w > 4 && h > 3) doc.text(el.glyph || '', x + w / 2, y + h / 2, { align: 'center', baseline: 'middle' });
    doc.setFontSize(5); doc.setFont(undefined, 'normal'); doc.setTextColor(70);
    doc.text(el.label || '', x + w / 2, y + h + 2, { align: 'center' });
  });

  return { sc, drawW, drawH };
}