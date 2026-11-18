// Tareas y avisos: todo lo que hay pendiente en el negocio, en una sola lista, con las acciones
// para resolverlo sin ir cliente por cliente. Aquí solo hay lógica pura (se prueba con node).
import { differenceInDays, parseISO, addYears, format } from 'date-fns';

export const TIPOS = {
  presupuesto: 'Presupuestos sin respuesta',
  factura: 'Facturas por cobrar',
  sat: 'SAT pendientes',
  firma: 'Firmas que faltan',
  mantenimiento: 'Mantenimientos',
  cita: 'Citas de hoy',
  proyecto: 'Proyectos vencidos',
  opinion: 'Cambios de opinión',
};
const PESO = { rojo: 0, naranja: 1, amarillo: 2, azul: 3 };

const CLAVE = 'gpt_avisos_anulados';
const CLAVE_ANTIGUA = 'dismissed_notifs'; // la campana de antes

const CLAVE_APLAZADOS = 'gpt_avisos_aplazados'; // { idAviso: 'AAAA-MM-DD' } = el aviso vuelve a salir ese día

const leerAplazados = () => { try { const v = JSON.parse(localStorage.getItem(CLAVE_APLAZADOS) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
const hoyTxt = () => format(new Date(), 'yyyy-MM-dd');

/** Avisos que la persona ha anulado (se esconden hasta que los restaure) + los aplazados que aún no han vuelto a tocar. */
export function leerAnulados() {
  const lee = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  const hoy = hoyTxt();
  const aplazados = Object.entries(leerAplazados()).filter(([, hasta]) => String(hasta) > hoy).map(([id]) => id);
  return [...new Set([...lee(CLAVE), ...lee(CLAVE_ANTIGUA), ...aplazados])];
}
export function guardarAnulados(ids) {
  try {
    const fijos = new Set(ids);
    localStorage.setItem(CLAVE, JSON.stringify([...fijos].filter((id) => !(id in leerAplazados()))));
    localStorage.removeItem(CLAVE_ANTIGUA);
  } catch { /* sin sitio */ }
}
/** Esconde un aviso hasta una fecha (p. ej. la revisión del año que viene). */
export function aplazarAviso(id, hasta) {
  try { const a = leerAplazados(); a[id] = hasta; localStorage.setItem(CLAVE_APLAZADOS, JSON.stringify(a)); } catch { /* sin sitio */ }
}
/** Deshace tanto la anulación fija como el aplazamiento. */
export function restaurarAviso(id) {
  try {
    const a = leerAplazados(); delete a[id]; localStorage.setItem(CLAVE_APLAZADOS, JSON.stringify(a));
    const f = JSON.parse(localStorage.getItem(CLAVE) || '[]'); localStorage.setItem(CLAVE, JSON.stringify(f.filter((x) => x !== id)));
  } catch { /* sin sitio */ }
}
/** Próximo aniversario de la última revisión (fecha + k años, k≥1) que sea posterior a hoy. */
export function proximaRevision(fecha, hoy = new Date()) {
  try {
    const base = parseISO(String(fecha).slice(0, 10)); const h = format(hoy, 'yyyy-MM-dd');
    for (let k = 1; k <= 60; k++) { const f = format(addYears(base, k), 'yyyy-MM-dd'); if (f > h) return f; }
  } catch { /* fecha rara */ }
  return null;
}

const dias = (fecha, hoy) => { try { return fecha ? differenceInDays(hoy, parseISO(String(fecha).slice(0, 10))) : null; } catch { return null; } };
const euros = (n) => `${Number(n || 0).toFixed(2)} €`;

function cambio(id, texto, entidad, idReg, datos, extra = {}) { return { id, texto, entidad, idReg, datos, ...extra }; }

/**
 * @param datos { invoices, sats, mantenimientos, citas, proyectos, opiniones, hoy }
 * @returns avisos ordenados: primero lo más urgente
 */
export function construirAvisos({ invoices = [], sats = [], mantenimientos = [], citas = [], proyectos = [], opiniones = [], hoy = new Date() } = {}) {
  const out = [];
  const hoyTxt = hoy.toISOString().slice(0, 10);

  for (const d of invoices) {
    if (d.status !== 'enviado' && d.status !== 'vencido') continue; // la app pasa sola a «vencido» las facturas que se pasan de fecha
    if (d.doc_type === 'presupuesto') {
      if (d.status !== 'enviado') continue;
      const n = dias(d.date, hoy);
      if (n === null || n <= 7) continue;
      out.push({
        id: `pres-${d.id}`, tipo: 'presupuesto', nivel: n > 21 ? 'rojo' : n > 14 ? 'naranja' : 'amarillo', dias: n,
        titulo: `${d.contact_name || 'Sin cliente'} — presupuesto Nº${d.doc_number || ''}`, detalle: `${euros(d.total)} · enviado hace ${n} días`,
        contactId: d.contact_id, contactName: d.contact_name, pagina: 'Documents?type=presupuesto',
        mensaje: (c) => `Estimado/a ${c}, le recordamos el presupuesto Nº${d.doc_number} por ${euros(d.total)} (hace ${n} días). ¿Tiene alguna consulta?`,
        acciones: [cambio('anular', 'Anular presupuesto', 'Invoice', d.id, { status: 'cancelado' }, { confirmar: `¿Anular el presupuesto Nº${d.doc_number} de ${d.contact_name || 'este cliente'}?`, peligro: true })],
      });
    } else if (d.doc_type !== 'albaran' && d.due_date) {
      const faltan = -(dias(d.due_date, hoy) ?? 0);
      if (faltan > 7) continue;
      const vencida = d.due_date < hoyTxt;
      out.push({
        id: `fac-${d.id}`, tipo: 'factura', nivel: vencida ? 'rojo' : 'naranja', dias: vencida ? -faltan : 0,
        titulo: `${d.contact_name || 'Sin cliente'} — ${d.doc_type || 'factura'} ${d.doc_number || ''}`,
        detalle: `${euros(d.total)} · ${vencida ? `vencida el ${d.due_date}` : `vence el ${d.due_date}`}`,
        contactId: d.contact_id, contactName: d.contact_name, pagina: 'Documents',
        mensaje: (c) => `Estimado/a ${c}, le recordamos que la factura ${d.doc_number} por ${euros(d.total)} ${vencida ? 'está vencida' : 'vence pronto'} (${d.due_date}). Gracias.`,
        acciones: [
          cambio('cobrada', 'Marcar cobrada', 'Invoice', d.id, { status: 'pagado' }),
          cambio('anular', 'Anular', 'Invoice', d.id, { status: 'cancelado' }, { confirmar: `¿Anular el documento ${d.doc_number}?`, peligro: true }),
        ],
      });
    }
  }

  for (const s of sats) {
    if (s.status === 'completada' || s.status === 'cancelada') continue;
    const n = dias(s.date, hoy);
    const faltanFirmas = [!s.signature_technician && 'técnico', !s.signature_client && 'cliente'].filter(Boolean);
    const atrasado = s.status === 'pendiente' && n !== null && n > 5;
    if (!atrasado && !(s.status === 'en_curso' && faltanFirmas.length)) continue;
    const acciones = [];
    if (s.status === 'pendiente') acciones.push(cambio('encurso', 'Pasar a en curso', 'SATOrder', s.id, { status: 'en_curso' }));
    acciones.push(cambio('completar', 'Marcar completada', 'SATOrder', s.id, { status: 'completada' }));
    acciones.push(cambio('anular', 'Anular', 'SATOrder', s.id, { status: 'cancelada' }, { confirmar: `¿Anular la orden SAT #${s.order_number || 'S/N'}?`, peligro: true }));
    out.push({
      id: atrasado ? `sat-${s.id}` : `firma-${s.id}`, tipo: atrasado ? 'sat' : 'firma',
      nivel: s.priority === 'urgente' || (n ?? 0) > 14 ? 'rojo' : (n ?? 0) > 7 || s.priority === 'alta' ? 'naranja' : 'amarillo', dias: n ?? 0,
      titulo: `#${s.order_number || 'S/N'} — ${s.contact_name || 'Sin cliente'}`,
      detalle: `${s.type || 'SAT'} · ${atrasado ? `pendiente hace ${n} días` : 'en curso'}${faltanFirmas.length ? ` · falta firma ${faltanFirmas.join(' y ')}` : ''}`,
      contactId: s.contact_id, contactName: s.contact_name, pagina: 'SAT',
      mensaje: (c) => `Hola ${c}, sobre la orden SAT #${s.order_number} (${n ?? 0} días pendiente). ¿Cuándo le viene bien una visita?`,
      acciones,
    });
  }

  // Mantenimiento: solo cuenta la última revisión de cada equipo de cada cliente.
  const ultimas = new Map();
  for (const m of mantenimientos) {
    const k = `${m.contact_id || m.contact_name}|${m.equipment_brand || ''}|${m.equipment_model || ''}|${m.type || ''}`;
    if (!m.date) continue;
    if (!ultimas.has(k) || m.date > ultimas.get(k).date) ultimas.set(k, m);
  }
  for (const m of ultimas.values()) {
    const n = dias(m.date, hoy);
    if (n === null || n <= 60) continue;
    out.push({
      id: `mant-${m.id}`, tipo: 'mantenimiento', nivel: n > 180 ? 'rojo' : n > 90 ? 'naranja' : 'amarillo', dias: n,
      titulo: `${m.contact_name || 'Sin cliente'} — ${[m.equipment_brand, m.equipment_model].filter(Boolean).join(' ') || 'equipo'}`,
      detalle: `${m.type || 'Mantenimiento'} · última revisión hace ${n} días`,
      contactId: m.contact_id, contactName: m.contact_name, pagina: 'Maintenance',
      // al quitar el aviso o marcar la revisión como hecha, no vuelve hasta que toque la del año que viene
      volverEl: proximaRevision(m.date, hoy), hechoHasta: proximaRevision(format(hoy, 'yyyy-MM-dd'), hoy),
      mensaje: (c) => `Estimado/a ${c}, su mantenimiento está pendiente (última revisión hace ${n} días). ¿Le programamos una cita?`,
      acciones: [],
    });
  }

  for (const a of citas) {
    if (a.status === 'completada' || a.status === 'cancelada') continue;
    out.push({
      id: `cita-${a.id}`, tipo: 'cita', nivel: 'azul', dias: 0,
      titulo: `${a.time_start || '--:--'} · ${a.title || 'Cita'}`, detalle: `${a.contact_name || 'Sin cliente'} · ${a.status || 'pendiente'}`,
      contactId: a.contact_id, contactName: a.contact_name, pagina: 'Agenda',
      mensaje: (c) => `Hola ${c}, le recordamos su cita de hoy a las ${a.time_start || ''}. Gracias.`,
      acciones: [
        ...(a.status !== 'confirmada' ? [cambio('confirmar', 'Confirmar', 'Appointment', a.id, { status: 'confirmada' })] : []),
        cambio('completar', 'Marcar hecha', 'Appointment', a.id, { status: 'completada' }),
        cambio('anular', 'Cancelar cita', 'Appointment', a.id, { status: 'cancelada' }, { confirmar: `¿Cancelar la cita «${a.title || ''}»?`, peligro: true }),
      ],
    });
  }

  for (const p of proyectos) {
    if (!p.end_date || p.end_date >= hoyTxt || p.status === 'completado' || p.status === 'cancelado') continue;
    const n = dias(p.end_date, hoy);
    out.push({
      id: `proy-${p.id}`, tipo: 'proyecto', nivel: 'rojo', dias: n ?? 0,
      titulo: p.name || 'Proyecto', detalle: `Debía acabar el ${p.end_date} · ${p.status || ''}`.trim(),
      contactId: p.contact_id, contactName: p.contact_name, pagina: 'Projects', mensaje: null,
      acciones: [
        cambio('completar', 'Marcar completado', 'Project', p.id, { status: 'completado' }),
        ...(p.status !== 'pausado' ? [cambio('pausar', 'Pausar', 'Project', p.id, { status: 'pausado' })] : []),
        cambio('anular', 'Cancelar proyecto', 'Project', p.id, { status: 'cancelado' }, { confirmar: `¿Cancelar el proyecto «${p.name || ''}»?`, peligro: true }),
      ],
    });
  }

  for (const o of opiniones) {
    out.push({
      id: `op-${o.id}`, tipo: 'opinion', nivel: 'naranja', dias: 0,
      titulo: `${o.contact_name || 'Cliente'} quiere cambiar su decisión`, detalle: `${o.doc_type || 'Documento'} Nº${o.doc_number || ''} · ${euros(o.total)}${o.request_datetime ? ` · ${o.request_datetime}` : ''}`,
      contactId: o.contact_id, contactName: o.contact_name, telefono: o.contact_phone, pagina: 'Documents?type=presupuesto',
      mensaje: (c) => `Hola ${c}, vi que solicitaste cambiar tu decisión sobre el presupuesto Nº${o.doc_number}. ¿Cuál es tu nueva decisión?`,
      acciones: [cambio('atendido', 'Marcar atendido', 'ChangeOpinionRequest', o.id, { status: 'atendido' })],
    });
  }

  return out.sort((x, y) => PESO[x.nivel] - PESO[y.nivel] || y.dias - x.dias);
}

/** Filtra por tipo, por lo que se escribe y por anulados. */
export function filtrarAvisos(avisos, { tipo = '', texto = '', anulados = [], verAnulados = false } = {}) {
  const q = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const fuera = new Set(anulados);
  return avisos.filter((a) => {
    if (verAnulados ? !fuera.has(a.id) : fuera.has(a.id)) return false;
    if (tipo && a.tipo !== tipo) return false;
    if (!q) return true;
    return `${a.titulo} ${a.detalle}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(q);
  });
}

/** Cuántos avisos hay de cada tipo (sin contar los anulados). */
export function contarPorTipo(avisos, anulados = []) {
  const fuera = new Set(anulados); const c = {};
  for (const a of avisos) if (!fuera.has(a.id)) c[a.tipo] = (c[a.tipo] || 0) + 1;
  return c;
}
