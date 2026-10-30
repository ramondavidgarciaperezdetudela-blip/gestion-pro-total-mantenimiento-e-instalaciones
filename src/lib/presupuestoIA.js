/**
 * presupuestoIA.js — Presupuestar un trabajo descrito con tus palabras.
 *
 * La diferencia con la búsqueda de materiales: aquí no se pide una lista de
 * material, se describe el TRABAJO ("cambiar el compresor de una cámara de
 * congelado de 20 m²") y hay que sacar todo lo que lleva: material, mano de
 * obra, desplazamiento y lo que haga falta.
 *
 * REGLA QUE MANDA SOBRE TODO LO DEMÁS: los precios que salen de la IA son una
 * orientación, no una tarifa. Un presupuesto que se manda a un cliente con un
 * precio inventado es un problema de verdad. Por eso:
 *
 *   1. Cada partida se busca PRIMERO en tu base de precios. Si está, se usa
 *      TU precio, no el que diga la IA.
 *   2. Lo que no está queda marcado como estimado, bien visible.
 *   3. El total se da como un rango, y el margen se aplica SOLO a la parte
 *      estimada: lo que sale de tus precios no tiene incertidumbre.
 */

/** Quita tildes y mayúsculas para poder comparar textos escritos a mano. */
export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Palabras que aparecen en todas partes y no ayudan a distinguir una partida
// de otra. Sin quitarlas, "mano de obra de electricista" casaría con
// "mano de obra de fontanero" solo por los "de".
const VACIAS = new Set([
  'de', 'del', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o',
  'con', 'sin', 'para', 'por', 'en', 'a', 'al', 'su', 'sus', 'mm', 'cm',
]);

export function palabras(texto) {
  return normalizar(texto).split(' ').filter((p) => p.length > 1 && !VACIAS.has(p));
}

/**
 * Cuánto se parecen dos descripciones, de 0 a 1.
 *
 * Se mira qué parte de la partida buscada aparece en el artículo de tu base:
 * si la IA pide "codo de cobre 22" y tú tienes "codo cobre 22 mm soldar", eso
 * es una buena coincidencia aunque tu descripción sea más larga.
 */
export function parecido(buscado, candidato) {
  const a = palabras(buscado);
  const b = new Set(palabras(candidato));
  if (!a.length || !b.size) return 0;
  let comunes = 0;
  for (const p of a) if (b.has(p)) comunes++;
  return comunes / a.length;
}

/** A partir de cuánto se considera que es el mismo artículo. */
export const PARECIDO_MINIMO = 0.6;

/**
 * Busca una partida en tu base de precios.
 * @returns {{item:object, parecido:number}|null}
 */
export function buscarEnTusPrecios(descripcion, catalogo, minimo = PARECIDO_MINIMO) {
  let mejor = null;
  for (const item of catalogo || []) {
    if (item?.is_active === false) continue;
    const p = parecido(descripcion, item?.description);
    if (p >= minimo && (!mejor || p > mejor.parecido)) mejor = { item, parecido: p };
  }
  return mejor;
}

export const CATEGORIAS = {
  material: 'Material',
  mano_obra: 'Mano de obra',
  desplazamiento: 'Desplazamiento',
  otro: 'Otro',
};

export function categoriaValida(c) {
  return Object.prototype.hasOwnProperty.call(CATEGORIAS, c) ? c : 'otro';
}

/**
 * Cruza lo que ha propuesto la IA con tu base de precios.
 *
 * Cada partida sale marcada con de dónde viene el precio:
 *   'propio'    → de tu base de precios (fiable)
 *   'estimado'  → lo ha calculado la IA (orientativo)
 */
export function conTusPrecios(partidas, catalogo) {
  return (partidas || []).map((p) => {
    const cantidad = Number(p?.quantity) > 0 ? Number(p.quantity) : 1;
    const precioIA = Number(p?.unit_price) >= 0 ? Number(p.unit_price) : 0;
    const encontrado = buscarEnTusPrecios(p?.description, catalogo);
    if (encontrado) {
      return {
        description: encontrado.item.description || p?.description || '',
        quantity: cantidad,
        unit_price: Number(encontrado.item.unit_price) || 0,
        unidad: encontrado.item.unit || p?.unit || 'ud',
        categoria: categoriaValida(encontrado.item.category || p?.category),
        supplier: p?.supplier || '',
        origen: 'propio',
        precioIA,
        parecido: encontrado.parecido,
      };
    }
    return {
      description: p?.description || '',
      quantity: cantidad,
      unit_price: precioIA,
      unidad: p?.unit || 'ud',
      categoria: categoriaValida(p?.category),
      supplier: p?.supplier || '',
      origen: 'estimado',
      precioIA,
      parecido: 0,
    };
  }).filter((p) => p.description);
}

/** Margen de incertidumbre que se aplica a lo que ha estimado la IA. */
export const MARGEN_ESTIMADO = 0.25;

/**
 * Cuentas del trabajo: totales, desglose y el rango honesto.
 *
 * El rango NO se calcula sobre el total: lo que viene de tus precios se sabe
 * exactamente. Solo baila la parte estimada.
 */
