import { useRef, useState, useCallback } from 'react';

/**
 * useHistorial — deshacer y rehacer para el plano.
 *
 * Dibujando siempre se mete la pata: se arrastra de más, se borra lo que no
 * era, se pone una máquina donde no toca. Sin deshacer, cada error obliga a
 * rehacer el trabajo, y eso en una obra con el cliente delante no vale.
 *
 * Funciona guardando una copia del estado ANTES de cada cambio. Se guarda a
 * mano, no automáticamente en cada render: así un arrastre entero cuenta como
 * un solo paso, y no como los cien movimientos del ratón que lo componen.
 *
 * @param {number} limite  cuántos pasos atrás se recuerdan
 */
export function useHistorial(limite = 60) {
  const pila = useRef([]);      // estados anteriores
  const rehacerPila = useRef([]);
  // Solo para que la pantalla sepa si los botones van activos o grises.
  const [puedeDeshacer, setPuedeDeshacer] = useState(false);
  const [puedeRehacer, setPuedeRehacer] = useState(false);

  const refrescar = useCallback(() => {
    setPuedeDeshacer(pila.current.length > 0);
    setPuedeRehacer(rehacerPila.current.length > 0);
  }, []);

  /** Guarda el estado actual antes de cambiarlo. */
  const guardar = useCallback((estado) => {
    // Copia profunda: si se guardara la referencia, al cambiar el estado
    // cambiaría también lo guardado y no habría a dónde volver.
    pila.current.push(JSON.parse(JSON.stringify(estado)));
    if (pila.current.length > limite) pila.current.shift();
    // Cualquier cambio nuevo invalida lo que hubiera para rehacer.
    rehacerPila.current = [];
    refrescar();
  }, [limite, refrescar]);

  /** Devuelve el estado anterior, o null si no hay. */
  const deshacer = useCallback((estadoActual) => {
    if (!pila.current.length) return null;
    const anterior = pila.current.pop();
    rehacerPila.current.push(JSON.parse(JSON.stringify(estadoActual)));
    refrescar();
    return anterior;
  }, [refrescar]);

  /** Vuelve a aplicar lo deshecho. */
  const rehacer = useCallback((estadoActual) => {
    if (!rehacerPila.current.length) return null;
    const siguiente = rehacerPila.current.pop();
    pila.current.push(JSON.parse(JSON.stringify(estadoActual)));
    refrescar();
    return siguiente;
  }, [refrescar]);

  const limpiar = useCallback(() => {
    pila.current = [];
    rehacerPila.current = [];
    refrescar();
  }, [refrescar]);

  return { guardar, deshacer, rehacer, limpiar, puedeDeshacer, puedeRehacer };
}
