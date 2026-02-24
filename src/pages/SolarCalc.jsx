import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Calculator, Save, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import SolarWiringDiagram from '../components/SolarWiringDiagram';

function calcSolar(form, mode) {
  let numPanels = parseInt(form.num_panels) || 0;
  let panelW = parseInt(form.panel_power_w) || 400;
  let consumKwh = parseFloat(form.consumption_kwh) || 0;
  let hsp = 4.5; // Horas sol pico media España

  if (mode === 'por_consumo') {
    // Calcular a la inversa
    const dailyKwh = consumKwh > 50 ? consumKwh / 365 : consumKwh; // si > 50 lo trata como anual
    numPanels = Math.ceil((dailyKwh * 1000) / (panelW * hsp * 0.8));
  }

  const totalKwp = (numPanels * panelW) / 1000;
  const dailyProduction = totalKwp * hsp * 0.8;
  const yearlyProduction = dailyProduction * 365;
  const inverterKw = Math.ceil(totalKwp * 0.9);
  const numStrings = Math.max(1, Math.ceil(numPanels / 16));
  const batteryKwh = dailyProduction * 0.5;
  const numBatteries = Math.ceil(batteryKwh / 2.4);

  // Distancias
  const distPanelsDC = parseFloat(form.distance_panels_to_dc_box) || 10;
  const distInvBat = parseFloat(form.distance_inverter_to_batteries) || 3;
  const distAC = parseFloat(form.distance_to_ac_box) || 5;

  // Calcular secciones de cable
  const dcCurrentA = Math.ceil((numPanels / numStrings) * (panelW / (32 * numStrings)));
  const dcCableMm2 = dcCurrentA > 20 ? 6 : 4;

  const materials = [
    { material: `Panel solar ${panelW}Wp monocristalino`, quantity: numPanels, specification: 'unidades' },
    { material: `Inversor ${inverterKw}kW`, quantity: 1, specification: 'unidad' },
    { material: `Batería LiFePO4 2,4kWh 51,2V`, quantity: numBatteries, specification: 'unidades' },
    { material: `Cable solar DC 6mm² (positivo + negativo)`, quantity: distPanelsDC * 2, specification: 'metros' },
    { material: `Cable flexible ${dcCableMm2}mm² DC (inversor-baterías)`, quantity: distInvBat * 2, specification: 'metros' },
    { material: `Cable AC 3x6mm²`, quantity: distAC, specification: 'metros' },
    { material: `Estructura soporte cubierta plana/inclinada`, quantity: numPanels, specification: 'unidades panel' },
    { material: `Caja fusibles DC (protección strings)`, quantity: numStrings, specification: 'unidades' },
    { material: `Interruptor seccionador DC`, quantity: numStrings * 2, specification: 'unidades' },
    { material: `Variómetro / contador bidireccional`, quantity: 1, specification: 'unidad' },
    { material: `Cuadro protección AC (ICP, diferencial, IGA)`, quantity: 1, specification: 'unidad' },
    { material: `Tubo corrugado PVC Ø32mm`, quantity: distPanelsDC + distAC, specification: 'metros' },
    { material: `Conector MC4`, quantity: numPanels * 4, specification: 'unidades' },
    { material: `BMS (Battery Management System)`, quantity: 1, specification: 'unidad (incluido en baterías LiFePO4)' },
  ];

  const electricalMaterials = [
    { material: 'IGA trifásico 40A', specification: 'Cuadro general', quantity: 1 },
    { material: 'Diferencial 40A/30mA', specification: 'Protección circuitos AC', quantity: 1 },
    { material: 'Protección sobretensión tipo 2', specification: 'Cuadro AC', quantity: 1 },
    { material: 'Protección sobretensión DC tipo 2', specification: 'Cuadro DC', quantity: numStrings },
    { material: 'Bornas carril DIN', specification: 'Cuadros', quantity: 20 },
    { material: 'Canaleta PVC 60x40mm', specification: 'Interior cuadro', quantity: 2 },
  ];

  return { numPanels, totalKwp, dailyProduction, yearlyProduction, inverterKw, numStrings, batteryKwh, numBatteries, materials, electricalMaterials, dcCableMm2 };
}

