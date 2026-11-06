import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { actualizarArticulos } from '@/lib/miBaseDatos';

const mostrar = (c, v) => (c.campo === 'unit_price' ? `${Number(v ?? 0).toFixed(2)} €` : v === null || v === undefined || v === '' ? '—' : String(v));

/** Pregunta si se actualizan en Mi base de datos los artículos cuya referencia ya existía y que se han modificado. */
export default function ActualizarBaseDialog({ diferencias, onClose, onDone }) {
  const [marcados, setMarcados] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const m = {};
    (diferencias || []).forEach((d) => d.cambios.forEach((c) => { m[`${d.articulo.id}|${c.campo}`] = true; }));
    setMarcados(m);
  }, [diferencias]);

  const aplicar = async () => {
    setGuardando(true);
    try {
      const elegidos = diferencias
        .map((d) => ({ articulo: d.articulo, cambios: d.cambios.filter((c) => marcados[`${d.articulo.id}|${c.campo}`]) }))
        .filter((e) => e.cambios.length);
      const hechos = await actualizarArticulos(elegidos);
      toast.success(hechos.length ? `Mi base de datos actualizada (${hechos.length} artículo${hechos.length === 1 ? '' : 's'})` : 'No se ha cambiado nada');
      onDone?.(hechos); onClose();
    } catch (e) {
      toast.error('No se pudo actualizar: ' + (e?.message || 'error'));
    }
    setGuardando(false);
  };

  return (
    <Dialog open={!!diferencias?.length} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-prueba="actualizar-base">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /> ¿Actualizar Mi base de datos?</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600">Has modificado artículos que ya estaban en tu base de datos. Marca lo que quieres que se actualice allí también.</p>
        <div className="space-y-3">
          {(diferencias || []).map((d) => (
            <div key={d.articulo.id} className="border rounded-lg p-2 text-sm">
              <div className="font-semibold">{d.referencia} <span className="font-normal text-slate-500">· {d.articulo.section || 'Mi base de datos'}</span></div>
              {d.cambios.map((c) => (
                <label key={c.campo} className="flex items-start gap-2 mt-1 cursor-pointer">
                  <input type="checkbox" className="mt-1" checked={!!marcados[`${d.articulo.id}|${c.campo}`]}
                    onChange={(e) => setMarcados((m) => ({ ...m, [`${d.articulo.id}|${c.campo}`]: e.target.checked }))} />
                  <span><b>{c.etiqueta}:</b> <span className="line-through text-slate-400">{mostrar(c, c.antes)}</span> → <span className="text-emerald-700 font-medium">{mostrar(c, c.ahora)}</span></span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={guardando}>No actualizar</Button>
          <Button onClick={aplicar} disabled={guardando}>{guardando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Actualizar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
