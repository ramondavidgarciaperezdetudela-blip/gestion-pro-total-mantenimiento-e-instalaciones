import React, { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUp, Loader2, Check, AlertTriangle, Database, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { importarFichero, candidatosDeLinea } from '@/lib/importarPresupuesto';
import {
  cargarPropios, cargarProveedores, buscarEnProveedores, guardarArticulo, listaDeApartados, APARTADOS_BASE, DESTINO_MIO,
} from '@/lib/miBaseDatos';

const euros = (n) => `${(Number(n) || 0).toFixed(2).replace('.', ',')} €`;
const redondear = (n) => Math.round(n * 100) / 100;

/**
 * Importar las líneas de un Excel, CSV, Word o PDF al presupuesto.
 * Cada línea se comprueba en «Mi base de datos» y en las tarifas de proveedores:
 *  · si existe, se elige de qué proveedor se quiere el precio;
 *  · si no existe, se ofrece guardarla en Mi base de datos (con apartado y proveedor).
 */
export default function ImportarPresupuestoDialog({ open, onClose, onAdd }) {
  const entrada = useRef(null);
  const [fase, setFase] = useState('elegir'); // elegir | leyendo | revisar
  const [error, setError] = useState('');
  const [nombre, setNombre] = useState('');
  const [avisos, setAvisos] = useState([]);
  const [lineas, setLineas] = useState([]);
  const [propios, setPropios] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [margen, setMargen] = useState('');
  const [apartadoGlobal, setApartadoGlobal] = useState(APARTADOS_BASE[0]);
  const [proveedorGlobal, setProveedorGlobal] = useState('');
  const [destinoGlobal, setDestinoGlobal] = useState(DESTINO_MIO);
  const [guardando, setGuardando] = useState(false);

  const cerrar = () => { setFase('elegir'); setLineas([]); setError(''); setAvisos([]); onClose(); };

  const alElegir = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setError(''); setNombre(f.name); setFase('leyendo');
    try {
      const r = await importarFichero(f);
      if (!r.lineas.length) { setError(r.avisos.join(' ') || 'No he encontrado líneas en el fichero.'); setFase('elegir'); return; }
      const [mios, provs, porRef] = await Promise.all([
        cargarPropios().catch(() => []), cargarProveedores(),
        buscarEnProveedores(r.lineas.map((l) => l.reference)).catch(() => new Map()),
      ]);
      setPropios(mios); setProveedores(provs);
      setAvisos(r.avisos);
      setLineas(r.lineas.map((l, i) => {
        const candidatos = candidatosDeLinea(l, { propios: mios, porRef });
        return {
          ...l, id: i, candidatos, incluir: true,
          // precio: el del fichero si lo trae; si no, el primer candidato
          fuente: l.unit_price > 0 || !candidatos.length ? 'fichero' : '0',
          guardar: !candidatos.length, apartado: '', proveedor: '', destino: '', tambienMia: false,
        };
      }));
      setFase('revisar');
    } catch (err) {
      setError(err?.message || 'No se pudo leer el fichero');
      setFase('elegir');
    }
  };

  const cambiar = (id, campo, valor) => setLineas((ls) => ls.map((l) => (l.id === id ? { ...l, [campo]: valor } : l)));
  const numeroDe = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

  /** Precio que se va a usar en el presupuesto para esa línea. */
  const precioDe = (l) => {
    const m = numeroDe(margen);
    if (l.fuente === 'fichero') return redondear(l.unit_price * (1 + m / 100));
    return l.candidatos[Number(l.fuente)]?.precio ?? l.unit_price;
  };
  const totalDe = (l) => redondear(l.quantity * precioDe(l) * (1 - (l.discount || 0) / 100));

  const nuevas = lineas.filter((l) => l.incluir && !l.candidatos.length);
  const aGuardar = nuevas.filter((l) => l.guardar);
  const totalGeneral = useMemo(() => lineas.filter((l) => l.incluir).reduce((a, l) => a + totalDe(l), 0), [lineas, margen]);

  const aplicarGlobal = () => setLineas((ls) => ls.map((l) => (!l.candidatos.length ? { ...l, apartado: apartadoGlobal, proveedor: proveedorGlobal, destino: destinoGlobal } : l)));

  const confirmar = async () => {
    const elegidas = lineas.filter((l) => l.incluir);
    if (!elegidas.length) { toast.error('No hay líneas marcadas'); return; }
    setGuardando(true);
    let guardadas = 0;
    try {
      for (const l of aGuardar) {
        try {
          await guardarArticulo({
            description: l.description, reference: l.reference, unit_price: l.unit_price, precio_venta: precioDe(l), unit: l.unit || 'ud',
            apartado: l.apartado || apartadoGlobal, proveedor: l.proveedor || proveedorGlobal, delivery_days: l.delivery_days,
            destino: l.destino || destinoGlobal, tambienMia: l.tambienMia,
          });
          guardadas++;
        } catch { /* una línea que no se guarda no impide añadir las demás al presupuesto */ }
      }
      onAdd(elegidas.map((l) => {
        const c = l.fuente === 'fichero' ? null : l.candidatos[Number(l.fuente)];
        const precio = precioDe(l);
        return {
          description: l.description, reference: l.reference || c?.ref || '', quantity: l.quantity, unit_price: precio,
          discount: l.discount || 0, total: totalDe(l), delivery_days: l.delivery_days, delivery_text: l.delivery_text,
          supplier_name: c?.proveedor || '', unit: l.unit,
        };
      }));
      if (aGuardar.length) toast.success(`${guardadas} artículo${guardadas === 1 ? '' : 's'} nuevo${guardadas === 1 ? '' : 's'} guardado${guardadas === 1 ? '' : 's'} en tus bases de datos y tarifas`);
      toast.success(`${elegidas.length} línea${elegidas.length === 1 ? '' : 's'} añadida${elegidas.length === 1 ? '' : 's'} al presupuesto`);
      cerrar();
    } finally { setGuardando(false); }
  };

  const apartados = listaDeApartados(propios);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) cerrar(); }}>
      <DialogContent className="max-w-4xl w-[96vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileUp className="w-5 h-5 text-blue-600" />Importar presupuesto desde un fichero</DialogTitle>
        </DialogHeader>

        {fase !== 'revisar' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Sube un <b>Excel, CSV, Word (.docx) o PDF</b> con el presupuesto o la tarifa. Detecto solo la referencia, la descripción, la cantidad,
              el precio, el descuento, el importe y el plazo de entrega, y compruebo cada artículo en tus bases de datos y en las de los proveedores.
            </p>
            <input ref={entrada} type="file" className="hidden" accept=".xlsx,.xls,.xlsm,.ods,.csv,.tsv,.docx,.pdf" onChange={alElegir} />
            <Button className="w-full h-16 text-base gap-2" disabled={fase === 'leyendo'} onClick={() => entrada.current?.click()}>
              {fase === 'leyendo' ? <><Loader2 className="w-5 h-5 animate-spin" />Leyendo {nombre}…</> : <><FileUp className="w-5 h-5" />Elegir fichero</>}
            </Button>
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
            <p className="text-xs text-gray-400">Los PDF escaneados (fotos) no tienen texto que leer. Para esos, pide el Excel al proveedor.</p>
          </div>
        )}

        {fase === 'revisar' && (
          <div className="space-y-3">
            <div className="text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
              <b>{nombre}</b>
              <span className="text-gray-500">{lineas.length} líneas</span>
              <span className="text-green-700">{lineas.filter((l) => l.candidatos.length).length} ya existen en alguna base de datos</span>
              <span className="text-amber-700">{lineas.filter((l) => !l.candidatos.length).length} nuevas</span>
            </div>
            {avisos.map((a, i) => <p key={i} className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{a}</p>)}

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-slate-50 border rounded-lg p-2">
              <label className="text-xs text-gray-500">Margen sobre los precios del fichero (%)
                <Input value={margen} onChange={(e) => setMargen(e.target.value)} inputMode="decimal" placeholder="0 = precios tal cual" className="h-8" />
              </label>
              <label className="text-xs text-gray-500">Guardar los nuevos en
                <select value={destinoGlobal} onChange={(e) => setDestinoGlobal(e.target.value)} className="h-8 w-full border border-input rounded-md px-1 text-sm">
                  <option value={DESTINO_MIO}>Mi base de datos</option>
                  {proveedores.map((p) => <option key={p} value={p}>Tarifa de {p}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-500">Apartado (Mi base de datos)
                <select value={apartadoGlobal} onChange={(e) => setApartadoGlobal(e.target.value)} className="h-8 w-full border border-input rounded-md px-1 text-sm">
                  {apartados.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="text-xs text-gray-500">¿De qué proveedor es el precio?
                <Input list="proveedores-import" value={proveedorGlobal} onChange={(e) => setProveedorGlobal(e.target.value)} placeholder="KIDE, TAVER…" className="h-8" />
                <datalist id="proveedores-import">{proveedores.map((p) => <option key={p} value={p} />)}</datalist>
              </label>
              <Button size="sm" variant="outline" onClick={aplicarGlobal} disabled={!nuevas.length}>Aplicar a los nuevos</Button>
            </div>

            <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
              {lineas.map((l) => (
                <div key={l.id} className={`border rounded-lg p-2 space-y-1.5 ${l.incluir ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={l.incluir} onChange={(e) => cambiar(l.id, 'incluir', e.target.checked)} className="mt-2" title="Incluir en el presupuesto" />
                    <Input value={l.reference} onChange={(e) => cambiar(l.id, 'reference', e.target.value)} placeholder="Ref." className="h-8 w-28 text-xs" />
                    <Input value={l.description} onChange={(e) => cambiar(l.id, 'description', e.target.value)} placeholder="Descripción" className="h-8 flex-1 text-xs" />
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 pl-6">
                    <label className="text-[10px] text-gray-400">Cant.<Input value={l.quantity} onChange={(e) => cambiar(l.id, 'quantity', numeroDe(e.target.value))} inputMode="decimal" className="h-7 text-xs" /></label>
                    <label className="text-[10px] text-gray-400">Precio ud.<Input value={l.fuente === 'fichero' ? l.unit_price : precioDe(l)} disabled={l.fuente !== 'fichero'} onChange={(e) => cambiar(l.id, 'unit_price', numeroDe(e.target.value))} inputMode="decimal" className="h-7 text-xs" /></label>
                    <label className="text-[10px] text-gray-400">Dto. %<Input value={l.discount} onChange={(e) => cambiar(l.id, 'discount', numeroDe(e.target.value))} inputMode="decimal" className="h-7 text-xs" /></label>
                    <label className="text-[10px] text-gray-400">Plazo (días)<Input value={l.delivery_days ?? ''} onChange={(e) => cambiar(l.id, 'delivery_days', e.target.value === '' ? null : numeroDe(e.target.value))} inputMode="numeric" className="h-7 text-xs" placeholder={l.delivery_text || ''} /></label>
                    <div className="text-[10px] text-gray-400">Importe<div className="h-7 flex items-center justify-end text-sm font-semibold text-green-700">{euros(totalDe(l))}</div></div>
                  </div>
                  {l.avisos.map((a, i) => <p key={i} className="pl-6 text-[11px] text-amber-700">⚠ {a}</p>)}

                  {l.candidatos.length > 0 ? (
                    <div className="pl-6 flex flex-wrap items-center gap-2 text-xs">
                      <Database className="w-3.5 h-3.5 text-green-600" />
                      <span className="text-green-700 font-medium">Ya existe</span>
                      <span className="text-gray-500">Precio de:</span>
                      <select value={l.fuente} onChange={(e) => cambiar(l.id, 'fuente', e.target.value)} className="h-7 border border-input rounded-md px-1 text-xs max-w-full">
                        <option value="fichero">El fichero ({euros(l.unit_price)})</option>
                        {l.candidatos.map((c, k) => (
                          <option key={k} value={String(k)}>
                            {c.origen === 'propia' ? 'Mi base de datos' : 'Proveedor'}{c.proveedor ? ` · ${c.proveedor}` : ''} — {euros(c.precio)}{c.exacto ? '' : ' (parecido)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="pl-6 flex flex-wrap items-center gap-2 text-xs">
                      <PackagePlus className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-amber-700 font-medium">No está en ninguna base de datos</span>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={l.guardar} onChange={(e) => cambiar(l.id, 'guardar', e.target.checked)} />Guardar como artículo nuevo</label>
                      {l.guardar && <>
                        <select value={l.destino || destinoGlobal} onChange={(e) => cambiar(l.id, 'destino', e.target.value)} className="h-7 border border-input rounded-md px-1 text-xs">
                          <option value={DESTINO_MIO}>en Mi base de datos</option>
                          {proveedores.map((p) => <option key={p} value={p}>en la tarifa de {p}</option>)}
                        </select>
                        {(l.destino || destinoGlobal) !== DESTINO_MIO && (
                          <label className="flex items-center gap-1"><input type="checkbox" checked={l.tambienMia} onChange={(e) => cambiar(l.id, 'tambienMia', e.target.checked)} />y en Mi base de datos</label>
                        )}
                        {((l.destino || destinoGlobal) === DESTINO_MIO || l.tambienMia) && (
                          <select value={l.apartado || apartadoGlobal} onChange={(e) => cambiar(l.id, 'apartado', e.target.value)} className="h-7 border border-input rounded-md px-1 text-xs">
                            {apartados.map((a) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        )}
                        {(l.destino || destinoGlobal) === DESTINO_MIO && (
                          <Input list="proveedores-import" value={l.proveedor || proveedorGlobal} onChange={(e) => cambiar(l.id, 'proveedor', e.target.value)} placeholder="Proveedor del precio" className="h-7 w-40 text-xs" />
                        )}
                      </>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
              <span className="text-sm">Total sin IVA: <b className="text-green-700">{euros(totalGeneral)}</b>
                {aGuardar.length > 0 && <span className="text-xs text-gray-500"> · se guardarán {aGuardar.length} artículos nuevos</span>}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={cerrar}>Cancelar</Button>
                <Button onClick={confirmar} disabled={guardando} className="bg-green-600 hover:bg-green-700 gap-1">
                  {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Añadir al presupuesto
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
