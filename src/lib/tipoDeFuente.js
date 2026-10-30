/**
 * tipoDeFuente.js — El tipo de letra de la aplicación.
 *
 * Dos reglas que mandan sobre todo lo demás:
 *
 * 1. NADA de fuentes de internet. El programa tiene que funcionar en una nave
 *    sin cobertura y dentro del APK y del instalador, así que solo se ofrecen
 *    letras que ya trae el sistema. Cada una lleva detrás una lista de
 *    recambios: si en ese equipo no está, cae en otra parecida y no en algo
 *    raro.
 * 2. El tamaño se cambia en la raíz del documento. Toda la aplicación mide en
 *    "rem", así que tocando ahí crece o encoge TODO a la vez y sin descuadrar
 *    las pantallas.
 */

/** Letras disponibles. La lista de recambios importa tanto como la principal. */
export const FUENTES = [
  {
    id: 'sistema',
    nombre: 'La del sistema',
    nota: 'La que use tu equipo. Es la que viene puesta.',
    familia: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    grupo: 'Recomendadas',
  },
  {
    id: 'atkinson',
    nombre: 'Atkinson Hyperlegible',
    nota: 'Hecha para leerse con poca visión: la I, la l y el 1 no se confunden. La más clara de todas.',
    familia: '"Atkinson Hyperlegible", Verdana, sans-serif',
    grupo: 'Recomendadas',
    incluida: true,
  },
  {
    id: 'inter',
    nombre: 'Inter',
    nota: 'Pensada para pantallas. Muy nítida en el móvil.',
    familia: 'Inter, system-ui, Arial, sans-serif',
    grupo: 'Recomendadas',
    incluida: true,
  },
  {
    id: 'verdana',
    nombre: 'Verdana',
    nota: 'Letras anchas y separadas. La más fácil de leer en el móvil.',
    familia: 'Verdana, Geneva, "DejaVu Sans", sans-serif',
    grupo: 'Recomendadas',
  },
  {
    id: 'tahoma',
    nombre: 'Tahoma',
    nota: 'Como Verdana pero más estrecha: cabe más en cada línea.',
    familia: 'Tahoma, Verdana, "DejaVu Sans", sans-serif',
    grupo: 'Recomendadas',
  },
  {
    id: 'arial',
    nombre: 'Arial',
    nota: 'La de toda la vida. Está en cualquier equipo.',
    familia: 'Arial, Helvetica, "Liberation Sans", sans-serif',
    grupo: 'Clásicas',
  },
  {
    id: 'helvetica',
    nombre: 'Helvetica',
    nota: 'Muy limpia. En Mac es la de casa.',
    familia: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    grupo: 'Clásicas',
  },
  {
    id: 'segoe',
    nombre: 'Segoe UI',
    nota: 'La de Windows. Moderna y compacta.',
    familia: '"Segoe UI", system-ui, Roboto, Arial, sans-serif',
    grupo: 'Clásicas',
  },
  {
    id: 'calibri',
    nombre: 'Calibri',
    nota: 'La de Word y Excel. Va bien si imprimes mucho.',
    familia: 'Calibri, Candara, "Segoe UI", Arial, sans-serif',
    grupo: 'Clásicas',
  },
  {
    id: 'trebuchet',
    nombre: 'Trebuchet MS',
    nota: 'Redondeada, con algo de personalidad.',
    familia: '"Trebuchet MS", "Lucida Grande", Tahoma, sans-serif',
    grupo: 'Clásicas',
  },
  {
    id: 'opensans',
    nombre: 'Open Sans',
    nota: 'Neutra y muy legible. Va bien para todo.',
    familia: '"Open Sans", Arial, sans-serif',
    grupo: 'Incluidas en el programa',
    incluida: true,
  },
  {
    id: 'lato',
    nombre: 'Lato',
    nota: 'Con un aire cálido, algo más redondeada.',
    familia: 'Lato, "Trebuchet MS", Arial, sans-serif',
    grupo: 'Incluidas en el programa',
    incluida: true,
  },
  {
    id: 'roboto',
    nombre: 'Roboto',
    nota: 'La de Android. Compacta y muy conocida.',
    familia: 'Roboto, system-ui, Arial, sans-serif',
    grupo: 'Incluidas en el programa',
    incluida: true,
  },
  {
    id: 'merriweather',
    nombre: 'Merriweather',
    nota: 'Con remates, gruesa. Se lee muy bien en papel.',
    familia: 'Merriweather, Georgia, serif',
    grupo: 'Incluidas en el programa',
    incluida: true,
  },
  {
    id: 'sourceserif',
    nombre: 'Source Serif',
    nota: 'Con remates, más fina y elegante. Para documentos formales.',
    familia: '"Source Serif 4", Georgia, "Times New Roman", serif',
    grupo: 'Incluidas en el programa',
    incluida: true,
  },
  {
    id: 'jetbrains',
    nombre: 'JetBrains Mono',
    nota: 'De ancho fijo y muy clara. Las cifras quedan en columna.',
    familia: '"JetBrains Mono", Consolas, "Courier New", monospace',
    grupo: 'Incluidas en el programa',
    incluida: true,
  },
  {
    id: 'times',
    nombre: 'Times New Roman',
    nota: 'Con remates. Da aire formal a presupuestos y contratos.',
    familia: '"Times New Roman", Times, "Liberation Serif", serif',
    grupo: 'Con remates (serif)',
  },
  {
    id: 'georgia',
    nombre: 'Georgia',
    nota: 'Con remates pero pensada para pantalla. Se lee muy bien.',
    familia: 'Georgia, "Times New Roman", "DejaVu Serif", serif',
    grupo: 'Con remates (serif)',
  },
  {
    id: 'garamond',
    nombre: 'Garamond',
    nota: 'Elegante y estrecha. Para tarjetas de aire clásico.',
    familia: 'Garamond, "Palatino Linotype", Palatino, Georgia, serif',
    grupo: 'Con remates (serif)',
  },
  {
    id: 'courier',
    nombre: 'Courier New',
    nota: 'De máquina de escribir. Todas las letras ocupan igual.',
    familia: '"Courier New", Courier, "Liberation Mono", monospace',
    grupo: 'De ancho fijo',
  },
  {
    id: 'consolas',
    nombre: 'Consolas',
    nota: 'De ancho fijo pero más moderna. Las cifras quedan alineadas.',
    familia: 'Consolas, "DejaVu Sans Mono", "Courier New", monospace',
    grupo: 'De ancho fijo',
  },
];

