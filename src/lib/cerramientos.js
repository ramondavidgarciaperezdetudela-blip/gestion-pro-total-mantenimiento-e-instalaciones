/**
 * cerramientos.js — Cómo influyen paredes, suelo, techo y ventanas en la carga.
 *
 * Estimar la carga solo por metros cuadrados vale para dar un precio por
 * teléfono, pero no para acertar con la máquina: no gasta lo mismo un ático
 * bajo cubierta con ventanales al oeste que un piso interior entre vecinos.
 *
 * Aquí van los datos que de verdad mueven el número, con las transmitancias
 * (U, en W/m²K) que se manejan en el CTE y en las fichas de los fabricantes.
 *
 * HONESTAMENTE, sobre lo que influye y lo que no:
 *  - Las VENTANAS son lo que más pesa, de largo. Un ventanal al oeste con
 *    vidrio simple y aluminio sin rotura puede ser la mitad de la carga.
 *  - Lo que hay AL OTRO LADO del techo y del suelo importa mucho: no es lo
 *    mismo cubierta que otro piso climatizado.
 *  - El acabado del suelo (gres, terrazo, cemento pulido) NO cambia
 *    apenas la carga: cambia la inercia, que se nota en el confort, no en la
 *    potencia. Se pide igual porque va en la memoria del trabajo, pero no se
 *    le hace decir al cálculo algo que no dice.
 */

/** Salto de temperatura de cálculo en verano (exterior − interior). */
export const SALTO_VERANO = 12;

// ─── Paredes ────────────────────────────────────────────────────────────────

/**
 * Revestimiento interior de la pared y lo que mejora la transmitancia.
 * `factor` multiplica la carga por cerramiento opaco.
 */
export const REVESTIMIENTO_PARED = {
  ninguno: { nombre: 'Sin revestir (ladrillo/enlucido)', factor: 1.00 },
  pintura: { nombre: 'Pintura o gotelé', factor: 1.00 },
  alicatado: { nombre: 'Alicatado / azulejo', factor: 1.00 },
  madera: { nombre: 'Madera / friso', factor: 0.94 },
  pvc: { nombre: 'Panel de PVC', factor: 0.97 },
  aluminio: { nombre: 'Panel de aluminio', factor: 1.02 },
  pladur: { nombre: 'Pladur (sin aislante)', factor: 0.95 },
  pladur_aislado: { nombre: 'Pladur con aislamiento', factor: 0.70 },
  trasdosado_aislado: { nombre: 'Trasdosado con aislamiento (SATE o interior)', factor: 0.62 },
  corcho: { nombre: 'Corcho / panel aislante', factor: 0.68 },
};

// ─── Suelo ──────────────────────────────────────────────────────────────────

/**
 * Acabado del suelo. Se guarda para la memoria del trabajo, pero apenas
 * cambia la potencia: lo que manda es lo que hay DEBAJO.
 */
export const TIPO_SUELO = {
  gres: { nombre: 'Gres / porcelánico', factor: 1.00 },
  terrazo: { nombre: 'Terrazo', factor: 1.00 },
  cemento: { nombre: 'Cemento pulido', factor: 1.02 },
  marmol: { nombre: 'Mármol / piedra', factor: 1.01 },
  tarima: { nombre: 'Tarima o parqué', factor: 0.97 },
  laminado: { nombre: 'Suelo laminado', factor: 0.97 },
  vinilico: { nombre: 'Vinílico', factor: 0.98 },
  moqueta: { nombre: 'Moqueta', factor: 0.95 },
};

/** Lo que hay debajo del suelo: esto SÍ mueve el número. */
export const SUELO_DEBAJO = {
  climatizado: { nombre: 'Otra planta climatizada', factor: 0.90 },
  no_climatizado: { nombre: 'Local o garaje sin climatizar', factor: 1.05 },
  terreno: { nombre: 'Sobre el terreno', factor: 1.00 },
  exterior: { nombre: 'Al exterior (voladizo, porche)', factor: 1.15 },
};

// ─── Techo ──────────────────────────────────────────────────────────────────

/** Tipo de techo dentro de la estancia. */
export const TIPO_TECHO = {
  directo: { nombre: 'Techo directo (sin falso techo)', factor: 1.00 },
  yeso: { nombre: 'Falso techo de placa de yeso', factor: 0.93 },
  escayola: { nombre: 'Falso techo de escayola', factor: 0.94 },
  madera: { nombre: 'Falso techo de madera', factor: 0.92 },
  aluminio: { nombre: 'Falso techo registrable de aluminio', factor: 0.96 },
  aislado: { nombre: 'Falso techo con aislamiento', factor: 0.78 },
};

/** Lo que hay encima: la cubierta es lo peor con diferencia. */
export const TECHO_ENCIMA = {
  climatizado: { nombre: 'Otra planta climatizada', factor: 0.90 },
  no_climatizado: { nombre: 'Desván o local sin climatizar', factor: 1.10 },
  cubierta: { nombre: 'Cubierta / tejado (último piso)', factor: 1.35 },
  cubierta_aislada: { nombre: 'Cubierta con aislamiento', factor: 1.12 },
};

