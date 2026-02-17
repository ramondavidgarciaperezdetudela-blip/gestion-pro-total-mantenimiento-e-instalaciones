import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Thermometer, Calculator, Save, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

const REFRIGERANTS = ['R-410A', 'R-32', 'R-134a', 'R-404A', 'R-407C', 'R-290', 'R-449A', 'R-452A', 'R-448A'];
const ORIENTATIONS = ['norte', 'sur', 'este', 'oeste'];

// Presiones de trabajo según refrigerante y temperatura
const REFRIGERANT_PRESSURES = {
  'R-410A': { condensation: 30, evaporation: 8, charge_per_meter: 30 },
  'R-32': { condensation: 28, evaporation: 7, charge_per_meter: 20 },
  'R-134a': { condensation: 15, evaporation: 2.5, charge_per_meter: 15 },
  'R-404A': { condensation: 22, evaporation: 5, charge_per_meter: 35 },
  'R-407C': { condensation: 20, evaporation: 4.5, charge_per_meter: 25 },
  'R-290': { condensation: 16, evaporation: 4, charge_per_meter: 10 },
  'R-449A': { condensation: 21, evaporation: 4.8, charge_per_meter: 28 },
  'R-452A': { condensation: 24, evaporation: 5.5, charge_per_meter: 30 },
  'R-448A': { condensation: 22, evaporation: 5, charge_per_meter: 28 },
};

