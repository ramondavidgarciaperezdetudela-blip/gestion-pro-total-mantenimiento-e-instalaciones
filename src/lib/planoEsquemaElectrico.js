import { jsPDF } from 'jspdf';
import { elementoDe } from '@/lib/planoFrigorificoCatalogo';

// Esquema eléctrico de la instalación, generado a partir del plano.
//
// Dibuja las conexiones eléctricas (potencia y comunicaciones) y cada equipo
// con su SÍMBOLO ELÉCTRICO NORMALIZADO (IEC 60617), no como una caja con
// texto: magnetotérmico con su arco térmico + aspa magnética, diferencial con
// la bobina de suma y la flecha de fuga, contactor con contactos + bobina,
// guardamotor con el bimetal, lámpara con la X, toma de tierra, etc.
//
// Es lo que se adjunta al informe técnico: el electricista y la aseguradora
// ven el cableado con la simbología de toda la vida.

const POTENCIA = '#F5821F';
const COMUNICA = '#8b5cf6';
const LINEA = '#1f2937';

function hexToRgb(hex) {
  const h = (hex || '#888888').replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16) || 120,
    parseInt(h.slice(2, 4), 16) || 120,
    parseInt(h.slice(4, 6), 16) || 120,
  ];
}

// Cada símbolo se dibuja dentro de una "caja virtual" de cw×ch mm centrada
// en (cx, cy). Las líneas de conexión llegan a los bordes de esa caja.

function simboloMagnetotermico(doc, cx, cy, cw, ch) {
  // Caja
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch, 'S');
  // Contacto (línea con quiebre)
  doc.setLineWidth(0.5);
  doc.line(cx, cy - ch / 2, cx, cy - ch * 0.22);
  doc.line(cx, cy - ch * 0.22, cx + cw * 0.18, cy + ch * 0.02);
  doc.line(cx, cy + ch * 0.18, cx, cy + ch / 2);
  // Térmico (arco)
  doc.setLineWidth(0.35);
  doc.lines([[-cw * 0.06, 0], [cw * 0.06, ch * 0.06]], cx - cw * 0.08, cy + ch * 0.18, [1, -1], false);
  // Magnético (aspa X)
  doc.line(cx - cw * 0.12, cy + ch * 0.3, cx + cw * 0.12, cy + ch * 0.22);
  doc.line(cx - cw * 0.12, cy + ch * 0.22, cx + cw * 0.12, cy + ch * 0.3);
}

function simboloDiferencial(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch, 'S');
  // Dos bobinas enfrentadas (transformador de suma)
  doc.setLineWidth(0.35);
  doc.lines([[cw * 0.06, 0], [-cw * 0.06, ch * 0.06], [cw * 0.06, 0], [-cw * 0.06, ch * 0.06]], cx - cw * 0.28, cy - ch * 0.25, [1, 1], false);
  doc.lines([[-cw * 0.06, 0], [cw * 0.06, ch * 0.06], [-cw * 0.06, 0], [cw * 0.06, ch * 0.06]], cx + cw * 0.28, cy - ch * 0.25, [1, 1], false);
  // Círculo de corriente de fuga
  doc.circle(cx, cy + ch * 0.1, ch * 0.14, 'S');
  // Flechita dentro
  doc.setLineWidth(0.3);
  doc.line(cx - ch * 0.06, cy + ch * 0.06, cx + ch * 0.04, cy + ch * 0.14);
}

function simboloContactor(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch, 'S');
  // Contacto
  doc.setLineWidth(0.5);
  doc.line(cx - cw * 0.1, cy - ch / 2, cx - cw * 0.1, cy - ch * 0.15);
  doc.line(cx - cw * 0.1, cy - ch * 0.15, cx + cw * 0.1, cy + ch * 0.05);
  doc.line(cx + cw * 0.04, cy + ch * 0.1, cx + cw * 0.04, cy + ch / 2);
  // Bobina de mando
  doc.setLineWidth(0.35);
  doc.rect(cx + cw * 0.18, cy - ch * 0.2, cw * 0.2, ch * 0.4, 'S');
  doc.setFontSize(6); doc.setTextColor(...hexToRgb(LINEA));
  doc.text('C', cx + cw * 0.28, cy + 1, { align: 'center' });
}

