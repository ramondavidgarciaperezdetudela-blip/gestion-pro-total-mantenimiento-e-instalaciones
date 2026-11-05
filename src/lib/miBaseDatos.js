// «Mi base de datos»: los artículos propios (PriceItem) ordenados por apartados, y la comprobación de
// si un artículo ya existe en ella o en las tarifas de los proveedores.
import { base44 } from '@/api/base44Client';
import { cargarTodo } from '@/lib/cargarTodo';
import { claveRef } from '@/lib/importarPresupuesto';

/** Apartados de fábrica. Se pueden añadir más; se guardan en cada artículo. */
export const APARTADOS_BASE = [
  'Cámaras frigoríficas KIDE',
  'Cámaras frigoríficas TAVER',
  'Equipos frigoríficos',
  'Evaporadores y condensadores',
  'Compresores y unidades condensadoras',
  'Climatización',
  'Ventilación',
  'Eléctrico y automatismos',
  'Solar',
  'Fontanería',
  'Tubería y accesorios',
  'Material de instalación',
  'Mano de obra',
  'Otros',
];

/** Proveedores que siempre se ofrecen, además de los que tengas dados de alta. */
export const PROVEEDORES_BASE = ['KIDE', 'TAVER'];

const CLAVE_EXTRA = 'gpt_apartados_extra';

export function apartadosExtra() {
  try { return JSON.parse(localStorage.getItem(CLAVE_EXTRA) || '[]'); } catch { return []; }
}
export function guardarApartadoExtra(nombre) {
  const n = String(nombre || '').trim();
  if (!n) return;
  try {
    const extra = apartadosExtra();
    if (!extra.includes(n) && !APARTADOS_BASE.includes(n)) localStorage.setItem(CLAVE_EXTRA, JSON.stringify([...extra, n]));
  } catch { /* sin almacenamiento: el apartado vale igualmente para este artículo */ }
}

/** Lista de apartados: los de fábrica, los añadidos y los que ya usan los artículos. */
export function listaDeApartados(articulos = []) {
  const usados = articulos.map((a) => a.section).filter(Boolean);
  return [...new Set([...APARTADOS_BASE, ...apartadosExtra(), ...usados])];
}

/** Categoría de siempre (mano de obra, material…) según el apartado. */
export function categoriaDeApartado(apartado) {
  if (/mano de obra/i.test(apartado || '')) return 'mano_obra';
  return 'material';
}

export async function cargarPropios() {
  const todos = await cargarTodo('PriceItem', 'description');
  return todos.filter((i) => i.is_active !== false);
}

export async function cargarProveedores() {
  try {
    const lista = await base44.entities.Supplier.list('name', 500);
    return [...new Set([...PROVEEDORES_BASE, ...(lista || []).map((s) => s.name).filter(Boolean)])];
  } catch { return [...PROVEEDORES_BASE]; }
}

async function enTandas(items, tamano, fn) {
  const salida = [];
  for (let i = 0; i < items.length; i += tamano) {
    salida.push(...await Promise.all(items.slice(i, i + tamano).map(fn)));
  }
  return salida;
}

/**
 * Mira en las tarifas de proveedores (SupplierPrice) cada referencia y devuelve un mapa
 * claveRef → líneas de tarifa. Se prueban varias formas de escribir la referencia.
 */
export async function buscarEnProveedores(referencias) {
  const unicas = [...new Set(referencias.map((r) => String(r || '').trim()).filter(Boolean))];
  const mapa = new Map();
  await enTandas(unicas, 6, async (ref) => {
    const variantes = [...new Set([ref, ref.toUpperCase(), ref.toLowerCase(), ref.replace(/[\s]+/g, ''), ref.replace(/[-_./]/g, '')])];
    for (const v of variantes) {
      try {
        const r = await base44.entities.SupplierPrice.filter({ product_code: v });
        if (r?.length) { mapa.set(claveRef(ref), r); return; }
      } catch { /* sin conexión con esa tarifa: se sigue sin ella */ }
    }
  });
  return mapa;
}

/** Guarda un artículo nuevo en Mi base de datos. */
export async function guardarEnMiBase({ description, reference, unit_price, unit, apartado, proveedor, delivery_days, brand, notes }) {
  guardarApartadoExtra(apartado);
  return base44.entities.PriceItem.create({
    description: String(description || '').trim(),
    reference: String(reference || '').trim(),
    supplier_ref: String(reference || '').trim(),
    unit_price: Number(unit_price) || 0,
    unit: unit || 'ud',
    category: categoriaDeApartado(apartado),
    section: apartado || 'Otros',
    supplier_name: proveedor || '',
    delivery_days: delivery_days ?? null,
    brand: brand || '',
    notes: notes || '',
    is_active: true,
  });
}

/** Destino «Mi base de datos» en los selectores de dónde guardar. */
export const DESTINO_MIO = 'mia';

/** Devuelve el proveedor con ese nombre; si todavía no está dado de alta (KIDE, TAVER…), lo crea. */
export async function asegurarProveedor(nombre) {
  const limpio = String(nombre || '').trim();
  const lista = await base44.entities.Supplier.list('name', 1000).catch(() => []);
  const hay = (lista || []).find((p) => String(p.name || '').trim().toLowerCase() === limpio.toLowerCase());
  if (hay) return hay;
  return base44.entities.Supplier.create({ name: limpio, category: 'refrigeracion' });
}

/** Añade el artículo a la tarifa de un proveedor (SupplierPrice). */
export async function guardarEnTarifa({ proveedor, description, reference, unit_price, precio_venta, unit, notes }) {
  const prov = await asegurarProveedor(proveedor);
  const coste = Number(unit_price) || 0;
  return base44.entities.SupplierPrice.create({
    supplier_id: prov.id, supplier_name: prov.name || proveedor,
    product_code: String(reference || '').trim(), product_name: String(description || '').trim(),
    cost_price: coste, sale_price: Number(precio_venta) || coste, unit: unit || 'ud', notes: notes || '',
  });
}

/**
 * Guarda un artículo nuevo donde se pida: en Mi base de datos (DESTINO_MIO) o en la tarifa de un proveedor,
 * y opcionalmente también en Mi base de datos.
 */
export async function guardarArticulo({ destino, tambienMia, ...datos }) {
  const hechos = [];
  if (destino && destino !== DESTINO_MIO) {
    await guardarEnTarifa({ ...datos, proveedor: destino });
    hechos.push(`la tarifa de ${destino}`);
  }
  if (!destino || destino === DESTINO_MIO || tambienMia) {
    await guardarEnMiBase({ ...datos, proveedor: datos.proveedor || (destino && destino !== DESTINO_MIO ? destino : '') });
    hechos.push('Mi base de datos');
  }
  return hechos;
}