// ─── Ventanas ───────────────────────────────────────────────────────────────

/** Marco de la ventana. U en W/m²K. */
export const VENTANA_MARCO = {
  aluminio: { nombre: 'Aluminio sin rotura de puente térmico', u: 5.7 },
  aluminio_rpt: { nombre: 'Aluminio con rotura de puente térmico', u: 3.2 },
  pvc: { nombre: 'PVC', u: 2.2 },
  madera: { nombre: 'Madera', u: 2.2 },
  acero: { nombre: 'Acero / hierro', u: 5.9 },
};

/** Acristalamiento. U en W/m²K y `solar` = factor solar (g). */
export const VENTANA_VIDRIO = {
  simple: { nombre: 'Vidrio simple', u: 5.7, solar: 0.85 },
  doble: { nombre: 'Doble (climalit)', u: 3.3, solar: 0.75 },
  doble_bajo_emisivo: { nombre: 'Doble bajo emisivo', u: 1.8, solar: 0.60 },
  doble_control_solar: { nombre: 'Doble con control solar', u: 1.6, solar: 0.40 },
  triple: { nombre: 'Triple', u: 1.1, solar: 0.50 },
};

/**
 * Radiación solar que entra por m² de ventana según orientación, en W/m².
 * Valores de pico de verano para una latitud media de España.
 */
export const RADIACION_ORIENTACION = {
  norte: 60,
  este: 350,
  sur: 280,
  oeste: 420,   // la peor: pega por la tarde, con el edificio ya caliente
  interior: 0,  // patio o sin ventana al exterior
};

/** Protección solar de la ventana: cuánta radiación deja fuera. */
export const PROTECCION_SOLAR = {
  ninguna: { nombre: 'Sin protección', factor: 1.00 },
  cortina: { nombre: 'Cortina interior', factor: 0.75 },
  estor: { nombre: 'Estor o veneciana interior', factor: 0.65 },
  persiana: { nombre: 'Persiana exterior', factor: 0.35 },
  toldo: { nombre: 'Toldo o voladizo', factor: 0.30 },
  lamas: { nombre: 'Lamas orientables exteriores', factor: 0.25 },
};

/** Transmitancia del hueco completo: 70 % vidrio y 30 % marco, lo habitual. */
export function transmitanciaVentana(marco = 'aluminio', vidrio = 'doble') {
  const m = VENTANA_MARCO[marco] ?? VENTANA_MARCO.aluminio;
  const v = VENTANA_VIDRIO[vidrio] ?? VENTANA_VIDRIO.doble;
  return redondear(v.u * 0.7 + m.u * 0.3, 2);
}

/**
 * Carga que aporta una ventana, en vatios.
 *
 * Son las dos cosas que entran por un hueco: el calor que atraviesa el vidrio
 * y el marco por diferencia de temperatura, y el sol que entra directamente.
 * La segunda suele ser mucho mayor, y por eso la orientación y la persiana
 * cambian tanto el resultado.
 *
 * @returns {{area:number, u:number, transmision:number, solar:number, total:number}}
 */
export function cargaVentana(ventana, orientacionEstancia = 'este') {
  const ancho = Number(ventana?.ancho) || 0;
  const alto = Number(ventana?.alto) || 0;
  const cantidad = Number(ventana?.cantidad) || 1;
  const area = redondear(ancho * alto * cantidad, 2);
  if (area <= 0) return { area: 0, u: 0, transmision: 0, solar: 0, total: 0 };

  const u = transmitanciaVentana(ventana.marco, ventana.vidrio);
  const vidrio = VENTANA_VIDRIO[ventana.vidrio] ?? VENTANA_VIDRIO.doble;
  const orientacion = ventana.orientacion || orientacionEstancia;
  const radiacion = RADIACION_ORIENTACION[orientacion] ?? RADIACION_ORIENTACION.este;
  const proteccion = PROTECCION_SOLAR[ventana.proteccion] ?? PROTECCION_SOLAR.ninguna;

  const transmision = area * u * SALTO_VERANO;
  const solar = area * radiacion * vidrio.solar * proteccion.factor;

  return {
    area,
    u,
    transmision: Math.round(transmision),
    solar: Math.round(solar),
    total: Math.round(transmision + solar),
  };
}

/** Suma de todas las ventanas de una estancia. */
export function cargaVentanas(ventanas = [], orientacionEstancia = 'este') {
  const detalle = (ventanas || []).map(v => ({ ...cargaVentana(v, orientacionEstancia), ventana: v }));
  return {
    detalle,
    area_total: redondear(detalle.reduce((s, d) => s + d.area, 0), 2),
    vatios: detalle.reduce((s, d) => s + d.total, 0),
    solar: detalle.reduce((s, d) => s + d.solar, 0),
  };
}