export default function SolarCalc() {
  const [contacts, setContacts] = useState([]);
  const [mode, setMode] = useState('directo');
  const [form, setForm] = useState({
    contact_id: '', contact_name: '',
    num_panels: 8, panel_power_w: 400, consumption_kwh: 15,
    distance_panels_to_dc_box: 15, distance_inverter_to_batteries: 3, distance_to_ac_box: 8,
  });
  const [result, setResult] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const printRef = useRef(null);

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, []);

  const calculate = () => {
    const res = calcSolar(form, mode);
    setResult(res);
  };

  const save = async () => {
    if (!result) return;
    const desc = `${result.numPanels} paneles, ${result.totalKwp.toFixed(2)}kWp, inv. ${result.inverterKw}kW`;
    if (savedId) {
      await base44.entities.SolarCalculation.update(savedId, { num_panels: result.numPanels, total_power_kwp: result.totalKwp, inverter_power_w: result.inverterKw * 1000, estimated_production_kwh_year: result.yearlyProduction, notes: desc });
    } else {
      const rec = await base44.entities.SolarCalculation.create({ contact_id: form.contact_id || '', contact_name: form.contact_name || 'Sin cliente', calc_mode: mode, num_panels: result.numPanels, panel_power_w: parseInt(form.panel_power_w), total_power_kwp: result.totalKwp, inverter_power_w: result.inverterKw * 1000, estimated_production_kwh_year: result.yearlyProduction, date: format(new Date(), 'yyyy-MM-dd'), notes: desc });
      setSavedId(rec.id);
      if (form.contact_id) await base44.entities.ClientDocument.create({ contact_id: form.contact_id, contact_name: form.contact_name, title: `Cálculo solar ${result.totalKwp.toFixed(2)}kWp — ${format(new Date(), 'dd/MM/yyyy')}`, doc_type: 'calculo_solar', date: format(new Date(), 'yyyy-MM-dd'), description: desc });
    }
    setSavedMsg(savedId ? '¡Actualizado!' : '¡Guardado!');
    setEditing(false);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Sun className="w-6 h-6 text-amber-500" />Cálculo Solar Fotovoltaico</h1>

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList className="w-full">
          <TabsTrigger value="directo" className="flex-1">Por número de paneles</TabsTrigger>
          <TabsTrigger value="por_consumo" className="flex-1">Por consumo (kWh)</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Select value={form.contact_id} onValueChange={v => {
            const c = contacts.find(co => co.id === v);
            setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
          }}>
            <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
            <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
          </Select>

          {mode === 'por_consumo' ? (
            <div>
              <label className="text-sm font-medium">Consumo diario (kWh/día) o anual (kWh/año)</label>
              <Input type="number" value={form.consumption_kwh} onChange={e => setForm({...form, consumption_kwh: parseFloat(e.target.value)||0})} placeholder="Ej: 15 kWh/día o 5000 kWh/año" className="mt-1" />
              <p className="text-[10px] text-gray-400 mt-1">Si introduces un valor mayor de 50 se tratará como anual</p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            {mode === 'directo' && (
              <div><label className="text-xs text-gray-500">Nº paneles</label><Input type="number" value={form.num_panels} onChange={e => setForm({...form, num_panels: parseInt(e.target.value)||0})} /></div>
            )}
            <div><label className="text-xs text-gray-500">Potencia panel (W)</label><Input type="number" value={form.panel_power_w} onChange={e => setForm({...form, panel_power_w: parseInt(e.target.value)||0})} /></div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium">Distancias de instalación</p>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-gray-500">Paneles → cuadro DC (m)</label><Input type="number" value={form.distance_panels_to_dc_box} onChange={e => setForm({...form, distance_panels_to_dc_box: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Inv. → baterías (m)</label><Input type="number" value={form.distance_inverter_to_batteries} onChange={e => setForm({...form, distance_inverter_to_batteries: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Inv. → cuadro AC (m)</label><Input type="number" value={form.distance_to_ac_box} onChange={e => setForm({...form, distance_to_ac_box: parseFloat(e.target.value)||0})} /></div>
            </div>
          </div>

          {/* Vincular cliente */}
          {form.contact_id && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Vinculado a: <strong>{form.contact_name}</strong>
            </div>
          )}
          <Button onClick={calculate} className="w-full bg-amber-500 hover:bg-amber-600">
            <Calculator className="w-4 h-4 mr-2" /> Calcular instalación solar
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div ref={printRef}>
          <CompanyHeader className="mb-4" />
          <Card className="border-amber-200">
            <CardHeader className="bg-amber-50">
              <CardTitle className="text-amber-700">Resultado instalación solar</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-amber-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-amber-600">{result.numPanels}</p>
                  <p className="text-xs text-amber-500">Paneles</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-orange-600">{result.totalKwp.toFixed(2)} kWp</p>
                  <p className="text-xs text-orange-500">Potencia pico</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-600">{result.inverterKw} kW</p>
                  <p className="text-xs text-blue-500">Inversor</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-600">{result.numBatteries}x 2,4kWh</p>
                  <p className="text-xs text-green-500">Baterías</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                <p><span className="text-gray-500">Producción diaria estimada:</span> <strong>{result.dailyProduction.toFixed(2)} kWh/día</strong></p>
                <p><span className="text-gray-500">Producción anual estimada:</span> <strong>{result.yearlyProduction.toFixed(0)} kWh/año</strong></p>
                <p><span className="text-gray-500">Nº strings:</span> <strong>{result.numStrings}</strong></p>
                <p><span className="text-gray-500">Capacidad baterías total:</span> <strong>{(result.numBatteries * 2.4).toFixed(1)} kWh</strong></p>
                <p><span className="text-gray-500">Sección cable DC:</span> <strong>{result.dcCableMm2} mm²</strong></p>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">Esquema de conexionado</p>
                <SolarWiringDiagram result={result} form={form} />
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">Lista de materiales</p>
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-gray-100"><th className="border p-1 text-left">Material</th><th className="border p-1 text-right">Cant.</th><th className="border p-1 text-left">Ud.</th></tr></thead>
                  <tbody>
                    {result.materials.map((m, i) => (
                      <tr key={i} className="border-b"><td className="border p-1">{m.material}</td><td className="border p-1 text-right">{m.quantity}</td><td className="border p-1">{m.specification}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">Material eléctrico cuadros</p>
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-gray-100"><th className="border p-1 text-left">Elemento</th><th className="border p-1 text-left">Especificación</th><th className="border p-1 text-right">Cant.</th></tr></thead>
                  <tbody>
                    {result.electricalMaterials.map((m, i) => (
                      <tr key={i} className="border-b"><td className="border p-1">{m.material}</td><td className="border p-1">{m.specification}</td><td className="border p-1 text-right">{m.quantity}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 flex-wrap no-print items-center">
                <PrintButton contentRef={printRef} title="Cálculo Solar Fotovoltaico" />
                {!editing && !savedId && <Button onClick={save} variant="outline" size="sm"><Save className="w-4 h-4 mr-2" />Guardar cálculo</Button>}
                {savedId && !editing && <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="border-blue-400 text-blue-600">✏️ Editar y actualizar</Button>}
                {editing && <Button onClick={save} size="sm" className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar cambios</Button>}
                {savedMsg && <span className="text-xs text-green-600 font-medium">{savedMsg}</span>}
                {savedId && <span className="text-[10px] text-gray-400">Guardado en base de datos</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}