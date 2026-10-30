/**
 * ESQUEMAS FRIGORÍFICOS EN SVG — Gestión Pro Total
 *
 * Funciones puras que devuelven el dibujo como texto SVG. Sirven igual para
 * pintarlo en pantalla (componente EsquemaSVG) que para meterlo dentro de un
 * informe impreso o un PDF, donde no hay React ni variables de tema.
 *
 * El dibujo va siempre sobre fondo claro con colores fijos, así que se lee igual
 * en tema claro, tema oscuro, papel y APK.
 *
 *   esquemaCircuito()     circuito completo: compresor, condensador, [electroválvula],
 *                         [filtro deshidratador], [visor], capilar o válvula de expansión,
 *                         evaporador. Admite etiquetas con presiones y temperaturas.
 *   esquemaCapilarCotas() tubo capilar con sus cotas: longitud, tramo de líquido y
 *                         bifásico, Ø interior y exterior, espesor y punto de vaporización.
 *   graficoPerfilSVG()    presión y temperatura a lo largo del capilar.
 *
 * Autor: David García (Gestión Pro Total).
 */

export const COLORES = {
  alta: '#dc2626', // descarga, gas caliente
  liquido: '#ea580c', // línea de líquido
  baja: '#0284c7', // expansión / aspiración
  valvula: '#a16207',
  filtro: '#b45309',
  cobre: '#c2763a',
  texto: '#0f172a',
  suave: '#64748b',
  fondo: '#fbfdff',
  borde: '#cbd5e1',
  resalte: '#7c3aed',
};

/** Escapa texto para meterlo en SVG/HTML. */
export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Número con coma decimal española. */
export function fmt(n, d = 2) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const FUENTE = 'Inter, "Segoe UI", system-ui, Arial, sans-serif';

const texto = (x, y, t, { size = 11, peso = 400, color = COLORES.texto, anchor = 'start', extra = '' } = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${peso}" fill="${color}" text-anchor="${anchor}" ${extra}>${esc(t)}</text>`;

const tuberia = (puntos, color, ancho = 5) =>
  `<polyline points="${puntos.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="${ancho}" stroke-linejoin="round" stroke-linecap="round"/>`;

/** Rótulo con fondo blanco para que se lea encima de las tuberías. */
function chip(x, y, titulo, valor, color = COLORES.texto, ancho = 120) {
  return (
    `<g><rect x="${x}" y="${y}" width="${ancho}" height="32" rx="6" fill="#fff" stroke="${COLORES.borde}"/>` +
    texto(x + ancho / 2, y + 13, titulo, { size: 9, color: COLORES.suave, anchor: 'middle' }) +
    texto(x + ancho / 2, y + 26, valor, { size: 12, peso: 700, color, anchor: 'middle' }) +
    '</g>'
  );
}

function serpentin(x, y, w, h, vueltas, color) {
  const paso = h / (vueltas + 1);
  let s = '';
  for (let i = 1; i <= vueltas; i++)
    s += `<line x1="${x + 10}" y1="${y + paso * i}" x2="${x + w - 10}" y2="${y + paso * i}" stroke="${color}" stroke-width="4" stroke-linecap="round" opacity="0.75"/>`;
  return s;
}

function ventilador(cx, cy, r, color = '#475569') {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f1f5f9" stroke="${color}" stroke-width="2"/>`;
  for (let a = 0; a < 360; a += 60)
    s += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos((a * Math.PI) / 180) * (r - 6)).toFixed(1)}" y2="${(cy + Math.sin((a * Math.PI) / 180) * (r - 6)).toFixed(1)}" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>`;
  return s;
}

/* ───────────────────────────── Circuito completo ───────────────────────────── */

