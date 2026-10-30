import { useEffect } from 'react';

/**
 * Los avisos de error no se quedan clavados en pantalla.
 *
 * Se pidió que ningún aviso se quede puesto: a los 3 segundos, fuera. Con el
 * cartel rojo del servidor ya se hizo, pero cada pantalla tenía además su
 * propio recuadro de "no se pudo guardar", y esos seguían ahí hasta que se
 * volvía a guardar o se cerraba la ficha.
 *
 * Lo que hace falta para reintentar no es el cartel: es que el formulario siga
 * abierto con lo escrito, y eso no se toca.
 */
export const DURACION_AVISO = 3000;

/**
 * @param {any} aviso     lo que se está enseñando (texto vacío = nada)
 * @param {Function} quitar  cómo se quita
 * @param {number} [ms]
 */
export function useAvisoQueSeVa(aviso, quitar, ms = DURACION_AVISO) {
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(() => quitar(''), ms);
    return () => clearTimeout(t);
    // Solo depende del aviso y del tiempo: `quitar` es un setState, y React
    // garantiza que no cambia entre pintadas.
  }, [aviso, ms, quitar]);
}
