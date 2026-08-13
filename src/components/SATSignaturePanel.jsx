import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import SignatureCanvas from './SignaturePad';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, UserCheck } from 'lucide-react';
import { uploadFile } from '@/lib/uploadImage';
import { toast } from 'sonner';

const getNowDatetime = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

export default function SATSignaturePanel({ order, onUpdate, contactEmail = null }) {
  const [techDatetime, setTechDatetime] = useState(order.sign_datetime_technician || null);
  const [clientDatetime, setClientDatetime] = useState(order.sign_datetime_client || null);
  const [saving, setSaving] = useState(false);
  // Modo: 'both' = firman los dos ahora | 'defer' = solo técnico, cliente después
  const [mode, setMode] = useState(
    order.signature_technician ? 'signed' : null
  );

  const uploadSignature = async (dataUrl) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'firma.jpg', { type: 'image/jpeg' });
    return uploadFile(file);
  };

  const handleSaveTechSignature = async (dataUrl, signDt) => {
    setSaving(true);
    try {
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
    } catch (err) {
      toast.error(err.message || 'Error al guardar la firma');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClientSignature = async (dataUrl, signDt) => {
    setSaving(true);
    try {
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
    } catch (err) {
      toast.error(err.message || 'Error al guardar la firma');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const techSigned = !!(order.signature_technician || techDatetime);
  const clientSigned = !!(order.signature_client || clientDatetime);

  return (
    <div className="space-y-3 mt-2">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide border-t pt-3">✍️ Firmas de conformidad</p>

      {/* PASO 1: Elegir modo si todavía no hay firma del técnico */}
      {!techSigned && mode === null && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-blue-800 text-center">¿Cómo deseas gestionar las firmas?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-1 border-blue-300 hover:bg-blue-100 text-blue-800"
              onClick={() => setMode('both')}
            >
              <UserCheck className="w-5 h-5" />
              <span className="text-xs font-semibold">Firmar ahora los dos</span>
              <span className="text-[10px] text-blue-600 font-normal">Técnico + cliente en este momento</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-1 border-amber-300 hover:bg-amber-50 text-amber-800"
              onClick={() => setMode('defer')}
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs font-semibold">Guardar para firmar después</span>
              <span className="text-[10px] text-amber-600 font-normal">Solo técnico ahora, cliente más tarde</span>
            </Button>
          </div>
        </div>
      )}

      {/* PASO 2a: Modo "ambos" — técnico primero, luego cliente */}
      {mode === 'both' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Primero firma el técnico y después el cliente.</p>
          <div>
            <SignatureCanvas
              label="Firma del Técnico"
              value={order.signature_technician}
              existingDatetime={techDatetime}
              onSave={handleSaveTechSignature}
            />
            {techDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {techDatetime}</p>}
          </div>
          {techSigned && (
            <div>
              <SignatureCanvas
                label="Conformidad del Cliente"
                value={order.signature_client}
                existingDatetime={clientDatetime}
                onSave={handleSaveClientSignature}
              />
              {clientDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {clientDatetime}</p>}
            </div>
          )}
        </div>
      )}

      {/* PASO 2b: Modo "diferido" — solo técnico */}
      {mode === 'defer' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 font-medium">📋 Modo diferido — El cliente firmará más tarde</p>
            <p className="text-xs text-amber-600 mt-0.5">Firma ahora como técnico. La firma del cliente quedará pendiente.</p>
          </div>
          <div>
            <SignatureCanvas
              label="Firma del Técnico"
              value={order.signature_technician}
              existingDatetime={techDatetime}
              onSave={handleSaveTechSignature}
            />
            {techDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {techDatetime}</p>}
          </div>
          {techSigned && (
            <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-3 text-center space-y-1">
              <Clock className="w-5 h-5 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500 font-medium">Firma del cliente pendiente</p>
              <p className="text-[10px] text-gray-400">El cliente podrá firmar cuando esté presente</p>
              <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => setMode('client_now')}>
                Firmar cliente ahora
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modo especial: técnico ya firmó en diferido, ahora viene el cliente */}
      {mode === 'client_now' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs font-medium">Técnico ya firmó el {techDatetime}</p>
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
      )}

      {/* Estado: ya firmados previamente (orden ya tenía firmas al abrir) */}
      {mode === 'signed' && (
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
            {order.signature_client ? (
              <>
                <SignatureCanvas
                  label="Conformidad del Cliente"
                  value={order.signature_client}
                  existingDatetime={clientDatetime}
                  onSave={handleSaveClientSignature}
                />
                {clientDatetime && <p className="text-[10px] text-gray-400 font-mono text-center mt-1">🕐 Firmado: {clientDatetime}</p>}
              </>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-xl p-3 text-center space-y-2">
                <Clock className="w-5 h-5 text-gray-400 mx-auto" />
                <p className="text-xs text-gray-500">Firma del cliente pendiente</p>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setMode('client_now')}>
                  Firmar cliente ahora
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}