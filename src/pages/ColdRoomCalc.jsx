import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Save, Calculator, Droplets, FileDown, RefreshCw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';
import ColdRoomHumidityCalc from '../components/ColdRoomHumidityCalc';
import RefrigerantSelector from '../components/RefrigerantSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColdRoomBreakdown, PressureChart, EfficiencyRadar } from '../components/ThermalCharts';

import { REFRIGERANT_DATABASE } from '../components/refrigerantData';
const REFRIGERANTS = REFRIGERANT_DATABASE.map(r => r.code);

const REF_PRESSURES = {
  'R-404A': { '-35°C': 0.93, '-25°C': 1.67, '-15°C': 2.82, '-10°C': 3.64, '0°C': 5.72, '5°C': 7.0 },
  'R-448A': { '-35°C': 0.76, '-25°C': 1.42, '-15°C': 2.46, '-10°C': 3.2,  '0°C': 5.1,  '5°C': 6.3 },
  'R-449A': { '-35°C': 0.8,  '-25°C': 1.5,  '-15°C': 2.6,  '-10°C': 3.3,  '0°C': 5.2,  '5°C': 6.4 },
  'R-452A': { '-35°C': 0.85, '-25°C': 1.55, '-15°C': 2.65, '-10°C': 3.4,  '0°C': 5.3,  '5°C': 6.5 },
  'R-134a': { '-35°C': 0.66, '-25°C': 1.16, '-15°C': 1.94, '-10°C': 2.43, '0°C': 3.72, '5°C': 4.46 },
  'R-290':  { '-35°C': 1.03, '-25°C': 1.83, '-15°C': 3.07, '-10°C': 3.93, '0°C': 6.07, '5°C': 7.4 },
};

const EXTRA_REF_G_PER_M = { 'R-404A': 22, 'R-448A': 18, 'R-449A': 18, 'R-452A': 19, 'R-134a': 14, 'R-290': 11 };

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

function calcBreakdown(f) {
  const insul = { '60mm': 0.35, '80mm': 0.27, '100mm': 0.22, '120mm': 0.18 }[f.panel_thickness] || 0.27;
  const surf = 2 * (f.length * f.width + f.length * f.height + f.width * f.height);
  const deltaT = Math.abs((f.exterior_temp || 25) - (f.cold_room_temp || 2));
  const transmissionLoad = surf * insul * deltaT;
  const productLoad = (f.product_kg || 100) * 3.5 * Math.abs(f.exterior_temp - f.cold_room_temp) / 24;
  const vol = f.length * f.width * f.height;
  const ventLoad = vol * 0.5 * 1.2 * 1.005 * deltaT * 0.28;
  return { transmissionLoad, productLoad, ventLoad };
}

