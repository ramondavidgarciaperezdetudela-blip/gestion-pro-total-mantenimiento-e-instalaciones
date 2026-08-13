import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wrench, ChevronDown, ChevronUp, Trash2, Edit, FileSpreadsheet, Search, Camera, Image, X } from 'lucide-react';
import TechnicianSelect from '../components/TechnicianSelect';
import { toast } from 'sonner';
import PhotoGallery from '../components/PhotoGallery';
import { useRef } from 'react';
import { uploadImage } from '@/lib/uploadImage';

const MACHINE_TYPES = ['aire_acondicionado','bomba_calor','camara_frigorifica','ventilacion','caldera','aerotermia','solar_fotovoltaico','solar_termico','electrico_cuadro','grupo_frio','otro'];
const ENTRY_TYPES = ['reparacion','mantenimiento','revision','instalacion','averia','otro'];
const ENTRY_TYPE_COLORS = {
  reparacion: 'bg-orange-100 text-orange-700',
  mantenimiento: 'bg-blue-100 text-blue-700',
  revision: 'bg-purple-100 text-purple-700',
  instalacion: 'bg-green-100 text-green-700',
  averia: 'bg-red-100 text-red-700',
  otro: 'bg-gray-100 text-gray-600',
};

const EMPTY_DIARY = {
  machine_name: '', machine_type: 'otro', equipment_brand: '', equipment_model: '',
  serial_number: '', serial_number_old: '', location: '', entries: [], notes: '',
  equipment_power_kw: '', equipment_year: '', equipment_refrigerant: '',
  equipment_photo_url: '', warranty_expires: '',
};

const EMPTY_ENTRY = {
  date: new Date().toISOString().split('T')[0],
  type: 'reparacion', technician: '', description: '', solution: '',
  parts_used: '', cost: '', hours: '', photos: [],
  next_action: '', next_action_date: '',
  // Referencia antigua y nueva
  old_serial: '', new_serial: '',
  old_reference: '', new_reference: '',
};

