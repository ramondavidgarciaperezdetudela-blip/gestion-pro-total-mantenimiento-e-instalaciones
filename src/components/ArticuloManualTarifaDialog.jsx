import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import CampoPrecio from '@/components/CampoPrecio';
import { construirArticulo, completarPrecios } from '@/lib/tarifaManual';

const CATEGORIAS = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general', 'material', 'mano_obra', 'otro'];
const VACIO = { product_name: '', product_code: '', brand: '', category: 'material', cost_price: '', sale_price: '', margin: '', unit: 'ud', notes: '' };

/**
 * Añadir un artículo a mano a la tarifa que se quiera, sin tocar el resto de la tarifa.
 * `proveedores`: lista de proveedores; `proveedorInicial`: el que sale elegido (opcional).
 * `onCreado(registro)`: devuelve el artículo ya guardado para pintarlo en la lista.
 */
export default function ArticuloManualTarifaDialog({ open, proveedores = [], proveedorInicial, onClose, onCreado }) {
  const [provId, setProvId] = useState('');
  const [f, setF] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProvId(proveedorInicial?.id || '');
    setF(VACIO);
  }, [open, proveedorInicial]);

  const proveedor = proveedores.find((p) => p.id === provId) || (proveedorInicial?.id === provId ? proveedorInicial : null);
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v }));
  const calculo = completarPrecios({ cost: f.cost_price, sale: f.sale_price, margin: f.margin });

  const guardar = async (seguirAnadiendo) => {
    const { registro, error } = construirArticulo(proveedor, f);
    if (error) { toast.error(error); return; }
    setGuardando(true);
    try {
      const creado = await base44.entities.SupplierPrice.create(registro);
      onCreado?.({ ...registro, ...(creado || {}) });
      toast.success(`«${registro.product_name}» añadido a la tarifa de ${registro.supplier_name}`);
      if (seguirAnadiendo) setF({ ...VACIO, category: f.category });
      else onClose?.();
    } catch (e) {
      toast.error('No se pudo guardar el artículo', { description: e?.response?.data?.message || e?.message || 'Inténtalo de nuevo.' });
    } finally { setGuardando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="max-w-lg w-[95vw] max-h-[92vh] overflow-y-auto" data-prueba="dialogo-articulo-manual">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackagePlus className="w-5 h-5 text-green-600" />Añadir artículo a una tarifa</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs text-gray-500 block">Tarifa (proveedor) *
            <select value={provId} onChange={(e) => setProvId(e.target.value)} data-prueba="articulo-tarifa"
              className="h-9 w-full border border-input rounded-md px-2 text-sm text-gray-900 bg-white">
              <option value="">— Elige la tarifa —</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <Input value={f.product_name} onChange={(e) => set('product_name')(e.target.value)} placeholder="Nombre del artículo *" data-prueba="articulo-nombre" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={f.product_code} onChange={(e) => set('product_code')(e.target.value)} placeholder="Código / referencia" />
            <Input value={f.brand} onChange={(e) => set('brand')(e.target.value)} placeholder="Marca" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-gray-500">Coste (€)
              <CampoPrecio value={f.cost_price} onChange={set('cost_price')} data-prueba="articulo-coste" placeholder="0,00" />
            </label>
            <label className="text-xs text-gray-500">Venta (€)
              <CampoPrecio value={f.sale_price} onChange={set('sale_price')} data-prueba="articulo-venta" placeholder="0,00" />
            </label>
            <label className="text-xs text-gray-500">Margen (%)
              <CampoPrecio value={f.margin} onChange={set('margin')} data-prueba="articulo-margen" placeholder="0" />
            </label>
          </div>
          {(calculo.cost !== null || calculo.sale !== null) && (
            <p className="text-[11px] text-gray-500">
              Se guardará con coste {calculo.cost !== null ? calculo.cost.toFixed(2) : '—'} €
              {calculo.sale !== null ? `, venta ${calculo.sale.toFixed(2)} €` : ''}
              {calculo.margin !== null ? `, margen ${calculo.margin}%` : ''}. Lo que dejes en blanco se calcula con lo demás.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input value={f.unit} onChange={(e) => set('unit')(e.target.value)} placeholder="Unidad (ud, m, kg…)" />
            <select value={f.category} onChange={(e) => set('category')(e.target.value)}
              className="h-9 w-full border border-input rounded-md px-2 text-sm text-gray-900 bg-white">
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input value={f.notes} onChange={(e) => set('notes')(e.target.value)} placeholder="Notas (opcional)" />
          <div className="flex flex-wrap gap-2 justify-end pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button variant="outline" disabled={guardando} onClick={() => guardar(true)} data-prueba="articulo-guardar-otro">Guardar y añadir otro</Button>
            <Button disabled={guardando} onClick={() => guardar(false)} className="bg-green-600 hover:bg-green-700 gap-1" data-prueba="articulo-guardar">
              {guardando && <Loader2 className="w-4 h-4 animate-spin" />}Guardar artículo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
