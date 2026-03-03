/**
 * Calcula el siguiente número disponible para un tipo de documento.
 * Rellena huecos: si existen 001, 002, 004 → devuelve "003".
 * Si no hay huecos, devuelve el siguiente al máximo.
 *
 * @param {string[]} existingNumbers - Array de strings con los números existentes, ej: ["001","005","002"]
 * @param {number}   digits          - Número de dígitos del formato (defecto 3 → "001")
 * @returns {string}
 */
export function getNextAvailableNumber(existingNumbers, digits = 3) {
  const nums = existingNumbers
    .map(n => parseInt(n, 10))
    .filter(n => !isNaN(n) && n > 0)
    .sort((a, b) => a - b);

  // Buscar primer hueco
  for (let i = 0; i < nums.length; i++) {
    const expected = i + 1;
    if (nums[i] !== expected) {
      return String(expected).padStart(digits, '0');
    }
  }
  // Sin huecos: siguiente al máximo
  const next = (nums[nums.length - 1] || 0) + 1;
  return String(next).padStart(digits, '0');
}