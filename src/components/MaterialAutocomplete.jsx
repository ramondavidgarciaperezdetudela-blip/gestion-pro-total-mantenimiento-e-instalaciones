import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Package, ChevronRight } from 'lucide-react';
import { buscarIndexado } from '@/lib/buscarArticulos';
import { cargarIndiceArticulos } from '@/lib/articulosProveedores';

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
 */
export default function MaterialAutocomplete({ value, onChange, onSelectItem, placeholder = 'Descripción', className = '' }) {
  const [indice, setIndice] = useState(null);
  const [consulta, setConsulta] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [show, setShow] = useState(false);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const escrito = useRef(false); // solo se busca cuando la persona teclea, no al rellenar una elección

  // Los artículos se cargan una sola vez para todo el programa (ver articulosProveedores.js)
  useEffect(() => { cargarIndiceArticulos().then(setIndice).catch(() => {}); }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!escrito.current) return;
    debounceRef.current = setTimeout(() => { setConsulta(value || ''); setProveedor(''); }, 120);
    return () => clearTimeout(debounceRef.current);
  }, [value]);

  const res = useMemo(() => (indice && escrito.current ? buscarIndexado(indice, consulta, { proveedor, max: 12 }) : null), [indice, consulta, proveedor]);
  const suggestions = res?.items || [];

  useEffect(() => { setShow(!!res && (suggestions.length > 0 || !!proveedor)); }, [res]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyItem = (a) => {
    escrito.current = false;
    const item = {
      description: a.nombre, unit_price: a.precio || 0, unit: a.unidad || 'ud', notes: '',
      supplier_name: a.proveedor || '', product_code: a.ref || '', reference: a.ref || '', delivery_days: a.plazo ?? null,
    };
    onChange && onChange(item.description);
    onSelectItem && onSelectItem(item);
    setShow(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        className={`w-full text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
        placeholder={placeholder}
        value={value}
        onChange={e => { escrito.current = true; onChange && onChange(e.target.value); }}
        onFocus={() => { if (suggestions.length > 0) setShow(true); }}
      />

      {/* Dropdown sugerencias */}
      {show && (
        <div className="absolute z-[200] top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
          {(res?.proveedores?.length || 0) > 1 && (
            <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b bg-gray-50 sticky top-0">
              <button type="button" onMouseDown={(e) => { e.preventDefault(); setProveedor(''); }}
                className={`text-[10px] px-2 py-0.5 rounded-full border ${!proveedor ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>Todos</button>
              {res.proveedores.slice(0, 8).map((p) => (
                <button key={p.nombre} type="button" onMouseDown={(e) => { e.preventDefault(); setProveedor(p.nombre); }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${proveedor === p.nombre ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>{p.nombre} ({p.n})</button>
              ))}
            </div>
          )}
          {suggestions.map((a, i) => (
            <button key={`${a.id || i}-${i}`} type="button"
              className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-emerald-50 border-b last:border-0 transition-colors"
              onMouseDown={e => { e.preventDefault(); applyItem(a); }}>
              <Package className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{a.nombre}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${a.proveedor ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>{a.proveedor || 'Sin proveedor'}</span>
                  {a.ref && <span className="text-[9px] text-gray-500 font-mono">{a.ref}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-sm font-bold text-emerald-700">{(a.precio || 0).toFixed(2)}€</span>
                <span className="text-[9px] text-gray-400">/{a.unidad || 'ud'}</span>
                <ChevronRight className="w-3 h-3 text-gray-300" />
              </div>
            </button>
          ))}
          {suggestions.length === 0 && <p className="text-center text-xs text-gray-400 py-3">Nada con ese texto en este proveedor</p>}
        </div>
      )}
    </div>
  );
}