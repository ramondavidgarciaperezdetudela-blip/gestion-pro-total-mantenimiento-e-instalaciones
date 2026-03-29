import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, Bell } from 'lucide-react';
import { getHomeData } from '@/lib/homeDataCache';

export default function DocumentsStatusPanel() {
  const [accepted, setAccepted] = useState({ invoices: 0, sats: 0 });
  const [rejected, setRejected] = useState({ invoices: 0, sats: 0 });

  useEffect(() => {
    getHomeData().then(({ invoices, satOrders }) => {
      const acceptedInvoices = invoices.filter(d => ['enviado', 'pagado', 'vencido'].includes(d.status) && d.signature_client).length;
      const rejectedInvoices = invoices.filter(d => d.status === 'cancelado' && d.signature_client).length;
      const acceptedSATs = satOrders.filter(s => s.status === 'en_curso' && s.signature_client).length;
      const rejectedSATs = satOrders.filter(s => s.status === 'cancelada' && s.signature_client).length;
      setAccepted({ invoices: acceptedInvoices, sats: acceptedSATs });
      setRejected({ invoices: rejectedInvoices, sats: rejectedSATs });
    });
  }, []);

  const statusCards = [
    { label: '✅ Presupuestos Aceptados', value: accepted.invoices, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '❌ Presupuestos Denegados', value: rejected.invoices, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '✅ SAT Aceptados', value: accepted.sats, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '❌ SAT Rechazados', value: rejected.sats, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-800">Estado de Documentos</h3>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statusCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className={`${card.bg} border-0`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 font-black">{card.label}</p>
                    <p className="text-2xl font-black text-gray-800 mt-1">{card.value}</p>
                  </div>
                  <Icon className={`w-6 h-6 ${card.color} opacity-70`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}