import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import CentroTareasAvisos from './CentroTareasAvisos';
import { EVENTO_ABRIR_AVISOS } from '@/lib/tareasAvisosDatos';

/**
 * Ventana de «Tareas y avisos» por ENCIMA de cualquier pantalla (se dibuja en el <body>, fuera de las barras y
 * pestañas del programa, y por eso nunca queda escondida detrás). Se abre desde la campana, desde el menú
 * «Tareas y avisos» o desde cualquier botón que llame a abrirAvisos().
 */
export default function VentanaTareasAvisos() {
  const [abierta, setAbierta] = useState(false);
  const [tipo, setTipo] = useState('');

  useEffect(() => {
    const abrir = (e) => { setTipo(e?.detail?.tipo || ''); setAbierta(true); };
    window.addEventListener(EVENTO_ABRIR_AVISOS, abrir);
    // El apartado «Tareas y avisos» del menú también la abre encima de lo que estés haciendo.
    const alPulsar = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const a = e.target?.closest?.('a[href*="panel=tareas"]');
      if (!a) return;
      e.preventDefault();
      abrir();
    };
    document.addEventListener('click', alPulsar, true);
    return () => { window.removeEventListener(EVENTO_ABRIR_AVISOS, abrir); document.removeEventListener('click', alPulsar, true); };
  }, []);

  useEffect(() => {
    if (!abierta) return undefined;
    const alTeclear = (e) => { if (e.key === 'Escape') setAbierta(false); };
    window.addEventListener('keydown', alTeclear);
    const antes = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', alTeclear); document.body.style.overflow = antes; };
  }, [abierta]);

  if (!abierta || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 flex items-stretch sm:items-center justify-center sm:p-4 print:hidden" style={{ zIndex: 100000 }} role="dialog" aria-modal="true" aria-label="Tareas y avisos" data-prueba="ventana-avisos">
      <div className="absolute inset-0 bg-black/55" onClick={() => setAbierta(false)} />
      <div className="relative w-full sm:max-w-3xl h-full sm:h-[90vh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden bg-white">
        <CentroTareasAvisos enVentana tipoInicial={tipo} onCerrar={() => setAbierta(false)} />
      </div>
    </div>,
    document.body
  );
}
