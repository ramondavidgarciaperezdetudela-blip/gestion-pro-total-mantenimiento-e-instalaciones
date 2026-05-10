import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Save, Loader2, CheckCircle, Search, Filter, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

// Importar detectNameIssues desde el módulo de actualización online
function detectNameIssues(name) {
  if (!name || name.trim().length < 3) return 'Nombre demasiado corto';
  if (/^[\d\s\-_./,]+$/.test(name)) return 'Solo contiene números o símbolos';
  if (/[ÃÂÃ¿Ã€â€œâ€]/.test(name)) return 'Codificación incorrecta (mojibake)';
  if (/[^\x00-\x7F\u00C0-\u024F\u0400-\u04FF]/u.test(name)) return 'Caracteres inusuales';
  if (name.length > 200) return 'Nombre excesivamente largo';
  if (/^[A-Z0-9]{1,6}$/.test(name)) return 'Parece un código, no un nombre';
  return null;
}

// Celda editable inline
function EditableCell({ value, onSave, placeholder = '', type = 'text', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (draft === value) { setEditing(false); return; }
    setSaving(true);
    await onSave(type === 'number' ? (parseFloat(draft) || 0) : draft.trim());
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-0">
        <Input
          type={type}
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
          className={`h-7 text-xs min-w-0 flex-1 ${className}`}
        />
        <button onClick={handleSave} disabled={saving} className="p-1 text-emerald-600 hover:text-emerald-800 flex-shrink-0">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
        </button>
        <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(value ?? ''); setEditing(true); }}
      className={`w-full text-left text-xs px-1.5 py-1 rounded hover:bg-gray-100 transition-colors group min-w-0 ${className}`}
      title="Clic para editar"
    >
      <span className="block truncate group-hover:underline">{value || <span className="text-gray-300 italic">{placeholder}</span>}</span>
    </button>
  );
}

export default function UpdateErrorsTable({ suppliers = [], onFixed }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterIssue, setFilterIssue] = useState('all');
  const [savedIds, setSavedIds] = useState(new Set());

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Carga paginada para no traer todo de golpe
      let all = [];
      let skip = 0;
      const limit = 200;
      while (true) {
        const batch = await base44.entities.SupplierPrice.list(null, limit, skip);
        all = all.concat(batch);
        if (batch.length < limit) break;
        skip += limit;
      }
      setProducts(all);
    } catch (e) {
      toast.error('Error al cargar productos');
    }
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, []);

  // Todos los productos con algún problema
  const problematic = useMemo(() =>
    products.map(p => ({ ...p, _issue: detectNameIssues(p.product_name) })).filter(p => p._issue),
    [products]
  );

  // Filtros
  const filtered = useMemo(() => {
    let list = problematic;
    if (filterSupplier !== 'all') list = list.filter(p => p.supplier_id === filterSupplier);
    if (filterIssue !== 'all') list = list.filter(p => p._issue === filterIssue);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        (p.product_name || '').toLowerCase().includes(q) ||
        (p.product_code || '').toLowerCase().includes(q) ||
        (p.supplier_name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [problematic, filterSupplier, filterIssue, search]);

  const issueTypes = useMemo(() => [...new Set(problematic.map(p => p._issue))], [problematic]);
  const supplierList = useMemo(() => {
    const seen = new Set();
    return problematic.filter(p => p.supplier_id && !seen.has(p.supplier_id) && seen.add(p.supplier_id));
  }, [problematic]);

  const handleUpdate = async (id, field, value) => {
    await base44.entities.SupplierPrice.update(id, { [field]: value });
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    setSavedIds(prev => new Set([...prev, id]));
    onFixed && onFixed(id, field, value);
    toast.success('Guardado', { duration: 1500 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando productos...</span>
      </div>
    );
  }

  if (problematic.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
        <CheckCircle className="w-10 h-10 text-emerald-400" />
        <p className="text-sm font-medium text-gray-500">No hay productos con errores de nombre</p>
        <Button variant="outline" size="sm" onClick={loadProducts} className="gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3" /> Recargar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Cabecera con contadores */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span className="font-semibold text-gray-800">
            {filtered.length} producto{filtered.length !== 1 ? 's' : ''} con errores
          </span>
          <span className="text-xs text-gray-400">({problematic.length} total)</span>
        </div>
        <Button variant="outline" size="sm" onClick={loadProducts} className="gap-1.5 text-xs h-8">
          <RefreshCw className="w-3 h-3" /> Recargar
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            placeholder="Buscar por nombre, código o proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <SelectValue placeholder="Proveedor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {supplierList.map(p => (
              <SelectItem key={p.supplier_id} value={p.supplier_id}>{p.supplier_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterIssue} onValueChange={setFilterIssue}>
          <SelectTrigger className="h-8 text-xs w-[200px]">
            <SelectValue placeholder="Tipo de error" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los errores</SelectItem>
            {issueTypes.map(issue => (
              <SelectItem key={issue} value={issue}>{issue}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-orange-50 border-b border-orange-100">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 w-8">#</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[80px]">Proveedor</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[80px]">Código</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[200px]">Nombre del producto</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[80px]">Marca</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 w-[80px]">Precio coste</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[140px]">⚠ Error detectado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p, idx) => {
                const wasSaved = savedIds.has(p.id);
                return (
                  <tr key={p.id} className={`transition-colors ${wasSaved ? 'bg-emerald-50' : 'bg-white hover:bg-orange-50/50'}`}>
                    <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block max-w-[100px] truncate text-gray-600" title={p.supplier_name}>
                        {p.supplier_name || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={p.product_code}
                        placeholder="sin código"
                        onSave={v => handleUpdate(p.id, 'product_code', v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={p.product_name}
                        placeholder="sin nombre"
                        onSave={v => handleUpdate(p.id, 'product_name', v)}
                        className="font-medium text-gray-800"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={p.brand}
                        placeholder="sin marca"
                        onSave={v => handleUpdate(p.id, 'brand', v)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <EditableCell
                        value={p.cost_price != null ? String(p.cost_price) : ''}
                        placeholder="0"
                        type="number"
                        onSave={v => handleUpdate(p.id, 'cost_price', v)}
                        className="text-right font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium whitespace-nowrap">
                        <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                        {p._issue}
                      </span>
                      {wasSaved && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-600 text-[10px]">
                          <CheckCircle className="w-2.5 h-2.5" /> corregido
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No hay productos que coincidan con los filtros
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 text-center">
        Haz clic en cualquier celda para editar directamente. Los cambios se guardan al instante.
      </p>
    </div>
  );
}