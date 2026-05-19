import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, TrendingDown, Building2, Award, AlertCircle, X, Zap, FileText, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import ComparatorToBudgetDialog from './ComparatorToBudgetDialog';

// ── Similitud de nombres ──────────────────────────────────────────────────────
/**
 * Calculates similarity between two pre-tokenized word arrays.
 * Optimization: Hoists string processing out of the O(n^2) loop.
 */
function similarity(wordsA, wordsB) {
  if (!wordsA?.length || !wordsB?.length) return 0;
  const matches = wordsA.filter(w => wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  return matches.length / Math.max(wordsA.length, wordsB.length);
}

// ── Agrupa productos similares de distintos proveedores ───────────────────────
function buildComparisons(prices) {
  // Pre-process prices to avoid redundant string operations in the O(N^2) loop
  const processedPrices = prices.map(p => ({
    ...p,
    _normalizedCode: p.product_code?.trim().toLowerCase() || null,
    _nameTokens: (p.product_name || '').toLowerCase().split(/\s+/).filter(w => w.length > 3)
  }));

  const used = new Set();
  const groups = [];

  for (let i = 0; i < processedPrices.length; i++) {
    if (used.has(i)) continue;
    const base = processedPrices[i];
    const group = [base];
    used.add(i);

    for (let j = i + 1; j < processedPrices.length; j++) {
      if (used.has(j)) continue;
      const candidate = processedPrices[j];
      if (candidate.supplier_id === base.supplier_id) continue;

      // Exact code match (pre-normalized)
      const sameCode = base._normalizedCode && candidate._normalizedCode &&
        base._normalizedCode === candidate._normalizedCode;

      // Fuzzy name similarity (pre-tokenized)
      const nameSim = sameCode ? 1 : similarity(base._nameTokens, candidate._nameTokens);

      if (sameCode || nameSim >= 0.55) {
        group.push(candidate);
        used.add(j);
      }
    }

    if (group.length > 1) {
      // Sort group by price to show the best deal first
      groups.push(group.sort((a, b) => (a.cost_price || 0) - (b.cost_price || 0)));
    }
  }

  return groups;
}

// ── Highlight texto buscado ───────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query || !text) return <>{text || ''}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Sugerencias inteligentes ──────────────────────────────────────────────────
function buildSuggestions(prices, query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const seen = new Set();
  const suggestions = [];

  for (const p of prices) {
    const fields = [
      { val: p.product_name, type: 'nombre' },
      { val: p.product_code, type: 'referencia' },
      { val: p.brand, type: 'marca' },
    ];
    for (const { val, type } of fields) {
      if (!val) continue;
      const lower = val.toLowerCase();
      if (lower.includes(q) && !seen.has(val)) {
        seen.add(val);
        suggestions.push({ val, type });
        if (suggestions.length >= 6) return suggestions;
      }
    }
  }
  return suggestions;
}

export default function PriceComparator({ prices = [], suppliers = [] }) {
  const [search, setSearch] = useState('');
  const [inputVal, setInputVal] = useState('');
  const [showSugg, setShowSugg] = useState(false);
  // selectedItems: map de item.id → item (el más barato del grupo seleccionado)
  const [selectedItems, setSelectedItems] = useState({});
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const inputRef = useRef(null);
  const suggRef = useRef(null);

  // Cierra sugerencias al hacer click fuera
  useEffect(() => {
    const handler = (e) => {
      if (!suggRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setShowSugg(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => buildSuggestions(prices, inputVal), [prices, inputVal]);

  const comparisons = useMemo(() => {
    const withPrice = prices.filter(p => p.cost_price > 0 && p.product_name);
    return buildComparisons(withPrice);
  }, [prices]);

  const allSupplierIds = useMemo(() => {
    const ids = [...new Set(prices.map(p => p.supplier_id).filter(Boolean))];
    return ids;
  }, [prices]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return comparisons;
    return comparisons.filter(group =>
      group.some(p =>
        p.product_name?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.supplier_name?.toLowerCase().includes(q)
      )
    );
  }, [comparisons, search]);

  const toggleSelect = (groupBestItem) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[groupBestItem.id]) delete next[groupBestItem.id];
      else next[groupBestItem.id] = groupBestItem;
      return next;
    });
  };

  const selectedCount = Object.keys(selectedItems).length;
  const selectedList = Object.values(selectedItems);

  const applySearch = (val) => {
    setSearch(val);
    setInputVal(val);
    setShowSugg(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') applySearch(inputVal);
    if (e.key === 'Escape') { setShowSugg(false); setInputVal(''); setSearch(''); }
  };

  // Calcular columnas únicas de proveedores que aparecen en los grupos filtrados
  const supplierCols = useMemo(() => {
    // Optimization: Single pass to find unique supplier IDs and samples from filtered data
    // Use a Map for O(1) lookup of supplier metadata
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));
    const foundSupplierIds = new Map(); // id -> sample item

    for (const group of filtered) {
      for (const item of group) {
        if (item.supplier_id && !foundSupplierIds.has(item.supplier_id)) {
          foundSupplierIds.set(item.supplier_id, item);
        }
      }
    }

    return Array.from(foundSupplierIds.entries()).map(([id, sample]) => {
      const supp = supplierMap.get(id);
      return {
        id,
        name: supp?.name || sample?.supplier_name || id,
        logo_url: supp?.logo_url
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, suppliers]);

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
      {/* ── Buscador inteligente ── */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-white border-2 border-blue-200 focus-within:border-blue-500 rounded-xl px-3 py-2 shadow-sm transition-colors">
          <Search className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 outline-none text-sm placeholder-gray-400 bg-transparent"
            placeholder="Buscar por nombre, marca, referencia… (Ej: compresor Daikin, R-410A, 000123)"
            value={inputVal}
            onChange={e => { setInputVal(e.target.value); setSearch(e.target.value); setShowSugg(true); }}
            onFocus={() => setShowSugg(true)}
            onKeyDown={handleKeyDown}
          />
          {inputVal && (
            <button onClick={() => applySearch('')} className="text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          )}
          {search && (
            <Badge className="bg-blue-100 text-blue-700 text-xs">
              {filtered.length} resultados
            </Badge>
          )}
        </div>

        {/* Sugerencias dropdown */}
        {showSugg && suggestions.length > 0 && (
          <div ref={suggRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left transition-colors"
                onMouseDown={() => applySearch(s.val)}
              >
                <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="flex-1 text-sm text-gray-800 truncate">
                  <Highlight text={s.val} query={inputVal} />
                </span>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.type}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-blue-700">{filtered.length}</p>
          <p className="text-xs text-blue-600 font-medium">Grupos comparables</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-emerald-700">{supplierCols.length}</p>
          <p className="text-xs text-emerald-600 font-medium">Proveedores</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-700">
            {filtered.reduce((acc, g) => {
              const s = (g[g.length - 1].cost_price || 0) - (g[0].cost_price || 0);
              return acc + s;
            }, 0).toFixed(2)} €
          </p>
          <p className="text-xs text-amber-600 font-medium">Ahorro potencial</p>
        </div>
      </div>

      {/* ── Banner selección activa ── */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between bg-blue-700 text-white rounded-xl px-4 py-3 shadow-md">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5" />
            <span className="font-semibold">{selectedCount} producto{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSelectedItems({})} className="text-blue-200 hover:text-white text-xs underline">
              Deseleccionar todo
            </button>
            <Button
              size="sm"
              className="bg-white text-blue-700 hover:bg-blue-50 gap-1.5 font-bold"
              onClick={() => setShowBudgetDialog(true)}
            >
              <FileText className="w-4 h-4" />
              Generar presupuesto
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-medium">Sin resultados para "{search}"</p>
          <p className="text-sm mt-1">Prueba con otro nombre, marca o referencia</p>
        </div>
      )}

      {/* ── Vista comparativa lado a lado ── */}
      {filtered.length > 0 && supplierCols.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-3 w-10 text-center">
                  <CheckSquare className="w-4 h-4 text-gray-300 mx-auto" />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-56 sticky left-0 bg-gray-50 z-10">
                  Producto
                </th>
                {supplierCols.map(s => (
                  <th key={s.id} className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[130px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-7 h-7 rounded-lg bg-white border flex items-center justify-center overflow-hidden">
                        {s.logo_url
                          ? <img src={s.logo_url} alt="" className="w-full h-full object-cover" />
                          : <Building2 className="w-4 h-4 text-gray-400" />
                        }
                      </div>
                      <span className="text-xs leading-tight text-center max-w-[110px] truncate">{s.name}</span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center font-semibold text-gray-700 min-w-[90px] bg-emerald-50">
                  <span className="text-emerald-700 text-xs">Ahorro máx.</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((group, idx) => {
                const best = group[0];
                const worst = group[group.length - 1];
                const savingPct = worst.cost_price > 0
                  ? ((worst.cost_price - best.cost_price) / worst.cost_price * 100).toFixed(0)
                  : 0;

                // Mapa supplierId → item de este grupo
                const bySupplier = {};
                group.forEach(item => { bySupplier[item.supplier_id] = item; });

                return (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* Checkbox selección */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!selectedItems[best.id]}
                        onChange={() => toggleSelect(best)}
                        className="w-4 h-4 accent-blue-600 cursor-pointer"
                      />
                    </td>
                    {/* Nombre del producto */}
                    <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-blue-50/40 transition-colors z-10">
                      <p className="font-medium text-gray-900 text-xs leading-tight line-clamp-2">
                        <Highlight text={best.product_name} query={search} />
                      </p>
                      {best.product_code && (
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                          <Highlight text={best.product_code} query={search} />
                        </p>
                      )}
                      {best.brand && (
                        <p className="text-[10px] text-blue-500 font-medium mt-0.5">
                          <Highlight text={best.brand} query={search} />
                        </p>
                      )}
                    </td>

                    {/* Precio por proveedor */}
                    {supplierCols.map(s => {
                      const item = bySupplier[s.id];
                      const isBest = item && item.id === best.id;
                      const diffPct = item && best.cost_price > 0
                        ? ((item.cost_price - best.cost_price) / best.cost_price * 100).toFixed(0)
                        : null;

                      return (
                        <td key={s.id} className={`px-3 py-3 text-center ${isBest ? 'bg-emerald-50' : ''}`}>
                          {item ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className={`flex items-center gap-1 ${isBest ? 'text-emerald-700' : 'text-gray-800'}`}>
                                {isBest && <Award className="w-3 h-3 text-emerald-500" />}
                                <span className={`font-bold text-sm ${isBest ? 'text-emerald-700' : 'text-gray-800'}`}>
                                  {item.cost_price?.toFixed(2)} €
                                </span>
                              </div>
                              {isBest
                                ? <span className="text-[10px] text-emerald-600 font-semibold">✓ más barato</span>
                                : diffPct > 0
                                  ? <span className="text-[10px] text-red-500">+{diffPct}% más caro</span>
                                  : null
                              }
                              {item.unit && <span className="text-[9px] text-gray-400">/{item.unit}</span>}
                              <button
                                title="Copiar"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${item.product_name} | ${s.name} | ${item.cost_price?.toFixed(2)} €`);
                                  toast.success('Copiado');
                                }}
                                className="text-[10px] text-gray-300 hover:text-gray-500 underline mt-0.5"
                              >
                                copiar
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-200 text-lg">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Ahorro máximo */}
                    <td className="px-3 py-3 text-center bg-emerald-50">
                      {savingPct > 0 ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-bold text-emerald-700">-{savingPct}%</span>
                          <span className="text-[10px] text-emerald-600">
                            {((worst.cost_price || 0) - (best.cost_price || 0)).toFixed(2)} €
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <ComparatorToBudgetDialog
        open={showBudgetDialog}
        onClose={() => setShowBudgetDialog(false)}
        selectedItems={selectedList}
      />
    </div>
  );
}