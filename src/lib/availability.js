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

/**
 * Tipos de trabajo, con las horas que se reservan por defecto.
 *
 * No todos los trabajos ocupan lo mismo: un montaje se lleva la mañana entera
 * y una revisión que no toca nada se hace en un par de horas. Reservar todo
 * con la misma duración es lo que hace que luego no cuadre la agenda.
 *
 * `horas` es lo que se propone al elegirlo; siempre se puede cambiar a mano
 * antes de reservar, porque cada trabajo es un mundo.
 * `minimo` es lo que no conviene bajar para ese trabajo (solo avisa).
 * `bloquea` marca lo que NO es un cliente: son horas propias que se apartan
 * para que no se ofrezcan a nadie.
 */
export const TIPOS_TRABAJO = [
  { id: 'montaje_aire', nombre: 'Montaje de aire acondicionado', horas: 5, minimo: 4, tipoAgenda: 'instalacion' },
  { id: 'montaje_multi', nombre: 'Montaje multisplit (varias interiores)', horas: 8, minimo: 6, tipoAgenda: 'instalacion' },
  { id: 'instalacion_camara', nombre: 'Instalación de cámara frigorífica', horas: 8, minimo: 6, tipoAgenda: 'instalacion' },
  { id: 'revision', nombre: 'Revisión normal (sin modificar nada)', horas: 2, minimo: 1, tipoAgenda: 'revision' },
  { id: 'mantenimiento', nombre: 'Mantenimiento preventivo', horas: 2, minimo: 1, tipoAgenda: 'mantenimiento' },
  { id: 'limpieza', nombre: 'Limpieza de equipo', horas: 2, minimo: 1, tipoAgenda: 'mantenimiento' },
  { id: 'reparacion', nombre: 'Reparación / avería', horas: 3, minimo: 2, tipoAgenda: 'reparacion' },
  { id: 'urgencia', nombre: 'Urgencia', horas: 3, minimo: 1, tipoAgenda: 'reparacion' },
  { id: 'carga_gas', nombre: 'Carga de gas / busca de fugas', horas: 3, minimo: 2, tipoAgenda: 'reparacion' },
  { id: 'puesta_marcha', nombre: 'Puesta en marcha', horas: 3, minimo: 2, tipoAgenda: 'instalacion' },
  { id: 'desmontaje', nombre: 'Desmontaje / retirada de equipo', horas: 3, minimo: 2, tipoAgenda: 'otro' },
  { id: 'visita_presupuesto', nombre: 'Visita para presupuesto', horas: 1, minimo: 1, tipoAgenda: 'presupuesto' },
  { id: 'otro', nombre: 'Otro trabajo', horas: 2, minimo: 1, tipoAgenda: 'otro' },
  // Horas propias: no son clientes, solo apartan tiempo de la agenda.
  { id: 'universidad', nombre: 'Universidad / formación', horas: 4, minimo: 1, tipoAgenda: 'otro', bloquea: true },
  { id: 'bloqueo', nombre: 'Bloquear horas (no disponible)', horas: 2, minimo: 1, tipoAgenda: 'otro', bloquea: true },
];

/** Busca un tipo de trabajo por su identificador. */
export function tipoTrabajo(id) {
  return TIPOS_TRABAJO.find(t => t.id === id) || TIPOS_TRABAJO.find(t => t.id === 'otro');
}

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
export function huecosDelDia(fecha, horario, citas = [], ordenes = [], ahora = new Date(), minutosTrabajo = null) {
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

    const hueco = {
      inicio: aHora(t),
      fin: aHora(fin),
      libre: !choque && !pasado,
      motivo: choque ? choque.titulo : (pasado ? 'Hora ya pasada' : null),
    };

    // Si se ha elegido un trabajo concreto, se mira si cabe entero empezando
    // aquí: de nada sirve que la hora esté libre si el montaje son 5 horas y
    // a las dos horas ya hay otro cliente apuntado.
    if (minutosTrabajo) {
      const r = cabeTrabajo(fecha, hueco.inicio, minutosTrabajo, cfg, citas, ordenes);
      hueco.cabeTrabajo = hueco.libre && !pasado && r.cabe;
      hueco.finTrabajo = r.fin;
      hueco.cruzaDescanso = r.cruzaDescanso;
      hueco.terminaTarde = r.terminaTarde;
      if (hueco.libre && !r.cabe) hueco.motivo = r.motivo;
    }

    huecos.push(hueco);
  }

  return { laborable: true, huecos };
}

