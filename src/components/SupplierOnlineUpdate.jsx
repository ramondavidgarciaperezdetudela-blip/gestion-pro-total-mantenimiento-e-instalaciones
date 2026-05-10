import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Globe, RefreshCw, Image as ImageIcon, Loader2, CheckCircle, X, Upload, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

// ── Panel de actualización de precios online ──────────────────────────────────
function OnlinePriceUpdatePanel({ supplier, prices, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [margin, setMargin] = useState(30);
  const [batchSize, setBatchSize] = useState(30);
  const [offset, setOffset] = useState(0);

  const handleUpdate = async () => {
    setLoading(true);
    setResult(null);
    const sample = prices.slice(offset, offset + batchSize);
    try {
      const res = await base44.functions.invoke('updateSupplierPricesOnline', {
        supplierId:     supplier.id,
        supplierName:   supplier.name,
        websiteUrl:     supplier.website || supplier.login_url || '',
        sampleProducts: sample.map(p => ({ product_code: p.product_code, product_name: p.product_name })),
        margin,
      });
      setResult(res.data);
      if (res.data?.updated > 0) onUpdated && onUpdated();
    } catch (err) {
      toast.error('Error al actualizar: ' + err.message);
    }
    setLoading(false);
  };

  const totalBatches = Math.ceil(prices.length / batchSize);
  const currentBatch = Math.floor(offset / batchSize) + 1;

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">🌐 Actualización automática de precios desde internet</p>
        <p className="text-xs text-blue-600">
          La IA buscará los precios actuales en la web de <strong>{supplier.name}</strong> y actualizará los que encuentre.
          {supplier.website && <> Web: <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="underline">{supplier.website}</a></>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Margen de venta (%)</label>
          <Input type="number" min="0" max="200" value={margin} onChange={e => setMargin(parseInt(e.target.value) || 0)} className="h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Productos por búsqueda</label>
          <Input type="number" min="5" max="50" value={batchSize} onChange={e => setBatchSize(parseInt(e.target.value) || 30)} className="h-8 text-sm" />
        </div>
      </div>

      {prices.length > batchSize && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Lote {currentBatch} de {totalBatches} ({prices.slice(offset, offset + batchSize).length} productos)</span>
          <div className="flex gap-1 ml-auto">
            <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - batchSize))}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40">← Anterior</button>
            <button disabled={offset + batchSize >= prices.length} onClick={() => setOffset(offset + batchSize)}
              className="px-2 py-1 rounded border text-xs disabled:opacity-40">Siguiente →</button>
          </div>
        </div>
      )}

      <Button onClick={handleUpdate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando precios en internet...</>
          : <><Globe className="w-4 h-4" /> Actualizar precios desde internet</>
        }
      </Button>

      {result && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-700">{result.found || 0}</p>
              <p className="text-[10px] text-blue-500">Precios encontrados</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
              <p className="text-lg font-bold text-emerald-700">{result.updated || 0}</p>
              <p className="text-[10px] text-emerald-500">Actualizados en BD</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
              <p className="text-lg font-bold text-gray-600">{result.total_searched || 0}</p>
              <p className="text-[10px] text-gray-400">Buscados</p>
            </div>
          </div>

          {result.products && (
            <div className="max-h-48 overflow-y-auto border rounded-xl divide-y text-xs">
              {result.products.map((p, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 ${p.found ? 'bg-white' : 'bg-gray-50'}`}>
                  {p.found
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    : <X className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                  }
                  <span className="flex-1 truncate text-gray-700">{p.product_name}</span>
                  {p.new_price && <span className="font-semibold text-emerald-700 flex-shrink-0">{p.new_price.toFixed(2)} €</span>}
                  {p.source_url && (
                    <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 flex-shrink-0">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Normaliza un nombre para búsqueda: quita acentos, símbolos y normaliza espacios
function normalizeName(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^\w\s]/g, ' ')                          // quita símbolos
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Panel de imágenes en masa ─────────────────────────────────────────────────
function BulkImagePanel({ supplier, prices, onUpdated }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState([]);   // { item, image_url?, ok, pending? }
  const [found, setFound] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [manualItem, setManualItem] = useState(null);
  const [manualUrl, setManualUrl] = useState('');
  const fileRef = useRef(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const stopRef = useRef(false);

  const withoutImage = prices.filter(p => !p.image_url);

  const handleFetchImages = async () => {
    if (withoutImage.length === 0) { toast.info('Todos los productos ya tienen imagen'); return; }
    setRunning(true);
    stopRef.current = false;
    setResults([]);
    setFound(0);
    setProcessed(0);

    // Inicializar todos como pendientes
    const initial = withoutImage.map(item => ({ item, ok: false, pending: true }));
    setResults(initial);

    // Procesar uno a uno sin límite de lotes — guarda en BD en cuanto encuentra imagen
    for (let i = 0; i < withoutImage.length; i++) {
      if (stopRef.current) break;
      const item = withoutImage[i];

      // Nombre normalizado para mejor búsqueda (sin acentos ni errores tipográficos)
      const cleanName = normalizeName(item.product_name);
      const cleanBrand = normalizeName(item.brand || '');
      const prompt = `Find the official product image URL for: "${cleanName}"${cleanBrand ? ` brand ${cleanBrand}` : ''}${item.product_code ? ` ref ${item.product_code}` : ''}. Return only a direct image URL (jpg/png/webp). If no reliable image exists, return null.`;

      let imageUrl = null;
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          add_context_from_internet: true,
          response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
        });
        imageUrl = res?.image_url || null;
      } catch (_) {
        // Error tipográfico o fallo puntual: ignorar y continuar
        imageUrl = null;
      }

      // Guardar en BD inmediatamente si encontró imagen
      if (imageUrl) {
        try {
          await base44.entities.SupplierPrice.update(item.id, { image_url: imageUrl });
          setFound(prev => prev + 1);
        } catch (_) {
          imageUrl = null; // no se pudo guardar, marcar sin imagen
        }
      }

      // Actualizar resultado de este item en la lista en tiempo real
      setResults(prev => prev.map(r =>
        r.item.id === item.id ? { item, image_url: imageUrl || undefined, ok: !!imageUrl, pending: false } : r
      ));
      setProcessed(i + 1);
    }

    setRunning(false);
    onUpdated && onUpdated();
  };

  const handleStop = () => { stopRef.current = true; };

  const handleManualFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !manualItem) return;
    setUploadingManual(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.SupplierPrice.update(manualItem.id, { image_url: file_url });
    setResults(prev => prev.map(r => r.item.id === manualItem.id ? { ...r, image_url: file_url, ok: true, pending: false } : r));
    setManualItem(null);
    onUpdated && onUpdated();
    setUploadingManual(false);
    toast.success('Imagen subida');
  };

  const handleManualUrl = async () => {
    if (!manualUrl || !manualItem) return;
    await base44.entities.SupplierPrice.update(manualItem.id, { image_url: manualUrl });
    setResults(prev => prev.map(r => r.item.id === manualItem.id ? { ...r, image_url: manualUrl, ok: true, pending: false } : r));
    setManualItem(null);
    setManualUrl('');
    onUpdated && onUpdated();
    toast.success('Imagen guardada');
  };

  const pendingCount = results.filter(r => r.pending).length;
  const notFoundCount = results.filter(r => !r.pending && !r.ok).length;

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        <p className="font-semibold mb-0.5">🖼️ Descarga automática de imágenes</p>
        <p className="text-xs text-amber-600">
          {withoutImage.length} de {prices.length} productos sin imagen. La IA buscará cada imagen y la guardará al instante — sin necesidad de supervisión.
        </p>
      </div>

      {!running ? (
        <Button onClick={handleFetchImages} disabled={withoutImage.length === 0} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
          <ImageIcon className="w-4 h-4" /> Buscar imágenes automáticamente ({withoutImage.length})
        </Button>
      ) : (
        <div className="space-y-2">
          {/* Barra de progreso en tiempo real */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-amber-800 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando imágenes...
              </span>
              <span className="text-amber-600 font-mono text-xs">{processed}/{withoutImage.length}</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${withoutImage.length > 0 ? Math.round(processed / withoutImage.length * 100) : 0}%` }} />
            </div>
            <div className="flex justify-between text-xs text-amber-600">
              <span>✅ {found} encontradas · ❌ {processed - found} sin imagen</span>
              <span>{pendingCount} pendientes</span>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={handleStop} className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50">
            Detener búsqueda
          </Button>
        </div>
      )}

      {results.length > 0 && (
        <div className="max-h-64 overflow-y-auto border rounded-xl divide-y text-xs">
          {results.map((r, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 ${r.pending ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
              <div className="w-8 h-8 rounded border bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {r.image_url
                  ? <img src={r.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
                  : r.pending
                    ? <Loader2 className="w-3 h-3 text-gray-300 animate-spin" />
                    : <ImageIcon className="w-3 h-3 text-gray-300" />
                }
              </div>
              <span className="flex-1 truncate text-gray-700">{r.item.product_name}</span>
              {r.pending
                ? <span className="text-[10px] text-gray-400">esperando...</span>
                : r.ok
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  : (
                    <button
                      onClick={() => { setManualItem(r.item); setManualUrl(''); }}
                      className="text-[10px] px-2 py-0.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 flex-shrink-0"
                    >
                      + Subir manual
                    </button>
                  )
              }
            </div>
          ))}
        </div>
      )}

      {/* Resumen cuando termina */}
      {!running && results.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
            <p className="font-bold text-emerald-700 text-base">{found}</p>
            <p className="text-emerald-600">Encontradas</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
            <p className="font-bold text-orange-700 text-base">{notFoundCount}</p>
            <p className="text-orange-600">Sin imagen</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <p className="font-bold text-gray-600 text-base">{results.length}</p>
            <p className="text-gray-500">Total</p>
          </div>
        </div>
      )}

      {/* Subida manual inline */}
      {manualItem && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-orange-800">Subir imagen para: {manualItem.product_name}</p>
          <div className="flex gap-2">
            <Input
              placeholder="Pega URL de imagen..."
              value={manualUrl}
              onChange={e => setManualUrl(e.target.value)}
              className="text-xs h-8 flex-1"
            />
            <Button size="sm" disabled={!manualUrl} onClick={handleManualUrl} className="h-8 bg-orange-600 hover:bg-orange-700 text-xs">
              Guardar
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => fileRef.current?.click()} disabled={uploadingManual}>
              <Upload className="w-3 h-3" /> {uploadingManual ? 'Subiendo...' : 'Subir archivo'}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleManualFile} />
            <button onClick={() => setManualItem(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SupplierOnlineUpdate({ supplier, prices, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('prices'); // 'prices' | 'images'
  const [expanded, setExpanded] = useState(false);

  const supplierPrices = prices.filter(p => p.supplier_id === supplier.id);

  return (
    <>
      {/* Botón inline en la cabecera del proveedor */}
      <div className="flex gap-1">
        <button
          onClick={e => { e.stopPropagation(); setTab('prices'); setOpen(true); }}
          title="Actualizar precios desde internet"
          className="p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Globe className="w-4 h-4" />
        </button>
        <button
          onClick={e => { e.stopPropagation(); setTab('images'); setOpen(true); }}
          title="Gestionar imágenes"
          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              {supplier.name} — Actualización online
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTab('prices')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${tab === 'prices' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <Globe className="w-3.5 h-3.5" /> Actualizar precios
            </button>
            <button
              onClick={() => setTab('images')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${tab === 'images' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Imágenes ({supplierPrices.filter(p => !p.image_url).length} sin imagen)
            </button>
          </div>

          {tab === 'prices' && (
            <OnlinePriceUpdatePanel
              supplier={supplier}
              prices={supplierPrices}
              onUpdated={() => { onUpdated && onUpdated(); }}
            />
          )}
          {tab === 'images' && (
            <BulkImagePanel
              supplier={supplier}
              prices={supplierPrices}
              onUpdated={() => { onUpdated && onUpdated(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}