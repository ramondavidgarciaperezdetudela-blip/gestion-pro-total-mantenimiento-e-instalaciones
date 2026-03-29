import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TechnicianSelect from './TechnicianSelect';
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wrench, ChevronDown, ChevronUp, Trash2, Edit, Download, FileSpreadsheet, Camera, FolderOpen, X, Printer, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import PhotoGallery from './PhotoGallery';
import PhotosWithNames from './PhotosWithNames';

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
  serial_number: '', location: '', entries: [], notes: ''
};

const EMPTY_ENTRY = {
  date: new Date().toISOString().split('T')[0],
  type: 'reparacion', technician: '', description: '', solution: '',
  parts_used: '', cost: 0, hours: 0, photos: [], photo_names: [], next_action: '', next_action_date: ''
};

export default function EquipmentDiaryTab({ contactId, contactName, contactPhone, contactEmail }) {
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
    base44.entities.CompanySettings.list().then(d => d.length > 0 && setCompany(d[0]));
  }, [contactId]);

  const loadDiaries = async () => {
    setLoading(true);
    const data = await base44.entities.EquipmentDiary.filter({ contact_id: contactId }, '-created_date');
    setDiaries(data);
    setLoading(false);
  };

  const saveDiary = async () => {
    if (!diaryForm.machine_name) { toast.error('Introduce el nombre del equipo'); return; }
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
    if (!entryForm.description) { toast.error('Añade una descripción'); return; }
    const diary = diaries.find(d => d.id === editingEntry.diaryId);
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

  // Imprimir / PDF ficha de una entrada
  const printEntry = (diary, entry) => {
    const w = window.open('', '_blank');
    const photosHtml = (entry.photos || []).length > 0
      ? `<div style="margin-top:16px"><strong>Fotografías:</strong><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${entry.photos.map((url, i) => `<img src="${url}" style="width:160px;height:120px;object-fit:cover;border:1px solid #ccc;border-radius:4px" alt="foto ${i+1}"/>`).join('')}</div></div>`
      : '';
    w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Ficha Reparación - ${diary.machine_name}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;max-width:800px;margin:0 auto;font-size:11px;color:#1f2937}
        h1{font-size:16px;font-weight:700;color:#1e3a5f;margin:0 0 4px}
        h2{font-size:13px;font-weight:600;color:#374151;margin:16px 0 6px;border-bottom:1px solid #e5e7eb;padding-bottom:4px}
        .header{display:flex;justify-content:space-between;border-bottom:2px solid #0ea5e9;padding-bottom:12px;margin-bottom:16px}
        .company{text-align:right;color:#6b7280;font-size:10px}
        table{width:100%;border-collapse:collapse;margin:8px 0}
        td,th{border:1px solid #d1d5db;padding:5px 8px;vertical-align:top}
        th{background:#f3f4f6;font-weight:600;width:30%}
        .badge{display:inline-block;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:600;background:#fed7aa;color:#c2410c}
        .footer{margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center}
        .firma{display:flex;justify-content:space-between;margin-top:32px}
        .firma-box{border-top:1px solid #374151;padding-top:4px;width:45%;text-align:center;font-size:10px;color:#6b7280}
        @media print{body{padding:10px}}
      </style></head><body>
      <div class="header">
        <div><h1>FICHA DE REPARACIÓN</h1><span style="color:#6b7280;font-size:10px">Diario de equipo</span></div>
        <div class="company"><strong>${company?.company_name || ''}</strong><br/>${company?.nif ? `NIF: ${company.nif}` : ''}<br/>${company?.phone || ''}<br/>${company?.email || ''}</div>
      </div>
      <h2>Datos del equipo</h2>
      <table>
        <tr><th>Equipo</th><td><strong>${diary.machine_name}</strong></td></tr>
        <tr><th>Tipo</th><td>${diary.machine_type?.replace(/_/g,' ') || '-'}</td></tr>
        <tr><th>Marca / Modelo</th><td>${[diary.equipment_brand, diary.equipment_model].filter(Boolean).join(' ') || '-'}</td></tr>
        <tr><th>Nº de serie</th><td>${diary.serial_number || '-'}</td></tr>
        <tr><th>Ubicación</th><td>${diary.location || '-'}</td></tr>
        <tr><th>Cliente</th><td>${contactName}</td></tr>
      </table>
      <h2>Detalle de la intervención</h2>
      <table>
        <tr><th>Fecha</th><td>${entry.date || '-'}</td></tr>
        <tr><th>Tipo</th><td><span class="badge">${entry.type || '-'}</span></td></tr>
        <tr><th>Técnico</th><td>${entry.technician || '-'}</td></tr>
        <tr><th>Horas / Coste</th><td>${entry.hours > 0 ? entry.hours + ' h' : '-'} ${entry.cost > 0 ? '· ' + entry.cost + ' €' : ''}</td></tr>
        <tr><th>Descripción del trabajo</th><td>${entry.description || '-'}</td></tr>
        <tr><th>Solución aplicada</th><td>${entry.solution || '-'}</td></tr>
        <tr><th>Materiales / Piezas</th><td>${entry.parts_used || '-'}</td></tr>
        <tr><th>Próxima acción</th><td>${entry.next_action || '-'}${entry.next_action_date ? ' (' + entry.next_action_date + ')' : ''}</td></tr>
      </table>
      ${photosHtml}
      <div class="firma">
        <div class="firma-box">Firma del técnico</div>
        <div class="firma-box">Conformidad del cliente</div>
      </div>
      <div class="footer">Documento generado por ${company?.company_name || 'sistema'} — ${new Date().toLocaleDateString('es-ES')}</div>
      </body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  const sendEntryWhatsApp = (phone, diary, entry) => {
    const p = phone?.replace(/\D/g, '');
    const msg = `🔧 *FICHA DE REPARACIÓN*\n\n*Equipo:* ${diary.machine_name}\n*Fecha:* ${entry.date}\n*Tipo:* ${entry.type}\n*Técnico:* ${entry.technician || '-'}\n\n*Descripción:* ${entry.description}\n${entry.solution ? `*Solución:* ${entry.solution}\n` : ''}${entry.parts_used ? `*Materiales:* ${entry.parts_used}\n` : ''}${entry.next_action ? `*Próxima acción:* ${entry.next_action}` : ''}\n\n${company?.company_name || ''}`;
    const url = p ? `https://wa.me/34${p}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const sendEntryEmail = (email, diary, entry) => {
    const subject = `Ficha reparación - ${diary.machine_name} - ${entry.date}`;
    const body = `Estimado/a cliente,\n\nAdjuntamos el resumen de la intervención realizada:\n\nEquipo: ${diary.machine_name}\nFecha: ${entry.date}\nTipo: ${entry.type}\nTécnico: ${entry.technician || '-'}\n\nDescripción: ${entry.description}\n${entry.solution ? `Solución: ${entry.solution}\n` : ''}${entry.parts_used ? `Materiales: ${entry.parts_used}\n` : ''}${entry.next_action ? `Próxima acción recomendada: ${entry.next_action}${entry.next_action_date ? ' (' + entry.next_action_date + ')' : ''}` : ''}\n\nAtentamente,\n${company?.company_name || ''}`;
    window.open(`mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  // Exportar a Excel (CSV compatible con Excel)
  const exportToExcel = (diary) => {
    const rows = [
      ['DIARIO DE REPARACIONES - ' + diary.machine_name],
      ['Cliente:', contactName],
      ['Equipo:', diary.machine_name, 'Tipo:', diary.machine_type?.replace(/_/g,' ')],
      ['Marca/Modelo:', `${diary.equipment_brand || '-'} ${diary.equipment_model || '-'}`],
      ['Nº Serie:', diary.serial_number || '-', 'Ubicación:', diary.location || '-'],
      [],
      ['Empresa:', company?.company_name || '', 'NIF:', company?.nif || '', 'Tel:', company?.phone || ''],
      [],
      ['FECHA', 'TIPO', 'TÉCNICO', 'DESCRIPCIÓN', 'SOLUCIÓN', 'PIEZAS/MATERIALES', 'HORAS', 'COSTE (€)', 'PRÓXIMA ACCIÓN', 'FECHA PRÓXIMA ACCIÓN'],
    ];
    (diary.entries || []).forEach(e => {
      rows.push([
        e.date || '', e.type || '', e.technician || '', e.description || '',
        e.solution || '', e.parts_used || '', e.hours || 0, e.cost || 0,
        e.next_action || '', e.next_action_date || ''
      ]);
    });
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Diario_${diary.machine_name.replace(/\s+/g,'_')}_${contactName.replace(/\s+/g,'_')}.csv`;
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
        <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={() => { setEditingDiary(null); setDiaryForm(EMPTY_DIARY); setDiaryDialogOpen(true); }}>
          <Plus className="w-3 h-3 mr-1" />Nuevo equipo
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>}

      {!loading && diaries.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay diarios de equipos todavía</p>
          <p className="text-xs mt-1">Crea uno para llevar el historial de reparaciones</p>
        </div>
      )}

      {diaries.map(diary => (
        <Card key={diary.id} className="overflow-hidden">
          <CardContent className="p-0">
            {/* Cabecera del equipo */}
            <div className="p-3 bg-orange-50 border-b flex items-center justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-orange-800">{diary.machine_name}</p>
                  <Badge className="text-[10px] bg-orange-100 text-orange-700">{diary.machine_type?.replace(/_/g,' ')}</Badge>
                  {diary.equipment_brand && <span className="text-xs text-gray-500">{diary.equipment_brand} {diary.equipment_model}</span>}
                </div>
                {diary.location && <p className="text-xs text-gray-500 mt-0.5">📍 {diary.location} {diary.serial_number && `• SN: ${diary.serial_number}`}</p>}
                <p className="text-xs text-gray-500 mt-0.5">{(diary.entries || []).length} entrada(s) registrada(s)</p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => exportToExcel(diary)}>
                  <FileSpreadsheet className="w-3 h-3 mr-1" />Excel
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setEditingDiary(diary); setDiaryForm({ ...EMPTY_DIARY, ...diary }); setDiaryDialogOpen(true); }}>
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700" onClick={() => openNewEntry(diary.id)}>
                  <Plus className="w-3 h-3 mr-1" />Añadir
                </Button>
                <button onClick={() => setExpandedDiary(expandedDiary === diary.id ? null : diary.id)} className="p-1 text-gray-400 hover:text-gray-600">
                  {expandedDiary === diary.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <button onClick={() => deleteDiary(diary.id)} className="p-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Entradas del diario */}
            {expandedDiary === diary.id && (
              <div className="divide-y">
                {(!diary.entries || diary.entries.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">Sin entradas. Pulsa "Añadir" para registrar una reparación.</p>
                )}
                {(diary.entries || []).map((entry, idx) => (
                  <div key={idx} className="p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-semibold text-gray-700">{entry.date}</span>
                          <Badge className={`text-[10px] ${ENTRY_TYPE_COLORS[entry.type] || ''}`}>{entry.type}</Badge>
                          {entry.technician && <span className="text-xs text-gray-500">Téc: {entry.technician}</span>}
                          {(entry.hours > 0 || entry.cost > 0) && (
                            <span className="text-xs text-gray-500">{entry.hours > 0 ? `${entry.hours}h` : ''}{entry.cost > 0 ? ` · ${entry.cost}€` : ''}</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-800">{entry.description}</p>
                        {entry.solution && <p className="text-xs text-green-700 mt-1">✓ {entry.solution}</p>}
                        {entry.parts_used && <p className="text-xs text-blue-600 mt-1">🔩 {entry.parts_used}</p>}
                        {entry.next_action && <p className="text-xs text-amber-600 mt-1">→ {entry.next_action}{entry.next_action_date ? ` (${entry.next_action_date})` : ''}</p>}
                        {entry.photos?.length > 0 && (
                          <PhotosWithNames
                            photos={entry.photos}
                            photoNames={entry.photo_names || []}
                            onNamesChange={async (newNames) => {
                              const entries = diary.entries.map((e, ei) => ei === idx ? { ...e, photo_names: newNames } : e);
                              await base44.entities.EquipmentDiary.update(diary.id, { ...diary, entries });
                              loadDiaries();
                            }}
                          />
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                        <button onClick={() => printEntry(diary, entry)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-100 text-slate-700 hover:bg-slate-200" title="Imprimir / PDF">
                          <Printer className="w-3 h-3" /><span className="hidden sm:inline">PDF</span>
                        </button>
                        <button onClick={() => sendEntryWhatsApp(contactPhone, diary, entry)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100" title="Enviar por WhatsApp">
                          <MessageCircle className="w-3 h-3" /><span className="hidden sm:inline">WA</span>
                        </button>
                        <button onClick={() => sendEntryEmail(contactEmail, diary, entry)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100" title="Enviar por email">
                          <Send className="w-3 h-3" /><span className="hidden sm:inline">Email</span>
                        </button>
                        <button onClick={() => openEditEntry(diary, idx)} className="p-1 text-gray-400 hover:text-blue-600"><Edit className="w-3.5 h-3.5" /></button>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingDiary ? 'Editar equipo' : 'Nuevo equipo'}</DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => { setDiaryDialogOpen(false); setEditingDiary(null); }} className="text-gray-400">✕</Button>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Nombre del equipo *" value={diaryForm.machine_name} onChange={e => setDiaryForm({...diaryForm, machine_name: e.target.value})} />
            <Select value={diaryForm.machine_type} onValueChange={v => setDiaryForm({...diaryForm, machine_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MACHINE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Marca" value={diaryForm.equipment_brand} onChange={e => setDiaryForm({...diaryForm, equipment_brand: e.target.value})} />
              <Input placeholder="Modelo" value={diaryForm.equipment_model} onChange={e => setDiaryForm({...diaryForm, equipment_model: e.target.value})} />
            </div>
            <Input placeholder="Nº serie" value={diaryForm.serial_number} onChange={e => setDiaryForm({...diaryForm, serial_number: e.target.value})} />
            <Input placeholder="Ubicación (ej: planta 1, sala técnica)" value={diaryForm.location} onChange={e => setDiaryForm({...diaryForm, location: e.target.value})} />
            <Textarea placeholder="Notas" value={diaryForm.notes} onChange={e => setDiaryForm({...diaryForm, notes: e.target.value})} rows={2} />
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
            <TechnicianSelect value={entryForm.technician} onChange={v => setEntryForm({...entryForm, technician: v})} placeholder="Seleccionar técnico" />
            <Textarea placeholder="Descripción del trabajo / avería *" value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} rows={3} />
            <Textarea placeholder="Solución aplicada" value={entryForm.solution} onChange={e => setEntryForm({...entryForm, solution: e.target.value})} rows={2} />
            <Textarea placeholder="Piezas / materiales utilizados" value={entryForm.parts_used} onChange={e => setEntryForm({...entryForm, parts_used: e.target.value})} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Horas trabajadas</label>
                <Input type="number" min="0" step="0.5" value={entryForm.hours} onChange={e => setEntryForm({...entryForm, hours: parseFloat(e.target.value) || 0})} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Coste (€)</label>
                <Input type="number" min="0" step="0.01" value={entryForm.cost} onChange={e => setEntryForm({...entryForm, cost: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <Input placeholder="Próxima acción recomendada" value={entryForm.next_action} onChange={e => setEntryForm({...entryForm, next_action: e.target.value})} />
            <Input type="date" value={entryForm.next_action_date} onChange={e => setEntryForm({...entryForm, next_action_date: e.target.value})} />
            <PhotoGallery
              photos={entryForm.photos || []}
              onChange={p => setEntryForm({...entryForm, photos: p})}
              photoNames={entryForm.photo_names || []}
              onNamesChange={n => setEntryForm({...entryForm, photo_names: n})}
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