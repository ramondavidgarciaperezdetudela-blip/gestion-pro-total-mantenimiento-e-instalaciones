/**
 * averiasEstado.js — mapeo de una avería a su micro-estado visual.
 * Estado semántico: critico (rojo) · aviso (ámbar) · ok (verde) · neutro (gris).
 */
export const ESTADOS_AVERIA = {
  reportada: { estado: 'critico', etiqueta: 'Reportada' },
  en_reparacion: { estado: 'aviso', etiqueta: 'En reparación' },
  pendiente: { estado: 'aviso', etiqueta: 'Pendiente' },
  reparada: { estado: 'ok', etiqueta: 'Reparada' },
  cancelada: { estado: 'neutro', etiqueta: 'Cancelada' },
};

export const TIPOS_AVERIA = {
  compresor: 'Compresor', ventilador: 'Ventilador', termostato: 'Termostato', valvula: 'Válvula', condensador: 'Condensador',
  evaporador: 'Evaporador', fugas_gas: 'Fuga de gas', problemas_electricos: 'Eléctrica', mantenimiento: 'Mantenimiento', otro: 'Otra',
};

/** Días enteros entre dos fechas ISO (null si alguna no es válida). */
export function diasEntre(desde, hasta) {
  const a = Date.parse(desde), b = Date.parse(hasta);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 86400000));
}

/**
 * @returns {{estado:string, etiqueta:string, tipo:string, dias:number|null, abierta:boolean, urgente:boolean}}
 * `dias`: tiempo que lleva abierta (hasta hoy) o que tardó en repararse.
 * `urgente`: sigue sin repararse tras 7 días, o es fuga de gas sin reparar.
 */
export function resumenAveria(a = {}, hoy = new Date().toISOString().slice(0, 10)) {
  const cfg = ESTADOS_AVERIA[a.status] || { estado: 'neutro', etiqueta: a.status || 'Sin estado' };
  const abierta = a.status === 'reportada' || a.status === 'en_reparacion' || a.status === 'pendiente';
  const dias = abierta ? diasEntre(a.failure_date, hoy) : diasEntre(a.failure_date, a.repair_date);
  const urgente = abierta && ((dias ?? 0) > 7 || a.failure_type === 'fugas_gas');
  const estado = urgente ? 'critico' : cfg.estado;
  return { estado, etiqueta: cfg.etiqueta, tipo: TIPOS_AVERIA[a.failure_type] || 'Otra', dias, abierta, urgente };
}

export function costePiezas(a = {}) {
  return (a.parts_used || []).reduce((s, p) => s + (Number(p.cost) || 0) * (Number(p.quantity) || 1), 0);
}
