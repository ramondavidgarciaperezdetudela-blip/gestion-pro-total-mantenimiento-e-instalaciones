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
    detalle: 'Texto consolidado. Derogó el Reglamento (UE) 517/2014. Aquí están los PCA del anexo, los umbrales de control de fugas, las restricciones de uso del artículo 13 y el sistema de cuotas del que sale la cuota europea de HFC que el distribuidor repercute desde 2026.',
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
  vigenciaDatos: '2026',
  moneda: '€',

  // ── Cuota europea de HFC ───────────────────────────────────────────────────
  //
  // Ojo, que esto NO es el impuesto español: son dos cosas distintas que se
  // suman en la misma botella.
  //
  // Desde el 1 de enero de 2026 los distribuidores repercuten una cuota
  // europea sobre el gas VIRGEN, calculada por su CO₂ equivalente. Sale del
  // sistema de cuotas del Reglamento (UE) 2024/573: hay cada vez menos
  // toneladas disponibles en el mercado (42,9 millones de t CO₂e para
  // 2025-2026, un 48 % menos que las 82,3 de 2023) y ese coste se traslada al
  // precio del kilo.
  //
  // El gas regenerado y el reciclado NO la llevan. Por eso salen más baratos
  // cuanto más alto es el PCA, y por eso hay una casilla para marcarlo.
  cuotaEuropea: {
    euroPorToneladaCO2e: 3,
    desde: '2026-01-01',
    exentos: 'gas regenerado y gas reciclado',
    fuente: 'Cuota europea de HFC derivada del Reglamento (UE) 2024/573, repercutida por los distribuidores desde el 1 de enero de 2026',
    confirmar: 'La cuota la fija cada distribuidor al repercutirla. Comprueba en tu albarán el importe que te han cargado: si no coincide, corrige aquí los €/tonelada.',
  },

  // ── Restricciones de uso (artículo 13 del Reglamento (UE) 2024/573) ────────
  //
  // Esto es lo que dice si puedes o no recargar la máquina que tienes delante.
  // Va por fecha, por PCA del gas y por tipo de equipo, y casi siempre tiene
  // una salida: el gas regenerado o reciclado sigue permitido unos años más.
  restricciones: {
    fuente: 'Reglamento (UE) 2024/573, artículo 13 (restricciones de utilización)',
    lista: [
      {
        desde: '2025-01-01',
        pcaMinimo: 2500,
        equipos: 'refrigeracion',
        regeneradoHasta: '2030-01-01',
        texto: 'Desde el 1 de enero de 2025 no se puede usar gas virgen con PCA ≥ 2.500 para el mantenimiento o la revisión de aparatos de refrigeración, sea cual sea la carga. Con el reglamento anterior solo afectaba a equipos de 40 t CO₂e o más; ahora es para todos.',
        salida: 'Se puede seguir usando gas regenerado o reciclado hasta el 1 de enero de 2030.',
      },
      {
        desde: '2026-01-01',
        pcaMinimo: 2500,
        equipos: 'clima',
        regeneradoHasta: '2032-01-01',
        texto: 'Desde el 1 de enero de 2026 no se puede usar gas virgen con PCA ≥ 2.500 para el mantenimiento o la revisión de aparatos de aire acondicionado y bombas de calor.',
        salida: 'Se puede seguir usando gas regenerado o reciclado hasta el 1 de enero de 2032.',
      },
      {
        desde: '2032-01-01',
        pcaMinimo: 750,
        equipos: 'refrigeracion',
        regeneradoHasta: null,
        texto: 'Desde el 1 de enero de 2032 no se podrá usar gas con PCA ≥ 750 para el mantenimiento o la revisión de aparatos de refrigeración fija, salvo enfriadoras.',
        salida: null,
      },
    ],
    confirmar: 'Las restricciones tienen excepciones por tipo de aparato y la Comisión puede suspenderlas temporalmente si hay escasez de gas regenerado. Antes de decirle a un cliente que su máquina no se puede recargar, compruébalo en el texto consolidado del reglamento.',
  },

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
      cuotaEuropea: { ...PARAMETROS_BASE.cuotaEuropea, ...(propios.cuotaEuropea || {}) },
      restricciones: { ...PARAMETROS_BASE.restricciones, ...(propios.restricciones || {}) },
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
    cuotaEuropea: { ...parametros().cuotaEuropea, ...(cambios.cuotaEuropea || {}) },
    restricciones: { ...parametros().restricciones, ...(cambios.restricciones || {}) },
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
 * ¿Se puede recargar esta máquina con este gas, hoy?
 *
 * Devuelve la restricción que muerde, si es que muerde alguna, y por dónde se
 * sale (casi siempre: gas regenerado o reciclado). No inventa nada: recorre la
 * lista de restricciones configurada, que es la del artículo 13.
 *
 * @param {number} pca
 * @param {'refrigeracion'|'clima'} uso   qué tipo de aparato es
 * @param {boolean} regenerado            si el gas es regenerado o reciclado
 * @param {Date} [hoy]                    para poder probarlo con otra fecha
 */
