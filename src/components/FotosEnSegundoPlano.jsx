import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Image as ImageIcon, X, ChevronDown, ChevronUp, Square } from 'lucide-react';
import { leerTrabajoFotos, suscribirTrabajoFotos, detenerTrabajoFotos, cerrarTrabajoFotos } from '@/lib/trabajoFotos';
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
        <span>{st.hechos.toLocaleString('es-ES')} de {st.total.toLocaleString('es-ES')} · <b className="text-green-700">{st.encontradas.toLocaleString('es-ES')} con foto</b> · {st.sinFoto.toLocaleString('es-ES')} sin</span>
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
    </div>,
    document.body
  );
}
