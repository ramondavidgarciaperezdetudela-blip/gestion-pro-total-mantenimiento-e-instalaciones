/**
 * avisoServidor.js — Que un guardado que falla NO pase desapercibido.
 *
 * El problema que arregla esto: al darle a "Guardar" en una ficha, si el
 * servidor rechazaba el cambio (sin cobertura, la cuenta sin créditos, un
 * dato que no admite...) no pasaba absolutamente nada. Ni se guardaba ni se
 * decía. El error se quedaba en la consola, que nadie mira.
 *
 * Aquí está la parte que no depende de React ni del navegador, para poder
 * comprobarla de verdad: cómo se traduce un error del servidor a algo que se
 * entienda, y el aviso que recoge la pantalla.
 */

/** Operaciones que cambian datos. Son las que no pueden fallar en silencio. */
export const METODOS_QUE_GUARDAN = [
  'create', 'update', 'delete', 'deleteMany', 'bulkCreate', 'bulkUpdate', 'updateMany',
];

/** Cómo llamar a cada operación al contárselo al usuario. */
const VERBO = {
  create: 'crear',
  bulkCreate: 'crear',
  update: 'guardar los cambios de',
  bulkUpdate: 'guardar los cambios de',
  updateMany: 'guardar los cambios de',
  delete: 'borrar',
  deleteMany: 'borrar',
};

/** Nombres de las secciones en cristiano. Lo que no esté aquí sale tal cual. */
const NOMBRES = {
  Contact: 'el cliente',
  Invoice: 'la factura',
  SATOrder: 'el parte de SAT',
  Appointment: 'la cita',
  Project: 'el proyecto',
  StockItem: 'el artículo',
  Supplier: 'el proveedor',
  SupplierPrice: 'el precio de proveedor',
  SupplierCatalog: 'el catálogo de proveedor',
  Equipment: 'la máquina',
  EquipmentDiary: 'el diario de la máquina',
  EquipmentFailure: 'la avería',
  MaintenanceSheet: 'la hoja de mantenimiento',
  Note: 'la nota',
  PriceItem: 'el precio',
  LineTemplate: 'la plantilla de líneas',
  DocumentTemplate: 'la plantilla de documento',
  CompanySettings: 'los datos de la empresa',
  SystemSettings: 'la configuración',
  SATChatMessage: 'el mensaje',
  ThermalCalculation: 'el cálculo térmico',
  SolarCalculation: 'el cálculo solar',
};

export function nombreDeSeccion(entidad) {
  return NOMBRES[entidad] || `«${entidad}»`;
}

/** Qué se estaba intentando hacer, en una frase. */
export function queSeIntentaba(entidad, metodo) {
  return `No se ha podido ${VERBO[metodo] || 'guardar'} ${nombreDeSeccion(entidad)}`;
}

/**
 * Traduce el error del servidor a algo que se pueda leer y, sobre todo, que
 * diga qué hacer. Un "Request failed with status code 429" no le sirve a
 * nadie que esté en un tejado con el móvil.
 */
export function motivoDelFallo(err) {
  const estado = err?.status ?? err?.response?.status ?? null;
  const detalle = err?.data?.detail || err?.data?.message || err?.message || '';

  if (estado === null || estado === undefined) {
    if (/network|failed to fetch|timeout|abort|ERR_/i.test(detalle)) {
      return 'No hay conexión con el servidor. Comprueba la cobertura y vuelve a darle a guardar; lo que has escrito sigue aquí.';
    }
    return detalle || 'No se ha podido contactar con el servidor.';
  }
  if (estado === 401 || estado === 403) {
    return 'El servidor no ha aceptado el cambio: la sesión ha caducado o la cuenta no tiene permiso para guardar. Vuelve a entrar en la aplicación.';
  }
  if (estado === 402) {
    return 'La cuenta de Base44 no admite más cambios ahora mismo (créditos agotados o suscripción caducada).';
  }
  if (estado === 404) {
    return 'El registro ya no existe en el servidor: puede que lo haya borrado otro dispositivo.';
  }
  if (estado === 409) {
    return 'Ya hay otro registro igual en el servidor.';
  }
  if (estado === 413) {
    return 'El contenido es demasiado grande para el servidor. Si lleva fotos o documentos, quita alguno o súbelo aparte.';
  }
  if (estado === 429) {
    return 'El servidor está recibiendo demasiadas peticiones seguidas. Espera unos segundos y vuelve a darle a guardar.';
  }
  if (estado === 400 || estado === 422) {
    return `Hay algún dato que el servidor no admite${detalle ? `: ${detalle}` : '.'}`;
  }
  if (estado >= 500) {
    return 'El servidor ha dado un error. No es cosa tuya: espera un momento y vuelve a intentarlo.';
  }
  return detalle || `El servidor ha respondido con un error (${estado}).`;
}

