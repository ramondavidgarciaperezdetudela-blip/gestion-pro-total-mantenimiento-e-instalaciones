/**
 * diagnosticoClima.js — Diagnóstico de un split de aire acondicionado.
 *
 * EL PROBLEMA QUE RESUELVE
 * En refrigeración comercial se pincha en alta y en baja y se tiene todo:
 * evaporación, condensación, recalentamiento y subenfriamiento. En un split
 * doméstico NO: casi todos traen una sola toma, la de la línea de aspiración,
 * así que solo se puede medir presión de baja, temperatura de aspiración y
 * temperatura de descarga. Alta la tienen algunos modelos y algunas gamas,
 * pero no se puede contar con ella.
 *
 * Por eso este diagnóstico está montado al revés que el de refrigeración: la
 * alta es OPCIONAL, y lo que manda es lo que sí se puede medir siempre —el
 * recalentamiento y, sobre todo, el salto de temperatura del AIRE en la
 * evaporadora y en la condensadora—. Con esas tres cosas cruzadas se separa
 * bastante bien la falta de gas de una restricción, de un problema de caudal
 * de aire o de un compresor que no bombea, que es lo que hay que decidir
 * delante del cliente.
 *
 * Todos los rangos son ORIENTATIVOS y así se dice en pantalla. El valor bueno
 * de verdad es el de la ficha técnica del equipo.
 */

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const redondear = (n, d = 1) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Tabla de saturación: presión MANOMÉTRICA (bar) para cada temperatura.
 *
 * Es una comodidad, no la referencia: el manómetro del técnico ya trae la
 * escala de temperatura impresa para su gas, y esa es la que manda. Aquí está
 * para poder meter la presión cuando se lee en un manómetro digital que solo
 * da bares, y para cruzar las dos lecturas y ver si el manómetro desvía.
 *
 * Los valores son de las tablas de saturación estándar de cada refrigerante,
 * en presión manométrica (absoluta − 1,013 bar). Entre dos puntos se
 * interpola en línea recta: en tramos de 5 °C el error es pequeño frente a la
 * precisión con la que se lee un manómetro en obra.
 *
 * En las mezclas con deslizamiento (R-407C sobre todo) se usa el punto de
 * ROCÍO, que es el que vale para calcular el recalentamiento en la aspiración.
 */
export const TABLA_SATURACION = {
  // °C: [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
  'R-410A': { glide: 0.2, bar: [2.30, 2.99, 3.80, 4.72, 5.78, 6.97, 8.31, 9.82, 11.50, 13.37, 15.43, 17.71, 20.21, 22.95, 25.94, 29.21] },
  'R-32':   { glide: 0,   bar: [2.31, 3.02, 3.84, 4.79, 5.86, 7.09, 8.47, 10.01, 11.74, 13.67, 15.81, 18.18, 20.79, 23.67, 26.82, 30.27] },
  'R-454B': { glide: 1.5, bar: [2.18, 2.84, 3.62, 4.51, 5.52, 6.67, 7.96, 9.41, 11.03, 12.83, 14.82, 17.02, 19.44, 22.09, 24.99, 28.15] },
  'R-22':   { glide: 0,   bar: [1.01, 1.44, 1.95, 2.54, 3.21, 3.97, 4.83, 5.80, 6.88, 8.09, 9.43, 10.91, 12.54, 14.33, 16.28, 18.41] },
  'R-407C': { glide: 6,   bar: [1.19, 1.74, 2.31, 2.97, 3.72, 4.57, 5.53, 6.61, 7.82, 9.16, 10.65, 12.29, 14.10, 16.08, 18.24, 20.60] },
  'R-134a': { glide: 0,   bar: [-0.06, 0.32, 0.63, 1.00, 1.42, 1.92, 2.49, 3.14, 3.87, 4.71, 5.64, 6.69, 7.86, 9.16, 10.59, 12.17] },
};

