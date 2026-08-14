import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/ui/number-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Thermometer, Save, Calculator, Droplets, FileDown, RefreshCw, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';
import ColdRoomCycleDiagram from '../components/ColdRoomCycleDiagram';
import ColdRoomHumidityCalc from '../components/ColdRoomHumidityCalc';
import RefrigerantSelector from '../components/RefrigerantSelector';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColdRoomBreakdown, PressureChart, EfficiencyRadar } from '../components/ThermalCharts';
import EquipmentSelector, { COLD_ROOM_CATALOG } from '../components/EquipmentSelector';

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

// COLD_CATALOG now imported from EquipmentSelector as COLD_ROOM_CATALOG
const COLD_CATALOG = COLD_ROOM_CATALOG;

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

  // Selección válvula de expansión por potencia y refrigerante
  const loadKW = totalLoad / 1000;
  let vetModel, vetOrificio, vetPrecio;
  if (loadKW <= 1.5) { vetModel = 'Danfoss T2 / TS2'; vetOrificio = '#00 (0.8mm)'; vetPrecio = 45; }
  else if (loadKW <= 3) { vetModel = 'Danfoss T2 / TS2'; vetOrificio = '#1 (1.1mm)'; vetPrecio = 52; }
  else if (loadKW <= 6) { vetModel = 'Danfoss TUB/T2'; vetOrificio = '#2 (1.4mm)'; vetPrecio = 68; }
  else if (loadKW <= 12) { vetModel = 'Danfoss TUA/TUAE'; vetOrificio = '#3 (1.8mm)'; vetPrecio = 85; }
  else { vetModel = 'Danfoss TUAE / TCAE'; vetOrificio = '#4 (2.2mm)'; vetPrecio = 120; }

  // Tuberías por potencia
  const liquidDiam = loadKW <= 5 ? '3/8"' : loadKW <= 15 ? '1/2"' : '5/8"';
  const gasDiam = loadKW <= 3 ? '1/2"' : loadKW <= 8 ? '5/8"' : loadKW <= 15 ? '7/8"' : '1-1/8"';
  const insulThick = (form.cold_room_temp || 0) < 0 ? '32mm' : '19mm';

  // Cuadro eléctrico y componentes
  const cuadroPrecio = loadKW <= 5 ? 320 : loadKW <= 15 ? 480 : 680;
  const cuadroDesc = loadKW <= 5 ? 'Cuadro control monofásico básico' : loadKW <= 15 ? 'Cuadro control trifásico con termostato digital' : 'Cuadro control trifásico industrial con alarmas';

  const materials = [
    { material: `Panel frigorífico ${form.panel_thickness}`, quantity: panelArea.toFixed(1), unit: 'm²', precio_ud: 45 },
    { material: `Evaporador cámara`, quantity: 1, unit: 'unidad', precio_ud: null },
    { material: `Unidad condensadora ${equip.brand} ${equip.model} ${equip.power_kw}kW`, quantity: 1, unit: 'unidad', precio_ud: null },
    { material: `Tubería líquido ${liquidDiam} Cu`, quantity: actualDist, unit: 'm', precio_ud: 6.5 },
    { material: `Tubería gas ${gasDiam} Cu`, quantity: actualDist, unit: 'm', precio_ud: 9 },
    { material: `Aislamiento tubería Armaflex ${insulThick}`, quantity: actualDist * 2, unit: 'm', precio_ud: 3.8 },
    { material: `${form.refrigerant_type} gas refrigerante`, quantity: refCharge, unit: 'kg', precio_ud: form.refrigerant_type === 'R-290' ? 18 : 28 },
    { material: `Válvula expansión termostática ${vetModel}`, quantity: 1, unit: 'unidad', precio_ud: vetPrecio, nota: `Orificio ${vetOrificio}` },
    { material: `Filtro deshidratador ${
      form.condensadora_tipo === 'bancada'
        ? (loadKW <= 3 ? 'Danfoss DML 083 (bancada, 3/8" – 10mm)' : loadKW <= 8 ? 'Danfoss DML 164 (bancada, 1/2" – 12mm)' : 'Danfoss DML 305 (bancada, 5/8" – 16mm)')
        : (loadKW <= 5 ? 'DML 083 (split, 3/8")' : 'DML 164 (split, 1/2")')
    }`, quantity: 1, unit: 'unidad', precio_ud: form.condensadora_tipo === 'bancada' ? (loadKW <= 3 ? 22 : loadKW <= 8 ? 28 : 38) : 18,
      nota: form.condensadora_tipo === 'bancada' ? `Bancada: filtro bidireccional bidirec. con tamiz molecular 48bar` : null },
    { material: `Visor de líquido con indicador humedad`, quantity: 1, unit: 'unidad', precio_ud: 14 },
    { material: `Presostato combinado alta/baja presión`, quantity: 1, unit: 'unidad', precio_ud: 42 },
    { material: cuadroDesc, quantity: 1, unit: 'unidad', precio_ud: cuadroPrecio },
    { material: `Cableado eléctrico 4×2,5mm² manguera`, quantity: actualDist + 5, unit: 'm', precio_ud: 2.8 },
    { material: `Marco puerta frigorífica isotérmica`, quantity: 1, unit: 'unidad', precio_ud: null },
    { material: `Desagüe bandeja evaporador con cable calefactor`, quantity: 1, unit: 'unidad', precio_ud: 35 },
    { material: `Soporte/consola metálica condensadora`, quantity: 1, unit: 'unidad', precio_ud: 45 },
    { material: `Racores y latiguillos frigoríficos`, quantity: 1, unit: 'juego', precio_ud: 28 },
    { material: `Espuma aislante montaje (Armaflex adhesivo)`, quantity: 2, unit: 'ud', precio_ud: 12 },
  ];
  const totalMateriales = materials.reduce((s, m) => s + (m.precio_ud ? m.precio_ud * parseFloat(m.quantity) : 0), 0);

  // Scores eficiencia
  const panelScore = { '60mm': 60, '80mm': 75, '100mm': 88, '120mm': 100 }[form.panel_thickness] || 75;
  const pipingScore = Math.max(0, 100 - Math.max(0, actualDist - maxDist) * 5);
  const tempScore = Math.max(0, 100 - Math.abs(form.exterior_temp - 25) * 2);
  const loadScore = Math.min(100, Math.round((1 - totalLoad / 20000) * 100));
  const equipScore = Math.min(100, Math.round((equip.power_kw * 1000 / totalLoad) * 50));

  return {
    loadW: totalLoad, equip, alternatives, extraGrams, evapPressure, condPressure, refCharge,
    panelArea: panelArea.toFixed(1), materials, maxDist, actualDist, pr,
    totalMateriales, vetOrificio,
    efficiencyScores: {
      insulation: Math.max(0, Math.min(100, panelScore)),
      piping: Math.max(0, Math.min(100, pipingScore)),
      temp: Math.max(0, Math.min(100, tempScore)),
      load: Math.max(0, Math.min(100, loadScore)),
      equipment: Math.max(0, Math.min(100, equipScore)),
    }
  };
}

