import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Save, Calculator, FileDown, RefreshCw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import { ThermalLoadBreakdown, PressureChart, EfficiencyRadar } from '../components/ThermalCharts';
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

// CLIMATE_CATALOG now imported from EquipmentSelector

const EXTRA_REFRIGERANT_G_PER_M = { 'R-32': 15, 'R-410A': 20, 'R-290': 10, 'R-407C': 18, 'R-134a': 12, 'R-449A': 17, 'R-452A': 18, 'R-448A': 16 };

function calcBreakdown(f) {
  const orientFactor = { norte: 0.8, sur: 1.2, este: 1.0, oeste: 1.1 }[f.orientation] || 1.0;
  const insulFactor = { bueno: 30, medio: 50, malo: 70 }[f.insulation_type] || 50;
  const dT = Math.abs((f.exterior_temp || 35) - (f.target_temp || 22));
  const wallLoad = 2 * (f.length * f.height + f.width * f.height) * insulFactor * dT
                 + f.length * f.width * (insulFactor * 1.5) * dT;
  const windowLoad = (f.window_area || 0) * 600 * orientFactor;
  const peopleLoad = (f.num_people || 2) * 100;
  const equipLoad = f.equipment_heat || 0;
  return { wallLoad, windowLoad, peopleLoad, equipLoad };
}

function buildResult(form, breakdown) {
  const { wallLoad, windowLoad, peopleLoad, equipLoad } = breakdown;
  const totalW = Math.round((wallLoad + windowLoad + peopleLoad + equipLoad) * 1.15);
  const loadFrigorias = Math.round(totalW * 0.86);
  const loadKW = (totalW / 1000).toFixed(2);

  const suitable = CLIMATE_CATALOG.filter(e => e.power_kw * 1000 >= totalW * 0.9);
  const equip = suitable.length > 0 ? suitable[0] : CLIMATE_CATALOG[CLIMATE_CATALOG.length - 1];
  // Top 3 alternatives
  const alternatives = suitable.slice(0, 3).length > 0 ? suitable.slice(0, 3) : CLIMATE_CATALOG.slice(-3);

  const actualDist = parseFloat(form.pipe_distance) || 5;
  const maxDist = equip.max_pipe_m;
  const extraGrams = actualDist > maxDist
    ? Math.round((actualDist - maxDist) * (EXTRA_REFRIGERANT_G_PER_M[form.refrigerant_type] || 18))
    : 0;

  const pr = REFRIGERANT_PRESSURES[form.refrigerant_type] || REFRIGERANT_PRESSURES['R-32'];

  const materials = [
    { material: `Tubería líquido 1/4" Cu`, quantity: actualDist, specification: 'metros' },
    { material: `Tubería gas 3/8" Cu`, quantity: actualDist, specification: 'metros' },
    { material: 'Cableado eléctrico 4x1,5mm²', quantity: actualDist + 2, specification: 'metros' },
    { material: 'Aislamiento tubería AF/19', quantity: actualDist, specification: 'metros' },
    { material: 'Soporte unidad exterior', quantity: 1, specification: 'unidad' },
    { material: 'Soporte unidad interior', quantity: 1, specification: 'unidad' },
    { material: `${form.refrigerant_type} gas refrigerante`, quantity: (equip.power_kw * 0.3 + extraGrams / 1000).toFixed(2), specification: 'kg' },
  ];

  // Scores eficiencia
  const insulScore = { bueno: 95, medio: 65, malo: 30 }[form.insulation_type] || 65;
  const pipingScore = Math.max(0, 100 - (actualDist - maxDist) * 5);
  const tempScore = Math.max(0, 100 - Math.abs(form.exterior_temp - 35) * 2);
  const loadScore = Math.min(100, Math.round((1 - totalW / 15000) * 100));
  const equipScore = Math.round((equip.power_kw * 1000 / totalW) * 50);

  return {
    loadW: totalW, loadFrigorias, loadKW, equip, alternatives, extraGrams, pr, materials, maxDist, actualDist,
    efficiencyScores: {
      insulation: insulScore,
      piping: Math.max(0, Math.min(100, pipingScore)),
      temp: Math.max(0, Math.min(100, tempScore)),
      load: Math.max(0, Math.min(100, loadScore)),
      equipment: Math.max(0, Math.min(100, equipScore)),
    }
  };
}

