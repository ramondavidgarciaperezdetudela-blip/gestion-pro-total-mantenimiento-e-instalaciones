import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, AlertCircle, MapPin, RefreshCw } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_COLOR = {
  instalacion:    'bg-blue-100 text-blue-700',
  reparacion:     'bg-orange-100 text-orange-700',
  mantenimiento:  'bg-cyan-100 text-cyan-700',
  presupuesto:    'bg-purple-100 text-purple-700',
  revision:       'bg-teal-100 text-teal-700',
  otro:           'bg-gray-100 text-gray-600',
};

const PRIORITY_LEFT = {
  urgente: 'border-l-4 border-l-red-400 bg-red-50',
  alta:    'border-l-4 border-l-orange-400 bg-orange-50',
  media:   'border-l-4 border-l-blue-300 bg-blue-50',
  baja:    'border-l-4 border-l-gray-300 bg-gray-50',
};

export default function AgendaPanel() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');

    const data = await base44.entities.Appointment.list('-date', 50);
    // Filtrar: hoy + mañana + próximos 7 días con status pendiente o confirmada
    const relevant = data.filter(a =>
      a.date >= today && a.date <= nextWeek &&
      ['pendiente', 'confirmada'].includes(a.status)
    ).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time_start || '').localeCompare(b.time_start || '');
    });

    setAppointments(relevant);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const getDateLabel = (dateStr) => {
    if (dateStr === today) return { label: 'HOY', cls: 'bg-blue-600 text-white' };
    if (dateStr === tomorrow) return { label: 'MAÑANA', cls: 'bg-indigo-500 text-white' };
    try {
      return { label: format(new Date(dateStr + 'T00:00:00'), 'EEE dd/MM', { locale: es }), cls: 'bg-gray-100 text-gray-600' };
    } catch {
      return { label: dateStr, cls: 'bg-gray-100 text-gray-600' };
    }
  };

  // Agrupar por fecha
  const grouped = appointments.reduce((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = [];
    acc[apt.date].push(apt);
    return acc;
  }, {});

  const todayApts = appointments.filter(a => a.date === today);
  const futureApts = appointments.filter(a => a.date !== today);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          Agenda próxima
          {todayApts.length > 0 && (
            <Badge className="bg-blue-100 text-blue-700 text-[10px]">{todayApts.length} hoy</Badge>
          )}
          {futureApts.length > 0 && (
            <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">{futureApts.length} próximas</Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link to={createPageUrl('Agenda')} className="text-blue-500 text-xs font-bold hover:underline">Ver agenda</Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <p className="text-center text-xs text-gray-400 py-4">Cargando citas...</p>
        ) : appointments.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Sin citas en los próximos 7 días</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto overscroll-contain pr-1">
            {Object.entries(grouped).map(([dateStr, apts]) => {
              const { label, cls } = getDateLabel(dateStr);
              return (
                <div key={dateStr}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-[10px] text-gray-400">{apts.length} cita{apts.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-1.5">
                    {apts.map(apt => (
                      <Link key={apt.id} to={createPageUrl('Agenda')} className={`flex items-center gap-3 p-2.5 rounded-lg hover:shadow-sm transition-shadow ${PRIORITY_LEFT[apt.priority] || 'bg-gray-50 border-l-4 border-l-gray-300'}`}>
                        {apt.time_start && (
                          <div className="flex-shrink-0 text-center">
                            <p className="text-xs font-bold text-blue-700">{apt.time_start}</p>
                            {apt.time_end && <p className="text-[9px] text-gray-400">{apt.time_end}</p>}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {apt.priority === 'urgente' && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                            <p className="text-xs font-bold text-gray-800 truncate">{apt.title}</p>
                          </div>
                          {apt.contact_name && <p className="text-[10px] text-gray-500 truncate">{apt.contact_name}</p>}
                          {apt.address && (
                            <p className="text-[10px] text-gray-400 truncate flex items-center gap-0.5">
                              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{apt.address}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge className={`text-[9px] ${TYPE_COLOR[apt.type] || TYPE_COLOR.otro}`}>{apt.type}</Badge>
                          <ChevronRight className="w-3 h-3 text-gray-300" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}