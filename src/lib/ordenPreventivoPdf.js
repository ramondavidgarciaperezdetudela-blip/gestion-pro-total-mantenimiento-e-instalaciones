/** Hoja de trabajo de mantenimiento preventivo en PDF (A4 vertical, una orden por página). */
import { jsPDF } from 'jspdf';

const fechaES = (iso) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : '');

export function construirPdfOrdenes(ordenes, empresa = {}, opciones = {}) {
  const doc = (opciones.fabrica || ((o) => new jsPDF(o)))({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const L = 15, R = 195;
  ordenes.forEach((o, i) => {
    if (i > 0) doc.addPage();
    let y = 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('ORDEN DE MANTENIMIENTO PREVENTIVO', L, y);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    if (empresa.company_name) doc.text(String(empresa.company_name), R, y - 5, { align: 'right' });
    if (empresa.phone) doc.text(String(empresa.phone), R, y, { align: 'right' });
    y += 4; doc.setDrawColor(40); doc.line(L, y, R, y); y += 6;

    const fila = (etq, val, x, yy, ancho) => {
      doc.setFontSize(7); doc.setTextColor(110); doc.text(etq.toUpperCase(), x, yy);
      doc.setFontSize(10); doc.setTextColor(0); doc.text(doc.splitTextToSize(String(val || '—'), ancho)[0], x, yy + 4.5);
    };
    fila('Cliente', o.cliente, L, y, 85); fila('Fecha prevista', fechaES(o.fecha), 105, y, 30); fila('Técnico', o.tecnico, 140, y, 55);
    y += 11;
    fila('Dirección', o.direccion, L, y, 85); fila('Zona climática', o.zona, 105, y, 30); fila('Ubicación del equipo', o.ubicacion, 140, y, 55);
    y += 11;
    fila('Equipo', o.equipo, L, y, 85); fila('Nº de serie', o.serie, 105, y, 30); fila('Refrigerante / carga', o.gas, 140, y, 55);
    y += 12;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0);
    doc.text('TAREAS A REALIZAR', L, y); y += 2; doc.line(L, y, R, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    o.tareas.forEach((t) => {
      const lineas = doc.splitTextToSize(t, R - L - 10);
      doc.rect(L, y - 3.2, 3.6, 3.6);
      doc.text(lineas, L + 7, y);
      y += lineas.length * 4.6 + 2;
    });

    y += 3;
    doc.setFont('helvetica', 'bold'); doc.text('MEDICIONES Y OBSERVACIONES', L, y); y += 2; doc.line(L, y, R, y);
    doc.setDrawColor(190);
    for (let k = 0; k < 5; k++) { y += 8; doc.line(L, y, R, y); }
    doc.setDrawColor(40);

    y = Math.max(y + 14, 250);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110);
    doc.rect(L, y, 80, 22); doc.text('FIRMA DEL TÉCNICO', L + 2, y + 4);
    doc.rect(115, y, 80, 22); doc.text('FIRMA DEL CLIENTE', 117, y + 4);
    doc.setTextColor(0);
  });
  return doc;
}