function buildResult(form, breakdown) {
  const { transmissionLoad, productLoad, ventLoad } = breakdown;
  const totalLoad = Math.round((transmissionLoad + productLoad + ventLoad) * 1.25);

  const suitableCold = COLD_CATALOG.filter(e => e.power_kw * 1000 >= totalLoad * 0.9);
  const equip = suitableCold[0] || COLD_CATALOG[COLD_CATALOG.length - 1];
  const alternatives = suitableCold.slice(0, 3).length > 0 ? suitableCold.slice(0, 3) : COLD_CATALOG.slice(-3);
  const actualDist = parseFloat(form.pipe_distance) || 8;
  const maxDist = equip.max_pipe_m;
  const extraGrams = actualDist > maxDist ? Math.round((actualDist - maxDist) * (EXTRA_REF_G_PER_M[form.refrigerant_type] || 18)) : 0;

  const coldTemp = parseFloat(form.cold_room_temp);
  const evapTemp = coldTemp - 8;
  const evapKey = String(evapTemp <= -35 ? '-35°C' : evapTemp <= -25 ? '-25°C' : evapTemp <= -15 ? '-15°C' : evapTemp <= -10 ? '-10°C' : evapTemp <= 0 ? '0°C' : '5°C');
  const pr = REF_PRESSURES[form.refrigerant_type] || REF_PRESSURES['R-449A'];
  const evapPressure = pr[evapKey] || '—';
  const condPressure = (parseFloat(Object.values(pr).slice(-1)[0]) * (form.exterior_temp > 35 ? 1.15 : 1)).toFixed(2);

  const panelArea = 2 * (form.length * form.width + form.length * form.height + form.width * form.height);
  const refCharge = (equip.power_kw * 0.35 + actualDist * (EXTRA_REF_G_PER_M[form.refrigerant_type] || 18) / 1000).toFixed(2);

  const materials = [
    { material: `Panel frigorífico ${form.panel_thickness}`, quantity: panelArea.toFixed(1), unit: 'm²' },
    { material: `Evaporador cámara`, quantity: 1, unit: 'unidad' },
    { material: `Unidad condensadora ${equip.brand} ${equip.model}`, quantity: 1, unit: 'unidad' },
    { material: `Tubería líquido 3/8" Cu`, quantity: actualDist, unit: 'm' },
    { material: `Tubería gas 5/8" Cu`, quantity: actualDist, unit: 'm' },
    { material: `Aislamiento tubería Armaflex 19mm`, quantity: actualDist * 2, unit: 'm' },
    { material: `${form.refrigerant_type} gas refrigerante`, quantity: refCharge, unit: 'kg' },
    { material: `Válvula expansión termostática (VET)`, quantity: 1, unit: 'unidad' },
    { material: `Filtro deshidratador`, quantity: 1, unit: 'unidad' },
    { material: `Visor de líquido`, quantity: 1, unit: 'unidad' },
    { material: `Presostato alta/baja`, quantity: 1, unit: 'unidad' },
    { material: `Cuadro eléctrico control cámara`, quantity: 1, unit: 'unidad' },
    { material: `Cableado eléctrico 4x2,5mm²`, quantity: actualDist + 5, unit: 'm' },
    { material: `Marco puerta frigorífica isotérmica`, quantity: 1, unit: 'unidad' },
  ];

  // Scores eficiencia
  const panelScore = { '60mm': 60, '80mm': 75, '100mm': 88, '120mm': 100 }[form.panel_thickness] || 75;
  const pipingScore = Math.max(0, 100 - Math.max(0, actualDist - maxDist) * 5);
  const tempScore = Math.max(0, 100 - Math.abs(form.exterior_temp - 25) * 2);
  const loadScore = Math.min(100, Math.round((1 - totalLoad / 20000) * 100));
  const equipScore = Math.min(100, Math.round((equip.power_kw * 1000 / totalLoad) * 50));

  return {
    loadW: totalLoad, equip, alternatives, extraGrams, evapPressure, condPressure, refCharge,
    panelArea: panelArea.toFixed(1), materials, maxDist, actualDist, pr,
    efficiencyScores: {
      insulation: Math.max(0, Math.min(100, panelScore)),
      piping: Math.max(0, Math.min(100, pipingScore)),
      temp: Math.max(0, Math.min(100, tempScore)),
      load: Math.max(0, Math.min(100, loadScore)),
      equipment: Math.max(0, Math.min(100, equipScore)),
    }
  };
}

