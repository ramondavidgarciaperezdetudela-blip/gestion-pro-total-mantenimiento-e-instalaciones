import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, X, RefreshCw, MessageCircle, ExternalLink, User, EyeOff, Undo2, Loader2, CheckCircle, Search } from 'lucide-react';
import { createPageUrl } from '@/utils';
import BotonesImprimirPantalla from './BotonesImprimirPantalla';
import { TIPOS, filtrarAvisos, contarPorTipo, leerAnulados, guardarAnulados } from '@/lib/tareasAvisos';
import { cargarAvisos, aplicarAccion, recordatorioWhatsApp, olvidarAvisos, EVENTO_AVISOS } from '@/lib/tareasAvisosDatos';

const COLOR = {
  rojo: 'border-l-red-500 bg-red-50', naranja: 'border-l-orange-400 bg-orange-50',
  amarillo: 'border-l-yellow-400 bg-yellow-50', azul: 'border-l-blue-400 bg-blue-50',
};
const ETIQUETA = { rojo: 'bg-red-100 text-red-700', naranja: 'bg-orange-100 text-orange-700', amarillo: 'bg-yellow-100 text-yellow-800', azul: 'bg-blue-100 text-blue-700' };

/**
 * Todas las tareas y avisos en una sola lista, con las acciones para resolverlos desde aquí.
 *  - La barra de arriba (título + PDF + Imprimir + filtros) se queda fija; solo se mueve la lista.
 *  - enVentana: se usa dentro de la ventana que se abre por encima de cualquier pantalla.
 */
