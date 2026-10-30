// Las funciones que en Base44 corrían en su servidor. Las que se pueden hacer
// dentro del propio programa se hacen aquí; las que necesitan correo o
// enlaces públicos avisan con claridad.
import { crearEntidad } from './entidad';

const noDisponible = (nombre, motivo) => () => {
  const e = new Error(`«${nombre}» no está disponible en la versión sin Base44: ${motivo}`);
  e.status = 501;
  throw e;
};
const SIN_CORREO = 'necesita enviar correo desde un servidor.';
const SIN_ENLACE = 'necesita un enlace público servido desde Base44.';

async function stockDiscount({ materials = [] }) {
  const Stock = crearEntidad('StockItem');
  const todo = await Stock.list('name', 5000);
  const discounted = []; const not_found = []; const low_stock_alerts = [];
  for (const mat of materials) {
    const nombre = String(mat.material || '').toLowerCase().trim();
    if (!nombre) continue;
    const cant = Number(mat.quantity);
    if (!Number.isInteger(cant) || cant <= 0 || cant > 1000) { not_found.push({ material: mat.material, quantity: mat.quantity, motivo: 'cantidad_no_valida' }); continue; }
    const it = todo.find((s) => (s.name || '').toLowerCase().includes(nombre) || nombre.includes((s.name || '').toLowerCase()) || (s.reference && s.reference.toLowerCase() === nombre));
    if (!it) { not_found.push({ material: mat.material, quantity: mat.quantity }); continue; }
    const nueva = Math.max(0, (it.quantity || 0) - cant);
    await Stock.update(it.id, { quantity: nueva });
    it.quantity = nueva;
    discounted.push({ name: it.name, was: nueva + cant, now: nueva });
    if (it.min_stock > 0 && nueva <= it.min_stock) low_stock_alerts.push({ name: it.name, quantity: nueva, min_stock: it.min_stock, supplier: it.supplier_name || '', reference: it.reference || '' });
  }
  return { discounted, not_found, low_stock_alerts };
}

const registro = {
  stockDiscount,
  aceptarPresupuesto: noDisponible('aceptarPresupuesto', SIN_ENLACE),
  aceptarSAT: noDisponible('aceptarSAT', SIN_ENLACE),
  getPresupuestoPublico: noDisponible('getPresupuestoPublico', SIN_ENLACE),
  getSATPublico: noDisponible('getSATPublico', SIN_ENLACE),
  verificarDocumento: noDisponible('verificarDocumento', SIN_ENLACE),
  appointmentReminder: noDisponible('appointmentReminder', SIN_CORREO),
  avisoNuevaCita: noDisponible('avisoNuevaCita', SIN_CORREO),
  enviarCopiaFirmada: noDisponible('enviarCopiaFirmada', SIN_CORREO),
  enviarCopiaFirmadaSAT: noDisponible('enviarCopiaFirmadaSAT', SIN_CORREO),
  enviarPlanoPorGmail: noDisponible('enviarPlanoPorGmail', SIN_CORREO),
  notifyChangeOpinionRequest: noDisponible('notifyChangeOpinionRequest', SIN_CORREO),
  sendLegalDocEmail: noDisponible('sendLegalDocEmail', SIN_CORREO),
  soporteEmail: noDisponible('soporteEmail', SIN_CORREO),
  alertFacturasNoFirmadas: noDisponible('alertFacturasNoFirmadas', SIN_CORREO),
  updateSupplierPricesOnline: noDisponible('updateSupplierPricesOnline', 'consulta webs de proveedores desde un servidor.'),
  generatePreventiveMaintenance: noDisponible('generatePreventiveMaintenance', 'se genera desde el servidor.'),
  getSpanishPostalCodes: noDisponible('getSpanishPostalCodes', 'consulta una base de códigos postales externa.'),
  downloadLegalDocuments: noDisponible('downloadLegalDocuments', 'se genera desde el servidor.'),
};

export const functions = {
  async invoke(nombre, params) {
    const f = registro[nombre];
    if (!f) throw Object.assign(new Error(`La función «${nombre}» no existe en esta versión.`), { status: 404 });
    const data = await f(params || {});
    return { data, status: 200 };
  },
};
export const funcionesDisponibles = () => Object.keys(registro).filter((k) => k === 'stockDiscount');