/**
 * @param {object} o
 * @param {'capilar'|'vet'} [o.expansion]  dispositivo de expansión
 * @param {boolean} [o.filtro]     filtro deshidratador en la línea de líquido
 * @param {boolean} [o.visor]      visor de líquido
 * @param {boolean} [o.solenoide]  electroválvula de líquido
 * @param {'capilar'|'filtro'|null} [o.resaltar]  pieza a marcar
 * @param {string} [o.titulo]
 * @param {object} [o.etiquetas]   { gas, Pc, Tc, Pe, Te, capilar, filtro, carga, caudal }
 */
export function esquemaCircuito(o = {}) {
  const {
    expansion = 'capilar',
    filtro = true,
    visor = false,
    solenoide = false,
    resaltar = null,
    titulo = '',
    etiquetas = {},
  } = o;
  const X = 650; // eje vertical de la línea de líquido
  const piezas = [];
  if (solenoide) piezas.push({ k: 'solenoide', h: 40 });
  if (filtro) piezas.push({ k: 'filtro', h: 58 });
  if (visor) piezas.push({ k: 'visor', h: 26 });
  piezas.push({ k: expansion === 'capilar' ? 'capilar' : 'vet', h: expansion === 'capilar' ? 78 : 56 });

  let y = 108;
  const gap = 12;
  const pos = {};
  for (const p of piezas) {
    pos[p.k] = y;
    y += p.h + gap;
  }
  const finPila = y - gap; // salida del dispositivo de expansión
  const evapY = Math.max(372, finPila + 54);
  const alto = evapY + 118;
  const ancho = 860;
  const yTop = 84;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" font-family='${FUENTE}' role="img" aria-label="Esquema del circuito frigorífico">`;
  s += `<rect width="${ancho}" height="${alto}" fill="${COLORES.fondo}"/>`;
  if (titulo) s += texto(18, 24, titulo, { size: 13, peso: 700 });
  if (etiquetas.gas) s += texto(ancho - 18, 24, `Refrigerante ${etiquetas.gas}`, { size: 12, peso: 700, color: COLORES.suave, anchor: 'end' });

  // Tuberías
  s += tuberia([[110, 173], [110, yTop], [260, yTop]], COLORES.alta); // descarga
  s += tuberia([[480, yTop], [X, yTop], [X, finPila]], COLORES.liquido); // líquido hasta el dispositivo
  s += tuberia([[X, finPila], [X, evapY], [480, evapY]], COLORES.baja); // tras la expansión
  s += tuberia([[260, evapY], [110, evapY], [110, 257]], COLORES.baja); // aspiración

  // Sentido del flujo
  const flecha = (fx, fy, rot, col) => `<polygon points="-6,-6 8,0 -6,6" fill="${col}" transform="translate(${fx},${fy}) rotate(${rot})"/>`;
  s += flecha(190, yTop, 0, COLORES.alta) + flecha(560, yTop, 0, COLORES.liquido) + flecha(X, finPila + (evapY - finPila) / 2, 90, COLORES.baja) + flecha(190, evapY, 180, COLORES.baja);

  // Compresor
  s += `<circle cx="110" cy="215" r="42" fill="#e2e8f0" stroke="#475569" stroke-width="3"/>`;
  s += `<circle cx="110" cy="215" r="26" fill="#f8fafc" stroke="#475569" stroke-width="2"/>`;
  s += `<path d="M110 195 A20 20 0 0 1 130 215" fill="none" stroke="#475569" stroke-width="3"/>`;
  s += texto(160, 219, 'COMPRESOR', { size: 11, peso: 700, color: '#334155' });

  // Condensador
  s += `<rect x="260" y="${yTop - 34}" width="220" height="68" rx="8" fill="#fff1f2" stroke="${COLORES.alta}" stroke-width="2.5"/>`;
  s += serpentin(260, yTop - 34, 220, 68, 4, COLORES.alta);
  s += texto(370, yTop - 42, 'CONDENSADOR', { size: 11, peso: 700, color: COLORES.alta, anchor: 'middle' });
  s += ventilador(370, yTop + 66, 20);
  s += texto(370, yTop + 100, 'aire exterior', { size: 9.5, color: COLORES.suave, anchor: 'middle' });
  if (etiquetas.Pc || etiquetas.Tc) s += chip(500, yTop + 12, 'Condensación', `${etiquetas.Pc || '—'} · ${etiquetas.Tc || '—'}`, COLORES.alta, 138);

  // Evaporador
  s += `<rect x="260" y="${evapY - 34}" width="220" height="68" rx="8" fill="#eff6ff" stroke="${COLORES.baja}" stroke-width="2.5"/>`;
  s += serpentin(260, evapY - 34, 220, 68, 4, COLORES.baja);
  s += texto(370, evapY + 54, 'EVAPORADOR', { size: 11, peso: 700, color: COLORES.baja, anchor: 'middle' });
  s += ventilador(370, evapY - 62, 20);
  if (etiquetas.Pe || etiquetas.Te) s += chip(500, evapY + 10, 'Evaporación', `${etiquetas.Pe || '—'} · ${etiquetas.Te || '—'}`, COLORES.baja, 138);
  if (etiquetas.carga) s += texto(370, evapY + 70, etiquetas.carga, { size: 10.5, peso: 700, color: '#1d4ed8', anchor: 'middle' });

  // Piezas de la línea de líquido
  const lab = (px, py, l1, l2, col) => texto(px, py, l1, { size: 10.5, peso: 700, color: col }) + (l2 ? texto(px, py + 13, l2, { size: 9.5, color: COLORES.suave }) : '');
  const marco = (py, h, ancho2 = 130) =>
    `<rect x="${X - 28}" y="${py - 6}" width="${ancho2 + 40}" height="${h + 12}" rx="10" fill="none" stroke="${COLORES.resalte}" stroke-width="2.5" stroke-dasharray="7 4"/>`;

  if (pos.solenoide !== undefined) {
    const py = pos.solenoide;
    s += `<polygon points="${X - 18},${py} ${X + 18},${py} ${X},${py + 20}" fill="#fde68a" stroke="${COLORES.valvula}" stroke-width="2.5"/>`;
    s += `<polygon points="${X - 18},${py + 40} ${X + 18},${py + 40} ${X},${py + 20}" fill="#fde68a" stroke="${COLORES.valvula}" stroke-width="2.5"/>`;
    s += `<line x1="${X}" y1="${py + 20}" x2="${X + 22}" y2="${py + 20}" stroke="${COLORES.valvula}" stroke-width="2"/>`;
    s += `<rect x="${X + 22}" y="${py + 9}" width="26" height="22" rx="3" fill="#fef9c3" stroke="${COLORES.valvula}" stroke-width="2"/>`;
    s += lab(X + 60, py + 16, 'Electroválvula', 'de líquido', COLORES.valvula);
  }
  if (pos.filtro !== undefined) {
    const py = pos.filtro;
    if (resaltar === 'filtro') s += marco(py, 58, 150);
    s += `<rect x="${X - 20}" y="${py}" width="40" height="58" rx="9" fill="#fef3c7" stroke="${COLORES.filtro}" stroke-width="2.5"/>`;
    for (const dy of [16, 29, 42]) s += `<line x1="${X - 12}" y1="${py + dy}" x2="${X + 12}" y2="${py + dy}" stroke="${COLORES.filtro}" stroke-width="2"/>`;
    s += lab(X + 32, py + 22, 'Filtro deshidratador', etiquetas.filtro || '', COLORES.filtro);
  }
  if (pos.visor !== undefined) {
    const py = pos.visor;
    s += `<circle cx="${X}" cy="${py + 13}" r="12" fill="#fff" stroke="#475569" stroke-width="2.5"/><circle cx="${X}" cy="${py + 13}" r="4.5" fill="#94a3b8"/>`;
    s += lab(X + 32, py + 17, 'Visor de líquido', '', '#334155');
  }
  if (pos.capilar !== undefined) {
    const py = pos.capilar;
    if (resaltar === 'capilar') s += marco(py, 78, 170);
    const pts = [[X, py], [X - 20, py + 10], [X + 20, py + 24], [X - 20, py + 38], [X + 20, py + 52], [X - 20, py + 64], [X, py + 78]];
    s += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${COLORES.cobre}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    s += lab(X + 32, py + 30, 'Tubo capilar', etiquetas.capilar || '', COLORES.cobre);
  }
  if (pos.vet !== undefined) {
    const py = pos.vet;
    s += `<polygon points="${X - 20},${py} ${X + 20},${py} ${X},${py + 28}" fill="#fde68a" stroke="${COLORES.valvula}" stroke-width="2.5"/>`;
    s += `<polygon points="${X - 20},${py + 56} ${X + 20},${py + 56} ${X},${py + 28}" fill="#fde68a" stroke="${COLORES.valvula}" stroke-width="2.5"/>`;
    s += lab(X + 32, py + 22, 'Válvula de expansión', 'termostática', COLORES.valvula);
    // bulbo en la aspiración
    s += `<ellipse cx="190" cy="${evapY - 14}" rx="9" ry="6" fill="${COLORES.valvula}"/>`;
    s += `<path d="M199 ${evapY - 16} C 300 ${evapY - 120}, 560 ${py + 90}, ${X + 18} ${py + 40}" fill="none" stroke="${COLORES.valvula}" stroke-width="1.6" stroke-dasharray="4 3"/>`;
    s += texto(178, evapY - 26, 'bulbo', { size: 9.5, color: COLORES.valvula, anchor: 'end' });
  }

  // Puntos del ciclo
  const punto = (px, py, n) =>
    `<g><circle cx="${px}" cy="${py}" r="11" fill="#fff" stroke="#334155" stroke-width="1.8"/>${texto(px, py + 4, n, { size: 11, peso: 700, anchor: 'middle', color: '#334155' })}</g>`;
  s += punto(78, 300, '1') + punto(78, 128, '2') + punto(560, yTop - 22, '3') + punto(X - 36, evapY - 20, '4');
  s += texto(18, alto - 28, '1 aspiración · 2 descarga · 3 salida del condensador (líquido) · 4 entrada al evaporador', { size: 9.5, color: COLORES.suave });
  if (etiquetas.caudal) s += texto(18, alto - 12, etiquetas.caudal, { size: 10, peso: 700, color: COLORES.suave });
  s += '</svg>';
  return s;
}