export function restriccionDeUso(pca, uso = 'clima', regenerado = false, hoy = new Date()) {
  const cfg = parametros();
  if (!Number.isFinite(pca)) return null;
  const fecha = hoy instanceof Date ? hoy : new Date(hoy);

  // De las que ya están en vigor y afectan a este equipo, la más exigente:
  // la del PCA más bajo, que es la que de verdad prohíbe.
  const aplicables = (cfg.restricciones?.lista || [])
    .filter((r) => r.equipos === uso && pca >= r.pcaMinimo && new Date(r.desde) <= fecha)
    .sort((a, b) => a.pcaMinimo - b.pcaMinimo);
  if (aplicables.length === 0) return null;

  const r = aplicables[0];
  const salidaViva = r.regeneradoHasta ? new Date(r.regeneradoHasta) > fecha : false;

  return {
    ...r,
    prohibido: !(regenerado && salidaViva),
    regenerado,
    salidaViva,
    resumen: regenerado && salidaViva
      ? `${r.salida} El gas marcado es regenerado o reciclado, así que esta recarga sí se puede hacer.`
      : `${r.texto}${r.salida ? ` ${r.salida}` : ''}`,
  };
}

/** Lo que costará la cuota europea de HFC de esta carga. */
export function cuotaEuropeaDe(toneladas, regenerado = false, hoy = new Date()) {
  const cfg = parametros().cuotaEuropea;
  const fecha = hoy instanceof Date ? hoy : new Date(hoy);
  const enVigor = new Date(cfg.desde) <= fecha;
  const aplicable = enVigor && !regenerado;
  return {
    aplicable,
    enVigor,
    regenerado,
    euroPorToneladaCO2e: cfg.euroPorToneladaCO2e,
    desde: cfg.desde,
    importe: aplicable ? redondear(toneladas * cfg.euroPorToneladaCO2e, 2) : 0,
    motivoNoAplicable: aplicable
      ? null
      : (regenerado
        ? 'El gas regenerado y el reciclado no llevan la cuota europea.'
        : `La cuota europea no se aplica hasta el ${cfg.desde.split('-').reverse().join('/')}.`),
    fuente: cfg.fuente,
  };
}

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
 * @param {boolean} [entrada.regenerado]       el gas es regenerado o reciclado
 * @param {'refrigeracion'|'clima'} [entrada.uso]  tipo de aparato, para las restricciones
 */
