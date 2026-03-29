import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PullToRefresh from '../components/PullToRefresh';
import MobileKPIView from '../components/MobileKPIView';
import ChangeOpinionAlerts from '../components/ChangeOpinionAlerts';
import PendingTasksPanel from '../components/PendingTasksPanel';
import AutomationStatus from '../components/AutomationStatus';
import DocumentsStatusPanel from '../components/DocumentsStatusPanel';
import MissingSATSignatures from '../components/MissingSATSignatures';
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
  ArrowRight, Phone, MapPin, ChevronRight, ShoppingCart, Search, Navigation } from
'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';


const quickLinks = [
{ name: 'Agenda', page: 'Agenda', icon: Calendar, color: 'bg-blue-500' },
{ name: 'Asistente IA', page: 'AIAssistant', icon: Bot, color: 'bg-green-500' },
{ name: 'Búsqueda IA', page: 'AISearch', icon: Bot, color: 'bg-teal-400' },
{ name: 'Cálculo Humedad', page: 'ColdRoomCalc', icon: Thermometer, color: 'bg-cyan-600' },
{ name: 'Cálculo Térmico', page: 'ThermalCalc', icon: Thermometer, color: 'bg-red-500' },
{ name: 'Configuración', page: 'CompanyConfig', icon: Settings, color: 'bg-gray-500' },
{ name: 'Contactos', page: 'Contacts', icon: Users, color: 'bg-emerald-500' },
{ name: 'Docs Legalización', page: 'LegalDocs', icon: FileText, color: 'bg-indigo-600' },
{ name: 'Electricidad', page: 'ElectricalCalc', icon: Zap, color: 'bg-yellow-500' },
{ name: 'Exportar', page: 'ExportData', icon: Download, color: 'bg-lime-600' },
{ name: 'Factura', page: 'Documents?type=factura', icon: FileText, color: 'bg-violet-500' },
{ name: 'Informes', page: 'Reports', icon: BarChart3, color: 'bg-fuchsia-500' },
{ name: 'Informes IA', page: 'AIReports', icon: BarChart3, color: 'bg-fuchsia-400' },
{ name: 'Inventario', page: 'Inventory', icon: Package, color: 'bg-teal-500' },
{ name: 'Manuales', page: 'Manuals', icon: BookOpen, color: 'bg-teal-600' },
{ name: 'Mantenimiento', page: 'Maintenance', icon: ClipboardList, color: 'bg-cyan-500' },
{ name: 'Normativas', page: 'Regulations', icon: Shield, color: 'bg-indigo-500' },
{ name: 'Notas', page: 'Notes', icon: StickyNote, color: 'bg-lime-500' },
{ name: 'Optimizar Ruta', page: 'TecniciansRoutes', icon: Navigation, color: 'bg-teal-600' },
{ name: 'Plantillas', page: 'DocumentTemplates', icon: Palette, color: 'bg-rose-500' },
{ name: 'Presupuesto', page: 'Documents?type=presupuesto', icon: FileText, color: 'bg-blue-600' },
{ name: 'Presupuesto IA', page: 'AIBudget', icon: Bot, color: 'bg-purple-500' },
{ name: 'Proyectos', page: 'Projects', icon: FolderOpen, color: 'bg-pink-500' },
{ name: 'Proveedores', page: 'Suppliers', icon: Building2, color: 'bg-slate-500' },
{ name: 'Repuestos', page: 'SparePartsManager', icon: Package, color: 'bg-teal-700' },
{ name: 'SAT', page: 'SAT', icon: Wrench, color: 'bg-orange-500' },
{ name: 'Solar+Baterías', page: 'SolarBatteryCalc', icon: Sun, color: 'bg-amber-500' }];


