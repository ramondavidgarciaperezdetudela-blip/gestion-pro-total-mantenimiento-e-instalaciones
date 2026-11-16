// Números tal como vienen en las tarifas: «9,5», «1.949,69», «1,949.69», «12,50 €», «€ 3.5».
export function numeroTarifa(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  let t = String(val).replace(/[€\s]|eur(os)?/gi, '');
  if (!/\d/.test(t)) return null;
  const punto = t.lastIndexOf('.'); const coma = t.lastIndexOf(',');
  if (punto >= 0 && coma >= 0) {
    // el último separador es el decimal; el otro, de miles
    t = punto > coma ? t.replace(/,/g, '') : t.replace(/\./g, '').replace(',', '.');
  } else if (coma >= 0) {
    t = (t.match(/,/g) || []).length > 1 ? t.replace(/,/g, '') : t.replace(',', '.');
  } else if (punto >= 0 && (t.match(/\./g) || []).length > 1) {
    t = t.replace(/\./g, '');
  }
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}
