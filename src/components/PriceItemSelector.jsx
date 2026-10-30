import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Plus, Check, BookOpen, Pencil, Trash2, Save, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import SupplierCatalogImport from './SupplierCatalogImport';

/**
 * PriceItemSelector — Selector de conceptos desde base de precios
 * Props:
 *   onSelect(item): called when user picks a price item
 *   trigger: optional custom trigger element
 */
export default function PriceItemSelector({ onSelect, trigger }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState({ description: '', unit_price: '', unit: 'ud', category: 'mano_obra', notes: '', image_url: '' });
  const [fetchingImage, setFetchingImage] = useState(false);

  const CATEGORIES = {
    mano_obra: { label: 'Mano de obra', color: 'bg-blue-100 text-blue-700' },
    material: { label: 'Material', color: 'bg-green-100 text-green-700' },
    desplazamiento: { label: 'Desplazamiento', color: 'bg-purple-100 text-purple-700' },
    otro: { label: 'Otro', color: 'bg-gray-100 text-gray-600' },
  };

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.PriceItem.list('description', 200);
    setItems(data.filter(i => i.is_active !== false));
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const filtered = items.filter(i =>
    !search || i.description?.toLowerCase().includes(search.toLowerCase()) || i.notes?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (item) => {
    onSelect({
      description: item.description,
      quantity: 1,
      unit_price: item.unit_price,
      unit: item.unit || 'ud',
      discount: 0,
      total: item.unit_price,
    });
    setOpen(false);
    setSearch('');
  };

  const handleSaveNew = async () => {
    if (!newForm.description || !newForm.unit_price) return;
    await base44.entities.PriceItem.create({
      ...newForm,
      unit_price: parseFloat(String(newForm.unit_price).replace(',', '.')) || 0,
      is_active: true,
    });
    setNewForm({ description: '', unit_price: '', unit: 'ud', category: 'mano_obra', notes: '', image_url: '' });
    setAddingNew(false);
    load();
  };

  const fetchImageForNew = async () => {
    if (!newForm.description) return;
    setFetchingImage(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Busca en internet la imagen oficial del producto: "${newForm.description}". Devuelve solo la URL directa de la imagen (JPG o PNG). Si no encuentras una imagen del producto, devuelve null.`,
        add_context_from_internet: true,
        response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
      });
      if (res?.image_url) setNewForm(f => ({ ...f, image_url: res.image_url }));
    } catch {}
    setFetchingImage(false);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    await base44.entities.PriceItem.update(editingItem.id, {
      ...editForm,
      unit_price: parseFloat(String(editForm.unit_price).replace(',', '.')) || 0,
    });
    setEditingItem(null);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este concepto?')) return;
    await base44.entities.PriceItem.update(id, { is_active: false });
    load();
  };

  const UNITS = ['ud', 'h', 'm', 'm2', 'm3', 'kg', 'l', 'ml', 'par', 'jgo'];

  return (
    <>
      {trigger ? (
        <span onClick={() => setOpen(true)} className="cursor-pointer">{trigger}</span>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1 text-xs text-blue-700 border-blue-300 hover:bg-blue-50">
          <BookOpen className="w-3 h-3" />Base de precios
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />Base de precios
              </DialogTitle>
              <div className="flex items-center gap-2">
                <SupplierCatalogImport onImported={() => load()} />
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar concepto..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            {/* Lista de conceptos */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {loading && <p className="text-center text-sm text-gray-400 py-4">Cargando...</p>}
              {!loading && filtered.length === 0 && (
                <p className="text-center text-sm text-gray-400 py-4">
                  {search ? 'No se encontraron conceptos' : 'No hay conceptos en la base de precios'}
                </p>
              )}
              {filtered.map(item => (
                <div key={item.id}>
                  {editingItem?.id === item.id ? (
                    <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2">
                      <Input value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} placeholder="Descripción" />
                      <div className="grid grid-cols-3 gap-2">
                        <Input value={editForm.unit_price ?? ''} onChange={e => setEditForm(f => ({...f, unit_price: e.target.value}))} placeholder="€ precio" inputMode="decimal" type="text" />
                        <select value={editForm.unit} onChange={e => setEditForm(f => ({...f, unit: e.target.value}))} className="h-9 border border-input rounded-md px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <select value={editForm.category} onChange={e => setEditForm(f => ({...f, category: e.target.value}))} className="h-9 border border-input rounded-md px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <Input value={editForm.notes || ''} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} placeholder="Notas (opcional)" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleUpdate} className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs gap-1"><Save className="w-3 h-3" />Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)} className="text-xs">Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-2 p-2.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 group cursor-pointer"
                      onClick={() => handleSelect(item)}
                    >
                      {/* Imagen del producto */}
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
                        <p className="text-sm font-medium text-gray-900 truncate">{item.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${CATEGORIES[item.category]?.color || 'bg-gray-100 text-gray-600'}`}>
                            {CATEGORIES[item.category]?.label || item.category}
                          </span>
                          {item.brand && <span className="text-[10px] text-gray-400">{item.brand}</span>}
                          {item.notes && <span className="text-[10px] text-gray-400 truncate">{item.notes}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-gray-800">{Number(item.unit_price).toFixed(2)} €</span>
                        <span className="text-xs text-gray-400">/{item.unit || 'ud'}</span>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setEditingItem(item); setEditForm({...item}); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <Check className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Añadir nuevo concepto */}
            {addingNew ? (
              <div className="border border-green-200 rounded-lg p-3 bg-green-50 space-y-2">
                <p className="text-xs font-semibold text-green-800">Nuevo concepto</p>
                <Input value={newForm.description} onChange={e => setNewForm(f => ({...f, description: e.target.value}))} placeholder="Descripción del trabajo / material *" />
                <div className="grid grid-cols-3 gap-2">
                  <Input value={newForm.unit_price} onChange={e => setNewForm(f => ({...f, unit_price: e.target.value}))} placeholder="€ precio *" inputMode="decimal" type="text" />
                  <select value={newForm.unit} onChange={e => setNewForm(f => ({...f, unit: e.target.value}))} className="h-9 border border-input rounded-md px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <select value={newForm.category} onChange={e => setNewForm(f => ({...f, category: e.target.value}))} className="h-9 border border-input rounded-md px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                    {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <Input value={newForm.notes} onChange={e => setNewForm(f => ({...f, notes: e.target.value}))} placeholder="Notas (opcional)" />
                {/* Imagen */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
                    {newForm.image_url ? (
                      <img src={newForm.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display='none'; }} />
                    ) : <Image className="w-5 h-5 text-gray-300" />}
                  </div>
                  <div className="flex-1">
                    <Input value={newForm.image_url || ''} onChange={e => setNewForm(f => ({...f, image_url: e.target.value}))} placeholder="URL de imagen (opcional)" className="text-xs mb-1" />
                    <Button type="button" size="sm" variant="outline" onClick={fetchImageForNew} disabled={fetchingImage || !newForm.description} className="text-xs gap-1 w-full">
                      {fetchingImage ? <><span className="animate-spin">⏳</span> Buscando...</> : <><Image className="w-3 h-3" />Buscar imagen en internet</>}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveNew} disabled={!newForm.description || !newForm.unit_price} className="flex-1 bg-green-600 hover:bg-green-700 text-xs gap-1">
                    <Save className="w-3 h-3" />Guardar concepto
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingNew(false)} className="text-xs">Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full gap-2 text-sm border-dashed" onClick={() => setAddingNew(true)}>
                <Plus className="w-4 h-4" />Añadir nuevo concepto a la base de precios
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}