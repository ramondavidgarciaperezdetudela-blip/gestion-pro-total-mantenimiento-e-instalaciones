import React from 'react';
import AjustesProveedorIA from '@/components/AjustesProveedorIA';

/** La IA del Centro es la misma que usa todo el programa: se elige en un solo sitio. */
export default function PestanaAjustes({ onCambios }) {
  return (
    <div className="max-w-xl space-y-3" onChange={() => onCambios?.()}>
      <p className="text-sm text-slate-600">
        Aquí eliges la IA para todo el programa, incluido el Centro de IA. <b>Claude</b> da los mejores módulos; <b>Ollama</b> es gratis, sin límite de uso y funciona sin internet
        (los modelos pequeños crean módulos más sencillos y pueden equivocarse más).
      </p>
      <AjustesProveedorIA />
    </div>
  );
}