/* ───────────────────────────── Capilar con cotas ───────────────────────────── */

/**
 * Tubo capilar con sus dimensiones. El tubo real es miles de veces más largo que
 * ancho, así que se dibuja «no a escala» con una interrupción en el centro; los
 * tramos de líquido y de mezcla sí guardan su proporción.
 *
 * @param {object} o  { L, Lliq, L2f, dInt, dExt, Pc, Pflash, Psalida, Tin, TSalida, xSalida, estrangulado, gas, G }
 */
export function esquemaCapilarCotas(o = {}) {
  const { L = 0, Lliq = 0, L2f = 0, dInt = 0, dExt = 0, Pc, Pflash, Psalida, Tin, TSalida, xSalida, estrangulado, gas = '', Pe } = o;
  const W = 860;
  const H = 396;
  const x0 = 70;
  const x1 = 790;
  const yC = 128;
  const od = 34; // alto del tubo en pantalla
  const idPx = Math.max(12, Math.min(22, (dInt / (dExt || 2)) * od));
  const total = Lliq + L2f || L || 1;
  const frac = Lliq / total;
  const xFlash = x0 + (x1 - x0) * frac;
  const pared = (dExt - dInt) / 2;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family='${FUENTE}' role="img" aria-label="Tubo capilar con sus cotas">`;
  s += `<defs>
    <linearGradient id="gLiq" x1="0" x2="1"><stop offset="0" stop-color="#fb923c"/><stop offset="1" stop-color="#f97316"/></linearGradient>
    <linearGradient id="gMez" x1="0" x2="1"><stop offset="0" stop-color="#fdba74"/><stop offset="0.5" stop-color="#bae6fd"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient>
    <linearGradient id="gCobre" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e8a672"/><stop offset="0.5" stop-color="#c2763a"/><stop offset="1" stop-color="#8a4a1e"/></linearGradient>
  </defs>`;
  s += `<rect width="${W}" height="${H}" fill="${COLORES.fondo}"/>`;
  s += texto(18, 24, `Tubo capilar${gas ? ' · ' + gas : ''} — dimensiones`, { size: 13, peso: 700 });

  // Pared de cobre
  s += `<rect x="${x0}" y="${yC - od / 2}" width="${x1 - x0}" height="${od}" rx="4" fill="url(#gCobre)" stroke="#6b3a15"/>`;
  // Interior: líquido y mezcla
  const yi = yC - idPx / 2;
  if (Lliq > 0) s += `<rect x="${x0}" y="${yi}" width="${xFlash - x0}" height="${idPx}" fill="url(#gLiq)"/>`;
  s += `<rect x="${xFlash}" y="${yi}" width="${x1 - xFlash}" height="${idPx}" fill="url(#gMez)"/>`;
  // Burbujas (más densas y grandes hacia la salida)
  const nb = 34;
  for (let i = 0; i < nb; i++) {
    const t = (i + 0.5) / nb;
    const bx = xFlash + (x1 - xFlash) * Math.pow(t, 0.8);
    const dens = 0.25 + 0.75 * t;
    const r = 1.2 + 2.4 * t;
    const by = yC + (((i * 37) % 7) - 3) * (idPx / 16);
    if (i % 2 === 0 || dens > 0.55) s += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${r.toFixed(1)}" fill="#fff" stroke="#0369a1" stroke-width="0.8" opacity="0.9"/>`;
  }
  // Interrupción (dibujo sin escala)
  const xb = (x0 + x1) / 2;
  s += `<polygon points="${xb - 8},${yC - od / 2 - 4} ${xb + 8},${yC - od / 2 - 4} ${xb + 2},${yC + od / 2 + 4} ${xb - 14},${yC + od / 2 + 4}" fill="${COLORES.fondo}" stroke="${COLORES.suave}" stroke-width="1"/>`;
  s += texto(xb - 3, yC + od / 2 + 17, 'interrupción: dibujo sin escala', { size: 9, color: COLORES.suave, anchor: 'middle' });

  // Extremos
  s += `<path d="M ${x0 - 42} ${yC} H ${x0}" stroke="${COLORES.liquido}" stroke-width="6" stroke-linecap="round"/>`;
  s += `<polygon points="${x0 - 14},${yC - 7} ${x0 - 2},${yC} ${x0 - 14},${yC + 7}" fill="${COLORES.liquido}"/>`;
  s += texto(x0 - 42, yC - 42, 'ENTRADA', { size: 10, peso: 700, color: COLORES.liquido });
  s += texto(x0 - 42, yC - 29, [Pc != null ? `${fmt(Pc, 2)} bar` : '', Tin != null ? `${fmt(Tin, 1)} °C` : ''].filter(Boolean).join(' · '), { size: 10, color: COLORES.suave });
  s += `<path d="M ${x1} ${yC} H ${x1 + 44}" stroke="${COLORES.baja}" stroke-width="6" stroke-linecap="round"/>`;
  s += texto(x1 + 8, yC - 42, 'SALIDA', { size: 10, peso: 700, color: COLORES.baja });
  s += texto(x1 + 8, yC - 29, Psalida != null ? `${fmt(Psalida, 2)} bar` : '', { size: 10, color: COLORES.suave });

  // Punto de vaporización
  if (Lliq > 0.005) {
    s += `<line x1="${xFlash}" y1="${yC - od / 2 - 24}" x2="${xFlash}" y2="${yC + od / 2 + 8}" stroke="${COLORES.resalte}" stroke-width="1.6" stroke-dasharray="5 3"/>`;
    s += texto(xFlash, yC - od / 2 - 46, 'inicio de vaporización', { size: 10, peso: 700, color: COLORES.resalte, anchor: 'middle' });
    s += texto(xFlash, yC - od / 2 - 33, Pflash != null ? `${fmt(Pflash, 2)} bar` : '', { size: 9.5, color: COLORES.suave, anchor: 'middle' });
  } else {
    s += texto(x0 + 8, yC - od / 2 - 12, 'se vaporiza desde la entrada', { size: 10, peso: 700, color: COLORES.resalte });
  }

  // Cotas de longitud
  const cota = (xa, xb2, yy, etiqueta, color) =>
    `<g stroke="${color}" stroke-width="1.4" fill="none"><line x1="${xa}" y1="${yy}" x2="${xb2}" y2="${yy}"/><line x1="${xa}" y1="${yy - 7}" x2="${xa}" y2="${yy + 7}"/><line x1="${xb2}" y1="${yy - 7}" x2="${xb2}" y2="${yy + 7}"/></g>` +
    texto((xa + xb2) / 2, yy + 20, etiqueta, { size: 12, peso: 700, color, anchor: 'middle' });
  const yL = yC + od / 2 + 34;
  const yT = yC + od / 2 + 82;
  s += cota(x0, x1, yT, `L = ${fmt(L, 2)} m (longitud total)`, COLORES.texto);
  if (Lliq > 0.005) s += cota(x0, xFlash, yL, `líquido ${fmt(Lliq, 2)} m`, COLORES.liquido);
  s += cota(Lliq > 0.005 ? xFlash : x0, x1, yL, `mezcla líquido-vapor ${fmt(L2f, 2)} m`, COLORES.baja);

  // Sección ampliada del tubo
  const cx = 690;
  const cy = 322;
  const R = 36;
  const r = Math.max(10, R * (dInt / (dExt || 2)));
  s += texto(cx, cy - R - 12, 'Sección del tubo', { size: 10, color: COLORES.suave, anchor: 'middle' });
  s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#gCobre)" stroke="#6b3a15" stroke-width="1.5"/><circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="#fb923c" stroke="#6b3a15" stroke-width="1.2"/>`;
  s += `<line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="#fff" stroke-width="1.6"/><circle cx="${cx - r}" cy="${cy}" r="2" fill="#fff"/><circle cx="${cx + r}" cy="${cy}" r="2" fill="#fff"/>`;
  s += `<line x1="${cx - R}" y1="${cy + R + 10}" x2="${cx + R}" y2="${cy + R + 10}" stroke="${COLORES.texto}" stroke-width="1.2"/><line x1="${cx - R}" y1="${cy + R + 5}" x2="${cx - R}" y2="${cy + R + 15}" stroke="${COLORES.texto}"/><line x1="${cx + R}" y1="${cy + R + 5}" x2="${cx + R}" y2="${cy + R + 15}" stroke="${COLORES.texto}"/>`;
  s += texto(cx, cy + R + 29, `Ø ext = ${fmt(dExt, 2)} mm`, { size: 11, peso: 700, anchor: 'middle' });
  s += texto(cx - R - 12, cy + 4, `Ø int = ${fmt(dInt, 2)} mm`, { size: 11, peso: 700, anchor: 'end', color: '#9a3412' });

  // Notas
  s += texto(18, 296, `Espesor de pared  e = ${fmt(pared, 2)} mm`, { size: 11, peso: 700 });
  if (TSalida != null && xSalida != null)
    s += texto(18, 316, `A la salida: ${fmt(TSalida, 1)} °C · ${fmt(xSalida * 100, 0)} % de vapor en masa${Pe != null ? ` · presión del evaporador ${fmt(Pe, 2)} bar` : ''}`, { size: 10.5, color: COLORES.suave });
  if (estrangulado) s += texto(18, 336, 'Flujo estrangulado (crítico) en la salida:', { size: 10.5, color: COLORES.resalte }) + texto(18, 350, 'el caudal no depende de la presión del evaporador.', { size: 10.5, color: COLORES.resalte });
  s += texto(18, H - 12, 'Dibujo esquemático; el espesor de pared es orientativo y debe confirmarse con el catálogo del proveedor.', { size: 9, color: COLORES.suave });
  s += '</svg>';
  return s;
}

