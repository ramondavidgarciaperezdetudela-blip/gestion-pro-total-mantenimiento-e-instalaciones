import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PullToRefresh from '../components/PullToRefresh';
import MobileKPIView from '../components/MobileKPIView';
import ChangeOpinionAlerts from '../components/ChangeOpinionAlerts';
import PendingTasksPanel from '../components/PendingTasksPanel';
import AutomationStatus from '../components/AutomationStatus';
import DocumentsStatusPanel from '../components/DocumentsStatusPanel';
import MissingSATSignatures from '../components/MissingSATSignatures';
import SATKanban from '../components/SATKanban';
import AgendaPanel from '../components/AgendaPanel';
import PendingSignaturesPanel from '../components/PendingSignaturesPanel';
import { createPageUrl } from '../utils';
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Users, FileText, Wrench, ClipboardList,
  Thermometer, Sun, BookOpen, Shield, Bot, Settings,
  Building2, FolderOpen, Zap, BarChart3, Clock, AlertCircle,
  StickyNote, Package, Palette, Bell, Download, Euro, CheckCircle, XCircle, AlertTriangle,
  ArrowRight, ChevronRight, ShoppingCart, Search, Navigation, ChevronDown, ChevronUp } from
'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MonthlyRevenueChart from '../components/MonthlyRevenueChart';
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
{ name: 'Solar+Baterías', page: 'SolarBatteryCalc', icon: Sun, color: 'bg-amber-500' },
{ name: 'Tarifas Prov.', page: 'SupplierTariffs', icon: Package, color: 'bg-purple-600' },
{ name: 'Copias Seg.', page: 'BackupCenter', icon: Shield, color: 'bg-blue-700' }];


