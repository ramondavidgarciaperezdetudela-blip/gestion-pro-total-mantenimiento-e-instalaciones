import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Droplets, Gauge, Ruler, Activity, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NumberField } from "@/components/ui/number-field";

// Tabla de presión de saturación (bar) por refrigerante y temperatura (°C)
const SAT = {
  'R-134a': { temps: [-20, -10, 0, 7, 10, 20, 30, 40, 50], p: [1.15, 1.92, 2.93, 3.88, 4.18, 5.72, 7.70, 10.17, 13.18], hfg: 217, color: '#f59e0b' },
  'R-404A': { temps: [-20, -10, 0, 7, 10, 20, 30, 40, 50], p: [3.12, 4.34, 5.95, 7.18, 7.66, 10.25, 13.43, 17.28, 21.88], hfg: 180, color: '#ef4444' },
  'R-410A': { temps: [-20, -10, 0, 7, 10, 20, 30, 40, 50], p: [4.97, 6.78, 9.04, 11.00, 11.61, 15.40, 20.10, 25.80, 32.80], hfg: 220, color: '#8b5cf6' },
  'R-32':   { temps: [-20, -10, 0, 7, 10, 20, 30, 40, 50], p: [4.61, 6.32, 8.49, 10.35, 10.93, 14.51, 18.93, 24.31, 30.75], hfg: 380, color: '#3b82f6' },
  'R-290':  { temps: [-20, -10, 0, 7, 10, 20, 30, 40, 50], p: [2.45, 3.44, 4.71, 5.92, 6.37, 8.43, 10.96, 13.99, 17.66], hfg: 420, color: '#10b981' },
  'R-22':   { temps: [-20, -10, 0, 7, 10, 20, 30, 40, 50], p: [2.45, 3.51, 4.98, 6.40, 6.81, 9.09, 11.91, 15.34, 19.42], hfg: 220, color: '#06b6d4' },
};

function interp(table, temps, T) {
  if (T <= temps[0]) return table[0];
  if (T >= temps[temps.length - 1]) return table[temps.length - 1];
  for (let i = 0; i < temps.length - 1; i++) {
    if (T >= temps[i] && T <= temps[i + 1]) {
      const f = (T - temps[i]) / (temps[i + 1] - temps[i]);
      return table[i] + f * (table[i + 1] - table[i]);
    }
  }
  return table[0];
}

function num(v, dec = 2) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? n.toFixed(dec) : '—';
}

const DIAMETERS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.5, 1.8, 2.0];

