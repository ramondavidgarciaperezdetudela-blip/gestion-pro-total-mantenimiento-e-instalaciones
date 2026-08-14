import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { subscribeBackupState } from '@/lib/backupEngine';

// Aviso flotante y discreto: se muestra en CUALQUIER pantalla mientras una
// copia de seguridad o restauración sigue corriendo en segundo plano, para
// que no haga falta quedarse en Copias de Seguridad esperando a que termine.
export default function BackupProgressIndicator() {
  const [state, setState] = useState({ active: false, kind: null, message: '', pct: 0 });

  useEffect(() => subscribeBackupState(setState), []);

  if (!state.active) return null;

  const label = state.kind === 'restore' ? 'Restaurando copia de seguridad' : 'Haciendo copia de seguridad';

  return (
    <div className="fixed bottom-4 right-4 z-[90] bg-white rounded-xl shadow-lg border border-slate-200 px-4 py-3 w-72 print:hidden">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
        {label}
      </div>
      <p className="text-xs text-slate-500 mt-1 truncate">{state.message}</p>
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
        <div className="h-full bg-blue-600 transition-all" style={{ width: `${state.pct}%` }} />
      </div>
      <p className="text-[10px] text-slate-400 mt-1">Puedes seguir usando el programa mientras termina.</p>
    </div>
  );
}
