import React, { useState } from 'react';
import { PenLine } from 'lucide-react';
import FirmaPantallaCompleta from '@/components/FirmaPantallaCompleta';

/**
 * Firma del cliente en las páginas públicas (SAT y presupuesto): un botón grande
 * que abre el panel de firma a pantalla completa. `onSave(dataUrl)` recibe la imagen.
 */
export default function FirmaClienteBoton({ onSave, abrirAlEntrar = false, titulo = 'Firma del cliente', texto = 'Toque aquí para firmar' }) {
  const [abierto, setAbierto] = useState(!!abrirAlEntrar);
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setAbierto(true)} data-testid="abrir-firma"
        className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-blue-300 bg-white py-8 text-blue-700 active:bg-blue-50">
        <PenLine className="h-8 w-8" />
        <span className="text-base font-semibold">{texto}</span>
        <span className="text-xs text-gray-500">Se abrirá a pantalla completa</span>
      </button>
      <FirmaPantallaCompleta
        abierto={abierto}
        titulo={titulo}
        color="#1e3a5f"
        onCancelar={() => setAbierto(false)}
        onConfirmar={async (dataUrl) => { setAbierto(false); await onSave(dataUrl); }}
      />
    </div>
  );
}
