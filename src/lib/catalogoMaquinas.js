/**
 * catalogoMaquinas.js — Datos técnicos de las máquinas para el plano.
 *
 * Diámetros de tubería, carga de gas por metro, superficie que cubre cada
 * potencia… lo que hay que mirar en la ficha del fabricante para no quedarse
 * corto en el presupuesto ni en la instalación.
 *
 * SOBRE LAS MARCAS Y MODELOS: aquí NO hay modelos reales inventados. Poner
 * "marca X modelo Y con estos datos" sin haberlo mirado en su ficha sería
 * mentir en algo con lo que después se compra material. Lo que hay son
 * máquinas GENÉRICAS por potencia, con los datos que sí son estándar del
 * sector (los diámetros de tubería por potencia lo son), y la posibilidad de
 * que cada uno añada sus modelos con los datos de su manual, que quedan
 * guardados para los siguientes presupuestos.
 */

/**
 * Diámetros de tubería habituales según la potencia de la máquina.
 *
 * Es lo estándar en split y multisplit; la ficha del fabricante manda, pero
 * salvo rarezas coincide. En pulgadas y en milímetros, que cada uno lo pide
 * de una manera en el almacén.
 */
export const DIAMETROS_POR_KW = [
  { hasta: 3.5, liquido: '1/4"', liquido_mm: 6.35, gas: '3/8"', gas_mm: 9.52 },
  { hasta: 5.2, liquido: '1/4"', liquido_mm: 6.35, gas: '1/2"', gas_mm: 12.70 },
  { hasta: 7.1, liquido: '3/8"', liquido_mm: 9.52, gas: '5/8"', gas_mm: 15.88 },
  { hasta: 10.0, liquido: '3/8"', liquido_mm: 9.52, gas: '5/8"', gas_mm: 15.88 },
  { hasta: 14.0, liquido: '3/8"', liquido_mm: 9.52, gas: '3/4"', gas_mm: 19.05 },
  { hasta: 20.0, liquido: '1/2"', liquido_mm: 12.70, gas: '7/8"', gas_mm: 22.22 },
];

/**
 * Gramos de refrigerante por metro de más, según el diámetro de la LÍNEA DE
 * LÍQUIDO, que es la que manda para la carga adicional.
 *
 * Son los valores que dan casi todos los fabricantes para R-410A y R-32.
 * Cambian algo entre marcas; por eso se puede sobrescribir por máquina.
 */
export const GRAMOS_POR_METRO = {
  6.35: 20,    // 1/4"
  9.52: 50,    // 3/8"
  12.70: 110,  // 1/2"
  15.88: 170,  // 5/8"
};

/** Metros que ya vienen cargados de fábrica, según potencia. */
export function precargaFabrica(kw) {
  if (kw <= 3.5) return 5;
  if (kw <= 7.1) return 7.5;
  return 10;
}

/** Devuelve los diámetros que le tocan a una potencia. */
export function diametrosDeKw(kw) {
  const p = Number(kw) || 0;
  return DIAMETROS_POR_KW.find(d => p <= d.hasta) || DIAMETROS_POR_KW[DIAMETROS_POR_KW.length - 1];
}

/**
 * Cuántos m² cubre una máquina de X kW para un uso concreto.
 *
 * Es la vuelta del cálculo de carga: si una vivienda pide 100 frig/h por m²,
 * una máquina de 3,5 kW (3010 frig/h) cubre unos 30 m². Sirve para ver de un
 * vistazo si la máquina elegida se queda corta para la estancia.
 *
 * @param {number} kw
 * @param {number} frigoriasPorM2  el factor del uso (ver FACTOR_USO)
 */
export function superficieCubierta(kw, frigoriasPorM2 = 100) {
  const frig = (Number(kw) || 0) * 860;
  // Un factor a cero o negativo es un dato malo, no una petición de dividir
  // entre cero: se usa el de vivienda en vez de devolver 0 o infinito.
  const pedido = Number(frigoriasPorM2);
  const factor = Number.isFinite(pedido) && pedido > 0 ? pedido : 100;
  return Math.round((frig / factor) * 10) / 10;
}

/**
 * Carga adicional de gas para una longitud de tubería.
 *
 * @param {number} metros   longitud total de la línea
 * @param {number} kw       potencia (para saber diámetro y precarga)
 * @param {object} [maquina] si trae datos propios del fabricante, mandan
 * @returns {{gramos:number, precarga:number, gramos_metro:number, exceso:number}}
 */
export function cargaExtraGas(metros, kw, maquina = null) {
  const m = Number(metros) || 0;
  const d = diametrosDeKw(kw);

  // Lo que diga el fabricante siempre gana a la tabla general.
  const gramosMetro = Number(maquina?.gramos_por_metro)
    || GRAMOS_POR_METRO[d.liquido_mm]
    || 20;
  const precarga = Number(maquina?.precarga_m) || precargaFabrica(kw);

  const exceso = Math.max(0, m - precarga);
  return {
    gramos: Math.round(exceso * gramosMetro),
    precarga,
    gramos_metro: gramosMetro,
    exceso: Math.round(exceso * 10) / 10,
    liquido: d.liquido,
    gas: d.gas,
  };
}

