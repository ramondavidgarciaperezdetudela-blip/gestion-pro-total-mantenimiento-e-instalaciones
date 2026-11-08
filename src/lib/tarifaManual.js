// Artículos de tarifa escritos a mano y precios escritos como texto.
// Todo es puro (sin pantalla) para poder probarlo con `npm run test:tarifa`.

// "12,5" · "12.5" · "1.250,75" · "1,250.75" · "12 €" → número. Vacío o ilegible → null.
export function parsePrecio(texto) {
  if (texto === null || texto === undefined) return null;
  if (typeof texto === 'number') return Number.isFinite(texto) ? texto : null;
  let t = String(texto).replace(/[€\s]/g, '').replace(/%/g, '');
  if (t === '' || t === '-' || t === ',' || t === '.') return null;
  const coma = t.lastIndexOf(',');
  const punto = t.lastIndexOf('.');
  if (coma >= 0 && punto >= 0) {
    // El último separador es el decimal; el otro es de miles.
    if (coma > punto) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (coma >= 0) {
    t = t.replace(/,/g, '.');
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// Texto para mostrar un número en un cuadro de edición (sin ceros de más).
export function precioATexto(valor) {
  const n = parsePrecio(valor);
  return n === null ? '' : String(n);
}

const redondear = (n) => Math.round(n * 100) / 100;

// Completa lo que falte entre coste, margen y venta con lo que haya escrito.
// Margen = (venta − coste) / coste · 100, igual que en el resto de tarifas.
export function completarPrecios({ cost, sale, margin }) {
  let c = parsePrecio(cost);
  let s = parsePrecio(sale);
  let m = parsePrecio(margin);
  if (c !== null && s === null && m !== null) s = redondear(c * (1 + m / 100));
  else if (c !== null && s !== null && m === null && c > 0) m = redondear(((s - c) / c) * 100);
  else if (c === null && s !== null && m !== null && m > -100) c = redondear(s / (1 + m / 100));
  return { cost: c, sale: s, margin: m };
}

// Registro listo para SupplierPrice.create a partir de lo escrito en el formulario.
// Devuelve { error } si falta lo imprescindible.
export function construirArticulo(proveedor, f) {
  const nombre = String(f?.product_name || '').trim();
  if (!proveedor?.id) return { error: 'Elige la tarifa (proveedor) donde va el artículo.' };
  if (!nombre) return { error: 'Escribe el nombre del artículo.' };
  const { cost, sale, margin } = completarPrecios({ cost: f.cost_price, sale: f.sale_price, margin: f.margin });
  if (cost === null && sale === null) return { error: 'Pon al menos un precio (coste o venta).' };
  const registro = {
    supplier_id: proveedor.id,
    supplier_name: proveedor.name,
    product_name: nombre,
    // cost_price es obligatorio en la entidad: si solo hay venta se usa como coste.
    cost_price: cost !== null ? cost : sale,
    is_active: true
  };
  if (sale !== null) registro.sale_price = sale;
  if (margin !== null) registro.margin = margin;
  for (const k of ['product_code', 'brand', 'category', 'unit', 'notes', 'validity_date']) {
    const v = String(f?.[k] ?? '').trim();
    if (v) registro[k] = v;
  }
  const cant = parsePrecio(f?.quantity);
  if (cant !== null) registro.quantity = cant;
  return { registro };
}
