/**
 * cliente.js — datos de la ficha de cliente: tipo (empresa/particular), nombre
 * para mostrar, IBAN y preparación para guardar. Los clientes antiguos no
 * tienen los campos nuevos: todo se deduce de lo que ya tienen.
 */
export const TIPOS_CLIENTE = [{ value: 'empresa', label: 'Empresa' }, { value: 'particular', label: 'Particular' }];
export const RELACIONES = [{ value: 'cliente', label: 'Cliente' }, { value: 'proveedor', label: 'Proveedor' }, { value: 'colaborador', label: 'Colaborador' }, { value: 'otro', label: 'Otro' }];
export const CATEGORIAS = [
  { value: 'residencial', label: 'Residencial' }, { value: 'comercial', label: 'Comercial' }, { value: 'industrial', label: 'Industrial' },
  { value: 'administracion_publica', label: 'Administración pública' }, { value: 'comunidad_propietarios', label: 'Comunidad de propietarios' }, { value: 'otro', label: 'Otro' },
];
export const FORMAS_PAGO = [
  { value: 'transferencia', label: 'Transferencia' }, { value: 'domiciliacion', label: 'Domiciliación (recibo)' }, { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' }, { value: 'bizum', label: 'Bizum' }, { value: 'pagare', label: 'Pagaré / cheque' },
];
export const PERIODOS_CONTRATO = [{ value: '1', label: 'Mensual' }, { value: '3', label: 'Trimestral' }, { value: '6', label: 'Semestral' }, { value: '12', label: 'Anual' }];

/** Un cliente sin `client_kind` es empresa si tiene razón social; si no, particular. */
export const tipoDeCliente = (c = {}) => (c.client_kind === 'empresa' || c.client_kind === 'particular' ? c.client_kind : (String(c.company_name || '').trim() ? 'empresa' : 'particular'));

/** Nombre para mostrar: razón social, o nombre y apellidos. */
export const nombreDeCliente = (c = {}) => {
  const persona = [c.name, c.surname].map((x) => String(x || '').trim()).filter(Boolean).join(' ');
  return String(c.company_name || '').trim() || persona || 'Sin nombre';
};

/** IBAN sin espacios y en mayúsculas. */
export const limpiarIban = (v) => String(v ?? '').replace(/\s+/g, '').toUpperCase();
/** Agrupa de cuatro en cuatro para mostrarlo. */
export const formatearIban = (v) => limpiarIban(v).replace(/(.{4})/g, '$1 ').trim();
/** Comprobación del IBAN (formato y dígitos de control, módulo 97). Vacío = válido (es opcional). */
export function ibanValido(v) {
  const s = limpiarIban(v);
  if (!s) return true;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
  if (s.startsWith('ES') && s.length !== 24) return false;
  const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let resto = 0;
  for (const d of r) resto = (resto * 10 + Number(d)) % 97;
  return resto === 1;
}

const esCorreo = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim());

/** Valores por defecto de un cliente nuevo. */
export const CLIENTE_VACIO = {
  client_kind: 'empresa', type: 'cliente', category: 'residencial', company_name: '', commercial_name: '', nif: '',
  name: '', surname: '', contact_role: '', phone: '', phone2: '', email: '', access_hours: '', website: '',
  address: '', postal_code: '', city: '', province: '', altitude_m: '', country: 'España', climate_zone: '',
  payment_method: '', billing_email: '', iban: '', payment_profile: 'pagador_normal', pending_amount: null,
  has_maintenance_contract: false, contract_period_months: '12', contract_start_date: '',
  notes: '', internal_observations: '', photo_url: '',
};

/** Ficha existente → valores del formulario (rellena lo que falte sin tocar lo que hay). */
export const clienteAFormulario = (c = {}) => ({ ...CLIENTE_VACIO, ...c, client_kind: tipoDeCliente(c), altitude_m: c.altitude_m ?? '', climate_zone: c.climate_zone ?? '' });

/**
 * Valida y prepara el cliente para guardar.
 * @returns {{ok:boolean, errores:string[], datos:object}}
 */
export function prepararCliente(form = {}) {
  const errores = [];
  const d = { ...form };
  for (const k of Object.keys(d)) if (typeof d[k] === 'string') d[k] = d[k].trim();
  d.client_kind = tipoDeCliente(d);
  if (d.client_kind === 'empresa') {
    if (!d.company_name && !d.name) errores.push('Escribe la razón social.');
    if (!d.name && d.company_name) d.name = d.company_name; // la entidad pide `name`
  } else {
    if (!d.name) errores.push('Escribe el nombre.');
    d.company_name = d.company_name || '';
  }
  if (!esCorreo(d.email)) errores.push('El correo electrónico no es válido.');
  if (!esCorreo(d.billing_email)) errores.push('El correo de facturación no es válido.');
  if (d.iban) { d.iban = limpiarIban(d.iban); if (!ibanValido(d.iban)) errores.push('El IBAN no es válido (revisa los dígitos).'); }
  const alt = parseFloat(String(d.altitude_m).replace(',', '.'));
  if (d.altitude_m === '' || d.altitude_m === null || d.altitude_m === undefined) delete d.altitude_m;
  else if (Number.isFinite(alt) && alt >= -100 && alt <= 4000) d.altitude_m = alt;
  else { errores.push('La altitud debe estar entre -100 y 4000 m.'); delete d.altitude_m; }
  d.has_maintenance_contract = !!d.has_maintenance_contract;
  if (!d.has_maintenance_contract) { delete d.contract_period_months; delete d.contract_start_date; }
  else if (d.contract_period_months) d.contract_period_months = Number(d.contract_period_months) || 12;
  if (!d.contract_start_date) delete d.contract_start_date;
  if (!d.climate_zone) d.climate_zone = '';
  return { ok: errores.length === 0, errores, datos: d };
}