export default function CapillaryCalc() {
  const [refrigerant, setRefrigerant] = useState('R-134a');
  const [Te, setTe] = useState('');
  const [Tc, setTc] = useState('');
  const [capacity, setCapacity] = useState(''); // kW
  const [diameter, setDiameter] = useState(1.0); // mm

  const data = SAT[refrigerant];

  const result = useMemo(() => {
    if (!data) return null;
    const Pe = interp(data.p, data.temps, Te); // bar
    const Pc = interp(data.p, data.temps, Tc); // bar
    const dP = Math.max(0, Pc - Pe); // bar
    const dP_Pa = dP * 1e5;
    const hfg = data.hfg; // kJ/kg
    const mDot = capacity / hfg; // kg/s (Q kW / hfg kJ/kg)
    // Propiedades líquido aproximadas
    const rho_l = 1200; // kg/m3
    const mu = 2.1e-4;  // Pa·s
    const d_m = diameter / 1000;
    // Longitud Hagen-Poiseuille modificada con factor bífásico 0.3 (orientativo)
    const correction = 0.3;
    let L = 0;
    if (mDot > 0 && d_m > 0 && dP_Pa > 0) {
      L = (dP_Pa * rho_l * Math.PI * Math.pow(d_m, 4)) / (128 * mu * mDot) * correction;
    }
    // Velocidad líquido en el capilar
    const area = Math.PI * d_m * d_m / 4;
    const v = mDot > 0 && rho_l > 0 ? mDot / (rho_l * area) : 0;
    // Reynolds líquido
    const Re = rho_l * v * d_m / mu;
    return { Pe, Pc, dP, mDot, L, v, Re };
  }, [data, Te, Tc, capacity, diameter]);

  // Tabla de longitudes para varios diámetros
  const table = useMemo(() => {
    if (!data) return [];
    const Pe = interp(data.p, data.temps, Te);
    const Pc = interp(data.p, data.temps, Tc);
    const dP_Pa = Math.max(0, Pc - Pe) * 1e5;
    const hfg = data.hfg;
    const mDot = capacity / hfg;
    const rho_l = 1200, mu = 2.1e-4, correction = 0.3;
    return DIAMETERS.map(d => {
      const d_m = d / 1000;
      const L = mDot > 0 && dP_Pa > 0
        ? (dP_Pa * rho_l * Math.PI * Math.pow(d_m, 4)) / (128 * mu * mDot) * correction
        : 0;
      return { d, L };
    });
  }, [data, Te, Tc, capacity]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cálculo de Tubo Capilar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dimensionado orientativo de capilares para circuitos frigoríficos. Verifica siempre con la tabla del fabricante del compresor.
        </p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Refrigerante</label>
          <select
            value={refrigerant}
            onChange={e => setRefrigerant(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
          >
            {Object.keys(SAT).map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Droplets className="w-3 h-3" /> T evaporación (°C)</label>
          <NumberField value={Te} onChange={v => setTe(v)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Droplets className="w-3 h-3" /> T condensación (°C)</label>
          <NumberField value={Tc} onChange={v => setTc(v)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Potencia frigorífica (kW)</label>
          <NumberField value={capacity} onChange={v => setCapacity(v)} />
        </div>
      </div>

      {/* KPIs */}
      {result && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3" /> Presión evap.</p>
            <p className="text-xl font-bold mt-1" style={{ color: data.color }}>{num(result.Pe, 2)} bar</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3" /> Presión cond.</p>
            <p className="text-xl font-bold mt-1" style={{ color: data.color }}>{num(result.Pc, 2)} bar</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Gauge className="w-3 h-3" /> Salto ΔP</p>
            <p className="text-xl font-bold mt-1 text-foreground">{num(result.dP, 2)} bar</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Activity className="w-3 h-3" /> Caudal másico</p>
            <p className="text-xl font-bold mt-1 text-foreground">{num(result.mDot * 1000, 2)} g/s</p>
          </div>
        </div>
      )}

      {/* Resultado principal */}
      {result && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Diámetro seleccionado: {diameter.toFixed(2)} mm → Longitud estimada</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="rounded-xl px-4 py-3" style={{ background: 'hsl(var(--primary) / 0.12)' }}>
              <p className="text-3xl font-bold" style={{ color: data.color }}>{num(result.L, 2)} m</p>
              <p className="text-xs text-muted-foreground mt-0.5">Longitud de capilar (Ø {diameter.toFixed(2)} mm)</p>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Velocidad líquido inlet: <span className="font-semibold text-foreground">{num(result.v, 2)} m/s</span></p>
              <p>Reynolds (líquido): <span className="font-semibold text-foreground">{num(result.Re, 0)}</span></p>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs text-muted-foreground block mb-1">Ajustar diámetro interno del capilar (mm)</label>
            <input
              type="range"
              min={0.6}
              max={2.0}
              step={0.1}
              value={diameter}
              onChange={e => setDiameter(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
          </div>
        </div>
      )}

      {/* Gráfico: longitud estimada por diámetro (valores reales calculados) */}
      {result && table.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Longitud de capilar según diámetro interno ({refrigerant}, {num(capacity, 1)} kW)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={table} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
              <XAxis
                dataKey="d"
                tick={{ fontSize: 11 }}
                tickFormatter={v => v.toFixed(1)}
                label={{ value: 'Ø interno (mm)', position: 'insideBottom', offset: -2, fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 10 }} label={{ value: 'L (m)', angle: -90, position: 'insideLeft', fontSize: 11 }} />
              <Tooltip
                formatter={v => [`${num(v, 2)} m`, 'Longitud']}
                labelFormatter={l => `Ø ${Number(l).toFixed(2)} mm`}
              />
              <Bar dataKey="L" radius={[4, 4, 0, 0]}>
                {table.map(row => (
                  <Cell
                    key={row.d}
                    fill={row.d === diameter ? data.color : 'hsl(var(--muted-foreground))'}
                    fillOpacity={row.d === diameter ? 1 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-muted-foreground mt-1">
            La barra resaltada corresponde al diámetro seleccionado (Ø {diameter.toFixed(2)} mm → {num(result.L, 2)} m). La longitud crece con la cuarta potencia del diámetro.
          </p>
        </div>
      )}

      {/* Tabla comparativa */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-semibold text-foreground mb-3">Longitud estimada por diámetro (a {num(capacity, 1)} kW)</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="py-2 pr-4">Ø interno (mm)</th>
                <th className="py-2 pr-4">Longitud (m)</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {table.map(row => (
                <tr key={row.d} className={`border-b border-border ${row.d === diameter ? 'bg-primary/10' : ''}`}>
                  <td className="py-2 pr-4 font-mono text-foreground">{row.d.toFixed(2)}</td>
                  <td className="py-2 pr-4 font-semibold" style={{ color: data.color }}>{num(row.L, 2)}</td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setDiameter(row.d)}>Seleccionar</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 flex gap-2 text-xs text-muted-foreground">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Cálculo orientativo basado en Hagen-Poiseuille modificado con factor bífásico (corrección 0,3) y propiedades de líquido promedio. Resultado válido para selección preliminar; contrasta siempre con el catálogo del fabricante del compresor y el tubo capilar.</p>
      </div>
    </div>
  );
}