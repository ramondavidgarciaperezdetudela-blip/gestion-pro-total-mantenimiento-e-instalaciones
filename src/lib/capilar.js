/**
 * CÁLCULO DE TUBOS CAPILARES ADIABÁTICOS — Gestión Pro Total
 *
 * Modelo homogéneo de equilibrio (HEM), el habitual en el diseño de capilares:
 *
 *   1. Entrada      caída de presión (1 + K)·G²/(2·ρl): aceleración + contracción brusca (K = 0,5).
 *   2. Líquido      tramo de líquido subenfriado con fricción de Darcy (Churchill) hasta la
 *                   presión de burbuja de la temperatura de entrada («punto de flash»).
 *   3. Bifásico     mezcla homogénea líquido-vapor. Energía:  h + (G·v)²/2 = h0 (adiabático).
 *                   Cantidad de movimiento: fricción (viscosidad de McAdams) + aceleración.
 *                   Se integra en presión:  dz = (2D / (f·G²·v)) · (1 + G²·dv/dP) · dP
 *   4. Crítico      si 1 + G²·dv/dP (a lo largo de la trayectoria) llega a 0 antes de alcanzar
 *                   la presión de evaporación, el flujo se estrangula en la salida: el caudal
 *                   deja de depender de la presión del evaporador.
 *
 * Propiedades: tablas de saturación de `refrigerantProps.js` (CoolProp), interpoladas con
 * PCHIP (monótono, sin oscilaciones) en ln P. En zeótropos se mezcla de forma lineal el líquido
 * de burbuja y el vapor de rocío a la misma presión.
 *
 * Convenciones: Te y Tc son temperaturas de ROCÍO (EN 12900); el subenfriamiento se mide desde
 * la temperatura de burbuja a la presión de condensación. Presiones de las tablas en bar absolutos;
 * dentro del cálculo todo va en SI (Pa, J/kg, m³/kg, kg/m²·s, m).
 *
 * Límites del modelo (se informan al usuario en el informe):
 *   · No hay retardo de vaporización (líquido metaestable) ni intercambio de calor con la
 *     línea de aspiración (capilar soldado a ella): ambos alargan algo el tubo real.
 *   · Precisión orientativa de ±15 % en el caudal (≈ ±25 % en la longitud). El capilar
 *     definitivo se ajusta siempre en banco de pruebas.
 *
 * Autor: David García (Gestión Pro Total). Fichero de cálculo propio.
 */
import { REFRIGERANT_PROPS } from './refrigerantProps.js';
import { gasPreparado } from './saturacion.js';

// Los interpoladores de cada gas (PCHIP en ln P) viven en saturacion.js: los comparten las tablas P–T y el capilar.
export { gasPreparado };

const BAR = 1e5;

/** Número con coma decimal española (los textos que ve el usuario nunca llevan punto decimal). */
const es = (n, d = 1) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

/** «R-32 21.5 %» → «R-32 21,5 %» */
const comaDecimal = (t) => (typeof t === 'string' ? t.replace(/(\d)\.(\d)/g, '$1,$2') : t);
const K_ENTRADA = 0.5; // contracción brusca desde la línea de líquido
const RUGOSIDAD = 1.5e-6; // m — cobre estirado
const PASOS_ESTRANGULAMIENTO = 160; // nodos para buscar el punto crítico
const PASOS_INTEGRACION = 240; // intervalos de Simpson (par)

/* ───────────────────────────── Gases ───────────────────────────── */

/** Lista de gases disponibles, ordenada alfabéticamente. */
export function listaGases() {
  return Object.values(REFRIGERANT_PROPS)
    .map((d) => ({
      id: d.id,
      mezcla: d.mezcla,
      composicion: comaDecimal(d.composicion),
      clase: d.clase,
      capilar: d.capilar,
      glide0: d.glide0,
      TeMin: Math.ceil(d.Td[0] + 0.5),
      TcMax: Math.floor(d.Td[d.Td.length - 1]),
    }))
    .sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
}

/* ───────────────────────────── Hidráulica ───────────────────────────── */

/** Factor de fricción de Darcy — correlación de Churchill (1977), válida en laminar, transición y turbulento. */
export function churchill(Re, rugosidadRelativa) {
  const r = Math.max(Re, 1);
  const A = Math.pow(2.457 * Math.log(1 / (Math.pow(7 / r, 0.9) + 0.27 * rugosidadRelativa)), 16);
  const B = Math.pow(37530 / r, 16);
  return 8 * Math.pow(Math.pow(8 / r, 12) + 1 / Math.pow(A + B, 1.5), 1 / 12);
}

