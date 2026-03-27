import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function SignatureHistoryViewer({ signatureHistory }) {
  if (!signatureHistory || signatureHistory.length === 0) {
    return null;
  }

  const getIcon = (action) => {
    if (action === 'aceptar') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (action === 'rechazar') return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getActionLabel = (action, index, total) => {
    if (action === 'aceptar') {
      return index === 0 ? 'ACEPTADO' : 'CAMBIO DE OPINIÓN → ACEPTADO';
    }
    if (action === 'rechazar') {
      return index === 0 ? 'RECHAZADO' : 'CAMBIO DE OPINIÓN → RECHAZADO';
    }
    return action;
  };

  const getColors = (action) => {
    if (action === 'aceptar') return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' };
    if (action === 'rechazar') return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
    return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' };
  };

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50">
      <CardContent className="p-4">
        <h4 className="font-bold text-sm text-blue-800 mb-3 flex items-center gap-2">
          📋 Historial de firmas y decisiones
        </h4>
        <div className="space-y-3">
          {signatureHistory.map((item, idx) => {
            const colors = getColors(item.action);
            const actionLabel = getActionLabel(item.action, idx, signatureHistory.length);
            return (
              <div key={idx} className={`rounded-lg border ${colors.bg} ${colors.border} p-3`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getIcon(item.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm ${colors.text}`}>
                      {actionLabel}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      🕐 {item.datetime}
                    </p>
                    {item.signature_url && (
                      <div className="mt-2">
                        <img
                          src={item.signature_url}
                          alt={`Firma ${actionLabel}`}
                          className="max-w-[150px] border border-gray-300 rounded bg-white p-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}