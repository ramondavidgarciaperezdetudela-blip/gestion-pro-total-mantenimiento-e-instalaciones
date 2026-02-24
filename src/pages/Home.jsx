import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar, Users, FileText, Wrench, ClipboardList,
  Thermometer, Sun, BookOpen, Shield, Bot, Settings,
  Building2, FolderOpen, Zap, BarChart3, Clock, AlertCircle,
  StickyNote, Package, Battery, Palette, CreditCard, Bell, Download,
  TrendingUp, TrendingDown, Euro, CheckCircle, XCircle, AlertTriangle,
  ArrowRight, Phone, MapPin, ChevronRight
} from 'lucide-react';
import { format, isAfter, isBefore, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const quickLinks = [
  { name: 'Agenda', page: 'Agenda', icon: Calendar, color: 'bg-blue-500' },
  { name: 'Contactos', page: 'Contacts', icon: Users, color: 'bg-emerald-500' },
  { name: 'Factura', page: 'Documents?type=factura', icon: FileText, color: 'bg-violet-500' },
  { name: 'Presupuesto', page: 'Documents?type=presupuesto', icon: FileText, color: 'bg-blue-600' },
  { name: 'SAT', page: 'SAT', icon: Wrench, color: 'bg-orange-500' },
  { name: 'Mantenimiento', page: 'Maintenance', icon: ClipboardList, color: 'bg-cyan-500' },
  { name: 'Notas', page: 'Notes', icon: StickyNote, color: 'bg-lime-500' },
  { name: 'Inventario', page: 'Inventory', icon: Package, color: 'bg-teal-500' },
  { name: 'Proyectos', page: 'Projects', icon: FolderOpen, color: 'bg-pink-500' },
  { name: 'Proveedores', page: 'Suppliers', icon: Building2, color: 'bg-slate-500' },
  { name: 'Presupuesto IA', page: 'AIBudget', icon: Bot, color: 'bg-purple-500' },
  { name: 'Cálculo Térmico', page: 'ThermalCalc', icon: Thermometer, color: 'bg-red-500' },
  { name: 'Solar+Baterías', page: 'SolarBatteryCalc', icon: Sun, color: 'bg-amber-500' },
  { name: 'Electricidad', page: 'ElectricalCalc', icon: Zap, color: 'bg-yellow-500' },
  { name: 'Normativas', page: 'Regulations', icon: Shield, color: 'bg-indigo-500' },
  { name: 'Manuales', page: 'Manuals', icon: BookOpen, color: 'bg-teal-600' },
  { name: 'Informes', page: 'Reports', icon: BarChart3, color: 'bg-fuchsia-500' },
  { name: 'Asistente IA', page: 'AIAssistant', icon: Bot, color: 'bg-green-500' },
  { name: 'Exportar', page: 'ExportData', icon: Download, color: 'bg-lime-600' },
  { name: 'Configuración', page: 'CompanyConfig', icon: Settings, color: 'bg-gray-500' },
];

function StatCard({ label, value, sub, icon: Icon, color, linkPage }) {
  const content = (
    <Card className={`border-l-4 ${color} hover:shadow-md transition-shadow cursor-pointer`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-white shadow-sm`}>
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {linkPage && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
      </CardContent>
    </Card>
  );
  return linkPage ? <Link to={createPageUrl(linkPage)}>{content}</Link> : content;
}

export default function Home() {
  const [appointments, setAppointments] = useState([]);
  const [company, setCompany] = useState(null);
  const [kpis, setKpis] = useState({
    contacts: 0, totalInvoiced: 0, pendingAmount: 0,
    satPending: 0, overdueInvoices: 0, paidThisMonth: 0,
    unpaidContacts: 0, maintenanceDue: 0
  });
  const [recentDocs, setRecentDocs] = useState([]);
  const [recentSat, setRecentSat] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    Promise.all([
      base44.entities.Appointment.filter({ date: today }),
      base44.entities.Contact.list(),
      base44.entities.Invoice.list('-date', 200),
      base44.entities.SATOrder.list('-date', 50),
      base44.entities.CompanySettings.list(),
      base44.entities.MaintenanceSheet.list('-date', 10),
    ]).then(([appts, contacts, invoices, sat, comp, maintenance]) => {
      setAppointments(appts);
      if (comp.length > 0) setCompany(comp[0]);

      // KPIs financieros
      const facturas = invoices.filter(d => d.doc_type === 'factura');
      const totalInvoiced = facturas.reduce((s, d) => s + (d.total || 0), 0);
      const pendingAmount = facturas.filter(d => ['enviado', 'vencido'].includes(d.status)).reduce((s, d) => s + (d.total || 0), 0);
      const paidThisMonth = facturas.filter(d => d.status === 'pagado' && d.date >= monthStart).reduce((s, d) => s + (d.total || 0), 0);
      const overdueInvoices = facturas.filter(d => d.status === 'vencido').length;
      const satPending = sat.filter(s => s.status === 'pendiente').length;
      const unpaidContacts = contacts.filter(c => (c.pending_amount || 0) > 0).length;

      setKpis({ contacts: contacts.length, totalInvoiced, pendingAmount, satPending, overdueInvoices, paidThisMonth, unpaidContacts });
      setRecentDocs(invoices.slice(0, 5));
      setRecentSat(sat.filter(s => s.status === 'pendiente').slice(0, 4));
      setRecentContacts(contacts.filter(c => c.type === 'cliente').slice(0, 5));

      // Alertas
      const newAlerts = [];
      if (overdueInvoices > 0) newAlerts.push({ type: 'danger', text: `${overdueInvoices} factura(s) vencidas sin cobrar`, page: 'Documents' });
      if (pendingAmount > 500) newAlerts.push({ type: 'warning', text: `${pendingAmount.toFixed(0)}€ pendientes de cobro`, page: 'Documents' });
      if (satPending > 3) newAlerts.push({ type: 'warning', text: `${satPending} órdenes SAT pendientes`, page: 'SAT' });
      setAlerts(newAlerts);
    });
  }, []);

  const STATUS_COLORS = { borrador: 'bg-gray-100 text-gray-600', enviado: 'bg-blue-100 text-blue-700', pagado: 'bg-green-100 text-green-700', vencido: 'bg-red-100 text-red-700', cancelado: 'bg-orange-100 text-orange-700' };
  const SAT_STATUS = { pendiente: 'bg-amber-100 text-amber-700', en_curso: 'bg-blue-100 text-blue-700', completada: 'bg-green-100 text-green-700' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {company?.logo_url && (
          <img src={company.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover shadow-md" />
        )}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {company?.company_name || 'Panel de Control'}
          </h1>
          <p className="text-gray-500 text-sm capitalize">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a, i) => (
            <Link key={i} to={createPageUrl(a.page)}>
              <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${a.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{a.text}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Contactos" value={kpis.contacts} icon={Users} color="border-emerald-400" linkPage="Contacts" />
        <StatCard label="Facturado total" value={`${(kpis.totalInvoiced/1000).toFixed(1)}k€`} icon={Euro} color="border-violet-400" linkPage="Documents" />
        <StatCard label="Pendiente cobro" value={`${kpis.pendingAmount.toFixed(0)}€`} sub={kpis.overdueInvoices > 0 ? `${kpis.overdueInvoices} vencidas` : undefined} icon={AlertCircle} color="border-orange-400" linkPage="Documents" />
        <StatCard label="SAT pendientes" value={kpis.satPending} icon={Wrench} color="border-red-400" linkPage="SAT" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Citas hoy */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Citas de hoy</CardTitle>
            <Link to={createPageUrl('Agenda')} className="text-xs text-blue-500 hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointments.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">Sin citas hoy</p>
            ) : appointments.map(apt => (
              <div key={apt.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="text-xs font-bold text-blue-600 min-w-[40px]">{apt.time_start || '--'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{apt.title}</p>
                  <p className="text-[10px] text-gray-500 truncate">{apt.contact_name}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{apt.type}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Últimos documentos */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-violet-500" />Últimos documentos</CardTitle>
            <Link to={createPageUrl('Documents')} className="text-xs text-blue-500 hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDocs.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">Sin documentos</p>
            ) : recentDocs.map(doc => (
              <div key={doc.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate capitalize">{doc.doc_type} {doc.doc_number}</p>
                  <p className="text-[10px] text-gray-500 truncate">{doc.contact_name}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold">{doc.total?.toFixed(0)}€</span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[doc.status] || ''}`}>{doc.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* SAT pendientes */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Wrench className="w-4 h-4 text-orange-500" />SAT pendientes</CardTitle>
            <Link to={createPageUrl('SAT')} className="text-xs text-blue-500 hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSat.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">Sin órdenes pendientes</p>
            ) : recentSat.map(sat => (
              <div key={sat.id} className="p-2 bg-orange-50 rounded-lg">
                <p className="text-xs font-medium truncate">{sat.contact_name}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-[10px] text-gray-500">{sat.type} · {sat.date}</p>
                  <Badge className={`text-[10px] ${SAT_STATUS[sat.status] || ''}`}>{sat.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Clientes recientes + acciones rápidas documentación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" />Clientes recientes</CardTitle>
            <Link to={createPageUrl('Contacts')} className="text-xs text-blue-500 hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentContacts.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">Sin clientes</p>
            ) : recentContacts.map(c => (
              <Link key={c.id} to={createPageUrl(`ContactDetail?id=${c.id}`)} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-emerald-700">{c.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.name} {c.surname}</p>
                  <p className="text-[10px] text-gray-400 truncate">{c.company_name || c.city || c.phone || '-'}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {c.phone && <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} className="p-1 text-green-600 hover:bg-green-50 rounded"><Phone className="w-3 h-3" /></a>}
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-violet-500" />Crear documento rápido</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: '+ Factura', page: 'Documents?type=factura', color: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' },
              { label: '+ Presupuesto', page: 'Documents?type=presupuesto', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
              { label: '+ SAT', page: 'SAT', color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
              { label: '+ Mantenimiento', page: 'Maintenance', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' },
              { label: '+ Cálculo Solar', page: 'SolarBatteryCalc', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
              { label: '+ Presupuesto IA', page: 'AIBudget', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
            ].map(item => (
              <Link key={item.page} to={createPageUrl(item.page)}>
                <div className={`border rounded-lg px-3 py-2.5 text-xs font-semibold text-center cursor-pointer transition-colors ${item.color}`}>
                  {item.label}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Acceso rápido */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Acceso rápido
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {quickLinks.map(link => {
            const Icon = link.icon;
            return (
              <Link key={link.page} to={createPageUrl(link.page)}>
                <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer group">
                  <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                    <div className={`${link.color} p-2.5 rounded-xl text-white group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 leading-tight">{link.name}</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}