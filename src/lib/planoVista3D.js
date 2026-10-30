import { CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';

/**
 * planoVista3D — dibujo isométrico 3D de un plano frigorífico.
 *
 * El MISMO dibujo se usa en dos sitios:
 *   · el visor que se abre con el botón «Visor 3D», y
 *   · el archivo PNG que se guarda junto al plano al guardarlo.
 * Al compartir el código, la imagen guardada es exactamente lo que se ve
 * en pantalla: si el dibujo cambia, la vista guardada cambia igual.
 *
 * No usa WebGL (en el WebView de Android y en móviles antiguos va a tirones
 * o falla): es una proyección isométrica sobre un <canvas> normal.
 *
 * Alturas (todas en metros):
 *   · sala / cámara: `alto_m` en cada una de sus paredes (si falta: 2,6 m la sala, 2,5 m la cámara),
 *   · equipo: `alto_m` = lo alto que es; `z_m` = a qué altura del suelo está colocado
 *     (si no se indica, el evaporador, las rejillas, los cassettes… van colgados del techo del
 *     recinto donde están, y el resto en el suelo).
 */

export const ALTURA_SUELO = 2.6;
export const ALTURA_CAMARA = 2.5;
const ESPESOR_PARED = 0.1;

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
  return Number.isFinite(n) ? n : null;
};

export function proyectar(x, y, z, giro, zoom, cx, cy) {
  const cos = Math.cos(giro), sen = Math.sin(giro);
  const xr = x * cos - y * sen;
  const yr = x * sen + y * cos;
  const px = (xr - yr) * Math.cos(Math.PI / 6) * zoom;
  const py = (xr + yr) * Math.sin(Math.PI / 6) * zoom - z * zoom;
  return { x: cx + px, y: cy + py };
}

// Altura aproximada (m) que se le da a cada equipo cuando el usuario no la ha puesto.
export function alturaDe(el) {
  switch (el.type) {
    case 'camara_frigorifica': return 2.6;
    case 'central_frigorifica': return 2.0;
    case 'grupo_frio': return 1.6;
    case 'condensadora_aire':
    case 'condensadora_centrifugo':
    case 'condensadora_evaporativa':
    case 'condensadora_seca':
    case 'condensadora_agua':
    case 'condensador': return 1.4;
    case 'uvt': return 1.5;
    case 'evaporador': return 0.6;
    case 'cuadro_electrico': return 1.8;
    case 'vitrina':
    case 'mural':
    case 'botellero': return 0.9;
    case 'arcon': return 0.8;
    case 'pilar': return 2.6;
    case 'cassette': return 0.25;
    case 'conductos': return 0.4;
    case 'split_pared': return 0.3;
    case 'rejilla_impulsion':
    case 'rejilla_retorno':
    case 'rejilla_extraccion':
    case 'difusor_circular':
    case 'difusor_lineal':
    case 'boca_impulsion':
    case 'boca_retorno': return 0.1;
    case 'ventilador':
    case 'ventilador_extraccion':
    case 'ventilador_impulsion': return 0.35;
    default: return Math.max(0.2, (el.h_m || 0.5));
  }
}

/** Alto del equipo: el que haya puesto el usuario o el habitual de su tipo. */
export function altoEquipo(el) {
  const a = num(el.alto_m);
  return a !== null && a > 0 ? a : alturaDe(el);
}

/** Alto de una pared: la de su sala o cámara, o la general si es una pared suelta. */
export function altoPared(w, alturaSuelo = ALTURA_SUELO) {
  const a = num(w.alto_m);
  if (a !== null && a > 0) return a;
  return w.camara ? ALTURA_CAMARA : alturaSuelo;
}

/** Recintos (salas y cámaras) del plano, uno por room_id, con medidas y alto. */
export function recintosDe(walls = [], alturaSuelo = ALTURA_SUELO) {
  const mapa = new Map();
  walls.forEach((w) => {
    if (!w.room_id || !w.room_w_m || !w.room_h_m || mapa.has(w.room_id)) return;
    mapa.set(w.room_id, {
      id: w.room_id, x: w.room_x, y: w.room_y, ancho: w.room_w_m, largo: w.room_h_m,
      alto: altoPared(w, alturaSuelo), camara: !!w.camara, tipo: w.tipo, suelo: w.suelo !== false,
      espesor: (num(w.espesor_mm) || 100) / 1000,
    });
  });
  return [...mapa.values()];
}

/** Recinto en cuyo interior está el centro del equipo (o null). */
export function recintoDe(el, walls, scale = 50, alturaSuelo = ALTURA_SUELO) {
  return recintosDe(walls, alturaSuelo).find((r) => (
    el.x >= r.x && el.x <= r.x + r.ancho * scale && el.y >= r.y && el.y <= r.y + r.largo * scale
  )) || null;
}

/** Altura del techo bajo el que está el equipo (null si no está dentro de una sala o cámara). */
export function techoEn(el, walls, scale = 50, alturaSuelo = ALTURA_SUELO) {
  const r = recintoDe(el, walls, scale, alturaSuelo);
  return r ? r.alto : null;
}

