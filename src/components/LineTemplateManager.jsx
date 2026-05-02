import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Edit, Save, Layers } from 'lucide-react';

let _id = 0;
const newLine = () => ({ _id: ++_id, description: '', quantity: 1, unit_price: 0, discount: 0 });

const DOC_TYPES = ['todos', 'factura', 'presupuesto', 'recibo'];

export default function LineTemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', doc_type: 'todos', items: [], notes_template: '' });
  const [saving, setSaving] = useState(false);

  const load = () => base44.entities.LineTemplate.list('name', 100).then(setTemplates);
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', doc_type: 'todos', items: [newLine()], notes_template: '' });
    setDialogOpen(true);
  };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setForm({ ...tpl, items: (tpl.items || []).map((it, i) => ({ _id: i, ...it })) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { ...form, items: form.items.map(({ _id, ...rest }) => rest) };
    if (editing) {
      await base44.entities.LineTemplate.update(editing.id, data);
    } else {
      await base44.entities.LineTemplate.create(data);
    }
    setSaving(false);
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla de líneas?')) return;
    await base44.entities.LineTemplate.delete(id);
    load();
  };

  const updateLine = (i, field, val) => {
    setForm(prev => ({ ...prev, items: prev.items.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-purple-500" />
          Plantillas de líneas de trabajo
        </p>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700" onClick={openNew}>
          <Plus className="w-3 h-3 mr-1" />Nueva plantilla
        </Button>
      </div>
      <p className="text-xs text-gray-500">Guarda conjuntos de conceptos/materiales que usas habitualmente para cargarlos rápidamente al crear presupuestos o facturas.</p>

      {templates.length === 0 && (
        <p className="text-center text-gray-400 py-6 text-sm">No hay plantillas de líneas. Crea una para agilizar tus documentos.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {templates.map(tpl => (
          <Card key={tpl.id} className="hover:shadow-sm transition-shadow border-l-4 border-l-purple-400">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{tpl.name}</p>
                  <p className="text-xs text-gray-400">{tpl.doc_type} · {tpl.items?.length || 0} líneas</p>
                  {tpl.items?.slice(0, 3).map((it, i) => (
                    <p key={i} className="text-xs text-gray-600 truncate">· {it.description} — {it.quantity} × {it.unit_price} €</p>
                  ))}
                  {tpl.items?.length > 3 && <p className="text-xs text-gray-400">...y {tpl.items.length - 3} más</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(tpl)} className="p-1 text-gray-400 hover:text-blue-600 rounded">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(tpl.id)} className="p-1 text-red-300 hover:text-red-500 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar plantilla de líneas' : 'Nueva plantilla de líneas'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre de la plantilla *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <div>
              <label className="text-xs text-gray-500">Tipo de documento</label>
              <Select value={form.doc_type} onValueChange={v => setForm({ ...form, doc_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'todos' ? 'Todos los tipos' : t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Líneas de trabajo / materiales</label>
                <Button size="sm" variant="outline" onClick={() => setForm(prev => ({ ...prev, items: [...prev.items, newLine()] }))}>
                  <Plus className="w-3 h-3 mr-1" />Añadir línea
                </Button>
              </div>
              <div className="hidden md:grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-1">
                <span className="col-span-5">Descripción</span>
                <span className="col-span-2">Cant.</span>
                <span className="col-span-2">€/ud</span>
                <span className="col-span-2">Dto%</span>
                <span className="col-span-1"></span>
              </div>
              {form.items.map((item, i) => (
                <div key={item._id ?? i} className="grid grid-cols-12 gap-1 items-center">
                  <input
                    className="col-span-5 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Descripción del concepto"
                    value={item.description}
                    onChange={e => updateLine(i, 'description', e.target.value)}
                  />
                  <input
                    className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    inputMode="decimal" placeholder="1"
                    value={item.quantity}
                    onChange={e => updateLine(i, 'quantity', parseFloat(e.target.value.replace(',', '.')) || 0)}
                  />
                  <input
                    className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    inputMode="decimal" placeholder="0"
                    value={item.unit_price}
                    onChange={e => updateLine(i, 'unit_price', parseFloat(e.target.value.replace(',', '.')) || 0)}
                  />
                  <input
                    className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                    inputMode="decimal" placeholder="0"
                    value={item.discount || 0}
                    onChange={e => updateLine(i, 'discount', parseFloat(e.target.value.replace(',', '.')) || 0)}
                  />
                  <button className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none text-center"
                    onClick={() => setForm(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }))}>×</button>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-gray-500">Observaciones predefinidas (se añaden al cargar la plantilla)</label>
              <Textarea className="mt-1" rows={2} placeholder="Texto de observaciones que se añadirá automáticamente..." value={form.notes_template || ''} onChange={e => setForm({ ...form, notes_template: e.target.value })} />
            </div>

            <Button onClick={handleSave} disabled={saving || !form.name} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : editing ? 'Actualizar plantilla' : 'Guardar plantilla'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}