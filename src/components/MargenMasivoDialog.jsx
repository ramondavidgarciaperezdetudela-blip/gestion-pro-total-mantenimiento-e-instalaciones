import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Percent } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import CampoPrecio from '@/components/CampoPrecio';
import BarraProgresoTiempo from '@/components/BarraProgresoTiempo';
import { base44 } from '@/api/base44Client';
import { leerMargen, margenMasComun, planificar, articulosDelAmbito, aplicarEnLotes } from '@/lib/margenMasivo';

/**
 * Cambia el margen de ganancia de los artículos: de todas las tarifas, de unas seleccionadas o de una sola.
 * Venta = coste × (1 + margen/100). Los artículos sin coste no se tocan.
 */
export default function MargenMasivoDialog({ abierto, onCerrar, suppliers, prices, onAplicado }) {
  const [margen, setMargen] = useState('');
  const [ambito, setAmbito] = useState('todas');
  const [elegidas, setElegidas] = useState([]);
  const [una, setUna] = useState('');
  const [soloSinVenta, setSoloSinVenta] = useState(false);
  const [trabajo, setTrabajo] = useState(null); // { hechos, total, inicio }
  const control = useRef(null);
  // Cada vez que se abre empieza limpio.
  useEffect(() => { if (abierto) { setMargen(''); setAmbito('todas'); setElegidas([]); setUna(''); setSoloSinVenta(false); } }, [abierto]);

  const conArticulos = useMemo(() => {
    const n = {}; for (const p of prices) n[p.supplier_id] = (n[p.supplier_id] || 0) + 1;
    return suppliers.filter((s) => n[s.id]).map((s) => ({ ...s, n: n[s.id] }));
  }, [suppliers, prices]);

  const ids = ambito === 'seleccion' ? elegidas : ambito === 'una' ? (una ? [una] : []) : [];
  const articulos = useMemo(() => articulosDelAmbito(prices, ambito, ids), [prices, ambito, elegidas, una]); // eslint-disable-line react-hooks/exhaustive-deps
  const m = leerMargen(margen);
  const comun = useMemo(() => margenMasComun(articulos), [articulos]);
  const plan = useMemo(() => (m === null ? null : planificar(articulos, m, { soloSinVenta })), [articulos, m, soloSinVenta]);
  const alternar = (id) => setElegidas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const aplicar = async () => {
    if (!plan?.cambios.length) return;
    const aviso = `Se cambiará el margen a ${m} % en ${plan.cambios.length} artículos (${ambito === 'todas' ? 'todas las tarifas' : ambito === 'una' ? 'una tarifa' : `${elegidas.length} tarifas`}) y se recalculará su precio de venta. ¿Continuar?`;
    if (!window.confirm(aviso)) return;
    control.current = new AbortController();
    const inicio = Date.now();
    setTrabajo({ hechos: 0, total: plan.cambios.length, inicio });
    const r = await aplicarEnLotes(plan.cambios,
      (c) => base44.entities.SupplierPrice.update(c.id, { sale_price: c.sale_price, margin: c.margin }),
      { concurrencia: 6, senal: control.current.signal, onProgreso: (hechos, total) => setTrabajo({ hechos, total, inicio }) });
    const aplicados = new Map(plan.cambios.map((c) => [c.id, c]));
    const fallidos = new Set(r.fallos.map((f) => f.id));
    onAplicado((lista) => lista.map((p) => (aplicados.has(p.id) && !fallidos.has(p.id) && r.hechos ? { ...p, ...aplicados.get(p.id) } : p)), r);
    setTrabajo(null);
    if (r.fallos.length) toast.error(`Margen cambiado en ${r.hechos} artículos; ${r.fallos.length} no se han podido guardar. Vuelve a intentarlo.`);
    else toast.success(`Margen cambiado al ${m} % en ${r.hechos} artículos${r.cancelado ? ' (detenido)' : ''}`);
    onCerrar();
  };

  const listo = plan && plan.cambios.length > 0 && (ambito === 'todas' || ids.length > 0);

  return (
    <Dialog open={abierto} onOpenChange={(o) => { if (!o && !trabajo) onCerrar(); }}>
      <DialogContent className="max-h-[90vh] overflow-auto" data-prueba="dialogo-margen">
        <DialogHeader>
          <DialogTitle>Cambiar el margen de ganancia</DialogTitle>
          <DialogDescription>Venta = coste + el margen que pongas sobre el coste. Elige a qué tarifas se aplica.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nuevo margen (%)</Label>
            <div className="mt-1 flex items-center gap-2">
              <CampoPrecio value={margen} onChange={setMargen} placeholder="Ej. 35" className="max-w-[140px]" data-prueba="margen-nuevo" disabled={!!trabajo} />
              <Percent className="h-4 w-4 text-slate-400" />
              {comun && <span className="text-xs text-slate-500" data-prueba="margen-actual">Ahora lo más habitual es el {comun.margen} % ({comun.n} artículos)</span>}
            </div>
            {margen && m === null && <p className="mt-1 text-xs text-red-600">Escribe un número entre −90 y 1000.</p>}
          </div>
          <div>
            <Label>Aplicar a</Label>
            <RadioGroup value={ambito} onValueChange={setAmbito} className="mt-1 space-y-1" disabled={!!trabajo}>
              <div className="flex items-center gap-2"><RadioGroupItem value="todas" id="mm-todas" data-prueba="ambito-todas" /><Label htmlFor="mm-todas">Todas las tarifas juntas ({prices.length} artículos)</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="seleccion" id="mm-sel" data-prueba="ambito-seleccion" /><Label htmlFor="mm-sel">Unas tarifas seleccionadas</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="una" id="mm-una" data-prueba="ambito-una" /><Label htmlFor="mm-una">Una sola tarifa</Label></div>
            </RadioGroup>
          </div>
          {ambito === 'seleccion' && (
            <div className="max-h-44 space-y-1 overflow-auto rounded border p-2" data-prueba="lista-tarifas">
              {conArticulos.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm"><Checkbox checked={elegidas.includes(s.id)} onCheckedChange={() => alternar(s.id)} data-prueba={`tarifa-${s.id}`} />{s.name} <span className="text-xs text-slate-400">({s.n})</span></label>
              ))}
              <div className="flex gap-2 pt-1 text-xs"><button type="button" className="underline" onClick={() => setElegidas(conArticulos.map((s) => s.id))}>Marcar todas</button><button type="button" className="underline" onClick={() => setElegidas([])}>Quitar todas</button></div>
            </div>
          )}
          {ambito === 'una' && (
            <select className="w-full rounded border p-2 text-sm" value={una} onChange={(e) => setUna(e.target.value)} data-prueba="tarifa-una">
              <option value="">Elige la tarifa…</option>
              {conArticulos.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.n} artículos)</option>)}
            </select>
          )}
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={soloSinVenta} onCheckedChange={(v) => setSoloSinVenta(!!v)} disabled={!!trabajo} />Solo en artículos que aún no tienen precio de venta</label>
          {plan && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm" data-prueba="vista-previa-margen">
              Se cambiarán <b>{plan.cambios.length}</b> artículos
              {plan.yaIgual > 0 && <> · {plan.yaIgual} ya estaban así</>}
              {plan.sinCoste > 0 && <> · {plan.sinCoste} sin coste (no se tocan)</>}.
            </div>
          )}
          {trabajo && <BarraProgresoTiempo avance={trabajo.hechos / trabajo.total} inicio={trabajo.inicio} />}
        </div>
        <DialogFooter className="gap-2">
          {trabajo ? <Button variant="outline" onClick={() => control.current?.abort()}>Detener</Button> : <Button variant="outline" onClick={onCerrar}>Cancelar</Button>}
          <Button onClick={aplicar} disabled={!listo || !!trabajo} data-prueba="aplicar-margen">Aplicar margen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
