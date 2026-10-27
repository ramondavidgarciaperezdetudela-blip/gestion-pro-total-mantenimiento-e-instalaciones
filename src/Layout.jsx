import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  Home, Users, FileText, Calendar, Wrench, ClipboardList,
  Thermometer, Sun, BookOpen, Shield, ShieldCheck, Bot, Settings,
  Menu, X, Building2, FolderOpen,
  Zap, BarChart3, LogOut, StickyNote, Package, Palette,
  CreditCard, Download, Bell, History, Search, FileBarChart, Droplets, AlertCircle,
  MoreHorizontal, MessageSquare, ListChecks, AlertTriangle, CalendarCheck, Ruler } from
'lucide-react';
import NotificationsPanel from './components/NotificationsPanel';
import ThemeToggle from './components/ThemeToggle';
import SectionBackground from './components/SectionBackground';
import GlobalSearch from './components/GlobalSearch';
import AIChat from './components/AIChat';
import QuickPriceDBAccess from './components/QuickPriceDBAccess';
import BackupProgressIndicator from './components/BackupProgressIndicator';
import BarraNavegacion from './components/BarraNavegacion';
import AjusteRapidoLetra from './components/AjusteRapidoLetra';

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
      <nav className="flex sm:hidden fixed bottom-0 left-0 right-0 z-40 print:hidden"
        style={{ background: '#0d0d18', borderTop: '1px solid #1e1e30', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex w-full">
          {MAIN_TABS.map((item) => {
            const Icon = item.icon;
            if (item.isMore) {
              return (
                <button key="more" onClick={() => setMoreOpen(true)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1.5 transition-colors"
                  style={{ color: moreOpen ? '#00D4FF' : '#8890a8' }}>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: moreOpen ? '#00D4FF15' : '#ffffff08' }}>
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
                className="flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors"
              style={{ color: isActive ? '#00D4FF' : '#8890a8' }}>
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
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl shadow-2xl transition-transform duration-300 ${moreOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        style={{ background: '#0d0d18', border: '1px solid #1e1e30', maxHeight: '75vh', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full" style={{ background: '#2a2a40' }} />
        </div>
        <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #1e1e30' }}>
          <span className="font-semibold text-sm" style={{ color: '#e8eaf0' }}>Todos los módulos</span>
          <button onClick={() => setMoreOpen(false)} className="p-1" style={{ color: '#8890a8' }}><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(75vh - 80px)' }}>
          {groupNav(moreItems).map(({ section, items }) => (
            <div key={section} className="p-3 pt-2">
              <div className="px-1 pb-1.5 tech-label" style={{ color: '#5a6178' }}>{section}</div>
              <div className="grid grid-cols-3 gap-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPageName === item.page;
                  return (
                    <Link key={item.page} to={createPageUrl(item.page)}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors"
                      style={{ background: isActive ? '#00D4FF12' : 'transparent', color: isActive ? '#00D4FF' : '#8890a8' }}>
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const navItems = [
{ name: 'Agenda', page: 'Agenda', icon: Calendar },
{ name: 'Asistente IA', page: 'AIAssistant', icon: Bot },
{ name: 'Averías', page: 'EquipmentFailureHistory', icon: AlertCircle },
{ name: 'Códigos de error', page: 'CodigosError', icon: AlertCircle },
{ name: 'Presiones y carga', page: 'PresionesGas', icon: Droplets },
{ name: 'Baterías', page: 'BatteryCalc', icon: Zap },
{ name: 'Búsqueda IA', page: 'AISearch', icon: Search },
{ name: 'Cal. SAT', page: 'SATCalendar', icon: Calendar },
{ name: 'Calc. Eléctrico', page: 'ElectricalCalc', icon: Zap },
{ name: 'Calc. Térmico', page: 'ThermalCalc', icon: Thermometer },
{ name: 'Cámara frigorífica', page: 'ColdRoomCalc', icon: Thermometer },
{ name: 'Campo', page: 'TechnicianFieldWork', icon: Wrench },
{ name: 'Catálogos', page: 'Catalogs', icon: FileText },
{ name: 'Chat SAT', page: 'SATChat', icon: MessageSquare },
{ name: 'Clientes', page: 'Contacts', icon: Users },
{ name: 'Configuración', page: 'CompanyConfig', icon: Settings },
{ name: 'Copias Seg.', page: 'BackupCenter', icon: Shield },
{ name: 'Diario Rep.', page: 'EquipmentDiaryPage', icon: ClipboardList },
{ name: 'Disponibilidad', page: 'Availability', icon: CalendarCheck },
{ name: 'Modelos y legaliz.', page: 'LegalDocs', icon: FileText },
{ name: 'Documentos', page: 'Documents', icon: FileText },
{ name: 'Exportar', page: 'ExportData', icon: Download },
{ name: 'Historial', page: 'AuditLog', icon: History },
{ name: 'Incidencias', page: 'IncidentManagement', icon: AlertTriangle },
{ name: 'Inicio', page: 'Home', icon: Home },
{ name: 'Informes', page: 'Reports', icon: BarChart3 },
{ name: 'Informes IA', page: 'AIReports', icon: FileBarChart },
{ name: 'Inventario', page: 'Inventory', icon: Package },
{ name: 'Mantenimiento', page: 'Maintenance', icon: ClipboardList },
{ name: 'Manuales', page: 'Manuals', icon: BookOpen },
{ name: 'Plan Mantenim.', page: 'MaintenancePlanning', icon: ListChecks },
{ name: 'Normativas', page: 'Regulations', icon: Shield },
{ name: 'Notas', page: 'Notes', icon: StickyNote },
{ name: 'Plan. IA', page: 'AIPlanning', icon: ClipboardList },
{ name: 'Plano y presupuesto', page: 'PlanoIA', icon: Ruler },
{ name: 'Plantillas', page: 'DocumentTemplates', icon: Palette },
{ name: 'Portal Cliente', page: 'ClientPortal', icon: Users },
{ name: 'Presup. IA', page: 'AIBudget', icon: Bot },
{ name: 'Presupuestos', page: 'Documents?type=presupuesto', icon: FileText },
{ name: 'Proyectos', page: 'Projects', icon: FolderOpen },
{ name: 'Proveedores', page: 'Suppliers', icon: Building2 },
{ name: 'Recorda. IA', page: 'SmartReminders', icon: Bell },
{ name: 'Recordatorios', page: 'Automations', icon: Bell },
{ name: 'Repuestos', page: 'SparePartsManager', icon: Package },
{ name: 'Resumen Compras', page: 'PurchaseSummary', icon: BarChart3 },
{ name: 'Rutas', page: 'TecniciansRoutes', icon: Wrench },
{ name: 'SAT', page: 'SAT', icon: Wrench },
{ name: 'Solar+Bat.', page: 'SolarBatteryCalc', icon: Sun },
{ name: 'Cálculo Solar', page: 'SolarCalc', icon: Sun },
{ name: 'T. Visita', page: 'BusinessCards', icon: CreditCard },
{ name: 'Tarifas Prov.', page: 'SupplierTariffs', icon: Package },
{ name: 'Timeline', page: 'ProjectTimeline', icon: Calendar },
{ name: 'Vista Técnico', page: 'TechnicianDay', icon: Wrench },
{ name: 'Análisis A/C', page: 'ACPlanAnalysis', icon: Thermometer },
{ name: 'Calc. Potencia A/C', page: 'ACPotenciaCalc', icon: Zap },
{ name: 'Calc. Multi-área', page: 'MultiAreaCalc', icon: Thermometer },
{ name: 'Equiv. Refrigerantes', page: 'RefrigerantEquiv', icon: Droplets },
{ name: 'Cáp. Tubo', page: 'CapillaryCalc', icon: Droplets },
{ name: 'Herram. Danfoss', page: 'DanfossTools', icon: Wrench },
{ name: 'Prov. Gases', page: 'GasSuppliers', icon: Building2 },
{ name: 'Nuevo Contacto', page: 'ContactForm', icon: Users },
{ name: 'Actualizaciones', page: 'UpdateCenter', icon: Download },
// Licencias: TODAVÍA NO ESTÁN ACTIVAS en esta versión, así que no se
// enseñan en el menú. Las pantallas siguen ahí (LicenseActivation y
// LicenseRenewal): para recuperarlas basta con descomentar estas dos líneas.
// { name: 'Activar Licencia', page: 'LicenseActivation', icon: Shield },
// { name: 'Renovar Licencia', page: 'LicenseRenewal', icon: Shield },
{ name: 'Soporte IA', page: 'AISupport', icon: Bot },
{ name: 'Diagnóstico Carga', page: 'DiagnosticoCarga', icon: Droplets },
{ name: 'Informes Aseguradora', page: 'InformesTecnicos', icon: ShieldCheck },
{ name: 'Tablas Gases', page: 'TablasRefrigerantes', icon: FileBarChart },
].sort((a, b) => a.name.localeCompare(b.name, 'es'));

// ─── Agrupación técnica de la navegación ──────────────────────────────────────
// Se deriva del identificador de página, así que se mantiene aunque la lista
// se reordene alfabéticamente.
const PAGE_SECTION = {
  // Operaciones (SAT y trabajo de campo)
  SAT: 'Operaciones', SATChat: 'Operaciones', SATCalendar: 'Operaciones',
  TechnicianFieldWork: 'Operaciones', TechnicianDay: 'Operaciones', TecniciansRoutes: 'Operaciones',
  Maintenance: 'Operaciones', MaintenancePlanning: 'Operaciones', IncidentManagement: 'Operaciones',
  EquipmentDiaryPage: 'Operaciones', EquipmentFailureHistory: 'Operaciones', Agenda: 'Operaciones',
  Availability: 'Operaciones',
  // Clientes y proyectos
  Contacts: 'Clientes', ContactForm: 'Clientes', ClientPortal: 'Clientes',
  Projects: 'Clientes', ProjectTimeline: 'Clientes',
  // Documentos
  Documents: 'Documentos', DocumentTemplates: 'Documentos', BusinessCards: 'Documentos',
  LegalDocs: 'Documentos', Catalogs: 'Documentos',
  // Cálculo y diagnóstico, cada oficio por su lado.
  //
  // Antes iban todos juntos en una sección con subgrupos dentro. Se han
  // separado en secciones independientes porque el que trabaja el frío no
  // quiere pasar por delante de lo eléctrico cada vez que abre el menú.
  ElectricalCalc: 'Electricidad',
  ACPotenciaCalc: 'Clima', ACPlanAnalysis: 'Clima', ThermalCalc: 'Clima',
  MultiAreaCalc: 'Clima', PlanoIA: 'Clima', CodigosError: 'Clima',
  ColdRoomCalc: 'Refrigeración', CapillaryCalc: 'Refrigeración',
  DiagnosticoCarga: 'Refrigeración', RefrigerantEquiv: 'Refrigeración',
  DanfossTools: 'Refrigeración', PresionesGas: 'Refrigeración',
  SolarCalc: 'Solar', SolarBatteryCalc: 'Solar', BatteryCalc: 'Solar',
  TablasRefrigerantes: 'Refrigeración',
  InformesTecnicos: 'Documentos',
  // Proveedores y stock
  Suppliers: 'Proveedores y stock', GasSuppliers: 'Proveedores y stock',
  SupplierTariffs: 'Proveedores y stock', Inventory: 'Proveedores y stock',
  SparePartsManager: 'Proveedores y stock', PurchaseSummary: 'Proveedores y stock',
  // IA y asistencia
  AIAssistant: 'IA y asistencia', AISearch: 'IA y asistencia', AIReports: 'IA y asistencia',
  AIPlanning: 'IA y asistencia', AIBudget: 'IA y asistencia', SmartReminders: 'IA y asistencia',
  AISupport: 'IA y asistencia',
  // Informes y datos
  Reports: 'Informes y datos', AuditLog: 'Informes y datos', ExportData: 'Informes y datos',
  BackupCenter: 'Informes y datos', Automations: 'Informes y datos', Notes: 'Informes y datos',
  // Sistema
  Home: 'Sistema', CompanyConfig: 'Sistema', Manuals: 'Sistema', Regulations: 'Sistema',
  UpdateCenter: 'Sistema', LicenseActivation: 'Sistema', LicenseRenewal: 'Sistema',
};
const SECTION_ORDER = [
  'Sistema', 'Operaciones',
  // Los cuatro oficios, seguidos y cada uno con su título.
  'Electricidad', 'Clima', 'Refrigeración', 'Solar',
  'Clientes', 'Documentos', 'Proveedores y stock',
  'IA y asistencia', 'Informes y datos', 'Otros',
];
const basePage = (p) => (p || '').split('?')[0];
function groupNav(items) {
  const buckets = {};
  items.forEach((it) => {
    const sec = PAGE_SECTION[basePage(it.page)] || 'Otros';
    (buckets[sec] = buckets[sec] || []).push(it);
  });
  return SECTION_ORDER
    .filter((s) => buckets[s]?.length)
    .map((s) => ({ section: s, items: buckets[s] }));
}

// Navegación agrupada por secciones técnicas (compartida por escritorio y móvil)
function SidebarNav({ currentPageName, onNavigate, activeStyle, idleColor }) {
  const Enlace = ({ item }) => {
    const Icon = item.icon;
    const isActive = currentPageName === item.page;
    return (
      <Link
        to={createPageUrl(item.page)}
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-3 py-2 text-xs transition-all"
        style={isActive ? activeStyle : { color: idleColor, borderLeft: '2px solid transparent' }}>
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <>
      {groupNav(navItems).map(({ section, items }) => (
        <div key={section} className="mb-1" data-prueba={`seccion-${section}`}>
          <div className="px-3 pt-3 pb-1 tech-label" style={{ color: '#5a6178' }}>{section}</div>
          {items.map((item) => <Enlace key={item.page} item={item} />)}
        </div>
      ))}
    </>
  );
}


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

  useEffect(() => {
    // Normativas, precios de proveedores, catálogos, homologación y
    // aranceles: se comprueban solas una vez al día (al cruzar las 00:00,
    // la primera vez que se abre la app ese día) sin interrumpir a nadie.
    const t = setTimeout(() => {
      import('@/lib/dailyAutoUpdate').then(({ maybeRunDailyBackground }) => maybeRunDailyBackground());
    }, 3000);
    return () => clearTimeout(t);
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen flex" dir="ltr" style={{ background: 'hsl(var(--background))', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <AIChat />
      <QuickPriceDBAccess />
      <BackupProgressIndicator />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <style>{`
        body { background: hsl(var(--background)); color: hsl(var(--foreground)); }
        .no-print { display: block; }
        @media print {
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          table td, table th { border: 1px solid #ccc !important; padding: 4px !important; }
        }
        /* Dark Pro scrollbar */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #0f0f1a; }
        ::-webkit-scrollbar-thumb { background: #2a2a40; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #00D4FF55; }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 fixed h-full z-30" style={{ background: '#0d0d18', borderRight: '1px solid #1e1e30' }}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: '#1e1e30' }}>
          {company?.logo_url ?
          <img src={company.logo_url} alt="Logo" className="h-9 w-9 rounded-xl object-cover" style={{ border: '1px solid #00D4FF33' }} /> :
          <div className="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-base" style={{ background: 'linear-gradient(135deg, #00D4FF, #7C3AED)', color: '#fff' }}>
              {company?.company_name?.[0] || 'S'}
            </div>
          }
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate" style={{ color: '#e8eaf0' }}>{company?.company_name || 'Mi Empresa'}</h1>
            <p className="text-xs truncate" style={{ color: '#00D4FF99' }}>Gestión SAT Profesional</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <SidebarNav
            currentPageName={currentPageName}
            idleColor="#8890a8"
            activeStyle={{
              background: 'linear-gradient(90deg, #00D4FF15, transparent)',
              color: '#00D4FF',
              borderLeft: '2px solid #00D4FF',
              fontWeight: 600,
            }}
          />
        </nav>
        <div className="p-3 space-y-2" style={{ borderTop: '1px solid #1e1e30' }}>
          <button onClick={() => setSearchOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all" style={{ background: '#ffffff08', color: '#8890a8', border: '1px solid #1e1e30' }}>
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#ffffff10', color: '#8890a8' }}>⌘K</kbd>
          </button>
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold" style={{ color: '#8890a8' }}>Alertas</span>
            <div className="flex items-center gap-1">
              <AjusteRapidoLetra />
              <ThemeToggle />
              <NotificationsPanel />
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-xs w-full px-2 py-2 rounded transition-all" style={{ color: '#8890a8' }}
            onMouseEnter={e => e.currentTarget.style.color = '#00D4FF'}
            onMouseLeave={e => e.currentTarget.style.color = '#8890a8'}>
            <LogOut className="w-3.5 h-3.5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen &&
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      }

      {/* Sidebar mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#0d0d18', borderRight: '1px solid #1e1e30' }}>
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-2">
            {company?.logo_url ?
            <img src={company.logo_url} alt="Logo" className="h-8 w-8 rounded-xl object-cover" /> :
            <div className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00D4FF, #7C3AED)', color: '#fff' }}>
                {company?.company_name?.[0] || 'S'}
              </div>
            }
            <span className="font-bold text-sm" style={{ color: '#e8eaf0' }}>{company?.company_name || 'Mi Empresa'}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ color: '#8890a8' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="overflow-y-auto py-2 h-[calc(100vh-64px)]">
          <SidebarNav
            currentPageName={currentPageName}
            onNavigate={() => setSidebarOpen(false)}
            idleColor="#8890a8"
            activeStyle={{
              background: '#00D4FF12',
              color: '#00D4FF',
              borderLeft: '2px solid #00D4FF',
              fontWeight: 600,
            }}
          />
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-60 min-h-screen relative overflow-x-hidden min-w-0">
        {/* Fondo por sección según el módulo activo */}
        <SectionBackground pageName={currentPageName} />
        {/* Background watermark logo — GPU layer aislada para no afectar scroll */}
        {company?.logo_url &&
        <div
          className="fixed pointer-events-none z-0"
          style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%) translateZ(0)',
            opacity: 0.02,
            width: '60vw', maxWidth: 500,
            willChange: 'opacity',
          }}>
            <img src={company.logo_url} alt="" style={{ width: '100%', filter: 'grayscale(1) invert(1)' }} loading="lazy" decoding="async" />
          </div>
        }
        {/* Top bar mobile */}
        <header className="lg:hidden sticky top-0 z-30 px-4 py-3 flex items-center justify-between" style={{ background: '#0d0d18', borderBottom: '1px solid #1e1e30' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} style={{ color: '#8890a8' }}>
              <Menu className="w-6 h-6" />
            </button>

          </div>
          <h2 className="font-semibold text-sm truncate mx-2" style={{ color: '#e8eaf0' }}>
            {navItems.find((n) => n.page === currentPageName)?.name || currentPageName}
          </h2>
          <div className="flex items-center gap-1">
            <AjusteRapidoLetra compacto />
            <ThemeToggle size="w-5 h-5" />
            <button onClick={() => setSearchOpen(true)} className="p-1.5" style={{ color: '#8890a8' }}>
              <Search className="w-5 h-5" />
            </button>
            <NotificationsPanel />
          </div>
        </header>
        <main className="p-3 md:p-5 max-w-7xl mx-auto relative z-10 pb-28 lg:pb-6 overflow-x-hidden min-w-0 w-full" style={{ contain: 'layout style' }}>
          <BarraNavegacion enInicio={currentPageName === 'Home'} />
          {children}
        </main>

        {/* Pie de página global con el correo de soporte y enlaces legales */}
        <footer className="max-w-7xl mx-auto px-3 md:px-5 pb-28 lg:pb-6 pt-2 text-center text-xs text-slate-400">
          <div>
            Gestión Pro Total · Soporte:{' '}
            <a href="mailto:kairigarcia.gestionprototal@gmail.com" className="text-sky-600 hover:underline">
              kairigarcia.gestionprototal@gmail.com
            </a>
          </div>
          <div className="mt-1">
            <a href="legal/eula.html" target="_blank" rel="noopener" className="hover:underline">Licencia (EULA)</a>
            {' · '}
            <a href="legal/privacidad.html" target="_blank" rel="noopener" className="hover:underline">Privacidad</a>
            {' · '}
            <a href="legal/terminos.html" target="_blank" rel="noopener" className="hover:underline">Términos</a>
          </div>
        </footer>

        {/* Mobile bottom tab bar */}
        <MobileBottomBar currentPageName={currentPageName} />
      </div>
    </div>
  );
}