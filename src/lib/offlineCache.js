/**
 * offlineCache.js
 * Utilidad de caché offline usando localStorage con TTL.
 * Permite guardar y recuperar datos cuando no hay red.
 */

const CACHE_VERSION = 'v1';

function cacheKey(name) {
  return `offline_cache_${CACHE_VERSION}_${name}`;
}

/** Guarda datos en caché con marca de tiempo */
export function saveToCache(name, data) {
  try {
    localStorage.setItem(cacheKey(name), JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {
    // Silenciar errores de cuota de storage
  }
}

/** Lee datos de caché. Devuelve null si no hay nada. */
export function loadFromCache(name) {
  try {
    const raw = localStorage.getItem(cacheKey(name));
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    return { data, ts };
  } catch {
    return null;
  }
}

/** Elimina una entrada de caché */
export function clearCache(name) {
  try {
    localStorage.removeItem(cacheKey(name));
  } catch {}
}

/** Formatea la fecha del último caché */
export function formatCacheDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}