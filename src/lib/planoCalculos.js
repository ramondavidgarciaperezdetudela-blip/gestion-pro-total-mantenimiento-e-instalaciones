/**
 * planoCalculos.js — Cálculos del plano dibujado.
 *
 * Aparte de la pantalla y sin React, para poder comprobar los números por su
 * cuenta. Aquí se calcula lo que se puede calcular sin IA: superficies,
 * volúmenes, carga térmica estimada, metros de tubería y lista de material.
 *
 * La IA se usa después para afinar (marca y modelo concretos, precios reales,
 * particularidades de la instalación), pero el presupuesto sale igual aunque
 * no haya conexión o no queden créditos: eso es deliberado.
 *
 * TODAS las medidas del plano van en METROS. El lienzo hace la conversión a
 * píxeles; aquí no se sabe nada de pantallas.
 */

/** 1 kW = 860 frigorías/hora. */
export const FRIGORIAS_POR_KW = 860;

/**
 * Carga térmica de referencia en frigorías/hora por m², según el uso.
 * Son valores de manual de instalador para un primer dimensionado; la IA y el
 * técnico los ajustan después. No sustituyen a un cálculo de cargas completo.
 */
export const FACTOR_USO = {
  vivienda: 100,
  dormitorio: 90,
  oficina: 120,
  comercio: 130,
  restauracion: 180,
  sala_servidores: 300,
  almacen: 70,
  // Cámaras: la carga por m² no tiene nada que ver con la de un local
  // climatizado, porque se mantiene un salto de temperatura enorme todo el día.
  // Estos números son un PRIMER DIMENSIONADO para presupuestar; para el
  // cálculo fino (producto, entradas diarias, renovaciones, tiempo de
  // funcionamiento) está la pantalla de Cámara Frigorífica.
  obrador: 160,
  camara_refrigeracion: 200,
  camara_congelacion: 380,
};

/** Usos que son cámara, para avisar de que conviene el cálculo detallado. */
export const USOS_CAMARA = ['camara_refrigeracion', 'camara_congelacion'];

/** Corrección por orientación de la fachada principal. */
export const FACTOR_ORIENTACION = {
  norte: 0.90,
  este: 1.00,
  oeste: 1.10,
  sur: 1.15,
  interior: 0.85,
};

/** Corrección por aislamiento del cerramiento. */
export const FACTOR_AISLAMIENTO = {
  bueno: 0.90,
  normal: 1.00,
  malo: 1.15,
};

/**
 * Equipos que se pueden colocar en el plano, con su dibujo y su precio.
 *
 * `categoria` separa climatización de refrigeración porque no se presupuestan
 * igual: en clima hay una exterior común para varias interiores, y en
 * refrigeración cada mueble o cámara lleva lo suyo.
 */
export const TIPOS_MAQUINA = [
  // ── Climatización ──────────────────────────────────────────────────────
  { id: 'mural', nombre: 'Split mural', color: '#ef4444', categoria: 'clima' },
  { id: 'cassette', nombre: 'Cassette', color: '#8b5cf6', categoria: 'clima' },
  { id: 'conductos', nombre: 'Conductos', color: '#f59e0b', categoria: 'clima' },
  { id: 'suelo', nombre: 'Suelo / consola', color: '#3b82f6', categoria: 'clima' },
  { id: 'exterior', nombre: 'Unidad exterior', color: '#0f766e', categoria: 'clima' },
  // ── Refrigeración ──────────────────────────────────────────────────────
  { id: 'evaporador_camara', nombre: 'Evaporador de cámara', color: '#0891b2', categoria: 'refrigeracion' },
  { id: 'unidad_condensadora', nombre: 'Unidad condensadora', color: '#0f766e', categoria: 'refrigeracion' },
  { id: 'vitrina', nombre: 'Vitrina / mural refrigerado', color: '#7c3aed', categoria: 'refrigeracion' },
  { id: 'arcon', nombre: 'Arcón / isla congelación', color: '#1d4ed8', categoria: 'refrigeracion' },
  { id: 'camara_puerta', nombre: 'Puerta de cámara', color: '#64748b', categoria: 'refrigeracion' },
];

/** Equipos que van dentro de una estancia y se dimensionan con su carga. */
export const EQUIPOS_INTERIORES = [
  'mural', 'cassette', 'conductos', 'suelo', 'evaporador_camara',
];

/** Equipos sueltos: se presupuestan por unidad, no por la carga de la sala. */
export const EQUIPOS_SUELTOS = ['vitrina', 'arcon', 'camara_puerta'];

