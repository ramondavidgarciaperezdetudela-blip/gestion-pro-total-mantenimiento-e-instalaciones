import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Users, FileText, Wrench, ClipboardList,
  Thermometer, Sun, BookOpen, Shield, Bot, Settings,
  Building2, FolderOpen, Zap, BarChart3, Clock, AlertCircle,
  StickyNote, Package, Battery, Palette
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const quickLinks = [
  { name: 'Agenda', page: 'Agenda', icon: Calendar, color: 'bg-blue-500' },
  { name: 'Contactos', page: 'Contacts', icon: Users, color: 'bg-emerald-500' },
  { name: 'Documentos', page: 'Documents', icon: FileText, color: 'bg-violet-500' },
  { name: 'SAT', page: 'SAT', icon: Wrench, color: 'bg-orange-500' },
  { name: 'Mantenimiento', page: 'Maintenance', icon: ClipboardList, color: 'bg-cyan-500' },
  { name: 'Notas', page: 'Notes', icon: StickyNote, color: 'bg-lime-500' },
  { name: 'Inventario', page: 'Inventory', icon: Package, color: 'bg-teal-500' },
  { name: 'Proyectos', page: 'Projects', icon: FolderOpen, color: 'bg-pink-500' },
  { name: 'Proveedores', page: 'Suppliers', icon: Building2, color: 'bg-slate-500' },
  { name: 'Presupuesto IA', page: 'AIBudget', icon: Bot, color: 'bg-purple-500' },
  { name: 'Cálculo Térmico', page: 'ThermalCalc', icon: Thermometer, color: 'bg-red-500' },
  { name: 'Cámara Frigoríf.', page: 'ColdRoomCalc', icon: Thermometer, color: 'bg-sky-500' },
  { name: 'Cálculo Solar', page: 'SolarCalc', icon: Sun, color: 'bg-amber-500' },
  { name: 'Calc. Baterías', page: 'BatteryCalc', icon: Battery, color: 'bg-yellow-600' },
  { name: 'Electricidad', page: 'ElectricalCalc', icon: Zap, color: 'bg-yellow-500' },
  { name: 'Normativas', page: 'Regulations', icon: Shield, color: 'bg-indigo-500' },
  { name: 'Manuales', page: 'Manuals', icon: BookOpen, color: 'bg-teal-600' },
  { name: 'Informes', page: 'Reports', icon: BarChart3, color: 'bg-fuchsia-500' },
  { name: 'Plantillas', page: 'DocumentTemplates', icon: Palette, color: 'bg-rose-500' },
  { name: 'Asistente IA', page: 'AIAssistant', icon: Bot, color: 'bg-green-500' },
  { name: 'Configuración', page: 'CompanyConfig', icon: Settings, color: 'bg-gray-500' },
];

export default function Home() {
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ contacts: 0, invoices: 0, sat: 0 });
  const [company, setCompany] = useState(null);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      base44.entities.Appointment.filter({ date: today }),
      base44.entities.Contact.list(),
      base44.entities.Invoice.list(),
      base44.entities.SATOrder.filter({ status: 'pendiente' }),
      base44.entities.CompanySettings.list(),
    ]).then(([appts, contacts, invoices, sat, comp]) => {
      setAppointments(appts);
      setStats({ contacts: contacts.length, invoices: invoices.length, sat: sat.length });
      if (comp.length > 0) setCompany(comp[0]);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {company?.logo_url && (
          <img src={company.logo_url} alt="Logo" className="h-14 w-14 rounded-xl object-cover shadow-md" />
        )}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {company?.company_name || 'Bienvenido'}
          </h1>
          <p className="text-gray-500 text-sm">{format(new Date(), "EEEE, d 'de' MMMM yyyy")}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.contacts}</p>
            <p className="text-xs text-blue-600">Contactos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-700">{stats.invoices}</p>
            <p className="text-xs text-violet-600">Documentos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-700">{stats.sat}</p>
            <p className="text-xs text-orange-600">SAT Pendientes</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's appointments */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Citas de hoy</h2>
          </div>
          {appointments.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No hay citas programadas para hoy</p>
          ) : (
            <div className="space-y-2">
              {appointments.map(apt => (
                <div key={apt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center min-w-[50px]">
                    <p className="text-sm font-bold text-blue-600">{apt.time_start || '--:--'}</p>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{apt.title}</p>
                    <p className="text-xs text-gray-500">{apt.contact_name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{apt.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick access grid */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Acceso rápido</h2>
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