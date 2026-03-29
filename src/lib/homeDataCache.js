/**
 * Cache compartido para datos del Home y paneles secundarios.
 * Evita que cada componente haga sus propias peticiones duplicadas.
 * TTL: 2 minutos.
 */

const CACHE_TTL_MS = 2 * 60 * 1000;

let cache = null;
let cacheTime = 0;
let pendingPromise = null;

export async function getHomeData(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cache && (now - cacheTime) < CACHE_TTL_MS) {
    return cache;
  }

  // Evitar peticiones paralelas duplicadas
  if (pendingPromise) return pendingPromise;

  const { base44 } = await import('@/api/base44Client');

  pendingPromise = Promise.all([
    base44.entities.Invoice.list('-date', 60),
    base44.entities.SATOrder.list('-date', 50),
    base44.entities.MaintenanceSheet.list('-date', 30),
    base44.entities.Contact.list('name', 80),
    base44.entities.Appointment.filter({ date: new Date().toISOString().slice(0, 10) }),
    base44.entities.CompanySettings.list(),
    base44.entities.Supplier.list('-created_date', 15),
    base44.entities.StockItem.list('-updated_date', 15),
  ]).then(([invoices, satOrders, maintenanceSheets, contacts, appointments, companySettings, suppliers, stockItems]) => {
    cache = { invoices, satOrders, maintenanceSheets, contacts, appointments, companySettings, suppliers, stockItems };
    cacheTime = Date.now();
    pendingPromise = null;
    return cache;
  }).catch(err => {
    pendingPromise = null;
    throw err;
  });

  return pendingPromise;
}

export function invalidateHomeCache() {
  cache = null;
  cacheTime = 0;
}