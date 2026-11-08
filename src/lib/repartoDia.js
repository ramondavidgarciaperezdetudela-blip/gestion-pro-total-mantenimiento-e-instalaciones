/**
 * repartoDia.js — Convierte los avisos del SAT en lo que pinta el tablero del
 * reparto (carriles por técnico) y decide a quién se asigna cada trabajo.
 */

export const HORA_INICIO = 7;
export const HORA_FIN = 20;

const aMin = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
const aHora = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const norm = (t) => String(t || '').trim().toLowerCase();

/** Técnicos de la empresa + los que solo aparecen escritos en algún aviso. */
export function tecnicosDelReparto(tecnicosEmpresa = [], avisos = []) {
  const lista = [];
  const vistos = new Set();
  const poner = (nombre, extra = {}) => {
    const k = norm(nombre);
    if (!k || vistos.has(k)) return;
    vistos.add(k);
    lista.push({ id: 'tec-' + k, nombre: String(nombre).trim(), ...extra });
  };
  tecnicosEmpresa.forEach((t) => poner(t.name, {
    oficio: [t.fgas_carnet && 'F-Gas', t.rite_certificate && 'RITE'].filter(Boolean).join(' · ') || 'Técnico',
  }));
  avisos.forEach((a) => poner(a.technician, { oficio: 'Técnico' }));
  return lista.map((t, i) => ({ ...t, designacion: '-K' + (i + 1) }));
}

const estadoDe = (a) => {
  if (a.status === 'completada') return 'cerrado';
  if (a.priority === 'urgente' || a.type === 'urgencia') return 'urgente';
  if (a.status === 'en_curso') return 'curso';
  return 'pendiente';
};

/**
 * Avisos → trabajos del tablero.
 * Los que no traen hora se colocan seguidos en el carril de su técnico, a
 * partir de las 08:00; los que no tienen técnico quedan «por asignar».
 */
export function trabajosDelReparto(avisos, tecnicos) {
  const porNombre = new Map(tecnicos.map((t) => [norm(t.nombre), t.id]));
  const siguiente = new Map(); // tecnicoId (o 'libre') → minuto libre
  const salida = [];
  let n = 0;
  const ordenados = [...avisos].sort((a, b) => String(a.scheduled_time || '99').localeCompare(String(b.scheduled_time || '99')));
  for (const a of ordenados) {
    n += 1;
    const tecnicoId = porNombre.get(norm(a.technician)) || null;
    const clave = tecnicoId || 'libre';
    const horas = Number(a.labor_hours) > 0 ? Number(a.labor_hours) : 1;
    const dur = Math.max(30, Math.round(horas * 60 / 30) * 30);
    let ini;
    if (a.scheduled_time && /^\d{1,2}:\d{2}/.test(a.scheduled_time)) ini = aMin(a.scheduled_time);
    else ini = siguiente.get(clave) ?? 8 * 60;
    ini = Math.max(HORA_INICIO * 60, Math.min(ini, HORA_FIN * 60 - 30));
    let fin = Math.min(ini + dur, HORA_FIN * 60);
    if (fin <= ini) fin = ini + 30;
    siguiente.set(clave, Math.max(siguiente.get(clave) ?? 0, fin));
    salida.push({
      id: a.id,
      tecnicoId,
      designacion: '-Q' + n,
      titulo: [a.contact_name, a.description].filter(Boolean).join(' · ') || 'Aviso sin descripción',
      codigo: a.order_number || a.equipment_model || '',
      requisito: a.equipment_type && a.equipment_type !== 'otro' ? String(a.equipment_type).replace(/_/g, ' ') : (a.type || ''),
      inicio: aHora(ini),
      fin: aHora(fin),
      estado: estadoDe(a),
    });
  }
  return salida;
}

/** Qué cambios de un aviso corresponden a soltarlo en el carril de un técnico. */
export function cambiosAlAsignar(aviso, tecnico, dia) {
  const cambios = { technician: tecnico ? tecnico.nombre : '' };
  if (tecnico && !aviso.scheduled_date) cambios.scheduled_date = dia;
  return cambios;
}
