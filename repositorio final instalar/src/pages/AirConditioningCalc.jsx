import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Calculator, FileDown, CheckCircle, Plus, Trash2, Home, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import CompanyHeader from '../components/CompanyHeader';
import { ThermalLoadBreakdown, PressureChart, EfficiencyRadar, MollierDiagram } from '../components/ThermalCharts';
import EquipmentSelector, { CLIMATE_CATALOG } from '../components/EquipmentSelector';

const REFRIGERANTS = ['R-32', 'R-410A', 'R-290', 'R-407C', 'R-134a', 'R-449A', 'R-452A', 'R-448A'];

const REFRIGERANT_PRESSURES = {
  'R-32':   { '0°C': 8.0, '5°C': 9.5, '10°C': 11.2, '15°C': 13.0, '20°C': 15.1, '25°C': 17.4, '30°C': 19.9 },
  'R-410A': { '0°C': 7.97,'5°C': 9.3, '10°C': 10.9, '15°C': 12.7, '20°C': 14.7, '25°C': 17.0, '30°C': 19.6 },
  'R-407C': { '0°C': 5.07,'5°C': 6.0, '10°C': 7.1,  '15°C': 8.3,  '20°C': 9.7,  '25°C': 11.3, '30°C': 13.1 },
  'R-134a': { '0°C': 2.93,'5°C': 3.5, '10°C': 4.1,  '15°C': 4.9,  '20°C': 5.7,  '25°C': 6.7,  '30°C': 7.7  },
  'R-290':  { '0°C': 4.74,'5°C': 5.5, '10°C': 6.4,  '15°C': 7.5,  '20°C': 8.7,  '25°C': 10.1, '30°C': 11.6 },
  'R-449A': { '0°C': 6.8, '5°C': 7.9, '10°C': 9.2,  '15°C': 10.7, '20°C': 12.4, '25°C': 14.3, '30°C': 16.5 },
  'R-452A': { '0°C': 7.5, '5°C': 8.7, '10°C': 10.1, '15°C': 11.7, '20°C': 13.6, '25°C': 15.7, '30°C': 18.1 },
  'R-448A': { '0°C': 6.5, '5°C': 7.5, '10°C': 8.7,  '15°C': 10.1, '20°C': 11.7, '25°C': 13.5, '30°C': 15.6 },
};

const EXTRA_REFRIGERANT_G_PER_M = { 'R-32': 15, 'R-410A': 20, 'R-290': 10, 'R-407C': 18, 'R-134a': 12, 'R-449A': 17, 'R-452A': 18, 'R-448A': 16 };

function calcAreaBreakdown(area) {
  const f = {
    length: parseFloat(area.length) || 0,
    width: parseFloat(area.width) || 0,
    height: parseFloat(area.height) || 0,
    orientation: area.orientation || 'sur',
    insulation_type: area.insulation_type || 'medio',
    window_area: parseFloat(area.window_area) || 0,
    num_people: parseFloat(area.num_people) || 0,
    equipment_heat: parseFloat(area.equipment_heat) || 0,
    exterior_temp: parseFloat(area.exterior_temp) || 35,
    target_temp: parseFloat(area.target_temp) || 22
  };

  const orientFactor = { norte: 0.8, sur: 1.2, este: 1.0, oeste: 1.1 }[f.orientation] || 1.0;
  const U = { bueno: 0.6, medio: 1.2, malo: 2.1 }[f.insulation_type] || 1.2;
  const dT = Math.abs(f.exterior_temp - f.target_temp);
  const vol = f.length * f.width * f.height;

  const surfaceArea = 2 * (f.length * f.height + f.width * f.height) + (f.length * f.width);
  const wallLoad = surfaceArea * U * dT;
  const windowLoad = f.window_area * 550 * orientFactor;
  const ventLoad = vol * 2 * 0.34 * dT;
  const peopleLoad = f.num_people * 130;
  const equipLoad = f.equipment_heat;

  return { wallLoad, windowLoad, peopleLoad, equipLoad, ventLoad };
}

