import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plus, Trash2, Edit, Check, Clock, AlertTriangle, Calendar, Wrench, FileText, Users, Zap } from 'lucide-react';
import { format, addDays, parseISO, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

const REMINDER_TYPES = [
  { value: 'cita', label: 'Cita / Visita', icon: Calendar, color: 'blue' },
  { value: 'mantenimiento', label: 'Mantenimiento programado', icon: Wrench, color: 'orange' },
  { value: 'factura', label: 'Vencimiento factura', icon: FileText, color: 'red' },
  { value: 'contacto', label: 'Seguimiento cliente', icon: Users, color: 'green' },
  { value: 'revision', label: 'Revisión de equipo', icon: Zap, color: 'purple' },
  { value: 'otro', label: 'Otro recordatorio', icon: Bell, color: 'gray' },
];

const RECURRENCE = [
  { value: 'none', label: 'Sin repetición' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensualmente' },
  { value: 'quarterly', label: 'Cada 3 meses' },
  { value: 'yearly', label: 'Anualmente' },
];

const EMPTY = {
  title: '', description: '', type: 'otro', due_date: '', due_time: '',
  contact_name: '', recurrence: 'none', is_done: false, priority: 'media',
  notify_days_before: 1,
};

const PRIORITY_COLOR = { alta: 'bg-red-100 text-red-700', media: 'bg-yellow-100 text-yellow-700', baja: 'bg-green-100 text-green-700' };

function ReminderCard({ r, onEdit, onDelete, onToggle }) {
  const typeInfo = REMINDER_TYPES.find(t => t.value === r.type) || REMINDER_TYPES[5];
  const Icon = typeInfo.icon;
  const daysLeft = r.due_date ? differenceInDays(parseISO(r.due_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && !r.is_done;
  const isUrgent = daysLeft !== null && daysLeft <= 2 && !r.is_done;

  return (
    <Card className={`border-l-4 ${r.is_done ? 'opacity-50 border-l-gray-300' : isOverdue ? 'border-l-red-500' : isUrgent ? 'border-l-orange-400' : 'border-l-blue-400'}`}>
      <CardContent className="p-3 flex items-start gap-3">
        <button onClick={() => onToggle(r)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${r.is_done ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'}`}>
          {r.is_done && <Check className="w-3 h-3 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`font-medium text-sm ${r.is_done ? 'line-through text-gray-400' : ''}`}>{r.title}</p>
            <Badge className={`text-[10px] px-1.5 ${PRIORITY_COLOR[r.priority] || PRIORITY_COLOR.media}`}>{r.priority}</Badge>
            {isOverdue && <Badge className="bg-red-100 text-red-700 text-[10px]">⚠ Vencido</Badge>}
            {isUrgent && !isOverdue && <Badge className="bg-orange-100 text-orange-700 text-[10px]">⏰ Urgente</Badge>}
          </div>
          {r.contact_name && <p className="text-xs text-gray-500">👤 {r.contact_name}</p>}
          {r.description && <p className="text-xs text-gray-400 truncate">{r.description}</p>}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {r.due_date && (
              <span className={isOverdue ? 'text-red-500 font-medium' : ''}>
                📅 {format(parseISO(r.due_date), 'dd/MM/yyyy')} {r.due_time && `• ${r.due_time}`}
                {daysLeft !== null && !r.is_done && (
                  <span className="ml-1">({daysLeft === 0 ? 'hoy' : daysLeft > 0 ? `en ${daysLeft}d` : `hace ${Math.abs(daysLeft)}d`})</span>
                )}
              </span>
            )}
            {r.recurrence !== 'none' && <span>🔁 {RECURRENCE.find(x => x.value === r.recurrence)?.label}</span>}
            <span className="flex items-center gap-1"><Icon className="w-3 h-3" />{typeInfo.label}</span>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(r)} className="p-1 text-gray-300 hover:text-blue-500 rounded"><Edit className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(r.id)} className="p-1 text-gray-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Automations() {
  const [reminders, setReminders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [filterTab, setFilterTab] = useState('pending');
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);

  useEffect(() => {
    loadAll();
    base44.entities.Contact.list('name', 500).then(setContacts);
  }, []);

  const loadAll = () => {
    const stored = localStorage.getItem('reminders_v2');
    setReminders(stored ? JSON.parse(stored) : []);
  };

  const save = (list) => {
    setReminders(list);
    localStorage.setItem('reminders_v2', JSON.stringify(list));
  };

  const handleSave = () => {
    if (!form.title) return;
    if (editing) {
      save(reminders.map(r => r.id === editing ? { ...form, id: editing } : r));
    } else {
      save([...reminders, { ...form, id: Date.now(), is_done: false }]);
    }
    setDialog(false);
    setEditing(null);
    setForm(EMPTY);
  };

  const handleDelete = (id) => {
    if (!confirm('¿Eliminar recordatorio?')) return;
    save(reminders.filter(r => r.id !== id));
  };

  const handleToggle = (r) => {
    save(reminders.map(x => x.id === r.id ? { ...x, is_done: !x.is_done } : x));
  };

  const filteredContacts = contacts.filter(c =>
    `${c.name} ${c.surname || ''} ${c.company_name || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
  ).slice(0, 8);

  const today = format(new Date(), 'yyyy-MM-dd');
  const pending = reminders.filter(r => !r.is_done);
  const done = reminders.filter(r => r.is_done);
  const overdue = pending.filter(r => r.due_date && r.due_date < today);
  const urgent = pending.filter(r => r.due_date && r.due_date >= today && differenceInDays(parseISO(r.due_date), new Date()) <= 3);
  const upcoming = pending.filter(r => !r.due_date || differenceInDays(parseISO(r.due_date || today), new Date()) > 3);

  const displayList = filterTab === 'pending' ? pending
    : filterTab === 'overdue' ? overdue
    : filterTab === 'urgent' ? urgent
    : done;

  const sorted = [...displayList].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6 text-amber-500" /> Recordatorios y Automatizaciones
        </h1>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setDialog(true); }} className="bg-amber-500 hover:bg-amber-600">
          <Plus className="w-4 h-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
            <p className="text-xs text-red-500">Vencidos</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{urgent.length}</p>
            <p className="text-xs text-orange-500">Esta semana</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{done.length}</p>
            <p className="text-xs text-green-500">Completados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filterTab} onValueChange={setFilterTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 text-xs">Pendientes ({pending.length})</TabsTrigger>
          <TabsTrigger value="overdue" className="flex-1 text-xs">⚠ Vencidos ({overdue.length})</TabsTrigger>
          <TabsTrigger value="urgent" className="flex-1 text-xs">⏰ Urgentes ({urgent.length})</TabsTrigger>
          <TabsTrigger value="done" className="flex-1 text-xs">✅ Hechos ({done.length})</TabsTrigger>
        </TabsList>
        {['pending','overdue','urgent','done'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-2 pt-2">
            {sorted.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No hay recordatorios en esta categoría</p>
            ) : sorted.map(r => (
              <ReminderCard key={r.id} r={r} onEdit={r => { setEditing(r.id); setForm({ ...EMPTY, ...r }); setDialog(true); }} onDelete={handleDelete} onToggle={handleToggle} />
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Automatizaciones sugeridas */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-blue-500" />Automatizaciones sugeridas</CardTitle></CardHeader>
        <CardContent className="p-3 space-y-2">
          {[
            { text: 'Recordatorio 30 días antes de mantenimiento anual', icon: Wrench },
            { text: 'Aviso de factura vencida sin pagar', icon: FileText },
            { text: 'Seguimiento 7 días después de presupuesto enviado', icon: Users },
            { text: 'Revisión de equipos de refrigeración cada 6 meses', icon: Clock },
          ].map((a, i) => (
            <button key={i} onClick={() => {
              setEditing(null);
              setForm({ ...EMPTY, title: a.text });
              setDialog(true);
            }} className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-blue-100 text-sm text-blue-700">
              <a.icon className="w-4 h-4 flex-shrink-0" />
              <span>{a.text}</span>
              <Plus className="w-3 h-3 ml-auto flex-shrink-0" />
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={o => { setDialog(o); if (!o) { setEditing(null); setForm(EMPTY); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar recordatorio' : 'Nuevo recordatorio'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título del recordatorio *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Tipo</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{REMINDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Prioridad</label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">🔴 Alta</SelectItem>
                    <SelectItem value="media">🟡 Media</SelectItem>
                    <SelectItem value="baja">🟢 Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Fecha límite</label>
                <Input type="date" className="mt-1" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Hora</label>
                <Input type="time" className="mt-1" value={form.due_time} onChange={e => setForm({ ...form, due_time: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">Repetición</label>
              <Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{RECURRENCE.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs text-gray-500">Cliente / Contacto vinculado</label>
              <div className="relative mt-1">
                <Input placeholder="Buscar contacto..." value={form.contact_name}
                  onChange={e => { setForm({ ...form, contact_name: e.target.value }); setContactSearch(e.target.value); setShowContactSearch(true); }}
                  onFocus={() => setShowContactSearch(true)} />
                {showContactSearch && contactSearch && (
                  <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {filteredContacts.map(c => (
                      <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                        onClick={() => { setForm({ ...form, contact_name: `${c.name} ${c.surname || ''}`.trim() }); setContactSearch(''); setShowContactSearch(false); }}>
                        {c.name} {c.surname} {c.company_name && <span className="text-gray-400">· {c.company_name}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Textarea placeholder="Descripción / notas..." rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

            <Button onClick={handleSave} disabled={!form.title} className="w-full bg-amber-500 hover:bg-amber-600">
              {editing ? 'Actualizar' : 'Crear recordatorio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}