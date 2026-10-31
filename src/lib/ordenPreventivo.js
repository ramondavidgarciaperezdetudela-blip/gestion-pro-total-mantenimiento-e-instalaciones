/**
 * ordenPreventivo.js — órdenes de trabajo de mantenimiento preventivo.
 * Calcula qué máquinas toca revisar, su lista de tareas según el tipo (con el
 * control de fugas de gas fluorado cuando es obligatorio) y construye la orden.
 */
import { calcularFgas } from './maquinaFgas.js';

const hoyISO = () => new Date().toISOString().slice(0, 10);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const sumarDias = (iso, dias) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + dias); return d.toISOString().slice(0, 10); };
export const diasHasta = (iso, hoy = hoyISO()) => (ISO.test(iso || '') ? Math.round((Date.parse(`${iso}T12:00:00`) - Date.parse(`${hoy}T12:00:00`)) / 86400000) : null);

const FRIO = [
  'Limpiar batería del condensador y comprobar el ventilador',
  'Limpiar o sustituir filtros de aire y revisar el evaporador',
  'Medir presiones de alta y baja, recalentamiento y subenfriamiento',
  'Comprobar consumo del compresor frente a la placa (RLA)',
  'Revisar aislamiento de tuberías y estado de la línea de líquido',
  'Comprobar apriete de bornes y protecciones eléctricas',
];
const POR_TIPO = {
  aire_acondicionado: [...FRIO, 'Comprobar desagüe de condensados y bandeja', 'Verificar mando, sondas y modos de funcionamiento'],
  bomba_calor: [...FRIO, 'Comprobar ciclo de desescarche e inversión de ciclo', 'Revisar circuito hidráulico: presión, purga y vaso de expansión'],
  aerotermia: [...FRIO, 'Comprobar ciclo de desescarche', 'Revisar circuito hidráulico: presión, purga y vaso de expansión', 'Verificar curva de calefacción y sondas'],
  camara_frigorifica: [...FRIO, 'Comprobar felpudos y juntas de puerta', 'Verificar resistencia de desagüe y desescarche', 'Contrastar sonda de temperatura y alarma'],
  grupo_frio: [...FRIO, 'Revisar nivel y aspecto del aceite', 'Comprobar presostatos y válvulas de seguridad'],
  ventilacion: ['Limpiar o sustituir filtros', 'Revisar correas, rodamientos y equilibrado de ventiladores', 'Comprobar caudales y compuertas', 'Revisar bandeja de condensados'],
  caldera: ['Analizar la combustión (CO, CO₂, rendimiento)', 'Limpiar quemador, intercambiador y electrodos', 'Comprobar presión del circuito y vaso de expansión', 'Verificar seguridades y evacuación de humos', 'Revisar válvula de seguridad y bombas'],
  solar_fotovoltaico: ['Inspección visual de paneles, estructura y cableado', 'Limpiar paneles si hay suciedad', 'Medir tensión y corriente de cada string', 'Revisar inversor, ventilación y registros de fallos', 'Comprobar protecciones, tierra y apriete de conexiones'],
  solar_termico: ['Revisar paneles, aislamiento y estructura', 'Comprobar presión, purga y estado del fluido caloportador', 'Verificar bomba, vaso de expansión y válvulas', 'Comprobar sondas y centralita'],
  electrico_cuadro: ['Termografía o inspección de calentamientos en bornes', 'Reapriete de conexiones', 'Probar diferenciales y magnetotérmicos', 'Medir aislamiento y toma de tierra', 'Limpieza interior y revisión de etiquetado'],
  otro: ['Inspección general del equipo', 'Comprobar funcionamiento y seguridades', 'Limpieza y engrase de puntos de desgaste'],
};
const EQUIPO_SAT = { aire_acondicionado: 'aire_acondicionado', bomba_calor: 'bomba_calor', aerotermia: 'bomba_calor', camara_frigorifica: 'camara_frigorifica', grupo_frio: 'camara_frigorifica', electrico_cuadro: 'electrico', solar_fotovoltaico: 'solar', solar_termico: 'solar' };
export const equipoSAT = (tipo) => EQUIPO_SAT[tipo] || 'otro';

