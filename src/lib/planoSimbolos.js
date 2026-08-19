/**
 * planoSimbolos.js — Dibujo de los equipos sobre el plano.
 *
 * Cada tipo de equipo se dibuja con su silueta, no con un punto de color: en
 * un plano hay que reconocer de un vistazo si eso es un mural, un cassette,
 * una vitrina o una condensadora, sin tener que mirar la leyenda.
 *
 * Y dentro de un mismo tipo, la variante también se dibuja cuando se nota en
 * planta: un cassette de 2 vías no tira el aire donde uno de 4, y una puerta
 * de cámara que abre hacia la derecha puede tropezar con la estantería que
 * hay al lado. Eso hay que verlo en el papel, no leerlo en una nota.
 *
 * Se dibuja con vectores en el propio lienzo (nada de ficheros de imagen): así
 * se ve nítido a cualquier zoom, no engorda la APK y funciona sin conexión.
 */

import { TIPOS_MAQUINA } from './planoCalculos.js';
import { esCorredera, ladoPuerta } from './planoVariantes.js';

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
 * @param {string} [variante]  id de la variante elegida en el submenú
 */
export function dibujarEquipo(ctx, tipo, x, y, escala = 1, resaltado = false, variante = null) {
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
      // El interior de un multisplit se marca con el enlace a la exterior
      // común: es lo que lo diferencia de un 1x1 en el plano.
      if (variante === 'multisplit') {
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 1.4 * escala);
        linea(ctx, -s * 1.25, -s * 0.75, -s * 0.75, -s * 0.45);
        linea(ctx, s * 0.75, -s * 0.45, s * 1.25, -s * 0.75);
      }
      break;

    case 'cassette': {
      // Cuadrado con sus salidas de aire: tantas como vías tenga.
      rect(ctx, -s * 0.9, -s * 0.9, s * 1.8, s * 1.8, 3 * escala);
      ctx.strokeStyle = '#ffffff';
      const vias = variante === 'dos_vias' ? [[1, 0], [-1, 0]]
        : variante === 'una_via' ? [[1, 0]]
        : [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of vias) {
        linea(ctx, dx * s * 0.25, dy * s * 0.25, dx * s * 0.72, dy * s * 0.72);
        // Punta de flecha: por dónde sale el aire.
        flecha(ctx, dx * s * 0.72, dy * s * 0.72, Math.atan2(dy, dx), s * 0.22);
      }
      break;
    }

    case 'conductos': {
      // Caja con los conductos saliendo por los lados. Cuanta más presión
      // disponible, más gruesa se dibuja la boca: se ve la máquina que es.
      rect(ctx, -s * 0.8, -s * 0.55, s * 1.6, s * 1.1, 2 * escala);
      const boca = variante === 'alta' ? 0.78 : variante === 'media' ? 0.66 : 0.56;
      ctx.fillRect(-s * 1.35, (-s * boca) / 2, s * 0.55, s * boca);
      ctx.fillRect(s * 0.8, (-s * boca) / 2, s * 0.55, s * boca);
      break;
    }

    case 'suelo':
      if (variante === 'columna') {
        // Columna: alta y estrecha, se ve de canto en planta.
        rect(ctx, -s * 0.5, -s * 0.9, s, s * 1.8, 3 * escala);
        ctx.strokeStyle = '#ffffff';
        linea(ctx, -s * 0.3, -s * 0.45, s * 0.3, -s * 0.45);
        linea(ctx, -s * 0.3, s * 0.15, s * 0.3, s * 0.15);
      } else {
        // Consola baja, con sus patas.
        rect(ctx, -s * 0.85, -s * 0.5, s * 1.7, s, 3 * escala);
        ctx.fillRect(-s * 0.65, s * 0.5, s * 0.2, s * 0.32);
        ctx.fillRect(s * 0.45, s * 0.5, s * 0.2, s * 0.32);
        // La suelo-techo puede ir colgada: se marca con la brida de arriba.
        if (variante === 'suelo_techo') {
          ctx.fillRect(-s * 0.65, -s * 0.82, s * 0.2, s * 0.32);
          ctx.fillRect(s * 0.45, -s * 0.82, s * 0.2, s * 0.32);
        }
      }
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
      const plafon = variante === 'plafon';
      const alto = plafon ? 0.42 : 0.6;
      rect(ctx, -s * 1.15, -s * alto, s * 2.3, s * alto * 2, 2 * escala);
      ctx.strokeStyle = '#ffffff';
      const radio = plafon ? 0.3 : 0.4;
      for (const cx of plafon ? [-s * 0.6, 0, s * 0.6] : [-s * 0.55, s * 0.55]) {
        ctx.beginPath();
        ctx.arc(cx, 0, s * radio, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Doble flujo: proyecta a los dos lados, y así se dibuja.
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, 1.4 * escala);
      flecha(ctx, s * 1.5, 0, 0, s * 0.3);
      if (variante === 'doble_flujo') flecha(ctx, -s * 1.5, 0, Math.PI, s * 0.3);
      break;
    }

    case 'vitrina':
      // Mueble mural abierto por delante, con los estantes.
      rect(ctx, -s * 1.2, -s * 0.8, s * 2.4, s * 1.6, 2 * escala);
      ctx.strokeStyle = '#ffffff';
      if (variante === 'puertas') {
        // Con puertas: se marcan las hojas de cristal en vez de los estantes.
        for (const cx of [-s * 0.6, 0, s * 0.6]) linea(ctx, cx, -s * 0.7, cx, s * 0.7);
      } else {
        linea(ctx, -s * 0.9, -s * 0.3, s * 0.9, -s * 0.3);
        linea(ctx, -s * 0.9, s * 0.15, s * 0.9, s * 0.15);
      }
      break;

    case 'arcon':
      // Arcón visto en planta: tapa con la junta partida por el medio.
      rect(ctx, -s * 1.3, -s * 0.7, s * 2.6, s * 1.4, 4 * escala);
      ctx.strokeStyle = '#ffffff';
      linea(ctx, 0, -s * 0.55, 0, s * 0.55);
      // Tapa de cristal: se ve el interior, se raya en diagonal.
      if (variante === 'tapa_cristal') {
        ctx.lineWidth = Math.max(1, 1.2 * escala);
        for (const cx of [-s * 0.85, -s * 0.35, s * 0.35, s * 0.85]) {
          linea(ctx, cx - s * 0.2, s * 0.45, cx + s * 0.2, -s * 0.45);
        }
      }
      break;

    case 'control_temperatura':
      // Cuadro de control con su pantallita.
      rect(ctx, -s * 0.6, -s * 0.8, s * 1.2, s * 1.6, 2 * escala);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-s * 0.38, -s * 0.55, s * 0.76, s * 0.5);
      ctx.strokeStyle = '#ffffff';
      if (variante === 'registrador') {
        // El registrador se distingue por el gráfico de la temperatura.
        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, 1.3 * escala);
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.2);
        ctx.lineTo(-s * 0.1, -s * 0.42);
        ctx.lineTo(s * 0.08, -s * 0.24);
        ctx.lineTo(s * 0.3, -s * 0.46);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
      }
      linea(ctx, -s * 0.3, s * 0.2, s * 0.3, s * 0.2);
      if (variante !== 'termostato') linea(ctx, -s * 0.3, s * 0.45, s * 0.3, s * 0.45);
      break;

    case 'camara_puerta':
      dibujarPuerta(ctx, variante, s, escala, color);
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
 * La puerta de la cámara, con su sentido de apertura.
 *
 * El hueco se dibuja horizontal, de -s a +s. A partir de ahí:
 *  - abatible: la hoja sale perpendicular desde la bisagra y se traza el
 *    barrido, que es el sitio que hay que dejar libre delante.
 *  - corredera: la hoja se dibuja desplazada hacia el lado por el que corre,
 *    con la flecha del recorrido, que es el hueco de pared que hace falta.
 *
 * Se dibuja centrado en el origen: quien llama ya ha hecho el translate.
 */
