import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Calculator, Save, UserCheck, Edit3, CheckCircle, TrendingUp, Package } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import SolarWiringDiagram from '../components/SolarWiringDiagram';
import SolarSiteReport from '../components/solar/SolarSiteReport';
import SolarPVGISCalc from '../components/solar/SolarPVGISCalc';
import PVGISReport from '../components/solar/PVGISReport';
import ClientSparePartsTab from '../components/solar/ClientSparePartsTab';
import InverterComparison from '../components/solar/InverterComparison';

function calcSolar(form, mode) {
  let numPanels = parseInt(form.num_panels) || 0;
  let panelW = parseInt(form.panel_power_w) || 400;
  let consumKwh = parseFloat(form.consumption_kwh) || 0;
  const hsp = 4.5;
  if (mode === 'por_consumo') {
    const dailyKwh = consumKwh > 50 ? consumKwh / 365 : consumKwh;
    numPanels = Math.ceil((dailyKwh * 1000) / (panelW * hsp * 0.8));
  }
  const totalKwp = (numPanels * panelW) / 1000;
  const dailyProduction = totalKwp * hsp * 0.8;
  const yearlyProduction = dailyProduction * 365;
  const inverterKw = Math.ceil(totalKwp * 0.9) || 1;
  const numStrings = Math.max(1, Math.ceil(numPanels / 16));
  const batteryKwh = dailyProduction * 0.5;
  const numBatteries = Math.ceil(batteryKwh / 2.4) || 1;
  const distPanelsDC = parseFloat(form.distance_panels_to_dc_box) || 10;
  const distInvBat = parseFloat(form.distance_inverter_to_batteries) || 3;
  const distAC = parseFloat(form.distance_to_ac_box) || 5;
  const dcCurrentA = Math.ceil((numPanels / numStrings) * (panelW / (32 * numStrings)));
  const dcCableMm2 = dcCurrentA > 20 ? 6 : 4;

  const materials = [
    { material: `Panel solar ${panelW}Wp monocristalino PERC`, qty: numPanels, unit: 'ud', spec: `${panelW}W, Voc≈37V`, brands: 'JA Solar, Longi, Canadian Solar', shop: 'Solarwind, Krannich, ER Solar', price: `${(panelW * 0.22).toFixed(0)} €/ud` },
    { material: `Inversor híbrido ${inverterKw}kW`, qty: 1, unit: 'ud', spec: `${inverterKw}kW, MPPT doble, WiFi`, brands: 'SolarEdge, Huawei SUN2000, Fronius, Growatt', shop: 'Solarwind, Distrisol', price: `${(inverterKw * 180 + 400).toFixed(0)} €` },
    { material: `Batería LiFePO4 2,4kWh 51,2V`, qty: numBatteries, unit: 'ud', spec: '100Ah, 51,2V, BMS integrado, >6000 ciclos', brands: 'Pylontech US2000, BYD Battery Box', shop: 'Solarwind, Distrisol', price: '850 €/ud' },
    { material: `Cable solar DC 6mm² H1Z2Z2-K`, qty: distPanelsDC * 2, unit: 'm', spec: '6mm², rojo + negro, 1,5kV DC', brands: 'Prysmian, Nexans, Top Cable', shop: 'RS Components, Würth', price: '1,80 €/m' },
    { material: `Conector MC4 macho+hembra`, qty: numPanels * 4, unit: 'par', spec: 'MC4, IP67, 1000V DC, 30A', brands: 'Stäubli, Amphenol', shop: 'RS Components, Mouser', price: '1,50 €/par' },
    { material: `Estructura soporte aluminio`, qty: numPanels, unit: 'ud panel', spec: 'Aluminio anodizado, cubierta plana/inclinada', brands: 'Schletter, K2 Systems, Unirac', shop: 'Solarwind, ER Solar', price: '25 €/panel' },
    { material: `Cable AC 3x${dcCableMm2}mm² RZ1-K`, qty: distAC, unit: 'm', spec: `3x${dcCableMm2}mm², 1kV AC, flexible`, brands: 'Prysmian, Nexans', shop: 'Würth, RS Components', price: '4,50 €/m' },
    { material: `Cable DC baterías ${dcCableMm2}mm² flexible`, qty: distInvBat * 2, unit: 'm', spec: `${dcCableMm2}mm² negro/rojo, 1kV DC`, brands: 'Prysmian, Top Cable', shop: 'RS Components, Würth', price: '8 €/m' },
    { material: `Tubo corrugado PVC Ø32mm`, qty: distPanelsDC + distAC, unit: 'm', spec: 'Ø32mm, doble capa, libre halógenos', brands: 'Gewiss, Pemsa, Aiscan', shop: 'Würth, Leroy Merlin', price: '1,20 €/m' },
    { material: `Contador bidireccional MID`, qty: 1, unit: 'ud', spec: 'MID, M-Bus, trifásico 63A', brands: 'Circutor, Schneider iEM, Carlo Gavazzi', shop: 'Solarwind, RS Components', price: '180 €' },
  ];

  const electricalItems = [
    { element: 'Caja cuadro DC (fusibles + seccionador)', spec: 'IP65, DIN 8 módulos', qty: numStrings, brands: 'ABB, Hager', shop: 'RS Components, Würth', notes: 'Cuadro DC protección strings' },
    { element: `Fusibles gPV 15A/1000V DC`, spec: '10x38mm, 15A, gPV', qty: numStrings * 2, brands: 'Siba, Bussmann', shop: 'RS Components', notes: '1 por polo + repuesto' },
    { element: 'Descargador sobretensión DC tipo 2', spec: '1000V DC, Imax 40kA', qty: numStrings, brands: 'Dehn, OBO Bettermann, Citel', shop: 'RS Components, TEV', notes: 'Por string' },
    { element: 'Seccionador DC 2P 32A 1000V', spec: '2 polos, 32A, 1000V DC', qty: numStrings, brands: 'ABB, Schneider, Hager', shop: 'RS Components, TEV', notes: 'Desconexión string' },
    { element: 'Caja cuadro AC IP40', spec: 'IP40-IP65, DIN 12 módulos', qty: 1, brands: 'ABB, Hager, Legrand', shop: 'Leroy Merlin, Würth', notes: 'Cuadro AC inversor' },
    { element: `IGA ${inverterKw > 5 ? 40 : 25}A 3P+N curva C`, spec: `${inverterKw > 5 ? 40 : 25}A, 3P+N, 6kA`, qty: 1, brands: 'ABB, Schneider, Hager', shop: 'Leroy Merlin, TEV', notes: 'Protección general AC' },
    { element: 'Diferencial 40A 30mA AC', spec: '4P, 40A, 30mA, clase AC', qty: 1, brands: 'ABB, Schneider, Hager', shop: 'Leroy Merlin, RS Comp.', notes: 'Diferencial AC' },
    { element: 'Descargador sobretensión AC tipo 2', spec: '40kA, 4P, Uc 275V', qty: 1, brands: 'Dehn, Citel', shop: 'RS Components, TEV', notes: 'Cuadro AC' },
    { element: 'Bornas carril DIN 6mm²', spec: '6mm², carril 35mm', qty: 20, brands: 'Phoenix Contact, Wago', shop: 'RS Components, Würth', notes: 'Conexiones cuadro' },
  ];

  return { numPanels, totalKwp, dailyProduction, yearlyProduction, inverterKw, numStrings, batteryKwh, numBatteries, materials, electricalItems, dcCableMm2 };
}

