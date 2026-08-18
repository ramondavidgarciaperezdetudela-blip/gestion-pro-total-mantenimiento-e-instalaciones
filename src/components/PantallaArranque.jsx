import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';

/**
 * PantallaArranque — lo que se ve mientras el programa comprueba la sesión.
 *
 * Antes esto era solo una ruedecita girando. El problema: si el servidor no
 * contesta (sin cobertura, sin créditos en la cuenta, servidor caído), la
 * comprobación no termina NUNCA y la ruedecita se queda dando vueltas para
 * siempre. Desde fuera eso se ve como «el programa no abre», sin ninguna
 * pista de qué pasa ni nada que pulsar.
 *
 * Ahora, pasados unos segundos, se dice qué está ocurriendo y se ofrece
 * reintentar. La ruedecita sigue por si la conexión acaba respondiendo: el
 * aviso no corta nada, solo informa.
 */

const SEGUNDOS_PARA_AVISAR = 12;

export default function PantallaArranque() {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSegundos(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const tarda = segundos >= SEGUNDOS_PARA_AVISAR;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-white">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />

      {!tarda ? (
        <p className="text-sm text-slate-500">Comprobando la sesión…</p>
      ) : (
        <div className="max-w-md space-y-3">
          <p className="flex items-center justify-center gap-2 text-slate-800 font-medium">
            <WifiOff className="w-5 h-5 text-amber-600" />
            No se consigue conectar con el servidor
          </p>
          <p className="text-sm text-slate-600">
            El programa lleva {segundos} segundos esperando respuesta. Suele ser una de estas tres:
          </p>
          <ul className="text-sm text-slate-600 text-left list-disc ml-6 space-y-1">
            <li>No hay conexión a internet o es muy débil.</li>
            <li>La cuenta del servidor se ha quedado <strong>sin créditos</strong>.</li>
            <li>El servidor está caído en este momento.</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4" />Reintentar
          </button>
          <p className="text-xs text-slate-400">
            Si se repite siempre, comprueba los créditos de la cuenta en el panel del servidor.
          </p>
        </div>
      )}
    </div>
  );
}

/** Error de sesión que no sabemos tratar: mejor decirlo que quedarse en blanco. */
export function PantallaErrorSesion({ error }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-white">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <p className="text-slate-800 font-medium">No se ha podido iniciar la sesión</p>
      <p className="text-sm text-slate-600 max-w-md">
        {error?.message || 'El servidor no ha aceptado la sesión. Comprueba la conexión y que la cuenta siga activa.'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        <RefreshCw className="w-4 h-4" />Reintentar
      </button>
    </div>
  );
}
