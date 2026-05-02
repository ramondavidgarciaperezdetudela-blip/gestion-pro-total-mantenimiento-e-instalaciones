import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PenLine, FileText, Wrench, ClipboardList, RefreshCw, Bell, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PendingSignaturesPanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Cargar en paralelo: presupuestos/facturas sin firmar, SAT sin firmar, mantenimientos sin firmar
    const [invoices, satOrders, maintenances] = await Promise.all([
      base44.entities.Invoice.list('-date', 100),
      base44.entities.SATOrder.list('-date', 100),
      base44.entities.MaintenanceSheet.list('-date', 50),
    ]);

    const pendingItems = [];

    // Presupuestos enviados sin firma de cliente
    invoices
      .filter(d => d.doc_type === 'presupuesto' && d.status === 'enviado' && !d.signature_client)
      .forEach(d => pendingItems.push({
        id: d.id,
        type: 'presupuesto',
        label: `Presupuesto Nº${d.doc_number || '-'}`,
        client: d.contact_name,
        amount: d.total,
        date: d.date,
        urgency: 'alta',
        page: 'Documents',
        icon: 'presupuesto',
        hint: 'Enviado, pendiente de firma cliente'
      }));

    // Facturas enviadas sin firma (si se require conformidad)
    invoices
      .filter(d => d.doc_type === 'factura' && d.status === 'enviado' && !d.signature_client)
      .forEach(d => pendingItems.push({
        id: d.id,
        type: 'factura',
        label: `Factura Nº${d.doc_number || '-'}`,
        client: d.contact_name,
        amount: d.total,
        date: d.date,
        urgency: 'media',
        page: 'Documents',
        icon: 'factura',
        hint: 'Enviada, pendiente de firma'
      }));

    // Facturas vencidas sin cobrar
    invoices
      .filter(d => d.doc_type === 'factura' && d.status === 'vencido')
      .forEach(d => pendingItems.push({
        id: d.id,
        type: 'vencida',
        label: `Factura Nº${d.doc_number || '-'} VENCIDA`,
        client: d.contact_name,
        amount: d.total,
        date: d.date,
        urgency: 'urgente',
        page: 'Documents',
        icon: 'factura',
        hint: '⚠ Factura vencida sin cobrar'
      }));

    // SAT completadas sin firma técnico o cliente
    satOrders
      .filter(s => s.status === 'completada' && (!s.signature_technician || !s.signature_client))
      .forEach(s => {
        const missing = [];
        if (!s.signature_technician) missing.push('técnico');
        if (!s.signature_client) missing.push('cliente');
        pendingItems.push({
          id: s.id,
          type: 'sat',
          label: `SAT #${s.order_number || '-'}`,
          client: s.contact_name,
          amount: s.total,
          date: s.date,
          urgency: 'media',
          page: 'SAT',
          icon: 'sat',
          hint: `Completada, falta firma de: ${missing.join(' y ')}`
        });
      });

    // SAT en curso sin firma técnico
    satOrders
      .filter(s => s.status === 'en_curso' && !s.signature_technician)
      .forEach(s => pendingItems.push({
        id: s.id,
        type: 'sat_incurso',
        label: `SAT #${s.order_number || '-'} (en curso)`,
        client: s.contact_name,
        amount: s.total,
        date: s.date,
        urgency: 'baja',
        page: 'SAT',
        icon: 'sat',
        hint: 'En curso, falta firma del técnico'
      }));

    // Mantenimientos completados sin firmas
    maintenances
      .filter(m => m.status === 'completada' && (!m.signature_technician || !m.signature_client))
      .forEach(m => {
        const missing = [];
        if (!m.signature_technician) missing.push('técnico');
        if (!m.signature_client) missing.push('cliente');
        pendingItems.push({
          id: m.id,
          type: 'mantenimiento',
          label: `Mantenimiento ${m.sheet_number || ''}`,
          client: m.contact_name,
          amount: null,
          date: m.date,
          urgency: 'baja',
          page: 'Maintenance',
          icon: 'mantenimiento',
          hint: `Completado, falta firma de: ${missing.join(' y ')}`
        });
      });

    // Ordenar: urgente > alta > media > baja
    const urgencyOrder = { urgente: 0, alta: 1, media: 2, baja: 3 };
    pendingItems.sort((a, b) => (urgencyOrder[a.urgency] ?? 9) - (urgencyOrder[b.urgency] ?? 9));

    setItems(pendingItems.slice(0, 20));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const URGENCY_STYLE = {
    urgente: 'border-l-4 border-l-red-400 bg-red-50',
    alta:    'border-l-4 border-l-orange-400 bg-orange-50',
    media:   'border-l-4 border-l-blue-300 bg-blue-50',
    baja:    'border-l-4 border-l-gray-300 bg-gray-50',
  };

  const URGENCY_BADGE = {
    urgente: 'bg-red-100 text-red-700',
    alta:    'bg-orange-100 text-orange-700',
    media:   'bg-blue-100 text-blue-700',
    baja:    'bg-gray-100 text-gray-500',
  };

  const ICON_MAP = {
    presupuesto:  <FileText className="w-3.5 h-3.5 text-blue-500" />,
    factura:      <FileText className="w-3.5 h-3.5 text-violet-500" />,
    sat:          <Wrench className="w-3.5 h-3.5 text-orange-500" />,
    sat_incurso:  <Wrench className="w-3.5 h-3.5 text-blue-400" />,
    mantenimiento:<ClipboardList className="w-3.5 h-3.5 text-cyan-500" />,
  };

  return (
    <Card className={items.filter(i => i.urgency === 'urgente').length > 0 ? 'border-red-200' : 'border-amber-200'}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500" />
          Recordatorios — Pendiente de firma / cobro
          {items.length > 0 && (
            <Badge className={`text-[10px] ${items.filter(i => i.urgency === 'urgente').length > 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {items.length}
            </Badge>
          )}
        </CardTitle>
        <button onClick={load} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        {loading ? (
          <p className="text-center text-xs text-gray-400 py-4">Comprobando pendientes...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-6 text-green-600">
            <PenLine className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-semibold">Todo al día ✓</p>
            <p className="text-[10px] text-gray-400 mt-1">No hay documentos pendientes de firma ni cobro</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto overscroll-contain pr-1">
            {items.map((item, i) => (
              <Link key={`${item.type}-${item.id}-${i}`} to={createPageUrl(item.page)}
                className={`flex items-center gap-3 p-2.5 rounded-lg hover:shadow-sm transition-shadow ${URGENCY_STYLE[item.urgency] || 'bg-gray-50'}`}>
                <div className="flex-shrink-0">
                  {ICON_MAP[item.icon] || <PenLine className="w-3.5 h-3.5 text-gray-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {item.urgency === 'urgente' && <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />}
                    <p className="text-xs font-bold text-gray-800 truncate">{item.label}</p>
                  </div>
                  <p className="text-[10px] text-gray-600 truncate">{item.client}</p>
                  <p className="text-[10px] text-gray-400 truncate">{item.hint}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {item.amount > 0 && (
                    <span className="text-xs font-bold text-gray-700">{item.amount.toFixed(0)}€</span>
                  )}
                  <Badge className={`text-[9px] ${URGENCY_BADGE[item.urgency]}`}>{item.urgency}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}