/** Superficie de una estancia rectangular, en m². */
export function areaEstancia(estancia) {
  const ancho = Number(estancia?.ancho) || 0;
  const alto = Number(estancia?.alto) || 0;
  return redondear(ancho * alto, 2);
}

/** Volumen de una estancia, en m³. */
export function volumenEstancia(estancia, alturaPorDefecto = 2.5) {
  const h = Number(estancia?.altura) || alturaPorDefecto;
  return redondear(areaEstancia(estancia) * h, 2);
}

/**
 * Carga térmica estimada de una estancia.
 *
 * Se parte de las frigorías por m² del uso y se corrige por orientación y
 * aislamiento. La altura entra como corrección proporcional respecto a los
 * 2,5 m de referencia: un techo alto es más volumen que refrigerar.
 *
 * @returns {{frigorias:number, kw:number, area:number, volumen:number}}
 */
export function cargaEstancia(estancia, alturaPorDefecto = 2.5) {
  const area = areaEstancia(estancia);
  const altura = Number(estancia?.altura) || alturaPorDefecto;
  const base = FACTOR_USO[estancia?.uso] ?? FACTOR_USO.vivienda;
  const fo = FACTOR_ORIENTACION[estancia?.orientacion] ?? FACTOR_ORIENTACION.este;
  const fa = FACTOR_AISLAMIENTO[estancia?.aislamiento] ?? FACTOR_AISLAMIENTO.normal;
  const fAltura = altura / 2.5;

  const frigorias = area * base * fo * fa * fAltura;
  return {
    area,
    volumen: redondear(area * altura, 2),
    frigorias: Math.round(frigorias),
    kw: redondear(frigorias / FRIGORIAS_POR_KW, 2),
  };
}

/**
 * Potencia comercial más ajustada por encima de la calculada.
 * Las máquinas se venden en escalones, no en la cifra exacta que sale.
 */
export const ESCALONES_KW = [2.0, 2.5, 3.5, 4.5, 5.2, 6.0, 7.1, 8.0, 10.0, 12.5, 14.0, 16.0, 20.0];

export function potenciaComercial(kw) {
  const necesaria = Number(kw) || 0;
  return ESCALONES_KW.find(e => e >= necesaria) ?? ESCALONES_KW[ESCALONES_KW.length - 1];
}

/**
 * Metros de tubería frigorífica de una máquina hasta la unidad exterior.
 *
 * Se mide en recorrido de pared (Manhattan), no en línea recta: la tubería va
 * por rincones y falso techo, nunca cruzando la habitación en diagonal. Se
 * suma la bajada vertical y un margen para curvas y conexiones.
 *
 * @param {{x:number,y:number}} maquina  posición en metros
 * @param {{x:number,y:number}} exterior posición en metros
 * @param {number} desnivel  metros de subida/bajada
 * @param {number} margen    metros de holgura
 */
export function metrosTuberia(maquina, exterior, desnivel = 3, margen = 2) {
  if (!maquina || !exterior) return 0;
  const dx = Math.abs((Number(maquina.x) || 0) - (Number(exterior.x) || 0));
  const dy = Math.abs((Number(maquina.y) || 0) - (Number(exterior.y) || 0));
  return redondear(dx + dy + (Number(desnivel) || 0) + (Number(margen) || 0), 1);
}

/**
 * Resumen completo del plano: cada estancia con su carga y su máquina, más
 * los totales. Es lo que se enseña en pantalla y lo que se manda a la IA.
 */
