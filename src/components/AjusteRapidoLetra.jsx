import React, { useEffect, useState } from 'react';
import { Minus, Plus, Type } from 'lucide-react';
import {
  TAMANO_MAX, TAMANO_MIN, aplicarFuente, guardarFuente, leerFuente, tamanoValido,
} from '@/lib/tipoDeFuente';

/**
 * Agrandar o reducir la letra sin salir de donde estés.
 *
 * El ajuste completo vive en Configuración → Tipo de Fuente, pero llegar
 * hasta ahí cuando NO SE VE la pantalla es justo lo difícil. Esto pone los
 * dos botones donde siempre se ven.
 */
export default function AjusteRapidoLetra({ compacto = false }) {
  const [tamano, setTamano] = useState(() => leerFuente().tamano);

  useEffect(() => {
    const cfg = { ...leerFuente(), tamano };
    aplicarFuente(cfg);
    guardarFuente(cfg);
  }, [tamano]);

  const mover = (d) => setTamano((t) => tamanoValido(t + d));
  const clase = compacto
    ? 'p-1 text-[11px]'
    : 'px-2 py-1.5 text-xs';

  return (
    <div className="flex items-center gap-0.5" data-prueba="ajuste-letra" title={`Tamaño de letra: ${tamano} px`}>
      <button
        type="button" onClick={() => mover(-1)} disabled={tamano <= TAMANO_MIN}
        aria-label="Reducir el tamaño de la letra"
        className={`rounded ${clase} disabled:opacity-30`} style={{ color: '#8890a8' }}
      >
        <Minus className="h-4 w-4" />
      </button>
      <Type className="h-4 w-4" style={{ color: '#8890a8' }} aria-hidden="true" />
      <button
        type="button" onClick={() => mover(1)} disabled={tamano >= TAMANO_MAX}
        aria-label="Aumentar el tamaño de la letra"
        className={`rounded ${clase} disabled:opacity-30`} style={{ color: '#8890a8' }}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
