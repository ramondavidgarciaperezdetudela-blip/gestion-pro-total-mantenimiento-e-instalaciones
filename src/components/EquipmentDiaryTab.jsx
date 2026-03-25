import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wrench, ChevronDown, ChevronUp, Trash2, Edit, Download, FileSpreadsheet, Camera, FolderOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import PhotoGallery from './PhotoGallery';

const MACHINE_TYPES = ['aire_acondicionado', 'bomba_calor', 'camara_frigorifica', 'ventilacion', 'caldera', 'aerotermia', 'solar_fotovoltaico', 'solar_termico', 'electrico_cuadro', 'grupo_frio', 'otro'];
const ENTRY_TYPES = ['reparacion', 'mantenimiento', 'revision', 'instalacion', 'averia', 'otro'];
const ENTRY_TYPE_COLORS = {
  reparacion: 'bg-orange-100 text-orange-700',
  mantenimiento: 'bg-blue-100 text-blue-700',
  revision: 'bg-purple-100 text-purple-700',
  instalacion: 'bg-green-100 text-green-700',
  averia: 'bg-red-100 text-red-700',
  otro: 'bg-gray-100 text-gray-600'
};

const EMPTY_DIARY = {
  machine_name: '', machine_type: 'otro', equipment_brand: '', equipment_model: '',
  serial_number: '', location: '', entries: [], notes: ''
};

const EMPTY_ENTRY = {
  date: new Date().toISOString().split('T')[0],
  type: 'reparacion', technician: '', description: '', solution: '',
  parts_used: '', cost: 0, hours: 0, photos: [], next_action: '', next_action_date: ''
};

