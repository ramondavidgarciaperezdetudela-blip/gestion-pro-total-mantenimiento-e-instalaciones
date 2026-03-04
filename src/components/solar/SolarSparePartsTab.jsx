import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit3, Save, Package, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'panel', label: '☀️ Panel solar' },
  { value: 'inversor', label: '⚡ Inversor / Cargador' },
  { value: 'bateria', label: '🔋 Batería' },
  { value: 'cable', label: '🔴 Cable / Conector' },
  { value: 'proteccion', label: '🛡️ Protección eléctrica' },
  { value: 'estructura', label: '🏗️ Estructura / Soporte' },
  { value: 'mppt', label: '🔆 Regulador MPPT' },
  { value: 'otro', label: '📦 Otro' },
];

const EMPTY_FORM = { name: '', reference: '', category: 'panel', brand: '', quantity: 1, min_stock: 1, unit_price: 0, location: '', notes: '', supplier_name: '' };

export default function SolarSparePartsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    // Usamos StockItem filtrando por categoría solar
    const all = await base44.entities.StockItem.list();
    setItems(all.filter(i => i.category === 'material_solar' || CATEGORIES.some(c => i.solar_category === c.value)));
    setLoading(false);
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    const data = { ...form, category: 'material_solar', solar_category: form.category, quantity: parseInt(form.quantity) || 0, min_stock: parseInt(form.min_stock) || 0, unit_price: parseFloat(form.unit_price) || 0 };
    if (editingId) {
      await base44.entities.StockItem.update(editingId, data);
      toast.success('Repuesto actualizado');
    } else {
      await base44.entities.StockItem.create(data);
      toast.success('Repuesto añadido');
    }
    setForm(EMPTY_FORM);
    setShowForm(false);
    setEditingId(null);
    load();
  };

  const edit = (item) => {
    setForm({ name: item.name, reference: item.reference || '', category: item.solar_category || 'otro', brand: item.notes?.split('|')[0] || '', quantity: item.quantity, min_stock: item.min_stock || 1, unit_price: item.unit_price || 0, location: item.location || '', notes: item.notes || '', supplier_name: item.supplier_name || '' });
    setEditingId(item.id);
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este repuesto?')) return;
    await base44.entities.StockItem.delete(id);
    toast.success('Eliminado');
    load();
  };

  const adjustStock = async (item, delta) => {
    const newQty = Math.max(0, (item.quantity || 0) + delta);
    await base44.entities.StockItem.update(item.id, { quantity: newQty });
    load();
  };

  const filtered = filter === 'all' ? items : filter === 'low' ? items.filter(i => i.quantity <= (i.min_stock || 1)) : items.filter(i => i.solar_category === filter);

  const lowStockCount = items.filter(i => i.quantity <= (i.min_stock || 1)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2"><Package className="w-5 h-5 text-amber-500" />Repuestos Solar</h2>
          {lowStockCount > 0 && (
            <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {lowStockCount} con stock bajo
            </Badge>
          )}
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(true); }} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />Añadir repuesto
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[{ v: 'all', l: 'Todos' }, { v: 'low', l: '⚠️ Stock bajo' }, ...CATEGORIES.map(c => ({ v: c.value, l: c.label }))].map(f => (
          <button key={f.v} onClick={() => setFilter(f.v)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filter === f.v ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.l}
          </button>
        ))}
      </div>

      {/* Formulario */}
      {showForm && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-amber-800">{editingId ? 'Editar repuesto' : 'Nuevo repuesto'}</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-500">Nombre del repuesto *</label><Input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Ej: Fusible gPV 15A MC4" /></div>
              <div><label className="text-xs text-gray-500">Referencia</label><Input value={form.reference} onChange={e => setF('reference', e.target.value)} placeholder="REF-001" /></div>
              <div><label className="text-xs text-gray-500">Categoría</label>
                <Select value={form.category} onValueChange={v => setF('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-gray-500">Marca</label><Input value={form.brand} onChange={e => setF('brand', e.target.value)} placeholder="Ej: Stäubli, ABB..." /></div>
              <div><label className="text-xs text-gray-500">Proveedor</label><Input value={form.supplier_name} onChange={e => setF('supplier_name', e.target.value)} placeholder="RS Components..." /></div>
              <div><label className="text-xs text-gray-500">Stock actual</label><Input type="number" value={form.quantity} onChange={e => setF('quantity', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">Stock mínimo</label><Input type="number" value={form.min_stock} onChange={e => setF('min_stock', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">Precio unitario (€)</label><Input type="number" step="0.01" value={form.unit_price} onChange={e => setF('unit_price', e.target.value)} /></div>
              <div><label className="text-xs text-gray-500">Ubicación/Almacén</label><Input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="Estante A1, Furgoneta..." /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-500">Notas</label><Input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Observaciones..." /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} className="bg-amber-500 hover:bg-amber-600"><Save className="w-4 h-4 mr-2" />{editingId ? 'Actualizar' : 'Guardar'}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Cargando repuestos...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay repuestos en esta categoría</p>
          <p className="text-xs">Añade tus repuestos solar para llevar el control de stock</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-amber-600 text-white">
                <th className="p-2 text-left">Repuesto</th>
                <th className="p-2 text-left">Referencia</th>
                <th className="p-2 text-left">Categoría</th>
                <th className="p-2 text-left">Marca / Proveedor</th>
                <th className="p-2 text-center">Stock</th>
                <th className="p-2 text-left">Ubicación</th>
                <th className="p-2 text-right">Precio</th>
                <th className="p-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const isLow = item.quantity <= (item.min_stock || 1);
                return (
                  <tr key={item.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isLow ? 'border-l-4 border-red-400' : ''} hover:bg-amber-50 transition-colors`}>
                    <td className="border-b border-gray-100 p-2 font-medium">
                      {item.name}
                      {isLow && <span className="ml-1 text-red-500">⚠️</span>}
                    </td>
                    <td className="border-b border-gray-100 p-2 text-gray-500">{item.reference || '—'}</td>
                    <td className="border-b border-gray-100 p-2">
                      <Badge className="text-[10px] bg-amber-100 text-amber-800">{CATEGORIES.find(c => c.value === item.solar_category)?.label || '📦 Otro'}</Badge>
                    </td>
                    <td className="border-b border-gray-100 p-2 text-gray-600">{item.supplier_name || '—'}</td>
                    <td className="border-b border-gray-100 p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => adjustStock(item, -1)} className="w-5 h-5 rounded bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold">-</button>
                        <span className={`font-bold w-8 text-center ${isLow ? 'text-red-600' : 'text-green-700'}`}>{item.quantity}</span>
                        <button onClick={() => adjustStock(item, +1)} className="w-5 h-5 rounded bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold">+</button>
                      </div>
                      {isLow && <div className="text-[10px] text-red-500">Mín: {item.min_stock}</div>}
                    </td>
                    <td className="border-b border-gray-100 p-2 text-gray-500">{item.location || '—'}</td>
                    <td className="border-b border-gray-100 p-2 text-right font-semibold">{item.unit_price ? `${item.unit_price.toFixed(2)} €` : '—'}</td>
                    <td className="border-b border-gray-100 p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => edit(item)} className="p-1 rounded hover:bg-blue-100 text-blue-600"><Edit3 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(item.id)} className="p-1 rounded hover:bg-red-100 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 font-semibold">
                <td className="p-2 text-xs" colSpan={4}>Total: {filtered.length} referencias</td>
                <td className="p-2 text-center text-xs">{filtered.reduce((s, i) => s + (i.quantity || 0), 0)} uds</td>
                <td className="p-2" colSpan={2}><span className="text-xs text-gray-600">Valor stock: {filtered.reduce((s, i) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0).toFixed(2)} €</span></td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}