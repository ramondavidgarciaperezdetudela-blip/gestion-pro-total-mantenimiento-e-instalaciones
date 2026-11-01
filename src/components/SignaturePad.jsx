import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PenLine } from 'lucide-react';
import FirmaPantallaCompleta from '@/components/FirmaPantallaCompleta';

/**
 * SignatureCanvas — firma digital táctil/ratón.
 * El panel de firma se abre SIEMPRE a pantalla completa, fijo y sin que se
 * mueva la página (ver FirmaPantallaCompleta). Aquí solo se gestiona si está
 * abierto y la vista de la firma ya guardada.
 */
export default function SignatureCanvas({
  label, value, onSave, onCancel, existingDatetime = null,
  abrirAlEntrar = false,
}) {
  // No se abre solo salvo que la página lo pida: antes se abría por su cuenta y
  // tapaba la pantalla con un lienzo en blanco al guardar un documento.
  const [showCanvas, setShowCanvas] = useState(abrirAlEntrar && !value);
  const [signDatetime, setSignDatetime] = useState(existingDatetime);

  const panel = (
    <FirmaPantallaCompleta
      abierto={showCanvas}
      titulo={label || 'Firma'}
      onCancelar={() => { setShowCanvas(false); onCancel?.(); }}
      onConfirmar={async (dataUrl, dt) => {
        // Se espera a que la firma se guarde de verdad antes de cerrar.
        await onSave(dataUrl, dt);
        setSignDatetime(dt);
        setShowCanvas(false);
      }}
    />
  );

  // Vista de firma ya guardada
  if (!showCanvas && value) {
    return (
      <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
        {panel}
        {label && <p className="text-xs font-semibold text-gray-700">{label}</p>}
        <img src={value} alt="Firma" className="w-full max-h-24 object-contain border rounded bg-white" />
        <div className="text-center">
          <p className="text-[10px] text-green-600">✓ Firmado correctamente</p>
          {signDatetime && (
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">🕐 {signDatetime}</p>
          )}
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { setShowCanvas(true); setSignDatetime(null); }}>
          <PenLine className="w-3 h-3 mr-1" />Volver a firmar
        </Button>
      </div>
    );
  }

  // Si el cuadro de firma se cerró sin firmar (p.ej. Cancelar), mostramos un
  // botón para volver a abrirlo. Los datos del documento no se tocan.
  if (!showCanvas && !value) {
    return (
      <div className="border rounded-xl p-3 bg-gray-50 space-y-2 text-center">
        {panel}
        {label && <p className="text-xs font-semibold text-gray-700">{label}</p>}
        <p className="text-[10px] text-gray-400">Aún sin firmar</p>
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowCanvas(true)}>
          <PenLine className="w-3 h-3 mr-1" />Firmar
        </Button>
      </div>
    );
  }

  return panel;
}
