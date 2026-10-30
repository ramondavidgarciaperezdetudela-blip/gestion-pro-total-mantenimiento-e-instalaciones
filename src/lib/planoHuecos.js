/**
 * planoHuecos.js — Puertas y ventanas como HUECOS de una pared.
 *
 * Antes una puerta era un icono suelto que se soltaba donde cayera: no se
 * pegaba a la pared, su ancho no seguía al «Ancho (cm)» de la ficha y en el
 * visor 3D no abría hueco, así que por dentro de la cámara no se veía. Aquí se
 * trata como lo que es: un hueco con posición sobre una pared, ancho, alto y
 * antepecho (la altura del suelo a la que empieza, en las ventanas).
 *
 * Sin React ni dibujo: solo geometría, para poder comprobarla aparte.
 * Los puntos y las paredes van en PÍXELES del plano; las medidas, en METROS.
 */

export const TIPOS_HUECO = {
  puerta:        { alto: 2.05, antepecho: 0,   ancho: 0.9 },
  camara_puerta: { alto: 2.0,  antepecho: 0,   ancho: 1.0 },
  ventana:       { alto: 1.2,  antepecho: 0.9, ancho: 1.2 },
};

export const esHueco = (el) => !!el && !!TIPOS_HUECO[el.type];

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Ancho del hueco en metros: el «Ancho (cm)» de la ficha manda sobre el del icono. */
export function anchoHueco(el) {
  const cm = num(el?.datos?.ancho_cm);
  if (cm !== null && cm > 0) return cm / 100;
  const w = num(el?.w_m);
  if (w !== null && w > 0) return w;
  return TIPOS_HUECO[el?.type]?.ancho || 0.9;
}

export function altoHueco(el) {
  const a = num(el?.alto_m);
  return a !== null && a > 0 ? a : (TIPOS_HUECO[el?.type]?.alto || 2.0);
}

/** Altura del suelo a la que empieza el hueco (0 en puertas). */
export function antepechoHueco(el) {
  const z = num(el?.z_m);
  if (el?.type === 'ventana') return z !== null && z >= 0 ? z : TIPOS_HUECO.ventana.antepecho;
  return 0;
}

/** Espesor real de la pared (m): el del panel en cámaras, 10 cm en salas. */
export function espesorPared(w) {
  if (w?.camara) return Math.max(0.06, (num(w.espesor_mm) || 100) / 1000);
  return 0.1;
}

export function largoPared(w) { return Math.hypot(w.x2 - w.x1, w.y2 - w.y1); }

/** Pared más cercana a un punto: { pared, s (px desde x1,y1), dist, ux, uy }. */
export function paredCercana(x, y, walls = [], maxPx = Infinity) {
  let mejor = null;
  for (const w of walls) {
    const len = largoPared(w);
    if (len < 1) continue;
    const ux = (w.x2 - w.x1) / len, uy = (w.y2 - w.y1) / len;
    const s = Math.max(0, Math.min(len, (x - w.x1) * ux + (y - w.y1) * uy));
    const d = Math.hypot(x - (w.x1 + ux * s), y - (w.y1 + uy * s));
    if (d <= maxPx && (!mejor || d < mejor.dist)) mejor = { pared: w, s, dist: d, ux, uy, len };
  }
  return mejor;
}

/** Ángulo (grados) de la pared, siempre «de pie» (entre -90 y 90] para que el símbolo no salga boca abajo. */
export function anguloPared(ux, uy) {
  let a = (Math.atan2(uy, ux) * 180) / Math.PI;
  if (a > 90) a -= 180;
  if (a <= -90) a += 180;
  return Math.round(a * 100) / 100;
}

/** Hacia dónde cae el interior de la sala/cámara respecto al lado «de arriba» del símbolo (1: arriba, -1: abajo, 0: no hay sala). */
export function ladoInterior(pared, rot, scale = 50) {
  if (!pared?.room_id || !pared.room_w_m || !pared.room_h_m) return 0;
  const cx = pared.room_x + (pared.room_w_m * scale) / 2;
  const cy = pared.room_y + (pared.room_h_m * scale) / 2;
  const mx = (pared.x1 + pared.x2) / 2, my = (pared.y1 + pared.y2) / 2;
  const r = (rot * Math.PI) / 180;
  const nx = Math.sin(r), ny = -Math.cos(r); // el «arriba» del símbolo, girado
  return ((cx - mx) * nx + (cy - my) * ny) >= 0 ? 1 : -1;
}

/**
 * Pega un hueco a la pared más cercana. Devuelve los campos que hay que
 * cambiar en el elemento, o null si no hay ninguna pared a menos de `maxPx`.
 *  - Lo centra sobre el muro, sin salirse por los extremos.
 *  - Lo gira como la pared y le da su espesor.
 *  - Si no cabe en la pared, lo estrecha hasta que cabe.
 *  - Con `orientar` (al colocarlo) hace que la hoja abra hacia el interior.
 */
