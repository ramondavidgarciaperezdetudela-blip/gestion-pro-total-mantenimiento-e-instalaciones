import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumberField } from '@/components/ui/number-field';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, Plus, Search, Trash2, Edit, Check, Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';

const EQUIPMENT = ['aire_acondicionado', 'bomba_calor', 'camara_frigorifica', 'electrico', 'solar', 'otro'];
const WORK_TYPES = ['reparacion', 'mantenimiento', 'instalacion', 'revision', 'urgencia'];

// ── Editor de plantilla ───────────────────────────────────────────────────────
function TemplateEditor({ template, onSave, onCancel }) {
  const [form, setForm] = useState(template || {
    name: '', equipment_type: 'camara_frigorifica', work_type: 'mantenimiento',
    description: '', diagnosis: '', solution: '',
    materials_used: [], labor_hours: '', labor_rate: 35, notes: '', tags: []
  });
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const addMaterial = () => setForm(f => ({ ...f, materials_used: [...(f.materials_used || []), { material: '', quantity: 1, unit_price: '' }] }));
  const updateMat = (i, field, val) => setForm(f => ({ ...f, materials_used: f.materials_used.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }));
  const removeMat = (i) => setForm(f => ({ ...f, materials_used: f.materials_used.filter((_, idx) => idx !== i) }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (!t || (form.tags || []).includes(t)) return;
    setForm(f => ({ ...f, tags: [...(f.tags || []), t] }));
    setTagInput('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-3 text-sm">
      <Input placeholder="Nombre de la plantilla *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="font-semibold" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tipo de equipo</label>
          <Select value={form.equipment_type} onValueChange={v => setForm(f => ({ ...f, equipment_type: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{EQUIPMENT.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tipo de trabajo</label>
          <Select value={form.work_type} onValueChange={v => setForm(f => ({ ...f, work_type: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{WORK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 block">Descripción del trabajo</label>
        <textarea className="w-full border border-input rounded-md px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring" rows={3}
          placeholder="Ej: Mantenimiento preventivo de cámara frigorífica. Revisión de presiones, temperatura y estanqueidad..."
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Diagnóstico</label>
        <textarea className="w-full border border-input rounded-md px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring" rows={2}
          placeholder="Ej: Equipo funcionando dentro de parámetros. Presión alta 18 bar, presión baja 4.5 bar. Temperatura cámara -18ºC."
          value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} />
      </div>
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Solución / Trabajos realizados</label>
        <textarea className="w-full border border-input rounded-md px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring" rows={3}
          placeholder="Ej: - Limpieza de condensador y evaporador&#10;- Comprobación de presostatos y termostatos&#10;- Verificación de carga de refrigerante&#10;- Engrase de motores&#10;- Revisión de estanqueidad según F-Gas"
          value={form.solution} onChange={e => setForm(f => ({ ...f, solution: e.target.value }))} />
      </div>

      {/* Materiales */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-gray-600">Materiales típicos</label>
          <button onClick={addMaterial} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
            <Plus className="w-3 h-3" />Añadir
          </button>
        </div>
        <div className="space-y-1">
          {(form.materials_used || []).map((m, i) => (
            <div key={i} className="grid grid-cols-5 gap-1">
              <input className="col-span-3 h-7 text-xs border border-input rounded-md px-2" placeholder="Material"
                value={m.material} onChange={e => updateMat(i, 'material', e.target.value)} />
              <NumberField className="h-7 text-xs border border-input rounded-md px-2" placeholder="Cant"
                value={m.quantity} onChange={v => updateMat(i, 'quantity', v)} />
              <div className="flex gap-1">
                <NumberField className="h-7 text-xs flex-1 border border-input rounded-md px-2" placeholder="€/ud"
                  value={m.unit_price} onChange={v => updateMat(i, 'unit_price', v)} />
                <button onClick={() => removeMat(i)} className="text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Horas */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Horas estimadas</label>
          <NumberField value={form.labor_hours} onChange={v => setForm(f => ({ ...f, labor_hours: v }))} className="h-8 text-xs" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">€/hora</label>
          <NumberField value={form.labor_rate} onChange={v => setForm(f => ({ ...f, labor_rate: v }))} className="h-8 text-xs" />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Etiquetas</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {(form.tags || []).map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px]">
              {t}
              <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter((_, ti) => ti !== i) }))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTag()}
            placeholder="Añadir etiqueta (Enter)" className="h-7 text-xs flex-1" />
          <Button size="sm" variant="outline" onClick={addTag} className="h-7 text-xs px-2">+</Button>
        </div>
      </div>

      <Input placeholder="Notas internas de la plantilla" value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-xs" />

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
          {template?.id ? 'Actualizar plantilla' : 'Guardar plantilla'}
        </Button>
        <Button variant="outline" onClick={onCancel} className="h-9 text-sm">Cancelar</Button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SATTemplateSelector({ onApply }) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterEquip, setFilterEquip] = useState('all');
  const [view, setView] = useState('list'); // list | new | edit
  const [editingTemplate, setEditingTemplate] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.SATWorkTemplate.list('name', 200);
    setTemplates(data);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const filtered = useMemo(() => {
    let list = templates;
    if (filterEquip !== 'all') list = list.filter(t => t.equipment_type === filterEquip);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        (t.tags || []).some(tag => tag.includes(q))
      );
    }
    return list;
  }, [templates, search, filterEquip]);

  const handleSave = async (form) => {
    if (editingTemplate?.id) {
      await base44.entities.SATWorkTemplate.update(editingTemplate.id, form);
      toast.success('Plantilla actualizada');
    } else {
      await base44.entities.SATWorkTemplate.create(form);
      toast.success('Plantilla creada');
    }
    await load();
    setView('list');
    setEditingTemplate(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    await base44.entities.SATWorkTemplate.delete(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.success('Eliminada');
  };

  const handleApply = (tpl) => {
    onApply({
      type: tpl.work_type,
      equipment_type: tpl.equipment_type,
      description: tpl.description || '',
      diagnosis: tpl.diagnosis || '',
      solution: tpl.solution || '',
      materials_used: (tpl.materials_used || []).map(m => ({ ...m })),
      labor_hours: tpl.labor_hours || 0,
      labor_rate: tpl.labor_rate || 35,
      notes: tpl.notes || '',
    });
    setOpen(false);
    toast.success(`Plantilla "${tpl.name}" aplicada`);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
        onClick={() => { setOpen(true); setView('list'); }}
      >
        <ClipboardList className="w-4 h-4" />
        Plantillas
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                {view === 'list' ? 'Plantillas de parte SAT' : view === 'new' ? 'Nueva plantilla' : 'Editar plantilla'}
              </DialogTitle>
              {view !== 'list' && (
                <Button size="sm" variant="ghost" onClick={() => { setView('list'); setEditingTemplate(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </DialogHeader>

          {view === 'list' && (
            <div className="space-y-3">
              {/* Filtros */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input placeholder="Buscar plantilla..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                </div>
                <Select value={filterEquip} onValueChange={setFilterEquip}>
                  <SelectTrigger className="h-8 text-xs w-[160px]"><SelectValue placeholder="Equipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los equipos</SelectItem>
                    {EQUIPMENT.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" className="h-8 gap-1 bg-blue-600 hover:bg-blue-700" onClick={() => setView('new')}>
                  <Plus className="w-3.5 h-3.5" />Nueva
                </Button>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{templates.length === 0 ? 'No hay plantillas creadas aún' : 'Sin resultados'}</p>
                  {templates.length === 0 && (
                    <Button size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700" onClick={() => setView('new')}>
                      <Plus className="w-3.5 h-3.5 mr-1" />Crear primera plantilla
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map(tpl => (
                    <div key={tpl.id} className="border rounded-xl p-3 bg-white hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm text-gray-900">{tpl.name}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{tpl.equipment_type?.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{tpl.work_type}</span>
                            {(tpl.tags || []).map(tag => (
                              <span key={tag} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{tag}</span>
                            ))}
                          </div>
                          {tpl.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.description}</p>}
                          {(tpl.materials_used?.length > 0 || tpl.labor_hours > 0) && (
                            <p className="text-[10px] text-gray-400 mt-1">
                              {tpl.materials_used?.length > 0 && `${tpl.materials_used.length} material(es)`}
                              {tpl.labor_hours > 0 && ` · ${tpl.labor_hours}h × ${tpl.labor_rate}€`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleApply(tpl)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                            <Check className="w-3 h-3" />Usar
                          </button>
                          <button onClick={() => { setEditingTemplate(tpl); setView('edit'); }} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(tpl.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(view === 'new' || view === 'edit') && (
            <TemplateEditor
              template={editingTemplate}
              onSave={handleSave}
              onCancel={() => { setView('list'); setEditingTemplate(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}