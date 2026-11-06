import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, Printer, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { hojaMateriales, materialesCSV, MERMA } from '@/lib/planoLista';
import { construirPDF } from './PlanoExporter';
import { nombreArchivo } from '@/lib/planoPaquete';

/** Hoja de materiales del plano: lo que hay que pedir, con sus medidas y distancias. */
export default function DialogoMaterialesPlano({ open, onClose, plan, empresa }) {
  const secciones = useMemo(() => (open ? hojaMateriales({ walls: plan.walls, elements: plan.elements, connections: plan.connections, scale: plan.scale || 50 }) : []), [open, plan.walls, plan.elements, plan.connections, plan.scale]);

  const solo = (extra = {}) => ({ papel: 'a4', secciones: [{ id: 'materiales', incluir: true, orientacion: 'vertical' }], ...extra });
  const pdf = (autoPrint) => {
    try {
      const doc = construirPDF(plan, plan.elements, plan.walls, plan.connections, { autoPrint, empresa, opciones: solo() });
      if (autoPrint) window.open(doc.output('bloburl'), '_blank'); else doc.save(nombreArchivo({ name: `${plan.name || 'plano'}_materiales` }, 'pdf'));
    } catch (e) { toast.error('No se pudo generar la hoja', { description: String(e?.message || e) }); }
  };
  const csv = () => {
    const blob = new Blob([materialesCSV(secciones, `Materiales · ${plan.name || 'plano'}`)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombreArchivo({ name: `${plan.name || 'plano'}_materiales` }, 'csv'); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-prueba="hoja-materiales">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Table2 className="w-4 h-4" /> Materiales para el pedido</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">Medidas y distancias sacadas del plano (dibujado a {plan.scale || 50} px por metro). Si cambias el plano, la hoja se actualiza. El pedido suma un {Math.round(MERMA * 100)} % de recortes en tuberías y cables.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => pdf(false)} className="gap-1"><FileDown className="w-3.5 h-3.5" />PDF</Button>
          <Button size="sm" variant="outline" onClick={() => pdf(true)} className="gap-1"><Printer className="w-3.5 h-3.5" />Imprimir</Button>
          <Button size="sm" variant="outline" onClick={csv} className="gap-1" disabled={!secciones.length}><Table2 className="w-3.5 h-3.5" />Excel (CSV)</Button>
        </div>
        {!secciones.length && <p className="text-sm text-muted-foreground">El plano está vacío: dibuja cámaras, equipos o tuberías para ver los materiales.</p>}
        {secciones.map((s) => (
          <div key={s.id} className="space-y-1" data-prueba={`materiales-${s.id}`}>
            <h3 className="text-sm font-semibold">{s.titulo}</h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50"><tr>{s.columnas.map((c) => <th key={c} className="text-left font-semibold px-2 py-1 whitespace-nowrap">{c}</th>)}</tr></thead>
                <tbody>{s.filas.map((f, i) => <tr key={i} className="border-t border-border">{f.map((v, j) => <td key={j} className="px-2 py-1 whitespace-nowrap">{String(v ?? '')}</td>)}</tr>)}</tbody>
              </table>
            </div>
            {s.nota && <p className="text-[10px] text-muted-foreground">{s.nota}</p>}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}
