import React from 'react';
import { Printer } from 'lucide-react';
import { printDocument, hasNativePrint } from '@/lib/printHelper';

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
/**
 * Dentro del programa instalado (escritorio o Android) window.print() no
 * siempre abre nada, y era lo que hacía que "Imprimir" no respondiera en la
 * vista previa del cliente. Ahí se manda la página al sistema de impresión
 * propio, sin los botones. En un navegador normal se usa window.print().
 */
async function imprimirPagina() {
  const dentroDelPrograma = hasNativePrint()
    || (typeof window !== 'undefined' && window.gptImpresion?.disponible === true);
  if (dentroDelPrograma) {
    try {
      const copia = document.documentElement.cloneNode(true);
      copia.querySelectorAll('.no-imprimir, script').forEach((n) => n.remove());
      const base = `<base href="${document.baseURI}">`;
      const html = '<!doctype html>' + copia.outerHTML.replace(/<head([^>]*)>/i, `<head$1>${base}`);
      await printDocument(html, document.title || 'Documento');
      return;
    } catch (e) {
      console.error('[BotonImprimirCliente] impresión del programa:', e);
    }
  }
  try { window.print(); } catch (e) { console.error('[BotonImprimirCliente] window.print:', e); }
}

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
          onClick={imprimirPagina}
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