/** ¿Merece la pena reintentarlo solo, sin preguntar? */
export function sePuedeReintentarSolo(err) {
  // SOLO cuando el servidor ha dicho expresamente "vas muy rápido". En ese
  // caso se sabe que NO ha llegado a guardar nada. Con un fallo de red no se
  // sabe si llegó o no, y reintentar un alta crearía un duplicado: por eso
  // ahí se avisa y se deja que decida la persona.
  const estado = err?.status ?? err?.response?.status ?? null;
  return estado === 429;
}

// ── Lo que no es una ficha: funciones del servidor y subidas de archivos ───

/** Operaciones de integración que, si fallan, dejan algo a medias. */
export const INTEGRACIONES_VIGILADAS = [
  'UploadFile', 'UploadPrivateFile', 'SendEmail', 'CreateFileSignedUrl',
];

/** Qué hace cada función del servidor, dicho de forma que se entienda. */
const FUNCIONES = {
  aceptarPresupuesto: 'aceptar el presupuesto',
  aceptarSAT: 'aceptar el parte de SAT',
  appointmentReminder: 'enviar los recordatorios de citas',
  avisoNuevaCita: 'avisar de la nueva cita',
  downloadLegalDocuments: 'descargar los documentos legales',
  enviarCopiaFirmada: 'enviar la copia firmada',
  enviarCopiaFirmadaSAT: 'enviar la copia firmada del parte',
  getPresupuestoPublico: 'abrir el presupuesto',
  getSATPublico: 'abrir el parte de SAT',
  sendLegalDocEmail: 'enviar el documento por correo',
  soporteEmail: 'enviar el mensaje a soporte',
  stockDiscount: 'descontar del almacén',
  updateSupplierPricesOnline: 'actualizar los precios del proveedor',
  verificarDocumento: 'verificar el documento',
};

const INTEGRACIONES = {
  UploadFile: 'subir el archivo',
  UploadPrivateFile: 'subir el archivo',
  SendEmail: 'enviar el correo',
  CreateFileSignedUrl: 'preparar la descarga del archivo',
};

export function queSeIntentabaFuera(nombre) {
  const que = FUNCIONES[nombre] || INTEGRACIONES[nombre];
  return que ? `No se ha podido ${que}` : `No se ha podido completar «${nombre}»`;
}

// ── El aviso que recoge la pantalla ────────────────────────────────────────
const oyentes = new Set();
let actual = null;
let contador = 0;

export function escucharAvisos(fn) {
  oyentes.add(fn);
  fn(actual);
  return () => oyentes.delete(fn);
}

export function avisarDeFallo({ entidad, metodo, funcion, error }) {
  actual = {
    id: ++contador,
    titulo: funcion ? queSeIntentabaFuera(funcion) : queSeIntentaba(entidad, metodo),
    motivo: motivoDelFallo(error),
    entidad,
    metodo,
    funcion,
  };
  oyentes.forEach((fn) => fn(actual));
  return actual;
}

export function cerrarAviso() {
  actual = null;
  oyentes.forEach((fn) => fn(null));
}

export function avisoActual() { return actual; }
