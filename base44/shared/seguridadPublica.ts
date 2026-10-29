/**
 * Ayudas comunes de las funciones que atienden los enlaces públicos
 * (presupuesto y parte de SAT que abre el cliente, sin cuenta en el programa).
 *
 * Aquí está todo lo que hay que mirar antes de creer algo que llega por el
 * enlace: que la firma sea una imagen de verdad y de tamaño acotado, que el
 * token de cambio de opinión exista y corresponda a ese documento, que a los
 * correos no se cuele HTML, y qué campos exactos salen hacia fuera.
 */

// ~300 KB de imagen en base64. Una firma dibujada a mano no llega ni de lejos.
const MAX_FIRMA = 400000;

/** Escapa un valor para poder meterlo dentro del HTML de un correo. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Solo se acepta una firma como imagen embebida (data URL). Cualquier otra
// cosa (una URL externa, un trozo de HTML) se descarta.
const FIRMA_DATA_URL = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=\s]+$/i;

/** Devuelve la firma si es un data URL de imagen válido y acotado; si no, ''. */
export function firmaValida(signature: unknown): string {
  if (typeof signature !== 'string') return '';
  const sig = signature.trim();
  if (!sig || sig.length > MAX_FIRMA) return '';
  return FIRMA_DATA_URL.test(sig) ? sig : '';
}

/**
 * Comprueba el token de cambio de opinión contra la solicitud guardada: debe
 * existir, ser de ESTE documento y seguir pendiente. Se usa antes de dejar que
 * un cliente cambie una decisión ya firmada.
 */
export async function validarTokenCambio(base44: any, token: string, docId: string) {
  if (!token) return { ok: false, motivo: 'sin_token' };
  const encontrados = await base44.asServiceRole.entities.ChangeOpinionRequest
    .filter({ change_opinion_token: token });
  const solicitud = encontrados?.[0];
  if (!solicitud) return { ok: false, motivo: 'token_invalido' };
  if (solicitud.doc_id && String(solicitud.doc_id) !== String(docId)) {
    return { ok: false, motivo: 'token_no_coincide' };
  }
  if (solicitud.status && solicitud.status !== 'pendiente') {
    return { ok: false, motivo: 'token_usado' };
  }
  return { ok: true, solicitud };
}

/** Marca la solicitud como atendida para que el token no valga dos veces. */
export async function marcarTokenUsado(base44: any, token: string) {
  if (!token) return;
  try {
    const encontrados = await base44.asServiceRole.entities.ChangeOpinionRequest
      .filter({ change_opinion_token: token });
    const solicitud = encontrados?.[0];
    if (solicitud?.id) {
      await base44.asServiceRole.entities.ChangeOpinionRequest.update(solicitud.id, { status: 'atendido' });
    }
  } catch (_) {
    // Si no se puede marcar, no se tumba la firma: el documento ya está guardado.
  }
}

/** Campos del presupuesto que el cliente puede ver en su enlace público. */
const CAMPOS_PRESUPUESTO = [
  'id', 'doc_type', 'doc_number', 'date', 'contact_name', 'contact_nif', 'contact_address',
  'items', 'subtotal', 'iva_rate', 'iva_amount', 'total', 'observations', 'payment_terms',
  'status', 'signature_client', 'signature_method', 'sign_datetime', 'signature_history',
];

/** Campos del parte de SAT que el cliente puede ver en su enlace público. */
const CAMPOS_ORDEN = [
  'id', 'order_number', 'date', 'type', 'equipment_type', 'contact_name', 'description',
  'diagnosis', 'solution', 'materials_used', 'labor_hours', 'labor_rate', 'total', 'status',
  'signature_client', 'signature_history', 'sign_datetime_client',
];

/** Datos de la empresa que se pueden enseñar en un enlace público. */
const CAMPOS_EMPRESA = ['company_name', 'email', 'logo_url', 'nif', 'phone'];

function soloCampos(origen: any, campos: string[]) {
  if (!origen) return null;
  const salida: Record<string, unknown> = {};
  for (const campo of campos) {
    if (origen[campo] !== undefined) salida[campo] = origen[campo];
  }
  return salida;
}

export function presupuestoPublico(doc: any) {
  return soloCampos(doc, CAMPOS_PRESUPUESTO);
}

export function ordenPublica(order: any) {
  return soloCampos(order, CAMPOS_ORDEN);
}

/**
 * De la configuración de la empresa solo sale lo que ya se ve en el documento:
 * nunca la cuenta bancaria, ni los técnicos, ni el almacenamiento interno.
 */
export function empresaPublica(company: any) {
  return soloCampos(company, CAMPOS_EMPRESA);
}