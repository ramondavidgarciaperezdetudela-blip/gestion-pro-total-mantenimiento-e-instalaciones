import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import {
  Home, Users, FileText, Calendar, Wrench, ClipboardList,
  Thermometer, Sun, BookOpen, Shield, Bot, Settings,
  Menu, X, ChevronRight, Building2, FolderOpen, Calculator,
  Zap, BarChart3, LogOut
} from 'lucide-react';

const navItems = [
  { name: 'Inicio', page: 'Home', icon: Home },
  { name: 'Agenda', page: 'Agenda', icon: Calendar },
  { name: 'Contactos', page: 'Contacts', icon: Users },
  { name: 'Documentos', page: 'Documents', icon: FileText },
  { name: 'SAT', page: 'SAT', icon: Wrench },
  { name: 'Mantenimiento', page: 'Maintenance', icon: ClipboardList },
  { name: 'Proyectos', page: 'Projects', icon: FolderOpen },
  { name: 'Cálculo Térmico', page: 'ThermalCalc', icon: Thermometer },
  { name: 'Cálculo Solar', page: 'SolarCalc', icon: Sun },
  { name: 'Cálculo Eléctrico', page: 'ElectricalCalc', icon: Zap },
  { name: 'Normativas', page: 'Regulations', icon: Shield },
  { name: 'Manuales', page: 'Manuals', icon: BookOpen },
  { name: 'Proveedores', page: 'Suppliers', icon: Building2 },
  { name: 'Informes', page: 'Reports', icon: BarChart3 },
  { name: 'Asistente IA', page: 'AIAssistant', icon: Bot },
  { name: 'Configuración', page: 'CompanyConfig', icon: Settings },
];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(data => {
      if (data.length > 0) setCompany(data[0]);
    });
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex" dir="ltr">
      <style>{`
        :root {
          --primary: #1e3a5f;
          --primary-light: #2d5f8a;
          --accent: #0ea5e9;
          --accent-light: #38bdf8;
        }
      `}</style>

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-[var(--primary)] text-white fixed h-full z-30 shadow-xl">
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          {company?.logo_url ? (
            <img src={company.logo_url} alt="Logo" className="h-10 w-10 rounded-lg object-cover bg-white p-0.5" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-[var(--accent)] flex items-center justify-center font-bold text-lg">
              {company?.company_name?.[0] || 'S'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">{company?.company_name || 'Mi Empresa'}</h1>
            <p className="text-[10px] text-blue-200 truncate">Gestión SAT Profesional</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'bg-white/15 text-white border-r-3 border-[var(--accent)]'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-2 text-blue-200 hover:text-white text-sm w-full px-2 py-2 rounded hover:bg-white/10 transition-all">
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[var(--primary)] text-white transform transition-transform lg:hidden ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="Logo" className="h-8 w-8 rounded-lg object-cover bg-white p-0.5" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-[var(--accent)] flex items-center justify-center font-bold">
                {company?.company_name?.[0] || 'S'}
              </div>
            )}
            <span className="font-bold text-sm">{company?.company_name || 'Mi Empresa'}</span>
          </div>
          <button onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="overflow-y-auto py-2 h-[calc(100vh-80px)]">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${
                  isActive ? 'bg-white/15 text-white' : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:ml-64 min-h-screen">
        {/* Top bar mobile */}
        <header className="lg:hidden bg-white border-b sticky top-0 z-30 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          <h2 className="font-semibold text-sm text-gray-800">
            {navItems.find(n => n.page === currentPageName)?.name || currentPageName}
          </h2>
          <div className="w-6" />
        </header>
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}