/**
 * Estado de la mezcla bifásica homogénea a la presión s = ln P[bar], para un flujo másico G y una
 * entalpía total h0 (J/kg). Resuelve el título x de  h(P,x) + (G·v)²/2 = h0  (ecuación de 2.º grado).
 */
function estadoBifasico(g, s, G, h0) {
  const rl = Math.exp(g.lnRl(s));
  const rv = Math.exp(g.lnRv(s));
  const hl = g.hl(s) * 1e3;
  const hv = g.hv(s) * 1e3;
  const vl = 1 / rl;
  const vv = 1 / rv;
  const hlv = hv - hl;
  const vlv = vv - vl;
  const a = 0.5 * G * G * vlv * vlv;
  const b = hlv + G * G * vl * vlv;
  const c = hl + 0.5 * G * G * vl * vl - h0;
  let x = (-2 * c) / (b + Math.sqrt(Math.max(b * b - 4 * a * c, 0)));
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  const ml = Math.exp(g.lnMl(s)) * 1e-6;
  const mv = Math.exp(g.lnMv(s)) * 1e-6;
  const Tb = g.Tb(s);
  const Td = g.Td(s);
  return {
    x,
    vm: vl + x * vlv,
    muM: 1 / (x / mv + (1 - x) / ml), // McAdams
    T: Tb + x * (Td - Tb),
  };
}

/** φ = 1 + G²·(dv/dP) a lo largo de la trayectoria adiabática. φ → 0 es el estrangulamiento. */
function fi(g, s, G, h0) {
  const d = 1e-3;
  const v1 = estadoBifasico(g, s + d, G, h0).vm;
  const v2 = estadoBifasico(g, s - d, G, h0).vm;
  const P = Math.exp(s) * BAR;
  return 1 + (G * G * (v1 - v2)) / (2 * d * P);
}

/* ───────────────────────────── Contexto (condiciones de trabajo) ───────────────────────────── */

/**
 * Condiciones de trabajo: estado de entrada al capilar y salida del evaporador.
 * @param {{gas:string, Te:number, Tc:number, subenf?:number, recal?:number}} cond
 *   Te, Tc: °C de rocío. subenf: K de subenfriamiento. recal: K de recalentamiento útil.
 */
