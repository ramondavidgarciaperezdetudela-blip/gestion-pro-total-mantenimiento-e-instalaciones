// IVA por línea: cada línea de un presupuesto, factura o recibo puede llevar
//  - 'aparte'   → el precio es SIN IVA y el IVA se suma encima (lo de siempre)
//  - 'incluido' → el precio que se escribe YA lleva el IVA dentro
//  - 'exento'   → la línea no paga IVA (0 %)
// Sin modo guardado se entiende 'aparte', así que los documentos antiguos no cambian.

export const MODOS_IVA = {
  aparte: 'IVA aparte (+IVA)',
  incluido: 'IVA incluido',
  exento: 'Exenta de IVA',
};

export const modoDeLinea = (it) => (it && MODOS_IVA[it.iva_modo] ? it.iva_modo : 'aparte');

const redondea = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Importe de la línea tal como se escribe (cantidad × precio con descuento). */
export function importeLinea(it) {
  return (Number(it?.quantity) || 0) * (Number(it?.unit_price) || 0) * (1 - (Number(it?.discount) || 0) / 100);
}

/** Base imponible e IVA de una línea. */
export function desgloseLinea(it, ivaRate) {
  const t = importeLinea(it);
  const r = (Number(ivaRate) || 0) / 100;
  const modo = modoDeLinea(it);
  if (modo === 'exento') return { base: t, iva: 0 };
  if (modo === 'incluido') { const base = t / (1 + r); return { base, iva: t - base }; }
  return { base: t, iva: t * r };
}

/** Totales de todo el documento. subtotal = base imponible. */
export function totalesDocumento(items, ivaRate) {
  let base = 0; let iva = 0;
  for (const it of items || []) { const d = desgloseLinea(it, ivaRate); base += d.base; iva += d.iva; }
  return { subtotal: base, iva_amount: iva, total: base + iva };
}

/** Texto corto para mostrar junto a la línea (vacío si es IVA aparte). */
export const etiquetaIva = (it) => {
  const m = modoDeLinea(it);
  return m === 'incluido' ? 'IVA incl.' : m === 'exento' ? 'Exenta' : '';
};

export { redondea };