export function encajarEnPared(el, walls, scale = 50, { maxPx = 36, orientar = false, x, y } = {}) {
  const px = x ?? el.x, py = y ?? el.y;
  const c = paredCercana(px, py, walls, maxPx);
  if (!c) return null;
  let ancho = anchoHueco(el);
  const largoM = c.len / scale;
  if (ancho > largoM - 0.02) ancho = Math.max(0.2, largoM - 0.02);
  const mitad = (ancho * scale) / 2;
  const s = Math.max(mitad, Math.min(c.len - mitad, c.s));
  const rot = anguloPared(c.ux, c.uy);
  const patch = {
    x: Math.round((c.pared.x1 + c.ux * s) * 100) / 100,
    y: Math.round((c.pared.y1 + c.uy * s) * 100) / 100,
    rot,
    w_m: Math.round(ancho * 1000) / 1000,
    h_m: espesorPared(c.pared),
    pared_id: c.pared.id,
    datos: { ...(el.datos || {}), ancho_cm: Math.round(ancho * 100) },
  };
  if (orientar) {
    const lado = ladoInterior(c.pared, rot, scale);
    if (lado) patch.flip_y = lado < 0;
  }
  return patch;
}

/** Posición del centro del hueco sobre su pared, en metros desde el extremo (x1,y1). */
export function posicionEnPared(el, pared, scale = 50) {
  const len = largoPared(pared);
  if (len < 1) return 0;
  const ux = (pared.x2 - pared.x1) / len, uy = (pared.y2 - pared.y1) / len;
  return ((el.x - pared.x1) * ux + (el.y - pared.y1) * uy) / scale;
}

/** Pared a la que pertenece un hueco (la guardada o, si no, la más cercana). */
export function paredDeHueco(el, walls, scale = 50) {
  const guardada = walls.find((w) => w.id === el.pared_id);
  if (guardada) return guardada;
  const c = paredCercana(el.x, el.y, walls, Math.max(14, 0.25 * scale));
  return c ? c.pared : null;
}

/**
 * Mueve el centro del hueco a `metros` desde el extremo de su pared, sin
 * salirse de ella. Devuelve el cambio para el elemento.
 */
export function colocarEnPared(el, pared, metros, scale = 50) {
  const len = largoPared(pared);
  const ux = (pared.x2 - pared.x1) / len, uy = (pared.y2 - pared.y1) / len;
  const mitad = (anchoHueco(el) * scale) / 2;
  const s = Math.max(mitad, Math.min(len - mitad, metros * scale));
  return { x: Math.round((pared.x1 + ux * s) * 100) / 100, y: Math.round((pared.y1 + uy * s) * 100) / 100 };
}

/** Pone el hueco a todo lo ancho de su pared (con un margen) y lo centra. */
export function anchoDePared(el, pared, scale = 50, margenM = 0.05) {
  const largo = largoPared(pared) / scale;
  const ancho = Math.max(0.2, Math.round((largo - margenM * 2) * 100) / 100);
  const len = largoPared(pared);
  const ux = (pared.x2 - pared.x1) / len, uy = (pared.y2 - pared.y1) / len;
  return {
    x: Math.round((pared.x1 + ux * len / 2) * 100) / 100,
    y: Math.round((pared.y1 + uy * len / 2) * 100) / 100,
    w_m: ancho,
    datos: { ...(el.datos || {}), ancho_cm: Math.round(ancho * 100) },
  };
}

/** Los huecos de una pared, ordenados y sin solaparse: [{ t0, t1, z0, z1, el }] en metros desde (x1,y1). */
export function huecosDePared(pared, elements = [], scale = 50, walls = null) {
  const len = largoPared(pared);
  if (len < 1) return [];
  const ux = (pared.x2 - pared.x1) / len, uy = (pared.y2 - pared.y1) / len;
  const out = [];
  for (const el of elements) {
    if (!esHueco(el)) continue;
    if (el.pared_id && el.pared_id !== pared.id && walls?.some((w) => w.id === el.pared_id)) continue;
    const s = (el.x - pared.x1) * ux + (el.y - pared.y1) * uy;
    const d = Math.abs(-(el.x - pared.x1) * uy + (el.y - pared.y1) * ux);
    const ok = el.pared_id === pared.id || d <= Math.max(12, (espesorPared(pared) * scale) / 2 + 8);
    if (!ok || s < -2 || s > len + 2) continue;
    const mitad = anchoHueco(el) / 2;
    const t0 = Math.max(0, s / scale - mitad), t1 = Math.min(len / scale, s / scale + mitad);
    if (t1 - t0 < 0.05) continue;
    out.push({ t0, t1, z0: antepechoHueco(el), z1: antepechoHueco(el) + altoHueco(el), el });
  }
  out.sort((a, b) => a.t0 - b.t0);
  // Si dos se pisan, se recorta el segundo.
  for (let i = 1; i < out.length; i++) if (out[i].t0 < out[i - 1].t1) out[i].t0 = out[i - 1].t1;
  return out.filter((h) => h.t1 - h.t0 >= 0.05);
}

/** ¿Está este hueco asentado en alguna pared? (si no, se dibuja como un equipo suelto). */
export function estaEnPared(el, walls, scale = 50) {
  return !!paredDeHueco(el, walls, scale);
}

/** La pared con sus extremos en orden de lectura (izquierda→derecha, o arriba→abajo si es vertical). */
export function paredOrdenada(w) {
  if (w.x1 > w.x2 || (w.x1 === w.x2 && w.y1 > w.y2)) return { ...w, x1: w.x2, y1: w.y2, x2: w.x1, y2: w.y1 };
  return w;
}
