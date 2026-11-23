import React, { useEffect, useState, useCallback } from 'react';
import { FileDown, Printer } from 'lucide-react';
import { imprimirPantalla, pantallaAPdf } from '@/lib/printHelper';

/**
 * Botones «PDF» e «Imprimir» para cualquier pantalla de documentos.
 * Cogen lo que se ve en la página (sin menús ni botones) y lo guardan como PDF o lo imprimen.
 * También recogen Ctrl+P para que salga siempre la misma impresión limpia.
 */
const PAGINAS_SIN_BOTONES = new Set(['Home', 'CADCraft', 'Login', 'License', 'Licencia']);

export default function BotonesImprimirPantalla({ nodoRef, titulo, pagina, enLinea = false, enBarra = false, sinTeclado = false }) {
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState('');

  const hacer = useCallback(async (tipo) => {
    const nodo = nodoRef?.current;
    if (!nodo || ocupado) return;
    setOcupado(true);
    setAviso('');
    try {
      const opciones = { titulo: titulo || 'Gestión Pro Total' };
      if (tipo === 'pdf') {
        const r = await pantallaAPdf(nodo, opciones);
        if (r?.ok && r.ruta) setAviso(`PDF guardado en ${r.ruta}`);
        else if (r?.error) setAviso(`No se pudo guardar el PDF: ${r.error}`);
      } else {
        await imprimirPantalla(nodo, opciones);
      }
    } catch (e) {
      setAviso(`No se pudo completar: ${e?.message || e}`);
    } finally {
      setOcupado(false);
      setTimeout(() => setAviso(''), 6000);
    }
  }, [nodoRef, titulo, ocupado]);

  useEffect(() => {
    if (sinTeclado) return undefined;
    const alTeclear = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        hacer('imprimir');
      }
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [hacer, sinTeclado]);

  if (PAGINAS_SIN_BOTONES.has(pagina) && !enLinea) return null;

  // En la barra superior de la aplicación: junto a Buscar, con el mismo aspecto que los demás botones de la barra.
  if (enBarra) {
    return (
      <span data-no-imprimir className="inline-flex items-center gap-1.5 print:hidden" data-prueba="barra-pdf-imprimir">
        {aviso && <span className="hidden md:inline max-w-[11rem] truncate text-[11px] opacity-80" title={aviso}>{aviso}</span>}
        <button type="button" className="gpt-boton gpt-boton--oscuro" style={{ minHeight: 40 }} disabled={ocupado} onClick={() => hacer('pdf')} title="Guardar esta pantalla como PDF" aria-label="Guardar esta pantalla como PDF" data-prueba="barra-pdf">
          <FileDown className="w-4 h-4" /><span className="hidden xl:inline">PDF</span>
        </button>
        <button type="button" className="gpt-boton gpt-boton--oscuro" style={{ minHeight: 40 }} disabled={ocupado} onClick={() => hacer('imprimir')} title="Imprimir esta pantalla (Ctrl+P)" aria-label="Imprimir esta pantalla" data-prueba="barra-imprimir">
          <Printer className="w-4 h-4" /><span className="hidden xl:inline">Imprimir</span>
        </button>
      </span>
    );
  }

  // En línea: los dos botones van dentro de la barra de título de la pantalla (no flotan sobre la lista).
  if (enLinea) {
    const chico = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60';
    return (
      <span data-no-imprimir className="inline-flex items-center gap-1.5 print:hidden">
        {aviso && <span className="max-w-[10rem] truncate text-[11px] text-slate-500" title={aviso}>{aviso}</span>}
        <button type="button" className={chico} disabled={ocupado} onClick={() => hacer('pdf')} title="Guardar como PDF" data-prueba="avisos-pdf"><FileDown className="h-4 w-4" /><span className="hidden sm:inline">PDF</span></button>
        <button type="button" className={chico} disabled={ocupado} onClick={() => hacer('imprimir')} title="Imprimir" data-prueba="avisos-imprimir"><Printer className="h-4 w-4" /><span className="hidden sm:inline">Imprimir</span></button>
      </span>
    );
  }
  const estilo = 'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60';
  return (
    <div data-no-imprimir className="fixed bottom-24 right-3 lg:bottom-5 lg:right-5 z-30 flex flex-col items-end gap-1 print:hidden">
      {aviso && <div className="max-w-xs rounded-md bg-slate-800 px-3 py-1.5 text-xs text-white shadow">{aviso}</div>}
      <div className="flex gap-1.5">
        <button type="button" className={estilo} disabled={ocupado} onClick={() => hacer('pdf')} title="Guardar esta pantalla como PDF">
          <FileDown className="h-4 w-4" /> PDF
        </button>
        <button type="button" className={estilo} disabled={ocupado} onClick={() => hacer('imprimir')} title="Imprimir esta pantalla (Ctrl+P)">
          <Printer className="h-4 w-4" /> Imprimir
        </button>
      </div>
    </div>
  );
}
