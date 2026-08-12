import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Plus, Trash2, Calculator, ChevronDown, ChevronRight } from 'lucide-react';
import NavBar from '@/components/NavBar';

const MULTI_SPLIT = [
  { brand:'Daikin',     model:'3MXM52A',      power_kw:5.2, zones:3, gas:'R-32' },
  { brand:'Daikin',     model:'3MXM68A',      power_kw:6.8, zones:3, gas:'R-32' },
  { brand:'Daikin',     model:'4MXM68A',      power_kw:6.8, zones:4, gas:'R-32' },
  { brand:'Daikin',     model:'4MXM80A',      power_kw:8.0, zones:4, gas:'R-32' },
  { brand:'Daikin',     model:'5MXM90A',      power_kw:9.0, zones:5, gas:'R-32' },
  { brand:'Mitsubishi', model:'MXZ-3F54VF',   power_kw:5.4, zones:3, gas:'R-32' },
  { brand:'Mitsubishi', model:'MXZ-4F72VF',   power_kw:7.2, zones:4, gas:'R-32' },
  { brand:'Mitsubishi', model:'MXZ-5F102VF',  power_kw:10.2,zones:5, gas:'R-32' },
  { brand:'Fujitsu',    model:'AOY50MI-3',     power_kw:5.0, zones:3, gas:'R-32' },
  { brand:'Fujitsu',    model:'AOY71MI-4',     power_kw:7.1, zones:4, gas:'R-32' },
  { brand:'Fujitsu',    model:'AOY90MI-5',     power_kw:9.0, zones:5, gas:'R-32' },
  { brand:'Samsung',    model:'AJ052TXJ3KH',   power_kw:5.2, zones:3, gas:'R-32' },
  { brand:'Samsung',    model:'AJ068TXJ4KH',   power_kw:6.8, zones:4, gas:'R-32' },
  { brand:'LG',         model:'MU3R19',         power_kw:5.5, zones:3, gas:'R-32' },
  { brand:'LG',         model:'MU4R25',         power_kw:7.3, zones:4, gas:'R-32' },
  { brand:'LG',         model:'MU5R30',         power_kw:8.8, zones:5, gas:'R-32' },
];

const INTERIOR = [
  { brand:'Daikin',     model:'FTXM25R', power_kw:2.5 },
  { brand:'Daikin',     model:'FTXM35R', power_kw:3.5 },
  { brand:'Daikin',     model:'FTXM50R', power_kw:5.0 },
  { brand:'Daikin',     model:'FTXM71R', power_kw:7.1 },
  { brand:'Mitsubishi', model:'MSZ-AP25',power_kw:2.5 },
  { brand:'Mitsubishi', model:'MSZ-AP35',power_kw:3.5 },
  { brand:'Mitsubishi', model:'MSZ-AP50',power_kw:5.0 },
  { brand:'Fujitsu',    model:'ASYG09',  power_kw:2.5 },
  { brand:'Fujitsu',    model:'ASYG12',  power_kw:3.5 },
  { brand:'Fujitsu',    model:'ASYG18',  power_kw:5.0 },
];

function calcArea(area) {
  const sup = (parseFloat(area.length)||0) * (parseFloat(area.width)||0);
  const watios = Math.round(sup * 100 + (parseInt(area.numPeople)||0) * 100 + (parseFloat(area.equipHeat)||0));
  const power_kw = parseFloat((watios / 1000).toFixed(2));
  const frigorias = Math.round(watios * 0.86);
  const unit = INTERIOR.find(u => u.power_kw * 1000 >= watios * 0.85) || INTERIOR[INTERIOR.length - 1];
  return { watios, power_kw, frigorias, unit };
}

let uid = 0;
const mkArea = () => ({ id: ++uid, name: `Zona ${uid}`, length: 4, width: 3, height: 2.7, numPeople: 2, equipHeat: 150 });

