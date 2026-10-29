/**
 * Unidades de potencia frigorífica y su conversión a vatios.
 *
 * En el taller se habla de potencia en kW, pero los catálogos de compresores vienen en
 * W, kcal/h («frigorías»), BTU/h o toneladas de refrigeración según el fabricante y el año.
 * Todos los cálculos del programa trabajan en vatios; esta tabla es la única que convierte.
 *
 *   1 kcal(IT)/h = 4,1868 kJ / 3600 s            = 1,163 W
 *   1 BTU(IT)/h  = 1,055056 kJ / 3600 s          = 0,29307107 W
 *   1 TR         = 12 000 BTU/h (tonelada de refrigeración) = 3516,853 W
 *
 * Autor: David García (Gestión Pro Total).
 */

export const UNIDADES_POTENCIA = [
  { id: 'W', etiqueta: 'W', aW: 1 },
  { id: 'kW', etiqueta: 'kW', aW: 1000 },
  { id: 'kcal/h', etiqueta: 'kcal/h (frigorías/h)', aW: 1.163 },
  { id: 'BTU/h', etiqueta: 'BTU/h', aW: 0.29307107 },
  { id: 'TR', etiqueta: 'TR (tonelada de refrigeración)', aW: 3516.8528 },
];

const factor = (id) => UNIDADES_POTENCIA.find((u) => u.id === id)?.aW ?? 1;

/** Potencia en la unidad dada → vatios. */
export const aWatios = (valor, unidad = 'W') => (Number.isFinite(valor) ? valor * factor(unidad) : NaN);

/** Vatios → potencia en la unidad dada. */
export const deWatios = (watios, unidad = 'W') => (Number.isFinite(watios) ? watios / factor(unidad) : NaN);

/** Texto legible de una potencia en vatios, eligiendo W o kW. */
export function textoPotencia(watios, decimales = 0) {
  if (!Number.isFinite(watios)) return '—';
  const fmt = (n, d) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  return Math.abs(watios) >= 10000 ? `${fmt(watios / 1000, 2)} kW` : `${fmt(watios, decimales)} W`;
}