/** Lista de tareas de la máquina; añade el control de fugas si el gas lo exige. */
export function checklistDe(m = {}) {
  const tareas = [...(POR_TIPO[m.machine_type] || POR_TIPO.otro)];
  if (!m.refrigerant_type && !m.refrigerant_charge_kg) return tareas;
  const f = calcularFgas(m);
  if (f.control.estado === 'si') tareas.push(`Control de fugas de gas fluorado (${f.control.texto}) y anotar en el libro de registro`);
  else tareas.push('Inspección visual de fugas (aceite, burbujas, manchas) en uniones y válvulas');
  return tareas;
}

/**
 * Estado de cada máquina frente a su periodicidad.
 * @returns {{maquina:object, proxima:string|null, dias:number|null, estado:'vencida'|'proxima'|'ok'|'sin-datos'}[]}
 * Orden: más urgentes primero. `ventana` = días para considerar «próxima».
 */
export function pendientes(maquinas = [], hoy = hoyISO(), ventana = 30) {
  const peso = { vencida: 0, proxima: 1, ok: 2, 'sin-datos': 3 };
  return maquinas
    .filter((m) => m.status !== 'baja' && m.status !== 'fuera_servicio')
    .map((maquina) => {
      const dias0 = Number(maquina.maintenance_days);
      const proxima = ISO.test(maquina.last_maintenance_date || '') && dias0 > 0 ? sumarDias(maquina.last_maintenance_date, dias0) : null;
      const dias = proxima ? diasHasta(proxima, hoy) : null;
      const estado = dias === null ? 'sin-datos' : dias < 0 ? 'vencida' : dias <= ventana ? 'proxima' : 'ok';
      return { maquina, proxima, dias, estado };
    })
    .sort((a, b) => peso[a.estado] - peso[b.estado] || (a.dias ?? 9999) - (b.dias ?? 9999));
}

/** Orden de trabajo lista para imprimir o guardar como SATOrder. */
export function construirOrden({ maquina, contacto, fecha, tecnico = '', zona = null }) {
  const nombre = contacto ? `${contacto.name || ''} ${contacto.surname || ''}`.trim() || contacto.company_name || '' : maquina.contact_name || '';
  const f = calcularFgas(maquina);
  return {
    cliente: nombre,
    contact_id: maquina.contact_id || contacto?.id || '',
    direccion: [contacto?.address, contacto?.postal_code, contacto?.city].filter(Boolean).join(', '),
    fecha: fecha || hoyISO(),
    tecnico,
    equipo: [maquina.name, maquina.brand, maquina.model].filter(Boolean).join(' · ') || 'Equipo',
    serie: maquina.serial_number || '',
    ubicacion: maquina.location || '',
    tipo: maquina.machine_type || 'otro',
    gas: maquina.refrigerant_type ? `${maquina.refrigerant_type}${maquina.refrigerant_charge_kg ? ` · ${maquina.refrigerant_charge_kg} kg` : ''}${f.tCO2 ? ` · ${String(f.tCO2).replace('.', ',')} t CO₂e` : ''}` : '',
    zona: zona ? `${zona.zona} (${zona.capital})` : '',
    tareas: checklistDe(maquina),
  };
}

/** Campos de SATOrder para una orden (sin número: lo asigna quien guarda). */
export function ordenASAT(o) {
  return {
    contact_id: o.contact_id, contact_name: o.cliente, date: o.fecha, scheduled_date: o.fecha,
    type: 'mantenimiento', priority: 'normal', equipment_type: equipoSAT(o.tipo), technician: o.tecnico,
    description: `Mantenimiento preventivo — ${o.equipo}${o.serie ? ` (S/N ${o.serie})` : ''}`,
    notes: o.tareas.map((t, i) => `${i + 1}. ${t}`).join('\n'),
  };
}
