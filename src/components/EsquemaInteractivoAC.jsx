import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NumberField } from '@/components/ui/number-field';
import { Thermometer, Wind, SlidersHorizontal } from 'lucide-react';
import ACSystemDiagram from '@/components/ACSystemDiagram';

// Coeficientes de carga por uso (W/m²). Réplica mínima de los de la pantalla
// principal: aquí solo se necesita el coeficiente para el cálculo en vivo.
const COEF_USO = [
  { key: 'residencial',  label: 'Residencial (vivienda)', coef: 100 },
  { key: 'oficina',      label: 'Oficina / Despacho',      coef: 120 },
  { key: 'comercio',     label: 'Local comercial',         coef: 150 },
  { key: 'restauracion', label: 'Bar / Restaurante',      coef: 175 },
  { key: 'industrial',   label: 'Industrial / Nave',      coef: 200 },
  { key: 'server',       label: 'Sala de servidores',      coef: 350 },
];

const REFRIGERANTES = [
  { key: 'R-32',   label: 'R-32' },
  { key: 'R-410A', label: 'R-410A' },
  { key: 'R-290',  label: 'R-290 (Propano)' },
  { key: 'R-134a', label: 'R-134a' },
  { key: 'R-407C', label: 'R-407C' },
];

const TIPOS = [
  { key: 'Split 1x1',    label: 'Split 1×1 (Mural)' },
  { key: 'Split Suelo',  label: 'Split de Suelo/Techo' },
  { key: 'Cassette',     label: 'Cassette (4 vías)' },
  { key: 'Conductos',    label: 'Climatizador de Conductos' },
  { key: 'Multi-Split',  label: 'Multi-Split' },
  { key: 'VRF/VRV',      label: 'VRF/VRV Industrial' },
];

function fmt(v, dec = 2) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n.toLocaleString('es-ES', { maximumFractionDigits: dec }) : '—';
}

/**
 * Esquema interactivo de potencia de aire acondicionado.
 *
 * Ajusta superficie, uso, refrigerante y tipo de máquina y vea al instante el
 * esquema de la instalación y los resultados técnicos (potencia, frigorías,
 * caudal de aire y sección de conducto estimada) sin pulsar ningún botón.
 */
export default function EsquemaInteractivoAC() {
  const [superficie, setSuperficie] = useState(25);
  const [uso, setUso] = useState('residencial');
  const [refrigerante, setRefrigerante] = useState('R-32');
  const [tipo, setTipo] = useState('Split 1x1');

  const r = useMemo(() => {
    const coef = COEF_USO.find(c => c.key === uso)?.coef || 100;
    const watios = (superficie || 0) * coef;
    const kw = watios / 1000;
    const frigorias = Math.round(watios * 0.86);
    const power_kw_coef = kw * 1.15;
    const caudalAire = Math.round(watios * 0.14); // m³/h orientativo (≈ 5–8 renovaciones/h)
    const conductos = /conductos|cassette|vrf/i.test(tipo);
    // Sección de conducto principal estimada a 4 m/s
    const seccionMm = conductos && caudalAire > 0
      ? Math.round(Math.sqrt(caudalAire / 3600 / 4) * 1000 * 2)
      : null;
    return { coef, watios, kw, frigorias, power_kw_coef, caudalAire, seccionMm, conductos };
  }, [superficie, uso, tipo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Panel de ajustes ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-red-500" />
            Ajusta los valores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              Superficie de la estancia: <span className="font-bold text-red-600">{superficie} m²</span>
            </label>
            <input
              type="range" min={5} max={500} step={1}
              value={superficie}
              onChange={e => setSuperficie(Number(e.target.value))}
              className="w-full accent-red-600"
            />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>5 m²</span><span>500 m²</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de uso</label>
            <Select value={uso} onValueChange={setUso}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COEF_USO.map(c => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label} <span className="text-gray-400">· {c.coef} W/m²</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Refrigerante</label>
              <Select value={refrigerante} onValueChange={setRefrigerante}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REFRIGERANTES.map(r => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo de máquina</label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* KPIs en vivo */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Kpi label="Potencia base" value={`${fmt(r.kw, 2)} kW`} sub={`${fmt(r.watios, 0)} W`} color="text-blue-600 bg-blue-50 border-blue-200" />
            <Kpi label="Recomendada (+15%)" value={`${fmt(r.power_kw_coef, 2)} kW`} sub="coef. seguridad" color="text-red-600 bg-red-50 border-red-200" />
            <Kpi label="Frigorías" value={fmt(r.frigorias, 0)} sub="frig/h" color="text-orange-600 bg-orange-50 border-orange-200" />
            <Kpi label="Caudal de aire" value={fmt(r.caudalAire, 0)} sub="m³/h orient." color="text-cyan-600 bg-cyan-50 border-cyan-200" />
          </div>

          {r.conductos && r.seccionMm && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-xs text-indigo-700">
              <Wind className="w-3.5 h-3.5 inline mr-1" />
              Conducto principal estimado: <strong>≈ {r.seccionMm}×{r.seccionMm} mm</strong> a 4 m/s
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Esquema reactivo ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-red-500" />
            Esquema de la instalación (en tiempo real)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ACSystemDiagram
            power_kw={r.power_kw_coef}
            frigorias={r.frigorias}
            gas={refrigerante}
            superficie={superficie}
            uso={COEF_USO.find(c => c.key === uso)?.label}
            tipo={tipo}
          />
          <p className="text-[10px] text-gray-400 mt-2">
            El esquema y los valores se actualizan al mover los controles. Para el listado de
            máquinas del catálogo y el análisis por IA, usa las pestañas «Calcular» y «Plano IA».
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <div className={`border rounded-xl p-2.5 text-center ${color}`}>
      <p className="text-[10px] font-medium opacity-70">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] opacity-60">{sub}</p>
    </div>
  );
}