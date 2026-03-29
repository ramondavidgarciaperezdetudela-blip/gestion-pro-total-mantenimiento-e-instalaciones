import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getHomeData } from '@/lib/homeDataCache';

export default function MissingSATSignatures() {
  const [missingSATs, setMissingSATs] = useState([]);

  useEffect(() => {
    getHomeData().then(({ satOrders }) => {
      const missing = satOrders.filter(sat =>
        sat.status !== 'completada' && (!sat.signature_technician || !sat.signature_client)
      ).slice(0, 5);
      setMissingSATs(missing);
    });
  }, []);

  if (missingSATs.length === 0) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="w-5 h-5" />
          {missingSATs.length} orden{missingSATs.length !== 1 ? 'es' : ''} SAT sin completar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {missingSATs.map(sat => (
          <div key={sat.id} className="bg-white rounded-lg p-3 border border-orange-100">
            <p className="font-medium text-gray-800">SAT Nº {sat.order_number}</p>
            <p className="text-xs text-gray-500">{sat.contact_name} · {sat.date}</p>
            <div className="flex gap-1 mt-1">
              {!sat.signature_technician && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Falta firma técnico</span>}
              {!sat.signature_client && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Falta firma cliente</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}