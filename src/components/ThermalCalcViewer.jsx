import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

/**
 * ThermalCalcViewer — Muestra un cálculo guardado (ThermalCalculation) de forma completa:
 * parámetros, desglose de cargas, equipos recomendados, presiones, materiales.
 * Se puede imprimir o exportar a PDF directamente.
 */
export default function ThermalCalcViewer({ calc, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  if (!calc) return null;

  const isClima = calc.calc_type === 'clima';
  const accentColor = isClima ? '#dc2626' : '#2563eb';
  const label = isClima ? '🌡️ Cálculo Térmico Climatización' : '❄️ Cálculo Cámara Frigorífica';

  // Parsear equipos recomendados del campo notes
  const parseEquipos = () => {
    if (!calc.notes) return [];
    const match = calc.notes.match(/--- EQUIPOS RECOMENDADOS ---([\s\S]*?)(?=---|$)/);
    if (!match) return [];
    return match[1].trim().split(' | ').filter(Boolean).map(e => e.trim());
  };

  const parseSection = (title) => {
    if (!calc.notes) return '';
    const match = calc.notes.match(new RegExp(`--- ${title} ---([\\s\\S]*?)(?=---|$)`));
    return match ? match[1].trim() : '';
  };

  const equiposLines = parseEquipos();
  const presionesText = parseSection('PRESIONES ' + (calc.refrigerant_type || '')) || parseSection('PRESIONES R-\\S+');
  const desgloseTex = parseSection('DESGLOSE CARGAS');

  const generatePDF = async () => {
    const csArr = await base44.entities.CompanySettings.list();
    const cs = csArr?.[0] || {};

    const materialsHtml = (calc.materials_list || []).map(m =>
      `<tr><td style="padding:4px 6px;border:1px solid #e5e7eb">${m.material}</td>
       <td style="padding:4px 6px;border:1px solid #e5e7eb;text-align:right">${m.quantity}</td>
       <td style="padding:4px 6px;border:1px solid #e5e7eb">${m.specification || ''}</td></tr>`
    ).join('');

    const equiposHtml = equiposLines.map((line, i) => {
      const isMain = line.startsWith('★');
      return `<div style="background:${isMain ? '#eff6ff' : '#f9fafb'};border:1px solid ${isMain ? '#93c5fd' : '#e5e7eb'};border-radius:6px;padding:8px;margin-bottom:6px;font-size:10px">
        <strong style="color:${isMain ? '#2563eb' : '#6b7280'}">${line}</strong>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>${label}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;font-size:11px;color:#111}
      .header{display:flex;align-items:center;gap:16px;border-bottom:3px solid ${accentColor};padding-bottom:10px;margin-bottom:14px}
      .section{margin-top:12px;padding:10px;background:#f8fafc;border-left:4px solid ${accentColor};border-radius:4px}
      .section-title{font-weight:700;font-size:12px;color:${accentColor};margin-bottom:6px}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 16px}
      .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:10px}
      .kpi{background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:10px;text-align:center}
      .kpi-val{font-size:22px;font-weight:700;color:${accentColor}}
      table{width:100%;border-collapse:collapse;font-size:10px}
      td,th{border:1px solid #e5e7eb;padding:4px 6px}
      th{background:#f3f4f6;font-weight:600}
      .footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;text-align:center}
      @media print{@page{margin:15mm}}
    </style></head><body>
    <div class="header">
      ${cs.logo_url ? `<img src="${cs.logo_url}" style="height:50px;object-fit:contain" alt="logo"/>` : ''}
      <div>
        <div style="font-size:18px;font-weight:700;color:#1e3a5f">${cs.company_name || 'Empresa'}</div>
        <div style="font-size:10px;color:#6b7280">${cs.address || ''} ${cs.city || ''} · ${cs.phone || ''}</div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:15px;font-weight:700;color:${accentColor}">${label}</div>
        <div style="font-size:10px;color:#6b7280">${calc.date || new Date().toLocaleDateString('es-ES')}</div>
      </div>
    </div>

    ${calc.contact_name ? `<div class="section"><div class="section-title">Cliente</div><b>${calc.contact_name}</b></div>` : ''}

    <div class="section">
      <div class="section-title">Parámetros</div>
      <div class="grid2">
        ${calc.room_length ? `<div>Dimensiones: <b>${calc.room_length}×${calc.room_width}×${calc.room_height} m</b></div>` : ''}
        ${calc.refrigerant_type ? `<div>Gas: <b>${calc.refrigerant_type}</b></div>` : ''}
        ${calc.exterior_temp != null ? `<div>T. exterior: <b>${calc.exterior_temp}°C</b></div>` : ''}
        ${calc.cold_room_temp != null ? `<div>T. cámara: <b>${calc.cold_room_temp}°C</b></div>` : ''}
        ${calc.target_temp != null ? `<div>T. objetivo: <b>${calc.target_temp}°C</b></div>` : ''}
        ${calc.insulation_type ? `<div>Aislamiento: ${calc.insulation_type}</div>` : ''}
        ${calc.orientation ? `<div>Orientación: ${calc.orientation}</div>` : ''}
        ${calc.pipe_distance != null ? `<div>Tubería: <b>${calc.pipe_distance} m</b></div>` : ''}
        ${calc.num_people != null ? `<div>Personas: ${calc.num_people}</div>` : ''}
        ${calc.window_area != null ? `<div>Ventanas: ${calc.window_area} m²</div>` : ''}
        ${calc.cold_room_product_kg != null ? `<div>Producto: ${calc.cold_room_product_kg} kg</div>` : ''}
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><div class="kpi-val">${calc.calculated_load ?? '-'} W</div><div style="font-size:9px;color:#6b7280">Carga total</div></div>
      <div class="kpi"><div class="kpi-val" style="color:#ea580c">${calc.calculated_load_frigorias ?? '-'}</div><div style="font-size:9px;color:#6b7280">Frig/hora</div></div>
      <div class="kpi"><div class="kpi-val" style="color:#16a34a">${calc.suggested_equipment || '-'}</div><div style="font-size:9px;color:#6b7280">Equipo sugerido</div></div>
      <div class="kpi"><div class="kpi-val" style="color:#0891b2">${calc.refrigerant_charge_kg ?? '-'} kg</div><div style="font-size:9px;color:#6b7280">Carga gas</div></div>
    </div>

    ${equiposHtml ? `<div class="section" style="margin-top:14px"><div class="section-title">Equipos recomendados</div>${equiposHtml}</div>` : ''}

    ${calc.working_pressures ? `
    <div class="section" style="border-left-color:#2563eb;margin-top:12px">
      <div class="section-title" style="color:#2563eb">Presiones de trabajo — ${calc.refrigerant_type || ''}</div>
      <div class="grid2">
        <div>P. evaporación: <b>${calc.working_pressures.low_pressure ?? '-'} bar</b></div>
        <div>P. condensación: <b>${calc.working_pressures.high_pressure ?? '-'} bar</b></div>
        <div>T. evaporación: <b>${calc.working_pressures.evaporation_temp ?? '-'}°C</b></div>
        <div>T. condensación: <b>${calc.working_pressures.condensation_temp ?? '-'}°C</b></div>
      </div>
    </div>` : ''}

    ${materialsHtml ? `
    <div style="margin-top:14px">
      <p style="font-weight:700;font-size:11px;margin-bottom:6px">Material necesario</p>
      <table><thead><tr><th>Material</th><th>Cant.</th><th>Unidad</th></tr></thead>
      <tbody>${materialsHtml}</tbody></table>
    </div>` : ''}

    ${calc.notes ? `
    <div class="section" style="margin-top:14px;border-left-color:#9ca3af">
      <div class="section-title" style="color:#6b7280">Notas del cálculo</div>
      <pre style="font-size:9px;white-space:pre-wrap;color:#374151;line-height:1.5">${calc.notes}</pre>
    </div>` : ''}

    <div class="footer">${cs.company_name || ''} · Informe cálculo generado el ${new Date().toLocaleDateString('es-ES')} · Valores orientativos</div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 600);
  };

  return (
    <Card className="hover:shadow-md border-l-4" style={{ borderLeftColor: accentColor }}>
      <CardContent className="p-3">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-gray-500">{calc.date}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {calc.calculated_load && (
                <Badge variant="outline" className="text-[10px]">⚡ {calc.calculated_load} W</Badge>
              )}
              {calc.calculated_load_frigorias && (
                <Badge variant="outline" className="text-[10px]">🧊 {calc.calculated_load_frigorias} frig/h</Badge>
              )}
              {calc.suggested_brand && (
                <Badge variant="outline" className="text-[10px]">📦 {calc.suggested_brand} {calc.suggested_model}</Badge>
              )}
              {calc.refrigerant_type && (
                <Badge variant="outline" className="text-[10px]">🌡 {calc.refrigerant_type}</Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={generatePDF} className="h-7 px-2 text-xs gap-1">
              <FileDown className="w-3 h-3" /> PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)} className="h-7 px-2">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Detalle expandido */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t pt-3">

            {/* Parámetros */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase mb-1">Parámetros</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs text-gray-700">
                {calc.room_length && <span>📐 {calc.room_length}×{calc.room_width}×{calc.room_height} m</span>}
                {calc.exterior_temp != null && <span>🌤 Exterior: {calc.exterior_temp}°C</span>}
                {calc.cold_room_temp != null && <span>❄️ Cámara: {calc.cold_room_temp}°C</span>}
                {calc.target_temp != null && <span>🎯 Objetivo: {calc.target_temp}°C</span>}
                {calc.insulation_type && <span>🧱 Aislamiento: {calc.insulation_type}</span>}
                {calc.orientation && <span>🧭 Orientación: {calc.orientation}</span>}
                {calc.pipe_distance != null && <span>🔧 Tubería: {calc.pipe_distance} m</span>}
                {calc.num_people != null && <span>👥 Personas: {calc.num_people}</span>}
                {calc.cold_room_product_kg != null && <span>📦 Producto: {calc.cold_room_product_kg} kg</span>}
                {calc.window_area != null && <span>🪟 Ventanas: {calc.window_area} m²</span>}
              </div>
            </div>

            {/* KPIs resultado */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {calc.calculated_load && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                  <p className="text-base font-bold text-red-600">{calc.calculated_load} W</p>
                  <p className="text-[10px] text-red-400">Carga total</p>
                </div>
              )}
              {calc.calculated_load_frigorias && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2 text-center">
                  <p className="text-base font-bold text-cyan-600">{calc.calculated_load_frigorias}</p>
                  <p className="text-[10px] text-cyan-400">Frig/hora</p>
                </div>
              )}
              {calc.refrigerant_charge_kg && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                  <p className="text-base font-bold text-green-600">{calc.refrigerant_charge_kg} kg</p>
                  <p className="text-[10px] text-green-400">Carga gas</p>
                </div>
              )}
              {calc.extra_refrigerant_g > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center">
                  <p className="text-base font-bold text-yellow-600">+{calc.extra_refrigerant_g}g</p>
                  <p className="text-[10px] text-yellow-400">Gas extra dist.</p>
                </div>
              )}
            </div>

            {/* Equipos recomendados */}
            {equiposLines.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Equipos recomendados</p>
                <div className="space-y-1">
                  {equiposLines.map((line, i) => {
                    const isMain = line.startsWith('★');
                    return (
                      <div key={i} className={`text-xs rounded p-2 ${isMain ? 'bg-blue-50 border border-blue-200 font-medium' : 'bg-gray-50 border border-gray-100'}`}>
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Presiones */}
            {calc.working_pressures && (
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Presiones {calc.refrigerant_type}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <p className="text-gray-500">P. evaporación</p>
                    <p className="font-bold text-blue-700">{calc.working_pressures.low_pressure ?? '-'} bar</p>
                  </div>
                  <div className="bg-red-50 rounded p-2 text-center">
                    <p className="text-gray-500">P. condensación</p>
                    <p className="font-bold text-red-700">{calc.working_pressures.high_pressure ?? '-'} bar</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-gray-500">T. evap.</p>
                    <p className="font-bold">{calc.working_pressures.evaporation_temp ?? '-'}°C</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-gray-500">T. cond.</p>
                    <p className="font-bold">{calc.working_pressures.condensation_temp ?? '-'}°C</p>
                  </div>
                </div>
              </div>
            )}

            {/* Materiales */}
            {calc.materials_list?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-600 uppercase mb-1">Material necesario</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse min-w-[280px]">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-1 text-left">Material</th>
                        <th className="border p-1 text-right">Cant.</th>
                        <th className="border p-1">Ud.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calc.materials_list.map((m, i) => (
                        <tr key={i} className="border-b">
                          <td className="border p-1">{m.material}</td>
                          <td className="border p-1 text-right">{m.quantity}</td>
                          <td className="border p-1">{m.specification}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2 pt-1 border-t flex-wrap">
              <Button size="sm" onClick={generatePDF} className="gap-1 bg-blue-600 hover:bg-blue-700">
                <FileDown className="w-3.5 h-3.5" /> Descargar PDF completo
              </Button>
              {onDelete && (
                <Button size="sm" variant="outline" onClick={() => { if (confirm('¿Eliminar este cálculo?')) onDelete(calc.id); }} className="gap-1 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}