/**
 * planoSimbolos.js — Dibujo de los equipos sobre el plano.
 *
 * Cada tipo de equipo se dibuja con su silueta, no con un punto de color: en
 * un plano hay que reconocer de un vistazo si eso es un mural, un cassette,
 * una vitrina o una condensadora, sin tener que mirar la leyenda.
 *
 * Se dibuja con vectores en el propio lienzo (nada de ficheros de imagen): así
 * se ve nítido a cualquier zoom, no engorda la APK y funciona sin conexión.
 */

import { TIPOS_MAQUINA } from './planoCalculos';

/** Color del equipo según el catálogo. */
export function colorEquipo(tipo) {
  return TIPOS_MAQUINA.find(t => t.id === tipo)?.color || '#ef4444';
}

/** Nombre legible del equipo. */
export function nombreEquipo(tipo) {
  return TIPOS_MAQUINA.find(t => t.id === tipo)?.nombre || tipo;
}

/**
 * Dibuja el símbolo de un equipo centrado en (x, y), en píxeles de lienzo.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} tipo   id del catálogo
 * @param {number} x
 * @param {number} y
 * @param {number} escala  1 = tamaño normal (unos 30 px de ancho)
 * @param {boolean} resaltado  para el equipo seleccionado
 */
export function dibujarEquipo(ctx, tipo, x, y, escala = 1, resaltado = false) {
  const color = colorEquipo(tipo);
  const s = 15 * escala;

  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = Math.max(1.5, 2 * escala);
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = color;

  // Halo del seleccionado, por debajo del símbolo.
  if (resaltado) {
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(37,99,235,0.22)';
    ctx.fill();
    ctx.fillStyle = color;
  }

  switch (tipo) {
    case 'mural':
      // Caja alargada colgada de la pared, con las lamas.
      rect(ctx, -s, -s * 0.45, s * 2, s * 0.9, 3 * escala);
      linea(ctx, -s * 0.7, s * 0.15, s * 0.7, s * 0.15);
      linea(ctx, -s * 0.7, s * 0.32, s * 0.7, s * 0.32);
      break;

    case 'cassette':
      // Cuadrado con las cuatro salidas de aire.
      rect(ctx, -s * 0.9, -s * 0.9, s * 1.8, s * 1.8, 3 * escala);
      ctx.strokeStyle = '#ffffff';
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        linea(ctx, dx * s * 0.25, dy * s * 0.25, dx * s * 0.72, dy * s * 0.72);
      }
      break;

    case 'conductos':
      // Caja con los conductos saliendo por los lados.
      rect(ctx, -s * 0.8, -s * 0.55, s * 1.6, s * 1.1, 2 * escala);
      ctx.fillRect(-s * 1.35, -s * 0.28, s * 0.55, s * 0.56);
      ctx.fillRect(s * 0.8, -s * 0.28, s * 0.55, s * 0.56);
      break;

    case 'suelo':
      // Consola baja, con sus patas.
      rect(ctx, -s * 0.85, -s * 0.5, s * 1.7, s, 3 * escala);
      ctx.fillRect(-s * 0.65, s * 0.5, s * 0.2, s * 0.32);
      ctx.fillRect(s * 0.45, s * 0.5, s * 0.2, s * 0.32);
      break;

    case 'exterior':
    case 'unidad_condensadora': {
      // Caja con la rejilla del ventilador.
      rect(ctx, -s * 1.05, -s * 0.75, s * 2.1, s * 1.5, 3 * escala);
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      for (const a of [0, 90, 180, 270]) {
        const r = (a * Math.PI) / 180;
        linea(ctx, 0, 0, Math.cos(r) * s * 0.48, Math.sin(r) * s * 0.48);
      }
      break;
    }

    case 'evaporador_camara': {
      // Cúbico con dos ventiladores: es como se ve un evaporador de cámara.
      rect(ctx, -s * 1.15, -s * 0.6, s * 2.3, s * 1.2, 2 * escala);
      ctx.strokeStyle = '#ffffff';
      for (const cx of [-s * 0.55, s * 0.55]) {
        ctx.beginPath();
        ctx.arc(cx, 0, s * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case 'vitrina':
      // Mueble mural abierto por delante, con los estantes.
      rect(ctx, -s * 1.2, -s * 0.8, s * 2.4, s * 1.6, 2 * escala);
      ctx.strokeStyle = '#ffffff';
      linea(ctx, -s * 0.9, -s * 0.3, s * 0.9, -s * 0.3);
      linea(ctx, -s * 0.9, s * 0.15, s * 0.9, s * 0.15);
      break;

    case 'arcon':
      // Arcón visto en planta: tapa con la junta partida por el medio.
      rect(ctx, -s * 1.3, -s * 0.7, s * 2.6, s * 1.4, 4 * escala);
      ctx.strokeStyle = '#ffffff';
      linea(ctx, 0, -s * 0.55, 0, s * 0.55);
      break;

    case 'control_temperatura':
      // Cuadro de control con su pantallita.
      rect(ctx, -s * 0.6, -s * 0.8, s * 1.2, s * 1.6, 2 * escala);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-s * 0.38, -s * 0.55, s * 0.76, s * 0.5);
      ctx.strokeStyle = '#ffffff';
      linea(ctx, -s * 0.3, s * 0.2, s * 0.3, s * 0.2);
      linea(ctx, -s * 0.3, s * 0.45, s * 0.3, s * 0.45);
      break;

    case 'camara_puerta':
      // Puerta con su barrido, como en un plano de obra.
      ctx.fillRect(-s * 0.18, -s, s * 0.36, s * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, 1.4 * escala);
      ctx.beginPath();
      ctx.arc(0, -s, s * 1.5, 0, Math.PI / 2);
      ctx.stroke();
      break;

    default:
      // Cualquier equipo nuevo que aún no tenga silueta propia.
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
  }

  ctx.restore();
}

/**
 * Soporte de la unidad exterior, dibujado debajo de ella.
 *
 * En el plano importa: no es lo mismo colgarla de la pared con escuadras que
 * dejarla en el suelo sobre tacos o subirla a una bancada en la cubierta, ni
 * en trabajo ni en precio, y hay que verlo en el dibujo.
 *
 * @param {string} tipo  'pared' | 'suelo' | 'bancada' | 'tejado' | 'ninguno'
 */
export function dibujarSoporte(ctx, tipo, x, y, escala = 1) {
  if (!tipo || tipo === 'ninguno') return;
  const s = 15 * escala;

  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#475569';
  ctx.fillStyle = '#94a3b8';
  ctx.lineWidth = Math.max(1.5, 2 * escala);

  switch (tipo) {
    case 'pared':
      // Escuadras: dos triángulos apoyados en la pared, debajo de la máquina.
      for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(lado * s * 0.75, s * 0.8);
        ctx.lineTo(lado * s * 0.75, s * 1.45);
        ctx.lineTo(lado * s * 0.15, s * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;

    case 'suelo':
      // Tacos antivibratorios: dos patas cortas.
      for (const lado of [-1, 1]) {
        ctx.fillRect(lado * s * 0.7 - s * 0.12, s * 0.8, s * 0.24, s * 0.5);
        ctx.strokeRect(lado * s * 0.7 - s * 0.12, s * 0.8, s * 0.24, s * 0.5);
      }
      break;

    case 'bancada':
      // Bancada corrida bajo toda la máquina.
      ctx.fillRect(-s * 1.15, s * 0.8, s * 2.3, s * 0.55);
      ctx.strokeRect(-s * 1.15, s * 0.8, s * 2.3, s * 0.55);
      break;

    case 'tejado':
      // Estructura elevada, con las patas más largas.
      ctx.fillRect(-s * 1.1, s * 0.8, s * 2.2, s * 0.3);
      ctx.strokeRect(-s * 1.1, s * 0.8, s * 2.2, s * 0.3);
      for (const lado of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(lado * s * 0.85, s * 1.1);
        ctx.lineTo(lado * s * 0.85, s * 1.75);
        ctx.stroke();
      }
      break;

    default:
      break;
  }
  ctx.restore();
}

/** Los soportes que se pueden poner, con su nombre. */
export const SOPORTES_EXTERIOR = {
  pared: { nombre: 'Escuadras de pared', clave: 'soporte_pared' },
  suelo: { nombre: 'Tacos antivibratorios en suelo', clave: 'soporte_suelo' },
  bancada: { nombre: 'Bancada de obra o metálica', clave: 'soporte_bancada' },
  tejado: { nombre: 'Estructura elevada (cubierta)', clave: 'soporte_tejado' },
  ninguno: { nombre: 'Sin soporte (ya instalado)', clave: null },
};

/** Rectángulo relleno con borde blanco y esquinas redondeadas. */
function rect(ctx, x, y, w, h, r) {
  const radio = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radio, y);
  ctx.arcTo(x + w, y, x + w, y + h, radio);
  ctx.arcTo(x + w, y + h, x, y + h, radio);
  ctx.arcTo(x, y + h, x, y, radio);
  ctx.arcTo(x, y, x + w, y, radio);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function linea(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Mismo símbolo en un SVG pequeño, para los botones de la paleta.
 * Se devuelve como cadena para poder meterlo en un `dangerouslySetInnerHTML`
 * no hace falta: se usa dibujando en un lienzo diminuto (ver PaletaEquipos).
 */
export function radioAproximado(tipo) {
  // Cuánto de ancho ocupa cada símbolo, para acertar al pulsarlo o borrarlo.
  switch (tipo) {
    case 'vitrina':
    case 'arcon':
    case 'evaporador_camara':
      return 1.1;
    case 'exterior':
    case 'unidad_condensadora':
      return 1.0;
    default:
      return 0.8;
  }
}