export default function EquipmentDiaryPage() {
  const [diaries, setDiaries] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [diaryDialogOpen, setDiaryDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingDiary, setEditingDiary] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [diaryForm, setDiaryForm] = useState(EMPTY_DIARY);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY);
  const [expandedDiary, setExpandedDiary] = useState(null);
  const [company, setCompany] = useState(null);
  const [filterContact, setFilterContact] = useState('all');
  const [photoUploading, setPhotoUploading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [d, c, comp] = await Promise.all([
      base44.entities.EquipmentDiary.list('-created_date', 200),
      base44.entities.Contact.list('name', 200),
      base44.entities.CompanySettings.list(),
    ]);
    setDiaries(d);
    setContacts(c);
    if (comp.length > 0) setCompany(comp[0]);
    setLoading(false);
  };

  const saveDiary = async () => {
    if (!diaryForm.machine_name) { toast.error('Introduce el nombre del equipo'); return; }
    if (editingDiary) {
      await base44.entities.EquipmentDiary.update(editingDiary.id, diaryForm);
    } else {
      if (!diaryForm.contact_id) { toast.error('Selecciona un cliente'); return; }
      await base44.entities.EquipmentDiary.create(diaryForm);
    }
    toast.success('Diario guardado');
    setDiaryDialogOpen(false);
    setEditingDiary(null);
    setDiaryForm(EMPTY_DIARY);
    loadAll();
  };

  const deleteDiary = async (id) => {
    if (!confirm('¿Eliminar este diario?')) return;
    await base44.entities.EquipmentDiary.delete(id);
    loadAll();
  };

  const openNewEntry = (diary) => {
    setEditingEntry({ diary, entryIndex: null });
    setEntryForm({ ...EMPTY_ENTRY, date: new Date().toISOString().split('T')[0] });
    setEntryDialogOpen(true);
  };

  const openEditEntry = (diary, entryIndex) => {
    setEditingEntry({ diary, entryIndex });
    setEntryForm({ ...EMPTY_ENTRY, ...diary.entries[entryIndex] });
    setEntryDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!entryForm.description) { toast.error('Añade una descripción'); return; }
    const diary = editingEntry.diary;
    const entries = [...(diary.entries || [])];
    if (editingEntry.entryIndex !== null) {
      entries[editingEntry.entryIndex] = entryForm;
    } else {
      entries.unshift(entryForm);
    }
    await base44.entities.EquipmentDiary.update(diary.id, { ...diary, entries });
    toast.success('Entrada guardada');
    setEntryDialogOpen(false);
    setEditingEntry(null);
    loadAll();
  };

  const deleteEntry = async (diary, entryIndex) => {
    if (!confirm('¿Eliminar esta entrada?')) return;
    const entries = diary.entries.filter((_, i) => i !== entryIndex);
    await base44.entities.EquipmentDiary.update(diary.id, { ...diary, entries });
    loadAll();
  };

  const exportToExcel = (diary) => {
    const rows = [
      ['DIARIO DE REPARACIONES Y MANTENIMIENTO'],
      ['Empresa:', company?.company_name || '', 'NIF:', company?.nif || '', 'Tel:', company?.phone || ''],
      [],
      ['Cliente:', diary.contact_name],
      ['Equipo:', diary.machine_name, 'Tipo:', diary.machine_type?.replace(/_/g,' ')],
      ['Marca:', diary.equipment_brand || '-', 'Modelo:', diary.equipment_model || '-'],
      ['Nº Serie actual:', diary.serial_number || '-', 'Nº Serie anterior:', diary.serial_number_old || '-'],
      ['Ubicación:', diary.location || '-'],
      [],
      ['FECHA','TIPO','TÉCNICO','DESCRIPCIÓN','SOLUCIÓN','PIEZAS/MATERIALES','HRS','COSTE(€)','REF.ANTIGUA','REF.NUEVA','Nº SERIE ANT.','Nº SERIE NVO.','PRÓXIMA ACCIÓN','FECHA PRÓX.'],
    ];
    (diary.entries || []).forEach(e => {
      rows.push([
        e.date||'', e.type||'', e.technician||'', e.description||'', e.solution||'',
        e.parts_used||'', e.hours||0, e.cost||0,
        e.old_reference||'', e.new_reference||'',
        e.old_serial||'', e.new_serial||'',
        e.next_action||'', e.next_action_date||''
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diario_${diary.machine_name.replace(/\s+/g,'_')}_${diary.contact_name?.replace(/\s+/g,'_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exportado — ábrelo con Excel o Google Sheets');
  };

  const filtered = diaries.filter(d => {
    const matchSearch = `${d.machine_name} ${d.contact_name} ${d.equipment_brand} ${d.equipment_model} ${d.serial_number}`.toLowerCase().includes(search.toLowerCase());
    const matchContact = filterContact === 'all' || d.contact_id === filterContact;
    return matchSearch && matchContact;
  });

  const uniqueContacts = contacts.filter(c => diaries.some(d => d.contact_id === c.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-orange-600" />Diario de Reparaciones de Equipos
        </h1>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { setEditingDiary(null); setDiaryForm(EMPTY_DIARY); setDiaryDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />Nuevo equipo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar equipo, cliente, marca, nº serie..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterContact} onValueChange={setFilterContact}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {uniqueContacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname||''}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading && <p className="text-center text-gray-400 py-8">Cargando...</p>}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No hay diarios de equipos</p>
          <p className="text-xs mt-1">Crea uno para llevar el historial de reparaciones</p>
        </div>
      )}

      {filtered.map(diary => (
        <Card key={diary.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 bg-orange-50 border-b flex items-start justify-between gap-2 flex-wrap">
              <div className="flex gap-3 flex-1 min-w-0">
                {diary.equipment_photo_url && (
                  <img src={diary.equipment_photo_url} alt="equipo" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-orange-800">{diary.machine_name}</p>
                    <Badge className="text-[10px] bg-orange-100 text-orange-700">{diary.machine_type?.replace(/_/g,' ')}</Badge>
                    {diary.equipment_brand && <span className="text-xs text-gray-500">{diary.equipment_brand} {diary.equipment_model}</span>}
                  </div>
                  <p className="text-xs text-blue-700 font-medium mt-0.5">👤 {diary.contact_name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {diary.serial_number && <p className="text-xs text-gray-500">🔢 SN: {diary.serial_number}{diary.serial_number_old ? ` (ant: ${diary.serial_number_old})` : ''}</p>}
                    {diary.equipment_power_kw && <p className="text-xs text-gray-500">⚡ {diary.equipment_power_kw} kW</p>}
                    {diary.equipment_refrigerant && <p className="text-xs text-gray-500">❄️ {diary.equipment_refrigerant}</p>}
                    {diary.equipment_year && <p className="text-xs text-gray-500">📅 Inst. {diary.equipment_year}</p>}
                    {diary.warranty_expires && <p className="text-xs text-gray-500">🛡️ Garantía: {diary.warranty_expires}</p>}
                    {diary.location && <p className="text-xs text-gray-500">📍 {diary.location}</p>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{(diary.entries||[]).length} entrada(s)</p>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0 flex-wrap">
                <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => exportToExcel(diary)}>
                  <FileSpreadsheet className="w-3 h-3 mr-1" />Excel/CSV
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingDiary(diary); setDiaryForm({...EMPTY_DIARY,...diary}); setDiaryDialogOpen(true); }}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-orange-700" onClick={() => openNewEntry(diary)}>
                  <Plus className="w-3 h-3 mr-1" />Añadir
                </Button>
                <button onClick={() => setExpandedDiary(expandedDiary === diary.id ? null : diary.id)} className="p-1 text-gray-400">
                  {expandedDiary === diary.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteDiary(diary.id)} className="p-1 text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {expandedDiary === diary.id && (
              <div className="divide-y">
                {(!diary.entries || diary.entries.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">Sin entradas. Pulsa "Añadir".</p>
                )}
                {(diary.entries||[]).map((entry, idx) => (
                  <div key={idx} className="p-3 hover:bg-orange-50 cursor-pointer transition-colors border-b last:border-b-0" onClick={() => openEditEntry(diary, idx)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-bold text-gray-700">{entry.date}</span>
                          <Badge className={`text-[10px] ${ENTRY_TYPE_COLORS[entry.type]||''}`}>{entry.type}</Badge>
                          {entry.technician && <span className="text-xs text-gray-500">👷 {entry.technician}</span>}
                          {(entry.hours > 0 || entry.cost > 0) && (
                            <span className="text-xs text-gray-500">{entry.hours>0?`${entry.hours}h`:''}{entry.cost>0?` · ${entry.cost}€`:''}</span>
                          )}
                          <span className="text-[10px] text-orange-400 ml-auto">✎ editar</span>
                        </div>
                        <p className="text-sm text-gray-800">{entry.description}</p>
                        {entry.solution && <p className="text-xs text-green-700 mt-1">✓ {entry.solution}</p>}
                        {entry.parts_used && <p className="text-xs text-blue-600 mt-1">🔩 {entry.parts_used}</p>}
                        {(entry.old_reference || entry.new_reference || entry.old_serial || entry.new_serial) && (
                          <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                            {entry.old_reference && <p>Ref. anterior: <span className="font-medium">{entry.old_reference}</span></p>}
                            {entry.new_reference && <p>Ref. nueva: <span className="font-medium text-blue-700">{entry.new_reference}</span></p>}
                            {entry.old_serial && <p>SN anterior: <span className="font-medium">{entry.old_serial}</span></p>}
                            {entry.new_serial && <p>SN nuevo: <span className="font-medium text-blue-700">{entry.new_serial}</span></p>}
                          </div>
                        )}
                        {entry.next_action && <p className="text-xs text-amber-600 mt-1">→ {entry.next_action}{entry.next_action_date?` (${entry.next_action_date})`:''}</p>}
                        {entry.photos?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.photos.map((p, pi) => <img key={pi} src={p} alt="" className="w-14 h-14 object-cover rounded border" />)}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => deleteEntry(diary, idx)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Dialog nuevo/editar diario */}
      <Dialog open={diaryDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[98vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingDiary ? 'Editar equipo' : 'Nuevo equipo / diario'}</DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => { setDiaryDialogOpen(false); setEditingDiary(null); }} className="text-gray-400">✕</Button>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            {!editingDiary && (
              <Select value={diaryForm.contact_id||''} onValueChange={v => {
                const c = contacts.find(x => x.id === v);
                setDiaryForm({...diaryForm, contact_id: v, contact_name: c ? `${c.name} ${c.surname||''}`.trim() : ''});
              }}>
                <SelectTrigger><SelectValue placeholder="Cliente *" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname||''} {c.company_name?`(${c.company_name})`:''}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {/* Foto del equipo */}
            {diaryForm.equipment_photo_url && (
              <div className="relative w-full h-36 rounded-lg overflow-hidden border bg-gray-100">
                <img src={diaryForm.equipment_photo_url} alt="Equipo" className="w-full h-full object-contain" />
                <button onClick={() => setDiaryForm({...diaryForm, equipment_photo_url: ''})} className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow text-red-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            )}
            <div>
              <label className="text-xs text-gray-500 flex items-center gap-1"><Image className="w-3 h-3" />Foto del equipo</label>
              <div className="flex gap-2 mt-1">
                <Input placeholder="URL de la foto" value={diaryForm.equipment_photo_url||''} onChange={e => setDiaryForm({...diaryForm, equipment_photo_url: e.target.value})} className="flex-1" />
                <label className={`cursor-pointer px-3 py-1.5 text-xs border rounded-md bg-gray-50 hover:bg-gray-100 flex items-center gap-1 text-gray-600 ${photoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <Camera className="w-3 h-3" />{photoUploading ? 'Subiendo...' : 'Subir'}
                  <input type="file" accept="image/*" className="hidden" disabled={photoUploading} onChange={async e => {
                    const f = e.target.files[0]; if (!f) return;
                    setPhotoUploading(true);
                    try {
                      const file_url = await uploadImage(f);
                      setDiaryForm(prev => ({...prev, equipment_photo_url: file_url}));
                    } catch (err) {
                      toast.error('Error al subir la foto. Comprueba tu conexión e inténtalo de nuevo.');
                    } finally {
                      setPhotoUploading(false);
                      e.target.value = '';
                    }
                  }} />
                </label>
              </div>
            </div>
            <Input placeholder="Nombre del equipo *" value={diaryForm.machine_name} onChange={e => setDiaryForm({...diaryForm, machine_name: e.target.value})} />
            <Select value={diaryForm.machine_type} onValueChange={v => setDiaryForm({...diaryForm, machine_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MACHINE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Marca" value={diaryForm.equipment_brand} onChange={e => setDiaryForm({...diaryForm, equipment_brand: e.target.value})} />
              <Input placeholder="Modelo" value={diaryForm.equipment_model} onChange={e => setDiaryForm({...diaryForm, equipment_model: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nº serie actual" value={diaryForm.serial_number} onChange={e => setDiaryForm({...diaryForm, serial_number: e.target.value})} />
              <Input placeholder="Nº serie anterior" value={diaryForm.serial_number_old||''} onChange={e => setDiaryForm({...diaryForm, serial_number_old: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Potencia (kW)</label><NumberField placeholder="3.5" value={diaryForm.equipment_power_kw||''} onChange={v => setDiaryForm({...diaryForm, equipment_power_kw: v})} /></div>
              <div><label className="text-xs text-gray-500">Año instalación</label><NumberField decimals={false} placeholder="2020" value={diaryForm.equipment_year||''} onChange={v => setDiaryForm({...diaryForm, equipment_year: v})} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Gas refrigerante (ej: R-32)" value={diaryForm.equipment_refrigerant||''} onChange={e => setDiaryForm({...diaryForm, equipment_refrigerant: e.target.value})} />
              <div><label className="text-xs text-gray-500">Garantía hasta</label><Input type="date" value={diaryForm.warranty_expires||''} onChange={e => setDiaryForm({...diaryForm, warranty_expires: e.target.value})} /></div>
            </div>
            <Input placeholder="Ubicación (ej: planta 1, sala técnica)" value={diaryForm.location} onChange={e => setDiaryForm({...diaryForm, location: e.target.value})} />
            <Textarea placeholder="Notas" value={diaryForm.notes} onChange={e => setDiaryForm({...diaryForm, notes: e.target.value})} rows={2} />
            <Button onClick={saveDiary} className="w-full bg-orange-600 hover:bg-orange-700">{editingDiary ? 'Actualizar' : 'Crear diario'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog nueva/editar entrada */}
      <Dialog open={entryDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-5xl w-[98vw] max-h-[98vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingEntry?.entryIndex !== null ? 'Editar entrada' : 'Nueva entrada de reparación'}</DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => { setEntryDialogOpen(false); setEditingEntry(null); }} className="text-gray-400">✕</Button>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={entryForm.date} onChange={e => setEntryForm({...entryForm, date: e.target.value})} />
              <Select value={entryForm.type} onValueChange={v => setEntryForm({...entryForm, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTRY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <TechnicianSelect
              value={entryForm.technician}
              onChange={v => setEntryForm({...entryForm, technician: v})}
              placeholder="Seleccionar técnico"
            />
            <Textarea placeholder="Descripción del trabajo / avería *" value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} rows={3} />
            <Textarea placeholder="Solución aplicada" value={entryForm.solution} onChange={e => setEntryForm({...entryForm, solution: e.target.value})} rows={2} />
            <Textarea placeholder="Piezas / materiales utilizados" value={entryForm.parts_used} onChange={e => setEntryForm({...entryForm, parts_used: e.target.value})} rows={2} />

            {/* Referencia antigua y nueva */}
            <div className="border rounded-lg p-3 space-y-2 bg-blue-50">
              <p className="text-xs font-semibold text-blue-800">Cambio de componente / referencia</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Referencia antigua" value={entryForm.old_reference||''} onChange={e => setEntryForm({...entryForm, old_reference: e.target.value})} />
                <Input placeholder="Referencia nueva" value={entryForm.new_reference||''} onChange={e => setEntryForm({...entryForm, new_reference: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nº serie antiguo" value={entryForm.old_serial||''} onChange={e => setEntryForm({...entryForm, old_serial: e.target.value})} />
                <Input placeholder="Nº serie nuevo" value={entryForm.new_serial||''} onChange={e => setEntryForm({...entryForm, new_serial: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Horas trabajadas</label>
                <NumberField value={entryForm.hours} onChange={v => setEntryForm({...entryForm, hours: v})} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Coste (€)</label>
                <NumberField value={entryForm.cost} onChange={v => setEntryForm({...entryForm, cost: v})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Próxima acción" value={entryForm.next_action} onChange={e => setEntryForm({...entryForm, next_action: e.target.value})} />
              <Input type="date" value={entryForm.next_action_date} onChange={e => setEntryForm({...entryForm, next_action_date: e.target.value})} />
            </div>

            <PhotoGallery
              photos={entryForm.photos||[]}
              onChange={p => setEntryForm({...entryForm, photos: p})}
              label="Fotos de la reparación"
              maxPhotos={20}
            />
            <Button onClick={saveEntry} className="w-full bg-orange-600 hover:bg-orange-700">
              {editingEntry?.entryIndex !== null ? 'Actualizar entrada' : 'Guardar entrada'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}