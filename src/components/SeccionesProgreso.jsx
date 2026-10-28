import { useEffect, useState } from 'react';
import { subscribeBackupState, getBackupState } from '@/lib/backupEngine';
import { CheckCircle, AlertCircle, Loader2, Ban } from 'lucide-react';

/** Texto corto para cada fase de una sección. */
const FASE_LABEL = {
  leyendo: 'leyendo…',
  preparando: 'preparando…',
  borrando: 'borrando…',
  guardando: 'guardando…',
  hecho: 'hecho',
  omitida: 'omitida',
  fallo: 'fallo',
};

/**
 * Muestra el progreso de CADA sección mientras se hace una copia o una
 * restauración: cuántos registros lleva leídos/guardados de cada apartado y en
 * qué fase está. Se suscribe sola al estado global del motor, así que basta
 * con soltarla donde se quiera ver y se oculta cuando no hay nada en curso.
 */
export default function SeccionesProgreso() {
  const [st, setSt] = useState(() => getBackupState());

  useEffect(() => subscribeBackupState(setSt), []);

  if (!st.active) return null;
  const entradas = Object.entries(st.secciones || {});
  if (entradas.length === 0) return null;

  return (
    <div className="mt-3 border rounded-lg p-2.5 space-y-1 bg-slate-50/70 max-h-56 overflow-y-auto">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progreso por sección</p>
      {entradas.map(([ent, s]) => {
        const total = s.total;
        const leidos = s.leidos || 0;
        const pct = total ? Math.min(100, Math.round((leidos / total) * 100)) : null;
        return (
          <div key={ent} className="flex items-center gap-2 text-xs">
            <span className="w-3.5 flex-shrink-0 flex justify-center">
              {s.fase === 'hecho'
                ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                : s.fase === 'fallo'
                  ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  : s.fase === 'omitida'
                    ? <Ban className="w-3.5 h-3.5 text-amber-500" />
                    : <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
            </span>
            <span className="flex-1 truncate text-slate-700" title={s.label || ent}>{s.label || ent}</span>
            {pct != null && s.fase !== 'hecho' && s.fase !== 'fallo' && s.fase !== 'omitida' && (
              <span className="w-14 h-1.5 bg-slate-200 rounded-full overflow-hidden flex-shrink-0">
                <span className="block h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
              </span>
            )}
            <span className="tabular text-slate-500 flex-shrink-0 w-20 text-right">
              {total != null
                ? `${leidos.toLocaleString()}/${total.toLocaleString()}`
                : `${leidos.toLocaleString()} leídos`}
            </span>
            <span className="text-[10px] text-slate-400 w-16 text-right flex-shrink-0">{FASE_LABEL[s.fase] || s.fase}</span>
          </div>
        );
      })}
    </div>
  );
}