export default function ColdRoomCalc() {
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('camara');
  const [form, setForm] = useState({
    contact_id: '', contact_name: '',
    length: 4, width: 3, height: 2.5,
    cold_room_temp: 2, exterior_temp: 25,
    product_kg: 200, cold_room_type: 'positiva',
    panel_thickness: '80mm', refrigerant_type: 'R-449A',
    pipe_distance: 8, pipe_height_diff: 3,
    photos_evaporator: [], photos_condenser: [], photos_other: [],
    humidity_evap_pressure: 5.72,
  });
  const [breakdown, setBreakdown] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingCalcId, setExistingCalcId] = useState(null);
  const printRef = useRef(null);
  const humidityPrintRef = useRef(null);

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, []);

  useEffect(() => {
    if (form.contact_id) {
      base44.entities.ThermalCalculation.filter({ contact_id: form.contact_id, calc_type: 'camara_frigorifica' })
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
  }, [form.contact_id]);

  const calculate = () => {
    const bd = calcBreakdown(form);
    setBreakdown(bd);
    setResult(buildResult(form, bd));
  };

  const handleBreakdownAdjust = (key, value) => {
    const newBd = { ...breakdown, [key]: value };
    setBreakdown(newBd);
    setResult(buildResult(form, newBd));
  };

  const saveToClient = async (titleSuffix = '') => {
    if (!form.contact_id || !result) return;
    setSaving(true);
    const bd = breakdown || calcBreakdown(form);

    const data = {
      contact_id: form.contact_id,
      contact_name: form.contact_name,
      calc_type: 'camara_frigorifica',
      date: format(new Date(), 'yyyy-MM-dd'),
      // Parámetros
      room_length: form.length,
      room_width: form.width,
      room_height: form.height,
      exterior_temp: form.exterior_temp,
      cold_room_temp: form.cold_room_temp,
      cold_room_product: form.cold_room_type,
      cold_room_product_kg: form.product_kg,
      refrigerant_type: form.refrigerant_type,
      pipe_distance: form.pipe_distance,
      pipe_height_diff: form.pipe_height_diff,
      // Resultados
      calculated_load: result.loadW,
      calculated_load_frigorias: Math.round(result.loadW * 0.86),
      suggested_brand: result.equip.brand,
      suggested_model: result.equip.model,
      suggested_equipment: `${result.equip.brand} ${result.equip.model} ${result.equip.power_kw}kW`,
      refrigerant_charge_kg: parseFloat(result.refCharge),
      extra_refrigerant_g: result.extraGrams,
      materials_list: result.materials.map(m => ({ material: m.material, quantity: parseFloat(m.quantity) || 1, specification: m.unit })),
      working_pressures: {
        high_pressure: parseFloat(result.condPressure) || 0,
        low_pressure: parseFloat(result.evapPressure) || 0,
        condensation_temp: form.exterior_temp + 15,
        evaporation_temp: form.cold_room_temp - 8,
      },
      notes: `Panel: ${form.panel_thickness}, Área panel: ${result.panelArea}m². Desglose: transmisión ${Math.round(bd.transmissionLoad)}W, producto ${Math.round(bd.productLoad)}W, ventilación ${Math.round(bd.ventLoad)}W. Alternativas: ${result.alternatives.map(e => `${e.brand} ${e.model} ${e.power_kw}kW`).join(' | ')}. ${titleSuffix}`,
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
    if (!result) return;
    const csArr = await base44.entities.CompanySettings.list();
    const cs = csArr?.[0] || {};
    const bd = breakdown || calcBreakdown(form);

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Cálculo Cámara Frigorífica</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;font-size:11px;color:#111}
        .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1e3a5f;padding-bottom:10px;margin-bottom:14px}
        .section{margin-top:12px;padding:10px;background:#f8fafc;border-left:4px solid #2563eb;border-radius:4px}
        .section-title{font-weight:700;font-size:12px;color:#2563eb;margin-bottom:6px}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}
        .kpi{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:10px;text-align:center}
        .kpi-val{font-size:22px;font-weight:700}
        .kpis{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-top:10px}
        table{width:100%;border-collapse:collapse;font-size:10px}
        td,th{border:1px solid #e5e7eb;padding:4px 6px}
        th{background:#f3f4f6;font-weight:600}
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
          <div style="font-size:15px;font-weight:700;color:#2563eb">Informe Cálculo Cámara Frigorífica</div>
          <div style="font-size:10px;color:#6b7280">${new Date().toLocaleDateString('es-ES')}</div>
        </div>
      </div>
      ${form.contact_name ? `<div class="section"><div class="section-title">Cliente</div><b>${form.contact_name}</b></div>` : ''}
      <div class="section">
        <div class="section-title">Parámetros</div>
        <div class="grid2">
          <div>Dimensiones: <b>${form.length}×${form.width}×${form.height} m</b></div>
          <div>Tipo cámara: ${form.cold_room_type}</div>
          <div>T. cámara: ${form.cold_room_temp}°C</div>
          <div>T. exterior: ${form.exterior_temp}°C</div>
          <div>Panel: ${form.panel_thickness}</div>
          <div>Producto: ${form.product_kg} kg</div>
          <div>Gas: ${form.refrigerant_type}</div>
          <div>Tubería: ${form.pipe_distance} m</div>
        </div>
      </div>
      <div class="section" style="border-left-color:#f97316">
        <div class="section-title" style="color:#f97316">Desglose de cargas</div>
        <div class="grid2">
          <div>Transmisión: <b>${Math.round(bd.transmissionLoad)} W</b></div>
          <div>Producto: <b>${Math.round(bd.productLoad)} W</b></div>
          <div>Ventilación: <b>${Math.round(bd.ventLoad)} W</b></div>
          <div>Factor seguridad (×1.25): incluido</div>
        </div>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-val" style="color:#2563eb">${result.loadW} W</div><div style="font-size:9px;color:#6b7280">Carga total</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#06b6d4">${Math.round(result.loadW * 0.86)}</div><div style="font-size:9px;color:#6b7280">Frig/hora</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#4f46e5">${result.panelArea} m²</div><div style="font-size:9px;color:#6b7280">Panel frigorífico</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#16a34a">${result.equip.power_kw} kW</div><div style="font-size:9px;color:#6b7280">Equipo sugerido</div></div>
      </div>
      <div class="section" style="margin-top:14px">
        <div class="section-title">Equipos recomendados</div>
        ${result.alternatives.map((eq, idx) => `
          <div style="background:${idx===0?'#eff6ff':'#f9fafb'};border:1px solid ${idx===0?'#93c5fd':'#e5e7eb'};border-radius:6px;padding:8px;margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;font-weight:700;color:${idx===0?'#2563eb':'#6b7280'}">${idx===0?'⭐ Opción principal':'Opción '+(idx+1)}</span>
              <span style="font-weight:700;color:#2563eb">${eq.power_kw} kW</span>
            </div>
            <div class="grid2">
              <div>Marca: <b>${eq.brand}</b></div>
              <div>Modelo: <b>${eq.model}</b></div>
              <div>Gas: ${eq.gas}</div><div>Rango: ${eq.temp_range}</div>
              <div>Tipo: ${eq.type}</div><div>Dist. máx.: ${eq.max_pipe_m} m</div>
            </div>
          </div>`).join('')}
        ${result.extraGrams > 0 ? `<p style="margin-top:6px;background:#fef9c3;padding:4px 6px;border-radius:4px">⚠️ Añadir <b>${result.extraGrams}g</b> extra de ${form.refrigerant_type}</p>` : ''}
      </div>
      <div class="section" style="border-left-color:#2563eb">
        <div class="section-title" style="color:#2563eb">Presiones ${form.refrigerant_type}</div>
        <div class="grid2">
          <div>P. evaporación: <b>${result.evapPressure} bar</b></div>
          <div>P. condensación: <b>${result.condPressure} bar</b></div>
          <div>T. evap. aprox: <b>${form.cold_room_temp - 8}°C</b></div>
          <div>Carga refrigerante: <b>${result.refCharge} kg</b></div>
        </div>
      </div>
      <div style="margin-top:12px">
        <p style="font-weight:600;font-size:11px;margin-bottom:4px">Material necesario</p>
        <table><thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>
          ${result.materials.map(m => `<tr><td>${m.material}</td><td style="text-align:right">${m.quantity}</td><td>${m.unit}</td></tr>`).join('')}
        </tbody></table>
      </div>
      <div class="footer">Informe generado el ${new Date().toLocaleDateString('es-ES')} — ${cs.company_name||''} · Valores orientativos</div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  // Shared form inputs for cold room
  const ColdRoomInputs = () => (
    <>
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

      {existingCalcId && (
        <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />
          Existe un cálculo guardado para este cliente — al guardar se actualizará
        </div>
      )}

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
        <PhotoGallery photos={form.photos_condenser} onChange={p => setForm({...form, photos_condenser: p})} label="Fotos grupo frío" maxPhotos={30} />
        <PhotoGallery photos={form.photos_other} onChange={p => setForm({...form, photos_other: p})} label="Otras fotos" maxPhotos={10} />
      </div>
    </>
  );

  const ResultSection = ({ withHumidity = false }) => result && breakdown ? (
    <div ref={printRef} className="space-y-4 mt-4">
      <CompanyHeader className="mb-4" />

      {withHumidity && (
        <ColdRoomHumidityCalc
          tempCold={form.cold_room_temp}
          presionEvap={parseFloat(result.evapPressure) || 5.72}
          tempExterior={form.exterior_temp}
          refrigerantType={form.refrigerant_type}
          refrigerantWeight={result.refCharge}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{result.loadW} W</p>
          <p className="text-xs text-blue-500">Carga frigorífica</p>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-cyan-600">{Math.round(result.loadW * 0.86)}</p>
          <p className="text-xs text-cyan-500">Frig/hora</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-indigo-600">{result.panelArea} m²</p>
          <p className="text-xs text-indigo-500">Panel frigorífico</p>
        </div>
        <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{result.equip.power_kw} kW</p>
          <p className="text-xs text-green-500">Equipo sugerido</p>
        </div>
      </div>

      {/* Gráficas interactivas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ColdRoomBreakdown breakdown={breakdown} onAdjust={handleBreakdownAdjust} />
        <EfficiencyRadar scores={result.efficiencyScores} />
      </div>

      <PressureChart pressureData={result.pr} refrigerant={form.refrigerant_type} />

      {/* Equipos recomendados - 3 opciones */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50 py-3">
          <CardTitle className="text-blue-700 text-base">Equipos recomendados ({result.alternatives.length} opciones)</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {result.alternatives.map((eq, idx) => (
            <div key={idx} className={`rounded-lg border p-3 ${idx === 0 ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-400 text-white'}`}>
                  {idx === 0 ? '⭐ Opción principal' : `Opción ${idx + 1}`}
                </span>
                <span className="font-bold text-blue-700">{eq.power_kw} kW</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-sm">
                <p><span className="text-gray-500">Marca:</span> <strong>{eq.brand}</strong></p>
                <p><span className="text-gray-500">Modelo:</span> <strong>{eq.model}</strong></p>
                <p><span className="text-gray-500">Gas:</span> {eq.gas}</p>
                <p><span className="text-gray-500">Rango:</span> {eq.temp_range}</p>
                <p><span className="text-gray-500">Tipo:</span> {eq.type}</p>
                <p><span className="text-gray-500">Dist. máx.:</span> {eq.max_pipe_m} m</p>
              </div>
            </div>
          ))}
          {result.extraGrams > 0 && (
            <div className="mt-2 p-2 bg-yellow-100 rounded text-yellow-800 text-sm">
              ⚠️ Distancia ({result.actualDist}m) supera máximo ({result.maxDist}m). Añadir <strong>{result.extraGrams}g</strong> de {form.refrigerant_type} extra.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Presiones */}
      <Card className="border-blue-100">
        <CardContent className="p-4">
          <p className="font-semibold text-sm mb-3 text-blue-700">Presiones {form.refrigerant_type} — T. evap. ≈ {form.cold_room_temp - 8}°C</p>
          <div className="grid grid-cols-3 md:grid-cols-3 gap-3 text-sm mb-2">
            <div className="bg-blue-50 rounded p-2 text-center">
              <p className="text-xs text-gray-500">P. evaporación</p>
              <p className="font-bold text-blue-700">{result.evapPressure} bar</p>
            </div>
            <div className="bg-red-50 rounded p-2 text-center">
              <p className="text-xs text-gray-500">P. condensación</p>
              <p className="font-bold text-red-700">{result.condPressure} bar</p>
            </div>
            <div className="bg-green-50 rounded p-2 text-center">
              <p className="text-xs text-gray-500">Carga refrigerante</p>
              <p className="font-bold text-green-700">{result.refCharge} kg</p>
            </div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1">
            {Object.entries(result.pr).map(([t, p]) => (
              <div key={t} className="bg-gray-50 rounded p-1.5 text-center text-xs">
                <p className="text-gray-400">{t}</p>
                <p className="font-semibold text-blue-700">{p} bar</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Materiales */}
      <Card>
        <CardContent className="p-4">
          <p className="font-semibold text-sm mb-2">Material necesario para el montaje</p>
          <table className="w-full text-xs border-collapse">
            <thead><tr className="bg-gray-100">
              <th className="border p-1 text-left">Material</th>
              <th className="border p-1 text-right">Cant.</th>
              <th className="border p-1">Ud.</th>
            </tr></thead>
            <tbody>
              {result.materials.map((m, i) => (
                <tr key={i} className="border-b">
                  <td className="border p-1">{m.material}</td>
                  <td className="border p-1 text-right">{m.quantity}</td>
                  <td className="border p-1">{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap">
        <PrintButton contentRef={printRef} title={withHumidity ? "Cálculo Cámara + Humedad" : "Cálculo Cámara Frigorífica"} />
        <Button onClick={generatePDF} variant="outline" className="gap-2">
          <FileDown className="w-4 h-4" /> PDF completo
        </Button>
        {form.contact_id && (
          <Button
            onClick={() => saveToClient(withHumidity ? 'Cálculo combinado con humedad.' : '')}
            disabled={saving}
            className={`gap-2 ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? '¡Guardado!' : saving ? 'Guardando...' : existingCalcId ? 'Actualizar en cliente' : 'Guardar en cliente'}
          </Button>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4 max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="camara" className="flex items-center gap-2">
            <Thermometer className="w-4 h-4" /> Cámara Frigorífica
          </TabsTrigger>
          <TabsTrigger value="combinado" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" /> Cámara + Humedad
          </TabsTrigger>
          <TabsTrigger value="humedad" className="flex items-center gap-2">
            <Droplets className="w-4 h-4" /> Solo Humedad
          </TabsTrigger>
        </TabsList>

        {/* TAB 1 */}
        <TabsContent value="camara" className="space-y-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-blue-600" />Cálculo Cámara Frigorífica
          </h1>
          <Card>
            <CardContent className="p-4 space-y-3">
              <ColdRoomInputs />
              <Button onClick={calculate} className="w-full bg-blue-600 hover:bg-blue-700">
                <Calculator className="w-4 h-4 mr-2" /> Calcular cámara frigorífica
              </Button>
            </CardContent>
          </Card>
          <ResultSection withHumidity={false} />
        </TabsContent>

        {/* TAB 2 */}
        <TabsContent value="combinado" className="space-y-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-green-600" />Cámara + Humedad Relativa
          </h1>
          <Card>
            <CardContent className="p-4 space-y-3">
              <ColdRoomInputs />
              <Button onClick={calculate} className="w-full bg-green-600 hover:bg-green-700">
                <Calculator className="w-4 h-4 mr-2" /> Calcular cámara + humedad
              </Button>
            </CardContent>
          </Card>
          <ResultSection withHumidity={true} />
        </TabsContent>

        {/* TAB 3 */}
        <TabsContent value="humedad" className="space-y-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Droplets className="w-6 h-6 text-orange-600" />Cálculo Humedad Relativa
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
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div><label className="text-[10px] text-gray-500">T. cámara (°C)</label><Input type="number" value={form.cold_room_temp} onChange={e => setForm({...form, cold_room_temp: parseFloat(e.target.value)||0})} /></div>
                <div><label className="text-[10px] text-gray-500">T. exterior (°C)</label><Input type="number" value={form.exterior_temp} onChange={e => setForm({...form, exterior_temp: parseFloat(e.target.value)||0})} /></div>
                <div>
                  <label className="text-[10px] text-gray-500">Presión evap. (bar)</label>
                  <Input type="number" step="0.1" value={form.humidity_evap_pressure} onChange={e => setForm({...form, humidity_evap_pressure: parseFloat(e.target.value)||0})} />
                </div>
                <RefrigerantSelector value={form.refrigerant_type} onChange={v => setForm({...form, refrigerant_type: v})} label="Gas refrigerante" />
              </div>
              <Button onClick={() => setForm({...form})} className="w-full bg-orange-600 hover:bg-orange-700">
                <Calculator className="w-4 h-4 mr-2" /> Calcular humedad relativa
              </Button>
            </CardContent>
          </Card>
          <div ref={humidityPrintRef}>
            <CompanyHeader className="mb-4" />
            <ColdRoomHumidityCalc
              tempCold={form.cold_room_temp}
              presionEvap={form.humidity_evap_pressure}
              tempExterior={form.exterior_temp}
              refrigerantType="R-449A"
              refrigerantWeight={0}
            />
            <div className="flex gap-2 mt-4">
              <PrintButton contentRef={humidityPrintRef} title="Cálculo Humedad Relativa" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}