import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { cargarPropios, cargarProveedores, guardarArticulo, listaDeApartados, APARTADOS_BASE, DESTINO_MIO } from '@/lib/miBaseDatos';

/**
 * Guardar un artículo que no estaba en ninguna base de datos en «Mi base de datos»:
 * pregunta el apartado (Cámaras KIDE, TAVER, Equipos frigoríficos…) y de qué proveedor es el precio.
 */
export default function ArticuloNuevoDialog({ open, inicial, onClose, onSaved }) {
  const [f, setF] = useState({ description: '', reference: '', unit_price: '', unit: 'ud', apartado: APARTADOS_BASE[0], proveedor: '', delivery_days: '', destino: DESTINO_MIO, tambienMia: false });
  const [apartados, setApartados] = useState(APARTADOS_BASE);
  const [proveedores, setProveedores] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF((p) => ({ ...p, description: inicial?.description || '', reference: inicial?.reference || '', unit_price: inicial?.unit_price ?? '', delivery_days: inicial?.delivery_days ?? '' }));
    cargarPropios().then((l) => setApartados(listaDeApartados(l))).catch(() => {});
    cargarProveedores().then(setProveedores);
  }, [open, inicial]);

  const guardar = async () => {
    if (!f.description.trim()) { toast.error('Pon la descripción'); return; }
    setGuardando(true);
    try {
      const datos = { ...f, unit_price: parseFloat(String(f.unit_price).replace(',', '.')) || 0, delivery_days: f.delivery_days === '' ? null : Number(f.delivery_days) };
      const hechos = await guardarArticulo(datos);
      toast.success(`Guardado en ${hechos.join(' y en ')}`);
      onSaved?.({ description: datos.description, reference: datos.reference, unit_price: datos.unit_price, delivery_days: datos.delivery_days, supplier_name: f.destino !== DESTINO_MIO ? f.destino : f.proveedor });
      onClose();
    } catch (e) {
      toast.error('No se pudo guardar', { description: e?.message || '' });
    } finally { setGuardando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg w-[95vw]">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><PackagePlus className="w-5 h-5 text-green-600" />Guardar artículo nuevo</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Descripción *" />
          <div className="grid grid-cols-3 gap-2">
            <Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="Referencia" />
            <Input value={f.unit_price} onChange={(e) => setF({ ...f, unit_price: e.target.value })} placeholder="Precio €" inputMode="decimal" />
            <Input value={f.delivery_days} onChange={(e) => setF({ ...f, delivery_days: e.target.value })} placeholder="Plazo (días)" inputMode="numeric" />
          </div>
          <label className="text-xs text-gray-500 block">¿Dónde lo guardo?
            <select value={f.destino} onChange={(e) => setF({ ...f, destino: e.target.value })} className="h-9 w-full border border-input rounded-md px-2 text-sm text-gray-900">
              <option value={DESTINO_MIO}>Mi base de datos</option>
              {proveedores.map((p) => <option key={p} value={p}>Tarifa de {p}</option>)}
            </select>
          </label>
          {f.destino !== DESTINO_MIO && (
            <label className="text-xs text-gray-700 flex items-center gap-1.5"><input type="checkbox" checked={f.tambienMia} onChange={(e) => setF({ ...f, tambienMia: e.target.checked })} />Guardarlo también en Mi base de datos</label>
          )}
          {(f.destino === DESTINO_MIO || f.tambienMia) && (<>
            <label className="text-xs text-gray-500 block">Apartado de Mi base de datos
              <Input list="apartados-nuevo" value={f.apartado} onChange={(e) => setF({ ...f, apartado: e.target.value })} />
              <datalist id="apartados-nuevo">{apartados.map((a) => <option key={a} value={a} />)}</datalist>
            </label>
            {f.destino === DESTINO_MIO && (
              <label className="text-xs text-gray-500 block">¿De qué proveedor es este precio?
                <Input list="proveedores-nuevo" value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} placeholder="KIDE, TAVER, otro…" />
                <datalist id="proveedores-nuevo">{proveedores.map((p) => <option key={p} value={p} />)}</datalist>
              </label>
            )}
          </>)}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Ahora no</Button>
            <Button onClick={guardar} disabled={guardando} className="bg-green-600 hover:bg-green-700 gap-1">
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
