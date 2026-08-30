import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Search, Copy } from 'lucide-react';
import { buscarOllamaPorAhi, guardarAjustesIA, ajustesIA, esMovil } from '@/lib/proveedorIA';

/**
 * BuscarOllama — el botón que dice QUÉ le pasa a tu Ollama.
 *
 * Por qué existe y por qué está A LA VISTA:
 *
 * Antes, cuando el programa no encontraba Ollama, no salía nada. Ni el usuario
 * ni yo podíamos saber si es que no estaba arrancado, si estaba en otro puerto,
 * o si estaba funcionando perfectamente y rechazando al programa. Son tres
 * problemas distintos con tres soluciones distintas.
 *
 * Y lo poco que había estaba escondido detrás de «Cambiar de IA a mano (no
 * hace falta)». Justo lo contrario de donde tiene que estar: quien no consigue
 * que le detecte Ollama necesita esto lo primero, no enterrado en un apartado
 * que le dice que no hace falta.
 */
export default function BuscarOllama() {
  const [buscando, setBuscando] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);

  const buscar = async () => {
    setBuscando(true);
    setDiagnostico(null);
    try {
      const r = await buscarOllamaPorAhi(ajustesIA());
      setDiagnostico(r);
      if (r?.estado === 'ok' && r.modelos?.length) {
        guardarAjustesIA({ proveedor: 'ollama', ollama_modelo: r.modelos[0] });
      }
    } catch (e) {
      setDiagnostico({
        estado: 'apagado',
        titulo: 'No se ha podido comprobar.',
        detalle: String(e?.message || e),
      });
    } finally {
      // Pase lo que pase, el botón vuelve.
      setBuscando(false);
    }
  };

  const color = diagnostico?.estado === 'ok' ? 'bg-emerald-50 text-emerald-900'
    : diagnostico?.estado === 'bloqueado' ? 'bg-amber-50 text-amber-900'
      : diagnostico?.estado === 'sin_modelos' ? 'bg-sky-50 text-sky-900'
        : 'bg-red-50 text-red-900';

  return (
    <div className="space-y-2" data-prueba="bloque-buscar-ollama">
      <button
        type="button"
        onClick={buscar}
        disabled={buscando}
        className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 p-2.5 text-sm font-semibold text-indigo-800 disabled:opacity-60"
        data-prueba="buscar-ollama"
      >
        {buscando
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando Ollama…</>
          : <><Search className="h-4 w-4" /> Buscar Ollama ahora y decirme qué pasa</>}
      </button>

      {diagnostico && (
        <div className={`rounded-lg p-3 text-sm ${color}`} data-prueba="diagnostico-ollama" role="status">
          <p className="flex items-start gap-2 font-semibold">
            {diagnostico.estado === 'ok'
              ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="min-w-0 break-words">{diagnostico.titulo}</span>
          </p>
          {diagnostico.detalle && (
            <p className="mt-1 pl-6 text-xs opacity-90 break-words">{diagnostico.detalle}</p>
          )}
          {diagnostico.arreglo && (
            <div className="mt-2 pl-6">
              <p className="text-xs font-semibold">Qué hacer:</p>
              <pre className="mt-0.5 whitespace-pre-wrap break-words rounded bg-white/70 p-2 text-[11px] leading-relaxed">{diagnostico.arreglo}</pre>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(diagnostico.arreglo).catch(() => {})}
                className="mt-1 inline-flex items-center gap-1 text-[11px] underline"
                data-prueba="copiar-arreglo"
              >
                <Copy className="h-3 w-3" /> Copiar estas instrucciones
              </button>
            </div>
          )}
          {diagnostico.url && (
            <p className="mt-1 pl-6 text-[11px] opacity-70">Comprobado en {diagnostico.url}</p>
          )}
        </div>
      )}

      {esMovil() && (
        <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          <strong>En el móvil</strong>, Ollama no corre aquí: corre en el ordenador. Enciende allí
          «Compartir la IA por wifi» y ten los dos aparatos en la misma red.
        </p>
      )}
    </div>
  );
}