export const FUENTE_POR_DEFECTO = 'sistema';

/** Los grupos, en orden, para pintar el desplegable. */
export function gruposDeFuentes() {
  const orden = [];
  const porGrupo = {};
  for (const f of FUENTES) {
    if (!porGrupo[f.grupo]) { porGrupo[f.grupo] = []; orden.push(f.grupo); }
    porGrupo[f.grupo].push(f);
  }
  return orden.map((g) => ({ grupo: g, fuentes: porGrupo[g] }));
}

export function fuentePorId(id) {
  return FUENTES.find((f) => f.id === id) || FUENTES.find((f) => f.id === FUENTE_POR_DEFECTO);
}

/** La familia CSS, con sus recambios, lista para meter en un style. */
export function familiaDe(id) {
  return fuentePorId(id).familia;
}

// ── Tamaño ────────────────────────────────────────────────────────────────
// 16 px es lo normal en cualquier navegador. Se deja mover entre 13 y 22:
// por debajo no se lee en el móvil, y por encima empiezan a partirse los
// rótulos de las tablas. Fuera de ese margen se recorta, no se acepta.
export const TAMANO_BASE = 16;
export const TAMANO_MIN = 13;
export const TAMANO_MAX = 22;

export function tamanoValido(px) {
  const n = Number(px);
  if (!Number.isFinite(n)) return TAMANO_BASE;
  return Math.min(TAMANO_MAX, Math.max(TAMANO_MIN, Math.round(n)));
}

/** Cómo se llama cada tamaño, para no enseñar solo un número suelto. */
export function nombreDeTamano(px) {
  const n = tamanoValido(px);
  if (n <= 14) return 'Pequeña';
  if (n <= 16) return 'Normal';
  if (n <= 18) return 'Grande';
  return 'Muy grande';
}

// ── Grosor ────────────────────────────────────────────────────────────────
// No es un interruptor de sí/no: "más marcada" sube el texto normal sin
// tocar lo que ya iba en negrita, y "negrita" lo sube del todo. Así no se
// pierde la diferencia entre un título y un párrafo.
export const GROSORES = [
  { id: 'normal', nombre: 'Normal', peso: 400 },
  { id: 'marcada', nombre: 'Más marcada', peso: 500 },
  { id: 'negrita', nombre: 'Negrita', peso: 700 },
];

