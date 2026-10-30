/**
 * FILTRO DESHIDRATADOR — selección por potencia frigorífica.
 *
 * Qué se calcula y de dónde sale cada número
 * ───────────────────────────────────────────
 *  1. Caudal de refrigerante: ṁ = potencia / efecto frigorífico. El efecto frigorífico sale de las propiedades del
 *     gas (CoolProp): entalpía del vapor a la salida del evaporador (rocío + recalentamiento) menos la del líquido
 *     que entra a la válvula (burbuja de la condensación − subenfriamiento). Se desprecia la compresión del líquido
 *     (≈ 1 %), lo que deja el caudal ligeramente por encima: del lado seguro.
 *  2. Velocidad en la línea de líquido: v = (ṁ/ρ)/A, con la densidad real del líquido.
 *  3. Caída de presión del filtro. NO se inventan capacidades de filtros: se parte de la capacidad que da el
 *     catálogo del filtro elegido, que se escribe a mano junto con las condiciones y la caída de presión a las que
 *     se midió (lo habitual: 0,07 bar con el líquido a 30 °C y evaporación a −15 °C). El filtro es una pérdida
 *     localizada, así que ΔP = K·ρ·v²/2 = K'·ṁ²/ρ. Del catálogo sale el caudal de referencia ṁref = Qcat/qref y,
 *     con él, ΔP = ΔPcat · (ṁ/ṁref)² · (ρref/ρ).
 *  4. Capacidad de catálogo mínima: la que debe tener el filtro, medida como en el catálogo, para no pasar de la
 *     caída de presión objetivo. Es el dato con el que se mira la tabla del fabricante.
 *  5. Riesgo de vapor antes de la válvula: el subenfriamiento equivale a un margen de presión (Pc − Psat(Tliq)).
 *     Si las pérdidas de la línea (filtro + subida + otras) lo agotan, el líquido hierve y llega vapor a la válvula.
 *
 * Todas las presiones en bar absolutos, temperaturas en °C, caudales en kg/s, potencias en W.
 */
import { crearContexto, gasPreparado } from './capilar.js';
import { seccionInterior } from './tubosCobre.js';

const BAR = 1e5;
const G = 9.80665; // m/s²

/** Condiciones habituales con las que los catálogos dan la capacidad de un filtro de línea de líquido. */
export const REFERENCIA_CATALOGO = { dp: 0.07, TeRef: -15, TliqRef: 30 };

/** Velocidades de referencia en línea de líquido (m/s). */
export const VELOCIDAD_LIQUIDO = { optima: 1.0, maxima: 1.5 };

/** Caída de presión objetivo por defecto para un filtro nuevo (bar). */
export const DP_OBJETIVO = 0.07;

/** Fracciones del margen de presión (subenfriamiento) que consume la línea. */
export const UMBRAL_MARGEN = { aviso: 0.5, malo: 1 };

const finito = (n) => Number.isFinite(n);

/** Entalpías y densidad del líquido y del vapor en unas condiciones de referencia de catálogo. */
function estadoReferencia(gasId, TeRef, TliqRef) {
  const g = gasPreparado(gasId);
  if (!g) return { ok: false, error: `Refrigerante desconocido: ${gasId}` };
  const d = g.datos;
  if (!(TeRef >= d.Td[0] && TeRef <= d.Td[d.Td.length - 1]))
    return { ok: false, error: `El gas no tiene tabla a ${TeRef} °C de evaporación: cambia la condición del catálogo.` };
  if (!(TliqRef >= d.T[0] && TliqRef <= d.T[d.T.length - 1]))
    return { ok: false, error: `El gas no tiene tabla de líquido a ${TliqRef} °C: cambia la condición del catálogo.` };
  const sE = g.sDeTd(TeRef);
  const sL = g.sDeTb(TliqRef);
  return { ok: true, qref: g.hv(sE) - g.hl(sL), rho: Math.exp(g.lnRl(sL)) };
}

/** Valoración de la velocidad del líquido en un tubo. */
export function valorarVelocidad(v) {
  if (!(v > 0)) return { clave: 'sin', texto: '—' };
  if (v <= VELOCIDAD_LIQUIDO.optima) return { clave: 'optima', texto: 'Adecuada' };
  if (v <= VELOCIDAD_LIQUIDO.maxima) return { clave: 'alta', texto: 'Alta' };
  return { clave: 'muyalta', texto: 'Demasiado alta' };
}

/** Velocidad (m/s) y valoración del líquido en cada tubo de la lista. */
export function tablaTubos(ctx, mdot, tubos) {
  if (!ctx.ok || !(mdot > 0)) return [];
  const caudal = mdot / ctx.rhoIn; // m³/s
  return tubos.map((t) => {
    const v = caudal / seccionInterior(t.id);
    return { ...t, v, valoracion: valorarVelocidad(v) };
  });
}

/** El tubo más pequeño cuya velocidad sigue siendo adecuada (o el más grande aceptable). */
export function tuboSugerido(tabla) {
  const ordenada = [...tabla].sort((a, b) => a.id - b.id);
  return ordenada.find((t) => t.valoracion.clave === 'optima') || ordenada.find((t) => t.valoracion.clave === 'alta') || null;
}

