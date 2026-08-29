/**
 * gasesFluorados.js — El cálculo del impuesto y del control de fugas.
 *
 * Qué resuelve: cuando cargas gas en una máquina hacen falta varios números
 * que nadie se sabe de memoria —las toneladas equivalentes de CO₂, cada cuánto
 * hay que mirar fugas, si el equipo necesita detector, cuánto impuesto lleva
 * ese gas dentro del precio— y todos salen del mismo sitio: el PCA del gas y
 * los kilos que lleva. Aquí se calculan de una vez y se enseña la cuenta
 * entera, paso por paso, para que se pueda comprobar.
 *
 * ─── Por qué los parámetros son EDITABLES ────────────────────────────────────
 *
 * Los valores de PCA y los tipos del impuesto cambian de una revisión a otra
 * del reglamento y de la ley. Si estuvieran clavados en el código, cada cambio
 * exigiría una versión nueva del programa y mientras tanto estarías calculando
 * con datos viejos.
 *
 * Así que todo lo que puede cambiar —el tipo por unidad de PCA, el tope por
 * kilo, el PCA mínimo que tributa, los umbrales de fugas y hasta el PCA de un
 * gas concreto— se puede corregir desde la pantalla y queda guardado. Cada
 * resultado dice con qué datos se ha calculado y de qué fecha son.
 *
 * ─── Lo que NO hace esto ─────────────────────────────────────────────────────
 *
 * Esto no sustituye al texto oficial ni a tu gestoría. Da la cuenta hecha y las
 * referencias para comprobarla:
 *
 *   · Reglamento (UE) 2024/573 (texto consolidado, incluye revisiones)
 *   · Ley 14/2022, de 8 de julio (impuesto sobre los gases fluorados)
 *   · RD 115/2017 (comercialización y manipulación en España)
 *
 * Los enlaces abren SIEMPRE la versión consolidada vigente, así que recogen
 * también las modificaciones posteriores.
 */

import { buscarRefrigerante } from './refrigerantes';

// ─── Referencias oficiales ───────────────────────────────────────────────────

export const REFERENCIAS = [
  {
    id: 'ue2024573',
    titulo: 'Reglamento (UE) 2024/573 — gases fluorados de efecto invernadero',
    detalle: 'Texto consolidado. Derogó el Reglamento (UE) 517/2014. Aquí están los PCA del anexo, los umbrales de control de fugas y las prohibiciones por tipo de equipo.',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:02024R0573',
  },
  {
    id: 'ley142022',
    titulo: 'Ley 14/2022, de 8 de julio — impuesto sobre los gases fluorados',
    detalle: 'Régimen vigente del impuesto desde el 1 de septiembre de 2022. Sustituyó al artículo 5 de la Ley 16/2013.',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2022-11311',
  },
  {
    id: 'rd1152017',
    titulo: 'RD 115/2017 — comercialización y manipulación de gases fluorados en España',
    detalle: 'Certificación del personal y de las empresas, registro de comercializadores y obligaciones de los operadores.',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2017-1664',
  },
  {
    id: 'aeat587',
    titulo: 'Agencia Tributaria — impuesto sobre los gases fluorados',
    detalle: 'Modelos de autoliquidación, plazos y quién está obligado a presentarlos.',
    url: 'https://sede.agenciatributaria.gob.es/',
  },
];

// ─── Parámetros que pueden cambiar ───────────────────────────────────────────

/**
 * Los valores de partida. Cada uno lleva de dónde sale y si es un dato que
 * conviene confirmar, porque no todos tienen la misma solidez.
 */
export const PARAMETROS_BASE = {
  vigenciaDatos: '2024',
  moneda: '€',

  impuesto: {
    // Cuota = kilos × PCA × tipoPorUnidadPca, con el tope de topePorKilo.
    tipoPorUnidadPca: 0.015,
    topePorKilo: 100,
    pcaMinimoSujeto: 150,
    fuente: 'Ley 14/2022, de 8 de julio',
    confirmar: 'El umbral de PCA por debajo del cual el gas no tributa y el tope por kilo conviene confirmarlos con la redacción vigente de la ley y con tu gestoría antes de repercutir nada en una factura.',
  },

  fugas: {
    // Umbrales en toneladas de CO₂ equivalente.
    umbral12meses: 5,
    umbral6meses: 50,
    umbral3meses: 500,
    umbralHermetico: 10,
    umbralDetectorObligatorio: 500,
    aniosConservarRegistros: 5,
    fuente: 'Reglamento (UE) 2024/573, artículos de control de fugas y de registros',
  },
};

