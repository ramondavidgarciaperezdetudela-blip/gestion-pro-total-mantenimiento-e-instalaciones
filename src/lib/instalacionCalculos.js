/**
 * instalacionCalculos.js — lo que hay que saber de una tubería, de una línea
 * eléctrica y del presupuesto cuando ya está el plano dibujado.
 *
 * ─── AVISO QUE IMPORTA ──────────────────────────────────────────────────────
 *
 * Los diámetros que salen de aquí son ORIENTATIVOS, para dimensionar sobre el
 * plano y pedir material. El diámetro bueno es el de la ficha técnica del
 * equipo: depende del refrigerante, del salto térmico, del aceite que hay que
 * arrastrar de vuelta y de los desniveles. Dos instalaciones con la misma
 * potencia y la misma longitud pueden pedir tuberías distintas.
 *
 * Por eso cada resultado sale con su aviso, y nunca se presenta como el dato
 * definitivo del fabricante.
 */

import { elementoDe } from './planoFrigorificoCatalogo.js';

/* ─── Tubería frigorífica ───────────────────────────────────────────────── */

/**
 * Diámetros habituales en pulgadas, con su equivalencia y su sección.
 * Es la serie de cobre frigorífico que se encuentra en cualquier almacén.
 */
export const DIAMETROS = [
  { pulgadas: '1/4"', mm: 6.35, capacidadLiquido: 3000, capacidadGas: 1200 },
  { pulgadas: '3/8"', mm: 9.52, capacidadLiquido: 8000, capacidadGas: 3500 },
  { pulgadas: '1/2"', mm: 12.7, capacidadLiquido: 15000, capacidadGas: 7000 },
  { pulgadas: '5/8"', mm: 15.88, capacidadLiquido: 25000, capacidadGas: 12000 },
  { pulgadas: '3/4"', mm: 19.05, capacidadLiquido: 40000, capacidadGas: 20000 },
  { pulgadas: '7/8"', mm: 22.22, capacidadLiquido: 60000, capacidadGas: 30000 },
  { pulgadas: '1.1/8"', mm: 28.58, capacidadLiquido: 100000, capacidadGas: 52000 },
  { pulgadas: '1.3/8"', mm: 34.92, capacidadLiquido: 160000, capacidadGas: 85000 },
  { pulgadas: '1.5/8"', mm: 41.27, capacidadLiquido: 240000, capacidadGas: 130000 },
  { pulgadas: '2.1/8"', mm: 53.98, capacidadLiquido: 420000, capacidadGas: 230000 },
];

/** Gramos de refrigerante por metro de línea de líquido, por diámetro. */
const CARGA_POR_METRO = {
  '1/4"': 25, '3/8"': 60, '1/2"': 110, '5/8"': 175, '3/4"': 255,
  '7/8"': 350, '1.1/8"': 580, '1.3/8"': 870, '1.5/8"': 1220, '2.1/8"': 2100,
};

/**
 * Sugiere los diámetros de gas y de líquido de una tubería.
 *
 * La longitud penaliza: cuanta más tubería, más pérdida de carga, así que a
 * partir de cierta distancia se sube un diámetro para no ahogar la máquina.
 *
 * @param {object} d
 * @param {number} d.potenciaW      potencia frigorífica que mueve la tubería
 * @param {number} d.longitudM      longitud real de la línea
 * @param {number} [d.desnivelM]    desnivel; si el evaporador está por debajo
 *                                  cuesta más devolver el aceite
 * @returns {{gas, liquido, avisos: string[], cargaEstimadaG: number}}
 */
export function sugerirDiametros({ potenciaW, longitudM = 0, desnivelM = 0 } = {}) {
  const avisos = [];
  const w = Number(potenciaW) || 0;
  const L = Number(longitudM) || 0;

  if (!w) {
    return {
      gas: null, liquido: null, cargaEstimadaG: 0,
      avisos: ['Sin la potencia del equipo no se puede sugerir diámetro. Mira la placa o la ficha técnica.'],
    };
  }

  // A más longitud, más margen: se exige más capacidad de la nominal.
  const factor = L > 50 ? 1.45 : L > 30 ? 1.3 : L > 15 ? 1.15 : 1;
  const exigido = w * factor;

  const gas = DIAMETROS.find((x) => x.capacidadGas >= exigido) || DIAMETROS[DIAMETROS.length - 1];
  const liquido = DIAMETROS.find((x) => x.capacidadLiquido >= exigido) || DIAMETROS[DIAMETROS.length - 1];

  if (factor > 1) avisos.push(`Línea de ${L} m: se ha subido el margen un ${Math.round((factor - 1) * 100)} % por la pérdida de carga.`);
  if (L > 50) avisos.push('Por encima de 50 m conviene comprobar la caída de presión con los datos del fabricante y valorar carga adicional de aceite.');
  if (desnivelM > 3) avisos.push(`Con ${desnivelM} m de desnivel hacen falta sifones de retorno de aceite en la aspiración, uno cada 2-3 m de subida.`);
  if (desnivelM < -3) avisos.push('El evaporador queda por debajo de la condensadora: cuida el retorno de aceite y la posible migración de refrigerante en paradas.');
  if (gas === DIAMETROS[DIAMETROS.length - 1]) avisos.push('Potencia por encima de la tabla: dimensiona con el programa del fabricante.');

  const cargaEstimadaG = Math.round((CARGA_POR_METRO[liquido.pulgadas] || 0) * L);

  return { gas, liquido, cargaEstimadaG, avisos };
}