export default function EquipmentDiaryTab({ contactId, contactName }) {
  const [diaries, setDiaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diaryDialogOpen, setDiaryDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null); // { diaryId, entryIndex }
  const [diaryForm, setDiaryForm] = useState(EMPTY_DIARY);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const [expandedDiary, setExpandedDiary] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    loadDiaries();
    base44.entities.CompanySettings.list().then((d) => d.length > 0 && setCompany(d[0]));
  }, [contactId]);

  const loadDiaries = async () => {
    setLoading(true);
    const data = await base44.entities.EquipmentDiary.filter({ contact_id: contactId }, '-created_date');
    setDiaries(data);
    setLoading(false);
  };

  const saveDiary = async () => {
    if (!diaryForm.machine_name) {toast.error('Introduce el nombre del equipo');return;}
    const data = { ...diaryForm, contact_id: contactId, contact_name: contactName };
    if (editingDiary) {
      await base44.entities.EquipmentDiary.update(editingDiary.id, data);
    } else {
      await base44.entities.EquipmentDiary.create(data);
    }
    toast.success('Diario guardado');
    setDiaryDialogOpen(false);
    setEditingDiary(null);
    setDiaryForm(EMPTY_DIARY);
    loadDiaries();
  };

  const deleteDiary = async (id) => {
    if (!confirm('¿Eliminar este diario de equipo?')) return;
    await base44.entities.EquipmentDiary.delete(id);
    loadDiaries();
  };

  const openNewEntry = (diaryId) => {
    setEditingEntry({ diaryId, entryIndex: null });
    setEntryForm({ ...EMPTY_ENTRY, date: new Date().toISOString().split('T')[0] });
    setEntryDialogOpen(true);
  };

  const openEditEntry = (diary, entryIndex) => {
    setEditingEntry({ diaryId: diary.id, entryIndex });
    setEntryForm({ ...EMPTY_ENTRY, ...diary.entries[entryIndex] });
    setEntryDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!entryForm.description) {toast.error('Añade una descripción');return;}
    const diary = diaries.find((d) => d.id === editingEntry.diaryId);
    const entries = [...(diary.entries || [])];
    if (editingEntry.entryIndex !== null) {
      entries[editingEntry.entryIndex] = entryForm;
    } else {
      entries.unshift(entryForm); // más reciente primero
    }
    await base44.entities.EquipmentDiary.update(editingEntry.diaryId, { ...diary, entries });
    toast.success('Entrada guardada');
    setEntryDialogOpen(false);
    setEditingEntry(null);
    loadDiaries();
  };

  const deleteEntry = async (diary, entryIndex) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    const entries = diary.entries.filter((_, i) => i !== entryIndex);
    await base44.entities.EquipmentDiary.update(diary.id, { ...diary, entries });
    loadDiaries();
  };

  // Exportar a Excel (CSV compatible con Excel)
  const exportToExcel = (diary) => {
    const rows = [
    ['DIARIO DE REPARACIONES - ' + diary.machine_name],
    ['Cliente:', contactName],
    ['Equipo:', diary.machine_name, 'Tipo:', diary.machine_type?.replace(/_/g, ' ')],
    ['Marca/Modelo:', `${diary.equipment_brand || '-'} ${diary.equipment_model || '-'}`],
    ['Nº Serie:', diary.serial_number || '-', 'Ubicación:', diary.location || '-'],
    [],
    ['Empresa:', company?.company_name || '', 'NIF:', company?.nif || '', 'Tel:', company?.phone || ''],
    [],
    ['FECHA', 'TIPO', 'TÉCNICO', 'DESCRIPCIÓN', 'SOLUCIÓN', 'PIEZAS/MATERIALES', 'HORAS', 'COSTE (€)', 'PRÓXIMA ACCIÓN', 'FECHA PRÓXIMA ACCIÓN']];

    (diary.entries || []).forEach((e) => {
      rows.push([
      e.date || '', e.type || '', e.technician || '', e.description || '',
      e.solution || '', e.parts_used || '', e.hours || 0, e.cost || 0,
      e.next_action || '', e.next_action_date || '']
      );
    });
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diario_${diary.machine_name.replace(/\s+/g, '_')}_${contactName.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado a Excel/CSV');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-600" />
          Diario de Reparaciones de Equipos
        </h3>
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => {setEditingDiary(null);setDiaryForm(EMPTY_DIARY);setDiaryDialogOpen(true);}}>
          <Plus className="w-3 h-3 mr-1" />Nuevo equipo
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>}

      {!loading && diaries.length === 0 &&
      <div className="text-center py-8 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay diarios de equipos todavía</p>
          <p className="text-xs mt-1">Crea uno para llevar el historial de reparaciones</p>
        </div>
      }

      {diaries.map((diary) =>
      <Card key={diary.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Cabecera del equipo */}
            <div className="p-3 bg-orange-50 border-b flex items-center justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-orange-800">{diary.machine_name}</p>
                  <Badge className="text-[10px] bg-orange-100 text-orange-700">{diary.machine_type?.replace(/_/g, ' ')}</Badge>
                  {diary.equipment_brand && <span className="text-xs text-gray-500">{diary.equipment_brand} {diary.equipment_model}</span>}
                </div>
                {diary.location && <p className="text-xs text-gray-500 mt-0.5">📍 {diary.location} {diary.serial_number && `• SN: ${diary.serial_number}`}</p>}
                <p className="text-xs text-gray-500 mt-0.5">{(diary.entries || []).length} entrada(s) registrada(s)</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => exportToExcel(diary)}>
                  <FileSpreadsheet className="w-3 h-3 mr-1" />Excel
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {setEditingDiary(diary);setDiaryForm({ ...EMPTY_DIARY, ...diary });setDiaryDialogOpen(true);}}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700" onClick={() => openNewEntry(diary.id)}>
                  <Plus className="w-3 h-3 mr-1" />Añadir
                </Button>
                <button onClick={() => setExpandedDiary(expandedDiary === diary.id ? null : diary.id)} className="text-gray-400 mx-12 px-2 py-2 hover:text-gray-600">
                  {expandedDiary === diary.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="text-slate-900 opacity-100 lucide lucide-chevron-down w-4 h-4" />}
                </button>
                <button onClick={() => deleteDiary(diary.id)} className="p-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Entradas del diario */}
            {expandedDiary === diary.id &&
          <div className="divide-y">
                {(!diary.entries || diary.entries.length === 0) &&
            <p className="text-sm text-gray-400 text-center py-4">Sin entradas. Pulsa "Añadir" para registrar una reparación.</p>
            }
                {(diary.entries || []).map((entry, idx) =>
            <div key={idx} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-gray-700">{entry.date}</span>
                          <Badge className={`text-[10px] ${ENTRY_TYPE_COLORS[entry.type] || ''}`}>{entry.type}</Badge>
                          {entry.technician && <span className="text-xs text-gray-500">Téc: {entry.technician}</span>}
                          {(entry.hours > 0 || entry.cost > 0) &&
                    <span className="text-xs text-gray-500">{entry.hours > 0 ? `${entry.hours}h` : ''}{entry.cost > 0 ? ` · ${entry.cost}€` : ''}</span>
                    }
                        </div>
                        <p className="text-sm text-gray-800">{entry.description}</p>
                        {entry.solution && <p className="text-xs text-green-700 mt-1">✓ {entry.solution}</p>}
                        {entry.parts_used && <p className="text-xs text-blue-600 mt-1">🔩 {entry.parts_used}</p>}
                        {entry.next_action && <p className="text-xs text-amber-600 mt-1">→ {entry.next_action}{entry.next_action_date ? ` (${entry.next_action_date})` : ''}</p>}
                        {entry.photos?.length > 0 &&
                  <div className="flex flex-wrap gap-1 mt-2">
                            {entry.photos.map((p, pi) =>
                    <img key={pi} src={p} alt="" className="w-14 h-14 object-cover rounded border" />
                    )}
                          </div>
                  }
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => openEditEntry(diary, idx)} className="p-1 text-gray-400 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteEntry(diary, idx)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
            )}
              </div>
          }
          </CardContent>
        </Card>
      )}

      {/* Dialog nuevo/editar diario */}
      <Dialog open={diaryDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingDiary ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => {setDiaryDialogOpen(false);setEditingDiary(null);}} className="text-gray-400">✕</Button>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre del equipo *" value={diaryForm.machine_name} onChange={(e) => setDiaryForm({ ...diaryForm, machine_name: e.target.value })} />
            <Select value={diaryForm.machine_type} onValueChange={(v) => setDiaryForm({ ...diaryForm, machine_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MACHINE_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Marca" value={diaryForm.equipment_brand} onChange={(e) => setDiaryForm({ ...diaryForm, equipment_brand: e.target.value })} />
              <Input placeholder="Modelo" value={diaryForm.equipment_model} onChange={(e) => setDiaryForm({ ...diaryForm, equipment_model: e.target.value })} />
            </div>
            <Input placeholder="Nº serie" value={diaryForm.serial_number} onChange={(e) => setDiaryForm({ ...diaryForm, serial_number: e.target.value })} />
            <Input placeholder="Ubicación (ej: planta 1, sala técnica)" value={diaryForm.location} onChange={(e) => setDiaryForm({ ...diaryForm, location: e.target.value })} />
            <Textarea placeholder="Notas" value={diaryForm.notes} onChange={(e) => setDiaryForm({ ...diaryForm, notes: e.target.value })} rows={2} />
            <Button onClick={saveDiary} className="w-full bg-orange-600 hover:bg-orange-700">{editingDiary ? 'Actualizar' : 'Crear diario'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog nueva/editar entrada */}
      <Dialog open={entryDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingEntry?.entryIndex !== null ? 'Editar entrada' : 'Nueva entrada de reparación'}</DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => {setEntryDialogOpen(false);setEditingEntry(null);}} className="text-gray-400">✕</Button>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={entryForm.date} onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })} />
              <Select value={entryForm.type} onValueChange={(v) => setEntryForm({ ...entryForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTRY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Input placeholder="Técnico" value={entryForm.technician} onChange={(e) => setEntryForm({ ...entryForm, technician: e.target.value })} />
            <Textarea placeholder="Descripción del trabajo / avería *" value={entryForm.description} onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })} rows={3} />
            <Textarea placeholder="Solución aplicada" value={entryForm.solution} onChange={(e) => setEntryForm({ ...entryForm, solution: e.target.value })} rows={2} />
            <Textarea placeholder="Piezas / materiales utilizados" value={entryForm.parts_used} onChange={(e) => setEntryForm({ ...entryForm, parts_used: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Horas trabajadas</label>
                <Input type="number" min="0" step="0.5" value={entryForm.hours} onChange={(e) => setEntryForm({ ...entryForm, hours: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Coste (€)</label>
                <Input type="number" min="0" step="0.01" value={entryForm.cost} onChange={(e) => setEntryForm({ ...entryForm, cost: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <Input placeholder="Próxima acción recomendada" value={entryForm.next_action} onChange={(e) => setEntryForm({ ...entryForm, next_action: e.target.value })} />
            <Input type="date" value={entryForm.next_action_date} onChange={(e) => setEntryForm({ ...entryForm, next_action_date: e.target.value })} />
            <PhotoGallery
              photos={entryForm.photos || []}
              onChange={(p) => setEntryForm({ ...entryForm, photos: p })}
              label="Fotos de la reparación"
              maxPhotos={20} />
            
            <Button onClick={saveEntry} className="w-full bg-orange-600 hover:bg-orange-700">
              {editingEntry?.entryIndex !== null ? 'Actualizar entrada' : 'Guardar entrada'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}