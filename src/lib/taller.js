/**
 * taller.js — lógica (sin React) de botellas y movimientos de gas, gamas de
 * mantenimiento asignadas a equipos, calibración de instrumentos y caducidad
 * de las habilitaciones de los técnicos.
 */
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const n = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : 0; };
export const redondear = (v, d = 2) => Math.round((v + Number.EPSILON) * 10 ** d) / 10 ** d;
export const hoyISO = () => new Date().toISOString().slice(0, 10);

/** Suma meses a una fecha ISO (el día se recorta al último del mes si hace falta). */
export function sumarMeses(iso, meses) {
  if (!ISO.test(iso || '') || !(n(meses) > 0)) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + Math.round(n(meses)), 1));
  const ultimo = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, ultimo));
  return t.toISOString().slice(0, 10);
}
export const diasHasta = (iso, hoy = hoyISO()) => (ISO.test(iso || '') ? Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86400000) : null);

/** 'vencida' | 'proxima' (dentro de la ventana) | 'ok' | 'sin-fecha'. */
export function estadoFecha(iso, { hoy = hoyISO(), ventana = 15 } = {}) {
  const d = diasHasta(iso, hoy);
  if (d === null) return 'sin-fecha';
  return d < 0 ? 'vencida' : d <= ventana ? 'proxima' : 'ok';
}

// ── Gas ──────────────────────────────────────────────────────────────────────
export const OPERACIONES_GAS = [
  { value: 'carga_equipo', label: 'Carga en equipo', signo: -1, pideEquipo: true },
  { value: 'recuperacion_equipo', label: 'Recuperación de equipo', signo: 1, pideEquipo: true },
  { value: 'devolucion_proveedor', label: 'Devolución al proveedor', signo: -1, pideEquipo: false },
  { value: 'ajuste', label: 'Ajuste de inventario (+)', signo: 1, pideEquipo: false },
];
export const operacionGas = (v) => OPERACIONES_GAS.find((o) => o.value === v);

/** kg con signo de un movimiento sobre su botella. */
export const kgConSigno = (m) => (operacionGas(m.operation)?.signo ?? 0) * n(m.kg);

/** Contenido actual de una botella: inicial + movimientos. Nunca por debajo de 0 en pantalla. */
export function saldoBotella(botella, movimientos = []) {
  const mov = movimientos.filter((m) => String(m.cylinder_id) === String(botella.id)).reduce((a, m) => a + kgConSigno(m), 0);
  return redondear(n(botella.initial_kg) + mov);
}
export function validarMovimiento(mov, botella, movimientos = []) {
  const errores = []; const op = operacionGas(mov.operation);
  if (!op) errores.push('Elige la operación.');
  if (!botella) errores.push('Elige la botella.');
  if (!(n(mov.kg) > 0)) errores.push('Indica los kilos (mayor que 0).');
  if (op?.pideEquipo && !mov.machine_id) errores.push('Elige el equipo.');
  if (op && botella && op.signo < 0 && n(mov.kg) > saldoBotella(botella, movimientos) + 1e-9) errores.push(`La botella solo tiene ${saldoBotella(botella, movimientos)} kg.`);
  if (op && botella && op.signo > 0 && n(botella.capacity_kg) > 0 && saldoBotella(botella, movimientos) + n(mov.kg) > n(botella.capacity_kg) + 1e-9) errores.push(`Supera la capacidad de la botella (${botella.capacity_kg} kg).`);
  if (op && botella && mov.refrigerant && botella.refrigerant && mov.refrigerant !== botella.refrigerant) errores.push('El gas del movimiento no coincide con el de la botella.');
  return errores;
}
/** Resumen de manipulación de un año: por gas, kg cargados, recuperados y devueltos, y existencias. */
export function resumenAnual(movimientos = [], botellas = [], anio) {
  const delAnio = movimientos.filter((m) => String(m.date || '').startsWith(String(anio)));
  const porGas = {};
  delAnio.forEach((m) => {
    const g = (porGas[m.refrigerant || 'Sin gas'] ||= { gas: m.refrigerant || 'Sin gas', cargado: 0, recuperado: 0, devuelto: 0, movimientos: 0 });
    const kg = n(m.kg); g.movimientos++;
    if (m.operation === 'carga_equipo') g.cargado += kg; else if (m.operation === 'recuperacion_equipo') g.recuperado += kg; else if (m.operation === 'devolucion_proveedor') g.devuelto += kg;
  });
  const filas = Object.values(porGas).map((g) => ({ ...g, cargado: redondear(g.cargado), recuperado: redondear(g.recuperado), devuelto: redondear(g.devuelto) })).sort((a, b) => a.gas.localeCompare(b.gas));
  const existencias = {};
  botellas.filter((b) => b.status !== 'devuelta').forEach((b) => { const s = saldoBotella(b, movimientos); if (s > 0) { existencias[b.refrigerant || 'Sin gas'] = redondear((existencias[b.refrigerant || 'Sin gas'] || 0) + s); } });
  return { filas, existencias: Object.entries(existencias).map(([gas, kg]) => ({ gas, kg })).sort((a, b) => a.gas.localeCompare(b.gas)), movimientos: delAnio.length };
}

