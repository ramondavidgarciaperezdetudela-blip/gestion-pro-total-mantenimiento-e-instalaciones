import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, FileText, Users, Wrench } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
  const [invoices, setInvoices] = useState([]);
  const [satOrders, setSatOrders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [period, setPeriod] = useState('year');
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list('-date', 1000),
      base44.entities.SATOrder.list('-date', 1000),
      base44.entities.Contact.list(),
    ]).then(([inv, sat, cont]) => {
      setInvoices(inv);
      setSatOrders(sat);
      setContacts(cont);
    });
  }, []);

  const totalFacturado = invoices.filter(i => i.doc_type === 'factura').reduce((sum, i) => sum + (i.total || 0), 0);
  const totalPresupuestado = invoices.filter(i => i.doc_type === 'presupuesto').reduce((sum, i) => sum + (i.total || 0), 0);
  const totalPendiente = invoices.filter(i => i.status === 'enviado' || i.status === 'vencido').reduce((sum, i) => sum + (i.total || 0), 0);

  const satByType = satOrders.reduce((acc, o) => { acc[o.type || 'otro'] = (acc[o.type || 'otro'] || 0) + 1; return acc; }, {});
  const satPieData = Object.entries(satByType).map(([name, value]) => ({ name, value }));

  const invoicesByStatus = invoices.reduce((acc, i) => { acc[i.status || 'borrador'] = (acc[i.status || 'borrador'] || 0) + 1; return acc; }, {});
  const statusData = Object.entries(invoicesByStatus).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-4" ref={printRef}>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-fuchsia-500" />Informes</h1>
        <PrintButton contentRef={printRef} title="Informe General" />
      </div>

      <CompanyHeader className="pb-3 border-b" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-blue-700">{totalFacturado.toFixed(2)} €</p>
            <p className="text-xs text-blue-600">Total facturado</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-green-700">{totalPresupuestado.toFixed(2)} €</p>
            <p className="text-xs text-green-600">Presupuestado</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-orange-700">{totalPendiente.toFixed(2)} €</p>
            <p className="text-xs text-orange-600">Pendiente cobro</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100">
          <CardContent className="p-4 text-center">
            <p className="text-xl font-bold text-violet-700">{satOrders.length}</p>
            <p className="text-xs text-violet-600">Órdenes SAT</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Estado documentos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Tipos SAT</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={satPieData} cx="50%" cy="50%" outerRadius={70} fill="#8884d8" dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                  {satPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Resumen</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>Total clientes: {contacts.filter(c => c.type === 'cliente').length}</p>
          <p>Total proveedores: {contacts.filter(c => c.type === 'proveedor').length}</p>
          <p>Facturas emitidas: {invoices.filter(i => i.doc_type === 'factura').length}</p>
          <p>Presupuestos: {invoices.filter(i => i.doc_type === 'presupuesto').length}</p>
          <p>Recibos: {invoices.filter(i => i.doc_type === 'recibo').length}</p>
          <p>SAT completadas: {satOrders.filter(o => o.status === 'completada').length}</p>
          <p>SAT pendientes: {satOrders.filter(o => o.status === 'pendiente').length}</p>
        </CardContent>
      </Card>
    </div>
  );
}