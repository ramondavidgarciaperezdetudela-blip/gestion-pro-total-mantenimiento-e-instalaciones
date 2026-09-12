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
/** Lo que dura el cartel antes de irse solo. */
export const DURACION = 3000;

export default function AvisoServidor() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => escucharAvisos(setAviso), []);

  // Se va solo a los 3 segundos.
  //
  // Antes se quedaba hasta que alguien le daba a la X, y este cartel se pinta
  // fijo arriba a la derecha por delante de la cabecera: en el móvil tapaba
  // atrás y editar. Si además el fallo se repetía (el servidor saturado manda
  // varios seguidos), había que ir cerrándolos uno a uno para poder trabajar.
  //
  // El texto no se pierde: el fallo sigue en el registro y el formulario se
  // queda abierto con lo escrito, que es lo que de verdad importa para poder
  // reintentarlo.
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(cerrarAviso, DURACION);
    return () => clearTimeout(t);
  }, [aviso]);

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
