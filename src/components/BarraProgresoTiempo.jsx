import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { formatearTiempo, estimarRestante } from '@/lib/progresoTiempo';

/** Barra con porcentaje, tiempo transcurrido y tiempo restante estimado. */
export default function BarraProgresoTiempo({ avance, inicio, terminado = false }) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    if (terminado) return undefined;
    const t = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(t);
  }, [terminado]);
  const a = Math.min(1, Math.max(0, avance || 0));
  const seg = Math.max(0, ((terminado ? ahora : ahora) - inicio) / 1000);
  const restante = estimarRestante(a, seg);
  return (
    <div className="space-y-1" data-prueba="barra-progreso">
      <Progress value={a * 100} className="h-3" />
      <div className="flex justify-between text-xs text-slate-600">
        <span data-prueba="progreso-porcentaje" className="font-semibold">{Math.floor(a * 100)} %</span>
        <span data-prueba="progreso-transcurrido">Transcurrido: {formatearTiempo(seg)}</span>
        <span data-prueba="progreso-restante">{terminado ? 'Terminado' : `Restante: ${restante === null ? 'calculando…' : formatearTiempo(restante)}`}</span>
      </div>
    </div>
  );
}
