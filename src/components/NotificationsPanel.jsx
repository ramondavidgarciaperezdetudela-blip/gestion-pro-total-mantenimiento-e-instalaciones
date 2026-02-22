import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, AlertTriangle, Clock, CheckCircle, FileText, Wrench, Calendar } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';

function buildNotifications(invoices, sat, appointments, projects) {
  const notifs = [];
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Facturas vencidas
  invoices.filter(i => i.status === 'enviado' && i.due_date && i.due_date < todayStr).forEach(i => {
    notifs.push({
      id: `inv-${i.id}`, type: 'danger', icon: FileText,
      title: `Factura vencida: ${i.contact_name || 'Sin cliente'}`,
      text: `${i.doc_number || ''} · ${i.total?.toFixed(2)} € · Vencida el ${i.due_date}`,
      page: 'Documents',
    });
  });

  // Facturas próximas a vencer (7 días)
  invoices.filter(i => i.status === 'enviado' && i.due_date && i.due_date >= todayStr).forEach(i => {
    const days = differenceInDays(parseISO(i.due_date), today);
    if (days <= 7) {
      notifs.push({
        id: `inv-soon-${i.id}`, type: 'warning', icon: Clock,
        title: `Factura vence en ${days}d: ${i.contact_name || ''}`,
        text: `${i.total?.toFixed(2)} € · ${i.due_date}`,
        page: 'Documents',
      });
    }
  });

  // SAT pendientes o urgentes
  sat.filter(s => s.status === 'pendiente').slice(0, 3).forEach(s => {
    notifs.push({
      id: `sat-${s.id}`, type: 'info', icon: Wrench,
      title: `SAT pendiente: ${s.contact_name || 'Sin cliente'}`,
      text: `${s.type} · ${s.date}`,
      page: 'SAT',
    });
  });

  // Citas de hoy
  appointments.filter(a => a.date === todayStr).forEach(a => {
    notifs.push({
      id: `apt-${a.id}`, type: 'success', icon: Calendar,
      title: `Cita hoy: ${a.title}`,
      text: `${a.time_start || '--:--'} · ${a.contact_name || ''}`,
      page: 'Agenda',
    });
  });

  // Proyectos vencidos
  projects.filter(p => p.end_date && p.end_date < todayStr && p.status !== 'completado' && p.status !== 'cancelado').forEach(p => {
    notifs.push({
      id: `proj-${p.id}`, type: 'danger', icon: AlertTriangle,
      title: `Proyecto vencido: ${p.name}`,
      text: `Fecha fin: ${p.end_date}`,
      page: 'Projects',
    });
  });

  return notifs;
}

const TYPE_STYLES = {
  danger: 'border-l-red-500 bg-red-50',
  warning: 'border-l-orange-400 bg-orange-50',
  info: 'border-l-blue-400 bg-blue-50',
  success: 'border-l-green-400 bg-green-50',
};
const ICON_COLORS = {
  danger: 'text-red-500', warning: 'text-orange-500', info: 'text-blue-500', success: 'text-green-500',
};

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.filter({ status: 'enviado' }, '-due_date', 50),
      base44.entities.SATOrder.filter({ status: 'pendiente' }, '-date', 20),
      base44.entities.Appointment.filter({ date: format(new Date(), 'yyyy-MM-dd') }),
      base44.entities.Project.list('-end_date', 50),
    ]).then(([invoices, sat, apts, projects]) => {
      setNotifications(buildNotifications(invoices, sat, apts, projects));
    });
  }, []);

  const visible = notifications.filter(n => !dismissed.includes(n.id));
  const count = visible.length;

  const dismiss = (id) => {
    const updated = [...dismissed, id];
    setDismissed(updated);
    localStorage.setItem('dismissed_notifs', JSON.stringify(updated));
  };

  const dismissAll = () => {
    const all = notifications.map(n => n.id);
    setDismissed(all);
    localStorage.setItem('dismissed_notifs', JSON.stringify(all));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-white border rounded-xl shadow-xl z-50 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <p className="font-semibold text-sm flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notificaciones
                {count > 0 && <Badge className="bg-red-100 text-red-700 text-xs">{count}</Badge>}
              </p>
              <div className="flex gap-1">
                {count > 0 && <button onClick={dismissAll} className="text-xs text-gray-400 hover:text-gray-600">Limpiar</button>}
                <button onClick={() => setOpen(false)} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {visible.length === 0 ? (
                <div className="text-center p-8 text-gray-400">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">Sin notificaciones pendientes</p>
                </div>
              ) : (
                visible.map(n => {
                  const Icon = n.icon;
                  return (
                    <div key={n.id} className={`border-l-4 p-3 flex items-start gap-2 hover:opacity-90 ${TYPE_STYLES[n.type]}`}>
                      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${ICON_COLORS[n.type]}`} />
                      <div className="flex-1 min-w-0">
                        <Link to={createPageUrl(n.page)} onClick={() => setOpen(false)}>
                          <p className="text-xs font-semibold text-gray-800 truncate hover:underline">{n.title}</p>
                          <p className="text-xs text-gray-500 truncate">{n.text}</p>
                        </Link>
                      </div>
                      <button onClick={() => dismiss(n.id)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}