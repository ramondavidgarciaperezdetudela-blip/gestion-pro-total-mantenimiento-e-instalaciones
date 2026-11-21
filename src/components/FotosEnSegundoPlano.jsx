import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Image as ImageIcon, X, ChevronDown, ChevronUp, Square } from 'lucide-react';
import { leerTrabajoFotos, suscribirTrabajoFotos, detenerTrabajoFotos, cerrarTrabajoFotos, cerrarEleccionFotos, aplicarElecciones } from '@/lib/trabajoFotos';
import { segundosRestantes, textoTiempo } from '@/lib/importacionFondo';
import { leerTrabajoFotosPdf, suscribirTrabajoFotosPdf, detenerTrabajoFotosPdf, cerrarTrabajoFotosPdf } from '@/lib/trabajoFotosPdf';
import { construirCsvFotos } from '@/lib/informeFotos';
import { descargarTexto } from '@/lib/iaModulos/datos';
import { Download } from 'lucide-react';

/** Tarjeta de «Fotos desde PDF»: avance, pasos y, al acabar, resumen con el fichero de las que faltan. */
function TarjetaFotosPdf() {
  const e = useSyncExternalStore(suscribirTrabajoFotosPdf, leerTrabajoFotosPdf, leerTrabajoFotosPdf);
  const [abierto, setAbierto] = useState(true);
  const [, setTic] = useState(0);
  const leyendo = e.fase === 'leyendo';
  useEffect(() => {
    if (!leyendo) return undefined;
    const t = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [leyendo]);
  if (e.fase === 'ninguna') return null;
  const pct = Math.round((e.avance || 0) * 100);
  const gastado = Math.round(((leyendo ? Date.now() : e.fin) - e.inicio) / 1000);
  const resta = leyendo ? segundosRestantes(pct, e.inicio) : null;
  const color = { ok: 'text-green-700', aviso: 'text-amber-700', error: 'text-red-700', info: 'text-gray-600' };
  const descargar = () => descargarTexto(`fotos-no-recuperadas-${new Date().toISOString().slice(0, 10)}.csv`, construirCsvFotos(e.filasInforme), 'text/csv');
  return (
    <div className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-violet-200 bg-white shadow-xl p-3 text-xs pointer-events-auto" role="status" data-prueba="fotos-pdf-fondo">
      <div className="flex items-center gap-2 mb-1.5">
        {leyendo ? <Loader2 className="w-4 h-4 text-violet-600 animate-spin" /> : <ImageIcon className="w-4 h-4 text-violet-600" />}
        <span className="font-semibold text-violet-800 flex-1 truncate">{leyendo ? 'Recuperando fotos del PDF' : (e.cancelado ? 'Recuperación de fotos detenida' : 'Fotos del PDF recuperadas')}</span>
        <span className="font-bold text-violet-700 tabular-nums">{pct}%</span>
        <button type="button" onClick={() => setAbierto((a) => !a)} className="text-violet-700" aria-label={abierto ? 'Ocultar pasos' : 'Ver pasos'}>{abierto ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</button>
        {!leyendo && <button type="button" onClick={cerrarTrabajoFotosPdf} className="text-gray-500" aria-label="Cerrar" data-prueba="cerrar-fotos-pdf"><X className="w-4 h-4" /></button>}
      </div>
      <div className="w-full bg-violet-100 rounded-full h-2 overflow-hidden"><div className="h-2 bg-violet-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} /></div>
      <div className="flex justify-between mt-1.5 text-violet-900">
        <span data-prueba="progreso-detalle">{leyendo ? `Página ${e.pagina} de ${e.totalPaginas || '…'} · ` : ''}<b className="text-green-700" data-prueba="resumen-ok">{e.encontradas.toLocaleString('es-ES')}</b> con foto{e.fallos ? <> · <b className="text-red-600">{e.fallos}</b> con problemas</> : null}{!leyendo ? <> · <b data-prueba="resumen-fallos">{e.filasInforme.length.toLocaleString('es-ES')}</b> sin recuperar</> : null}</span>
        <span className="tabular-nums shrink-0 ml-2">{textoTiempo(gastado)}{resta != null ? ` · ~${textoTiempo(resta)}` : ''}</span>
      </div>
      {abierto && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5 border-t pt-1.5" data-prueba="fotos-pdf-pasos">
          {e.pasos.map((p) => <div key={p.t + p.txt} className={`truncate ${color[p.tipo] || ''}`}>{p.tipo === 'ok' ? '✓' : p.tipo === 'aviso' ? '–' : '•'} {p.txt}</div>)}
        </div>
      )}
      {leyendo && <button type="button" onClick={detenerTrabajoFotosPdf} className="mt-2 w-full flex items-center justify-center gap-1 rounded-md border border-red-200 text-red-700 py-1 hover:bg-red-50" data-prueba="cancelar-fotos-pdf"><Square className="w-3 h-3" />Detener</button>}
      {!leyendo && e.filasInforme.length > 0 && <button type="button" onClick={descargar} className="mt-2 w-full flex items-center justify-center gap-1 rounded-md border border-violet-200 text-violet-800 py-1 hover:bg-violet-50" data-prueba="descargar-informe-fotos"><Download className="w-3 h-3" />Descargar fichero de las que faltan</button>}
    </div>
  );
}

const eur = (n) => (n ? `${Number(n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : 'sin precio');

/** Al acabar la descarga masiva: los artículos con varios resultados en la web del proveedor, para elegir cuál guardar. */
function ElegirResultados({ lista }) {
  const [sel, setSel] = useState(() => Object.fromEntries(lista.map((x) => [x.k, 0])));
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');
  const guardar = async () => {
    setGuardando(true);
    const r = await aplicarElecciones(lista.map((x) => ({ k: x.k, cand: sel[x.k] >= 0 ? x.candidatas[sel[x.k]] : null })));
    setGuardando(false);
    if (r.fallos) setMsg(`Guardadas ${r.hechas}; ${r.fallos} no se pudieron descargar.`);
  };
  return createPortal(
    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/50 p-3" role="dialog" aria-modal="true" aria-label="Elegir resultado" data-prueba="elegir-resultados">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="border-b p-4">
          <div className="font-semibold text-slate-900">Elige cuál guardar</div>
          <p className="text-xs text-slate-600">La web del proveedor dio varios resultados para estos {lista.length} artículos. Marca el correcto de cada uno (o «Ninguno») y se rellenará la foto, el precio y la descripción que falten.</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {lista.map((x) => (
            <div key={x.k} className="rounded-lg border p-2" data-prueba="elegir-grupo">
              <div className="mb-1.5 text-sm font-medium text-slate-800">{x.nombre}{x.lista.length > 1 ? <span className="text-xs font-normal text-slate-500"> (+{x.lista.length - 1} medidas)</span> : null}</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {x.candidatas.map((c, i) => (
                  <label key={c.url} className={`cursor-pointer rounded-lg border p-1.5 text-xs ${sel[x.k] === i ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-400' : 'border-slate-200'}`}>
                    <input type="radio" className="sr-only" name={`r-${x.k}`} checked={sel[x.k] === i} onChange={() => setSel((a) => ({ ...a, [x.k]: i }))} data-prueba="elegir-opcion" />
                    <img src={c.url} alt="" referrerPolicy="no-referrer" className="mb-1 h-24 w-full rounded bg-slate-100 object-contain" loading="lazy" />
                    <div className="line-clamp-2 text-slate-800">{c.titulo || 'Sin nombre'}</div>
                    <div className="font-semibold text-emerald-700">{eur(c.precio)}</div>
                  </label>
                ))}
                <label className={`flex cursor-pointer items-center justify-center rounded-lg border p-1.5 text-xs text-slate-600 ${sel[x.k] === -1 ? 'border-sky-500 bg-sky-50' : 'border-dashed border-slate-300'}`}>
                  <input type="radio" className="sr-only" name={`r-${x.k}`} checked={sel[x.k] === -1} onChange={() => setSel((a) => ({ ...a, [x.k]: -1 }))} data-prueba="elegir-ninguno" />
                  Ninguno
                </label>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t p-3">
          <span className="flex-1 text-xs text-amber-700">{msg}</span>
          <button type="button" onClick={cerrarEleccionFotos} className="rounded-lg border px-3 py-1.5 text-sm text-slate-700" data-prueba="elegir-cerrar">Ahora no</button>
          <button type="button" disabled={guardando} onClick={guardar} className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60" data-prueba="elegir-guardar">{guardando ? 'Guardando…' : 'Guardar elegidas'}</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/** Panel fijo (arriba de la importación) con los pasos de la búsqueda de fotos que sigue en segundo plano. */
