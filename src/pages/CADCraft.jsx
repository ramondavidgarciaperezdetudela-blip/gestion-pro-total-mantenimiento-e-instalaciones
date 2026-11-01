import { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, PenTool, RefreshCw, Maximize2, X } from 'lucide-react';

// CADCraft (CAD libre) para cualquier tipo de plano, sin depender del plano frigorífico.
// Escritorio: programa completo instalado. Móvil y tableta (APK/web): versión web incluida.
const RUTA_WEB = `${import.meta.env.BASE_URL || '/'}cadcraft/index.html`.replace('//', '/');

export default function CADCraft() {
  const puente = typeof window !== 'undefined' ? window.gptCadcraft : null;
  const [escritorio, setEscritorio] = useState(false);
  const [webOk, setWebOk] = useState(false);
  const [verWeb, setVerWeb] = useState(false);
  const [estado, setEstado] = useState(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    puente?.disponible?.().then(setEscritorio).catch(() => {});
    fetch(`${RUTA_WEB.replace('index.html', 'listo.txt')}`).then((r) => r.text()).then((t) => setWebOk(t.trim() === 'ok')).catch(() => setWebOk(false));
    puente?.comprobar?.().then(setEstado).catch(() => {});
  }, [puente]);

  const abrir = async () => {
    const r = await puente.abrirLibre({});
    if (!r?.ok) toast.error(r?.error || 'No se pudo abrir CADCraft');
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
          <Button size="sm" variant="secondary" onClick={() => setVerWeb(false)}><X className="w-4 h-4 mr-1" />Cerrar</Button>
        </div>
        <iframe title="CADCraft" src={RUTA_WEB} className="flex-1 w-full border-0" allow="fullscreen; clipboard-read; clipboard-write" />
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
            <p className="text-xs text-slate-500">En móvil la versión es web: se usa con el dedo, y para guardar tus dibujos usa las opciones de guardar/abrir de CADCraft.</p>
          </div>
        )}
      </div>
    </div>
  );
}
