/**
 * planoRecorrido.js — Por dónde pasa la instalación y si está bien pasada.
 *
 * Una cosa es dónde van las máquinas y otra muy distinta por dónde se lleva la
 * tubería. En la obra eso es la mitad del trabajo: si el recorrido se va de
 * metros, hay que cargar más gas, la máquina rinde menos y el presupuesto se
 * queda corto.
 *
 * Aquí se calcula el recorrido dibujado a mano, se compara con el más corto
 * posible y se avisa de lo que un instalador miraría: longitud máxima del
 * fabricante, desnivel, carga adicional de refrigerante y codos.
 *
 * Sin React y sin dibujo: solo números, para poder comprobarlos aparte.
 * Todas las medidas en METROS.
 */

/**
 * Límites típicos de fabricante según el tipo de instalación.
 *
 * SON ORIENTATIVOS y así se dice en pantalla: cada máquina trae los suyos en
 * su manual y varían bastante entre gamas. Sirven para que salte el aviso y
 * se vaya a mirar la ficha, no para sustituirla.
 */
export const LIMITES = {
  split_1x1: {
    nombre: 'Split 1x1 doméstico',
    longitud_max: 20,      // m de tubería
    desnivel_max: 10,      // m entre interior y exterior
    sin_carga_extra: 7.5,  // m que ya vienen cargados de fábrica
    gramos_por_metro: 20,  // g de refrigerante por metro de más
  },
  multisplit: {
    nombre: 'Multisplit',
    longitud_max: 25,
    desnivel_max: 15,
    sin_carga_extra: 7.5,
    gramos_por_metro: 20,
  },
  conductos: {
    nombre: 'Conductos',
    longitud_max: 30,
    desnivel_max: 15,
    sin_carga_extra: 10,
    gramos_por_metro: 25,
  },
  refrigeracion: {
    nombre: 'Refrigeración comercial',
    longitud_max: 30,
    desnivel_max: 15,
    sin_carga_extra: 0,    // estas se cargan enteras en obra
    gramos_por_metro: 35,
  },
};

/** Metros que "cuenta" cada codo de más, por la pérdida de carga. */
export const METROS_POR_CODO = 0.5;

/** Longitud de un recorrido dibujado, en metros. */
export function longitudRecorrido(puntos = []) {
  if (!Array.isArray(puntos) || puntos.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const dx = (Number(puntos[i].x) || 0) - (Number(puntos[i - 1].x) || 0);
    const dy = (Number(puntos[i].y) || 0) - (Number(puntos[i - 1].y) || 0);
    total += Math.hypot(dx, dy);
  }
  return redondear(total, 2);
}

/** Cuántos codos tiene el recorrido (cambios de dirección de verdad). */
export function contarCodos(puntos = []) {
  if (!Array.isArray(puntos) || puntos.length < 3) return 0;
  let codos = 0;
  for (let i = 1; i < puntos.length - 1; i++) {
    const a = puntos[i - 1], b = puntos[i], c = puntos[i + 1];
    const v1x = b.x - a.x, v1y = b.y - a.y;
    const v2x = c.x - b.x, v2y = c.y - b.y;
    // Producto vectorial: si no es cero, el trazado gira ahí.
    const giro = v1x * v2y - v1y * v2x;
    if (Math.abs(giro) > 0.01) codos++;
  }
  return codos;
}

/**
 * Recorrido más corto razonable entre dos puntos: por pared, no en diagonal.
 * Es la referencia contra la que se compara lo dibujado.
 */
export function recorridoMinimo(desde, hasta) {
  if (!desde || !hasta) return 0;
  return redondear(
    Math.abs((desde.x || 0) - (hasta.x || 0)) + Math.abs((desde.y || 0) - (hasta.y || 0)),
    2
  );
}

/**
 * Carga adicional de refrigerante que hay que meter, en gramos.
 * Solo cuentan los metros que pasan de lo que ya viene cargado de fábrica.
 */
