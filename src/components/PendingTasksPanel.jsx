import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle, Wrench, Calendar, MessageCircle, RefreshCw } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function PendingTasksPanel() {
  const [tasks, setTasks] = useState({
    presupuestos: [],
    satOrders: [],
    maintenance: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPendingTasks();
    const interval = setInterval(loadPendingTasks, 300000); // Actualizar cada 5 minutos
    return () => clearInterval(interval);
  }, []);

  const loadPendingTasks = async () => {
    try {
      const [invoices, satOrders, maintenance, contacts] = await Promise.all([
        base44.entities.Invoice.list('-date', 500),
        base44.entities.SATOrder.list('-date', 500),
        base44.entities.MaintenanceSheet.list('-date', 500),
        base44.entities.Contact.list('name', 500)
      ]);

      const today = new Date();
      const contactMap = Object.fromEntries(contacts.map(c => [c.id, c]));

      // Presupuestos enviados hace >7 días sin respuesta
      const presupuestosAtrasados = invoices.filter(inv => {
        if (inv.doc_type !== 'presupuesto' || !['borrador', 'enviado'].includes(inv.status)) return false;
        if (!inv.date) return false;
        const days = differenceInDays(today, parseISO(inv.date));
        return days > 7 && inv.status === 'enviado'; // Enviados hace más de 7 días sin firmar
      }).map(inv => ({
        ...inv,
        daysOld: differenceInDays(today, parseISO(inv.date)),
        contact: contactMap[inv.contact_id]
      }));

      // SAT pendientes >5 días
      const satAtrasados = satOrders.filter(sat => {
        if (sat.status !== 'pendiente' || !sat.date) return false;
        const days = differenceInDays(today, parseISO(sat.date));
        return days > 5;
      }).map(sat => ({
        ...sat,
        daysOld: differenceInDays(today, parseISO(sat.date)),
        contact: contactMap[sat.contact_id]
      }));

      // Próximos mantenimientos (últimos >60 días)
      const maintenanceAlerts = maintenance
        .filter(m => m.date && differenceInDays(today, parseISO(m.date)) > 60)
        .sort((a, b) => parseISO(b.date) - parseISO(a.date))
        .slice(0, 5)
        .map(m => ({
          ...m,
          daysSinceLastMaint: differenceInDays(today, parseISO(m.date)),
          contact: contactMap[m.contact_id]
        }));

      setTasks({
        presupuestos: presupuestosAtrasados.sort((a, b) => b.daysOld - a.daysOld),
        satOrders: satAtrasados.sort((a, b) => b.daysOld - a.daysOld),
        maintenance: maintenanceAlerts
      });
    } catch (error) {
      console.error('Error loading pending tasks:', error);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    await loadPendingTasks();
  };

  const testReminders = async () => {
    try {
      await base44.functions.invoke('appointmentReminder', {});
      alert('Recordatorios enviados ✓');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const sendReminder = async (task, type) => {
    const contact = type === 'presupuesto' ? task.contact : type === 'sat' ? task.contact : task.contact;
    if (!contact) return;

    const phone = contact.phone?.replace(/\D/g, '');
    if (phone) {
      const msg = type === 'presupuesto'
        ? `Estimado/a ${contact.name}, le recordamos que está pendiente su respuesta al presupuesto Nº${task.doc_number} por ${task.total?.toFixed(2)} € que le enviamos hace ${task.daysOld} días. ¿Tiene alguna consulta?`
        : type === 'sat'
        ? `Hola ${contact.name}, le contactamos sobre la orden de servicio SAT #${task.order_number} que lleva ${task.daysOld} días pendiente. ¿Cuándo le viene bien una visita?`
        : `Estimado/a ${contact.name}, le contactamos para recordarle que el mantenimiento de su equipo está pendiente (última revisión hace ${task.daysSinceLastMaint} días). ¿Le programamos una cita?`;
      
      window.open(`https://wa.me/34${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const totalPending = tasks.presupuestos.length + tasks.satOrders.length + tasks.maintenance.length;

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4 text-center text-gray-500">
          <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
          Cargando tareas pendientes...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${totalPending > 0 ? 'border-l-orange-500 bg-orange-50' : 'border-l-green-500 bg-green-50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${totalPending > 0 ? 'text-orange-600' : 'text-green-600'}`} />
            <CardTitle className="text-sm">Tareas Pendientes</CardTitle>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={testReminders} title="Enviar recordatorios de citas ahora">
              📱
            </Button>
            <Button size="sm" variant="ghost" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalPending === 0 ? (
          <div className="text-center py-4 text-green-700">
            <CheckCircle className="w-6 h-6 mx-auto mb-1" />
            <p className="text-sm font-medium">¡Sin tareas pendientes!</p>
          </div>
        ) : (
          <>
            {/* Presupuestos */}
            {tasks.presupuestos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-orange-700">📋 PRESUPUESTOS SIN RESPUESTA ({tasks.presupuestos.length})</p>
                {tasks.presupuestos.map(p => (
                  <div key={p.id} className="flex items-start justify-between gap-2 p-2 rounded bg-white border border-orange-100 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{p.contact_name} — Nº{p.doc_number}</p>
                      <p className="text-gray-500 text-[10px]">{p.total?.toFixed(2)} € · Hace {p.daysOld} días</p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-700 text-[10px] whitespace-nowrap">{p.daysOld}+ días</Badge>
                    <button
                      onClick={() => sendReminder(p, 'presupuesto')}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Recordatorio WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* SAT Pendientes */}
            {tasks.satOrders.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-red-700">🔧 SAT PENDIENTES >5 DÍAS ({tasks.satOrders.length})</p>
                {tasks.satOrders.map(s => (
                  <div key={s.id} className="flex items-start justify-between gap-2 p-2 rounded bg-white border border-red-100 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">#{s.order_number || 'S/N'} — {s.contact_name}</p>
                      <p className="text-gray-500 text-[10px]">{s.type} · Hace {s.daysOld} días</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 text-[10px] whitespace-nowrap">{s.daysOld}+ días</Badge>
                    <button
                      onClick={() => sendReminder(s, 'sat')}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Recordatorio WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Mantenimientos */}
            {tasks.maintenance.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-amber-700">⚙️ MANTENIMIENTOS PENDIENTES ({tasks.maintenance.length})</p>
                {tasks.maintenance.map(m => (
                  <div key={m.id} className="flex items-start justify-between gap-2 p-2 rounded bg-white border border-amber-100 text-xs">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{m.contact_name} — {m.equipment_brand} {m.equipment_model}</p>
                      <p className="text-gray-500 text-[10px]">{m.type} · Hace {m.daysSinceLastMaint} días</p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 text-[10px] whitespace-nowrap">{m.daysSinceLastMaint}d</Badge>
                    <button
                      onClick={() => sendReminder(m, 'maintenance')}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="Recordatorio WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}