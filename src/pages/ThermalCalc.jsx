import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Save, Printer, Calculator } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

const REFRIGERANTS = ['R-32', 'R-410A', 'R-290', 'R-407C', 'R-134a', 'R-449A', 'R-452A', 'R-448A'];

// Datos de presiones según gas refrigerante y temperatura de evaporación
const REFRIGERANT_PRESSURES = {
  'R-32':   { evap_0: 8.0,  evap_minus10: 5.8,  cond_40: 24.8, cond_50: 31.0 },
  'R-410A': { evap_0: 7.97, evap_minus10: 5.54, cond_40: 24.3, cond_50: 30.5 },
  'R-407C': { evap_0: 5.07, evap_minus10: 3.45, cond_40: 18.2, cond_50: 22.8 },
  'R-134a': { evap_0: 2.93, evap_minus10: 2.01, cond_40: 10.2, cond_50: 13.2 },
  'R-290':  { evap_0: 4.74, evap_minus10: 3.26, cond_40: 15.3, cond_50: 19.1 },
  'R-449A': { evap_0: 6.8,  evap_minus10: 4.7,  cond_40: 21.8, cond_50: 27.5 },
  'R-452A': { evap_0: 7.5,  evap_minus10: 5.2,  cond_40: 23.1, cond_50: 29.0 },
  'R-448A': { evap_0: 6.5,  evap_minus10: 4.5,  cond_40: 20.9, cond_50: 26.3 },
};

// Catálogo de ejemplo Intarcon/Fujitsu para Clima
const CLIMATE_CATALOG = [
  { brand: 'Fujitsu', model: 'ASY-G12LFCA', power_kw: 3.5, type: 'Split 1x1', gas: 'R-32', max_pipe_m: 20, max_height_m: 12 },
  { brand: 'Fujitsu', model: 'ASY-G18LFCA', power_kw: 5.0, type: 'Split 1x1', gas: 'R-32', max_pipe_m: 25, max_height_m: 15 },
  { brand: 'Daikin', model: 'FTXC35C', power_kw: 3.5, type: 'Split 1x1', gas: 'R-32', max_pipe_m: 20, max_height_m: 10 },
  { brand: 'Daikin', model: 'FTXC50C', power_kw: 5.0, type: 'Split 1x1', gas: 'R-32', max_pipe_m: 25, max_height_m: 12 },
  { brand: 'Mitsubishi', model: 'MSZ-HR25VF', power_kw: 2.5, type: 'Split 1x1', gas: 'R-32', max_pipe_m: 15, max_height_m: 8 },
  { brand: 'Mitsubishi', model: 'MSZ-HR35VF', power_kw: 3.5, type: 'Split 1x1', gas: 'R-32', max_pipe_m: 20, max_height_m: 10 },
  { brand: 'Mitsubishi', model: 'MSZ-HR50VF', power_kw: 5.0, type: 'Split 1x1', gas: 'R-32', max_pipe_m: 25, max_height_m: 12 },
  { brand: 'Intarcon', model: 'UNIDAD-7K', power_kw: 7.0, type: 'Cassette', gas: 'R-32', max_pipe_m: 30, max_height_m: 15 },
  { brand: 'Intarcon', model: 'UNIDAD-10K', power_kw: 10.0, type: 'Cassette', gas: 'R-32', max_pipe_m: 30, max_height_m: 15 },
];

// Extra refrigerante por metro extra (g/m)
const EXTRA_REFRIGERANT_G_PER_M = { 'R-32': 15, 'R-410A': 20, 'R-290': 10, 'R-407C': 18, 'R-134a': 12, 'R-449A': 17, 'R-452A': 18, 'R-448A': 16 };

function calcThermalLoad(f) {
  const vol = f.length * f.width * f.height;
  const orientFactor = { norte: 0.8, sur: 1.2, este: 1.0, oeste: 1.1 }[f.orientation] || 1.0;
  const insulFactor = { bueno: 30, medio: 50, malo: 70 }[f.insulation_type] || 50;
  const wallLoad = 2 * (f.length * f.height + f.width * f.height) * insulFactor * Math.abs((f.exterior_temp || 35) - (f.target_temp || 22));
  const roofLoad = f.length * f.width * (insulFactor * 1.5) * Math.abs((f.exterior_temp || 35) - (f.target_temp || 22));
  const windowLoad = (f.window_area || 0) * 600 * orientFactor;
  const peopleLoad = (f.num_people || 2) * 100;
  const equipLoad = f.equipment_heat || 0;
  const totalW = (wallLoad + roofLoad + windowLoad + peopleLoad + equipLoad) * 1.15;
  return Math.round(totalW);
}

