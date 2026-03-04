import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown } from 'lucide-react';
import { REFRIGERANT_DATABASE, getRefrigerantInfo, getCompatibleOils } from '@/components/refrigerantData';

export default function RefrigerantSelector({ value, onChange, label = "Gas refrigerante" }) {
  const [expanded, setExpanded] = useState(false);
  const selectedRef = getRefrigerantInfo(value);
  const compatibleOils = getCompatibleOils(value);

  const categoryColors = {
    antiguo: 'bg-red-100 text-red-800',
    transicion: 'bg-yellow-100 text-yellow-800',
    moderno: 'bg-blue-100 text-blue-800',
    futuro: 'bg-purple-100 text-purple-800',
    natural: 'bg-green-100 text-green-800'
  };

  const getGasGroup = (category) => {
    return REFRIGERANT_DATABASE.filter(r => r.category === category).sort((a, b) => a.code.localeCompare(b.code));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Seleccionar gas..." />
        </SelectTrigger>
        <SelectContent className="max-h-96">
          {/* Gases modernos - Recomendado */}
          {getGasGroup('moderno').length > 0 && (
            <>
              <div className="px-2 py-1.5 font-semibold text-xs bg-blue-50 text-blue-700 sticky top-0">
                ✓ RECOMENDADO (Moderno)
              </div>
              {getGasGroup('moderno').map(gas => (
                <SelectItem key={gas.code} value={gas.code} className="text-sm">
                  {gas.code} - {gas.name}
                </SelectItem>
              ))}
            </>
          )}

          {/* Gases de transición */}
          {getGasGroup('transicion').length > 0 && (
            <>
              <div className="px-2 py-1.5 font-semibold text-xs bg-yellow-50 text-yellow-700 sticky top-12">
                ⚠️ TRANSICIÓN (Siendo eliminado)
              </div>
              {getGasGroup('transicion').map(gas => (
                <SelectItem key={gas.code} value={gas.code} className="text-sm">
                  {gas.code} - {gas.name}
                </SelectItem>
              ))}
            </>
          )}

          {/* Gases naturales */}
          {getGasGroup('natural').length > 0 && (
            <>
              <div className="px-2 py-1.5 font-semibold text-xs bg-green-50 text-green-700 sticky top-24">
                🌱 NATURALES (Ecológicos)
              </div>
              {getGasGroup('natural').map(gas => (
                <SelectItem key={gas.code} value={gas.code} className="text-sm">
                  {gas.code} - {gas.name}
                </SelectItem>
              ))}
            </>
          )}

          {/* Gases futuros */}
          {getGasGroup('futuro').length > 0 && (
            <>
              <div className="px-2 py-1.5 font-semibold text-xs bg-purple-50 text-purple-700 sticky top-36">
                🔮 FUTURO
              </div>
              {getGasGroup('futuro').map(gas => (
                <SelectItem key={gas.code} value={gas.code} className="text-sm">
                  {gas.code} - {gas.name}
                </SelectItem>
              ))}
            </>
          )}

          {/* Gases antiguos - Prohibidos/Legado */}
          {getGasGroup('antiguo').length > 0 && (
            <>
              <div className="px-2 py-1.5 font-semibold text-xs bg-red-50 text-red-700 sticky top-48">
                ❌ PROHIBIDO (Legado)
              </div>
              {getGasGroup('antiguo').map(gas => (
                <SelectItem key={gas.code} value={gas.code} className="text-sm">
                  {gas.code} - {gas.name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>

      {/* Información detallada del gas seleccionado */}
      {selectedRef && (
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300">
          <CardContent className="p-3 space-y-3">
            {/* Encabezado con nombre y categoría */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-gray-900">{selectedRef.code}</p>
                <p className="text-xs text-gray-600">{selectedRef.name}</p>
              </div>
              <Badge className={`text-xs whitespace-nowrap ${categoryColors[selectedRef.category]}`}>
                {selectedRef.category.toUpperCase()}
              </Badge>
            </div>

            {/* Datos técnicos principales */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white p-2 rounded border border-gray-200">
                <p className="font-semibold text-gray-700">Tipo</p>
                <p className="text-gray-600">{selectedRef.type}</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-200">
                <p className="font-semibold text-gray-700">GWP</p>
                <p className="text-gray-600">{selectedRef.gwp}</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-200">
                <p className="font-semibold text-gray-700">Agotamiento Ozono</p>
                <p className="text-gray-600">{selectedRef.ozone_depletion}</p>
              </div>
              <div className="bg-white p-2 rounded border border-gray-200">
                <p className="font-semibold text-gray-700">Flamabilidad</p>
                <p className="text-gray-600">{selectedRef.type.includes('Hidrocarburo') || selectedRef.type.includes('A2L') ? 'INFLAMABLE' : 'No inflamable'}</p>
              </div>
            </div>

            {/* Aceite del compresor */}
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="font-semibold text-gray-700 text-xs mb-1">🛢️ Aceite del Compresor</p>
              <p className="text-sm font-bold text-blue-700 mb-1">{selectedRef.compressor_oil}</p>
              {compatibleOils.length > 0 && (
                <div className="space-y-1">
                  {compatibleOils.map(oil => (
                    <div key={oil.key} className="text-xs">
                      <p className="font-semibold text-gray-700">{oil.name}</p>
                      <p className="text-gray-600">{oil.notes}</p>
                      <p className="text-gray-500">Coste: {oil.cost}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Información de retrofit/sustitución */}
            <div className="bg-white p-2 rounded border border-gray-200">
              <p className="font-semibold text-gray-700 text-xs mb-1">🔄 Retrofit / Sustitución</p>
              <div className={`text-sm font-bold mb-1 ${selectedRef.retrofit_type.includes('NO') ? 'text-red-700' : 'text-green-700'}`}>
                {selectedRef.retrofit_type}
              </div>
              <p className="text-xs text-gray-700 mb-1"><strong>¿Se pueden mezclar?</strong> {selectedRef.can_mix ? '✓ SÍ' : '✗ NO'}</p>
              {selectedRef.replacement && (
                <p className="text-xs text-gray-700"><strong>Sustitutos:</strong> {selectedRef.replacement}</p>
              )}
            </div>

            {/* Notas importantes */}
            {selectedRef.notes && (
              <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                <p className="text-xs text-blue-800"><strong>📌 Info:</strong> {selectedRef.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}