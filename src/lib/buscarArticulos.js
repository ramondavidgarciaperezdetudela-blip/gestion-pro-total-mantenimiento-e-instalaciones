// Búsqueda de artículos por texto libre: referencia, nombre o un trozo de la
// descripción. Sin tildes ni mayúsculas, y todas las palabras escritas tienen
// que aparecer (en cualquier orden). Se ordena por lo bien que encaja.

export const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Convierte una línea de tarifa (SupplierPrice) en un artículo para buscar. */
export const articuloDeTarifa = (m) => ({
  ref: m.product_code || '', nombre: m.product_name || '', extra: `${m.brand || ''} ${m.category || ''}`,
  proveedor: m.supplier_name || '', precio: Number(m.sale_price) || Number(m.cost_price) || 0, origen: 'Tarifa de proveedor',
});

/** Convierte un artículo de «Mi base de datos» (PriceItem). */
export const articuloDePropio = (p) => ({
  ref: p.reference || p.supplier_ref || '', nombre: p.description || '', extra: `${p.brand || ''} ${p.notes || ''} ${p.section || ''}`,
  proveedor: p.supplier_name || '', precio: Number(p.unit_price) || 0, plazo: p.delivery_days, origen: 'Mi base de datos',
});

/**
 * @param articulos  lista ya convertida ({ ref, nombre, extra, ... })
 * @param texto      lo escrito por la persona
 * @returns hasta `max` coincidencias, las mejores primero
 */
export function buscarPorTexto(articulos = [], texto = '', max = 12) {
  const q = norm(texto);
  if (q.length < 2) return [];
  const palabras = q.split(/\s+/).filter(Boolean);
  const res = [];
  for (const a of articulos) {
    const ref = norm(a.ref); const nombre = norm(a.nombre); const todo = `${ref} ${nombre} ${norm(a.extra)}`;
    if (!palabras.every((w) => todo.includes(w))) continue;
    let puntos = 1;
    if (ref === q) puntos = 100;
    else if (ref.startsWith(q)) puntos = 80;
    else if (ref.includes(q)) puntos = 60;
    else if (nombre.startsWith(q)) puntos = 50;
    else if (nombre.includes(q)) puntos = 40;
    else if (palabras.every((w) => nombre.includes(w))) puntos = 20;
    res.push({ a, puntos, largo: nombre.length });
  }
  res.sort((x, y) => y.puntos - x.puntos || x.largo - y.largo);
  const vistos = new Set(); const fuera = [];
  for (const { a } of res) {
    const k = `${norm(a.ref)}|${norm(a.nombre)}|${norm(a.proveedor)}|${a.origen}`;
    if (vistos.has(k)) continue; vistos.add(k); fuera.push(a);
    if (fuera.length >= max) break;
  }
  return fuera;
}
