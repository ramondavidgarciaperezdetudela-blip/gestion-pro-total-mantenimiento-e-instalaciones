import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Thermometer, Save, Calculator, Droplets } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';
import ColdRoomHumidityCalc from '../components/ColdRoomHumidityCalc';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const REFRIGERANTS = ['R-404A', 'R-448A', 'R-449A', 'R-452A', 'R-134a', 'R-290', 'R-744 (CO2)'];

// Presiones saturación por gas y temperatura de evaporación (bar)
const REF_PRESSURES = {
  'R-404A': { '-35': 0.93, '-25': 1.67, '-15': 2.82, '-10': 3.64, '0': 5.72, '5': 7.0 },
  'R-448A': { '-35': 0.76, '-25': 1.42, '-15': 2.46, '-10': 3.2,  '0': 5.1,  '5': 6.3 },
  'R-449A': { '-35': 0.8,  '-25': 1.5,  '-15': 2.6,  '-10': 3.3,  '0': 5.2,  '5': 6.4 },
  'R-452A': { '-35': 0.85, '-25': 1.55, '-15': 2.65, '-10': 3.4,  '0': 5.3,  '5': 6.5 },
  'R-134a': { '-35': 0.66, '-25': 1.16, '-15': 1.94, '-10': 2.43, '0': 3.72, '5': 4.46 },
  'R-290':  { '-35': 1.03, '-25': 1.83, '-15': 3.07, '-10': 3.93, '0': 6.07, '5': 7.4 },
  'R-744 (CO2)': { '-35': 14.3, '-25': 19.7, '-15': 26.5, '-10': 30.4, '0': 39.7, '5': 45.7 },
};

const EXTRA_REF_G_PER_M = { 'R-404A': 22, 'R-448A': 18, 'R-449A': 18, 'R-452A': 19, 'R-134a': 14, 'R-290': 11, 'R-744 (CO2)': 5 };

// Catálogo equipos frío industrial (Salvador Escoda / Intarcon / Zanotti)
const COLD_CATALOG = [
  { brand: 'Intarcon', model: 'CHCU 1.5 R-449A', power_kw: 1.5, gas: 'R-449A', temp_range: '0/+10°C', max_pipe_m: 15, max_height_m: 5, type: 'Monobloc' },
  { brand: 'Intarcon', model: 'CHCU 3.0 R-449A', power_kw: 3.0, gas: 'R-449A', temp_range: '-5/+10°C', max_pipe_m: 20, max_height_m: 8, type: 'Split' },
  { brand: 'Intarcon', model: 'CHCU 5.0 R-449A', power_kw: 5.0, gas: 'R-449A', temp_range: '-10/+5°C', max_pipe_m: 25, max_height_m: 10, type: 'Split' },
  { brand: 'Intarcon', model: 'CHCU 8.0 R-449A', power_kw: 8.0, gas: 'R-449A', temp_range: '-15/0°C', max_pipe_m: 30, max_height_m: 12, type: 'Split' },
  { brand: 'Intarcon', model: 'CHCU 12.0 R-448A', power_kw: 12.0, gas: 'R-448A', temp_range: '-25/-5°C', max_pipe_m: 35, max_height_m: 12, type: 'Split' },
  { brand: 'Zanotti', model: 'SAP 106', power_kw: 3.0, gas: 'R-452A', temp_range: '0/+10°C', max_pipe_m: 20, max_height_m: 8, type: 'Split' },
  { brand: 'Zanotti', model: 'SAP 212', power_kw: 6.0, gas: 'R-452A', temp_range: '-10/+5°C', max_pipe_m: 25, max_height_m: 10, type: 'Split' },
  { brand: 'Zanotti', model: 'SAP 320', power_kw: 10.0, gas: 'R-452A', temp_range: '-15/0°C', max_pipe_m: 30, max_height_m: 12, type: 'Split' },
];

