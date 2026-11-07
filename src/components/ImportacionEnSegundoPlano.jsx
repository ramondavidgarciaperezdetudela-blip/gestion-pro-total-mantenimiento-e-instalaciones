import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';
import { leerImportacion, suscribirImportacion, segundosRestantes, textoTiempo } from '@/lib/importacionFondo';

/** Panel fijo abajo a la derecha con el avance de la importación que sigue en segundo plano. */
export default function ImportacionEnSegundoPlano() {
  const st = useSyncExternalStore(suscribirImportacion, leerImportacion, leerImportacion);
  const [, setTic] = useState(0);
  useEffect(() => {
    if (!st.activa) return undefined;
    const t = setInterval(() => setTic((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [st.activa]);
  if (!st.activa) return null;
  const gastado = Math.round((Date.now() - st.inicio) / 1000);
  const resta = segundosRestantes(st.pct, st.inicio);
  return (
    <div className="fixed bottom-4 right-4 z-[10050] w-72 rounded-xl border border-purple-200 bg-white shadow-xl p-3 text-xs" role="status" data-prueba="importacion-fondo">
      <div className="flex items-center gap-2 mb-1.5">
        <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
        <span className="font-semibold text-purple-800 flex-1 truncate">{st.titulo}</span>
        <span className="font-bold text-purple-700 tabular-nums">{st.pct}%</span>
      </div>
      <div className="w-full bg-purple-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${st.pct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-purple-700">
        <span className="truncate">{st.detalle}</span>
        <span className="tabular-nums shrink-0 ml-2">{textoTiempo(gastado)}{resta != null ? ` · quedan ~${textoTiempo(resta)}` : ''}</span>
      </div>
    </div>
  );
}
