import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { History, ChevronDown, ChevronUp, Wrench, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return format(new Date(d), "d MMM yyyy", { locale: es }); } catch { return d; }
};

const STATUS_COLORS = {
  completada: 'bg-green-500',
  en_curso: 'bg-blue-500',
  pendiente: 'bg-yellow-400',
  cancelada: 'bg-gray-400',
};

export default function ClientHistorySection({ contactId, currentOrderId }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (loaded) return;
    setLoading(true);
    const [sat, maint] = await Promise.all([
      base44.entities.SATOrder.filter({ contact_id: contactId }),
      base44.entities.MaintenanceSheet.filter({ contact_id: contactId }),
    ]);

    const timeline = [
      ...sat
        .filter(o => o.id !== currentOrderId)
        .map(o => ({ id: o.id, _type: 'sat', _date: o.scheduled_date || o.date, title: `SAT #${o.order_number || 'S/N'} — ${(o.type || '').replace(/_/g, ' ')}`, subtitle: (o.equipment_type || '').replace(/_/g, ' '), status: o.status, detail: o.solution || o.diagnosis || o.description || '', technician: o.technician })),
      ...maint.map(m => ({ id: m.id, _type: 'maint', _date: m.date, title: `Mantenimiento #${m.sheet_number || '—'} — ${m.type || ''}`, subtitle: `${m.equipment_brand || ''} ${m.equipment_model || ''}`.trim(), status: m.status, detail: m.observations || m.recommendations || '', technician: m.technician_name })),
    ].sort((a, b) => (b._date || '').localeCompare(a._date || ''));

    setItems(timeline);
    setLoaded(true);
    setLoading(false);
  };

  const toggle = () => {
    setOpen(o => !o);
    if (!loaded) load();
  };

  const total = items.length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">
            Historial de visitas anteriores
          </span>
          {loaded && <span className="text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{total}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto bg-white">
          {loading && (
            <p className="text-center text-gray-400 py-6 text-sm">Cargando historial...</p>
          )}

          {!loading && items.length === 0 && (
            <p className="text-center text-gray-400 py-6 text-sm">Sin visitas anteriores registradas</p>
          )}

          {items.map(item => (
            <div key={item.id} className="px-4 py-3 flex items-start gap-3">
              {/* Icono tipo */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${STATUS_COLORS[item.status] || 'bg-gray-400'}`}>
                {item._type === 'sat'
                  ? <Wrench className="w-3.5 h-3.5 text-white" />
                  : <ClipboardList className="w-3.5 h-3.5 text-white" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-gray-400 font-medium">{fmtDate(item._date)}</p>
                <p className="text-sm font-semibold text-gray-800 leading-tight truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>}
                {item.technician && <p className="text-xs text-blue-600">👷 {item.technician}</p>}
                {item.detail ? (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2 italic">"{item.detail}"</p>
                ) : null}
              </div>

              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                item.status === 'completada' ? 'bg-green-100 text-green-700' :
                item.status === 'en_curso' ? 'bg-blue-100 text-blue-700' :
                item.status === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-500'
              }`}>{item.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}