function KpiBox({ value, label, sub, color }) {
  return (
    <div className={`${color} p-4 rounded-xl text-center border border-white/60 shadow-sm`}>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SolarCalc() {
  const [contacts, setContacts] = useState([]);
  const [mode, setMode] = useState('directo');
  const [form, setForm] = useState({
    contact_id: '', contact_name: '',
    num_panels: 8, panel_power_w: 400, consumption_kwh: 15,
    distance_panels_to_dc_box: 15, distance_inverter_to_batteries: 3, distance_to_ac_box: 8,
    lat: '', lng: '', ref_catastral: '', tilt: '', azimuth: '',
  });
  const [savedId, setSavedId] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('calculo');
  const printRef = useRef(null);

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, []);

  const result = useMemo(() => calcSolar(form, mode), [form, mode]);

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

  const contact = contacts.find(c => c.id === form.contact_id);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500 rounded-xl"><Sun className="w-6 h-6 text-white" /></div>
        <div>
          <h1 className="text-2xl font-bold">Cálculo Solar Fotovoltaico</h1>
          <p className="text-sm text-gray-500">Cálculo + rentabilidad PVGIS + plano situación + repuestos</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="calculo" className="flex-1 min-w-[80px]">⚡ Instalación</TabsTrigger>
          <TabsTrigger value="rentabilidad" className="flex-1 min-w-[80px]">📈 Rentabilidad / PVGIS</TabsTrigger>
          <TabsTrigger value="inversores" className="flex-1 min-w-[80px]">⚡ Inversores</TabsTrigger>
          <TabsTrigger value="situacion" className="flex-1 min-w-[80px]">🗺️ Plano solar</TabsTrigger>
          <TabsTrigger value="repuestos" className="flex-1 min-w-[80px]">📦 Repuestos</TabsTrigger>
        </TabsList>

        {/* ═══ CÁLCULO ═══ */}
        <TabsContent value="calculo" className="space-y-4">
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
                setSavedId(null);
              }}>
                <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>

              {mode === 'por_consumo' && (
                <div>
                  <label className="text-sm font-medium">Consumo diario (kWh/día) o anual (kWh/año)</label>
                  <Input type="number" value={form.consumption_kwh} onChange={e => setForm({...form, consumption_kwh: parseFloat(e.target.value)||0})} className="mt-1" />
                  <p className="text-[10px] text-gray-400 mt-1">Si introduces &gt;50 se trata como anual</p>
                </div>
              )}

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

              {form.contact_id && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 flex items-center gap-2">
                  <UserCheck className="w-4 h-4" /> Vinculado a: <strong>{form.contact_name}</strong>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultados en tiempo real */}
          <div ref={printRef} className="space-y-4">
            <CompanyHeader className="mb-2" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiBox value={result.numPanels} label="Paneles" color="bg-amber-50 text-amber-700" />
              <KpiBox value={`${result.totalKwp.toFixed(2)} kWp`} label="Potencia pico" color="bg-orange-50 text-orange-700" />
              <KpiBox value={`${result.inverterKw} kW`} label="Inversor" color="bg-blue-50 text-blue-700" />
              <KpiBox value={`${result.numBatteries}x 2,4kWh`} label="Baterías" color="bg-green-50 text-green-700" />
            </div>

            <Card className="border-gray-200">
              <CardHeader className="bg-gray-50 py-2"><CardTitle className="text-gray-700 text-sm">📊 Resumen técnico</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50 w-1/2">Producción diaria estimada</td><td className="p-2 font-semibold">{result.dailyProduction.toFixed(2)} kWh/día</td></tr>
                    <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Producción anual estimada</td><td className="p-2 font-semibold">{result.yearlyProduction.toFixed(0)} kWh/año</td></tr>
                    <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Nº strings</td><td className="p-2">{result.numStrings}</td></tr>
                    <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Capacidad baterías total</td><td className="p-2">{(result.numBatteries * 2.4).toFixed(1)} kWh</td></tr>
                    <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Sección cable DC</td><td className="p-2">{result.dcCableMm2} mm²</td></tr>
                    {form.contact_name && <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Cliente</td><td className="p-2">{form.contact_name}</td></tr>}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="border-amber-200">
              <CardHeader className="bg-amber-50 py-2"><CardTitle className="text-amber-700 text-sm">📐 Esquema de conexionado</CardTitle></CardHeader>
              <CardContent className="p-3"><SolarWiringDiagram result={result} form={form} /></CardContent>
            </Card>

            <Card className="border-amber-200">
              <CardHeader className="bg-amber-50 py-2"><CardTitle className="text-amber-700 text-sm">🛒 Lista de materiales — marcas, tiendas y precios</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-600 text-white">
                        <th className="p-2 text-left">Material / Equipo</th>
                        <th className="p-2 text-center w-12">Cant.</th>
                        <th className="p-2 text-left w-10">Ud.</th>
                        <th className="p-2 text-left">Especificación</th>
                        <th className="p-2 text-left">Marcas sugeridas</th>
                        <th className="p-2 text-left">Dónde comprar</th>
                        <th className="p-2 text-right w-20">Precio ref.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.materials.map((m, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-amber-50' : 'bg-amber-50'}>
                          <td className="border-b border-gray-100 p-2 font-medium">{m.material}</td>
                          <td className="border-b border-gray-100 p-2 text-center font-bold text-amber-700">{m.qty}</td>
                          <td className="border-b border-gray-100 p-2 text-gray-500">{m.unit}</td>
                          <td className="border-b border-gray-100 p-2 text-gray-600">{m.spec}</td>
                          <td className="border-b border-gray-100 p-2 text-blue-700">{m.brands}</td>
                          <td className="border-b border-gray-100 p-2 text-green-700">{m.shop}</td>
                          <td className="border-b border-gray-100 p-2 text-right font-semibold">{m.price}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50 py-2"><CardTitle className="text-blue-700 text-sm">🔌 Material cuadros eléctricos DC y AC</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-700 text-white">
                        <th className="p-2 text-left">Elemento</th>
                        <th className="p-2 text-left">Especificación</th>
                        <th className="p-2 text-center w-12">Cant.</th>
                        <th className="p-2 text-left">Marcas</th>
                        <th className="p-2 text-left">Dónde comprar</th>
                        <th className="p-2 text-left">Ubicación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.electricalItems.map((m, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-blue-50'}>
                          <td className="border-b border-gray-100 p-2 font-medium">{m.element}</td>
                          <td className="border-b border-gray-100 p-2 text-gray-600">{m.spec}</td>
                          <td className="border-b border-gray-100 p-2 text-center font-bold text-blue-700">{m.qty}</td>
                          <td className="border-b border-gray-100 p-2 text-blue-700">{m.brands}</td>
                          <td className="border-b border-gray-100 p-2 text-green-700">{m.shop}</td>
                          <td className="border-b border-gray-100 p-2 text-gray-500">{m.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 flex-wrap no-print items-center pt-2 border-t border-gray-100">
              <PrintButton contentRef={printRef} title="Cálculo Solar Fotovoltaico" />
              {!editing && !savedId && <Button onClick={save} variant="outline" size="sm" className="border-amber-400 text-amber-700"><Save className="w-4 h-4 mr-2" />Guardar cálculo</Button>}
              {savedId && !editing && <Button onClick={() => setEditing(true)} variant="outline" size="sm" className="border-blue-400 text-blue-600"><Edit3 className="w-4 h-4 mr-2" />Editar y actualizar</Button>}
              {editing && <Button onClick={save} size="sm" className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar cambios</Button>}
              {savedMsg && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{savedMsg}</span>}
              {savedId && !savedMsg && <span className="text-[10px] text-gray-400">✓ Guardado</span>}
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white ml-auto" onClick={() => setActiveTab('rentabilidad')}>
                <TrendingUp className="w-4 h-4 mr-1" /> Ver informe PVGIS / Rentabilidad →
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* ═══ RENTABILIDAD ═══ */}
        <TabsContent value="rentabilidad" className="mt-4 space-y-4">
          <PVGISReport
            totalKwp={result.totalKwp}
            numPanels={result.numPanels}
            panelW={parseInt(form.panel_power_w) || 400}
            contactName={form.contact_name}
            contactId={form.contact_id}
          />
        </TabsContent>

        {/* ═══ INVERSORES ═══ */}
        <TabsContent value="inversores" className="mt-4">
          <InverterComparison targetKwp={result.totalKwp} />
        </TabsContent>

        {/* ═══ PLANO SOLAR ═══ */}
        <TabsContent value="situacion">
          <SolarSiteReport
            form={form}
            result={result}
            contact={contact}
            onSiteDataChange={siteData => setForm(f => ({ ...f, ...siteData }))}
          />
        </TabsContent>

        {/* ═══ REPUESTOS ═══ */}
        <TabsContent value="repuestos" className="mt-4">
          <ClientSparePartsTab
            contactId={form.contact_id || null}
            contactName={form.contact_name || null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}