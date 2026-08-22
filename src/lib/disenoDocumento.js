/**
 * disenoDocumento.js — Cómo se coloca cada cosa en los documentos.
 *
 * Hasta ahora la maquetación de los presupuestos, facturas y partes estaba
 * fija en el código: el logo siempre a la izquierda dentro de una banda
 * azul, los datos siempre al lado, el título siempre a la izquierda. Aquí se
 * abre para poder moverlo sin tocar código.
 *
 * Todo son opciones CERRADAS (izquierda / centro / derecha...), no medidas
 * libres: así no se puede dejar un documento descuadrado, y lo que se elige
 * vale igual para todos los documentos.
 */

/** Dónde va el logo. */
export const POSICIONES_LOGO = [
  { id: 'izquierda', nombre: 'Izquierda', nota: 'Lo habitual.' },
  { id: 'centro', nombre: 'Centrado', nota: 'El logo arriba en medio y los datos debajo.' },
  { id: 'derecha', nombre: 'Derecha', nota: 'Los datos a la izquierda y el logo al otro lado.' },
  { id: 'sin_logo', nombre: 'Sin logo', nota: 'Solo el nombre y los datos.' },
];

/** Cómo se ve la cabecera. */
export const ESTILOS_CABECERA = [
  { id: 'banda', nombre: 'Banda de color', nota: 'Como hasta ahora: fondo de color y letra blanca.' },
  { id: 'linea', nombre: 'Línea fina', nota: 'Fondo blanco con una raya debajo. Gasta mucha menos tinta.' },
  { id: 'limpia', nombre: 'Sin adornos', nota: 'Ni fondo ni raya. Lo más sobrio.' },
];

/** Alineaciones que se pueden pedir. */
export const ALINEACIONES = [
  { id: 'izquierda', nombre: 'Izquierda' },
  { id: 'centro', nombre: 'Centrado' },
  { id: 'derecha', nombre: 'Derecha' },
];

/** Cuánto aire entre bloques. */
export const ESPACIADOS = [
  { id: 'compacto', nombre: 'Compacto', factor: 0.6, nota: 'Cabe más en cada hoja.' },
  { id: 'normal', nombre: 'Normal', factor: 1 },
  { id: 'amplio', nombre: 'Amplio', factor: 1.5, nota: 'Se lee más descansado, ocupa más hojas.' },
];

/** Dónde van los datos del cliente respecto a los de la empresa. */
export const POSICIONES_CLIENTE = [
  { id: 'derecha', nombre: 'A la derecha' },
  { id: 'izquierda', nombre: 'A la izquierda' },
  { id: 'ancho_completo', nombre: 'De lado a lado' },
];

export const DISENO_POR_DEFECTO = {
  logo_pos: 'izquierda',
  cabecera_estilo: 'banda',
  titulo_align: 'izquierda',
  datos_empresa_align: 'izquierda',
  cliente_pos: 'derecha',
  pie_align: 'centro',
  espaciado: 'normal',
  color_cabecera: '#1e3a5f',
  color_acento: '#0ea5e9',
  mostrar_pie: true,
  linea_bajo_titulo: true,
};

const idsDe = (lista) => lista.map((x) => x.id);