export default function ThermalCalc() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    contact_id: '', contact_name: '', calc_type: 'clima',
    length: 5, width: 4, height: 2.7, orientation: 'sur',
    num_windows: 1, window_area: 2, num_people: 2, equipment_heat: 200,
    insulation_type: 'medio', target_temp: 22, exterior_temp: 35,
    refrigerant_type: 'R-32', pipe_distance: 5, pipe_height_diff: 3,
  });
  const [result, setResult] = useState(null);
  const [selectedEquip, setSelectedEquip] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.Contact.list().then(setContacts);
  }, []);

  const calculate = () => {
    const loadW = calcThermalLoad(form);
    const loadFrigorias = Math.round(loadW * 0.86);
    const loadKW = (loadW / 1000).toFixed(2);

    // Selección de equipo
    const suitable = CLIMATE_CATALOG.filter(e => e.power_kw * 1000 >= loadW * 0.9);
    const equip = suitable.length > 0 ? suitable[0] : CLIMATE_CATALOG[CLIMATE_CATALOG.length - 1];

    // Cálculo extra refrigerante por distancia
    const maxDist = equip.max_pipe_m;
    const actualDist = parseFloat(form.pipe_distance) || 5;
    const extraGrams = actualDist > maxDist ? Math.round((actualDist - maxDist) * (EXTRA_REFRIGERANT_G_PER_M[form.refrigerant_type] || 18)) : 0;

    // Presiones
    const pr = REFRIGERANT_PRESSURES[form.refrigerant_type] || REFRIGERANT_PRESSURES['R-32'];

    // Materiales
    const materials = [
      { material: `Tubería líquido 1/4" Cu`, quantity: actualDist, specification: 'metros' },
      { material: `Tubería gas 3/8" Cu`, quantity: actualDist, specification: 'metros' },
      { material: 'Cableado eléctrico 4x1,5mm²', quantity: actualDist + 2, specification: 'metros' },
      { material: 'Aislamiento tubería AF/19', quantity: actualDist, specification: 'metros' },
      { material: 'Soporte unidad exterior', quantity: 1, specification: 'unidad' },
      { material: 'Soporte unidad interior', quantity: 1, specification: 'unidad' },
      { material: `${form.refrigerant_type} gas refrigerante`, quantity: (equip.power_kw * 0.3 + extraGrams / 1000).toFixed(2), specification: 'kg' },
    ];

    setSelectedEquip(equip);
    setResult({ loadW, loadFrigorias, loadKW, equip, extraGrams, pr, materials, maxDist, actualDist });
  };

  const saveToClient = async () => {
    if (!form.contact_id || !result) return;
    setSaving(true);
    await base44.entities.ClientDocument.create({
      contact_id: form.contact_id,
      contact_name: form.contact_name,
      title: `Cálculo térmico clima - ${format(new Date(), 'dd/MM/yyyy')}`,
      doc_type: 'calculo_termico',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: `Carga: ${result.loadW}W (${result.loadFrigorias} frig/h). Equipo: ${result.equip.brand} ${result.equip.model}`,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Thermometer className="w-6 h-6 text-red-500" />Cálculo Térmico - Clima</h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.contact_id} onValueChange={v => {
              const c = contacts.find(co => co.id === v);
              setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
            }}>
              <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
              <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.refrigerant_type} onValueChange={v => setForm({...form, refrigerant_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REFRIGERANTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-700">Dimensiones del local</p>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-gray-500">Largo (m)</label><Input type="number" value={form.length} onChange={e => setForm({...form, length: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Ancho (m)</label><Input type="number" value={form.width} onChange={e => setForm({...form, width: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Alto (m)</label><Input type="number" value={form.height} onChange={e => setForm({...form, height: parseFloat(e.target.value)||0})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500">Orientación</label>
                <Select value={form.orientation} onValueChange={v => setForm({...form, orientation: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="norte">Norte</SelectItem><SelectItem value="sur">Sur</SelectItem><SelectItem value="este">Este</SelectItem><SelectItem value="oeste">Oeste</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Aislamiento</label>
                <Select value={form.insulation_type} onValueChange={v => setForm({...form, insulation_type: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="bueno">Bueno</SelectItem><SelectItem value="medio">Medio</SelectItem><SelectItem value="malo">Malo</SelectItem></SelectContent>
                </Select>
              </div>
              <div><label className="text-[10px] text-gray-500">Superficie ventanas (m²)</label><Input type="number" value={form.window_area} onChange={e => setForm({...form, window_area: parseFloat(e.target.value)||0})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-gray-500">Nº personas</label><Input type="number" value={form.num_people} onChange={e => setForm({...form, num_people: parseInt(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Calor equipos (W)</label><Input type="number" value={form.equipment_heat} onChange={e => setForm({...form, equipment_heat: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">T. exterior (°C)</label><Input type="number" value={form.exterior_temp} onChange={e => setForm({...form, exterior_temp: parseFloat(e.target.value)||0})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-gray-500">T. objetivo interior (°C)</label><Input type="number" value={form.target_temp} onChange={e => setForm({...form, target_temp: parseFloat(e.target.value)||0})} /></div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium">Distancias de instalación</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-gray-500">Longitud tubería (m)</label><Input type="number" value={form.pipe_distance} onChange={e => setForm({...form, pipe_distance: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Diferencia altura (m)</label><Input type="number" value={form.pipe_height_diff} onChange={e => setForm({...form, pipe_height_diff: parseFloat(e.target.value)||0})} /></div>
            </div>
          </div>

          <Button onClick={calculate} className="w-full bg-red-600 hover:bg-red-700">
            <Calculator className="w-4 h-4 mr-2" /> Calcular
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div ref={printRef}>
          <CompanyHeader className="mb-4 hidden-screen" />
          <Card className="border-green-200">
            <CardHeader className="bg-green-50">
              <CardTitle className="text-green-700 text-lg">Resultado del cálculo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-red-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{result.loadW} W</p>
                  <p className="text-xs text-red-500">Carga térmica</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-orange-600">{result.loadFrigorias}</p>
                  <p className="text-xs text-orange-500">Frig/hora</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{result.loadKW} kW</p>
                  <p className="text-xs text-blue-500">Potencia</p>
                </div>
              </div>

              {/* Equipo sugerido */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-sm mb-2">Equipo sugerido (catálogo)</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">Marca:</span> {result.equip.brand}</p>
                  <p><span className="text-gray-500">Modelo:</span> {result.equip.model}</p>
                  <p><span className="text-gray-500">Potencia:</span> {result.equip.power_kw} kW</p>
                  <p><span className="text-gray-500">Gas:</span> {result.equip.gas}</p>
                  <p><span className="text-gray-500">Dist. máx. tubería:</span> {result.equip.max_pipe_m} m</p>
                  <p><span className="text-gray-500">Alt. máx.:</span> {result.equip.max_height_m} m</p>
                </div>
                {result.extraGrams > 0 && (
                  <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-sm">
                    ⚠️ Distancia ({result.actualDist}m) supera máximo ({result.maxDist}m). Añadir <strong>{result.extraGrams}g</strong> de {form.refrigerant_type} extra.
                  </div>
                )}
              </div>

              {/* Presiones */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-2">Presiones {form.refrigerant_type}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p>P. evap. 0°C: <strong>{result.pr.evap_0} bar</strong></p>
                  <p>P. evap. -10°C: <strong>{result.pr.evap_minus10} bar</strong></p>
                  <p>P. cond. 40°C: <strong>{result.pr.cond_40} bar</strong></p>
                  <p>P. cond. 50°C: <strong>{result.pr.cond_50} bar</strong></p>
                </div>
              </div>

              {/* Materiales */}
              <div>
                <p className="font-semibold text-sm mb-2">Material necesario para la instalación</p>
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-gray-100"><th className="border p-1 text-left">Material</th><th className="border p-1 text-right">Cantidad</th><th className="border p-1 text-left">Unidad</th></tr></thead>
                  <tbody>
                    {result.materials.map((m, i) => (
                      <tr key={i} className="border-b"><td className="border p-1">{m.material}</td><td className="border p-1 text-right">{m.quantity}</td><td className="border p-1">{m.specification}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <PrintButton contentRef={printRef} title="Cálculo Térmico Clima" />
                {form.contact_id && (
                  <Button onClick={saveToClient} variant="outline" disabled={saving}>
                    <Save className="w-4 h-4 mr-2" />
                    {saved ? '¡Guardado en ficha!' : saving ? 'Guardando...' : 'Guardar en cliente'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}