const COLGADOS = new Set([
  'evaporador', 'cassette', 'conductos', 'rejilla_impulsion', 'rejilla_retorno', 'rejilla_extraccion',
  'difusor_circular', 'difusor_lineal', 'boca_impulsion', 'boca_retorno', 'caja_toma', 'silenciador',
  'compuerta_cortafuego',
]);

/** ¿La altura de montaje la ha puesto el usuario? */
export const tieneCotaPropia = (el) => num(el.z_m) !== null;

/** Altura (m) del borde inferior del equipo sobre el suelo. */
export function cotaEquipo(el, walls = [], scale = 50, alturaSuelo = ALTURA_SUELO) {
  const z = num(el.z_m);
  if (z !== null) return Math.max(0, z);
  if (COLGADOS.has(el.type)) {
    const techo = techoEn(el, walls, scale, alturaSuelo);
    if (techo !== null) return Math.max(0, techo - altoEquipo(el) - (el.type === 'evaporador' ? 0.1 : 0));
    return 0;
  }
  if (el.type === 'split_pared') return 2.0;
  if (el.type === 'toma_corriente' || el.type === 'interruptor') return 1.1;
  return 0;
}

// Caja que ocupa lo dibujado, en píxeles del lienzo del plano.
function limites({ walls = [], elements = [], scale = 50 }) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const meter = (x, y) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  };
  walls.forEach((w) => { meter(w.x1, w.y1); meter(w.x2, w.y2); });
  elements.forEach((el) => {
    const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
    meter(el.x - w / 2, el.y - h / 2); meter(el.x + w / 2, el.y + h / 2);
  });
  if (!Number.isFinite(minX)) { minX = 0; maxX = 28; minY = 0; maxY = 18; }
  return { minX, maxX, minY, maxY };
}

function alturaMaxima({ walls = [], elements = [], scale = 50, alturaSuelo = ALTURA_SUELO }) {
  let h = 1;
  walls.forEach((w) => { h = Math.max(h, altoPared(w, alturaSuelo)); });
  elements.forEach((el) => {
    if (el.type === 'texto' || el.type === 'cota' || el.type === 'trazo') return;
    h = Math.max(h, cotaEquipo(el, walls, scale, alturaSuelo) + altoEquipo(el));
  });
  return h;
}

/**
 * Zoom con el que todo lo dibujado cabe en un lienzo de W×H.
 * Devuelve null si el plano está vacío (no hay nada que encuadrar).
 */
export function calcularZoomAjustado(W, H, { walls = [], elements = [], scale = 50, alturaSuelo = ALTURA_SUELO, maxZoom = 48 } = {}) {
  if (!walls.length && !elements.length) return null;
  const { minX, maxX, minY, maxY } = limites({ walls, elements, scale });
  const m = (px) => px / scale;
  const dx = Math.max(2, m(maxX - minX)) + 2;
  const dy = Math.max(2, m(maxY - minY)) + 2;
  const diag = dx + dy;
  const margen = 36;
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  const alto = alturaMaxima({ walls, elements, scale, alturaSuelo });
  const zoomW = (W - margen * 2) / (diag * cos30);
  const zoomH = (H - margen * 2) / (diag * sin30 + alto);
  return Math.max(6, Math.min(maxZoom, Math.min(zoomW, zoomH)));
}

/* ───────────── Colores, luz y primitivas de dibujo ───────────── */

function hexRgb(c) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return [100, 116, 139];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Color base aclarado (f > 1) u oscurecido (f < 1), con transparencia opcional.
function tono(c, f, a = 1) {
  let [r, g, b] = hexRgb(c);
  if (f > 1) { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  else { r *= f; g *= f; b *= f; }
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
}

const rotar = (x, y, giro) => {
  const c = Math.cos(giro), s = Math.sin(giro);
  return [x * c - y * s, x * s + y * c];
};

// Luz: viene de la izquierda y de arriba. Devuelve 0,58 (cara en sombra) … 1,0 (cara iluminada).
const LUZ = [-0.29, 0.96];
const brilloCara = (xr, yr) => 0.58 + 0.42 * ((xr * LUZ[0] + yr * LUZ[1]) * 0.5 + 0.5);

function trazarPoligono(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

const areaPantalla = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; }
  return a;
};

/**
 * Prisma recto: base `pts` (metros, [[x,y],…]) levantada de z0 a z1. Dibuja solo
 * las caras que se ven desde la cámara (según el giro) y la tapa. Cada cara se
 * sombrea según hacia dónde mira. Devuelve las caras y la tapa para decorarlas.
 */
