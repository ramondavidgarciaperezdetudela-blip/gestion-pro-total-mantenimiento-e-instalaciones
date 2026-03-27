import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MissingSATSignatures() {
  const [missingSATs, setMissingSATs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMissingSATs = async () => {
    try {
      const sats = await base44.entities.SATOrder.list();
      const missing = sats.filter(sat => {
        const hasTechnicianSig = !!sat.signature_technician;
        const hasClientSig = !!sat.signature_client;
        const isCompleted = ['completada'].includes(sat.status);
        return !isCompleted && (!hasTechnicianSig || !hasClientSig);
      }).slice(0, 5);
      setMissingSATs(missing);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissingSATs();
    const unsubscribe = base44.entities.SATOrder.subscribe(() => fetchMissingSATs());
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
          <span className="text-sm text-gray-600">Cargando...</span>
        </CardContent>
      </Card>
    );
  }

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
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-800">SAT Nº {sat.order_number}</p>
                <p className="text-xs text-gray-500">{sat.contact_name} · {sat.date}</p>
                <div className="flex gap-1 mt-1">
                  {!sat.signature_technician && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Falta firma técnico</span>}
                  {!sat.signature_client && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Falta firma cliente</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}