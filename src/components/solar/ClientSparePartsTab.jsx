import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit3, Save, Package, AlertTriangle, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'panel', label: '☀️ Panel solar' },
  { value: 'inversor', label: '⚡ Inversor / Cargador' },
  { value: 'bateria', label: '🔋 Batería' },
  { value: 'cable', label: '🔴 Cable / Conector' },
  { value: 'proteccion', label: '🛡️ Protección eléctrica' },
  { value: 'estructura', label: '🏗️ Estructura / Soporte' },
  { value: 'mppt', label: '🔆 Regulador MPPT' },
  { value: 'tuberias_accesorios', label: '🔧 Tubería / Accesorio' },
  { value: 'cables_electricidad', label: '⚡ Cable eléctrico' },
  { value: 'filtros', label: '🔵 Filtros' },
  { value: 'otro', label: '📦 Otro' },
];

const EMPTY_FORM = {
  name: '', reference: '', solar_category: 'panel', category: 'material_solar',
  supplier_name: '', quantity: 1, min_stock: 1, unit_price: 0, location: '', notes: ''
};

// Componente usado tanto en gestión global como en ficha de cliente
export default function ClientSparePartsTab({ contactId = null, contactName = null }) {
  const [items, setItems] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM, contact_id: contactId || '', contact_name: contactName || '' });
  const [filter, setFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState(contactId || '');

  useEffect(() => {
    load();
    if (!contactId) base44.entities.Contact.list().then(setContacts);
  }, [contactId, selectedContact]);

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.StockItem.list();
    let filtered = all;
    if (contactId) {
      filtered = all.filter(i => i.contact_id === contactId);
    } else if (selectedContact) {
      filtered = all.filter(i => i.contact_id === selectedContact);
    }
    setItems(filtered);
    setLoading(false);
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    const cid = contactId || form.contact_id;
    const cname = contactName || (contacts.find(c => c.id === cid) ? `${contacts.find(c => c.id === cid).name} ${contacts.find(c => c.id === cid).surname || ''}` : form.contact_name);
    const data = {
      ...form,
      contact_id: cid || undefined,
      contact_name: cname || undefined,
      category: form.solar_category === 'panel' || form.solar_category === 'bateria' || form.solar_category === 'inversor' || form.solar_category === 'mppt' ? 'material_solar' : form.solar_category === 'cable' ? 'cables_electricidad' : form.solar_category === 'proteccion' ? 'cables_electricidad' : form.solar_category === 'estructura' ? 'otro' : form.category,
      quantity: parseInt(form.quantity) || 0,
      min_stock: parseInt(form.min_stock) || 0,
      unit_price: parseFloat(form.unit_price) || 0,
    };
    if (editingId) {
      await base44.entities.StockItem.update(editingId, data);
      toast.success('Repuesto actualizado');
    } else {
      await base44.entities.StockItem.create(data);
      toast.success('Repuesto añadido');
    }
    setForm({ ...EMPTY_FORM, contact_id: contactId || '', contact_name: contactName || '' });
    setShowForm(false);
    setEditingId(null);
    load();
  };

  const edit = (item) => {
    setForm({
      name: item.name, reference: item.reference || '',
      solar_category: item.solar_category || 'otro', category: item.category || 'material_solar',
      supplier_name: item.supplier_name || '', quantity: item.quantity || 0,
      min_stock: item.min_stock || 0, unit_price: item.unit_price || 0,
      location: item.location || '', notes: item.notes || '',
      contact_id: item.contact_id || '', contact_name: item.contact_name || ''
    });
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
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i));
  };

  const displayItems = filter === 'all' ? items
    : filter === 'low' ? items.filter(i => (i.quantity || 0) <= (i.min_stock || 1))
    : items.filter(i => i.solar_category === filter || i.category === filter);

  const lowCount = items.filter(i => (i.quantity || 0) <= (i.min_stock || 1)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2"><Package className="w-5 h-5 text-amber-500" />Gestión de Repuestos</h2>
          {contactName && <Badge className="bg-blue-100 text-blue-700"><UserCheck className="w-3 h-3 mr-1" />{contactName}</Badge>}
          {lowCount > 0 && <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />{lowCount} stock bajo</Badge>}
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM, contact_id: contactId || selectedContact, contact_name: contactName || '' }); setEditingId(null); setShowForm(true); }} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-2" />Añadir repuesto
        </Button>
      </div>

      {/* Selector cliente si no hay contacto fijo */}
      {!contactId && (
        <div className="flex gap-2 items-center">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Filtrar por cliente:</label>
          <Select value={selectedContact} onValueChange={setSelectedContact}>
            <SelectTrigger className="max-w-xs"><SelectValue placeholder="Todos los clientes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos</SelectItem>
              {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname || ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Filtros categoría */}
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
          <CardHeader className="pb-2 py-3"><CardTitle className="text-sm text-amber-800">{editingId ? 'Editar repuesto' : 'Nuevo repuesto'}</CardTitle></CardHeader>
          <CardContent className="p-4 space-y-3">
            {!contactId && (
              <div>
                <label className="text-xs text-gray-500">Vincular a cliente (opcional)</label>
                <Select value={form.contact_id} onValueChange={v => {
                  const c = contacts.find(co => co.id === v);
                  setF('contact_id', v);
                  setF('contact_name', c ? `${c.name} ${c.surname || ''}` : '');
                }}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin cliente (almacén general)</SelectItem>
                    {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname || ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="md:col-span-2"><label className="text-xs text-gray-500">Nombre del repuesto *</label><Input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="Ej: Fusible gPV 15A" className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Referencia</label><Input value={form.reference} onChange={e => setF('reference', e.target.value)} placeholder="REF-001" className="mt-1" /></div>
              <div>
                <label className="text-xs text-gray-500">Categoría</label>
                <Select value={form.solar_category} onValueChange={v => setF('solar_category', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><label className="text-xs text-gray-500">Proveedor</label><Input value={form.supplier_name} onChange={e => setF('supplier_name', e.target.value)} placeholder="RS Components..." className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Precio unitario (€)</label><Input type="number" step="0.01" value={form.unit_price} onChange={e => setF('unit_price', e.target.value)} className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Stock actual</label><Input type="number" value={form.quantity} onChange={e => setF('quantity', e.target.value)} className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Stock mínimo alerta</label><Input type="number" value={form.min_stock} onChange={e => setF('min_stock', e.target.value)} className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Ubicación / Almacén</label><Input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="Estante A1, Furgoneta..." className="mt-1" /></div>
              <div className="md:col-span-2"><label className="text-xs text-gray-500">Notas</label><Input value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Observaciones..." className="mt-1" /></div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} className="bg-amber-500 hover:bg-amber-600"><Save className="w-4 h-4 mr-2" />{editingId ? 'Actualizar' : 'Guardar'}</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla */}
      {loading ? (
        <p className="text-sm text-center text-gray-400 py-8">Cargando...</p>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay repuestos{filter !== 'all' ? ' en esta categoría' : contactName ? ` para ${contactName}` : ''}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-amber-600 text-white">
                <th className="p-2 text-left">Repuesto</th>
                <th className="p-2 text-left hidden md:table-cell">Ref.</th>
                <th className="p-2 text-left">Categoría</th>
                {!contactId && <th className="p-2 text-left hidden md:table-cell">Cliente</th>}
                <th className="p-2 text-left hidden md:table-cell">Proveedor</th>
                <th className="p-2 text-center">Stock</th>
                <th className="p-2 text-left hidden md:table-cell">Ubicación</th>
                <th className="p-2 text-right">Precio</th>
                <th className="p-2 text-center">Acc.</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, i) => {
                const isLow = (item.quantity || 0) <= (item.min_stock || 1);
                return (
                  <tr key={item.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-amber-50 ${isLow ? 'border-l-4 border-red-400' : ''}`}>
                    <td className="border-b p-2 font-medium">{item.name}{isLow && <span className="ml-1 text-red-500">⚠️</span>}</td>
                    <td className="border-b p-2 text-gray-400 hidden md:table-cell">{item.reference || '—'}</td>
                    <td className="border-b p-2">
                      <Badge className="text-[10px] bg-amber-100 text-amber-800">{CATEGORIES.find(c => c.value === item.solar_category)?.label?.split(' ')[0] || '📦'}</Badge>
                    </td>
                    {!contactId && <td className="border-b p-2 text-gray-500 hidden md:table-cell">{item.contact_name || <span className="italic text-gray-300">Almacén</span>}</td>}
                    <td className="border-b p-2 text-gray-500 hidden md:table-cell">{item.supplier_name || '—'}</td>
                    <td className="border-b p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => adjustStock(item, -1)} className="w-5 h-5 rounded bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold">-</button>
                        <span className={`font-bold w-7 text-center ${isLow ? 'text-red-600' : 'text-green-700'}`}>{item.quantity}</span>
                        <button onClick={() => adjustStock(item, +1)} className="w-5 h-5 rounded bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center font-bold">+</button>
                      </div>
                    </td>
                    <td className="border-b p-2 text-gray-400 hidden md:table-cell">{item.location || '—'}</td>
                    <td className="border-b p-2 text-right font-semibold">{item.unit_price ? `${item.unit_price.toFixed(2)} €` : '—'}</td>
                    <td className="border-b p-2">
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
              <tr className="bg-gray-100 text-xs font-semibold">
                <td className="p-2" colSpan={contactId ? 3 : 4}>{displayItems.length} refs · {displayItems.reduce((s, i) => s + (i.quantity || 0), 0)} uds</td>
                <td className="p-2 text-right" colSpan={contactId ? 4 : 5}>
                  Valor stock: <span className="text-green-700">{displayItems.reduce((s, i) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0).toFixed(2)} €</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}