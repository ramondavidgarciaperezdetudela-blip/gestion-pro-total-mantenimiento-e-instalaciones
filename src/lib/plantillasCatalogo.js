/**
 * plantillasCatalogo.js — Diseños de plantilla que van SIEMPRE.
 *
 * Por qué existe esto: la búsqueda de plantillas dependía entera de una
 * llamada a la IA con búsqueda en internet. Si esa llamada fallaba —y falla
 * a menudo: es lenta, gasta crédito y en una nave sin cobertura no hay nada
 * que hacer— la pantalla se quedaba vacía con un "revisa la conexión".
 *
 * Y no hacía ninguna falta. Un diseño de plantilla son colores, una
 * tipografía, un estilo de tabla y unos textos: no es información que haya
 * que consultar en ningún sitio. Así que va aquí dentro, funciona sin
 * cobertura y sale al instante. La IA queda como un extra para pedir algo
 * concreto, no como la única forma de tener plantillas.
 */

/** Tipos de documento, los mismos que maneja la pantalla. */
export const TIPOS = [
  'factura', 'presupuesto', 'recibo', 'sat',
  'mantenimiento', 'informe', 'legalización', 'tarjeta_contacto',
];

/** Tipografías disponibles (las que sabe pintar el generador de documentos). */
export const TIPOGRAFIAS = ['Arial', 'Times New Roman', 'Georgia', 'Verdana', 'Calibri', 'Trebuchet MS'];

const M = (t, b, l, r) => ({ margin_top: t, margin_bottom: b, margin_left: l, margin_right: r });

/**
 * El catálogo. Cada entrada lleva "busca": las palabras por las que se
 * encuentra, para que escribir "azul", "frío" o "elegante" dé resultados.
 */