function buildAreaResult(area, breakdown, refrigerant) {
  const { wallLoad, windowLoad, peopleLoad, equipLoad, ventLoad } = breakdown;
  const totalW = Math.round((wallLoad + windowLoad + peopleLoad + equipLoad + ventLoad) * 1.20);
  const loadFrigorias = Math.round(totalW * 0.86);
  const loadKW = (totalW / 1000).toFixed(2);

  const suitable = CLIMATE_CATALOG.filter(e => e.power_kw * 1000 >= totalW * 0.9);
  const equip = suitable.length > 0 ? suitable[0] : CLIMATE_CATALOG[CLIMATE_CATALOG.length - 1];
  const alternatives = suitable.slice(0, 3).length > 0 ? suitable.slice(0, 3) : CLIMATE_CATALOG.slice(-3);

  const actualDist = parseFloat(area.pipe_distance) || 5;
  const maxDist = equip.max_pipe_m;
  const extraGrams = actualDist > maxDist
    ? Math.round((actualDist - maxDist) * (EXTRA_REFRIGERANT_G_PER_M[refrigerant] || 18))
    : 0;

  const pr = REFRIGERANT_PRESSURES[refrigerant] || REFRIGERANT_PRESSURES['R-32'];

  const materials = [
    { material: `Tubería líquido 1/4" Cu (${area.name})`, quantity: actualDist, specification: 'metros' },
    { material: `Tubería gas 3/8" Cu (${area.name})`, quantity: actualDist, specification: 'metros' },
    { material: `Cableado eléctrico 4x1,5mm² (${area.name})`, quantity: actualDist + 2, specification: 'metros' },
    { material: `Aislamiento tubería AF/19 (${area.name})`, quantity: actualDist, specification: 'metros' },
    { material: `Soporte unidad exterior (${area.name})`, quantity: 1, specification: 'unidad' },
    { material: `Soporte unidad interior (${area.name})`, quantity: 1, specification: 'unidad' },
    { material: `${refrigerant} gas refrigerante (${area.name})`, quantity: (equip.power_kw * 0.3 + extraGrams / 1000).toFixed(2), specification: 'kg' },
  ];

  const insulScore = { bueno: 95, medio: 65, malo: 30 }[area.insulation_type] || 65;
  const pipingScore = Math.max(0, 100 - (actualDist - maxDist) * 5);
  const tempScore = Math.max(0, 100 - Math.abs(area.exterior_temp - 35) * 2);
  const loadScore = Math.min(100, Math.round((1 - totalW / 15000) * 100));
  const equipScore = Math.round((equip.power_kw * 1000 / totalW) * 50);

  return {
    loadW: totalW, loadFrigorias, loadKW, equip, alternatives, extraGrams, pr, materials, maxDist, actualDist,
    efficiencyScores: {
      insulation: Math.max(0, Math.min(100, insulScore)),
      piping: Math.max(0, Math.min(100, pipingScore)),
      temp: Math.max(0, Math.min(100, tempScore)),
      load: Math.max(0, Math.min(100, loadScore)),
      equipment: Math.max(0, Math.min(100, equipScore)),
    }
  };
}