function StatCard({ label, value, sub, icon: Icon, color, linkPage }) {
  const content =
  <div className="rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-all cursor-pointer" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
      <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: '#ffffff08' }}>
        <Icon className="w-5 h-5" style={{ color: '#00D4FF' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold" style={{ color: '#e8eaf0' }}>{value}</p>
        <p className="text-xs font-semibold" style={{ color: '#8890a8' }}>{label}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: '#7C3AED' }}>{sub}</p>}
      </div>
      {linkPage && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#2a2a40' }} />}
    </div>;

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
  const [allSatOrders, setAllSatOrders] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [supplierSpending, setSupplierSpending] = useState([]);
  const [topSuppliers, setTopSuppliers] = useState([]);
  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [maintenanceMachines, setMaintenanceMachines] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [presupuestosAceptados, setPresupuestosAceptados] = useState([]);
  const [presupuestosRechazados, setPresupuestosRechazados] = useState([]);
  const [mobileSectionOpen, setMobileSectionOpen] = useState(null); // 'tareas' | 'docs' | 'sat' | null
  // Paneles secundarios diferidos — no se montan hasta que el render principal está listo
  const [showSecondaryPanels, setShowSecondaryPanels] = useState(false);
  const [showTertiaryPanels, setShowTertiaryPanels] = useState(false);

  const processData = useCallback((invoices, satOrders, contacts, appointments, companySettings, suppliers, stockItems) => {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
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
    setAllSatOrders(satOrders);
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

  const loadData = useCallback(async (forceRefresh = false) => {
    const { getHomeData } = await import('@/lib/homeDataCache');
    const { invoices, satOrders, contacts, appointments, companySettings, suppliers, stockItems } = await getHomeData(forceRefresh);
    processData(invoices, satOrders, contacts, appointments, companySettings, suppliers, stockItems);
  }, [processData]);

  useEffect(() => {
    loadData();
    // Oleada 1: Kanban + Agenda — tras primer paint
    const t1 = setTimeout(() => setShowSecondaryPanels(true), 600);
    // Oleada 2: paneles de alertas/tareas — más tarde para no bloquear scroll
    const t2 = setTimeout(() => setShowTertiaryPanels(true), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    const { invalidateHomeCache } = await import('@/lib/homeDataCache');
    invalidateHomeCache();
    await loadData(true);
  }, [loadData]);

  // Aviso de backup pendiente
  const lastBackupStr = localStorage.getItem('backupConfig') ? (() => { try { return JSON.parse(localStorage.getItem('backupConfig')).last_backup; } catch { return null; } })() : null;
  const daysSinceBackup = lastBackupStr ? Math.floor((new Date() - new Date(lastBackupStr)) / (1000 * 60 * 60 * 24)) : null;
  const reminderDays = (() => { try { return JSON.parse(localStorage.getItem('backupConfig'))?.reminder_days || 7; } catch { return 7; } })();
  const showBackupAlert = daysSinceBackup === null || daysSinceBackup >= reminderDays;

  // Colores de badge por estado de documento — Dark Pro
  const STATUS_COLORS = { borrador: 'text-gray-400', enviado: 'text-blue-400', pagado: 'text-green-400', vencido: 'text-red-400', cancelado: 'text-orange-400' };
  const SAT_STATUS = { pendiente: 'text-amber-400', en_curso: 'text-blue-400', completada: 'text-green-400' };

  const DOC_ROW_BG = {
    vencido:   'border-l-2 border-l-red-500',
    enviado:   'border-l-2 border-l-blue-500',
    pagado:    'border-l-2 border-l-green-500',
    borrador:  'border-l-2 border-l-gray-600',
    cancelado: 'border-l-2 border-l-orange-500',
  };

  const SAT_PRIORITY_BG = {
    urgente: 'border-l-2 border-l-red-500',
    alta:    'border-l-2 border-l-orange-500',
    normal:  'border-l-2 border-l-amber-500',
    baja:    'border-l-2 border-l-gray-600',
  };
  const SAT_PRIORITY_BADGE = {
    urgente: 'text-red-400',
    alta:    'text-orange-400',
    normal:  'text-amber-400',
    baja:    'text-gray-500',
  };

  const APT_PRIORITY_BG = {
    urgente: 'border-l-2 border-l-red-500',
    alta:    'border-l-2 border-l-orange-500',
    media:   'border-l-2 border-l-blue-500',
    baja:    'border-l-2 border-l-gray-600',
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        {company?.logo_url &&
        <img src={company.logo_url} alt="Logo" className="h-12 w-12 rounded-xl object-cover" style={{ border: '1px solid #1e1e30' }} />
        }
        <div>
          <h1 className="text-3xl font-extrabold" style={{ color: '#e8eaf0' }}>
            {company?.company_name || 'Panel de Control'}
          </h1>
          <p className="text-sm font-medium capitalize" style={{ color: '#00D4FF99' }}>{format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</p>
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

      {/* ── Accesos rápidos móvil ─────────────────────────────────────── */}
      <div className="sm:hidden space-y-2">

        {/* Tareas pendientes */}
        <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-3 text-left"
            onClick={() => setMobileSectionOpen(prev => prev === 'tareas' ? null : 'tareas')}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-semibold text-orange-700">Tareas pendientes</span>
              {(recentSat.length > 0) && (
                <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{recentSat.length}</span>
              )}
            </div>
            {mobileSectionOpen === 'tareas' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {mobileSectionOpen === 'tareas' && (
            <div className="border-t border-orange-100 divide-y divide-orange-50">
              {recentSat.length === 0 ? (
                <div className="flex items-center gap-2 p-3 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4" /><span>Sin SAT pendientes</span>
                </div>
              ) : recentSat.map(sat => (
                <Link key={sat.id} to={createPageUrl('SAT')} className={`flex items-center justify-between gap-2 p-3 ${SAT_PRIORITY_BG[sat.priority] || 'bg-amber-50 border-l-4 border-l-amber-300'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {sat.priority === 'urgente' && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      <p className="text-xs font-semibold text-gray-800 truncate">#{sat.order_number || 'S/N'} — {sat.contact_name}</p>
                    </div>
                    <p className="text-[10px] text-gray-500">{sat.type} · {sat.date}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {sat.priority && sat.priority !== 'normal' && (
                      <Badge className={`text-[9px] ${SAT_PRIORITY_BADGE[sat.priority] || ''}`}>{sat.priority}</Badge>
                    )}
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                  </div>
                </Link>
              ))}
              <Link to={createPageUrl('SAT')} className="flex items-center justify-center gap-1 p-2 text-xs text-orange-600 font-semibold hover:bg-orange-50">
                Ver todos en SAT <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Documentos recientes */}
        <div className="bg-white border border-violet-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between p-3 text-left"
            onClick={() => setMobileSectionOpen(prev => prev === 'docs' ? null : 'docs')}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-700">Documentos recientes</span>
              {recentDocs.length > 0 && (
                <span className="bg-violet-100 text-violet-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{recentDocs.length}</span>
              )}
            </div>
            {mobileSectionOpen === 'docs' ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {mobileSectionOpen === 'docs' && (
            <div className="border-t border-violet-100 divide-y divide-violet-50">
              {recentDocs.length === 0 ? (
                <p className="p-3 text-xs text-gray-400 text-center">Sin documentos</p>
              ) : recentDocs.map(doc => (
                <Link key={doc.id} to={createPageUrl('Documents')} className={`flex items-center justify-between gap-2 p-3 ${DOC_ROW_BG[doc.status] || 'bg-gray-50'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {doc.status === 'vencido' && <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                      <p className="text-xs font-semibold capitalize truncate">{doc.doc_type} Nº{doc.doc_number}</p>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">{doc.contact_name} · {doc.date}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs font-bold text-gray-700">{doc.total?.toFixed(0)}€</span>
                    <Badge className={`text-[10px] ${STATUS_COLORS[doc.status] || ''}`}>{doc.status}</Badge>
                    <ChevronRight className="w-3 h-3 text-gray-300" />
                  </div>
                </Link>
              ))}
              <div className="grid grid-cols-3 gap-1.5 p-2 border-t border-violet-100">
                {[
                  { label: 'Facturas', page: 'Documents?type=factura', color: 'bg-violet-50 text-violet-700' },
                  { label: 'Presupuestos', page: 'Documents?type=presupuesto', color: 'bg-blue-50 text-blue-700' },
                  { label: 'Ver todos', page: 'Documents', color: 'bg-gray-50 text-gray-700' },
                ].map(item => (
                  <Link key={item.page} to={createPageUrl(item.page)}
                    className={`text-center text-[10px] font-semibold px-2 py-1.5 rounded-lg ${item.color}`}>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alertas */}
        {alerts.length > 0 && (
          <div className="space-y-1.5">
            {alerts.map((a, i) => (
              <Link key={i} to={createPageUrl(a.page)}>
                <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium ${a.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700'}`}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">{a.text}</span>
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Banner backup */}
      {showBackupAlert && (
        <Link to={createPageUrl('BackupCenter')}>
          <div className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer transition-opacity hover:opacity-80" style={{ background: '#1a1200', border: '1px solid #F59E0B55' }}>
            <Shield className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#FCD34D' }}>
                {daysSinceBackup === null ? '⚠ Aún no tienes ninguna copia de seguridad guardada' : `⚠ Último backup hace ${daysSinceBackup} días — recomendamos hacer uno`}
              </p>
              <p className="text-xs" style={{ color: '#F59E0B99' }}>Haz clic para ir al Centro de Copias de Seguridad</p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
          </div>
        </Link>
      )}

      {/* Acceso directo rápido - Solo en desktop */}
      <div className="hidden sm:block rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
        <h2 className="mb-3 text-lg font-bold flex items-center gap-2" style={{ color: '#e8eaf0' }}>Acceso rápido a módulos</h2>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.page} to={createPageUrl(link.page)}>
                <div className="group flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all cursor-pointer hover:opacity-90" style={{ background: 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff08'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div className={`${link.color} p-2.5 rounded-xl text-white group-hover:scale-110 transition-transform shadow-lg`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-center leading-tight line-clamp-2" style={{ color: '#8890a8' }}>{link.name}</span>
                </div>
              </Link>);
          })}
        </div>
      </div>

      {/* Todo lo siguiente solo en desktop */}
      <div className="hidden sm:block space-y-6">

      {/* Paneles secundarios — montados después del primer paint */}
      {showSecondaryPanels && (
        <>
          <SATKanban initialOrders={allSatOrders} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AgendaPanel />
            <PendingSignaturesPanel />
          </div>
        </>
      )}

      {showTertiaryPanels && (
        <>
          <PendingTasksPanel />
          <AutomationStatus />
          <DocumentsStatusPanel />
          <MissingSATSignatures />
          <ChangeOpinionAlerts />
        </>
      )}

      {/* Alertas */}
      {alerts.length > 0 &&
      <div className="space-y-2">
          {alerts.map((a, i) =>
        <Link key={i} to={createPageUrl(a.page)}>
              <div className="flex items-center gap-3 p-3 rounded-xl text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={a.type === 'danger'
                  ? { background: '#1f0a0a', border: '1px solid #ef444444', color: '#f87171' }
                  : { background: '#1a1200', border: '1px solid #f59e0b44', color: '#fcd34d' }}>
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





      {/* Panel ingresos + trabajos pendientes + mantenimientos semana */}
      <MonthlyRevenueChart />

      {/* Gráficos proveedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><Euro className="w-4 h-4" style={{ color: '#7C3AED' }} />Gasto por proveedor</span>
            <Link to={createPageUrl('Suppliers')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
          </div>
          {supplierSpending.length === 0 ?
          <p className="text-xs py-4 text-center" style={{ color: '#8890a8' }}>Sin datos de precios registrados</p> :
          <ResponsiveContainer width="100%" height={180}>
              <BarChart data={supplierSpending} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: '#8890a8' }} />
                <Tooltip formatter={(v) => [`${v}€`, 'Gasto']} contentStyle={{ background: '#12121e', border: '1px solid #1e1e30', color: '#e8eaf0' }} />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {supplierSpending.map((_, i) =>
                <Cell key={i} fill={['#00D4FF', '#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'][i % 6]} />
                )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          }
        </div>

        <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><ShoppingCart className="w-4 h-4" style={{ color: '#00D4FF' }} />Proveedores con más referencias</span>
            <Link to={createPageUrl('Suppliers')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
          </div>
          <div className="space-y-2">
            {topSuppliers.length === 0 ?
            <p className="text-xs py-4 text-center" style={{ color: '#8890a8' }}>Sin precios registrados</p> :
            topSuppliers.map((s, i) =>
            <div key={s.name} className="flex items-center gap-2">
                <span className="text-xs font-bold w-4" style={{ color: '#8890a8' }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs font-medium truncate" style={{ color: '#e8eaf0' }}>{s.name}</span>
                    <span className="text-xs ml-2" style={{ color: '#8890a8' }}>{s.count} ref.</span>
                  </div>
                  <div className="w-full rounded-full h-1.5" style={{ background: '#1e1e30' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, s.count / (topSuppliers[0]?.count || 1) * 100)}%`, background: '#00D4FF' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas de pedidos próximos */}
      {reorderAlerts.length > 0 &&
      <div className="rounded-xl p-4" style={{ background: '#1a1200', border: '1px solid #F59E0B44' }}>
          <p className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: '#FCD34D' }}><Bell className="w-4 h-4" />Pedidos pendientes de revisar</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {reorderAlerts.map((r, i) =>
          <Link key={i} to={createPageUrl('Suppliers')}>
                <div className="flex items-center gap-2 rounded-lg p-2 hover:opacity-80 transition-opacity" style={{ background: '#ffffff08', border: '1px solid #F59E0B33' }}>
                  <Building2 className="w-4 h-4 flex-shrink-0" style={{ color: '#F59E0B' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: '#e8eaf0' }}>{r.name}</p>
                    <p className="text-[10px] font-semibold" style={{ color: '#F59E0B' }}>{r.daysLeft <= 0 ? '⚠ HOY' : `En ${r.daysLeft} días`}</p>
                  </div>
                </div>
              </Link>
          )}
          </div>
        </div>
      }

       {/* Dashboard Mantenimiento + Buscador Repuestos */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
           <div className="flex items-center justify-between mb-3">
             <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><Wrench className="w-4 h-4" style={{ color: '#00D4FF' }} />Mantenimiento próximo</span>
             <Link to={createPageUrl('Maintenance')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
           </div>
           <div className="space-y-2">
             {maintenanceMachines.length === 0 ?
            <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Sin mantenimiento próximo</p> :
            maintenanceMachines.map((m) => {
              const nextDate = new Date(m.next_maintenance_date);
              const daysUntil = Math.ceil((nextDate - new Date()) / 86400000);
              return (
                <div key={m.id} className="p-2.5 rounded-lg" style={{ background: '#00D4FF0a', border: '1px solid #00D4FF22' }}>
                   <p className="text-xs font-medium truncate" style={{ color: '#e8eaf0' }}>{m.name}</p>
                   <div className="flex justify-between items-center mt-1">
                     <p className="text-[10px]" style={{ color: '#8890a8' }}>{m.brand} {m.model}</p>
                     <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#00D4FF22', color: '#00D4FF' }}>{daysUntil} días</span>
                   </div>
                 </div>);
            })}
           </div>
         </div>

         <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
           <div className="flex items-center justify-between mb-3">
             <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><Search className="w-4 h-4" style={{ color: '#10B981' }} />Stock bajo - Buscar repuestos</span>
             <Link to={createPageUrl('Inventory')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver inventario</Link>
           </div>
           <div className="space-y-2">
             {stockItems.length === 0 ?
            <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Stock en niveles óptimos</p> :
            stockItems.map((item) =>
            <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg" style={{ background: '#10B98110', border: '1px solid #10B98122' }}>
                 <div className="min-w-0 flex-1">
                   <p className="text-xs font-medium truncate" style={{ color: '#e8eaf0' }}>{item.name}</p>
                   <p className="text-[10px] truncate" style={{ color: '#8890a8' }}>{item.supplier_name || 'Sin proveedor'}</p>
                 </div>
                 <div className="flex items-center gap-1.5 flex-shrink-0">
                   <span className="text-xs font-bold" style={{ color: '#10B981' }}>{item.quantity || 0} {item.unit}</span>
                   <Link to={createPageUrl('SupplierProductSearch')} className="p-1.5 rounded-lg transition-colors" style={{ background: '#10B981', color: '#fff' }}>
                     <Search className="w-3 h-3" />
                   </Link>
                 </div>
               </div>
            )}
           </div>
         </div>
       </div>

      {/* Presupuestos con respuesta del cliente */}
      {(presupuestosAceptados.length > 0 || presupuestosRechazados.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #10B98133' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#10B981' }}>
                <CheckCircle className="w-4 h-4" />Presupuestos aceptados
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#10B98122', color: '#10B981' }}>{presupuestosAceptados.length}</span>
              </span>
              <Link to={createPageUrl('Documents?type=presupuesto')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
            </div>
            <div className="space-y-2">
              {presupuestosAceptados.length === 0 ? (
                <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Sin presupuestos aceptados aún</p>
              ) : presupuestosAceptados.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg" style={{ background: '#10B98110', border: '1px solid #10B98122' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate" style={{ color: '#e8eaf0' }}>Presupuesto Nº{doc.doc_number}</p>
                    <p className="text-[10px] truncate" style={{ color: '#10B981' }}>{doc.contact_name} · {doc.date}</p>
                  </div>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: '#10B981' }}>{(doc.total || 0).toFixed(0)} €</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #EF444433' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#EF4444' }}>
                <XCircle className="w-4 h-4" />Presupuestos rechazados
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#EF444422', color: '#EF4444' }}>{presupuestosRechazados.length}</span>
              </span>
              <Link to={createPageUrl('Documents?type=presupuesto')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
            </div>
            <div className="space-y-2">
              {presupuestosRechazados.length === 0 ? (
                <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Sin presupuestos rechazados</p>
              ) : presupuestosRechazados.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 rounded-lg" style={{ background: '#EF444410', border: '1px solid #EF444422' }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate" style={{ color: '#e8eaf0' }}>Presupuesto Nº{doc.doc_number}</p>
                    <p className="text-[10px] truncate" style={{ color: '#EF4444' }}>{doc.contact_name} · {doc.date}</p>
                  </div>
                  <span className="text-xs font-bold flex-shrink-0" style={{ color: '#EF4444' }}>{(doc.total || 0).toFixed(0)} €</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Citas hoy */}
        <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><Clock className="w-4 h-4" style={{ color: '#00D4FF' }} />Citas de hoy</span>
            <Link to={createPageUrl('Agenda')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todas</Link>
          </div>
          <div className="space-y-2">
            {appointments.length === 0 ?
            <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Sin citas hoy</p> :
            appointments.map((apt) =>
            <div key={apt.id} className={`flex items-center gap-2 p-2 rounded-lg ${APT_PRIORITY_BG[apt.priority] || ''}`} style={{ background: '#ffffff06', borderLeft: '2px solid #00D4FF44' }}>
                <span className="text-xs font-bold min-w-[40px]" style={{ color: '#00D4FF' }}>{apt.time_start || '--'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: '#e8eaf0' }}>{apt.title}</p>
                  <p className="text-[10px] truncate" style={{ color: '#8890a8' }}>{apt.contact_name}</p>
                </div>
                <div className="flex items-center gap-1">
                  {apt.priority === 'urgente' && <AlertCircle className="w-3 h-3 text-red-500" />}
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#ffffff10', color: '#8890a8' }}>{apt.type}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Últimos documentos */}
        <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><FileText className="w-4 h-4" style={{ color: '#7C3AED' }} />Últimos documentos</span>
            <Link to={createPageUrl('Documents')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
          </div>
          <div className="space-y-1.5">
            {recentDocs.length === 0 ?
            <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Sin documentos</p> :
            recentDocs.map((doc) =>
            <div key={doc.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${DOC_ROW_BG[doc.status] || ''}`} style={{ background: '#ffffff06' }}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold capitalize truncate" style={{ color: '#e8eaf0' }}>{doc.doc_type} {doc.doc_number}</p>
                  <p className="text-[11px] truncate" style={{ color: '#8890a8' }}>{doc.contact_name}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold" style={{ color: '#e8eaf0' }}>{doc.total?.toFixed(0)}€</span>
                  <span className={`text-[10px] font-semibold ${STATUS_COLORS[doc.status] || ''}`}>{doc.status}</span>
                  {doc.status === 'vencido' && <AlertCircle className="w-3 h-3 text-red-500" />}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SAT pendientes */}
        <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><Wrench className="w-4 h-4" style={{ color: '#F97316' }} />SAT pendientes</span>
            <Link to={createPageUrl('SAT')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
          </div>
          <div className="space-y-1.5">
            {recentSat.length === 0 ?
            <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Sin órdenes pendientes</p> :
            recentSat.map((sat) =>
            <div key={sat.id} className={`p-2 rounded-lg ${SAT_PRIORITY_BG[sat.priority] || ''}`} style={{ background: '#ffffff06' }}>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold truncate flex-1" style={{ color: '#e8eaf0' }}>{sat.contact_name}</p>
                  {sat.priority && sat.priority !== 'normal' && (
                    <span className={`text-[9px] flex-shrink-0 font-bold ${SAT_PRIORITY_BADGE[sat.priority] || ''}`}>{sat.priority}</span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-[10px]" style={{ color: '#8890a8' }}>{sat.type} · {sat.date}</p>
                  <span className={`text-[10px] font-semibold ${SAT_STATUS[sat.status] || ''}`}>{sat.status}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Clientes recientes + acciones rápidas documentación */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: '#e8eaf0' }}><Users className="w-4 h-4" style={{ color: '#10B981' }} />Clientes recientes</span>
            <Link to={createPageUrl('Contacts')} className="text-xs font-semibold" style={{ color: '#00D4FF' }}>Ver todos</Link>
          </div>
          <div className="space-y-1">
            {recentContacts.length === 0 ?
            <p className="text-xs py-3 text-center" style={{ color: '#8890a8' }}>Sin clientes</p> :
            recentContacts.map((c) =>
            <Link key={c.id} to={createPageUrl(`ContactDetail?id=${c.id}`)} className="flex items-center gap-2 p-2 rounded-lg group transition-all" style={{ background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = '#ffffff06'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #00D4FF22, #7C3AED22)', border: '1px solid #1e1e30' }}>
                  {c.photo_url ? <img src={c.photo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold" style={{ color: '#00D4FF' }}>{c.name?.[0]?.toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#e8eaf0' }}>{c.name} {c.surname}</p>
                  <p className="text-xs truncate" style={{ color: '#8890a8' }}>{c.company_name || c.city || c.phone || '-'}</p>
                </div>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#8890a8' }} />
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: '#12121e', border: '1px solid #1e1e30' }}>
          <p className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: '#e8eaf0' }}><FileText className="w-4 h-4" style={{ color: '#7C3AED' }} />Crear documento rápido</p>
          <div className="grid grid-cols-2 gap-2">
            {[
            { label: '+ Factura', page: 'Documents?type=factura', color: '#7C3AED' },
            { label: '+ Presupuesto', page: 'Documents?type=presupuesto', color: '#3B82F6' },
            { label: '+ SAT', page: 'SAT', color: '#F97316' },
            { label: '+ Mantenimiento', page: 'Maintenance', color: '#00D4FF' },
            { label: '+ Cálculo Solar', page: 'SolarBatteryCalc', color: '#F59E0B' },
            { label: '+ Presupuesto IA', page: 'AIBudget', color: '#7C3AED' }].
            map((item) =>
            <Link key={item.page} to={createPageUrl(item.page)}>
                <div className="rounded-lg px-3 py-2.5 text-xs font-semibold text-center cursor-pointer transition-opacity hover:opacity-80"
                  style={{ background: item.color + '22', border: `1px solid ${item.color}44`, color: item.color }}>
                  {item.label}
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      </div>{/* fin hidden sm:block */}

    </div>
    </PullToRefresh>
  );

}