function simboloGuardamotor(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch, 'S');
  // Bimetal (curva)
  doc.setLineWidth(0.4);
  doc.lines([[cw * 0.1, -ch * 0.15], [cw * 0.1, ch * 0.05], [-cw * 0.2, ch * 0.1]], cx - cw * 0.22, cy + ch * 0.1, [1, 1], false);
  // Contacto de disparo
  doc.line(cx + cw * 0.02, cy - ch / 2, cx + cw * 0.02, cy - ch * 0.12);
  doc.line(cx + cw * 0.02, cy - ch * 0.12, cx + cw * 0.18, cy + ch * 0.02);
  doc.line(cx + cw * 0.18, cy + ch * 0.1, cx + cw * 0.18, cy + ch / 2);
}

function simboloVariador(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch, 'S');
  // Onda seno
  doc.setLineWidth(0.35);
  doc.lines([[cw * 0.08, -ch * 0.12], [cw * 0.08, ch * 0.12], [cw * 0.08, -ch * 0.12]], cx - cw * 0.34, cy, [1, 1], false);
  // Flecha
  doc.line(cx + cw * 0.02, cy, cx + cw * 0.1, cy);
  // Onda cuadrada (aprox con segments)
  doc.line(cx + cw * 0.12, cy + ch * 0.1, cx + cw * 0.12, cy - ch * 0.1);
  doc.line(cx + cw * 0.12, cy - ch * 0.1, cx + cw * 0.2, cy - ch * 0.1);
  doc.line(cx + cw * 0.2, cy - ch * 0.1, cx + cw * 0.2, cy + ch * 0.1);
  doc.line(cx + cw * 0.2, cy + ch * 0.1, cx + cw * 0.3, cy + ch * 0.1);
}

function simboloAutomata(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch, 'S');
  // Pantalla
  doc.setFillColor(180, 220, 255);
  doc.rect(cx - cw * 0.32, cy - ch * 0.3, cw * 0.4, ch * 0.25, 'S');
  doc.setFontSize(6); doc.setTextColor(...hexToRgb(LINEA));
  doc.text('PLC', cx - cw * 0.12, cy - ch * 0.15, { align: 'center' });
  // Bornes
  doc.setFillColor(...hexToRgb(LINEA));
  for (let i = 0; i < 3; i++) {
    doc.circle(cx + cw * 0.32, cy - ch * 0.2 + i * ch * 0.2, 0.7, 'F');
  }
}

function simboloToma(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  // Semi-círculo (base)
  doc.lines([[cw * 0.3, ch * 0.3], [cw * 0.3, -ch * 0.3], [-cw * 0.3, -ch * 0.3]], cx - cw * 0.3, cy + ch * 0.3, [1, 1], true);
  // Dos prongs
  doc.setLineWidth(0.4);
  doc.line(cx - cw * 0.12, cy - ch * 0.05, cx - cw * 0.12, cy - ch * 0.2);
  doc.line(cx + cw * 0.12, cy - ch * 0.05, cx + cw * 0.12, cy - ch * 0.2);
}

function simboloInterruptor(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.5);
  doc.line(cx - cw / 2, cy, cx - cw * 0.1, cy);
  doc.line(cx - cw * 0.1, cy, cx + cw * 0.22, cy - ch * 0.3);
  doc.circle(cx + cw * 0.22, cy - ch * 0.3, 0.5, 'S');
  doc.line(cx + cw * 0.22, cy, cx + cw / 2, cy);
}

function simboloLuminaria(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.4);
  const r = Math.min(cw, ch) * 0.32;
  doc.circle(cx, cy, r, 'S');
  doc.setLineWidth(0.4);
  doc.line(cx - r * 0.7, cy - r * 0.7, cx + r * 0.7, cy + r * 0.7);
  doc.line(cx - r * 0.7, cy + r * 0.7, cx + r * 0.7, cy - r * 0.7);
}

function simboloTierra(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.5);
  doc.line(cx, cy - ch / 2, cx, cy - ch * 0.1);
  doc.setLineWidth(0.4);
  doc.line(cx - cw * 0.3, cy - ch * 0.1, cx + cw * 0.3, cy - ch * 0.1);
  doc.line(cx - cw * 0.2, cy + ch * 0.04, cx + cw * 0.2, cy + ch * 0.04);
  doc.line(cx - cw * 0.1, cy + ch * 0.18, cx + cw * 0.1, cy + ch * 0.18);
}

