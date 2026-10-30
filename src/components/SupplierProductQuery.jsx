import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Package, Loader2, ExternalLink, CheckCircle, AlertCircle, Globe, Database } from 'lucide-react';
import { toast } from 'sonner';

// Busca en la base de datos local primero, luego consulta online si no hay resultado suficiente
async function queryLocal(ref, supplierName) {
  const results = [];
  // Buscar por código exacto
  const byCode = await base44.entities.SupplierPrice.filter({ product_code: ref });
  results.push(...byCode);
  // Si no hay resultados, buscar por nombre parcial
  if (results.length === 0) {
    const all = await base44.entities.SupplierPrice.list(null, 200);
    const q = ref.toLowerCase();
    const byName = all.filter(p =>
      p.product_code?.toLowerCase().includes(q) ||
      p.product_name?.toLowerCase().includes(q)
    );
    results.push(...byName.slice(0, 10));
  }
  // Filtrar por proveedor si se especifica
  if (supplierName) {
    const filtered = results.filter(p => p.supplier_name?.toLowerCase().includes(supplierName.toLowerCase()));
    if (filtered.length > 0) return filtered;
  }
  return results.slice(0, 10);
}

async function queryOnline(ref, supplierName, supplierWebsite) {
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Busca el precio y disponibilidad actual del producto con referencia "${ref}"${supplierName ? ` del proveedor ${supplierName}` : ''}${supplierWebsite ? ` en ${supplierWebsite}` : ''}. Devuelve: nombre del producto, precio en euros (sin IVA si es posible), disponibilidad/stock (sí/no/unidades), URL fuente donde encontraste el precio. Si no encuentras datos fiables devuelve null en todos los campos.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        product_name: { type: 'string' },
        price: { type: 'number' },
        stock: { type: 'string' },
        source_url: { type: 'string' },
        notes: { type: 'string' }
      }
    }
  });
  return res;
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SupplierProductQuery({ suppliers = [], buttonClassName = '' }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [loading, setLoading] = useState(false);
  const [localResults, setLocalResults] = useState([]);
  const [onlineResult, setOnlineResult] = useState(null);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);

  const supplier = suppliers.find(s => s.id === selectedSupplier);

  const handleSearch = async () => {
    if (!ref.trim()) { toast.error('Introduce una referencia'); return; }
    setLoading(true);
    setLocalResults([]);
    setOnlineResult(null);
    setSearched(false);

    // Buscar en paralelo: base de datos local + consulta online
    const [local, online] = await Promise.allSettled([
      queryLocal(ref.trim(), supplier?.name),
      queryOnline(ref.trim(), supplier?.name, supplier?.website || supplier?.login_url),
    ]);

    setLocalResults(local.status === 'fulfilled' ? local.value : []);
    setOnlineResult(online.status === 'fulfilled' ? online.value : null);
    setSearched(true);
    setLoading(false);
  };

  const reset = () => {
    setRef(''); setSelectedSupplier(''); setLocalResults([]); setOnlineResult(null); setSearched(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={`gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 ${buttonClassName}`}
        onClick={() => { reset(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
      >
        <Search className="w-4 h-4" />
        Consultar precio/stock
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[95vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Consulta de precio y existencias
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* Filtro de proveedor opcional */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Proveedor (opcional)</label>
              <select
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="w-full h-9 text-sm border border-input rounded-md px-3 bg-white focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Todos los proveedores</option>
                {suppliers.filter(s => s.is_active !== false).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Búsqueda por referencia */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Referencia / código de producto *</label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Ej: R404A-13KG, 0513-001, AB12345..."
                  value={ref}
                  onChange={e => setRef(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading || !ref.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 gap-1.5 flex-shrink-0"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </Button>
              </div>
            </div>

            {/* Resultados */}
            {loading && (
              <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Consultando base de datos e internet...</span>
              </div>
            )}

            {searched && !loading && (
              <div className="space-y-3">
                {/* Resultados locales */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Database className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-xs font-semibold text-gray-700">En tu tarifa ({localResults.length})</span>
                  </div>

                  {localResults.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-3 text-center text-xs text-gray-400">
                      Sin resultados en tu base de datos local
                    </div>
                  ) : (
                    <div className="border rounded-xl overflow-hidden divide-y max-h-52 overflow-y-auto">
                      {localResults.map((p, i) => (
                        <div key={i} className="bg-white px-3 py-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{p.product_name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {p.product_code && <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{p.product_code}</span>}
                                {p.supplier_name && <span className="text-[10px] text-blue-600">{p.supplier_name}</span>}
                                {p.brand && <span className="text-[10px] text-gray-400">{p.brand}</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              {p.cost_price != null && (
                                <p className="text-sm font-bold text-gray-800">{Number(p.cost_price).toFixed(2)} €</p>
                              )}
                              {p.sale_price != null && (
                                <p className="text-xs text-emerald-600">{Number(p.sale_price).toFixed(2)} € venta</p>
                              )}
                              {p.margin != null && (
                                <p className="text-[10px] text-gray-400">{p.margin}% margen</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Resultado online */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Globe className="w-3.5 h-3.5 text-purple-500" />
                    <span className="text-xs font-semibold text-gray-700">Precio online (tiempo real)</span>
                  </div>

                  {!onlineResult || (!onlineResult.product_name && !onlineResult.price) ? (
                    <div className="bg-gray-50 rounded-lg p-3 text-center text-xs text-gray-400">
                      No se encontró precio online actualizado
                    </div>
                  ) : (
                    <div className="border border-purple-200 bg-purple-50 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{onlineResult.product_name || ref}</p>
                          {onlineResult.stock && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {onlineResult.stock.toLowerCase().includes('sí') || onlineResult.stock.toLowerCase().includes('disponible') || onlineResult.stock.toLowerCase().includes('stock')
                                ? <CheckCircle className="w-3 h-3 text-emerald-500" />
                                : <AlertCircle className="w-3 h-3 text-orange-400" />
                              }
                              <span className="text-xs text-gray-600">{onlineResult.stock}</span>
                            </div>
                          )}
                          {onlineResult.notes && <p className="text-xs text-gray-500 mt-0.5">{onlineResult.notes}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {onlineResult.price != null && (
                            <p className="text-lg font-bold text-purple-700">{Number(onlineResult.price).toFixed(2)} €</p>
                          )}
                        </div>
                      </div>
                      {onlineResult.source_url && (
                        <a
                          href={onlineResult.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {onlineResult.source_url.slice(0, 60)}{onlineResult.source_url.length > 60 ? '…' : ''}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                <Button variant="outline" onClick={reset} className="w-full text-xs">
                  Nueva búsqueda
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}