/** Longitud de una polilínea, en metros, según la escala del plano. */
export function longitudDe(puntos = [], metrosPorPixel = 0.02) {
  let total = 0;
  for (let i = 1; i < puntos.length; i++) {
    const dx = puntos[i].x - puntos[i - 1].x;
    const dy = puntos[i].y - puntos[i - 1].y;
    total += Math.hypot(dx, dy);
  }
  return Math.round(total * metrosPorPixel * 100) / 100;
}

/* ─── Línea eléctrica ───────────────────────────────────────────────────── */

export const TIPOS_CONEXION_ELECTRICA = [
  { id: 'potencia', nombre: 'Potencia (fuerza)', color: '#eab308' },
  { id: 'maniobra', nombre: 'Maniobra / mando', color: '#f97316' },
  { id: 'comunicacion', nombre: 'Comunicación / datos', color: '#8b5cf6' },
  { id: 'tierra', nombre: 'Tierra', color: '#16a34a' },
];

export const BUSES_COMUNICACION = [
  'Modbus RTU (RS-485)', 'Modbus TCP', 'BACnet', 'KNX', 'CAN bus',
  'LonWorks', 'Ethernet', 'Wi-Fi', 'Propietario del fabricante',
];

/** Secciones de cable habituales, con la intensidad que admiten. */
export const SECCIONES = [
  { mm2: 1.5, aMono: 16, aTri: 16 }, { mm2: 2.5, aMono: 20, aTri: 22 },
  { mm2: 4, aMono: 25, aTri: 30 }, { mm2: 6, aMono: 32, aTri: 38 },
  { mm2: 10, aMono: 45, aTri: 52 }, { mm2: 16, aMono: 60, aTri: 70 },
  { mm2: 25, aMono: 80, aTri: 92 }, { mm2: 35, aMono: 100, aTri: 115 },
  { mm2: 50, aMono: 125, aTri: 145 }, { mm2: 70, aMono: 160, aTri: 185 },
];

/**
 * Sugiere la sección de un cable de potencia.
 *
 * Mira dos cosas: que aguante la intensidad y que la caída de tensión no se
 * pase. En instalaciones largas manda casi siempre la segunda.
 */
export function sugerirSeccion({ potenciaW, tension = '230 V monofásica', longitudM = 0, caidaMax = 3 } = {}) {
  const avisos = [];
  const w = Number(potenciaW) || 0;
  const L = Number(longitudM) || 0;
  if (!w) return { seccion: null, intensidadA: 0, avisos: ['Sin la potencia no se puede sugerir sección.'] };

  const trifasica = /400|trif/i.test(tension);
  const v = trifasica ? 400 : 230;
  const cosPhi = 0.85;
  const intensidadA = trifasica ? w / (Math.sqrt(3) * v * cosPhi) : w / (v * cosPhi);

  // Por intensidad.
  const porIntensidad = SECCIONES.find((s) => (trifasica ? s.aTri : s.aMono) >= intensidadA * 1.25);

  // Por caída de tensión (cobre, ρ = 0,018 Ω·mm²/m).
  const rho = 0.018;
  const caidaV = (v * caidaMax) / 100;
  const necesariaMm2 = trifasica
    ? (Math.sqrt(3) * rho * L * intensidadA * cosPhi) / caidaV
    : (2 * rho * L * intensidadA * cosPhi) / caidaV;
  const porCaida = SECCIONES.find((s) => s.mm2 >= necesariaMm2);

  const elegida = [porIntensidad, porCaida]
    .filter(Boolean)
    .sort((a, b) => b.mm2 - a.mm2)[0] || SECCIONES[SECCIONES.length - 1];

  if (porCaida && porIntensidad && porCaida.mm2 > porIntensidad.mm2) {
    avisos.push(`Manda la caída de tensión, no la intensidad: con ${L} m haría falta ${porCaida.mm2} mm² aunque por corriente bastaran ${porIntensidad.mm2} mm².`);
  }
  avisos.push('Sección orientativa: no tiene en cuenta el tipo de instalación (bandeja, enterrado, tubo), ni el agrupamiento, ni la temperatura. Compruébalo con el REBT (ITC-BT-19).');

  return {
    seccion: elegida,
    intensidadA: Math.round(intensidadA * 10) / 10,
    caidaEstimada: Math.round(necesariaMm2 * 100) / 100,
    trifasica,
    avisos,
  };
}

