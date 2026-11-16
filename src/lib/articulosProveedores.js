// Todos los artículos buscables (tarifas de proveedores + Mi base de datos), cargados
// UNA vez y guardados en memoria. Así abrir el buscador una segunda vez es instantáneo.
import { cargarTodo } from '@/lib/cargarTodo';
import { cargarPropios } from '@/lib/miBaseDatos';
import { articuloDeTarifa, articuloDePropio, indexar, fotosDeLineas } from '@/lib/buscarArticulos';

const VIGENCIA_MS = 10 * 60 * 1000;
let guardado = null; // { cuando, indice }
let enCurso = null;

export function olvidarArticulos() { guardado = null; enCurso = null; }

/** Índice listo para buscar. `forzar` vuelve a leer del servidor. */
export async function cargarIndiceArticulos(forzar = false) {
  if (!forzar && guardado && Date.now() - guardado.cuando < VIGENCIA_MS) return guardado.indice;
  if (!forzar && enCurso) return enCurso;
  enCurso = (async () => {
    const [tarifas, propios] = await Promise.all([cargarTodo('SupplierPrice').catch(() => []), cargarPropios().catch(() => [])]);
    const indice = indexar([
      ...(tarifas || []).filter((m) => m.is_active !== false).map((m) => ({ ...articuloDeTarifa(m), id: m.id, unidad: m.unit || 'ud', imagen: m.image_url || '' })),
      ...(propios || []).filter((p) => p.is_active !== false).map((p) => ({ ...articuloDePropio(p), id: p.id, unidad: p.unit || 'ud', imagen: p.image_url || '' })),
    ]);
    guardado = { cuando: Date.now(), indice };
    return indice;
  })().finally(() => { enCurso = null; });
  return enCurso;
}

/** Fotos de las líneas de un documento (línea → foto). Si no se pueden leer los artículos, sin fotos. */
export async function fotosParaLineas(items = []) {
  try { return fotosDeLineas(await cargarIndiceArticulos(), items); } catch { return new Map(); }
}