export function cargaAdicionalGas(metros, tipo = 'split_1x1') {
  const l = LIMITES[tipo] || LIMITES.split_1x1;
  const exceso = (Number(metros) || 0) - l.sin_carga_extra;
  if (exceso <= 0) return 0;
  return Math.round(exceso * l.gramos_por_metro);
}

/**
 * Pérdida de rendimiento aproximada por la longitud de la tubería.
 *
 * Regla de andar por casa pero realista: a partir de la longitud que viene
 * cargada de fábrica se pierde en torno a un 1 % cada 5 metros. No sustituye
 * a la tabla de corrección del fabricante, pero avisa de cuándo mirarla.
 */
export function perdidaRendimiento(metros, tipo = 'split_1x1') {
  const l = LIMITES[tipo] || LIMITES.split_1x1;
  const exceso = (Number(metros) || 0) - l.sin_carga_extra;
  if (exceso <= 0) return 0;
  return redondear(Math.min(15, (exceso / 5) * 1), 1);
}

/**
 * Revisa un recorrido y devuelve lo que hay que saber antes de instalarlo.
 *
 * @param {Array<{x:number,y:number}>} puntos  recorrido dibujado
 * @param {number} desnivel  metros de subida/bajada (cota de la planta, etc.)
 * @param {string} tipo      clave de LIMITES
 * @param {{x:number,y:number}} [origen]  para comparar con el recorrido mínimo
 * @param {{x:number,y:number}} [destino]
 */
export function evaluarRecorrido(puntos, desnivel = 0, tipo = 'split_1x1', origen = null, destino = null) {
  const l = LIMITES[tipo] || LIMITES.split_1x1;
  const horizontal = longitudRecorrido(puntos);
  const codos = contarCodos(puntos);
  const desn = Math.abs(Number(desnivel) || 0);

  // Lo que cuenta para el fabricante es la longitud real más lo que penalizan
  // los codos; el desnivel va aparte porque tiene su propio límite.
  const metrosReales = redondear(horizontal + desn, 2);
  const metrosEquivalentes = redondear(metrosReales + codos * METROS_POR_CODO, 2);

  const minimo = (origen && destino)
    ? redondear(recorridoMinimo(origen, destino) + desn, 2)
    : null;
  const exceso = minimo !== null ? redondear(metrosReales - minimo, 2) : null;

  const avisos = [];

  if (metrosEquivalentes > l.longitud_max) {
    avisos.push({
      nivel: 'error',
      texto: `${metrosEquivalentes} m equivalentes: pasa del máximo típico de ${l.longitud_max} m para ${l.nombre.toLowerCase()}. Comprueba el manual antes de instalarlo así.`,
    });
  } else if (metrosEquivalentes > l.longitud_max * 0.8) {
    avisos.push({
      nivel: 'aviso',
      texto: `${metrosEquivalentes} m equivalentes: cerca del máximo (${l.longitud_max} m). Deja poco margen si luego hay que desviarse.`,
    });
  }

  if (desn > l.desnivel_max) {
    avisos.push({
      nivel: 'error',
      texto: `Desnivel de ${desn} m: pasa del máximo típico de ${l.desnivel_max} m. Puede hacer falta sifón de aceite o replantear dónde va la exterior.`,
    });
  }

  if (codos >= 6) {
    avisos.push({
      nivel: 'aviso',
      texto: `${codos} codos: cada uno resta caudal. Si puedes, busca un recorrido más recto.`,
    });
  }

  const gas = cargaAdicionalGas(metrosReales, tipo);
  if (gas > 0) {
    avisos.push({
      nivel: 'info',
      texto: `Hay que añadir unos ${gas} g de refrigerante: los primeros ${l.sin_carga_extra} m ya vienen cargados de fábrica.`,
    });
  }

  const perdida = perdidaRendimiento(metrosReales, tipo);
  if (perdida >= 3) {
    avisos.push({
      nivel: 'aviso',
      texto: `Con esta longitud se pierde en torno a un ${perdida} % de rendimiento. Valora subir un escalón de potencia.`,
    });
  }

  // Si lo dibujado se aleja mucho de lo más corto, merece la pena decirlo.
  if (exceso !== null && minimo > 0 && exceso > Math.max(3, minimo * 0.4)) {
    avisos.push({
      nivel: 'aviso',
      texto: `El recorrido da ${exceso} m de rodeo: por el camino más corto serían unos ${minimo} m. Mira si puedes pasar por otro sitio.`,
    });
  }

  return {
    metros: metrosReales,
    metros_equivalentes: metrosEquivalentes,
    horizontal,
    desnivel: desn,
    codos,
    minimo,
    exceso,
    gas_adicional_g: gas,
    perdida_rendimiento: perdida,
    avisos,
    // Verde solo si no hay ningún aviso serio.
    correcto: !avisos.some(a => a.nivel === 'error'),
  };
}

