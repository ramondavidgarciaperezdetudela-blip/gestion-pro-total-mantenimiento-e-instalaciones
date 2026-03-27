import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  Wrench, ClipboardList, AlertTriangle,
  ChevronRight, Clock, CheckCircle, Euro, AlertCircle, Bell, Bot
} from 'lucide-react';

function BigActionCard({ icon: Icon, label, value, sub, color, bgColor, page, urgent }) {
  return (
    <Link to={createPageUrl(page)}>
      <div className={`relative rounded-2xl p-3 ${bgColor} border-2 ${urgent ? 'border-red-300 animate-pulse' : 'border-transparent'} active:scale-95 transition-transform`}>
        <div className="flex items-start justify-between">
          <div className={`p-2.5 rounded-xl ${color} shadow-sm`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {urgent && (
            <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight">URGENTE</span>
          )}
          {!urgent && <ChevronRight className="w-4 h-4 text-gray-300 mt-1" />}
        </div>
        <div className="mt-2">
          <p className="text-2xl font-extrabold text-gray-900 leading-none">{value}</p>
          <p className="text-xs font-bold text-gray-700 mt-1 leading-tight">{label}</p>
          {sub && <p className="text-[10px] text-gray-500 mt-0.5 leading-tight line-clamp-2">{sub}</p>}
        </div>
      </div>
    </Link>
  );
}

function AlertRow({ type, text, page }) {
  return (
    <Link to={createPageUrl(page)}>
      <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium active:opacity-70 ${
        type === 'danger'
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 leading-tight">{text}</span>
        <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
      </div>
    </Link>
  );
}

export default function MobileKPIView({ kpis, appointments, recentSat, alerts }) {
  const urgentSat = recentSat.filter(s => s.priority === 'urgente' || s.type === 'urgencia');

  return (
    <div className="space-y-4 pb-2">

      {/* Botón IA destacado */}
      <Link to={createPageUrl('AIAssistant')}>
        <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl text-white active:scale-95 transition-transform shadow-md">
          <div className="p-2 bg-white/20 rounded-xl">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <p className="font-extrabold text-sm">Asistente IA</p>
            <p className="text-[11px] text-green-100">Consulta técnica, presupuestos, normativa…</p>
          </div>
          <ChevronRight className="w-5 h-5 ml-auto opacity-70" />
        </div>
      </Link>

      {/* Alertas urgentes */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Bell className="w-3 h-3" /> Avisos
          </p>
          {alerts.map((a, i) => <AlertRow key={i} {...a} />)}
        </div>
      )}

      {/* Tarjetas KPI — 2 columnas */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Estado de hoy</p>
        <div className="grid grid-cols-2 gap-2.5">
          <BigActionCard
            icon={Clock}
            label="Citas hoy"
            value={appointments.length}
            sub={appointments.length > 0 ? `${appointments[0]?.time_start} · ${appointments[0]?.title?.slice(0, 15)}` : 'Sin citas'}
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
            label="Fact. vencidas"
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
            sub={kpis.maintenanceDue > 0 ? 'En 30 días' : 'Sin urgencias'}
            color={kpis.maintenanceDue > 0 ? 'bg-amber-500' : 'bg-cyan-500'}
            bgColor={kpis.maintenanceDue > 0 ? 'bg-amber-50' : 'bg-cyan-50'}
            page="Maintenance"
          />
        </div>
      </div>

      {/* Resumen financiero */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Resumen financiero</p>
        <div className="grid grid-cols-2 gap-2.5">
          <BigActionCard
            icon={Euro}
            label="Pendiente cobro"
            value={`${(kpis.pendingAmount / 1000).toFixed(1)}k€`}
            sub={`${kpis.invoicesPending} enviada(s)`}
            color="bg-violet-500"
            bgColor="bg-violet-50"
            page="Documents"
          />
          <BigActionCard
            icon={CheckCircle}
            label="Cobrado mes"
            value={`${(kpis.paidThisMonth / 1000).toFixed(1)}k€`}
            sub={`${kpis.invoicesPaid} pagadas`}
            color="bg-green-500"
            bgColor="bg-green-50"
            page="Documents"
          />
        </div>
      </div>

      {/* SAT urgentes */}
      {urgentSat.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3" /> SAT Urgentes
          </p>
          <div className="space-y-1.5">
            {urgentSat.slice(0, 3).map(sat => (
              <Link key={sat.id} to={createPageUrl('SAT')}>
                <div className="flex items-center gap-2.5 p-2.5 bg-red-50 border border-red-200 rounded-xl active:opacity-70">
                  <div className="p-1.5 bg-red-500 rounded-lg flex-shrink-0"><Wrench className="w-3.5 h-3.5 text-white" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{sat.contact_name}</p>
                    <p className="text-[10px] text-gray-500 truncate">{sat.type} · {sat.date}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}