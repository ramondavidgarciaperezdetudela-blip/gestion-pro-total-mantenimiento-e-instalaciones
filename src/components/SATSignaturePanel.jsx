import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import SignatureCanvas from './SignaturePad';

const getNowDatetime = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

export default function SATSignaturePanel({ order, onUpdate, contactEmail = null }) {
  const [techDatetime, setTechDatetime] = useState(order.sign_datetime_technician || null);
  const [clientDatetime, setClientDatetime] = useState(order.sign_datetime_client || null);

  const uploadSignature = async (dataUrl) => {
    // Convertir dataUrl a File y subir
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'firma.jpg', { type: 'image/jpeg' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    return file_url;
  };

  const handleSaveTechSignature = async (dataUrl, signDt) => {
    const dt = signDt || getNowDatetime();
    setTechDatetime(dt);
    const signUrl = await uploadSignature(dataUrl);
    const updateData = { signature_technician: signUrl, sign_datetime_technician: dt };
    await base44.entities.SATOrder.update(order.id, updateData);
    onUpdate({ ...order, ...updateData });
    base44.functions.invoke('enviarCopiaFirmada', {
      contact_email: null,
      contact_name: order.technician || order.contact_name,
      doc_title: `Orden SAT Nº${order.order_number || order.id?.slice(-6)}`,
      doc_type: 'orden_sat',
      sign_datetime: dt,
      signature_url: signUrl,
      signer_role: 'tecnico',
      extra_info: `Cliente: ${order.contact_name} | Tipo: ${order.type || ''}`
    }).catch(() => {});
  };

  const handleSaveClientSignature = async (dataUrl, signDt) => {
    const dt = signDt || getNowDatetime();
    setClientDatetime(dt);
    const signUrl = await uploadSignature(dataUrl);
    const updateData = { signature_client: signUrl, sign_datetime_client: dt };
    await base44.entities.SATOrder.update(order.id, updateData);
    onUpdate({ ...order, ...updateData });
    base44.functions.invoke('enviarCopiaFirmada', {
      contact_email: contactEmail || null,
      contact_name: order.contact_name,
      doc_title: `Orden SAT Nº${order.order_number || order.id?.slice(-6)}`,
      doc_type: 'orden_sat',
      sign_datetime: dt,
      signature_url: signUrl,
      signer_role: 'cliente',
      extra_info: `Tipo servicio: ${order.type || ''} | ${order.description || ''}`
    }).catch(() => {});
  };

  return (
    <div className="space-y-3 mt-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide border-t pt-3">✍️ Firmas de conformidad</p>
      <p className="text-xs text-gray-500">Las firmas se guardan automáticamente. El cliente recibirá una copia por email.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <SignatureCanvas
            label="Firma del Técnico"
            value={order.signature_technician}
            existingDatetime={techDatetime}
            onSave={handleSaveTechSignature}
          />
          {techDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {techDatetime}</p>}
        </div>
        <div>
          <SignatureCanvas
            label="Conformidad del Cliente"
            value={order.signature_client}
            existingDatetime={clientDatetime}
            onSave={handleSaveClientSignature}
          />
          {clientDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {clientDatetime}</p>}
        </div>
      </div>
    </div>
  );
}