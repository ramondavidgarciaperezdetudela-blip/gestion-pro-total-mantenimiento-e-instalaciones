import React from 'react';
import { base44 } from '@/api/base44Client';
import SignatureCanvas from './SignaturePad';

export default function SATSignaturePanel({ order, onUpdate }) {
  const handleSaveTechSignature = async (dataUrl) => {
    const updated = { ...order, signature_technician: dataUrl };
    await base44.entities.SATOrder.update(order.id, { signature_technician: dataUrl });
    onUpdate(updated);
  };

  const handleSaveClientSignature = async (dataUrl) => {
    const updated = { ...order, signature_client: dataUrl };
    await base44.entities.SATOrder.update(order.id, { signature_client: dataUrl });
    onUpdate(updated);
  };

  return (
    <div className="space-y-3 mt-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide border-t pt-3">✍️ Firmas de conformidad</p>
      <p className="text-xs text-gray-500">Las firmas se guardan automáticamente y aparecen en el PDF.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SignatureCanvas
          label="Firma del Técnico"
          value={order.signature_technician}
          onSave={handleSaveTechSignature}
        />
        <SignatureCanvas
          label="Conformidad del Cliente"
          value={order.signature_client}
          onSave={handleSaveClientSignature}
        />
      </div>
    </div>
  );
}