function prisma(M, pts, z0, z1, color, o = {}) {
  const { ctx, P, giro } = M;
  const { alfa = 1, borde = 'rgba(15,23,42,0.40)', oscuro = 0.80, brilloTapa = 1.12, sinTapa = false } = o;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  const sg = area >= 0 ? 1 : -1;
  const caras = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const nx = (sg * dy) / len, ny = (-sg * dx) / len;
    const [xr, yr] = rotar(nx, ny, giro);
    caras.push({ a, b, len, z0, z1, vis: xr + yr > 1e-3, xr, yr, prof: M.prof((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) });
  }
  const visibles = caras.filter((c) => c.vis).sort((p, q) => p.prof - q.prof);
  visibles.forEach((f) => {
    const A0 = P(f.a[0], f.a[1], z0), B0 = P(f.b[0], f.b[1], z0), B1 = P(f.b[0], f.b[1], z1), A1 = P(f.a[0], f.a[1], z1);
    const sh = brilloCara(f.xr, f.yr);
    const g = ctx.createLinearGradient((A0.x + B0.x) / 2, (A0.y + B0.y) / 2, (A1.x + B1.x) / 2, (A1.y + B1.y) / 2);
    g.addColorStop(0, tono(color, sh * oscuro, alfa));
    g.addColorStop(1, tono(color, sh, alfa));
    trazarPoligono(ctx, [A0, B0, B1, A1]);
    ctx.fillStyle = g; ctx.fill();
    if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1; ctx.stroke(); }
  });
  let tapa = null;
  if (!sinTapa) {
    tapa = pts.map(([x, y]) => P(x, y, z1));
    trazarPoligono(ctx, tapa);
    ctx.fillStyle = tono(color, brilloTapa, alfa); ctx.fill();
    if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 1; ctx.stroke(); }
  }
  return { caras: visibles, tapa };
}

// Punto de una cara: u = fracción a lo largo de su borde (0…1), z = altura en metros.
const enCara = (M, f, u, z) => M.P(f.a[0] + (f.b[0] - f.a[0]) * u, f.a[1] + (f.b[1] - f.a[1]) * u, z);

function lineaCara(M, f, u0, z0, u1, z1, color, ancho = 1) {
  const a = enCara(M, f, u0, z0), b = enCara(M, f, u1, z1);
  M.ctx.beginPath(); M.ctx.moveTo(a.x, a.y); M.ctx.lineTo(b.x, b.y);
  M.ctx.strokeStyle = color; M.ctx.lineWidth = ancho; M.ctx.stroke();
}

function rectCara(M, f, u0, z0, u1, z1, { relleno, trazo, ancho = 1 } = {}) {
  const pts = [enCara(M, f, u0, z0), enCara(M, f, u1, z0), enCara(M, f, u1, z1), enCara(M, f, u0, z1)];
  trazarPoligono(M.ctx, pts);
  if (relleno) { M.ctx.fillStyle = relleno; M.ctx.fill(); }
  if (trazo) { M.ctx.strokeStyle = trazo; M.ctx.lineWidth = ancho; M.ctx.stroke(); }
}

// Círculo dibujado sobre una cara vertical (centro a `d` metros del inicio de la cara).
function circuloCara(M, f, d, zc, r, { relleno, trazo, ancho = 1 } = {}) {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    pts.push(enCara(M, f, (d + Math.cos(t) * r) / f.len, zc + Math.sin(t) * r));
  }
  trazarPoligono(M.ctx, pts);
  if (relleno) { M.ctx.fillStyle = relleno; M.ctx.fill(); }
  if (trazo) { M.ctx.strokeStyle = trazo; M.ctx.lineWidth = ancho; M.ctx.stroke(); }
}

function aspasCara(M, f, d, zc, r, fase, color) {
  for (let k = 0; k < 4; k++) {
    const t = fase + (k * Math.PI) / 2;
    const a = enCara(M, f, d / f.len, zc);
    const b = enCara(M, f, (d + Math.cos(t) * r) / f.len, zc + Math.sin(t) * r);
    M.ctx.beginPath(); M.ctx.moveTo(a.x, a.y); M.ctx.lineTo(b.x, b.y);
    M.ctx.strokeStyle = color; M.ctx.lineWidth = 1.4; M.ctx.stroke();
  }
}

// Círculo sobre una superficie horizontal a la altura z.
function circuloTop(M, cx, cy, z, r, { relleno, trazo, ancho = 1 } = {}) {
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const t = (i / 28) * Math.PI * 2;
    pts.push(M.P(cx + Math.cos(t) * r, cy + Math.sin(t) * r, z));
  }
  trazarPoligono(M.ctx, pts);
  if (relleno) { M.ctx.fillStyle = relleno; M.ctx.fill(); }
  if (trazo) { M.ctx.strokeStyle = trazo; M.ctx.lineWidth = ancho; M.ctx.stroke(); }
}

