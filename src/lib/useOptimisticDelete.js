import { useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Hook que implementa borrado optimista para cualquier entidad Base44.
 * Elimina el elemento de la UI INMEDIATAMENTE y confirma con la API en segundo plano.
 * Si la API falla, muestra un error (no restaura porque el usuario ya siguió trabajando).
 *
 * Uso:
 *   const deleteItem = useOptimisticDelete('Contact', setContacts);
 *   <button onClick={() => deleteItem(id)}>Borrar</button>
 */
export function useOptimisticDelete(entityName, setItems, idKey = 'id') {
  return useCallback((id) => {
    // 1. Borrar de UI inmediatamente (sin esperar API)
    setItems(prev => Array.isArray(prev)
      ? prev.filter(item => item[idKey] !== id)
      : prev);
    // 2. Confirmar con la API en background (sin bloquear)
    base44.entities[entityName]?.delete(id).catch(err => {
      console.warn(`[useOptimisticDelete] Error borrando ${entityName}#${id}:`, err);
    });
  }, [entityName, setItems, idKey]);
}

/**
 * Borrado masivo optimista en lotes paralelos.
 * Borra de la UI de golpe y elimina por la API en lotes de 25.
 */
export async function bulkDeleteOptimistic(entityName, ids, setItems, idKey = 'id', onProgress) {
  if (!ids?.length) return;
  // Eliminar de la UI de golpe
  const idSet = new Set(ids);
  setItems(prev => Array.isArray(prev)
    ? prev.filter(item => !idSet.has(item[idKey]))
    : prev);
  // Eliminar por la API en lotes paralelos
  const LOTE = 25;
  for (let i = 0; i < ids.length; i += LOTE) {
    const batch = ids.slice(i, i + LOTE);
    await Promise.all(batch.map(id =>
      base44.entities[entityName]?.delete(id).catch(() => {})
    ));
    if (onProgress) onProgress(Math.min(i + LOTE, ids.length), ids.length);
  }
}