function StatCard({ label, value, sub, icon: Icon, color, linkPage }) {
  const content =
  <Card className={`border-l-4 ${color} hover:shadow-md transition-shadow cursor-pointer`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-xl bg-white shadow-sm`}>
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-gray-500 text-sm font-extrabold">{label}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
        {linkPage && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
      </CardContent>
    </Card>;

  return linkPage ? <Link to={createPageUrl(linkPage)}>{content}</Link> : content;
}

export default function Home() {
  const [appointments, setAppointments] = useState([]);
  const [company, setCompany] = useState(null);
  const [kpis, setKpis] = useState({
    contacts: 0, totalInvoiced: 0, pendingAmount: 0,
    satPending: 0, overdueInvoices: 0, paidThisMonth: 0,
    unpaidContacts: 0, maintenanceDue: 0,
    totalSuppliers: 0, invoicesPaid: 0, invoicesPending: 0, invoicesOverdue: 0
  });
  const [recentDocs, setRecentDocs] = useState([]);
  const [recentSat, setRecentSat] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [supplierSpending, setSupplierSpending] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [maintenanceMachines, setMaintenanceMachines] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [presupuestosAceptados, setPresupuestosAceptados] = useState([]);
  const [presupuestosRechazados, setPresupuestosRechazados] = useState([]);

  const loadData = useCallback(async (forceRefresh = false) => {
    const { getHomeData } = await import('@/lib/homeDataCache');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    const { invoices, satOrders, contacts, appointments, companySettings, suppliers, stockItems } = await getHomeData(forceRefresh);

    if (companySettings.length > 0) setCompany(companySettings[0]);

    const facturas = invoices.filter((d) => d.doc_type === 'factura');
    const totalInvoiced = facturas.reduce((s, d) => s + (d.total || 0), 0);
    const pendingAmount = facturas.filter((d) => ['enviado', 'vencido'].includes(d.status)).reduce((s, d) => s + (d.total || 0), 0);
    const paidThisMonth = facturas.filter((d) => d.status === 'pagado' && d.date >= monthStart).reduce((s, d) => s + (d.total || 0), 0);
    const overdueInvoices = facturas.filter((d) => d.status === 'vencido').length;
    const invoicesPaid = facturas.filter((d) => d.status === 'pagado').length;
    const invoicesPending = facturas.filter((d) => d.status === 'enviado').length;
    const satPending = satOrders.filter((s) => s.status === 'pendiente').length;

    setAppointments(appointments);
    setRecentDocs(invoices.slice(0, 5));
    setRecentSat(satOrders.filter((s) => s.status === 'pendiente').slice(0, 4));

    const presupuestos = invoices.filter(d => d.doc_type === 'presupuesto');
    setPresupuestosAceptados(presupuestos.filter(d => d.signature_client && d.status !== 'cancelado').slice(0, 10));
    setPresupuestosRechazados(presupuestos.filter(d => d.status === 'cancelado' && d.signature_client).slice(0, 10));
    setRecentContacts(contacts.filter((c) => c.type === 'cliente').slice(0, 5));

    const reorder = suppliers.filter((s) => {
      if (!s.last_order_date || !s.enable_notifications || s.is_active === false) return false;
      const last = new Date(s.last_order_date);
      const nextDate = new Date(last.getTime() + (s.reorder_frequency_days || 30) * 86400000);
      return Math.ceil((nextDate - new Date()) / 86400000) <= 7;
    }).map((s) => {
      const last = new Date(s.last_order_date);
      const nextDate = new Date(last.getTime() + (s.reorder_frequency_days || 30) * 86400000);
      return { name: s.name, daysLeft: Math.ceil((nextDate - new Date()) / 86400000) };
    });
    setReorderAlerts(reorder);
    setStockItems(stockItems.filter((s) => (s.quantity || 0) <= (s.min_stock || 0)).slice(0, 6));

    const newAlerts = [];
    if (overdueInvoices > 0) newAlerts.push({ type: 'danger', text: `${overdueInvoices} factura(s) vencidas sin cobrar`, page: 'Documents' });
    if (pendingAmount > 500) newAlerts.push({ type: 'warning', text: `${pendingAmount.toFixed(0)}€ pendientes de cobro`, page: 'Documents' });
    if (satPending > 3) newAlerts.push({ type: 'warning', text: `${satPending} órdenes SAT pendientes`, page: 'SAT' });
    reorder.forEach((r) => newAlerts.push({ type: 'warning', text: `Revisar pedido a ${r.name} (${r.daysLeft <= 0 ? 'HOY' : `en ${r.daysLeft} días`})`, page: 'Suppliers' }));
    setAlerts(newAlerts);

    setKpis(prev => ({
      ...prev, totalInvoiced, pendingAmount, satPending, overdueInvoices, paidThisMonth,
      invoicesPaid, invoicesPending, invoicesOverdue: overdueInvoices,
      contacts: contacts.length,
      unpaidContacts: contacts.filter((c) => (c.pending_amount || 0) > 0).length,
      totalSuppliers: suppliers.filter((s) => s.is_active !== false).length,
    }));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => {
    const { invalidateHomeCache } = await import('@/lib/homeDataCache');
    invalidateHomeCache();
    await loadData(true);
  }, [loadData]);

  const STATUS_COLORS = { borrador: 'bg-gray-100 text-gray-600', enviado: 'bg-blue-100 text-blue-700', pagado: 'bg-green-100 text-green-700', vencido: 'bg-red-100 text-red-700', cancelado: 'bg-orange-100 text-orange-700' };
  const SAT_STATUS = { pendiente: 'bg-amber-100 text-amber-700', en_curso: 'bg-blue-100 text-blue-700', completada: 'bg-green-100 text-green-700' };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {company?.logo_url &&
        <img src={company.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover shadow-md" />
        }
        <div>
          <h1 className="text-gray-900 text-4xl font-extrabold md:text-3xl">
            {company?.company_name || 'Panel de Control'}
          </h1>
          <p className="text-gray-500 text-base font-black capitalize">{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
        </div>
      </div>

      {/* Vista resumen móvil — solo visible en móvil */}
      <div className="sm:hidden">
        <MobileKPIView
          kpis={kpis}
          appointments={appointments}
          recentSat={recentSat}
          alerts={alerts}
        />
      </div>

      {/* Acceso directo rápido - Solo en desktop */}
      <div className="hidden sm:block bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <h2 className="text-gray-800 mb-3 text-3xl font-extrabold flex items-center gap-2">Acceso rápido a módulos


        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.page} to={createPageUrl(link.page)}>
                <div className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-white transition-all hover:shadow-md cursor-pointer">
                  <div className={`${link.color} p-2 rounded-lg text-white group-hover:scale-110 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-gray-700 text-base font-extrabold text-center leading-tight line-clamp-2">{link.name}</span>
                </div>
              </Link>);

          })}
        </div>
      </div>

      {/* Todo lo siguiente solo en desktop */}
      <div className="hidden sm:block space-y-6">

      {/* Paneles secundarios — montados con retraso para no bloquear el render inicial */}
      <PendingTasksPanel />
      <AutomationStatus />
      <DocumentsStatusPanel />
      <MissingSATSignatures />
      <ChangeOpinionAlerts />

      {/* Alertas */}
      {alerts.length > 0 &&
      <div className="space-y-2">
          {alerts.map((a, i) =>
        <Link key={i} to={createPageUrl(a.page)}>
              <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity ${a.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{a.text}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
        )}
        </div>
      }

      {/* KPIs principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Contactos" value={kpis.contacts} icon={Users} color="border-emerald-400" linkPage="Contacts" />
        <StatCard label="Facturado total" value={`${(kpis.totalInvoiced / 1000).toFixed(1)}k€`} icon={Euro} color="border-violet-400" linkPage="Documents" />
        <StatCard label="Pendiente cobro" value={`${kpis.pendingAmount.toFixed(0)}€`} sub={kpis.overdueInvoices > 0 ? `${kpis.overdueInvoices} vencidas` : undefined} icon={AlertCircle} color="border-orange-400" linkPage="Documents" />
        <StatCard label="SAT pendientes" value={kpis.satPending} icon={Wrench} color="border-red-400" linkPage="SAT" />
      </div>

      {/* KPIs proveedores y facturas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Proveedores activos" value={kpis.totalSuppliers} icon={Building2} color="border-blue-400" linkPage="Suppliers" />
        <StatCard label="Facturas pagadas" value={kpis.invoicesPaid} icon={CheckCircle} color="border-green-400" linkPage="Documents" />
        <StatCard label="Facturas pendientes" value={kpis.invoicesPending} icon={Clock} color="border-amber-400" linkPage="Documents" />
        <StatCard label="Facturas vencidas" value={kpis.invoicesOverdue} icon={XCircle} color="border-red-400" linkPage="Documents" />
      </div>





      {/* Gráficos proveedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Gastos por proveedor */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Euro className="w-4 h-4 text-violet-500" />Gasto por proveedor</CardTitle>
            <Link to={createPageUrl('Suppliers')} className="text-blue-500 text-sm font-extrabold hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent>
            {supplierSpending.length === 0 ?
            <p className="text-xs text-gray-400 py-4 text-center">Sin datos de precios registrados</p> :

            <ResponsiveContainer width="100%" height={180}>
                <BarChart data={supplierSpending} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}€`, 'Gasto']} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {supplierSpending.map((_, i) =>
                  <Cell key={i} fill={['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'][i % 6]} />
                  )}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>

        {/* Top proveedores por pedidos */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-blue-500" />Proveedores con más referencias</CardTitle>
            <Link to={createPageUrl('Suppliers')} className="text-blue-500 text-sm font-extrabold hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {topSuppliers.length === 0 ?
            <p className="text-xs text-gray-400 py-4 text-center">Sin precios registrados</p> :
            topSuppliers.map((s, i) =>
            <div key={s.name} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium truncate">{s.name}</span>
                    <span className="text-xs text-gray-500 ml-2">{s.count} ref.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, s.count / (topSuppliers[0]?.count || 1) * 100)}%` }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de pedidos próximos */}
       {reorderAlerts.length > 0 &&
      <Card className="border-amber-200 bg-amber-50">
           <CardHeader className="pb-2">
             <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800"><Bell className="w-4 h-4" />Pedidos pendientes de revisar</CardTitle>
           </CardHeader>
           <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
             {reorderAlerts.map((r, i) =>
          <Link key={i} to={createPageUrl('Suppliers')}>
                 <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg p-2 hover:shadow-sm transition-shadow">
                   <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                   <div className="min-w-0">
                     <p className="text-xs font-medium truncate">{r.name}</p>
                     <p className="text-[10px] text-amber-600 font-semibold">{r.daysLeft <= 0 ? '⚠ HOY' : `En ${r.daysLeft} días`}</p>
                   </div>
                 </div>
               </Link>
          )}
           </CardContent>
         </Card>
      }

       {/* Dashboard Mantenimiento + Buscador Repuestos */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* Dashboard Mantenimiento */}
         <Card>
           <CardHeader className="pb-2 flex flex-row items-center justify-between">
             <CardTitle className="text-sm font-semibold flex items-center gap-2"><Wrench className="w-4 h-4 text-cyan-500" />Mantenimiento próximo</CardTitle>
             <Link to={createPageUrl('Maintenance')} className="text-blue-500 text-sm font-extrabold hover:underline">Ver todos</Link>
           </CardHeader>
           <CardContent className="space-y-2">
             {maintenanceMachines.length === 0 ?
            <p className="text-xs text-gray-400 py-3 text-center">Sin mantenimiento próximo</p> :
            maintenanceMachines.map((m) => {
              const nextDate = new Date(m.next_maintenance_date);
              const daysUntil = Math.ceil((nextDate - new Date()) / 86400000);
              return (
                <div key={m.id} className="p-2 bg-cyan-50 rounded-lg border border-cyan-100">
                   <p className="text-xs font-medium truncate">{m.name}</p>
                   <div className="flex justify-between items-center mt-1">
                     <p className="text-[10px] text-gray-500">{m.brand} {m.model}</p>
                     <Badge className="text-[10px] bg-cyan-100 text-cyan-700">{daysUntil} días</Badge>
                   </div>
                 </div>);

            })}
           </CardContent>
         </Card>

         {/* Buscador Repuestos Rápidos Online */}
         <Card>
           <CardHeader className="pb-2 flex flex-row items-center justify-between">
             <CardTitle className="text-sm font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-emerald-500" />Stock bajo - Buscar repuestos</CardTitle>
             <Link to={createPageUrl('Inventory')} className="text-blue-500 text-sm font-extrabold hover:underline">Ver inventario</Link>
           </CardHeader>
           <CardContent className="space-y-2">
             {stockItems.length === 0 ?
            <p className="text-xs text-gray-400 py-3 text-center">Stock en niveles óptimos</p> :
            stockItems.map((item) =>
            <div key={item.id} className="flex items-center justify-between gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                 <div className="min-w-0 flex-1">
                   <p className="text-xs font-medium truncate">{item.name}</p>
                   <p className="text-[10px] text-gray-500 truncate">{item.supplier_name || 'Sin proveedor'}</p>
                 </div>
                 <div className="flex items-center gap-1.5 flex-shrink-0">
                   <span className="text-xs font-bold text-emerald-600">{item.quantity || 0} {item.unit}</span>
                   <Link to={createPageUrl('SupplierProductSearch')} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition-colors">
                     <Search className="w-3 h-3" />
                   </Link>
                 </div>
               </div>
            )}
           </CardContent>
         </Card>
       </div>

      {/* Presupuestos con respuesta del cliente */}
      {(presupuestosAceptados.length > 0 || presupuestosRechazados.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Aceptados */}
          <Card className="border-green-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Presupuestos aceptados y firmados
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{presupuestosAceptados.length}</span>
              </CardTitle>
              <Link to={createPageUrl('Documents?type=presupuesto')} className="text-green-600 text-xs font-bold hover:underline">Ver todos</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {presupuestosAceptados.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">Sin presupuestos aceptados aún</p>
              ) : presupuestosAceptados.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img src={doc.signature_client} alt="Firma" className="w-8 h-8 rounded border border-green-200 bg-white object-contain flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-green-800 truncate">Presupuesto Nº{doc.doc_number}</p>
                      <p className="text-[10px] text-green-600 truncate">{doc.contact_name} · {doc.date}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-700 flex-shrink-0">{(doc.total || 0).toFixed(0)} €</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Rechazados */}
          <Card className="border-red-200">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
                <XCircle className="w-4 h-4 text-red-500" />
                Presupuestos rechazados
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{presupuestosRechazados.length}</span>
              </CardTitle>
              <Link to={createPageUrl('Documents?type=presupuesto')} className="text-red-500 text-xs font-bold hover:underline">Ver todos</Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {presupuestosRechazados.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 text-center">Sin presupuestos rechazados</p>
              ) : presupuestosRechazados.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-red-800 truncate">Presupuesto Nº{doc.doc_number}</p>
                    <p className="text-[10px] text-red-500 truncate">{doc.contact_name} · {doc.date}</p>
                  </div>
                  <span className="text-xs font-bold text-red-600 flex-shrink-0">{(doc.total || 0).toFixed(0)} €</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Citas hoy */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />Citas de hoy</CardTitle>
            <Link to={createPageUrl('Agenda')} className="text-blue-500 text-sm font-extrabold hover:underline">Ver todas</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {appointments.length === 0 ?
            <p className="text-xs text-gray-400 py-3 text-center">Sin citas hoy</p> :
            appointments.map((apt) =>
            <div key={apt.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span className="text-xs font-bold text-blue-600 min-w-[40px]">{apt.time_start || '--'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{apt.title}</p>
                  <p className="text-[10px] text-gray-500 truncate">{apt.contact_name}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">{apt.type}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos documentos */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-violet-500" />Últimos documentos</CardTitle>
            <Link to={createPageUrl('Documents')} className="text-blue-500 text-sm font-extrabold hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentDocs.length === 0 ?
            <p className="text-xs text-gray-400 py-3 text-center">Sin documentos</p> :
            recentDocs.map((doc) =>
            <div key={doc.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold capitalize truncate">{doc.doc_type} {doc.doc_number}</p>
                  <p className="text-gray-500 text-base truncate">{doc.contact_name}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold">{doc.total?.toFixed(0)}€</span>
                  <Badge className={`text-[10px] ${STATUS_COLORS[doc.status] || ''}`}>{doc.status}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SAT pendientes */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Wrench className="w-4 h-4 text-orange-500" />SAT pendientes</CardTitle>
            <Link to={createPageUrl('SAT')} className="text-blue-500 text-sm font-extrabold hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentSat.length === 0 ?
            <p className="text-xs text-gray-400 py-3 text-center">Sin órdenes pendientes</p> :
            recentSat.map((sat) =>
            <div key={sat.id} className="p-2 bg-orange-50 rounded-lg">
                <p className="text-xs font-medium truncate">{sat.contact_name}</p>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-[10px] text-gray-500">{sat.type} · {sat.date}</p>
                  <Badge className={`text-[10px] ${SAT_STATUS[sat.status] || ''}`}>{sat.status}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Clientes recientes + acciones rápidas documentación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-emerald-500" />Clientes recientes</CardTitle>
            <Link to={createPageUrl('Contacts')} className="text-blue-500 text-sm font-black hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentContacts.length === 0 ?
            <p className="text-xs text-gray-400 py-3 text-center">Sin clientes</p> :
            recentContacts.map((c) =>
            <Link key={c.id} to={createPageUrl(`ContactDetail?id=${c.id}`)} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg group transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-emerald-700">{c.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-extrabold truncate">{c.name} {c.surname}</p>
                  <p className="text-gray-400 text-sm truncate">{c.company_name || c.city || c.phone || '-'}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-3 h-3 text-gray-300" />
                </div>
              </Link>
            )}
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
            { label: '+ Presupuesto IA', page: 'AIBudget', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' }].
            map((item) =>
            <Link key={item.page} to={createPageUrl(item.page)}>
                <div className={`border rounded-lg px-3 py-2.5 text-xs font-semibold text-center cursor-pointer transition-colors ${item.color}`}>
                  {item.label}
                </div>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      </div>{/* fin hidden sm:block */}

    </div>
    </PullToRefresh>
  );

}