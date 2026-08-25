import React, { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { escucharRecuperacion, cerrarAvisoRecuperacion } from '@/lib/recuperarTrabajo';

/**
 * El aviso de "se ha recuperado lo que estabas escribiendo".
 *
 * Hace falta decirlo: si los campos aparecen rellenos sin explicación, quien lo
 * ve piensa que se ha equivocado de ficha. Y tiene que poder quitarse de un
 * toque, por si lo que quería era empezar de cero.
 */
export default function AvisoRecuperado() {
  const [aviso, setAviso] = useState(null);

  useEffect(() => escucharRecuperacion(setAviso), []);

  // Se quita solo a los 12 segundos: es un aviso, no algo que haya que atender.
  useEffect(() => {
    if (!aviso) return undefined;
    const t = setTimeout(cerrarAvisoRecuperacion, 12000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!aviso) return null;

  const hora = new Date(aviso.cuando).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      role="status"
      data-prueba="aviso-recuperado"
      className="fixed bottom-4 left-1/2 z-[100] w-[min(460px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 shadow-xl"
    >
      <div className="flex items-start gap-3">
        <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-800">
            Recuperado lo que estabas escribiendo
          </p>
          <p className="mt-0.5 text-sm leading-snug text-emerald-700">
            Se han vuelto a poner {aviso.campos} {aviso.campos === 1 ? 'dato' : 'datos'} de las {hora}.
            Repásalos antes de guardar.
          </p>
        </div>
        <button
          type="button"
          onClick={cerrarAvisoRecuperacion}
          aria-label="Cerrar aviso"
          className="shrink-0 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
