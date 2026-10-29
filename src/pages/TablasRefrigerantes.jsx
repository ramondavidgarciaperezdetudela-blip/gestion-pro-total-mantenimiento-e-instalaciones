import { useState } from 'react';
import NavBar from '@/components/NavBar';
import { REFRIGERANT_DATABASE, estadoRefrigerante } from '@/components/refrigerantData';
import { GASES, tablaPT } from '@/lib/presionesRefrigerante';
import { Input } from '@/components/ui/input';
import { CalendarClock, Gauge } from 'lucide-react';

// Tabla de Presión (manómetro) vs Temperatura de saturación. Los valores NO están tecleados: salen de las
// propiedades de cada gas calculadas con CoolProp (ver lib/saturacion.js). En las mezclas con deslizamiento
// (R-407C, R-448A, R-449A…) hay dos filas: burbuja (líquido) y rocío (vapor).
const PT_TEMPS = [-40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60];
const PT_FILAS = GASES.flatMap((g) => {
  const porT = new Map(tablaPT(g.id, { desde: PT_TEMPS[0], hasta: PT_TEMPS[PT_TEMPS.length - 1], paso: 10 }).map((f) => [f.t, f]));
  const fila = (punto, etiqueta) => ({
    clave: `${g.id}-${punto}`,
    gas: g,
    etiqueta,
    valores: PT_TEMPS.map((t) => porT.get(t)?.[punto] ?? null),
  });
  return g.zeotropo ? [fila('burbuja', 'burbuja'), fila('rocio', 'rocío')] : [fila('burbuja', null)];
});

const nf = (n, d) => {
  const f = 10 ** d;
  const r = Math.round(Number(n) * f) / f + 0; // sin «−0,0»
  return r.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
};

export default function TablasRefrigerantes() {
  const [tab, setTab] = useState('prohibiciones');
  const [unidad, setUnidad] = useState('bar'); // bar | psi
  const [busca, setBusca] = useState('');
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
          <div className="bg-white rounded-xl shadow p-4" data-prueba="tabla-pt-general">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1">
              <Gauge className="w-4 h-4 text-blue-600" />📊 Tabla de Presión vs Temperatura de {GASES.length} gases refrigerantes ❄️🔧
            </p>
            <p className="text-[11px] text-slate-500 mb-2">
              Presión <b>de manómetro</b> a cada temperatura de saturación (°C). Calculada con las ecuaciones de estado de
              referencia (CoolProp), no tecleada a mano. Para el detalle de un gas, de 5 en 5 K y con los bar absolutos,
              usa «Presiones de trabajo».
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Input
                data-prueba="pt-buscar"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar gas…"
                className="max-w-[220px] h-8 text-xs"
              />
              <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
                {[['bar', 'bar'], ['psi', 'psi']].map(([k, l]) => (
                  <button
                    key={k}
                    data-prueba={`pt-unidad-${k}`}
                    onClick={() => setUnidad(k)}
                    className={`px-3 py-1 font-medium ${unidad === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                  >{l}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full max-w-none text-[11px] border-collapse">
                <thead>
                  <tr className="text-center text-slate-500 border-b">
                    <th className="p-1.5 text-left sticky left-0 bg-white whitespace-nowrap">Gas \ °C</th>
                    {PT_TEMPS.map((t) => <th key={t} className="p-1.5 whitespace-nowrap">{String(t).replace('-', '−')}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {PT_FILAS.filter((f) => f.gas.id.toLowerCase().includes(busca.trim().toLowerCase())).map((f) => (
                    <tr key={f.clave} className="border-b hover:bg-blue-50/40">
                      <td className="p-1.5 font-bold text-left sticky left-0 bg-white whitespace-nowrap">
                        {f.gas.id}{f.gas.estado === 'prohibido' ? ' ⛔' : ''}
                        {f.etiqueta && <span className="ml-1 font-normal text-slate-400">{f.etiqueta}</span>}
                      </td>
                      {f.valores.map((m, i) => {
                        if (!m) return <td key={i} className="p-1.5 text-center text-slate-300">—</td>;
                        const v = unidad === 'psi' ? m.psi : m.relativa;
                        return (
                          <td key={i} className={`p-1.5 text-center tabular-nums whitespace-nowrap ${v < -0.05 ? 'text-slate-400' : 'text-slate-700'}`}>
                            {nf(v, unidad === 'psi' ? 0 : 1)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Los valores negativos indican <b>vacío</b> (presión por debajo de la atmosférica); «—» = fuera de la tabla del gas
              (el CO₂ llega a 25 °C, porque su punto crítico está en 31 °C). En las mezclas con deslizamiento (R-407C, R-448A, R-449A…)
              hay dos filas: <b>burbuja</b> (líquido, para el subenfriamiento) y <b>rocío</b> (vapor, para el recalentamiento y la presión
              de evaporación).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