export function crearContexto(cond) {
  const { gas: id, Te, Tc } = cond;
  const subenf = Number.isFinite(cond.subenf) ? cond.subenf : 0;
  const recal = Number.isFinite(cond.recal) ? cond.recal : 0;
  const g = gasPreparado(id);
  if (!g) return { ok: false, error: `Refrigerante desconocido: ${id}` };
  const d = g.datos;
  const TdMin = d.Td[0] + 0.5;
  const TdMax = d.Td[d.Td.length - 1];
  if (!Number.isFinite(Te) || Te < TdMin || Te > TdMax)
    return { ok: false, error: `La temperatura de evaporación debe estar entre ${Math.ceil(TdMin)} y ${Math.floor(TdMax)} °C para ${id}.` };
  if (!Number.isFinite(Tc) || Tc < TdMin || Tc > TdMax)
    return { ok: false, error: `La temperatura de condensación debe estar entre ${Math.ceil(TdMin)} y ${Math.floor(TdMax)} °C para ${id}.` };
  if (Tc <= Te) return { ok: false, error: 'La temperatura de condensación debe ser mayor que la de evaporación.' };
  if (subenf < 0 || subenf > 40) return { ok: false, error: 'El subenfriamiento debe estar entre 0 y 40 K.' };
  if (recal < 0 || recal > 40) return { ok: false, error: 'El recalentamiento debe estar entre 0 y 40 K.' };

  const sE = g.sDeTd(Te);
  const sC = g.sDeTd(Tc);
  const Pe = Math.exp(sE);
  const Pc = Math.exp(sC);
  const TbC = g.Tb(sC);
  const Tin = TbC - subenf;
  if (Tin < d.T[0] + 0.5) return { ok: false, error: 'El subenfriamiento deja el líquido por debajo del rango de la tabla del gas.' };

  const sIn = g.sDeTb(Tin);
  const Pflash = Math.exp(sIn);
  const rhoIn = Math.exp(g.lnRl(sIn));
  const muIn = Math.exp(g.lnMl(sIn)) * 1e-6;
  const hIn = g.hl(sIn) + ((Pc - Pflash) * BAR) / rhoIn / 1000; // kJ/kg, con corrección de líquido comprimido
  const hvE = g.hv(sE);
  const hlE = g.hl(sE);
  const hOut = hvE + g.cpv(sE) * recal;
  const q0 = hOut - hIn;
  if (!(q0 > 0)) return { ok: false, error: 'Con estas condiciones el efecto frigorífico no es positivo.' };
  const xEv = (hIn - hlE) / (hvE - hlE);

  const avisos = [];
  if (subenf < 1)
    avisos.push({ nivel: 'aviso', texto: 'Sin subenfriamiento hay vapor (flash) desde la propia entrada del capilar. Lo normal es disponer de 3 a 10 K; compruébelo en la instalación.' });
  if (d.mezcla && Math.abs(g.Td(sE) - g.Tb(sE)) > 2)
    avisos.push({ nivel: 'info', texto: `Mezcla zeotrópica (deslizamiento ≈ ${es(g.Td(sE) - g.Tb(sE), 1)} K a la presión de evaporación): Te y Tc se toman como temperaturas de rocío.` });
  if (d.clase && d.clase.startsWith('A3'))
    avisos.push({ nivel: 'aviso', texto: 'Refrigerante inflamable (A3): respete los límites de carga y la normativa de seguridad aplicable (EN 378, IEC 60335-2-24 / -2-89).' });
  else if (d.clase === 'A2L')
    avisos.push({ nivel: 'info', texto: 'Refrigerante ligeramente inflamable (A2L): tenga en cuenta la normativa de seguridad aplicable (EN 378).' });
  if (d.capilar === false) avisos.push({ nivel: 'aviso', texto: 'Este refrigerante no se usa de forma habitual con tubo capilar: resultado meramente orientativo.' });

  return {
    ok: true,
    gas: g,
    id,
    clase: d.clase,
    mezcla: d.mezcla,
    composicion: comaDecimal(d.composicion),
    Te,
    Tc,
    subenf,
    recal,
    Pe, // bar abs
    Pc,
    TbC,
    Tin,
    Pflash,
    rhoIn,
    muIn,
    hIn, // kJ/kg
    hOut,
    q0, // kJ/kg — efecto frigorífico
    xEv, // título de vapor a la entrada del evaporador (expansión isoentálpica)
    sE,
    TevEntrada: g.Tb(sE) + Math.min(Math.max(xEv, 0), 1) * (g.Td(sE) - g.Tb(sE)),
    avisos,
  };
}

/* ───────────────────────────── Núcleo: un tubo (D, G) ───────────────────────────── */

/**
 * Longitud que necesita un tubo de diámetro D (m) para pasar un flujo másico G (kg/m²·s).
 * Devuelve el desglose y, si se pide, el perfil de presión/temperatura/título a lo largo del tubo.
 */
