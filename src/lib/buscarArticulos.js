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


// ── Búsqueda indexada y con filtro de proveedor ─────────────────────────────
// El texto de cada artículo se normaliza UNA sola vez (al cargar), así que cada
// pulsación solo compara cadenas ya preparadas: con decenas de miles de
// artículos sigue siendo instantáneo.

const compacto = (t) => norm(t).replace(/[^a-z0-9]/g, '');

/** Prepara la lista para buscar rápido. Se hace una vez y se reutiliza. */
export function indexar(articulos = []) {
  return articulos.map((a) => {
    const ref = norm(a.ref); const nombre = norm(a.nombre);
    const prov = norm(a.proveedor); const extra = norm(a.extra);
    return { a, ref, refC: compacto(a.ref), nombre, extra, prov, todo: `${ref} ${nombre} ${extra} ${prov}` };
  });
}

/** Proveedores del índice con cuántos artículos tiene cada uno (para elegir proveedor sin escribir nada). */
export function proveedoresDelIndice(indice = []) {
  const cuenta = new Map();
  for (const e of indice) { const n = e.a.proveedor || 'Sin proveedor'; cuenta.set(n, (cuenta.get(n) || 0) + 1); }
  return [...cuenta].map(([nombre, n]) => ({ nombre, n })).sort((x, y) => x.nombre.localeCompare(y.nombre));
}

const CAMPOS = { todo: (e) => e.todo, nombre: (e) => e.nombre, ref: (e) => e.ref, extra: (e) => `${e.extra} ${e.prov}` };

/**
 * @param indice  resultado de indexar()
 * @param texto   lo escrito
 * @param opc     { campo: 'todo'|'nombre'|'ref'|'extra', proveedor: '' (todos), max: 60 }
 *                'extra' = marca, categoría, notas y proveedor.
 * @returns { items, total, proveedores: [{ nombre, n }], parcial }
 *   - `proveedores` cuenta las coincidencias de CADA proveedor (sin aplicar el filtro de
 *     proveedor), para poder decir «está en Zanotti (3) y KIDE (1)».
 *   - Sin texto pero con proveedor elegido, enseña los artículos de ese proveedor (por nombre).
 *   - Si ninguno tiene TODAS las palabras, devuelve los que tienen alguna (`parcial: true`),
 *     primero los que reúnen más palabras.
 */
export function buscarIndexado(indice = [], texto = '', opc = {}) {
  const { campo = 'todo', proveedor = '', max = 60 } = opc;
  const q = norm(texto);
  const filtroProv = norm(proveedor);
  if (q.length < 2) {
    if (!filtroProv) return { items: [], total: 0, proveedores: proveedoresDelIndice(indice), parcial: false };
    const propios = indice.filter((e) => e.prov === filtroProv).sort((x, y) => x.nombre.localeCompare(y.nombre));
    return { items: propios.slice(0, max).map((e) => e.a), total: propios.length, proveedores: proveedoresDelIndice(indice), parcial: false };
  }
  const palabras = q.split(/\s+/).filter(Boolean);
  const qC = compacto(texto);
  const sacar = CAMPOS[campo] || CAMPOS.todo;
  const cuenta = new Map();
  const hallados = [];
  const sueltas = []; // coincidencias parciales (por si no hay ninguna completa)
  for (const e of indice) {
    const campoTxt = sacar(e);
    let aciertos = 0;
    for (const w of palabras) if (campoTxt.includes(w)) aciertos++;
    let ok = aciertos === palabras.length;
    // Referencia escrita de otra forma (con o sin guiones, puntos o espacios).
    if (!ok && qC.length >= 3 && (campo === 'todo' || campo === 'ref')) ok = e.refC.includes(qC);
    if (!ok) { if (aciertos > 0 && palabras.length > 1) sueltas.push({ e, aciertos }); continue; }
    const nombreProv = e.a.proveedor || 'Sin proveedor';
    cuenta.set(nombreProv, (cuenta.get(nombreProv) || 0) + 1);
    if (filtroProv && e.prov !== filtroProv) continue;
    let puntos = 1;
    if (e.ref === q || (qC && e.refC === qC)) puntos = 100;
    else if (e.ref.startsWith(q)) puntos = 80;
    else if (e.ref.includes(q)) puntos = 60;
    else if (e.nombre.startsWith(q)) puntos = 50;
    else if (e.nombre.includes(q)) puntos = 40;
    else if (palabras.every((w) => e.nombre.includes(w))) puntos = 20;
    hallados.push({ a: e.a, puntos, largo: e.nombre.length });
  }
  let parcial = false;
  if (!hallados.length && !cuenta.size && sueltas.length) {
    parcial = true;
    for (const { e, aciertos } of sueltas) {
      const nombreProv = e.a.proveedor || 'Sin proveedor';
      cuenta.set(nombreProv, (cuenta.get(nombreProv) || 0) + 1);
      if (filtroProv && e.prov !== filtroProv) continue;
      hallados.push({ a: e.a, puntos: aciertos, largo: e.nombre.length });
    }
  }
  hallados.sort((x, y) => y.puntos - x.puntos || x.largo - y.largo);
  const vistos = new Set(); const items = [];
  for (const { a } of hallados) {
    const k = `${norm(a.ref)}|${norm(a.nombre)}|${norm(a.proveedor)}|${a.origen}`;
    if (vistos.has(k)) continue; vistos.add(k); items.push(a);
  }
  const proveedores = [...cuenta].map(([nombre, n]) => ({ nombre, n })).sort((x, y) => y.n - x.n || x.nombre.localeCompare(y.nombre));
  return { items: items.slice(0, max), total: items.length, proveedores, parcial };
}

/**
 * Foto de cada línea de un documento, buscándola en los artículos (por referencia y proveedor;
 * si no, solo por referencia; si no, por la descripción exacta). Las fotos NO se guardan dentro
 * del documento: así los documentos no pesan y, si cambias la foto del artículo, se actualiza.
 * @returns {Map<number,string>} índice de línea → foto (solo las líneas que tienen)
 */
export function fotosDeLineas(indice = [], items = []) {
  const conFoto = indice.filter((e) => e.a.imagen);
  const porRefProv = new Map(); const porRef = new Map(); const porNombre = new Map();
  for (const e of conFoto) {
    if (e.refC) { porRefProv.set(`${e.refC}|${e.prov}`, e.a.imagen); if (!porRef.has(e.refC)) porRef.set(e.refC, e.a.imagen); }
    if (e.nombre && !porNombre.has(e.nombre)) porNombre.set(e.nombre, e.a.imagen);
  }
  const out = new Map();
  items.forEach((it, i) => {
    if (it?.image_url) { out.set(i, it.image_url); return; }
    const rc = compacto(it?.reference || ''); const pv = norm(it?.supplier_name || '');
    const f = (rc && (porRefProv.get(`${rc}|${pv}`) || porRef.get(rc))) || porNombre.get(norm(it?.description || ''));
    if (f) out.set(i, f);
  });
  return out;
}
