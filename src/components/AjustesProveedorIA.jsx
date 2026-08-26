import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Download } from 'lucide-react';
import {
  PROVEEDORES, MODELOS_OLLAMA, MODELOS_OPENROUTER, modelosGratisOpenRouter,
  escucharAjustesIA, guardarAjustesIA, modelosInstalados, consultarIA, hayPuenteEscritorio,
} from '@/lib/proveedorIA';

/**
 * La lista que se enseña, con el modelo guardado dentro aunque OpenRouter ya
 * no lo ofrezca. Si no, el desplegable enseñaría otro distinto del que está
 * puesto de verdad, que es la forma más rápida de volverse loco.
 */
function conElGuardado(lista, guardado) {
  if (!guardado || lista.some((m) => m.id === guardado)) return lista;
  return [{ id: guardado, nombre: `${guardado} (el que tienes puesto)` }, ...lista];
}

/**
 * Elegir con qué IA trabaja el programa.
 *
 * Lo importante aquí es el botón de comprobar: sin él, se elige un proveedor,
 * se cierra la pantalla, y el fallo aparece tres días después al pulsar un
 * botón de IA en mitad de un presupuesto.
 */
export default function AjustesProveedorIA() {
  const [cfg, setCfg] = useState(null);
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [modelosOR, setModelosOR] = useState(MODELOS_OPENROUTER);
  const [buscandoOR, setBuscandoOR] = useState(false);

  useEffect(() => escucharAjustesIA(setCfg), []);

  // La lista de modelos gratuitos se le pide a OpenRouter, no se escribe aquí:
  // ellos los retiran cada pocos meses y una lista fija acaba ofreciendo
  // modelos que ya no existen.
  const proveedor = cfg?.proveedor;
  const clave = cfg?.openrouter_clave;
  useEffect(() => {
    if (proveedor !== 'openrouter') return undefined;
    let vivo = true;
    setBuscandoOR(true);
    modelosGratisOpenRouter({ openrouter_clave: clave })
      .then((lista) => { if (vivo && lista.length) setModelosOR(lista); })
      .catch(() => { /* sin internet: se queda la lista de respaldo */ })
      .finally(() => { if (vivo) setBuscandoOR(false); });
    return () => { vivo = false; };
  }, [proveedor, clave]);

  if (!cfg) return null;

  const cambiar = (campo, valor) => { setResultado(null); guardarAjustesIA({ [campo]: valor }); };

  const probar = async () => {
    setProbando(true);
    setResultado(null);
    try {
      let instalados = null;
      if (cfg.proveedor === 'ollama') {
        instalados = await modelosInstalados(cfg);
        if (!instalados.length) {
          throw new Error('Ollama responde, pero no tiene ningún modelo descargado. Descarga uno con: ollama pull ' + cfg.ollama_modelo);
        }
        const puesto = instalados.some((m) => m === cfg.ollama_modelo || m.startsWith(`${cfg.ollama_modelo}:`));
        if (!puesto) {
          throw new Error(`Ollama funciona, pero no tiene "${cfg.ollama_modelo}". Tiene: ${instalados.join(', ')}. Descárgalo con: ollama pull ${cfg.ollama_modelo}`);
        }
      }
      const r = await consultarIA({ prompt: 'Responde solo con la palabra: LISTO' }, cfg);
      setResultado({
        bien: true,
        texto: `Funciona. La IA ha contestado: "${String(r).trim().slice(0, 60)}"`
          + (instalados ? ` · Modelos instalados: ${instalados.join(', ')}` : ''),
      });
    } catch (e) {
      setResultado({ bien: false, texto: String(e?.message || e) });
    }
    setProbando(false);
  };

  const elegido = PROVEEDORES.find((p) => p.id === cfg.proveedor) || PROVEEDORES[0];

  return (
    <div className="space-y-3" data-prueba="proveedor-ia">
      <p className="text-sm font-semibold text-slate-700 border-b pb-1">🧠 Qué IA usar</p>

      <div className="space-y-2">
        {PROVEEDORES.map((p) => (
          <label
            key={p.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${cfg.proveedor === p.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}
          >
            <input
              type="radio"
              name="proveedor-ia"
              className="mt-1 h-4 w-4"
              checked={cfg.proveedor === p.id}
              onChange={() => cambiar('proveedor', p.id)}
              aria-label={p.nombre}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-slate-800">
                {p.nombre}
                {p.libre && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">LIBRE Y GRATIS</span>}
              </span>
              <span className="block text-xs text-slate-600">{p.gratis}</span>
              <span className="block text-xs text-slate-400">{p.nota}</span>
            </span>
          </label>
        ))}
      </div>

      {cfg.proveedor === 'ollama' && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-600">
            <strong>Cómo se pone (una sola vez):</strong> descarga Ollama en{' '}
            <span className="font-mono">ollama.com/download</span>, instálalo, y en la ventana negra
            escribe <span className="rounded bg-slate-100 px-1 font-mono">ollama pull {cfg.ollama_modelo}</span>.
            Ya está: no hay que abrir nada más, se queda funcionando solo.
          </p>
          <label className="block text-xs font-medium text-slate-700">
            Modelo
            <select
              className="mt-1 w-full rounded-lg border p-2 text-sm"
              value={cfg.ollama_modelo}
              onChange={(e) => cambiar('ollama_modelo', e.target.value)}
              aria-label="Modelo de Ollama"
            >
              {MODELOS_OLLAMA.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Dirección de Ollama
            <input
              className="mt-1 w-full rounded-lg border p-2 font-mono text-sm"
              value={cfg.ollama_url}
              onChange={(e) => cambiar('ollama_url', e.target.value)}
              aria-label="Dirección de Ollama"
            />
            <span className="mt-1 block font-normal text-slate-400">
              Déjalo así si Ollama está en este mismo ordenador.
            </span>
          </label>
          {!hayPuenteEscritorio() && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              Estás en el navegador o en el móvil. Ollama vive en el ordenador, así que desde aquí
              no llega: usa <strong>OpenRouter</strong> en este aparato, o abre el programa
              instalado en el ordenador.
            </p>
          )}
        </div>
      )}

      {cfg.proveedor === 'openrouter' && (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <p className="text-xs text-slate-600">
            <strong>Cómo se pone (una sola vez):</strong> entra en{' '}
            <span className="font-mono">openrouter.ai</span>, crea una cuenta gratis y copia una
            clave (empieza por <span className="font-mono">sk-or-</span>). Pégala aquí abajo.
          </p>
          <label className="block text-xs font-medium text-slate-700">
            Clave de OpenRouter
            <input
              type="password"
              className="mt-1 w-full rounded-lg border p-2 font-mono text-sm"
              value={cfg.openrouter_clave}
              placeholder="sk-or-..."
              onChange={(e) => cambiar('openrouter_clave', e.target.value)}
              aria-label="Clave de OpenRouter"
            />
            <span className="mt-1 block font-normal text-slate-400">
              Se guarda solo en este aparato. No se manda a ningún otro sitio.
            </span>
          </label>
          <label className="block text-xs font-medium text-slate-700">
            Modelo gratuito
            <select
              className="mt-1 w-full rounded-lg border p-2 text-sm"
              value={cfg.openrouter_modelo}
              onChange={(e) => cambiar('openrouter_modelo', e.target.value)}
              aria-label="Modelo de OpenRouter"
              data-prueba="modelo-openrouter"
            >
              {conElGuardado(modelosOR, cfg.openrouter_modelo).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
            <span className="mt-1 block font-normal text-slate-400">
              {buscandoOR
                ? 'Buscando qué modelos gratuitos hay ahora mismo…'
                : 'No hace falta tocarlo: si el modelo deja de existir, el programa coge otro gratuito él solo.'}
            </span>
          </label>
        </div>
      )}

      {elegido.libre && (
        <>
          <button
            type="button"
            onClick={probar}
            disabled={probando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 p-2.5 text-sm font-semibold text-white disabled:opacity-60"
            data-prueba="probar-ia"
          >
            {probando
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Comprobando…</>
              : <><Download className="h-4 w-4" /> Comprobar que funciona</>}
          </button>

          {resultado && (
            <div
              className={`flex items-start gap-2 rounded-lg p-3 text-sm ${resultado.bien ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}
              data-prueba="resultado-prueba-ia"
              role="status"
            >
              {resultado.bien
                ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span className="min-w-0 break-words">{resultado.texto}</span>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Con una IA libre no se gastan créditos de Base44. A cambio, no puede buscar en
            internet mientras responde: contesta con lo que sabe.
          </p>
        </>
      )}
    </div>
  );
}
