/**
 * Tubo de cobre para refrigeración: diámetro exterior y diámetro INTERIOR típico.
 *
 * El interior sale del exterior menos dos veces la pared habitual del tubo (pulgadas: tubo ACR; milímetros: pared
 * de 1 mm hasta Ø22 y de 1,5 mm en Ø28 y Ø35). Es un dato típico: la pared real cambia según el fabricante, así
 * que en los cálculos se puede escribir el Ø interior medido.
 */
const MM_POR_PULGADA = 25.4;

// [etiqueta, Ø exterior en pulgadas, pared en milésimas de pulgada]
const PULGADAS = [
  ['1/4"', 0.25, 30],
  ['3/8"', 0.375, 32],
  ['1/2"', 0.5, 32],
  ['5/8"', 0.625, 35],
  ['3/4"', 0.75, 35],
  ['7/8"', 0.875, 45],
  ['1.1/8"', 1.125, 50],
  ['1.3/8"', 1.375, 55],
];
// [Ø exterior mm, pared mm]
const MILIMETROS = [[6, 1], [10, 1], [12, 1], [16, 1], [18, 1], [22, 1], [28, 1.5], [35, 1.5]];

const r2 = (n) => Math.round(n * 100) / 100;

export const TUBOS_COBRE = [
  ...PULGADAS.map(([od, pulg, pared]) => ({
    od,
    odMm: r2(pulg * MM_POR_PULGADA),
    id: r2(pulg * MM_POR_PULGADA - 2 * (pared / 1000) * MM_POR_PULGADA),
  })),
  ...MILIMETROS.map(([odMm, pared]) => ({ od: `${odMm} mm`, odMm, id: r2(odMm - 2 * pared) })),
];

/** Sección interior (m²) de un tubo de diámetro interior `idMm`. */
export const seccionInterior = (idMm) => (Math.PI * (idMm / 1000) ** 2) / 4;
