import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Package, ChevronRight } from 'lucide-react';

/**
 * Input de descripción con autocompletado desde PriceItem y SupplierPrice.
 * Cuando el usuario escribe ≥2 caracteres busca coincidencias.
 * Si el ítem tiene varias opciones de proveedor las muestra para que elija.
 *
 * Props:
 *   value         - string
 *   onChange      - (value: string) => void   (solo texto, sin precio)
 *   onSelectItem  - ({ description, unit_price, notes, supplier_name? }) => void
 *   placeholder   - string
 *   className     - string extra para el input
 *   allPrices     - array ya cargado (para evitar re-fetches) [opcional]
 */
export default function MaterialAutocomplete({ value, onChange, onSelectItem, placeholder = 'Descripción', className = '', allPrices }) {
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [localPrices, setLocalPrices] = useState(null);
  const [supplierOptions, setSupplierOptions] = useState(null); // { base: item, options: [SupplierPrice] }
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  // Cargar precios una sola vez si no se pasan desde fuera
  useEffect(() => {
    if (allPrices) return;
    Promise.all([
      base44.entities.PriceItem.filter({ is_active: true }),
      base44.entities.SupplierPrice.filter({ is_active: true }),
    ]).then(([prices, supplierPrices]) => {
      setLocalPrices({ prices, supplierPrices });
    });
  }, [allPrices]);

  const getPrices = useCallback(() => {
    if (allPrices) return allPrices;
    return localPrices;
  }, [allPrices, localPrices]);

  // Buscar sugerencias cuando cambia el texto
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!value || value.length < 2) { setSuggestions([]); setShow(false); return; }
    debounceRef.current = setTimeout(() => {
      const data = getPrices();
      if (!data) return;
      const q = value.toLowerCase();

      // Buscar en PriceItem
      const priceHits = (data.prices || []).filter(p =>
        p.description?.toLowerCase().includes(q) || (p.notes || '').toLowerCase().includes(q)
      ).slice(0, 8).map(p => ({
        type: 'price',
        id: p.id,
        description: p.description,
        unit_price: p.unit_price,
        unit: p.unit || 'ud',
        notes: p.notes,
        category: p.category,
      }));

      // Buscar en SupplierPrice
      const supplierHits = (data.supplierPrices || []).filter(p =>
        p.product_name?.toLowerCase().includes(q) || p.product_code?.toLowerCase().includes(q) || (p.notes || '').toLowerCase().includes(q)
      ).slice(0, 8).map(p => ({
        type: 'supplier',
        id: p.id,
        description: p.product_name,
        unit_price: p.sale_price || p.cost_price,
        unit: p.unit || 'ud',
        notes: p.notes,
        supplier_name: p.supplier_name,
        product_code: p.product_code,
        category: p.category,
      }));

      // Unir y deduplicar por descripción (preferir PriceItem)
      const all = [...priceHits];
      supplierHits.forEach(sh => {
        if (!all.some(ph => ph.description?.toLowerCase() === sh.description?.toLowerCase())) {
          all.push(sh);
        }
      });

      setSuggestions(all.slice(0, 10));
      setShow(all.length > 0);
    }, 220);
  }, [value, getPrices]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) { setShow(false); setSupplierOptions(null); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelectSuggestion = (item) => {
    // Comprobar si hay varias entradas de proveedor para la misma descripción
    const data = getPrices();
    const sameDesc = (data?.supplierPrices || []).filter(sp =>
      sp.product_name?.toLowerCase() === item.description?.toLowerCase() && sp.is_active !== false
    );

    if (sameDesc.length > 1) {
      // Mostrar selector de proveedor
      setSupplierOptions({ base: item, options: sameDesc });
      setShow(false);
    } else {
      applyItem(item);
    }
  };

  const applyItem = (item) => {
    onChange && onChange(item.description);
    onSelectItem && onSelectItem(item);
    setSuggestions([]);
    setShow(false);
    setSupplierOptions(null);
  };

  const handleSupplierChoice = (sp) => {
    applyItem({
      description: sp.product_name,
      unit_price: sp.sale_price || sp.cost_price,
      unit: sp.unit || 'ud',
      notes: sp.notes,
      supplier_name: sp.supplier_name,
      product_code: sp.product_code,
    });
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        className={`w-full text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange && onChange(e.target.value); setSupplierOptions(null); }}
        onFocus={() => { if (suggestions.length > 0) setShow(true); }}
      />

      {/* Dropdown sugerencias */}
      {show && suggestions.length > 0 && (
        <div className="absolute z-[200] top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto">
          {suggestions.map((item) => (
            <button key={item.id} type="button"
              className="w-full text-left flex items-center justify-between gap-2 px-3 py-2 hover:bg-emerald-50 border-b last:border-0 transition-colors"
              onMouseDown={e => { e.preventDefault(); handleSelectSuggestion(item); }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{item.description}</p>
                <div className="flex items-center gap-1.5">
                  {item.supplier_name && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">{item.supplier_name}</span>
                  )}
                  {item.category && (
                    <span className="text-[9px] text-gray-400">{item.category.replace(/_/g, ' ')}</span>
                  )}
                  {item.notes && <span className="text-[9px] text-gray-400 truncate">{item.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-emerald-700">{(item.unit_price || 0).toFixed(2)}€</span>
                <span className="text-[9px] text-gray-400">/{item.unit}</span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selector de proveedor */}
      {supplierOptions && (
        <div className="absolute z-[200] top-full left-0 right-0 mt-0.5 bg-white border border-blue-200 rounded-xl shadow-2xl">
          <div className="px-3 py-2 border-b bg-blue-50 rounded-t-xl">
            <p className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Disponible en varios proveedores — elige:
            </p>
          </div>
          {supplierOptions.options.map((sp) => (
            <button key={sp.id} type="button"
              className="w-full text-left flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-blue-50 border-b last:border-0 transition-colors"
              onMouseDown={e => { e.preventDefault(); handleSupplierChoice(sp); }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{sp.supplier_name}</p>
                {sp.product_code && <p className="text-[9px] text-gray-400">Ref: {sp.product_code}</p>}
                {sp.notes && <p className="text-[9px] text-gray-400 truncate">{sp.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <span className="text-sm font-bold text-emerald-700">{((sp.sale_price || sp.cost_price) || 0).toFixed(2)}€</span>
                {sp.cost_price && sp.sale_price && sp.sale_price !== sp.cost_price && (
                  <span className="text-[9px] text-gray-400">coste: {sp.cost_price.toFixed(2)}€</span>
                )}
              </div>
            </button>
          ))}
          <button type="button"
            className="w-full text-center text-xs text-gray-400 py-1.5 hover:bg-gray-50"
            onMouseDown={e => { e.preventDefault(); applyItem(supplierOptions.base); }}>
            Usar precio sin proveedor específico
          </button>
        </div>
      )}
    </div>
  );
}