export default function AirConditioningCalc() {
  const [contacts, setContacts] = useState([]);
  const [globalForm, setGlobalForm] = useState({
    contact_id: '',
    contact_name: '',
    refrigerant_type: 'R-32',
  });
  const [areas, setAreas] = useState([
    {
      id: 1, name: 'Salón', length: 5, width: 4, height: 2.7, orientation: 'sur',
      num_windows: 1, window_area: 2, num_people: 2, equipment_heat: 200,
      insulation_type: 'medio', target_temp: 22, exterior_temp: 35,
      pipe_distance: 5, pipe_height_diff: 3,
    }
  ]);
  const [results, setResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingCalcId, setExistingCalcId] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.Contact.list().then(setContacts);
  }, []);

  useEffect(() => {
    if (globalForm.contact_id) {
      base44.entities.ThermalCalculation.filter({ contact_id: globalForm.contact_id, calc_type: 'aire_acondicionado_areas' })
        .then(calcs => {
          if (calcs.length > 0) {
            const last = calcs.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))[0];
            setExistingCalcId(last.id);
          } else {
            setExistingCalcId(null);
          }
        });
    } else {
      setExistingCalcId(null);
    }
  }, [globalForm.contact_id]);

  const addArea = () => {
    const newId = areas.length > 0 ? Math.max(...areas.map(a => a.id)) + 1 : 1;
    setAreas([...areas, {
      id: newId, name: `Zona ${newId}`, length: 5, width: 4, height: 2.7, orientation: 'sur',
      num_windows: 1, window_area: 2, num_people: 2, equipment_heat: 200,
      insulation_type: 'medio', target_temp: 22, exterior_temp: 35,
      pipe_distance: 5, pipe_height_diff: 3,
    }]);
  };

  const removeArea = (id) => {
    setAreas(areas.filter(a => a.id !== id));
    const newResults = { ...results };
    delete newResults[id];
    setResults(newResults);
  };

  const updateArea = (id, field, value) => {
    setAreas(areas.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const calculate = () => {
    const newResults = {};
    areas.forEach(area => {
      const bd = calcAreaBreakdown(area);
      newResults[area.id] = {
        breakdown: bd,
        result: buildAreaResult(area, bd, globalForm.refrigerant_type)
      };
    });
    setResults(newResults);
  };

  const handleAreaBreakdownAdjust = (areaId, key, value) => {
    const currentAreaResult = results[areaId];
    if (!currentAreaResult) return;
    const newBd = { ...currentAreaResult.breakdown, [key]: value };
    const area = areas.find(a => a.id === areaId);
    setResults({
      ...results,
      [areaId]: {
        breakdown: newBd,
        result: buildAreaResult(area, newBd, globalForm.refrigerant_type)
      }
    });
  };

  const saveToClient = async () => {
    if (!globalForm.contact_id || Object.keys(results).length === 0) return;
    setSaving(true);

    const totalLoadW = Object.values(results).reduce((sum, r) => sum + r.result.loadW, 0);
    const totalMaterials = Object.values(results).flatMap(r => r.result.materials);

    const data = {
      contact_id: globalForm.contact_id,
      contact_name: globalForm.contact_name,
      calc_type: 'aire_acondicionado_areas',
      date: format(new Date(), 'yyyy-MM-dd'),
      calculated_load: totalLoadW,
      refrigerant_type: globalForm.refrigerant_type,
      notes: [
        `=== CÁLCULO AIRE ACONDICIONADO POR ÁREAS ===`,
        `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
        `Total Áreas: ${areas.length}`,
        `Carga Total: ${totalLoadW}W | ${Math.round(totalLoadW * 0.86)} frig/h`,
        `--- DETALLE POR ÁREA ---`,
        ...areas.map(area => {
          const r = results[area.id];
          if (!r) return '';
          return `[${area.name}] ${r.result.loadW}W | Equipo: ${r.result.equip.brand} ${r.result.equip.model}`;
        }),
        `--- MATERIALES TOTALES ---`,
        ...totalMaterials.map(m => `${m.material}: ${m.quantity} ${m.specification}`),
      ].join('\n'),
      // Store raw data for later retrieval if needed
      metadata: { areas, results, globalForm }
    };

    if (existingCalcId) {
      await base44.entities.ThermalCalculation.update(existingCalcId, data);
    } else {
      const created = await base44.entities.ThermalCalculation.create(data);
      setExistingCalcId(created.id);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const generatePDF = async () => {
    if (Object.keys(results).length === 0) return;
    const csArr = await base44.entities.CompanySettings.list();
    const cs = csArr?.[0] || {};
    const totalLoadW = Object.values(results).reduce((sum, r) => sum + r.result.loadW, 0);

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Cálculo Aire Acondicionado por Áreas</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;font-size:11px;color:#111}
        .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1e3a5f;padding-bottom:10px;margin-bottom:14px}
        .section{margin-top:12px;padding:10px;background:#f8fafc;border-left:4px solid #0ea5e9;border-radius:4px}
        .section-title{font-weight:700;font-size:12px;color:#0ea5e9;margin-bottom:6px}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}
        .kpi-container{display:grid;grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin: 15px 0;}
        .kpi{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:10px;text-align:center}
        .kpi-val{font-size:20px;font-weight:700;color:#0ea5e9}
        table{width:100%;border-collapse:collapse;font-size:10px;margin-top:8px}
        td,th{border:1px solid #e5e7eb;padding:4px 6px}
        th{background:#f3f4f6;font-weight:600}
        .area-card{border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:15px; page-break-inside: avoid;}
        .area-header{background:#f1f5f9; padding:6px 10px; border-radius:6px; font-weight:bold; margin-bottom:10px; display:flex; justify-content:space-between;}
        .footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;text-align:center}
        @media print{@page{margin:15mm}}
      </style></head><body>
      <div class="header">
        ${cs.logo_url ? `<img src="${cs.logo_url}" style="height:50px;object-fit:contain" alt="logo"/>` : ''}
        <div>
          <div style="font-size:18px;font-weight:700;color:#1e3a5f">${cs.company_name||'Empresa'}</div>
          <div style="font-size:10px;color:#6b7280">${cs.address||''} ${cs.city||''} · ${cs.phone||''}</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-size:15px;font-weight:700;color:#0ea5e9">Informe de Climatización por Áreas</div>
          <div style="font-size:10px;color:#6b7280">${new Date().toLocaleDateString('es-ES')}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Resumen Global</div>
        <div class="kpi-container">
          <div class="kpi"><div class="kpi-val">${totalLoadW} W</div><div style="font-size:9px">Carga Total</div></div>
          <div class="kpi"><div class="kpi-val">${Math.round(totalLoadW * 0.86)}</div><div style="font-size:9px">Frigorías Total</div></div>
          <div class="kpi"><div class="kpi-val">${areas.length}</div><div style="font-size:9px">Nº de Áreas</div></div>
          <div class="kpi"><div class="kpi-val">${globalForm.refrigerant_type}</div><div style="font-size:9px">Refrigerante</div></div>
        </div>
      </div>

      <div class="section-title" style="margin-top:20px">Desglose por Estancias</div>
      ${areas.map(area => {
        const r = results[area.id];
        if (!r) return '';
        return `
        <div class="area-card">
          <div class="area-header">
            <span>${area.name}</span>
            <span>${r.result.loadW} W | ${r.result.loadFrigorias} Frig/h</span>
          </div>
          <div class="grid2">
            <div>Dimensiones: ${area.length}x${area.width}x${area.height}m</div>
            <div>Orientación: ${area.orientation} | Ventanas: ${area.window_area}m²</div>
            <div>Equipo Recomendado: <b>${r.result.equip.brand} ${r.result.equip.model}</b></div>
            <div>Potencia Equipo: ${r.result.equip.power_kw} kW</div>
          </div>
          <div style="margin-top:8px; font-size:9px; color:#64748b">
            Cargas: Transmisión ${Math.round(r.breakdown.wallLoad)}W | Radiación ${Math.round(r.breakdown.windowLoad)}W | Ventilación ${Math.round(r.breakdown.ventLoad)}W | Interna ${Math.round(r.breakdown.peopleLoad + r.breakdown.equipLoad)}W
          </div>
        </div>`;
      }).join('')}

      <div class="section" style="page-break-before: always;">
        <div class="section-title">Materiales Consolidados</div>
        <table><thead><tr><th>Material</th><th>Cantidad</th><th>Especificación</th></tr></thead><tbody>
          ${Object.values(results).flatMap(r => r.result.materials).map(m => `<tr><td>${m.material}</td><td style="text-align:right">${m.quantity}</td><td>${m.specification}</td></tr>`).join('')}
        </tbody></table>
      </div>

      <div class="footer">Este informe es un cálculo técnico preliminar basado en los datos proporcionados. Se recomienda verificación in situ.</div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  const totalGlobalW = Object.values(results).reduce((sum, r) => sum + r.result.loadW, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Home className="w-7 h-7 text-blue-500" /> Cálculo AC por Áreas / Estancias
        </h1>
        <div className="flex gap-2">
          <Button onClick={addArea} variant="outline" className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50">
            <Plus className="w-4 h-4" /> Añadir Estancia
          </Button>
          <Button onClick={calculate} className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-md">
            <Calculator className="w-4 h-4" /> Calcular Todo
          </Button>
        </div>
      </div>

      {/* Global Config */}
      <Card className="border-blue-100 shadow-sm overflow-hidden">
        <div className="bg-blue-500 h-1 w-full" />
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Cliente / Proyecto</label>
            <Select value={globalForm.contact_id} onValueChange={v => {
              const c = contacts.find(co => co.id === v);
              setGlobalForm({...globalForm, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
            }}>
              <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
              <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Refrigerante Global</label>
            <Select value={globalForm.refrigerant_type} onValueChange={v => setGlobalForm({...globalForm, refrigerant_type: v})}>
              <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{REFRIGERANTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 w-full flex justify-between items-center">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Carga Total:</span>
              <span className="text-lg font-black text-blue-800">{totalGlobalW} W</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Areas List */}
      <div className="space-y-6">
        {areas.map((area, index) => (
          <Card key={area.id} className="border-slate-200 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
            <CardHeader className="bg-slate-50 py-3 border-b flex flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">{index + 1}</div>
                <Input
                  className="bg-transparent border-none font-bold text-lg p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 w-48"
                  value={area.name}
                  onChange={e => updateArea(area.id, 'name', e.target.value)}
                  placeholder="Nombre de la estancia"
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeArea(area.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs Area */}
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                      <ChevronRight className="w-3 h-3 text-blue-500" /> Parámetros Estancia
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-[10px] text-gray-500 font-bold">Largo (m)</label><Input type="text" inputMode="decimal" value={area.length} onChange={e => updateArea(area.id, 'length', e.target.value)} /></div>
                      <div><label className="text-[10px] text-gray-500 font-bold">Ancho (m)</label><Input type="text" inputMode="decimal" value={area.width} onChange={e => updateArea(area.id, 'width', e.target.value)} /></div>
                      <div><label className="text-[10px] text-gray-500 font-bold">Alto (m)</label><Input type="text" inputMode="decimal" value={area.height} onChange={e => updateArea(area.id, 'height', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold">Orientación</label>
                        <Select value={area.orientation} onValueChange={v => updateArea(area.id, 'orientation', v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="norte">Norte</SelectItem><SelectItem value="sur">Sur</SelectItem>
                            <SelectItem value="este">Este</SelectItem><SelectItem value="oeste">Oeste</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 font-bold">Aislamiento</label>
                        <Select value={area.insulation_type} onValueChange={v => updateArea(area.id, 'insulation_type', v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bueno">Bueno</SelectItem><SelectItem value="medio">Medio</SelectItem>
                            <SelectItem value="malo">Malo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><label className="text-[10px] text-gray-500 font-bold">Sup. ventanas (m²)</label><Input type="text" inputMode="decimal" value={area.window_area} onChange={e => updateArea(area.id, 'window_area', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div><label className="text-[10px] text-gray-500 font-bold">Nº personas</label><Input type="text" inputMode="numeric" value={area.num_people} onChange={e => updateArea(area.id, 'num_people', e.target.value)} /></div>
                      <div><label className="text-[10px] text-gray-500 font-bold">Calor equipos (W)</label><Input type="text" inputMode="decimal" value={area.equipment_heat} onChange={e => updateArea(area.id, 'equipment_heat', e.target.value)} /></div>
                      <div><label className="text-[10px] text-gray-500 font-bold">T. exterior (°C)</label><Input type="text" inputMode="decimal" value={area.exterior_temp} onChange={e => updateArea(area.id, 'exterior_temp', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                       <div className="col-span-1"><label className="text-[10px] text-gray-500 font-bold">T. objetivo (°C)</label><Input type="text" inputMode="decimal" value={area.target_temp} onChange={e => updateArea(area.id, 'target_temp', e.target.value)} /></div>
                       <div><label className="text-[10px] text-gray-500 font-bold">Long. tubería (m)</label><Input type="text" inputMode="decimal" value={area.pipe_distance} onChange={e => updateArea(area.id, 'pipe_distance', e.target.value)} /></div>
                       <div><label className="text-[10px] text-gray-500 font-bold">Dif. altura (m)</label><Input type="text" inputMode="decimal" value={area.pipe_height_diff} onChange={e => updateArea(area.id, 'pipe_height_diff', e.target.value)} /></div>
                    </div>
                  </div>
                </div>

                {/* Results Area */}
                <div className="space-y-4">
                  {results[area.id] ? (
                    <div className="animate-in fade-in slide-in-from-right-2 duration-300 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-center">
                          <p className="text-xl font-black text-blue-600">{results[area.id].result.loadW} W</p>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Carga térmica</p>
                        </div>
                        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl text-center">
                          <p className="text-xl font-black text-indigo-600">{results[area.id].result.loadFrigorias}</p>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-tighter">Frigorías/h</p>
                        </div>
                      </div>

                      <Card className="border-emerald-100 bg-emerald-50/30 overflow-hidden">
                        <CardHeader className="py-2 px-4 bg-emerald-50 flex flex-row items-center justify-between border-b border-emerald-100">
                          <CardTitle className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Equipo Recomendado
                          </CardTitle>
                          <span className="text-[10px] font-black text-emerald-600 px-1.5 py-0.5 bg-white rounded border border-emerald-200">RITE 2026 OK</span>
                        </CardHeader>
                        <CardContent className="p-4">
                          <EquipmentSelector
                            mode="clima"
                            loadKW={results[area.id].result.loadW / 1000}
                            onSelect={(eq) => {
                              const newRes = { ...results };
                              newRes[area.id].result.equip = eq;
                              setResults(newRes);
                            }}
                          />
                        </CardContent>
                      </Card>

                      {/* Charts toggle or preview */}
                      <div className="grid grid-cols-2 gap-3">
                        <EfficiencyRadar scores={results[area.id].result.efficiencyScores} />
                        <PressureChart pressureData={results[area.id].result.pr} refrigerant={globalForm.refrigerant_type} />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 p-10">
                      <Calculator className="w-10 h-10 opacity-20" />
                      <p className="text-sm font-medium">Haz clic en "Calcular Todo" para ver los resultados de esta zona</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Desglose (Interactivo) */}
              {results[area.id] && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ThermalLoadBreakdown
                        breakdown={results[area.id].breakdown}
                        onAdjust={(key, val) => handleAreaBreakdownAdjust(area.id, key, val)}
                      />
                      <MollierDiagram
                        refrigerant={globalForm.refrigerant_type}
                        evapPressure={results[area.id].result.pr['0°C'] || 5}
                        condPressure={results[area.id].result.pr['30°C'] || 15}
                        onAdjust={(key, val) => {
                          const newPr = { ...results[area.id].result.pr };
                          if (key === 'evapPressure') newPr['0°C'] = val;
                          if (key === 'condPressure') newPr['30°C'] = val;
                          const newResults = { ...results };
                          newResults[area.id].result.pr = newPr;
                          setResults(newResults);
                        }}
                      />
                   </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Consolidation / Action Bar */}
      {Object.keys(results).length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
           <Card className="bg-slate-900 text-white shadow-2xl border-none">
             <CardContent className="p-3 flex items-center justify-between gap-3">
               <div className="flex-1 min-w-0">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Global</p>
                 <p className="text-xl font-black text-blue-400">{totalGlobalW} W</p>
               </div>
               <div className="flex gap-2">
                 <Button onClick={generatePDF} variant="outline" size="sm" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
                   <FileDown className="w-4 h-4" />
                 </Button>
                 <Button onClick={saveToClient} disabled={saving} size="sm" className={`${saved ? 'bg-emerald-600' : 'bg-blue-600'} hover:opacity-90 font-bold gap-2 min-w-[140px]`}>
                   {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                   {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar Informe'}
                 </Button>
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {/* Print Preview Container (Hidden from screen) */}
      <div className="hidden">
        <div ref={printRef}>
          <CompanyHeader />
          {/* PDF content is generated via generatePDF function, this is just for reference or PrintButton */}
        </div>
      </div>
    </div>
  );
}
