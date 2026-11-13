import { esMarcadorAutomatico } from './notasInformativas.js';

/**
 * plantillasNotas.js — notas informativas «de modelo», sin IA ni internet.
 *
 * Cuando la IA no responde (no hay clave, no hay conexión o Ollama no está
 * encendido) siempre hay un texto estándar con el que empezar. Los huecos que
 * hay que rellenar van entre [corchetes] para que se vean y no se mande la
 * nota sin completarlos (`huecosSinRellenar`).
 */
export const PLANTILLAS = [
  {
    id: 'vacaciones', titulo: 'Cierre por vacaciones',
    palabras: ['vacaciones', 'cierre', 'cerramos', 'agosto', 'navidad', 'festivo', 'puente', 'descanso'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nLe informamos de que [nombre de tu empresa] permanecerá cerrada por vacaciones del [FECHA DE INICIO] al [FECHA DE FIN], ambos inclusive. Retomaremos la actividad con normalidad el [FECHA DE VUELTA].\n\nPara averías urgentes durante ese periodo puede contactar con nosotros en el [TELÉFONO DE URGENCIAS].\n\nLe recomendamos adelantar cualquier revisión o intervención que tenga prevista. Gracias por su confianza.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'horario', titulo: 'Cambio de horario de atención',
    palabras: ['horario', 'horarios', 'atencion', 'atención', 'abrimos', 'turno', 'jornada'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nA partir del [FECHA DEL CAMBIO] nuestro horario de atención será de [HORARIO]. El servicio de urgencias se mantiene en el [TELÉFONO DE URGENCIAS].\n\nSentimos las molestias que pueda ocasionarle y quedamos a su disposición para cualquier consulta.\n\nGracias por su confianza.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'precios', titulo: 'Actualización de tarifas',
    palabras: ['precio', 'precios', 'tarifa', 'tarifas', 'subida', 'incremento', 'ipc', 'coste', 'costes'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nDebido al aumento de los costes de materiales y mano de obra, a partir del [FECHA DEL CAMBIO] actualizaremos nuestras tarifas en un [PORCENTAJE]%. Los trabajos presupuestados antes de esa fecha mantienen el precio acordado durante [PLAZO DE VALIDEZ].\n\nSi desea consultar la nueva tarifa o tiene cualquier duda, estaremos encantados de atenderle.\n\nGracias por su comprensión.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'mantenimiento', titulo: 'Recordatorio de revisión y mantenimiento',
    palabras: ['mantenimiento', 'revision', 'revisión', 'revisiones', 'preventivo', 'filtros', 'limpieza', 'campaña', 'campana', 'aire', 'caldera', 'rite'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nLe recordamos que sus instalaciones requieren revisiones periódicas para garantizar su seguridad, su buen rendimiento y el cumplimiento de la normativa vigente. Un mantenimiento preventivo evita averías, reduce el consumo y alarga la vida de los equipos.\n\nSi aún no tiene programada su revisión de [EQUIPO O INSTALACIÓN], puede solicitarla en el [TELÉFONO] o respondiendo a este mensaje, y le propondremos fecha.\n\nGracias por confiar en [nombre de tu empresa].\n\nUn saludo,\n[Tu nombre]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'gases', titulo: 'Normativa de gases refrigerantes',
    palabras: ['gas', 'gases', 'refrigerante', 'refrigerantes', 'fgas', 'f-gas', 'normativa', 'reglamento', 'fugas', 'libro'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nLe informamos de que la normativa sobre gases fluorados exige controles de fugas periódicos y el registro de las intervenciones en el libro de la instalación, según la cantidad de refrigerante y el tipo de equipo. El incumplimiento puede conllevar sanciones para el titular.\n\nPodemos revisar si sus equipos están al día y realizar los controles necesarios. Contacte con nosotros en el [TELÉFONO] para programarlo.\n\nGracias por su atención.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'corte', titulo: 'Aviso de interrupción del servicio',
    palabras: ['corte', 'interrupcion', 'interrupción', 'parada', 'suministro', 'electricidad', 'agua', 'obras', 'intervencion', 'intervención'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nLe avisamos de que el [FECHA DEL CAMBIO], de [HORA DE INICIO] a [HORA DE FIN], será necesario interrumpir [SERVICIO O SUMINISTRO] para realizar [MOTIVO DE LA INTERVENCIÓN].\n\nLe recomendamos tomar las medidas oportunas con antelación. Trabajaremos para que la interrupción sea lo más breve posible.\n\nDisculpe las molestias.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'facturacion', titulo: 'Cambio de datos de facturación o pago',
    palabras: ['factura', 'facturas', 'facturacion', 'facturación', 'pago', 'pagos', 'banco', 'cuenta', 'iban', 'cobro', 'datos'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nLe comunicamos que a partir del [FECHA DEL CAMBIO] [DESCRIBIR EL CAMBIO: nuevos datos de facturación / nuevo medio de pago / nueva forma de envío de facturas].\n\nPor su seguridad, confirme cualquier cambio de datos bancarios llamando a nuestro teléfono habitual antes de realizar ningún pago a una cuenta distinta.\n\nGracias por su colaboración.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'datos', titulo: 'Protección de datos',
    palabras: ['datos', 'proteccion', 'protección', 'rgpd', 'privacidad', 'lopd', 'consentimiento'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nEn [nombre de tu empresa] tratamos sus datos personales para gestionar nuestros servicios, facturación y comunicaciones, conforme al Reglamento General de Protección de Datos. Puede ejercer sus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiéndonos a [CORREO DE CONTACTO].\n\nSu firma confirma que ha leído esta información.\n\nGracias.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'urgencias', titulo: 'Servicio de urgencias y averías',
    palabras: ['urgencia', 'urgencias', 'averia', 'avería', 'averias', 'guardia', '24h', 'emergencia', 'incidencia'],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nLe recordamos cómo contactar con nosotros ante una avería: en horario laboral, en el [TELÉFONO]; fuera de horario y en festivos, en el servicio de urgencias [TELÉFONO DE URGENCIAS]. Tenga a mano el nombre de la instalación y una breve descripción del problema para atenderle antes.\n\nGracias por confiar en [nombre de tu empresa].\n\nUn saludo,\n[Tu nombre]\n[Teléfono / Correo electrónico]',
  },
  {
    id: 'general', titulo: 'Comunicado a clientes',
    palabras: [],
    cuerpo: '[fecha]\n\nEstimado/a [nombre de cliente],\n\nDesde [nombre de tu empresa] queremos informarle de lo siguiente: [ESCRIBA AQUÍ EL MENSAJE].\n\nSi tiene cualquier duda, estamos a su disposición en el [TELÉFONO].\n\nGracias por su confianza.\n\nUn saludo,\n[Tu nombre]\n[nombre de tu empresa]\n[Teléfono / Correo electrónico]',
  },
];

const limpia = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Rellena el nombre de la empresa. */
export function textoPlantilla(p, empresa) {
  return p.cuerpo.replace(/\{empresa\}/g, empresa?.company_name || 'nuestra empresa');
}

/** Las plantillas que mejor encajan con lo que se ha pedido (siempre devuelve alguna). */
export function elegirPlantillas(tema, n = 2) {
  const palabras = limpia(tema).split(/[^a-z0-9-]+/).filter((w) => w.length > 2);
  const puntuadas = PLANTILLAS.filter((p) => p.id !== 'general').map((p) => ({
    p, puntos: p.palabras.reduce((s, k) => s + (palabras.some((w) => limpia(k).startsWith(w) || w.startsWith(limpia(k))) ? 1 : 0), 0),
  })).filter((x) => x.puntos > 0).sort((a, b) => b.puntos - a.puntos);
  const lista = puntuadas.slice(0, n).map((x) => x.p);
  return lista.length ? lista : [PLANTILLAS.find((p) => p.id === 'general')];
}

/** Huecos [ASÍ] que quedan por completar antes de mandar la nota. */
export function huecosSinRellenar(texto) {
  return [...new Set(String(texto || '').match(/\[[A-ZÁÉÍÓÚÑ0-9 ,:/ó.\-]{3,}[^\]]*\]/g) || [])].filter((h) => !esMarcadorAutomatico(h));
}

/** Búsqueda de modelos de nota en internet (se abre en el navegador). */
export function urlBusquedaModelo(tema) {
  const q = `modelo nota informativa a clientes ${String(tema || '').trim()}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

/** Explica con palabras llanas por qué no ha respondido la IA. */
export function motivoIA(err, proveedor) {
  const m = String(err?.message || err || '');
  if (/failed to fetch|network|fetch|conn|ECONN|ENOTFOUND/i.test(m)) {
    return proveedor === 'ollama'
      ? 'No hay ninguna IA encendida en este equipo (Ollama) ni conexión con una IA en internet.'
      : 'No se ha podido conectar con la IA. Revisa la conexión a internet.';
  }
  if (/clave|api[_ ]?key|401|403|credit|saldo|billing/i.test(m)) return 'Falta la clave de la IA o no tiene saldo.';
  return m || 'La IA no ha devuelto texto.';
}