export function grosorValido(id) {
  return GROSORES.some((g) => g.id === id) ? id : 'normal';
}

export function pesoDe(id) {
  return (GROSORES.find((g) => g.id === grosorValido(id)) || GROSORES[0]).peso;
}

// ── La configuración entera ───────────────────────────────────────────────
export const AJUSTES_POR_DEFECTO = {
  fuente: FUENTE_POR_DEFECTO,
  tamano: TAMANO_BASE,
  grosor: 'normal',
  cursiva: false,
};

/** Deja la configuración en condiciones venga como venga. */
export function normalizar(cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  return {
    fuente: fuentePorId(c.fuente).id,
    tamano: tamanoValido(c.tamano ?? TAMANO_BASE),
    grosor: grosorValido(c.grosor),
    cursiva: !!c.cursiva,
  };
}

export function esPorDefecto(cfg) {
  const c = normalizar(cfg);
  return c.fuente === AJUSTES_POR_DEFECTO.fuente
    && c.tamano === AJUSTES_POR_DEFECTO.tamano
    && c.grosor === AJUSTES_POR_DEFECTO.grosor
    && c.cursiva === AJUSTES_POR_DEFECTO.cursiva;
}

/** Los estilos sueltos, para una vista previa o para una tarjeta. */
export function estiloDe(cfg, { tamanoBase } = {}) {
  const c = normalizar(cfg);
  return {
    fontFamily: familiaDe(c.fuente),
    fontSize: `${tamanoBase ?? c.tamano}px`,
    fontWeight: pesoDe(c.grosor),
    fontStyle: c.cursiva ? 'italic' : 'normal',
  };
}

// ── Aplicarlo a toda la aplicación ────────────────────────────────────────

const ID_HOJA = 'gpt-tipo-de-fuente';

/**
 * La hoja de estilos que hace el trabajo.
 *
 * El truco está en `:where(...)`: no suma especificidad, así que la regla
 * pesa lo justo para ganarle a las clases de tamaño normal del diseño, pero
 * NO pisa lo que ya está puesto en negrita a propósito. Sin eso, o no se
 * notaba nada o se ponía toda la pantalla en negrita.
 */
function hoja() {
  return `
html[data-gpt-fuente] body,
html[data-gpt-fuente] input,
html[data-gpt-fuente] textarea,
html[data-gpt-fuente] select,
html[data-gpt-fuente] button {
  font-family: var(--gpt-familia);
}
html[data-gpt-cursiva="1"] body { font-style: italic; }
html[data-gpt-grosor="marcada"] body,
html[data-gpt-grosor="marcada"] body :where(.font-normal, .font-light) { font-weight: 500; }
html[data-gpt-grosor="negrita"] body,
html[data-gpt-grosor="negrita"] body :where(.font-normal, .font-light, .font-medium) { font-weight: 700; }
`;
}

/**
 * Aplica la configuración al documento entero.
 *
 * @param {object} cfg
 * @param {Document} [doc]
 */
export function aplicarFuente(cfg, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc) return null;
  const c = normalizar(cfg);
  const raiz = doc.documentElement;

  let estilo = doc.getElementById(ID_HOJA);
  if (!estilo) {
    estilo = doc.createElement('style');
    estilo.id = ID_HOJA;
    doc.head.appendChild(estilo);
  }
  if (estilo.textContent !== hoja()) estilo.textContent = hoja();

  raiz.style.setProperty('--gpt-familia', familiaDe(c.fuente));
  // Aquí está el tamaño de TODA la aplicación: se mide en rem a partir de esto.
  raiz.style.fontSize = `${c.tamano}px`;
  raiz.setAttribute('data-gpt-fuente', c.fuente);
  raiz.setAttribute('data-gpt-grosor', c.grosor);
  raiz.setAttribute('data-gpt-cursiva', c.cursiva ? '1' : '0');
  return c;
}

// ── Dónde se guarda ───────────────────────────────────────────────────────
// En el propio equipo. Así se aplica al instante, funciona sin cobertura y no
// hace falta tocar nada en el servidor (cada aparato puede tener el tamaño
// que le vaya bien: el móvil en la furgoneta no pide lo mismo que el
// ordenador de la oficina).
export const CLAVE = 'gpt_tipo_de_fuente';

