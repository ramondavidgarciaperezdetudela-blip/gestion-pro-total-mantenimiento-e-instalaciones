import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Calculator, Loader2 } from 'lucide-react';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

export default function ElectricalCalc() {
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const printRef = useRef(null);

  const [form, setForm] = useState({
    voltage: 230, phases: '1', power_kw: 5, power_factor: 0.9, cable_length: 20,
    installation_type: 'empotrado', cable_material: 'cobre', ambient_temp: 30
  });

  const calculate = async () => {
    setCalculating(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Calcula la instalación eléctrica según REBT: tensión ${form.voltage}V, ${form.phases} fase(s), potencia ${form.power_kw}kW, factor potencia ${form.power_factor}, longitud cable ${form.cable_length}m, instalación ${form.installation_type}, conductor ${form.cable_material}, temperatura ambiente ${form.ambient_temp}°C. Calcula sección cable necesaria, caída de tensión, protecciones (magnetotérmico e interruptor diferencial), y materiales necesarios.`,
      response_json_schema: {
        type: "object",
        properties: {
          seccion_cable_mm2: { type: "number" },
          intensidad_nominal_a: { type: "number" },
          caida_tension_percent: { type: "number" },
          magnetotermico: { type: "string" },
          diferencial: { type: "string" },
          materiales: { type: "array", items: { type: "object", properties: { material: { type: "string" }, cantidad: { type: "number" }, especificacion: { type: "string" } } } },
          observaciones: { type: "string" }
        }
      }
    });
    setResult(res);
    setCalculating(false);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="w-6 h-6 text-yellow-500" />Cálculo Eléctrico</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500">Tensión (V)</label><Input type="number" value={form.voltage} onChange={e => setForm({...form, voltage: parseFloat(e.target.value)})} /></div>
            <Select value={form.phases} onValueChange={v => setForm({...form, phases: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Monofásica</SelectItem>
                <SelectItem value="3">Trifásica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500">Potencia (kW)</label><Input type="number" value={form.power_kw} onChange={e => setForm({...form, power_kw: parseFloat(e.target.value)})} /></div>
            <div><label className="text-xs text-gray-500">Factor potencia</label><Input type="number" step="0.01" value={form.power_factor} onChange={e => setForm({...form, power_factor: parseFloat(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs text-gray-500">Longitud cable (m)</label><Input type="number" value={form.cable_length} onChange={e => setForm({...form, cable_length: parseFloat(e.target.value)})} /></div>
            <div><label className="text-xs text-gray-500">T. Ambiente (°C)</label><Input type="number" value={form.ambient_temp} onChange={e => setForm({...form, ambient_temp: parseFloat(e.target.value)})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.installation_type} onValueChange={v => setForm({...form, installation_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="empotrado">Empotrado</SelectItem>
                <SelectItem value="superficie">Superficie</SelectItem>
                <SelectItem value="bandeja">Bandeja</SelectItem>
                <SelectItem value="enterrado">Enterrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.cable_material} onValueChange={v => setForm({...form, cable_material: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cobre">Cobre</SelectItem>
                <SelectItem value="aluminio">Aluminio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={calculate} disabled={calculating} className="w-full bg-yellow-600">
            {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
            Calcular
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card ref={printRef}>
          <CardHeader><CardTitle>Resultado Cálculo Eléctrico</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CompanyHeader className="mb-3 pb-3 border-b" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-yellow-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Sección cable</p>
                <p className="text-xl font-bold text-yellow-700">{result.seccion_cable_mm2} mm²</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Intensidad nominal</p>
                <p className="text-xl font-bold text-blue-700">{result.intensidad_nominal_a} A</p>
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p>Caída de tensión: {result.caida_tension_percent}%</p>
              <p>Magnetotérmico: {result.magnetotermico}</p>
              <p>Diferencial: {result.diferencial}</p>
            </div>
            {result.materiales?.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Materiales</p>
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-1">Material</th><th className="p-1">Cant.</th><th className="p-1">Especificación</th></tr></thead>
                  <tbody>{result.materiales.map((m, i) => <tr key={i} className="border-b"><td className="p-1">{m.material}</td><td className="p-1 text-center">{m.cantidad}</td><td className="p-1">{m.especificacion}</td></tr>)}</tbody>
                </table>
              </div>
            )}
            {result.observaciones && <p className="text-xs text-gray-600">{result.observaciones}</p>}
            <PrintButton contentRef={printRef} title="Cálculo Eléctrico" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}