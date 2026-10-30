import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberField } from "@/components/ui/number-field";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Droplet, Gauge, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';

// Magnus formula para presión de saturación (hPa)
function saturationPressure(temp) {
  const a = 17.27;
  const b = 237.7;
  return 6.112 * Math.exp((a * temp) / (b + temp));
}

// Cálculo humedad relativa
function calcRelativeHumidity(tempCold, tempExterior, presionEvap) {
  const dewPoint = Math.log(presionEvap / 6.112) * 237.7 / (17.27 - Math.log(presionEvap / 6.112));
  const psat_dewpoint = saturationPressure(dewPoint);
  const psat_cold = saturationPressure(tempCold);
  const rh = Math.max(0, Math.min(100, (psat_dewpoint / psat_cold) * 100));
  return { rh: rh.toFixed(1), dewPoint: dewPoint.toFixed(1), psat_cold: psat_cold.toFixed(2), psat_dew: psat_dewpoint.toFixed(2) };
}

// Tablas de presión de saturación (bar absoluta) por temperatura de evaporación
const REFRIGERANT_PRESSURE_TABLE = {
  'R-404A': [
    { temp: -40, pbar: 1.013 }, { temp: -35, pbar: 1.251 }, { temp: -30, pbar: 1.533 },
    { temp: -25, pbar: 1.865 }, { temp: -20, pbar: 2.254 }, { temp: -15, pbar: 2.706 },
    { temp: -10, pbar: 3.228 }, { temp: -5, pbar: 3.828 }, { temp: 0, pbar: 4.513 },
    { temp: 5, pbar: 5.291 }, { temp: 10, pbar: 6.170 }, { temp: 15, pbar: 7.160 },
    { temp: 20, pbar: 8.270 }, { temp: 25, pbar: 9.510 }, { temp: 30, pbar: 10.89 },
  ],
  'R-448A': [
    { temp: -40, pbar: 0.797 }, { temp: -35, pbar: 1.001 }, { temp: -30, pbar: 1.245 },
    { temp: -25, pbar: 1.534 }, { temp: -20, pbar: 1.874 }, { temp: -15, pbar: 2.272 },
    { temp: -10, pbar: 2.734 }, { temp: -5, pbar: 3.268 }, { temp: 0, pbar: 3.881 },
    { temp: 5, pbar: 4.582 }, { temp: 10, pbar: 5.379 }, { temp: 15, pbar: 6.281 },
    { temp: 20, pbar: 7.298 }, { temp: 25, pbar: 8.440 }, { temp: 30, pbar: 9.718 },
  ],
  'R-449A': [
    { temp: -40, pbar: 0.791 }, { temp: -35, pbar: 0.994 }, { temp: -30, pbar: 1.238 },
    { temp: -25, pbar: 1.526 }, { temp: -20, pbar: 1.864 }, { temp: -15, pbar: 2.259 },
    { temp: -10, pbar: 2.717 }, { temp: -5, pbar: 3.246 }, { temp: 0, pbar: 3.853 },
    { temp: 5, pbar: 4.546 }, { temp: 10, pbar: 5.333 }, { temp: 15, pbar: 6.224 },
    { temp: 20, pbar: 7.228 }, { temp: 25, pbar: 8.354 }, { temp: 30, pbar: 9.614 },
  ],
  'R-452A': [
    { temp: -40, pbar: 0.828 }, { temp: -35, pbar: 1.037 }, { temp: -30, pbar: 1.286 },
    { temp: -25, pbar: 1.582 }, { temp: -20, pbar: 1.930 }, { temp: -15, pbar: 2.338 },
    { temp: -10, pbar: 2.812 }, { temp: -5, pbar: 3.360 }, { temp: 0, pbar: 3.990 },
    { temp: 5, pbar: 4.710 }, { temp: 10, pbar: 5.529 }, { temp: 15, pbar: 6.456 },
    { temp: 20, pbar: 7.501 }, { temp: 25, pbar: 8.674 }, { temp: 30, pbar: 9.986 },
  ],
  'R-134a': [
    { temp: -40, pbar: 0.517 }, { temp: -35, pbar: 0.661 }, { temp: -30, pbar: 0.840 },
    { temp: -25, pbar: 1.058 }, { temp: -20, pbar: 1.328 }, { temp: -15, pbar: 1.636 },
    { temp: -10, pbar: 2.010 }, { temp: -5, pbar: 2.432 }, { temp: 0, pbar: 2.928 },
    { temp: 5, pbar: 3.497 }, { temp: 10, pbar: 4.146 }, { temp: 15, pbar: 4.883 },
    { temp: 20, pbar: 5.716 }, { temp: 25, pbar: 6.652 }, { temp: 30, pbar: 7.702 },
  ],
  'R-290': [
    { temp: -40, pbar: 1.010 }, { temp: -35, pbar: 1.266 }, { temp: -30, pbar: 1.573 },
    { temp: -25, pbar: 1.935 }, { temp: -20, pbar: 2.361 }, { temp: -15, pbar: 2.858 },
    { temp: -10, pbar: 3.435 }, { temp: -5, pbar: 4.099 }, { temp: 0, pbar: 4.857 },
    { temp: 5, pbar: 5.719 }, { temp: 10, pbar: 6.694 }, { temp: 15, pbar: 7.794 },
    { temp: 20, pbar: 9.029 }, { temp: 25, pbar: 10.41 }, { temp: 30, pbar: 11.95 },
  ],
  'R-744': [
    { temp: -40, pbar: 10.04 }, { temp: -35, pbar: 12.08 }, { temp: -30, pbar: 14.33 },
    { temp: -25, pbar: 17.86 }, { temp: -20, pbar: 19.70 }, { temp: -15, pbar: 22.91 },
    { temp: -10, pbar: 26.50 }, { temp: -5, pbar: 30.51 }, { temp: 0, pbar: 34.97 },
    { temp: 5, pbar: 39.91 }, { temp: 10, pbar: 45.37 }, { temp: 15, pbar: 51.38 },
  ],
};