export function calcular({
  gas,
  kilos,
  hermetico = false,
  conDetector = false,
  pcaManual = null,
  regenerado = false,
  uso = 'clima',
} = {}) {
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

  // ── Cuota europea de HFC (la que repercute el distribuidor desde 2026) ──
  const cuotaUE = cuotaEuropeaDe(toneladas, regenerado);

  // ── ¿Se puede recargar? ──
  const restriccion = restriccionDeUso(pca.valor, uso, regenerado);

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
  if (restriccion?.prohibido) {
    base.avisos.push(`No se puede recargar con gas virgen: ${restriccion.resumen}`);
  }
  if (cuotaUE.aplicable && cuotaUE.importe > 0) {
    base.avisos.push(
      `Desde el ${cfg.cuotaEuropea.desde.split('-').reverse().join('/')} el distribuidor repercute además la cuota `
      + `europea de HFC: ${cuotaUE.euroPorToneladaCO2e} € por tonelada de CO₂e, ${cuotaUE.importe} € en esta carga. `
      + 'No es el impuesto español: son dos cosas distintas y las dos van dentro del precio del kilo.',
    );
  }

  return {
    ...base,
    toneladas,
    cuotaEuropea: {
      ...cuotaUE,
      formula: cuotaUE.aplicable
        ? `${toneladas} t CO₂e × ${cuotaUE.euroPorToneladaCO2e} €/t  =  ${cuotaUE.importe} €`
          + `   (por kilo: ${pca.valor} PCA × ${cuotaUE.euroPorToneladaCO2e} € ÷ 1.000 = `
          + `${redondear((pca.valor * cuotaUE.euroPorToneladaCO2e) / 1000, 4)} €/kg)`
        : null,
      quienLaPaga: 'La repercute el distribuidor sobre el gas virgen que te factura. No es un impuesto español ni es IVA: '
        + 'es el coste de la cuota europea de HFC del Reglamento (UE) 2024/573, que cada año deja menos toneladas '
        + 'disponibles en el mercado. El gas regenerado y el reciclado no la llevan.',
    },
    restriccion,
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

<p style="margin:10px 0 4px"><strong>Cuota europea de HFC</strong></p>
<table border="1" style="border-collapse:collapse;width:100%;margin:4px 0">
  <tbody>
    ${r.cuotaEuropea?.aplicable
      ? `${f('Tipo', `${r.cuotaEuropea.euroPorToneladaCO2e} € por tonelada de CO₂ equivalente`)}
    ${f('Importe', `${r.cuotaEuropea.importe} €`)}
    ${f('Cálculo', r.cuotaEuropea.formula)}`
      : f('Situación', `No se aplica. ${r.cuotaEuropea?.motivoNoAplicable || ''}`)}
    ${f('Quién la repercute', r.cuotaEuropea?.quienLaPaga || '—')}
  </tbody>
</table>

${r.restriccion ? `<p style="margin:10px 0 4px"><strong>Restricciones de utilización</strong></p>
<table border="1" style="border-collapse:collapse;width:100%;margin:4px 0">
  <tbody>
    ${f(r.restriccion.prohibido ? 'NO se puede recargar con gas virgen' : 'Recarga permitida', r.restriccion.resumen)}
    ${f('Referencia', 'Reglamento (UE) 2024/573, artículo 13 (restricciones de utilización)')}
  </tbody>
</table>` : ''}

<p style="font-size:11px;color:#666;margin-top:10px">
  Datos calculados con los parámetros vigentes en el programa (referencia ${esc(cfg.vigenciaDatos)}):
  tipo ${cfg.impuesto.tipoPorUnidadPca} € por unidad de PCA y kilo, tope ${cfg.impuesto.topePorKilo} €/kg,
  PCA mínimo sujeto ${cfg.impuesto.pcaMinimoSujeto}; cuota europea ${cfg.cuotaEuropea.euroPorToneladaCO2e} €/t CO₂e
  desde el ${esc(String(cfg.cuotaEuropea.desde).split('-').reverse().join('/'))} sobre gas virgen;
  umbrales de fugas ${cfg.fugas.umbral12meses}/${cfg.fugas.umbral6meses}/${cfg.fugas.umbral3meses} t CO₂e
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
  if (r.cuotaEuropea?.aplicable) trozos.push(`Cuota europea: ${r.cuotaEuropea.importe} €`);
  if (r.restriccion?.prohibido) trozos.push('⚠️ No recargable con gas virgen');
  return trozos.join(' · ');
}

// ─── La carga de gas en un presupuesto, una factura o un parte ───────────────

/**
 * Las líneas de una carga de gas, listas para meter en el documento.
 *
 * ⚠️ LO IMPORTANTE, Y NO ES UN DETALLE: el impuesto sobre los gases fluorados
 * lo autoliquidan los fabricantes, importadores, adquirentes intracomunitarios
 * y almacenistas. La empresa instaladora NO lo declara: lo paga ya metido en
 * el precio de la botella.
 *
 * Por eso, si el precio por kilo que has puesto es el que te cobró tu
 * proveedor —que es lo normal—, el impuesto YA ESTÁ DENTRO. Sumarlo otra vez
 * al cliente sería cobrárselo dos veces. Así que de fábrica el impuesto sale
 * como información: se dice cuánto de ese precio es impuesto, y no se suma.
 *
 * Solo se suma aparte si marcas que tu precio va sin impuesto, que pasa cuando
 * lo has apuntado a pelo del coste del gas sin repercutirlo.
 *
 * @param {object} d
 * @param {string} d.gas                 identificador, p. ej. 'R-410A'
 * @param {number|string} d.kilos        kilos que se han metido
 * @param {number|string} d.precioKilo   euros por kilo
 * Con la cuota europea de HFC pasa exactamente lo mismo desde el 1 de enero de
 * 2026: la repercute el distribuidor sobre el gas virgen y llega dentro del
 * precio del kilo. Así que va por el mismo camino, con la misma casilla.
 *
 * @param {boolean} [d.impuestoIncluido] si el precio ya lleva impuesto y cuota (por defecto sí)
 * @param {boolean} [d.regenerado]       el gas es regenerado o reciclado (no lleva cuota europea)
 * @param {'refrigeracion'|'clima'} [d.uso] tipo de aparato, para las restricciones de recarga
 * @param {string}  [d.concepto]         texto de la línea, si se quiere otro
 */
export function lineasDeCargaDeGas({
  gas, kilos, precioKilo, impuestoIncluido = true, regenerado = false, uso = 'clima', concepto = null,
} = {}) {
  const kg = Number(String(kilos ?? '').replace(',', '.'));
  const precio = Number(String(precioKilo ?? '').replace(',', '.'));
  const ficha = buscarRefrigerante(gas);

  const faltan = [];
  if (!gas) faltan.push('el gas');
  if (!Number.isFinite(kg) || kg <= 0) faltan.push('los kilos');
  if (!Number.isFinite(precio) || precio < 0) faltan.push('el precio por kilo');
  if (faltan.length) return { completo: false, faltan };

  const cuentas = calcular({ gas, kilos: kg, regenerado, uso });
  const importeGas = Math.round(precio * kg * 100) / 100;
  const impuesto = cuentas.impuesto?.sujeto ? cuentas.impuesto.cuota : 0;
  const cuotaUE = cuentas.cuotaEuropea?.aplicable ? cuentas.cuotaEuropea.importe : 0;

  const lineas = [{
    description: concepto
      || `Carga de refrigerante ${ficha?.nombre || gas}${regenerado ? ' regenerado' : ''} — ${kg} kg`,
    quantity: kg,
    unit_price: precio,
    discount: 0,
    total: importeGas,
  }];

  // Solo se suma si el precio NO lo llevaba dentro.
  if (!impuestoIncluido && impuesto > 0) {
    lineas.push({
      description: `Impuesto sobre gases fluorados — ${ficha?.nombre || gas} `
        + `(PCA ${cuentas.pca} × ${String(cuentas.parametros.impuesto.tipoPorUnidadPca).replace('.', ',')} €/kg`
        + `${cuentas.impuesto.topeAplicado ? `, limitado al tope de ${String(cuentas.parametros.impuesto.topePorKilo).replace('.', ',')} €/kg` : ''})`,
      quantity: kg,
      unit_price: cuentas.impuesto.tipoAplicado,
      discount: 0,
      total: impuesto,
    });
  }

  if (!impuestoIncluido && cuotaUE > 0) {
    lineas.push({
      description: `Cuota europea de HFC — ${ficha?.nombre || gas} `
        + `(${String(cuentas.toneladas).replace('.', ',')} t CO₂e × `
        + `${String(cuentas.cuotaEuropea.euroPorToneladaCO2e).replace('.', ',')} €/t)`,
      quantity: 1,
      unit_price: cuotaUE,
      discount: 0,
      total: cuotaUE,
    });
  }

  const total = Math.round(lineas.reduce((n, l) => n + l.total, 0) * 100) / 100;

  return {
    completo: true,
    gas: ficha?.nombre || gas,
    kilos: kg,
    precioKilo: precio,
    importeGas,
    impuesto,
    impuestoIncluido,
    cuotaEuropea: cuotaUE,
    cuotaAplicable: Boolean(cuentas.cuotaEuropea?.aplicable),
    tipoCuotaEuropea: cuentas.cuotaEuropea?.euroPorToneladaCO2e ?? 0,
    motivoSinCuota: cuentas.cuotaEuropea?.motivoNoAplicable || null,
    regenerado,
    uso,
    restriccion: cuentas.restriccion || null,
    tipoImpuesto: cuentas.impuesto?.tipoAplicado ?? 0,
    sujeto: Boolean(cuentas.impuesto?.sujeto),
    pca: cuentas.pca,
    toneladas: cuentas.toneladas,
    total,
    lineas,
    observaciones: observacionesDeCarga({
      cuentas, ficha, kg, precio, importeGas, impuesto, impuestoIncluido, cuotaUE, regenerado,
    }),
    avisos: cuentas.avisos,
  };
}

/**
 * El texto que va a observaciones del documento.
 *
 * Lleva la normativa dentro porque es lo que pide un cliente cuando ve una
 * línea de impuesto en su factura: de dónde sale ese número. Y lleva también
 * los datos de la carga, que son los que hacen falta para el libro de
 * registro del equipo.
 */
export function observacionesDeCarga({
  cuentas, ficha, kg, precio, importeGas, impuesto, impuestoIncluido, cuotaUE = 0, regenerado = false,
}) {
  const cfg = cuentas.parametros;
  const trozos = [];
  // Este texto va tal cual a la factura del cliente: los decimales con coma,
  // que en español «6.264 t» se lee como seis mil doscientas sesenta y cuatro.
  const es = (n) => String(n).replace('.', ',');

  trozos.push(
    `CARGA DE REFRIGERANTE: ${ficha?.nombre || cuentas.gas}${regenerado ? ' (regenerado/reciclado)' : ''} · `
    + `${es(kg)} kg · ${es(precio)} €/kg · ${es(importeGas)} €.`,
  );
  trozos.push(
    `PCA (GWP) ${cuentas.pca} · ${es(cuentas.toneladas)} t CO₂ equivalente · ${cuentas.fugas.texto}`,
  );

  if (cuentas.impuesto.sujeto) {
    trozos.push(
      `IMPUESTO SOBRE LOS GASES FLUORADOS: ${es(cuentas.impuesto.tipoAplicado)} €/kg `
      + `(${cuentas.pca} × ${es(cfg.impuesto.tipoPorUnidadPca)} €`
      + `${cuentas.impuesto.topeAplicado ? `, con el tope de ${es(cfg.impuesto.topePorKilo)} €/kg` : ''}) `
      + `· ${es(impuesto)} € por los ${es(kg)} kg. `
      + (impuestoIncluido
        ? 'Este importe NO se suma aparte: va incluido en el precio por kilo, porque el impuesto lo '
          + 'repercute el proveedor del gas. Se detalla solo a título informativo.'
        : 'Este importe SÍ se repercute aparte porque el precio por kilo indicado no lo incluye.'),
    );
  } else {
    trozos.push(
      `IMPUESTO SOBRE LOS GASES FLUORADOS: no sujeto. ${cuentas.impuesto.motivoNoSujeto}`,
    );
  }

  trozos.push(
    'El impuesto lo autoliquidan los fabricantes, importadores, adquirentes intracomunitarios y '
    + 'almacenistas de gases fluorados; la empresa instaladora lo soporta dentro del precio de compra.',
  );

  // La cuota europea es otra cosa distinta del impuesto español, y desde 2026
  // van las dos en el mismo kilo. Se dice expresamente para que nadie las
  // confunda al leer la factura.
  const ue = cuentas.cuotaEuropea;
  if (ue?.aplicable) {
    trozos.push(
      `CUOTA EUROPEA DE HFC: ${es(ue.euroPorToneladaCO2e)} € por tonelada de CO₂ equivalente `
      + `· ${es(cuentas.toneladas)} t × ${es(ue.euroPorToneladaCO2e)} € = ${es(cuotaUE || ue.importe)} € `
      + `(por kilo: PCA ${cuentas.pca} × ${es(ue.euroPorToneladaCO2e)} € ÷ 1.000). `
      + (impuestoIncluido
        ? 'Repercutida por el distribuidor dentro del precio del kilo; se detalla, no se suma aparte. '
        : 'Se repercute aparte porque el precio por kilo indicado no la incluye. ')
      + 'No es un impuesto español ni es IVA: es el coste de la cuota europea de HFC, en vigor desde el '
      + `${String(ue.desde).split('-').reverse().join('/')} y aplicable solo al gas virgen.`,
    );
  } else if (ue) {
    trozos.push(`CUOTA EUROPEA DE HFC: no se aplica. ${ue.motivoNoAplicable}`);
  }

  // Si la máquina no se puede recargar con gas virgen, eso va en el papel.
  if (cuentas.restriccion) {
    trozos.push(
      `${cuentas.restriccion.prohibido ? '⚠️ RESTRICCIÓN DE USO' : 'RESTRICCIÓN DE USO'}: `
      + `${cuentas.restriccion.resumen} (Reglamento (UE) 2024/573, artículo 13).`,
    );
  }

  trozos.push(
    'NORMATIVA DE REFERENCIA: Ley 14/2022, de 8 de julio (impuesto sobre los gases fluorados de efecto '
    + 'invernadero); Reglamento (UE) 2024/573 y sus revisiones posteriores (PCA de los gases y control de '
    + 'fugas); RD 115/2017 (comercialización y manipulación de gases fluorados en España). '
    + `Calculado con los parámetros vigentes en el programa (referencia ${cfg.vigenciaDatos}): `
    + `${es(cfg.impuesto.tipoPorUnidadPca)} € por unidad de PCA y kilo, con tope de ${es(cfg.impuesto.topePorKilo)} €/kg, `
    + `sin sujeción por debajo de PCA ${cfg.impuesto.pcaMinimoSujeto}, `
    + `y cuota europea de HFC de ${es(cfg.cuotaEuropea.euroPorToneladaCO2e)} € por tonelada de CO₂ equivalente `
    + `desde el ${String(cfg.cuotaEuropea.desde).split('-').reverse().join('/')} sobre gas virgen.`,
  );

  if (ficha?.estado === 'prohibido') {
    trozos.push(
      `⚠️ ${ficha.nombre} no se puede utilizar en recargas. Si el documento refleja una recarga, `
      + 'revísalo: la operación no es legal y el equipo debe reconvertirse o sustituirse.',
    );
  }

  return trozos.join('\n\n');
}
