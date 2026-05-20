import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, Clock, CheckCircle2, XCircle, AlertCircle, ChevronRight, RefreshCw, LayoutGrid } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const COLUMNS = [
  { key: 'pendiente', label: 'Pendiente', color: 'bg-amber-50 border-amber-200', headerColor: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock, dot: 'bg-amber-400' },
  { key: 'en_curso',  label: 'En curso',  color: 'bg-blue-50 border-blue-200',   headerColor: 'bg-blue-100 text-blue-800 border-blue-200',   icon: Wrench, dot: 'bg-blue-400' },
  { key: 'completada', label: 'Completada', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2, dot: 'bg-green-400' },
  { key: 'cancelada', label: 'Cancelada', color: 'bg-gray-50 border-gray-200',   headerColor: 'bg-gray-100 text-gray-600 border-gray-200',   icon: XCircle, dot: 'bg-gray-400' },
];

const PRIORITY_BADGE = {
  urgente: 'bg-red-100 text-red-700',
  alta:    'bg-orange-100 text-orange-700',
  normal:  'bg-gray-100 text-gray-600',
  baja:    'bg-gray-100 text-gray-500',
};

const PRIORITY_BORDER = {
  urgente: 'border-l-4 border-l-red-400',
  alta:    'border-l-4 border-l-orange-400',
  normal:  '',
  baja:    '',
};

function KanbanCard({ order, onStatusChange }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm p-3 text-xs space-y-1.5 hover:shadow-md transition-shadow ${PRIORITY_BORDER[order.priority] || ''}`}>
      <div className="flex items-start justify-between gap-1">
        <p className="font-bold text-gray-800 truncate flex-1">#{order.order_number || 'S/N'}</p>
        {order.priority && order.priority !== 'normal' && (
          <Badge className={`text-[9px] flex-shrink-0 ${PRIORITY_BADGE[order.priority]}`}>
            {order.priority === 'urgente' && <AlertCircle className="w-2.5 h-2.5 mr-0.5" />}
            {order.priority}
          </Badge>
        )}
      </div>
      <p className="text-gray-700 font-semibold truncate">{order.contact_name}</p>
      <p className="text-gray-400 truncate">{order.type?.replace(/_/g, ' ')} · {order.equipment_type?.replace(/_/g, ' ')}</p>
      {order.date && <p className="text-gray-400">{(() => { try { return format(new Date(order.date + 'T00:00:00'), 'dd/MM/yy', { locale: es }); } catch { return order.date; } })()}</p>}
      {order.technician && <p className="text-blue-500 truncate">👷 {order.technician}</p>}
      {order.total > 0 && <p className="text-gray-600 font-semibold">{order.total.toFixed(2)} €</p>}

      {/* Quick status change buttons */}
      <div className="flex gap-1 pt-1 border-t border-gray-100 flex-wrap">
        {COLUMNS.filter(c => c.key !== order.status).map(col => (
          <button
            key={col.key}
            onClick={() => onStatusChange(order.id, col.key)}
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${col.headerColor} hover:opacity-80 transition-opacity`}
          >
            → {col.label}
          </button>
        ))}
        <Link to={createPageUrl('SAT')} className="ml-auto text-blue-500 hover:text-blue-700">
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function SATKanban() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  const load = async () => {
    const data = await base44.entities.SATOrder.list('-date', 100);
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    setUpdating(id);
    await base44.entities.SATOrder.update(id, { status: newStatus });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
    setUpdating(null);
  };

  const grouped = Object.fromEntries(COLUMNS.map(c => [c.key, orders.filter(o => o.status === c.key)]));

  if (loading) return (
    <Card>
      <CardContent className="py-8 text-center text-gray-400 text-sm">Cargando Kanban...</CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-orange-500" />
          Tablero SAT (Kanban)
          <Badge className="bg-orange-100 text-orange-700 text-[10px]">{orders.length} órdenes</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Actualizar">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <Link to={createPageUrl('SAT')} className="text-blue-500 text-xs font-bold hover:underline">Ver módulo SAT</Link>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const Icon = col.icon;
            const colOrders = grouped[col.key] || [];
            return (
              <div key={col.key} className={`rounded-xl border ${col.color} overflow-hidden`}>
                {/* Column header */}
                <div className={`flex items-center justify-between px-3 py-2 border-b ${col.headerColor}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-bold">{col.label}</span>
                  </div>
                  <span className="text-xs font-bold bg-white/60 rounded-full px-1.5 py-0.5">{colOrders.length}</span>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 max-h-72 overflow-y-auto overscroll-contain">
                  {colOrders.length === 0 ? (
                    <p className="text-center text-[10px] text-gray-400 py-4">Sin órdenes</p>
                  ) : (
                    colOrders.map(order => (
                      <div key={order.id} className={updating === order.id ? 'opacity-50 pointer-events-none' : ''}>
                        <KanbanCard order={order} onStatusChange={handleStatusChange} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}