/** Deja la configuración en condiciones venga como venga. */
export function normalizarDiseno(cfg) {
  const c = cfg && typeof cfg === 'object' ? cfg : {};
  const uno = (valor, lista, pordefecto) => (idsDe(lista).includes(valor) ? valor : pordefecto);
  const color = (v, pordefecto) => (/^#[0-9a-fA-F]{6}$/.test(v || '') ? v : pordefecto);
  return {
    logo_pos: uno(c.logo_pos, POSICIONES_LOGO, 'izquierda'),
    cabecera_estilo: uno(c.cabecera_estilo, ESTILOS_CABECERA, 'banda'),
    titulo_align: uno(c.titulo_align, ALINEACIONES, 'izquierda'),
    datos_empresa_align: uno(c.datos_empresa_align, ALINEACIONES, 'izquierda'),
    cliente_pos: uno(c.cliente_pos, POSICIONES_CLIENTE, 'derecha'),
    pie_align: uno(c.pie_align, ALINEACIONES, 'centro'),
    espaciado: uno(c.espaciado, ESPACIADOS, 'normal'),
    color_cabecera: color(c.color_cabecera, '#1e3a5f'),
    color_acento: color(c.color_acento, '#0ea5e9'),
    mostrar_pie: c.mostrar_pie !== false,
    linea_bajo_titulo: c.linea_bajo_titulo !== false,
  };
}

export function esDisenoPorDefecto(cfg) {
  const c = normalizarDiseno(cfg);
  return Object.keys(DISENO_POR_DEFECTO).every((k) => c[k] === DISENO_POR_DEFECTO[k]);
}

const CSS_ALIN = { izquierda: 'left', centro: 'center', derecha: 'right' };

export function alineacionCss(id) {
  return CSS_ALIN[id] || 'left';
}

export function factorEspaciado(id) {
  return (ESPACIADOS.find((e) => e.id === id) || ESPACIADOS[1]).factor;
}

/**
 * El CSS que coloca las cosas donde se ha pedido.
 *
 * Se genera encima de los estilos de siempre para PISARLOS, no para
 * sustituirlos: así lo que no se toca sigue exactamente igual que antes y no
 * hay riesgo de descuadrar documentos que ya funcionaban.
 */
export function cssDelDiseno(cfg) {
  const c = normalizarDiseno(cfg);
  const f = factorEspaciado(c.espaciado);
  const mm = (base) => `${Math.round(base * f * 10) / 10}px`;

  // Cabecera: dirección y colores según lo elegido.
  let cabecera = '';
  if (c.logo_pos === 'centro') {
    cabecera = `
  .company-header { flex-direction: column; align-items: center; text-align: center; }
  .company-header h1, .company-header p { text-align: center; }`;
  } else if (c.logo_pos === 'derecha') {
    cabecera = '\n  .company-header { flex-direction: row-reverse; }';
  } else if (c.logo_pos === 'sin_logo') {
    cabecera = '\n  .company-header img { display: none !important; }';
  }

  let aspecto = '';
  if (c.cabecera_estilo === 'linea') {
    aspecto = `
  .company-header { background: #fff !important; color: ${c.color_cabecera} !important;
                    border-radius: 0; border-bottom: 2px solid ${c.color_cabecera};
                    padding-left: 0; padding-right: 0; }
  .company-header h1 { color: ${c.color_cabecera}; }
  .company-header p { opacity: 1; color: #555; }
  .company-header img { background: transparent; padding: 0; }`;
  } else if (c.cabecera_estilo === 'limpia') {
    aspecto = `
  .company-header { background: #fff !important; color: ${c.color_cabecera} !important;
                    border-radius: 0; border: 0; padding-left: 0; padding-right: 0; }
  .company-header h1 { color: ${c.color_cabecera}; }
  .company-header p { opacity: 1; color: #555; }
  .company-header img { background: transparent; padding: 0; }`;
  } else {
    aspecto = `
  .company-header { background: linear-gradient(135deg, ${c.color_cabecera} 0%, ${c.color_acento} 100%) !important; }`;
  }

  const cliente = c.cliente_pos === 'izquierda'
    ? '\n  .info-box { margin-right: 40%; }'
    : c.cliente_pos === 'ancho_completo'
      ? '\n  .info-box { margin-left: 0; margin-right: 0; }'
      : '\n  .info-box { margin-left: 40%; }';

  return `
  /* ── Colocación elegida en Configuración → Impresión ── */
  .company-header h1, .company-header p { text-align: ${alineacionCss(c.datos_empresa_align)}; }${cabecera}${aspecto}
  .doc-title {
    text-align: ${alineacionCss(c.titulo_align)};
    color: ${c.color_cabecera};
    border-bottom: ${c.linea_bajo_titulo ? `3px solid ${c.color_acento}` : 'none'};
    margin-bottom: ${mm(12)};
  }
  .section-title { border-left-color: ${c.color_acento}; color: ${c.color_cabecera}; margin: ${mm(12)} 0 ${mm(6)}; }
  thead tr, tfoot tr { background: ${c.color_cabecera}; }
  .info-box { border-left-color: ${c.color_acento}; margin-bottom: ${mm(10)}; }${cliente}
  .company-header { margin-bottom: ${mm(12)}; }
  table { margin-bottom: ${mm(10)}; }
  .section-card { margin-bottom: ${mm(14)}; }
  .doc-footer {
    display: ${c.mostrar_pie ? 'block' : 'none'};
    text-align: ${alineacionCss(c.pie_align)};
    margin-top: ${mm(16)};
  }`;
}

/** Un resumen en una frase, para enseñar lo elegido sin abrir el documento. */
export function resumenDiseno(cfg) {
  const c = normalizarDiseno(cfg);
  const n = (lista, id) => (lista.find((x) => x.id === id) || {}).nombre || id;
  return [
    `Logo: ${n(POSICIONES_LOGO, c.logo_pos).toLowerCase()}`,
    `cabecera ${n(ESTILOS_CABECERA, c.cabecera_estilo).toLowerCase()}`,
    `título a la ${n(ALINEACIONES, c.titulo_align).toLowerCase()}`,
    `espaciado ${n(ESPACIADOS, c.espaciado).toLowerCase()}`,
  ].join(' · ');
}
