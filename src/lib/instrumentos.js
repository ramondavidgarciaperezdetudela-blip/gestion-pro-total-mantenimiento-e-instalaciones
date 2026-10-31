/**
 * instrumentos.js — Lógica (sin React) de los instrumentos del panel de control.
 *
 * Clasifica una lectura en 'ok' | 'aviso' | 'critico' | 'neutro' según dos
 * rangos anidados: el rango BUENO (ok) y el rango TOLERABLE (aviso). Fuera del
 * tolerable es crítico. Sin lectura es 'neutro'.
 */
export const TONOS = {
  frio: '#06b6d4',   // baja presión · evaporación · frío
  calor: '#ef4444',  // alta presión · descarga · calor
  ok: '#10b981',     // estable / óptimo
  aviso: '#f59e0b',  // fuera de tolerancia
};

export const aNumero = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** @param zonas { ok:[min,max], aviso:[min,max] } — null en un extremo = sin límite */
export function evaluar(valor, zonas) {
  const v = aNumero(valor);
  if (v === null || !zonas) return 'neutro';
  const dentro = (r) => r && (r[0] === null || r[0] === undefined || v >= r[0]) && (r[1] === null || r[1] === undefined || v <= r[1]);
  if (dentro(zonas.ok)) return 'ok';
  if (dentro(zonas.aviso)) return 'aviso';
  return 'critico';
}

const ORDEN = { neutro: 0, ok: 1, aviso: 2, critico: 3 };
export function peorEstado(estados) {
  return estados.reduce((p, e) => (ORDEN[e] > ORDEN[p] ? e : p), 'neutro');
}

/** Zonas del ciclo frigorífico (K). Fuera de aquí hay riesgo para el compresor. */
export const ZONAS_RECALENTAMIENTO = { ok: [4, 9], aviso: [2, 15], escala: [0, 25] };
export const ZONAS_SUBENFRIAMIENTO = { ok: [3, 11], aviso: [1, 15], escala: [0, 20] };
export const ZONAS_FILTRO = { ok: [null, 2], aviso: [null, 3], escala: [0, 8] }; // salto de T en el filtro (K)

/** Zonas de una presión a partir del rango de referencia [min,max] y su tolerancia. */
export function zonasPresion(min, max, margen) {
  const m = margen ?? Math.max(0.1 * Math.abs(max), 0.3);
  const ancho = Math.max(max - min, 1);
  return { ok: [min, max], aviso: [min - m, max + m], escala: [Math.min(0, min - ancho), max + ancho] };
}

/** Peligro de golpe de líquido: recalentamiento casi nulo. */
export const golpeDeLiquido = (recal) => { const v = aNumero(recal); return v !== null && v < 2; };

/** Posición (0–100 %) de un valor dentro de una escala, acotada. */
export function porcentaje(valor, [min, max]) {
  const v = aNumero(valor);
  if (v === null || max <= min) return null;
  return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
}

/** Segmentos de color de una barra: [{desde,hasta,estado}] en % de la escala. */
export function segmentos(zonas) {
  const [e0, e1] = zonas.escala;
  const pc = (x) => Math.max(0, Math.min(100, ((x - e0) / (e1 - e0)) * 100));
  const lo = (r) => (r[0] === null || r[0] === undefined ? e0 : r[0]);
  const hi = (r) => (r[1] === null || r[1] === undefined ? e1 : r[1]);
  const puntos = [
    [0, 'critico'], [pc(lo(zonas.aviso)), 'aviso'], [pc(lo(zonas.ok)), 'ok'], [pc(hi(zonas.ok)), 'aviso'], [pc(hi(zonas.aviso)), 'critico'], [100, null],
  ];
  const out = [];
  for (let i = 0; i < puntos.length - 1; i++) {
    const [d, est] = puntos[i], h = puntos[i + 1][0];
    if (h > d + 0.01) out.push({ desde: d, hasta: h, estado: est });
  }
  return out;
}
