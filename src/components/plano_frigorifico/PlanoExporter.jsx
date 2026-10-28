import { jsPDF } from 'jspdf';
import { longitudConexion, resumenTuberias } from '@/lib/planoCalculo';
import { elementoDe } from '@/lib/planoFrigorificoCatalogo';
import { TIPOS_CONEXION_ELECTRICA } from '@/lib/instalacionCalculos';

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

export function construirPDF(plan, elements, walls, connections, { autoPrint = false, presupuesto = null } = {}) {
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
    // En jsPDF el método se llama roundedRect: con roundRect el PDF no se
    // generaba nunca —ni al exportar ni al imprimir— y el aviso de error no
    // decía por qué.
    doc.roundedRect(x, y, w, h, 1, 1, 'S');
    doc.setFontSize(Math.min(8, Math.max(4, h * 1.3)));
    doc.setTextColor(...rgb); doc.setFont(undefined, 'bold');
    if (w > 4 && h > 3) doc.text(el.glyph || '', x + w / 2, y + h / 2, { align: 'center', baseline: 'middle' });
    doc.setFontSize(5); doc.setFont(undefined, 'normal'); doc.setTextColor(70);
    doc.text(el.label || '', x + w / 2, y + h + 2, { align: 'center' });
  });

  // ── Resumen lateral ──
  //
  // Cuando la instalación es grande, este resumen no cabe en una columna: se
  // pasa a una hoja nueva en vez de escribir fuera del papel, que es lo que
  // pasaba al salir con muchos equipos.
  let ly = oy;
  let lxCol = lx;
  const FIN = PH - margin;

  const sitio = (alto = 4.5) => {
    if (ly + alto <= FIN) return;
    doc.addPage();
    lxCol = margin;
    ly = margin + 6;
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
    doc.text(`${plan.name || 'Plano frigorífico'} — continuación`, margin, margin);
    doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(40);
  };
  /** Escribe una línea del resumen y baja el cursor, cambiando de hoja si hace falta. */
  const esc = (txt, dx = 0, size = 8, negrita = false) => {
    sitio();
    doc.setFontSize(size);
    doc.setFont(undefined, negrita ? 'bold' : 'normal');
    doc.text(txt, lxCol + dx, ly);
    ly += size <= 6.5 ? 4 : 4.5;
  };
  const titulo = (txt) => { ly += 2; esc(txt, 0, 9, true); ly += 0.5; };

  doc.setTextColor(20);
  esc('Resumen de la instalación', 0, 11, true);
  ly += 1.5;
  doc.setTextColor(40);

  const counts = {};
  elements.forEach((e) => { counts[e.label] = (counts[e.label] || 0) + (parseInt(e.qty, 10) || 1); });
  titulo(`Equipos (${elements.length})`);
  Object.entries(counts).forEach(([k, v]) => esc(`· ${k}: ${v}`, 2));

  // Los datos que se han rellenado de cada equipo: potencia, refrigerante,
  // sensibilidad del diferencial, tarado de la válvula… Sin esto, el plano
  // sale bonito y en la obra hay que llamar por teléfono para cada dato.
  const conDatos = elements.filter((e) => Object.values(e.datos || {}).some((v) => v !== '' && v != null));
  if (conDatos.length) {
    titulo('Datos de los equipos');
    conDatos.forEach((e) => {
      const def = elementoDe(e.type || e.id);
      esc(`· ${e.label || def?.label || '?'}${e.brand ? ` — ${e.brand}` : ''}${e.model ? ` ${e.model}` : ''}`, 2);
      (def?.campos || []).forEach((c) => {
        const v = e.datos?.[c.id];
        if (v === '' || v == null) return;
        esc(`${c.etiqueta}: ${v}`, 4, 6.5);
      });
    });
  }

  const { tub, gas, liq } = resumenTuberias(connections, elements, scale);
  titulo(`Tuberías refrigerantes (${tub.length})`);
  if (tub.length === 0) esc('—', 2);
  tub.forEach((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    const L = longitudConexion(c, elements, scale);
    esc(`${i + 1}. ${(a?.label) || '?'} → ${(b?.label) || '?'} · ${L.toFixed(2)} m`, 2);
    esc(`Gas: ${c.gas_diameter || '—'}   Líquido: ${c.liquid_diameter || '—'}`
      + (c.height_m ? `   Desnivel: ${c.height_m} m` : ''), 4, 6.5);
  });
  if (Object.keys(gas).length || Object.keys(liq).length) {
    titulo('Totales por diámetro');
    Object.entries(gas).forEach(([d, L]) => esc(`Gas ${d}: ${L.toFixed(1)} m`, 2));
    Object.entries(liq).forEach(([d, L]) => esc(`Líquido ${d}: ${L.toFixed(1)} m`, 2));
  }

  const ele = connections.filter((c) => c.type === 'electrica');
  titulo(`Conexiones eléctricas (${ele.length})`);
  if (ele.length === 0) esc('—', 2);
  ele.forEach((c, i) => {
    const a = elements.find((e) => e.id === c.from_id), b = elements.find((e) => e.id === c.to_id);
    const L = longitudConexion(c, elements, scale);
    const clase = TIPOS_CONEXION_ELECTRICA.find((t) => t.id === (c.conn_kind || 'potencia'))?.nombre || '';
    esc(`${i + 1}. ${(a?.label) || '?'} → ${(b?.label) || '?'} · ${L.toFixed(2)} m`, 2);
    esc(`${clase}`, 4, 6.5);
    if (c.conn_kind === 'comunicacion') {
      esc(`Bus: ${c.comm_type || '—'}${c.cable ? `   Cable: ${c.cable}` : ''}`, 4, 6.5);
    } else {
      esc(`Potencia: ${c.power_type || '—'}${c.power_w ? `   ${c.power_w} W` : ''}`, 4, 6.5);
      esc(`Sección: ${c.section_mm2 ? `${c.section_mm2} mm²` : '—'}${c.voltage ? `   ${c.voltage}` : ''}`, 4, 6.5);
      if (c.comm_type) esc(`Comunic.: ${c.comm_type}`, 4, 6.5);
    }
  });

  if (presupuesto && presupuesto.total > 0) {
    titulo('Presupuesto aproximado');
    esc(`Material: ${presupuesto.materiales.toFixed(2)} €`, 2);
    esc(`Mano de obra (35 %): ${presupuesto.manoObra.toFixed(2)} €`, 2);
    esc(`TOTAL: ${presupuesto.total.toFixed(2)} €`, 2, 8, true);
    doc.setTextColor(120);
    doc.splitTextToSize(presupuesto.aviso, legendW - 4).forEach((l) => esc(l, 2, 6));
    doc.setTextColor(40);
  }

  if (plan.description || plan.observations) {
    titulo('Observaciones');
    doc.splitTextToSize([plan.description, plan.observations].filter(Boolean).join(' — '), legendW - 4)
      .forEach((l) => esc(l, 0, 7));
  }

  titulo('Aviso técnico');
  doc.setTextColor(120);
  doc.splitTextToSize('Diámetros y secciones ORIENTATIVOS: prevalecen la ficha técnica del fabricante '
    + 'y el REBT. Requiere revisión y firma de técnico cualificado.', legendW - 4)
    .forEach((l) => esc(l, 0, 6));
  doc.setTextColor(40);

  if (autoPrint) doc.autoPrint();
  return doc;
}

export function exportarPDF(plan, elements, walls, connections, presupuesto = null) {
  const doc = construirPDF(plan, elements, walls, connections, { presupuesto });
  doc.save(`${(plan.name || 'plano').replace(/[^\w\-]+/g, '_')}.pdf`);
}

export function imprimirPlano(plan, elements, walls, connections, presupuesto = null) {
  const doc = construirPDF(plan, elements, walls, connections, { autoPrint: true, presupuesto });
  window.open(doc.output('bloburl'), '_blank');
}