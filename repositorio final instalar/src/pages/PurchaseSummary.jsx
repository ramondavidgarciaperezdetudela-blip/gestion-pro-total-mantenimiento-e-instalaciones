import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, Building2, TrendingDown, Loader2, Search, FolderOpen } from 'lucide-react';

const COLORS = ['#1e3a5f', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function PurchaseSummary() {
  const [prices, setPrices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');

  useEffect(() => {
    Promise.all([
      base44.entities.SupplierPrice.list('-created_date', 1000),
      base44.entities.Supplier.list('name', 100),
      base44.entities.Invoice.list('-date', 500),
    ]).then(([p, s, inv]) => {
      setPrices(p);
      setSuppliers(s);
      setInvoices(inv);
      setLoading(false);
    });
  }, []);

  // ── Top materiales más comprados (por aparición en facturas + tarifas) ──────
  const topMaterials = useMemo(() => {
    const counter = {};
    // Contar por nombre de producto en tarifas
    prices.forEach(p => {
      const key = p.product_name?.trim().toLowerCase();
      if (!key) return;
      if (!counter[key]) counter[key] = { name: p.product_name, count: 0, totalCost: 0, suppliers: new Set() };
      counter[key].count += 1;
      counter[key].totalCost += p.cost_price || 0;
      if (p.supplier_name) counter[key].suppliers.add(p.supplier_name);
    });
    return Object.values(counter)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map(m => ({ ...m, suppliers: [...m.suppliers] }));
  }, [prices]);

  // ── Proveedores más baratos (precio medio de sus productos) ──────────────────
  const supplierStats = useMemo(() => {
    const map = {};
    prices.forEach(p => {
      const sid = p.supplier_id || p.supplier_name;
      if (!sid) return;
      if (!map[sid]) map[sid] = { name: p.supplier_name || sid, logo_url: suppliers.find(s => s.id === sid)?.logo_url, totalCost: 0, count: 0, minPrice: Infinity, maxPrice: 0 };
      const cost = p.cost_price || 0;
      map[sid].totalCost += cost;
      map[sid].count += 1;
      if (cost > 0 && cost < map[sid].minPrice) map[sid].minPrice = cost;
      if (cost > map[sid].maxPrice) map[sid].maxPrice = cost;
    });
    return Object.values(map)
      .filter(s => s.count > 0)
      .map(s => ({ ...s, avgPrice: s.totalCost / s.count, minPrice: s.minPrice === Infinity ? 0 : s.minPrice }))
      .sort((a, b) => a.avgPrice - b.avgPrice);
  }, [prices, suppliers]);

  // ── Gasto por categoría/proyecto (agrupado por tipo de trabajo en facturas) ─
  const spendByCategory = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      const cat = inv.work_type || inv.doc_type || 'otro';
      if (!map[cat]) map[cat] = { name: cat, total: 0, count: 0 };
      map[cat].total += inv.total || 0;
      map[cat].count += 1;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices]);

  const filteredMaterials = useMemo(() => {
    const q = search.toLowerCase();
    return topMaterials.filter(m => {
      const matchQ = !q || m.name.toLowerCase().includes(q);
      const matchS = filterSupplier === 'all' || m.suppliers.some(s => s.toLowerCase().includes(filterSupplier.toLowerCase()));
      return matchQ && matchS;
    });
  }, [topMaterials, search, filterSupplier]);

  const totalGasto = invoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const totalProductos = prices.length;
  const totalProveedores = new Set(prices.map(p => p.supplier_id).filter(Boolean)).size;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando resumen...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen de Compras</h1>
        <p className="text-sm text-gray-500 mt-0.5">Análisis de materiales, proveedores y gasto por proyecto</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total facturado', value: `${totalGasto.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`, color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Productos en tarifas', value: totalProductos.toLocaleString(), color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'Proveedores activos', value: totalProveedores, color: 'bg-purple-50 border-purple-200 text-purple-700' },
          { label: 'Facturas emitidas', value: invoices.length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
        ].map((kpi, i) => (
          <div key={i} className={`border rounded-xl p-4 text-center ${kpi.color}`}>
            <p className="text-2xl font-bold">{kpi.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-75">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Gasto por tipo de trabajo */}
      {spendByCategory.length > 0 && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Gasto total por tipo de trabajo</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spendByCategory} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${v.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €`} />
              <Tooltip formatter={(v) => [`${Number(v).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`, 'Total']} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {spendByCategory.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {spendByCategory.map((cat, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-xs text-gray-700 capitalize">{cat.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{cat.total.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proveedores más baratos */}
      {supplierStats.length > 0 && (
        <div className="bg-white border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-5 h-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900">Proveedores por precio medio</h2>
            <Badge className="bg-emerald-100 text-emerald-700 text-xs ml-auto">más barato primero</Badge>
          </div>
          <div className="space-y-2">
            {supplierStats.map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-50 transition-colors">
                <span className="text-lg font-black text-gray-300 w-6 text-center">{i + 1}</span>
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {s.logo_url
                    ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" />
                    : <Building2 className="w-4 h-4 text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.count} productos · desde {s.minPrice.toFixed(2)} €</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-bold ${i === 0 ? 'text-emerald-600' : 'text-gray-700'}`}>
                    {i === 0 && '⭐ '}{s.avgPrice.toFixed(2)} €
                  </p>
                  <p className="text-[10px] text-gray-400">precio medio</p>
                </div>
                {/* Barra visual relativa */}
                <div className="w-20 bg-gray-100 rounded-full h-2 flex-shrink-0">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(100, (s.avgPrice / (supplierStats[supplierStats.length - 1]?.avgPrice || 1)) * 100)}%`,
                      background: COLORS[i % COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materiales más comprados */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-gray-900">Materiales más frecuentes en tarifas</h2>
          <div className="ml-auto flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input
                placeholder="Buscar material..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 text-sm h-8 w-44"
              />
            </div>
            <Select value={filterSupplier} onValueChange={setFilterSupplier}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Todos los proveedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No hay materiales con los filtros actuales</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Material</th>
                  <th className="text-center p-3">Apariciones</th>
                  <th className="text-right p-3">Precio medio</th>
                  <th className="text-left p-3 hidden sm:table-cell">Proveedores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredMaterials.map((m, i) => (
                  <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-3 text-gray-400 font-mono text-xs">{i + 1}</td>
                    <td className="p-3">
                      <p className="font-medium text-gray-900 line-clamp-2">{m.name}</p>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="bg-blue-100 rounded-full px-2 py-0.5 text-blue-700 text-xs font-bold">
                          {m.count}x
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold text-gray-800">
                      {m.count > 0 ? `${(m.totalCost / m.count).toFixed(2)} €` : '—'}
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {m.suppliers.slice(0, 3).map((s, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] py-0">{s}</Badge>
                        ))}
                        {m.suppliers.length > 3 && (
                          <Badge variant="outline" className="text-[10px] py-0">+{m.suppliers.length - 3}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}