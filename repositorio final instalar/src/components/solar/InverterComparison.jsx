import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Star, CheckCircle, Info } from 'lucide-react';

const INVERSORES = [
  {
    marca: 'Huawei', modelo: 'SUN2000-6KTL-M1', tipo: 'Monofásico string', potencia_kw: 6,
    precio_ref: '850 €', eficiencia: 98.6, mppt: 2, max_voc: 600, max_isc: 25,
    garantia: '10 años', comunicacion: 'WiFi, 4G opcional', peso_kg: 14, ip: 'IP65',
    pros: ['Alta eficiencia', 'App SmartPV', 'Precio competitivo', 'Soporte técnico bueno'],
    contras: ['Requiere dongle WiFi', 'Ecosistema cerrado Huawei'],
    puntuacion: 4.5, precio_kwp: 142,
    web: 'https://solar.huawei.com',
    color: 'border-red-400', badge: 'bg-red-100 text-red-700',
  },
  {
    marca: 'SolarEdge', modelo: 'SE6K', tipo: 'Monofásico HD-Wave', potencia_kw: 6,
    precio_ref: '1.050 €', eficiencia: 99.2, mppt: 1, max_voc: 480, max_isc: 15,
    garantia: '12 años', comunicacion: 'WiFi, Ethernet, ZigBee', peso_kg: 10.5, ip: 'IP65',
    pros: ['Máxima eficiencia del mercado', 'Optimizadores por panel', 'Monitorización avanzada', 'Muy compacto'],
    contras: ['Precio elevado', 'Necesita optimizadores', 'MPPT limitado a 1'],
    puntuacion: 4.7, precio_kwp: 175,
    web: 'https://www.solaredge.com',
    color: 'border-blue-400', badge: 'bg-blue-100 text-blue-700',
  },
  {
    marca: 'Fronius', modelo: 'Primo 6.0-1', tipo: 'Monofásico string', potencia_kw: 6,
    precio_ref: '1.100 €', eficiencia: 98.1, mppt: 2, max_voc: 800, max_isc: 27,
    garantia: '10 años (ampliable a 20)', comunicacion: 'WiFi, Ethernet', peso_kg: 21.3, ip: 'IP65',
    pros: ['Marca premium europea', 'SuperFlex Design™', 'Gran rango MPPT', 'Garantía ampliable'],
    contras: ['Precio alto', 'Más pesado que competidores', 'Sin batería integrada'],
    puntuacion: 4.6, precio_kwp: 183,
    web: 'https://www.fronius.com',
    color: 'border-orange-400', badge: 'bg-orange-100 text-orange-700',
  },
  {
    marca: 'Growatt', modelo: 'MIN 6000TL-X', tipo: 'Monofásico string', potencia_kw: 6,
    precio_ref: '550 €', eficiencia: 97.8, mppt: 2, max_voc: 600, max_isc: 25,
    garantia: '10 años', comunicacion: 'WiFi, App Growatt', peso_kg: 12, ip: 'IP65',
    pros: ['Precio muy competitivo', 'Fácil instalación', 'App decente', 'Buena relación calidad/precio'],
    contras: ['Soporte técnico mejorable', 'Eficiencia algo inferior'],
    puntuacion: 4.0, precio_kwp: 92,
    web: 'https://www.growatt.com',
    color: 'border-green-400', badge: 'bg-green-100 text-green-700',
  },
  {
    marca: 'SMA', modelo: 'Sunny Boy 6.0', tipo: 'Monofásico string', potencia_kw: 6,
    precio_ref: '1.200 €', eficiencia: 98.3, mppt: 2, max_voc: 600, max_isc: 30,
    garantia: '10 años (ampliable a 20)', comunicacion: 'WiFi, SMA Portal', peso_kg: 17, ip: 'IP65',
    pros: ['Marca líder mundial', 'Fiabilidad extrema', 'Soporte excelente', 'Amplia documentación'],
    contras: ['Precio muy elevado', 'Plataforma algo obsoleta'],
    puntuacion: 4.5, precio_kwp: 200,
    web: 'https://www.sma.de',
    color: 'border-gray-400', badge: 'bg-gray-100 text-gray-700',
  },
  {
    marca: 'Goodwe', modelo: 'GW6000-MS', tipo: 'Monofásico híbrido', potencia_kw: 6,
    precio_ref: '750 €', eficiencia: 97.9, mppt: 2, max_voc: 600, max_isc: 25,
    garantia: '10 años', comunicacion: 'WiFi, 4G', peso_kg: 15, ip: 'IP65',
    pros: ['Opción híbrida incluida', 'Buen precio para híbrido', 'Interfaz intuitiva'],
    contras: ['Marca menos conocida en España', 'Servicio técnico limitado'],
    puntuacion: 3.9, precio_kwp: 125,
    web: 'https://www.goodwe.com',
    color: 'border-teal-400', badge: 'bg-teal-100 text-teal-700',
  },
  {
    marca: 'Sungrow', modelo: 'SG6RS', tipo: 'Monofásico residencial', potencia_kw: 6,
    precio_ref: '680 €', eficiencia: 98.4, mppt: 2, max_voc: 600, max_isc: 25,
    garantia: '10 años', comunicacion: 'WiFi, iSolarCloud', peso_kg: 11, ip: 'IP65',
    pros: ['Alta eficiencia por precio', 'Muy ligero', 'App iSolarCloud muy buena', 'Líder mundial en potencia instalada'],
    contras: ['Soporte postventa variable en España'],
    puntuacion: 4.3, precio_kwp: 113,
    web: 'https://www.sungrowpower.com',
    color: 'border-purple-400', badge: 'bg-purple-100 text-purple-700',
  },
];

