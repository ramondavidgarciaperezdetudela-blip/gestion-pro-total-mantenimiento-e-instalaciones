import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, TrendingDown, Building2, Award, AlertCircle, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

// Similitud simple de strings: palabras clave en común
function similarity(a, b) {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  if (!wordsA.length || !wordsB.length) return 0;
  const matches = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return matches.length / Math.max(wordsA.length, wordsB.length);
}

// Agrupa productos similares de distintos proveedores
function buildComparisons(prices) {
  const used = new Set();
  const groups = [];

  for (let i = 0; i < prices.length; i++) {
    if (used.has(i)) continue;
    const base = prices[i];
    const group = [base];
    used.add(i);

    for (let j = i + 1; j < prices.length; j++) {
      if (used.has(j)) continue;
      const candidate = prices[j];
      // No comparar mismo proveedor
      if (candidate.supplier_id === base.supplier_id) continue;

      // Comparar por código exacto primero, luego por similitud de nombre
      const sameCode = base.product_code && candidate.product_code &&
        base.product_code.trim().toLowerCase() === candidate.product_code.trim().toLowerCase();
      const nameSim = similarity(base.product_name || '', candidate.product_name || '');

      if (sameCode || nameSim >= 0.55) {
        group.push(candidate);
        used.add(j);
      }
    }

    if (group.length > 1) {
      groups.push(group.sort((a, b) => (a.cost_price || 0) - (b.cost_price || 0)));
    }
  }

  return groups;
}

export default function PriceComparator({ prices = [], suppliers = [] }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  const comparisons = useMemo(() => {
    // Filtrar solo productos con precio
    const withPrice = prices.filter(p => p.cost_price > 0 && p.product_name);
    return buildComparisons(withPrice);
  }, [prices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return comparisons;
    return comparisons.filter(group =>
      group.some(p =>
        p.product_name?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q) ||
        p.supplier_name?.toLowerCase().includes(q)
      )
    );
  }, [comparisons, search]);

  const toggle = (i) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i); else next.add(i);
    return next;
  });

  const totalSavings = useMemo(() => {
    return filtered.reduce((acc, group) => {
      const cheapest = group[0].cost_price || 0;
      const mostExpensive = group[group.length - 1].cost_price || 0;
      return acc + (mostExpensive - cheapest);
    }, 0);
  }, [filtered]);

  if (prices.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <TrendingDown className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No hay tarifas cargadas</p>
        <p className="text-sm mt-1">Importa tarifas de al menos 2 proveedores para comparar precios</p>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No se encontraron productos comparables</p>
        <p className="text-sm mt-1">Los productos deben tener nombres o códigos similares entre proveedores</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{filtered.length}</p>
          <p className="text-xs text-blue-600 font-medium">Grupos comparables</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{totalSavings.toFixed(2)} €</p>
          <p className="text-xs text-emerald-600 font-medium">Ahorro potencial por producto</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-bold text-purple-700">{new Set(prices.map(p => p.supplier_id)).size}</p>
          <p className="text-xs text-purple-600 font-medium">Proveedores analizados</p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Buscar producto o proveedor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista de grupos */}
      <div className="space-y-2">
        {filtered.map((group, idx) => {
          const best = group[0]; // más barato (ya ordenado)
          const worst = group[group.length - 1]; // más caro
          const saving = ((worst.cost_price - best.cost_price) / worst.cost_price * 100).toFixed(0);
          const isOpen = expanded.has(idx);

          return (
            <div key={idx} className="border rounded-xl overflow-hidden shadow-sm bg-white">
              {/* Cabecera del grupo */}
              <button
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
                onClick={() => toggle(idx)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{best.product_name}</p>
                  {best.product_code && (
                    <p className="text-xs text-gray-400 font-mono">{best.product_code}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                    -{saving}%
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    {best.cost_price?.toFixed(2)} €
                  </span>
                  <span className="text-xs text-gray-400">
                    vs {worst.cost_price?.toFixed(2)} €
                  </span>
                  <Badge variant="outline" className="text-[10px]">{group.length} prov.</Badge>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Detalle de proveedores */}
              {isOpen && (
                <div className="border-t bg-gray-50 divide-y divide-gray-100">
                  {group.map((item, rank) => {
                    const isBest = rank === 0;
                    const diffPct = best.cost_price > 0
                      ? ((item.cost_price - best.cost_price) / best.cost_price * 100).toFixed(1)
                      : '0';
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-4 py-3 ${isBest ? 'bg-emerald-50' : 'bg-white'}`}
                      >
                        {isBest
                          ? <Award className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : <span className="w-4 h-4 text-center text-xs text-gray-400 flex-shrink-0 font-mono">{rank + 1}</span>
                        }
                        <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {(() => {
                            const supp = suppliers.find(s => s.id === item.supplier_id);
                            return supp?.logo_url
                              ? <img src={supp.logo_url} alt="" className="w-full h-full object-cover" />
                              : <Building2 className="w-3.5 h-3.5 text-gray-400" />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${isBest ? 'text-emerald-800' : 'text-gray-700'}`}>
                            {item.supplier_name}
                          </p>
                          {item.product_code && (
                            <p className="text-xs text-gray-400 font-mono truncate">{item.product_code}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold text-sm ${isBest ? 'text-emerald-700' : 'text-gray-800'}`}>
                            {item.cost_price?.toFixed(2)} €
                          </p>
                          {!isBest && (
                            <p className="text-xs text-red-500">+{diffPct}%</p>
                          )}
                          {isBest && (
                            <p className="text-xs text-emerald-600 font-medium">✓ Más barato</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${item.product_name} — ${item.supplier_name} — ${item.cost_price?.toFixed(2)} €`);
                            toast.success('Copiado al portapapeles');
                          }}
                          className="p-1.5 text-gray-300 hover:text-gray-600 rounded flex-shrink-0"
                          title="Copiar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}