export function resumenPlano(plano) {
  const { estancias = [], maquinas = [], unidad_exterior = null, altura_defecto = 2.5 } = plano || {};

  // Vitrinas, arcones y puertas se presupuestan por unidad: no dependen de la
  // carga de la sala donde estén, así que se apartan antes de repartir.
  const sueltos = maquinas.filter(m => EQUIPOS_SUELTOS.includes(m.tipo));
  const interiores = maquinas.filter(m => !EQUIPOS_SUELTOS.includes(m.tipo));

  const detalle = estancias.map(est => {
    const carga = cargaEstancia(est, altura_defecto);
    const maquina = interiores.find(m => m.estancia_id === est.id) || null;
    const tuberia = maquina && unidad_exterior
      ? metrosTuberia(maquina, unidad_exterior, altura_defecto)
      : 0;
    return {
      estancia: est,
      ...carga,
      kw_comercial: potenciaComercial(carga.kw),
      maquina,
      metros_tuberia: tuberia,
    };
  });

  const areaTotal = redondear(detalle.reduce((s, d) => s + d.area, 0), 2);
  const frigoriasTotal = detalle.reduce((s, d) => s + d.frigorias, 0);
  const kwTotal = redondear(frigoriasTotal / FRIGORIAS_POR_KW, 2);
  const tuberiaTotal = redondear(detalle.reduce((s, d) => s + d.metros_tuberia, 0), 1);

  // La exterior de un multisplit no se dimensiona sumando todas las interiores:
  // nunca funcionan todas a tope a la vez. Se aplica un factor de simultaneidad.
  const simultaneidad = detalle.length > 1 ? 0.85 : 1;

  // Si lo que hay colocado son evaporadores de cámara, la máquina de fuera es
  // una unidad condensadora, no la exterior de un split: se nombra y se
  // valora distinto.
  const esRefrigeracion = detalle.some(d => d.maquina?.tipo === 'evaporador_camara');

  return {
    detalle,
    sueltos,
    es_refrigeracion: esRefrigeracion,
    area_total: areaTotal,
    frigorias_total: frigoriasTotal,
    kw_total: kwTotal,
    kw_exterior: redondear(kwTotal * simultaneidad, 2),
    kw_exterior_comercial: potenciaComercial(kwTotal * simultaneidad),
    simultaneidad,
    metros_tuberia_total: tuberiaTotal,
    sin_maquina: detalle.filter(d => !d.maquina).map(d => d.estancia.nombre || 'Sin nombre'),
    // Cámaras dibujadas: se avisa de que el cálculo fino va en su pantalla.
    camaras: detalle
      .filter(d => USOS_CAMARA.includes(d.estancia.uso))
      .map(d => d.estancia.nombre || 'Cámara'),
  };
}

/**
 * Precios de referencia del material, en euros.
 *
 * Son orientativos y se pueden pisar con la tarifa del proveedor o con lo que
 * devuelva la IA. Están aquí para que el presupuesto salga con cifras aunque
 * no haya nada configurado, en vez de salir a cero y parecer que falla.
 */
export const PRECIOS_REFERENCIA = {
  mural: 480,
  cassette: 950,
  conductos: 1100,
  suelo: 700,
  exterior_kw: 130,      // € por kW de unidad exterior
  tuberia_m: 14,         // € por metro de par de tubería aislada
  desague_m: 3.5,
  cable_m: 2.8,
  soporte: 35,
  vacio_carga: 60,       // por máquina
  mano_obra_maquina: 180,
  // Refrigeración
  evaporador_camara: 620,
  unidad_condensadora_kw: 210,   // € por kW de condensadora (más cara que una exterior de clima)
  vitrina: 2400,
  arcon: 1500,
  camara_puerta: 850,
};

/**
 * Lista de material y mano de obra a partir del resumen.
 * Cada línea sale ya en el formato de líneas de presupuesto.
 */
