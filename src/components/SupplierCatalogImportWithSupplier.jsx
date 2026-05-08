import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DownloadExcelTemplate from '@/components/DownloadExcelTemplate';

// ── Alias de columnas ─────────────────────────────────────────────────────────
const ALIASES_CODE  = ['código', 'codigo', 'ref', 'referencia', 'sku', 'cod', 'art', 'articulo', 'id'];
const ALIASES_NAME  = ['descripción', 'descripcion', 'nombre', 'producto', 'articulo', 'denominacion', 'designacion', 'detalle', 'item', 'concepto'];
const ALIASES_PRICE = ['pvp', 'pvp €', 'precio', 'price', 'tarifa', 'importe', 'coste', 'cost', 'precio_neto', 'precio neto', 'venta', 'eur', '€', 'precio_pvp'];
const ALIASES_BRAND = ['marca', 'brand', 'fabricante', 'manufacturer'];
const ALIASES_UNIT  = ['unidad', 'unit', 'ud', 'um', 'medida'];

function norm(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function findColInRow(row, aliases) {
  for (const alias of aliases) {
    const idx = row.findIndex(h => norm(h).includes(norm(alias)));
    if (idx !== -1) return idx;
  }
  return -1;
}

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const n = parseFloat(String(val).replace(/[€\s]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

/**
 * Parser robusto para Excel/CSV:
 * - Lee la hoja como array de arrays (raw:true para mantener números)
 * - Busca la fila de cabecera real entre las primeras 30 filas
 * - Soporta archivos tipo Escoda donde col 0 es código, col 1 descripción, col 2 precio
 */
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // raw:true → números como números (no strings)
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

        console.log('[Parser] Total filas:', raw.length);
        console.log('[Parser] Primeras 5 filas:', raw.slice(0, 5));

        // Buscar fila de cabecera: primera fila donde alguna celda coincide con alias de nombre o precio
        let hRow = -1;
        for (let r = 0; r < Math.min(30, raw.length); r++) {
          const cells = raw[r].map(c => norm(c));
          const hasName  = ALIASES_NAME.some(a => cells.some(c => c.includes(norm(a))));
          const hasPrice = ALIASES_PRICE.some(a => cells.some(c => c.includes(norm(a))));
          if (hasName || hasPrice) { hRow = r; break; }
        }

        let iCode = -1, iName = -1, iPrice = -1, iBrand = -1, iUnit = -1;

        if (hRow !== -1) {
          // Cabecera encontrada
          console.log('[Parser] Cabecera en fila', hRow, ':', raw[hRow]);
          const headers = raw[hRow].map(c => String(c));
          iCode  = findColInRow(headers, ALIASES_CODE);
          iName  = findColInRow(headers, ALIASES_NAME);
          iPrice = findColInRow(headers, ALIASES_PRICE);
          iBrand = findColInRow(headers, ALIASES_BRAND);
          iUnit  = findColInRow(headers, ALIASES_UNIT);
          console.log('[Parser] Columnas → código:', iCode, 'nombre:', iName, 'precio:', iPrice);
        } else {
          // Sin cabecera reconocida: heurística — buscar la primera fila de datos
          // con una celda string >3 chars y una celda numérica >0
          hRow = 0;
          for (let r = 0; r < Math.min(30, raw.length); r++) {
            const row = raw[r];
            const hasStr = row.some(c => typeof c === 'string' && c.trim().length > 3);
            const hasNum = row.some(c => typeof c === 'number' && c > 0);
            if (hasStr && hasNum) { hRow = r - 1; break; }
          }
          hRow = Math.max(0, hRow);
          // Detectar columnas por tipo: última columna numérica = precio, primera string = nombre
          const sampleRow = raw[hRow + 1] || raw[hRow];
          sampleRow.forEach((cell, idx) => {
            if (typeof cell === 'number' && cell > 0 && iPrice === -1) iPrice = idx;
          });
          // Columna nombre: la string más larga
          let maxLen = 0;
          sampleRow.forEach((cell, idx) => {
            if (typeof cell === 'string' && cell.length > maxLen) { maxLen = cell.length; iName = idx; }
          });
          // Columna código: primera string corta (<20 chars) antes del nombre
          sampleRow.forEach((cell, idx) => {
            if (idx !== iName && typeof cell === 'string' && cell.length <= 20 && iCode === -1) iCode = idx;
          });
          console.log('[Parser] Heurística → hRow:', hRow, 'nombre:', iName, 'precio:', iPrice, 'código:', iCode);
        }

        if (iName === -1 && iPrice === -1) {
          // Último recurso: col 0 = código, col 1 = nombre, col 2 = precio (formato Escoda típico)
          iCode = 0; iName = 1; iPrice = 2;
          hRow = Math.max(0, hRow);
          console.log('[Parser] Usando asignación fija: col0=código col1=nombre col2=precio');
        }

        const dataStart = hRow + 1;
        const items = [];
        for (let r = dataStart; r < raw.length; r++) {
          const row = raw[r];
          if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

          const name = iName !== -1 ? String(row[iName] || '').trim() : '';
          if (!name || name.length < 2) continue;
          // Filtrar filas que parecen subcabeceras
          if (ALIASES_NAME.some(a => norm(name) === norm(a))) continue;

          const price = iPrice !== -1 ? toNumber(row[iPrice]) : null;
          if (price === null || price <= 0) continue;

          items.push({
            product_code: iCode !== -1 ? String(row[iCode] || '').trim() : '',
            product_name: name,
            cost_price: price,
            brand: iBrand !== -1 ? String(row[iBrand] || '').trim() : '',
            unit: iUnit !== -1 ? String(row[iUnit] || '').trim() : 'ud',
            category: 'material',
            notes: '',
            image_url: null,
          });
        }

        console.log('[Parser] Productos extraídos:', items.length, 'primeros 3:', items.slice(0, 3));
        resolve(items);
      } catch (err) {
        console.error('[Parser] Error:', err);
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function SupplierCatalogImportWithSupplier({ suppliers = [], onImported }) {
  const [open, setOpen]               = useState(false);
  const [file, setFile]               = useState(null);
  const [supplierId, setSupplierId]   = useState('');
  const [step, setStep]               = useState('idle'); // idle|extracting|uploading|preview|images|saving|done
  const [items, setItems]             = useState([]);     // todos los productos (se actualiza en tiempo real al buscar imágenes)
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError]             = useState(null);
  const [progress, setProgress]       = useState('');
  const [margin, setMargin]           = useState(30);
  const [applyIva, setApplyIva]       = useState(false);
  const [ivaRate, setIvaRate]         = useState(21);
  const [fetchImages, setFetchImages] = useState(true);
  const [imgDone, setImgDone]         = useState(0);     // imágenes ya procesadas (para barra)
  const [imgTotal, setImgTotal]       = useState(0);     // total a procesar
  const [page, setPage]               = useState(0);
  const PAGE_SIZE = 50;
  const fileRef = useRef(null);
  const abortRef = useRef(false); // para cancelar descarga de imágenes si se cierra

  const reset = () => {
    abortRef.current = true;
    setFile(null); setStep('idle'); setItems([]); setSelectedItems(new Set());
    setError(null); setProgress(''); setSupplierId(''); setPage(0);
    setImgDone(0); setImgTotal(0);
    setTimeout(() => { abortRef.current = false; }, 100);
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const isExcel = (f) => /\.(xlsx|xls|csv)$/i.test(f?.name || '');
  const isPdf   = (f) => /\.pdf$/i.test(f?.name || '');

  const handleExtract = async () => {
    if (!file || !supplierId) return;
    setError(null); setPage(0); abortRef.current = false;

    try {
      let extracted = [];

      if (isExcel(file)) {
        setStep('extracting');
        setProgress('Leyendo archivo...');
        extracted = await parseExcel(file);

        if (applyIva && ivaRate > 0) {
          extracted = extracted.map(item => ({
            ...item,
            cost_price: item.cost_price != null
              ? Math.round(item.cost_price * (1 + ivaRate / 100) * 100) / 100
              : null
          }));
        }
      } else if (isPdf(file)) {
        setStep('uploading');
        setProgress('Subiendo PDF...');
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        setStep('extracting');
        setProgress('Analizando PDF con IA...');
        const result = await base44.integrations.Core.InvokeLLM({
          model: 'claude_sonnet_4_6',
          prompt: `Eres un experto en leer catálogos PDF de proveedores industriales españoles.
Analiza este catálogo del proveedor "${selectedSupplier?.name || ''}" y extrae TODOS los productos.
Para cada producto: product_name, product_code, brand, cost_price (número puro sin €), unit, category (clima/refrigeracion/electrico/solar/fontaneria/material/otro), notes.
${applyIva ? 'Los precios son netos sin IVA, extráelos tal como aparecen.' : 'Extrae el precio tal como aparece.'}`,
          file_urls: [file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    product_name: { type: 'string' }, product_code: { type: 'string' },
                    brand: { type: 'string' }, cost_price: { type: 'number' },
                    unit: { type: 'string' }, category: { type: 'string' }, notes: { type: 'string' }
                  }
                }
              }
            }
          }
        });
        extracted = (result?.items || []).filter(i => i?.product_name && i.cost_price > 0);
        if (applyIva && ivaRate > 0) {
          extracted = extracted.map(i => ({ ...i, cost_price: Math.round(i.cost_price * (1 + ivaRate / 100) * 100) / 100 }));
        }
      }

      if (extracted.length === 0) {
        setError('No se pudieron extraer productos. Comprueba el archivo o contacta con soporte.');
        setStep('idle');
        return;
      }

      // Mostrar preview inmediatamente
      setItems(extracted);
      setSelectedItems(new Set(extracted.map((_, i) => i)));
      setStep('preview');
      setProgress('');

      // Descargar imágenes en segundo plano si está activado
      if (fetchImages) {
        fetchImagesBackground(extracted);
      }
    } catch (err) {
      setError('Error al procesar el archivo: ' + err.message);
      setStep('idle');
    }
  };

  // Descarga imágenes en segundo plano y va actualizando el array de items
  const fetchImagesBackground = async (extracted) => {
    const total = extracted.length;
    setImgTotal(total);
    setImgDone(0);

    const result = [...extracted]; // copia mutable
    const BATCH = 5;
    let done = 0;

    for (let i = 0; i < total; i += BATCH) {
      if (abortRef.current) break;
      const batch = result.slice(i, i + BATCH);

      const batchResults = await Promise.all(batch.map(async (item, bi) => {
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `Busca la imagen oficial del producto: "${item.product_name}"${item.brand ? ` marca ${item.brand}` : ''}${item.product_code ? ` ref ${item.product_code}` : ''}. Devuelve solo la URL directa JPG/PNG. Si no encuentras nada fiable devuelve null.`,
            add_context_from_internet: true,
            response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
          });
          return { idx: i + bi, image_url: res?.image_url || null };
        } catch {
          return { idx: i + bi, image_url: null };
        }
      }));

      // Actualizar las URLs en el array y en el estado
      batchResults.forEach(({ idx, image_url }) => {
        if (idx < result.length) result[idx] = { ...result[idx], image_url };
      });
      done += batchResults.length;
      setImgDone(done);
      // Forzar re-render con el array actualizado
      setItems([...result]);

      if (i + BATCH < total) await new Promise(r => setTimeout(r, 200));
    }
  };

  const handleSave = async () => {
    setStep('saving');
    const toSave = items.filter((_, i) => selectedItems.has(i));
    let saved = 0;
    const SAVE_BATCH = 50;
    for (let i = 0; i < toSave.length; i += SAVE_BATCH) {
      if (abortRef.current) break;
      const batch = toSave.slice(i, i + SAVE_BATCH);
      await Promise.all(batch.map(item => {
        const costPrice = item.cost_price || 0;
        const salePrice = costPrice > 0 ? Math.round(costPrice * (1 + margin / 100) * 100) / 100 : 0;
        return base44.entities.SupplierPrice.create({
          supplier_id:   supplierId,
          supplier_name: selectedSupplier?.name || '',
          product_name:  item.product_name || 'Sin nombre',
          product_code:  item.product_code || '',
          cost_price:    costPrice,
          sale_price:    salePrice,
          margin:        costPrice > 0 ? margin : 0,
          unit:          item.unit || 'ud',
          category:      item.category || 'material',
          notes:         item.notes || '',
          image_url:     item.image_url || '',
          brand:         item.brand || '',
          is_active:     true,
        });
      }));
      saved += batch.length;
      setProgress(`Guardando ${saved}/${toSave.length}...`);
    }
    setStep('done');
    setProgress(`✅ ${saved} productos guardados en la tarifa de ${selectedSupplier?.name}`);
    onImported && onImported(saved);
  };

  const toggleItem = (i) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const isLoadingStep = ['uploading', 'extracting', 'saving'].includes(step);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);
  const imgPercent = imgTotal > 0 ? Math.round((imgDone / imgTotal) * 100) : 0;
  const imagesFetching = fetchImages && imgTotal > 0 && imgDone < imgTotal && step === 'preview';

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true); }} className="gap-2 bg-purple-700 hover:bg-purple-800 text-white">
        <FileSpreadsheet className="w-4 h-4" />
        Importar tarifa de proveedor
      </Button>

      <Dialog open={open} onOpenChange={o => { if (!isLoadingStep) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              Importar tarifa de proveedor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            {/* ── Config (idle) ── */}
            {step === 'idle' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">1. Selecciona el proveedor</label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder="Elige el proveedor..." /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.logo_url && <img src={s.logo_url} alt="" className="w-4 h-4 rounded inline mr-2" />}
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">📋 Formatos aceptados</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Excel (.xlsx, .xls), CSV y PDF. Detecta automáticamente las columnas aunque
                      haya cabeceras largas (tarifas de Escoda, Climaver, etc.).
                    </p>
                  </div>
                  <div className="flex-shrink-0"><DownloadExcelTemplate size="sm" /></div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">2. Sube el archivo</label>
                  <div className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                    onClick={() => fileRef.current?.click()}>
                    <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700">Arrastra o haz clic para subir</p>
                    <p className="text-sm text-gray-400 mt-1">PDF, Excel (.xlsx, .xls) o CSV</p>
                    {file && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                        <FileSpreadsheet className="w-4 h-4" /> {file.name}
                        {isExcel(file) && <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">parse local</Badge>}
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden"
                      onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setError(null); } }} />
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <label className="text-sm font-medium text-amber-800 block">3. ¿Los precios incluyen IVA?</label>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setApplyIva(false)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${!applyIva ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      ✅ Sí, ya incluyen IVA (PVP)
                    </button>
                    <button type="button" onClick={() => setApplyIva(true)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${applyIva ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                      ❌ No, son precios netos (sin IVA)
                    </button>
                  </div>
                  {applyIva && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-amber-700">Tipo IVA:</label>
                      <select value={ivaRate} onChange={e => setIvaRate(parseInt(e.target.value))}
                        className="text-sm border border-amber-300 rounded px-2 py-1 bg-white">
                        <option value={21}>21%</option>
                        <option value={10}>10%</option>
                        <option value={4}>4%</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    4. Margen de venta: <span className="text-purple-700 font-bold">{margin}%</span>
                  </label>
                  <Input type="number" min="0" max="200" value={margin}
                    onChange={e => setMargin(parseInt(e.target.value) || 0)} className="w-32" />
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={fetchImages} onChange={e => setFetchImages(e.target.checked)}
                      className="w-4 h-4 accent-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">📷 Descargar imágenes automáticamente</p>
                      <p className="text-xs text-gray-400">
                        Se descargan en segundo plano mientras revisas los productos. Para catálogos
                        grandes puede tardar mucho tiempo (1 imagen cada ~2 s).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ── Cargando ── */}
            {isLoadingStep && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                <p className="font-semibold text-purple-800">
                  {{ uploading: 'Subiendo archivo...', extracting: 'Extrayendo productos...', saving: 'Guardando en base de datos...' }[step]}
                </p>
                <p className="text-sm text-purple-600">{progress}</p>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* ── Botón extraer ── */}
            {step === 'idle' && file && supplierId && !error && (
              <Button onClick={handleExtract} className="w-full bg-purple-600 hover:bg-purple-700 gap-2 text-base">
                <FileSpreadsheet className="w-4 h-4" />
                {isExcel(file) ? 'Leer archivo e importar productos' : 'Extraer productos con IA'}
              </Button>
            )}

            {/* ── Preview ── */}
            {step === 'preview' && items.length > 0 && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{items.length.toLocaleString()} productos</p>
                    <p className="text-xs text-purple-600">{selectedItems.size.toLocaleString()} seleccionados</p>
                    {applyIva && <p className="text-xs text-amber-600">IVA {ivaRate}% aplicado</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set(items.map((_, i) => i)))}>Todos</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())}>Ninguno</Button>
                  </div>
                </div>

                {/* Barra de progreso de imágenes */}
                {fetchImages && imgTotal > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-blue-700">
                      <span>{imagesFetching ? '📷 Descargando imágenes en segundo plano...' : '✅ Imágenes descargadas'}</span>
                      <span>{imgDone.toLocaleString()} / {imgTotal.toLocaleString()} ({imgPercent}%)</span>
                    </div>
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${imgPercent}%` }} />
                    </div>
                    {imagesFetching && (
                      <p className="text-[10px] text-blue-500">
                        Puedes guardar los productos ya; las imágenes se seguirán descargando.
                      </p>
                    )}
                  </div>
                )}

                {/* Lista paginada */}
                <div className="space-y-1.5 max-h-[38vh] overflow-y-auto pr-1">
                  {pageItems.map((item, pi) => {
                    const realIdx = page * PAGE_SIZE + pi;
                    return (
                      <div key={realIdx} onClick={() => toggleItem(realIdx)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${selectedItems.has(realIdx) ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedItems.has(realIdx) ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                          {selectedItems.has(realIdx) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                          {item.image_url
                            ? <img src={item.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
                            : <ImageIcon className="w-4 h-4 text-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{item.product_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.brand && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{item.brand}</span>}
                            {item.product_code && <span className="text-[10px] text-gray-400 font-mono">{item.product_code}</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="font-bold text-sm text-gray-800">{item.cost_price != null ? `${Number(item.cost_price).toFixed(2)} €` : '—'}</p>
                          {item.cost_price > 0 && <p className="text-[10px] text-emerald-600">venta: {(item.cost_price * (1 + margin / 100)).toFixed(2)} €</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Ant.</Button>
                    <span className="text-gray-500">Pág. {page + 1}/{totalPages} · {items.length.toLocaleString()} productos</span>
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Sig. →</Button>
                  </div>
                )}

                <Button onClick={handleSave} disabled={selectedItems.size === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 text-base">
                  <CheckCircle className="w-4 h-4" />
                  Guardar {selectedItems.size.toLocaleString()} productos · {selectedSupplier?.name}
                </Button>
              </>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-bold text-emerald-800 text-lg">{progress}</p>
                <Button onClick={() => { setOpen(false); reset(); }} className="bg-emerald-600 hover:bg-emerald-700">Cerrar</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}