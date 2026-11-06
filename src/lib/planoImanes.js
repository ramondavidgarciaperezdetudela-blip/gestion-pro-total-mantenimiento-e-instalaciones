// Imán a puntos (como el «punto cercano» de AutoCAD), escritura de medidas y distancias del equipo a las paredes.
import { espesorPared } from './planoParedes.js';

/**
 * Puntos a los que se puede enganchar: extremos y centros de PAREDES. Los equipos no se imantan (van a la
 * distancia que se quiera) salvo que se pida con `conElementos`.
 */
export function puntosImantables(walls = [], elements = [], { excluir = () => false, conElementos = false } = {}) {
  const pts = [];
  for (const w of walls) {
    if (excluir(w)) continue;
    pts.push({ x: w.x1, y: w.y1, tipo: 'extremo' }, { x: w.x2, y: w.y2, tipo: 'extremo' },
      { x: (w.x1 + w.x2) / 2, y: (w.y1 + w.y2) / 2, tipo: 'centro' });
  }
  if (conElementos) for (const e of elements) if (Number.isFinite(e.x) && Number.isFinite(e.y)) pts.push({ x: e.x, y: e.y, tipo: 'equipo' });
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

// ── Distancias del equipo a las paredes ────────────────────────────────────

export const LADOS = ['izq', 'der', 'arriba', 'abajo'];
export const NOMBRE_LADO = { izq: 'pared de la izquierda', der: 'pared de la derecha', arriba: 'pared de arriba', abajo: 'pared de abajo' };
const DIR = { izq: [-1, 0], der: [1, 0], arriba: [0, -1], abajo: [0, 1] };

/** Caja (en píxeles del plano) que ocupa un equipo, con su giro. */
export function cajaDeElemento(el, scale = 50) {
  const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
  const a = ((Number(el.rot) || 0) * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const xs = [], ys = [];
  for (const [dx, dy] of [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]) {
    xs.push(el.x + dx * cos - dy * sin); ys.push(el.y + dx * sin + dy * cos);
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

// Distancia desde `o` en la dirección `d` (eje) hasta la pared, y mitad del grueso a descontar.
function golpe(o, d, w, scale) {
  const sx = w.x2 - w.x1, sy = w.y2 - w.y1;
  const den = d[0] * sy - d[1] * sx; // d × s
  if (Math.abs(den) < 1e-9) return null; // paralela
  const qx = w.x1 - o.x, qy = w.y1 - o.y;
  const t = (qx * sy - qy * sx) / den;
  const u = (qx * d[1] - qy * d[0]) / den;
  if (t < -1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
  const largo = Math.hypot(sx, sy) || 1;
  const sen = Math.max(0.3, Math.abs(den) / largo);
  const mitad = (w.material || w.espesor_mm) ? (espesorPared(w) * scale) / 2 : 0;
  return { t: Math.max(0, t - mitad / sen), pared: w };
}

/**
 * Distancia desde cada lado de un equipo hasta la cara de la pared más cercana en esa dirección:
 * { izq, der, arriba, abajo } con {m, desde, hasta, pared} (m en metros, sin redondear) o null si no hay pared.
 */
export function distanciasAParedes(el, walls = [], scale = 50) {
  const c = cajaDeElemento(el, scale);
  const cx = (c.x0 + c.x1) / 2, cy = (c.y0 + c.y1) / 2;
  const origen = { izq: { x: c.x0, y: cy }, der: { x: c.x1, y: cy }, arriba: { x: cx, y: c.y0 }, abajo: { x: cx, y: c.y1 } };
  const out = {};
  for (const lado of LADOS) {
    let mejor = null;
    for (const w of walls) {
      const g = golpe(origen[lado], DIR[lado], w, scale);
      if (g && (!mejor || g.t < mejor.t)) mejor = g;
    }
    const d = DIR[lado];
    out[lado] = mejor ? {
      m: mejor.t / scale, pared: mejor.pared,
      desde: origen[lado], hasta: { x: origen[lado].x + d[0] * mejor.t, y: origen[lado].y + d[1] * mejor.t },
    } : null;
  }
  return out;
}

/** El lado con la pared más cercana (o null si no hay ninguna). */
export function ladoMasCercano(dist) {
  let mejor = null;
  for (const l of LADOS) if (dist?.[l] && (!mejor || dist[l].m < dist[mejor].m)) mejor = l;
  return mejor;
}

/** Nueva posición {x, y} para que el lado indicado quede a `metros` de su pared. null si no hay pared ahí. */
export function colocarADistancia(el, walls, scale, lado, metros) {
  const d = distanciasAParedes(el, walls, scale)[lado];
  if (!d || !(metros >= 0)) return null;
  const falta = (d.m - metros) * scale; // píxeles que hay que acercarse (negativo = alejarse)
  const [dx, dy] = DIR[lado];
  return { x: el.x + dx * falta, y: el.y + dy * falta };
}

/** Metros con milímetros y coma: 1,234. */
export const textoMetros = (m) => `${(Math.round(m * 1000) / 1000).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m`;