/* ───────────────────────────── Gráfico de perfil ───────────────────────────── */

/** Presión (barras) y temperatura (°C) a lo largo del capilar. perfil = { z[], P[], T[] }. */
export function graficoPerfilSVG(perfil, { titulo = 'Perfil de presión y temperatura a lo largo del capilar', Pe } = {}) {
  if (!perfil || !perfil.z || perfil.z.length < 2) return '';
  const W = 760;
  const H = 300;
  const m = { l: 56, r: 56, t: 34, b: 44 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const zmax = perfil.z[perfil.z.length - 1] || 1;
  const Pmax = Math.max(...perfil.P) * 1.05;
  const Pmin = 0;
  const Tmin = Math.min(...perfil.T);
  const Tmax = Math.max(...perfil.T);
  const Tpad = (Tmax - Tmin) * 0.08 || 1;
  const X = (z) => m.l + (z / zmax) * pw;
  const YP = (p) => m.t + ph - ((p - Pmin) / (Pmax - Pmin)) * ph;
  const YT = (t) => m.t + ph - ((t - (Tmin - Tpad)) / (Tmax - Tmin + 2 * Tpad)) * ph;
  const linea = (xs, ys, col) => `<polyline points="${xs.map((x, i) => `${X(x).toFixed(1)},${ys[i].toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round"/>`;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family='${FUENTE}' role="img" aria-label="Perfil del capilar">`;
  s += `<rect width="${W}" height="${H}" fill="#fff"/>`;
  s += texto(m.l, 20, titulo, { size: 12, peso: 700 });
  for (let i = 0; i <= 4; i++) {
    const yy = m.t + (ph * i) / 4;
    s += `<line x1="${m.l}" y1="${yy}" x2="${W - m.r}" y2="${yy}" stroke="#e2e8f0"/>`;
    s += texto(m.l - 6, yy + 3, fmt(Pmax - ((Pmax - Pmin) * i) / 4, 1), { size: 9.5, color: COLORES.liquido, anchor: 'end' });
    s += texto(W - m.r + 6, yy + 3, fmt(Tmax + Tpad - ((Tmax - Tmin + 2 * Tpad) * i) / 4, 0), { size: 9.5, color: COLORES.baja });
  }
  for (let i = 0; i <= 5; i++) {
    const zz = (zmax * i) / 5;
    s += texto(X(zz), H - m.b + 16, fmt(zz, 2), { size: 9.5, color: COLORES.suave, anchor: 'middle' });
  }
  s += texto(m.l + pw / 2, H - 8, 'distancia desde la entrada (m)', { size: 10, color: COLORES.suave, anchor: 'middle' });
  s += texto(14, m.t + ph / 2, 'P (bar abs)', { size: 10, color: COLORES.liquido, anchor: 'middle', extra: `transform="rotate(-90 14 ${m.t + ph / 2})"` });
  s += texto(W - 12, m.t + ph / 2, 'T (°C)', { size: 10, color: COLORES.baja, anchor: 'middle', extra: `transform="rotate(90 ${W - 12} ${m.t + ph / 2})"` });
  if (Pe != null) s += `<line x1="${m.l}" y1="${YP(Pe)}" x2="${W - m.r}" y2="${YP(Pe)}" stroke="${COLORES.baja}" stroke-dasharray="5 4" opacity="0.6"/>` + texto(W - m.r - 4, YP(Pe) - 4, `Pe = ${fmt(Pe, 2)} bar`, { size: 9, color: COLORES.baja, anchor: 'end' });
  s += linea(perfil.z, perfil.P.map(YP), COLORES.liquido);
  s += linea(perfil.z, perfil.T.map(YT), COLORES.baja);
  s += `<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none" stroke="${COLORES.borde}"/>`;
  s += '</svg>';
  return s;
}
