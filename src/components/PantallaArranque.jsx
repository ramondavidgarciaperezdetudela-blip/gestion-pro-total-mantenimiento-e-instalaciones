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

/**
 * Error de sesión que no sabemos tratar.
 *
 * Aquí NUNCA se deja al usuario encerrado. Un fallo de red al arrancar es
 * normalísimo en una obra con mala cobertura, y el programa sirve para muchas
 * cosas sin servidor (calculadoras, plano, diagnóstico, consultar lo que ya
 * está descargado). Por eso, además de reintentar, siempre se puede entrar.
 */
export function PantallaErrorSesion({ error, onContinuar }) {
  const esDeRed = /network|timeout|failed|fetch|conexi|502|503|504/i.test(
    String(error?.message || '')
  );

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center bg-white">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <p className="text-slate-800 font-medium">
        {esDeRed ? 'No se ha podido conectar con el servidor' : 'No se ha podido iniciar la sesión'}
      </p>
      <p className="text-sm text-slate-600 max-w-md">
        {esDeRed
          ? 'Puede ser la cobertura, que la cuenta se haya quedado sin créditos, o que el servidor esté caído.'
          : (error?.message || 'El servidor no ha aceptado la sesión. Comprueba la conexión y que la cuenta siga activa.')}
      </p>

      <div className="flex flex-wrap gap-2 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />Reintentar
        </button>
        {onContinuar && (
          <button
            onClick={onContinuar}
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50"
          >
            Entrar de todas formas
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 max-w-md">
        Entrando sin conexión funcionan las calculadoras, el plano y el diagnóstico.
        Lo que necesite servidor dará error hasta que vuelva la conexión.
      </p>
    </div>
  );
}