function resolverTubo(ctx, D, G, { perfil = false } = {}) {
  const g = ctx.gas;
  const A = (Math.PI * D * D) / 4;
  const h0 = ctx.hIn * 1e3;
  const rhoIn = ctx.rhoIn;
  const Pc = ctx.Pc * BAR;
  const Pe = ctx.Pe * BAR;
  const Pflash = ctx.Pflash * BAR;
  const base = { D, A, G, mdot: G * A, velEntrada: G / rhoIn };
  const P1 = Pc - ((1 + K_ENTRADA) * G * G) / (2 * rhoIn);
  if (!(P1 > Pe * 1.0001)) return { ...base, imposible: true, L: 0, Lliq: 0, L2f: 0 };

  const ReLiq = (G * D) / ctx.muIn;
  const fLiq = churchill(ReLiq, RUGOSIDAD / D);
  const Lliq = P1 > Pflash ? ((P1 - Pflash) * 2 * rhoIn * D) / (fLiq * G * G) : 0;
  const sIni = Math.log(Math.min(P1, Pflash) / BAR);
  const sEv = ctx.sE;

  // Búsqueda del estrangulamiento (primer nodo con φ ≤ 0)
  let sStop = sEv;
  let estrangulado = false;
  if (fi(g, sIni, G, h0) <= 0) {
    sStop = sIni;
    estrangulado = true;
  } else {
    let sPrev = sIni;
    for (let j = 1; j <= PASOS_ESTRANGULAMIENTO; j++) {
      const sj = sIni + ((sEv - sIni) * j) / PASOS_ESTRANGULAMIENTO;
      if (fi(g, sj, G, h0) <= 0) {
        let lo = sPrev;
        let hi = sj;
        for (let k = 0; k < 50; k++) {
          const mid = 0.5 * (lo + hi);
          if (fi(g, mid, G, h0) > 0) lo = mid;
          else hi = mid;
        }
        sStop = lo;
        estrangulado = true;
        break;
      }
      sPrev = sj;
    }
  }

  // Integral de dz (Simpson en ln P)
  const n = PASOS_INTEGRACION;
  const h = (sStop - sIni) / n;
  const w = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const s = sIni + h * i;
    const e = estadoBifasico(g, s, G, h0);
    const f = churchill((G * D) / e.muM, RUGOSIDAD / D);
    w[i] = ((2 * D) / (f * G * G * e.vm)) * fi(g, s, G, h0) * Math.exp(s) * BAR;
  }
  let S = w[0] + w[n];
  for (let i = 1; i < n; i++) S += (i % 2 === 1 ? 4 : 2) * w[i];
  const L2f = Math.abs((S * h) / 3);

  const salida = estadoBifasico(g, sStop, G, h0);
  const res = {
    ...base,
    imposible: false,
    L: Lliq + L2f,
    Lliq,
    L2f,
    ReLiq,
    fLiq,
    P1: P1 / BAR,
    Pflash: ctx.Pflash,
    Psalida: Math.exp(sStop), // bar abs
    estrangulado,
    xSalida: salida.x,
    TSalida: salida.T,
    velSalida: G * salida.vm,
    ratioLiq: Lliq / (Lliq + L2f || 1),
  };

  if (perfil) {
    const z = [0, 0];
    const P = [ctx.Pc, P1 / BAR];
    const T = [ctx.Tin, ctx.Tin];
    const x = [0, 0];
    if (Lliq > 0) {
      z.push(Lliq);
      P.push(ctx.Pflash);
      T.push(ctx.Tin);
      x.push(0);
    }
    const saltos = 4;
    let acum = Lliq;
    for (let i = 1; i <= n; i++) {
      acum += Math.abs(0.5 * (w[i - 1] + w[i]) * h);
      if (i % saltos === 0 || i === n) {
        const s = sIni + h * i;
        const e = estadoBifasico(g, s, G, h0);
        z.push(acum);
        P.push(Math.exp(s));
        T.push(e.T);
        x.push(e.x);
      }
    }
    // el acumulado por trapecios se reescala al total de Simpson (diferencia despreciable)
    const k = z[z.length - 1] > 0 ? res.L / z[z.length - 1] : 1;
    res.perfil = { z: z.map((v) => v * k), P, T, x };
  }
  return res;
}

/* ───────────────────────────── API pública de cálculo ───────────────────────────── */

/** Longitud (m) de un capilar de diámetro interior D (m) que pasa el caudal másico mdot (kg/s). */
export function longitudParaCaudal(ctx, D, mdot, opciones) {
  const A = (Math.PI * D * D) / 4;
  return resolverTubo(ctx, D, mdot / A, opciones);
}

/**
 * Caudal que pasa un capilar existente (D en m, L en m) en estas condiciones.
 *
 * Se busca el flujo G cuya longitud necesaria coincide con L. La longitud baja al subir el
 * caudal de forma casi lineal en logaritmos, así que se usa el método de falsa posición
 * (variante de Illinois), que llega en unas diez evaluaciones; si el tramo no se deja
 * encerrar, cae a la bisección, que siempre converge.
 */
