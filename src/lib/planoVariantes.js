/**
 * planoVariantes.js — Las versiones de cada equipo dentro de su tipo.
 *
 * Un "Split mural" no dice todo: no es lo mismo uno de 1x1 que el interior de
 * un multisplit. Una puerta de cámara no dice nada si no se sabe hacia dónde
 * abre, y una condensadora cambia por completo de trabajo según vaya colgada
 * en escuadras, apoyada en el suelo o encima del techo de la propia cámara.
 *
 * Aquí está esa segunda elección, la que se hace en el submenú de cada botón.
 * De este fichero salen tres cosas a la vez:
 *   - las opciones del submenú,
 *   - cómo se dibuja el símbolo en el plano (planoSimbolos.js),
 *   - lo que se lee en la leyenda y en el informe.
 *
 * Nada de esto cambia el cálculo térmico: son variantes de montaje y de
 * configuración. La única que toca el presupuesto es el montaje de la
 * condensadora, porque el soporte se compra y se monta.
 */

/**
 * @typedef {{id:string, nombre:string, corto:string}} Variante
 */

export const VARIANTES = {
  // ── Climatización ──────────────────────────────────────────────────────
  mural: {
    titulo: 'Tipo de mural',
    opciones: [
      { id: 'split_1x1', nombre: 'Split 1x1 (su propia exterior)', corto: '1x1' },
      { id: 'multisplit', nombre: 'Interior de multisplit', corto: 'multisplit' },
    ],
  },
  cassette: {
    titulo: 'Tipo de cassette',
    opciones: [
      { id: 'cuatro_vias', nombre: 'Cassette de 4 vías', corto: '4 vías' },
      { id: 'dos_vias', nombre: 'Cassette de 2 vías', corto: '2 vías' },
      { id: 'una_via', nombre: 'Mini cassette de 1 vía', corto: '1 vía' },
    ],
  },
  conductos: {
    titulo: 'Presión disponible',
    opciones: [
      { id: 'baja', nombre: 'Conductos de baja presión (falso techo)', corto: 'baja presión' },
      { id: 'media', nombre: 'Conductos de media presión', corto: 'media presión' },
      { id: 'alta', nombre: 'Conductos de alta presión', corto: 'alta presión' },
    ],
  },
  suelo: {
    titulo: 'Tipo de consola',
    opciones: [
      { id: 'consola', nombre: 'Consola de suelo', corto: 'consola' },
      { id: 'suelo_techo', nombre: 'Suelo-techo', corto: 'suelo-techo' },
      { id: 'columna', nombre: 'Columna / vertical', corto: 'columna' },
    ],
  },

  // ── Refrigeración ──────────────────────────────────────────────────────
  evaporador_camara: {
    titulo: 'Tipo de evaporador',
    opciones: [
      { id: 'cubico', nombre: 'Cúbico (proyección a un lado)', corto: 'cúbico' },
      { id: 'doble_flujo', nombre: 'Doble flujo (proyecta a dos lados)', corto: 'doble flujo' },
      { id: 'plafon', nombre: 'Plafón / bajo perfil', corto: 'plafón' },
    ],
  },
  vitrina: {
    titulo: 'Tipo de mueble',
    opciones: [
      { id: 'abierta', nombre: 'Mural abierto (cortina de aire)', corto: 'abierta' },
      { id: 'puertas', nombre: 'Con puertas de cristal', corto: 'con puertas' },
    ],
  },
  arcon: {
    titulo: 'Tipo de tapa',
    opciones: [
      { id: 'tapa_cristal', nombre: 'Tapa de cristal', corto: 'tapa cristal' },
      { id: 'tapa_ciega', nombre: 'Tapa ciega', corto: 'tapa ciega' },
    ],
  },
  control_temperatura: {
    titulo: 'Tipo de control',
    opciones: [
      { id: 'termostato', nombre: 'Termostato', corto: 'termostato' },
      { id: 'cuadro', nombre: 'Cuadro de control', corto: 'cuadro' },
      { id: 'registrador', nombre: 'Registrador de temperatura', corto: 'registrador' },
    ],
  },

  /**
   * La puerta de la cámara. En el plano hay que ver hacia dónde abre para
   * saber si tropieza con una estantería, con un pasillo o con la propia
   * condensadora: por eso cada opción se dibuja distinta, no solo se apunta.
   */
  camara_puerta: {
    titulo: 'Cómo abre la puerta',
    opciones: [
      { id: 'abatible_dcha', nombre: 'Abatible, bisagras a la derecha (abre de derecha a izquierda)', corto: 'abatible dcha.' },
      { id: 'abatible_izda', nombre: 'Abatible, bisagras a la izquierda (abre de izquierda a derecha)', corto: 'abatible izda.' },
      { id: 'corredera_dcha', nombre: 'Corredera, corre hacia la derecha', corto: 'corredera dcha.' },
      { id: 'corredera_izda', nombre: 'Corredera, corre hacia la izquierda', corto: 'corredera izda.' },
    ],
  },
};

/**
 * Montaje de la unidad exterior / condensadora.
 *
 * Va aparte porque no se guarda con la máquina: solo hay una por instalación
 * y su montaje es el que se presupuesta (ver SOPORTES_SOPORTE). Los ids son
 * los mismos que los del soporte, para no tener dos listas que mantener.
 */
export const MONTAJES_EXTERIOR = {
  titulo: 'Cómo va montada',
  opciones: [
    { id: 'pared', nombre: 'Colgada en escuadras a la pared', corto: 'escuadras' },
    { id: 'suelo', nombre: 'Apoyada en el suelo sobre tacos', corto: 'en suelo' },
    { id: 'techo_camara', nombre: 'Encima del techo de la cámara', corto: 'techo cámara' },
    { id: 'bancada', nombre: 'Sobre bancada', corto: 'bancada' },
    { id: 'tejado', nombre: 'Estructura elevada en cubierta', corto: 'cubierta' },
    { id: 'ninguno', nombre: 'Sin soporte (ya está montada)', corto: 'sin soporte' },
  ],
};

// La exterior y la condensadora comparten el mismo submenú de montaje.
VARIANTES.exterior = MONTAJES_EXTERIOR;
VARIANTES.unidad_condensadora = MONTAJES_EXTERIOR;

/** Opciones del submenú de un tipo de equipo (vacío si no tiene). */
export function variantesDe(tipo) {
  return VARIANTES[tipo]?.opciones || [];
}

/** Título del submenú de un tipo de equipo. */
export function tituloVariantes(tipo) {
  return VARIANTES[tipo]?.titulo || '';
}

/** La variante que se pone sola al elegir el equipo: siempre la primera. */
export function varianteDefecto(tipo) {
  return variantesDe(tipo)[0]?.id || null;
}

/** Nombre largo de la variante, para la leyenda y el informe. */
export function nombreVariante(tipo, id) {
  return variantesDe(tipo).find(v => v.id === id)?.nombre || '';
}

/** Nombre corto, el que cabe debajo del símbolo en el plano. */
export function cortoVariante(tipo, id) {
  return variantesDe(tipo).find(v => v.id === id)?.corto || '';
}

/** ¿Esta variante de puerta es corredera? */
export function esCorredera(variante) {
  return String(variante || '').startsWith('corredera');
}

/** Hacia qué lado abre o corre: 1 derecha, -1 izquierda. */
export function ladoPuerta(variante) {
  return String(variante || '').endsWith('_izda') ? -1 : 1;
}
