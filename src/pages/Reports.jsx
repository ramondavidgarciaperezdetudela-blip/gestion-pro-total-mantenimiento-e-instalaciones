import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Users, FileText, Wrench, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [data, setData] = useState({ invoices: [], contacts: [], sat: [], maintenance: [] });
  const [period, setPeriod] = useState('mes');
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Invoice.list('-date', 500),
      base44.entities.Contact.list(),
      base44.entities.SATOrder.list('-date', 200),
      base44.entities.MaintenanceSheet.list('-date', 200),
    ]).then(([invoices, contacts, sat, maintenance]) => {
      setData({ invoices, contacts, sat, maintenance });
      setLoading(false);
    });
  }, []);

  // Totales
  const totalFacturado = data.invoices.filter(i => i.doc_type === 'factura').reduce((s, i) => s + (i.total || 0), 0);
  const totalPagado = data.invoices.filter(i => i.status === 'pagado').reduce((s, i) => s + (i.total || 0), 0);
  const pendienteCobro = data.invoices.filter(i => i.status === 'enviado').reduce((s, i) => s + (i.total || 0), 0);
  const satCompletadas = data.sat.filter(s => s.status === 'completada').length;
  const satPendientes = data.sat.filter(s => s.status === 'pendiente').length;

  // Gráfico facturación por tipo
  const byDocType = [
    { name: 'Facturas', value: data.invoices.filter(i => i.doc_type === 'factura').length },
    { name: 'Presupuestos', value: data.invoices.filter(i => i.doc_type === 'presupuesto').length },
    { name: 'Recibos', value: data.invoices.filter(i => i.doc_type === 'recibo').length },
  ];

  // Contactos por tipo
  const contactsByType = ['cliente','proveedor','colaborador','otro'].map(t => ({
    name: t, value: data.contacts.filter(c => c.type === t).length
  })).filter(i => i.value > 0);

  // SAT por tipo
  const satByType = ['reparacion','mantenimiento','instalacion','revision'].map(t => ({
    name: t, value: data.sat.filter(s => s.type === t).length
  })).filter(i => i.value > 0);

  const statCards = [
    { title: 'Total Facturado', value: `${totalFacturado.toFixed(2)} €`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
    { title: 'Total Cobrado', value: `${totalPagado.toFixed(2)} €`, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Pendiente Cobro', value: `${pendienteCobro.toFixed(2)} €`, icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Clientes', value: data.contacts.filter(c => c.type === 'cliente').length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'SAT Completadas', value: satCompletadas, icon: Wrench, color: 'text-teal-600', bg: 'bg-teal-50' },
    { title: 'SAT Pendientes', value: satPendientes, icon: Wrench, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-fuchsia-600" />Informes
        </h1>
        <PrintButton contentRef={printRef} title="Informes" />
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-8">Cargando datos...</p>
      ) : (
        <div ref={printRef} className="space-y-6">
          <CompanyHeader />

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {statCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-2`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <p className="text-xs text-gray-500">{s.title}</p>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Documentos por tipo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byDocType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Contactos por tipo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={contactsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name, value}) => `${name}: ${value}`}>
                      {contactsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Órdenes SAT por tipo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={satByType}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{fontSize:11}} />
                    <YAxis tick={{fontSize:11}} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Últimas facturas</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.invoices.filter(i => i.doc_type === 'factura').slice(0, 5).map(inv => (
                    <div key={inv.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate">{inv.contact_name}</span>
                      <span className="font-medium ml-2">{inv.total?.toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}