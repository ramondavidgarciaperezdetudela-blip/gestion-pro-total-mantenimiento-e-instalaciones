import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Wrench, FileText, Package, ClipboardList, ChevronDown, ChevronUp, User, Filter
} from 'lucide-react';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), "d MMM yyyy", { locale: es }); } catch { return d; }
};

const TYPE_CONFIG = {
  sat:     { label: 'Parte SAT',      icon: Wrench,      color: 'bg-orange-500', badgeClass: 'bg-orange-100 text-orange-700', borderClass: 'border-l-orange-400' },
  factura: { label: 'Factura',        icon: FileText,    color: 'bg-violet-500', badgeClass: 'bg-violet-100 text-violet-700', borderClass: 'border-l-violet-400' },
  presupuesto: { label: 'Presupuesto', icon: FileText,   color: 'bg-blue-500',   badgeClass: 'bg-blue-100 text-blue-700',    borderClass: 'border-l-blue-400' },
  recibo:  { label: 'Recibo',         icon: FileText,    color: 'bg-teal-500',   badgeClass: 'bg-teal-100 text-teal-700',    borderClass: 'border-l-teal-400' },
  maint:   { label: 'Mantenimiento',  icon: ClipboardList, color: 'bg-cyan-500', badgeClass: 'bg-cyan-100 text-cyan-700',   borderClass: 'border-l-cyan-400' },
  equipo:  { label: 'Equipo instal.', icon: Package,     color: 'bg-amber-500',  badgeClass: 'bg-amber-100 text-amber-700', borderClass: 'border-l-amber-400' },
};

const STATUS_COLORS = {
  completada: 'bg-green-100 text-green-700',
  en_curso:   'bg-blue-100 text-blue-700',
  pendiente:  'bg-yellow-100 text-yellow-700',
  cancelada:  'bg-gray-100 text-gray-500',
  pagado:     'bg-green-100 text-green-700',
  enviado:    'bg-blue-100 text-blue-700',
  vencido:    'bg-red-100 text-red-700',
  borrador:   'bg-gray-100 text-gray-500',
  aceptado:   'bg-green-100 text-green-700',
  rechazado:  'bg-red-100 text-red-700',
};