// ---------------------------------------------------------------------------
// Componentes eléctricos y de control mínimos de la instalación frigorífica.
// Función de datos reutilizada por la tarjeta del resultado y por el PDF.
// ---------------------------------------------------------------------------
function electricalControlData(result, form) {
  const loadKW = (result?.loadW || 0) / 1000;
  const tipo = form.cold_room_type;
  const temp = parseFloat(form.cold_room_temp);
  const esNegativa = tipo === 'negativa' || (Number.isFinite(temp) && temp <= -5);
  const trifasico = loadKW > 5;

  const phase = trifasico
    ? {
        label: 'Trifásico 400V (III+N)',
        magneto: loadKW <= 15 ? 'Magnetotérmico 4P 16–25A curva D' : 'Magnetotérmico 4P 32–40A curva D',
        dif: 'Diferencial 4P 30–300mA superinmunizado (clase A/Si)',
        nota: `Potencia calculada ≈ ${loadKW.toFixed(1)} kW ⇒ acometida trifásica.`,
      }
    : {
        label: 'Monofásico 230V (I+N)',
        magneto: 'Magnetotérmico 2P 10–16A curva C/D',
        dif: 'Diferencial 2P 25A 30mA clase A',
        nota: `Potencia calculada ≈ ${loadKW.toFixed(1)} kW ⇒ acometida monofásica.`,
      };

  const defrost = esNegativa
    ? {
        modo: 'Desescarche por resistencias eléctricas',
        detalle: 'Cámara negativa: el reloj/temporizador (o el propio controlador) activa las resistencias de desescarche del evaporador varias veces al día. El fin de desescarche lo da la sonda de evaporador (típ. +8/+12 °C) o, en su defecto, el tiempo máximo programado.',
      }
    : {
        modo: 'Desescarche por parada de compresor / aire',
        detalle: 'Cámara positiva: desescarche natural parando el compresor y manteniendo los ventiladores del evaporador (aire ambiente). El fin lo da la sonda de evaporador (típ. +2/+4 °C) o el tiempo programado. No suele necesitar resistencias.',
      };

  const sensors = [
    {
      nombre: 'Sonda de cámara (ambiente)',
      donde: 'En la pared, a ~1,5 m del suelo, alejada del evaporador y de la puerta.',
      conecta: 'Entrada de sonda ambiente del controlador. Gobierna el arranque/paro del compresor por temperatura.',
    },
    {
      nombre: 'Sonda de evaporador / fin de desescarche',
      donde: 'Clipada entre las aletas de la batería del evaporador, en la zona más fría.',
      conecta: 'Entrada de sonda de desescarche del controlador. Corta el desescarche por temperatura y da el retardo de goteo antes de arrancar ventiladores.',
    },
    {
      nombre: 'Sonda de producto (opcional)',
      donde: 'Insertada en el producto o en una vaina/simulador de producto.',
      conecta: 'Tercera entrada del controlador o registrador independiente. Solo registro/trazabilidad (APPCC), no controla nada.',
    },
  ];

  const panel = [
    {
      comp: 'Controlador / termostato digital (Eliwell ID/IC, Dixell XR, Carel)',
      conecta: 'Corazón del cuadro. Se alimenta tras el magnetotérmico; sus salidas de relé mandan al contactor del compresor, a los ventiladores del evaporador, a las resistencias de desescarche y a las alarmas. Recibe las sondas.',
    },
    {
      comp: 'Contactor de compresor + relé térmico / guardamotor',
      conecta: 'La bobina del contactor la gobierna la salida "compresor" del controlador. El relé térmico (o guardamotor) protege el motor del compresor frente a sobreintensidad.',
    },
    {
      comp: 'Presostato de alta (HP)',
      conecta: 'En la línea de descarga. Corta el compresor por sobrepresión de condensación. Rearme manual recomendado.',
    },
    {
      comp: 'Presostato de baja (LP)',
      conecta: 'En la línea de aspiración. Para el compresor por baja presión / falta de gas. En equipos pequeños se usa el presostato combinado alta/baja.',
    },
    {
      comp: 'Presostato diferencial de aceite (si aplica)',
      conecta: 'Solo en compresores semiherméticos con bomba de aceite. Para el compresor si no hay presión diferencial de aceite suficiente.',
    },
    {
      comp: 'Resistencia de cárter',
      conecta: 'En el cárter del compresor. Alimentación permanente (o por termostato de cárter) para evitar migración/dilución del refrigerante en el aceite en parada.',
    },
    {
      comp: 'Ventiladores del evaporador',
      conecta: 'Salida de ventiladores del controlador. Paran durante el desescarche y arrancan de nuevo por la sonda de evaporador (retardo de goteo).',
    },
    {
      comp: 'Ventiladores del condensador',
      conecta: 'Control por presostato de condensación o por variador/regulador de velocidad para mantener la presión de alta estable (sobre todo en frío exterior).',
    },
    {
      comp: 'Resistencias de desescarche del evaporador',
      conecta: esNegativa
        ? 'Salida de desescarche del reloj/controlador (vía contactor si la potencia es alta). Activas solo en el ciclo de desescarche.'
        : 'No suelen instalarse en cámara positiva (desescarche por parada de compresor).',
    },
    {
      comp: 'Resistencia de marco de puerta',
      conecta: 'Alimentación permanente. Evita la congelación de la junta y del marco (imprescindible en cámaras negativas).',
    },
    {
      comp: 'Resistencia de desagüe / bandeja',
      conecta: 'Cable calefactor en la bandeja y el tubo de desagüe. Evita el tapón de hielo que bloquearía el drenaje del agua de desescarche.',
    },
    {
      comp: 'Protecciones de cabecera',
      conecta: `${phase.magneto} + ${phase.dif}. Van al inicio del cuadro protegiendo toda la instalación. ${phase.nota}`,
    },
  ];

  return { loadKW, esNegativa, trifasico, phase, defrost, sensors, panel };
}