function ventiladorTop(M, cx, cy, z, r) {
  const { ctx } = M;
  circuloTop(M, cx, cy, z, r, { relleno: '#0f172a', trazo: '#334155', ancho: 1.2 });
  circuloTop(M, cx, cy, z + 0.005, r * 0.86, { relleno: '#1e293b', trazo: '#475569', ancho: 0.8 });
  for (let k = 0; k < 6; k++) {
    const t = (k * Math.PI) / 3 + 0.4;
    const a = M.P(cx, cy, z + 0.01), b = M.P(cx + Math.cos(t) * r * 0.84, cy + Math.sin(t) * r * 0.84, z + 0.01);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  circuloTop(M, cx, cy, z + 0.015, r * 0.16, { relleno: '#cbd5e1', trazo: '#64748b', ancho: 0.8 });
  // rejilla protectora: dos círculos concéntricos
  circuloTop(M, cx, cy, z + 0.02, r * 0.55, { trazo: 'rgba(203,213,225,0.55)', ancho: 0.8 });
  circuloTop(M, cx, cy, z + 0.02, r * 0.28, { trazo: 'rgba(203,213,225,0.55)', ancho: 0.8 });
}

// Sombra proyectada en el suelo: la huella desplazada y los tramos que la unen con el pie.
function sombra(M, pts, alto) {
  const { ctx, P, zoom } = M;
  const d = { x: alto * zoom * 0.5, y: alto * zoom * 0.13 };
  const base = pts.map(([x, y]) => P(x, y, 0));
  const desplazada = base.map((p) => ({ x: p.x + d.x, y: p.y + d.y }));
  const partes = [desplazada];
  for (let i = 0; i < base.length; i++) {
    const j = (i + 1) % base.length;
    partes.push([base[i], base[j], desplazada[j], desplazada[i]]);
  }
  ctx.beginPath();
  partes.forEach((poly) => {
    const p = areaPantalla(poly) >= 0 ? poly : [...poly].reverse();
    ctx.moveTo(p[0].x, p[0].y);
    for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
    ctx.closePath();
  });
  ctx.fillStyle = 'rgba(15,23,42,0.16)';
  ctx.fill('nonzero');
}

function poligonoRegular(cx, cy, r, n = 16) {
  const pts = [];
  for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); }
  return pts;
}

/* ───────────── Equipos ───────────── */

const TIPOS_CONDENSADORA = new Set([
  'condensador', 'condensadora_aire', 'condensadora_centrifugo', 'condensadora_evaporativa',
  'condensadora_seca', 'exterior_clima',
]);
const TIPOS_REJILLA = new Set([
  'rejilla_impulsion', 'rejilla_retorno', 'rejilla_extraccion', 'difusor_circular', 'difusor_lineal',
  'boca_impulsion', 'boca_retorno',
]);

function claseDe(type) {
  if (TIPOS_CONDENSADORA.has(type)) return 'condensadora';
  if (TIPOS_REJILLA.has(type)) return 'rejilla';
  switch (type) {
    case 'evaporador': return 'evaporador';
    case 'camara_frigorifica': return 'camara';
    case 'grupo_frio':
    case 'central_frigorifica': return 'central';
    case 'cuadro_electrico':
    case 'automata':
    case 'variador': return 'cuadro';
    case 'vitrina':
    case 'mural':
    case 'botellero': return 'vitrina';
    case 'arcon': return 'arcon';
    case 'pilar':
    case 'recibidor':
    case 'separador_aceite':
    case 'compresor': return 'cilindro';
    case 'ventilador':
    case 'ventilador_extraccion':
    case 'ventilador_impulsion': return 'ventilador';
    case 'split_pared': return 'split';
    default: return 'caja';
  }
}

// Colores de fábrica de cada tipo de equipo (el de la categoría se usa en la etiqueta).
function pintura(type, clase, catColor) {
  if (clase === 'condensadora') return '#cbd5e1';
  if (clase === 'evaporador') return '#e2e8f0';
  if (clase === 'camara') return '#f8fafc';
  if (clase === 'central') return '#2563eb';
  if (clase === 'cuadro') return '#9ca3af';
  if (clase === 'vitrina') return '#94a3b8';
  if (clase === 'arcon') return '#f1f5f9';
  if (type === 'pilar') return '#a8a29e';
  if (type === 'compresor') return '#1e3a5f';
  if (type === 'recibidor' || type === 'separador_aceite') return '#475569';
  if (clase === 'ventilador') return '#64748b';
  if (clase === 'split') return '#f8fafc';
  if (clase === 'rejilla') return '#e5e7eb';
  return catColor;
}

