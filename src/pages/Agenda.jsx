import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit, MessageCircle, ExternalLink, Download } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import PrintButton from '../components/PrintButton';

const TYPES = ['instalacion', 'reparacion', 'mantenimiento', 'presupuesto', 'revision', 'otro'];
const STATUSES = ['pendiente', 'confirmada', 'completada', 'cancelada'];
const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];
const priorityColors = { baja: 'bg-gray-100 text-gray-700', media: 'bg-blue-100 text-blue-700', alta: 'bg-orange-100 text-orange-700', urgente: 'bg-red-100 text-red-700' };

export default function Agenda() {
  const [appointments, setAppointments] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'week' | 'month'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', contact_name: '', contact_id: '', date: format(new Date(), 'yyyy-MM-dd'), time_start: '09:00', time_end: '10:00', address: '', type: 'otro', status: 'pendiente', priority: 'media', notes: '' });
  const printRef = useRef(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => { loadAppointments(); base44.entities.Contact.list('name', 500).then(setContacts); }, []);

  const loadAppointments = async () => {
    const data = await base44.entities.Appointment.list('-date', 200);
    setAppointments(data);
  };

  const filteredContacts = contacts.filter(c =>
    `${c.name} ${c.surname || ''} ${c.company_name || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const handleSave = async () => {
    // Check for conflicts
    const sameDay = appointments.filter(a => a.date === form.date && (!editingAppt || a.id !== editingAppt.id));
    const timeConflict = sameDay.find(a => a.time_start === form.time_start);
    if (timeConflict) {
      const ok = window.confirm(`Ya hay una cita a las ${form.time_start}h (${timeConflict.title} - ${timeConflict.contact_name}). ¿Deseas guardarla igualmente?\nConsejo: cambia la hora para evitar solapamiento.`);
      if (!ok) return;
    }
    if (editingAppt) {
      await base44.entities.Appointment.update(editingAppt.id, form);
    } else {
      await base44.entities.Appointment.create(form);
    }
    setDialogOpen(false);
    setEditingAppt(null);
    setForm({ title: '', description: '', contact_name: '', contact_id: '', date: format(new Date(), 'yyyy-MM-dd'), time_start: '09:00', time_end: '10:00', address: '', type: 'otro', status: 'pendiente', priority: 'media', notes: '' });
    setContactSearch('');
    loadAppointments();
  };

  const handleEdit = (appt) => {
    setEditingAppt(appt);
    setForm({ title: appt.title || '', description: appt.description || '', contact_name: appt.contact_name || '', contact_id: appt.contact_id || '', date: appt.date || '', time_start: appt.time_start || '09:00', time_end: appt.time_end || '10:00', address: appt.address || '', type: appt.type || 'otro', status: appt.status || 'pendiente', priority: appt.priority || 'media', notes: appt.notes || '' });
    setContactSearch(appt.contact_name || '');
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Appointment.delete(id);
    loadAppointments();
  };

  const exportToGoogleCalendar = (appt) => {
    const dateStr = appt.date?.replace(/-/g, '');
    const startTime = appt.time_start?.replace(':', '') || '0900';
    const endTime = appt.time_end?.replace(':', '') || '1000';
    const start = `${dateStr}T${startTime}00`;
    const end = `${dateStr}T${endTime}00`;
    const title = encodeURIComponent(appt.title || 'Cita');
    const details = encodeURIComponent(`${appt.description || ''}\nCliente: ${appt.contact_name || ''}\nTipo: ${appt.type || ''}`);
    const location = encodeURIComponent(appt.address || '');
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`, '_blank');
  };

  const exportAllToICS = () => {
    const icsLines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SAT Manager//ES'];
    appointments.forEach(appt => {
      const dateStr = appt.date?.replace(/-/g, '') || '';
      const startTime = appt.time_start?.replace(':', '') || '0900';
      const endTime = appt.time_end?.replace(':', '') || '1000';
      icsLines.push('BEGIN:VEVENT');
      icsLines.push(`SUMMARY:${appt.title || ''}`);
      icsLines.push(`DTSTART:${dateStr}T${startTime}00`);
      icsLines.push(`DTEND:${dateStr}T${endTime}00`);
      icsLines.push(`DESCRIPTION:Cliente: ${appt.contact_name || ''} - ${appt.description || ''}`);
      icsLines.push(`LOCATION:${appt.address || ''}`);
      icsLines.push('END:VEVENT');
    });
    icsLines.push('END:VCALENDAR');
    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `agenda_${new Date().toISOString().slice(0, 10)}.ics`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <div className="flex gap-2">
          <PrintButton contentRef={printRef} title="Agenda" />
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingAppt(null); }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Nueva cita</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingAppt ? 'Editar cita' : 'Nueva cita'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Título *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                {/* Búsqueda de cliente */}
                <div className="relative">
                  <Input placeholder="Buscar cliente..." value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); setShowContactSearch(true); if (!e.target.value) setForm({...form, contact_name: '', contact_id: '', address: ''}); }}
                    onFocus={() => setShowContactSearch(true)} />
                  {form.contact_name && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-green-600">✓ {form.contact_name}</span>}
                  {showContactSearch && contactSearch && (
                    <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredContacts.slice(0, 8).map(c => (
                        <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b last:border-0"
                          onClick={() => {
                            setForm({...form, contact_name: `${c.name} ${c.surname || ''}`, contact_id: c.id, address: c.address ? `${c.address}, ${c.city || ''}` : form.address});
                            setContactSearch(`${c.name} ${c.surname || ''}`);
                            setShowContactSearch(false);
                          }}>
                          <p className="font-medium">{c.name} {c.surname}</p>
                          {c.phone && <p className="text-xs text-gray-400">{c.phone} {c.address && `| ${c.address}`}</p>}
                        </button>
                      ))}
                      {filteredContacts.length === 0 && <p className="p-2 text-sm text-gray-400">Sin resultados</p>}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  <Input type="time" value={form.time_start} onChange={e => setForm({...form, time_start: e.target.value})} />
                  <Input type="time" value={form.time_end} onChange={e => setForm({...form, time_end: e.target.value})} />
                </div>
                <Input placeholder="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                <div className="grid grid-cols-3 gap-2">
                  <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Descripción" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                <Button onClick={handleSave} className="w-full bg-blue-600">{editingAppt ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* View toggle + calendar export */}
      <div className="flex gap-2 flex-wrap items-center">
        <Button size="sm" variant={viewMode === 'week' ? 'default' : 'outline'} onClick={() => setViewMode('week')}>Semana</Button>
        <Button size="sm" variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')}>Mes completo</Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={exportAllToICS} className="gap-1 text-indigo-600 border-indigo-300">
            <Download className="w-3.5 h-3.5" />Exportar .ics (Outlook/Apple)
          </Button>
        </div>
      </div>

      {/* Week nav */}
      {viewMode === 'week' && (
        <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-medium text-sm">
            {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Month nav */}
      {viewMode === 'month' && (
        <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-medium text-sm capitalize">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
          <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Calendar */}
      <div ref={printRef} className="grid grid-cols-1 md:grid-cols-7 gap-2">
        {days.map(day => {
          const dayAppts = appointments.filter(a => a.date && isSameDay(new Date(a.date), day));
          const isToday = isSameDay(day, new Date());
          return (
            <Card key={day.toISOString()} className={`${isToday ? 'ring-2 ring-blue-400' : ''}`}>
              <CardContent className="p-2">
                <div className={`text-center mb-2 py-1 rounded-lg ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>
                  <p className="text-[10px] uppercase">{format(day, 'EEE', { locale: es })}</p>
                  <p className="text-lg font-bold">{format(day, 'd')}</p>
                </div>
                <div className="space-y-1">
                  {dayAppts.map(apt => (
                    <div key={apt.id} className="p-1.5 bg-blue-50 rounded text-xs cursor-pointer hover:bg-blue-100" onClick={() => handleEdit(apt)}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{apt.time_start || ''}</span>
                        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                          {apt.contact_name && (
                            <button
                              title="Recordatorio WhatsApp"
                              onClick={() => {
                                const msg = encodeURIComponent(`Hola ${apt.contact_name}, le recordamos su cita el día ${apt.date} a las ${apt.time_start || ''}h para "${apt.title}". Si necesita cambiarla, contáctenos. ¡Gracias!`);
                                window.open(`https://wa.me/?text=${msg}`, '_blank');
                              }}
                              className="text-green-500 hover:text-green-700"
                            >
                              <MessageCircle className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            title="Añadir a Google Calendar"
                            onClick={() => exportToGoogleCalendar(apt)}
                            className="text-blue-400 hover:text-blue-600"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDelete(apt.id)} className="text-red-400 hover:text-red-600">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="truncate font-medium">{apt.title}</p>
                      {apt.contact_name && <p className="text-gray-500 truncate">{apt.contact_name}</p>}
                      <Badge className={`${priorityColors[apt.priority]} text-[9px] mt-0.5`}>{apt.priority}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>}

      {/* Month view */}
      {viewMode === 'month' && (() => {
        const firstDay = startOfMonth(currentMonth);
        const daysInMonth = getDaysInMonth(currentMonth);
        const startDow = (getDay(firstDay) + 6) % 7; // lunes = 0
        const cells = [];
        for (let i = 0; i < startDow; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
        const weekDays = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
        return (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map(d => <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="min-h-[80px] border-r border-b bg-gray-50" />;
                const dayAppts = appointments.filter(a => a.date && isSameDay(new Date(a.date + 'T00:00:00'), day));
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={i} className={`min-h-[80px] border-r border-b p-1 ${isToday ? 'bg-blue-50' : ''}`}>
                    <p className={`text-xs font-bold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>{day.getDate()}</p>
                    {dayAppts.slice(0, 2).map(apt => (
                      <div key={apt.id} className="text-[10px] bg-blue-100 text-blue-700 rounded px-1 mb-0.5 truncate cursor-pointer hover:bg-blue-200" onClick={() => handleEdit(apt)}>
                        {apt.time_start && <span className="font-bold mr-0.5">{apt.time_start}</span>}{apt.title}
                      </div>
                    ))}
                    {dayAppts.length > 2 && <p className="text-[10px] text-gray-400">+{dayAppts.length - 2} más</p>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}