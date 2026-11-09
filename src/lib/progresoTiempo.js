// Tiempo transcurrido y restante de procesos largos (subir PDF, cambiar márgenes…).
export function formatearTiempo(seg) {
  if (seg === null || seg === undefined || !Number.isFinite(seg)) return '—';
  const s = Math.max(0, Math.round(seg));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const r = s % 60;
  const dos = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${dos(m)}:${dos(r)}` : `${dos(m)}:${dos(r)}`;
}

/** Tiempo restante a partir del avance (0‒1) y los segundos que lleva. Con poco avance no se inventa nada. */
export function estimarRestante(avance, transcurridoSeg) {
  if (!(avance > 0.02) || !(transcurridoSeg >= 2) || avance >= 1) return avance >= 1 ? 0 : null;
  return (transcurridoSeg / avance) * (1 - avance);
}
