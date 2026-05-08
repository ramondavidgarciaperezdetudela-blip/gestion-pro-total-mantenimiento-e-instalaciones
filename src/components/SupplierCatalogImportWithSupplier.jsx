import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DownloadExcelTemplate from '@/components/DownloadExcelTemplate';

// ── Helpers para detección de columnas ───────────────────────────────────────
const ALIASES_CODE  = ['código', 'codigo', 'ref', 'referencia', 'sku', 'cod', 'art', 'articulo', 'id'];
const ALIASES_NAME  = ['descripción', 'descripcion', 'nombre', 'producto', 'articulo', 'denominacion', 'designacion', 'detalle', 'item'];
const ALIASES_PRICE = ['pvp', 'pvp €', 'precio', 'price', 'tarifa', 'importe', 'coste', 'cost', 'precio_neto', 'precio neto', 'venta', 'eur', '€', 'precio_pvp'];
const ALIASES_BRAND = ['marca', 'brand', 'fabricante', 'manufacturer'];
const ALIASES_UNIT  = ['unidad', 'unit', 'ud', 'um', 'medida'];

function normalize(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function findCol(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.findIndex(h => normalize(h).includes(normalize(alias)));
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Lee un Excel/CSV con SheetJS y devuelve array de {product_code, product_name, cost_price, brand, unit}.
 * Detecta automáticamente qué fila es la cabecera real (buscando la primera que tenga
 * al menos una celda que coincida con los alias de nombre o precio).
 */
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Convertir a array de arrays (raw)
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

        // Buscar la fila cabecera: primera fila donde alguna celda coincide con aliases de nombre o precio
        let headerRowIdx = 0;
        for (let r = 0; r < Math.min(20, raw.length); r++) {
          const row = raw[r].map(c => normalize(c));
          const hasName  = ALIASES_NAME.some(a => row.some(c => c.includes(normalize(a))));
          const hasPrice = ALIASES_PRICE.some(a => row.some(c => c.includes(normalize(a))));
          if (hasName || hasPrice) { headerRowIdx = r; break; }
        }

        const headers = raw[headerRowIdx].map(c => String(c));
        const iCode  = findCol(headers, ALIASES_CODE);
        const iName  = findCol(headers, ALIASES_NAME);
        const iPrice = findCol(headers, ALIASES_PRICE);
        const iBrand = findCol(headers, ALIASES_BRAND);
        const iUnit  = findCol(headers, ALIASES_UNIT);

        if (iName === -1 && iPrice === -1) {
          reject(new Error('No se encontraron columnas de descripción ni precio en el archivo. Comprueba el formato.'));
          return;
        }

        const items = [];
        for (let r = headerRowIdx + 1; r < raw.length; r++) {
          const row = raw[r];
          const name = iName !== -1 ? String(row[iName] || '').trim() : '';
          const priceRaw = iPrice !== -1 ? row[iPrice] : '';
          // Convertir precio: quitar símbolo € y coma decimal
          const priceNum = parseFloat(String(priceRaw).replace(/[€\s]/g, '').replace(',', '.'));

          // Saltar filas vacías, cabeceras secundarias o sin precio válido
          if (!name || name.length < 2) continue;
          if (isNaN(priceNum) || priceNum <= 0) continue;

          items.push({
            product_code: iCode  !== -1 ? String(row[iCode]  || '').trim() : '',
            product_name: name,
            cost_price:   priceNum,
            brand:        iBrand !== -1 ? String(row[iBrand] || '').trim() : '',
            unit:         iUnit  !== -1 ? String(row[iUnit]  || '').trim() : 'ud',
            category:     'material',
            notes:        '',
            image_url:    null,
          });
        }
        resolve(items);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SupplierCatalogImportWithSupplier({ suppliers = [], onImported }) {
  const [open, setOpen]           = useState(false);
  const [file, setFile]           = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [step, setStep]           = useState('idle');
  const [items, setItems]         = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError]         = useState(null);
  const [progress, setProgress]   = useState('');
  const [margin, setMargin]       = useState(30);
  const [applyIva, setApplyIva]   = useState(false); // Escoda ya incluye PVP con IVA
  const [ivaRate, setIvaRate]     = useState(21);
  const [fetchImages, setFetchImages] = useState(false); // opt-in porque son 64K productos
  const [page, setPage]           = useState(0);
  const PAGE_SIZE = 50;
  const fileRef = useRef(null);

  const reset = () => {
    setFile(null); setStep('idle'); setItems([]); setSelectedItems(new Set());
    setError(null); setProgress(''); setSupplierId(''); setPage(0);
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const isExcel = (f) => /\.(xlsx|xls|csv)$/i.test(f?.name || '');
  const isPdf   = (f) => /\.pdf$/i.test(f?.name || '');

  const handleExtract = async () => {
    if (!file || !supplierId) return;
    setError(null);
    setPage(0);

    try {
      let extracted = [];

      if (isExcel(file)) {
        // ── Excel/CSV: parse directo en el cliente con SheetJS ──────────────
        setStep('extracting');
        setProgress('Leyendo archivo localmente...');
        extracted = await parseExcel(file);

        // Aplicar IVA si el archivo trae precios sin IVA
        if (applyIva && ivaRate > 0) {
          extracted = extracted.map(item => ({
            ...item,
            cost_price: item.cost_price != null
              ? Math.round(item.cost_price * (1 + ivaRate / 100) * 100) / 100
              : null
          }));
        }
      } else if (isPdf(file)) {
        // ── PDF: subir y extraer con IA ─────────────────────────────────────
        setStep('uploading');
        setProgress('Subiendo PDF...');
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        setStep('extracting');
        setProgress('Analizando PDF con IA...');
        const ivaNote = applyIva
          ? `Los precios pueden estar SIN IVA. Extrae el precio tal como aparece.`
          : `Extrae el precio tal como aparece en el archivo.`;

        const result = await base44.integrations.Core.InvokeLLM({
          model: 'claude_sonnet_4_6',
          prompt: `Eres un experto en leer catálogos PDF de proveedores industriales españoles.
Analiza este catálogo del proveedor "${selectedSupplier?.name || ''}" y extrae TODOS los productos.
Para cada producto: product_name, product_code, brand, cost_price (número puro sin €), unit, category (clima/refrigeracion/electrico/solar/fontaneria/material/otro), notes.
${ivaNote}`,
          file_urls: [file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    product_name: { type: 'string' },
                    product_code: { type: 'string' },
                    brand: { type: 'string' },
                    cost_price: { type: 'number' },
                    unit: { type: 'string' },
                    category: { type: 'string' },
                    notes: { type: 'string' }
                  }
                }
              }
            }
          }
        });
        extracted = (result?.items || []).filter(i => i?.product_name && i.cost_price > 0);

        if (applyIva && ivaRate > 0) {
          extracted = extracted.map(item => ({
            ...item,
            cost_price: Math.round(item.cost_price * (1 + ivaRate / 100) * 100) / 100
          }));
        }
      }

      if (extracted.length === 0) {
        setError('No se pudieron extraer productos. Revisa que el archivo tenga datos válidos.');
        setStep('idle');
        return;
      }

      // ── Imágenes (opcional, en lotes de 5) ─────────────────────────────────
      if (fetchImages && extracted.length <= 500) {
        setStep('images');
        const withImages = [];
        const BATCH = 5;
        for (let i = 0; i < extracted.length; i += BATCH) {
          const batch = extracted.slice(i, i + BATCH);
          setProgress(`Descargando imágenes ${i + 1}–${Math.min(i + BATCH, extracted.length)} de ${extracted.length}...`);
          const results = await Promise.all(batch.map(async (item) => {
            try {
              const res = await base44.integrations.Core.InvokeLLM({
                prompt: `Busca la imagen oficial del producto: "${item.product_name}"${item.brand ? ` marca ${item.brand}` : ''}${item.product_code ? ` ref ${item.product_code}` : ''}. Devuelve solo la URL directa JPG/PNG o null si no encuentras nada fiable.`,
                add_context_from_internet: true,
                response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
              });
              return { ...item, image_url: res?.image_url || null };
            } catch {
              return { ...item, image_url: null };
            }
          }));
          withImages.push(...results);
          if (i + BATCH < extracted.length) await new Promise(r => setTimeout(r, 300));
        }
        setItems(withImages);
        setSelectedItems(new Set(withImages.map((_, i) => i)));
      } else {
        setItems(extracted);
        setSelectedItems(new Set(extracted.map((_, i) => i)));
      }

      setStep('preview');
      setProgress('');
    } catch (err) {
      setError('Error al procesar el archivo: ' + err.message);
      setStep('idle');
    }
  };

  const handleSave = async () => {
    setStep('saving');
    const toSave = items.filter((_, i) => selectedItems.has(i));
    let saved = 0;
    const SAVE_BATCH = 50;
    for (let i = 0; i < toSave.length; i += SAVE_BATCH) {
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

  const isProcessing = ['uploading', 'extracting', 'images', 'saving'].includes(step);

  // Paginación en preview
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  return (
    <>
      <Button
        onClick={() => { reset(); setOpen(true); }}
        className="gap-2 bg-purple-700 hover:bg-purple-800 text-white"
      >
        <FileSpreadsheet className="w-4 h-4" />
        Importar tarifa de proveedor
      </Button>

      <Dialog open={open} onOpenChange={o => { if (!isProcessing) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              Importar tarifa de proveedor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* ── Paso 1: Config ── */}
            {step === 'idle' && (
              <div className="space-y-4">
                {/* Proveedor */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">1. Selecciona el proveedor</label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige el proveedor..." />
                    </SelectTrigger>
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

                {/* Info plantilla */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">📋 Formatos aceptados</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      Excel (.xlsx, .xls), CSV y PDF. Para Excel, el sistema detecta automáticamente las columnas
                      aunque la primera fila sea una cabecera larga (como las tarifas de Escoda, Climaver, etc.).
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <DownloadExcelTemplate size="sm" />
                  </div>
                </div>

                {/* Zona de subida */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">2. Sube el archivo</label>
                  <div
                    className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700">Arrastra o haz clic para subir</p>
                    <p className="text-sm text-gray-400 mt-1">PDF, Excel (.xlsx, .xls) o CSV · cualquier tamaño</p>
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

                {/* IVA */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                  <label className="text-sm font-medium text-amber-800 block">3. ¿Los precios del archivo incluyen IVA?</label>
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
                        <option value={21}>21% (general)</option>
                        <option value={10}>10% (reducido)</option>
                        <option value={4}>4% (superreducido)</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Margen */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    4. Margen de venta: <span className="text-purple-700 font-bold">{margin}%</span>
                  </label>
                  <Input type="number" min="0" max="200" value={margin}
                    onChange={e => setMargin(parseInt(e.target.value) || 0)} className="w-32" />
                </div>

                {/* Imágenes automáticas */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={fetchImages} onChange={e => setFetchImages(e.target.checked)}
                      className="w-4 h-4 accent-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">📷 Descargar imágenes automáticamente (IA)</p>
                      <p className="text-xs text-gray-400">
                        Busca imágenes en internet para cada producto. Recomendado solo si importas menos de 500 productos
                        (tarifa completa de Escoda son 64.000, se añadirán sin imagen y puedes buscarlas una a una después).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ── Procesando ── */}
            {isProcessing && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                <p className="font-semibold text-purple-800">
                  {{ uploading: 'Subiendo archivo...', extracting: 'Extrayendo productos...', images: 'Descargando imágenes...', saving: 'Guardando en base de datos...' }[step]}
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
                    <p className="font-semibold text-gray-800">{items.length.toLocaleString()} productos extraídos</p>
                    <p className="text-xs text-purple-600">{selectedItems.size.toLocaleString()} seleccionados para guardar</p>
                    {applyIva && <p className="text-xs text-amber-600">IVA {ivaRate}% aplicado</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set(items.map((_, i) => i)))}>Todos</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())}>Ninguno</Button>
                  </div>
                </div>

                {/* Lista paginada */}
                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
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
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Anterior</Button>
                    <span className="text-gray-500">Página {page + 1} / {totalPages} ({items.length.toLocaleString()} productos)</span>
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}>Siguiente →</Button>
                  </div>
                )}

                <Button onClick={handleSave} disabled={selectedItems.size === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 text-base">
                  <CheckCircle className="w-4 h-4" />
                  Guardar {selectedItems.size.toLocaleString()} productos en tarifa de {selectedSupplier?.name}
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