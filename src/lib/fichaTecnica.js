/**
 * fichaTecnica.js — Los datos técnicos de un componente, sin teclearlos a mano.
 *
 * Copiar a mano la placa de un compresor son ocho casillas, y se hace en casa
 * del cliente, de pie y con el móvil. Aquí hay tres formas de rellenarlas, de
 * la más segura a la menos:
 *
 *   1. PEGAR lo que pone la web del fabricante. Se entiende el texto y se
 *      reparte por casillas. Funciona SIEMPRE: sin internet, sin cuenta y sin
 *      gastar un céntimo. Es la que se usa primero.
 *   2. La REFERENCIA sola. De un código como "FH4518Y-XC3A" se deduce el
 *      fabricante y la familia, porque las referencias siguen un patrón.
 *      También funciona sin conexión.
 *   3. La IA, si está encendida. Rellena lo que falte.
 *
 * Lo que se saca por las dos primeras vías es lo que dice el propio texto o el
 * propio código: no se inventa nada. Lo que venga de la IA se marca como tal,
 * porque un dato inventado en una hoja firmada es peor que un hueco.
 */

/** Sin tildes y en minúsculas, para comparar sin sustos. */
function normalizar(t) {
  return String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Familias de referencias que se reconocen a simple vista.
 *
 * Son las que aparecen a diario en frío comercial. El prefijo identifica al
 * fabricante y, con él, la tecnología: no hay que buscar nada.
 */
export const FAMILIAS = [
  { patron: /^(FH|CAJ|TAJ|AJ|AE|AK|TFH|SC|NE|GL|TL|CL)\d/i, marca: 'Tecumseh', tecnologia: 'Recíproco' },
  { patron: /^(NJ|NT|NL|SC|FR|TL|GS|MS|NF)\d/i, marca: 'Danfoss / Secop', tecnologia: 'Recíproco' },
  { patron: /^(ZB|ZR|ZF|ZS|CR|VR)\d/i, marca: 'Copeland', tecnologia: 'Scroll' },
  { patron: /^(DK|D[2-9]|4M|6M|8M|2E|4E|4N|4P|4T)[A-Z]?[- ]?\d/i, marca: 'Bitzer', tecnologia: 'Recíproco' },
  { patron: /^(ZP|ZH|ZW)\d/i, marca: 'Copeland', tecnologia: 'Scroll' },
  { patron: /^(MT|MTZ|NTZ|SZ|SM|SY|SH|HL[PM])\d/i, marca: 'Danfoss', tecnologia: 'Recíproco' },
  { patron: /^(CSH|CSW|OS[AKN]|HS[AKN])\d/i, marca: 'Bitzer', tecnologia: 'Tornillo' },
];

/** Aplicaciones del compresor, y qué significan. */
export const APLICACIONES = {
  HBP: 'Alta temperatura (HBP) — aire acondicionado y conservación positiva',
  MBP: 'Media temperatura (MBP) — refrigeración comercial',
  LBP: 'Baja temperatura (LBP) — congelación',
  'HBP/MBP': 'Alta y media temperatura',
};

/** Refrigerantes que se reconocen en un texto suelto. */
const REFRIGERANTES = [
  'R-134a', 'R134a', 'R-513A', 'R513A', 'R-404A', 'R404A', 'R-407C', 'R407C',
  'R-410A', 'R410A', 'R-32', 'R32', 'R-290', 'R290', 'R-600a', 'R600a',
  'R-744', 'R744', 'R-448A', 'R448A', 'R-449A', 'R449A', 'R-452A', 'R452A',
  'R-1234yf', 'R-1234ze', 'R-22', 'R22',
];

/**
 * Deja el refrigerante escrito como manda la norma.
 *
 * No es capricho: las MEZCLAS de las series 400 y 500 llevan la letra en
 * MAYÚSCULA (R-404A, R-410A, R-407C, R-448A, R-513A) y los de un solo
 * componente la llevan en minúscula (R-134a, R-600a, R-1234yf). Escribir
 * "R-404a" o "R-134A" en un registro de gases fluorados que se firma es un
 * error de designación, no una errata de estilo.
 */
export function normalizarRefrigerante(texto) {
  const m = /^R\s*-?\s*(\d+)\s*([a-zA-Z]*)$/i.exec(String(texto).trim());
  if (!m) return String(texto).trim();
  const cifras = m[1];
  const letra = m[2] || '';
  if (!letra) return `R-${cifras}`;
  const esMezcla = /^[45]/.test(cifras);
  return `R-${cifras}${esMezcla ? letra.toUpperCase() : letra.toLowerCase()}`;
}

/**
 * Qué se puede deducir de la referencia sola.
 * Devuelve {} si no se reconoce: mejor nada que un dato inventado.
 */
export function deLaReferencia(referencia) {
  const ref = String(referencia || '').trim();
  if (ref.length < 3) return {};
  for (const f of FAMILIAS) {
    if (f.patron.test(ref)) {
      return { compressor_brand: f.marca, compressor_technology: f.tecnologia };
    }
  }
  return {};
}

/**
 * Entiende el texto que se copia de la web del fabricante y lo reparte.
 *
 * Se admiten las dos formas en que suele venir: "Voltaje : 220-240V" con dos
 * puntos, y a palo seco en una línea suelta. Y en español o en inglés, que
 * media documentación del sector viene en inglés.
 */
export function deLaFichaPegada(texto) {
  const t = String(texto || '');
  if (!t.trim()) return {};
  const datos = {};
  const lineas = t.split('\n').map((l) => l.trim()).filter(Boolean);

  const buscarEtiqueta = (...nombres) => {
    for (const linea of lineas) {
      const m = /^([^:]{2,40}):\s*(.+)$/.exec(linea);
      if (!m) continue;
      const etiqueta = normalizar(m[1]);
      if (nombres.some((n) => etiqueta.includes(normalizar(n)))) return m[2].trim();
    }
    return null;
  };

  const marca = buscarEtiqueta('marca', 'brand', 'fabricante', 'manufacturer');
  if (marca) datos.compressor_brand = marca;

  const aplicacion = buscarEtiqueta('solicitud', 'aplicacion', 'application', 'uso');
  if (aplicacion) datos.compressor_application = aplicacion;

  const voltaje = buscarEtiqueta('voltaje', 'voltage', 'alimentacion', 'tension', 'supply');
  if (voltaje) datos.compressor_supply = voltaje;

  const tecnologia = buscarEtiqueta('tecnologia', 'technology', 'tipo de producto', 'product technology');
  if (tecnologia) datos.compressor_technology = tecnologia;

  const potencia = buscarEtiqueta('potencia', 'power', 'cv', 'hp');
  if (potencia) datos.compressor_power_hp = potencia;

  const refriEtiqueta = buscarEtiqueta('refrigerante', 'refrigerant', 'gas');
  if (refriEtiqueta) {
    datos.compressor_refrigerants = refriEtiqueta
      .split(/[,;/]+/).map((x) => normalizarRefrigerante(x)).filter(Boolean).join(', ');
  } else {
    // Sin etiqueta: se buscan los refrigerantes sueltos por el texto.
    const vistos = [];
    for (const r of REFRIGERANTES) {
      const re = new RegExp(`\\b${r.replace(/[-]/g, '-?')}\\b`, 'i');
      if (re.test(t)) {
        const limpio = normalizarRefrigerante(r);
        if (!vistos.includes(limpio)) vistos.push(limpio);
      }
    }
    if (vistos.length) datos.compressor_refrigerants = vistos.join(', ');
  }

  // La aplicación puede venir suelta (HBP, MBP, LBP) sin etiqueta ninguna.
  if (!datos.compressor_application) {
    const m = /\b(HBP\/MBP|HBP|MBP|LBP)\b/i.exec(t);
    if (m) datos.compressor_application = m[1].toUpperCase();
  }

  // La alimentación también suele ir suelta: "220-240V 1PH 50Hz".
  if (!datos.compressor_supply) {
    // Solo la tensión y, si van pegadas, las fases y la frecuencia. Antes se
    // cogía hasta el final de la línea y en "220-240V R-404A LBP hermético"
    // acababa metiendo el gas y la aplicación dentro de la alimentación.
    const m = /\b(\d{2,3}\s*-\s*\d{2,3}\s*V|\d{3}\s*V)((?:\s*\/?\s*\d\s*(?:PH|F))?(?:\s*\/?\s*\d{2}\s*Hz)?)/i.exec(t);
    if (m) datos.compressor_supply = (m[1] + (m[2] || '')).replace(/\s+/g, ' ').trim();
  }

  // La referencia: la primera línea que parezca un código de fabricante.
  if (!datos.compressor_ref) {
    for (const linea of lineas) {
      const limpio = linea.replace(/^\(|\)$/g, '').trim();
      if (/^[A-Z]{2,4}\d{3,5}[A-Z0-9-]*$/i.test(limpio)) { datos.compressor_ref = limpio; break; }
    }
  }

  // Lo que no se haya podido sacar del texto, a ver si lo dice la referencia.
  if (datos.compressor_ref) {
    const porRef = deLaReferencia(datos.compressor_ref);
    for (const [k, v] of Object.entries(porRef)) {
      if (!datos[k]) datos[k] = v;
    }
  }
  return datos;
}

/** Cuántas casillas se han podido rellenar y cuáles. */
export function resumenDeLoEncontrado(datos) {
  const NOMBRES = {
    compressor_ref: 'referencia',
    compressor_brand: 'marca',
    compressor_application: 'aplicación',
    compressor_supply: 'alimentación',
    compressor_refrigerants: 'refrigerantes',
    compressor_technology: 'tecnología',
    compressor_power_hp: 'potencia',
  };
  const puestos = Object.keys(datos || {}).filter((k) => datos[k]).map((k) => NOMBRES[k] || k);
  return puestos;
}

/**
 * El aviso que se le manda a la IA cuando está encendida.
 *
 * Se le pide expresamente que NO se invente nada: en una hoja que se firma y
 * se entrega, un dato inventado hace más daño que un hueco.
 */
export function encargoParaLaIA(referencia) {
  return `Eres un técnico frigorista. Datos de placa del compresor con referencia "${referencia}".
Si no conoces con seguridad este modelo, deja los campos vacíos: NO te inventes nada.
Responde solo con este JSON:
{"compressor_brand":"","compressor_application":"HBP, MBP o LBP","compressor_supply":"","compressor_refrigerants":"","compressor_technology":"","compressor_power_hp":""}`;
}

/** Junta lo encontrado sin pisar lo que ya había escrito a mano. */
export function fusionar(actual, encontrado) {
  const salida = { ...actual };
  let puestos = 0;
  for (const [k, v] of Object.entries(encontrado || {})) {
    if (!v) continue;
    if (salida[k]) continue;      // lo escrito a mano manda
    salida[k] = v;
    puestos++;
  }
  return { datos: salida, puestos };
}
