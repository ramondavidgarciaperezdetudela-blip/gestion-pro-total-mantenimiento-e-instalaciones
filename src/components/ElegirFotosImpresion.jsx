import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';

export const CLAVE_FOTOS_DOC = 'gpt_fotos_doc';
export const modoFotosGuardado = () => { try { const m = localStorage.getItem(CLAVE_FOTOS_DOC); return ['todas', 'ninguna', 'elegidas'].includes(m) ? m : 'ninguna'; } catch { return 'ninguna'; } };
const guardarModo = (m) => { try { localStorage.setItem(CLAVE_FOTOS_DOC, m); } catch { /* sin sitio: solo vale esta vez */ } };

/** Qué líneas llevan foto al imprimir, según el modo. */
export function lineasConFoto(modo, fotos, elegidas) {
  if (modo === 'todas') return new Set(fotos.keys());
  if (modo === 'elegidas') return new Set([...elegidas].filter((i) => fotos.has(i)));
  return new Set();
}

/**
 * Pregunta si el documento sale con fotos de los artículos: todas, ninguna o solo las que elijas.
 *   fotos: Map línea → foto     items: líneas del documento
 */
export default function ElegirFotosImpresion({ abierto, items = [], fotos = new Map(), onConfirmar, onCancelar }) {
  const [modo, setModo] = useState(modoFotosGuardado());
  const [elegidas, setElegidas] = useState(new Set());
  useEffect(() => { if (abierto) { setModo(modoFotosGuardado()); setElegidas(new Set(fotos.keys())); } }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
  const alternar = (i) => setElegidas((p) => { const n = new Set(p); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  const opcion = (id, texto) => (
    <label key={id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${modo === id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <input type="radio" name="fotos-doc" checked={modo === id} onChange={() => setModo(id)} data-prueba={`fotos-${id}`} />{texto}
    </label>
  );
  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) onCancelar?.(); }}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ImageIcon className="w-4 h-4" />¿Con fotos de los artículos?</DialogTitle></DialogHeader>
        <p className="text-xs text-gray-500">{fotos.size} de las {items.length} líneas tienen foto en la tarifa o en tu base de datos.</p>
        <div className="space-y-1.5">
          {opcion('ninguna', 'Sin fotos')}
          {opcion('todas', `Con todas las fotos (${fotos.size})`)}
          {opcion('elegidas', 'Solo las que yo elija')}
        </div>
        {modo === 'elegidas' && (
          <div className="max-h-60 overflow-y-auto space-y-1 border rounded-lg p-1.5" data-prueba="lista-fotos">
            {[...fotos].map(([i, url]) => (
              <label key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={elegidas.has(i)} onChange={() => alternar(i)} />
                <img src={url} alt="" className="w-10 h-10 object-contain border rounded bg-white" />
                <span className="text-xs text-gray-700 truncate">{items[i]?.description || '(sin descripción)'}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button data-prueba="fotos-continuar" onClick={() => { guardarModo(modo); onConfirmar?.(lineasConFoto(modo, fotos, elegidas)); }}>Continuar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