/**
 * ¿Cabe un trabajo de N minutos empezando a esa hora?
 *
 * Aquí NO se mira la rejilla de huecos, se miran los tramos ocupados de
 * verdad. La diferencia importa: un montaje de 5 horas que empieza a las 11
 * pasa por encima de la hora de comer, y en la rejilla eso serían huecos
 * "inexistentes". En la obra no se para a mitad de un montaje, así que la
 * comida y la hora de salida NO impiden reservar: solo se avisa.
 *
 * Lo único que de verdad impide reservar es pisar otro trabajo ya apuntado.
 *
 * @returns {{cabe:boolean, motivo:string|null, fin:string,
 *            cruzaDescanso:boolean, terminaTarde:boolean, empiezaAntes:boolean}}
 */
export function cabeTrabajo(fecha, horaInicio, minutosTrabajo, horario, citas = [], ordenes = []) {
  const cfg = { ...HORARIO_POR_DEFECTO, ...(horario || {}) };
  const inicio = aMinutos(horaInicio);
  const minutos = Number(minutosTrabajo) || 60;

  if (inicio === null) {
    return { cabe: false, motivo: 'Hora de inicio no válida', fin: '', cruzaDescanso: false, terminaTarde: false, empiezaAntes: false };
  }

  const fin = inicio + minutos;
  const ocupados = tramosOcupados(fecha, citas, ordenes, Number(cfg.duracion_cita) || 60);

  // Lo único que bloquea: pisar algo ya apuntado.
  const choque = ocupados.find(o => inicio < o.fin && fin > o.inicio);
  if (choque) {
    return {
      cabe: false,
      motivo: `Se solapa con: ${choque.titulo} (${aHora(choque.inicio)}–${aHora(choque.fin)})`,
      fin: aHora(fin),
      cruzaDescanso: false, terminaTarde: false, empiezaAntes: false,
    };
  }

  const descansoIni = cfg.descanso_inicio ? aMinutos(cfg.descanso_inicio) : null;
  const descansoFin = cfg.descanso_fin ? aMinutos(cfg.descanso_fin) : null;
  const cruzaDescanso = descansoIni !== null && descansoFin !== null &&
    inicio < descansoFin && fin > descansoIni;

  return {
    cabe: true,
    motivo: null,
    fin: aHora(fin),
    cruzaDescanso,
    terminaTarde: fin > (aMinutos(cfg.hora_fin) ?? 1080),
    empiezaAntes: inicio < (aMinutos(cfg.hora_inicio) ?? 540),
  };
}

/**
 * Disponibilidad de los próximos días.
 * @returns {Array<{fecha:string, laborable:boolean, huecos:Array, libres:number}>}
 */
export function disponibilidadProximosDias(horario, citas = [], ordenes = [], ahora = new Date(), minutosTrabajo = null) {
  const cfg = { ...HORARIO_POR_DEFECTO, ...(horario || {}) };
  const dias = [];
  for (let i = 0; i < (Number(cfg.dias_vista) || 14); i++) {
    const fecha = fechaISO(i);
    const { laborable, huecos } = huecosDelDia(fecha, cfg, citas, ordenes, ahora, minutosTrabajo);
    dias.push({
      fecha,
      laborable,
      huecos,
      libres: huecos.filter(h => h.libre).length,
      // Cuántas horas de este día admiten el trabajo elegido entero.
      caben: minutosTrabajo ? huecos.filter(h => h.cabeTrabajo).length : null,
    });
  }
  return dias;
}
