/**
 * firmaTrazos.js — geometría de una firma hecha con trazos.
 * Un trazo es una lista de puntos {x,y} en píxeles CSS del lienzo en pantalla.
 * La firma final se recorta a su caja y se encaja en la imagen de salida
 * (proporción fija) para que se vea igual de grande firmes en grande o en pequeño.
 */
export const SALIDA = { ancho: 600, alto: 195, margen: 14, grosor: 3.4 };

/** Caja que envuelve todos los puntos, o null si no hay ninguno. */
export function cajaDeTrazos(trazos = []) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, n = 0;
  for (const t of trazos) for (const p of t) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    n++; minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return n ? { minX, minY, maxX, maxY, ancho: maxX - minX, alto: maxY - minY, puntos: n } : null;
}

/**
 * Escala y desplazamiento para encajar la caja en la salida, centrada y sin deformar.
 * Una firma casi vacía (un punto) no se amplía sin límite: la escala máxima es 3.
 */
export function ajusteSalida(caja, { ancho, alto, margen } = SALIDA) {
  if (!caja) return null;
  const libreX = ancho - 2 * margen, libreY = alto - 2 * margen;
  const w = Math.max(caja.ancho, 1), h = Math.max(caja.alto, 1);
  const escala = Math.min(libreX / w, libreY / h, 3);
  return { escala, dx: (ancho - w * escala) / 2 - caja.minX * escala, dy: (alto - h * escala) / 2 - caja.minY * escala };
}

/** ¿Hay firma de verdad? Evita aceptar un toque suelto o una rayita. */
export function firmaValida(trazos = [], minimoPuntos = 6, minimoLado = 12) {
  const c = cajaDeTrazos(trazos);
  return !!c && c.puntos >= minimoPuntos && Math.max(c.ancho, c.alto) >= minimoLado;
}
