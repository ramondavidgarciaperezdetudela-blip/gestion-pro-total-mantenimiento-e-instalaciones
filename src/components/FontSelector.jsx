import React, { useState, useEffect, useRef } from 'react';
import { FONT_GROUPS, loadGoogleFont } from '@/lib/fonts';
import { ChevronDown, Search, Type } from 'lucide-react';
import { Input } from '@/components/ui/input';

/**
 * FontSelector — selector de fuentes Windows + Google con previsualización
 * Props:
 *   value       = nombre de fuente actual
 *   onChange    = callback(fontName)
 *   size        = 'sm' | 'md' | 'lg'
 *   showPreview = mostrar preview de la fuente en el botón
 */
export default function FontSelector({ value, onChange, size = 'md', showPreview = true }) {
  const [open, setOpen]   = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup]   = useState('Sistema — Sans-serif');
  const ref = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (font) => {
    // Cargar Google Font si es necesario
    const isGoogle = Object.entries(FONT_GROUPS)
      .filter(([k]) => k.startsWith('Google'))
      .flatMap(([,v]) => v)
      .includes(font);
    if (isGoogle) loadGoogleFont(font);
    onChange(font);
    setOpen(false);
    setSearch('');
  };

  // Filtrar por búsqueda
  const filtered = search.trim()
    ? Object.values(FONT_GROUPS).flat()
        .filter(f => f.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 40)
    : FONT_GROUPS[group] || [];

  const currentGroup = Object.entries(FONT_GROUPS).find(([,v]) => v.includes(value))?.[0] || group;

  const btnH = size === 'sm' ? 'h-7' : size === 'lg' ? 'h-11' : 'h-9';
  const textSz = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  useEffect(() => {
    // Precargar la fuente actual si es Google
    const isGoogle = Object.entries(FONT_GROUPS)
      .filter(([k]) => k.startsWith('Google'))
      .flatMap(([,v]) => v)
      .includes(value);
    if (isGoogle) loadGoogleFont(value);
  }, [value]);

  return (
    <div className="relative" ref={ref}>
      {/* Botón activador */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 border border-slate-200 rounded-lg bg-white hover:border-slate-400 transition-colors ${btnH} ${textSz} min-w-[160px] w-full`}
      >
        <Type className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
        {showPreview ? (
          <span style={{ fontFamily: `'${value}', sans-serif` }} className="flex-1 text-left truncate">
            {value || 'Seleccionar fuente'}
          </span>
        ) : (
          <span className="flex-1 text-left truncate text-slate-700">{value || 'Seleccionar fuente'}</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}/>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 z-[300] bg-white border border-slate-200 rounded-xl shadow-2xl"
          style={{ width: 380, maxHeight: 480 }}>

          {/* Búsqueda */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"/>
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar fuente..."
                className="pl-7 h-7 text-xs" autoFocus/>
            </div>
          </div>

          <div className="flex" style={{ height: 400 }}>
            {/* Grupos (solo si no hay búsqueda) */}
            {!search && (
              <div className="w-44 border-r overflow-y-auto flex-shrink-0 bg-slate-50">
                {Object.keys(FONT_GROUPS).map(g => (
                  <button key={g} onClick={() => setGroup(g)}
                    className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors leading-tight ${
                      group === g ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500' : 'text-slate-600 hover:bg-slate-100'
                    }`}>
                    {g.replace('Sistema — ', '').replace('Google — ', '🌐 ')}
                    {g.startsWith('Sistema') ? '' : ''}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de fuentes */}
            <div className="flex-1 overflow-y-auto p-1">
              {(search ? filtered : FONT_GROUPS[group] || []).map(font => (
                <button key={font} onClick={() => select(font)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                    value === font ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-50 text-slate-800'
                  }`}>
                  <span style={{ fontFamily: `'${font}', 'Arial', sans-serif`, fontSize: 15 }} className="flex-1 truncate">
                    {font}
                  </span>
                  {value === font && <span className="text-blue-500 text-xs flex-shrink-0">✓</span>}
                </button>
              ))}
              {search && filtered.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400">Sin resultados para "{search}"</p>
              )}
            </div>
          </div>

          {/* Previsualización de la fuente actual */}
          <div className="border-t p-2 bg-slate-50">
            <p className="text-[10px] text-slate-400 mb-1">Previsualización: {value}</p>
            <p style={{ fontFamily: `'${value}', 'Arial', sans-serif`, fontSize: 16, lineHeight: 1.4 }}
              className="text-slate-800 truncate">
              AaBbCcDd ÁáÉéÍíÓóÚúÑñ 0123456789
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
