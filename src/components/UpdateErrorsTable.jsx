import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Save, Loader2, CheckCircle, Search, RefreshCw, X, Image as ImageIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { loadValidChars, saveValidChars } from '@/components/ValidCharsConfig';

// Detecta caracteres especiales no reconocidos contra la lista blanca
function getUnknownChars(name) {
  if (!name) return [];
  const cfg = loadValidChars();
  const GROUPS = {
    greek: 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'.split(''),
    units: ['°','℃','℉','²','³','¹','½','¼','¾','⅓','⅔','µ','Ω','℧','∞','≈','≠','≤','≥','±','×','÷'],
    accented: 'áéíóúüñçÁÉÍÓÚÜÑÇàèìòùâêîôûäëïöÀÈÌÒÙÂÊÎÔÛÄËÏÖ'.split(''),
    punctuation: ['-','_','/','.','(',')','[',']','+','#','@','&','%','*','!','?',':',';',"'",'\"','~','|','\\','^','`','<','>'],
  };
  const validSet = new Set([
    ...cfg.activeGroups.flatMap(gid => GROUPS[gid] || []),
    ...(cfg.extraChars || []),
  ]);
  const unknown = new Set();
  for (const char of name) {
    const code = char.charCodeAt(0);
    if (code >= 32 && code <= 126) continue;
    if (code < 32) continue;
    if (!validSet.has(char)) unknown.add(char);
  }
  return [...unknown];
}

function detectNameIssues(name) {
  if (!name || name.trim().length < 3) return 'Nombre demasiado corto';
  if (/^[\d\s\-_./,]+$/.test(name)) return 'Solo contiene números o símbolos';
  if (/[ÃÂ][\u0080-\u00BF]/.test(name) || /â€/.test(name)) return 'Posible codificación incorrecta (mojibake)';
  if (name.length > 300) return 'Nombre excesivamente largo';
  if (/^[A-Z0-9]{1,6}$/.test(name)) return 'Parece un código, no un nombre de producto';
  const unknowns = getUnknownChars(name);
  if (unknowns.length > 0) return `Caracteres no reconocidos: ${unknowns.join(' ')}`;
  return null;
}

// Celda editable inline
function EditableCell({ value, onSave, placeholder = '', type = 'text', className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);

  const handleSave = async () => {
    if (draft === String(value ?? '')) { setEditing(false); return; }
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
      onClick={() => { setDraft(String(value ?? '')); setEditing(true); }}
      className={`w-full text-left text-xs px-1.5 py-1 rounded hover:bg-gray-100 transition-colors group min-w-0 ${className}`}
      title="Clic para editar"
    >
      <span className="block truncate group-hover:underline">{value || <span className="text-gray-300 italic">{placeholder}</span>}</span>
    </button>
  );
}