const CLAVE_GUARDADO = 'gpt:gases-fluorados:parametros';

/** Los parámetros que se están usando: los de fábrica con las correcciones encima. */
export function parametros() {
  try {
    const guardado = localStorage.getItem(CLAVE_GUARDADO);
    if (!guardado) return PARAMETROS_BASE;
    const propios = JSON.parse(guardado);
    return {
      ...PARAMETROS_BASE,
      ...propios,
      impuesto: { ...PARAMETROS_BASE.impuesto, ...(propios.impuesto || {}) },
      fugas: { ...PARAMETROS_BASE.fugas, ...(propios.fugas || {}) },
    };
  } catch {
    // Sin almacenamiento (ventana privada, permisos) se sigue con los de fábrica.
    return PARAMETROS_BASE;
  }
}

/** Guardar una corrección. Devuelve los parámetros ya combinados. */
export function guardarParametros(cambios) {
  const nuevos = {
    ...parametros(),
    ...cambios,
    impuesto: { ...parametros().impuesto, ...(cambios.impuesto || {}) },
    fugas: { ...parametros().fugas, ...(cambios.fugas || {}) },
  };
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(nuevos));
  } catch {
    // Si no se puede guardar, al menos el cálculo de esta sesión sale bien.
  }
  return nuevos;
}

/** Volver a los valores de fábrica. */
export function restaurarParametros() {
  try { localStorage.removeItem(CLAVE_GUARDADO); } catch { /* da igual */ }
  return PARAMETROS_BASE;
}

// ─── PCA corregidos a mano ───────────────────────────────────────────────────

const CLAVE_PCA = 'gpt:gases-fluorados:pca';

/** Los PCA que el usuario haya corregido: { 'R-410A': 2256 } */
export function pcaCorregidos() {
  try { return JSON.parse(localStorage.getItem(CLAVE_PCA) || '{}'); } catch { return {}; }
}

/** Corregir el PCA de un gas. Pasa null para volver al de fábrica. */
export function corregirPca(id, valor) {
  const todos = pcaCorregidos();
  if (valor === null || valor === undefined || valor === '') delete todos[id];
  else todos[id] = Number(String(valor).replace(',', '.'));
  try { localStorage.setItem(CLAVE_PCA, JSON.stringify(todos)); } catch { /* da igual */ }
  return todos;
}

/**
 * El PCA que se va a usar para un gas, y de dónde sale.
 * @returns {{valor:number|null, origen:'corregido'|'catalogo'|'desconocido'}}
 */
export function pcaDe(idGas) {
  const corregido = pcaCorregidos()[idGas];
  if (Number.isFinite(corregido)) return { valor: corregido, origen: 'corregido' };
  const gwp = buscarRefrigerante(idGas)?.gwp;
  if (Number.isFinite(gwp)) return { valor: gwp, origen: 'catalogo' };
  return { valor: null, origen: 'desconocido' };
}

// ─── Cálculos ────────────────────────────────────────────────────────────────

const num = (v) => {
  // Ojo con el vacío: Number('') es 0, no NaN. Sin este corte, un PCA sin
  // rellenar se tomaba como PCA cero y toda la cuenta salía a cero.
  const texto = String(v ?? '').replace(',', '.').trim();
  if (texto === '') return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
};

const redondear = (n, dec = 2) => Math.round(n * 10 ** dec) / 10 ** dec;

/**
 * La cuenta entera de un gas y una carga.
 *
 * Devuelve TODOS los pasos, no solo el resultado: quien lo lea tiene que poder
 * rehacer la cuenta con una calculadora y que le dé lo mismo.
 *
 * @param {object} entrada
 * @param {string} entrada.gas        identificador, p. ej. 'R-404A'
 * @param {number|string} entrada.kilos
 * @param {boolean} [entrada.hermetico]        equipo herméticamente sellado y etiquetado como tal
 * @param {boolean} [entrada.conDetector]      lleva sistema de detección de fugas
 * @param {number|string} [entrada.pcaManual]  PCA a usar en vez del del catálogo
 */
