import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from "@/components/ui/badge";
import { Wrench, ClipboardList, Thermometer, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), "d MMM yyyy", { locale: es }); } catch { return d; }
};

function TimelineItem({ date, type, icon: Icon, color, title, subtitle, badge, link, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="w-0.5 bg-gray-200 flex-1 mt-1" />
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium">{fmtDate(date)}</p>
            <p className="font-semibold text-sm truncate">{title}</p>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {badge && <Badge variant="outline" className="text-[10px]">{badge}</Badge>}
            {children && (
              <button onClick={() => setOpen(o => !o)} className="p-1 text-gray-400 hover:text-gray-600">
                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
            {link && (
              <Link to={link} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Ver
              </Link>
            )}
          </div>
        </div>
        {open && children && (
          <div className="mt-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default function InstallationHistoryTab({ contactId }) {
  const [sat, setSat] = useState([]);
  const [maint, setMaint] = useState([]);
  const [calcs, setCalcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    const load = async () => {
      const [s, m, c] = await Promise.all([
        base44.entities.SATOrder.filter({ contact_id: contactId }),
        base44.entities.MaintenanceSheet.filter({ contact_id: contactId }),
        base44.entities.ThermalCalculation.filter({ contact_id: contactId }),
      ]);
      setSat(s); setMaint(m); setCalcs(c);
      setLoading(false);
    };
    load();
  }, [contactId]);

  // Build unified timeline
  const timeline = [
    ...sat.map(o => ({ ...o, _type: 'sat', _date: o.date || o.created_date })),
    ...maint.map(m => ({ ...m, _type: 'maint', _date: m.date || m.created_date })),
    ...calcs.map(c => ({ ...c, _type: 'calc', _date: c.date || c.created_date })),
  ].sort((a, b) => (b._date || '').localeCompare(a._date || ''));

  const filtered = filter === 'todos' ? timeline : timeline.filter(i => i._type === filter);

  const SAT_STATUS_COLOR = { pendiente: 'bg-yellow-500', en_curso: 'bg-blue-500', completada: 'bg-green-500', cancelada: 'bg-gray-400' };

  if (loading) return <p className="text-center text-gray-400 py-6 text-sm">Cargando historial...</p>;

  const totalSat = sat.length;
  const totalMaint = maint.length;
  const totalCalcs = calcs.length;

  return (
    <div className="space-y-4 mt-2">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-600">{totalSat}</p>
          <p className="text-xs text-orange-500 font-medium">Órdenes SAT</p>
          <p className="text-[10px] text-gray-400">{sat.filter(s => s.status === 'completada').length} completadas</p>
        </div>
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-cyan-600">{totalMaint}</p>
          <p className="text-xs text-cyan-500 font-medium">Mantenimientos</p>
          <p className="text-[10px] text-gray-400">{maint.filter(m => m.status === 'completada').length} completados</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalCalcs}</p>
          <p className="text-xs text-blue-500 font-medium">Cálculos</p>
          <p className="text-[10px] text-gray-400">Térmicos / Cámara</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'todos', label: `Todo (${timeline.length})` },
          { key: 'sat', label: `SAT (${totalSat})` },
          { key: 'maint', label: `Mantenimiento (${totalMaint})` },
          { key: 'calc', label: `Cálculos (${totalCalcs})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin intervenciones registradas</p>
        </div>
      )}

      {/* Timeline */}
      <div className="mt-2">
        {filtered.map((item) => {
          if (item._type === 'sat') {
            return (
              <TimelineItem
                key={item.id}
                date={item._date}
                icon={Wrench}
                color={SAT_STATUS_COLOR[item.status] || 'bg-gray-400'}
                title={`SAT #${item.order_number || 'S/N'} — ${(item.type || '').replace(/_/g, ' ')}`}
                subtitle={`${(item.equipment_type || '').replace(/_/g, ' ')}${item.technician ? ` · ${item.technician}` : ''}`}
                badge={item.status}
                link={createPageUrl('SAT')}
              >
                {item.description && <p><strong>Descripción:</strong> {item.description}</p>}
                {item.diagnosis && <p><strong>Diagnóstico:</strong> {item.diagnosis}</p>}
                {item.solution && <p><strong>Solución:</strong> {item.solution}</p>}
                {item.total > 0 && <p><strong>Total:</strong> {item.total.toFixed(2)} €</p>}
              </TimelineItem>
            );
          }
          if (item._type === 'maint') {
            return (
              <TimelineItem
                key={item.id}
                date={item._date}
                icon={ClipboardList}
                color="bg-cyan-500"
                title={`Mantenimiento #${item.sheet_number || '—'} — ${item.type || ''}`}
                subtitle={`${item.equipment_brand || ''} ${item.equipment_model || ''}${item.technician_name ? ` · ${item.technician_name}` : ''}`}
                badge={item.status}
                link={createPageUrl(`Maintenance?view=${item.id}`)}
              >
                {item.observations && <p><strong>Observaciones:</strong> {item.observations}</p>}
                {item.recommendations && <p><strong>Recomendaciones:</strong> {item.recommendations}</p>}
              </TimelineItem>
            );
          }
          if (item._type === 'calc') {
            return (
              <TimelineItem
                key={item.id}
                date={item._date}
                icon={Thermometer}
                color="bg-indigo-500"
                title={`Cálculo ${item.calc_type === 'camara_frigorifica' ? 'Cámara Frigorífica' : 'Térmico Clima'}`}
                subtitle={item.suggested_equipment || `Carga: ${item.calculated_load ? `${item.calculated_load}W` : '—'}`}
                badge={item.refrigerant_type || undefined}
                link={createPageUrl('ColdRoomCalc')}
              >
                {item.calculated_load && <p><strong>Carga total:</strong> {item.calculated_load} W ({Math.round(item.calculated_load * 0.86)} frig/h)</p>}
                {item.suggested_equipment && <p><strong>Equipo:</strong> {item.suggested_equipment}</p>}
                {item.refrigerant_charge_kg && <p><strong>Carga gas:</strong> {item.refrigerant_charge_kg} kg de {item.refrigerant_type}</p>}
                {item.working_pressures && (
                  <p><strong>Presiones:</strong> Evap. {item.working_pressures.low_pressure} bar · Cond. {item.working_pressures.high_pressure} bar</p>
                )}
              </TimelineItem>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}