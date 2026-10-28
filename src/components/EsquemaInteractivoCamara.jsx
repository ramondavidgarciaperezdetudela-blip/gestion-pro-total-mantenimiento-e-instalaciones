import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Thermometer, SlidersHorizontal, Gauge, Snowflake } from 'lucide-react';
import ColdRoomCycleDiagram from '@/components/ColdRoomCycleDiagram';
import { REFRIGERANT_DATABASE } from '@/components/refrigerantData';
import { calcBreakdown, buildResult } from '@/lib/calculoCamara';

const REFRIGERANTS = REFRIGERANT_DATABASE.map(r => r.code);

function fmt(v, dec = 2) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString('es-ES', { maximumFractionDigits: dec }) : '—';
}

function toNum(v, d = 0) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : d;
}

/**
 * Esquema interactivo del ciclo frigorífico de una cámara.
 *
 * Ajusta dimensiones, temperaturas, panel, gas y longitud de tubería y vea al
 * instante el ciclo (compresor → condensador → válvula → evaporador) con las
 * presiones, carga de gas y carga frigorífica recalculadas en tiempo real.
 */
export default function EsquemaInteractivoCamara() {
  const [form, setForm] = useState({
    length: 3, width: 2.5, height: 2.4,
    cold_room_temp: 2, exterior_temp: 32,
    product_kg: 200, cold_room_type: 'positiva',
    panel_thickness: '80mm', refrigerant_type: 'R-449A',
    pipe_distance: 8, condensadora_tipo: 'split',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Recálculo en vivo: si falta algún dato, buildResult devuelve cargas a 0.
  const { result, breakdown, evapTemp, condTemp } = useMemo(() => {
    const safe = {
      ...form,
      length: toNum(form.length), width: toNum(form.width), height: toNum(form.height),
      cold_room_temp: toNum(form.cold_room_temp), exterior_temp: toNum(form.exterior_temp),
      product_kg: toNum(form.product_kg), pipe_distance: toNum(form.pipe_distance),
    };
    const bd = calcBreakdown(safe);
    const res = buildResult(safe, bd);
    return {
      result: res,
      breakdown: bd,
      evapTemp: toNum(form.cold_room_temp) - 8,
      condTemp: toNum(form.exterior_temp) + 15,
    };
  }, [form]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Panel de ajustes ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-500" />
            Ajusta los valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <div className="bg-blue-50 rounded-lg p-2.5">
            <p className="text-xs font-medium text-blue-700 mb-2">Dimensiones cámara</p>
            <div className="grid grid-cols-3 gap-2">
              <Slider label="Largo (m)" value={form.length} min={1} max={30} step={0.5} onChange={v => set('length', v)} />
              <Slider label="Ancho (m)" value={form.width} min={1} max={20} step={0.5} onChange={v => set('width', v)} />
              <Slider label="Alto (m)" value={form.height} min={2} max={4} step={0.1} onChange={v => set('height', v)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Slider label={`T. cámara: ${form.cold_room_temp}°C`} value={form.cold_room_temp} min={-30} max={15} step={1} onChange={v => set('cold_room_temp', v)} color="cyan" />
            <Slider label={`T. exterior: ${form.exterior_temp}°C`} value={form.exterior_temp} min={0} max={45} step={1} onChange={v => set('exterior_temp', v)} color="orange" />
          </div>

          <Slider label={`Producto: ${form.product_kg} kg`} value={form.product_kg} min={0} max={2000} step={10} onChange={v => set('product_kg', v)} />
          <Slider label={`Long. tubería: ${form.pipe_distance} m`} value={form.pipe_distance} min={1} max={50} step={1} onChange={v => set('pipe_distance', v)} />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Tipo</label>
              <Select value={form.cold_room_type} onValueChange={v => set('cold_room_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positiva">Positiva</SelectItem>
                  <SelectItem value="negativa">Negativa</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Espesor panel</label>
              <Select value={form.panel_thickness} onValueChange={v => set('panel_thickness', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="60mm">60mm</SelectItem>
                  <SelectItem value="80mm">80mm</SelectItem>
                  <SelectItem value="100mm">100mm</SelectItem>
                  <SelectItem value="120mm">120mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-gray-500 block mb-1">Gas</label>
              <Select value={form.refrigerant_type} onValueChange={v => set('refrigerant_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REFRIGERANTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPIs en vivo */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Kpi label="Carga frigorífica" value={`${fmt(result.loadW, 0)} W`} sub={`${fmt(result.loadW * 0.86, 0)} frig/h`} color="text-blue-600 bg-blue-50 border-blue-200" icon={Thermometer} />
            <Kpi label="Equipo sugerido" value={`${fmt(result.equip.power_kw, 2)} kW`} sub={`${result.equip.brand} ${result.equip.model}`} color="text-green-600 bg-green-50 border-green-200" icon={Snowflake} />
            <Kpi label="P. evaporación" value={`${result.evapPressure} bar`} sub={`T.evap ${evapTemp}°C`} color="text-cyan-600 bg-cyan-50 border-cyan-200" icon={Gauge} />
            <Kpi label="P. condensación" value={`${result.condPressure} bar`} sub={`T.cond ${condTemp}°C`} color="text-red-600 bg-red-50 border-red-200" icon={Gauge} />
          </div>

          {result.extraGrams > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
              ⚠️ Tubería ({result.actualDist}m) supera el máximo ({result.maxDist}m): añadir <strong>{result.extraGrams}g</strong> de {form.refrigerant_type}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Esquema reactivo ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-500" />
            Ciclo frigorífico (en tiempo real)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ColdRoomCycleDiagram
            loadW={result.loadW}
            evapPressure={result.evapPressure}
            condPressure={result.condPressure}
            refCharge={result.refCharge}
            refrigerant={form.refrigerant_type}
            evapTemp={evapTemp}
            condTemp={condTemp}
            equipPowerKW={result.equip.power_kw}
            extraGrams={result.extraGrams || 0}
          />
          <p className="text-[10px] text-gray-400 mt-2">
            El ciclo y las presiones se recalculan al mover los controles. Para el desglose
            completo, materiales y componentes eléctricos, usa la pestaña «Cámara Frigorífica».
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, color = 'blue' }) {
  const accent = { blue: 'accent-blue-600', cyan: 'accent-cyan-600', orange: 'accent-orange-600' }[color] || 'accent-blue-600';
  return (
    <div>
      <label className="text-[11px] text-gray-500 block mb-1">{label}</label>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full ${accent}`}
      />
    </div>
  );
}

function Kpi({ label, value, sub, color, icon: Icon }) {
  return (
    <div className={`border rounded-xl p-2.5 ${color}`}>
      <p className="text-[10px] font-medium opacity-70 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />}{label}
      </p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] opacity-60 truncate">{sub}</p>
    </div>
  );
}