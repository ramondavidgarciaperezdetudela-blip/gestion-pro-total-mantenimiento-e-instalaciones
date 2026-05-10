import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Globe, RefreshCw, Image as ImageIcon, Loader2, CheckCircle, X, Upload, ExternalLink, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';

// Normaliza un nombre para búsqueda: quita acentos, símbolos y normaliza espacios
function normalizeName(str) {
  return String(str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Panel de actualización de precios online ──────────────────────────────────
// Recorre TODOS los productos del proveedor en lotes continuos hasta terminar
function OnlinePriceUpdatePanel({ supplier, prices, onUpdated, bgState, setBgState }) {
  const [margin, setMargin] = useState(30);
  const [batchSize] = useState(25);
  const stopRef = useRef(false);

  const running = bgState.pricesRunning;
  const progress = bgState.pricesProgress;
  const results = bgState.pricesResults;

  const handleStart = async () => {
    if (prices.length === 0) { toast.info('No hay productos para actualizar'); return; }
    stopRef.current = false;
    setBgState(s => ({ ...s, pricesRunning: true, pricesProgress: { processed: 0, updated: 0, total: prices.length }, pricesResults: [] }));

    const totalBatches = Math.ceil(prices.length / batchSize);
    let totalUpdated = 0;
    const allResults = [];

    for (let bi = 0; bi < totalBatches; bi++) {
      if (stopRef.current) break;
      const batch = prices.slice(bi * batchSize, (bi + 1) * batchSize);

      try {
        const res = await base44.functions.invoke('updateSupplierPricesOnline', {
          supplierId:     supplier.id,
          supplierName:   supplier.name,
          websiteUrl:     supplier.website || supplier.login_url || '',
          sampleProducts: batch.map(p => ({ product_code: p.product_code, product_name: p.product_name })),
          margin,
        });
        const data = res.data || {};
        totalUpdated += data.updated || 0;
        if (data.products) allResults.push(...data.products);
      } catch (_) {
        // lote fallido — continuar con el siguiente
      }

      const processed = Math.min((bi + 1) * batchSize, prices.length);
      setBgState(s => ({
        ...s,
        pricesProgress: { processed, updated: totalUpdated, total: prices.length },
        pricesResults: [...allResults],
      }));
    }

    setBgState(s => ({ ...s, pricesRunning: false }));
    onUpdated && onUpdated();
    toast.success(`✅ Precios actualizados: ${totalUpdated} de ${prices.length} productos`, { duration: 5000 });
  };

  const handleStop = () => { stopRef.current = true; };

  const pct = progress.total > 0 ? Math.round(progress.processed / progress.total * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">🌐 Actualización automática de precios desde internet</p>
        <p className="text-xs text-blue-600">
          La IA recorrerá <strong>todos los {prices.length} productos</strong> de <strong>{supplier.name}</strong> en lotes continuos.
          {supplier.website && <> Web: <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="underline ml-1">{supplier.website}</a></>}
        </p>
      </div>

      {!running && (
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Margen de venta (%)</label>
          <Input type="number" min="0" max="200" value={margin} onChange={e => setMargin(parseInt(e.target.value) || 0)} className="h-8 text-sm w-32" />
        </div>
      )}

      {running ? (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-blue-800 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando precios...
              </span>
              <span className="text-blue-600 font-mono text-xs">{progress.processed}/{progress.total}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-blue-600">
              <span>✅ {progress.updated} precios actualizados</span>
              <span>{pct}% completado</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleStop} className="flex-1 text-xs border-red-200 text-red-600 hover:bg-red-50">
              Detener
            </Button>
            <p className="text-xs text-gray-400 flex items-center gap-1 flex-1 text-center justify-center">
              <MinusCircle className="w-3 h-3" /> Puedes cerrar este diálogo — sigue en background
            </p>
          </div>
        </div>
      ) : (
        <Button onClick={handleStart} disabled={prices.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
          <Globe className="w-4 h-4" /> Actualizar todos los precios desde internet ({prices.length})
        </Button>
      )}

      {/* Resumen final */}
      {!running && progress.total > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
            <p className="font-bold text-blue-700 text-base">{progress.processed}</p>
            <p className="text-blue-600">Buscados</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
            <p className="font-bold text-emerald-700 text-base">{progress.updated}</p>
            <p className="text-emerald-600">Actualizados</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <p className="font-bold text-gray-600 text-base">{progress.total}</p>
            <p className="text-gray-500">Total</p>
          </div>
        </div>
      )}

      {/* Lista de resultados */}
      {results.length > 0 && (
        <div className="max-h-48 overflow-y-auto border rounded-xl divide-y text-xs">
          {results.map((p, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-2 ${p.found ? 'bg-white' : 'bg-gray-50'}`}>
              {p.found
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                : <X className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              }
              <span className="flex-1 truncate text-gray-700">{p.product_name}</span>
              {p.new_price && <span className="font-semibold text-emerald-700 flex-shrink-0">{Number(p.new_price).toFixed(2)} €</span>}
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
  );
}

// ── Panel de imágenes en masa ─────────────────────────────────────────────────
function BulkImagePanel({ supplier, prices, onUpdated, bgState, setBgState }) {
  const [manualItem, setManualItem] = useState(null);
  const [manualUrl, setManualUrl] = useState('');
  const fileRef = useRef(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const stopRef = useRef(false);

  const withoutImage = prices.filter(p => !p.image_url);
  const running = bgState.imagesRunning;
  const results = bgState.imagesResults;
  const found = bgState.imagesFound;
  const processed = bgState.imagesProcessed;

  const handleFetchImages = async () => {
    if (withoutImage.length === 0) { toast.info('Todos los productos ya tienen imagen'); return; }
    stopRef.current = false;
    const initial = withoutImage.map(item => ({ item, ok: false, pending: true }));
    setBgState(s => ({ ...s, imagesRunning: true, imagesResults: initial, imagesFound: 0, imagesProcessed: 0 }));

    let foundCount = 0;

    for (let i = 0; i < withoutImage.length; i++) {
      if (stopRef.current) break;
      const item = withoutImage[i];

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
        imageUrl = null;
      }

      if (imageUrl) {
        try {
          await base44.entities.SupplierPrice.update(item.id, { image_url: imageUrl });
          foundCount++;
        } catch (_) {
          imageUrl = null;
        }
      }

      const finalUrl = imageUrl || undefined;
      setBgState(s => ({
        ...s,
        imagesFound: foundCount,
        imagesProcessed: i + 1,
        imagesResults: s.imagesResults.map(r =>
          r.item.id === item.id ? { item, image_url: finalUrl, ok: !!finalUrl, pending: false } : r
        ),
      }));
    }

    setBgState(s => ({ ...s, imagesRunning: false }));
    onUpdated && onUpdated();
    toast.success(`✅ Imágenes actualizadas: ${foundCount} de ${withoutImage.length} productos`, { duration: 5000 });
  };

  const handleStop = () => { stopRef.current = true; };

  const handleManualFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !manualItem) return;
    setUploadingManual(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.SupplierPrice.update(manualItem.id, { image_url: file_url });
    setBgState(s => ({
      ...s,
      imagesResults: s.imagesResults.map(r => r.item.id === manualItem.id ? { ...r, image_url: file_url, ok: true, pending: false } : r),
    }));
    setManualItem(null);
    onUpdated && onUpdated();
    setUploadingManual(false);
    toast.success('Imagen subida');
  };

  const handleManualUrl = async () => {
    if (!manualUrl || !manualItem) return;
    await base44.entities.SupplierPrice.update(manualItem.id, { image_url: manualUrl });
    setBgState(s => ({
      ...s,
      imagesResults: s.imagesResults.map(r => r.item.id === manualItem.id ? { ...r, image_url: manualUrl, ok: true, pending: false } : r),
    }));
    setManualItem(null);
    setManualUrl('');
    onUpdated && onUpdated();
    toast.success('Imagen guardada');
  };

  const pendingCount = results.filter(r => r.pending).length;
  const notFoundCount = results.filter(r => !r.pending && !r.ok).length;
  const pct = withoutImage.length > 0 ? Math.round(processed / withoutImage.length * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        <p className="font-semibold mb-0.5">🖼️ Descarga automática de imágenes</p>
        <p className="text-xs text-amber-600">
          {withoutImage.length} de {prices.length} productos sin imagen. La IA buscará y guardará cada imagen al instante.
        </p>
      </div>

      {running ? (
        <div className="space-y-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-amber-800 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando imágenes...
              </span>
              <span className="text-amber-600 font-mono text-xs">{processed}/{withoutImage.length}</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
              <div className="h-2 bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-amber-600">
              <span>✅ {found} encontradas · ❌ {processed - found} sin imagen</span>
              <span>{pendingCount} pendientes</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleStop} className="flex-1 text-xs border-red-200 text-red-600 hover:bg-red-50">
              Detener
            </Button>
            <p className="text-xs text-gray-400 flex items-center gap-1 flex-1 text-center justify-center">
              <MinusCircle className="w-3 h-3" /> Puedes cerrar — sigue en background
            </p>
          </div>
        </div>
      ) : (
        <Button onClick={handleFetchImages} disabled={withoutImage.length === 0} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
          <ImageIcon className="w-4 h-4" /> Buscar imágenes automáticamente ({withoutImage.length})
        </Button>
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

      {/* Lista en tiempo real */}
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
                      + Subir
                    </button>
                  )
              }
            </div>
          ))}
        </div>
      )}

      {/* Subida manual inline */}
      {manualItem && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-orange-800 truncate">Subir imagen: {manualItem.product_name}</p>
          <div className="flex gap-2">
            <Input placeholder="Pega URL de imagen..." value={manualUrl} onChange={e => setManualUrl(e.target.value)} className="text-xs h-8 flex-1" />
            <Button size="sm" disabled={!manualUrl} onClick={handleManualUrl} className="h-8 bg-orange-600 hover:bg-orange-700 text-xs">Guardar</Button>
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

// Estado inicial de background compartido
const initBgState = () => ({
  pricesRunning: false,
  pricesProgress: { processed: 0, updated: 0, total: 0 },
  pricesResults: [],
  imagesRunning: false,
  imagesResults: [],
  imagesFound: 0,
  imagesProcessed: 0,
});

// ── Componente principal ──────────────────────────────────────────────────────
export default function SupplierOnlineUpdate({ supplier, prices, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('prices');
  // Estado persistente del background — no se borra al cerrar el diálogo
  const [bgState, setBgState] = useState(initBgState);

  const supplierPrices = prices.filter(p => p.supplier_id === supplier.id);
  const pricesActive = bgState.pricesRunning;
  const imagesActive = bgState.imagesRunning;

  return (
    <>
      {/* Botones inline en la cabecera del proveedor */}
      <div className="flex gap-1">
        <button
          onClick={e => { e.stopPropagation(); setTab('prices'); setOpen(true); }}
          title="Actualizar precios desde internet"
          className="relative p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Globe className="w-4 h-4" />
          {pricesActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setTab('images'); setOpen(true); }}
          title="Gestionar imágenes"
          className="relative p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          {imagesActive && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              {supplier.name} — Actualización online
              {(pricesActive || imagesActive) && (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" /> En curso
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTab('prices')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${tab === 'prices' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <Globe className="w-3.5 h-3.5" />
              Precios
              {pricesActive && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
            </button>
            <button
              onClick={() => setTab('images')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${tab === 'images' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Imágenes ({supplierPrices.filter(p => !p.image_url).length} sin imagen)
              {imagesActive && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
            </button>
          </div>

          {tab === 'prices' && (
            <OnlinePriceUpdatePanel
              supplier={supplier}
              prices={supplierPrices}
              onUpdated={() => { onUpdated && onUpdated(); }}
              bgState={bgState}
              setBgState={setBgState}
            />
          )}
          {tab === 'images' && (
            <BulkImagePanel
              supplier={supplier}
              prices={supplierPrices}
              onUpdated={() => { onUpdated && onUpdated(); }}
              bgState={bgState}
              setBgState={setBgState}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}