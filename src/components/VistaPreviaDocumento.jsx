import React, { useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Printer, Download, Pencil } from 'lucide-react';
import { printDocument } from '@/lib/printHelper';

/**
 * Ver un documento ANTES de imprimirlo o de mandárselo al cliente.
 *
 * Hasta ahora, al pedir un documento se abría una ventana nueva y se lanzaba
 * el diálogo de imprimir a los 600 ms. Eso tiene dos problemas: no da tiempo a
 * mirar cómo ha quedado —que es justo lo que hace falta antes de entregarle
 * un papel a un cliente o a un inspector— y en el móvil y en el programa
 * instalado la ventana nueva muchas veces ni se abre, así que no pasaba nada
 * de nada y parecía que el botón estaba roto.
 *
 * Aquí el documento se pinta DENTRO del programa, en un marco aislado, con la
 * barra de siempre: volver, imprimir y guardar. Funciona igual en el
 * ordenador, en el móvil y en el navegador, sin depender de ventanas nuevas.
 *
 * Lleva `pointer-events-auto` a propósito: cuando hay una ventana modal
 * abierta, Radix apaga los clics de TODO lo que está fuera de ella. Al abrir
 * esta vista desde dentro de una ventana —que es lo normal: se mira el
 * documento desde su ficha— se veía bien pero no respondía a nada.
 *
 * Va colgado directamente del <body> (un "portal") y no donde se escribe en el
 * código. Si se dejara dentro de la pantalla, bastaría con que cualquier caja
 * de alrededor tuviera una transformación —una animación, un desplazamiento—
 * para que "pegado a la pantalla" pasara a significar "pegado a esa caja": el
 * documento salía recortado, con la cabecera y la barra de abajo del programa
 * asomando por encima.
 */
export default function VistaPreviaDocumento({ titulo, html, nombreFichero, onVolver, onEditar }) {
  const marco = useRef(null);

  /**
   * Encajar el folio en la pantalla del móvil.
   *
   * El documento está maquetado en A4 —unos 840 px de ancho— y un teléfono
   * tiene 400. Sin ajustar nada, la mitad derecha de las tablas se queda fuera
   * y no hay forma de leerla. Aquí se reduce lo justo para que quepa entero,
   * como hace el navegador con una página de ordenador.
   */
  const encajar = useCallback(() => {
    const v = marco.current?.contentWindow;
    const cuerpo = v?.document?.body;
    if (!cuerpo) return;
    const disponible = marco.current.clientWidth;
    const folio = Math.max(cuerpo.scrollWidth, 880);
    cuerpo.style.zoom = disponible < folio ? String((disponible / folio).toFixed(3)) : '';
  }, []);

  /**
   * Imprimir de verdad, también en el móvil.
   *
   * Aquí estaba el fallo de "le doy a imprimir y no me sale la impresora": se
   * llamaba a print() del marco, y el WebView de Android NO IMPLEMENTA
   * window.print(). No pasaba nada y sin ningún aviso. El programa ya tenía
   * resuelto esto en printHelper.js —usa el sistema de impresión nativo de
   * Android, que enseña las impresoras del móvil y el "Guardar como PDF"—, así
   * que se usa eso, que además vale igual en el ordenador y en el navegador.
   *
   * Y se manda el HTML original, no lo que se ve: lo que se ve está encogido
   * para que quepa en la pantalla del móvil, y saldría impreso con letra de
   * hormiga.
   */
  const imprimir = async () => {
    try {
      await printDocument(html, titulo);
    } catch (e) {
      console.error('[VistaPrevia] No se pudo imprimir:', e);
      const v = marco.current?.contentWindow;
      if (v) { v.focus(); v.print(); }
    }
  };

  // Guardar una copia del documento tal cual, por si hay que adjuntarlo a un
  // correo o guardarlo en una carpeta.
  const guardar = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreFichero || 'documento.html';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  return createPortal((
    <div
      className="pointer-events-auto fixed inset-0 z-[120] flex flex-col bg-slate-800/95"
      data-prueba="vista-previa"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900 px-2 py-2 print:hidden">
        <button
          type="button"
          onClick={onVolver}
          data-prueba="vista-previa-volver"
          className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        {onEditar && (
          <button
            type="button"
            onClick={onEditar}
            data-prueba="vista-previa-editar"
            className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            <Pencil className="h-4 w-4" /> Editar
          </button>
        )}
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">{titulo}</p>
        <button
          type="button"
          onClick={guardar}
          data-prueba="vista-previa-guardar"
          className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
        >
          <Download className="h-4 w-4" /> Guardar
        </button>
        <button
          type="button"
          onClick={imprimir}
          data-prueba="vista-previa-imprimir"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
      </div>
      <iframe
        ref={marco}
        title={titulo}
        srcDoc={html}
        className="min-h-0 flex-1 w-full bg-white"
        data-prueba="vista-previa-marco"
        onLoad={encajar}
      />
    </div>
  ), document.body);
}