export function caudalParaLongitud(ctx, D, L, opciones) {
  const Gmax = Math.sqrt((2 * ctx.rhoIn * (ctx.Pc - ctx.Pe) * BAR) / (1 + K_ENTRADA));
  const objetivo = Math.log(L);
  const SUELO = Math.log(1e-9);
  // f(x) > 0 si el tubo necesario a G = e^x es MÁS LARGO que L (hay que pasar menos caudal).
  const f = (x) => {
    const r = resolverTubo(ctx, D, Math.exp(x));
    return (r.imposible || !(r.L > 1e-9) ? SUELO : Math.log(r.L)) - objetivo;
  };
  let a = 0; // G = 1 kg/m²·s
  let b = Math.log(Gmax * (1 - 1e-9));
  let fa = f(a);
  let fb = f(b);
  let x;
  if (fa <= 0) {
    x = a; // tubo larguísimo: pasa menos de 1 kg/m²·s (caudal despreciable)
  } else if (fb >= 0) {
    x = b;
  } else {
    let lado = 0;
    x = 0.5 * (a + b);
    for (let i = 0; i < 80; i++) {
      // falsa posición; si se sale del tramo o no avanza, bisección
      let c = (fa * b - fb * a) / (fa - fb);
      if (!(c > Math.min(a, b) && c < Math.max(a, b))) c = 0.5 * (a + b);
      const fc = f(c);
      x = c;
      if (Math.abs(fc) < 1e-11 || Math.abs(b - a) < 1e-12) break;
      if (fc * fb > 0) {
        b = c;
        fb = fc;
        if (lado === -1) fa *= 0.5;
        lado = -1;
      } else {
        a = c;
        fa = fc;
        if (lado === 1) fb *= 0.5;
        lado = 1;
      }
    }
  }
  const r = resolverTubo(ctx, D, Math.exp(x), opciones);
  return { ...r, Q: r.mdot * ctx.q0 * 1e3 }; // W
}

/**
 * Cuánto cambia el caudal si el capilar real resulta algo más largo o más corto de lo calculado.
 * Sirve para avisar de lo delicado que es el ajuste: en capilares cortos un centímetro cuenta.
 * @returns {{frac:number, Q0:number, masLargo:number, masCorto:number}} variaciones en %
 */
export function sensibilidadLongitud(ctx, D, L, frac = 0.1) {
  const base = caudalParaLongitud(ctx, D, L);
  const largo = caudalParaLongitud(ctx, D, L * (1 + frac));
  const corto = caudalParaLongitud(ctx, D, L * (1 - frac));
  return {
    frac,
    Q0: base.Q,
    masLargo: (largo.mdot / base.mdot - 1) * 100,
    masCorto: (corto.mdot / base.mdot - 1) * 100,
  };
}

/**
 * Carta de selección: capacidad frigorífica (W) de cada diámetro (mm) para varias longitudes (m).
 * @returns {Array<{dmm:number, odmm:number, celdas:Array<{L:number, Q:number, estrangulado:boolean}>}>}
 */
export function cartaCapacidades(ctx, diametrosMm, longitudes) {
  return diametrosMm.map((dmm) => ({
    dmm,
    odmm: diametroExterior(dmm),
    celdas: longitudes.map((L) => {
      const r = caudalParaLongitud(ctx, dmm / 1000, L);
      return { L, Q: r.Q, estrangulado: r.estrangulado };
    }),
  }));
}

/* ───────────────────────────── Diámetros y tabla de selección ───────────────────────────── */

/** Diámetros interiores habituales (mm). */
export const DIAMETROS_MM = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0, 2.2, 2.5];

/** Diámetros exteriores normales (mm) para tubo capilar de cobre. */
export const EXTERIORES_MM = [2.0, 2.5, 3.0, 3.5, 4.0, 4.76, 6.35];

/** Ø exterior orientativo: el menor normal que deja una pared de al menos 0,5 mm. Confirmar con el proveedor. */
export function diametroExterior(dintMm, paredMin = 0.5) {
  const hallado = EXTERIORES_MM.find((od) => (od - dintMm) / 2 >= paredMin - 1e-9);
  return hallado ?? Math.ceil(dintMm + 2 * paredMin);
}

export const LONGITUD = { corta: 0.5, minima: 1, maxima: 4, larga: 6 };

/** Valoración práctica de una longitud calculada. */
export function valorarLongitud(res) {
  if (res.imposible) return { clave: 'imposible', texto: 'No pasa el caudal' };
  const L = res.L;
  if (L < LONGITUD.corta) return { clave: 'corto', texto: 'Demasiado corto' };
  if (L < LONGITUD.minima) return { clave: 'justo', texto: 'Corto' };
  if (L <= LONGITUD.maxima) return { clave: 'optimo', texto: 'Recomendado' };
  if (L <= LONGITUD.larga) return { clave: 'largo', texto: 'Largo' };
  return { clave: 'muylargo', texto: 'Demasiado largo' };
}

/** Longitud necesaria para cada diámetro, con su Ø exterior y valoración. */
export function tablaDiametros(ctx, mdot, diametrosMm = DIAMETROS_MM) {
  return diametrosMm.map((dmm) => {
    const r = longitudParaCaudal(ctx, dmm / 1000, mdot);
    return { ...r, dmm, odmm: diametroExterior(dmm), valoracion: valorarLongitud(r) };
  });
}