function getRefrigerantPressure(refrigerant, tempEvap) {
  const table = REFRIGERANT_PRESSURE_TABLE[refrigerant] || REFRIGERANT_PRESSURE_TABLE['R-449A'];
  if (tempEvap <= table[0].temp) return table[0].pbar;
  if (tempEvap >= table[table.length - 1].temp) return table[table.length - 1].pbar;
  for (let i = 0; i < table.length - 1; i++) {
    if (tempEvap >= table[i].temp && tempEvap <= table[i + 1].temp) {
      const t = (tempEvap - table[i].temp) / (table[i + 1].temp - table[i].temp);
      return table[i].pbar + t * (table[i + 1].pbar - table[i].pbar);
    }
  }
  return table[0].pbar;
}

function getTempFromPressure(refrigerant, targetPbar) {
  const table = REFRIGERANT_PRESSURE_TABLE[refrigerant] || REFRIGERANT_PRESSURE_TABLE['R-449A'];
  if (targetPbar <= table[0].pbar) return table[0].temp;
  if (targetPbar >= table[table.length - 1].pbar) return table[table.length - 1].temp;
  for (let i = 0; i < table.length - 1; i++) {
    if (targetPbar >= table[i].pbar && targetPbar <= table[i + 1].pbar) {
      const t = (targetPbar - table[i].pbar) / (table[i + 1].pbar - table[i].pbar);
      return table[i].temp + t * (table[i + 1].temp - table[i].temp);
    }
  }
  return table[0].temp;
}