function dibujarEquipo(M, b) {
  const { ctx } = M;
  const { x0, y0, x1, y1, z0, alto, el, clase, cuerpo } = b;
  const z1 = z0 + alto;
  const w = x1 - x0, d = y1 - y0;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const rect = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const datos = el.datos || {};

  sombra(M, rect, z1);

  // Equipo colgado o elevado: línea de plomada hasta el suelo y marca donde se proyecta.
  if (z0 > 0.12) {
    const a = M.P(cx, cy, z0), s = M.P(cx, cy, 0);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(s.x, s.y);
    ctx.strokeStyle = 'rgba(71,85,105,0.7)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    circuloTop(M, cx, cy, 0, Math.min(w, d) * 0.12, { relleno: 'rgba(71,85,105,0.35)' });
  }

  switch (clase) {
    case 'condensadora': {
      const pata = Math.min(0.14, alto * 0.12);
      prisma(M, rect, z0, z0 + pata, '#334155', { borde: null, sinTapa: true });
      const { caras, tapa } = prisma(M, rect, z0 + pata, z1, cuerpo);
      const n = Math.max(1, Math.min(8, Math.round(num(datos.ventiladores) || Math.max(1, Math.round(Math.max(w, d) / 0.75)))));
      const largo = Math.max(w, d), ancho = Math.min(w, d);
      const horizontal = w >= d;
      const r = Math.min(ancho * 0.42, (largo / n) * 0.44);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        ventiladorTop(M, horizontal ? x0 + w * t : cx, horizontal ? cy : y0 + d * t, z1 + 0.002, r);
      }
      caras.forEach((f) => {
        // Persianas laterales: líneas horizontales finas.
        const paso = Math.max(0.06, (alto - pata) / 12);
        for (let z = z0 + pata + paso; z < z1 - 0.02; z += paso) lineaCara(M, f, 0.04, z, 0.96, z, 'rgba(15,23,42,0.18)', 1);
        lineaCara(M, f, 0.04, z0 + pata, 0.04, z1, 'rgba(255,255,255,0.35)', 1);
      });
      b.tapa = tapa;
      break;
    }
    case 'evaporador': {
      const { caras } = prisma(M, rect, z0, z1, cuerpo);
      prisma(M, rect, z0, z0 + Math.min(0.06, alto * 0.2), '#94a3b8', { borde: null, sinTapa: true });
      const nVent = Math.max(1, Math.min(6, Math.round(num(datos.ventiladores) || 2)));
      const principal = [...caras].sort((p, q) => q.len - p.len)[0];
      caras.forEach((f) => {
        // Aletas: líneas verticales.
        const paso = 0.05;
        for (let u = paso; u < f.len; u += paso) lineaCara(M, f, u / f.len, z0 + alto * 0.1, u / f.len, z1 - alto * 0.06, 'rgba(15,23,42,0.10)', 1);
        if (f === principal) {
          const r = Math.min(alto * 0.4, (f.len / nVent) * 0.42);
          for (let i = 0; i < nVent; i++) {
            const dd = (f.len / nVent) * (i + 0.5);
            circuloCara(M, f, dd, z0 + alto * 0.52, r, { relleno: '#0f172a', trazo: '#475569', ancho: 1.2 });
            circuloCara(M, f, dd, z0 + alto * 0.52, r * 0.82, { relleno: '#1e293b' });
            aspasCara(M, f, dd, z0 + alto * 0.52, r * 0.8, 0.5, '#94a3b8');
            circuloCara(M, f, dd, z0 + alto * 0.52, r * 0.14, { relleno: '#cbd5e1' });
          }
        }
      });
      break;
    }
    case 'camara': {
      const { caras } = prisma(M, rect, z0, z1, cuerpo, { alfa: 0.92 });
      caras.forEach((f) => {
        for (let u = 1; u < f.len; u += 1) lineaCara(M, f, u / f.len, z0, u / f.len, z1, 'rgba(15,23,42,0.14)', 1);
        if (f.len >= 1.2) {
          const du = 0.9 / f.len, uc = 0.5;
          rectCara(M, f, uc - du / 2, z0, uc + du / 2, z0 + Math.min(2.0, alto * 0.82), { relleno: 'rgba(148,163,184,0.55)', trazo: 'rgba(15,23,42,0.55)' });
          lineaCara(M, f, uc + du / 2 - 0.05 / f.len, z0 + 0.9, uc + du / 2 - 0.05 / f.len, z0 + 1.15, '#0f172a', 2);
        }
      });
      break;
    }
    case 'central': {
      prisma(M, rect, z0, z0 + 0.12, '#1f2937', { borde: null, sinTapa: true });
      const { caras } = prisma(M, rect, z0 + 0.12, z0 + alto * 0.55, cuerpo);
      const n = Math.max(1, Math.min(6, Math.round(num(datos.compresores) || 2)));
      const largo = Math.max(w, d), ancho = Math.min(w, d);
      const horizontal = w >= d;
      const r = Math.min(ancho * 0.36, (largo / n) * 0.36);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const px = horizontal ? x0 + w * t : cx, py = horizontal ? cy : y0 + d * t;
        prisma(M, poligonoRegular(px, py, r, 14), z0 + alto * 0.55, z1, '#1e3a5f', { borde: null, brilloTapa: 1.3 });
      }
      caras.forEach((f) => {
        for (let u = 0.6; u < f.len; u += 0.6) lineaCara(M, f, u / f.len, z0 + 0.14, u / f.len, z0 + alto * 0.53, 'rgba(255,255,255,0.28)', 1);
      });
      break;
    }
    case 'cuadro': {
      const { caras } = prisma(M, rect, z0, z1, cuerpo);
      caras.forEach((f) => {
        rectCara(M, f, 0.07, z0 + alto * 0.05, 0.93, z1 - alto * 0.05, { relleno: 'rgba(255,255,255,0.12)', trazo: 'rgba(15,23,42,0.5)' });
        lineaCara(M, f, 0.86, z0 + alto * 0.42, 0.86, z0 + alto * 0.58, '#0f172a', 2);
        const led = enCara(M, f, 0.15, z1 - alto * 0.12);
        ctx.beginPath(); ctx.arc(led.x, led.y, 2, 0, Math.PI * 2); ctx.fillStyle = '#22c55e'; ctx.fill();
      });
      break;
    }
    case 'vitrina': {
      const base = alto * 0.38;
      prisma(M, rect, z0, z0 + 0.1, '#1f2937', { borde: null, sinTapa: true });
      prisma(M, rect, z0 + 0.1, z0 + base, cuerpo);
      const { caras, tapa } = prisma(M, rect, z0 + base, z1, '#bae6fd', { alfa: 0.38, borde: 'rgba(14,116,144,0.6)', brilloTapa: 1.0 });
      caras.forEach((f) => {
        for (let k = 1; k <= 2; k++) {
          const z = z0 + base + ((z1 - z0 - base) * k) / 3;
          lineaCara(M, f, 0.02, z, 0.98, z, 'rgba(14,116,144,0.55)', 1.2);
        }
        // Producto: bloques de color tras el cristal.
        for (let u = 0.08; u < 0.92; u += 0.12) {
          rectCara(M, f, u, z0 + base + 0.03, u + 0.08, z0 + base + (z1 - z0 - base) * 0.28, { relleno: `rgba(${(u * 900) % 255 | 0},120,90,0.45)` });
        }
      });
      b.tapa = tapa;
      break;
    }
    case 'arcon': {
      prisma(M, rect, z0, z0 + 0.06, '#334155', { borde: null, sinTapa: true });
      prisma(M, rect, z0 + 0.06, z1 - 0.05, cuerpo);
      const m = 0.04;
      prisma(M, [[x0 + m, y0 + m], [x1 - m, y0 + m], [x1 - m, y1 - m], [x0 + m, y1 - m]], z1 - 0.05, z1, '#e2e8f0', { brilloTapa: 1.05 });
      const a = M.P(cx - w * 0.15, cy, z1 + 0.003), c = M.P(cx + w * 0.15, cy, z1 + 0.003);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineCap = 'butt';
      break;
    }
    case 'cilindro': {
      const r = Math.min(w, d) / 2;
      prisma(M, poligonoRegular(cx, cy, r, 18), z0, z1, cuerpo, { borde: null, brilloTapa: 1.15 });
      break;
    }
    case 'ventilador': {
      const r = Math.min(w, d) / 2;
      prisma(M, poligonoRegular(cx, cy, r, 18), z0, z1, cuerpo, { borde: null, brilloTapa: 1.1 });
      ventiladorTop(M, cx, cy, z1 + 0.002, r * 0.9);
      break;
    }
    case 'split': {
      const { caras } = prisma(M, rect, z0, z1, cuerpo);
      caras.forEach((f) => {
        if (f.len > 0.5) rectCara(M, f, 0.04, z0 + alto * 0.08, 0.96, z0 + alto * 0.32, { relleno: 'rgba(15,23,42,0.35)' });
      });
      break;
    }
    case 'rejilla': {
      const { tapa } = prisma(M, rect, z0, z1, cuerpo, { brilloTapa: 1.05 });
      if (el.type === 'difusor_circular' || el.type === 'boca_impulsion' || el.type === 'boca_retorno') {
        [0.9, 0.62, 0.34].forEach((k) => circuloTop(M, cx, cy, z1 + 0.003, Math.min(w, d) / 2 * k, { trazo: 'rgba(71,85,105,0.7)', ancho: 1 }));
      } else {
        const n = Math.max(3, Math.round(Math.min(w, d) / 0.04));
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const a = w >= d ? M.P(x0 + w * 0.03, y0 + d * t, z1 + 0.003) : M.P(x0 + w * t, y0 + d * 0.03, z1 + 0.003);
          const c = w >= d ? M.P(x1 - w * 0.03, y0 + d * t, z1 + 0.003) : M.P(x0 + w * t, y1 - d * 0.03, z1 + 0.003);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.strokeStyle = 'rgba(71,85,105,0.55)'; ctx.lineWidth = 1; ctx.stroke();
        }
      }
      b.tapa = tapa;
      break;
    }
    default: {
      const { caras } = prisma(M, rect, z0, z1, cuerpo);
      caras.forEach((f) => {
        if (f.len > 0.3 && alto > 0.25) {
          rectCara(M, f, 0.06, z0 + alto * 0.08, 0.94, z1 - alto * 0.08, { trazo: 'rgba(15,23,42,0.22)' });
        }
      });
    }
  }
}

