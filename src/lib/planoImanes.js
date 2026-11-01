// Imán a puntos (como el «punto cercano» de AutoCAD) y escritura de medidas.

/** Puntos a los que se puede enganchar: extremos y centros de paredes, y centros de equipos. */
export function puntosImantables(walls = [], elements = [], { excluir = () => false } = {}) {
  const pts = [];
  for (const w of walls) {
    if (excluir(w)) continue;
    pts.push({ x: w.x1, y: w.y1, tipo: 'extremo' }, { x: w.x2, y: w.y2, tipo: 'extremo' },
      { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2, tipo: 'centro' });
  }
  for (const e of elements) if (Number.isFinite(e.x) && Number.isFinite(e.y)) pts.push({ x: e.x, y: e.y, tipo: 'equipo' });
  return pts;
}

/** Punto más cercano a `p` dentro de `radio`; si no hay, alineación horizontal/vertical con algún punto. */
export function imanCercano(p, puntos, radio) {
  let mejor = null, d2 = radio * radio;
  for (const q of puntos) {
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d <= d2) { d2 = d; mejor = q; }
  }
  if (mejor) return { x: mejor.x, y: mejor.y, tipo: mejor.tipo };
  let ax = null, ay = null;
  for (const q of puntos) {
    if (Math.abs(q.x - p.x) <= radio && (ax === null || Math.abs(q.x - p.x) < Math.abs(ax - p.x))) ax = q.x;
    if (Math.abs(q.y - p.y) <= radio && (ay === null || Math.abs(q.y - p.y) < Math.abs(ay - p.y))) ay = q.y;
  }
  if (ax !== null || ay !== null) return { x: ax ?? p.x, y: ay ?? p.y, tipo: 'alineado' };
  return null;
}

/** Interpreta lo tecleado («2,35», «2.35») como metros. */
export function parsearMedida(txt) {
  const n = Number(String(txt).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extremo de una pared de `largoPx` desde `ini` en la dirección de `haciaPunto`. */
export function extremoConLargo(ini, haciaPunto, largoPx) {
  const dx = haciaPunto.x - ini.x, dy = haciaPunto.y - ini.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: ini.x + (dx / d) * largoPx, y: ini.y + (dy / d) * largoPx };
}