function getMaterials(rh) {
  const materials = [];
  if (rh > 85) {
    materials.push(
      { name: 'Deshumidificador por absorción', desc: 'Reduce HR mediante silicagel', icon: '💨' },
      { name: 'Válvula reguladora de humedad (HUMIDSTAT)', desc: 'Control automático 60-80%', icon: '🎛️' },
      { name: 'Tubería drenaje condensados', desc: '3/4" con sifón', icon: '🔶' }
    );
  }
  if (rh < 50) {
    materials.push(
      { name: 'Humidificador por vapor', desc: 'Inyecta vapor en cámara', icon: '💧' },
      { name: 'Regulador de humedad (HUMIDSTAT)', desc: 'Control 50-70%', icon: '🎛️' },
      { name: 'Sistema de sonda de humedad', desc: 'Sensor HR + controlador', icon: '📡' }
    );
  }
  if (rh >= 50 && rh <= 85) {
    materials.push(
      { name: 'Sensor higrómetro calibrado', desc: 'Monitoreo HR', icon: '📊' },
      { name: 'Tabla control de condensación', desc: 'Para registro diario', icon: '📋' }
    );
  }
  return materials;
}

function HumidityDiagram({ rh, materials, tempCold }) {
  let bgColor = '#dcfce7';
  if (rh > 85) bgColor = '#fee2e2';
  if (rh < 50) bgColor = '#fef3c7';
  let statusText = '✓ Normal';
  if (rh > 85) statusText = '⚠️ Muy húmedo';
  if (rh < 50) statusText = '⚠️ Muy seco';

  return (
    <svg viewBox="0 0 400 250" className="w-full border border-gray-200 rounded-lg bg-white">
      <defs>
        <linearGradient id="gradBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>
      <rect width="400" height="250" fill="url(#gradBg)" />
      <rect x="50" y="40" width="120" height="100" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" rx="5" />
      <text x="110" y="75" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#0c4a6e">CÁMARA</text>
      <text x="110" y="95" fontSize="10" textAnchor="middle" fill="#0c4a6e">{tempCold}°C</text>
      <text x="110" y="120" fontSize="14" fontWeight="bold" textAnchor="middle" fill="#0c4a6e">{rh}% HR</text>
      <rect x="80" y="150" width="60" height="20" fill={bgColor} stroke="#666" strokeWidth="1" rx="3" />
      <text x="110" y="165" fontSize="11" fontWeight="bold" textAnchor="middle" fill="#1f2937">{statusText}</text>
      {materials.length > 0 && (
        <>
          <text x="250" y="30" fontSize="12" fontWeight="bold" fill="#1f2937">Regulación necesaria:</text>
          {materials.slice(0, 3).map((m, i) => (
            <g key={i}>
              <rect x="200" y={50 + i * 50} width="190" height="45" fill="#f9fafb" stroke="#d1d5db" strokeWidth="1" rx="3" />
              <text x="220" y={65 + i * 50} fontSize="16">{m.icon}</text>
              <text x="245" y={65 + i * 50} fontSize="11" fontWeight="bold" fill="#111827">{m.name}</text>
              <text x="245" y={80 + i * 50} fontSize="9" fill="#6b7280">{m.desc}</text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

function RegulationProcess({ rh }) {
  let process = [];
  if (rh > 85) {
    process = [
      { step: 1, action: 'Sensor detecta HR > 80%', icon: '📡' },
      { step: 2, action: 'Controlador abre válvula drenaje', icon: '🔓' },
      { step: 3, action: 'Condensados evacuados', icon: '💧' },
      { step: 4, action: 'Compresor aumenta intensidad', icon: '⚙️' },
      { step: 5, action: 'Temperatura baja → menos vapor', icon: '❄️' },
      { step: 6, action: 'HR desciende a 60-75%', icon: '✓' },
    ];
  } else if (rh < 50) {
    process = [
      { step: 1, action: 'Sensor detecta HR < 50%', icon: '📡' },
      { step: 2, action: 'Controlador inyecta vapor', icon: '💨' },
      { step: 3, action: 'Humedad sube en cámara', icon: '☁️' },
      { step: 4, action: 'Equilibrio temperatura-humedad', icon: '⚖️' },
      { step: 5, action: 'HR sube a 55-70%', icon: '✓' },
    ];
  } else {
    process = [
      { step: 1, action: 'HR dentro de rango (50-85%)', icon: '✓' },
      { step: 2, action: 'Monitoreo continuo con sensor', icon: '📊' },
      { step: 3, action: 'Registro en tabla de control', icon: '📋' },
      { step: 4, action: 'Intervención solo si HR sale rango', icon: '🎯' },
    ];
  }
  return (
    <div className="space-y-2">
      {process.map(p => (
        <div key={p.step} className="flex items-center gap-3 p-2 bg-gray-50 rounded border border-gray-200">
          <div className="text-lg min-w-6">{p.icon}</div>
          <div>
            <p className="text-xs font-bold text-gray-700">Paso {p.step}</p>
            <p className="text-sm text-gray-600">{p.action}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ColdRoomHumidityCalc({ tempCold = 2, presionEvap = 5.72, tempExterior = 25, refrigerantType = 'R-449A', refrigerantWeight = 0 }) {
  const [temp, setTemp] = useState(tempCold);
  const [pressure, setPressure] = useState(presionEvap);
  const [exterior, setExterior] = useState(tempExterior);
  const [refrigerant, setRefrigerant] = useState(refrigerantType);
  const [refWeight, setRefWeight] = useState(refrigerantWeight || '');
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('salvador-escoda');
  const [materialPrices, setMaterialPrices] = useState({});
  const [sliderPressure, setSliderPressure] = useState(presionEvap);

  useEffect(() => {
    Promise.all([
      base44.entities.Supplier.filter({ is_active: true }),
      base44.entities.SupplierPrice.list('-created_date', 1000),
    ]).then(([supp, prices]) => {
      setSuppliers(supp);
      const pricesMap = {};
      prices.forEach(p => {
        const key = `${p.supplier_name}|${p.product_name}`;
        pricesMap[key] = p;
      });
      setMaterialPrices(pricesMap);
    });
  }, []);

  const humidityResult = useMemo(() => calcRelativeHumidity(parseFloat(temp), parseFloat(exterior), parseFloat(pressure)), [temp, exterior, pressure]);
  const materials = getMaterials(parseFloat(humidityResult.rh));

  // Slider interactivo
  const sliderHumidityResult = useMemo(() => calcRelativeHumidity(parseFloat(temp), parseFloat(exterior), parseFloat(sliderPressure)), [temp, exterior, sliderPressure]);
  const sliderTempEvap = useMemo(() => getTempFromPressure(refrigerant, parseFloat(sliderPressure)).toFixed(1), [refrigerant, sliderPressure]);

  // Presión nominal según gas y temperatura de cámara (DT evap típico = 8°C)
  const nominalTempEvap = parseFloat(temp) - 8;
  const nominalPressure = getRefrigerantPressure(refrigerant, nominalTempEvap);

  // Rango slider dinámico según gas
  const refrigTable = REFRIGERANT_PRESSURE_TABLE[refrigerant] || REFRIGERANT_PRESSURE_TABLE['R-449A'];
  const sliderMin = parseFloat(refrigTable[0].pbar.toFixed(2));
  const sliderMax = parseFloat(Math.min(refrigTable[refrigTable.length - 1].pbar, refrigerant === 'R-744' ? 55 : 15).toFixed(2));

  // Sincronizar slider cuando cambia el gas o la temperatura
  useEffect(() => {
    const nominal = getRefrigerantPressure(refrigerant, parseFloat(temp) - 8);
    setSliderPressure(parseFloat(nominal.toFixed(2)));
  }, [refrigerant, temp]);

  // Gráfico HR vs Temperatura
  const tempRange = useMemo(() => Array.from({ length: 20 }, (_, i) => {
    const t = parseFloat(temp) - 10 + i;
    const psat = saturationPressure(t);
    const rh = Math.max(0, Math.min(100, (saturationPressure(parseFloat(humidityResult.dewPoint)) / psat) * 100));
    return { temp: t, rh: parseFloat(rh.toFixed(1)) };
  }), [temp, humidityResult.dewPoint]);

  // Gráfico HR vs Presión del gas (tabla real)
  const pressureRange = useMemo(() => {
    const steps = 40;
    const pMin = sliderMin;
    const pMax = sliderMax;
    return Array.from({ length: steps }, (_, i) => {
      const p = pMin + (pMax - pMin) * (i / (steps - 1));
      const tevap = getTempFromPressure(refrigerant, p);
      const res = calcRelativeHumidity(parseFloat(temp), parseFloat(exterior), p);
      return { pbar: parseFloat(p.toFixed(2)), rh: parseFloat(res.rh), tevap: parseFloat(tevap.toFixed(1)) };
    });
  }, [refrigerant, temp, exterior, sliderMin, sliderMax]);

  const getMaterialPrice = (materialName) => {
    const supplierName = suppliers.find(s => s.id === selectedSupplier)?.name || 'Salvador Escoda';
    return materialPrices[`${supplierName}|${materialName}`];
  };

  const customTooltipPressure = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-purple-200 rounded p-2 text-xs shadow">
          <p className="font-bold text-purple-700">{payload[0]?.payload?.pbar} bar</p>
          <p className="text-gray-600">T evap: {payload[0]?.payload?.tevap}°C</p>
          <p className="font-bold text-purple-900">HR: {payload[0]?.value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-300">
        <CardHeader className="bg-purple-50">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Droplet className="w-5 h-5" />
            Cálculo de Humedad Relativa (HR)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Inputs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-purple-50 rounded-lg">
            <div>
              <label className="text-xs text-purple-700 font-semibold block mb-1">Temperatura cámara (°C)</label>
              <NumberField value={temp} onChange={v => setTemp(v)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-purple-700 font-semibold block mb-1">Presión evaporación (bar)</label>
              <NumberField value={pressure} onChange={v => setPressure(v)} className="text-sm" />
              <p className="text-[10px] text-purple-600 mt-1">📍 Según gas refrigerante</p>
            </div>
            <div>
              <label className="text-xs text-purple-700 font-semibold block mb-1">Temperatura exterior (°C)</label>
              <NumberField value={exterior} onChange={v => setExterior(v)} className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-purple-700 font-semibold block mb-1">Tipo refrigerante</label>
              <Select value={refrigerant} onValueChange={setRefrigerant}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="R-404A">R-404A</SelectItem>
                  <SelectItem value="R-448A">R-448A</SelectItem>
                  <SelectItem value="R-449A">R-449A</SelectItem>
                  <SelectItem value="R-452A">R-452A</SelectItem>
                  <SelectItem value="R-134a">R-134a</SelectItem>
                  <SelectItem value="R-290">R-290</SelectItem>
                  <SelectItem value="R-744">R-744 (CO2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4">
              <label className="text-xs text-purple-700 font-semibold block mb-1">Peso refrigerante instalado (kg) - Opcional</label>
              <NumberField value={refWeight} onChange={v => setRefWeight(v)} className="text-sm" placeholder="Ej: 2.5 kg" />
            </div>
          </div>

          {/* Resultados principales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-4 rounded-lg border border-purple-200 text-center">
              <p className="text-3xl font-bold text-purple-700">{humidityResult.rh}%</p>
              <p className="text-sm text-purple-600 font-semibold">Humedad Relativa</p>
              <Badge className={`mt-2 w-full justify-center text-xs ${parseFloat(humidityResult.rh) > 85 ? 'bg-red-100 text-red-800' : parseFloat(humidityResult.rh) < 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {parseFloat(humidityResult.rh) > 85 ? '⚠️ Muy húmedo' : parseFloat(humidityResult.rh) < 50 ? '⚠️ Muy seco' : '✓ Óptimo'}
              </Badge>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-4 rounded-lg border border-blue-200 text-center">
              <p className="text-3xl font-bold text-blue-700">{humidityResult.dewPoint}°C</p>
              <p className="text-sm text-blue-600 font-semibold">Punto de Rocío</p>
              <p className="text-xs text-blue-500 mt-2">Condensación</p>
            </div>
            <div className="bg-gradient-to-br from-cyan-100 to-cyan-50 p-4 rounded-lg border border-cyan-200 text-center">
              <p className="text-3xl font-bold text-cyan-700">{humidityResult.psat_cold}</p>
              <p className="text-sm text-cyan-600 font-semibold">Psat (hPa)</p>
              <p className="text-xs text-cyan-500 mt-2">Cámara</p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-50 p-4 rounded-lg border border-green-200 text-center">
              <p className="text-2xl font-bold text-green-700">{refrigerant}</p>
              <p className="text-sm text-green-600 font-semibold">Refrigerante</p>
              {refWeight > 0 && <p className="text-xs text-green-500 mt-2">{refWeight} kg</p>}
            </div>
          </div>

          {/* Diagrama cámara */}
          <div className="bg-white p-2 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">Diagrama de la cámara y regulación</p>
            <HumidityDiagram rh={parseFloat(humidityResult.rh)} materials={materials} tempCold={temp} />
          </div>

          {/* Gráfico HR vs Temperatura */}
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">📊 HR según temperatura de cámara</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={tempRange}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="temp" tick={{ fontSize: 10 }} label={{ value: 'T cámara (°C)', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: 'HR (%)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="rh" stroke="#9333ea" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* ═══ GRÁFICO INTERACTIVO: HR vs Presión del gas ═══ */}
          <div className="bg-white p-3 rounded-lg border-2 border-purple-300">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-bold text-purple-700">📉 HR según Presión del gas {refrigerant} — Interactivo</p>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pressureRange} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="pbar" tick={{ fontSize: 10 }} label={{ value: 'Presión evaporación (bar)', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} label={{ value: 'HR (%)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip content={customTooltipPressure} />
                <ReferenceArea y1={50} y2={85} fill="#dcfce7" fillOpacity={0.4} />
                <ReferenceLine
                  x={parseFloat(sliderPressure)}
                  stroke="#7c3aed"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                  label={{ value: `${sliderPressure} bar`, position: 'top', fontSize: 10, fill: '#7c3aed' }}
                />
                <ReferenceLine
                  x={parseFloat(nominalPressure.toFixed(2))}
                  stroke="#16a34a"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  label={{ value: 'Nominal', position: 'insideTopRight', fontSize: 9, fill: '#16a34a' }}
                />
                <Line type="monotone" dataKey="rh" stroke="#9333ea" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>

            {/* Slider */}
            <div className="mt-4 px-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Mover slider → cambia presión:</span>
                <span className="text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                  {sliderPressure} bar
                </span>
              </div>
              <Slider
                min={sliderMin}
                max={sliderMax}
                step={0.1}
                value={[parseFloat(sliderPressure)]}
                onValueChange={([v]) => setSliderPressure(parseFloat(v.toFixed(1)))}
                className="mb-3"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>{sliderMin} bar</span>
                <span>{sliderMax} bar</span>
              </div>
            </div>

            {/* Resultado interactivo */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                <p className="text-2xl font-bold text-purple-700">{sliderHumidityResult.rh}%</p>
                <p className="text-xs text-purple-600 font-semibold">HR en cámara</p>
                <Badge className={`mt-1 text-[10px] w-full justify-center ${parseFloat(sliderHumidityResult.rh) > 85 ? 'bg-red-100 text-red-800' : parseFloat(sliderHumidityResult.rh) < 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {parseFloat(sliderHumidityResult.rh) > 85 ? '⚠️ Muy húmedo' : parseFloat(sliderHumidityResult.rh) < 50 ? '⚠️ Muy seco' : '✓ Óptimo'}
                </Badge>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                <p className="text-2xl font-bold text-blue-700">{sliderTempEvap}°C</p>
                <p className="text-xs text-blue-600 font-semibold">T° evaporación</p>
                <p className="text-[10px] text-blue-500 mt-1">{refrigerant}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                <p className="text-2xl font-bold text-green-700">{sliderHumidityResult.dewPoint}°C</p>
                <p className="text-xs text-green-600 font-semibold">Pto. de Rocío</p>
                <p className="text-[10px] text-green-500 mt-1">condensación</p>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-gray-500 flex flex-wrap gap-3">
              <span>🟣 Presión seleccionada ({sliderPressure} bar)</span>
              <span>🟢 Presión nominal ({nominalPressure.toFixed(1)} bar @ T evap {nominalTempEvap}°C)</span>
              <span>🟩 Zona óptima (50-85% HR)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Materiales para regulación */}
      {materials.length > 0 && (
        <Card className="border-orange-300">
          <CardHeader className="bg-orange-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Gauge className="w-5 h-5" />
                Equipos necesarios para regulación
              </CardTitle>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-48 text-xs">
                  <SelectValue placeholder="Seleccionar proveedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 ? (
                    <SelectItem value="salvador-escoda">Salvador Escoda</SelectItem>
                  ) : (
                    suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-3">
              {materials.map((m, i) => {
                const price = getMaterialPrice(m.name);
                return (
                  <div key={i} className="p-3 bg-orange-50 rounded-lg border border-orange-200 flex gap-3">
                    <div className="text-2xl">{m.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-orange-900 text-sm">{m.name}</p>
                      <p className="text-xs text-orange-700">{m.desc}</p>
                      {price && (
                        <div className="mt-2 p-2 bg-white rounded border border-orange-100">
                          <p className="text-[10px] text-gray-500"><strong>Referencia:</strong> {price.product_code}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-[10px] text-orange-800 font-semibold">Coste: {price.cost_price}€</span>
                            <span className="text-[10px] text-green-700 font-bold">Venta: {price.sale_price}€</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proceso de regulación */}
      <Card className="border-green-300">
        <CardHeader className="bg-green-50">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <AlertCircle className="w-5 h-5" />
            Proceso de regulación de humedad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <RegulationProcess rh={parseFloat(humidityResult.rh)} />
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 space-y-1">
            <p className="font-semibold">📋 Recomendaciones:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Rango óptimo:</strong> 50-80% HR (variar según producto)</li>
              <li><strong>Frutas:</strong> 85-95% HR (evitar deshidratación)</li>
              <li><strong>Verduras:</strong> 90-95% HR (preservar turgencia)</li>
              <li><strong>Carnes/Pescados:</strong> 75-85% HR (evitar pérdida peso)</li>
              <li><strong>Productos secos:</strong> 40-60% HR (evitar humedad)</li>
              <li>🔍 <strong>Monitoreo:</strong> Verificar sensor higrómetro cada 15 días</li>
              <li>🧹 <strong>Mantenimiento:</strong> Limpiar conductos drenaje semanalmente</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Fundamento técnico */}
      <Card className="border-gray-300">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-gray-700 text-sm">🔬 Fundamento técnico</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-xs text-gray-600 space-y-2">
          <p><strong>Fórmula Magnus:</strong> Presión de saturación en función de temperatura</p>
          <p><strong>Humedad Relativa:</strong> HR = (P_vapor / P_saturación) × 100</p>
          <p><strong>Punto de Rocío:</strong> Temperatura a la que se alcanza 100% HR y condensa el agua</p>
          <p><strong>Presión de Evaporación:</strong> Depende del gas refrigerante y temperatura de evaporación. El slider interactivo permite explorar cómo cambia la HR al variar la presión del gas.</p>
        </CardContent>
      </Card>
    </div>
  );
}