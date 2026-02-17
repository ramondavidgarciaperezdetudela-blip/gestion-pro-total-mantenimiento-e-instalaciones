import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Calculator } from 'lucide-react';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

const WIRE_COLORS = { L1: 'Marrón', L2: 'Negro', L3: 'Gris', N: 'Azul', PE: 'Amarillo-Verde' };

function calcSection(I, L, V, dv_max_pct, system) {
  const rho = 0.0178; // resistividad cobre
  const dv_max_V = V * (dv_max_pct / 100);
  const k = system === 'monofasico' ? 2 : Math.sqrt(3);
  const S = (rho * k * I * L) / dv_max_V;
  // Sección normalizada
  const sections = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120];
  return sections.find(s => s >= S) || 120;
}

export default function ElectricalCalc() {
  const [form, setForm] = useState({
    power_kw: 5, voltage: 230, system: 'monofasico', cos_phi: 0.9,
    length_m: 20, dv_max: 3, protection_type: 'magnetotermico',
  });
  const [result, setResult] = useState(null);
  const printRef = useRef(null);

  const calculate = () => {
    const P = parseFloat(form.power_kw) * 1000;
    const V = parseFloat(form.voltage);
    const pf = parseFloat(form.cos_phi);
    const L = parseFloat(form.length_m);
    const dv = parseFloat(form.dv_max);

    let I, S;
    if (form.system === 'monofasico') {
      I = P / (V * pf);
    } else if (form.system === 'bifasico') {
      I = P / (2 * V * pf);
    } else {
      I = P / (Math.sqrt(3) * V * pf);
    }
    S = calcSection(I, L, V, dv, form.system);

    // Magnetotérmico
    const mcbRatings = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100];
    const mcb = mcbRatings.find(r => r >= I * 1.25) || 100;

    // Diferencial
    const rcd = I > 40 ? 63 : I > 25 ? 40 : I > 16 ? 25 : 16;

    const materials = [
      { material: `Cable Cu ${S}mm² ${form.system === 'trifasico' ? '(x3 fases + N + PE)' : '(fase + neutro + tierra)'}`, specification: `Sección calculada ${S}mm²`, quantity: L, unit: 'm' },
      { material: `Interruptor magnetotérmico ${mcb}A`, specification: `In calculada ${I.toFixed(1)}A`, quantity: 1, unit: 'ud.' },
      { material: `Diferencial ${rcd}A/30mA`, specification: 'Clase AC', quantity: 1, unit: 'ud.' },
      { material: 'Tubo corrugado PVC o bandeja', specification: `Longitud instalación ${L}m`, quantity: L, unit: 'm' },
    ];

    setResult({ I: I.toFixed(2), S, mcb, rcd, materials, caida_tension: ((1.78e-8 * (form.system === 'monofasico' ? 2 : Math.sqrt(3)) * I * L) / S).toFixed(2) });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-yellow-500" />Cálculo Eléctrico</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-gray-500">Potencia (kW)</label><Input type="number" value={form.power_kw} onChange={e => setForm({...form, power_kw: e.target.value})} /></div>
            <div>
              <label className="text-xs text-gray-500">Sistema</label>
              <Select value={form.system} onValueChange={v => setForm({...form, system: v, voltage: v === 'monofasico' ? 230 : 400})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monofasico">Monofásico 230V</SelectItem>
                  <SelectItem value="trifasico">Trifásico 400V</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-gray-500">Cos φ (factor potencia)</label><Input type="number" step="0.01" min="0.7" max="1" value={form.cos_phi} onChange={e => setForm({...form, cos_phi: e.target.value})} /></div>
            <div><label className="text-xs text-gray-500">Longitud (m)</label><Input type="number" value={form.length_m} onChange={e => setForm({...form, length_m: e.target.value})} /></div>
            <div><label className="text-xs text-gray-500">Caída tensión máx. (%)</label><Input type="number" step="0.5" value={form.dv_max} onChange={e => setForm({...form, dv_max: e.target.value})} /></div>
          </div>
          <Button onClick={calculate} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
            <Calculator className="w-4 h-4 mr-2" /> Calcular
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div ref={printRef}>
          <CompanyHeader className="mb-3" />
          <Card className="border-yellow-200">
            <CardHeader className="bg-yellow-50">
              <CardTitle className="text-yellow-700 text-lg">Resultado cálculo eléctrico</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-yellow-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-yellow-600">{result.I} A</p>
                  <p className="text-xs text-yellow-500">Intensidad</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-600">{result.S} mm²</p>
                  <p className="text-xs text-blue-500">Sección cable</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-orange-600">{result.mcb} A</p>
                  <p className="text-xs text-orange-500">Magnetotérmico</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-600">{result.rcd} A</p>
                  <p className="text-xs text-green-500">Diferencial</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p>Caída de tensión: <strong>{result.caida_tension} V</strong></p>
                <p className="text-xs text-gray-500 mt-1">Colores: L1={WIRE_COLORS.L1}, L2={WIRE_COLORS.L2}, L3={WIRE_COLORS.L3}, N={WIRE_COLORS.N}, PE={WIRE_COLORS.PE}</p>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead><tr className="bg-gray-100"><th className="border p-1 text-left">Material</th><th className="border p-1 text-left">Especificación</th><th className="border p-1 text-right">Cant.</th><th className="border p-1">Ud.</th></tr></thead>
                <tbody>
                  {result.materials.map((m, i) => (
                    <tr key={i} className="border-b"><td className="border p-1">{m.material}</td><td className="border p-1">{m.specification}</td><td className="border p-1 text-right">{m.quantity}</td><td className="border p-1">{m.unit}</td></tr>
                  ))}
                </tbody>
              </table>
              <PrintButton contentRef={printRef} title="Cálculo Eléctrico" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}