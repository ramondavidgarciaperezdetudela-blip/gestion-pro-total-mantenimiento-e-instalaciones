import React from 'react';
import { Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BarraProgresoTiempo from '@/components/BarraProgresoTiempo';

/** Progreso de «Fotos desde PDF» y, al acabar, resumen con el fichero de las que han fallado. */
export default function ProgresoFotosPdf({ estado, onCancelar, onCerrar, onDescargar }) {
  if (!estado) return null;
  const e = estado; const fin = e.fase === 'terminado';
  return (
    <Dialog open onOpenChange={(o) => { if (!o && fin) onCerrar(); }}>
      <DialogContent data-prueba="dialogo-fotos-pdf" onInteractOutside={(ev) => { if (!fin) ev.preventDefault(); }} onEscapeKeyDown={(ev) => { if (!fin) ev.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{fin ? (e.cancelado ? 'Proceso detenido' : 'Fotos recuperadas del PDF') : 'Recuperando fotos del PDF…'}</DialogTitle>
          <DialogDescription>
            {fin ? 'Esto es lo que ha pasado.' : `Archivo ${e.nArchivo} de ${e.totalArchivos}: ${e.archivo}. Puedes seguir esperando; si el equipo va justo de memoria va página a página.`}
          </DialogDescription>
        </DialogHeader>
        <BarraProgresoTiempo avance={e.avance} inicio={e.inicio} terminado={fin} />
        {!fin && <div className="text-sm text-slate-700" data-prueba="progreso-detalle">Página {e.pagina} de {e.totalPaginas || '…'} · fotos encontradas: <b>{e.encontradas}</b>{e.fallos ? <> · con problemas: <b className="text-red-600">{e.fallos}</b></> : null}</div>}
        {fin && (
          <div className="space-y-2 text-sm" data-prueba="resumen-fotos-pdf">
            <div className="rounded border border-emerald-200 bg-emerald-50 p-2">Recuperadas y guardadas: <b data-prueba="resumen-ok">{e.encontradas}</b></div>
            <div className={`rounded border p-2 ${e.filasInforme.length ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
              No recuperadas: <b data-prueba="resumen-fallos">{e.filasInforme.length}</b>
              {e.filasInforme.length > 0 && (
                <ul className="mt-1 max-h-40 list-disc overflow-auto pl-5 text-xs" data-prueba="lista-fallos">
                  {e.filasInforme.slice(0, 50).map((f, i) => <li key={i}><b>{f.codigo || '(sin referencia)'}</b> — {f.nombre || ''} <span className="text-slate-500">· {f.motivo}</span></li>)}
                  {e.filasInforme.length > 50 && <li>… y {e.filasInforme.length - 50} más en el fichero.</li>}
                </ul>
              )}
            </div>
            {e.filasInforme.length > 0 && <p className="text-xs text-slate-600">Descarga el fichero (se abre con Excel) para ver las referencias y buscar sus fotos; luego puedes añadirlas a mano desde la ficha del artículo.</p>}
          </div>
        )}
        <DialogFooter className="gap-2">
          {!fin && <Button variant="outline" onClick={onCancelar} data-prueba="cancelar-fotos-pdf"><X className="mr-1 h-4 w-4" />Detener</Button>}
          {fin && e.filasInforme.length > 0 && <Button variant="outline" onClick={onDescargar} data-prueba="descargar-informe-fotos"><Download className="mr-1 h-4 w-4" />Descargar fichero de las que faltan</Button>}
          {fin && <Button onClick={onCerrar} data-prueba="cerrar-fotos-pdf">Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
