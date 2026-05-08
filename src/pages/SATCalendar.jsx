import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, CalendarDays, Wrench, ClipboardList, User, Clock, RefreshCw, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pendiente: 'bg-yellow-400',
  en_curso: 'bg-blue-500',
  completada: 'bg-green-500',
  cancelada: 'bg-gray-400',
};
const STATUS_TEXT = {
  pendiente: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  en_curso: 'text-blue-700 bg-blue-50 border-blue-200',
  completada: 'text-green-700 bg-green-50 border-green-200',
  cancelada: 'text-gray-600 bg-gray-50 border-gray-200',
};
const TYPE_COLORS = {
  sat: 'border-l-orange-500',
  maintenance: 'border-l-purple-500',
};

export default function SATCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [satOrders, setSatOrders] = useState([]);
  const [maintenances, setMaintenances] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [filterTech, setFilterTech] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null); // { id, type, item }
  const [dragOver, setDragOver] = useState(null); // dateStr
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDayDetail, setShowDayDetail] = useState(null); // dateStr

  const loadData = async () => {
    setLoading(true);
    const [sats, mants, company] = await Promise.all([
      base44.entities.SATOrder.list('-date', 300),
      base44.entities.MaintenanceSheet.list('-date', 200),
      base44.entities.CompanySettings.list(),
    ]);
    setSatOrders(sats);
    setMaintenances(mants);
    // Extraer técnicos únicos
    const techs = new Set();
    sats.forEach(s => s.technician && techs.add(s.technician));
    mants.forEach(m => m.technician_name && techs.add(m.technician_name));
    if (company[0]?.technicians) company[0].technicians.forEach(t => techs.add(t.name));
    setTechnicians([...techs].filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Días del mes visible
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    const days = [];
    let d = start;
    while (d <= end) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [currentDate]);

  // Eventos por día
  const eventsByDay = useMemo(() => {
    const map = {};
    const addToDay = (dateStr, event) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(event);
    };

    satOrders.forEach(o => {
      const dateStr = o.scheduled_date || o.date;
      if (!dateStr) return;
      if (filterTech !== 'all' && o.technician !== filterTech) return;
      addToDay(dateStr, { ...o, _type: 'sat', _dateField: o.scheduled_date ? 'scheduled_date' : 'date' });
    });

    maintenances.forEach(m => {
      const dateStr = m.date;
      if (!dateStr) return;
      if (filterTech !== 'all' && m.technician_name !== filterTech) return;
      addToDay(dateStr, { ...m, _type: 'maintenance', _dateField: 'date' });
    });

    return map;
  }, [satOrders, maintenances, filterTech]);

  // --- Drag & Drop ---
  const handleDragStart = (e, item) => {
    setDragging(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(dateStr);
  };

  const handleDrop = async (e, targetDateStr) => {
    e.preventDefault();
    if (!dragging || dragging._dateField === undefined) return;
    if ((dragging.scheduled_date || dragging.date) === targetDateStr) { setDragging(null); setDragOver(null); return; }

    setSaving(true);
    try {
      if (dragging._type === 'sat') {
        const field = dragging.scheduled_date ? 'scheduled_date' : 'date';
        await base44.entities.SATOrder.update(dragging.id, { [field]: targetDateStr });
        setSatOrders(prev => prev.map(o => o.id === dragging.id ? { ...o, [field]: targetDateStr } : o));
      } else {
        await base44.entities.MaintenanceSheet.update(dragging.id, { date: targetDateStr });
        setMaintenances(prev => prev.map(m => m.id === dragging.id ? { ...m, date: targetDateStr } : m));
      }
      toast.success(`Movido al ${format(parseISO(targetDateStr), 'd MMM', { locale: es })}`);
    } catch {
      toast.error('Error al mover la cita');
    }
    setSaving(false);
    setDragging(null);
    setDragOver(null);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      technician: item._type === 'sat' ? (item.technician || '') : (item.technician_name || ''),
      status: item.status || 'pendiente',
      scheduled_date: item.scheduled_date || item.date || '',
      scheduled_time: item.scheduled_time || '',
      date: item.date || '',
    });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      if (editItem._type === 'sat') {
        const upd = {
          technician: editForm.technician,
          status: editForm.status,
          scheduled_date: editForm.scheduled_date,
          scheduled_time: editForm.scheduled_time,
        };
        await base44.entities.SATOrder.update(editItem.id, upd);
        setSatOrders(prev => prev.map(o => o.id === editItem.id ? { ...o, ...upd } : o));
      } else {
        const upd = { technician_name: editForm.technician, status: editForm.status, date: editForm.date };
        await base44.entities.MaintenanceSheet.update(editItem.id, upd);
        setMaintenances(prev => prev.map(m => m.id === editItem.id ? { ...m, ...upd } : m));
      }
      toast.success('Guardado correctamente');
      setEditItem(null);
    } catch {
      toast.error('Error al guardar');
    }
    setSaving(false);
  };

  const dayEvents = showDayDetail ? (eventsByDay[showDayDetail] || []) : [];

  const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Calendario SAT & Mantenimientos</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterTech} onValueChange={setFilterTech}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Todos los técnicos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los técnicos</SelectItem>
              {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 text-xs flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" />SAT / Reparación</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" />Mantenimiento</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" />Pendiente</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />En curso</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />Completada</span>
        <span className="text-gray-400 italic ml-2">⟵ Arrastra para cambiar fecha</span>
      </div>

      {/* Navegación mes */}
      <div className="flex items-center gap-3 justify-center">
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h2 className="text-lg font-bold text-gray-800 min-w-[160px] text-center capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-blue-600 text-xs">
          Hoy
        </Button>
      </div>

      {saving && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
          <Loader2 className="w-4 h-4 animate-spin" /> Guardando cambios...
        </div>
      )}

      {/* Calendario */}
      <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
        {/* Cabecera días */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarDays.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const events = eventsByDay[dateStr] || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDragTarget = dragOver === dateStr;
            const todayDay = isToday(day);

            return (
              <div
                key={idx}
                className={`min-h-[90px] border-b border-r p-1 transition-colors cursor-pointer
                  ${!isCurrentMonth ? 'bg-gray-50' : 'bg-white'}
                  ${isDragTarget ? 'bg-blue-50 border-blue-300 ring-2 ring-inset ring-blue-400' : ''}
                  ${todayDay ? 'bg-blue-50/40' : ''}
                  hover:bg-gray-50`}
                onDragOver={e => handleDragOver(e, dateStr)}
                onDrop={e => handleDrop(e, dateStr)}
                onDragLeave={() => setDragOver(null)}
                onClick={() => events.length > 0 && setShowDayDetail(dateStr)}
              >
                {/* Número día */}
                <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                  ${todayDay ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                  {format(day, 'd')}
                </div>

                {/* Eventos (máx 3 + overflow) */}
                <div className="space-y-0.5">
                  {events.slice(0, 3).map((ev, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={e => { e.stopPropagation(); handleDragStart(e, ev); }}
                      onClick={e => { e.stopPropagation(); openEdit(ev); }}
                      className={`flex items-center gap-1 text-[10px] rounded px-1 py-0.5 cursor-grab active:cursor-grabbing truncate border-l-2
                        ${ev._type === 'sat' ? 'bg-orange-50 border-l-orange-400 text-orange-800' : 'bg-purple-50 border-l-purple-400 text-purple-800'}
                        hover:opacity-80 transition-opacity`}
                      title={ev._type === 'sat' ? `SAT: ${ev.contact_name} — ${ev.type || ''}` : `Mant: ${ev.contact_name}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[ev.status] || 'bg-gray-400'}`} />
                      <span className="truncate font-medium">{ev.contact_name || 'Sin cliente'}</span>
                    </div>
                  ))}
                  {events.length > 3 && (
                    <div className="text-[10px] text-gray-500 pl-1">+{events.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog: detalle de día */}
      <Dialog open={!!showDayDetail} onOpenChange={() => setShowDayDetail(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              {showDayDetail && format(parseISO(showDayDetail), "EEEE d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {dayEvents.map((ev, i) => (
              <div key={i} className={`border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow border-l-4
                ${ev._type === 'sat' ? 'border-l-orange-400' : 'border-l-purple-400'}`}
                onClick={() => { openEdit(ev); setShowDayDetail(null); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {ev._type === 'sat' ? <Wrench className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" /> : <ClipboardList className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
                      <span className="font-semibold text-sm truncate">{ev.contact_name}</span>
                    </div>
                    {ev._type === 'sat' && ev.type && <p className="text-xs text-gray-500 capitalize">{ev.type.replace(/_/g, ' ')}</p>}
                    {ev._type === 'maintenance' && <p className="text-xs text-gray-500 capitalize">{ev.type}</p>}
                    {(ev.technician || ev.technician_name) && (
                      <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3" />{ev.technician || ev.technician_name}
                      </p>
                    )}
                    {ev.scheduled_time && <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{ev.scheduled_time}</p>}
                  </div>
                  <Badge className={`text-[10px] border ${STATUS_TEXT[ev.status] || ''}`}>{ev.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar cita */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editItem?._type === 'sat' ? <Wrench className="w-4 h-4 text-orange-500" /> : <ClipboardList className="w-4 h-4 text-purple-500" />}
              {editItem?._type === 'sat' ? 'Orden SAT' : 'Mantenimiento'} — {editItem?.contact_name}
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Técnico asignado</label>
                <Select value={editForm.technician} onValueChange={v => setEditForm(f => ({ ...f, technician: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sin técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin asignar</SelectItem>
                    {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Estado</label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_curso">En curso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editItem._type === 'sat' && (
                <>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Fecha programada</label>
                    <input type="date" className="w-full mt-1 border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={editForm.scheduled_date} onChange={e => setEditForm(f => ({ ...f, scheduled_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium">Hora</label>
                    <input type="time" className="w-full mt-1 border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={editForm.scheduled_time} onChange={e => setEditForm(f => ({ ...f, scheduled_time: e.target.value }))} />
                  </div>
                </>
              )}
              {editItem._type === 'maintenance' && (
                <div>
                  <label className="text-xs text-gray-500 font-medium">Fecha</label>
                  <input type="date" className="w-full mt-1 border border-input rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
                </div>
              )}
              <Button onClick={handleSaveEdit} disabled={saving} className="w-full bg-blue-700 hover:bg-blue-800 gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}