import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { escucharAvisos, cerrarAviso } from '@/lib/avisoServidor';

/**
 * El cartel que aparece cuando el servidor no ha aceptado un cambio.
 *
 * Antes, si fallaba el guardado, no se enteraba nadie: el botón se quedaba
 * como si nada. Ahora sale esto, dice QUÉ no se ha podido guardar y POR QUÉ,
 * y el formulario se queda abierto con lo escrito para poder reintentarlo.
 */
export default function AvisoServidor() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => escucharAvisos(setAviso), []);

  if (!aviso) return null;

  return (
    <div
      role="alert"
      className="fixed top-4 right-4 z-[100] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-red-300 bg-red-50 p-4 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-800">{aviso.titulo}</p>
          <p className="mt-1 text-sm leading-snug text-red-700">{aviso.motivo}</p>
        </div>
        <button
          type="button"
          onClick={cerrarAviso}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-lg p-1 text-red-700 hover:bg-red-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