function simboloCuadro(doc, cx, cy, cw, ch) {
  doc.setDrawColor(...hexToRgb('#fbbf24')); doc.setFillColor(245, 243, 240);
  doc.setLineWidth(0.5);
  doc.rect(cx - cw / 2, cy - ch / 2, cw, ch, 'FD');
  // Bornes de distribución
  doc.setDrawColor(...hexToRgb(LINEA));
  doc.setLineWidth(0.3);
  for (let i = 0; i < 4; i++) {
    doc.line(cx - cw / 2, cy - ch * 0.3 + i * ch * 0.2, cx + cw / 2, cy - ch * 0.3 + i * ch * 0.2);
  }
  doc.setFontSize(6); doc.setTextColor(...hexToRgb(LINEA));
  doc.text('Q', cx, cy + 1, { align: 'center' });
}

// Máquinas de frío/clima: un rectángulo con la etiqueta y los datos.
function simboloMaquina(doc, el, cx, cy, cw, ch) {
  const def = elementoDe(el.type) || {};
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setFillColor(255, 255, 255); doc.setLineWidth(0.5);
  doc.roundedRect(cx - cw / 2, cy - ch / 2, cw, ch, 1.5, 1.5, 'FD');
  doc.setFontSize(7); doc.setTextColor(...hexToRgb(LINEA)); doc.setFont(undefined, 'bold');
  doc.text((el.label || def.label || el.type).slice(0, 22), cx, cy - ch * 0.18, { align: 'center' });
  doc.setFont(undefined, 'normal'); doc.setTextColor(90);
  const datos = el.datos || {};
  const pot = datos.potencia_kw ? `${datos.potencia_kw} kW` : (datos.potencia_w ? `${datos.potencia_w} W` : '');
  if (pot) { doc.setFontSize(6); doc.text(pot, cx, cy + ch * 0.05, { align: 'center' }); }
  if (datos.tension) { doc.setFontSize(6); doc.text(datos.tension, cx, cy + ch * 0.28, { align: 'center' }); }
}

// Símbolo normalizado según el tipo de equipo.
function dibujarSimbolo(doc, el, cx, cy, cw, ch) {
  switch (el.type) {
    case 'cuadro_electrico':      return simboloCuadro(doc, cx, cy, cw, ch);
    case 'magnetotermico':       return simboloMagnetotermico(doc, cx, cy, cw, ch);
    case 'diferencial':          return simboloDiferencial(doc, cx, cy, cw, ch);
    case 'contactor':            return simboloContactor(doc, cx, cy, cw, ch);
    case 'guardamotor':          return simboloGuardamotor(doc, cx, cy, cw, ch);
    case 'variador':             return simboloVariador(doc, cx, cy, cw, ch);
    case 'automata':             return simboloAutomata(doc, cx, cy, cw, ch);
    case 'toma_corriente':       return simboloToma(doc, cx, cy, cw, ch);
    case 'interruptor':          return simboloInterruptor(doc, cx, cy, cw, ch);
    case 'luminaria':            return simboloLuminaria(doc, cx, cy, cw, ch);
    case 'puesta_tierra':        return simboloTierra(doc, cx, cy, cw, ch);
    default:                     return simboloMaquina(doc, el, cx, cy, cw, ch);
  }
}