export function calcular({ gas, kilos, hermetico = false, conDetector = false, pcaManual = null } = {}) {
  const cfg = parametros();
  const kg = num(kilos);
  const ficha = buscarRefrigerante(gas);
  const pcaElegido = num(pcaManual);
  const pca = pcaElegido !== null
    ? { valor: pcaElegido, origen: 'corregido' }
    : pcaDe(gas);

  const base = {
    gas,
    nombreGas: ficha?.nombre || gas || '—',
    familia: ficha?.familia || null,
    seguridad: ficha?.seguridad || null,
    estado: ficha?.estado || null,
    kilos: kg,
    pca: pca.valor,
    origenPca: pca.origen,
    parametros: cfg,
    referencias: REFERENCIAS,
    avisos: [],
  };

  if (kg === null || kg <= 0) {
    base.avisos.push('Falta la carga en kilogramos: sin ella no se puede calcular nada.');
    return base;
  }
  if (pca.valor === null) {
    base.avisos.push('No se conoce el PCA de este gas. Escríbelo a mano tomándolo del anexo del Reglamento (UE) 2024/573.');
    return base;
  }

  // ── Toneladas equivalentes de CO₂ ──
  const toneladas = redondear((pca.valor * kg) / 1000, 3);

  // ── Impuesto ──
  const tipoSinTope = redondear(pca.valor * cfg.impuesto.tipoPorUnidadPca, 4);
  const tipoAplicado = Math.min(tipoSinTope, cfg.impuesto.topePorKilo);
  const sujeto = pca.valor > cfg.impuesto.pcaMinimoSujeto;
  const cuota = sujeto ? redondear(tipoAplicado * kg, 2) : 0;

  // ── Control de fugas ──
  const f = cfg.fugas;
  const umbralMinimo = hermetico ? f.umbralHermetico : f.umbral12meses;
  let mesesBase = null;
  if (toneladas >= f.umbral3meses) mesesBase = 3;
  else if (toneladas >= f.umbral6meses) mesesBase = 6;
  else if (toneladas >= umbralMinimo) mesesBase = 12;

  const meses = mesesBase === null ? null : (conDetector ? mesesBase * 2 : mesesBase);
  const detectorObligatorio = toneladas >= f.umbralDetectorObligatorio;
  const llevaRegistro = mesesBase !== null;

  // ── Avisos que importan ──
  if (ficha?.estado === 'prohibido') {
    base.avisos.push(`${ficha.nombre} no se puede usar en equipos nuevos ni para recargar. En el papel se pone igual —es lo que lleva la máquina—, pero la recarga no es legal: hay que recuperarlo y cambiar de gas o de equipo.`);
  }
  if (pca.origen === 'corregido') {
    base.avisos.push('Se está usando un PCA corregido a mano, no el del catálogo del programa.');
  }
  if (detectorObligatorio && !conDetector) {
    base.avisos.push('Con esta carga el sistema de detección de fugas es obligatorio y todavía no está marcado como instalado.');
  }
  if (sujeto && cfg.impuesto.confirmar) {
    base.avisos.push(cfg.impuesto.confirmar);
  }

  return {
    ...base,
    toneladas,
    impuesto: {
      sujeto,
      motivoNoSujeto: sujeto ? null : `El PCA (${pca.valor}) no supera el mínimo configurado de ${cfg.impuesto.pcaMinimoSujeto}.`,
      tipoPorUnidadPca: cfg.impuesto.tipoPorUnidadPca,
      tipoSinTope,
      topePorKilo: cfg.impuesto.topePorKilo,
      topeAplicado: tipoSinTope > cfg.impuesto.topePorKilo,
      tipoAplicado: redondear(tipoAplicado, 4),
      cuota,
      formula: `${kg} kg × ${pca.valor} PCA × ${cfg.impuesto.tipoPorUnidadPca} €  =  ${redondear(tipoAplicado, 4)} €/kg × ${kg} kg  =  ${cuota} €`,
      quienLoPaga: 'El impuesto lo autoliquidan los fabricantes, importadores, adquirentes intracomunitarios y almacenistas de gases fluorados. Como empresa instaladora normalmente lo pagas ya incluido en el precio de la botella: este número te sirve para saber qué parte del coste del gas es impuesto, no para presentar tú una autoliquidación.',
    },
    fugas: {
      obligado: mesesBase !== null,
      umbralAplicado: umbralMinimo,
      hermetico,
      conDetector,
      mesesBase,
      meses,
      texto: mesesBase === null
        ? `Sin obligación de control periódico de fugas: ${toneladas} t CO₂e no llega al umbral de ${umbralMinimo} t${hermetico ? ' (equipo herméticamente sellado)' : ''}.`
        : `Control de fugas al menos cada ${meses} meses${conDetector ? ` (${mesesBase} meses de base, duplicado por llevar sistema de detección)` : ''}.`,
      detectorObligatorio,
      llevaRegistro,
      textoRegistro: llevaRegistro
        ? `Hay que llevar registro de las intervenciones y conservarlo ${f.aniosConservarRegistros} años a disposición de la Administración.`
        : 'Sin obligación de registro por control de fugas para esta carga.',
    },
  };
}

