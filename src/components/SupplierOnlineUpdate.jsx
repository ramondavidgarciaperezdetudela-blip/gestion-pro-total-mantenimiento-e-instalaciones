import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { loadValidChars } from '@/components/ValidCharsConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Globe, RefreshCw, Image as ImageIcon, Loader2, CheckCircle, X,
  Upload, ExternalLink, MinusCircle, AlertTriangle, Edit2, Save, Search,
  Settings, Plus, Trash2, ArrowRight, Check
} from 'lucide-react';
import { toast } from 'sonner';

// ── Reglas de búsqueda de imágenes (localStorage) ────────────────────────────
const RULES_KEY = 'supplier_image_search_rules';

function loadRules() {
  try { return JSON.parse(localStorage.getItem(RULES_KEY) || '{"ignore":[],"replace":[]}'); }
  catch { return { ignore: [], replace: [] }; }
}

function saveRules(rules) {
  localStorage.setItem(RULES_KEY, JSON.stringify(rules));
}

// Aplica reglas al nombre antes de buscar imagen
function applyRulesToName(name, rules) {
  let result = name || '';
  // Primero reemplazar
  for (const r of (rules.replace || [])) {
    if (r.from && r.to !== undefined) {
      result = result.replace(new RegExp(r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), r.to);
    }
  }
  // Luego ignorar (quitar)
  for (const kw of (rules.ignore || [])) {
    if (kw) result = result.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
  }
  return result.replace(/\s+/g, ' ').trim();
}

// ── Utilidades ────────────────────────────────────────────────────────────────

// Reintento con backoff exponencial muy agresivo para rate limits
// onRetry(waitSec) se llama cuando va a esperar para que la UI pueda mostrarlo
async function withRetry(fn, maxRetries = 8, onRetry = null) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      const isRateLimit = msg.includes('rate limit') || msg.includes('rate_limit') ||
        msg.includes('too many') || msg.includes('429') || msg.includes('exceeded');
      const isServerError = msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('timeout');

      if ((isRateLimit || isServerError) && attempt < maxRetries) {
        // Backoff muy agresivo: 2s, 5s, 10s, 20s, 40s, 60s, 90s, 120s
        const waitMs = attempt === 0 ? 2000 : Math.min(2000 * Math.pow(1.8, attempt - 1), 120000);
        onRetry && onRetry(Math.round(waitMs / 1000));
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}

