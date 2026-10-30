import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Package, Building2, TrendingDown, Loader2, Search, FolderOpen } from 'lucide-react';

const COLORS = ['#1e3a5f', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

// ⚡ Bolt: Extracted sub-components to prevent redundant re-renders
function SupplierCard({ s, i, maxAvgPrice }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border hover:bg-gray-50 transition-colors">
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
      <div className="w-20 bg-gray-100 rounded-full h-2 flex-shrink-0">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(100, (s.avgPrice / (maxAvgPrice || 1)) * 100)}%`,
            background: COLORS[i % COLORS.length],
          }}
        />
      </div>
    </div>
  );
}

function MaterialRow({ m, i }) {
  return (
    <tr className="hover:bg-blue-50/30 transition-colors">
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
  );
}

const MemoizedSupplierCard = React.memo(SupplierCard);
const MemoizedMaterialRow = React.memo(MaterialRow);

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

  // ⚡ Bolt: Consolidated O(N) data processing to minimize iterations and stabilize KPIs
  const stats = useMemo(() => {
    const materialCounter = {};
    const supplierMap = {};
    const categoryMap = {};
    const activeSupplierIds = new Set();

    // O(1) Map for supplier metadata
    const supplierMetaMap = new Map(suppliers.map(s => [s.id, s]));

    // Single pass over prices (up to 1000 items)
    prices.forEach(p => {
      // 1. Process Materials
      const mKey = p.product_name?.trim().toLowerCase();
      if (mKey) {
        if (!materialCounter[mKey]) {
          materialCounter[mKey] = { name: p.product_name, count: 0, totalCost: 0, suppliers: new Set() };
        }
        materialCounter[mKey].count += 1;
        materialCounter[mKey].totalCost += p.cost_price || 0;
        if (p.supplier_name) materialCounter[mKey].suppliers.add(p.supplier_name);
      }

      // 2. Process Supplier stats
      const sid = p.supplier_id || p.supplier_name;
      if (sid) {
        activeSupplierIds.add(p.supplier_id);
        if (!supplierMap[sid]) {
          supplierMap[sid] = {
            name: p.supplier_name || sid,
            logo_url: supplierMetaMap.get(p.supplier_id)?.logo_url,
            totalCost: 0,
            count: 0,
            minPrice: Infinity,
            maxPrice: 0
          };
        }
        const cost = p.cost_price || 0;
        supplierMap[sid].totalCost += cost;
        supplierMap[sid].count += 1;
        if (cost > 0 && cost < supplierMap[sid].minPrice) supplierMap[sid].minPrice = cost;
        if (cost > supplierMap[sid].maxPrice) supplierMap[sid].maxPrice = cost;
      }
    });

    // Single pass over invoices (up to 500 items)
    let totalGastoVal = 0;
    invoices.forEach(inv => {
      totalGastoVal += (inv.total || 0);
      const cat = inv.work_type || inv.doc_type || 'otro';
      if (!categoryMap[cat]) categoryMap[cat] = { name: cat, total: 0, count: 0 };
      categoryMap[cat].total += inv.total || 0;
      categoryMap[cat].count += 1;
    });

    return {
      allMaterials: Object.values(materialCounter)
        .sort((a, b) => b.count - a.count)
        .map(m => ({ ...m, suppliers: [...m.suppliers] })),
      supplierStats: Object.values(supplierMap)
        .filter(s => s.count > 0)
        .map(s => ({ ...s, avgPrice: s.totalCost / s.count, minPrice: s.minPrice === Infinity ? 0 : s.minPrice }))
        .sort((a, b) => a.avgPrice - b.avgPrice),
      spendByCategory: Object.values(categoryMap).sort((a, b) => b.total - a.total),
      totalGasto: totalGastoVal,
      totalProductos: prices.length,
      totalProveedores: activeSupplierIds.size
    };
  }, [prices, suppliers, invoices]);

  // ⚡ Bolt: Efficient filtering logic on memoized results
  const filteredMaterials = useMemo(() => {
    const q = search.toLowerCase();
    const sFilter = filterSupplier === 'all' ? null : filterSupplier.toLowerCase();

    return stats.allMaterials
      .filter(m => {
        const matchQ = !q || m.name.toLowerCase().includes(q);
        const matchS = !sFilter || m.suppliers.some(s => s.toLowerCase().includes(sFilter));
        return matchQ && matchS;
      })
      .slice(0, 50); // Limit rendered list for DOM performance while allowing deeper search
  }, [stats.allMaterials, search, filterSupplier]);

  const handleSearch = useCallback((e) => setSearch(e.target.value), []);
  const handleFilterSupplier = useCallback((val) => setFilterSupplier(val), []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando resumen...
      </div>
    );
  }

  const { totalGasto, totalProductos, totalProveedores, spendByCategory, supplierStats } = stats;
  const maxAvgPrice = supplierStats[supplierStats.length - 1]?.avgPrice || 1;

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
              <Tooltip formatter={(v) => [`${typeof v === 'number' ? v.toLocaleString('es-ES', { minimumFractionDigits: 2 }) : v} €`, 'Total']} />
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
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs ml-auto border-transparent shadow-none">más barato primero</Badge>
          </div>
          <div className="space-y-2">
            {supplierStats.map((s, i) => (
              <MemoizedSupplierCard key={s.name} s={s} i={i} maxAvgPrice={maxAvgPrice} />
            ))}
          </div>
        </div>
      )}

      {/* Materiales más frecuentes */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Package className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-gray-900">Materiales más frecuentes en tarifas</h2>
          <div className="ml-auto flex gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                placeholder="Buscar material..."
                value={search}
                onChange={handleSearch}
                className="flex h-8 w-44 rounded-md border border-input bg-transparent pl-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <select
              value={filterSupplier}
              onChange={(e) => handleFilterSupplier(e.target.value)}
              className="w-40 h-8 text-sm rounded-md border border-input bg-transparent px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">Todos los proveedores</option>
              {suppliers.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
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
                  <MemoizedMaterialRow key={m.name} m={m} i={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}