/**
 * Cálculo completo.
 *
 * @param {object} e
 * @param {string} e.gas
 * @param {number} e.Te            °C, evaporación (rocío)
 * @param {number} e.Tc            °C, condensación (rocío)
 * @param {number} e.subenf        K de subenfriamiento
 * @param {number} e.recal         K de recalentamiento
 * @param {number} e.potenciaW     potencia frigorífica (W)
 * @param {number} [e.idMm]        Ø interior de la línea de líquido (mm); sin él no hay velocidad
 * @param {object} [e.catalogo]    { Q: capacidad (W), dp: bar, TeRef: °C, TliqRef: °C } del filtro elegido
 * @param {number} [e.desnivel]    m que el líquido SUBE desde el depósito/condensador hasta la válvula
 * @param {number} [e.dpOtros]     bar perdidos en otros elementos de la línea (visor, electroválvula, tubo…)
 * @param {number} [e.dpObjetivo]  bar máximos admitidos en el filtro
 */
export function calcularFiltro(e) {
  const ctx = crearContexto({ gas: e.gas, Te: e.Te, Tc: e.Tc, subenf: e.subenf, recal: e.recal });
  if (!ctx.ok) return { ok: false, error: ctx.error, ctx };
  if (!(e.potenciaW > 0)) return { ok: false, error: 'Escribe la potencia frigorífica.', ctx };

  const g = ctx.gas;
  const qEfecto = ctx.hOut - g.hl(g.sDeTb(ctx.Tin)); // kJ/kg, sin la compresión del líquido
  const mdot = e.potenciaW / (qEfecto * 1000);
  const caudalVolumetrico = mdot / ctx.rhoIn; // m³/s

  const res = {
    ok: true,
    ctx,
    qEfecto,
    mdot,
    caudalLmin: caudalVolumetrico * 1000 * 60,
    rho: ctx.rhoIn,
    margenBar: Math.max(0, ctx.Pc - ctx.Pflash),
  };

  if (e.idMm > 0) {
    res.idMm = e.idMm;
    res.velocidad = caudalVolumetrico / seccionInterior(e.idMm);
    res.valoracionVelocidad = valorarVelocidad(res.velocidad);
  }

  // Caída de presión estática por la altura (el líquido que sube pierde ρ·g·h)
  const desnivel = finito(e.desnivel) && e.desnivel > 0 ? e.desnivel : 0;
  res.dpEstatica = (ctx.rhoIn * G * desnivel) / BAR;
  res.dpOtros = finito(e.dpOtros) && e.dpOtros > 0 ? e.dpOtros : 0;

  // ── Filtro ──
  const ref = { ...REFERENCIA_CATALOGO, ...(e.catalogo || {}) };
  const est = estadoReferencia(e.gas, ref.TeRef, ref.TliqRef);
  res.referencia = { ...ref, ...est };
  const dpObjetivo = e.dpObjetivo > 0 ? e.dpObjetivo : DP_OBJETIVO;
  res.dpObjetivo = dpObjetivo;

  if (est.ok) {
    // Capacidad de catálogo mínima (medida como en el catálogo) para no pasar de dpObjetivo
    res.capacidadMinimaW = est.qref * 1000 * mdot * Math.sqrt((ref.dp / dpObjetivo) * (est.rho / ctx.rhoIn));
  }

  if (est.ok && e.catalogo && e.catalogo.Q > 0) {
    const mdotRef = (e.catalogo.Q) / (est.qref * 1000);
    res.cargaFiltro = mdot / mdotRef; // 1 = trabaja a su capacidad nominal
    res.dpFiltro = ref.dp * res.cargaFiltro ** 2 * (est.rho / ctx.rhoIn);
    res.dpTotal = res.dpFiltro + res.dpEstatica + res.dpOtros;
    res.usoMargen = res.margenBar > 0 ? res.dpTotal / res.margenBar : Infinity;
    // Presión al final de la línea y su temperatura de saturación (si cae dentro de la tabla del gas)
    const pFlash = Math.exp(g.sDeTb(ctx.Tin));
    res.pFinal = ctx.Pc - res.dpTotal;
    res.hayVapor = res.pFinal < pFlash - 1e-9;
    res.tSaturacionFinal = res.pFinal > 0 && Math.log(res.pFinal) >= g.sMin && Math.log(res.pFinal) <= g.sMax ? g.Tb(Math.log(res.pFinal)) : null;
    res.valoracion = !res.hayVapor
      ? res.usoMargen >= UMBRAL_MARGEN.aviso ? 'justo' : 'ok'
      : 'mal';
    res.dpFiltroOk = res.dpFiltro <= dpObjetivo * (1 + 1e-9);
  }
  return res;
}