export function leerFuente(almacen = typeof localStorage !== 'undefined' ? localStorage : null) {
  try {
    return normalizar(JSON.parse(almacen?.getItem(CLAVE) || 'null'));
  } catch {
    return { ...AJUSTES_POR_DEFECTO };
  }
}

export function guardarFuente(cfg, almacen = typeof localStorage !== 'undefined' ? localStorage : null) {
  const c = normalizar(cfg);
  try { almacen?.setItem(CLAVE, JSON.stringify(c)); } catch { /* sin sitio: se aplica igual */ }
  return c;
}

/** Se llama al arrancar, antes de pintar nada. */
export function aplicarFuenteGuardada(doc, almacen) {
  return aplicarFuente(leerFuente(almacen), doc);
}

// ── La letra de las tarjetas de visita ────────────────────────────────────
// Va aparte de la del programa: la tarjeta se imprime y se mira de cerca, y
// ahí sí interesa poder afinar. Se guarda dentro de cada tarjeta, así que
// cada persona de la empresa puede llevar la suya.

export const ESCALA_BASE = 100;
export const ESCALA_MIN = 75;
export const ESCALA_MAX = 135;

export function escalaValida(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return ESCALA_BASE;
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, Math.round(n)));
}

export const FUENTE_TARJETA_POR_DEFECTO = {
  fuente: 'arial',
  escala: ESCALA_BASE,
  negrita: false,
  cursiva: false,
};

/** Lee la letra de una tarjeta, poniendo lo que falte. */
export function fuenteDeTarjeta(tarjeta) {
  const t = tarjeta && typeof tarjeta === 'object' ? tarjeta : {};
  return {
    fuente: fuentePorId(t.card_font || FUENTE_TARJETA_POR_DEFECTO.fuente).id,
    escala: escalaValida(t.card_font_scale ?? ESCALA_BASE),
    negrita: !!t.card_font_bold,
    cursiva: !!t.card_font_italic,
  };
}

/**
 * Redondea a un decimal el tamaño ya escalado.
 *
 * Se redondea a propósito: en una tarjeta impresa a 85 mm, un tamaño con seis
 * decimales no aporta nada y llena el HTML de impresión de ruido.
 */
export function medida(base, escala) {
  return Math.round(base * (escalaValida(escala) / 100) * 10) / 10;
}

/** Los estilos comunes de la tarjeta (familia, cursiva y grosor de base). */
export function estiloTarjeta(tarjeta) {
  const f = fuenteDeTarjeta(tarjeta);
  return {
    fontFamily: familiaDe(f.fuente),
    fontStyle: f.cursiva ? 'italic' : 'normal',
    fontWeight: f.negrita ? 600 : 400,
  };
}

/** Cuánto pesa un texto de la tarjeta: los que ya iban en negrita suben más. */
export function pesoTarjeta(tarjeta, { fuerte = false } = {}) {
  const f = fuenteDeTarjeta(tarjeta);
  if (fuerte) return f.negrita ? 800 : 700;
  return f.negrita ? 600 : 400;
}

/** Lo mismo pero como CSS, para las plantillas de impresión. */
export function cssTarjeta(tarjeta) {
  const f = fuenteDeTarjeta(tarjeta);
  return {
    familia: familiaDe(f.fuente),
    estilo: f.cursiva ? 'italic' : 'normal',
    normal: f.negrita ? 600 : 400,
    fuerte: f.negrita ? 800 : 700,
    escala: f.escala,
  };
}

// ── Cada campo de la tarjeta, por su cuenta ───────────────────────────────
//
// La tarjeta tiene una letra general, pero cada trozo puede llevar la suya:
// el nombre grande y en negrita, el cargo más pequeño, los datos de contacto
// en otro color... Lo que no se toque hereda lo de la tarjeta, para no tener
// que configurar cinco cosas cuando solo quieres cambiar una.

export const CAMPOS_TARJETA = [
  { id: 'empresa', nombre: 'Nombre de la empresa', base: 10, fuerte: true },
  { id: 'nombre', nombre: 'Tu nombre', base: 15, fuerte: true },
  { id: 'cargo', nombre: 'Cargo o puesto', base: 10, fuerte: false },
  { id: 'contacto', nombre: 'Teléfono, email y web', base: 8.5, fuerte: false },
  { id: 'nif', nombre: 'NIF', base: 8, fuerte: false },
];

