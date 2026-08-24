import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Download, Settings2 } from 'lucide-react';
import {
  prepararIALibre, abrirPaginaDeInstalacion, hayPuenteEscritorio, escucharAjustesIA,
} from '@/lib/proveedorIA';
import AjustesProveedorIA from '@/components/AjustesProveedorIA';

/**
 * Dejar la IA lista sin que haya que configurar nada.
 *
 * La pantalla anterior pedía elegir proveedor, modelo y dirección, y explicaba
 * cómo escribir «ollama pull» en una ventana negra. Eso vale para quien sabe
 * de esto; para quien no, es una pared. Aquí hay UN botón: el programa mira
 * qué hay, elige por su cuenta y, si falta el modelo, se lo descarga él.
 */
export default function PrepararIA() {
  const [paso, setPaso] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);
  const [verAvanzado, setVerAvanzado] = useState(false);
  const [cfg, setCfg] = useState(null);

  useEffect(() => escucharAjustesIA(setCfg), []);

  // Al abrir, se mira solo (sin descargar nada) si ya está lista. Así quien la
  // tenga puesta no ve ningún botón que pulsar: le sale que ya funciona.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const { mirarSiHayIALibre, elegirModelo, guardarAjustesIA } = await import('@/lib/proveedorIA');
      const hay = await mirarSiHayIALibre();
      if (!vivo) return;
      if (hay.lista) {
        const m = elegirModelo(hay.modelos, cfg?.ollama_modelo || 'llama3.2');
        guardarAjustesIA({ proveedor: 'ollama', ollama_modelo: m });
        setPaso({ estado: 'listo', texto: `Ya funciona, con «${m}». No hay nada que configurar.` });
      }
    })();
    return () => { vivo = false; };
    // Solo al montar: es una comprobación, no algo que deba repetirse al teclear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preparar = async () => {
    setTrabajando(true);
    setError(null);
    try {
      await prepararIALibre(setPaso);
    } catch (e) {
      setError(String(e?.message || e));
    }
    setTrabajando(false);
  };

  const listo = paso?.estado === 'listo';
  const faltaOllama = paso?.estado === 'falta_ollama';

  return (
    <div className="space-y-3" data-prueba="preparar-ia">
      <div
        className={`rounded-xl border p-4 ${listo ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}
      >
        <div className="flex items-start gap-3">
          {listo
            ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            : <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />}
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${listo ? 'text-emerald-800' : 'text-slate-800'}`} data-prueba="estado-preparar">
              {listo ? 'La IA gratuita está lista' : 'IA gratuita, sin gastar créditos'}
            </p>
            <p className={`mt-1 text-sm leading-snug ${listo ? 'text-emerald-700' : 'text-slate-600'}`}>
              {listo
                ? 'Funciona dentro de tu ordenador, sin gastar créditos y sin necesitar internet.'
                : 'El programa lo deja todo puesto por su cuenta. Tú no tienes que elegir nada ni escribir nada.'}
            </p>
            {/* Con qué ha quedado puesta. Decir solo "está lista" deja con la
                duda de si ha hecho algo o se lo ha inventado. */}
            {listo && paso?.texto && (
              <p className="mt-1 text-xs text-emerald-600" data-prueba="detalle-listo">{paso.texto}</p>
            )}
          </div>
        </div>

        {paso && !listo && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-white p-2.5 text-sm text-slate-700" role="status">
            {trabajando && <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-blue-500" />}
            <span className="min-w-0">{paso.texto}</span>
          </p>
        )}

        {error && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-2.5 text-sm text-red-800" role="alert"
             data-prueba="error-preparar">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">{error}</span>
          </p>
        )}

        {!listo && !faltaOllama && (
          <button
            type="button"
            onClick={preparar}
            disabled={trabajando}
            data-prueba="boton-preparar-ia"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 p-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {trabajando
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Preparándola…</>
              : <><Sparkles className="h-4 w-4" /> Poner la IA gratuita</>}
          </button>
        )}

        {faltaOllama && (
          <div className="mt-3 space-y-2 rounded-lg bg-white p-3">
            <p className="text-sm text-slate-700">
              Solo falta una cosa, y se hace una vez: <strong>instalar el motor de la IA</strong>.
              Es un instalador normal de los de «Siguiente, siguiente». Pulsa el botón, instálalo, y
              vuelve aquí: el resto lo hace el programa.
            </p>
            <button
              type="button"
              onClick={abrirPaginaDeInstalacion}
              data-prueba="boton-descargar-motor"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 p-3 text-sm font-semibold text-white"
            >
              <Download className="h-4 w-4" /> Abrir la página de descarga
            </button>
            <button
              type="button"
              onClick={preparar}
              disabled={trabajando}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 p-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {trabajando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Ya lo he instalado, compruébalo
            </button>
            {!hayPuenteEscritorio() && (
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                Ojo: esto va en el <strong>ordenador</strong>. En el móvil y la tablet no se puede
                instalar; ahí sigue funcionando todo el programa, pero los botones de IA necesitan
                la de Base44 (créditos) o la opción de internet de más abajo.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setVerAvanzado((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        data-prueba="ver-avanzado-ia"
      >
        <Settings2 className="h-3.5 w-3.5" />
        {verAvanzado ? 'Ocultar los ajustes de siempre' : 'Cambiar de IA a mano (no hace falta)'}
      </button>

      {verAvanzado && (
        <div className="rounded-xl border border-slate-200 p-3">
          <AjustesProveedorIA />
        </div>
      )}
    </div>
  );
}