export default function FotosEnSegundoPlano() {
  const st = useSyncExternalStore(suscribirTrabajoFotos, leerTrabajoFotos, leerTrabajoFotos);
  const [abierto, setAbierto] = useState(true);
  const [, setTic] = useState(0);
  useEffect(() => {
    if (!st.activa) return undefined;
    const t = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [st.activa]);
  const hayBusqueda = !!st.total;
  const pct = hayBusqueda ? Math.round((st.hechos / st.total) * 100) : 0;
  const gastado = Math.round(((st.activa ? Date.now() : st.fin) - st.inicio) / 1000);
  const resta = st.activa ? segundosRestantes(pct, st.inicio) : null;
  const color = { ok: 'text-green-700', aviso: 'text-amber-700', error: 'text-red-700', info: 'text-gray-600' };
  // Portal al <body>: el contenedor principal usa «contain», que haría que 'fixed' se colocara dentro de la página y no en la esquina de la pantalla.
  return createPortal(
    <>
    {!st.activa && st.porElegir?.length > 0 && <ElegirResultados lista={st.porElegir} />}
    <div className="fixed bottom-4 left-4 z-[10050] flex flex-col gap-2 pointer-events-none">
    <TarjetaFotosPdf />
    {hayBusqueda && <div className="w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-sky-200 bg-white shadow-xl p-3 text-xs pointer-events-auto" role="status" data-prueba="fotos-fondo">
      <div className="flex items-center gap-2 mb-1.5">
        {st.activa ? <Loader2 className="w-4 h-4 text-sky-600 animate-spin" /> : <ImageIcon className="w-4 h-4 text-sky-600" />}
        <span className="font-semibold text-sky-800 flex-1 truncate">{st.activa ? 'Buscando fotos en segundo plano' : (st.detenido ? 'Búsqueda de fotos detenida' : 'Búsqueda de fotos terminada')}</span>
        <span className="font-bold text-sky-700 tabular-nums">{pct}%</span>
        <button type="button" onClick={() => setAbierto((a) => !a)} className="text-sky-700" aria-label={abierto ? 'Ocultar pasos' : 'Ver pasos'}>{abierto ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</button>
        {!st.activa && <button type="button" onClick={cerrarTrabajoFotos} className="text-gray-500" aria-label="Cerrar"><X className="w-4 h-4" /></button>}
      </div>
      <div className="w-full bg-sky-100 rounded-full h-2 overflow-hidden"><div className="h-2 bg-sky-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} /></div>
      <div className="flex justify-between mt-1.5 text-sky-800">
        <span>{st.hechos.toLocaleString('es-ES')} de {st.total.toLocaleString('es-ES')} · <b className="text-green-700">{st.encontradas.toLocaleString('es-ES')} con foto</b> · {st.conPrecio ? <><b className="text-emerald-700">{st.conPrecio.toLocaleString('es-ES')} con precio</b> · </> : null}{st.sinFoto.toLocaleString('es-ES')} sin{st.porElegir?.length ? <> · <b className="text-amber-700">{st.porElegir.length} por elegir</b></> : null}</span>
        <span className="tabular-nums shrink-0 ml-2">{textoTiempo(gastado)}{resta != null ? ` · ~${textoTiempo(resta)}` : ''}</span>
      </div>
      {abierto && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5 border-t pt-1.5" data-prueba="fotos-fondo-pasos">
          {st.enCurso.map((n, i) => <div key={`c${i}`} className="text-sky-700 truncate">⏳ Buscando: {n}</div>)}
          {st.pasos.map((p) => <div key={p.t + p.txt} className={`truncate ${color[p.tipo] || ''}`}>{p.tipo === 'ok' ? '✓' : p.tipo === 'aviso' ? '–' : '•'} {p.txt}</div>)}
        </div>
      )}
      {st.activa && (
        <button type="button" onClick={detenerTrabajoFotos} className="mt-2 w-full flex items-center justify-center gap-1 rounded-md border border-red-200 text-red-700 py-1 hover:bg-red-50" data-prueba="fotos-fondo-detener"><Square className="w-3 h-3" />Detener</button>
      )}
    </div>}
    </div>
    </>,
    document.body
  );
}
