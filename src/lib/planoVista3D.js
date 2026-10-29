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
 */

export const ALTURA_SUELO = 2.6;

export function proyectar(x, y, z, giro, zoom, cx, cy) {
  const cos = Math.cos(giro), sen = Math.sin(giro);
  const xr = x * cos - y * sen;
  const yr = x * sen + y * cos;
  const px = (xr - yr) * Math.cos(Math.PI / 6) * zoom;
  const py = (xr + yr) * Math.sin(Math.PI / 6) * zoom - z * zoom;
  return { x: cx + px, y: cy + py };
}

// Altura aproximada (m) que se le da a cada equipo en el volumen 3D.
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
    default: return Math.max(0.4, (el.h_m || 0.5));
  }
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
  const zoomW = (W - margen * 2) / (diag * cos30);
  const zoomH = (H - margen * 2) / (diag * sin30 + alturaSuelo);
  return Math.max(6, Math.min(maxZoom, Math.min(zoomW, zoomH)));
}

/** Dibuja la vista 3D completa sobre el contexto de un canvas W×H. */
export function dibujarVista3D(ctx, W, H, {
  walls = [], elements = [], scale = 50, alturaSuelo = ALTURA_SUELO,
  giro = Math.PI / 5, zoom = 18,
} = {}) {
  const m = (px) => px / scale;
  const cx = W / 2, cy = H * 0.6;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, W, H);

  const { minX, maxX, minY, maxY } = limites({ walls, elements, scale });
  const centroM = { x: m((minX + maxX) / 2), y: m((minY + maxY) / 2) };
  const P = (x, y, z) => proyectar(x - centroM.x, y - centroM.y, z, giro, zoom, cx, cy);

  // Suelo de referencia (rejilla).
  const g0x = Math.floor(m(minX)) - 2, g1x = Math.ceil(m(maxX)) + 2;
  const g0y = Math.floor(m(minY)) - 2, g1y = Math.ceil(m(maxY)) + 2;
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  for (let i = g0x; i <= g1x; i++) {
    const a = P(i, g0y, 0), b = P(i, g1y, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let j = g0y; j <= g1y; j++) {
    const a = P(g0x, j, 0), b = P(g1x, j, 0);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // Paredes levantadas como muros.
  walls.forEach((w) => {
    const x1 = m(w.x1), y1 = m(w.y1), x2 = m(w.x2), y2 = m(w.y2);
    const a0 = P(x1, y1, 0), b0 = P(x2, y2, 0);
    const a1 = P(x1, y1, alturaSuelo), b1 = P(x2, y2, alturaSuelo);
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y);
    ctx.lineTo(b1.x, b1.y); ctx.lineTo(a1.x, a1.y); ctx.closePath();
    ctx.fillStyle = 'rgba(203,213,225,0.65)';
    ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.stroke();
  });

  // Equipos como bloques coloreados, ordenados por profundidad para tapar bien.
  const bloques = elements
    .filter((el) => el.type !== 'texto' && el.type !== 'cota' && el.type !== 'trazo')
    .map((el) => {
      const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
      const x0 = m(el.x - w / 2), y0 = m(el.y - h / 2);
      const x1 = m(el.x + w / 2), y1 = m(el.y + h / 2);
      const alt = alturaDe(el);
      const color = CAT_COLOR[el.cat] || el.color || '#64748b';
      return { el, x0, y0, x1, y1, alt, color, prof: (x0 + x1) / 2 + (y0 + y1) / 2 };
    })
    .sort((a, b) => b.prof - a.prof);

  bloques.forEach((b) => {
    const { x0, y0, x1, y1, alt, color, el } = b;
    const s = [P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0)];
    const t = [P(x0, y0, alt), P(x1, y0, alt), P(x1, y1, alt), P(x0, y1, alt)];
    const f = [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, alt), P(x0, y1, alt)];
    const r = [P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, alt), P(x1, y0, alt)];

    // Sombra en el suelo
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y); s.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
    ctx.fillStyle = 'rgba(15,23,42,0.10)'; ctx.fill();

    const relleno = (cara, alfa) => {
      ctx.beginPath();
      ctx.moveTo(cara[0].x, cara[0].y); cara.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
      ctx.fillStyle = color + alfa; ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.45)'; ctx.lineWidth = 1; ctx.stroke();
    };
    relleno(r, 'cc');
    relleno(f, 'ff');
    ctx.beginPath();
    ctx.moveTo(t[0].x, t[0].y); t.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
    ctx.fillStyle = color + 'aa'; ctx.fill();
    ctx.strokeStyle = 'rgba(15,23,42,0.45)'; ctx.lineWidth = 1; ctx.stroke();

    const centro = P((x0 + x1) / 2, (y0 + y1) / 2, alt + 0.15);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(el.label || el.type, centro.x, centro.y);
    ctx.textAlign = 'left';
  });
}

/**
 * Genera el archivo PNG de la vista 3D (para guardarlo con el plano).
 * Devuelve null si el plano no tiene nada dibujado.
 */
export async function generarVista3DPng({ walls = [], elements = [], scale = 50, nombre = 'plano' } = {}) {
  if (!walls.length && !elements.length) return null;
  const W = 1400, H = 900;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const zoom = calcularZoomAjustado(W, H, { walls, elements, scale, maxZoom: 200 }) || 18;
  dibujarVista3D(ctx, W, H, { walls, elements, scale, giro: Math.PI / 5, zoom });
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return null;
  const limpio = String(nombre || 'plano').replace(/[^\w\-]+/g, '_').slice(0, 60);
  return new File([blob], `vista3d_${limpio}.png`, { type: 'image/png' });
}