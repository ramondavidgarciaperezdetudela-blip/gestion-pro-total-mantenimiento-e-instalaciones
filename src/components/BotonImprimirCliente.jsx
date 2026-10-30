import React from 'react';
import { Printer } from 'lucide-react';

/**
 * El botón de imprimir de las páginas que ve el CLIENTE.
 *
 * Cuando se le manda un presupuesto o un parte por WhatsApp, el cliente abre
 * el enlace y hasta ahora solo podía MIRARLO en la pantalla del móvil: ni
 * imprimirlo ni guardárselo. Para un presupuesto que hay que enseñar en casa,
 * o un parte que hay que archivar, eso no sirve.
 *
 * El enlace se abre en el navegador del cliente (Chrome, Safari…), no dentro
 * de nuestra app, así que aquí window.print() SÍ funciona: sale el diálogo de
 * impresión del móvil, con sus impresoras y con "Guardar como PDF".
 *
 * Se acompaña de las reglas de impresión (ver estilos abajo) para que en el
 * papel salga el documento y no los botones.
 */
export default function BotonImprimirCliente({ etiqueta = 'Imprimir o guardar en PDF' }) {
  return (
    <>
      <style>{`
        @media print {
          .no-imprimir { display: none !important; }
          body { background: #fff !important; }
          .sombra-al-imprimir { box-shadow: none !important; border: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>
      <div className="no-imprimir flex justify-center py-3">
        <button
          type="button"
          onClick={() => window.print()}
          data-prueba="imprimir-cliente"
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-slate-700"
        >
          <Printer className="h-4 w-4" />
          {etiqueta}
        </button>
      </div>
    </>
  );
}