export function cuentas(partidas, margen = MARGEN_ESTIMADO) {
  const lineas = partidas || [];
  const importe = (p) => (Number(p.quantity) || 0) * (Number(p.unit_price) || 0);

  let deTusPrecios = 0;
  let estimado = 0;
  const porCategoria = {};

  for (const p of lineas) {
    const i = importe(p);
    if (p.origen === 'propio') deTusPrecios += i; else estimado += i;
    const c = categoriaValida(p.categoria);
    porCategoria[c] = (porCategoria[c] || 0) + i;
  }

  const total = deTusPrecios + estimado;
  return {
    total,
    deTusPrecios,
    estimado,
    porCategoria,
    minimo: deTusPrecios + estimado * (1 - margen),
    maximo: deTusPrecios + estimado * (1 + margen),
    cuantasPropias: lineas.filter((p) => p.origen === 'propio').length,
    cuantasEstimadas: lineas.filter((p) => p.origen !== 'propio').length,
    // Cuánto del total descansa en precios tuyos: es la medida de si el
    // número se puede enseñar o hay que repasarlo antes.
    fiabilidad: total > 0 ? deTusPrecios / total : 0,
  };
}

/** Un aviso proporcional a lo poco o mucho que se apoya en tus precios. */
export function avisoDeFiabilidad(c) {
  if (!c || c.total <= 0) return null;
  if (c.cuantasEstimadas === 0) {
    return { nivel: 'bien', texto: 'Todas las partidas salen de tu base de precios.' };
  }
  if (c.fiabilidad >= 0.6) {
    return {
      nivel: 'medio',
      texto: `${c.cuantasEstimadas} partida${c.cuantasEstimadas === 1 ? '' : 's'} con precio estimado. Repásalas antes de mandarlo.`,
    };
  }
  return {
    nivel: 'ojo',
    texto: 'La mayor parte del importe es estimado por la IA, no son precios tuyos. Sirve para hacerte una idea, NO para mandárselo al cliente sin repasarlo.',
  };
}

/** Lo que se guarda en el presupuesto: solo los campos de siempre. */
export function comoPartidaDePresupuesto(p) {
  return {
    description: p.description,
    quantity: Number(p.quantity) || 1,
    unit_price: Number(p.unit_price) || 0,
    supplier: p.supplier || '',
    discount: 0,
  };
}

// ── Lo que se le pide a la IA ─────────────────────────────────────────────

export const ESQUEMA_TRABAJO = {
  type: 'object',
  properties: {
    resumen: { type: 'string' },
    supuestos: { type: 'array', items: { type: 'string' } },
    partidas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          unit_price: { type: 'number' },
          unit: { type: 'string' },
          category: { type: 'string', enum: ['material', 'mano_obra', 'desplazamiento', 'otro'] },
          supplier: { type: 'string' },
        },
      },
    },
  },
};

/**
 * El encargo para la IA.
 *
 * Se le pasan TUS precios (los que puedan encajar) para que no se invente lo
 * que ya está tarifado, y se le pide que separe la mano de obra en horas, que
 * es como se presupuesta de verdad.
 */
/** Cuántos precios tuyos se le enseñan a la IA de una vez. */
export const PRECIOS_EN_EL_ENCARGO = 60;

/**
 * Qué precios tuyos se le mandan a la IA.
 *
 * OJO con la tentación de filtrar por parecido con lo que ha escrito el
 * técnico: no funciona. "Cambiar el compresor de una cámara" no se parece a
 * "gas refrigerante" ni a "mano de obra", que son justo las partidas que va a
 * necesitar. Filtrando así, la IA no veía NINGÚN precio tuyo y se los
 * inventaba todos.
 *
 * Por eso: la mano de obra y el desplazamiento van SIEMPRE (son pocos y
 * entran en casi cualquier trabajo), y el material se ordena poniendo
 * delante lo que suene a lo que ha pedido.
 */
export function preciosParaElEncargo(catalogo, consulta, tope = PRECIOS_EN_EL_ENCARGO) {
  const activos = (catalogo || []).filter((i) => i?.description && i.is_active !== false);
  const siempre = activos.filter((i) => ['mano_obra', 'desplazamiento'].includes(categoriaValida(i.category)));
  const resto = activos
    .filter((i) => !siempre.includes(i))
    .map((i) => ({ i, p: parecido(consulta, i.description) }))
    .sort((a, b) => b.p - a.p)
    .map(({ i }) => i);
  return [...siempre, ...resto].slice(0, tope);
}

export function encargoTrabajo(consulta, { catalogo = [], proveedores = [], zona = 'España' } = {}) {
  const relevantes = preciosParaElEncargo(catalogo, consulta)
    .map((i) => `- ${i.description}: ${i.unit_price} €/${i.unit || 'ud'} (${CATEGORIAS[categoriaValida(i.category)]})`);

  return `Eres un técnico de climatización, refrigeración y electricidad que prepara presupuestos en ${zona}.

TRABAJO QUE HAY QUE PRESUPUESTAR (descrito por el técnico con sus palabras):
"${consulta}"

Desglósalo en partidas como se hace en un presupuesto profesional:
- El material necesario, con cantidades realistas (incluye consumibles: gas, soldadura, tubería, abrazaderas, cable...).
- La mano de obra, EN HORAS, separada por oficio si hace falta.
- El desplazamiento si el trabajo lo requiere.
- Puesta en marcha, vacío, carga, documentación o certificados si el trabajo los lleva.

${relevantes.length ? `PRECIOS DEL TÉCNICO (úsalos tal cual cuando la partida sea la misma; no te inventes otro precio para algo que ya está aquí):
${relevantes.join('\n')}` : 'El técnico todavía no tiene precios cargados: estima precios de mercado españoles.'}

${proveedores.length ? `Proveedores con los que trabaja: ${proveedores.join(', ')}.` : ''}

Devuelve precios de mercado españoles actuales, sin IVA. Si algo depende de datos que no se han dado (potencia, metros, altura...), toma una hipótesis razonable y anótala en "supuestos".
En "resumen" explica en dos líneas qué has entendido que hay que hacer.`;
}
