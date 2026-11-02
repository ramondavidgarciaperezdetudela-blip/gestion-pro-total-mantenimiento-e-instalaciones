import { useEffect, useRef, useState, useCallback } from 'react';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, PenTool, RefreshCw, Maximize2, X, FolderOpen, Share2, Trash2 } from 'lucide-react';
import { guardarPlano, compartirPlano, listarPlanos, borrarPlano } from '@/lib/planosCadcraft';

// CADCraft (CAD libre) para cualquier tipo de plano, sin depender del plano frigorífico.
// Escritorio: programa completo instalado. Móvil y tableta (APK/web): versión web incluida.
const RUTA_WEB = `${import.meta.env.BASE_URL || '/'}cadcraft/index.html`.replace('//', '/');
// ?host=parent: CADCraft nos manda los planos que guarda para que los guardemos de verdad en el móvil.
const RUTA_IFRAME = `${RUTA_WEB}?host=parent`;

export default function CADCraft() {
  const puente = typeof window !== 'undefined' ? window.gptCadcraft : null;
  const [escritorio, setEscritorio] = useState(false);
  const [webOk, setWebOk] = useState(false);
  const [verWeb, setVerWeb] = useState(false);
  const [estado, setEstado] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [sinGuardar, setSinGuardar] = useState(false);
  const marco = useRef(null);
  const pendiente = useRef(null);
  const selector = useRef(null);

  const refrescarPlanos = useCallback(() => { listarPlanos().then(setPlanos); }, []);
  useEffect(() => { refrescarPlanos(); }, [refrescarPlanos]);

  const enviarAlMarco = useCallback((nombre, bytes) => {
    const ventana = marco.current?.contentWindow;
    if (!ventana) return false;
    ventana.postMessage({ type: 'cadcraft:open', name: nombre, bytes }, window.location.origin);
    return true;
  }, []);

  // Mensajes de CADCraft: listo, guardar, cambios sin guardar.
  useEffect(() => {
    const alRecibir = async (e) => {
      if (e.origin !== window.location.origin || e.source !== marco.current?.contentWindow) return;
      const d = e.data || {};
      if (d.type === 'cadcraft:ready') {
        if (pendiente.current) { enviarAlMarco(pendiente.current.nombre, pendiente.current.bytes); pendiente.current = null; }
      } else if (d.type === 'cadcraft:dirty') {
        setSinGuardar(!!d.dirty);
      } else if (d.type === 'cadcraft:failed') {
        toast.error('CADCraft no pudo arrancar en este dispositivo', { description: String(d.error || '') });
      } else if (d.type === 'cadcraft:save') {
        try {
          const r = await guardarPlano(d.name, d.bytes);
          toast.success(`Plano guardado: ${r.nombre}`, {
            description: `En ${r.donde}`,
            action: r.uri ? { label: 'Compartir', onClick: () => compartirPlano(r.nombre, r.uri).catch(() => {}) } : undefined,
          });
          refrescarPlanos();
        } catch (err) {
          toast.error('No se pudo guardar el plano', { description: err?.message || String(err) });
        }
      }
    };
    window.addEventListener('message', alRecibir);
    return () => window.removeEventListener('message', alRecibir);
  }, [enviarAlMarco, refrescarPlanos]);

  const abrirPlano = (nombre, bytes) => {
    pendiente.current = { nombre, bytes: bytes.slice ? bytes.slice(0) : bytes };
    if (verWeb && enviarAlMarco(nombre, pendiente.current.bytes)) pendiente.current = null;
    else setVerWeb(true);
  };
  const alElegirArchivo = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) abrirPlano(f.name, await f.arrayBuffer());
  };
  const cerrarWeb = () => {
    if (sinGuardar && !window.confirm('Hay cambios sin guardar en el plano. ¿Cerrar CADCraft igualmente?')) return;
    setSinGuardar(false);
    setVerWeb(false);
  };

  useEffect(() => {
    puente?.disponible?.().then(setEscritorio).catch(() => {});
    fetch(`${RUTA_WEB.replace('index.html', 'listo.txt')}`).then((r) => r.text()).then((t) => setWebOk(t.trim() === 'ok')).catch(() => setWebOk(false));
    puente?.comprobar?.().then(setEstado).catch(() => {});
  }, [puente]);

  const abrir = async () => {
    const r = await puente.abrirLibre({});
    if (!r?.ok) toast.error(r?.error || 'No se pudo abrir CADCraft');
    else if (r.actualizado) toast.success('CADCraft se ha actualizado solo', { description: 'Tus dibujos, ajustes y comandos propios se han conservado.' });
  };
  const actualizar = async () => {
    setTrabajando(true);
    try {
      const r = await puente.actualizar();
      if (!r?.ok) toast.error(r?.error || 'No se pudo actualizar');
      else if (r.actualizado) toast.success('CADCraft actualizado', { description: 'Tus dibujos, ajustes y comandos propios se han conservado.' });
      else toast.message('CADCraft ya está al día');
      setEstado(await puente.comprobar());
    } finally { setTrabajando(false); }
  };

  if (verWeb) {
    return (
      <div className="fixed inset-0 z-50 bg-[#22282f] flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 bg-slate-900 text-white text-sm">
          <span className="flex items-center gap-2"><PenTool className="w-4 h-4" /> CADCraft</span>
          <Button size="sm" variant="secondary" onClick={cerrarWeb}><X className="w-4 h-4 mr-1" />Cerrar</Button>
        </div>
        <iframe ref={marco} title="CADCraft" src={RUTA_IFRAME} className="flex-1 w-full border-0 touch-none" allow="fullscreen; clipboard-read; clipboard-write" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="CADCraft" />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <p className="text-sm text-slate-600">
          CADCraft es un programa de dibujo CAD libre y gratuito. Úsalo para cualquier tipo de plano: arquitectura, instalaciones eléctricas, solar, frigoríficos…
          No necesitas abrir antes un plano frigorífico.
        </p>
        {escritorio && (
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="font-semibold">En este ordenador</h2>
            <Button onClick={abrir} className="w-full"><PenTool className="w-4 h-4 mr-2" />Abrir CADCraft</Button>
            <p className="text-xs text-slate-500">Cada vez que lo abres desde aquí se instala solo la última versión, si hay una nueva.</p>
            <div className="text-xs text-slate-500">
              {estado?.sinPublicar ? 'Aún no hay actualizaciones publicadas.' : estado?.ok ? (estado.hayNueva ? 'Hay una versión nueva de CADCraft.' : 'CADCraft está al día.') : (estado?.error || 'Comprobando…')}
            </div>
            <Button variant="outline" onClick={actualizar} disabled={trabajando || !estado?.hayNueva} className="w-full">
              {trabajando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}Actualizar CADCraft
            </Button>
            <p className="text-xs text-slate-500">La actualización mantiene tus dibujos, ajustes y comandos propios. Si cambiaste una rutina nuestra, tu versión se respeta y la nueva se guarda al lado con la terminación «.nuevo».</p>
          </div>
        )}
        {!escritorio && (
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <h2 className="font-semibold">En móvil y tableta</h2>
            {webOk ? (
              <Button onClick={() => setVerWeb(true)} className="w-full"><Maximize2 className="w-4 h-4 mr-2" />Abrir CADCraft</Button>
            ) : (
              <p className="text-sm text-amber-700">La versión web de CADCraft no está incluida en esta compilación todavía.</p>
            )}
            <p className="text-xs text-slate-500">Se maneja con el dedo: un dedo dibuja o selecciona, dos dedos acercan y mueven el plano. Al guardar (Archivo › Guardar) el plano queda en Documentos/CADCraft del dispositivo y en «Mis planos».</p>
            <input ref={selector} type="file" accept=".dxf,.dwg,.dws,.dwt" className="hidden" onChange={alElegirArchivo} />
            {webOk && (
              <Button variant="outline" onClick={() => selector.current?.click()} className="w-full"><FolderOpen className="w-4 h-4 mr-2" />Abrir un plano del dispositivo</Button>
            )}
          </div>
        )}
        {!escritorio && planos.length > 0 && (
          <div className="rounded-xl border bg-white p-4 space-y-2">
            <h2 className="font-semibold">Mis planos</h2>
            {planos.map((p) => (
              <div key={p.nombre} className="flex items-center gap-2 text-sm">
                <button type="button" className="flex-1 text-left truncate text-sky-700" onClick={() => abrirPlano(p.nombre, p.bytes)}>{p.nombre}</button>
                <span className="text-xs text-slate-400">{new Date(p.fecha).toLocaleDateString('es-ES')}</span>
                <Button size="icon" variant="ghost" title="Compartir" onClick={async () => { try { const r = await guardarPlano(p.nombre, p.bytes); if (r.uri) await compartirPlano(r.nombre, r.uri); } catch { /* cancelado */ } }}><Share2 className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" title="Borrar" onClick={async () => { if (window.confirm(`¿Borrar «${p.nombre}» de Mis planos?`)) { await borrarPlano(p.nombre); refrescarPlanos(); } }}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