function dibujarPuerta(ctx, variante, s, escala, color) {
  const lado = ladoPuerta(variante);        // 1 derecha, -1 izquierda
  const corredera = esCorredera(variante);

  // Jambas del hueco: los dos trozos de pared que quedan a los lados.
  ctx.fillStyle = '#334155';
  ctx.fillRect(-s * 1.35, -s * 0.16, s * 0.35, s * 0.32);
  ctx.fillRect(s, -s * 0.16, s * 0.35, s * 0.32);

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, 2 * escala);

  if (corredera) {
    // Hoja aparcada al lado por el que corre, por delante de la pared.
    ctx.fillRect(lado > 0 ? s * 0.05 : -s * 1.05, -s * 0.5, s, s * 0.28);
    // Recorrido de la hoja y flecha del sentido.
    ctx.setLineDash([4 * escala, 3 * escala]);
    ctx.lineWidth = Math.max(1, 1.3 * escala);
    linea(ctx, -lado * s * 0.9, s * 0.5, lado * s * 1.15, s * 0.5);
    ctx.setLineDash([]);
    flecha(ctx, lado * s * 1.15, s * 0.5, lado > 0 ? 0 : Math.PI, s * 0.3);
  } else {
    // Hoja abierta 90°, saliendo de la bisagra.
    const bx = lado * s;
    ctx.fillRect(
      lado > 0 ? bx - s * 0.14 : bx - s * 0.14,
      -s * 1.9, s * 0.28, s * 1.9,
    );
    // Barrido: el cuarto de círculo que la hoja necesita libre.
    ctx.lineWidth = Math.max(1, 1.3 * escala);
    ctx.setLineDash([4 * escala, 3 * escala]);
    ctx.beginPath();
    // De la hoja levantada hasta el hueco cerrado, por el lado interior.
    if (lado > 0) ctx.arc(bx, 0, s * 1.9, -Math.PI / 2, Math.PI, false);
    else ctx.arc(bx, 0, s * 1.9, 0, -Math.PI / 2, true);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/** Punta de flecha en (x, y) apuntando al ángulo dado. */
function flecha(ctx, x, y, angulo, tam) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(angulo - 0.5) * tam, y - Math.sin(angulo - 0.5) * tam);
  ctx.moveTo(x, y);
  ctx.lineTo(x - Math.cos(angulo + 0.5) * tam, y - Math.sin(angulo + 0.5) * tam);
  ctx.stroke();
}

