import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, SlidersHorizontal, X, Image } from 'lucide-react';

const CATEGORIES = [
  { value: 'todos', label: 'Todas las categorías' },
  { value: 'mano_obra', label: '🔧 Mano de obra' },
  { value: 'material', label: '📦 Material' },
  { value: 'desplazamiento', label: '🚗 Desplazamiento' },
  { value: 'otro', label: '📋 Otro' },
];

const CAT_COLORS = {
  mano_obra: 'bg-blue-100 text-blue-700',
  material: 'bg-green-100 text-green-700',
  desplazamiento: 'bg-orange-100 text-orange-700',
  otro: 'bg-gray-100 text-gray-600',
};

export default function AdvancedPriceSearch({ onSelect, triggerLabel = 'Buscar precio' }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('todos');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.PriceItem.filter({ is_active: true }).then(data => {
      setItems(data.sort((a, b) => a.description.localeCompare(b.description)));
      setLoading(false);
    });
  }, [open]);

  const filtered = items.filter(item => {
    const matchSearch = !search || item.description.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'todos' || item.category === category;
    const matchMin = !minPrice || (item.unit_price || 0) >= parseFloat(minPrice);
    const matchMax = !maxPrice || (item.unit_price || 0) <= parseFloat(maxPrice);
    return matchSearch && matchCat && matchMin && matchMax;
  });

  const handleSelect = (item) => {
    onSelect && onSelect(item);
    setOpen(false);
    setSearch('');
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium">
        <Search className="w-3 h-3" />{triggerLabel}
      </button>
    );
  }

  return (
    <Card className="border-emerald-200 shadow-lg">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Search className="w-4 h-4 text-emerald-600" />Buscador avanzado de precios
          </p>
          <button onClick={() => setOpen(false)} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de búsqueda */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 text-sm" placeholder="Buscar descripción..." value={search}
              onChange={e => setSearch(e.target.value)} autoFocus />
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${showFilters ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
            <SlidersHorizontal className="w-3.5 h-3.5" />Filtros
          </button>
        </div>

        {/* Filtros avanzados */}
        {showFilters && (
          <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-lg">
            <div>
              <label className="text-[10px] text-gray-500 font-medium">Categoría</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-medium">Precio mín. (€)</label>
              <Input className="h-8 text-xs" type="number" placeholder="0" value={minPrice} onChange={e => setMinPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-medium">Precio máx. (€)</label>
              <Input className="h-8 text-xs" type="number" placeholder="∞" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} />
            </div>
          </div>
        )}

        {/* Resultado contador */}
        <p className="text-[10px] text-gray-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>

        {/* Lista resultados */}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading && <p className="text-center text-gray-400 py-4 text-sm">Cargando...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-center text-gray-400 py-4 text-sm">Sin resultados para esa búsqueda</p>
          )}
          {filtered.map(item => (
            <button key={item.id} onClick={() => handleSelect(item)}
              className="w-full text-left flex items-center gap-2 p-2.5 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors group">
              {/* Imagen */}
              <div className="w-10 h-10 flex-shrink-0 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="w-full h-full object-contain"
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                ) : null}
                <div className={`w-full h-full items-center justify-center ${item.image_url ? 'hidden' : 'flex'}`}>
                  <Image className="w-4 h-4 text-gray-300" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.description}</p>
                {item.notes && <p className="text-[10px] text-gray-400 truncate">{item.notes}</p>}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge className={`text-[9px] ${CAT_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}>{item.category?.replace(/_/g, ' ')}</Badge>
                  <span className="text-[10px] text-gray-400">/{item.unit || 'ud'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-base font-bold text-emerald-700">{(item.unit_price || 0).toFixed(2)}€</span>
                <span className="text-[10px] text-white bg-emerald-500 group-hover:bg-emerald-600 px-2 py-1 rounded-lg transition-colors flex items-center gap-1">
                  <Plus className="w-3 h-3" />Añadir
                </span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}