// Fila expandida con acciones de imagen y caracteres
function ErrorRowExpanded({ p, onUpdate, onAddChars }) {
  const [fetchingByName, setFetchingByName] = useState(false);
  const [fetchingByRef, setFetchingByRef] = useState(false);
  const unknowns = getUnknownChars(p.product_name);

  const searchImage = async (byRef) => {
    const setter = byRef ? setFetchingByRef : setFetchingByName;
    setter(true);
    try {
      const searchTerm = byRef
        ? `referencia ${p.product_code}${p.supplier_name ? ` ${p.supplier_name}` : ''}`
        : `"${p.product_name}"${p.brand ? ` marca ${p.brand}` : ''}`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca en internet la imagen oficial del producto: ${searchTerm}. Devuelve solo la URL directa de la imagen del producto (JPG, PNG o WebP). Si no encuentras una imagen fiable, devuelve null.`,
        add_context_from_internet: true,
        response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
      });
      if (res?.image_url) {
        await onUpdate(p.id, 'image_url', res.image_url);
        toast.success('Imagen encontrada y guardada');
      } else {
        toast.info('No se encontró imagen para este producto');
      }
    } catch {
      toast.error('Error al buscar imagen');
    }
    setter(false);
  };

  const addAllUnknowns = () => {
    if (!unknowns.length) return;
    const cfg = loadValidChars();
    const toAdd = unknowns.filter(c => !cfg.extraChars.includes(c));
    if (!toAdd.length) { toast.info('Ya están todos registrados'); return; }
    const updated = { ...cfg, extraChars: [...cfg.extraChars, ...toAdd] };
    saveValidChars(updated);
    onAddChars(toAdd);
    toast.success(`Añadidos ${toAdd.length} carácter(es) a la lista blanca`);
  };

  return (
    <tr className="bg-amber-50/60 border-t border-amber-100">
      <td colSpan={8} className="px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Buscar imagen por nombre */}
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-[11px] gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
            onClick={() => searchImage(false)}
            disabled={fetchingByName || fetchingByRef}
          >
            {fetchingByName ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
            Buscar imagen por nombre
          </Button>

          {/* Buscar imagen por referencia */}
          {p.product_code && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
              onClick={() => searchImage(true)}
              disabled={fetchingByName || fetchingByRef}
            >
              {fetchingByRef ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Buscar imagen por ref. {p.product_code}
            </Button>
          )}

          {/* Añadir caracteres desconocidos */}
          {unknowns.length > 0 && (
            <button
              onClick={addAllUnknowns}
              className="flex items-center gap-1.5 h-7 px-3 rounded border border-orange-300 bg-orange-50 text-orange-800 text-[11px] hover:bg-orange-100 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Añadir a válidos:
              {unknowns.map((c, i) => (
                <span key={i} className="font-mono font-bold text-orange-900 bg-white border border-orange-200 rounded px-1">{c}</span>
              ))}
            </button>
          )}

          {/* Vista previa imagen actual si existe */}
          {p.image_url && (
            <div className="flex items-center gap-1.5 ml-auto">
              <img src={p.image_url} alt="" className="w-7 h-7 rounded object-contain border bg-white" onError={e => e.target.style.display='none'} />
              <span className="text-[10px] text-gray-400">imagen actual</span>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function UpdateErrorsTable({ suppliers = [], onFixed }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [filterIssue, setFilterIssue] = useState('all');
  const [savedIds, setSavedIds] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [, forceUpdate] = useState(0); // para re-renderizar tras añadir chars

  const loadProducts = async () => {
    setLoading(true);
    try {
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
    } catch {
      toast.error('Error al cargar productos');
    }
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, []);

  const problematic = useMemo(() =>
    products.map(p => ({ ...p, _issue: detectNameIssues(p.product_name) })).filter(p => p._issue),

    [products]
  );

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

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddChars = () => {
    // Forzar re-render para que detectNameIssues vuelva a evaluar
    forceUpdate(n => n + 1);
    loadProducts();
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
      {/* Cabecera */}
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
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[80px]">Ref. / Código</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[200px]">Nombre del producto</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[70px]">Marca</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 w-[75px]">Coste €</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 w-[75px]">Venta €</th>
                <th className="text-left px-3 py-2.5 font-semibold text-orange-800 min-w-[140px]">⚠ Error</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const wasSaved = savedIds.has(p.id);
                const isExpanded = expandedRows.has(p.id);
                return (
                  <React.Fragment key={p.id}>
                    <tr
                      className={`transition-colors border-b border-gray-100 cursor-pointer ${wasSaved ? 'bg-emerald-50' : isExpanded ? 'bg-orange-50' : 'bg-white hover:bg-orange-50/40'}`}
                      onClick={() => toggleRow(p.id)}
                    >
                      <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block max-w-[100px] truncate text-gray-600" title={p.supplier_name}>
                          {p.supplier_name || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          value={p.product_code}
                          placeholder="sin ref."
                          onSave={v => handleUpdate(p.id, 'product_code', v)}
                        />
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          value={p.product_name}
                          placeholder="sin nombre"
                          onSave={v => handleUpdate(p.id, 'product_name', v)}
                          className="font-medium text-gray-800"
                        />
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          value={p.brand}
                          placeholder="marca"
                          onSave={v => handleUpdate(p.id, 'brand', v)}
                        />
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          value={p.cost_price != null ? String(p.cost_price) : ''}
                          placeholder="0"
                          type="number"
                          onSave={v => handleUpdate(p.id, 'cost_price', v)}
                          className="text-right font-mono"
                        />
                      </td>
                      <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                        <EditableCell
                          value={p.sale_price != null ? String(p.sale_price) : ''}
                          placeholder="0"
                          type="number"
                          onSave={v => handleUpdate(p.id, 'sale_price', v)}
                          className="text-right font-mono text-emerald-700"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-medium whitespace-nowrap">
                            <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />
                            {p._issue.length > 30 ? p._issue.slice(0, 30) + '…' : p._issue}
                          </span>
                          {wasSaved && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 text-[10px]">
                              <CheckCircle className="w-2.5 h-2.5" /> ok
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <ErrorRowExpanded
                        p={p}
                        onUpdate={handleUpdate}
                        onAddChars={handleAddChars}
                      />
                    )}
                  </React.Fragment>
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
        Haz clic en cualquier celda para editar. Haz clic en una fila para desplegar opciones de imagen y caracteres.
      </p>
    </div>
  );
}