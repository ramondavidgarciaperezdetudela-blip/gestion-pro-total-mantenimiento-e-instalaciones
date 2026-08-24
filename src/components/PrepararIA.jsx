import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, Download, Settings2, Smartphone } from 'lucide-react';
import {
  prepararIALibre, abrirPaginaDeInstalacion, hayPuenteEscritorio, escucharAjustesIA,
  compartirIAConLosDemas, esAppMovil, buscarIADelOrdenador, probarIADelOrdenador,
  guardarClaveCompartida, recogerClaveCompartida,
} from '@/lib/proveedorIA';
import { base44 } from '@/api/base44Client';
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
  const [compartida, setCompartida] = useState(null);
  const [clave, setClave] = useState('');
  const [claveGuardada, setClaveGuardada] = useState(false);

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
        compartir();
      } else if (esAppMovil()) {
        // En el móvil la IA no vive aquí: se busca la del ordenador y, si no
        // se llega (datos móviles, otro wifi), la de internet.
        const puente = await buscarIADelOrdenador(base44);
        if (!puente) {
          const guardada = await recogerClaveCompartida(base44);
          if (guardada) {
            setPaso({
              estado: 'listo',
              texto: 'Fuera del wifi de tu ordenador se usa la IA gratuita de internet. Funciona igual con datos móviles.',
            });
            return;
          }
          setPaso({ estado: 'sin_ordenador', texto: '' });
          return;
        }
        try {
          const modelos = await probarIADelOrdenador(puente);
          setPaso({
            estado: 'listo',
            texto: `Usando la IA de tu ordenador por el wifi (${puente.ip})${modelos[0] ? `, con «${modelos[0]}»` : ''}.`,
          });
        } catch {
          setPaso({ estado: 'sin_ordenador', texto: '' });
        }
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
      const r = await prepararIALibre(setPaso);
      if (r?.listo) await compartir();
    } catch (e) {
      setError(String(e?.message || e));
    }
    setTrabajando(false);
  };

  /**
   * Dejar la IA del ordenador al alcance del móvil y la tablet.
   *
   * Se hace solo, sin preguntar: si no, la IA gratuita funcionaría únicamente
   * en el ordenador y en el móvil habría que gastar créditos.
   */
  const compartir = async () => {
    if (esAppMovil() || !hayPuenteEscritorio()) return;
    try {
      const r = await compartirIAConLosDemas(base44);
      setCompartida(r?.ok
        ? { ok: true, texto: `Tu móvil y tu tablet ya pueden usar esta misma IA cuando estén en el mismo wifi (${r.ip}).` }
        : { ok: false, texto: r?.error || 'No se ha podido compartir con el móvil.' });
    } catch (e) {
      setCompartida({ ok: false, texto: String(e?.message || e) });
    }
  };

  const listo = paso?.estado === 'listo';
  const faltaOllama = paso?.estado === 'falta_ollama';
  const sinOrdenador = paso?.estado === 'sin_ordenador';

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
                ? 'Funciona sin gastar créditos. El programa elige solo la mejor opción según dónde estés.'
                : 'El programa lo deja todo puesto por su cuenta. Tú no tienes que elegir nada ni escribir nada.'}
            </p>
            {/* Con qué ha quedado puesta. Decir solo "está lista" deja con la
                duda de si ha hecho algo o se lo ha inventado. */}
            {listo && paso?.texto && (
              <p className="mt-1 text-xs text-emerald-600" data-prueba="detalle-listo">{paso.texto}</p>
            )}
          </div>
        </div>

        {compartida && (
          <p
            className={`mt-3 flex items-start gap-2 rounded-lg p-2.5 text-sm ${compartida.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
            data-prueba="estado-compartida"
          >
            {compartida.ok ? <Smartphone className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="min-w-0">{compartida.texto}</span>
          </p>
        )}

        {sinOrdenador && (
          <div className="mt-3 space-y-3 rounded-lg bg-white p-3 text-sm text-slate-700" data-prueba="movil-sin-ordenador">
            <div>
              <p className="font-semibold text-slate-800">Ahora mismo no llegas a la IA de tu ordenador</p>
              <p className="mt-1">
                O el ordenador está apagado, o estás con datos móviles o en otro wifi. Cuando
                vuelvas a estar en la misma red que él, esto se arregla solo y no hay que tocar nada.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">Para que funcione también fuera</p>
              <p className="mt-1 text-slate-600">
                Hace falta una IA que esté en internet. La hay gratuita: entra en{' '}
                <span className="font-mono">openrouter.ai</span>, crea la cuenta (es gratis) y copia
                la clave. <strong>Se pega una sola vez y sirve para el ordenador, la tablet y el
                móvil</strong> — no hay que repetirlo en cada aparato.
              </p>
              <input
                type="password"
                className="mt-2 w-full rounded-lg border p-2 font-mono text-sm"
                placeholder="sk-or-..."
                value={clave}
                onChange={(e) => { setClave(e.target.value); setClaveGuardada(false); }}
                aria-label="Clave gratuita de internet"
              />
              <button
                type="button"
                disabled={!clave.trim()}
                data-prueba="guardar-clave-compartida"
                onClick={async () => {
                  await guardarClaveCompartida(base44, clave.trim());
                  setClaveGuardada(true);
                }}
                className="mt-2 w-full rounded-lg bg-blue-600 p-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                Guardar para todos mis aparatos
              </button>
              {claveGuardada && (
                <p className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-800" data-prueba="clave-guardada">
                  Guardada. Ya funciona en este aparato y en los demás, estés donde estés.
                </p>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Mientras tanto, todo lo demás del programa funciona igual con datos móviles: clientes,
              partes, presupuestos, facturas, agenda y almacén.
            </p>
          </div>
        )}

        {paso && !listo && paso.texto && (
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

        {!listo && !faltaOllama && !sinOrdenador && (
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
