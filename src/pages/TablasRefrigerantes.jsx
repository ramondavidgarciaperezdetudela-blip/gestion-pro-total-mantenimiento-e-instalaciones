import { useState } from 'react';
import NavBar from '@/components/NavBar';
import { REFRIGERANT_DATABASE, estadoRefrigerante } from '@/components/refrigerantData';
import { CalendarClock, Gauge } from 'lucide-react';

// Tabla de Presión (manométrica, bar) vs Temperatura de saturación (°C) — ORIENTATIVA.
// Para valores exactos, usar la app del fabricante (Danfoss Ref Tool / Coolpack).
const PT_TEMPS = [-40, -30, -20, -10, 0, 10, 20, 30, 40, 50];
const PT_TABLE = {
  'R-410A': [0.8, 1.7, 3.0, 4.7, 7.0, 9.9, 13.7, 18.4, 23.5, 29.7],
  'R-32':   [0.9, 1.8, 3.2, 5.0, 7.4, 10.5, 14.5, 19.4, 25.4, 32.0],
  'R-134a': [-0.5, -0.1, 0.3, 1.0, 1.9, 3.2, 4.7, 6.7, 9.2, 12.2],
  'R-404A': [0.3, 1.0, 2.0, 3.3, 5.1, 7.2, 9.9, 13.1, 17.2, 22.0],
  'R-407C': [0.2, 1.1, 2.3, 3.8, 5.6, 7.9, 10.8, 14.3, 18.6, 23.7],
  'R-448A': [0.2, 1.0, 2.1, 3.4, 5.2, 7.4, 10.1, 13.4, 17.5, 22.4],
  'R-449A': [0.2, 1.0, 2.1, 3.4, 5.2, 7.4, 10.1, 13.4, 17.5, 22.4],
  'R-452A': [0.3, 1.1, 2.2, 3.6, 5.4, 7.6, 10.4, 13.8, 18.0, 23.0],
  'R-22':   [0.05, 0.6, 1.45, 2.5, 4.0, 5.8, 8.1, 10.9, 14.3, 18.4],
  'R-290':  [-0.1, 0.6, 1.6, 2.9, 4.7, 6.9, 9.6, 12.9, 16.8, 21.4],
  'R-507A': [0.4, 1.2, 2.3, 3.7, 5.5, 7.8, 10.6, 14.0, 18.3, 23.3],
  'R-1234yf': [-0.4, 0.0, 0.5, 1.3, 2.3, 3.7, 5.4, 7.5, 10.1, 13.2],
};

export default function TablasRefrigerantes() {
  const [tab, setTab] = useState('prohibiciones');
  const prohibidos = REFRIGERANT_DATABASE.filter(r => estadoRefrigerante(r.code).prohibido);
  const vigentes = REFRIGERANT_DATABASE.filter(r => !estadoRefrigerante(r.code).prohibido);

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Tablas de refrigerantes" />
      <div className="max-w-4xl mx-auto px-3 py-3 space-y-3">
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow text-sm">
          {[['prohibiciones', '📅 Prohibición por fechas'], ['pt', '📊 Presión vs Temperatura']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 font-medium ${tab === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{l}</button>
          ))}
        </div>

        {tab === 'prohibiciones' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-2"><CalendarClock className="w-4 h-4 text-red-600" />Gases prohibidos / restringidos por fecha</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="p-1.5">Gas</th><th className="p-1.5">Tipo</th><th className="p-1.5">Fecha prohibición</th>
                      <th className="p-1.5">Estado</th><th className="p-1.5">Reciclado</th><th className="p-1.5">GWP</th><th className="p-1.5">Sustituto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prohibidos.map(r => {
                      const e = estadoRefrigerante(r.code);
                      return (
                        <tr key={r.code} className="border-b bg-red-50/50">
                          <td className="p-1.5 font-bold text-red-700">{r.code} ⛔</td>
                          <td className="p-1.5">{r.type}</td>
                          <td className="p-1.5 font-semibold">{r.fgas_ban_date ? new Date(r.fgas_ban_date).toLocaleDateString('es-ES') : '—'}</td>
                          <td className="p-1.5">{r.fgas_status || '—'}</td>
                          <td className="p-1.5">{e.reciclado === 'solo' ? 'Solo reciclado/regenerado' : 'No permitido'}</td>
                          <td className="p-1.5">{r.gwp}</td>
                          <td className="p-1.5">{r.replacement || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">⛔ Prohibido. «Solo reciclado» = únicamente gas recuperado/regenerado para mantener equipos existentes (gas virgen prohibido). Fechas según normativa F-Gas / Protocolo de Montreal.</p>
            </div>

            <div className="bg-white rounded-xl shadow p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Gases vigentes (permitidos)</p>
              <div className="flex flex-wrap gap-1.5">
                {vigentes.map(r => (
                  <span key={r.code} className="text-[11px] bg-green-50 border border-green-200 text-green-800 rounded-full px-2 py-1">{r.code} · GWP {r.gwp}</span>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Los HFC de alto GWP (R-404A, R-410A, R-134a…) están permitidos pero con cupos F-Gas decrecientes; conviene planificar su sustitución.</p>
            </div>
          </div>
        )}

        {tab === 'pt' && (
          <div className="bg-white rounded-xl shadow p-4">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-blue-600" />📊 Tabla de Presión vs Temperatura de Gases Refrigerantes ❄️🔧
            </p>
            <p className="text-[11px] text-slate-500 mb-2">Presión <b>manométrica (bar)</b> a cada temperatura de saturación (°C). Valores <b>orientativos</b>; para exactitud usa la <b>Regla de Refrigerantes / Danfoss Ref Tool</b>.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-center text-slate-500 border-b">
                    <th className="p-1.5 text-left sticky left-0 bg-white">Gas \ °C</th>
                    {PT_TEMPS.map(t => <th key={t} className="p-1.5">{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(PT_TABLE).map(([g, vals]) => (
                    <tr key={g} className="border-b hover:bg-blue-50/40">
                      <td className="p-1.5 font-bold text-left sticky left-0 bg-white">{g}{estadoRefrigerante(g).prohibido ? ' ⛔' : ''}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={`p-1.5 text-center ${v < 0 ? 'text-slate-400' : 'text-slate-700'}`}>{v < 0 ? `${v} (vac.)` : v.toFixed(1)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Los valores negativos indican <b>vacío</b> (presión por debajo de la atmosférica). En mezclas con deslizamiento (R-407C, R-448A/449A…) es un valor medio orientativo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