// Normaliza para búsqueda pero preserva letras griegas y símbolos técnicos
function normalizeName(str) {
  return String(str || '')
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

// Detecta si un nombre de producto tiene problemas: muy corto, solo números/símbolos,
// o mojibake (caracteres griegos/especiales/unicode válidos NO se marcan como error)
function detectNameIssues(name) {
  if (!name || name.trim().length < 3) return 'Nombre demasiado corto';
  if (/^[\d\s\-_./,]+$/.test(name)) return 'Solo contiene números o símbolos';
  // Solo detectar mojibake clásico (secuencias de reemplazo UTF-8 mal decodificadas)
  if (/[ÃÂ][\u0080-\u00BF]/.test(name) || /â€/.test(name)) return 'Posible codificación incorrecta (mojibake)';
  if (name.length > 300) return 'Nombre excesivamente largo';
  if (/^[A-Z0-9]{1,6}$/.test(name)) return 'Parece un código, no un nombre de producto';

  // Verificar caracteres no estándar contra la lista blanca configurada
  const validCharsConfig = loadValidChars();
  const allValidSpecial = [
    // Letras latinas básicas + dígitos + espacios + puntuación común siempre OK
  ];
  // Construir lista de todos los chars válidos configurados
  const configuredChars = new Set([
    ...validCharsConfig.activeGroups.flatMap(gid => {
      const GROUPS = {
        greek: 'αβγδεζηθικλμνξοπρστυφχψωΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ'.split(''),
        units: ['°','℃','℉','²','³','¹','½','¼','¾','⅓','⅔','µ','Ω','℧','∞','≈','≠','≤','≥','±','×','÷'],
        accented: 'áéíóúüñçÁÉÍÓÚÜÑÇàèìòùâêîôûäëïöÀÈÌÒÙÂÊÎÔÛÄËÏÖ'.split(''),
        punctuation: ['-','_','/','.','(',')','[',']','+','#','@','&','%','*','!','?',':',';',"'",'\"','~','|','\\','^','`','<','>'],
      };
      return GROUPS[gid] || [];
    }),
    ...(validCharsConfig.extraChars || []),
  ]);

  // Detectar caracteres fuera de rango básico que no estén en la lista blanca
  for (const char of name) {
    const code = char.charCodeAt(0);
    // Rango ASCII básico (32-126) siempre OK
    if (code >= 32 && code <= 126) continue;
    // Espacio, tabulador, etc.
    if (code < 32) continue;
    // Fuera de ASCII básico: verificar si está en lista blanca
    if (!configuredChars.has(char)) {
      return `Carácter no reconocido: "${char}" (configura en Ajustes > Caracteres)`;
    }
  }

  return null;
}

// ── Sección de avisos de nombres problemáticos ────────────────────────────────
function NameIssuesSection({ prices, onFixed, onSearchImage }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchingId, setSearchingId] = useState(null); // buscando imagen inline

  const problematic = useMemo(() =>
    prices.map(p => ({ ...p, issue: detectNameIssues(p.product_name) })).filter(p => p.issue),
    [prices]
  );

  if (problematic.length === 0) return null;

  const handleSaveAndSearch = async (item, nameToSave) => {
    if (!nameToSave.trim()) return;
    setSaving(true);
    await base44.entities.SupplierPrice.update(item.id, { product_name: nameToSave.trim() });
    onFixed && onFixed(item.id, nameToSave.trim());
    setEditingId(null);
    setSaving(false);
    toast.success('Nombre guardado, buscando imagen...');
    // Lanzar búsqueda de imagen
    setSearchingId(item.id);
    const result = await searchImageWithFallback({ ...item, product_name: nameToSave.trim() }, null).catch(() => null);
    setSearchingId(null);
    if (result?.image_url) {
      const updateData = { image_url: result.image_url };
      if (result.found_by_ref && result.suggested_name) { updateData.product_name = result.suggested_name; onFixed && onFixed(item.id, result.suggested_name); }
      await base44.entities.SupplierPrice.update(item.id, updateData);
      onSearchImage && onSearchImage(item.id, result.image_url);
      toast.success('¡Imagen encontrada y guardada!');
    } else {
      toast.info('Nombre guardado. No se encontró imagen.');
    }
  };

  // Confirmar nombre actual (está bien) y buscar imagen igualmente
  const handleConfirmAndSearch = async (item) => {
    setSearchingId(item.id);
    toast.info('Buscando imagen...');
    const result = await searchImageWithFallback(item, null).catch(() => null);
    setSearchingId(null);
    if (result?.image_url) {
      const updateData = { image_url: result.image_url };
      if (result.found_by_ref && result.suggested_name) { updateData.product_name = result.suggested_name; onFixed && onFixed(item.id, result.suggested_name); }
      await base44.entities.SupplierPrice.update(item.id, updateData);
      onSearchImage && onSearchImage(item.id, result.image_url);
      toast.success('¡Imagen encontrada y guardada!');
    } else {
      toast.info('No se encontró imagen para este producto');
    }
  };

  return (
    <div className="border border-orange-300 bg-orange-50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-100 border-b border-orange-200">
        <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
        <p className="text-sm font-semibold text-orange-800">
          {problematic.length} producto{problematic.length > 1 ? 's' : ''} con nombre incorrecto
        </p>
        <span className="text-xs text-orange-600 ml-auto">Edita o confirma para buscar imagen</span>
      </div>
      <div className="divide-y divide-orange-100 max-h-64 overflow-y-auto">
        {problematic.map((p) => (
          <div key={p.id} className="p-3 space-y-1.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 break-words">{p.product_name || '(vacío)'}</p>
                <p className="text-[10px] text-orange-600 mt-0.5">⚠ {p.issue}</p>
                {p.product_code && <p className="text-[10px] text-gray-400 font-mono">Ref: {p.product_code}</p>}
              </div>
              {editingId !== p.id && searchingId !== p.id && (
                <div className="flex gap-1 flex-shrink-0">
                  {/* Confirmar: el nombre está bien, buscar imagen igualmente */}
                  <button
                    onClick={() => handleConfirmAndSearch(p)}
                    className="flex items-center gap-0.5 text-[9px] px-1.5 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors whitespace-nowrap"
                    title="El nombre está bien — buscar imagen"
                  >
                    <Check className="w-3 h-3" /> OK
                  </button>
                  {/* Editar nombre */}
                  <button
                    onClick={() => { setEditingId(p.id); setEditValue(p.product_name || ''); }}
                    className="flex items-center gap-0.5 text-[9px] px-1.5 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors"
                    title="Editar nombre"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              {searchingId === p.id && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
              )}
            </div>
            {editingId === p.id && (
              <div className="space-y-1.5">
                <Input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="h-7 text-xs"
                  autoFocus
                  placeholder="Nuevo nombre del producto..."
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveAndSearch(p, editValue); if (e.key === 'Escape') setEditingId(null); }}
                />
                <div className="flex gap-1.5">
                  <Button size="sm" className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 gap-1 flex-1" onClick={() => handleSaveAndSearch(p, editValue)} disabled={saving || !editValue.trim()}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                    Guardar y buscar imagen
                  </Button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Panel de precios ──────────────────────────────────────────────────────────
function OnlinePriceUpdatePanel({ supplier, prices, onUpdated, onFixed, bgState, setBgState }) {
  const [margin, setMargin] = useState(30);
  const [batchSize] = useState(25);
  const stopRef = useRef(false);

  const running = bgState.pricesRunning;
  const progress = bgState.pricesProgress;
  const results = bgState.pricesResults;
  const retrying = bgState.pricesRetrying;

  const handleStart = async () => {
    if (prices.length === 0) { toast.info('No hay productos para actualizar'); return; }
    stopRef.current = false;
    setBgState(s => ({ ...s, pricesRunning: true, pricesProgress: { processed: 0, updated: 0, total: prices.length }, pricesResults: [] }));

    const totalBatches = Math.ceil(prices.length / batchSize);
    let totalUpdated = 0;
    const allResults = [];
    const PARALLEL_BATCHES = 2; // 2 lotes en paralelo

    for (let bi = 0; bi < totalBatches; bi += PARALLEL_BATCHES) {
      if (stopRef.current) break;
      
      // Procesar PARALLEL_BATCHES lotes en paralelo
      const parallelBatches = [];
      for (let pbi = 0; pbi < PARALLEL_BATCHES && bi + pbi < totalBatches; pbi++) {
        const batch = prices.slice((bi + pbi) * batchSize, (bi + pbi + 1) * batchSize);
        parallelBatches.push({
          batch,
          promise: withRetry(
            () => base44.functions.invoke('updateSupplierPricesOnline', {
              supplierId:     supplier.id,
              supplierName:   supplier.name,
              websiteUrl:     supplier.website || supplier.login_url || '',
              sampleProducts: batch.map(p => ({ product_code: p.product_code, product_name: p.product_name })),
              margin,
            }),
            8,
            () => setBgState(s => ({ ...s, pricesRetrying: true }))
          )
        });
      }

      // Esperar a que terminen todos
      const results = await Promise.allSettled(parallelBatches.map(pb => pb.promise));
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled') {
          const data = res.value.data || {};
          totalUpdated += data.updated || 0;
          if (data.products) allResults.push(...data.products);
        }
      });
      
      setBgState(s => ({ ...s, pricesRetrying: false }));

      const processed = Math.min((bi + PARALLEL_BATCHES) * batchSize, prices.length);
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

  const found = results.filter(r => r.found);
  const notFound = results.filter(r => !r.found);

  return (
    <div className="space-y-3">
      <NameIssuesSection prices={prices} onFixed={onFixed} onSearchImage={onUpdated} />

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">🌐 Actualización de precios desde internet</p>
        <p className="text-xs text-blue-600">
          La IA recorrerá <strong>todos los {prices.length} productos</strong> de <strong>{supplier.name}</strong> en lotes continuos.
          {supplier.website && (
            <> · <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="underline">{supplier.website}</a></>
          )}
        </p>
      </div>

      {!running && (
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 whitespace-nowrap">Margen venta (%):</label>
          <Input type="number" min="0" max="200" value={margin} onChange={e => setMargin(parseInt(e.target.value) || 0)} className="h-8 text-sm w-24" />
        </div>
      )}

      {running ? (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-blue-800 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando precios...
              </span>
              <span className="text-blue-600 font-mono text-xs font-bold">{progress.processed}/{progress.total} · {pct}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-blue-700 font-medium">
              <span>✅ {progress.updated} actualizados</span>
              <span className="text-gray-400 flex items-center gap-1"><MinusCircle className="w-3 h-3" /> Puedes cerrar, sigue en fondo</span>
            </div>
            {retrying && (
              <p className="text-[10px] text-orange-500 flex items-center gap-1 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Rate limit — esperando y reintentando automáticamente...
              </p>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleStop} className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50">
            Detener búsqueda
          </Button>
        </div>
      ) : (
        <Button onClick={handleStart} disabled={prices.length === 0} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
          <Globe className="w-4 h-4" /> Actualizar todos los precios ({prices.length} productos)
        </Button>
      )}

      {/* Resultado en dos columnas: encontrados | no encontrados */}
      {results.length > 0 && (
        <div className="space-y-2">
          {!running && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                <p className="font-bold text-blue-700 text-lg">{progress.processed}</p>
                <p className="text-blue-600">Buscados</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                <p className="font-bold text-emerald-700 text-lg">{progress.updated}</p>
                <p className="text-emerald-600">Actualizados</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <p className="font-bold text-gray-600 text-lg">{progress.total}</p>
                <p className="text-gray-500">Total</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {/* Columna izquierda: encontrados */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-emerald-50 px-2 py-1.5 border-b border-emerald-100">
                <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">✅ Actualizados ({found.length})</p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y">
                {found.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">—</p>}
                {found.map((p, i) => (
                  <div key={i} className="px-2 py-1.5 bg-white">
                    <p className="text-xs text-gray-800 font-medium leading-tight break-words">{p.product_name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {p.new_price && <span className="text-[10px] font-bold text-emerald-700">{Number(p.new_price).toFixed(2)} €</span>}
                      {p.source_url && (
                        <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="text-blue-400">
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna derecha: no encontrados */}
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-2 py-1.5 border-b border-gray-100">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">❌ Sin precio ({notFound.length})</p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y">
                {notFound.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">—</p>}
                {notFound.map((p, i) => (
                  <div key={i} className="px-2 py-1.5 bg-white">
                    <p className="text-xs text-gray-500 leading-tight break-words">{p.product_name}</p>
                    {p.product_code && <p className="text-[10px] text-gray-300">Ref: {p.product_code}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel de imágenes ─────────────────────────────────────────────────────────
// Busca imagen primero por nombre, si no encuentra intenta por referencia
// Devuelve { image_url, found_by_ref, suggested_name } o null
async function searchImageWithFallback(item, onRetry, rules = null) {
  const activeRules = rules || loadRules();
  const cleanName = normalizeName(applyRulesToName(item.product_name, activeRules));
  const cleanBrand = normalizeName(item.brand || '');

  // 1º intento: por nombre
  const byName = await withRetry(
    () => base44.integrations.Core.InvokeLLM({
      prompt: `Find the official product image URL for: "${cleanName}"${cleanBrand ? ` brand ${cleanBrand}` : ''}${item.product_code ? ` ref ${item.product_code}` : ''}. Return only a direct image URL (jpg/png/webp). If no reliable image exists, return null.`,
      add_context_from_internet: true,
      response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
    }),
    8, onRetry
  );

  if (byName?.image_url) return { image_url: byName.image_url, found_by_ref: false, suggested_name: null };

  // 2º intento: por referencia (solo si tiene product_code)
  if (!item.product_code) return null;

  const byRef = await withRetry(
    () => base44.integrations.Core.InvokeLLM({
      prompt: `Search by product reference code "${item.product_code}"${cleanBrand ? ` brand ${cleanBrand}` : ''}. Find: 1) the official product image URL (jpg/png/webp) and 2) the correct product name for this reference. If no image found, return null for image_url.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          image_url: { type: 'string' },
          product_name: { type: 'string' }
        }
      }
    }),
    8, onRetry
  );

  if (byRef?.image_url) {
    return {
      image_url: byRef.image_url,
      found_by_ref: true,
      suggested_name: byRef.product_name || null
    };
  }

  return null;
}

function BulkImagePanel({ supplier, prices, onUpdated, onFixed, bgState, setBgState }) {
  const [manualItem, setManualItem] = useState(null);
  const [manualUrl, setManualUrl] = useState('');
  const fileRef = useRef(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const stopRef = useRef(false);
  // Estado de edición de nombre inline en la columna "sin imagen"
  const [editingRefId, setEditingRefId] = useState(null);
  const [editingRefValue, setEditingRefValue] = useState('');
  const [retryingRef, setRetryingRef] = useState(null); // id del que está buscando imagen tras editar nombre

  const withoutImage = prices.filter(p => !p.image_url);
  const running = bgState.imagesRunning;
  const results = bgState.imagesResults;
  const found = bgState.imagesFound;
  const processed = bgState.imagesProcessed;
  const retrying = bgState.imagesRetrying;

  const handleFetchImages = async () => {
    if (withoutImage.length === 0) { toast.info('Todos los productos ya tienen imagen'); return; }
    stopRef.current = false;
    const initial = withoutImage.map(item => ({ item, ok: false, pending: true, found_by_ref: false }));
    setBgState(s => ({ ...s, imagesRunning: true, imagesRetrying: false, imagesResults: initial, imagesFound: 0, imagesProcessed: 0 }));

    let foundCount = 0;
    const PARALLEL = 3;

    for (let i = 0; i < withoutImage.length; i += PARALLEL) {
      if (stopRef.current) break;
      const batch = withoutImage.slice(i, Math.min(i + PARALLEL, withoutImage.length));

      const batchResults = await Promise.allSettled(
        batch.map(item => searchImageWithFallback(item, () => setBgState(s => ({ ...s, imagesRetrying: true }))))
      );

      // Guardar imagen y nombre (si encontrado por ref) en paralelo
      await Promise.allSettled(
        batchResults.map((res, idx) => {
          const item = batch[idx];
          const result = res.status === 'fulfilled' ? res.value : null;
          if (!result?.image_url) return Promise.resolve();
          const updateData = { image_url: result.image_url };
          if (result.found_by_ref && result.suggested_name) {
            updateData.product_name = result.suggested_name;
          }
          return base44.entities.SupplierPrice.update(item.id, updateData).then(() => {
            if (result.found_by_ref && result.suggested_name) {
              onFixed && onFixed(item.id, result.suggested_name);
            }
          });
        })
      );

      batchResults.forEach((res) => {
        if (res.status === 'fulfilled' && res.value?.image_url) foundCount++;
      });

      setBgState(s => ({
        ...s,
        imagesRetrying: false,
        imagesFound: foundCount,
        imagesProcessed: Math.min(i + PARALLEL, withoutImage.length),
        imagesResults: s.imagesResults.map(r => {
          const batchIdx = batch.findIndex(item => item.id === r.item.id);
          if (batchIdx === -1) return r;
          const res = batchResults[batchIdx];
          const result = res.status === 'fulfilled' ? res.value : null;
          const updatedItem = (result?.found_by_ref && result?.suggested_name)
            ? { ...r.item, product_name: result.suggested_name }
            : r.item;
          return { item: updatedItem, image_url: result?.image_url || null, ok: !!result?.image_url, pending: false, found_by_ref: result?.found_by_ref || false };
        }),
      }));
    }

    setBgState(s => ({ ...s, imagesRunning: false }));
    onUpdated && onUpdated();
    toast.success(`✅ Imágenes actualizadas: ${foundCount} de ${withoutImage.length} productos`, { duration: 5000 });
  };

  const handleStop = () => { stopRef.current = true; };

  // Buscar imagen de nuevo tras editar nombre en la columna "sin imagen"
  const handleRetryWithNewName = async (r, newName) => {
    const newItem = { ...r.item, product_name: newName };
    // Guardar nombre primero
    await base44.entities.SupplierPrice.update(r.item.id, { product_name: newName });
    onFixed && onFixed(r.item.id, newName);
    setEditingRefId(null);
    setRetryingRef(r.item.id);

    // Actualizar item localmente
    setBgState(s => ({
      ...s,
      imagesResults: s.imagesResults.map(x => x.item.id === r.item.id ? { ...x, item: newItem } : x),
    }));

    // Buscar imagen con el nuevo nombre
    const result = await searchImageWithFallback(newItem, null).catch(() => null);
    setRetryingRef(null);

    if (result?.image_url) {
      const updateData = { image_url: result.image_url };
      if (result.found_by_ref && result.suggested_name) updateData.product_name = result.suggested_name;
      await base44.entities.SupplierPrice.update(r.item.id, updateData);
      if (result.found_by_ref && result.suggested_name) onFixed && onFixed(r.item.id, result.suggested_name);
      setBgState(s => ({
        ...s,
        imagesFound: s.imagesFound + 1,
        imagesResults: s.imagesResults.map(x => x.item.id === r.item.id
          ? { ...x, image_url: result.image_url, ok: true, found_by_ref: result.found_by_ref,
              item: result.found_by_ref && result.suggested_name ? { ...x.item, product_name: result.suggested_name } : x.item }
          : x
        ),
      }));
      onUpdated && onUpdated();
      toast.success('¡Imagen encontrada!');
    } else {
      toast.info('No se encontró imagen con el nuevo nombre');
    }
  };

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

  const pct = withoutImage.length > 0 ? Math.round(processed / withoutImage.length * 100) : 0;
  const okResults = results.filter(r => !r.pending && r.ok);
  const failResults = results.filter(r => !r.pending && !r.ok);
  const pendingCount = results.filter(r => r.pending).length;

  return (
    <div className="space-y-3">
      <NameIssuesSection prices={prices} onFixed={onFixed} onSearchImage={onUpdated} />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
        <p className="font-semibold mb-0.5">🖼️ Descarga automática de imágenes</p>
        <p className="text-xs text-amber-600">
          {withoutImage.length} de {prices.length} productos sin imagen. Busca primero por nombre y luego por referencia. Se guardan al instante.
        </p>
      </div>

      {running ? (
        <div className="space-y-2">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-amber-800 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Buscando imágenes...
              </span>
              <span className="text-amber-700 font-mono text-xs font-bold">{processed}/{withoutImage.length} · {pct}%</span>
            </div>
            <div className="w-full bg-amber-200 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-amber-700 font-medium">
              <span>✅ {found} encontradas · ❌ {processed - found} sin imagen · ⏳ {pendingCount} pendientes</span>
            </div>
            {retrying && (
              <p className="text-[10px] text-orange-500 flex items-center gap-1 font-medium">
                <Loader2 className="w-3 h-3 animate-spin" /> Rate limit — esperando y reintentando automáticamente...
              </p>
            )}
            <p className="text-[10px] text-gray-400 flex items-center gap-1"><MinusCircle className="w-3 h-3" /> Puedes cerrar, sigue en fondo</p>
          </div>
          <Button size="sm" variant="outline" onClick={handleStop} className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50">
            Detener búsqueda
          </Button>
        </div>
      ) : (
        <Button onClick={handleFetchImages} disabled={withoutImage.length === 0} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
          <ImageIcon className="w-4 h-4" /> Buscar imágenes automáticamente ({withoutImage.length})
        </Button>
      )}

      {/* Resumen final */}
      {!running && results.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2">
            <p className="font-bold text-emerald-700 text-lg">{found}</p>
            <p className="text-emerald-600">Encontradas</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
            <p className="font-bold text-orange-700 text-lg">{failResults.length}</p>
            <p className="text-orange-600">Sin imagen</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <p className="font-bold text-gray-600 text-lg">{results.length}</p>
            <p className="text-gray-500">Total</p>
          </div>
        </div>
      )}

      {/* Lista en dos columnas: con imagen | sin imagen */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {/* Con imagen */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-emerald-50 px-2 py-1.5 border-b border-emerald-100">
              <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">✅ Con imagen ({okResults.length})</p>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {okResults.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">—</p>}
              {okResults.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 bg-white">
                  <div className="w-7 h-7 rounded border bg-gray-50 flex-shrink-0 overflow-hidden">
                    {r.image_url
                      ? <img src={r.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
                      : <ImageIcon className="w-3 h-3 text-gray-300 m-auto mt-1.5" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 leading-tight break-words">{r.item.product_name}</p>
                    {r.found_by_ref && <p className="text-[9px] text-blue-500">📎 encontrado por referencia</p>}
                  </div>
                </div>
              ))}
              {results.filter(r => r.pending).map((r, i) => (
                <div key={`p${i}`} className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 opacity-50">
                  <Loader2 className="w-3 h-3 text-gray-300 animate-spin flex-shrink-0" />
                  <p className="text-xs text-gray-400 leading-tight truncate">{r.item.product_name}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sin imagen — con edición de nombre y referencia */}
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-orange-50 px-2 py-1.5 border-b border-orange-100">
              <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">❌ Sin imagen ({failResults.length})</p>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y">
              {failResults.length === 0 && <p className="text-xs text-gray-400 p-3 text-center">—</p>}
              {failResults.map((r, i) => (
                <div key={i} className="px-2 py-2 bg-white space-y-1.5">
                  {/* Nombre + referencia */}
                  {editingRefId === r.item.id ? (
                    <div className="flex gap-1">
                      <Input
                        value={editingRefValue}
                        onChange={e => setEditingRefValue(e.target.value)}
                        className="h-6 text-[10px] flex-1 px-1.5"
                        autoFocus
                        placeholder="Nuevo nombre..."
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRetryWithNewName(r, editingRefValue);
                          if (e.key === 'Escape') setEditingRefId(null);
                        }}
                      />
                      <button
                        onClick={() => handleRetryWithNewName(r, editingRefValue)}
                        disabled={!editingRefValue.trim()}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 whitespace-nowrap"
                      >
                        Buscar
                      </button>
                      <button onClick={() => setEditingRefId(null)} className="text-gray-400 hover:text-gray-600 text-[10px] px-0.5">✕</button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-gray-700 leading-tight break-words font-medium">{r.item.product_name}</p>
                        {r.item.product_code && (
                          <p className="text-[9px] text-gray-400 font-mono mt-0.5">Ref: {r.item.product_code}</p>
                        )}
                      </div>
                      {retryingRef === r.item.id ? (
                        <Loader2 className="w-3 h-3 text-blue-400 animate-spin flex-shrink-0 mt-0.5" />
                      ) : (
                        <button
                          onClick={() => { setEditingRefId(r.item.id); setEditingRefValue(r.item.product_name || ''); }}
                          className="flex-shrink-0 p-0.5 text-gray-300 hover:text-blue-500 transition-colors"
                          title="Editar nombre y buscar imagen"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                  {/* Acciones */}
                  {editingRefId !== r.item.id && retryingRef !== r.item.id && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setManualItem(r.item); setManualUrl(''); }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 whitespace-nowrap"
                      >
                        + Subir
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subida manual inline */}
      {manualItem && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-orange-800 break-words">Subir imagen: {manualItem.product_name}</p>
          <div className="flex gap-2">
            <Input placeholder="Pega URL de imagen..." value={manualUrl} onChange={e => setManualUrl(e.target.value)} className="text-xs h-8 flex-1" />
            <Button size="sm" disabled={!manualUrl} onClick={handleManualUrl} className="h-8 bg-orange-600 hover:bg-orange-700 text-xs flex-shrink-0">Guardar</Button>
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

// ── Panel de configuración de reglas ─────────────────────────────────────────
function ImageSearchRulesPanel() {
  const [rules, setRules] = useState(loadRules);
  const [newIgnore, setNewIgnore] = useState('');
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');

  const persist = (updated) => { setRules(updated); saveRules(updated); };

  const addIgnore = () => {
    const kw = newIgnore.trim();
    if (!kw || rules.ignore.includes(kw)) return;
    persist({ ...rules, ignore: [...rules.ignore, kw] });
    setNewIgnore('');
    toast.success(`Palabra ignorada: "${kw}"`);
  };

  const removeIgnore = (kw) => persist({ ...rules, ignore: rules.ignore.filter(k => k !== kw) });

  const addReplace = () => {
    const from = newFrom.trim();
    const to = newTo.trim();
    if (!from) return;
    persist({ ...rules, replace: [...rules.replace, { from, to }] });
    setNewFrom(''); setNewTo('');
    toast.success(`Regla añadida: "${from}" → "${to || '(eliminar)'}"`);
  };

  const removeReplace = (i) => persist({ ...rules, replace: rules.replace.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-800 mb-1">⚙️ Reglas de búsqueda de imágenes</p>
        <p>Estas reglas se aplican al nombre del producto <strong>antes</strong> de buscar su imagen. Útil para eliminar códigos internos, prefijos de proveedor, etc.</p>
      </div>

      {/* Palabras a ignorar */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">🚫 Palabras/frases a ignorar al buscar</p>
        <div className="flex gap-2 mb-2">
          <Input
            value={newIgnore}
            onChange={e => setNewIgnore(e.target.value)}
            placeholder='Ej: "PACK", "Kit.", "Código:"...'
            className="h-8 text-xs flex-1"
            onKeyDown={e => e.key === 'Enter' && addIgnore()}
          />
          <Button size="sm" className="h-8 px-3 text-xs gap-1 bg-slate-700 hover:bg-slate-800" onClick={addIgnore} disabled={!newIgnore.trim()}>
            <Plus className="w-3 h-3" /> Añadir
          </Button>
        </div>
        {rules.ignore.length === 0
          ? <p className="text-[10px] text-gray-400 italic">Sin reglas de ignorar</p>
          : <div className="flex flex-wrap gap-1.5">
              {rules.ignore.map((kw, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 text-[10px] px-2 py-0.5 rounded-full">
                  {kw}
                  <button onClick={() => removeIgnore(kw)} className="hover:text-red-900"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
        }
      </div>

      {/* Reglas de reemplazo */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">🔄 Reemplazar texto al buscar</p>
        <div className="flex gap-2 mb-2 items-center">
          <Input value={newFrom} onChange={e => setNewFrom(e.target.value)} placeholder='Buscar: "R32"' className="h-8 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && addReplace()} />
          <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <Input value={newTo} onChange={e => setNewTo(e.target.value)} placeholder='Por: "R-32" (vacío=eliminar)' className="h-8 text-xs flex-1" onKeyDown={e => e.key === 'Enter' && addReplace()} />
          <Button size="sm" className="h-8 px-3 text-xs gap-1 bg-slate-700 hover:bg-slate-800" onClick={addReplace} disabled={!newFrom.trim()}>
            <Plus className="w-3 h-3" /> Añadir
          </Button>
        </div>
        {rules.replace.length === 0
          ? <p className="text-[10px] text-gray-400 italic">Sin reglas de reemplazo</p>
          : <div className="space-y-1">
              {rules.replace.map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-[10px]">
                  <span className="font-mono text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{r.from}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">{r.to || '(eliminar)'}</span>
                  <button onClick={() => removeReplace(i)} className="ml-auto text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
        }
      </div>

      {(rules.ignore.length > 0 || rules.replace.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-[10px] text-amber-700">
          <strong>Vista previa:</strong> Ejemplo con reglas activas: el nombre original se transforma antes de enviar a la búsqueda.
          Las reglas se guardan localmente en este navegador.
        </div>
      )}
    </div>
  );
}

// ── Estado inicial de background ──────────────────────────────────────────────
const initBgState = () => ({
  pricesRunning: false,
  pricesRetrying: false,
  pricesProgress: { processed: 0, updated: 0, total: 0 },
  pricesResults: [],
  imagesRunning: false,
  imagesRetrying: false,
  imagesResults: [],
  imagesFound: 0,
  imagesProcessed: 0,
});

// ── Componente principal ──────────────────────────────────────────────────────
export default function SupplierOnlineUpdate({ supplier, prices, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('prices');
  const [bgState, setBgState] = useState(initBgState);
  const [rules] = useState(loadRules);
  // Copia local de precios para reflejar correcciones de nombre inline
  const [localPrices, setLocalPrices] = useState(null);

  const supplierPrices = localPrices ?? prices.filter(p => p.supplier_id === supplier.id);
  const pricesActive = bgState.pricesRunning;
  const imagesActive = bgState.imagesRunning;

  // Reset local prices cuando cambian los precios externos (nueva carga)
  React.useEffect(() => { setLocalPrices(null); }, [prices]);

  const handleFixed = (id, newName) => {
    setLocalPrices(prev => {
      const base = prev ?? prices.filter(p => p.supplier_id === supplier.id);
      return base.map(p => p.id === id ? { ...p, product_name: newName } : p);
    });
  };

  const problematicCount = useMemo(() =>
    supplierPrices.filter(p => detectNameIssues(p.product_name)).length,
    [supplierPrices]
  );

  return (
    <>
      <div className="flex gap-1">
        <button
          onClick={e => { e.stopPropagation(); setTab('prices'); setOpen(true); }}
          title="Actualizar precios desde internet"
          className="relative p-1.5 rounded-lg text-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Globe className="w-4 h-4" />
          {pricesActive && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
        </button>
        <button
          onClick={e => { e.stopPropagation(); setTab('images'); setOpen(true); }}
          title="Gestionar imágenes"
          className="relative p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          {imagesActive && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />}
        </button>
        {problematicCount > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setTab('prices'); setOpen(true); }}
            title={`${problematicCount} productos con nombres problemáticos`}
            className="p-1.5 rounded-lg text-orange-500 hover:text-orange-700 hover:bg-orange-50 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl w-[97vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">{supplier.name} — Actualización online</span>
              {problematicCount > 0 && (
                <span className="flex items-center gap-1 text-xs font-normal text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" /> {problematicCount} nombres incorrectos
                </span>
              )}
              {(pricesActive || imagesActive) && (
                <span className="flex items-center gap-1 text-xs font-normal text-blue-600 ml-auto">
                  <Loader2 className="w-3 h-3 animate-spin" /> En curso
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTab('prices')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-colors ${tab === 'prices' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              <Globe className="w-3.5 h-3.5" /> Precios
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
            <button
              onClick={() => setTab('config')}
              className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${tab === 'config' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              title="Configuración de reglas"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          {tab === 'prices' && (
            <OnlinePriceUpdatePanel
              supplier={supplier}
              prices={supplierPrices}
              onUpdated={() => { onUpdated && onUpdated(); }}
              onFixed={handleFixed}
              bgState={bgState}
              setBgState={setBgState}
            />
          )}
          {tab === 'images' && (
            <BulkImagePanel
              supplier={supplier}
              prices={supplierPrices}
              onUpdated={() => { onUpdated && onUpdated(); }}
              onFixed={handleFixed}
              bgState={bgState}
              setBgState={setBgState}
            />
          )}
          {tab === 'config' && <ImageSearchRulesPanel />}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Export detectNameIssues so it can be used by the parent if needed
export { detectNameIssues };