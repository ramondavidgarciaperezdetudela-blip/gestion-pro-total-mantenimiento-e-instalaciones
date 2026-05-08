import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BookOpen, Search, Plus, Pencil, Trash2, Save, X,
  Loader2, Image as ImageIcon
} from 'lucide-react';
import SupplierCatalogImport from './SupplierCatalogImport';
import { toast } from 'sonner';

const CATEGORIES = {
  mano_obra: { label: 'Mano de obra', color: 'bg-blue-100 text-blue-700' },
  material: { label: 'Material', color: 'bg-green-100 text-green-700' },
  desplazamiento: { label: 'Desplazamiento', color: 'bg-purple-100 text-purple-700' },
  otro: { label: 'Otro', color: 'bg-gray-100 text-gray-600' },
};
const UNITS = ['ud', 'h', 'm', 'm2', 'm3', 'kg', 'l', 'ml', 'par', 'jgo'];
const EMPTY_FORM = { description: '', unit_price: '', unit: 'ud', category: 'mano_obra', notes: '', image_url: '', brand: '', supplier_name: '' };

export default function QuickPriceDBAccess() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [savingNew, setSavingNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PriceItem.list('description', 300);
    setItems(data.filter(i => i.is_active !== false));
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  // Shortcut: Alt+P
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && e.key === 'p') { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.description?.toLowerCase().includes(q) || i.notes?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q);
    const matchCat = filterCat === 'all' || i.category === filterCat;
    return matchSearch && matchCat;
  });

  const handleSaveNew = async () => {
    if (!newForm.description || !newForm.unit_price) return;
    setSavingNew(true);
    await base44.entities.PriceItem.create({
      ...newForm,
      unit_price: parseFloat(String(newForm.unit_price).replace(',', '.')) || 0,
      is_active: true,
    });
    setNewForm(EMPTY_FORM);
    setAddingNew(false);
    setSavingNew(false);
    toast.success('Concepto añadido a la base de precios');
    load();
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    await base44.entities.PriceItem.update(editingItem.id, {
      ...editForm,
      unit_price: parseFloat(String(editForm.unit_price).replace(',', '.')) || 0,
    });
    setEditingItem(null);
    toast.success('Concepto actualizado');
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este concepto?')) return;
    await base44.entities.PriceItem.update(id, { is_active: false });
    toast.success('Concepto eliminado');
    load();
  };

  const fetchImage = async (desc, setter) => {
    if (!desc) return;
    setFetchingImage(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Busca la imagen oficial del producto: "${desc}". Devuelve solo la URL directa (JPG/PNG). Si no hay imagen fiable, devuelve null.`,
      add_context_from_internet: true,
      response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
    });
    if (res?.image_url) setter(f => ({ ...f, image_url: res.image_url }));
    else toast.info('No se encontró imagen para este producto');
    setFetchingImage(false);
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        title="Base de precios (Alt+P)"
        className="fixed bottom-24 right-4 z-40 lg:bottom-6 lg:right-6 w-14 h-14 rounded-full bg-blue-700 hover:bg-blue-800 text-white shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 print:hidden"
        style={{ boxShadow: '0 4px 24px rgba(30,58,138,0.4)' }}
      >
        <BookOpen className="w-6 h-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Base de precios
                {!loading && <span className="text-sm font-normal text-gray-400">({items.length} conceptos)</span>}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <SupplierCatalogImport onImported={() => load()} />
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-4 h-4" /></button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar concepto, material, marca..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats rápidas */}
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(CATEGORIES).map(([k, v]) => {
                const count = items.filter(i => i.category === k).length;
                return (
                  <button
                    key={k}
                    onClick={() => setFilterCat(filterCat === k ? 'all' : k)}
                    className={`text-center p-2 rounded-lg border text-xs transition-colors ${filterCat === k ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="font-bold text-base text-gray-800">{count}</p>
                    <p className={`text-[10px] font-medium px-1 rounded ${v.color}`}>{v.label}</p>
                  </button>
                );
              })}
            </div>

            {/* Lista */}
            <div className="space-y-1 max-h-[38vh] overflow-y-auto pr-1">
              {loading && (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-6">
                  {search ? 'Sin resultados para esta búsqueda' : 'No hay conceptos. Añade el primero.'}
                </p>
              )}
              {filtered.map(item => (
                <div key={item.id}>
                  {editingItem?.id === item.id ? (
                    <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 space-y-2">
                      <Input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción *" />
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={editForm.unit_price ?? ''} onChange={e => setEditForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="€ precio" inputMode="decimal" />
                        <select value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} className="h-9 border border-input rounded-md px-2 text-sm">
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="h-9 border border-input rounded-md px-2 text-sm">
                          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <Input value={editForm.brand || ''} onChange={e => setEditForm(f => ({ ...f, brand: e.target.value }))} placeholder="Marca" />
                        <Input value={editForm.supplier_name || ''} onChange={e => setEditForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder="Proveedor" />
                      </div>
                      <Input value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas (opcional)" />
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg border bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                          {editForm.image_url ? <img src={editForm.image_url} alt="" className="w-full h-full object-contain" /> : <ImageIcon className="w-4 h-4 text-gray-300" />}
                        </div>
                        <Input value={editForm.image_url || ''} onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL imagen" className="text-xs flex-1" />
                        <Button size="sm" variant="outline" onClick={() => fetchImage(editForm.description, setEditForm)} disabled={fetchingImage} className="text-xs flex-shrink-0">
                          {fetchingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs gap-1"><Save className="w-3 h-3" />Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="text-xs">Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 group">
                      <div className="w-10 h-10 flex-shrink-0 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
                        {item.image_url
                          ? <img src={item.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
                          : <ImageIcon className="w-4 h-4 text-gray-300" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORIES[item.category]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {CATEGORIES[item.category]?.label || item.category}
                          </span>
                          {item.brand && <span className="text-[10px] text-gray-400">{item.brand}</span>}
                          {item.supplier_name && <span className="text-[10px] text-gray-400 truncate">· {item.supplier_name}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <div className="text-right mr-1">
                          <span className="text-sm font-bold text-gray-800">{Number(item.unit_price).toFixed(2)} €</span>
                          <span className="text-xs text-gray-400 block">/{item.unit || 'ud'}</span>
                        </div>
                        <button
                          onClick={() => { setEditingItem(item); setEditForm({ ...item }); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-blue-600 rounded transition-opacity"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 rounded transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Añadir nuevo */}
            {addingNew ? (
              <div className="border border-green-200 rounded-xl p-3 bg-green-50 space-y-2">
                <p className="text-xs font-semibold text-green-800">Nuevo concepto</p>
                <Input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción del trabajo / material *" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={newForm.unit_price} onChange={e => setNewForm(f => ({ ...f, unit_price: e.target.value }))} placeholder="€ precio *" inputMode="decimal" />
                  <select value={newForm.unit} onChange={e => setNewForm(f => ({ ...f, unit: e.target.value }))} className="h-9 border border-input rounded-md px-2 text-sm">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))} className="h-9 border border-input rounded-md px-2 text-sm">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Input value={newForm.brand} onChange={e => setNewForm(f => ({ ...f, brand: e.target.value }))} placeholder="Marca (opcional)" />
                  <Input value={newForm.supplier_name} onChange={e => setNewForm(f => ({ ...f, supplier_name: e.target.value }))} placeholder="Proveedor (opcional)" />
                </div>
                <Input value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notas (opcional)" />
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                    {newForm.image_url ? <img src={newForm.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} /> : <ImageIcon className="w-5 h-5 text-gray-300" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <Input value={newForm.image_url} onChange={e => setNewForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL imagen (opcional)" className="text-xs" />
                    <Button type="button" size="sm" variant="outline" onClick={() => fetchImage(newForm.description, setNewForm)} disabled={fetchingImage || !newForm.description} className="text-xs gap-1 w-full">
                      {fetchingImage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                      Buscar imagen automáticamente
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNew} disabled={!newForm.description || !newForm.unit_price || savingNew} className="flex-1 bg-green-600 hover:bg-green-700 text-xs gap-1">
                    {savingNew ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Guardar concepto
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingNew(false)} className="text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2 text-sm border-dashed border-green-400 text-green-700 hover:bg-green-50" onClick={() => setAddingNew(true)}>
                <Plus className="w-4 h-4" /> Añadir nuevo concepto
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}