/**
 * Soporte de la unidad exterior, dibujado debajo de ella.
 *
 * En el plano importa: no es lo mismo colgarla de la pared con escuadras que
 * dejarla en el suelo sobre tacos, subirla a una bancada en la cubierta o
 * plantarla encima del techo de la propia cámara, ni en trabajo ni en precio,
 * y hay que verlo en el dibujo.
 *
 * @param {string} tipo  'pared'|'suelo'|'techo_camara'|'bancada'|'tejado'|'ninguno'
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

    case 'techo_camara':
      // El techo de la cámara: panel rayado, con el bastidor que reparte el
      // peso encima. Se dibuja más ancho que la máquina porque el bastidor
      // tiene que apoyar en los perfiles, no en el centro del panel.
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-s * 1.7, s * 1.05, s * 3.4, s * 0.5);
      ctx.strokeRect(-s * 1.7, s * 1.05, s * 3.4, s * 0.5);
      ctx.lineWidth = Math.max(1, 1.1 * escala);
      for (let i = -6; i <= 6; i++) {
        linea(ctx, i * s * 0.28, s * 1.55, i * s * 0.28 + s * 0.22, s * 1.05);
      }
      // Bastidor entre el panel y la máquina.
      ctx.fillStyle = '#94a3b8';
      ctx.lineWidth = Math.max(1.5, 2 * escala);
      for (const lado of [-1, 1]) {
        ctx.fillRect(lado * s * 0.95 - s * 0.11, s * 0.8, s * 0.22, s * 0.28);
        ctx.strokeRect(lado * s * 0.95 - s * 0.11, s * 0.8, s * 0.22, s * 0.28);
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

/**
 * Cuánto baja el soporte por debajo del centro de la máquina, en unidades de
 * "s" (el medio ancho del símbolo). Sirve para colocar el rótulo por debajo
 * del dibujo: si no, "EXTERIOR" cae justo encima del panel de la cámara y no
 * se lee ni el texto ni el soporte.
 */
export function altoSoporte(tipo) {
  switch (tipo) {
    case 'tejado': return 1.75;
    case 'techo_camara': return 1.55;
    case 'pared': return 1.45;
    case 'bancada': return 1.35;
    case 'suelo': return 1.3;
    default: return 0.75;   // solo la caja de la máquina
  }
}

/** Los soportes que se pueden poner, con su nombre. */
export const SOPORTES_EXTERIOR = {
  pared: { nombre: 'Escuadras de pared', clave: 'soporte_pared' },
  suelo: { nombre: 'Tacos antivibratorios en suelo', clave: 'soporte_suelo' },
  techo_camara: { nombre: 'Bastidor sobre techo de cámara', clave: 'soporte_techo_camara' },
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

/** Cuánto de ancho ocupa cada símbolo, para acertar al pulsarlo o borrarlo. */
export function radioAproximado(tipo) {
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