// ── Gamas y plan ─────────────────────────────────────────────────────────────
/** Próxima fecha de una asignación: la fijada a mano; si no, última + frecuencia; si no, hoy. */
export function proximaGama(asig, gama, hoy = hoyISO()) {
  if (ISO.test(asig?.next_date || '')) return asig.next_date;
  const ultima = ISO.test(asig?.last_done || '') ? sumarMeses(asig.last_done, gama?.interval_months) : '';
  return ultima || hoy;
}
/** Resumen del plan (para las tarjetas de arriba). */
export function resumenPlan(asignaciones = [], gamas = [], { hoy = hoyISO(), ventana = 15 } = {}) {
  const porId = Object.fromEntries(gamas.map((g) => [String(g.id), g]));
  const filas = asignaciones.map((a) => {
    const prox = proximaGama(a, porId[String(a.gama_id)], hoy);
    return { ...a, proxima: prox, estado: estadoFecha(prox, { hoy, ventana }), dias: diasHasta(prox, hoy) };
  }).sort((a, b) => String(a.proxima).localeCompare(String(b.proxima)));
  return {
    filas,
    asignadas: filas.length,
    vencidas: filas.filter((f) => f.estado === 'vencida').length,
    proximas: filas.filter((f) => f.estado === 'proxima').length,
    conOrden: filas.filter((f) => f.open_order_id).length,
  };
}
/** Asignaciones que vencen dentro de `dias` y no tienen ya una orden abierta. */
export const porGenerar = (asignaciones, gamas, dias, hoy = hoyISO()) =>
  resumenPlan(asignaciones, gamas, { hoy }).filas.filter((f) => !f.open_order_id && f.dias !== null && f.dias <= dias);

// ── Instrumentos y técnicos ──────────────────────────────────────────────────
export const proximaCalibracion = (i) => sumarMeses(i?.last_calibration, i?.interval_months || 12);
export const estadoCalibracion = (i, o) => estadoFecha(proximaCalibracion(i), { ventana: 30, ...o });
export const CADUCIDADES_TECNICO = [['fgas_expiry', 'Certificado F-Gas'], ['rite_expiry', 'Carné RITE'], ['prl_date', 'Formación PRL / altura'], ['medical_date', 'Reconocimiento médico']];
/** Qué documentos del técnico están caducados o a punto (60 días). */
export function caducidadesTecnico(t, { hoy = hoyISO(), ventana = 60 } = {}) {
  return CADUCIDADES_TECNICO.map(([k, etiqueta]) => ({ campo: k, etiqueta, fecha: t?.[k] || '', estado: estadoFecha(t?.[k], { hoy, ventana }) })).filter((c) => c.estado === 'vencida' || c.estado === 'proxima');
}