// ─── Conductos ──────────────────────────────────────────────────────────────

/**
 * Caudal de aire que mueve una máquina, en m³/h.
 * Referencia habitual en climatización: unos 170 m³/h por cada kW.
 */
export const CAUDAL_POR_KW = 170;

/** Velocidad recomendada del aire, en m/s, según dónde va el conducto. */
export const VELOCIDAD_RECOMENDADA = {
  principal: 5,
  ramal: 3.5,
  rejilla: 2.5,
};

export function caudalDeKw(kw) {
  return Math.round((Number(kw) || 0) * CAUDAL_POR_KW);
}

/**
 * Sección de conducto necesaria para un caudal y una velocidad.
 * @returns {{area_m2:number, lado_cm:number, diametro_cm:number}}
 */
export function seccionConducto(caudal_m3h, velocidad_ms = VELOCIDAD_RECOMENDADA.principal) {
  const q = Number(caudal_m3h) || 0;
  const v = Number(velocidad_ms) || VELOCIDAD_RECOMENDADA.principal;
  if (q <= 0 || v <= 0) return { area_m2: 0, lado_cm: 0, diametro_cm: 0 };

  const area = q / 3600 / v;                    // m²
  const lado = Math.sqrt(area) * 100;           // conducto cuadrado, en cm
  const diametro = Math.sqrt((4 * area) / Math.PI) * 100; // redondo, en cm
  return {
    area_m2: redondear(area, 4),
    lado_cm: redondear(lado, 1),
    diametro_cm: redondear(diametro, 1),
  };
}

/**
 * Velocidad real que llevaría el aire por una sección dada.
 * Sirve para avisar de conductos que van demasiado justos (ruido).
 */
export function velocidadReal(caudal_m3h, area_m2) {
  const q = Number(caudal_m3h) || 0;
  const a = Number(area_m2) || 0;
  if (a <= 0) return 0;
  return redondear(q / 3600 / a, 2);
}

/**
 * Revisa un tramo de conducto dibujado.
 * @param {Array} puntos  trazado del conducto
 * @param {number} caudal m³/h que pasa por el tramo
 * @param {string} papel  'principal' | 'ramal' | 'rejilla'
 */
export function evaluarConducto(puntos, caudal, papel = 'principal') {
  const metros = longitudRecorrido(puntos);
  const codos = contarCodos(puntos);
  const v = VELOCIDAD_RECOMENDADA[papel] ?? VELOCIDAD_RECOMENDADA.principal;
  const seccion = seccionConducto(caudal, v);

  const avisos = [];
  if (codos >= 4) {
    avisos.push({
      nivel: 'aviso',
      texto: `${codos} codos en el conducto: mucha pérdida de carga y ruido. Suaviza el trazado si puedes.`,
    });
  }
  if (metros > 15) {
    avisos.push({
      nivel: 'aviso',
      texto: `${metros} m de conducto: a esa distancia conviene revisar que el ventilador dé la presión necesaria.`,
    });
  }
  if (caudal > 0 && seccion.lado_cm > 60) {
    avisos.push({
      nivel: 'info',
      texto: `Sección grande (${seccion.lado_cm} cm de lado): comprueba que cabe en el falso techo.`,
    });
  }

  return { metros, codos, caudal: Number(caudal) || 0, velocidad: v, ...seccion, avisos };
}

function redondear(n, decimales) {
  const f = 10 ** decimales;
  return Math.round((Number(n) || 0) * f) / f;
}
