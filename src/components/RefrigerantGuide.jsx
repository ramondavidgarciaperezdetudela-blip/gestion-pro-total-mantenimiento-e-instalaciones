import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Thermometer, Search, ChevronDown, ChevronRight, Info } from 'lucide-react';

const REFRIGERANTS = [
  {
    gas: 'R-22',
    type: 'HCFC',
    gwp: 1810,
    status: 'prohibido',
    phaseout: '2015',
    replacements: [
      { gas: 'R-407C', dropIn: false, ratio: 1.0, oil: 'POE', notes: 'Glizante, requiere sustitución completa del aceite' },
      { gas: 'R-410A', dropIn: false, ratio: 1.0, oil: 'POE', notes: 'Alta presión, requiere equipo nuevo o rediseño' },
      { gas: 'R-417A', dropIn: true, ratio: 1.0, oil: 'POE/MO (compatible)', notes: 'Drop-in con mezcla de aceites compatible' },
      { gas: 'R-422D', dropIn: true, ratio: 0.9, oil: 'POE/MO', notes: 'Drop-in, ligeramente menos carga' },
    ]
  },
  {
    gas: 'R-404A',
    type: 'HFC',
    gwp: 3922,
    status: 'restringido',
    phaseout: '2030',
    replacements: [
      { gas: 'R-448A', dropIn: false, ratio: 0.88, oil: 'POE', notes: 'Muy similar, requiere ajuste de válvula expansión' },
      { gas: 'R-449A', dropIn: false, ratio: 0.88, oil: 'POE', notes: 'Equivalente mejorado, menor GWP' },
      { gas: 'R-452A', dropIn: true, ratio: 0.9, oil: 'POE', notes: 'Drop-in parcial, similar presiones' },
      { gas: 'R-290 (Propano)', dropIn: false, ratio: 0.55, oil: 'POE', notes: 'Natural, inflamable A3 — carga reducida 55%' },
    ]
  },
  {
    gas: 'R-410A',
    type: 'HFC',
    gwp: 2088,
    status: 'restringido',
    phaseout: '2025',
    replacements: [
      { gas: 'R-32', dropIn: false, ratio: 0.75, oil: 'POE', notes: 'Menor carga ~25%, A2L ligeramente inflamable' },
      { gas: 'R-454B', dropIn: false, ratio: 0.75, oil: 'POE', notes: 'Alternativa A2L de baja GWP (466)' },
      { gas: 'R-466A', dropIn: false, ratio: 1.0, oil: 'POE', notes: 'No inflamable A1, GWP 733' },
    ]
  },
  {
    gas: 'R-407C',
    type: 'HFC',
    gwp: 1774,
    status: 'restringido',
    phaseout: '2030',
    replacements: [
      { gas: 'R-32', dropIn: false, ratio: 0.75, oil: 'POE', notes: 'Menor GWP, requiere ajuste de sistema' },
      { gas: 'R-454C', dropIn: false, ratio: 0.8, oil: 'POE', notes: 'A2L, alternativa de menor GWP' },
    ]
  },
  {
    gas: 'R-32',
    type: 'HFC',
    gwp: 675,
    status: 'vigente',
    phaseout: null,
    replacements: [
      { gas: 'R-290 (Propano)', dropIn: false, ratio: 0.55, oil: 'POE', notes: 'Natural, carga muy reducida, A3 inflamable' },
    ]
  },
  {
    gas: 'R-134a',
    type: 'HFC',
    gwp: 1430,
    status: 'restringido',
    phaseout: '2025 (móvil)',
    replacements: [
      { gas: 'R-1234yf', dropIn: true, ratio: 0.9, oil: 'POE', notes: 'Drop-in en automoción, A2L' },
      { gas: 'R-744 (CO₂)', dropIn: false, ratio: 'N/A', oil: 'POE', notes: 'Natural, alta presión, circuito trascrítico' },
      { gas: 'R-513A', dropIn: true, ratio: 0.9, oil: 'POE', notes: 'Drop-in funcional, GWP 631' },
    ]
  },
  {
    gas: 'R-290 (Propano)',
    type: 'HC Natural',
    gwp: 3,
    status: 'vigente',
    phaseout: null,
    replacements: []
  },
  {
    gas: 'R-744 (CO₂)',
    type: 'Natural',
    gwp: 1,
    status: 'vigente',
    phaseout: null,
    replacements: []
  },
  {
    gas: 'R-448A',
    type: 'HFO blend',
    gwp: 1387,
    status: 'vigente',
    phaseout: null,
    replacements: []
  },
  {
    gas: 'R-449A',
    type: 'HFO blend',
    gwp: 1397,
    status: 'vigente',
    phaseout: null,
    replacements: []
  },
  {
    gas: 'R-452A',
    type: 'HFC/HFO blend',
    gwp: 2140,
    status: 'vigente',
    phaseout: null,
    replacements: []
  },
  {
    gas: 'R-1234yf',
    type: 'HFO',
    gwp: 4,
    status: 'vigente',
    phaseout: null,
    replacements: []
  },
];