export function listaMateriales(resumen, precios = PRECIOS_REFERENCIA) {
  const p = { ...PRECIOS_REFERENCIA, ...(precios || {}) };
  const lineas = [];

  // Una línea por tipo de máquina interior, agrupando las iguales.
  const porTipo = {};
  for (const d of resumen.detalle) {
    if (!d.maquina) continue;
    const clave = `${d.maquina.tipo}|${d.kw_comercial}`;
    if (!porTipo[clave]) {
      porTipo[clave] = { tipo: d.maquina.tipo, kw: d.kw_comercial, cantidad: 0, estancias: [] };
    }
    porTipo[clave].cantidad += 1;
    porTipo[clave].estancias.push(d.estancia.nombre || 'estancia');
  }

  for (const g of Object.values(porTipo)) {
    const nombreTipo = TIPOS_MAQUINA.find(t => t.id === g.tipo)?.nombre || g.tipo;
    const precio = p[g.tipo] ?? p.mural;
    lineas.push(crearLinea({
      descripcion: `Unidad interior ${nombreTipo} ${g.kw} kW (${g.estancias.join(', ')})`,
      unidad: 'ud',
      cantidad: g.cantidad,
      precio_ud: precio,
      categoria: 'maquinaria',
    }));
  }

  // Equipos sueltos (vitrinas, arcones, puertas): por unidad, agrupados.
  const porSuelto = {};
  for (const eq of (resumen.sueltos || [])) {
    porSuelto[eq.tipo] = (porSuelto[eq.tipo] || 0) + 1;
  }
  for (const [tipo, cantidad] of Object.entries(porSuelto)) {
    lineas.push(crearLinea({
      descripcion: `${TIPOS_MAQUINA.find(t => t.id === tipo)?.nombre || tipo}, instalado`,
      unidad: 'ud',
      cantidad,
      precio_ud: p[tipo] ?? 0,
      categoria: 'maquinaria',
    }));
  }

  const hayMaquinas = resumen.detalle.some(d => d.maquina);

  // Sin ninguna interior colocada no se presupuesta exterior: el escalón
  // comercial mínimo haría aparecer una máquina de la nada en un plano vacío.
  if (hayMaquinas && resumen.kw_exterior_comercial > 0) {
    const esRefri = resumen.es_refrigeracion;
    lineas.push(crearLinea({
      descripcion: esRefri
        ? `Unidad condensadora ${resumen.kw_exterior_comercial} kW`
        : `Unidad exterior ${resumen.kw_exterior_comercial} kW`,
      unidad: 'ud',
      cantidad: 1,
      precio_ud: redondear(
        resumen.kw_exterior_comercial * (esRefri ? p.unidad_condensadora_kw : p.exterior_kw), 2
      ),
      categoria: 'maquinaria',
    }));
  }

  const nMaquinas = resumen.detalle.filter(d => d.maquina).length;
  const metros = resumen.metros_tuberia_total;

  if (metros > 0) {
    lineas.push(crearLinea({
      descripcion: 'Par de tubería frigorífica aislada, instalada',
      unidad: 'm', cantidad: metros, precio_ud: p.tuberia_m, categoria: 'tuberia',
    }));
    lineas.push(crearLinea({
      descripcion: 'Tubería de desagüe de condensados',
      unidad: 'm', cantidad: metros, precio_ud: p.desague_m, categoria: 'tuberia',
    }));
    lineas.push(crearLinea({
      descripcion: 'Cable de interconexión 4x1,5 mm²',
      unidad: 'm', cantidad: metros, precio_ud: p.cable_m, categoria: 'electrico',
    }));
  }

  if (nMaquinas > 0) {
    lineas.push(crearLinea({
      descripcion: 'Soportes y anclajes',
      unidad: 'ud', cantidad: nMaquinas + 1, precio_ud: p.soporte, categoria: 'accesorios',
    }));
    lineas.push(crearLinea({
      descripcion: 'Vacío, estanqueidad y carga de gas',
      unidad: 'ud', cantidad: nMaquinas, precio_ud: p.vacio_carga, categoria: 'accesorios',
    }));
    lineas.push(crearLinea({
      descripcion: 'Mano de obra de instalación y puesta en marcha',
      unidad: 'ud', cantidad: nMaquinas, precio_ud: p.mano_obra_maquina, categoria: 'mano_obra',
    }));
  }

  return lineas;
}

function crearLinea({ descripcion, unidad, cantidad, precio_ud, categoria }) {
  const c = redondear(cantidad, 2);
  const pu = redondear(precio_ud, 2);
  return { descripcion, unidad, cantidad: c, precio_ud: pu, total: redondear(c * pu, 2), categoria };
}

/** Suma de una lista de líneas. */
export function totalMateriales(lineas = []) {
  return redondear(lineas.reduce((s, l) => s + (Number(l.total) || 0), 0), 2);
}

/**
 * Descripción del plano en texto, para mandársela a la IA.
 * Se manda el dibujo ya medido, no la imagen: gasta muchísimo menos y la IA
 * no tiene que adivinar las cotas, que es donde más se equivoca.
 */
export function planoComoTexto(plano, resumen) {
  const lineas = [`Plano dibujado. Superficie total ${resumen.area_total} m².`];
  for (const d of resumen.detalle) {
    const e = d.estancia;
    lineas.push(
      `- ${e.nombre || 'Estancia'}: ${e.ancho}x${e.alto} m = ${d.area} m², ` +
      `altura ${e.altura || plano.altura_defecto || 2.5} m, uso ${e.uso || 'vivienda'}, ` +
      `orientación ${e.orientacion || 'este'}, aislamiento ${e.aislamiento || 'normal'}. ` +
      `Carga estimada ${d.frigorias} frig/h (${d.kw} kW). ` +
      (d.maquina
        ? `Máquina prevista: ${d.maquina.tipo} de ${d.kw_comercial} kW, ${d.metros_tuberia} m de tubería hasta la exterior.`
        : 'SIN máquina asignada.')
    );
  }
  lineas.push(`Unidad exterior prevista: ${resumen.kw_exterior_comercial} kW (simultaneidad ${resumen.simultaneidad}).`);
  lineas.push(`Tubería total estimada: ${resumen.metros_tuberia_total} m.`);
  return lineas.join('\n');
}

function redondear(n, decimales) {
  const f = 10 ** decimales;
  return Math.round((Number(n) || 0) * f) / f;
}