export default function CentroTareasAvisos({ onCerrar, enVentana = false, tipoInicial = '' }) {
  const [avisos, setAvisos] = useState(null);
  const [anulados, setAnulados] = useState(leerAnulados);
  const [tipo, setTipo] = useState(tipoInicial || '');
  const [texto, setTexto] = useState('');
  const [verAnulados, setVerAnulados] = useState(false);
  const [trabajando, setTrabajando] = useState('');
  const [mensaje, setMensaje] = useState('');
  const listaRef = useRef(null);

  const cargar = useCallback(async (forzar = false) => {
    if (forzar) setAvisos(null);
    setAvisos(await cargarAvisos(forzar));
  }, []);
  useEffect(() => {
    cargar();
    const alCambiar = () => cargar();
    window.addEventListener(EVENTO_AVISOS, alCambiar);
    return () => window.removeEventListener(EVENTO_AVISOS, alCambiar);
  }, [cargar]);
  useEffect(() => { setTipo(tipoInicial || ''); }, [tipoInicial]);

  const contar = useMemo(() => contarPorTipo(avisos || [], anulados), [avisos, anulados]);
  const total = Object.values(contar).reduce((a, b) => a + b, 0);
  // Si ya no queda nada del tipo elegido (acabas de resolver el último), se vuelve a «Todo».
  useEffect(() => { if (avisos && tipo && !contar[tipo] && !verAnulados) setTipo(''); }, [avisos, tipo, contar, verAnulados]);
  const visibles = useMemo(() => filtrarAvisos(avisos || [], { tipo, texto, anulados, verAnulados }), [avisos, tipo, texto, anulados, verAnulados]);
  const nAnulados = (avisos || []).filter((a) => anulados.includes(a.id)).length;

  const avisar = (m) => { setMensaje(m); setTimeout(() => setMensaje(''), 5000); };
  const anular = (a) => { const n = [...anulados, a.id]; setAnulados(n); guardarAnulados(n); olvidarAvisos(); };
  const restaurar = (a) => { const n = anulados.filter((x) => x !== a.id); setAnulados(n); guardarAnulados(n); olvidarAvisos(); };

  const hacer = async (a, accion) => {
    if (accion.confirmar && !window.confirm(accion.confirmar)) return;
    setTrabajando(`${a.id}|${accion.id}`);
    try { await aplicarAccion(accion); avisar(`Hecho: ${accion.texto}`); }
    catch (e) { avisar(`No se pudo: ${e?.message || 'inténtalo de nuevo'}`); }
    finally { setTrabajando(''); }
  };
  const whatsapp = async (a) => { const r = await recordatorioWhatsApp(a); if (!r.ok) avisar(r.motivo); };

  const chip = (id, texto, n) => (
    <button key={id || 'todos'} type="button" onClick={() => setTipo(id)} data-prueba={`avisos-filtro-${id || 'todos'}`}
      className={`whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full border ${tipo === id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
      {texto}{n ? ` (${n})` : ''}
    </button>
  );
  const btn = 'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium disabled:opacity-50';

  return (
    <div className={`flex flex-col bg-white text-slate-800 ${enVentana ? 'h-full' : 'h-[calc(100vh-11rem)] min-h-[24rem] rounded-xl border'}`} data-prueba="centro-avisos">
      {/* Barra fija: el título no se mueve; PDF e Imprimir a la derecha, sin tapar la lista */}
      <div className="flex-shrink-0 border-b bg-slate-50 rounded-t-xl">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Bell className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <h2 className="font-bold text-base flex-1 min-w-0 truncate" data-prueba="titulo-avisos">Tareas y avisos{total > 0 && <span className="ml-2 align-middle text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5">{total}</span>}</h2>
          <BotonesImprimirPantalla enLinea sinTeclado nodoRef={listaRef} titulo="Tareas y avisos" />
          <button type="button" onClick={() => { olvidarAvisos(); cargar(true); }} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500" title="Actualizar"><RefreshCw className="w-4 h-4" /></button>
          {onCerrar && <button type="button" onClick={onCerrar} className="p-1.5 rounded-md hover:bg-slate-200 text-slate-500" title="Cerrar" data-prueba="cerrar-avisos"><X className="w-5 h-5" /></button>}
        </div>
        <div className="px-3 pb-2 space-y-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {chip('', 'Todo', total)}
            {Object.entries(TIPOS).filter(([id]) => contar[id]).map(([id, t]) => chip(id, t, contar[id]))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar cliente, número…" data-prueba="avisos-buscar"
                className="w-full h-8 pl-8 pr-2 text-xs border border-slate-200 rounded-md bg-white" />
            </div>
            {nAnulados > 0 && (
              <button type="button" onClick={() => setVerAnulados((v) => !v)} className={`${btn} ${verAnulados ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`} data-prueba="avisos-ver-anulados">
                <EyeOff className="w-3 h-3" />{verAnulados ? 'Volver' : `Anulados (${nAnulados})`}
              </button>
            )}
          </div>
          {mensaje && <p className="text-[11px] text-slate-600 bg-white border rounded px-2 py-1" role="status">{mensaje}</p>}
        </div>
      </div>

      {/* Solo esta parte se desplaza */}
      <div ref={listaRef} className="flex-1 overflow-y-auto min-h-0" data-prueba="lista-avisos">
        {avisos === null && <p className="text-center text-sm text-slate-400 py-10 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Cargando…</p>}
        {avisos && visibles.length === 0 && (
          <div className="text-center py-14 text-slate-400">
            <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" />
            <p className="text-sm font-medium">{verAnulados ? 'No hay avisos anulados' : tipo || texto ? 'Nada con ese filtro' : 'Sin tareas ni avisos pendientes'}</p>
          </div>
        )}
        {visibles.map((a) => (
          <div key={a.id} className={`border-l-4 border-b px-3 py-2.5 ${COLOR[a.nivel]} ${verAnulados ? 'opacity-70' : ''}`} data-prueba="aviso">
            <div className="flex items-start gap-2">
              {a.nivel === 'rojo' && <AlertTriangle className="w-4 h-4 mt-0.5 text-red-500 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold break-words">{a.titulo}</p>
                <p className="text-xs text-slate-500 mt-0.5 break-words">{a.detalle}</p>
              </div>
              <span className={`text-[10px] rounded-full px-2 py-0.5 whitespace-nowrap ${ETIQUETA[a.nivel]}`}>{TIPOS[a.tipo]?.split(' ')[0]}{a.dias > 0 ? ` · ${a.dias}d` : ''}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {a.acciones.map((x) => (
                <button key={x.id} type="button" disabled={!!trabajando} onClick={() => hacer(a, x)} data-prueba={`accion-${x.id}`}
                  className={`${btn} ${x.peligro ? 'border-red-200 text-red-700 bg-white hover:bg-red-50' : 'border-emerald-200 text-emerald-700 bg-white hover:bg-emerald-50'}`}>
                  {trabajando === `${a.id}|${x.id}` && <Loader2 className="w-3 h-3 animate-spin" />}{x.texto}
                </button>
              ))}
              <Link to={createPageUrl(a.pagina)} onClick={onCerrar} className={`${btn} border-blue-200 text-blue-700 bg-white hover:bg-blue-50`} data-prueba="accion-abrir"><ExternalLink className="w-3 h-3" />Abrir para cambiar</Link>
              {a.contactId && <Link to={createPageUrl(`ContactDetail?id=${a.contactId}`)} onClick={onCerrar} className={`${btn} border-slate-200 text-slate-600 bg-white hover:bg-slate-50`}><User className="w-3 h-3" />Ficha</Link>}
              {a.mensaje && <button type="button" onClick={() => whatsapp(a)} className={`${btn} border-green-200 text-green-700 bg-white hover:bg-green-50`}><MessageCircle className="w-3 h-3" />WhatsApp</button>}
              {verAnulados
                ? <button type="button" onClick={() => restaurar(a)} className={`${btn} border-slate-200 text-slate-600 bg-white`} data-prueba="accion-restaurar"><Undo2 className="w-3 h-3" />Restaurar aviso</button>
                : <button type="button" onClick={() => anular(a)} className={`${btn} border-slate-200 text-slate-500 bg-white hover:bg-slate-100`} data-prueba="accion-descartar" title="Quita este aviso de la lista (no cambia el documento)"><EyeOff className="w-3 h-3" />Quitar aviso</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