export default function ThermalCalc() {
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState({
    contact_id: '', contact_name: '', calc_type: 'clima',
    length: '', width: '', height: '', orientation: 'sur',
    num_windows: 1, window_area: '', num_people: '', equipment_heat: '',
    insulation_type: 'medio', target_temp: '', exterior_temp: '',
    refrigerant_type: 'R-32', pipe_distance: '', pipe_height_diff: '',
  });
  const [breakdown, setBreakdown] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingCalcId, setExistingCalcId] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    base44.entities.Contact.list().then(setContacts);
  }, []);

  // When contact changes, check if there's an existing calculation
  useEffect(() => {
    if (form.contact_id) {
      base44.entities.ThermalCalculation.filter({ contact_id: form.contact_id, calc_type: 'clima' })
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

  // Adjust breakdown manually from sliders → recalculate totals
  const handleBreakdownAdjust = (key, value) => {
    const newBd = { ...breakdown, [key]: value };
    setBreakdown(newBd);
    setResult(buildResult(form, newBd));
  };

  const saveToClient = async () => {
    if (!form.contact_id || !result) return;
    setSaving(true);

    const bd = breakdown || calcBreakdown(form);
    const data = {
      contact_id: form.contact_id,
      contact_name: form.contact_name,
      calc_type: 'clima',
      date: format(new Date(), 'yyyy-MM-dd'),
      // Parámetros del local
      room_length: form.length,
      room_width: form.width,
      room_height: form.height,
      orientation: form.orientation,
      num_windows: form.num_windows,
      window_area: form.window_area,
      num_people: form.num_people,
      equipment_heat: form.equipment_heat,
      insulation_type: form.insulation_type,
      target_temp: form.target_temp,
      exterior_temp: form.exterior_temp,
      refrigerant_type: form.refrigerant_type,
      pipe_distance: form.pipe_distance,
      pipe_height_diff: form.pipe_height_diff,
      // Resultados calculados
      calculated_load: result.loadW,
      calculated_load_frigorias: result.loadFrigorias,
      suggested_brand: result.equip.brand,
      suggested_model: result.equip.model,
      suggested_equipment: `${result.equip.brand} ${result.equip.model} ${result.equip.power_kw}kW`,
      refrigerant_charge_kg: parseFloat((result.equip.power_kw * 0.3).toFixed(2)),
      extra_refrigerant_g: result.extraGrams,
      materials_list: result.materials.map(m => ({ material: m.material, quantity: parseFloat(m.quantity), specification: m.specification })),
      working_pressures: {
        high_pressure: result.pr['30°C'] || result.pr['25°C'] || 0,
        low_pressure: result.pr['0°C'] || 0,
        condensation_temp: 40,
        evaporation_temp: 0,
      },
      notes: [
        `=== CÁLCULO TÉRMICO CLIMATIZACIÓN ===`,
        `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
        `--- PARÁMETROS ---`,
        `Local: ${form.length}×${form.width}×${form.height}m | Vol: ${(form.length*form.width*form.height).toFixed(1)}m³`,
        `Orientación: ${form.orientation} | Aislamiento: ${form.insulation_type} | Ventanas: ${form.window_area}m²`,
        `T.exterior: ${form.exterior_temp}°C | T.objetivo: ${form.target_temp}°C | ΔT: ${Math.abs(form.exterior_temp - form.target_temp)}°C`,
        `Personas: ${form.num_people} | Calor equipos: ${form.equipment_heat}W`,
        `Gas: ${form.refrigerant_type} | Tubería: ${form.pipe_distance}m | Alt: ${form.pipe_height_diff}m`,
        `--- DESGLOSE CARGAS ---`,
        `Paredes/Techo: ${Math.round(bd.wallLoad)}W | Ventanas: ${Math.round(bd.windowLoad)}W | Personas: ${Math.round(bd.peopleLoad)}W | Equipos: ${Math.round(bd.equipLoad)}W`,
        `Factor seguridad ×1.15 aplicado`,
        `--- RESULTADOS ---`,
        `Carga total: ${result.loadW}W | ${result.loadFrigorias} frig/h | ${result.loadKW}kW`,
        `--- EQUIPOS RECOMENDADOS ---`,
        result.alternatives.map((e,i) => `${i===0?'★ PRINCIPAL':'Opción '+(i+1)}: ${e.brand} ${e.model} ${e.power_kw}kW | Gas:${e.gas} | Tipo:${e.type} | TubMax:${e.max_pipe_m}m | AltMax:${e.max_height_m}m`).join(' | '),
        result.extraGrams > 0 ? `⚠ Gas extra: +${result.extraGrams}g de ${form.refrigerant_type} (dist.${result.actualDist}m > máx.${result.maxDist}m)` : '',
        `--- PRESIONES ${form.refrigerant_type} ---`,
        Object.entries(result.pr).map(([t,p]) => `${t}: ${p}bar`).join(' | '),
        `--- MATERIALES ---`,
        result.materials.map(m => `${m.material}: ${m.quantity} ${m.specification}`).join(' | '),
        `--- SCORES EFICIENCIA ---`,
        `Aislamiento:${result.efficiencyScores.insulation}% | Tuberías:${result.efficiencyScores.piping}% | Temperatura:${result.efficiencyScores.temp}% | Carga:${result.efficiencyScores.load}% | Equipo:${result.efficiencyScores.equipment}%`,
      ].filter(Boolean).join('\n'),
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
      <title>Cálculo Térmico Clima</title>
      <style>
        body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;font-size:11px;color:#111}
        .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #1e3a5f;padding-bottom:10px;margin-bottom:14px}
        .section{margin-top:12px;padding:10px;background:#f8fafc;border-left:4px solid #dc2626;border-radius:4px}
        .section-title{font-weight:700;font-size:12px;color:#dc2626;margin-bottom:6px}
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
          <div style="font-size:15px;font-weight:700;color:#dc2626">Informe Cálculo Térmico — Climatización</div>
          <div style="font-size:10px;color:#6b7280">${new Date().toLocaleDateString('es-ES')}</div>
        </div>
      </div>

      ${form.contact_name ? `<div class="section">
        <div class="section-title">Cliente</div>
        <div class="grid2"><div><b>${form.contact_name}</b></div></div>
      </div>` : ''}

      <div class="section">
        <div class="section-title">Parámetros del cálculo</div>
        <div class="grid2">
          <div>Dimensiones: <b>${form.length}×${form.width}×${form.height} m</b></div>
          <div>Volumen: <b>${(form.length * form.width * form.height).toFixed(1)} m³</b></div>
          <div>Orientación: ${form.orientation}</div>
          <div>Aislamiento: ${form.insulation_type}</div>
          <div>Gas refrigerante: ${form.refrigerant_type}</div>
          <div>Sup. ventanas: ${form.window_area} m²</div>
          <div>T. exterior: ${form.exterior_temp}°C</div>
          <div>T. objetivo: ${form.target_temp}°C</div>
          <div>Nº personas: ${form.num_people}</div>
          <div>Calor equipos: ${form.equipment_heat} W</div>
          <div>Long. tubería: ${form.pipe_distance} m</div>
          <div>Dif. altura: ${form.pipe_height_diff} m</div>
        </div>
      </div>

      <div class="section" style="margin-top:10px;border-left-color:#f97316">
        <div class="section-title" style="color:#f97316">Desglose de cargas térmicas</div>
        <div class="grid2">
          <div>Paredes/Techo: <b>${Math.round(bd.wallLoad)} W</b></div>
          <div>Ventanas: <b>${Math.round(bd.windowLoad)} W</b></div>
          <div>Personas: <b>${Math.round(bd.peopleLoad)} W</b></div>
          <div>Equipos: <b>${Math.round(bd.equipLoad)} W</b></div>
          <div>Factor seguridad (×1.15): incluido</div>
        </div>
      </div>

      <div class="kpis" style="margin-top:12px">
        <div class="kpi"><div class="kpi-val" style="color:#dc2626">${result.loadW} W</div><div style="font-size:9px;color:#6b7280">Carga térmica total</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#ea580c">${result.loadFrigorias}</div><div style="font-size:9px;color:#6b7280">Frigorías/hora</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#2563eb">${result.loadKW} kW</div><div style="font-size:9px;color:#6b7280">Potencia</div></div>
        <div class="kpi"><div class="kpi-val" style="color:#16a34a">${result.equip.power_kw} kW</div><div style="font-size:9px;color:#6b7280">Equipo sugerido</div></div>
      </div>

      <div class="section" style="margin-top:14px">
        <div class="section-title">Equipos recomendados</div>
        ${result.alternatives.map((eq, idx) => `
          <div style="background:${idx===0?'#f0fdf4':'#f9fafb'};border:1px solid ${idx===0?'#86efac':'#e5e7eb'};border-radius:6px;padding:8px;margin-bottom:6px">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
              <span style="font-size:10px;font-weight:700;color:${idx===0?'#16a34a':'#6b7280'}">${idx===0?'⭐ Opción principal':'Opción '+(idx+1)}</span>
              <span style="font-weight:700;color:#16a34a">${eq.power_kw} kW</span>
            </div>
            <div class="grid2">
              <div>Marca: <b>${eq.brand}</b></div>
              <div>Modelo: <b>${eq.model}</b></div>
              <div>Gas: ${eq.gas}</div><div>Tipo: ${eq.type}</div>
              <div>Dist. máx.: ${eq.max_pipe_m} m</div><div>Alt. máx.: ${eq.max_height_m} m</div>
            </div>
          </div>`).join('')}
        ${result.extraGrams > 0 ? `<p style="margin-top:6px;background:#fef9c3;padding:4px 6px;border-radius:4px">⚠️ Añadir <b>${result.extraGrams}g</b> de ${form.refrigerant_type} extra por distancia</p>` : ''}
      </div>

      <div class="section" style="margin-top:10px;border-left-color:#2563eb">
        <div class="section-title" style="color:#2563eb">Presiones de trabajo — ${form.refrigerant_type}</div>
        <table><thead><tr><th>Temperatura</th><th>Presión (bar)</th></tr></thead><tbody>
          ${Object.entries(result.pr).map(([t,p]) => `<tr><td>${t}</td><td>${p} bar</td></tr>`).join('')}
        </tbody></table>
      </div>

      <div style="margin-top:12px">
        <p style="font-weight:600;font-size:11px;margin-bottom:4px">Material necesario para la instalación</p>
        <table><thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>
          ${result.materials.map(m => `<tr><td>${m.material}</td><td style="text-align:right">${m.quantity}</td><td>${m.specification}</td></tr>`).join('')}
        </tbody></table>
      </div>

      <div class="footer">Informe generado el ${new Date().toLocaleDateString('es-ES')} — ${cs.company_name||''} · Valores orientativos</div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Thermometer className="w-6 h-6 text-red-500" />Cálculo Térmico — Climatización
      </h1>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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

          {existingCalcId && (
            <div className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              Existe un cálculo guardado para este cliente — al guardar se actualizará
            </div>
          )}

          <div className="bg-blue-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium text-blue-700">Dimensiones del local</p>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-gray-500">Largo (m)</label><NumberField value={form.length} onChange={v => setForm({...form, length: v})} /></div>
              <div><label className="text-[10px] text-gray-500">Ancho (m)</label><NumberField value={form.width} onChange={v => setForm({...form, width: v})} /></div>
              <div><label className="text-[10px] text-gray-500">Alto (m)</label><NumberField value={form.height} onChange={v => setForm({...form, height: v})} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500">Orientación</label>
                <Select value={form.orientation} onValueChange={v => setForm({...form, orientation: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="norte">Norte</SelectItem>
                    <SelectItem value="sur">Sur</SelectItem>
                    <SelectItem value="este">Este</SelectItem>
                    <SelectItem value="oeste">Oeste</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Aislamiento</label>
                <Select value={form.insulation_type} onValueChange={v => setForm({...form, insulation_type: v})}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bueno">Bueno</SelectItem>
                    <SelectItem value="medio">Medio</SelectItem>
                    <SelectItem value="malo">Malo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-[10px] text-gray-500">Sup. ventanas (m²)</label><NumberField value={form.window_area} onChange={v => setForm({...form, window_area: v})} /></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div><label className="text-[10px] text-gray-500">Nº personas</label><NumberField decimals={false} value={form.num_people} onChange={v => setForm({...form, num_people: v})} /></div>
              <div><label className="text-[10px] text-gray-500">Calor equipos (W)</label><NumberField value={form.equipment_heat} onChange={v => setForm({...form, equipment_heat: v})} /></div>
              <div><label className="text-[10px] text-gray-500">T. exterior (°C)</label><NumberField value={form.exterior_temp} onChange={v => setForm({...form, exterior_temp: v})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-gray-500">T. objetivo interior (°C)</label><NumberField value={form.target_temp} onChange={v => setForm({...form, target_temp: v})} /></div>
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium">Distancias de instalación</p>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-[10px] text-gray-500">Longitud tubería (m)</label><NumberField value={form.pipe_distance} onChange={v => setForm({...form, pipe_distance: v})} /></div>
              <div><label className="text-[10px] text-gray-500">Diferencia altura (m)</label><NumberField value={form.pipe_height_diff} onChange={v => setForm({...form, pipe_height_diff: v})} /></div>
            </div>
          </div>

          <Button onClick={calculate} className="w-full bg-red-600 hover:bg-red-700">
            <Calculator className="w-4 h-4 mr-2" /> Calcular
          </Button>
        </CardContent>
      </Card>

      {result && breakdown && (
        <div ref={printRef} className="space-y-4">
          <CompanyHeader className="mb-4 hidden-screen" />

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">{result.loadW} W</p>
              <p className="text-xs text-red-500">Carga térmica total</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-600">{result.loadFrigorias}</p>
              <p className="text-xs text-orange-500">Frigorías/hora</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{result.loadKW} kW</p>
              <p className="text-xs text-blue-500">Potencia necesaria</p>
            </div>
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{result.equip.power_kw} kW</p>
              <p className="text-xs text-green-500">Equipo sugerido</p>
            </div>
          </div>

          {/* Gráfico del desglose de la carga térmica (imagen del resultado) */}
          {breakdown && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 mt-3">
              <p className="text-sm font-semibold text-gray-700 mb-2">Desglose de la carga térmica (W)</p>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={[
                  { n: 'Paredes/Techo', w: Math.round(breakdown.wallLoad || 0), c: '#ef4444' },
                  { n: 'Ventanas', w: Math.round(breakdown.windowLoad || 0), c: '#f59e0b' },
                  { n: 'Personas', w: Math.round(breakdown.peopleLoad || 0), c: '#3b82f6' },
                  { n: 'Equipos', w: Math.round(breakdown.equipLoad || 0), c: '#10b981' },
                ]} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
                  <XAxis dataKey="n" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => [`${v} W`, 'Carga']} />
                  <Bar dataKey="w" radius={[4, 4, 0, 0]}>
                    {[0, 1, 2, 3].map((i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#10b981'][i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 mt-1">Incluye un +15% de mayoración de seguridad en el total. Ajusta los deslizadores para afinar cada partida.</p>
            </div>
          )}

          {/* Gráficas interactivas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ThermalLoadBreakdown breakdown={breakdown} onAdjust={handleBreakdownAdjust} />
            <EfficiencyRadar scores={result.efficiencyScores} />
          </div>

          <PressureChart pressureData={result.pr} refrigerant={form.refrigerant_type} />

          {/* Selector multi-marca con normativa RITE+FGAS */}
          <Card className="border-green-200">
            <CardHeader className="bg-green-50 py-3">
              <CardTitle className="text-green-700 text-base">Selección de equipo — RITE y gases fluorados</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <EquipmentSelector
                mode="clima"
                loadKW={result.loadW / 1000}
                onSelect={(eq) => setResult(prev => ({ ...prev, equip: eq, alternatives: [eq, ...prev.alternatives.filter(a => a.model !== eq.model)].slice(0, 3) }))}
              />
              {result.extraGrams > 0 && (
                <div className="mt-3 p-2 bg-yellow-100 rounded text-yellow-800 text-sm">
                  ⚠️ Distancia ({result.actualDist}m) supera máximo ({result.maxDist}m). Añadir <strong>{result.extraGrams}g</strong> de {form.refrigerant_type} extra.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presiones */}
          <Card className="border-blue-100">
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-2 text-blue-700">Presiones {form.refrigerant_type}</p>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                {Object.entries(result.pr).map(([t, p]) => (
                  <div key={t} className="bg-blue-50 rounded p-2 text-center">
                    <p className="text-gray-500">{t}</p>
                    <p className="font-bold text-blue-700">{p} bar</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materiales */}
          <Card>
            <CardContent className="p-4">
              <p className="font-semibold text-sm mb-2">Material necesario para la instalación</p>
              <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs border-collapse min-w-[300px]">
                <thead><tr className="bg-gray-100">
                  <th className="border p-1 text-left">Material</th>
                  <th className="border p-1 text-right">Cantidad</th>
                  <th className="border p-1 text-left">Unidad</th>
                </tr></thead>
                <tbody>
                  {result.materials.map((m, i) => (
                    <tr key={i} className="border-b">
                      <td className="border p-1">{m.material}</td>
                      <td className="border p-1 text-right">{m.quantity}</td>
                      <td className="border p-1">{m.specification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="flex gap-2 flex-wrap">
            <PrintButton contentRef={printRef} title="Cálculo Térmico Clima" />
            <Button onClick={generatePDF} variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" /> PDF completo
            </Button>
            {form.contact_id && (
              <Button onClick={saveToClient} disabled={saving} className={`gap-2 ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? '¡Guardado en cliente!' : saving ? 'Guardando...' : existingCalcId ? 'Actualizar en cliente' : 'Guardar en cliente'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}