import React, { useState, useRef, useCallback } from 'react';
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
 * Parser específico para el formato Escoda y formatos similares.
 *
 * El archivo Escoda tiene esta estructura:
 *   - Fila 0 (cabecera): la celda A1 es un texto largo multilinea, B1="Descripción", C1="PVP €"
 *     XLSX lo exporta como: { "texto_largo": "Código", col_1: "Descripción", col_2: "PVP €" }
 *     Con header:1 (array): [ "texto_largo_en_A1", "Descripción", "PVP €" ]
 *   - Filas 1..N: datos reales (código, descripción, precio)
 *
 * Estrategia:
 *   1. Leer como array de arrays (header:1)
 *   2. Buscar entre las primeras 50 filas la que contiene alias de nombre/precio/código
 *      (buscando también en las CELDAS DE ESA FILA, no solo en las posiciones exactas)
 *   3. Si la búsqueda exacta falla, usar la primera fila que tenga datos numéricos > 0
 *      y asignar columnas por tipo: string larga = nombre, número = precio, string corta = código
 */
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Leer como array de arrays para control total
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

        console.log('[Escoda Parser] Total filas:', raw.length);
        console.log('[Escoda Parser] Fila 0:', JSON.stringify(raw[0]?.slice(0, 5)));
        console.log('[Escoda Parser] Fila 1:', JSON.stringify(raw[1]?.slice(0, 5)));

        let hRow = -1;
        let iCode = -1, iName = -1, iPrice = -1, iBrand = -1, iUnit = -1;

        // ── PASO 1: Buscar cabecera en primeras 50 filas ─────────────────────
        // La cabecera de Escoda tiene "Código"/"Descripción"/"PVP €" pero la celda A1
        // tiene un texto muy largo — el texto "Código" está en esa misma celda larga
        // o en otras celdas de la misma fila. Buscamos en TODOS los valores de cada celda.
        for (let r = 0; r < Math.min(50, raw.length); r++) {
          const row = raw[r];
          if (!row || row.length === 0) continue;

          // Buscar en cada celda si contiene algún alias
          let foundName = -1, foundPrice = -1, foundCode = -1, foundBrand = -1, foundUnit = -1;
          row.forEach((cell, idx) => {
            const n = norm(cell);
            if (foundName  === -1 && ALIASES_NAME.some(a  => n.includes(norm(a))))  foundName  = idx;
            if (foundPrice === -1 && ALIASES_PRICE.some(a => n.includes(norm(a)))) foundPrice = idx;
            if (foundCode  === -1 && ALIASES_CODE.some(a  => n.includes(norm(a))))  foundCode  = idx;
            if (foundBrand === -1 && ALIASES_BRAND.some(a => n.includes(norm(a)))) foundBrand = idx;
            if (foundUnit  === -1 && ALIASES_UNIT.some(a  => n.includes(norm(a))))  foundUnit  = idx;
          });

          if (foundName !== -1 || foundPrice !== -1) {
            hRow   = r;
            iName  = foundName;
            iPrice = foundPrice;
            iCode  = foundCode;
            iBrand = foundBrand;
            iUnit  = foundUnit;
            console.log('[Escoda Parser] Cabecera detectada en fila', r, '→ nombre col:', iName, '| precio col:', iPrice, '| código col:', iCode);
            break;
          }
        }

        // ── PASO 2: Heurística por tipos si no hay cabecera ──────────────────
        if (hRow === -1 || iName === -1 || iPrice === -1) {
          console.log('[Escoda Parser] Sin cabecera clara. Heurística por tipos de dato.');

          // Primera fila con al menos un número válido > 0
          let dataRow = 0;
          for (let r = 0; r < Math.min(30, raw.length); r++) {
            if (raw[r].some(c => typeof c === 'number' && c > 0)) { dataRow = r; break; }
          }

          const sample = raw[dataRow] || [];
          console.log('[Escoda Parser] Fila muestra idx', dataRow, ':', JSON.stringify(sample));

          // Precio = primera columna numérica > 0
          sample.forEach((c, idx) => {
            if (iPrice === -1 && typeof c === 'number' && c > 0) iPrice = idx;
          });
          // Si precio sigue sin detectar, buscar string parseable
          if (iPrice === -1) {
            sample.forEach((c, idx) => {
              const n = toNumber(c);
              if (iPrice === -1 && n !== null && n > 0) iPrice = idx;
            });
          }
          // Nombre = string más larga (excluyendo la col de precio)
          let maxLen = 0;
          sample.forEach((c, idx) => {
            const s = String(c || '').trim();
            if (idx !== iPrice && s.length > maxLen) { maxLen = s.length; iName = idx; }
          });
          // Código = string corta (≤30 chars) distinta de nombre y precio
          sample.forEach((c, idx) => {
            const s = String(c || '').trim();
            if (iCode === -1 && idx !== iName && idx !== iPrice && s.length > 0 && s.length <= 30) iCode = idx;
          });

          hRow = dataRow - 1; // dataStart = hRow + 1 = dataRow
          console.log('[Escoda Parser] Heurística → dataRow:', dataRow, '| nombre:', iName, '| precio:', iPrice, '| código:', iCode);
        }

        // ── PASO 3: Fallback fijo Escoda (col0=código, col1=nombre, col2=precio) ─
        if (iName === -1 || iPrice === -1) {
          console.log('[Escoda Parser] Fallback fijo: col0=código, col1=nombre, col2=precio');
          iCode = 0; iName = 1; iPrice = 2;
          // Detectar primera fila de datos válida
          hRow = 0;
          for (let r = 0; r < Math.min(15, raw.length); r++) {
            const row = raw[r];
            if (row && String(row[1] || '').trim().length > 2 && toNumber(row[2]) !== null && toNumber(row[2]) > 0) {
              hRow = r - 1;
              break;
            }
          }
        }

        // ── EXTRAER TODOS LOS PRODUCTOS (sin límite) ─────────────────────────
        const dataStart = Math.max(0, hRow + 1);
        const items = [];

        for (let r = dataStart; r < raw.length; r++) {
          const row = raw[r];
          // Fila vacía o todo nulo → saltar
          if (!row || row.length === 0) continue;
          if (row.every(c => c === '' || c === null || c === undefined)) continue;

          const name = String(row[iName] ?? '').trim();
          // Nombre muy corto → saltar
          if (!name || name.length < 2) continue;
          // Saltar filas que son cabeceras repetidas
          const normName = norm(name);
          if (ALIASES_NAME.some(a => normName === norm(a))) continue;
          if (ALIASES_PRICE.some(a => normName === norm(a))) continue;
          if (ALIASES_CODE.some(a => normName === norm(a))) continue;

          const price = toNumber(row[iPrice]);
          if (price === null || price <= 0) continue;

          items.push({
            product_code: iCode >= 0 ? String(row[iCode] ?? '').trim() : '',
            product_name: name,
            cost_price:   price,
            brand:        iBrand >= 0 ? String(row[iBrand] ?? '').trim() : '',
            unit:         iUnit  >= 0 ? String(row[iUnit]  ?? '').trim() : 'ud',
            category:     'material',
            notes:        '',
            image_url:    null,
          });
        }

        console.log('[Escoda Parser] ✅ Productos válidos extraídos:', items.length);
        console.log('[Escoda Parser] Primeros 3:', JSON.stringify(items.slice(0, 3)));
        resolve(items);
      } catch (err) {
        console.error('[Escoda Parser] ❌ Error:', err);
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
  const [step, setStep]               = useState('idle');
  const [items, setItems]             = useState([]);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [error, setError]             = useState(null);
  const [progress, setProgress]       = useState('');
  const [margin, setMargin]           = useState(30);
  const [applyIva, setApplyIva]       = useState(false);
  const [ivaRate, setIvaRate]         = useState(21);
  const [fetchImages, setFetchImages] = useState(true);
  const [imgDone, setImgDone]         = useState(0);
  const [imgTotal, setImgTotal]       = useState(0);
  const [imgErrors, setImgErrors]     = useState(0);
  const [page, setPage]               = useState(0);
  const PAGE_SIZE = 50;
  const fileRef   = useRef(null);
  const abortRef  = useRef(false);
  // Buffer mutable que vive fuera del ciclo de render para no perder posición
  const catalogRef = useRef([]);

  const reset = () => {
    abortRef.current = true;
    catalogRef.current = [];
    setFile(null); setStep('idle'); setItems([]); setSelectedItems(new Set());
    setError(null); setProgress(''); setSupplierId(''); setPage(0);
    setImgDone(0); setImgTotal(0); setImgErrors(0);
    setTimeout(() => { abortRef.current = false; }, 200);
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
        setError(`No se encontraron productos con precio válido. El archivo puede tener un formato inesperado. Abre la consola (F12 → Console) y busca logs "[Escoda Parser]" para ver qué detectó el lector.`);
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

  // Descarga imágenes en segundo plano, completamente, sin detenerse
  const fetchImagesBackground = useCallback(async (extracted) => {
    const total = extracted.length;
    // Inicializar buffer mutable compartido
    catalogRef.current = extracted.map(item => ({ ...item, image_url: null }));
    setImgTotal(total);
    setImgDone(0);
    setImgErrors(0);

    const BATCH = 5;          // peticiones en paralelo por ronda
    const DELAY_MS = 250;     // pausa entre rondas para no saturar la API
    const MAX_RETRIES = 2;    // reintentos por ítem si falla

    let done = 0;
    let errors = 0;

    // Función para buscar imagen de UN producto con retry
    const fetchOne = async (item, globalIdx) => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (abortRef.current) return null;
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `Busca la imagen oficial del producto: "${item.product_name}"${item.brand ? ` marca ${item.brand}` : ''}${item.product_code ? ` ref ${item.product_code}` : ''}. Devuelve SOLO la URL directa de la imagen JPG o PNG del producto. Si no encuentras nada fiable devuelve null.`,
            add_context_from_internet: true,
            response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
          });
          return res?.image_url || null;
        } catch {
          if (attempt === MAX_RETRIES) return null;
          await new Promise(r => setTimeout(r, 500 * (attempt + 1))); // backoff
        }
      }
      return null;
    };

    // Procesar en lotes hasta el final
    for (let i = 0; i < total; i += BATCH) {
      if (abortRef.current) {
        console.log('[Images] Abortado en índice', i);
        break;
      }

      const batchIndices = [];
      for (let j = i; j < Math.min(i + BATCH, total); j++) batchIndices.push(j);

      const results = await Promise.all(
        batchIndices.map(async (idx) => {
          const url = await fetchOne(catalogRef.current[idx], idx);
          return { idx, url };
        })
      );

      // Actualizar buffer mutable
      results.forEach(({ idx, url }) => {
        catalogRef.current[idx] = { ...catalogRef.current[idx], image_url: url };
        if (!url) errors++;
      });

      done += results.length;

      // Actualizar contadores en estado (barato, solo números)
      setImgDone(done);
      setImgErrors(errors);

      // Publicar snapshot del buffer al estado React cada 50 ítems o al final
      if (done % 50 === 0 || done >= total) {
        setItems([...catalogRef.current]);
      }

      if (i + BATCH < total) await new Promise(r => setTimeout(r, DELAY_MS));
    }

    // Snapshot final garantizado
    if (!abortRef.current) {
      setItems([...catalogRef.current]);
      console.log(`[Images] Completado: ${done}/${total}, errores: ${errors}`);
    }
  }, []);

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
                  <div className={`border rounded-lg p-3 space-y-2 ${imagesFetching ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={imagesFetching ? 'text-blue-700 flex items-center gap-1.5' : 'text-green-700'}>
                        {imagesFetching && <Loader2 className="w-3 h-3 animate-spin" />}
                        {imagesFetching ? 'Descargando imágenes en segundo plano…' : '✅ Imágenes descargadas'}
                      </span>
                      <span className={imagesFetching ? 'text-blue-600 font-mono' : 'text-green-600 font-mono'}>
                        {imgDone.toLocaleString()} / {imgTotal.toLocaleString()} · {imgPercent}%
                        {imgErrors > 0 && <span className="text-amber-500 ml-1">({imgErrors} sin imagen)</span>}
                      </span>
                    </div>
                    <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${imagesFetching ? 'bg-blue-500' : 'bg-green-500'}`}
                        style={{ width: `${imgPercent}%` }}
                      />
                    </div>
                    {imagesFetching && (
                      <p className="text-[10px] text-blue-500">
                        Puedes guardar ahora — las imágenes seguirán descargándose hasta completar el catálogo.
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