const TEMPS_TABLA = [-25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/** Gases del selector de clima, los que se ven de verdad en un split. */
export const GASES_CLIMA = ['R-410A', 'R-32', 'R-454B', 'R-22', 'R-407C', 'R-134a'];

/**
 * Temperatura de saturación (°C) para una presión manométrica (bar).
 * Devuelve null si el gas no está en la tabla o la presión se sale de ella.
 */
export function tempSaturacion(gas, presionBar) {
  const p = num(presionBar);
  const t = TABLA_SATURACION[gas];
  if (p == null || !t) return null;
  const bar = t.bar;
  if (p < bar[0] || p > bar[bar.length - 1]) return null;
  for (let i = 0; i < bar.length - 1; i++) {
    if (p >= bar[i] && p <= bar[i + 1]) {
      const f = (p - bar[i]) / (bar[i + 1] - bar[i] || 1);
      return redondear(TEMPS_TABLA[i] + f * (TEMPS_TABLA[i + 1] - TEMPS_TABLA[i]), 1);
    }
  }
  return null;
}

/** Presión manométrica (bar) para una temperatura de saturación (°C). */
export function presionSaturacion(gas, tempC) {
  const t = num(tempC);
  const tab = TABLA_SATURACION[gas];
  if (t == null || !tab) return null;
  if (t < TEMPS_TABLA[0] || t > TEMPS_TABLA[TEMPS_TABLA.length - 1]) return null;
  for (let i = 0; i < TEMPS_TABLA.length - 1; i++) {
    if (t >= TEMPS_TABLA[i] && t <= TEMPS_TABLA[i + 1]) {
      const f = (t - TEMPS_TABLA[i]) / (TEMPS_TABLA[i + 1] - TEMPS_TABLA[i]);
      return redondear(tab.bar[i] + f * (tab.bar[i + 1] - tab.bar[i]), 2);
    }
  }
  return null;
}

/**
 * Rangos de referencia, orientativos.
 * El recalentamiento depende del sistema de expansión: un capilar trabaja más
 * alto que una válvula, y confundirlos hace cargar de más una máquina sana.
 */
export const RANGOS_CLIMA = {
  recalentamiento: {
    capilar: { min: 5, max: 12, bajo: 3, alto: 16 },
    valvula: { min: 4, max: 8, bajo: 2, alto: 12 },
  },
  // Salto del aire en la evaporadora (retorno − impulsión) en frío.
  dtAireInterior: {
    frio: { min: 8, max: 12, bajo: 6, alto: 15 },
    calor: { min: 14, max: 25, bajo: 10, alto: 32 },
  },
  // Salto del aire en la condensadora (salida − entrada) en frío.
  dtAireExterior: {
    frio: { min: 4, max: 10, bajo: 2.5, alto: 13 },
    calor: { min: 3, max: 8, bajo: 1.5, alto: 11 },
  },
  // Cuánto sube la condensación por encima del aire que entra a la exterior.
  saltoCondensacion: { min: 8, max: 18, alto: 22 },
  descarga: { alto: 100, muyAlto: 115 },
  subenfriamiento: { min: 4, max: 10, bajo: 2, alto: 14 },
};

/** Dónde cae un valor respecto a su rango: 'ok' | 'aviso' | 'mal' | null. */
export function nivelRango(valor, rango) {
  const v = num(valor);
  if (v == null || !rango) return null;
  if ((rango.bajo != null && v < rango.bajo) || (rango.alto != null && v > rango.alto)) return 'mal';
  if (v < rango.min || v > rango.max) return 'aviso';
  return 'ok';
}

/**
 * Calcula todo lo que se puede sacar de las lecturas de un split.
 *
 * @param {object} d
 * @param {string} d.gas
 * @param {'frio'|'calor'} d.modo
 * @param {'capilar'|'valvula'} d.expansion
 * @param {number|string} d.pBaja        presión de baja, manométrica (bar)
 * @param {number|string} d.tEvapManual  T de evaporación leída en el manómetro
 * @param {number|string} d.pAlta        OPCIONAL: no todos los splits la traen
 * @param {number|string} d.tCondManual  OPCIONAL
 * @param {number|string} d.tAspiracion  T del tubo gordo, en la exterior
 * @param {number|string} d.tDescarga    T del tubo de descarga del compresor
 * @param {number|string} d.tLiquido     OPCIONAL: T de la línea de líquido
 * @param {number|string} d.aireIntEntra T del aire de aspiración (retorno)
 * @param {number|string} d.aireIntSale  T del aire de impulsión
 * @param {number|string} d.aireExtEntra T del aire que entra a la condensadora
 * @param {number|string} d.aireExtSale  T del aire que sale de la condensadora
 */
export function calculoClima(d = {}) {
  const gas = d.gas || 'R-410A';
  const modo = d.modo === 'calor' ? 'calor' : 'frio';

  // La temperatura de evaporación puede venir del manómetro (lo suyo) o
  // salir de la presión. Si están las dos, manda la leída y se avisa si no
  // cuadran: un manómetro descalibrado se detecta justo así.
  const tEvapDePresion = tempSaturacion(gas, d.pBaja);
  const tEvapLeida = num(d.tEvapManual);
  const tEvap = tEvapLeida != null ? tEvapLeida : tEvapDePresion;

  const tCondDePresion = tempSaturacion(gas, d.pAlta);
  const tCondLeida = num(d.tCondManual);
  const tCond = tCondLeida != null ? tCondLeida : tCondDePresion;
  const hayAlta = tCond != null;

  const tAsp = num(d.tAspiracion);
  const recalentamiento = (tAsp != null && tEvap != null) ? redondear(tAsp - tEvap) : null;

  const tLiq = num(d.tLiquido);
  const subenfriamiento = (hayAlta && tLiq != null) ? redondear(tCond - tLiq) : null;

  const aIn = num(d.aireIntEntra), aOut = num(d.aireIntSale);
  // En frío la interior enfría: el salto es retorno − impulsión. En calor
  // calienta y es al revés. Se devuelve siempre positivo si va bien.
  const dtAireInterior = (aIn != null && aOut != null)
    ? redondear(modo === 'frio' ? aIn - aOut : aOut - aIn) : null;

  const eIn = num(d.aireExtEntra), eOut = num(d.aireExtSale);
  // En frío la exterior tira calor: sale más caliente. En calor, al revés.
  const dtAireExterior = (eIn != null && eOut != null)
    ? redondear(modo === 'frio' ? eOut - eIn : eIn - eOut) : null;

  // Sin toma de alta, la condensación se estima: en un split limpio ronda
  // entre 10 y 15 K por encima del aire que entra a la exterior. Es una
  // ESTIMACIÓN y se marca como tal, pero permite ver si la máquina está
  // condensando alta (batería sucia, ventilador flojo, exceso de carga).
  const condensacionEstimada = (!hayAlta && modo === 'frio' && eIn != null)
    ? redondear(eIn + 13) : null;
  const saltoCondensacion = (hayAlta && eIn != null) ? redondear(tCond - eIn) : null;

  const relacionCompresion = (num(d.pAlta) != null && num(d.pBaja) != null && num(d.pBaja) > -1)
    ? redondear((num(d.pAlta) + 1.013) / (num(d.pBaja) + 1.013), 2) : null;

  // Descuadre entre lo leído en el manómetro y lo que dice la tabla.
  const desvioManometro = (tEvapLeida != null && tEvapDePresion != null)
    ? redondear(tEvapLeida - tEvapDePresion) : null;

  return {
    gas, modo, hayAlta,
    tEvap, tEvapDePresion, tCond, tCondDePresion,
    recalentamiento, subenfriamiento,
    dtAireInterior, dtAireExterior,
    condensacionEstimada, saltoCondensacion,
    relacionCompresion, desvioManometro,
    tDescarga: num(d.tDescarga),
    tAspiracion: tAsp,
  };
}

/**
 * Traduce las lecturas a lo que hay que ir a mirar.
 *
 * Cada aviso lleva nivel ('mal' | 'aviso' | 'ok' | 'info'), un título corto y
 * qué comprobar. Van ordenados: primero lo que rompe la máquina.
 */
export function diagnosticoClima(d = {}) {
  const c = calculoClima(d);
  const avisos = [];
  const add = (nivel, titulo, texto) => avisos.push({ nivel, titulo, texto });

  const rc = c.recalentamiento;
  const rangoRC = RANGOS_CLIMA.recalentamiento[d.expansion === 'valvula' ? 'valvula' : 'capilar'];
  const dtInt = c.dtAireInterior;
  const rangoInt = RANGOS_CLIMA.dtAireInterior[c.modo];
  const dtExt = c.dtAireExterior;
  const rangoExt = RANGOS_CLIMA.dtAireExterior[c.modo];

  const rcAlto = rc != null && rc > rangoRC.max;
  const rcBajo = rc != null && rc < rangoRC.min;
  const intBajo = dtInt != null && dtInt < rangoInt.min;
  const intAlto = dtInt != null && dtInt > rangoInt.max;
  const extBajo = dtExt != null && dtExt < rangoExt.min;
  const extAlto = dtExt != null && dtExt > rangoExt.max;

  // ── Lo primero: lo que se carga el compresor ────────────────────────────
  if (c.tDescarga != null && c.tDescarga >= RANGOS_CLIMA.descarga.muyAlto) {
    add('mal', 'Descarga demasiado caliente',
      `${c.tDescarga} °C en el tubo de descarga. Por encima de ${RANGOS_CLIMA.descarga.muyAlto} °C el aceite se degrada y el compresor se muere. Para la máquina y busca la causa: casi siempre falta de gas, restricción o condensación alta.`);
  } else if (c.tDescarga != null && c.tDescarga >= RANGOS_CLIMA.descarga.alto) {
    add('aviso', 'Descarga alta',
      `${c.tDescarga} °C. Vigílalo: con poca carga o mala condensación sube rápido.`);
  }

  if (rcBajo && rc <= rangoRC.bajo) {
    add('mal', 'Recalentamiento muy bajo: riesgo de líquido al compresor',
      `${rc} K. Está volviendo refrigerante sin evaporar al compresor. Sobra carga, la válvula está pasada o hay poco caudal de aire en la evaporadora. No lo dejes funcionando así.`);
  }

  // ── El cruce que de verdad separa las averías ───────────────────────────
  if (rcAlto && intBajo) {
    add('mal', 'Falta de gas (o fuga)',
      `Recalentamiento ${rc} K (alto) y la evaporadora solo baja ${dtInt} K el aire. Es el cuadro clásico de poca carga. BUSCA LA FUGA antes de cargar: por las tuercas de la exterior, la batería y las soldaduras. Cargar sin buscarla es volver dentro de tres meses.`);
  } else if (rcAlto && intAlto) {
    add('mal', 'Restricción en el circuito',
      `Recalentamiento ${rc} K con un salto de aire de ${dtInt} K. Con carga correcta esto es una restricción: filtro deshidratador o capilar obstruido, o válvula de expansión que no abre. Mira si hay un punto frío o escarchado justo después de la restricción.`);
  } else if (rcAlto) {
    add('aviso', 'Recalentamiento alto',
      `${rc} K frente a ${rangoRC.min}–${rangoRC.max} K de referencia. Falta carga o hay una restricción. Toma el salto de aire de la interior para separarlo.`);
  }

  if (rcBajo && intBajo && rc > rangoRC.bajo) {
    add('mal', 'El compresor no está bombeando bien',
      `Recalentamiento ${rc} K (bajo) y el aire solo salta ${dtInt} K. Si la carga es la correcta, el compresor está gastado o la válvula de 4 vías se está pasando (comprueba la temperatura de los cuatro tubos de la válvula: si el de descarga calienta el de aspiración, está pasando).`);
  } else if (rcBajo) {
    add('aviso', 'Recalentamiento bajo',
      `${rc} K. Suele ser exceso de carga, o poco caudal de aire en la evaporadora. Pesa la carga si el equipo la lleva indicada en la placa.`);
  }

  if (intAlto && !rcAlto && !rcBajo) {
    add('aviso', 'Poco caudal de aire en la interior',
      `El aire salta ${dtInt} K con el recalentamiento correcto: pasa poco aire por la batería. Filtros sucios, turbina con pelusa, ventilador lento o la batería empezando a hacer hielo.`);
  }
  if (intBajo && rc == null) {
    add('aviso', 'La interior enfría poco',
      `Solo ${dtInt} K de salto en el aire (lo normal, ${rangoInt.min}–${rangoInt.max} K). Mide el recalentamiento para saber si es falta de gas o es caudal de aire.`);
  }

  // ── Lado de la condensadora ─────────────────────────────────────────────
  if (extAlto) {
    add('mal', 'La exterior no está disipando',
      `El aire sale ${dtExt} K más caliente de lo que entra. Batería sucia o con pelusa, ventilador exterior lento o parado, o la máquina metida en un sitio sin aire (recircula su propio aire caliente).`);
  } else if (extBajo && c.modo === 'frio') {
    add('aviso', 'La exterior casi no calienta el aire',
      `Solo ${dtExt} K. O el compresor no está dando lo suyo, o le falta carga, o el ventilador está moviendo mucho más aire del que toca. Comprueba que el compresor arranca de verdad y no solo el ventilador.`);
  }

  if (c.saltoCondensacion != null && c.saltoCondensacion > RANGOS_CLIMA.saltoCondensacion.alto) {
    add('mal', 'Condensación alta',
      `Condensa ${c.saltoCondensacion} K por encima del aire de entrada (lo normal, ${RANGOS_CLIMA.saltoCondensacion.min}–${RANGOS_CLIMA.saltoCondensacion.max} K). Batería sucia, poco aire o exceso de carga.`);
  }

  if (c.subenfriamiento != null) {
    const n = nivelRango(c.subenfriamiento, RANGOS_CLIMA.subenfriamiento);
    if (n === 'mal' && c.subenfriamiento < RANGOS_CLIMA.subenfriamiento.min) {
      add('mal', 'Subenfriamiento muy bajo',
        `${c.subenfriamiento} K. Falta carga o hay gas pasando a la línea de líquido.`);
    } else if (n === 'mal') {
      add('aviso', 'Subenfriamiento alto',
        `${c.subenfriamiento} K. Sobra carga o el líquido no está saliendo bien del condensador.`);
    }
  }

  // ── Fiabilidad de lo medido ─────────────────────────────────────────────
  if (c.desvioManometro != null && Math.abs(c.desvioManometro) >= 2) {
    add('aviso', 'El manómetro no cuadra con la tabla',
      `Has leído ${c.tEvap} °C y por presión salen ${c.tEvapDePresion} °C (${c.desvioManometro > 0 ? '+' : ''}${c.desvioManometro} K de diferencia). Revisa que el manómetro esté en la escala del gas correcto y que no esté descalibrado.`);
  }

  if (!c.hayAlta) {
    add('info', 'Sin toma de alta presión',
      'Este equipo no tiene toma de alta o no se ha medido, que es lo normal en un split. Sin ella NO se puede calcular subenfriamiento ni relación de compresión: el diagnóstico se apoya en el recalentamiento y en el salto de temperatura del aire, y la condensación es una estimación.');
  }

  if (rc == null && dtInt == null && dtExt == null) {
    add('info', 'Faltan datos',
      'Con la presión de baja y la temperatura del tubo de aspiración ya sale el recalentamiento. Añade el aire de entrada y salida de la interior y de la exterior y el diagnóstico se cierra bastante.');
  }

  const nadaMal = !avisos.some(a => a.nivel === 'mal' || a.nivel === 'aviso');
  if (nadaMal && rc != null && dtInt != null) {
    add('ok', 'Todo dentro de rango',
      `Recalentamiento ${rc} K y salto de aire de ${dtInt} K en la interior. Con estos números la máquina está trabajando bien; si el cliente sigue notando que no enfría, mira la carga térmica del local antes que la máquina.`);
  }

  return { ...c, avisos };
}
