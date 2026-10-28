import { useEffect, useRef, useState } from 'react';
import { Clock, Timer } from 'lucide-react';

/** "1:23" o "0:45:09" — sin horas cuando cabe en minutos. */
function fmt(ms) {
  if (!ms || ms < 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
  return `${m}:${String(seg).padStart(2, '0')}`;
}

/**
 * Muestra el porcentaje, el tiempo activo y el restante estimado de un trabajo
 * de copia o restauración. Lo único que necesita es si está activo y el
 * porcentaje actual (0-100).
 *
 * El tiempo restante se estima a partir del ritmo llevado: lo que ha tardado en
 * llegar hasta aquí, proporcional a lo que queda. Al principio (menos del 1%)
 * no se puede saber, así que se pone "calculando…".
 */
export default function CronoProgreso({ active, pct }) {
  const inicioRef = useRef(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (active && !inicioRef.current) inicioRef.current = Date.now();
    if (!active) inicioRef.current = null;
  }, [active]);

  // Un tic por segundo para que el reloj avance aunque el porcentaje no cambien.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;
  const p = Math.max(0, Math.min(100, pct || 0));
  const transcurrido = inicioRef.current ? Date.now() - inicioRef.current : 0;
  const restante = p > 1 ? (transcurrido / p) * (100 - p) : null;

  return (
    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#475569' }}>
      <span className="font-semibold tabular" style={{ color: '#1e40af' }}>{p}%</span>
      <span className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" />
        <span className="tabular">{fmt(transcurrido)}</span>
      </span>
      <span className="flex items-center gap-1">
        <Timer className="w-3.5 h-3.5" />
        {restante == null
          ? <span style={{ color: '#94a3b8' }}>calculando…</span>
          : <span className="tabular">~{fmt(restante)}</span>}
      </span>
    </div>
  );
}