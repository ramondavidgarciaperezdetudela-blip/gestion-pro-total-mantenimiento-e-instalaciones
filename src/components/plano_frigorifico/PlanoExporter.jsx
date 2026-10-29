import { jsPDF } from 'jspdf';
import { longitudConexion, resumenTuberias } from '@/lib/planoCalculo';
import { elementoDe } from '@/lib/planoFrigorificoCatalogo';
import { TIPOS_CONEXION_ELECTRICA } from '@/lib/instalacionCalculos';
import { dibujarPlanoVectorial, PLANO_CANVAS } from '@/lib/planoDibujoPdf';
import { generarVista3DDataUrl, VISTA3D_W, VISTA3D_H } from '@/lib/planoVista3D';

// Exportación e impresión del plano frigorífico.
//
// En vez de serializar el SVG (que arrastra variables CSS que no resuelve un
// visor de PDF), se dibuja el plano directamente con primitivas vectoriales
// de jsPDF (compartido con el informe de aseguradora en planoDibujoPdf): rects,
// líneas y texto. Sale un PDF técnico nítido, ligero y con el resumen de la
// instalación (equipos, tuberías, conductos y conexiones eléctricas).

const CANVAS = PLANO_CANVAS;

export function construirPDF(plan, elements, walls, connections, { autoPrint = false, presupuesto = null } = {}) {
  const scale = plan.scale || 50;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const PW = 420, PH = 297, margin = 12;
  const titleH = 20;
  const legendW = 132;
  const drawW = PW - margin * 2 - legendW;
  const drawH = PH - margin - titleH - margin;
  const ox = margin, oy = margin + titleH;
  const { sc } = dibujarPlanoVectorial(doc, { plan, elements, walls, connections, ox, oy, boxW: drawW, boxH: drawH });
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

  // ── Leyenda de símbolos ──
  //
  // Se dibuja con el mismo cursor que el resto del resumen (esc/sitio), para
  // que si el listado ha llenado la hoja la leyenda pase a la siguiente en vez
  // de escribirse encima.
  titulo('Leyenda');
  const leyenda = [
    { c: [0, 160, 233], t: 'Tubería refrigerante (gas/líquido)', raya: true },
    { c: [245, 130, 35], t: 'Conexión eléctrica (potencia/comunic.)', raya: false },
    { c: [139, 92, 246], t: 'Comunicación / bus de datos', raya: false },
    { c: [120, 120, 120], t: 'Pared / mampara', raya: false },
  ];
  leyenda.forEach((l) => {
    sitio();
    doc.setDrawColor(...l.c); doc.setLineWidth(1.2);
    if (l.raya) doc.setLineDash([3, 1.5]); else doc.setLineDash([]);
    doc.line(lxCol, ly - 1.5, lxCol + 8, ly - 1.5); doc.setLineDash([]);
    doc.setTextColor(60); doc.setFontSize(7); doc.setFont(undefined, 'normal');
    doc.text(l.t, lxCol + 10, ly);
    ly += 4.5;
  });
  doc.setTextColor(40);

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

  // ── Vista 3D de la instalación ──
  //
  // Se añade como última hoja del PDF, con la misma imagen que se guarda
  // junto al plano: el cliente ve el volumen de la instalación y no solo la
  // planta. Se dibuja aquí a partir del plano actual, así el PDF nunca lleva
  // una vista 3D atrasada.
  const vista3D = generarVista3DDataUrl({ walls: walls || [], elements: elements || [], scale });
  if (vista3D) {
    doc.addPage('a3', 'landscape');
    doc.setTextColor(20); doc.setFontSize(14); doc.setFont(undefined, 'bold');
    doc.text('Vista 3D de la instalación', margin, margin + 7);
    doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
    doc.text([plan.name || 'Plano frigorífico', plan.contact_name].filter(Boolean).join('     ·     '),
      margin, margin + 13);
    const cajaW = PW - margin * 2;
    const cajaH = PH - margin * 2 - 18;
    const ratio = VISTA3D_W / VISTA3D_H;
    let w = cajaW, h = w / ratio;
    if (h > cajaH) { h = cajaH; w = h * ratio; }
    doc.addImage(vista3D, 'PNG', margin, margin + 18, w, h);
  }

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