export default function MultiAreaCalc() {
  const [areas, setAreas] = useState([mkArea()]);
  const [results, setResults] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set([1]));

  const upd = (id, f, v) => setAreas(p => p.map(a => a.id === id ? { ...a, [f]: v } : a));

  const addArea = () => {
    const a = mkArea();
    setAreas(p => [...p, a]);
    setExpanded(p => new Set([...p, a.id]));
  };

  const removeArea = id => {
    setAreas(p => p.filter(a => a.id !== id));
    setExpanded(p => { const n = new Set(p); n.delete(id); return n; });
  };

  const toggleExpand = id => setExpanded(p => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const calculate = () => {
    const res = areas.map(a => ({ ...calcArea(a), area: a }));
    const totalW = res.reduce((s, r) => s + r.watios, 0);
    const totalKw = parseFloat((totalW / 1000).toFixed(2));
    const candidates = MULTI_SPLIT.filter(m => m.zones >= areas.length && m.power_kw >= totalKw * 0.85)
      .sort((a, b) => a.power_kw - b.power_kw);
    const pipe = Math.max(...areas.map(() => 8));
    const materials = [
      { item: `Unidad exterior ${(candidates[0]||MULTI_SPLIT[0]).brand} ${(candidates[0]||MULTI_SPLIT[0]).model}`, qty: 1, unit: 'ud' },
      ...res.map((r, i) => ({ item: `UI ${r.unit.brand} ${r.unit.model} ${r.unit.power_kw}kW — ${areas[i].name}`, qty: 1, unit: 'ud' })),
      { item: 'Tubería líquido + gas Cu', qty: pipe * areas.length, unit: 'm' },
      { item: 'Cableado 4x1,5mm²',       qty: pipe * areas.length, unit: 'm' },
      { item: 'Aislamiento AF/19',        qty: pipe * areas.length, unit: 'm' },
    ];
    setResults({ res, totalW, totalKw, totalFrig: Math.round(totalW * 0.86), candidates: candidates.slice(0, 3), materials });
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <NavBar title="Cálculo Multi-área AA" />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Thermometer className="w-6 h-6 text-red-500" />
          Cálculo Multi-área — Aire Acondicionado
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addArea} className="gap-1"><Plus className="w-4 h-4" />Añadir zona</Button>
          <Button onClick={calculate} className="bg-red-600 hover:bg-red-700 gap-1"><Calculator className="w-4 h-4" />Calcular</Button>
        </div>
      </div>

      <div className="space-y-3">
        {areas.map((area, idx) => {
          const isOpen = expanded.has(area.id);
          const pr = calcArea(area);
          return (
            <Card key={area.id} className="overflow-hidden">
              <button className="w-full flex items-center gap-3 p-4 bg-white hover:bg-gray-50"
                onClick={() => toggleExpand(area.id)}>
                <div className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">{area.name}</p>
                  <p className="text-xs text-gray-500">{area.length}×{area.width}m · {pr.power_kw} kW · {pr.frigorias.toLocaleString('es-ES')} frig/h</p>
                </div>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">{pr.unit.brand} {pr.unit.power_kw}kW</Badge>
                {areas.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); removeArea(area.id); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>
              {isOpen && (
                <CardContent className="pt-0 pb-4 border-t bg-gray-50 space-y-3">
                  <div className="pt-3">
                    <Input value={area.name} onChange={e => upd(area.id, 'name', e.target.value)} placeholder="Nombre" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[['length','Largo (m)'],['width','Ancho (m)'],['height','Alto (m)']].map(([f, l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label>
                        <Input type="number" inputMode="decimal" value={area[f]} onChange={e => upd(area.id, f, e.target.value)} />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[['numPeople','Personas'],['equipHeat','Calor equipos (W)']].map(([f, l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label>
                        <Input type="number" inputMode="decimal" value={area[f] || ''} onChange={e => upd(area.id, f, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {results && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Carga total',  value: results.totalW.toLocaleString('es-ES') + ' W',  cls: 'bg-red-50 border-red-200 text-red-700' },
              { label: 'Frigorías/h',  value: results.totalFrig.toLocaleString('es-ES'),       cls: 'bg-orange-50 border-orange-200 text-orange-700' },
              { label: 'Potencia kW',  value: results.totalKw + ' kW',                         cls: 'bg-blue-50 border-blue-200 text-blue-700' },
              { label: 'Zonas',        value: areas.length,                                     cls: 'bg-green-50 border-green-200 text-green-700' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={'border rounded-xl p-3 text-center ' + cls}>
                <p className="text-[11px] font-medium opacity-70">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          {results.res.length > 0 && (
            <Card>
              <CardHeader className="py-3"><CardTitle className="text-sm">Carga por zona (W)</CardTitle></CardHeader>
              <CardContent className="p-3 pt-0">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={results.res.map(r => ({ name: r.area.name, watios: r.watios }))}
                    margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
                  >
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => [`${v.toLocaleString('es-ES')} W`, 'Carga']} />
                    <Bar dataKey="watios" radius={[4, 4, 0, 0]}>
                      {results.res.map((r, i) => (
                        <Cell key={r.area.id} fill={['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'][i % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-gray-400 mt-1">Carga térmica calculada de cada zona en vatios.</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Cargas por zona</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-100 text-xs text-gray-500">
                  <th className="text-left p-2">Zona</th><th className="text-right p-2">W</th>
                  <th className="text-right p-2">kW</th><th className="text-right p-2">Frig/h</th><th className="text-left p-2">Unidad interior</th>
                </tr></thead>
                <tbody className="divide-y">
                  {results.res.map((r, i) => (
                    <tr key={r.area.id} className={i%2===0?'bg-white':'bg-gray-50'}>
                      <td className="p-2 font-medium">{r.area.name}</td>
                      <td className="p-2 text-right text-red-600 font-semibold">{r.watios.toLocaleString('es-ES')}</td>
                      <td className="p-2 text-right text-blue-600 font-semibold">{r.power_kw}</td>
                      <td className="p-2 text-right text-orange-600">{r.frigorias.toLocaleString('es-ES')}</td>
                      <td className="p-2 text-xs">{r.unit.brand} {r.unit.model} {r.unit.power_kw}kW</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Unidades exteriores</CardTitle></CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {results.candidates.length > 0 ? results.candidates.map((ext, i) => (
                <div key={ext.model} className={'p-3 rounded-lg border ' + (i===0?'border-green-300 bg-green-50':'border-gray-200 bg-white')}>
                  <div className="flex items-center justify-between">
                    <div>
                      {i===0 && <Badge className="text-[10px] bg-green-600 mb-1">Recomendada</Badge>}
                      <p className="font-semibold">{ext.brand} {ext.model}</p>
                      <p className="text-xs text-gray-500">{ext.zones} zonas · {ext.power_kw} kW · {ext.gas}</p>
                    </div>
                    <Badge variant="outline">{ext.power_kw} kW</Badge>
                  </div>
                </div>
              )) : <p className="text-sm text-orange-600">No hay unidad exterior para {areas.length} zonas con {results.totalKw}kW.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3"><CardTitle className="text-sm">Materiales</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-100 text-xs text-gray-500">
                  <th className="text-left p-2">Material</th><th className="text-right p-2">Cant.</th><th className="text-left p-2">Ud.</th>
                </tr></thead>
                <tbody className="divide-y">
                  {results.materials.map((m, i) => (
                    <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}>
                      <td className="p-2">{m.item}</td>
                      <td className="p-2 text-right font-semibold">{m.qty}</td>
                      <td className="p-2 text-gray-500">{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