// Tamaño de la caja de símbolo según el tipo.
function tamanoSimbolo(el) {
  switch (el.type) {
    case 'cuadro_electrico':      return { w: 16, h: 10 };
    case 'magnetotermico':
    case 'diferencial':
    case 'contactor':
    case 'guardamotor':
    case 'variador':
    case 'automata':             return { w: 13, h: 9 };
    case 'toma_corriente':
    case 'interruptor':
    case 'puesta_tierra':
    case 'luminaria':            return { w: 11, h: 8 };
    default:                     return { w: 18, h: 13 };
  }
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

  const drawW = PW - margin * 2;
  const drawH = PH - margin * 2 - 22;
  const ox = margin, oy = margin + 20;

  if (nodos.length === 0) {
    doc.setFontSize(11); doc.setTextColor(120);
    doc.text('No hay conexiones eléctricas en este plano. Usa «Conectar» · «Eléctrica» entre equipos.', ox, oy + 10);
    return doc;
  }

  // Escala de las posiciones del plano al área de dibujo, dejando hueco para
  // las cajas de los símbolos (no se solapan con las líneas).
  const xs = nodos.map((n) => n.x), ys = nodos.map((n) => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const pad = 30;
  const sc = Math.min((drawW - pad * 2) / spanX, (drawH - pad * 2) / spanY);
  const toX = (x) => ox + pad + (x - minX) * sc;
  const toY = (y) => oy + pad + (y - minY) * sc;

  // Conexiones primero (debajo de los símbolos)
  elec.forEach((c) => {
    const a = elements.find((e) => e.id === c.from_id);
    const b = elements.find((e) => e.id === c.to_id);
    if (!a || !b) return;
    const esDatos = c.conn_kind === 'comunicacion';
    const color = esDatos ? COMUNICA : POTENCIA;
    const [r, g, bl] = hexToRgb(color);
    doc.setDrawColor(r, g, bl);
    doc.setLineWidth(esDatos ? 0.6 : 1.0);
    doc.setLineDash(esDatos ? [3, 2] : []);
    const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
    for (let i = 1; i < pts.length; i++) {
      doc.line(toX(pts[i - 1].x), toY(pts[i - 1].y), toX(pts[i].x), toY(pts[i].y));
    }
    doc.setLineDash([]);
    // Etiqueta de la línea
    const mx = toX((a.x + b.x) / 2), my = toY((a.y + b.y) / 2);
    const tag = esDatos
      ? (c.comm_type || 'Comunicación')
      : [c.section_mm2 ? `${c.section_mm2} mm²` : null, c.power_type, c.voltage ? `${c.voltage} V` : null].filter(Boolean).join(' · ') || 'Potencia';
    doc.setFontSize(6.5); doc.setTextColor(r, g, bl);
    const w = doc.getTextWidth(tag) + 3;
    doc.setFillColor(255, 255, 255); doc.setDrawColor(r, g, bl);
    doc.roundedRect(mx - w / 2, my - 3, w, 5, 0.8, 0.8, 'S');
    doc.text(tag, mx, my + 0.5);
  });

  // Símbolos de cada equipo
  nodos.forEach((el) => {
    const t = tamanoSimbolo(el);
    const cx = toX(el.x), cy = toY(el.y);
    dibujarSimbolo(doc, el, cx, cy, t.w, t.h);
    // Etiqueta debajo del símbolo
    const def = elementoDe(el.type) || {};
    const nombre = el.label || def.label || el.type;
    doc.setFontSize(6); doc.setTextColor(60);
    doc.text(nombre.slice(0, 26), cx, cy + t.h / 2 + 3, { align: 'center' });
  });

  // Leyenda de símbolos eléctricos normalizados
  const ly = PH - margin - 6;
  doc.setDrawColor(...hexToRgb(LINEA)); doc.setLineWidth(0.3);
  doc.rect(ox, ly - 16, 150, 16, 'S');
  doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
  doc.text('Leyenda:', ox + 3, ly - 9);
  // Magnetotérmico
  simboloMagnetotermico(doc, ox + 26, ly - 8, 8, 6);
  doc.setFont(undefined, 'normal'); doc.setTextColor(70); doc.setFontSize(5.5);
  doc.text('Magnetot.', ox + 26, ly - 1, { align: 'center' });
  // Diferencial
  simboloDiferencial(doc, ox + 50, ly - 8, 8, 6);
  doc.text('Diferencial', ox + 50, ly - 1, { align: 'center' });
  // Contactor
  simboloContactor(doc, ox + 74, ly - 8, 8, 6);
  doc.text('Contactor', ox + 74, ly - 1, { align: 'center' });
  // Guardamotor
  simboloGuardamotor(doc, ox + 98, ly - 8, 8, 6);
  doc.text('Guardamotor', ox + 98, ly - 1, { align: 'center' });
  // Tierra
  simboloTierra(doc, ox + 122, ly - 8, 8, 6);
  doc.text('Toma tierra', ox + 122, ly - 1, { align: 'center' });

  // Leyenda de líneas
  const lx = ox + 160;
  doc.setFontSize(7); doc.setFont(undefined, 'bold'); doc.setTextColor(20);
  doc.text('Líneas:', lx, ly - 9);
  doc.setDrawColor(...hexToRgb(POTENCIA)); doc.setLineWidth(1.0);
  doc.line(lx + 18, ly - 10, lx + 30, ly - 10);
  doc.setFont(undefined, 'normal'); doc.setTextColor(70); doc.setFontSize(6);
  doc.text('Potencia', lx + 32, ly - 8);
  doc.setDrawColor(...hexToRgb(COMUNICA)); doc.setLineDash([3, 2]); doc.setLineWidth(0.6);
  doc.line(lx + 56, ly - 10, lx + 68, ly - 10); doc.setLineDash([]);
  doc.text('Comunicaciones', lx + 70, ly - 8);

  // Pie
  doc.setFontSize(6); doc.setTextColor(150);
  doc.text(`Generado desde el plano «${plan.name || ''}» · ${empresa.company_name || ''}`.trim(), ox, ly + 4);

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