/* ───────────── Escena completa ───────────── */

/** Dibuja la vista 3D completa sobre el contexto de un canvas W×H. */
export function dibujarVista3D(ctx, W, H, {
  walls = [], elements = [], scale = 50, alturaSuelo = ALTURA_SUELO,
  giro = Math.PI / 5, zoom = 18, desp = { x: 0, y: 0 },
} = {}) {
  const m = (px) => px / scale;
  const cx = W / 2 + (desp?.x || 0), cy = H * 0.62 + (desp?.y || 0);

  ctx.clearRect(0, 0, W, H);
  const fondo = ctx.createLinearGradient(0, 0, 0, H);
  fondo.addColorStop(0, '#dbe5f0');
  fondo.addColorStop(1, '#f8fafc');
  ctx.fillStyle = fondo;
  ctx.fillRect(0, 0, W, H);

  const { minX, maxX, minY, maxY } = limites({ walls, elements, scale });
  const centroM = { x: m((minX + maxX) / 2), y: m((minY + maxY) / 2) };
  const P = (x, y, z) => proyectar(x - centroM.x, y - centroM.y, z, giro, zoom, cx, cy);
  const prof = (x, y) => { const [xr, yr] = rotar(x - centroM.x, y - centroM.y, giro); return xr + yr; };
  const M = { ctx, P, giro, zoom, prof };

  // Suelo de referencia (rejilla).
  const g0x = Math.floor(m(minX)) - 2, g1x = Math.ceil(m(maxX)) + 2;
  const g0y = Math.floor(m(minY)) - 2, g1y = Math.ceil(m(maxY)) + 2;
  trazarPoligono(ctx, [P(g0x, g0y, 0), P(g1x, g0y, 0), P(g1x, g1y, 0), P(g0x, g1y, 0)]);
  ctx.fillStyle = '#eef2f7'; ctx.fill();
  ctx.strokeStyle = '#d5dde8'; ctx.lineWidth = 1;
  for (let i = g0x; i <= g1x; i++) {
    const a = P(i, g0y, 0), b = P(i, g1y, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let j = g0y; j <= g1y; j++) {
    const a = P(g0x, j, 0), b = P(g1x, j, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // Suelos de salas y cámaras (se dibujan antes que todo lo demás).
  const recintos = recintosDe(walls, alturaSuelo);
  recintos.forEach((r) => {
    const x0 = m(r.x), y0 = m(r.y), x1 = x0 + r.ancho, y1 = y0 + r.largo;
    const color = r.camara ? (r.tipo === 'negativa' ? '#e0e7ff' : '#e0f2fe') : '#e7e5e4';
    prisma(M, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], -0.07, 0, color, { borde: 'rgba(100,116,139,0.5)', brilloTapa: 1.0 });
    // Baldosas (sala) o juntas de panel (cámara).
    const paso = r.camara ? 1 : 0.6;
    ctx.strokeStyle = r.camara ? 'rgba(59,130,246,0.22)' : 'rgba(120,113,108,0.25)'; ctx.lineWidth = 1;
    for (let x = x0 + paso; x < x1 - 0.01; x += paso) {
      const a = P(x, y0, 0), b = P(x, y1, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let y = y0 + paso; y < y1 - 0.01; y += paso) {
      const a = P(x0, y, 0), b = P(x1, y, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  });

  const items = [];
  const etiquetas = [];

  // Paredes: cada tramo de 1 m es un prisma con espesor, para ordenarlas bien con los equipos.
  walls.forEach((w) => {
    const x1 = m(w.x1), y1 = m(w.y1), x2 = m(w.x2), y2 = m(w.y2);
    const largo = Math.hypot(x2 - x1, y2 - y1);
    if (largo < 0.01) return;
    const alto = altoPared(w, alturaSuelo);
    const esp = w.camara ? Math.max(0.06, (num(w.espesor_mm) || 100) / 1000) : ESPESOR_PARED;
    const ux = (x2 - x1) / largo, uy = (y2 - y1) / largo;
    const nx = -uy * esp / 2, ny = ux * esp / 2;
    const tipoCol = w.tipo === 'negativa' ? '#6366f1' : '#3b82f6';
    const color = w.camara ? '#f1f5f9' : '#d6d3d1';
    const piezas = Math.max(1, Math.ceil(largo / 1));
    for (let k = 0; k < piezas; k++) {
      const t0 = (k * largo) / piezas, t1 = ((k + 1) * largo) / piezas;
      const ax = x1 + ux * t0, ay = y1 + uy * t0, bx = x1 + ux * t1, by = y1 + uy * t1;
      const pts = [[ax - nx, ay - ny], [bx - nx, by - ny], [bx + nx, by + ny], [ax + nx, ay + ny]];
      items.push({
        prof: prof((ax + bx) / 2, (ay + by) / 2) + 0.3,
        draw: () => prisma(M, pts, 0, alto, color, {
          alfa: w.camara ? 0.78 : 0.6,
          borde: w.camara ? tono(tipoCol, 0.9, 0.7) : 'rgba(87,83,78,0.55)',
          oscuro: 0.9,
        }),
      });
    }
  });

  // Equipos.
  elements
    .filter((el) => el.type !== 'texto' && el.type !== 'cota' && el.type !== 'trazo')
    .forEach((el) => {
      let w = (el.w_m || 0.5), h = (el.h_m || 0.5);
      if ((Math.round((Number(el.rot) || 0) / 90) % 2 + 2) % 2 === 1) [w, h] = [h, w];
      const x0 = m(el.x) - w / 2, y0 = m(el.y) - h / 2;
      const x1 = x0 + w, y1 = y0 + h;
      const alto = altoEquipo(el);
      const z0 = cotaEquipo(el, walls, scale, alturaSuelo);
      const clase = claseDe(el.type);
      const catColor = CAT_COLOR[el.cat] || el.color || '#64748b';
      const b = { x0, y0, x1, y1, z0, alto, el, clase, cuerpo: pintura(el.type, clase, catColor) };
      items.push({
        prof: prof((x0 + x1) / 2, (y0 + y1) / 2) + (z0 > 0.5 ? 0.15 : 0),
        draw: () => dibujarEquipo(M, b),
      });
      const cota = z0 > 0.05 ? ` · ↑${z0.toFixed(2).replace('.', ',')} m` : '';
      etiquetas.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, z: z0 + alto + 0.12, texto: `${el.label || el.type}${cota}`, color: catColor });
    });

  items.sort((a, b) => a.prof - b.prof).forEach((it) => it.draw());

  // Rótulos de salas y cámaras, sobre el suelo.
  recintos.forEach((r) => {
    const x0 = m(r.x), y0 = m(r.y);
    const nombre = r.camara ? (r.tipo === 'negativa' ? 'Cámara negativa' : 'Cámara positiva') : 'Sala';
    etiquetas.push({
      x: x0 + r.ancho / 2, y: y0 + r.largo / 2, z: 0.02, color: r.camara ? (r.tipo === 'negativa' ? '#6366f1' : '#2563eb') : '#78716c',
      texto: `${nombre} ${r.ancho}×${r.largo} m · alto ${String(r.alto).replace('.', ',')} m`, suave: true,
    });
  });

  // Etiquetas: se dibujan al final para que ningún equipo las tape.
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  etiquetas.forEach((e) => {
    const p = P(e.x, e.y, e.z);
    const tw = ctx.measureText(e.texto).width + 10;
    ctx.fillStyle = e.suave ? 'rgba(255,255,255,0.75)' : e.color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(p.x - tw / 2, p.y - 8, tw, 16, 4); else ctx.rect(p.x - tw / 2, p.y - 8, tw, 16);
    ctx.fill();
    if (e.suave) { ctx.strokeStyle = e.color; ctx.lineWidth = 1; ctx.stroke(); }
    ctx.fillStyle = e.suave ? '#0f172a' : '#ffffff';
    ctx.fillText(e.texto, p.x, p.y + 0.5);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// Proporción con la que se genera la imagen de la vista 3D. La usa el PDF del
// plano para colocarla sin deformarla.
export const VISTA3D_W = 1400;
export const VISTA3D_H = 900;

/** Prepara el lienzo con la vista 3D ya dibujada. null si el plano está vacío. */
function lienzoVista3D({ walls = [], elements = [], scale = 50 } = {}) {
  if (!walls.length && !elements.length) return null;
  const canvas = document.createElement('canvas');
  canvas.width = VISTA3D_W; canvas.height = VISTA3D_H;
  const ctx = canvas.getContext('2d');
  const zoom = calcularZoomAjustado(VISTA3D_W, VISTA3D_H, { walls, elements, scale, maxZoom: 200 }) || 18;
  dibujarVista3D(ctx, VISTA3D_W, VISTA3D_H, { walls, elements, scale, giro: Math.PI / 5, zoom });
  return canvas;
}

/**
 * La misma vista 3D como imagen en memoria (data URL), para incrustarla en el
 * PDF del plano sin depender de la que esté guardada en el servidor.
 * Devuelve '' si el plano no tiene nada dibujado.
 */
export function generarVista3DDataUrl(opciones = {}) {
  const canvas = lienzoVista3D(opciones);
  return canvas ? canvas.toDataURL('image/png') : '';
}

/**
 * Genera el archivo PNG de la vista 3D (para guardarlo con el plano).
 * Devuelve null si el plano no tiene nada dibujado.
 */
export async function generarVista3DPng({ walls = [], elements = [], scale = 50, nombre = 'plano' } = {}) {
  const canvas = lienzoVista3D({ walls, elements, scale });
  if (!canvas) return null;
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return null;
  const limpio = String(nombre || 'plano').replace(/[^\w\-]+/g, '_').slice(0, 60);
  return new File([blob], `vista3d_${limpio}.png`, { type: 'image/png' });
}