import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Battery, Calculator, Save, ShoppingCart, Loader2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import BatteryWiringDiagram from '../components/BatteryWiringDiagram';

function calcBattery(form) {
  const consumoDiarioKwh = parseFloat(form.consumo_diario) || 5;
  const autonomiaDias = parseFloat(form.autonomia_dias) || 2;
  const profundidadDescarga = parseFloat(form.profundidad_descarga) || 0.8;
  const voltajeSistema = parseInt(form.voltaje_sistema) || 48;
  const eficienciaInversor = parseFloat(form.eficiencia_inversor) || 0.9;
  const potenciaPicoW = parseFloat(form.potencia_pico_w) || 1000;
  const tipoRed = form.tipo_red || 'aislada';

  // Energía total necesaria en baterías
  const energiaNecesariaKwh = (consumoDiarioKwh * autonomiaDias) / (profundidadDescarga * eficienciaInversor);
  const energiaNecesariaAh = (energiaNecesariaKwh * 1000) / voltajeSistema;

  // Baterías LiFePO4 estándar 100Ah/48V = 4.8kWh
  const capBateria = voltajeSistema === 48 ? 100 : (voltajeSistema === 24 ? 200 : 400);
  const numBaterias = Math.ceil(energiaNecesariaAh / capBateria);
  const energiaTotalKwh = (numBaterias * capBateria * voltajeSistema) / 1000;

  // Inversor/Cargador
  const potenciaInversorKw = Math.ceil(potenciaPicoW / 1000 * 1.25);
  const potenciaInversorW = potenciaInversorKw * 1000;

  // Cargador de baterías
  const corrienteCargaA = Math.ceil(energiaNecesariaAh * 0.2); // C/5 recomendado
  const potenciaCargadorKw = Math.ceil((corrienteCargaA * voltajeSistema) / 1000 * 1.1);

  // Generador de apoyo
  const potenciaGeneradorKva = Math.ceil(potenciaInversorKw * 1.3);

  // PPT / MPPT (si hay paneles)
  const panelW = parseInt(form.panel_power_w) || 400;
  const numPaneles = parseInt(form.num_paneles) || 0;
  const totalPanelW = numPaneles * panelW;
  const mpptA = totalPanelW > 0 ? Math.ceil(totalPanelW / voltajeSistema * 1.25) : 0;
  const mpptKw = totalPanelW > 0 ? Math.ceil(totalPanelW / 1000 * 1.1) : 0;

  // BMS
  const corrienteBmsA = Math.ceil(potenciaInversorW / voltajeSistema * 1.2);

  return {
    consumoDiarioKwh,
    autonomiaDias,
    voltajeSistema,
    energiaNecesariaKwh: energiaNecesariaKwh.toFixed(2),
    energiaNecesariaAh: energiaNecesariaAh.toFixed(0),
    numBaterias,
    capBateria,
    energiaTotalKwh: energiaTotalKwh.toFixed(2),
    potenciaInversorKw,
    potenciaInversorW,
    corrienteCargaA,
    potenciaCargadorKw,
    potenciaGeneradorKva,
    mpptA,
    mpptKw,
    numPaneles,
    totalPanelW,
    corrienteBmsA,
    tipoRed,
  };
}

