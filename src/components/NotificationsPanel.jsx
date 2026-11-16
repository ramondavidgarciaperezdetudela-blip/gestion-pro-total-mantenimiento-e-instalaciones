import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { leerAnulados } from '@/lib/tareasAvisos';
import { cargarAvisos, abrirAvisos, EVENTO_AVISOS } from '@/lib/tareasAvisosDatos';

export default function NotificationsPanel() {
  const [cuantos, setCuantos] = useState(0);

  // El número de la campana sale de la misma lista que la ventana, así siempre coinciden.
  useEffect(() => {
    let vivo = true;
    const contar = () => cargarAvisos().then((av) => { if (vivo) setCuantos(av.filter((a) => !leerAnulados().includes(a.id)).length); }).catch(() => {});
    const t = setTimeout(contar, 1500); // sin competir con la carga inicial de la pantalla
    window.addEventListener(EVENTO_AVISOS, contar);
    return () => { vivo = false; clearTimeout(t); window.removeEventListener(EVENTO_AVISOS, contar); };
  }, []);

  return (
    <button type="button" onClick={() => abrirAvisos()} data-prueba="campana-avisos" aria-label="Tareas y avisos"
      className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
      <Bell className="w-5 h-5" />
      {cuantos > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {cuantos > 9 ? '9+' : cuantos}
        </span>
      )}
    </button>
  );
}
