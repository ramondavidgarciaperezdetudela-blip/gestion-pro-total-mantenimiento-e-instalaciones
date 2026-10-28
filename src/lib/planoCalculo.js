// Cálculo y utilidades de conexiones del plano frigorífico.
//
// Una conexión une dos elementos colocados en el lienzo. Hay dos tipos:
//  - 'refrigerante' → tubería: lleva gas y líquido, con sus diámetros.
//  - 'electrica'   → cableado: lleva conexión de potencia y de comunicaciones.
//
// La longitud de cada conexión se calcula con la posición de los dos equipos
// y la escala del plano (px por metro).

export function crearConexion(type, from_id, to_id, path = []) {
  return {
    id: crypto.randomUUID(),
    type,
    from_id,
    to_id,
    path: path || [],
    gas_diameter: '',
    liquid_diameter: '',
    power_type: '',
    comm_type: '',
    notes: '',
  };
}

// Lista de puntos por los que pasa una conexión: origen → codos → destino.
export function puntosConexion(conn, elements) {
  const a = elements.find((e) => e.id === conn.from_id);
  const b = elements.find((e) => e.id === conn.to_id);
  if (!a || !b) return [];
  return [{ x: a.x, y: a.y }, ...(conn.path || []), { x: b.x, y: b.y }];
}

// Longitud real (metros) de una conexión recorriendo sus codos. Si no tiene
// path, es la distancia recta entre los dos equipos.
export function longitudConexion(conn, elements, scale = 50) {
  const pts = puntosConexion(conn, elements);
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return total / (scale || 50);
}

function nearest(el, list) {
  let best = null, bd = Infinity;
  for (const o of list) {
    if (o.id === el.id) continue;
    const d = Math.hypot(el.x - o.x, el.y - o.y);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

/**
 * Genera conexiones lógicas a partir de los equipos colocados, sin duplicar
 * las que ya existían. Es el "auto-conectar": enlaza cada evaporador con el
 * grupo de frío / condensador más cercano, los grupos con condensadores, los
 * condensadores con compresores, y el cuadro eléctrico con las cargas grandes.
 */
export function autoConectar(elements, existentes = []) {
  const out = [];
  const keyOf = (c) => `${c.type}|${c.from_id}|${c.to_id}`;
  const revOf = (c) => `${c.type}|${c.to_id}|${c.from_id}`;
  const have = new Set(existentes.map((c) => keyOf(c)));
  const add = (type, from_id, to_id) => {
    if (!from_id || !to_id || from_id === to_id) return;
    const c = crearConexion(type, from_id, to_id);
    if (have.has(keyOf(c)) || have.has(revOf(c))) return;
    out.push(c);
    have.add(keyOf(c));
  };

  const evap = elements.filter((e) => e.type === 'evaporador');
  const grupos = elements.filter((e) => e.type === 'grupo_frio');
  const condens = elements.filter((e) => e.type === 'condensador');
  const compresores = elements.filter((e) => e.type === 'compresor');
  const cuadros = elements.filter((e) => e.type === 'cuadro_electrico');

  evap.forEach((e) => {
    const t = nearest(e, [...grupos, ...condens]);
    if (t) add('refrigerante', e.id, t.id);
  });
  grupos.forEach((g) => {
    const c = nearest(g, condens);
    if (c) add('refrigerante', g.id, c.id);
  });
  condens.forEach((c) => {
    const cp = nearest(c, compresores.length ? compresores : grupos);
    if (cp) add('refrigerante', c.id, cp.id);
  });

  const loads = [...compresores, ...grupos, ...condens];
  cuadros.forEach((cu) => loads.forEach((l) => add('electrica', cu.id, l.id)));

  return out;
}

// Totales de tubería agrupados por diámetro (para el resumen y el PDF).
export function resumenTuberias(connections, elements, scale = 50) {
  const tub = connections.filter((c) => c.type === 'refrigerante');
  const gas = {}, liq = {};
  tub.forEach((c) => {
    const L = longitudConexion(c, elements, scale);
    if (c.gas_diameter) gas[c.gas_diameter] = (gas[c.gas_diameter] || 0) + L;
    if (c.liquid_diameter) liq[c.liquid_diameter] = (liq[c.liquid_diameter] || 0) + L;
  });
  return { tub, gas, liq };
}