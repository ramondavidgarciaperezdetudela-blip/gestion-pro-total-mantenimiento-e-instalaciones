import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Euro, Wrench, ClipboardList, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const MONTH_COLORS = ['#6366f1','#8b5cf6','#a78bfa','#c4b5fd','#818cf8','#4f46e5','#7c3aed','#6d28d9','#5b21b6','#4c1d95','#ddd6fe','#ede9fe'];

export default function MonthlyRevenueChart() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [satByPriority, setSatByPriority] = useState([]);
  const [weekMaintenance, setWeekMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [invoices, satOrders, maintenance] = await Promise.all([
        base44.entities.Invoice.filter({ doc_type: 'factura' }),
        base44.entities.SATOrder.list(),
        base44.entities.MaintenanceSheet.list(),
      ]);

      // Ingresos últimos 12 meses
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const key = format(d, 'yyyy-MM');
        const label = format(d, 'MMM yy', { locale: es });
        const total = invoices
          .filter(inv => inv.status === 'pagado' && (inv.date || '').startsWith(key))
          .reduce((s, inv) => s + (inv.total || 0), 0);
        months.push({ key, label, total: Math.round(total) });
      }
      setMonthlyData(months);

      // SAT por prioridad (pendientes)
      const pending = satOrders.filter(s => s.status === 'pendiente');
      const byPriority = [
        { name: 'Urgente', count: pending.filter(s => s.priority === 'urgente').length, color: '#ef4444' },
        { name: 'Alta', count: pending.filter(s => s.priority === 'alta').length, color: '#f97316' },
        { name: 'Normal', count: pending.filter(s => s.priority === 'normal').length, color: '#f59e0b' },
        { name: 'Baja', count: pending.filter(s => s.priority === 'baja').length, color: '#6b7280' },
      ].filter(p => p.count > 0);
      setSatByPriority(byPriority);

      // Mantenimientos que vencen esta semana (status=pendiente, fecha próxima 7 días)
      const today = new Date();
      const nextWeek = addDays(today, 7);
      const todayStr = format(today, 'yyyy-MM-dd');
      const nextWeekStr = format(nextWeek, 'yyyy-MM-dd');
      const dueThisWeek = maintenance.filter(m =>
        m.status !== 'completada' && m.date >= todayStr && m.date <= nextWeekStr
      ).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setWeekMaintenance(dueThisWeek);

      setLoading(false);
    };
    load();
  }, []);

  const maxRevenue = Math.max(...monthlyData.map(m => m.total), 1);
  const currentMonth = monthlyData[monthlyData.length - 1];
  const prevMonth = monthlyData[monthlyData.length - 2];
  const trend = currentMonth && prevMonth && prevMonth.total > 0
    ? ((currentMonth.total - prevMonth.total) / prevMonth.total * 100).toFixed(1)
    : null;

  if (loading) return null;

  return (
    <div className="space-y-4">
      {/* Gráfico ingresos mensuales */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Euro className="w-4 h-4 text-violet-500" />
            Ingresos mensuales cobrados (últimos 12 meses)
          </CardTitle>
          {trend !== null && (
            <Badge className={`text-xs ${parseFloat(trend) >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <TrendingUp className="w-3 h-3 mr-1" />{trend}% vs mes ant.
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis hide />
              <Tooltip formatter={(v) => [`${v.toLocaleString('es-ES')} €`, 'Cobrado']} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, i) => (
                  <Cell key={i} fill={i === monthlyData.length - 1 ? '#6366f1' : '#c4b5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
            <span>Total anual: <strong className="text-gray-700">{monthlyData.reduce((s, m) => s + m.total, 0).toLocaleString('es-ES')} €</strong></span>
            <span>Mes actual: <strong className="text-violet-700">{currentMonth?.total?.toLocaleString('es-ES') || 0} €</strong></span>
          </div>
        </CardContent>
      </Card>

      {/* SAT por prioridad + Mantenimientos semana */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SAT por prioridad */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-orange-500" />
              Trabajos pendientes por prioridad
            </CardTitle>
            <Link to={createPageUrl('SAT')} className="text-blue-500 text-xs font-bold hover:underline">Ver SAT</Link>
          </CardHeader>
          <CardContent>
            {satByPriority.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center flex items-center justify-center gap-1">
                <span>✅</span> Sin trabajos pendientes
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={satByPriority} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} />
                    <Tooltip formatter={(v) => [`${v} órdenes`, 'Pendientes']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {satByPriority.map((p, i) => <Cell key={i} fill={p.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-2 flex-wrap mt-2">
                  {satByPriority.map(p => (
                    <span key={p.name} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: p.color + '20', color: p.color }}>
                      {p.name}: {p.count}
                    </span>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mantenimientos semana */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-cyan-500" />
              Mantenimientos que vencen esta semana
              {weekMaintenance.length > 0 && (
                <Badge className="bg-red-100 text-red-700 text-xs">{weekMaintenance.length}</Badge>
              )}
            </CardTitle>
            <Link to={createPageUrl('Maintenance')} className="text-blue-500 text-xs font-bold hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {weekMaintenance.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">✅ Sin mantenimientos urgentes esta semana</p>
            ) : weekMaintenance.map(m => (
              <Link key={m.id} to={createPageUrl(`Maintenance?view=${m.id}`)}>
                <div className="flex items-center justify-between gap-2 p-2.5 bg-cyan-50 border border-cyan-200 rounded-lg hover:shadow-sm transition-shadow">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-800 truncate">{m.contact_name}</p>
                    <p className="text-[10px] text-gray-500">{m.type} · {m.equipment_brand} {m.equipment_model}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <Badge className="text-[10px] bg-cyan-100 text-cyan-700">{m.date}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}