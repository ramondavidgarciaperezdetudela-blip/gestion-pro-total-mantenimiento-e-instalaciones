// Documentos sin respuesta: pasan a «vencido» al cumplirse el plazo y avisan hasta que se recuperan.
//
//  · Plazo: la fecha de vencimiento del propio documento si la tiene; si no, fecha de emisión + N días
//    (N se elige en la propia pantalla; por defecto 30).
//  · Pasan a vencido los documentos «enviado» (y los presupuestos en «borrador» que ya llevan sin
//    respuesta), siempre que el cliente no haya firmado ni aceptado ni rechazado.
//  · El aviso se muestra mientras el documento siga «vencido» y no se haya descartado. Cualquier
//    gestión (cambiar de estado, ampliar el plazo, descartar el aviso) lo quita.

export const DIAS_PLAZO_DEFECTO = 30;
const CLAVE = 'gpt_dias_plazo_respuesta';

export function diasPlazo() {
  try {
    const n = parseInt(localStorage.getItem(CLAVE) || '', 10);
    return Number.isFinite(n) && n > 0 ? n : DIAS_PLAZO_DEFECTO;
  } catch { return DIAS_PLAZO_DEFECTO; }
}
export function guardarDiasPlazo(n) {
  const v = Math.max(1, Math.min(365, parseInt(n, 10) || DIAS_PLAZO_DEFECTO));
  try { localStorage.setItem(CLAVE, String(v)); } catch { /* sin almacenamiento: vale para esta sesión */ }
  return v;
}

const MS_DIA = 24 * 60 * 60 * 1000;
const masDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const aFecha = (s) => { const d = new Date(`${String(s).slice(0, 10)}T00:00:00`); return Number.isNaN(d.getTime()) ? null : d; };
export const isoDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Último día para responder (fecha de vencimiento del documento o emisión + plazo). */
export function fechaLimite(doc, dias = DIAS_PLAZO_DEFECTO) {
  const venc = doc?.due_date ? aFecha(doc.due_date) : null;
  if (venc) return venc;
  const emision = doc?.date ? aFecha(doc.date) : null;
  return emision ? masDias(emision, dias) : null;
}

/** ¿El cliente ya ha dado respuesta? (firma de aceptación o rechazo) */
export function tieneRespuesta(doc) { return !!doc?.signature_client; }

/** ¿Hay que pasarlo a «vencido» hoy? */
export function debeVencer(doc, hoy = new Date(), dias = DIAS_PLAZO_DEFECTO) {
  if (!doc || tieneRespuesta(doc)) return false;
  const estados = doc.doc_type === 'presupuesto' ? ['enviado', 'borrador'] : ['enviado'];
  if (!estados.includes(doc.status)) return false;
  if (doc.doc_type === 'recibo') return false;
  const limite = fechaLimite(doc, dias);
  if (!limite) return false;
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return h.getTime() > limite.getTime();
}

/** Documentos con el aviso de vencido activo. */
export function conAvisoVencido(docs) {
  return (docs || []).filter((d) => d.status === 'vencido' && !d.vencido_aviso_cerrado && !tieneRespuesta(d))
    .sort((a, b) => String(a.vencido_el || a.date).localeCompare(String(b.vencido_el || b.date)));
}

/** Días de retraso respecto al último día para responder. */
export function diasDeRetraso(doc, hoy = new Date(), dias = DIAS_PLAZO_DEFECTO) {
  const limite = fechaLimite(doc, dias);
  if (!limite) return 0;
  const h = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.max(0, Math.round((h.getTime() - limite.getTime()) / MS_DIA));
}

/** Cambios que se guardan al marcarlo vencido. */
export function cambiosAlVencer(hoy = new Date()) {
  return { status: 'vencido', vencido_el: isoDia(hoy), vencido_aviso_cerrado: false };
}

/** Cambios al recuperar el documento con otro estado; si el plazo ya había pasado se renueva. */
export function cambiosAlRecuperar(doc, nuevoEstado, { hoy = new Date(), dias = DIAS_PLAZO_DEFECTO } = {}) {
  const c = { status: nuevoEstado, vencido_aviso_cerrado: true };
  const sigueAbierto = ['enviado', 'borrador'].includes(nuevoEstado);
  if (sigueAbierto && debeVencer({ ...doc, status: nuevoEstado }, hoy, dias)) {
    c.due_date = isoDia(masDias(hoy, dias));
  }
  return c;
}

/** Cambios al ampliar el plazo: vuelve a «enviado» con nueva fecha límite. */
export function cambiosAlAmpliar(doc, extra, hoy = new Date()) {
  return { status: 'enviado', due_date: isoDia(masDias(hoy, extra)), vencido_aviso_cerrado: true };
}
