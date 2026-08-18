/**
 * availability.js — Cálculo de huecos libres de la agenda.
 *
 * Se mantiene aparte de la pantalla y sin dependencias de React para poder
 * razonar (y probar) el cálculo por su cuenta: qué días se trabaja, qué horas,
 * y qué huecos quedan libres una vez descontadas las citas y las órdenes SAT
 * ya programadas.
 *
 * Todas las horas se manejan como minutos desde medianoche, que evita los
 * líos de comparar cadenas "09:00" con "9:00".
 */

/** Configuración por defecto si la empresa no ha definido la suya. */
export const HORARIO_POR_DEFECTO = {
  // 1 = lunes … 7 = domingo (como getDay pero con domingo al final)
  dias_laborables: [1, 2, 3, 4, 5],
  hora_inicio: '09:00',
  hora_fin: '18:00',
  // Pausa del mediodía. Dejar descanso_inicio vacío para no tener pausa.
  descanso_inicio: '14:00',
  descanso_fin: '15:00',
  // Duración de cada hueco, en minutos.
  duracion_cita: 60,
  // Días de antelación que se muestran.
  dias_vista: 14,
};

/** "09:30" → 570 */
export function aMinutos(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

/** 570 → "09:30" */
export function aHora(minutos) {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Día de la semana 1..7 (lunes..domingo) de una fecha 'yyyy-MM-dd'. */
export function diaSemana(fechaISO) {
  const [a, m, d] = fechaISO.split('-').map(Number);
  const js = new Date(a, m - 1, d).getDay(); // 0=domingo
  return js === 0 ? 7 : js;
}

/** Fecha 'yyyy-MM-dd' de hoy más `n` días. */
export function fechaISO(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Convierte citas y órdenes SAT en tramos ocupados de un día concreto.
 *
 * Las canceladas no ocupan: si una cita se anula, su hueco vuelve a estar
 * disponible, que es justo lo que se espera al mirar la disponibilidad.
 *
 * @param {string} fecha 'yyyy-MM-dd'
 * @param {Array} citas    entidades Appointment
 * @param {Array} ordenes  entidades SATOrder
 * @param {number} duracionPorDefecto minutos que se asume si no hay hora fin
 * @returns {Array<{inicio:number, fin:number, titulo:string}>}
 */
export function tramosOcupados(fecha, citas = [], ordenes = [], duracionPorDefecto = 60) {
  const ocupados = [];

  for (const c of citas) {
    if (c?.date !== fecha) continue;
    if (c?.status === 'cancelada') continue;
    const inicio = aMinutos(c.time_start);
    if (inicio === null) continue;
    const fin = aMinutos(c.time_end) ?? inicio + duracionPorDefecto;
    ocupados.push({
      inicio,
      fin: Math.max(fin, inicio + 15),
      titulo: c.title || c.contact_name || 'Cita',
    });
  }

  for (const o of ordenes) {
    if (o?.scheduled_date !== fecha) continue;
    if (o?.status === 'cancelada' || o?.status === 'completada') continue;
    const inicio = aMinutos(o.scheduled_time);
    if (inicio === null) continue;
    ocupados.push({
      inicio,
      fin: inicio + duracionPorDefecto,
      titulo: `Orden SAT ${o.order_number || ''} · ${o.contact_name || ''}`.trim(),
    });
  }

  return ocupados.sort((a, b) => a.inicio - b.inicio);
}

/**
 * Genera los huecos de un día, marcando cuáles están libres.
 *
 * @param {string} fecha 'yyyy-MM-dd'
 * @param {object} horario  ver HORARIO_POR_DEFECTO
 * @param {Array} citas
 * @param {Array} ordenes
 * @param {Date} [ahora] para no ofrecer horas que ya han pasado
 * @returns {{laborable:boolean, huecos:Array}}
 */
export function huecosDelDia(fecha, horario, citas = [], ordenes = [], ahora = new Date()) {
  const cfg = { ...HORARIO_POR_DEFECTO, ...(horario || {}) };
  const laborable = (cfg.dias_laborables || []).includes(diaSemana(fecha));
  if (!laborable) return { laborable: false, huecos: [] };

  const inicioJornada = aMinutos(cfg.hora_inicio) ?? 540;
  const finJornada = aMinutos(cfg.hora_fin) ?? 1080;
  const duracion = Number(cfg.duracion_cita) || 60;
  const descansoIni = cfg.descanso_inicio ? aMinutos(cfg.descanso_inicio) : null;
  const descansoFin = cfg.descanso_fin ? aMinutos(cfg.descanso_fin) : null;

  const ocupados = tramosOcupados(fecha, citas, ordenes, duracion);
  const esHoy = fecha === fechaISO(0);
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  const huecos = [];
  for (let t = inicioJornada; t + duracion <= finJornada; t += duracion) {
    const fin = t + duracion;

    // Pausa del mediodía: el hueco se descarta si se solapa con ella.
    const enDescanso = descansoIni !== null && descansoFin !== null &&
      t < descansoFin && fin > descansoIni;
    if (enDescanso) continue;

    // Un hueco está ocupado si se solapa con cualquier tramo, aunque sea en parte.
    const choque = ocupados.find(o => t < o.fin && fin > o.inicio);
    // No ofrecer horas ya pasadas del día de hoy.
    const pasado = esHoy && fin <= minutosAhora;

    huecos.push({
      inicio: aHora(t),
      fin: aHora(fin),
      libre: !choque && !pasado,
      motivo: choque ? choque.titulo : (pasado ? 'Hora ya pasada' : null),
    });
  }

  return { laborable: true, huecos };
}

/**
 * Disponibilidad de los próximos días.
 * @returns {Array<{fecha:string, laborable:boolean, huecos:Array, libres:number}>}
 */
export function disponibilidadProximosDias(horario, citas = [], ordenes = [], ahora = new Date()) {
  const cfg = { ...HORARIO_POR_DEFECTO, ...(horario || {}) };
  const dias = [];
  for (let i = 0; i < (Number(cfg.dias_vista) || 14); i++) {
    const fecha = fechaISO(i);
    const { laborable, huecos } = huecosDelDia(fecha, cfg, citas, ordenes, ahora);
    dias.push({
      fecha,
      laborable,
      huecos,
      libres: huecos.filter(h => h.libre).length,
    });
  }
  return dias;
}
