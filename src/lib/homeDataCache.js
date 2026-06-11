/**
 * Cache compartido para datos del Home y paneles secundarios.
 * TTL: 1 hora. Soporte de cache parcial por clave.
 * Incluye retry automático en rate limit (429).
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

const cacheStore = {};
const cacheTimes = {};
const pendingPromises = {};
let pendingHomeDataPromise = null;

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(fetcher, retries = 5, waitMs = 3000) {
  try {
    return await fetcher();
  } catch (err) {
    const isRateLimit = err?.status === 429 || err?.message?.toLowerCase().includes('rate');
    if (isRateLimit && retries > 0) {
      await delay(waitMs);
      return fetchWithRetry(fetcher, retries - 1, waitMs * 2);
    }
    throw err;
  }
}

async function fetchOne(key, fetcher) {
  const now = Date.now();
  if (cacheStore[key] && (now - (cacheTimes[key] || 0)) < CACHE_TTL_MS) {
    return cacheStore[key];
  }
  if (pendingPromises[key]) return pendingPromises[key];

  pendingPromises[key] = fetchWithRetry(fetcher).then(data => {
    cacheStore[key] = data;
    cacheTimes[key] = Date.now();
    delete pendingPromises[key];
    return data;
  }).catch(err => {
    delete pendingPromises[key];
    // Si hay datos en caché aunque vencidos, devolverlos como fallback
    if (cacheStore[key]) return cacheStore[key];
    return [];
  });

  return pendingPromises[key];
}

// Carga secuencial por lotes con delay entre cada uno
async function batchFetch(tasks, batchSize = 2, batchDelay = 150) {
  const results = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(t => fetchOne(t.key, t.fetcher)));
    results.push(...batchResults);
    if (i + batchSize < tasks.length) await delay(batchDelay);
  }
  return results;
}

export async function getHomeData(forceRefresh = false) {
  if (forceRefresh) {
    invalidateHomeCache();
    pendingHomeDataPromise = null;
  }

  // Si ya hay una carga en curso, reutilizarla (evita múltiples llamadas paralelas)
  if (pendingHomeDataPromise) return pendingHomeDataPromise;

  const { base44 } = await import('@/api/base44Client');

  const tasks = [
    { key: 'invoices',          fetcher: () => base44.entities.Invoice.list('-date', 60) },
    { key: 'satOrders',         fetcher: () => base44.entities.SATOrder.list('-date', 50) },
    { key: 'maintenanceSheets', fetcher: () => base44.entities.MaintenanceSheet.list('-date', 30) },
    { key: 'contacts',          fetcher: () => base44.entities.Contact.list('name', 80) },
    { key: 'appointments',      fetcher: () => base44.entities.Appointment.filter({ date: new Date().toISOString().slice(0, 10) }) },
    { key: 'companySettings',   fetcher: () => base44.entities.CompanySettings.list() },
    { key: 'suppliers',         fetcher: () => base44.entities.Supplier.list('-created_date', 15) },
    { key: 'stockItems',        fetcher: () => base44.entities.StockItem.list('-updated_date', 15) },
  ];

  pendingHomeDataPromise = batchFetch(tasks, 1, 600).then(
    ([invoices, satOrders, maintenanceSheets, contacts, appointments, companySettings, suppliers, stockItems]) => {
      pendingHomeDataPromise = null;
      return { invoices, satOrders, maintenanceSheets, contacts, appointments, companySettings, suppliers, stockItems };
    }
  ).catch(err => {
    pendingHomeDataPromise = null;
    throw err;
  });

  return pendingHomeDataPromise;
}

// Invalidar todo el cache
export function invalidateHomeCache() {
  Object.keys(cacheStore).forEach(k => { delete cacheStore[k]; delete cacheTimes[k]; });
}

// Invalidar solo una clave (e.g. tras guardar una factura)
export function invalidateCacheKey(key) {
  delete cacheStore[key];
  delete cacheTimes[key];
}