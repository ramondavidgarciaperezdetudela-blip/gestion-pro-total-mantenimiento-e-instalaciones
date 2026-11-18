// Carga de los avisos (con memoria de 45 s para que la campana y el panel no pidan lo mismo dos veces)
// y aplicación de las acciones. Cada acción cambia el dato en su sitio (presupuesto, SAT, cita…).
import { base44 } from '@/api/base44Client';
import { invalidateHomeCache } from '@/lib/homeDataCache';
import { construirAvisos } from '@/lib/tareasAvisos';

export const EVENTO_AVISOS = 'gpt-avisos-cambiaron';
export const EVENTO_ABRIR_AVISOS = 'gpt-abrir-avisos';
const VIGENCIA = 45 * 1000;
let memoria = null; let enCurso = null;

/** Abre el centro de avisos por encima de la pantalla en la que estés. */
export const abrirAvisos = (tipo = '') => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_AVISOS, { detail: { tipo } }));

export function olvidarAvisos() { memoria = null; try { window.dispatchEvent(new Event(EVENTO_AVISOS)); } catch { /* sin ventana */ } }

export async function cargarAvisos(forzar = false) {
  if (!forzar && memoria && Date.now() - memoria.cuando < VIGENCIA) return memoria.avisos;
  if (!forzar && enCurso) return enCurso;
  const hoy = new Date(); const hoyTxt = hoy.toISOString().slice(0, 10);
  const E = base44.entities;
  enCurso = (async () => {
    // allSettled: si una lista falla (sin conexión, entidad no creada…), las demás siguen.
    const [inv, sat, man, cit, pro, opi] = await Promise.allSettled([
      E.Invoice.filter({ status: { $in: ['enviado', 'vencido'] } }, '-date', 5000),
      E.SATOrder.list('-date', 5000),
      E.MaintenanceSheet.list('-date', 5000),
      E.Appointment.filter({ date: hoyTxt }),
      E.Project.list('-end_date', 100),
      E.ChangeOpinionRequest.filter({ status: 'pendiente' }, '-created_date'),
    ]);
    const v = (r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);
    const avisos = construirAvisos({ invoices: v(inv), sats: v(sat), mantenimientos: v(man), citas: v(cit), proyectos: v(pro), opiniones: v(opi), hoy });
    memoria = { cuando: Date.now(), avisos };
    return avisos;
  })().finally(() => { enCurso = null; });
  return enCurso;
}

/** Cambia el estado de lo que pide la acción y refresca todo lo que lo muestra. */
export async function aplicarAccion(accion) {
  await base44.entities[accion.entidad].update(accion.idReg, accion.datos);
  invalidateHomeCache();
  olvidarAvisos();
}

/** WhatsApp con el recordatorio: se busca el teléfono del cliente justo al pulsar (no hace falta cargar todos los clientes). */
export async function recordatorioWhatsApp(aviso) {
  let tel = aviso.telefono;
  if (!tel && aviso.contactId) {
    try { const [c] = await base44.entities.Contact.filter({ id: aviso.contactId }); tel = c?.phone || c?.mobile; } catch { /* sin ficha */ }
  }
  const limpio = String(tel || '').replace(/\D/g, '');
  if (!limpio) return { ok: false, motivo: 'Este cliente no tiene teléfono en su ficha.' };
  const num = limpio.startsWith('34') && limpio.length > 9 ? limpio : `34${limpio}`;
  const texto = aviso.mensaje ? aviso.mensaje(aviso.contactName || 'cliente') : '';
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, '_blank');
  return { ok: true };
}
