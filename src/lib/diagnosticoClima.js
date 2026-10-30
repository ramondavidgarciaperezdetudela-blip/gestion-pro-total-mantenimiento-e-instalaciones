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

import { ATM, temperaturaSaturacion, presionSaturacion as presionSat } from './saturacion.js';

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const redondear = (n, d = 1) => (n == null ? null : Math.round(n * 10 ** d) / 10 ** d);

/**
 * Presión ↔ temperatura de saturación, con presión MANOMÉTRICA (bar).
 *
 * No hay tabla escrita aquí: sale de las propiedades de cada gas (CoolProp, ver `saturacion.js`), las mismas que
 * usan «Presiones de trabajo» y las tablas P–T, así que los números coinciden en todo el programa.
 *
 * En las mezclas con deslizamiento (R-407C, R-454B…) hay dos temperaturas a la misma presión:
 *   · ROCÍO  → recalentamiento y evaporación (es el punto que vale en la aspiración)
 *   · BURBUJA → subenfriamiento (es el punto que vale en la línea de líquido)
 * En un gas puro las dos coinciden. Fuera de la tabla del gas se devuelve `null`: no se extrapola.
 */
const manometro = (bar) => Number(bar) + ATM;

/** Gases del selector de clima, los que se ven de verdad en un split. */
export const GASES_CLIMA = ['R-410A', 'R-32', 'R-454B', 'R-22', 'R-407C', 'R-134a', 'R-290'];

/**
 * Temperatura de saturación (°C) para una presión manométrica (bar).
 * @param {'rocio'|'burbuja'} [punto='rocio']
 * Devuelve null si el gas no tiene tabla o la presión se sale de ella.
 */
export function tempSaturacion(gas, presionBar, punto = 'rocio') {
  const p = num(presionBar);
  if (p == null) return null;
  const t = temperaturaSaturacion(gas, manometro(p), punto);
  return t == null ? null : redondear(t, 1);
}

/** Presión manométrica (bar) para una temperatura de saturación (°C). */
export function presionSaturacion(gas, tempC, punto = 'rocio') {
  const t = num(tempC);
  if (t == null) return null;
  const p = presionSat(gas, t, punto);
  return p == null ? null : redondear(p - ATM, 2);
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

  // Condensación: el rocío es la temperatura nominal de condensación; el subenfriamiento se mide contra la burbuja.
  const tCondDePresion = tempSaturacion(gas, d.pAlta);
  const tCondBurbuja = tempSaturacion(gas, d.pAlta, 'burbuja');
  const tCondLeida = num(d.tCondManual);
  const tCond = tCondLeida != null ? tCondLeida : tCondDePresion;
  const hayAlta = tCond != null;

  const tAsp = num(d.tAspiracion);
  const recalentamiento = (tAsp != null && tEvap != null) ? redondear(tAsp - tEvap) : null;

  const tLiq = num(d.tLiquido);
  const tCondSub = tCondLeida != null ? tCondLeida : tCondBurbuja;
  const subenfriamiento = (hayAlta && tLiq != null && tCondSub != null) ? redondear(tCondSub - tLiq) : null;

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

  const relacionCompresion = (num(d.pAlta) != null && num(d.pBaja) != null && num(d.pBaja) > -ATM)
    ? redondear((num(d.pAlta) + ATM) / (num(d.pBaja) + ATM), 2) : null;

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
