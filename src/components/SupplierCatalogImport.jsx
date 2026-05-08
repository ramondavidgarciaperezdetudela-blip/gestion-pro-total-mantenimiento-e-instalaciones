import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, Image, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * SupplierCatalogImport
 * Permite subir un PDF o Excel de proveedor y extrae automáticamente los materiales
 * con IA, buscando imagen de cada producto.
 */
export default function SupplierCatalogImport({ onImported }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('idle'); // idle | uploading | extracting | images | preview | saving | done
  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');
  const fileRef = React.useRef(null);

  const reset = () => {
    setFile(null); setStep('idle'); setItems([]); setSelectedItems(new Set()); setError(null); setProgress('');
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setStep('idle');
    setItems([]);
    setError(null);
  };

  const isExcel = (f) => /\.(xlsx|xls|csv)$/i.test(f?.name || '');

  const handleExtract = async () => {
    if (!file) return;
    setError(null);
    try {
      // 1. Subir fichero
      setStep('uploading');
      setProgress('Subiendo archivo...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Extraer datos con IA
      setStep('extracting');
      setProgress('Analizando catálogo con IA...');

      let extracted = [];

      if (isExcel(file)) {
        // Para Excel/CSV: usar ExtractDataFromUploadedFile que lee la estructura directamente
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
                    description: { type: 'string', description: 'Nombre del producto o descripción del material' },
                    brand: { type: 'string', description: 'Marca del producto' },
                    supplier_ref: { type: 'string', description: 'Código o referencia del proveedor' },
                    unit_price: { type: 'number', description: 'Precio unitario en euros' },
                    unit: { type: 'string', description: 'Unidad de medida: ud, m, m2, kg, l, etc.' },
                    category: { type: 'string', description: 'Categoría: material, mano_obra, otro' },
                    notes: { type: 'string', description: 'Notas técnicas o descripción adicional' }
                  }
                }
              }
            }
          }
        });

        if (extractResult?.status === 'success') {
          const raw = extractResult.output;
          // El output puede ser un array directo o tener la key items
          extracted = Array.isArray(raw) ? raw : (raw?.items || []);
        }

        // Si no se extrajo nada o hay pocos, reforzar con IA para interpretar el contenido
        if (extracted.length === 0) {
          setProgress('Interpretando contenido con IA...');
          const fallback = await base44.integrations.Core.InvokeLLM({
            model: 'claude_sonnet_4_6',
            prompt: `Este es un archivo Excel/CSV de lista de precios o catálogo de proveedor. Extrae TODOS los productos/materiales con sus datos. Para cada fila que sea un producto devuelve: description (nombre del producto), brand (marca), supplier_ref (referencia), unit_price (precio en €, número), unit (unidad), category (material/mano_obra/otro), notes (notas técnicas). Sé exhaustivo y extrae TODAS las filas que sean productos. Archivo: ${file_url}`,
            file_urls: [file_url],
            response_json_schema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      brand: { type: 'string' },
                      supplier_ref: { type: 'string' },
                      unit_price: { type: 'number' },
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
        // PDF: usar InvokeLLM con file_urls
        setProgress('Analizando PDF con IA...');
        const result = await base44.integrations.Core.InvokeLLM({
          model: 'claude_sonnet_4_6',
          prompt: `Analiza este catálogo PDF de proveedor y extrae TODOS los productos/materiales. Para cada producto devuelve: description (nombre completo), brand (marca), supplier_ref (referencia/código), unit_price (precio en €), unit (unidad de medida), category (material/mano_obra/otro), notes (info técnica relevante). Sé exhaustivo.`,
          file_urls: [file_url],
          response_json_schema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    description: { type: 'string' },
                    brand: { type: 'string' },
                    supplier_ref: { type: 'string' },
                    unit_price: { type: 'number' },
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

      // Filtrar filas vacías o sin descripción
      extracted = extracted.filter(i => i?.description && String(i.description).trim().length > 1);

      if (extracted.length === 0) {
        setError('No se pudieron extraer productos. Comprueba que el archivo tiene filas con nombre de producto y precio.');
        setStep('idle');
        return;
      }

      // 3. Buscar imágenes por IA para cada producto
      setStep('images');
      const withImages = [];
      for (let i = 0; i < extracted.length; i++) {
        const item = extracted[i];
        setProgress(`Buscando imagen ${i + 1}/${extracted.length}: ${item.description?.substring(0, 40)}...`);
        try {
          const imgResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Busca en internet la imagen oficial del producto: "${item.description}"${item.brand ? ` de la marca ${item.brand}` : ''}${item.supplier_ref ? `, referencia ${item.supplier_ref}` : ''}.
Devuelve solo la URL directa de la imagen del producto (JPG o PNG). Si no encuentras una imagen fiable del producto exacto, devuelve null.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: 'object',
              properties: { image_url: { type: 'string' } }
            }
          });
          withImages.push({ ...item, image_url: imgResult?.image_url || null });
        } catch {
          withImages.push({ ...item, image_url: null });
        }
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
      await base44.entities.PriceItem.create({
        description: item.description || 'Sin descripción',
        brand: item.brand || '',
        supplier_ref: item.supplier_ref || '',
        unit_price: item.unit_price || 0,
        unit: item.unit || 'ud',
        category: item.category || 'material',
        notes: item.notes || '',
        image_url: item.image_url || '',
        is_active: true,
      });
      saved++;
      setProgress(`Guardando ${saved}/${toSave.length}...`);
    }
    setStep('done');
    setProgress(`✅ ${saved} productos añadidos a la base de datos`);
    onImported && onImported(saved);
  };

  const toggleItem = (i) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const STEP_LABELS = {
    idle: '', uploading: 'Subiendo archivo...', extracting: 'Extrayendo productos con IA...',
    images: 'Buscando imágenes...', preview: '', saving: 'Guardando...', done: '¡Listo!'
  };

  const isProcessing = ['uploading', 'extracting', 'images', 'saving'].includes(step);

  return (
    <>
      <Button variant="outline" onClick={() => { reset(); setOpen(true); }} className="gap-2 text-sm border-purple-300 text-purple-700 hover:bg-purple-50">
        <FileSpreadsheet className="w-4 h-4" />
        Importar catálogo proveedor
      </Button>

      <Dialog open={open} onOpenChange={o => { if (!isProcessing) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-600" />
              Importar catálogo de proveedor (PDF / Excel)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Upload zone */}
            {step === 'idle' || step === 'preview' || step === 'done' ? (
              step !== 'preview' && step !== 'done' ? (
                <div
                  className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                  <p className="font-semibold text-gray-700">Arrastra o haz clic para subir el catálogo</p>
                  <p className="text-sm text-gray-400 mt-1">Admite PDF y Excel (.xlsx, .xls, .csv)</p>
                  {file && (
                    <div className="mt-3 inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                      <FileSpreadsheet className="w-4 h-4" /> {file.name}
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
                </div>
              ) : null
            ) : null}

            {/* Procesando */}
            {isProcessing && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                <p className="font-semibold text-purple-800">{STEP_LABELS[step]}</p>
                <p className="text-sm text-purple-600">{progress}</p>
                {step === 'images' && (
                  <p className="text-xs text-purple-500">Esto puede tardar unos minutos dependiendo del número de productos</p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Botón extraer */}
            {step === 'idle' && file && !error && (
              <Button onClick={handleExtract} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Extraer productos con IA
              </Button>
            )}

            {/* Preview items */}
            {step === 'preview' && items.length > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800">
                    {items.length} productos encontrados —{' '}
                    <span className="text-purple-700">{selectedItems.size} seleccionados</span>
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set(items.map((_, i) => i)))}>Todos</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedItems(new Set())}>Ninguno</Button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      onClick={() => toggleItem(i)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedItems.has(i) ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                    >
                      {/* Checkbox visual */}
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${selectedItems.has(i) ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                        {selectedItems.has(i) && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                      </div>

                      {/* Imagen */}
                      <div className="w-14 h-14 flex-shrink-0 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-contain" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                        ) : null}
                        <div className={`w-full h-full items-center justify-center ${item.image_url ? 'hidden' : 'flex'}`}>
                          <Image className="w-6 h-6 text-gray-300" />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{item.description}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.brand && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{item.brand}</span>}
                          {item.supplier_ref && <span className="text-[10px] text-gray-400">Ref: {item.supplier_ref}</span>}
                          <Badge variant="outline" className="text-[9px] py-0">{item.category || 'material'}</Badge>
                        </div>
                        {item.notes && <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.notes}</p>}
                      </div>

                      {/* Precio */}
                      <div className="flex-shrink-0 text-right">
                        <p className="font-bold text-base text-emerald-700">
                          {item.unit_price != null ? `${Number(item.unit_price).toFixed(2)} €` : '—'}
                        </p>
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
                  Añadir {selectedItems.size} productos a la base de datos
                </Button>
              </>
            )}

            {/* Done */}
            {step === 'done' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
                <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="font-bold text-emerald-800 text-lg">{progress}</p>
                <Button onClick={() => { setOpen(false); reset(); }} className="bg-emerald-600 hover:bg-emerald-700">
                  Cerrar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}