export function campoTarjeta(id) {
  return CAMPOS_TARJETA.find((c) => c.id === id) || CAMPOS_TARJETA[0];
}

/** Cuánto se puede subir o bajar un campo respecto al resto de la tarjeta. */
export const CAMPO_ESCALA_MIN = 50;
export const CAMPO_ESCALA_MAX = 200;

export function escalaCampoValida(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 100;
  return Math.min(CAMPO_ESCALA_MAX, Math.max(CAMPO_ESCALA_MIN, Math.round(n)));
}

function colorValido(c) {
  return /^#[0-9a-fA-F]{6}$/.test(c || '') ? c : null;
}

/**
 * Los ajustes de un campo, ya resueltos: lo suyo si lo tiene, y si no, lo
 * de la tarjeta.
 *
 * @param {object} tarjeta
 * @param {string} idCampo
 * @param {string} colorPorDefecto  el del esquema de color elegido
 */
export function ajustesDeCampo(tarjeta, idCampo, colorPorDefecto) {
  const campo = campoTarjeta(idCampo);
  const propio = (tarjeta?.campos || {})[idCampo] || {};
  const general = fuenteDeTarjeta(tarjeta);

  const negrita = propio.negrita === undefined
    ? (campo.fuerte || general.negrita)
    : !!propio.negrita;

  return {
    fuente: propio.fuente ? fuentePorId(propio.fuente).id : general.fuente,
    escalaCampo: escalaCampoValida(propio.escala ?? 100),
    color: colorValido(propio.color) || colorPorDefecto,
    negrita,
    cursiva: propio.cursiva === undefined ? general.cursiva : !!propio.cursiva,
    // Un campo puede llevar su propia letra sin que se note que es distinta
    // del resto: por eso se guarda también si está tocado o no.
    aMedida: Object.keys(propio).length > 0,
  };
}

/**
 * El estilo CSS final de un campo de la tarjeta.
 *
 * El tamaño sale de tres cosas: el que tiene ese campo de fábrica, la escala
 * general de la tarjeta y la escala propia del campo. Así, subir el tamaño
 * de la tarjeta entera sigue funcionando aunque un campo esté retocado.
 */
export function estiloDeCampo(tarjeta, idCampo, colorPorDefecto, { pequeno = false } = {}) {
  const campo = campoTarjeta(idCampo);
  const a = ajustesDeCampo(tarjeta, idCampo, colorPorDefecto);
  const general = fuenteDeTarjeta(tarjeta);
  const base = pequeno ? campo.base * 0.7 : campo.base;
  const px = medida(base, general.escala) * (a.escalaCampo / 100);
  return {
    fontFamily: familiaDe(a.fuente),
    fontSize: `${Math.round(px * 10) / 10}px`,
    fontWeight: a.negrita ? (campo.fuerte ? 800 : 700) : (general.negrita ? 600 : 400),
    fontStyle: a.cursiva ? 'italic' : 'normal',
    color: a.color,
  };
}

/** Lo mismo, en CSS suelto, para las plantillas de impresión. */
export function cssDeCampo(tarjeta, idCampo, colorPorDefecto) {
  const e = estiloDeCampo(tarjeta, idCampo, colorPorDefecto);
  return `font-family:${e.fontFamily};font-size:${e.fontSize};`
    + `font-weight:${e.fontWeight};font-style:${e.fontStyle};color:${e.color} !important;`;
}

/** Cambia un ajuste de un campo, dejando el resto como estaba. */
export function conCampoCambiado(tarjeta, idCampo, parche) {
  const campos = { ...(tarjeta?.campos || {}) };
  const actual = { ...(campos[idCampo] || {}), ...parche };
  // Quitar lo que se haya puesto a "sin valor" para que vuelva a heredar.
  for (const k of Object.keys(actual)) {
    if (actual[k] === null || actual[k] === undefined) delete actual[k];
  }
  if (Object.keys(actual).length === 0) delete campos[idCampo];
  else campos[idCampo] = actual;
  return { ...tarjeta, campos };
}

/** Devuelve el campo a lo que tenga la tarjeta en general. */
export function conCampoPorDefecto(tarjeta, idCampo) {
  const campos = { ...(tarjeta?.campos || {}) };
  delete campos[idCampo];
  return { ...tarjeta, campos };
}
