import { useEffect, useState } from 'react';
import { Download, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { suscribirDescargas, cancelarTarea, cerrarTarea } from '@/lib/descargas';

// Barra flotante con el porcentaje de cualquier descarga en curso. Se ve en
// todas las pantallas y documentos, y desaparece sola al terminar.
export default function DescargasGlobal() {
  const [tareas, setTareas] = useState([]);
  useEffect(() => suscribirDescargas(setTareas), []);
  if (!tareas.length) return null;
  return (
    <div className="fixed bottom-4 left-4 z-[95] flex flex-col gap-2 w-72 max-w-[calc(100vw-2rem)] print:hidden" data-testid="descargas-global">
      {tareas.map((t) => (
        <div key={t.id} className="bg-white rounded-xl shadow-lg border border-slate-200 px-3 py-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            {t.estado === 'hecha' ? <CheckCircle2 className="w-4 h-4 text-green-600" />
              : t.estado === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" />
              : <Download className="w-4 h-4 text-blue-600 animate-pulse" />}
            <span className="truncate flex-1">{t.titulo}</span>
            <span className="tabular-nums text-xs">{t.pct}%</span>
            {t.estado === 'activa'
              ? <button aria-label="Cancelar" onClick={() => cancelarTarea(t.id)}><X className="w-4 h-4 text-slate-400" /></button>
              : t.estado === 'error' && <button aria-label="Cerrar" onClick={() => cerrarTarea(t.id)}><X className="w-4 h-4 text-slate-400" /></button>}
          </div>
          {t.mensaje && <p className="text-xs text-slate-500 truncate">{t.mensaje}</p>}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
            <div className={`h-full transition-all ${t.estado === 'error' ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${t.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