/**
 * Máquinas genéricas por potencia, con los datos estándar.
 *
 * NO son modelos comerciales: son "una máquina de 3,5 kW" con lo que lleva
 * cualquier máquina de 3,5 kW. Sirven para presupuestar antes de saber la
 * marca, que es lo normal cuando se está delante del cliente.
 */
export const MAQUINAS_GENERICAS = [
  { kw: 2.0, tipo: 'mural', seer: 6.1, precio: 380 },
  { kw: 2.5, tipo: 'mural', seer: 6.4, precio: 420 },
  { kw: 3.5, tipo: 'mural', seer: 6.6, precio: 480 },
  { kw: 4.5, tipo: 'mural', seer: 6.3, precio: 620 },
  { kw: 5.2, tipo: 'mural', seer: 6.1, precio: 720 },
  { kw: 6.0, tipo: 'mural', seer: 6.0, precio: 880 },
  { kw: 7.1, tipo: 'mural', seer: 5.8, precio: 1050 },
  { kw: 3.5, tipo: 'cassette', seer: 6.0, precio: 950 },
  { kw: 5.2, tipo: 'cassette', seer: 5.9, precio: 1150 },
  { kw: 7.1, tipo: 'cassette', seer: 5.7, precio: 1400 },
  { kw: 10.0, tipo: 'cassette', seer: 5.5, precio: 1850 },
  { kw: 3.5, tipo: 'conductos', seer: 5.9, precio: 1100 },
  { kw: 5.2, tipo: 'conductos', seer: 5.8, precio: 1300 },
  { kw: 7.1, tipo: 'conductos', seer: 5.6, precio: 1600 },
  { kw: 10.0, tipo: 'conductos', seer: 5.4, precio: 2100 },
  { kw: 12.5, tipo: 'conductos', seer: 5.2, precio: 2600 },
  { kw: 3.5, tipo: 'suelo', seer: 6.0, precio: 700 },
  { kw: 5.2, tipo: 'suelo', seer: 5.9, precio: 900 },
].map(m => {
  const d = diametrosDeKw(m.kw);
  return {
    id: `gen_${m.tipo}_${String(m.kw).replace('.', '_')}`,
    generica: true,
    marca: 'Genérica',
    modelo: `${m.kw} kW`,
    ...m,
    liquido: d.liquido,
    gas: d.gas,
    liquido_mm: d.liquido_mm,
    gas_mm: d.gas_mm,
    gramos_por_metro: GRAMOS_POR_METRO[d.liquido_mm] || 20,
    precarga_m: precargaFabrica(m.kw),
  };
});

/** Las máquinas genéricas que valen para un tipo de equipo. */
export function genericasDeTipo(tipo) {
  return MAQUINAS_GENERICAS.filter(m => m.tipo === tipo);
}

/**
 * La máquina genérica más ajustada por encima de la potencia que hace falta.
 */
export function sugerirMaquina(kwNecesarios, tipo = 'mural') {
  const lista = genericasDeTipo(tipo);
  if (!lista.length) return null;
  return lista.find(m => m.kw >= (Number(kwNecesarios) || 0)) || lista[lista.length - 1];
}

/**
 * Ficha completa de una estancia: lo que hay que saber para instalarla.
 *
 * @param {object} detalle  una entrada de resumenPlano().detalle
 * @param {number} frigoriasPorM2  factor del uso de la estancia
 * @param {number} metrosTuberia  longitud real de su línea
 * @param {object} [maquinaElegida]  si se ha elegido marca y modelo concretos
 */
export function fichaEstancia(detalle, frigoriasPorM2, metrosTuberia = 0, maquinaElegida = null) {
  const kw = maquinaElegida?.kw || detalle.kw_comercial;
  const d = maquinaElegida?.liquido ? maquinaElegida : diametrosDeKw(kw);
  const gas = cargaExtraGas(metrosTuberia, kw, maquinaElegida);
  const cubre = superficieCubierta(kw, frigoriasPorM2);

  return {
    estancia: detalle.estancia.nombre || 'Estancia',
    superficie: detalle.area,
    volumen: detalle.volumen,
    carga_frigorias: detalle.frigorias,
    carga_kw: detalle.kw,
    maquina_kw: kw,
    maquina: maquinaElegida
      ? `${maquinaElegida.marca} ${maquinaElegida.modelo}`.trim()
      : `Genérica ${kw} kW`,
    superficie_cubierta: cubre,
    // Si la máquina cubre menos metros que la estancia, se queda corta.
    suficiente: cubre >= detalle.area,
    holgura: Math.round((cubre - detalle.area) * 10) / 10,
    tuberia_liquido: d.liquido,
    tuberia_gas: d.gas,
    metros_tuberia: Math.round(metrosTuberia * 10) / 10,
    gas_extra_g: gas.gramos,
    gramos_por_metro: gas.gramos_metro,
    precarga_m: gas.precarga,
    seer: maquinaElegida?.seer ?? null,
  };
}