// Diagrama SVG simple del cuadro de control (controlador -> cargas / sondas).
function ControlPanelDiagram() {
  const box = (x, y, w, h, fill, stroke) => (
    <rect x={x} y={y} width={w} height={h} rx="6" fill={fill} stroke={stroke} strokeWidth="1.5" />
  );
  const txt = (x, y, s, opts = {}) => (
    <text x={x} y={y} fontSize={opts.size || 11} fontWeight={opts.bold ? 700 : 400}
      fill={opts.fill || '#334155'} textAnchor={opts.anchor || 'middle'}>{s}</text>
  );
  const line = (x1, y1, x2, y2) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#arr)" />
  );
  return (
    <svg viewBox="0 0 600 270" className="w-full h-auto" role="img" aria-label="Esquema del cuadro de control">
      <defs>
        <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
        </marker>
      </defs>

      {/* Sondas (entradas) */}
      {box(15, 100, 130, 70, '#ecfeff', '#06b6d4')}
      {txt(80, 122, 'Sondas', { bold: true, fill: '#0e7490' })}
      {txt(80, 140, 'cámara · evap.', { size: 10, fill: '#155e75' })}
      {txt(80, 154, 'producto', { size: 10, fill: '#155e75' })}
      {line(145, 135, 228, 135)}

      {/* Protección (alimentación) */}
      {box(230, 205, 150, 55, '#fef2f2', '#ef4444')}
      {txt(305, 227, 'Magnetotérmico', { bold: true, fill: '#b91c1c', size: 10 })}
      {txt(305, 243, '+ diferencial', { fill: '#b91c1c', size: 10 })}
      {line(305, 205, 305, 172)}

      {/* Controlador (centro) */}
      {box(230, 100, 150, 70, '#eff6ff', '#2563eb')}
      {txt(305, 128, 'Controlador', { bold: true, fill: '#1d4ed8' })}
      {txt(305, 146, 'digital', { bold: true, fill: '#1d4ed8' })}
      {txt(305, 161, '(Eliwell/Dixell/Carel)', { size: 8, fill: '#3b82f6' })}

      {/* Salidas (cargas) */}
      {box(455, 15, 130, 45, '#f0fdf4', '#16a34a')}
      {txt(520, 34, 'Compresor', { bold: true, fill: '#15803d', size: 10 })}
      {txt(520, 48, '(contactor+térmico)', { size: 8, fill: '#16a34a' })}
      {line(380, 128, 453, 45)}

      {box(455, 75, 130, 45, '#f0fdf4', '#16a34a')}
      {txt(520, 94, 'Ventiladores', { bold: true, fill: '#15803d', size: 10 })}
      {txt(520, 108, 'evap. / cond.', { size: 8, fill: '#16a34a' })}
      {line(380, 132, 453, 97)}

      {box(455, 135, 130, 45, '#fff7ed', '#f97316')}
      {txt(520, 154, 'Desescarche', { bold: true, fill: '#c2410c', size: 10 })}
      {txt(520, 168, 'resist. evaporador', { size: 8, fill: '#ea580c' })}
      {line(380, 140, 453, 157)}

      {box(455, 195, 130, 45, '#fff7ed', '#f97316')}
      {txt(520, 214, 'Resist. puerta', { bold: true, fill: '#c2410c', size: 10 })}
      {txt(520, 228, 'y desagüe', { size: 8, fill: '#ea580c' })}
      {line(380, 150, 453, 217)}
    </svg>
  );
}