function InterventionCard({ item, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = TYPE_CONFIG[item._type] || TYPE_CONFIG.sat;
  const Icon = cfg.icon;

  return (
    <div className={`border-l-4 ${cfg.borderClass} bg-white rounded-r-xl shadow-sm overflow-hidden`}>
      {/* Header — siempre visible */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Icono tipo */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${cfg.badgeClass}`}>{cfg.label}</span>
            {item.status && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-500'}`}>{item.status}</span>}
          </div>
          <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{item.title}</p>
          <p className="text-[11px] text-gray-400">{fmtDate(item._date)}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {item.total > 0 && (
            <span className="text-sm font-bold text-gray-700">{item.total.toFixed(2)} €</span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {/* Detalle expandido */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-2">
          {item.subtitle && <p className="text-xs text-gray-500">{item.subtitle}</p>}
          {item.technician && (
            <p className="flex items-center gap-1 text-xs text-blue-600">
              <User className="w-3 h-3" /> {item.technician}
            </p>
          )}
          {item.description && (
            <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 italic">"{item.description}"</p>
          )}
          {item.solution && (
            <div className="text-xs bg-green-50 border border-green-200 rounded p-2">
              <span className="font-semibold text-green-700">Solución: </span>
              <span className="text-green-800">{item.solution}</span>
            </div>
          )}
          {item.link && (
            <Link to={item.link} className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline">
              Ver detalle →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

const FILTER_TYPES = [
  { value: 'all',         label: 'Todo' },
  { value: 'sat',         label: 'SAT' },
  { value: 'factura',     label: 'Facturas' },
  { value: 'presupuesto', label: 'Presupuestos' },
  { value: 'maint',       label: 'Mantenimiento' },
  { value: 'equipo',      label: 'Equipos' },
];

export default function InterventionHistoryTab({ contactId, invoices = [], satOrders = [], maintenance = [] }) {
  const [clientMachines, setClientMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  useEffect(() => {
    base44.entities.ClientMachine.filter({ contact_id: contactId })
      .then(m => { setClientMachines(m); setLoading(false); })
      .catch(() => setLoading(false));
  }, [contactId]);

  // Construir timeline unificado
  const timeline = useMemo(() => {
    const items = [];

    // Órdenes SAT
    satOrders.forEach(o => items.push({
      id:          `sat-${o.id}`,
      _type:       'sat',
      _date:       o.scheduled_date || o.date,
      title:       `SAT #${o.order_number || 'S/N'} — ${(o.type || '').replace(/_/g, ' ')}`,
      subtitle:    (o.equipment_type || '').replace(/_/g, ' '),
      status:      o.status,
      technician:  o.technician,
      description: o.description || o.diagnosis,
      solution:    o.solution,
      total:       o.total || 0,
      link:        createPageUrl(`SAT`),
    }));

    // Facturas / presupuestos / recibos
    invoices.forEach(inv => items.push({
      id:          `inv-${inv.id}`,
      _type:       inv.doc_type || 'factura',
      _date:       inv.date,
      title:       `${inv.doc_number || (inv.doc_type || 'Doc')} — ${inv.contact_name || ''}`,
      subtitle:    inv.observations ? inv.observations.slice(0, 80) : '',
      status:      inv.status,
      total:       inv.total || 0,
      link:        createPageUrl(`Documents?edit=${inv.id}`),
    }));

    // Fichas de mantenimiento
    maintenance.forEach(m => items.push({
      id:          `maint-${m.id}`,
      _type:       'maint',
      _date:       m.date,
      title:       `Mant. #${m.sheet_number || '—'} — ${m.type || ''}`,
      subtitle:    `${m.equipment_brand || ''} ${m.equipment_model || ''}`.trim(),
      status:      m.status,
      technician:  m.technician_name,
      description: m.observations || m.recommendations,
      link:        createPageUrl(`Maintenance?view=${m.id}`),
    }));

    // Equipos instalados
    clientMachines.forEach(mach => items.push({
      id:          `equipo-${mach.id}`,
      _type:       'equipo',
      _date:       mach.install_date || mach.created_date,
      title:       `${mach.brand || ''} ${mach.model || mach.name || 'Equipo'}`.trim(),
      subtitle:    `${mach.machine_type || ''} — ${mach.location || ''}`.replace(/^ — |—\s*$/, '').trim(),
      description: mach.notes,
    }));

    return items.sort((a, b) => (b._date || '').localeCompare(a._date || ''));
  }, [satOrders, invoices, maintenance, clientMachines]);

  // Años disponibles para filtro
  const years = useMemo(() => {
    const ySet = new Set(timeline.map(i => i._date?.slice(0, 4)).filter(Boolean));
    return ['all', ...Array.from(ySet).sort((a, b) => b.localeCompare(a))];
  }, [timeline]);

  const filtered = useMemo(() => timeline.filter(i => {
    if (filterType !== 'all' && i._type !== filterType) return false;
    if (filterYear !== 'all' && (i._date || '').slice(0, 4) !== filterYear) return false;
    return true;
  }), [timeline, filterType, filterYear]);

  // KPIs resumen
  const kpis = useMemo(() => ({
    totalFacturado: invoices.filter(i => i.doc_type === 'factura').reduce((s, i) => s + (i.total || 0), 0),
    satCount:       satOrders.length,
    satCompleted:   satOrders.filter(o => o.status === 'completada').length,
    maintCount:     maintenance.length,
    equipCount:     clientMachines.length,
  }), [invoices, satOrders, maintenance, clientMachines]);

  if (loading) return <p className="text-center text-gray-400 py-8 text-sm">Cargando historial...</p>;

  return (
    <div className="space-y-4 mt-2">

      {/* KPIs resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-violet-700">{kpis.totalFacturado.toFixed(0)} €</p>
          <p className="text-xs text-violet-500 font-medium">Total facturado</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-orange-700">{kpis.satCount}</p>
          <p className="text-xs text-orange-500 font-medium">Partes SAT ({kpis.satCompleted} ✓)</p>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-cyan-700">{kpis.maintCount}</p>
          <p className="text-xs text-cyan-500 font-medium">Mantenimientos</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-amber-700">{kpis.equipCount}</p>
          <p className="text-xs text-amber-500 font-medium">Equipos instal.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex flex-wrap gap-1">
          {FILTER_TYPES.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilterType(f.value)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors border ${
                filterType === f.value
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >{f.label}</button>
          ))}
        </div>
        {years.length > 2 && (
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600"
          >
            {years.map(y => <option key={y} value={y}>{y === 'all' ? 'Todos los años' : y}</option>)}
          </select>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} registros</span>
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">Sin intervenciones registradas</p>
          <p className="text-xs mt-1">Los partes SAT, facturas y mantenimientos aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <InterventionCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}