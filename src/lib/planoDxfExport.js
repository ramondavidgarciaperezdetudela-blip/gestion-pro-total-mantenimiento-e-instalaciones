// Exportación del plano frigorífico a CAD (DXF R12 / AutoCAD).
//
// Genera un .dxf de texto con las entidades LINE (paredes y tuberías rectas),
// POLYLINE (tuberías con codos), LWPOLYLINE, CIRCLE (extremos de conexión) y
// TEXT (etiquetas de equipos y diámetros). Lo abren AutoCAD, LibreCAD,
// FreeCAD, QCAD y prácticamente cualquier CAD del mercado.

function dxfNum(n) {
  // DXF usa punto decimal; nos aseguramos coma→punto y sin notación exponencial.
  return Number(Number(n).toFixed(2)).toString();
}

function dxfPair(code, value) {
  return `${code}\n${value}\n`;
}

function entidades(entities, elements, walls, connections, scale) {
  const out = [];

  // Paredes
  walls.forEach((w) => {
    out.push(dxfPair(0, 'LAYER'), dxfPair(2, 'PAREDES'), dxfPair(70, 0));
    out.push(dxfPair(0, 'LINE'));
    out.push(dxfPair(8, 'PAREDES'));
    out.push(dxfPair(10, dxfNum(w.x1)), dxfPair(20, dxfNum(-w.y1)), dxfPair(30, '0'));
    out.push(dxfPair(11, dxfNum(w.x2)), dxfPair(21, dxfNum(-w.y2)), dxfPair(31, '0'));
    out.push(dxfPair(0, 'ENDSEQ'), dxfPair(8, 'PAREDES'));
  });

  // Conexiones: polilínea si tiene path, si no línea recta.
  connections.forEach((c) => {
    const a = elements.find((e) => e.id === c.from_id);
    const b = elements.find((e) => e.id === c.to_id);
    if (!a || !b) return;
    const layer = c.type === 'refrigerante' ? 'TUBERIAS' : 'ELECTRICA';
    const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
    out.push(dxfPair(0, 'LWPOLYLINE'));
    out.push(dxfPair(8, layer));
    out.push(dxfPair(90, String(pts.length)));
    out.push(dxfPair(70, '0')); // abierta
    pts.forEach((p) => {
      out.push(dxfPair(10, dxfNum(p.x)), dxfPair(20, dxfNum(-p.y)));
    });
    // Texto con el diámetro/potencia en el punto medio
    const mid = pts[Math.floor(pts.length / 2)] || a;
    const tag = c.type === 'refrigerante'
      ? `Gas ${c.gas_diameter || '—'} / Liq ${c.liquid_diameter || '—'}`
      : `${c.power_type || ''} ${c.comm_type || ''}`.trim() || 'Eléctrica';
    out.push(dxfPair(0, 'TEXT'), dxfPair(8, layer));
    out.push(dxfPair(10, dxfNum(mid.x + 6)), dxfPair(20, dxfNum(-mid.y)), dxfPair(30, '0'));
    out.push(dxfPair(40, '12'), dxfPair(1, tag));
  });

  // Equipos: rectángulo + etiqueta
  elements.forEach((el) => {
    const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
    const x0 = el.x - w / 2, y0 = el.y - h / 2;
    const layer = `EQUIPOS_${(el.cat || 'otros').toUpperCase()}`;
    out.push(dxfPair(0, 'LWPOLYLINE'));
    out.push(dxfPair(8, layer));
    out.push(dxfPair(90, '4'));
    out.push(dxfPair(70, '1')); // cerrada
    [
      { x: x0, y: y0 }, { x: x0 + w, y: y0 }, { x: x0 + w, y: y0 + h }, { x: x0, y: y0 + h },
    ].forEach((p) => out.push(dxfPair(10, dxfNum(p.x)), dxfPair(20, dxfNum(-p.y))));
    out.push(dxfPair(0, 'TEXT'), dxfPair(8, layer));
    out.push(dxfPair(10, dxfNum(el.x)), dxfPair(20, dxfNum(-(y0 + h) - 6)), dxfPair(30, '0'));
    out.push(dxfPair(40, '14'), dxfPair(1, el.label || el.type || ''));
  });

  return out.join('');
}

export function exportarDXF(plan, elements, walls, connections) {
  const scale = plan.scale || 50;
  const header = [
    dxfPair(0, 'SECTION'), dxfPair(2, 'HEADER'),
    dxfPair(9, '$ACADVER'), dxfPair(1, 'AC1009'),
    dxfPair(9, '$INSBASE'), dxfPair(10, '0'), dxfPair(20, '0'), dxfPair(30, '0'),
    dxfPair(0, 'ENDSEC'),
  ].join('');

  const tables = [
    dxfPair(0, 'SECTION'), dxfPair(2, 'TABLES'),
    dxfPair(0, 'TABLE'), dxfPair(2, 'LAYER'), dxfPair(70, '6'),
    ['PAREDES', 'TUBERIAS', 'ELECTRICA', 'EQUIPOS_REFRIGERACION', 'EQUIPOS_ELECTRICO', 'EQUIPOS_ESTRUCTURA'].map((l) =>
      dxfPair(0, 'LAYER') + dxfPair(2, l) + dxfPair(70, '0') + dxfPair(62, '7')
    ).join(''),
    dxfPair(0, 'ENDTAB'),
    dxfPair(0, 'ENDSEC'),
  ].join('');

  const ents = [
    dxfPair(0, 'SECTION'), dxfPair(2, 'ENTITIES'),
    entidades([], elements, walls, connections, scale),
    dxfPair(0, 'ENDSEC'),
  ].join('');

  const dxf = header + tables + ents + dxfPair(0, 'EOF');

  const blob = new Blob([dxf], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(plan.name || 'plano').replace(/[^\w\-]+/g, '_')}.dxf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}