import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Legend, ComposedChart, Area, Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

// Gráfica de desglose de carga térmica (clima)
export function ThermalLoadBreakdown({ breakdown, onAdjust }) {
  const data = [
    { name: 'Paredes/Techo', valor: breakdown.wallLoad, color: '#ef4444' },
    { name: 'Ventanas', valor: breakdown.windowLoad, color: '#f97316' },
    { name: 'Personas', valor: breakdown.peopleLoad, color: '#eab308' },
    { name: 'Equipos', valor: breakdown.equipLoad, color: '#8b5cf6' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border rounded shadow p-2 text-xs">
          <p className="font-semibold">{payload[0].payload.name}</p>
          <p className="text-red-600">{Math.round(payload[0].value)} W</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border-red-100">
      <CardHeader className="pb-2 bg-red-50">
        <CardTitle className="text-sm text-red-700">📊 Desglose de carga térmica (interactivo)</CardTitle>
        <p className="text-xs text-red-500">Arrastra las barras o usa los sliders para ajustar valores</p>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" W" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="valor" fill="#ef4444" radius={[4, 4, 0, 0]}
              onClick={(d) => {}} />
          </BarChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Personas (carga)</span>
              <span className="font-semibold text-orange-600">{Math.round(breakdown.peopleLoad)} W</span>
            </div>
            <Slider
              min={0} max={2000} step={50}
              value={[breakdown.peopleLoad]}
              onValueChange={([v]) => onAdjust('peopleLoad', v)}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Equipos (carga)</span>
              <span className="font-semibold text-purple-600">{Math.round(breakdown.equipLoad)} W</span>
            </div>
            <Slider
              min={0} max={5000} step={100}
              value={[breakdown.equipLoad]}
              onValueChange={([v]) => onAdjust('equipLoad', v)}
              className="w-full"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Ventanas (carga)</span>
              <span className="font-semibold text-yellow-600">{Math.round(breakdown.windowLoad)} W</span>
            </div>
            <Slider
              min={0} max={3000} step={50}
              value={[breakdown.windowLoad]}
              onValueChange={([v]) => onAdjust('windowLoad', v)}
              className="w-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Diagrama de Mollier (Log P-h) Simplificado e Interactivo
export function MollierDiagram({ refrigerant, evapPressure, condPressure, onAdjust }) {
  // Campana de saturación genérica mejorada (h en kJ/kg, p en bar)
  const saturationCurve = [
    { h: 180, p: 0.5 }, { h: 190, p: 1 }, { h: 210, p: 5 }, { h: 230, p: 15 }, { h: 250, p: 30 }, { h: 280, p: 50 },
    { h: 320, p: 50 }, { h: 350, p: 30 }, { h: 380, p: 15 }, { h: 400, p: 5 }, { h: 420, p: 1 }, { h: 430, p: 0.5 },
  ].sort((a, b) => a.h - b.h);

  const pE = parseFloat(evapPressure) || 1;
  const pC = parseFloat(condPressure) || 15;

  // Ciclo ideal (4 puntos)
  const cycleData = [
    { name: '1: Salida Evap.', h: 400, p: pE, label: '1' },
    { name: '2: Salida Comp.', h: 440, p: pC, label: '2' },
    { name: '3: Salida Cond.', h: 240, p: pC, label: '3' },
    { name: '4: Entrada Evap.', h: 240, p: pE, label: '4' },
    { name: '1: Salida Evap.', h: 400, p: pE, label: '1' },
  ];

  const CustomLabel = (props) => {
    const { x, y, value } = props;
    return <text x={x} y={y} dy={-10} fill="#7c3aed" fontSize={12} fontWeight="bold" textAnchor="middle">{value}</text>;
  };

  return (
    <Card className="border-purple-100 shadow-sm">
      <CardHeader className="pb-2 bg-purple-50 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm text-purple-700">📉 Diagrama Mollier Interactivo — {refrigerant}</CardTitle>
          <p className="text-[10px] text-purple-500">Ciclo Real (Log P-h). Desliza para ajustar presiones.</p>
        </div>
      </CardHeader>
      <CardContent className="p-3 space-y-4">
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" dataKey="h" domain={[150, 450]} tick={{ fontSize: 10 }} label={{ value: 'Entalpía (h)', position: 'insideBottom', offset: -10, fontSize: 10 }} />
              <YAxis type="number" dataKey="p" scale="log" domain={[0.4, 60]} tick={{ fontSize: 10 }} label={{ value: 'Presión (bar)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Area data={saturationCurve} type="monotone" dataKey="p" stroke="#94a3b8" fill="#f1f5f9" fillOpacity={0.5} strokeWidth={2} isAnimationActive={false} />
              <Line data={cycleData} type="linear" dataKey="p" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4, fill: '#7c3aed' }} isAnimationActive={true}>
                <Scatter dataKey="label" content={<CustomLabel />} />
              </Line>
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {onAdjust && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-blue-700">
                <span>Evaporación</span>
                <span>{pE.toFixed(1)} bar</span>
              </div>
              <Slider min={0.5} max={pC - 1} step={0.1} value={[pE]} onValueChange={([v]) => onAdjust('evapPressure', v)} />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-red-700">
                <span>Condensación</span>
                <span>{pC.toFixed(1)} bar</span>
              </div>
              <Slider min={pE + 1} max={50} step={0.5} value={[pC]} onValueChange={([v]) => onAdjust('condPressure', v)} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Gráfica de presiones (línea de temperaturas vs presión)
export function PressureChart({ pressureData, refrigerant }) {
  const data = Object.entries(pressureData).map(([temp, bar]) => ({
    temp: `${temp}°C`, bar: parseFloat(bar) || 0
  }));

  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-2 bg-blue-50">
        <CardTitle className="text-sm text-blue-700">📈 Curva de presiones — {refrigerant}</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="temp" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" bar" />
            <Tooltip formatter={(v) => [`${v} bar`, 'Presión']} />
            <Line type="monotone" dataKey="bar" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Gráfica de desglose cámara frigorífica
export function ColdRoomBreakdown({ breakdown, onAdjust }) {
  const data = [
    { name: 'Transmisión', valor: Math.round(breakdown.transmissionLoad), color: '#3b82f6' },
    { name: 'Producto', valor: Math.round(breakdown.productLoad), color: '#06b6d4' },
    { name: 'Ventilación', valor: Math.round(breakdown.ventLoad), color: '#10b981' },
  ];

  const total = breakdown.transmissionLoad + breakdown.productLoad + breakdown.ventLoad;

  return (
    <Card className="border-blue-100">
      <CardHeader className="pb-2 bg-blue-50">
        <CardTitle className="text-sm text-blue-700">📊 Desglose de carga frigorífica (interactivo)</CardTitle>
        <p className="text-xs text-blue-500">Usa los sliders para ajustar las cargas manualmente</p>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} unit=" W" />
            <Tooltip formatter={(v) => [`${v} W`, 'Carga']} />
            <Bar dataKey="valor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Carga transmisión (W)</span>
              <span className="font-semibold text-blue-600">{Math.round(breakdown.transmissionLoad)} W</span>
            </div>
            <Slider
              min={0} max={10000} step={100}
              value={[Math.round(breakdown.transmissionLoad)]}
              onValueChange={([v]) => onAdjust('transmissionLoad', v)}
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Carga producto (W)</span>
              <span className="font-semibold text-cyan-600">{Math.round(breakdown.productLoad)} W</span>
            </div>
            <Slider
              min={0} max={5000} step={50}
              value={[Math.round(breakdown.productLoad)]}
              onValueChange={([v]) => onAdjust('productLoad', v)}
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Carga ventilación (W)</span>
              <span className="font-semibold text-green-600">{Math.round(breakdown.ventLoad)} W</span>
            </div>
            <Slider
              min={0} max={3000} step={50}
              value={[Math.round(breakdown.ventLoad)]}
              onValueChange={([v]) => onAdjust('ventLoad', v)}
            />
          </div>
        </div>

        <div className="bg-blue-50 rounded p-2 flex justify-between items-center">
          <span className="text-xs text-blue-700 font-medium">Total carga (×1.25 seguridad):</span>
          <span className="font-bold text-blue-800">{Math.round(total * 1.25)} W</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Radar de eficiencia energética
export function EfficiencyRadar({ scores }) {
  const data = [
    { subject: 'Aislamiento', A: scores.insulation },
    { subject: 'Tubería', A: scores.piping },
    { subject: 'Temperatura', A: scores.temp },
    { subject: 'Carga', A: scores.load },
    { subject: 'Equipo', A: scores.equipment },
  ];

  return (
    <Card className="border-green-100">
      <CardHeader className="pb-2 bg-green-50">
        <CardTitle className="text-sm text-green-700">🎯 Índice de eficiencia del diseño</CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
            <Radar name="Eficiencia" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}