export const CATALOGO = [
  {
    id: 'azul-industrial',
    modelo: 'Técnico Azul Industrial',
    desc: 'Cabecera marcada y tabla con líneas. El de andar por casa para partes y facturas.',
    busca: 'azul industrial tecnico marcado lineas serio',
    tpl: { primary_color: '#0f2740', secondary_color: '#2563eb', font_family: 'Verdana', font_size: 'medium', table_style: 'bordered', doc_type: 'sat', header_text: 'SERVICIO TÉCNICO', footer_text: 'Trabajo conforme a normativa vigente.', ...M(12, 12, 14, 14) },
  },
  {
    id: 'minimalista',
    modelo: 'Minimalista Blanco',
    desc: 'Limpio, líneas finas y mucho aire. Queda muy elegante impreso.',
    busca: 'minimalista blanco limpio simple elegante sobrio moderno',
    tpl: { primary_color: '#111827', secondary_color: '#6b7280', font_family: 'Calibri', font_size: 'medium', table_style: 'simple', doc_type: 'presupuesto', header_text: '', footer_text: '', ...M(18, 18, 20, 20) },
  },
  {
    id: 'ingenieria-gris',
    modelo: 'Ingeniería Gris',
    desc: 'Plano y técnico, en grises. Entra mucha información sin agobiar.',
    busca: 'gris ingenieria tecnico plano compacto denso',
    tpl: { primary_color: '#374151', secondary_color: '#9ca3af', font_family: 'Arial', font_size: 'small', table_style: 'striped', doc_type: 'informe', header_text: 'DOCUMENTO TÉCNICO', footer_text: 'Rev. según especificaciones.', ...M(12, 12, 14, 14) },
  },
  {
    id: 'refrigeracion-cian',
    modelo: 'Refrigeración Cian',
    desc: 'Acentos cian. Pensado para climatización y frío.',
    busca: 'cian azul frio refrigeracion climatizacion clima aire',
    tpl: { primary_color: '#0e7490', secondary_color: '#06b6d4', font_family: 'Trebuchet MS', font_size: 'medium', table_style: 'bordered', doc_type: 'mantenimiento', header_text: 'CLIMATIZACIÓN Y FRÍO', footer_text: 'Instalación conforme RSIF / F-Gas.', ...M(14, 14, 15, 15) },
  },
  {
    id: 'electrico-ambar',
    modelo: 'Eléctrico Ámbar',
    desc: 'Acentos ámbar sobre marrón. Para trabajos eléctricos.',
    busca: 'ambar amarillo naranja electrico electricidad rebt cuadro',
    tpl: { primary_color: '#78350f', secondary_color: '#f59e0b', font_family: 'Arial', font_size: 'medium', table_style: 'striped', doc_type: 'sat', header_text: 'INSTALACIÓN ELÉCTRICA', footer_text: 'Conforme REBT.', ...M(14, 14, 15, 15) },
  },
  {
    id: 'corporativo-verde',
    modelo: 'Corporativo Verde',
    desc: 'Sobrio y elegante en verde, con tipografía con remates.',
    busca: 'verde corporativo elegante serio formal empresa',
    tpl: { primary_color: '#14532d', secondary_color: '#22c55e', font_family: 'Georgia', font_size: 'medium', table_style: 'striped', doc_type: 'factura', header_text: '', footer_text: 'Gracias por su confianza.', ...M(15, 15, 16, 16) },
  },
  {
    id: 'solar-naranja',
    modelo: 'Solar Naranja',
    desc: 'Cálido, para instalaciones de fotovoltaica y baterías.',
    busca: 'naranja solar fotovoltaica placas baterias energia calor',
    tpl: { primary_color: '#9a3412', secondary_color: '#fb923c', font_family: 'Trebuchet MS', font_size: 'medium', table_style: 'striped', doc_type: 'presupuesto', header_text: 'ENERGÍA SOLAR', footer_text: 'Instalación conforme a REBT e IT-BT.', ...M(14, 14, 15, 15) },
  },
  {
    id: 'factura-clasica',
    modelo: 'Factura Clásica',
    desc: 'De toda la vida: letra con remates y tabla con marco. Muy formal.',
    busca: 'clasica factura formal tradicional remates times serio',
    tpl: { primary_color: '#1f2937', secondary_color: '#4b5563', font_family: 'Times New Roman', font_size: 'medium', table_style: 'bordered', doc_type: 'factura', header_text: '', footer_text: 'Documento con validez fiscal.', ...M(20, 20, 18, 18) },
  },
  {
    id: 'compacto',
    modelo: 'Compacto de Campo',
    desc: 'Letra pequeña y márgenes justos: cabe mucho en una hoja.',
    busca: 'compacto pequeno campo ahorro papel muchas lineas denso',
    tpl: { primary_color: '#334155', secondary_color: '#0ea5e9', font_family: 'Arial', font_size: 'small', table_style: 'simple', doc_type: 'sat', header_text: 'PARTE DE TRABAJO', footer_text: '', ...M(10, 10, 10, 10) },
  },
  {
    id: 'legible',
    modelo: 'Letra Grande',
    desc: 'Todo más grande. Para clientes que ven poco o para leer en obra.',
    busca: 'grande legible vista mayores accesible claro',
    tpl: { primary_color: '#1e3a5f', secondary_color: '#0ea5e9', font_family: 'Verdana', font_size: 'large', table_style: 'striped', doc_type: 'presupuesto', header_text: '', footer_text: 'Presupuesto válido 30 días.', ...M(16, 16, 16, 16) },
  },
  {
    id: 'granate',
    modelo: 'Granate Elegante',
    desc: 'Granate y dorado. Da un aire cuidado a presupuestos grandes.',
    busca: 'granate rojo burdeos dorado elegante lujo caro',
    tpl: { primary_color: '#7f1d1d', secondary_color: '#b45309', font_family: 'Georgia', font_size: 'medium', table_style: 'bordered', doc_type: 'presupuesto', header_text: '', footer_text: 'Gracias por confiar en nosotros.', ...M(18, 18, 18, 18) },
  },
  {
    id: 'nocturno',
    modelo: 'Cabecera Oscura',
    desc: 'Cabecera casi negra con acento violeta. Moderno y con carácter.',
    busca: 'oscuro negro violeta morado moderno contraste',
    tpl: { primary_color: '#1e1b4b', secondary_color: '#8b5cf6', font_family: 'Calibri', font_size: 'medium', table_style: 'striped', doc_type: 'informe', header_text: 'INFORME TÉCNICO', footer_text: '', ...M(15, 15, 16, 16) },
  },
  {
    id: 'recibo-simple',
    modelo: 'Recibo Sencillo',
    desc: 'Corto y al grano, con hueco para la firma.',
    busca: 'recibo sencillo simple cobro firma pago',
    tpl: { primary_color: '#166534', secondary_color: '#4ade80', font_family: 'Arial', font_size: 'medium', table_style: 'simple', doc_type: 'recibo', header_text: '', footer_text: 'Recibí conforme.', ...M(20, 20, 20, 20) },
  },
  {
    id: 'mantenimiento-azul',
    modelo: 'Mantenimiento Preventivo',
    desc: 'Para las fichas de revisión periódica, con tabla marcada.',
    busca: 'mantenimiento preventivo revision periodico ficha checklist',
    tpl: { primary_color: '#0369a1', secondary_color: '#38bdf8', font_family: 'Verdana', font_size: 'small', table_style: 'bordered', doc_type: 'mantenimiento', header_text: 'FICHA DE MANTENIMIENTO', footer_text: 'Próxima revisión según cronograma.', ...M(12, 12, 12, 12) },
  },
  {
    id: 'legalizacion',
    modelo: 'Legalización Oficial',
    desc: 'Aire de documento oficial, para certificados y legalizaciones.',
    busca: 'legalizacion oficial certificado industria boletin normativa',
    tpl: { primary_color: '#1e293b', secondary_color: '#64748b', font_family: 'Times New Roman', font_size: 'medium', table_style: 'bordered', doc_type: 'legalización', header_text: 'DOCUMENTO DE LEGALIZACIÓN', footer_text: 'Conforme a la normativa vigente aplicable.', ...M(22, 22, 20, 20) },
  },
  {
    id: 'tarjeta',
    modelo: 'Tarjeta de Técnico',
    desc: 'Para la tarjeta de contacto del técnico.',
    busca: 'tarjeta contacto visita tecnico personal',
    tpl: { primary_color: '#1e3a5f', secondary_color: '#0ea5e9', font_family: 'Trebuchet MS', font_size: 'medium', table_style: 'simple', doc_type: 'tarjeta_contacto', header_text: 'Técnico SAT', footer_text: 'Servicio de Asistencia Técnica', ...M(10, 10, 10, 10) },
  },
  {
    id: 'dos-tintas',
    modelo: 'Dos Tintas Ahorro',
    desc: 'Casi sin fondos de color: gasta mucha menos tinta al imprimir.',
    busca: 'ahorro tinta barato imprimir blanco negro economico',
    tpl: { primary_color: '#0f172a', secondary_color: '#334155', font_family: 'Arial', font_size: 'medium', table_style: 'simple', doc_type: 'factura', header_text: '', footer_text: '', ...M(16, 16, 16, 16) },
  },
  {
    id: 'obra-amarillo',
    modelo: 'Obra y Montaje',
    desc: 'Contraste fuerte, se lee bien aunque el papel vaya sucio de obra.',
    busca: 'obra montaje amarillo contraste fuerte visible taller',
    tpl: { primary_color: '#422006', secondary_color: '#eab308', font_family: 'Verdana', font_size: 'medium', table_style: 'bordered', doc_type: 'sat', header_text: 'PARTE DE OBRA', footer_text: '', ...M(12, 12, 14, 14) },
  },
];