export default function ThermalCalc() {
  const [calcType, setCalcType] = useState('clima');
  const [contacts, setContacts] = useState([]);
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const printRef = useRef(null);

  const [form, setForm] = useState({
    contact_id: '', contact_name: '', room_length: 5, room_width: 4, room_height: 2.5,
    orientation: 'sur', num_windows: 2, window_area: 2, num_people: 2, equipment_heat: 500,
    insulation_type: 'medio', target_temp: 22, exterior_temp: 35,
    cold_room_temp: -18, cold_room_product: 'carne', cold_room_product_kg: 500,
    pipe_distance: 5, pipe_height_diff: 3, refrigerant_type: 'R-32'
  });

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, []);

  const calculate = async () => {
    setCalculating(true);
    const prompt = calcType === 'clima'
      ? `Calcula la carga térmica para climatización de una habitación de ${form.room_length}x${form.room_width}x${form.room_height}m, orientación ${form.orientation}, ${form.num_windows} ventanas de ${form.window_area}m², ${form.num_people} personas, calor equipos ${form.equipment_heat}W, aislamiento ${form.insulation_type}, temperatura objetivo ${form.target_temp}°C, exterior ${form.exterior_temp}°C. Distancia tubería ${form.pipe_distance}m, diferencia altura ${form.pipe_height_diff}m, gas ${form.refrigerant_type}. Sugiere un equipo de Salvador Escoda, Daikin, Mitsubishi o Fujitsu apropiado con modelo concreto. Incluye lista de materiales para la instalación con las distancias indicadas.`
      : `Calcula la carga térmica para cámara frigorífica de ${form.room_length}x${form.room_width}x${form.room_height}m, producto ${form.cold_room_product} (${form.cold_room_product_kg}kg), temperatura cámara ${form.cold_room_temp}°C, exterior ${form.exterior_temp}°C. Distancia entre evaporador y grupo de frío ${form.pipe_distance}m, diferencia altura ${form.pipe_height_diff}m, gas ${form.refrigerant_type}. Sugiere equipo de Salvador Escoda, Intarcon, Zanotti o Danfoss con modelo concreto, incluyendo evaporador y grupo condensador. Incluye cantidad de refrigerante a cargar, materiales para montaje de cámara según medidas y distancias.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          carga_termica_w: { type: "number" },
          carga_termica_frigorias: { type: "number" },
          equipo_sugerido: { type: "string" },
          marca: { type: "string" },
          modelo: { type: "string" },
          potencia_equipo_w: { type: "number" },
          refrigerante_carga_kg: { type: "number" },
          refrigerante_extra_g: { type: "number" },
          presion_alta_bar: { type: "number" },
          presion_baja_bar: { type: "number" },
          temp_condensacion: { type: "number" },
          temp_evaporacion: { type: "number" },
          materiales: { type: "array", items: { type: "object", properties: { material: { type: "string" }, cantidad: { type: "number" }, especificacion: { type: "string" } } } },
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
    await base44.entities.ThermalCalculation.create({
      contact_id: form.contact_id, contact_name: form.contact_name, calc_type: calcType,
      date: format(new Date(), 'yyyy-MM-dd'),
      room_length: form.room_length, room_width: form.room_width, room_height: form.room_height,
      orientation: form.orientation, num_windows: form.num_windows, window_area: form.window_area,
      num_people: form.num_people, equipment_heat: form.equipment_heat,
      insulation_type: form.insulation_type, target_temp: form.target_temp, exterior_temp: form.exterior_temp,
      cold_room_temp: form.cold_room_temp, cold_room_product: form.cold_room_product,
      cold_room_product_kg: form.cold_room_product_kg,
      pipe_distance: form.pipe_distance, pipe_height_diff: form.pipe_height_diff,
      refrigerant_type: form.refrigerant_type,
      calculated_load: result.carga_termica_w, calculated_load_frigorias: result.carga_termica_frigorias,
      suggested_equipment: result.equipo_sugerido, suggested_brand: result.marca, suggested_model: result.modelo,
      refrigerant_charge_kg: result.refrigerante_carga_kg, extra_refrigerant_g: result.refrigerante_extra_g,
      materials_list: result.materiales?.map(m => ({ material: m.material, quantity: m.cantidad, specification: m.especificacion })),
      working_pressures: { high_pressure: result.presion_alta_bar, low_pressure: result.presion_baja_bar, condensation_temp: result.temp_condensacion, evaporation_temp: result.temp_evaporacion },
      notes: result.observaciones
    });
    if (form.contact_id) {
      await base44.entities.ClientDocument.create({
        contact_id: form.contact_id, contact_name: form.contact_name,
        title: `Cálculo Térmico ${calcType} - ${format(new Date(), 'dd/MM/yyyy')}`,
        doc_type: 'calculo_termico', date: format(new Date(), 'yyyy-MM-dd')
      });
    }
    setSaving(false);
    alert('Cálculo guardado correctamente');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Thermometer className="w-6 h-6 text-red-500" />Cálculo Térmico</h1>

      <Tabs value={calcType} onValueChange={setCalcType}>
        <TabsList>
          <TabsTrigger value="clima">Climatización</TabsTrigger>
          <TabsTrigger value="camara_frigorifica">Cámara Frigorífica</TabsTrigger>
        </TabsList>

        <Card className="mt-3">
          <CardContent className="p-4 space-y-3">
            <Select value={form.contact_id} onValueChange={v => {
              const c = contacts.find(co => co.id === v);
              setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
            }}>
              <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
              <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
            </Select>

            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-gray-500">Largo (m)</label><Input type="number" value={form.room_length} onChange={e => setForm({...form, room_length: parseFloat(e.target.value)})} /></div>
              <div><label className="text-xs text-gray-500">Ancho (m)</label><Input type="number" value={form.room_width} onChange={e => setForm({...form, room_width: parseFloat(e.target.value)})} /></div>
              <div><label className="text-xs text-gray-500">Alto (m)</label><Input type="number" value={form.room_height} onChange={e => setForm({...form, room_height: parseFloat(e.target.value)})} /></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">T. Exterior °C</label><Input type="number" value={form.exterior_temp} onChange={e => setForm({...form, exterior_temp: parseFloat(e.target.value)})} /></div>
              {calcType === 'clima' ? (
                <div><label className="text-xs text-gray-500">T. Objetivo °C</label><Input type="number" value={form.target_temp} onChange={e => setForm({...form, target_temp: parseFloat(e.target.value)})} /></div>
              ) : (
                <div><label className="text-xs text-gray-500">T. Cámara °C</label><Input type="number" value={form.cold_room_temp} onChange={e => setForm({...form, cold_room_temp: parseFloat(e.target.value)})} /></div>
              )}
            </div>

            {calcType === 'clima' && (
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.orientation} onValueChange={v => setForm({...form, orientation: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ORIENTATIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.insulation_type} onValueChange={v => setForm({...form, insulation_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bueno">Aislamiento bueno</SelectItem>
                    <SelectItem value="medio">Aislamiento medio</SelectItem>
                    <SelectItem value="malo">Aislamiento malo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {calcType === 'camara_frigorifica' && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Producto almacenado" value={form.cold_room_product} onChange={e => setForm({...form, cold_room_product: e.target.value})} />
                <div><label className="text-xs text-gray-500">Kg producto</label><Input type="number" value={form.cold_room_product_kg} onChange={e => setForm({...form, cold_room_product_kg: parseFloat(e.target.value)})} /></div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-gray-500">Dist. tubería (m)</label><Input type="number" value={form.pipe_distance} onChange={e => setForm({...form, pipe_distance: parseFloat(e.target.value)})} /></div>
              <div><label className="text-xs text-gray-500">Dif. altura (m)</label><Input type="number" value={form.pipe_height_diff} onChange={e => setForm({...form, pipe_height_diff: parseFloat(e.target.value)})} /></div>
              <Select value={form.refrigerant_type} onValueChange={v => setForm({...form, refrigerant_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REFRIGERANTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Button onClick={calculate} disabled={calculating} className="w-full bg-red-600 hover:bg-red-700">
              {calculating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
              Calcular
            </Button>
          </CardContent>
        </Card>
      </Tabs>

      {result && (
        <Card ref={printRef}>
          <CardHeader><CardTitle>Resultado del Cálculo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <CompanyHeader className="mb-3 pb-3 border-b" />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Carga térmica</p>
                <p className="text-xl font-bold text-red-700">{result.carga_termica_w?.toLocaleString()} W</p>
                <p className="text-sm text-red-600">{result.carga_termica_frigorias?.toLocaleString()} frigorías</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Equipo sugerido</p>
                <p className="font-bold text-blue-700">{result.marca} {result.modelo}</p>
                <p className="text-xs">{result.equipo_sugerido}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="font-medium mb-2">Presiones de trabajo ({form.refrigerant_type})</p>
              <div className="grid grid-cols-2 gap-2">
                <p>P. Alta: {result.presion_alta_bar} bar</p>
                <p>P. Baja: {result.presion_baja_bar} bar</p>
                <p>T. Condensación: {result.temp_condensacion}°C</p>
                <p>T. Evaporación: {result.temp_evaporacion}°C</p>
              </div>
              <p className="mt-2">Carga refrigerante: {result.refrigerante_carga_kg} kg</p>
              {result.refrigerante_extra_g > 0 && <p className="text-orange-600">Refrigerante extra por distancia: +{result.refrigerante_extra_g} g</p>}
            </div>

            {result.materiales?.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-2">Materiales necesarios</p>
                <table className="w-full text-xs">
                  <thead><tr className="border-b"><th className="text-left p-1">Material</th><th className="p-1">Cant.</th><th className="p-1">Especificación</th></tr></thead>
                  <tbody>
                    {result.materiales.map((m, i) => (
                      <tr key={i} className="border-b"><td className="p-1">{m.material}</td><td className="p-1 text-center">{m.cantidad}</td><td className="p-1">{m.especificacion}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {result.observaciones && <p className="text-xs text-gray-600 mt-2">{result.observaciones}</p>}

            <div className="flex gap-2">
              <PrintButton contentRef={printRef} title="Cálculo Térmico" />
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