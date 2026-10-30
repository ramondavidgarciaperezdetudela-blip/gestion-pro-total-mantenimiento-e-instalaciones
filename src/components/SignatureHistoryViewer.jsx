import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, XCircle, ArrowRightCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function SignatureHistoryViewer({ signatureHistory, onResendLink }) {
  if (!signatureHistory || signatureHistory.length === 0) {
    return null;
  }

  const getIcon = (action, isChangeOfOpinion) => {
    if (isChangeOfOpinion) return <ArrowRightCircle className="w-5 h-5 text-orange-500" />;
    if (action === 'aceptar') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (action === 'rechazar') return <XCircle className="w-5 h-5 text-red-500" />;
    return null;
  };

  const getActionLabel = (action, index) => {
    const isChangeOfOpinion = index > 0;
    if (isChangeOfOpinion) {
      if (action === 'aceptar') return 'CAMBIO DE OPINIÓN → ACEPTADO';
      if (action === 'rechazar') return 'CAMBIO DE OPINIÓN → RECHAZADO';
    }
    if (action === 'aceptar') return 'ACEPTADO';
    if (action === 'rechazar') return 'RECHAZADO';
    return action;
  };

  const getColors = (action, isChangeOfOpinion) => {
    if (isChangeOfOpinion) {
      return { bg: 'bg-orange-50', border: 'border-l-4 border-l-orange-500', text: 'text-orange-700' };
    }
    if (action === 'aceptar') {
      return { bg: 'bg-green-50', border: 'border-l-4 border-l-green-500', text: 'text-green-700' };
    }
    if (action === 'rechazar') {
      return { bg: 'bg-red-50', border: 'border-l-4 border-l-red-500', text: 'text-red-700' };
    }
    return { bg: 'bg-gray-50', border: 'border-l-4 border-l-gray-500', text: 'text-gray-700' };
  };

  const lastSignature = signatureHistory[signatureHistory.length - 1];

  return (
    <div className="space-y-3">
      <Card className={`${getColors(lastSignature.action, signatureHistory.length > 1).border} rounded-lg`}>
        <CardContent className="p-4">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
            📋 Historial de firmas y decisiones ({signatureHistory.length})
          </h4>
          <div className="space-y-2">
            {signatureHistory.map((item, idx) => {
              const isChangeOfOpinion = idx > 0;
              const colors = getColors(item.action, isChangeOfOpinion);
              const actionLabel = getActionLabel(item.action, idx);
              return (
                <div key={idx} className={`rounded-lg p-3 ${colors.bg} ${colors.border}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(item.action, isChangeOfOpinion)}
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
                            className="max-w-[120px] border border-gray-300 rounded bg-white p-1"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {onResendLink && (
            <Button
              size="sm"
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
              onClick={onResendLink}
            >
              📧 Enviar enlace de cambio de opinión
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}