function Stars({ n }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.floor(n) ? 'text-amber-400 fill-amber-400' : i - 0.5 <= n ? 'text-amber-400 fill-amber-200' : 'text-gray-200 fill-gray-200'}`} />
      ))}
      <span className="text-xs text-gray-600 ml-1">{n}</span>
    </div>
  );
}

export default function InverterComparison({ targetKwp = 3.2 }) {
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState('todos');

  const toggleSelect = (modelo) => {
    setSelected(prev => prev.includes(modelo) ? prev.filter(m => m !== modelo) : prev.length < 3 ? [...prev, modelo] : prev);
  };

  const filtered = filter === 'todos' ? INVERSORES : INVERSORES.filter(i => i.tipo.toLowerCase().includes(filter));
  const compareList = selected.length > 0 ? INVERSORES.filter(i => selected.includes(i.modelo)) : [];

  const KEYS = [
    { label: 'Potencia', key: 'potencia_kw', unit: 'kW' },
    { label: 'Eficiencia', key: 'eficiencia', unit: '%' },
    { label: 'Nº MPPT', key: 'mppt', unit: '' },
    { label: 'Voc máx.', key: 'max_voc', unit: 'V' },
    { label: 'Precio ref.', key: 'precio_ref', unit: '' },
    { label: '€/kWp', key: 'precio_kwp', unit: '€' },
    { label: 'Garantía', key: 'garantia', unit: '' },
    { label: 'Comunicación', key: 'comunicacion', unit: '' },
    { label: 'Peso', key: 'peso_kg', unit: 'kg' },
    { label: 'IP', key: 'ip', unit: '' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-bold">Comparación de Inversores</h2>
        <Badge className="bg-amber-100 text-amber-700 text-xs">Instalación: {targetKwp.toFixed(2)} kWp</Badge>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>Selecciona hasta 3 inversores para compararlos en detalle. Precios orientativos sin IVA (2025). Para instalaciones de {targetKwp.toFixed(2)} kWp se recomienda un inversor de <strong>{Math.ceil(targetKwp * 0.9)}–{Math.ceil(targetKwp)}kW</strong>.</span>
      </div>

      {/* Filtro tipo */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'monofásico', 'híbrido', 'trifásico'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize ${filter === f ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:border-amber-300'}`}>
            {f}
          </button>
        ))}
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 ml-auto">
            ✕ Limpiar selección ({selected.length})
          </button>
        )}
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map(inv => {
          const isSelected = selected.includes(inv.modelo);
          return (
            <Card key={inv.modelo} className={`border-2 cursor-pointer transition-all hover:shadow-md ${isSelected ? inv.color + ' shadow-md' : 'border-gray-100 hover:border-gray-300'}`}
              onClick={() => toggleSelect(inv.modelo)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{inv.marca}</p>
                    <p className="text-xs text-gray-600">{inv.modelo}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isSelected && <CheckCircle className="w-5 h-5 text-green-500" />}
                    <Badge className={`text-[10px] ${inv.badge}`}>{inv.tipo.split(' ')[0]}</Badge>
                  </div>
                </div>

                <Stars n={inv.puntuacion} />

                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div className="bg-gray-50 rounded p-1.5">
                    <p className="text-gray-500">Potencia</p>
                    <p className="font-bold text-gray-800">{inv.potencia_kw} kW</p>
                  </div>
                  <div className="bg-gray-50 rounded p-1.5">
                    <p className="text-gray-500">Eficiencia</p>
                    <p className="font-bold text-green-700">{inv.eficiencia}%</p>
                  </div>
                  <div className="bg-gray-50 rounded p-1.5">
                    <p className="text-gray-500">MPPT</p>
                    <p className="font-bold text-gray-800">{inv.mppt}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-1.5">
                    <p className="text-gray-500">Garantía</p>
                    <p className="font-bold text-blue-700">{inv.garantia.split('(')[0].trim()}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-amber-700">{inv.precio_ref}</span>
                  <span className="text-[10px] text-gray-400">{inv.precio_kwp} €/kWp</span>
                </div>

                <div className="mt-2 space-y-0.5">
                  {inv.pros.slice(0, 2).map((p, i) => (
                    <p key={i} className="text-[10px] text-green-700 flex items-center gap-1">
                      <span className="text-green-500">✓</span>{p}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabla comparativa */}
      {compareList.length >= 2 && (
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50 py-3">
            <CardTitle className="text-amber-700 text-sm">⚖️ Comparación detallada — {compareList.map(i => i.marca).join(' vs ')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white">
                    <th className="p-2 text-left w-28">Característica</th>
                    {compareList.map(inv => (
                      <th key={inv.modelo} className="p-2 text-center">
                        <p className="font-bold">{inv.marca}</p>
                        <p className="text-white/80 font-normal">{inv.modelo}</p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {KEYS.map((k, ri) => (
                    <tr key={k.key} className={ri % 2 === 0 ? 'bg-white' : 'bg-amber-50'}>
                      <td className="p-2 font-medium text-gray-700">{k.label}</td>
                      {compareList.map(inv => {
                        const val = inv[k.key];
                        const allVals = compareList.map(i => typeof i[k.key] === 'number' ? i[k.key] : null).filter(v => v !== null);
                        const isBest = typeof val === 'number' && allVals.length > 1 &&
                          (k.key === 'precio_kwp' || k.key === 'peso_kg'
                            ? val === Math.min(...allVals)
                            : val === Math.max(...allVals));
                        return (
                          <td key={inv.modelo} className={`p-2 text-center font-medium ${isBest ? 'text-green-700 bg-green-50 font-bold' : ''}`}>
                            {val}{k.unit && typeof val === 'number' ? ` ${k.unit}` : ''}
                            {isBest && ' ★'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {/* Pros */}
                  <tr className="bg-green-50">
                    <td className="p-2 font-medium text-green-800">✅ Ventajas</td>
                    {compareList.map(inv => (
                      <td key={inv.modelo} className="p-2 text-left">
                        {inv.pros.map((p, i) => <p key={i} className="text-[10px] text-green-700">✓ {p}</p>)}
                      </td>
                    ))}
                  </tr>
                  {/* Contras */}
                  <tr className="bg-red-50">
                    <td className="p-2 font-medium text-red-800">❌ Desventajas</td>
                    {compareList.map(inv => (
                      <td key={inv.modelo} className="p-2 text-left">
                        {inv.contras.map((p, i) => <p key={i} className="text-[10px] text-red-600">✗ {p}</p>)}
                      </td>
                    ))}
                  </tr>
                  {/* Puntuación */}
                  <tr className="bg-amber-50">
                    <td className="p-2 font-medium text-amber-800">⭐ Puntuación</td>
                    {compareList.map(inv => (
                      <td key={inv.modelo} className="p-2 text-center">
                        <Stars n={inv.puntuacion} />
                      </td>
                    ))}
                  </tr>
                  {/* Web */}
                  <tr>
                    <td className="p-2 font-medium text-gray-700">🌐 Web</td>
                    {compareList.map(inv => (
                      <td key={inv.modelo} className="p-2 text-center">
                        <a href={inv.web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[10px]">Ver web oficial</a>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Recomendación */}
            <div className="p-4 bg-blue-50 border-t border-blue-100">
              <p className="text-xs font-semibold text-blue-800 mb-2">🏆 Recomendación para tu instalación de {targetKwp.toFixed(2)} kWp:</p>
              {compareList.sort((a, b) => b.puntuacion - a.puntuacion).map((inv, i) => (
                <div key={inv.modelo} className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${i === 0 ? 'bg-amber-100 border border-amber-300' : 'bg-white border border-gray-200'}`}>
                  <span className={`text-sm font-bold ${i === 0 ? 'text-amber-700' : 'text-gray-500'}`}>#{i+1}</span>
                  <div className="flex-1">
                    <p className="text-xs font-bold">{inv.marca} {inv.modelo}</p>
                    <p className="text-[10px] text-gray-600">{inv.precio_ref} · {inv.eficiencia}% eficiencia · {inv.garantia.split('(')[0].trim()}</p>
                  </div>
                  {i === 0 && <Badge className="bg-amber-500 text-white text-[10px]">Mejor opción</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {compareList.length === 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-600 text-center">
          Selecciona al menos 2 inversores para comparar
        </div>
      )}
    </div>
  );
}