const STATUS_CONFIG = {
  prohibido: { label: 'Prohibido', color: 'bg-red-100 text-red-700' },
  restringido: { label: 'Restringido (F-Gas)', color: 'bg-orange-100 text-orange-700' },
  vigente: { label: 'Vigente', color: 'bg-green-100 text-green-700' },
};

const OIL_COLOR = {
  'POE': 'bg-blue-100 text-blue-700',
  'POE/MO (compatible)': 'bg-purple-100 text-purple-700',
  'POE/MO': 'bg-purple-100 text-purple-700',
  'MO': 'bg-gray-100 text-gray-700',
};

export default function RefrigerantGuide() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const toggle = (gas) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(gas)) next.delete(gas); else next.add(gas);
    return next;
  });

  const filtered = REFRIGERANTS.filter(r =>
    r.gas.toLowerCase().includes(search.toLowerCase()) ||
    r.type.toLowerCase().includes(search.toLowerCase()) ||
    r.replacements.some(s => s.gas.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Thermometer className="w-4 h-4 text-cyan-600" />
          Guía de Gases Refrigerantes y Sustitutos
        </CardTitle>
        <p className="text-xs text-gray-500">Conversión de carga, tipo de aceite, compatibilidad drop-in y estado F-Gas</p>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Buscar gas (ej: R-404A, R-32, Propano...)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 text-sm h-8"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {filtered.map(r => {
            const isOpen = expanded.has(r.gas);
            const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.vigente;
            return (
              <div key={r.gas}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => toggle(r.gas)}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm w-28 flex-shrink-0">{r.gas}</span>
                    <Badge className="text-[10px] bg-gray-100 text-gray-600">{r.type}</Badge>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusCfg.color}`}>{statusCfg.label}</span>
                    <span className="text-[10px] text-gray-400">GWP: <span className={`font-semibold ${r.gwp > 2000 ? 'text-red-600' : r.gwp > 500 ? 'text-orange-500' : 'text-green-600'}`}>{r.gwp}</span></span>
                    {r.phaseout && <span className="text-[10px] text-red-500 font-semibold">Eliminación: {r.phaseout}</span>}
                    {r.replacements.length > 0 && (
                      <span className="text-[10px] text-blue-500">{r.replacements.length} sustituto(s)</span>
                    )}
                  </div>
                  {r.replacements.length > 0 ? (
                    isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <span className="text-[10px] text-green-600 font-medium flex-shrink-0">✓ Sin sustitución</span>
                  )}
                </button>

                {isOpen && r.replacements.length > 0 && (
                  <div className="bg-blue-50 border-t border-blue-100 px-4 py-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5" /> Sustitutos disponibles para {r.gas}
                    </p>
                    <div className="space-y-2">
                      {r.replacements.map((s, i) => (
                        <div key={i} className="bg-white rounded-lg border border-blue-100 p-3 text-xs space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-gray-900">{s.gas}</span>
                            {s.dropIn ? (
                              <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">✓ DROP-IN</span>
                            ) : (
                              <span className="bg-orange-100 text-orange-700 text-[10px] font-semibold px-1.5 py-0.5 rounded">⚠ NO drop-in</span>
                            )}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OIL_COLOR[s.oil] || 'bg-gray-100 text-gray-600'}`}>
                              Aceite: {s.oil}
                            </span>
                            {s.ratio !== 'N/A' && (
                              <span className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                                Factor carga: ×{s.ratio}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-500">{s.notes}</p>
                          {s.ratio !== 'N/A' && s.ratio !== 1.0 && (
                            <div className="bg-amber-50 border border-amber-100 rounded p-1.5 text-[11px] text-amber-800">
                              💡 Ejemplo: Si el equipo llevaba <strong>1 kg</strong> de {r.gas} → poner <strong>{s.ratio} kg</strong> de {s.gas}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-400">
              No se encontraron refrigerantes con ese término
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}