/* ─── Presupuesto aproximado ────────────────────────────────────────────── */

/** Longitud en metros de una conexión, según dónde estén sus dos extremos. */
function largoConexion(conn, elements, scale) {
  const a = elements.find((e) => e.id === conn.from_id);
  const b = elements.find((e) => e.id === conn.to_id);
  if (!a || !b) return 0;
  return Math.hypot(a.x - b.x, a.y - b.y) / (scale || 50);
}

/**
 * Suma lo que hay en el plano para dar un presupuesto aproximado.
 *
 * No pretende sustituir al presupuesto de verdad: sirve para tener una cifra
 * encima de la mesa mientras se dibuja, y para no olvidarse de contar lo que
 * ya está puesto en el plano.
 *
 * @param {object} plan        el plano tal y como lo guarda la pantalla:
 *                             { elements, connections, walls, scale }
 * @param {Function} precioDe  (idElemento) => número | null, para usar las
 *                             tarifas propias en vez de los precios de fábrica
 */
export function presupuestoAproximado(plan, precioDe = () => null) {
  const elements = plan?.elements || [];
  const connections = plan?.connections || [];
  const scale = plan?.scale || 50;
  const lineas = [];

  // Equipos, agrupados por tipo y contando las cantidades de cada uno.
  const cuenta = {};
  for (const el of elements) {
    const tipo = el.type || el.id;
    cuenta[tipo] = (cuenta[tipo] || 0) + (parseInt(el.qty, 10) || 1);
  }
  for (const [tipo, unidades] of Object.entries(cuenta)) {
    const def = elementoDe(tipo);
    if (!def) continue;
    const precio = precioDe(tipo) ?? def.precio ?? 0;
    if (!precio) continue;
    lineas.push({
      concepto: def.label, unidades, precioUnidad: precio,
      total: Math.round(precio * unidades * 100) / 100, categoria: def.cat,
    });
  }

  // Tubería frigorífica y línea eléctrica, por los metros que hay dibujados.
  const metros = (tipo) => connections
    .filter((c) => c.type === tipo)
    .reduce((n, c) => n + largoConexion(c, elements, scale), 0);

  const metrosTuberia = metros('refrigerante');
  if (metrosTuberia > 0) {
    lineas.push({
      concepto: 'Tubería frigorífica (cobre, aislamiento y accesorios)',
      unidades: Math.round(metrosTuberia * 10) / 10, precioUnidad: 28,
      total: Math.round(metrosTuberia * 28 * 100) / 100, categoria: 'refrigeracion', unidad: 'm',
    });
  }

  const metrosCable = metros('electrica');
  if (metrosCable > 0) {
    lineas.push({
      concepto: 'Línea eléctrica (cable, canalización y pequeño material)',
      unidades: Math.round(metrosCable * 10) / 10, precioUnidad: 14,
      total: Math.round(metrosCable * 14 * 100) / 100, categoria: 'electrico', unidad: 'm',
    });
  }

  const materiales = Math.round(lineas.reduce((n, l) => n + l.total, 0) * 100) / 100;
  // La mano de obra, como porcentaje del material: es la regla de andar por
  // casa que usa casi todo el mundo para una cifra rápida.
  const manoObra = Math.round(materiales * 0.35 * 100) / 100;
  const total = Math.round((materiales + manoObra) * 100) / 100;

  return {
    lineas: lineas.sort((a, b) => b.total - a.total),
    materiales, manoObra, total,
    metrosTuberia: Math.round(metrosTuberia * 10) / 10,
    metrosCable: Math.round(metrosCable * 10) / 10,
    aviso: 'Presupuesto APROXIMADO calculado sobre lo que hay dibujado en el plano, con precios '
      + 'orientativos y un 35 % de mano de obra. Sirve para una primera cifra, no para enviar al '
      + 'cliente: revísalo con tus tarifas antes de mandarlo.',
  };
}