/** Quita tildes y mayúsculas para poder buscar como se escribe. */
export function normalizar(t) {
  return String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca en el catálogo.
 *
 * Sin texto devuelve TODO: el usuario abre y ya tiene plantillas delante, no
 * una pantalla vacía esperando a que algo cargue.
 */
export function buscar(texto, catalogo = CATALOGO) {
  const q = normalizar(texto);
  if (!q) return catalogo;
  const palabras = q.split(' ').filter(Boolean);
  const puntuar = (m) => {
    const heno = normalizar(`${m.modelo} ${m.desc} ${m.busca} ${m.tpl.doc_type} ${m.tpl.font_family}`);
    let p = 0;
    for (const w of palabras) if (heno.includes(w)) p++;
    return p;
  };
  return catalogo
    .map((m) => ({ m, p: puntuar(m) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .map((x) => x.m);
}

/** Los del tipo de documento pedido primero, sin esconder los demás. */
export function ordenarPorTipo(modelos, tipo) {
  if (!tipo) return modelos;
  return [...modelos].sort((a, b) => (b.tpl.doc_type === tipo) - (a.tpl.doc_type === tipo));
}

/** Deja en condiciones un modelo venga de donde venga (catálogo o IA). */
export function saneado(m, { tipos = TIPOS, tipografias = TIPOGRAFIAS } = {}) {
  const color = (c, porDefecto) => (/^#[0-9a-fA-F]{6}$/.test(c || '') ? c : porDefecto);
  const t = m?.tpl || {};
  return {
    id: m?.id || null,
    modelo: String(m?.modelo || 'Plantilla').slice(0, 60),
    desc: String(m?.desc || '').slice(0, 140),
    tpl: {
      name: String(m?.modelo || 'Plantilla').slice(0, 60),
      primary_color: color(t.primary_color, '#1e3a5f'),
      secondary_color: color(t.secondary_color, '#0ea5e9'),
      font_family: tipografias.includes(t.font_family) ? t.font_family : 'Arial',
      font_size: ['small', 'medium', 'large'].includes(t.font_size) ? t.font_size : 'medium',
      table_style: ['simple', 'bordered', 'striped'].includes(t.table_style) ? t.table_style : 'striped',
      doc_type: tipos.includes(t.doc_type) ? t.doc_type : 'factura',
      header_text: String(t.header_text || '').slice(0, 80),
      footer_text: String(t.footer_text || '').slice(0, 160),
      margin_top: Number.isFinite(+t.margin_top) ? +t.margin_top : 15,
      margin_bottom: Number.isFinite(+t.margin_bottom) ? +t.margin_bottom : 15,
      margin_left: Number.isFinite(+t.margin_left) ? +t.margin_left : 15,
      margin_right: Number.isFinite(+t.margin_right) ? +t.margin_right : 15,
    },
  };
}

/** Lo que la IA devuelve, pasado por el mismo filtro y sin repetir los que ya hay. */
export function mezclarConIA(delCatalogo, deLaIA) {
  const vistos = new Set(delCatalogo.map((m) => normalizar(m.modelo)));
  const nuevos = [];
  for (const m of deLaIA || []) {
    // Se mira el nombre TAL CUAL vino: saneado() le pone "Plantilla" por
    // defecto, y una tarjeta llamada "Plantilla" sin más no le sirve a nadie.
    if (!String(m?.modelo || '').trim()) continue;
    const s = saneado(m);
    const clave = normalizar(s.modelo);
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    nuevos.push({ ...s, deIA: true });
  }
  return nuevos;
}

/** El encargo para la IA. Ya NO pide buscar en internet: no hace falta. */
export function encargoPlantillas(consulta) {
  return `Eres diseñador de documentos para una empresa española de servicio técnico de climatización, refrigeración, electricidad y energía solar.

${consulta ? `Diseña plantillas para esto: "${consulta}".` : 'Diseña plantillas variadas y elegantes para sus documentos.'}

Devuelve entre 4 y 6 modelos DISTINTOS entre sí. De cada uno:
- nombre corto (máximo 4 palabras)
- descripción breve del estilo, en español
- color principal oscuro y color de acento, en hexadecimal (#rrggbb)
- tipografía, exactamente una de: ${TIPOGRAFIAS.join(', ')}
- tamaño: small, medium o large
- estilo de tabla: simple, bordered o striped
- texto de cabecera y de pie apropiados, en español (pueden ir vacíos)
- tipo de documento, uno de: ${TIPOS.join(', ')}

Que se distingan de verdad entre ellos en color y en carácter, no seis variantes del mismo azul.`;
}

export const ESQUEMA_PLANTILLAS = {
  type: 'object',
  properties: {
    modelos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          modelo: { type: 'string' },
          desc: { type: 'string' },
          primary_color: { type: 'string' },
          secondary_color: { type: 'string' },
          font_family: { type: 'string' },
          font_size: { type: 'string' },
          table_style: { type: 'string' },
          header_text: { type: 'string' },
          footer_text: { type: 'string' },
          doc_type: { type: 'string' },
        },
      },
    },
  },
};

/** Pasa la respuesta cruda de la IA al formato del catálogo. */
export function desdeLaIA(respuesta) {
  return (respuesta?.modelos || []).map((m) => ({
    modelo: m?.modelo,
    desc: m?.desc,
    tpl: {
      primary_color: m?.primary_color,
      secondary_color: m?.secondary_color,
      font_family: m?.font_family,
      font_size: m?.font_size,
      table_style: m?.table_style,
      header_text: m?.header_text,
      footer_text: m?.footer_text,
      doc_type: m?.doc_type,
    },
  }));
}

// ── Crear la plantilla que se pide, con o sin servidor ────────────────────
//
// "Que la IA me cree la plantilla que le pido y que no falle". Una llamada a
// un servidor remoto no se puede garantizar: se cae, se queda sin crédito, o
// estás en una nave sin cobertura. Así que la petición se entiende TAMBIÉN
// aquí dentro.
//
// El resultado: escribes "presupuesto elegante granate con letra grande" y
// sale exactamente eso, haya conexión o no. Cuando el servidor responde, la
// IA aporta variedad; cuando no, esto responde igual.

/** Colores que se pueden pedir por su nombre. */
export const COLORES = {
  azul: ['#0f2740', '#2563eb'],
  celeste: ['#075985', '#38bdf8'],
  turquesa: ['#134e4a', '#2dd4bf'],
  cian: ['#0e7490', '#06b6d4'],
  verde: ['#14532d', '#22c55e'],
  oliva: ['#3f4a1f', '#84cc16'],
  rojo: ['#7f1d1d', '#ef4444'],
  granate: ['#601410', '#b45309'],
  naranja: ['#9a3412', '#fb923c'],
  ambar: ['#78350f', '#f59e0b'],
  amarillo: ['#422006', '#eab308'],
  morado: ['#4c1d95', '#a855f7'],
  violeta: ['#1e1b4b', '#8b5cf6'],
  rosa: ['#831843', '#ec4899'],
  marron: ['#4a2c1a', '#b06a3b'],
  gris: ['#374151', '#9ca3af'],
  negro: ['#0f172a', '#334155'],
  dorado: ['#4a3a10', '#d4af37'],
};

/** Sinónimos: cómo lo escribe la gente de verdad. */
const SINONIMOS_COLOR = {
  azulado: 'azul', marino: 'azul', añil: 'azul',
  burdeos: 'granate', vino: 'granate', teja: 'granate',
  esmeralda: 'verde', menta: 'verde',
  frio: 'cian', hielo: 'celeste',
  calido: 'naranja', fuego: 'rojo',
  lila: 'morado', purpura: 'morado',
  plata: 'gris', plateado: 'gris', grafito: 'gris',
  oro: 'dorado',
};

/** Palabras que fijan el tipo de documento. */
const TIPO_POR_PALABRA = {
  factura: 'factura', facturas: 'factura',
  presupuesto: 'presupuesto', presupuestos: 'presupuesto', oferta: 'presupuesto',
  recibo: 'recibo', recibos: 'recibo',
  sat: 'sat', parte: 'sat', partes: 'sat', orden: 'sat', trabajo: 'sat', aviso: 'sat',
  mantenimiento: 'mantenimiento', revision: 'mantenimiento', preventivo: 'mantenimiento',
  informe: 'informe', informes: 'informe', memoria: 'informe',
  legalizacion: 'legalización', certificado: 'legalización', boletin: 'legalización',
  tarjeta: 'tarjeta_contacto', visita: 'tarjeta_contacto', contacto: 'tarjeta_contacto',
};

/** Estilos, que deciden tipografía, tabla y márgenes. */
const ESTILOS = {
  elegante: { font: 'Georgia', tabla: 'bordered', margen: 18, nota: 'elegante' },
  clasico: { font: 'Times New Roman', tabla: 'bordered', margen: 20, nota: 'clásico' },
  formal: { font: 'Times New Roman', tabla: 'bordered', margen: 20, nota: 'formal' },
  minimalista: { font: 'Calibri', tabla: 'simple', margen: 20, nota: 'minimalista' },
  limpio: { font: 'Calibri', tabla: 'simple', margen: 20, nota: 'limpio' },
  sencillo: { font: 'Calibri', tabla: 'simple', margen: 18, nota: 'sencillo' },
  moderno: { font: 'Trebuchet MS', tabla: 'striped', margen: 15, nota: 'moderno' },
  tecnico: { font: 'Verdana', tabla: 'bordered', margen: 12, nota: 'técnico' },
  industrial: { font: 'Verdana', tabla: 'bordered', margen: 12, nota: 'industrial' },
  sobrio: { font: 'Arial', tabla: 'simple', margen: 18, nota: 'sobrio' },
  compacto: { font: 'Arial', tabla: 'simple', margen: 10, nota: 'compacto' },
};

const SINONIMOS_ESTILO = {
  serio: 'formal', oficial: 'formal', profesional: 'formal',
  bonito: 'elegante', cuidado: 'elegante', lujo: 'elegante',
  simple: 'minimalista', blanco: 'minimalista', despejado: 'minimalista',
  actual: 'moderno', fresco: 'moderno',
  obra: 'tecnico', taller: 'tecnico', campo: 'compacto',
};

/** Lo que se puede pedir sobre el tamaño de la letra. */
function tamanoPedido(palabras) {
  if (palabras.some((p) => ['grande', 'grandes', 'legible', 'gruesa', 'mayor'].includes(p))) return 'large';
  if (palabras.some((p) => ['pequena', 'pequenas', 'compacto', 'compacta', 'diminuta', 'menuda'].includes(p))) return 'small';
  return 'medium';
}

function buscarEn(palabras, tabla, sinonimos = {}) {
  for (const p of palabras) {
    if (tabla[p]) return typeof tabla[p] === 'string' ? tabla[p] : p;
    const s = sinonimos[p];
    if (s && tabla[s]) return typeof tabla[s] === 'string' ? tabla[s] : s;
  }
  return null;
}

/**
 * Entiende lo que se ha pedido y devuelve una plantilla.
 *
 * Nunca falla: si no reconoce nada, hace una plantilla correcta con los
 * valores de la casa. Mejor una plantilla decente que un mensaje de error.
 */
export function generarDesdePeticion(texto, { tipoActual = null } = {}) {
  const palabras = normalizar(texto).split(' ').filter(Boolean);

  const colorNombre = buscarEn(palabras, COLORES, SINONIMOS_COLOR) || 'azul';
  const [principal, acento] = COLORES[colorNombre];

  const estiloNombre = buscarEn(palabras, ESTILOS, SINONIMOS_ESTILO) || 'moderno';
  const estilo = ESTILOS[estiloNombre];

  const tipo = buscarEn(palabras, TIPO_POR_PALABRA) || tipoActual || 'factura';
  const tamano = tamanoPedido(palabras);

  // Si se pide expresamente cómo va la tabla, manda eso sobre el estilo.
  let tabla = estilo.tabla;
  if (palabras.some((p) => ['lineas', 'bordes', 'cuadricula', 'marco', 'recuadro'].includes(p))) tabla = 'bordered';
  else if (palabras.some((p) => ['rayas', 'rayado', 'franjas', 'alterna'].includes(p))) tabla = 'striped';
  else if (palabras.some((p) => ['limpia', 'sinlineas', 'lisa'].includes(p))) tabla = 'simple';

  const mayus = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const nombreTipo = tipo === 'tarjeta_contacto' ? 'Tarjeta' : mayus(tipo);
  const nombre = `${nombreTipo} ${mayus(estilo.nota)} ${mayus(colorNombre)}`.slice(0, 60);

  return {
    id: null,
    modelo: nombre,
    desc: `Hecha con lo que has pedido: ${estilo.nota}, en ${colorNombre}${tamano === 'large' ? ', con letra grande' : tamano === 'small' ? ', con letra pequeña' : ''}.`,
    aMedida: true,
    tpl: {
      name: nombre,
      primary_color: principal,
      secondary_color: acento,
      font_family: estilo.font,
      font_size: tamano,
      table_style: tabla,
      doc_type: tipo,
      header_text: '',
      footer_text: '',
      margin_top: estilo.margen,
      margin_bottom: estilo.margen,
      margin_left: estilo.margen,
      margin_right: estilo.margen,
    },
  };
}

/** Qué ha entendido, para poder enseñarlo y que se vea si acertó. */
export function loQueHeEntendido(texto, { tipoActual = null } = {}) {
  const palabras = normalizar(texto).split(' ').filter(Boolean);
  return {
    color: buscarEn(palabras, COLORES, SINONIMOS_COLOR),
    estilo: buscarEn(palabras, ESTILOS, SINONIMOS_ESTILO),
    tipo: buscarEn(palabras, TIPO_POR_PALABRA) || tipoActual,
    tamano: tamanoPedido(palabras) === 'medium' ? null : tamanoPedido(palabras),
  };
}