/** Diámetro más conveniente: el de longitud más próxima a 2,5 m dentro del intervalo útil. */
export function diametroSugerido(tabla) {
  const utiles = tabla.filter((r) => !r.imposible && r.L >= LONGITUD.corta && r.L <= LONGITUD.larga);
  if (!utiles.length) return null;
  return utiles.reduce((mejor, r) => (Math.abs(Math.log(r.L / 2.5)) < Math.abs(Math.log(mejor.L / 2.5)) ? r : mejor)).dmm;
}

/* ───────────────────────────── Avisos del resultado ───────────────────────────── */

export function avisosResultado(ctx, r) {
  const av = [];
  if (r.imposible) {
    av.push({ nivel: 'error', texto: 'Con este diámetro el caudal pedido no cabe: la caída de presión de entrada supera la diferencia de presiones disponible. Use un diámetro mayor.' });
    return av;
  }
  if (r.L < LONGITUD.corta) av.push({ nivel: 'aviso', texto: 'Longitud muy corta: difícil de ajustar y de montar. Elija un diámetro menor.' });
  else if (r.L > LONGITUD.larga) av.push({ nivel: 'aviso', texto: 'Longitud muy larga: elija un diámetro mayor o varios capilares en paralelo.' });
  if (r.estrangulado)
    av.push({ nivel: 'info', texto: `Flujo estrangulado en la salida (${es(r.Psalida, 2)} bar frente a ${es(ctx.Pe, 2)} bar del evaporador): el caudal no depende de la presión de evaporación.` });
  if (r.Lliq === 0 && ctx.subenf >= 1) av.push({ nivel: 'info', texto: 'El líquido se vaporiza desde la entrada del tubo (la pérdida de entrada supera el margen de subenfriamiento).' });
  if (r.velSalida > 150) av.push({ nivel: 'aviso', texto: `Velocidad de salida muy alta (${es(r.velSalida, 0)} m/s): posible ruido de chorro.` });
  if (r.ReLiq < 4000 && r.Lliq > 0) av.push({ nivel: 'info', texto: 'Régimen de transición/laminar en el tramo de líquido: menor precisión.' });
  return av;
}

/* ───────────────────────────── Aplicaciones predefinidas ───────────────────────────── */

export const APLICACIONES = [
  { id: 'ashrae', nombre: 'Doméstico ASHRAE (−23,3 / 54,4 °C)', Te: -23.3, Tc: 54.4, subenf: 0, recal: 0 },
  { id: 'congelador', nombre: 'Congelador doméstico', Te: -25, Tc: 50, subenf: 5, recal: 5 },
  { id: 'frigorifico', nombre: 'Frigorífico doméstico', Te: -10, Tc: 45, subenf: 5, recal: 5 },
  { id: 'expositor', nombre: 'Expositor / vitrina refrigerada', Te: -10, Tc: 40, subenf: 3, recal: 5 },
  { id: 'camara-mt', nombre: 'Cámara de conservación (MT)', Te: -10, Tc: 40, subenf: 3, recal: 6 },
  { id: 'camara-lt', nombre: 'Cámara de congelación (LT)', Te: -30, Tc: 40, subenf: 3, recal: 6 },
  { id: 'clima', nombre: 'Climatización pequeña', Te: 5, Tc: 50, subenf: 5, recal: 5 },
];

export const SUPUESTOS_CAPILAR = [
  'Modelo homogéneo de equilibrio, adiabático, régimen permanente y sección constante.',
  'Fricción: correlación de Churchill con rugosidad de 1,5 µm (cobre estirado); en el tramo bifásico, viscosidad de McAdams.',
  'Pérdida de entrada: aceleración más contracción brusca (K = 0,5).',
  'Sin retardo de vaporización (líquido metaestable) y sin intercambio de calor con la línea de aspiración.',
  'En mezclas zeotrópicas se mezclan linealmente el líquido de burbuja y el vapor de rocío a la misma presión.',
  'Propiedades termodinámicas: CoolProp (ecuaciones de estado de referencia), tabuladas cada 2,5 °C e interpoladas.',
  'Precisión orientativa: ±15 % en caudal (≈ ±25 % en longitud). El capilar definitivo debe ajustarse en banco de pruebas.',
];
