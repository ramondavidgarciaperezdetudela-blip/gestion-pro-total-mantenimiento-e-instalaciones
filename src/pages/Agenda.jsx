import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, Printer, Trash2, Edit } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import PrintButton from '../components/PrintButton';

const TYPES = ['instalacion', 'reparacion', 'mantenimiento', 'presupuesto', 'revision', 'otro'];
const STATUSES = ['pendiente', 'confirmada', 'completada', 'cancelada'];
const PRIORITIES = ['baja', 'media', 'alta', 'urgente'];
const priorityColors = { baja: 'bg-gray-100 text-gray-700', media: 'bg-blue-100 text-blue-700', alta: 'bg-orange-100 text-orange-700', urgente: 'bg-red-100 text-red-700' };

export default function Agenda() {
  const [appointments, setAppointments] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'), time_start: '09:00', time_end: '10:00', address: '', type: 'otro', status: 'pendiente', priority: 'media', notes: '' });
  const printRef = useRef(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => { loadAppointments(); }, [currentWeek]);

  const loadAppointments = async () => {
    const data = await base44.entities.Appointment.list('-date', 200);
    setAppointments(data);
  };

  const handleSave = async () => {
    if (editingAppt) {
      await base44.entities.Appointment.update(editingAppt.id, form);
    } else {
      await base44.entities.Appointment.create(form);
    }
    setDialogOpen(false);
    setEditingAppt(null);
    setForm({ title: '', description: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'), time_start: '09:00', time_end: '10:00', address: '', type: 'otro', status: 'pendiente', priority: 'media', notes: '' });
    loadAppointments();
  };

  const handleEdit = (appt) => {
    setEditingAppt(appt);
    setForm({ title: appt.title || '', description: appt.description || '', contact_name: appt.contact_name || '', date: appt.date || '', time_start: appt.time_start || '09:00', time_end: appt.time_end || '10:00', address: appt.address || '', type: appt.type || 'otro', status: appt.status || 'pendiente', priority: appt.priority || 'media', notes: appt.notes || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Appointment.delete(id);
    loadAppointments();
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
                <Input placeholder="Cliente" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} />
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

      {/* Week nav */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
        <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="font-medium text-sm">
          {format(weekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}><ChevronRight className="w-4 h-4" /></Button>
      </div>

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
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(apt.id); }} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </button>
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
      </div>
    </div>
  );
}