/**
 * Factor conjunto de los cerramientos de una estancia.
 *
 * Multiplica la carga base por metro cuadrado. Se reparte el peso: la pared es
 * un tercio de la envolvente, el techo otro tercio largo (por eso la cubierta
 * pesa tanto) y el suelo el resto.
 */
export function factorCerramientos(estancia = {}) {
  const pared = REVESTIMIENTO_PARED[estancia.pared_revestimiento]?.factor ?? 1;
  const sueloAcabado = TIPO_SUELO[estancia.suelo_tipo]?.factor ?? 1;
  const sueloDebajo = SUELO_DEBAJO[estancia.suelo_debajo]?.factor ?? 1;
  const techoTipo = TIPO_TECHO[estancia.techo_tipo]?.factor ?? 1;
  const techoEncima = TECHO_ENCIMA[estancia.techo_encima]?.factor ?? 1;

  const fPared = pared;
  const fSuelo = sueloAcabado * sueloDebajo;
  const fTecho = techoTipo * techoEncima;

  // Pesos de cada parte de la envolvente sobre la carga por transmisión.
  const factor = fPared * 0.35 + fTecho * 0.40 + fSuelo * 0.25;
  return redondear(factor, 3);
}

/**
 * Texto con lo que se ha tenido en cuenta, para la memoria del trabajo y
 * para que el cliente vea de dónde sale el número.
 */
export function describeCerramientos(estancia = {}) {
  const partes = [];
  const p = REVESTIMIENTO_PARED[estancia.pared_revestimiento];
  const st = TIPO_SUELO[estancia.suelo_tipo];
  const sd = SUELO_DEBAJO[estancia.suelo_debajo];
  const tt = TIPO_TECHO[estancia.techo_tipo];
  const te = TECHO_ENCIMA[estancia.techo_encima];
  if (p) partes.push(`paredes: ${p.nombre.toLowerCase()}`);
  if (st) partes.push(`suelo: ${st.nombre.toLowerCase()}`);
  if (sd) partes.push(`bajo el suelo: ${sd.nombre.toLowerCase()}`);
  if (tt) partes.push(`techo: ${tt.nombre.toLowerCase()}`);
  if (te) partes.push(`sobre el techo: ${te.nombre.toLowerCase()}`);
  return partes.join(' · ');
}

// ─── Cámaras frigoríficas ───────────────────────────────────────────────────

/**
 * Cómo se apoya la cámara en el suelo.
 *
 * Es una decisión de obra que cambia mucho el consumo y que se olvida a
 * menudo: una cámara de congelación puesta directamente sobre la solera
 * acaba helando el terreno de debajo, levantando el suelo y gastando de más.
 */
export const SUELO_CAMARA = {
  aislado: {
    nombre: 'Panel aislante bajo la cámara',
    factor: 1.00,
    nota: 'Lo correcto. El suelo va aislado igual que las paredes.',
  },
  aislado_reforzado: {
    nombre: 'Panel aislante reforzado (paso de carretilla)',
    factor: 0.97,
    nota: 'Para cámaras con tránsito de transpaleta o carretilla.',
  },
  directo_solera: {
    nombre: 'Directamente sobre la solera, sin aislar',
    factor: 1.25,
    nota: 'Se pierde bastante por el suelo. En congelación puede helar el terreno y levantar la solera: valora aislar o poner resistencia perimetral.',
  },
  ventilado: {
    nombre: 'Sobre solera ventilada o cámara de aire',
    factor: 1.08,
    nota: 'Mejor que apoyar directamente, pero peor que aislar bien.',
  },
};

/** Paneles de cámara habituales, con su espesor y transmitancia. */
export const PANEL_CAMARA = {
  p60: { nombre: 'Panel 60 mm', espesor: 60, u: 0.36, uso: 'Refrigeración 0/+4 °C' },
  p80: { nombre: 'Panel 80 mm', espesor: 80, u: 0.28, uso: 'Refrigeración exigente' },
  p100: { nombre: 'Panel 100 mm', espesor: 100, u: 0.22, uso: 'Congelación −18 °C' },
  p120: { nombre: 'Panel 120 mm', espesor: 120, u: 0.19, uso: 'Congelación exigente' },
  p150: { nombre: 'Panel 150 mm', espesor: 150, u: 0.15, uso: 'Túnel de congelación' },
};

/** Panel que se recomienda según la temperatura de trabajo. */
export function panelRecomendado(temperatura) {
  const t = Number(temperatura);
  if (!Number.isFinite(t)) return 'p80';
  if (t <= -25) return 'p150';
  if (t <= -18) return 'p120';
  if (t < 0) return 'p100';
  if (t <= 4) return 'p80';
  return 'p60';
}

function redondear(n, decimales) {
  const f = 10 ** decimales;
  return Math.round((Number(n) || 0) * f) / f;
}
