import React, { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SUPPLIER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
];

function normalizeName(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function similarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Coincidencia de palabras clave
  const wordsA = na.split(/\s+/);
  const wordsB = nb.split(/\s+/);
  const common = wordsA.filter(w => w.length > 3 && wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return common.length / Math.max(wordsA.length, wordsB.length);
}

/**
 * Muestra la evolución de precio de un producto a lo largo del tiempo,
 * comparando distintos proveedores.
 *
 * Props:
 *   - product: objeto SupplierPrice (el producto seleccionado)
 *   - allPrices: array de todos los SupplierPrice
 */
export default function ProductPriceHistoryChart({ product, allPrices = [] }) {
  const { chartData, suppliers, trend, minPrice, maxPrice } = useMemo(() => {
    if (!product || !allPrices.length) return { chartData: [], suppliers: [], trend: 0, minPrice: null, maxPrice: null };

    // Encontrar productos similares en todos los proveedores
    const related = allPrices.filter(p => {
      if (p.id === product.id) return true;
      const sim = similarity(p.product_name, product.product_name);
      if (sim >= 0.6) return true;
      if (product.product_code && p.product_code && p.product_code === product.product_code) return true;
      return false;
    });

    if (related.length === 0) return { chartData: [], suppliers: [], trend: 0, minPrice: null, maxPrice: null };

    // Agrupar por proveedor
    const bySupplier = {};
    related.forEach(p => {
      const key = p.supplier_name || p.supplier_id || 'Sin proveedor';
      if (!bySupplier[key]) bySupplier[key] = [];
      bySupplier[key].push(p);
    });

    const supplierNames = Object.keys(bySupplier);

    // Construir eje de tiempo usando created_date / updated_date
    // Para cada producto tomamos su fecha de creación como "punto en el tiempo"
    // y construimos una línea con los precios
    const allDates = new Set();
    related.forEach(p => {
      const d = p.created_date || p.updated_date;
      if (d) {
        const dateStr = d.substring(0, 10);
        allDates.add(dateStr);
      }
    });

    // Si solo hay 1 punto, simulamos una línea de 2 puntos para que se vea
    let sortedDates = Array.from(allDates).sort();
    if (sortedDates.length < 2) {
      // Añadir la fecha de hoy como segundo punto
      const today = new Date().toISOString().substring(0, 10);
      if (!sortedDates.includes(today)) sortedDates.push(today);
      if (sortedDates.length < 2) {
        // Crear un punto "anterior" artificialmente
        const prev = new Date();
        prev.setMonth(prev.getMonth() - 1);
        sortedDates.unshift(prev.toISOString().substring(0, 10));
      }
    }

    // Para cada fecha, el precio de cada proveedor es el del producto más reciente
    // con fecha <= esa fecha
    const chartData = sortedDates.map(date => {
      const point = { date: date.substring(5) }; // MM-DD
      supplierNames.forEach(sName => {
        const items = bySupplier[sName];
        // Último precio con fecha <= date
        const relevant = items
          .filter(p => {
            const d = p.created_date || p.updated_date;
            return d && d.substring(0, 10) <= date;
          })
          .sort((a, b) => {
            const da = a.created_date || a.updated_date || '';
            const db = b.created_date || b.updated_date || '';
            return da < db ? -1 : 1;
          });
        const last = relevant[relevant.length - 1] || items[0];
        if (last?.cost_price != null) {
          point[sName] = Number(Number(last.cost_price).toFixed(2));
        }
      });
      return point;
    });

    // Calcular tendencia del producto actual
    const currentSupplierData = chartData.map(d => d[product.supplier_name]).filter(v => v != null);
    let trend = 0;
    if (currentSupplierData.length >= 2) {
      trend = ((currentSupplierData[currentSupplierData.length - 1] - currentSupplierData[0]) / currentSupplierData[0]) * 100;
    }

    const allValues = chartData.flatMap(d => supplierNames.map(s => d[s]).filter(v => v != null));
    const minPrice = allValues.length ? Math.min(...allValues) : null;
    const maxPrice = allValues.length ? Math.max(...allValues) : null;

    return { chartData, suppliers: supplierNames, trend, minPrice, maxPrice };
  }, [product, allPrices]);

  if (!product) return null;

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-red-600' : trend < 0 ? 'text-green-600' : 'text-gray-400';
  const trendBg = trend > 0 ? 'bg-red-50 border-red-200' : trend < 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200';

  if (chartData.length === 0 || suppliers.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-xs">
        <TrendingUp className="w-6 h-6 mx-auto mb-1 opacity-30" />
        Sin historial de precios suficiente
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Mini KPIs */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`border rounded-lg p-2 ${trendBg}`}>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">Tendencia</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
          <p className="text-xs font-bold text-green-700">{minPrice != null ? `${minPrice.toFixed(2)} €` : '—'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Precio mínimo</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-xs font-bold text-red-700">{maxPrice != null ? `${maxPrice.toFixed(2)} €` : '—'}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Precio máximo</p>
        </div>
      </div>

      <div className="text-xs text-gray-500 font-medium">{suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''} comparados</div>

      {/* Gráfica */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}€`} />
          <Tooltip
            formatter={(value, name) => [`${Number(value).toFixed(2)} €`, name]}
            labelFormatter={l => `Fecha: ${l}`}
            contentStyle={{ fontSize: 11 }}
          />
          {suppliers.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
          {suppliers.map((sName, i) => (
            <Line
              key={sName}
              type="monotone"
              dataKey={sName}
              stroke={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]}
              strokeWidth={sName === product.supplier_name ? 2.5 : 1.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}