export default function BatteryCalc() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    contact_id: '', contact_name: '',
    consumo_diario: 5,
    autonomia_dias: 2,
    profundidad_descarga: 0.8,
    voltaje_sistema: 48,
    eficiencia_inversor: 0.9,
    potencia_pico_w: 3000,
    tipo_red: 'aislada',
    num_paneles: 0,
    panel_power_w: 400,
  });
  const [result, setResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiBudget, setAiBudget] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const printRef = useRef(null);

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, []);

  const calculate = () => {
    setResult(calcBattery(form));
    setAiBudget(null);
  };

  const generateAiBudget = async () => {
    if (!result) return;
    setAiLoading(true);
    const prompt = `Eres un experto en instalaciones de almacenamiento de energía solar y sistemas off-grid/híbridos en España.
    
Para un sistema con los siguientes parámetros:
- Consumo diario: ${result.consumoDiarioKwh} kWh/día
- Autonomía: ${result.autonomiaDias} días
- Voltaje sistema: ${result.voltajeSistema}V
- Baterías necesarias: ${result.numBaterias}x LiFePO4 ${result.capBateria}Ah ${result.voltajeSistema}V
- Inversor/cargador: ${result.potenciaInversorKw}kW
- MPPT: ${result.mpptKw > 0 ? `${result.mpptKw}kW, ${result.mpptA}A` : 'No aplica'}
- Generador apoyo: ${result.potenciaGeneradorKva}kVA
- Tipo instalación: ${result.tipoRed}

Dame un presupuesto detallado con:
1. Lista de materiales con precio estimado en euros (precio de compra para instalador, sin IVA)
2. Para cada equipo, indica 2-3 marcas/modelos recomendados y dónde comprarlos en España (distribuidores, tiendas online)
3. Precio de mano de obra estimado
4. Total aproximado sin IVA y con IVA 21%

Responde en formato JSON con esta estructura:
{
  "items": [
    {"description": "...", "quantity": 1, "unit_price": 0, "total": 0, "brands": "...", "where_to_buy": "..."}
  ],
  "labor_cost": 0,
  "subtotal": 0,
  "iva": 0,
  "total_iva": 0,
  "notes": "..."
}`;
    
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit_price: { type: "number" },
                total: { type: "number" },
                brands: { type: "string" },
                where_to_buy: { type: "string" }
              }
            }
          },
          labor_cost: { type: "number" },
          subtotal: { type: "number" },
          iva: { type: "number" },
          total_iva: { type: "number" },
          notes: { type: "string" }
        }
      }
    });
    setAiBudget(res);
    setAiLoading(false);
  };

  const save = async () => {
    if (!result) return;
    const desc = `${result.numBaterias}x ${result.capBateria}Ah ${result.voltajeSistema}V, inv. ${result.potenciaInversorKw}kW`;
    if (savedId) {
      await base44.entities.SolarCalculation.update(savedId, { battery_capacity_kwh: parseFloat(result.energiaTotalKwh), num_batteries: result.numBaterias, inverter_power_w: result.potenciaInversorKw * 1000, notes: desc });
    } else {
      const rec = await base44.entities.SolarCalculation.create({ contact_id: form.contact_id || '', contact_name: form.contact_name || 'Sin cliente', calc_mode: 'directo', battery_capacity_kwh: parseFloat(result.energiaTotalKwh), num_batteries: result.numBaterias, inverter_power_w: result.potenciaInversorKw * 1000, date: format(new Date(), 'yyyy-MM-dd'), notes: desc });
      setSavedId(rec.id);
      if (form.contact_id) await base44.entities.ClientDocument.create({ contact_id: form.contact_id, contact_name: form.contact_name, title: `Cálculo baterías ${result.energiaTotalKwh}kWh — ${format(new Date(), 'dd/MM/yyyy')}`, doc_type: 'calculo_solar', date: format(new Date(), 'yyyy-MM-dd'), description: desc });
    }
    setSavedMsg(savedId ? '¡Actualizado!' : '¡Guardado!');
    setEditing(false);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Battery className="w-6 h-6 text-green-600" />
        Cálculo de Baterías y Sistema de Almacenamiento
      </h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <Select value={form.contact_id} onValueChange={v => {
            const c = contacts.find(co => co.id === v);
            setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
          }}>
            <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
            <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
          </Select>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="font-semibold text-sm text-gray-700">Consumo y autonomía</p>
              <div>
                <label className="text-xs text-gray-500">Consumo diario (kWh/día)</label>
                <Input type="number" step="0.5" value={form.consumo_diario} onChange={e => setForm({...form, consumo_diario: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Autonomía deseada (días sin sol/carga)</label>
                <Input type="number" value={form.autonomia_dias} onChange={e => setForm({...form, autonomia_dias: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Potencia pico máxima (W)</label>
                <Input type="number" value={form.potencia_pico_w} onChange={e => setForm({...form, potencia_pico_w: e.target.value})} />
                <p className="text-[10px] text-gray-400 mt-0.5">Suma de todos los aparatos que pueden funcionar simultáneamente</p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="font-semibold text-sm text-gray-700">Configuración del sistema</p>
              <div>
                <label className="text-xs text-gray-500">Voltaje del sistema</label>
                <Select value={String(form.voltaje_sistema)} onValueChange={v => setForm({...form, voltaje_sistema: parseInt(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12V (pequeñas instalaciones)</SelectItem>
                    <SelectItem value="24">24V (instalaciones medias)</SelectItem>
                    <SelectItem value="48">48V (recomendado para > 3kWh)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo de instalación</label>
                <Select value={form.tipo_red} onValueChange={v => setForm({...form, tipo_red: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aislada">Aislada (off-grid)</SelectItem>
                    <SelectItem value="hibrida">Híbrida (con red eléctrica)</SelectItem>
                    <SelectItem value="backup">Backup / UPS (solo emergencias)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Profundidad de descarga máxima</label>
                <Select value={String(form.profundidad_descarga)} onValueChange={v => setForm({...form, profundidad_descarga: parseFloat(v)})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.5">50% (máxima vida útil)</SelectItem>
                    <SelectItem value="0.7">70% (equilibrado)</SelectItem>
                    <SelectItem value="0.8">80% (recomendado LiFePO4)</SelectItem>
                    <SelectItem value="0.9">90% (máximo aprovechamiento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-amber-800">Paneles solares de carga (opcional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Nº de paneles</label>
                <Input type="number" value={form.num_paneles} onChange={e => setForm({...form, num_paneles: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Potencia por panel (W)</label>
                <Input type="number" value={form.panel_power_w} onChange={e => setForm({...form, panel_power_w: e.target.value})} />
              </div>
            </div>
          </div>

          {form.contact_id && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 flex items-center gap-2">
              <UserCheck className="w-4 h-4" /> Vinculado a: <strong>{form.contact_name}</strong>
            </div>
          )}
          <Button onClick={calculate} className="w-full bg-green-600 hover:bg-green-700">
            <Calculator className="w-4 h-4 mr-2" /> Calcular sistema de baterías
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div ref={printRef} className="space-y-4">
          <CompanyHeader />

          {/* Resumen */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 py-3">
              <CardTitle className="text-green-700 text-base">Resultado del cálculo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-green-700">{result.numBaterias}</p>
                  <p className="text-xs text-green-600">Baterías</p>
                  <p className="text-[10px] text-green-500">{result.capBateria}Ah {result.voltajeSistema}V</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-700">{result.energiaTotalKwh} kWh</p>
                  <p className="text-xs text-blue-600">Capacidad total</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-purple-700">{result.potenciaInversorKw} kW</p>
                  <p className="text-xs text-purple-600">Inversor/Cargador</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-orange-700">{result.potenciaGeneradorKva} kVA</p>
                  <p className="text-xs text-orange-600">Generador apoyo</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="text-gray-500">Energía necesaria en baterías:</span> <strong>{result.energiaNecesariaKwh} kWh ({result.energiaNecesariaAh} Ah)</strong></p>
                <p><span className="text-gray-500">Corriente cargador baterías:</span> <strong>{result.corrienteCargaA} A ({result.potenciaCargadorKw} kW)</strong></p>
                {result.mpptKw > 0 && <p><span className="text-gray-500">Regulador MPPT solar:</span> <strong>{result.mpptKw} kW / {result.mpptA} A ({result.numPaneles} paneles x {result.totalPanelW/result.numPaneles}W)</strong></p>}
                <p><span className="text-gray-500">BMS (Battery Management System):</span> <strong>{result.corrienteBmsA} A mínimo</strong></p>
                <p><span className="text-gray-500">Tipo de instalación:</span> <strong>{result.tipoRed}</strong></p>
              </div>

              {/* Wiring Diagram */}
              <div>
                <p className="font-semibold text-sm mb-2">Esquema de conexionado</p>
                <BatteryWiringDiagram result={result} form={form} />
              </div>

              {/* Tabla de componentes */}
              <div>
                <p className="font-semibold text-sm mb-2">Equipos recomendados</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">Equipo</th>
                        <th className="border border-gray-300 p-2 text-center">Cant.</th>
                        <th className="border border-gray-300 p-2 text-left">Especificación</th>
                        <th className="border border-gray-300 p-2 text-left">Marcas sugeridas</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-white">
                        <td className="border border-gray-300 p-2 font-medium">🔋 Batería LiFePO4</td>
                        <td className="border border-gray-300 p-2 text-center font-bold text-green-700">{result.numBaterias}</td>
                        <td className="border border-gray-300 p-2">{result.capBateria}Ah {result.voltajeSistema}V ({(result.capBateria * result.voltajeSistema / 1000).toFixed(1)} kWh/ud)</td>
                        <td className="border border-gray-300 p-2">Pylontech, BYD, Huawei LUNA, Eve</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 p-2 font-medium">⚡ Inversor/Cargador</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">1</td>
                        <td className="border border-gray-300 p-2">{result.potenciaInversorKw} kW ({result.voltajeSistema}V DC)</td>
                        <td className="border border-gray-300 p-2">Victron MultiPlus, Growatt, Studer, SMA Sunny Island</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="border border-gray-300 p-2 font-medium">🔌 Cargador baterías</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">1</td>
                        <td className="border border-gray-300 p-2">{result.corrienteCargaA}A / {result.potenciaCargadorKw} kW</td>
                        <td className="border border-gray-300 p-2">Victron Blue Smart, Tracer, EPEver</td>
                      </tr>
                      {result.mpptKw > 0 && (
                        <tr className="bg-gray-50">
                          <td className="border border-gray-300 p-2 font-medium">☀️ Regulador MPPT</td>
                          <td className="border border-gray-300 p-2 text-center font-bold">1</td>
                          <td className="border border-gray-300 p-2">{result.mpptA}A / {result.mpptKw} kW</td>
                          <td className="border border-gray-300 p-2">Victron SmartSolar, EPEver Tracer AN, Renogy</td>
                        </tr>
                      )}
                      <tr className="bg-white">
                        <td className="border border-gray-300 p-2 font-medium">🏭 Generador apoyo</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">1</td>
                        <td className="border border-gray-300 p-2">{result.potenciaGeneradorKva} kVA (gasolina/gas)</td>
                        <td className="border border-gray-300 p-2">Honda EU, Genmac, Mosa, Briggs & Stratton</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 p-2 font-medium">🛡️ BMS</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">1</td>
                        <td className="border border-gray-300 p-2">Min. {result.corrienteBmsA}A {result.voltajeSistema}V (incluido en baterías LiFePO4)</td>
                        <td className="border border-gray-300 p-2">Integrado en Pylontech / BYD / LiFePO4</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="border border-gray-300 p-2 font-medium">🔴 Cable DC {result.voltajeSistema}V</td>
                        <td className="border border-gray-300 p-2 text-center font-bold">~10 m</td>
                        <td className="border border-gray-300 p-2">35-70mm² según distancia</td>
                        <td className="border border-gray-300 p-2">Prysmian, Nexans, Top Cable</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap no-print items-center">
                <PrintButton contentRef={printRef} title="Cálculo Baterías" />
                {!editing && !savedId && <Button onClick={save} variant="outline" size="sm"><Save className="w-4 h-4 mr-2" />Guardar cálculo</Button>}
                {savedId && !editing && <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="border-blue-400 text-blue-600">✏️ Editar y actualizar</Button>}
                {editing && <Button onClick={save} size="sm" className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar cambios</Button>}
                {savedMsg && <span className="text-xs text-green-600 font-medium">{savedMsg}</span>}
                {savedId && <span className="text-[10px] text-gray-400">Guardado</span>}
                <Button onClick={generateAiBudget} className="bg-purple-600 hover:bg-purple-700" size="sm" disabled={aiLoading}>
                  {aiLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando presupuesto IA...</> : <><ShoppingCart className="w-4 h-4 mr-2" />Presupuesto IA + Dónde comprar</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Budget */}
          {(aiLoading || aiBudget) && (
            <Card className="border-purple-200">
              <CardHeader className="bg-purple-50 py-3">
                <CardTitle className="text-purple-700 text-base flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" /> Presupuesto IA — Precios y Dónde Comprar
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {aiLoading && (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600 mb-2" />
                    <p className="text-sm text-gray-500">Consultando precios actuales y distribuidores...</p>
                  </div>
                )}
                {aiBudget && (
                  <div className="space-y-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-purple-100">
                            <th className="border border-purple-200 p-2 text-left">Material / Equipo</th>
                            <th className="border border-purple-200 p-2 text-center">Cant.</th>
                            <th className="border border-purple-200 p-2 text-right">P. Unit.</th>
                            <th className="border border-purple-200 p-2 text-right">Total</th>
                            <th className="border border-purple-200 p-2 text-left">Marcas</th>
                            <th className="border border-purple-200 p-2 text-left">Dónde comprar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {aiBudget.items?.map((item, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-200 p-2">{item.description}</td>
                              <td className="border border-gray-200 p-2 text-center">{item.quantity}</td>
                              <td className="border border-gray-200 p-2 text-right">{item.unit_price?.toFixed(2)} €</td>
                              <td className="border border-gray-200 p-2 text-right font-medium">{item.total?.toFixed(2)} €</td>
                              <td className="border border-gray-200 p-2 text-xs text-blue-700">{item.brands}</td>
                              <td className="border border-gray-200 p-2 text-xs text-green-700">{item.where_to_buy}</td>
                            </tr>
                          ))}
                          {aiBudget.labor_cost > 0 && (
                            <tr className="bg-blue-50">
                              <td className="border border-gray-200 p-2 font-medium" colSpan={3}>Mano de obra instalación</td>
                              <td className="border border-gray-200 p-2 text-right font-medium">{aiBudget.labor_cost?.toFixed(2)} €</td>
                              <td colSpan={2} className="border border-gray-200 p-2 text-xs text-gray-500">Incluye instalación, configuración y puesta en marcha</td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={3} className="border border-gray-300 p-2">Subtotal (sin IVA)</td>
                            <td className="border border-gray-300 p-2 text-right">{aiBudget.subtotal?.toFixed(2)} €</td>
                            <td colSpan={2} className="border border-gray-300 p-2"></td>
                          </tr>
                          <tr className="bg-gray-100">
                            <td colSpan={3} className="border border-gray-300 p-2">IVA 21%</td>
                            <td className="border border-gray-300 p-2 text-right">{aiBudget.iva?.toFixed(2)} €</td>
                            <td colSpan={2} className="border border-gray-300 p-2"></td>
                          </tr>
                          <tr className="bg-green-100 font-bold text-green-800">
                            <td colSpan={3} className="border border-gray-300 p-2 text-base">TOTAL CON IVA</td>
                            <td className="border border-gray-300 p-2 text-right text-base">{aiBudget.total_iva?.toFixed(2)} €</td>
                            <td colSpan={2} className="border border-gray-300 p-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {aiBudget.notes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                        <p className="font-medium mb-1">ℹ️ Notas del presupuesto IA:</p>
                        <p>{aiBudget.notes}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400">* Precios orientativos para instalador profesional (sin IVA). Los precios pueden variar según proveedor y fecha. Consultar ofertas actuales.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}