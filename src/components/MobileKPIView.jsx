import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  Calendar, Wrench, ClipboardList, AlertTriangle,
  ChevronRight, Clock, CheckCircle, Euro, AlertCircle,
  Users, FileText, Bell
} from 'lucide-react';

function BigActionCard({ icon: Icon, label, value, sub, color, bgColor, page, urgent }) {
  return (
    <Link to={createPageUrl(page)}>
      <div className={`relative rounded-2xl p-4 ${bgColor} border-2 ${urgent ? 'border-red-300 animate-pulse' : 'border-transparent'} active:scale-95 transition-transform`}>
        <div className="flex items-start justify-between">
          <div className={`p-3 rounded-xl ${color} shadow-sm`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {urgent && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">URGENTE</span>
          )}
          {!urgent && <ChevronRight className="w-5 h-5 text-gray-300 mt-1" />}
        </div>
        <div className="mt-3">
          <p className="text-3xl font-extrabold text-gray-900 leading-none">{value}</p>
          <p className="text-sm font-bold text-gray-700 mt-1">{label}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Link>
  );
}

function AlertRow({ type, text, page }) {
  return (
    <Link to={createPageUrl(page)}>
      <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-medium active:opacity-70 ${
        type === 'danger'
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{text}</span>
        <ChevronRight className="w-4 h-4 flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function MobileKPIView({ kpis, appointments, recentSat, alerts }) {
  const urgentSat = recentSat.filter(s => s.priority === 'urgente' || s.type === 'urgencia');

  return (
    <div className="space-y-5 pb-2">

      {/* Alertas urgentes arriba de todo */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Avisos activos
          </p>
          {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
        </div>
      )}

      {/* Tarjetas KPI grandes — 2 columnas táctiles */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Estado de hoy</p>
        <div className="grid grid-cols-2 gap-3">
          <BigActionCard
            icon={Clock}
            label="Citas hoy"
            value={appointments.length}
            sub={appointments.length > 0 ? appointments[0]?.time_start + ' · ' + appointments[0]?.title?.slice(0, 18) : 'Sin citas programadas'}
            color="bg-blue-500"
            bgColor="bg-blue-50"
            page="Agenda"
          />
          <BigActionCard
            icon={Wrench}
            label="SAT pendientes"
            value={kpis.satPending}
            sub={urgentSat.length > 0 ? `${urgentSat.length} urgente(s)` : 'Sin urgencias'}
            color="bg-orange-500"
            bgColor="bg-orange-50"
            page="SAT"
            urgent={urgentSat.length > 0}
          />
          <BigActionCard
            icon={AlertCircle}
            label="Facturas vencidas"
            value={kpis.invoicesOverdue}
            sub={kpis.invoicesOverdue > 0 ? 'Requieren atención' : 'Al día'}
            color={kpis.invoicesOverdue > 0 ? 'bg-red-500' : 'bg-green-500'}
            bgColor={kpis.invoicesOverdue > 0 ? 'bg-red-50' : 'bg-green-50'}
            page="Documents"
            urgent={kpis.invoicesOverdue > 0}
          />
          <BigActionCard
            icon={ClipboardList}
            label="Mant. próximo"
            value={kpis.maintenanceDue}
            sub={kpis.maintenanceDue > 0 ? 'Equipos en 30 días' : 'Sin urgencias'}
            color={kpis.maintenanceDue > 0 ? 'bg-amber-500' : 'bg-cyan-500'}
            bgColor={kpis.maintenanceDue > 0 ? 'bg-amber-50' : 'bg-cyan-50'}
            page="Maintenance"
          />
        </div>
      </div>

      {/* Resumen financiero */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Resumen financiero</p>
        <div className="grid grid-cols-2 gap-3">
          <BigActionCard
            icon={Euro}
            label="Pendiente cobro"
            value={`${(kpis.pendingAmount / 1000).toFixed(1)}k€`}
            sub={`${kpis.invoicesPending} factura(s) enviadas`}
            color="bg-violet-500"
            bgColor="bg-violet-50"
            page="Documents"
          />
          <BigActionCard
            icon={CheckCircle}
            label="Cobrado este mes"
            value={`${(kpis.paidThisMonth / 1000).toFixed(1)}k€`}
            sub={`${kpis.invoicesPaid} facturas pagadas`}
            color="bg-green-500"
            bgColor="bg-green-50"
            page="Documents"
          />
        </div>
      </div>

      {/* SAT urgentes */}
      {urgentSat.length > 0 && (
        <div>
          <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> SAT Urgentes
          </p>
          <div className="space-y-2">
            {urgentSat.slice(0, 3).map(sat => (
              <Link key={sat.id} to={createPageUrl('SAT')}>
                <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl active:opacity-70">
                  <div className="p-2 bg-red-500 rounded-lg"><Wrench className="w-4 h-4 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{sat.contact_name}</p>
                    <p className="text-xs text-gray-500">{sat.type} · {sat.date}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Accesos rápidos táctiles */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Acciones rápidas</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Nueva factura', page: 'Documents?type=factura', color: 'bg-violet-100 text-violet-700' },
            { label: 'Nuevo SAT', page: 'SAT', color: 'bg-orange-100 text-orange-700' },
            { label: 'Nuevo mant.', page: 'Maintenance', color: 'bg-cyan-100 text-cyan-700' },
            { label: 'Presupuesto', page: 'Documents?type=presupuesto', color: 'bg-blue-100 text-blue-700' },
            { label: 'Asistente IA', page: 'AIAssistant', color: 'bg-green-100 text-green-700' },
            { label: 'Ver agenda', page: 'Agenda', color: 'bg-indigo-100 text-indigo-700' },
          ].map(item => (
            <Link key={item.page} to={createPageUrl(item.page)}>
              <div className={`${item.color} rounded-xl p-3 text-center text-xs font-bold active:scale-95 transition-transform`}>
                {item.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}