/** Avisos que acompañan al resultado: { nivel: 'error'|'aviso'|'info', texto }. */
export function avisosFiltro(r) {
  const av = [];
  if (!r.ok) return av;
  const f1 = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const f2 = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f3 = (n) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  if (r.ctx.subenf < 1)
    av.push({ nivel: 'aviso', texto: 'Sin subenfriamiento no hay margen: cualquier pérdida de presión en la línea de líquido produce vapor antes de la válvula.' });
  if (r.valoracionVelocidad?.clave === 'muyalta')
    av.push({ nivel: 'error', texto: `La velocidad del líquido (${f2(r.velocidad)} m/s) supera ${f1(VELOCIDAD_LIQUIDO.maxima)} m/s: ruido, golpe de ariete al cerrar la electroválvula y mucha pérdida de presión. Usa un tubo mayor.` });
  else if (r.valoracionVelocidad?.clave === 'alta')
    av.push({ nivel: 'aviso', texto: `Velocidad del líquido algo alta (${f2(r.velocidad)} m/s). Lo habitual es no pasar de ${f1(VELOCIDAD_LIQUIDO.optima)} m/s; un tubo mayor reduce la pérdida de presión.` });
  if (r.dpFiltro != null) {
    if (r.cargaFiltro > 1)
      av.push({ nivel: 'aviso', texto: `El filtro trabajaría por encima de su capacidad de catálogo (${f2(r.cargaFiltro * 100)} % de su caudal nominal): la caída de presión supera la del catálogo. Elige uno de mayor capacidad.` });
    if (!r.dpFiltroOk)
      av.push({ nivel: 'aviso', texto: `La caída de presión del filtro nuevo (${f3(r.dpFiltro)} bar) supera el objetivo de ${f3(r.dpObjetivo)} bar.` });
    if (r.hayVapor)
      av.push({ nivel: 'error', texto: `Las pérdidas de la línea (${f3(r.dpTotal)} bar) agotan el margen que da el subenfriamiento (${f3(r.margenBar)} bar): el líquido hierve antes de la válvula y llega vapor. Sube el subenfriamiento, reduce el desnivel o elige un filtro mayor.` });
    else if (r.valoracion === 'justo')
      av.push({ nivel: 'aviso', texto: `Las pérdidas de la línea consumen el ${f1(r.usoMargen * 100)} % del margen de subenfriamiento. Un filtro que se va ensuciando lo agotará pronto.` });
  }
  if (r.referencia && !r.referencia.ok) av.push({ nivel: 'aviso', texto: r.referencia.error });
  if (r.ctx.clase && r.ctx.clase.startsWith('A3'))
    av.push({ nivel: 'aviso', texto: 'Refrigerante inflamable (A3): usa componentes y filtros aptos para el gas y respeta la carga máxima de la norma.' });
  if (r.ctx.clase === 'A2L')
    av.push({ nivel: 'info', texto: 'Refrigerante ligeramente inflamable (A2L): tenlo en cuenta en el montaje (soldadura, ventilación) según la UNE-EN 378.' });
  av.push(...r.ctx.avisos.filter((a) => /Mezcla zeotrópica/.test(a.texto)));
  return av;
}

/** Texto de qué tipo de filtro corresponde a cada caso de trabajo. */
export const CASOS_FILTRO = [
  {
    id: 'nueva',
    nombre: 'Instalación nueva o circuito abierto',
    texto: 'Filtro deshidratador en la línea de líquido, justo antes de la válvula (o del capilar), montado con la flecha en el sentido del flujo. Núcleo de tamiz molecular, que es el que retiene la humedad con los gases HFC y el aceite POE. Cámbialo cada vez que abras el circuito.',
  },
  {
    id: 'sustitucion',
    nombre: 'Cambio de gas (conversión)',
    texto: 'Cambia siempre el filtro al convertir de gas y cuando se cambia el aceite. El filtro nuevo debe estar indicado para el gas y el aceite nuevos: mira en el catálogo la compatibilidad con el refrigerante y la capacidad de agua para ese gas.',
  },
  {
    id: 'quemado',
    nombre: 'Después de quemarse el compresor',
    texto: 'El aceite quemado forma ácidos que corroen el circuito. Además del filtro de líquido, monta un filtro de aspiración antiácido antes del compresor nuevo (con su caída de presión controlada), limpia el circuito y cambia el aceite. Mide la acidez del aceite a las pocas horas de funcionar y cambia los filtros hasta que salga limpio.',
  },
];

/** Recomendaciones de montaje que no dependen de los números. */
export const MONTAJE_FILTRO = [
  'La flecha del filtro va en el sentido del flujo. Un filtro al revés suelta el contenido de la carcasa hacia la válvula.',
  'Mejor en vertical, con el flujo hacia abajo y sin cargar su peso en los tubos: usa soporte o abrazadera.',
  'Que no quede entre el filtro y la válvula ninguna pérdida de presión grande (tubo largo o con muchos codos).',
  'Con las soldaduras, protege el filtro del calor (trapo húmedo) y sopla nitrógeno para que no se oxide el interior.',
  'No lo dejes abierto al aire más de unos minutos: el tamiz molecular absorbe la humedad ambiente y se satura antes de usarse.',
  'Con la instalación en marcha, mide la temperatura a la entrada y a la salida: si hay más de 3 K de diferencia, el filtro está obstruido y hay que cambiarlo.',
];
