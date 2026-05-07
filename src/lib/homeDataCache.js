/**
 * Cache compartido para datos del Home y paneles secundarios.
 * TTL: 10 minutos. Soporte de cache parcial por clave.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

// Cache por clave individual para evitar re-fetch total
const cacheStore = {};
const cacheTimes = {};
const pendingPromises = {};

async function fetchOne(key, fetcher) {
  const now = Date.now();
  if (cacheStore[key] && (now - (cacheTimes[key] || 0)) < CACHE_TTL_MS) {
    return cacheStore[key];
  }
  if (pendingPromises[key]) return pendingPromises[key];

  pendingPromises[key] = fetcher().then(data => {
    cacheStore[key] = data;
    cacheTimes[key] = Date.now();
    delete pendingPromises[key];
    return data;
  }).catch(err => {
    delete pendingPromises[key];
    throw err;
  });

  return pendingPromises[key];
}

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export async function getHomeData(forceRefresh = false) {
  if (forceRefresh) invalidateHomeCache();

  const { base44 } = await import('@/api/base44Client');

  // Check how many keys need actual fetching (not cached)
  const now = Date.now();
  const keys = ['invoices','satOrders','maintenanceSheets','contacts','appointments','companySettings','suppliers','stockItems'];
  const needsFetch = keys.some(k => !cacheStore[k] || (now - (cacheTimes[k] || 0)) >= CACHE_TTL_MS);

  // If all cached, return immediately in parallel
  if (!needsFetch) {
    const [invoices, satOrders, maintenanceSheets, contacts, appointments, companySettings, suppliers, stockItems] =
      await Promise.all([
        fetchOne('invoices',          () => base44.entities.Invoice.list('-date', 60)),
        fetchOne('satOrders',         () => base44.entities.SATOrder.list('-date', 50)),
        fetchOne('maintenanceSheets', () => base44.entities.MaintenanceSheet.list('-date', 30)),
        fetchOne('contacts',          () => base44.entities.Contact.list('name', 80)),
        fetchOne('appointments',      () => base44.entities.Appointment.filter({ date: new Date().toISOString().slice(0, 10) })),
        fetchOne('companySettings',   () => base44.entities.CompanySettings.list()),
        fetchOne('suppliers',         () => base44.entities.Supplier.list('-created_date', 15)),
        fetchOne('stockItems',        () => base44.entities.StockItem.list('-updated_date', 15)),
      ]);
    return { invoices, satOrders, maintenanceSheets, contacts, appointments, companySettings, suppliers, stockItems };
  }

  // Fetch in small batches with delay to avoid rate limit
  const invoices          = await fetchOne('invoices',          () => base44.entities.Invoice.list('-date', 60));
  const satOrders         = await fetchOne('satOrders',         () => base44.entities.SATOrder.list('-date', 50));
  await delay(150);
  const maintenanceSheets = await fetchOne('maintenanceSheets', () => base44.entities.MaintenanceSheet.list('-date', 30));
  const contacts          = await fetchOne('contacts',          () => base44.entities.Contact.list('name', 80));
  await delay(150);
  const appointments      = await fetchOne('appointments',      () => base44.entities.Appointment.filter({ date: new Date().toISOString().slice(0, 10) }));
  const companySettings   = await fetchOne('companySettings',   () => base44.entities.CompanySettings.list());
  await delay(150);
  const suppliers         = await fetchOne('suppliers',         () => base44.entities.Supplier.list('-created_date', 15));
  const stockItems        = await fetchOne('stockItems',        () => base44.entities.StockItem.list('-updated_date', 15));

  return { invoices, satOrders, maintenanceSheets, contacts, appointments, companySettings, suppliers, stockItems };
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