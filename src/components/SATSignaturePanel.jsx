import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import SignatureCanvas from './SignaturePad';

const getNowDatetime = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

export default function SATSignaturePanel({ order, onUpdate }) {
  const [techDatetime, setTechDatetime] = useState(null);
  const [clientDatetime, setClientDatetime] = useState(null);

  const handleSaveTechSignature = async (dataUrl) => {
    const dt = getNowDatetime();
    setTechDatetime(dt);
    const updated = { ...order, signature_technician: dataUrl };
    await base44.entities.SATOrder.update(order.id, { signature_technician: dataUrl });
    onUpdate(updated);
  };

  const handleSaveClientSignature = async (dataUrl) => {
    const dt = getNowDatetime();
    setClientDatetime(dt);
    const updated = { ...order, signature_client: dataUrl };
    await base44.entities.SATOrder.update(order.id, { signature_client: dataUrl });
    onUpdate(updated);
  };

  return (
    <div className="space-y-3 mt-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide border-t pt-3">✍️ Firmas de conformidad</p>
      <p className="text-xs text-gray-500">Las firmas se guardan automáticamente y aparecen en el PDF.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <SignatureCanvas
            label="Firma del Técnico"
            value={order.signature_technician}
            onSave={handleSaveTechSignature}
          />
          {techDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {techDatetime}</p>}
        </div>
        <div>
          <SignatureCanvas
            label="Conformidad del Cliente"
            value={order.signature_client}
            onSave={handleSaveClientSignature}
          />
          {clientDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {clientDatetime}</p>}
        </div>
      </div>
    </div>
  );
}