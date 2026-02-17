import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Calculator, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

export default function SolarCalc() {
  const [mode, setMode] = useState('directo');
  const [contacts, setContacts] = useState([]);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const printRef = useRef(null);

  const [form, setForm] = useState({
    contact_id: '', contact_name: '', consumption_kwh: 15,
    num_panels: 10, panel_power_w: 450, panel_brand: '', panel_model: '',
    inverter_brand: '', inverter_model: '', inverter_power_w: 5000,
    battery_brand: '', battery_model: '', battery_capacity_kwh: 10, num_batteries: 1,
    distance_panels_to_dc_box: 10, distance_inverter_to_batteries: 3, distance_to_ac_box: 8
  });

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, []);

  const calculate = async () => {
    setCalculating(true);
    const prompt = mode === 'directo'
      ? `Diseña una instalación solar fotovoltaica con ${form.num_panels} paneles de ${form.panel_power_w}W, inversor de ${form.inverter_power_w}W, ${form.num_batteries} baterías de ${form.battery_capacity_kwh}kWh. Distancia paneles a cuadro CC: ${form.distance_panels_to_dc_box}m, inversor a baterías: ${form.distance_inverter_to_batteries}m, a cuadro CA: ${form.distance_to_ac_box}m. Calcula la configuración de strings, producción estimada, y da todos los materiales eléctricos necesarios (cables con secciones, protecciones, cuadros, conectores) y esquema de conexionado.`
      : `Dado un consumo de ${form.consumption_kwh} kWh/día, diseña la instalación solar fotovoltaica completa calculando el número de paneles necesarios, inversor, baterías, configuración de strings. Distancia paneles a cuadro CC: ${form.distance_panels_to_dc_box}m, inversor a baterías: ${form.distance_inverter_to_batteries}m, a cuadro CA: ${form.distance_to_ac_box}m. Incluye todos los materiales eléctricos con secciones de cable, protecciones y esquema de conexionado.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          num_paneles: { type: "number" },
          potencia_panel_w: { type: "number" },
          potencia_total_kwp: { type: "number" },
          produccion_estimada_kwh_anio: { type: "number" },
          config_strings: { type: "string" },
          inversor_sugerido: { type: "string" },
          baterias_sugeridas: { type: "string" },
          esquema_conexionado: { type: "string" },
          materiales: { type: "array", items: { type: "object", properties: { material: { type: "string" }, cantidad: { type: "number" }, especificacion: { type: "string" } } } },
          materiales_electricos: { type: "array", items: { type: "object", properties: { material: { type: "string" }, especificacion: { type: "string" }, cantidad: { type: "number" } } } },
          observaciones: { type: "string" }
        }
      }
    });
    setResult(res);
    setCalculating(false);
  };

  const saveCalc = async () => {
    if (!result) return;
    setSaving(true);
    await base44.entities.SolarCalculation.create({
      contact_id: form.contact_id, contact_name: form.contact_name,
      date: format(new Date(), 'yyyy-MM-dd'), calc_mode: mode,
      consumption_kwh: form.consumption_kwh, num_panels: result.num_paneles || form.num_panels,
      panel_power_w: result.potencia_panel_w || form.panel_power_w,
      total_power_kwp: result.potencia_total_kwp,
      estimated_production_kwh_year: result.produccion_estimada_kwh_anio,
      string_config: result.config_strings,
      distance_panels_to_dc_box: form.distance_panels_to_dc_box,
      distance_inverter_to_batteries: form.distance_inverter_to_batteries,
      distance_to_ac_box: form.distance_to_ac_box,
      materials_list: result.materiales?.map(m => ({ material: m.material, quantity: m.cantidad, specification: m.especificacion })),
      electrical_materials: result.materiales_electricos?.map(m => ({ material: m.material, specification: m.especificacion, quantity: m.cantidad })),
      wiring_schema: result.esquema_conexionado, notes: result.observaciones
    });
    if (form.contact_id) {
      await base44.entities.ClientDocument.create({
        contact_id: form.contact_id, contact_name: form.contact_name,
        title: `Cálculo Solar - ${format(new Date(), 'dd/MM/yyyy')}`,
        doc_type: 'calculo_solar', date: format(new Date(), 'yyyy-MM-dd')
      });
    }
    setSaving(false);
    alert('Cálculo guardado');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Sun className="w-6 h-6 text-amber-500" />Cálculo Solar</h1>

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList>
          <TabsTrigger value="directo">Diseño directo</TabsTrigger>
          <TabsTrigger value="por_consumo">Por consumo</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Select value={form.contact_id} onValueChange={v => {
            const c = contacts.find(co => co.id === v);
            setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
          }}>
            <SelectTrigger><SelectValue placeholder="Vincular a cliente" /></SelectTrigger>
            <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
          </Select>

          {mode === 'por_consumo' ? (
            <div><label className="text-xs text-gray-500">Consumo diario (kWh/día)</label>
            <Input type="number" value={form.consumption_kwh} onChange={e => setForm({...form, consumption_kwh: parseFloat(e.target.value)})} /></div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Nº paneles</label><Input type="number" value={form.num_panels} onChange={e => setForm({...form, num_panels: parseInt(e.target.value)})} /></div>
              <div><label className="text-xs text-gray-500">Potencia panel (W)</label><Input type="number" value={form.panel_power_w} onChange={e => setForm({...form, panel_power_w: parseInt(e.target.value)})} /></div>
              <div><label className="text-xs text-gray-500">Potencia inversor (W)</label><Input type="number" value={form.inverter_power_w} onChange={e => setForm({...form, inverter_power_w: parseInt(e.target.value)})} /></div>
              <div><label className="text-xs text-gray-500">Cap. batería (kWh)</label><Input type="number" value={form.battery_capacity_kwh} onChange={e => setForm({...form, battery_capacity_kwh: parseFloat(e.target.value)})} /></div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div><label className="text-xs text-gray-500">Dist. paneles-CC (m)</label><Input type="number" value={form.distance_panels_to_dc_box} onChange={e => setForm({...form, distance_panels_to_dc_box: parseFloat(e.target.value)})} /></div>
            <div><label className="text-xs text-gray-500">Dist. inv-bat (m)</label><Input type="number" value={form.distance_inverter_to_batteries} onChange={e => setForm({...form, distance_inverter_to_batteries: parseFloat(e.target.value)})} /></div>
            <div><label className="text-xs text-gray-500">Dist. cuadro CA (m)</label><Input type="number" value={form.distance_to_ac_box} onChange={e => setForm({...form, distance_to_ac_box: parseFloat(e.target.value)})} /></div>
          </div>

          <Button onClick={calculate} disabled={calculating} className="w-full bg-amber-600">
            {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
            Calcular instalación
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card ref={printRef}>
          <CardHeader><CardTitle>Resultado - Instalación Solar</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CompanyHeader className="mb-3 pb-3 border-b" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Potencia total</p>
                <p className="text-xl font-bold text-amber-700">{result.potencia_total_kwp} kWp</p>
                <p className="text-xs">{result.num_paneles} paneles × {result.potencia_panel_w}W</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Producción estimada</p>
                <p className="text-xl font-bold text-green-700">{result.produccion_estimada_kwh_anio?.toLocaleString()} kWh/año</p>
              </div>
            </div>

            {result.config_strings && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="font-medium text-blue-700">Configuración strings:</p>
                <p>{result.config_strings}</p>
              </div>
            )}

            {result.esquema_conexionado && (
              <div className="bg-gray-50 p-3 rounded-lg text-sm">
                <p className="font-medium mb-1">Esquema de conexionado:</p>
                <p className="whitespace-pre-wrap text-xs">{result.esquema_conexionado}</p>
              </div>
            )}

            {result.materiales?.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Materiales generales</p>
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-1">Material</th><th className="p-1">Cant.</th><th className="p-1">Especificación</th></tr></thead>
                  <tbody>{result.materiales.map((m, i) => <tr key={i} className="border-b"><td className="p-1">{m.material}</td><td className="p-1 text-center">{m.cantidad}</td><td className="p-1">{m.especificacion}</td></tr>)}</tbody>
                </table>
              </div>
            )}

            {result.materiales_electricos?.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Materiales eléctricos</p>
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-1">Material</th><th className="p-1">Cant.</th><th className="p-1">Especificación</th></tr></thead>
                  <tbody>{result.materiales_electricos.map((m, i) => <tr key={i} className="border-b"><td className="p-1">{m.material}</td><td className="p-1 text-center">{m.cantidad}</td><td className="p-1">{m.especificacion}</td></tr>)}</tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2">
              <PrintButton contentRef={printRef} title="Cálculo Solar" />
              <Button onClick={saveCalc} disabled={saving} className="bg-green-600">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar en cliente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}