/**
 * La ficha en HTML, para que se pueda meter en un documento.
 * Va con las referencias dentro: quien lo reciba tiene que poder comprobarlo.
 */
export function fichaHtml(r) {
  if (!r || !r.toneladas) return '';
  const cfg = r.parametros;
  const esc = (t) => String(t ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const f = (etiqueta, valor) => `<tr><td style="padding:8px;border:1px solid #ccc;width:50%"><strong>${esc(etiqueta)}</strong></td><td style="padding:8px;border:1px solid #ccc">${esc(valor)}</td></tr>`;

  return `<h3>FICHA DE GASES FLUORADOS</h3>
<table border="1" style="border-collapse:collapse;width:100%;margin:10px 0">
  <tbody>
    ${f('Gas refrigerante', r.nombreGas)}
    ${f('Familia / Grupo de seguridad', [r.familia, r.seguridad].filter(Boolean).join(' · ') || '—')}
    ${f('PCA (GWP) aplicado', `${r.pca}${r.origenPca === 'corregido' ? ' (corregido a mano)' : ''}`)}
    ${f('Carga de refrigerante', `${r.kilos} kg`)}
    ${f('Toneladas equivalentes de CO₂', `${r.toneladas} t CO₂e`)}
    ${f('Cálculo', `${r.kilos} kg × ${r.pca} PCA ÷ 1.000 = ${r.toneladas} t CO₂e`)}
  </tbody>
</table>

<p style="margin:10px 0 4px"><strong>Control de fugas</strong></p>
<table border="1" style="border-collapse:collapse;width:100%;margin:4px 0">
  <tbody>
    ${f('Periodicidad', r.fugas.texto)}
    ${f('Equipo herméticamente sellado', r.fugas.hermetico ? 'Sí' : 'No')}
    ${f('Sistema de detección de fugas', r.fugas.conDetector ? 'Instalado' : (r.fugas.detectorObligatorio ? 'OBLIGATORIO — pendiente de instalar' : 'No exigido para esta carga'))}
    ${f('Registro de intervenciones', r.fugas.textoRegistro)}
  </tbody>
</table>

<p style="margin:10px 0 4px"><strong>Impuesto sobre los gases fluorados</strong></p>
<table border="1" style="border-collapse:collapse;width:100%;margin:4px 0">
  <tbody>
    ${r.impuesto.sujeto
      ? `${f('Tipo por kilo', `${r.pca} PCA × ${cfg.impuesto.tipoPorUnidadPca} € = ${r.impuesto.tipoSinTope} €/kg${r.impuesto.topeAplicado ? ` → limitado al tope de ${cfg.impuesto.topePorKilo} €/kg` : ''}`)}
    ${f('Tipo aplicado', `${r.impuesto.tipoAplicado} €/kg`)}
    ${f('Importe del impuesto', `${r.impuesto.cuota} €`)}
    ${f('Cálculo', r.impuesto.formula)}`
      : f('Situación', `No sujeto. ${r.impuesto.motivoNoSujeto}`)}
    ${f('Quién lo autoliquida', r.impuesto.quienLoPaga)}
  </tbody>
</table>

<p style="font-size:11px;color:#666;margin-top:10px">
  Datos calculados con los parámetros vigentes en el programa (referencia ${esc(cfg.vigenciaDatos)}):
  tipo ${cfg.impuesto.tipoPorUnidadPca} € por unidad de PCA y kilo, tope ${cfg.impuesto.topePorKilo} €/kg,
  PCA mínimo sujeto ${cfg.impuesto.pcaMinimoSujeto}; umbrales de fugas ${cfg.fugas.umbral12meses}/${cfg.fugas.umbral6meses}/${cfg.fugas.umbral3meses} t CO₂e
  (${cfg.fugas.umbralHermetico} t en equipos herméticamente sellados).
  Referencias: Reglamento (UE) 2024/573 y sus revisiones posteriores (texto consolidado),
  Ley 14/2022 de 8 de julio y RD 115/2017.
  Comprueba los valores en el texto consolidado vigente antes de usarlos para una autoliquidación.
</p>`;
}

/** Resumen de una línea, para enseñarlo al lado del selector de gas. */
export function resumenCorto(r) {
  if (!r || !r.toneladas) return '';
  const trozos = [`${r.toneladas} t CO₂e`, r.fugas.texto];
  if (r.impuesto.sujeto) trozos.push(`Impuesto: ${r.impuesto.cuota} € (${r.impuesto.tipoAplicado} €/kg)`);
  else trozos.push('No sujeto al impuesto');
  return trozos.join(' · ');
}
