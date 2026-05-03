import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  Home, Users, FileText, Calendar, Wrench, ClipboardList,
  Thermometer, Sun, BookOpen, Shield, Bot, Settings,
  Menu, X, Building2, FolderOpen,
  Zap, BarChart3, LogOut, StickyNote, Package, Palette,
  CreditCard, Download, Bell, History, Search, FileBarChart, Droplets, AlertCircle,
  MoreHorizontal, MessageSquare } from
'lucide-react';
import NotificationsPanel from './components/NotificationsPanel';
import GlobalSearch from './components/GlobalSearch';
import AIChat from './components/AIChat';

// ─── Mobile Bottom Bar ────────────────────────────────────────────────────────
const MAIN_TABS = [
  { name: 'Inicio', page: 'Home', icon: Home },
  { name: 'SAT', page: 'SAT', icon: Wrench },
  { name: 'Chat', page: 'SATChat', icon: MessageSquare },
  { name: 'Agenda', page: 'Agenda', icon: Calendar },
  { name: 'Más', page: null, icon: MoreHorizontal, isMore: true },
];

function MobileBottomBar({ currentPageName }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();

  const moreItems = navItems.filter(n => !MAIN_TABS.some(t => t.page === n.page));

  return (
    <>
      <nav className="flex sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg print:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex w-full">
          {MAIN_TABS.map((item) => {
            const Icon = item.icon;
            if (item.isMore) {
              return (
                <button key="more" onClick={() => setMoreOpen(true)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors ${moreOpen ? 'text-[var(--accent)]' : 'text-gray-500'}`}>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${moreOpen ? 'bg-[var(--accent)]/10' : 'bg-gray-100'}`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-[11px] font-semibold">Ver todo</span>
                  </div>
                  <span className="text-[8px] font-medium leading-tight opacity-60">módulos</span>
                </button>
              );
            }
            const isActive = currentPageName === item.page || location.pathname === `/${item.page}`;
            return (
              <Link key={item.page} to={createPageUrl(item.page)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-gray-400'}`}>
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium leading-tight">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* More Drawer backdrop */}
      {moreOpen && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/40" onClick={() => setMoreOpen(false)} />
      )}

      {/* More Drawer */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 ${moreOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        style={{ maxHeight: '75vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        <div className="px-4 py-2 flex items-center justify-between border-b">
          <span className="font-semibold text-gray-800">Todos los módulos</span>
          <button onClick={() => setMoreOpen(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          <div className="grid grid-cols-3 gap-1 p-3">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link key={item.page} to={createPageUrl(item.page)}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${isActive ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : 'hover:bg-gray-50 text-gray-600'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium text-center leading-tight">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

const navItems = [
{ name: 'Inicio', page: 'Home', icon: Home },
{ name: 'Agenda', page: 'Agenda', icon: Calendar },
{ name: 'Chat SAT', page: 'SATChat', icon: MessageSquare },
{ name: 'Asistente IA', page: 'AIAssistant', icon: Bot },
{ name: 'Búsqueda IA', page: 'AISearch', icon: Search },
{ name: 'Cám. Frigorífica', page: 'ColdRoomCalc?tab=camara', icon: Thermometer },
{ name: 'Cám. + Humedad', page: 'ColdRoomCalc?tab=combinado', icon: Droplets },
{ name: 'Humedad Relativa', page: 'ColdRoomCalc?tab=humedad', icon: Droplets },
{ name: 'Calc. Eléctrico', page: 'ElectricalCalc', icon: Zap },
{ name: 'Calc. Térmico', page: 'ThermalCalc', icon: Thermometer },
{ name: 'Catálogos', page: 'Catalogs', icon: FileText },
{ name: 'Configuración', page: 'CompanyConfig', icon: Settings },
{ name: 'Clientes', page: 'Contacts', icon: Users },
{ name: 'Docs Legal.', page: 'LegalDocs', icon: FileText },
{ name: 'Documentos', page: 'Documents', icon: FileText },
{ name: 'Exportar', page: 'ExportData', icon: Download },
{ name: 'Historial', page: 'AuditLog', icon: History },
{ name: 'Informes', page: 'Reports', icon: BarChart3 },
{ name: 'Informes IA', page: 'AIReports', icon: FileBarChart },
{ name: 'Inventario', page: 'Inventory', icon: Package },
{ name: 'Averías', page: 'EquipmentFailureHistory', icon: AlertCircle },
{ name: 'Mantenimiento', page: 'Maintenance', icon: ClipboardList },
{ name: 'Manuales', page: 'Manuals', icon: BookOpen },
{ name: 'Notas', page: 'Notes', icon: StickyNote },
{ name: 'Normativas', page: 'Regulations', icon: Shield },
{ name: 'Plan. IA', page: 'AIPlanning', icon: ClipboardList },
{ name: 'Plantillas', page: 'DocumentTemplates', icon: Palette },
{ name: 'Portal Cliente', page: 'ClientPortal', icon: Users },
{ name: 'Presup. IA', page: 'AIBudget', icon: Bot },
{ name: 'Presupuestos', page: 'Documents?type=presupuesto', icon: FileText },
{ name: 'Proyectos', page: 'Projects', icon: FolderOpen },
{ name: 'Timeline', page: 'ProjectTimeline', icon: Calendar },
{ name: 'Rutas', page: 'TecniciansRoutes', icon: Wrench },
{ name: 'Proveedores', page: 'Suppliers', icon: Building2 },
{ name: 'Recordatorios', page: 'Automations', icon: Bell },
{ name: 'Recorda. IA', page: 'SmartReminders', icon: Bell },
{ name: 'Repuestos', page: 'SparePartsManager', icon: Package },
{ name: 'SAT', page: 'SAT', icon: Wrench },
{ name: 'Diario Rep.', page: 'EquipmentDiaryPage', icon: ClipboardList },
{ name: 'Solar+Bat.', page: 'SolarBatteryCalc', icon: Sun },
{ name: 'T. Visita', page: 'BusinessCards', icon: CreditCard },
{ name: 'Campo', page: 'TechnicianFieldWork', icon: Wrench }];


export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [company, setCompany] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    // Precalentar cache y precargar páginas frecuentes después del primer render
    const t = setTimeout(() => {
      import('@/lib/prefetch').then(({ prefetchPages }) => prefetchPages());
    }, 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    base44.entities.CompanySettings.list().then((data) => {
      if (data.length > 0) setCompany(data[0]);
    });
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="ltr" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <AIChat />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <style>{`
        :root {
          --primary: #1e3a5f;
          --primary-light: #2d5f8a;
          --accent: #0ea5e9;
          --accent-light: #38bdf8;
        }
        /* scroll nativo libre */
        .no-print { display: block; }
        @media print {
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          table td, table th { border: 1px solid #ccc !important; padding: 4px !important; }
        }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[var(--primary)] text-white fixed h-full z-30 shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          {company?.logo_url ?
          <img src={company.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-cover bg-white p-0.5" /> :
          <div className="h-10 w-10 rounded-lg bg-[var(--accent)] flex items-center justify-center font-bold text-lg">
              {company?.company_name?.[0] || 'S'}
            </div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">{company?.company_name || 'Mi Empresa'}</h1>
            <p className="text-blue-200 text-sm font-extrabold truncate">Gestión SAT Profesional</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-white/20 text-white font-bold border-r-2 border-[var(--accent)]'
                    : 'text-blue-100 hover:bg-white/10 font-medium'
                }`}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-2">
          <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white text-sm transition-all">
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-blue-200 text-base font-black">Alertas</span>
            <NotificationsPanel />
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-blue-200 hover:text-white text-sm w-full px-2 py-2 rounded hover:bg-white/10 transition-all">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen &&
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      }

      {/* Sidebar mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[var(--primary)] text-white transform transition-transform lg:hidden ${
      sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            {company?.logo_url ?
            <img src={company.logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-cover bg-white p-0.5" /> :
            <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center font-bold">
                {company?.company_name?.[0] || 'S'}
              </div>
            }
            <span className="font-bold text-sm">{company?.company_name || 'Mi Empresa'}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="overflow-y-auto py-2 h-[calc(100vh-80px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${
                isActive ? 'bg-white/15 text-white font-bold' : 'text-blue-100 hover:bg-white/10'}`}>
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-h-screen relative overflow-x-hidden min-w-0">
        {/* Background watermark logo — GPU layer aislada para no afectar scroll */}
        {company?.logo_url &&
        <div
          className="fixed pointer-events-none z-0"
          style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) translateZ(0)',
            opacity: 0.04,
            width: '60vw', maxWidth: 500,
            willChange: 'opacity',
          }}>
            <img src={company.logo_url} alt="" style={{ width: '100%', filter: 'grayscale(1)' }} loading="lazy" decoding="async" />
          </div>
        }
        {/* Top bar mobile */}
        <header className="lg:hidden bg-white border-b sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-gray-700" />
            </button>
            <button onClick={() => window.history.back()} className="p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
          </div>
          <h2 className="font-semibold text-sm text-gray-800 truncate mx-2">
            {navItems.find((n) => n.page === currentPageName)?.name || currentPageName}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setSearchOpen(true)} className="p-1.5 text-gray-500 hover:text-gray-800">
              <Search className="w-5 h-5" />
            </button>
            <NotificationsPanel />
          </div>
        </header>
        <main className="p-3 md:p-6 max-w-7xl mx-auto relative z-10 pb-28 lg:pb-6 overflow-x-hidden min-w-0 w-full" style={{ contain: 'layout style' }}>
          {children}
        </main>

        {/* Mobile bottom tab bar */}
        <MobileBottomBar currentPageName={currentPageName} />
      </div>
    </div>
  );
}