import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Snowflake, AlertTriangle, Plus, Search } from 'lucide-react';
import { porFamilia as gasesPorFamilia, buscarRefrigerante, ESTADOS } from '@/lib/refrigerantes';
import { lineasDeCargaDeGas } from '@/lib/gasesFluorados';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * CargaDeGas — meter una carga de refrigerante en un presupuesto, una factura,
 * un recibo o un parte de SAT.
 *
 * ⚠️ La decisión que evita cobrar de más:
 *
 * El impuesto sobre los gases fluorados NO lo declara la empresa instaladora:
 * lo autoliquidan fabricantes, importadores y almacenistas, y al instalador le
 * llega ya dentro del precio de la botella. Así que si el precio por kilo que
 * pones es el que te cobró tu proveedor —lo normal—, el impuesto YA ESTÁ ahí.
 * Sumarlo otra vez sería cobrárselo dos veces al cliente.
 *
 * Por eso viene marcado «el precio ya lleva el impuesto» y el impuesto sale
 * como información. Solo se suma aparte si dices lo contrario.
 */
export default function CargaDeGas({ abierto, onCerrar, onAnadir, tarifas = null }) {
  const [gas, setGas] = useState('R-410A');
  const [kilos, setKilos] = useState('');
  const [precio, setPrecio] = useState('');
  const [incluido, setIncluido] = useState(true);
  const [precios, setPrecios] = useState([]);
  const [buscandoPrecio, setBuscandoPrecio] = useState(false);

  const ficha = buscarRefrigerante(gas);
  const r = useMemo(
    () => lineasDeCargaDeGas({ gas, kilos, precioKilo: precio, impuestoIncluido: incluido }),
    [gas, kilos, precio, incluido],
  );

  // Precios del gas en las tarifas guardadas, para no tener que acordarse.
  useEffect(() => {
    if (!abierto || !gas) return undefined;
    let vivo = true;
    setBuscandoPrecio(true);
    const desdeFuera = tarifas
      ? Promise.resolve(tarifas)
      : base44.entities.PriceItem.list().catch(() => []);
    desdeFuera
      .then((lista) => {
        if (!vivo) return;
        const corto = String(gas).replace(/^R-?/i, '');
        setPrecios((lista || []).filter((x) => {
          const t = `${x.name || ''} ${x.description || ''}`.toUpperCase();
          return t.includes(String(gas).toUpperCase()) || t.includes(`R${corto}`) || t.includes(`R-${corto}`);
        }).slice(0, 6));
      })
      .catch(() => { if (vivo) setPrecios([]); })
      .finally(() => { if (vivo) setBuscandoPrecio(false); });
    return () => { vivo = false; };
  }, [abierto, gas, tarifas]);

  const anadir = () => {
    if (!r.completo) { toast.error(`Falta ${r.faltan.join(' y ')}`); return; }
    onAnadir(r);
    onCerrar();
    toast.success(`Carga de ${r.gas} añadida (${r.kilos} kg · ${r.total} €)`);
  };

  const dinero = (n) => `${Number(n).toFixed(2).replace('.', ',')} €`;

  return (
    <Dialog open={abierto} onOpenChange={(v) => { if (!v) onCerrar(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-prueba="dialogo-carga-gas">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-sky-600" />
            Carga de gas refrigerante
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-3">
              <label className="text-xs text-gray-500">Gas refrigerante</label>
              <Select value={gas} onValueChange={setGas}>
                <SelectTrigger data-prueba="gas-carga"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {gasesPorFamilia().map((g) => (
                    <SelectGroup key={g.familia}>
                      <SelectLabel className="text-[10px] uppercase tracking-wide text-gray-400">
                        {g.familia}{g.familia === 'CFC' || g.familia === 'HCFC' ? ' — prohibidos' : ''}
                      </SelectLabel>
                      {g.gases.map((x) => (
                        <SelectItem key={x.id} value={x.id}>
                          {x.nombre}{x.gwp !== null ? ` — PCA ${x.gwp}` : ''}{x.estado === 'prohibido' ? ' ⛔' : ''}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Peso añadido (kg)</label>
              <Input data-prueba="kilos-carga" value={kilos} onChange={(e) => setKilos(e.target.value)} placeholder="ej: 3" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Precio por kilo (€)</label>
              <Input data-prueba="precio-carga" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="ej: 45" />
            </div>
            <div className="flex items-end">
              <p className="text-[11px] text-gray-500">
                {buscandoPrecio ? 'Mirando tus tarifas…' : (precios.length ? 'Precios que tienes guardados abajo' : 'Escríbelo a mano')}
              </p>
            </div>
          </div>

          {/* Precios guardados, para no tener que acordarse */}
          {precios.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-prueba="precios-guardados">
              <span className="text-[11px] text-gray-500 flex items-center gap-1"><Search className="w-3 h-3" />En tus tarifas:</span>
              {precios.map((x, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPrecio(String(x.price ?? x.precio ?? x.unit_price ?? ''))}
                  className="rounded border px-2 py-0.5 text-[11px] hover:bg-gray-50"
                >
                  {(x.name || 'Sin nombre').slice(0, 28)}
                  {x.price != null ? ` · ${x.price} €` : ''}
                  {x.supplier_name ? ` · ${x.supplier_name}` : ''}
                </button>
              ))}
            </div>
          )}

          {/* El estado del gas, con todas sus letras: si está prohibido hay que
              verlo antes de ponerlo en la factura, no después. */}
          {ficha && ficha.estado !== 'vigente' && ESTADOS[ficha.estado] && (
            <p className={`rounded-lg border p-2 text-[11px] ${ESTADOS[ficha.estado].color}`} data-prueba="aviso-gas-carga">
              <strong>{ficha.nombre} — {ESTADOS[ficha.estado].etiqueta}.</strong>{' '}
              {ESTADOS[ficha.estado].explicacion}
            </p>
          )}

          <label className="flex items-start gap-2 rounded-lg border bg-gray-50 p-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              data-prueba="impuesto-incluido"
              checked={incluido}
              onChange={(e) => setIncluido(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <strong>El precio por kilo ya lleva el impuesto dentro</strong> (lo normal: te lo repercutió tu
              proveedor al comprar la botella). Si lo dejas marcado, el impuesto se detalla en observaciones
              pero <strong>no se suma otra vez</strong>, para no cobrárselo dos veces al cliente.
            </span>
          </label>

          {/* La cuenta */}
          {r.completo ? (
            <div className="rounded-lg border p-2.5 bg-white space-y-1" data-prueba="cuenta-carga">
              <div className="flex justify-between text-xs"><span className="text-gray-500">Gas ({r.kilos} kg × {dinero(r.precioKilo)}/kg)</span><span className="font-semibold">{dinero(r.importeGas)}</span></div>
              {r.sujeto && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">
                    Impuesto gases fluorados (PCA {r.pca} × 0,015 = {dinero(r.tipoImpuesto)}/kg)
                    {r.impuestoIncluido && <span className="text-amber-700"> — ya incluido, no se suma</span>}
                  </span>
                  <span className={r.impuestoIncluido ? 'text-gray-400 line-through' : 'font-semibold'}>{dinero(r.impuesto)}</span>
                </div>
              )}
              {!r.sujeto && (
                <div className="flex justify-between text-xs"><span className="text-gray-500">Impuesto gases fluorados</span><span className="text-gray-500">No sujeto</span></div>
              )}
              <div className="flex justify-between text-sm border-t pt-1"><span className="font-bold">Total a la factura</span><span className="font-bold">{dinero(r.total)}</span></div>
              <p className="text-[10px] text-gray-400 pt-1">
                {String(r.toneladas).replace('.', ',')} t CO₂ equivalente. En observaciones se añade el cálculo, la periodicidad de control
                de fugas y la normativa de referencia.
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500" data-prueba="faltan-carga">Falta {r.faltan.join(' y ')}.</p>
          )}

          {r.completo && r.avisos?.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 space-y-1">
              {r.avisos.map((a, i) => (
                <p key={i} className="text-[11px] text-amber-900 flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /><span>{a}</span>
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={anadir} disabled={!r.completo} className="bg-sky-600 hover:bg-sky-700" data-prueba="anadir-carga">
              <Plus className="w-4 h-4 mr-1" />Añadir al documento
            </Button>
            <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
