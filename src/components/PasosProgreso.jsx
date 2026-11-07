import React from 'react';
import { CheckCircle, AlertCircle, Loader2, Circle } from 'lucide-react';

/**
 * Progreso por apartados (como el de la copia de seguridad): cada paso con su barra,
 * su contador y su porcentaje. pasos = [{ id, label, fase: 'espera'|'activo'|'hecho'|'fallo', hechos, total }]
 */
export function porcentajePaso(p) {
  if (p.fase === 'hecho') return 100;
  if (!p.total) return p.fase === 'activo' ? null : 0;
  return Math.min(100, Math.round(((p.hechos || 0) / p.total) * 100));
}

export default function PasosProgreso({ pasos = [] }) {
  if (!pasos.length) return null;
  return (
    <div className="mt-3 border rounded-lg p-2.5 space-y-1.5 bg-white/70" data-prueba="pasos-progreso">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progreso por apartado</p>
      {pasos.map((p) => {
        const pct = porcentajePaso(p);
        return (
          <div key={p.id} className="flex items-center gap-2 text-xs" data-prueba={`paso-${p.id}`}>
            <span className="w-3.5 flex-shrink-0 flex justify-center">
              {p.fase === 'hecho' ? <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                : p.fase === 'fallo' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  : p.fase === 'activo' ? <Loader2 className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                    : <Circle className="w-3.5 h-3.5 text-slate-300" />}
            </span>
            <span className="w-40 truncate text-slate-700" title={p.label}>{p.label}</span>
            <span className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <span className="block h-full bg-purple-600 transition-all duration-300" style={{ width: `${pct ?? 0}%` }} />
            </span>
            <span className="tabular-nums text-slate-500 w-24 text-right flex-shrink-0">
              {p.total != null ? `${(p.hechos || 0).toLocaleString()}/${p.total.toLocaleString()}` : p.fase === 'hecho' ? 'hecho' : ''}
            </span>
            <span className="tabular-nums font-medium text-slate-700 w-10 text-right flex-shrink-0">{pct != null ? `${pct}%` : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