// Tarjeta con los componentes eléctricos y de control mínimos.
function ElectricalControlSection(result, form) {
  const d = electricalControlData(result, form);
  return (
    <Card className="border-slate-300">
      <CardHeader className="bg-slate-50 py-3">
        <CardTitle className="text-slate-700 text-base flex items-center gap-2">
          <Calculator className="w-4 h-4 text-slate-500" />
          Componentes eléctricos y de control mínimos
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <p className="text-xs text-gray-500">
          Instalación {d.esNegativa ? 'negativa' : 'positiva'} · alimentación <strong>{d.phase.label}</strong> · {d.phase.nota}
        </p>

        {/* Esquema del cuadro */}
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Esquema del cuadro de control</p>
          {ControlPanelDiagram()}
          <p className="text-[10px] text-gray-400 mt-1">El controlador recibe las sondas y manda a compresor, ventiladores y desescarche. Las protecciones alimentan todo el cuadro.</p>
        </div>

        {/* 1. Reloj de descarche */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-orange-800 mb-1">1 · Reloj de descarche / temporizador</p>
          <p className="text-xs font-medium text-orange-700">{d.defrost.modo}</p>
          <p className="text-xs text-gray-600 mt-1">{d.defrost.detalle}</p>
          <p className="text-[11px] text-gray-500 mt-1">
            <strong>Dónde conecta:</strong> el reloj (o la función de desescarche del controlador) va en el cuadro; su salida temporizada corta el compresor y, en negativas, alimenta las resistencias de desescarche vía contactor. La <strong>sonda de fin de desescarche</strong> (sonda de evaporador) corta el ciclo al alcanzar la temperatura fijada.
          </p>
        </div>

        {/* 2. Sondas de temperatura */}
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-cyan-800 mb-2">2 · Sondas de temperatura mínimas</p>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse min-w-[420px]">
              <thead><tr className="bg-cyan-100">
                <th className="border p-1 text-left">Sonda</th>
                <th className="border p-1 text-left">Dónde se coloca</th>
                <th className="border p-1 text-left">Dónde conecta / función</th>
              </tr></thead>
              <tbody>
                {d.sensors.map((s, i) => (
                  <tr key={i} className="border-b">
                    <td className="border p-1 font-medium">{s.nombre}</td>
                    <td className="border p-1 text-gray-600">{s.donde}</td>
                    <td className="border p-1 text-gray-600">{s.conecta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Control eléctrico (cuadro) */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-semibold text-blue-800 mb-2">3 · Control eléctrico del cuadro — dónde conecta cada componente</p>
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse min-w-[420px]">
              <thead><tr className="bg-blue-100">
                <th className="border p-1 text-left w-1/3">Componente</th>
                <th className="border p-1 text-left">Dónde conecta</th>
              </tr></thead>
              <tbody>
                {d.panel.map((p, i) => (
                  <tr key={i} className="border-b">
                    <td className="border p-1 font-medium">{p.comp}</td>
                    <td className="border p-1 text-gray-600">{p.conecta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Protección de cabecera según potencia: <strong>{d.phase.magneto}</strong> y <strong>{d.phase.dif}</strong>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ColdRoomCalc() {
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('camara');
  const [form, setForm] = useState({
    contact_id: '', contact_name: '',
    length: '', width: '', height: '',
    cold_room_temp: '', exterior_temp: '',
    product_kg: '', cold_room_type: 'positiva',
    panel_thickness: '80mm', refrigerant_type: 'R-449A',
    pipe_distance: '', pipe_height_diff: '',
    condensadora_tipo: 'split',
    photos_evaporator: [], photos_condenser: [], photos_other: [],
    humidity_evap_pressure: 5.72,
  });
  const [breakdown, setBreakdown] = useState(null);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingCalcId, setExistingCalcId] = useState(null);
  const printRefCamara = useRef(null);
  const printRefCombinado = useRef(null);
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
      notes: [
        `=== CÁLCULO CÁMARA FRIGORÍFICA${titleSuffix ? ' + HUMEDAD' : ''} ===`,
        `Fecha: ${new Date().toLocaleDateString('es-ES')}`,
        `--- PARÁMETROS ---`,
        `Dimensiones: ${form.length}×${form.width}×${form.height}m | Vol: ${(form.length*form.width*form.height).toFixed(1)}m³`,
        `Tipo: ${form.cold_room_type} | T.cámara: ${form.cold_room_temp}°C | T.exterior: ${form.exterior_temp}°C | ΔT: ${Math.abs(form.exterior_temp - form.cold_room_temp)}°C`,
        `Panel: ${form.panel_thickness} | Área panel: ${result.panelArea}m²`,
        `Producto: ${form.product_kg}kg | Gas: ${form.refrigerant_type}`,
        `Tubería: ${form.pipe_distance}m | Dif.altura: ${form.pipe_height_diff}m`,
        `--- DESGLOSE CARGAS ---`,
        `Transmisión: ${Math.round(bd.transmissionLoad)}W | Producto: ${Math.round(bd.productLoad)}W | Ventilación: ${Math.round(bd.ventLoad)}W`,
        `Factor seguridad ×1.25 aplicado`,
        `--- RESULTADOS ---`,
        `Carga total: ${result.loadW}W | ${Math.round(result.loadW * 0.86)} frig/h`,
        `--- EQUIPOS RECOMENDADOS ---`,
        result.alternatives.map((e,i) => `${i===0?'★ PRINCIPAL':'Opción '+(i+1)}: ${e.brand} ${e.model} ${e.power_kw}kW | Gas:${e.gas} | Rango:${e.temp_range} | Tipo:${e.type} | TubMax:${e.max_pipe_m}m`).join(' | '),
        result.extraGrams > 0 ? `⚠ Gas extra: +${result.extraGrams}g de ${form.refrigerant_type} (dist.${result.actualDist}m > máx.${result.maxDist}m)` : '',
        `--- PRESIONES ${form.refrigerant_type} ---`,
        `P.evap: ${result.evapPressure}bar | P.cond: ${result.condPressure}bar | Carga gas: ${result.refCharge}kg`,
        `T.evap ≈ ${form.cold_room_temp - 8}°C`,
        Object.entries(result.pr).map(([t,p]) => `${t}: ${p}bar`).join(' | '),
        `--- MATERIALES ---`,
        result.materials.map(m => `${m.material}: ${m.quantity} ${m.unit}`).join(' | '),
        `--- SCORES EFICIENCIA ---`,
        `Aislamiento:${result.efficiencyScores.insulation}% | Tuberías:${result.efficiencyScores.piping}% | Temperatura:${result.efficiencyScores.temp}% | Carga:${result.efficiencyScores.load}% | Equipo:${result.efficiencyScores.equipment}%`,
        titleSuffix ? `--- ${titleSuffix} ---` : '',
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
      ${(() => {
        const d = electricalControlData(result, form);
        return `
      <div class="section" style="border-left-color:#64748b">
        <div class="section-title" style="color:#475569">Componentes eléctricos y de control mínimos</div>
        <div style="font-size:10px;color:#6b7280;margin-bottom:6px">Instalación ${d.esNegativa ? 'negativa' : 'positiva'} · alimentación <b>${d.phase.label}</b>. ${d.phase.nota}</div>
        <p style="font-weight:700;font-size:10px;margin:6px 0 2px;color:#c2410c">1 · Reloj de descarche / temporizador — ${d.defrost.modo}</p>
        <div style="font-size:10px;color:#374151">${d.defrost.detalle} La sonda de evaporador actúa como fin de desescarche.</div>
        <p style="font-weight:700;font-size:10px;margin:8px 0 2px;color:#0e7490">2 · Sondas de temperatura mínimas</p>
        <table><thead><tr><th>Sonda</th><th>Dónde se coloca</th><th>Dónde conecta / función</th></tr></thead><tbody>
          ${d.sensors.map(s => `<tr><td><b>${s.nombre}</b></td><td>${s.donde}</td><td>${s.conecta}</td></tr>`).join('')}
        </tbody></table>
        <p style="font-weight:700;font-size:10px;margin:8px 0 2px;color:#1d4ed8">3 · Control eléctrico del cuadro — dónde conecta cada componente</p>
        <table><thead><tr><th>Componente</th><th>Dónde conecta</th></tr></thead><tbody>
          ${d.panel.map(p => `<tr><td><b>${p.comp}</b></td><td>${p.conecta}</td></tr>`).join('')}
        </tbody></table>
        <div style="font-size:9px;color:#6b7280;margin-top:4px">Protección de cabecera: <b>${d.phase.magneto}</b> y <b>${d.phase.dif}</b>.</div>
      </div>`;
      })()}
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
          <div><label className="text-[10px] text-gray-500">Largo (m)</label><NumberField value={form.length} onChange={v => setForm({...form, length: v})} /></div>
          <div><label className="text-[10px] text-gray-500">Ancho (m)</label><NumberField value={form.width} onChange={v => setForm({...form, width: v})} /></div>
          <div><label className="text-[10px] text-gray-500">Alto (m)</label><NumberField value={form.height} onChange={v => setForm({...form, height: v})} /></div>
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
        <div><label className="text-[10px] text-gray-500">T. cámara (°C)</label><NumberField value={form.cold_room_temp} onChange={v => setForm({...form, cold_room_temp: v})} /></div>
        <div><label className="text-[10px] text-gray-500">T. exterior (°C)</label><NumberField value={form.exterior_temp} onChange={v => setForm({...form, exterior_temp: v})} /></div>
        <div><label className="text-[10px] text-gray-500">Producto (kg)</label><NumberField value={form.product_kg} onChange={v => setForm({...form, product_kg: v})} /></div>
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
        <div><label className="text-[10px] text-gray-500">Long. tubería (m)</label><NumberField value={form.pipe_distance} onChange={v => setForm({...form, pipe_distance: v})} /></div>
        <div><label className="text-[10px] text-gray-500">Diferencia altura (m)</label><NumberField value={form.pipe_height_diff} onChange={v => setForm({...form, pipe_height_diff: v})} /></div>
      </div>

      <div>
        <label className="text-[10px] text-gray-500">Tipo de condensadora</label>
        <Select value={form.condensadora_tipo} onValueChange={v => setForm({...form, condensadora_tipo: v})}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="split">Split (condensadora exterior separada)</SelectItem>
            <SelectItem value="bancada">Bancada (grupo compacto compresor + condensador)</SelectItem>
          </SelectContent>
        </Select>
        {form.condensadora_tipo === 'bancada' && (
          <p className="text-[10px] text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
            ℹ️ Bancada: se calculará filtro deshidratador bidireccional de mayor capacidad (48 bar) con tamiz molecular
          </p>
        )}
      </div>

      <div className="space-y-2">
        <PhotoGallery photos={form.photos_evaporator} onChange={p => setForm({...form, photos_evaporator: p})} label="Fotos placa evaporadora" maxPhotos={10} />
        <PhotoGallery photos={form.photos_condenser} onChange={p => setForm({...form, photos_condenser: p})} label="Fotos grupo frío" maxPhotos={30} />
        <PhotoGallery photos={form.photos_other} onChange={p => setForm({...form, photos_other: p})} label="Otras fotos" maxPhotos={10} />
      </div>
    </>
  );

  const ResultSection = ({ withHumidity = false }) => result && breakdown ? (
    <div ref={withHumidity ? printRefCombinado : printRefCamara} className="space-y-4 mt-4">
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

      {/* Esquema del ciclo frigorífico con los valores calculados */}
      <ColdRoomCycleDiagram
        loadW={result.loadW}
        evapPressure={result.evapPressure}
        condPressure={result.condPressure}
        refCharge={result.refCharge}
        refrigerant={form.refrigerant_type}
        evapTemp={(form.cold_room_temp || 0) - 8}
        condTemp={(form.exterior_temp || 0) + 15}
        equipPowerKW={result.equip.power_kw}
        extraGrams={result.extraGrams || 0}
      />

      {/* Gráfico del desglose de la carga frigorífica (imagen del resultado) */}
      {breakdown && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 mt-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Desglose de la carga frigorífica (W)</p>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={[
              { n: 'Transmisión', w: Math.round(breakdown.transmissionLoad || 0), c: '#3b82f6' },
              { n: 'Producto', w: Math.round(breakdown.productLoad || 0), c: '#06b6d4' },
              { n: 'Ventilación', w: Math.round(breakdown.ventLoad || 0), c: '#10b981' },
            ]} margin={{ left: 4, right: 12, top: 4, bottom: 4 }}>
              <XAxis dataKey="n" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v} W`, 'Carga']} />
              <Bar dataKey="w" radius={[4, 4, 0, 0]}>
                {[0, 1, 2].map((i) => <Cell key={i} fill={['#3b82f6', '#06b6d4', '#10b981'][i]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-1">Incluye un +25% de mayoración de seguridad en el total. Ajusta los deslizadores para afinar cada partida.</p>
        </div>
      )}

      {/* Gráficas interactivas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ColdRoomBreakdown breakdown={breakdown} onAdjust={handleBreakdownAdjust} />
        <EfficiencyRadar scores={result.efficiencyScores} />
      </div>

      <PressureChart pressureData={result.pr} refrigerant={form.refrigerant_type} />

      {/* Selector multi-marca con normativa RITE+FGAS */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50 py-3">
          <CardTitle className="text-blue-700 text-base">Selección de equipo — RITE 2026 + F-GAS 2026</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <EquipmentSelector
            mode="camara"
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

      {/* Materiales con precios */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-sm">Material necesario para el montaje</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-semibold">
              Total materiales: {result.totalMateriales ? result.totalMateriales.toFixed(0) : '—'} €
            </span>
          </div>
          <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs border-collapse min-w-[400px]">
            <thead><tr className="bg-gray-100">
              <th className="border p-1 text-left">Material / Componente</th>
              <th className="border p-1 text-right w-12">Cant.</th>
              <th className="border p-1 w-10">Ud.</th>
              <th className="border p-1 text-right w-16">P. ud. €</th>
              <th className="border p-1 text-right w-16">Total €</th>
            </tr></thead>
            <tbody>
              {result.materials.map((m, i) => (
                <tr key={i} className={`border-b ${m.nota ? 'bg-blue-50' : ''}`}>
                  <td className="border p-1">
                    {m.material}
                    {m.nota && <span className="ml-1 text-[9px] text-blue-600 font-medium">({m.nota})</span>}
                  </td>
                  <td className="border p-1 text-right">{m.quantity}</td>
                  <td className="border p-1">{m.unit}</td>
                  <td className="border p-1 text-right">{m.precio_ud != null ? `${m.precio_ud.toFixed(2)}` : '—'}</td>
                  <td className="border p-1 text-right font-medium">
                    {m.precio_ud != null ? `${(m.precio_ud * parseFloat(m.quantity)).toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-bold">
                <td colSpan="4" className="border p-1 text-right">Total materiales estimado</td>
                <td className="border p-1 text-right text-blue-700">{result.totalMateriales ? result.totalMateriales.toFixed(2) : '—'} €</td>
              </tr>
            </tbody>
          </table>
          </div>
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            ⚠️ Precios orientativos de mercado. Evaporador, condensadora y puerta frigorífica requieren cotización específica.
            Orificio válvula de expansión: <strong>{result.vetOrificio || '—'}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Componentes eléctricos y de control mínimos */}
      {ElectricalControlSection(result, form)}

      {/* Acciones */}
      <div className="flex gap-2 flex-wrap">
        <PrintButton contentRef={withHumidity ? printRefCombinado : printRefCamara} title={withHumidity ? "Cálculo Cámara + Humedad" : "Cálculo Cámara Frigorífica"} />
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
              {ColdRoomInputs()}
              <Button onClick={calculate} className="w-full bg-blue-600 hover:bg-blue-700">
                <Calculator className="w-4 h-4 mr-2" /> Calcular cámara frigorífica
              </Button>
            </CardContent>
          </Card>
          {ResultSection({ withHumidity: false })}
        </TabsContent>

        {/* TAB 2 */}
        <TabsContent value="combinado" className="space-y-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-green-600" />Cámara + Humedad Relativa
          </h1>
          <Card>
            <CardContent className="p-4 space-y-3">
              {ColdRoomInputs()}
              <Button onClick={calculate} className="w-full bg-green-600 hover:bg-green-700">
                <Calculator className="w-4 h-4 mr-2" /> Calcular cámara + humedad
              </Button>
            </CardContent>
          </Card>
          {ResultSection({ withHumidity: true })}
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
                <div><label className="text-[10px] text-gray-500">T. cámara (°C)</label><NumberField value={form.cold_room_temp} onChange={v => setForm({...form, cold_room_temp: v})} /></div>
                <div><label className="text-[10px] text-gray-500">T. exterior (°C)</label><NumberField value={form.exterior_temp} onChange={v => setForm({...form, exterior_temp: v})} /></div>
                <div>
                  <label className="text-[10px] text-gray-500">Presión evap. (bar)</label>
                  <NumberField value={form.humidity_evap_pressure} onChange={v => setForm({...form, humidity_evap_pressure: v})} />
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