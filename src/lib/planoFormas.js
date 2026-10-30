/**
 * planoFormas.js — Formas acotadas: dibujar el plano a mano poniendo las medidas.
 *
 * Casi ninguna estancia real es un rectángulo limpio: hay eles, recodos,
 * pilares que se comen una esquina y almacenes con un chaflán. Dibujarlo
 * "a ojo" con el dedo sirve para colocar las máquinas, pero no para calcular,
 * porque la superficie sale de lo que se ha arrastrado y no de lo que mide.
 *
 * Con estas funciones la forma se levanta tramo a tramo con la medida puesta
 * a mano: se dice cuánto mide y hacia dónde va, y el punto siguiente sale
 * exacto. Al cerrarla, la superficie se calcula del polígono de verdad.
 *
 * Ojo con el sentido de la Y: en el lienzo crece hacia abajo, así que "arriba"
 * es Y negativa. Todos los ángulos de aquí ya lo tienen en cuenta.
 */

/** Las ocho direcciones del teclado de tramos, en grados de pantalla. */
export const DIRECCIONES = [
  { id: 'arriba', nombre: 'Arriba', flecha: '↑', grados: 270 },
  { id: 'abajo', nombre: 'Abajo', flecha: '↓', grados: 90 },
  { id: 'izquierda', nombre: 'Izquierda', flecha: '←', grados: 180 },
  { id: 'derecha', nombre: 'Derecha', flecha: '→', grados: 0 },
  { id: 'arriba_dcha', nombre: 'Diagonal arriba-derecha', flecha: '↗', grados: 315 },
  { id: 'abajo_dcha', nombre: 'Diagonal abajo-derecha', flecha: '↘', grados: 45 },
  { id: 'abajo_izda', nombre: 'Diagonal abajo-izquierda', flecha: '↙', grados: 135 },
  { id: 'arriba_izda', nombre: 'Diagonal arriba-izquierda', flecha: '↖', grados: 225 },
];

const redondear = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/** Grados de una dirección del listado; si no está, se toma tal cual. */
export function gradosDe(direccion) {
  const d = DIRECCIONES.find(x => x.id === direccion);
  return d ? d.grados : Number(direccion) || 0;
}

/**
 * Punto que sale de avanzar `longitud` metros desde `p` en esa dirección.
 * @param {{x:number,y:number}} p
 * @param {number} longitud  metros
 * @param {string|number} direccion  id del listado o grados
 */
export function puntoDesde(p, longitud, direccion) {
  const rad = (gradosDe(direccion) * Math.PI) / 180;
  return {
    x: redondear(p.x + Math.cos(rad) * longitud, 3),
    y: redondear(p.y + Math.sin(rad) * longitud, 3),
  };
}

/** Longitud de un tramo, en metros. */
export function longitudTramo(a, b) {
  return redondear(Math.hypot(b.x - a.x, b.y - a.y), 2);
}

/**
 * Superficie encerrada por el polígono, en m² (fórmula del zapatero).
 * Devuelve 0 si no hay al menos tres puntos: dos puntos no encierran nada.
 */
export function areaPoligono(puntos = []) {
  if (puntos.length < 3) return 0;
  let doble = 0;
  for (let i = 0; i < puntos.length; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % puntos.length];
    doble += a.x * b.y - b.x * a.y;
  }
  return redondear(Math.abs(doble) / 2, 2);
}

/** Perímetro recorriendo los puntos; si `cerrada`, se vuelve al primero. */
export function perimetroPoligono(puntos = [], cerrada = true) {
  if (puntos.length < 2) return 0;
  let total = 0;
  const hasta = cerrada ? puntos.length : puntos.length - 1;
  for (let i = 0; i < hasta; i++) {
    total += longitudTramo(puntos[i], puntos[(i + 1) % puntos.length]);
  }
  return redondear(total, 2);
}

/** Rectángulo que envuelve la forma: {x, y, ancho, alto} en metros. */
export function envolvente(puntos = []) {
  if (!puntos.length) return { x: 0, y: 0, ancho: 0, alto: 0 };
  const xs = puntos.map(p => p.x);
  const ys = puntos.map(p => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return {
    x: redondear(x, 2),
    y: redondear(y, 2),
    ancho: redondear(Math.max(...xs) - x, 2),
    alto: redondear(Math.max(...ys) - y, 2),
  };
}

/**
 * ¿Está el punto dentro del polígono? (lanzamiento de rayo horizontal)
 * Se usa para saber en qué estancia se ha pulsado cuando no es rectangular.
 */
export function dentroDelPoligono(puntos = [], px, py) {
  if (puntos.length < 3) return false;
  let dentro = false;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const { x: xi, y: yi } = puntos[i];
    const { x: xj, y: yj } = puntos[j];
    const cruza = (yi > py) !== (yj > py) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi || 1e-12) + xi;
    if (cruza) dentro = !dentro;
  }
  return dentro;
}

/**
 * Estancia lista para el cálculo a partir de una forma cerrada.
 *
 * Se guarda el polígono (para dibujarlo tal cual), el rectángulo que lo
 * envuelve (para colocarlo y moverlo como cualquier otra estancia) y la
 * superficie real medida, que es la que manda en el cálculo térmico.
 */
export function estanciaDesdeForma(forma, extra = {}) {
  const caja = envolvente(forma.puntos);
  return {
    ...caja,
    poligono: forma.puntos.map(p => ({ ...p })),
    area_manual: areaPoligono(forma.puntos),
    perimetro: perimetroPoligono(forma.puntos, true),
    ...extra,
  };
}

/** Mueve todos los puntos de un polígono (al arrastrar la estancia). */
export function moverPoligono(puntos = [], dx, dy) {
  return puntos.map(p => ({ x: redondear(p.x + dx, 3), y: redondear(p.y + dy, 3) }));
}
