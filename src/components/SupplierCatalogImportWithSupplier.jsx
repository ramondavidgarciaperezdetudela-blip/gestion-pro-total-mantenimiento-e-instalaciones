import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Importa un PDF/Excel de proveedor, extrae productos con IA,
 * descarga imágenes automáticamente y guarda en SupplierPrice vinculado al proveedor.
 */
export default function SupplierCatalogImportWithSupplier({ suppliers = [], onImported }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [step, setStep] = useState('idle');
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const [margin, setMargin] = useState(30);
  const fileRef = useRef(null);

  const reset = () => {
    setFile(null); setStep('idle'); setItems([]); setSelectedItems(new Set()); setError(null); setProgress(''); setSupplierId('');
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);

  const isExcel = (f) => /\.(xlsx|xls|csv)$/i.test(f?.name || '');

  const handleExtract = async () => {
    if (!file || !supplierId) return;
    setError(null);
    try {
      // 1. Subir fichero
      setStep('uploading');
      setProgress('Subiendo archivo...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Extraer con IA
      setStep('extracting');
      setProgress('Analizando catálogo con IA...');

      let extracted = [];

      if (isExcel(file)) {
        // Excel/CSV: leer estructura directamente
        setProgress('Leyendo estructura del Excel...');
        const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url,
          json_schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    product_name: { type: 'string', description: 'Nombre del producto o material' },
                    product_code: { type: 'string', description: 'Código o referencia del proveedor' },
                    brand: { type: 'string', description: 'Marca del producto' },
                    cost_price: { type: 'number', description: 'Precio de coste en euros' },
                    unit: { type: 'string', description: 'Unidad de medida: ud, m, m2, kg, l, etc.' },
                    category: { type: 'string', description: 'clima, refrigeracion, electrico, solar, fontaneria, material, otro' },
                    notes: { type: 'string', description: 'Notas técnicas del producto' }
                  }
                }
              }
            }
          }
        });

        if (extractResult?.status === 'success') {
          const raw = extractResult.output;
          extracted = Array.isArray(raw) ? raw : (raw?.items || []);
        }

        // Fallback: si no funciona, usar IA con claude que puede leer Excel
        if (extracted.length === 0) {
          setProgress('Interpretando con IA avanzada...');
          const fallback = await base44.integrations.Core.InvokeLLM({
            model: 'claude_sonnet_4_6',
            prompt: `Lee este archivo Excel/CSV de lista de precios del proveedor "${selectedSupplier?.name || ''}". Extrae TODOS los productos con: product_name (nombre), product_code (referencia), brand (marca), cost_price (precio coste en €), unit (unidad), category (clima/refrigeracion/electrico/solar/fontaneria/material/otro), notes (descripción técnica). Extrae TODAS las filas de productos sin omitir ninguna. Archivo: ${file_url}`,
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
          extracted = fallback?.items || [];
        }
      } else {
        // PDF: IA con file_urls
        setProgress('Analizando PDF con IA...');
        const result = await base44.integrations.Core.InvokeLLM({
          model: 'claude_sonnet_4_6',
          prompt: `Analiza este catálogo PDF del proveedor "${selectedSupplier?.name || ''}". Extrae TODOS los productos: product_name (nombre completo), product_code (referencia), brand (marca), cost_price (precio coste en €), unit (unidad de medida), category (clima/refrigeracion/electrico/solar/fontaneria/material/otro), notes (info técnica, máx 100 chars). Sé exhaustivo.`,
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
        extracted = result?.items || [];
      }

      // Filtrar filas sin nombre de producto
      extracted = extracted.filter(i => i?.product_name && String(i.product_name).trim().length > 1);

      if (extracted.length === 0) {
        setError('No se pudieron extraer productos. Comprueba que el archivo tiene filas con nombre de producto y precio.');
        setStep('idle');
        return;
      }

      // 3. Buscar imágenes en lotes de 5 para evitar rate limit
      setStep('images');
      const withImages = [];
      const BATCH = 5;
      for (let i = 0; i < extracted.length; i += BATCH) {
        const batch = extracted.slice(i, i + BATCH);
        setProgress(`Descargando imágenes ${i + 1}–${Math.min(i + BATCH, extracted.length)} de ${extracted.length}...`);
        const batchResults = await Promise.all(batch.map(async (item) => {
          try {
            const imgResult = await base44.integrations.Core.InvokeLLM({
              prompt: `Busca la imagen oficial del producto: "${item.product_name}"${item.brand ? ` marca ${item.brand}` : ''}${item.product_code ? ` ref ${item.product_code}` : ''}. Devuelve solo la URL directa de imagen JPG/PNG. Si no encuentras una imagen fiable, devuelve null.`,
              add_context_from_internet: true,
              response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
            });
            return { ...item, image_url: imgResult?.image_url || null };
          } catch {
            return { ...item, image_url: null };
          }
        }));
        withImages.push(...batchResults);
        // Pequeña pausa entre lotes para evitar rate limit
        if (i + BATCH < extracted.length) await new Promise(r => setTimeout(r, 300));
      }

      setItems(withImages);
      setSelectedItems(new Set(withImages.map((_, i) => i)));
      setStep('preview');
      setProgress('');
    } catch (err) {
      setError('Error al procesar el archivo: ' + err.message);
      setStep('idle');
    }
  };

  const handleSave = async () => {
    setStep('saving');
    setProgress('Guardando en base de datos...');
    const toSave = items.filter((_, i) => selectedItems.has(i));
    let saved = 0;
    for (const item of toSave) {
      const costPrice = item.cost_price || 0;
      const salePrice = costPrice > 0 ? Math.round(costPrice * (1 + margin / 100) * 100) / 100 : 0;
      await base44.entities.SupplierPrice.create({
        supplier_id: supplierId,
        supplier_name: selectedSupplier?.name || '',
        product_name: item.product_name || 'Sin nombre',
        product_code: item.product_code || '',
        cost_price: costPrice,
        sale_price: salePrice,
        margin: costPrice > 0 ? margin : 0,
        unit: item.unit || 'ud',
        category: item.category || 'material',
        notes: item.notes || '',
        image_url: item.image_url || '',
        brand: item.brand || '',
        is_active: true,
      });
      saved++;
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
              Importar tarifa de proveedor (PDF / Excel)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Paso 1: seleccionar proveedor + archivo */}
            {(step === 'idle' || step === 'preview') && step !== 'preview' && (
              <div className="space-y-3">
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

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">2. Sube el catálogo</label>
                  <div
                    className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700">Arrastra o haz clic para subir</p>
                    <p className="text-sm text-gray-400 mt-1">PDF, Excel (.xlsx, .xls) o CSV</p>
                    {file && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                        <FileSpreadsheet className="w-4 h-4" /> {file.name}
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setStep('idle'); setError(null); } }} />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">3. Margen de venta por defecto: <span className="text-purple-700 font-bold">{margin}%</span></label>
                  <Input type="number" min="0" max="200" value={margin} onChange={e => setMargin(parseInt(e.target.value) || 0)} className="w-32" />
                  <p className="text-xs text-gray-400 mt-1">Precio venta = precio coste × (1 + margen%)</p>
                </div>
              </div>
            )}

            {/* Procesando */}
            {isProcessing && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                <p className="font-semibold text-purple-800">
                  {{ uploading: 'Subiendo archivo...', extracting: 'Extrayendo productos con IA...', images: 'Descargando imágenes...', saving: 'Guardando...' }[step]}
                </p>
                <p className="text-sm text-purple-600">{progress}</p>
                {step === 'images' && <p className="text-xs text-purple-400">Las imágenes se descargan en lotes para mayor estabilidad</p>}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Botón extraer */}
            {step === 'idle' && file && supplierId && !error && (
              <Button onClick={handleExtract} className="w-full bg-purple-600 hover:bg-purple-700 gap-2 text-base">
                <FileSpreadsheet className="w-4 h-4" />
                Extraer todos los productos con IA + imágenes
              </Button>
            )}

            {/* Preview */}
            {step === 'preview' && items.length > 0 && (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{items.length} productos extraídos</p>
                    <p className="text-xs text-purple-600">{selectedItems.size} seleccionados para guardar</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set(items.map((_, i) => i)))}>Todos</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())}>Ninguno</Button>
                  </div>
                </div>

                <div className="max-h-[45vh] overflow-y-auto space-y-2 pr-1">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => toggleItem(i)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedItems.has(i) ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedItems.has(i) ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                        {selectedItems.has(i) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="w-12 h-12 flex-shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                        {item.image_url
                          ? <img src={item.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display = 'none'; }} />
                          : <ImageIcon className="w-5 h-5 text-gray-300" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{item.product_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.brand && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{item.brand}</span>}
                          {item.product_code && <span className="text-[10px] text-gray-400 font-mono">Ref: {item.product_code}</span>}
                          <Badge variant="outline" className="text-[9px] py-0">{item.category || 'material'}</Badge>
                          {item.image_url && <span className="text-[10px] text-green-600">📷 imagen</span>}
                        </div>
                        {item.notes && <p className="text-[10px] text-gray-400 truncate">{item.notes}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-base text-gray-800">{item.cost_price != null ? `${Number(item.cost_price).toFixed(2)} €` : '—'}</p>
                        {item.cost_price > 0 && <p className="text-[10px] text-emerald-600">venta: {(item.cost_price * (1 + margin / 100)).toFixed(2)} €</p>}
                        <p className="text-[10px] text-gray-400">/{item.unit || 'ud'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleSave}
                  disabled={selectedItems.size === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 text-base"
                >
                  <CheckCircle className="w-4 h-4" />
                  Guardar {selectedItems.size} productos en tarifa de {selectedSupplier?.name}
                </Button>
              </>
            )}

            {/* Done */}
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