function calcColdRoom(f) {
  const vol = f.length * f.width * f.height;
  const insul = { '60mm': 0.35, '80mm': 0.27, '100mm': 0.22, '120mm': 0.18 }[f.panel_thickness] || 0.27;
  const surf = 2 * (f.length * f.width + f.length * f.height + f.width * f.height);
  const deltaT = Math.abs((f.exterior_temp || 25) - (f.cold_room_temp || 2));
  const transmissionLoad = surf * insul * deltaT;
  const productLoad = (f.product_kg || 100) * 3.5 * (f.exterior_temp - f.cold_room_temp) / 24;
  const ventLoad = vol * 0.5 * 1.2 * 1.005 * deltaT * 0.28;
  const totalLoad = (transmissionLoad + productLoad + ventLoad) * 1.25;
  return Math.round(totalLoad);
}

export default function ColdRoomCalc() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    contact_id: '', contact_name: '',
    length: 4, width: 3, height: 2.5,
    cold_room_temp: 2, exterior_temp: 25,
    product_kg: 200, cold_room_type: 'positiva',
    panel_thickness: '80mm', refrigerant_type: 'R-449A',
    pipe_distance: 8, pipe_height_diff: 3,
    photos_evaporator: [], photos_condenser: [], photos_other: [],
  });
  const [result, setResult] = useState(null);
  const [saved, setSaved] = useState(false);
  const printRef = useRef(null);

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, []);

  const calculate = () => {
    const loadW = calcColdRoom(form);
    const equip = COLD_CATALOG.filter(e => e.power_kw * 1000 >= loadW * 0.9)[0] || COLD_CATALOG[COLD_CATALOG.length - 1];
    const actualDist = parseFloat(form.pipe_distance) || 8;
    const maxDist = equip.max_pipe_m;
    const extraGrams = actualDist > maxDist ? Math.round((actualDist - maxDist) * (EXTRA_REF_G_PER_M[form.refrigerant_type] || 18)) : 0;

    // Temperatura de evaporación aprox
    const coldTemp = parseFloat(form.cold_room_temp);
    const evapTemp = coldTemp - 8;
    const evapKey = evapTemp <= -35 ? '-35' : evapTemp <= -25 ? '-25' : evapTemp <= -15 ? '-15' : evapTemp <= -10 ? '-10' : evapTemp <= 0 ? '0' : '5';
    const pr = REF_PRESSURES[form.refrigerant_type] || REF_PRESSURES['R-449A'];
    const evapPressure = pr[evapKey] || '—';
    const condPressure = (parseFloat(form.exterior_temp || 25) > 35 ? (Object.values(pr).slice(-1)[0] * 1.15) : Object.values(pr).slice(-1)[0]).toFixed(2);

    // Panel frigorífico necesario (m²)
    const panelArea = 2 * (form.length * form.width + form.length * form.height + form.width * form.height);

    // Carga de refrigerante base
    const refCharge = (equip.power_kw * 0.35 + actualDist * (EXTRA_REF_G_PER_M[form.refrigerant_type] || 18) / 1000).toFixed(2);

    const materials = [
      { material: `Panel frigorífico ${form.panel_thickness} (suelo, paredes, techo)`, quantity: panelArea.toFixed(1), unit: 'm²' },
      { material: `Evaporador cámara (grupo evaporador)`, quantity: 1, unit: 'unidad' },
      { material: `Unidad condensadora (grupo frío) ${equip.brand} ${equip.model}`, quantity: 1, unit: 'unidad' },
      { material: `Tubería líquido 3/8" Cu`, quantity: actualDist, unit: 'm' },
      { material: `Tubería gas 5/8" Cu`, quantity: actualDist, unit: 'm' },
      { material: `Aislamiento tubería Armaflex 19mm`, quantity: actualDist * 2, unit: 'm' },
      { material: `${form.refrigerant_type} gas refrigerante`, quantity: refCharge, unit: 'kg' },
      { material: `Válvula expansión termostática (VET)`, quantity: 1, unit: 'unidad' },
      { material: `Filtro deshidratador`, quantity: 1, unit: 'unidad' },
      { material: `Visor de líquido con indicador de humedad`, quantity: 1, unit: 'unidad' },
      { material: `Presostato alta/baja`, quantity: 1, unit: 'unidad' },
      { material: `Cuadro eléctrico control cámara`, quantity: 1, unit: 'unidad' },
      { material: `Cableado eléctrico 4x2,5mm²`, quantity: actualDist + 5, unit: 'm' },
      { material: `Marco puerta frigorífica (isotérmica)`, quantity: 1, unit: 'unidad' },
    ];

    setResult({ loadW, equip, extraGrams, evapPressure, condPressure, evapKey, refCharge, panelArea: panelArea.toFixed(1), materials, maxDist, actualDist });
  };

  const saveToClient = async () => {
    if (!form.contact_id || !result) return;
    await base44.entities.ClientDocument.create({
      contact_id: form.contact_id, contact_name: form.contact_name,
      title: `Cálculo cámara frigorífica - ${format(new Date(), 'dd/MM/yyyy')}`,
      doc_type: 'calculo_termico', date: format(new Date(), 'yyyy-MM-dd'),
      description: `Cámara ${form.cold_room_type}, ${form.length}x${form.width}x${form.height}m, ${result.loadW}W. Equipo: ${result.equip?.brand} ${result.equip?.model}`,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Thermometer className="w-6 h-6 text-blue-600" />Cálculo Cámara Frigorífica
      </h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.contact_id} onValueChange={v => {
              const c = contacts.find(co => co.id === v);
              setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
            }}>
              <SelectTrigger><SelectValue placeholder="Vincular a cliente" /></SelectTrigger>
              <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={form.refrigerant_type} onValueChange={v => setForm({...form, refrigerant_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{REFRIGERANTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-700">Dimensiones cámara</p>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-gray-500">Largo (m)</label><Input type="number" value={form.length} onChange={e => setForm({...form, length: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Ancho (m)</label><Input type="number" value={form.width} onChange={e => setForm({...form, width: parseFloat(e.target.value)||0})} /></div>
              <div><label className="text-[10px] text-gray-500">Alto (m)</label><Input type="number" value={form.height} onChange={e => setForm({...form, height: parseFloat(e.target.value)||0})} /></div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">Tipo cámara</label>
              <Select value={form.cold_room_type} onValueChange={v => setForm({...form, cold_room_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="positiva">Positiva (+2/+10°C)</SelectItem>
                  <SelectItem value="negativa">Negativa (-18/-25°C)</SelectItem>
                  <SelectItem value="media">Media (-5/+2°C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-[10px] text-gray-500">T. cámara (°C)</label><Input type="number" value={form.cold_room_temp} onChange={e => setForm({...form, cold_room_temp: parseFloat(e.target.value)||0})} /></div>
            <div><label className="text-[10px] text-gray-500">T. exterior (°C)</label><Input type="number" value={form.exterior_temp} onChange={e => setForm({...form, exterior_temp: parseFloat(e.target.value)||0})} /></div>
            <div><label className="text-[10px] text-gray-500">Producto (kg)</label><Input type="number" value={form.product_kg} onChange={e => setForm({...form, product_kg: parseFloat(e.target.value)||0})} /></div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">Espesor panel</label>
              <Select value={form.panel_thickness} onValueChange={v => setForm({...form, panel_thickness: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="60mm">60mm (pos. ≥ 0°C)</SelectItem>
                  <SelectItem value="80mm">80mm (pos. ≥ -5°C)</SelectItem>
                  <SelectItem value="100mm">100mm (neg. ≥ -18°C)</SelectItem>
                  <SelectItem value="120mm">120mm (neg. ≤ -25°C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><label className="text-[10px] text-gray-500">Long. tubería (m)</label><Input type="number" value={form.pipe_distance} onChange={e => setForm({...form, pipe_distance: parseFloat(e.target.value)||0})} /></div>
            <div><label className="text-[10px] text-gray-500">Diferencia altura (m)</label><Input type="number" value={form.pipe_height_diff} onChange={e => setForm({...form, pipe_height_diff: parseFloat(e.target.value)||0})} /></div>
          </div>

          <div className="space-y-2">
            <PhotoGallery photos={form.photos_evaporator} onChange={p => setForm({...form, photos_evaporator: p})} label="Fotos placa evaporadora" maxPhotos={10} />
            <PhotoGallery photos={form.photos_condenser} onChange={p => setForm({...form, photos_condenser: p})} label="Fotos grupo frío (condensadora, compresor, cuadro, VET...)" maxPhotos={30} />
            <PhotoGallery photos={form.photos_other} onChange={p => setForm({...form, photos_other: p})} label="Otras fotos" maxPhotos={10} />
          </div>

          <Button onClick={calculate} className="w-full bg-blue-600 hover:bg-blue-700">
            <Calculator className="w-4 h-4 mr-2" /> Calcular cámara frigorífica
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Sección Humedad Relativa */}
          <ColdRoomHumidityCalc 
            tempCold={form.cold_room_temp} 
            presionEvap={typeof result.evapPressure === 'number' ? result.evapPressure : 5.72}
            tempExterior={form.exterior_temp}
          />

          {/* Sección Resultado Principal */}
          <div ref={printRef}>
            <CompanyHeader className="mb-4" />
            <Card className="border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-blue-700">Resultado - Cámara Frigorífica</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-blue-600">{result.loadW} W</p>
                  <p className="text-xs text-blue-500">Carga frigorífica</p>
                </div>
                <div className="bg-cyan-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-cyan-600">{Math.round(result.loadW * 0.86)}</p>
                  <p className="text-xs text-cyan-500">Frig/hora</p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg text-center">
                  <p className="text-xl font-bold text-indigo-600">{result.panelArea} m²</p>
                  <p className="text-xs text-indigo-500">Panel frigorífico</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold text-sm mb-2">Equipo sugerido</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p><span className="text-gray-500">Marca:</span> {result.equip?.brand}</p>
                  <p><span className="text-gray-500">Modelo:</span> {result.equip?.model}</p>
                  <p><span className="text-gray-500">Potencia:</span> {result.equip?.power_kw} kW</p>
                  <p><span className="text-gray-500">Gas:</span> {result.equip?.gas}</p>
                  <p><span className="text-gray-500">Rango temp.:</span> {result.equip?.temp_range}</p>
                  <p><span className="text-gray-500">Tipo:</span> {result.equip?.type}</p>
                </div>
                {result.extraGrams > 0 && (
                  <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-sm">
                    ⚠️ Distancia ({result.actualDist}m) supera máximo ({result.maxDist}m). Añadir <strong>{result.extraGrams}g</strong> de {form.refrigerant_type} extra.
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="font-semibold text-sm mb-2">Presiones {form.refrigerant_type} — Temperatura evaporación ≈ {parseInt(form.cold_room_temp) - 8}°C</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>P. evaporación: <strong>{result.evapPressure} bar</strong></p>
                  <p>P. condensación: <strong>{result.condPressure} bar</strong></p>
                  <p>Carga refrigerante: <strong>{result.refCharge} kg</strong></p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-sm mb-2">Material necesario para el montaje</p>
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-gray-100"><th className="border p-1 text-left">Material</th><th className="border p-1 text-right">Cant.</th><th className="border p-1">Ud.</th></tr></thead>
                  <tbody>
                    {result.materials.map((m, i) => (
                      <tr key={i} className="border-b"><td className="border p-1">{m.material}</td><td className="border p-1 text-right">{m.quantity}</td><td className="border p-1">{m.unit}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <PrintButton contentRef={printRef} title="Cálculo Cámara Frigorífica" />
                {form.contact_id && (
                  <Button onClick={saveToClient} variant="outline">
                    <Save className="w-4 h-4 mr-2" /> {saved ? '¡Guardado!' : 'Guardar en cliente'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
        </>
      )}
    </div>
  );
}