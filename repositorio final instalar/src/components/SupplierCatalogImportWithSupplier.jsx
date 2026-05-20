import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import DownloadExcelTemplate from '@/components/DownloadExcelTemplate';

// ── Helpers ───────────────────────────────────────────────────────────────────
function norm(str) {
  return String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isFinite(val) ? val : null;
  const n = parseFloat(String(val).replace(/[€\s]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

const ALIASES_NAME  = ['descripcion', 'descripción', 'nombre', 'producto', 'denominacion', 'designacion', 'detalle', 'concepto', 'item'];
const ALIASES_PRICE = ['pvp', 'precio', 'price', 'tarifa', 'importe', 'coste', 'cost', 'venta', 'eur'];
const ALIASES_CODE  = ['codigo', 'código', 'ref', 'referencia', 'sku', 'cod', 'art'];
const ALIASES_BRAND = ['marca', 'brand', 'fabricante'];
const ALIASES_UNIT  = ['unidad', 'unit', 'ud', 'um', 'medida'];

/**
 * Parsea Excel/CSV de proveedores.
 * Para Escoda: fila 0 es cabecera con celda A1 = texto legal largo, B1 = "Descripción", C1 = "PVP €"
 * Los datos reales empiezan en fila 1: [código, descripción, precio]
 *
 * Estrategia:
 *   1. Leer como array de arrays (header:1) → control total
 *   2. Buscar en las primeras 20 filas cuál contiene alias de nombre y/o precio
 *   3. Si no se detecta cabecera, usar heurística posicional con la primera fila de datos
 *   4. Fallback fijo: col0=código, col1=nombre, col2=precio (formato Escoda garantizado)
 *
 * Devuelve array de objetos planos, sin límite de filas.
 */
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, {
          type: 'array',
          cellDates: false,
          cellStyles: false,
          cellNF: false,
          sheetStubs: false,
          dense: true,
        });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Leer como array de arrays — sin interpretación de cabeceras
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: false });

        console.log('[Parser] Hoja:', wb.SheetNames[0], '| Filas brutas:', raw.length);
        console.log('[Parser] Fila 0:', JSON.stringify(raw[0]));
        console.log('[Parser] Fila 1:', JSON.stringify(raw[1]));
        console.log('[Parser] Fila 2:', JSON.stringify(raw[2]));

        let hRow = -1;
        let iCode = -1, iName = -1, iPrice = -1, iBrand = -1, iUnit = -1;

        // ── Paso 1: buscar fila de cabecera (primeras 20 filas) ───────────────
        // Para cada fila, inspeccionamos CADA celda buscando alias
        for (let r = 0; r < Math.min(20, raw.length); r++) {
          const row = raw[r];
          if (!row || row.length === 0) continue;

          let fName = -1, fPrice = -1, fCode = -1, fBrand = -1, fUnit = -1;
          row.forEach((cell, idx) => {
            const n = norm(cell);
            if (fName  === -1 && ALIASES_NAME.some(a  => n === a || n.includes(a))) fName  = idx;
            if (fPrice === -1 && ALIASES_PRICE.some(a => n === a || n.includes(a))) fPrice = idx;
            if (fCode  === -1 && ALIASES_CODE.some(a  => n === a || n.includes(a))) fCode  = idx;
            if (fBrand === -1 && ALIASES_BRAND.some(a => n === a || n.includes(a))) fBrand = idx;
            if (fUnit  === -1 && ALIASES_UNIT.some(a  => n === a || n.includes(a))) fUnit  = idx;
          });

          if (fName !== -1 && fPrice !== -1) {
            hRow = r; iName = fName; iPrice = fPrice; iCode = fCode; iBrand = fBrand; iUnit = fUnit;
            console.log('[Parser] Cabecera en fila', r, '→ col nombre:', iName, '| col precio:', iPrice, '| col código:', iCode);
            break;
          }
        }

        // ── Paso 2: heurística posicional si no hay cabecera clara ───────────
        if (hRow === -1 || iName === -1 || iPrice === -1) {
          console.log('[Parser] Sin cabecera detectada. Usando heurística posicional.');

          // Primera fila que tenga un número > 0 (primera fila de datos real)
          let dataRow = 1; // Escoda: datos desde fila 1
          for (let r = 0; r < Math.min(20, raw.length); r++) {
            if (raw[r] && raw[r].some(c => typeof c === 'number' && c > 0)) {
              dataRow = r;
              break;
            }
          }

          const sample = raw[dataRow] || [];
          console.log('[Parser] Fila muestra (idx', dataRow, '):', JSON.stringify(sample));

          // Precio: primera columna numérica > 0
          sample.forEach((c, idx) => {
            if (iPrice === -1 && typeof c === 'number' && c > 0) iPrice = idx;
          });
          // Precio desde string si no hay número
          if (iPrice === -1) {
            sample.forEach((c, idx) => {
              const n = toNumber(c);
              if (iPrice === -1 && n !== null && n > 0) iPrice = idx;
            });
          }
          // Nombre: string más larga que no sea el precio
          let maxLen = 0;
          sample.forEach((c, idx) => {
            const s = String(c ?? '').trim();
            if (idx !== iPrice && s.length > maxLen) { maxLen = s.length; iName = idx; }
          });
          // Código: string corta diferente de nombre y precio
          sample.forEach((c, idx) => {
            const s = String(c ?? '').trim();
            if (iCode === -1 && idx !== iName && idx !== iPrice && s.length > 0 && s.length <= 30) iCode = idx;
          });

          hRow = dataRow - 1;
          console.log('[Parser] Heurística → dataRow:', dataRow, '| nombre col:', iName, '| precio col:', iPrice, '| código col:', iCode);
        }

        // ── Paso 3: fallback fijo Escoda (col0=código, col1=nombre, col2=precio) ─
        if (iName === -1 || iPrice === -1) {
          console.log('[Parser] Fallback fijo Escoda: col0=código col1=nombre col2=precio');
          iCode = 0; iName = 1; iPrice = 2;
          // Detectar primera fila válida de datos
          hRow = 0;
          for (let r = 0; r < Math.min(10, raw.length); r++) {
            const row = raw[r];
            if (row && String(row[1] ?? '').trim().length > 2 && toNumber(row[2]) !== null && toNumber(row[2]) > 0) {
              hRow = r - 1;
              break;
            }
          }
        }

        // ── Extraer todos los productos sin límite ────────────────────────────
        const dataStart = Math.max(0, hRow + 1);
        const items = [];
        let skipped = 0;

        for (let r = dataStart; r < raw.length; r++) {
          const row = raw[r];

          // Fila vacía o nula → ignorar silenciosamente
          if (!row || row.length === 0) { skipped++; continue; }
          if (row.every(c => c === null || c === undefined || c === '')) { skipped++; continue; }

          const name = String(row[iName] ?? '').trim();
          if (!name || name.length < 2) { skipped++; continue; }

          // Ignorar filas que son subcabeceras repetidas
          const n = norm(name);
          if (ALIASES_NAME.some(a => n === a) || ALIASES_PRICE.some(a => n === a) || ALIASES_CODE.some(a => n === a)) {
            skipped++;
            continue;
          }

          const price = toNumber(row[iPrice]);
          if (price === null || price <= 0) { skipped++; continue; }

          items.push({
            product_code: iCode >= 0 ? String(row[iCode] ?? '').trim() : '',
            product_name: name,
            cost_price:   price,
            brand:        iBrand >= 0 ? String(row[iBrand] ?? '').trim() : '',
            unit:         iUnit  >= 0 ? String(row[iUnit]  ?? '').trim() : 'ud',
            category:     'material',
            notes:        '',
            image_url:    '',
          });
        }

        console.log(`[Parser] ✅ Extraídos: ${items.length} | Ignorados: ${skipped}`);
        console.log('[Parser] Muestra:', JSON.stringify(items.slice(0, 3)));
        resolve(items);

      } catch (err) {
        console.error('[Parser] ❌ Error fatal:', err);
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Estima el número de páginas de un PDF contando ocurrencias de "/Page\n" o "Page\r"
 * en el binario. Es una heurística rápida sin librería.
 */
function estimatePdfPages(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const text = new TextDecoder('latin1').decode(bytes);
  // Contar "/Type /Page" que aparece una vez por página en el xref
  const matches = text.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

// ── Hook temporizador con ETA basado en estimación total ─────────────────────
/**
 * running: boolean — si está activo
 * estimatedTotalSecs: número estimado de segundos totales (calculado antes de empezar)
 *
 * Estrategia:
 *   - Si tenemos estimatedTotalSecs, mostramos cuenta atrás desde esa estimación.
 *   - Cuando progressPct avanza más rápido de lo esperado, ajustamos el ETA
 *     al mínimo entre la cuenta atrás fija y la proyección por velocidad real.
 *   - Nunca muestra tiempo negativo.
 */
function useTimer(running, estimatedTotalSecs = 0) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      setElapsed(0);
      const tick = () => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
      if (!running) setElapsed(0);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  const fmt = (s) => {
    const sec = Math.max(0, Math.round(s));
    const m = Math.floor(sec / 60);
    const rem = sec % 60;
    return m > 0 ? `${m}m ${rem}s` : `${sec}s`;
  };

  // ETA: combina cuenta atrás fija con proyección por velocidad real
  const eta = (pct) => {
    if (pct <= 0) return estimatedTotalSecs > 0 ? fmt(estimatedTotalSecs) : null;

    // Proyección por velocidad real
    const bySpeed = elapsed > 2 ? Math.round(elapsed / (pct / 100)) - elapsed : null;

    // Cuenta atrás fija desde la estimación inicial
    const byEstimate = estimatedTotalSecs > 0 ? Math.max(0, estimatedTotalSecs - elapsed) : null;

    // Tomar el menor de los dos (el más optimista), para que no suba
    let rem = null;
    if (bySpeed !== null && byEstimate !== null) rem = Math.min(bySpeed, byEstimate);
    else if (bySpeed !== null) rem = bySpeed;
    else if (byEstimate !== null) rem = byEstimate;

    return rem !== null ? fmt(rem) : null;
  };

  return { elapsed, fmt: () => fmt(elapsed), eta };
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function SupplierCatalogImportWithSupplier({ suppliers = [], onImported }) {
  const [open, setOpen]               = useState(false);
  const [file, setFile]               = useState(null);
  const [supplierId, setSupplierId]   = useState('');
  const [step, setStep]               = useState('idle'); // idle | extracting | preview | saving | done
  const [parsedCount, setParsedCount] = useState(0);
  const [error, setError]             = useState(null);
  const [progress, setProgress]       = useState('');
  const [margin, setMargin]           = useState(30);
  const [applyIva, setApplyIva]       = useState(false);
  const [ivaRate, setIvaRate]         = useState(21);
  const [fastMode, setFastMode]       = useState(true);
  // Resumen de importación
  const [importSummary, setImportSummary] = useState(null); // { saved, failed: [{index, product_name, product_code, reason}] }
  const [progressPct, setProgressPct] = useState(0);
  const [estimatedSecs, setEstimatedSecs] = useState(0);
  const [failedToRetry, setFailedToRetry] = useState([]);

  const fileRef    = useRef(null);
  const abortRef   = useRef(false);
  // Datos completos viven en ref — no en estado — para no congelar el navegador con 64K ítems
  const parsedRef  = useRef([]);

  const reset = () => {
    abortRef.current = true;
    parsedRef.current = [];
    setFile(null); setStep('idle'); setParsedCount(0);
    setError(null); setProgress(''); setSupplierId(''); setImportSummary(null); setProgressPct(0); setFastMode(true); setEstimatedSecs(0); setFailedToRetry([]);
    setTimeout(() => { abortRef.current = false; }, 200);
  };

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const isExcel = (f) => /\.(xlsx|xls|csv)$/i.test(f?.name || '');
  const isPdf   = (f) => /\.pdf$/i.test(f?.name || '');

  const handleExtract = async () => {
    if (!file || !supplierId) return;
    setError(null);
    abortRef.current = false;
    setProgressPct(0);

    try {
      let extracted = [];

      if (isExcel(file)) {
        setStep('extracting');
        setProgress('Leyendo archivo Excel...');
        setProgressPct(10);
        extracted = await parseExcel(file);
        setProgressPct(80);

        if (applyIva && ivaRate > 0) {
          extracted = extracted.map(item => ({
            ...item,
            cost_price: item.cost_price != null
              ? Math.round(item.cost_price * (1 + ivaRate / 100) * 100) / 100
              : null,
          }));
        }

      } else if (isPdf(file)) {
        setStep('extracting');

        const arrayBuffer = await file.arrayBuffer();
        const totalPages = estimatePdfPages(arrayBuffer);
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        const isLarge = file.size > 10 * 1024 * 1024;

        // ── Subir el PDF completo UNA SOLA VEZ — nunca cortar el binario ────
        setProgress(`Subiendo PDF (${fileSizeMB} MB)...`);
        setProgressPct(3);
        const { file_url: pdfUrl } = await base44.integrations.Core.UploadFile({ file });
        setProgressPct(8);

        // ── Crear chunks lógicos de páginas — todos apuntan a la misma URL ──
        // PDFs grandes usan chunks más pequeños para mayor robustez
        const PAGES_PER_CHUNK = isLarge ? 50 : 100;
        const numChunks = Math.max(1, Math.ceil(totalPages / PAGES_PER_CHUNK));
        const allChunks = [];
        for (let ci = 0; ci < numChunks; ci++) {
          allChunks.push({
            index: ci,
            url: pdfUrl,
            pageFrom: ci * PAGES_PER_CHUNK + 1,
            pageTo: Math.min((ci + 1) * PAGES_PER_CHUNK, totalPages),
            totalPages,
          });
        }

        const totalChunks = allChunks.length;
        const secsPerChunk = fastMode ? 20 : 40;
        // Para procesamiento paralelo, el tiempo total es aprox totalChunks/CONCURRENCY * secsPerChunk
        const CONCURRENCY = isLarge ? 3 : 2;
        setEstimatedSecs(Math.ceil(totalChunks / CONCURRENCY) * secsPerChunk);

        if (isLarge) {
          setProgress(`PDF grande (${fileSizeMB} MB, ~${totalPages} pág.) — procesando ${totalChunks} fragmentos en paralelo...`);
        }

        const responseSchema = {
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
                },
              },
            },
          },
        };

        // ── Función que analiza un chunk con reintentos automáticos ──────────
        const analyzeChunk = async (chunk, attempt = 0) => {
          const rangeLabel = totalChunks > 1 ? `, páginas ${chunk.pageFrom} a ${chunk.pageTo}` : '';
          const fastPrompt = `SOLO extrae filas de tablas de precios de este PDF${totalChunks > 1 ? `, céntrate en las páginas ${chunk.pageFrom} a ${chunk.pageTo}` : ''}. Ignora imágenes, logos y texto descriptivo. Para cada fila de tabla devuelve: product_code (referencia/código), product_name (descripción/nombre), cost_price (precio numérico sin €, obligatorio), unit (unidad). Omite filas sin precio. Sé exhaustivo.`;
          const fullPrompt = `Extrae TODOS los productos del catálogo PDF del proveedor "${selectedSupplier?.name || ''}"${totalChunks > 1 ? `, analizando las páginas ${chunk.pageFrom} a ${chunk.pageTo}` : ''}. Para cada producto devuelve: product_name, product_code, brand, cost_price (número sin €), unit, category (clima/refrigeracion/electrico/solar/fontaneria/material/otro). No omitas ningún producto.`;
          try {
            const result = await base44.integrations.Core.InvokeLLM({
              model: 'gemini_3_flash',
              prompt: fastMode ? fastPrompt : fullPrompt,
              file_urls: [chunk.url],
              response_json_schema: responseSchema,
            });
            return (result?.items || []).filter(i => i?.product_name && i.cost_price > 0);
          } catch (err) {
            if (attempt < 2 && !abortRef.current) {
              // Esperar antes de reintentar: 3s en primer reintento, 8s en segundo
              await new Promise(r => setTimeout(r, attempt === 0 ? 3000 : 8000));
              return analyzeChunk(chunk, attempt + 1);
            }
            console.warn(`[PDF] Chunk ${chunk.index} (pág. ${chunk.pageFrom}-${chunk.pageTo}) falló tras ${attempt + 1} intentos:`, err.message);
            return []; // chunk fallido → devuelve vacío en lugar de abortar todo
          }
        };

        // ── Procesamiento paralelo con concurrencia controlada ───────────────
        let completedChunks = 0;
        const chunkResults = new Array(totalChunks).fill(null);

        // Procesar en lotes de CONCURRENCY chunks simultáneos
        for (let i = 0; i < totalChunks; i += CONCURRENCY) {
          if (abortRef.current) break;
          const batch = allChunks.slice(i, i + CONCURRENCY);

          setProgress(
            `Analizando fragmentos ${i + 1}–${Math.min(i + CONCURRENCY, totalChunks)} de ${totalChunks}` +
            ` (${extracted.length} productos encontrados)...`
          );

          // Lanzar todos los chunks del lote en paralelo
          const batchResults = await Promise.all(batch.map(chunk => analyzeChunk(chunk)));

          batchResults.forEach((items, bi) => {
            chunkResults[i + bi] = items;
          });

          completedChunks += batch.length;
          setProgressPct(Math.round(8 + (completedChunks / totalChunks) * 85));

          // Acumular resultados en orden (para evitar duplicados de frontera)
          extracted = [];
          const seenCodes = new Set();
          for (const items of chunkResults) {
            if (!items) continue;
            for (const item of items) {
              const key = item.product_code ? item.product_code.trim().toLowerCase() : null;
              if (key && seenCodes.has(key)) continue;
              if (key) seenCodes.add(key);
              extracted.push(item);
            }
          }
          setParsedCount(extracted.length);
        }

        if (applyIva && ivaRate > 0) {
          extracted = extracted.map(i => ({ ...i, cost_price: Math.round(i.cost_price * (1 + ivaRate / 100) * 100) / 100 }));
        }
      }

      if (extracted.length === 0) {
        setError('No se encontraron productos con precio válido. Abre la consola (F12 → Console) y busca "[Parser]" para ver los logs de diagnóstico.');
        setStep('idle');
        return;
      }

      setProgressPct(100);
      // Guardar en ref (no en estado) para evitar re-renders con 64K ítems
      parsedRef.current = extracted;
      setParsedCount(extracted.length);
      setStep('preview');
      setProgress('');
      setProgressPct(0);

    } catch (err) {
      setError('Error al procesar el archivo: ' + (err.message || 'Error desconocido'));
      setStep('idle');
    }
  };

  const handleSave = async () => {
    setStep('saving');
    setProgressPct(0);
    const toSave = parsedRef.current;
    if (!toSave.length) return;

    // Cargar existentes de este proveedor para hacer upsert por código de producto
    setProgress('Cargando productos existentes...');
    let existing = [];
    try {
      let skip = 0;
      while (true) {
        const batch = await base44.entities.SupplierPrice.filter({ supplier_id: supplierId }, null, 500, skip);
        existing = existing.concat(batch);
        if (batch.length < 500) break;
        skip += 500;
      }
    } catch (_) { existing = []; }

    // Índice: product_code → registro existente
    const existingByCode = {};
    existing.forEach(e => {
      if (e.product_code) existingByCode[e.product_code.trim().toLowerCase()] = e;
    });

    let saved = 0;
    let updated = 0;
    const failedItems = [];

    // Separar nuevos de actualizaciones, evitando duplicados exactos en el mismo archivo
    const toCreate = [];
    const toUpdate = [];
    const seenInFile = new Set();

    for (let i = 0; i < toSave.length; i++) {
      const item = toSave[i];
      const codeKey = (item.product_code || '').trim().toLowerCase();

      // Saltar duplicados dentro del propio archivo
      if (codeKey && seenInFile.has(codeKey)) continue;
      if (codeKey) seenInFile.add(codeKey);

      const costPrice = item.cost_price || 0;
      const salePrice = costPrice > 0 ? Math.round(costPrice * (1 + margin / 100) * 100) / 100 : 0;

      if (codeKey && existingByCode[codeKey]) {
        // Solo actualizar si hay cambios significativos
        const ex = existingByCode[codeKey];
        if (Math.abs(ex.cost_price - costPrice) > 0.01 || ex.product_name !== item.product_name) {
          toUpdate.push({ ex, item, costPrice, salePrice, idx: i });
        }
      } else {
        toCreate.push({
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
      }
    }

    // ── Guardar nuevos en lotes — con fallback a lotes más pequeños si falla ─
    const CREATE_BATCH = 200;
    for (let i = 0; i < toCreate.length; i += CREATE_BATCH) {
      if (abortRef.current) break;
      const batch = toCreate.slice(i, i + CREATE_BATCH);
      try {
        await base44.entities.SupplierPrice.bulkCreate(batch);
        saved += batch.length;
      } catch (err) {
        // Reintentar en lotes más pequeños (50) antes de ir uno a uno
        const SMALL_BATCH = 50;
        let batchSaved = false;
        for (let si = 0; si < batch.length; si += SMALL_BATCH) {
          const smallBatch = batch.slice(si, si + SMALL_BATCH);
          try {
            await base44.entities.SupplierPrice.bulkCreate(smallBatch);
            saved += smallBatch.length;
            batchSaved = true;
          } catch (e2) {
            // Último recurso: uno a uno
            for (const rec of smallBatch) {
              try {
                await base44.entities.SupplierPrice.bulkCreate([rec]);
                saved++;
              } catch (e3) {
                failedItems.push({ index: saved + updated + failedItems.length + 1, product_name: rec.product_name, product_code: rec.product_code, reason: e3?.message || 'Error' });
              }
            }
          }
        }
      }
      const done = saved + updated;
      setProgressPct(Math.round(done / toSave.length * 100));
      setProgress(`Guardando nuevos: ${saved.toLocaleString()} / ${toCreate.length.toLocaleString()}...`);
      onImported && onImported(saved + updated, true);
    }

    // ── Actualizar existentes en paralelo (lotes de 20 peticiones simultáneas) ──
    const UPDATE_CONCURRENCY = 20;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
      if (abortRef.current) break;
      const batch = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
      const results = await Promise.allSettled(batch.map(({ ex, item, costPrice, salePrice }) =>
        base44.entities.SupplierPrice.update(ex.id, {
          cost_price: costPrice,
          sale_price: salePrice,
          margin: costPrice > 0 ? margin : ex.margin,
          product_name: item.product_name || ex.product_name,
        })
      ));
      results.forEach((r, ri) => {
        if (r.status === 'fulfilled') updated++;
        else failedItems.push({ index: batch[ri].idx + 1, product_name: batch[ri].item.product_name || '—', product_code: batch[ri].item.product_code || '—', reason: r.reason?.message || 'Error' });
      });
      const done = saved + updated;
      setProgressPct(Math.round(done / toSave.length * 100));
      setProgress(`Actualizando precios: ${updated.toLocaleString()} / ${toUpdate.length.toLocaleString()}...`);
      onImported && onImported(saved + updated, true);
    }

    setImportSummary({ saved, updated, failed: failedItems, total: toSave.length });
    setFailedToRetry(failedItems); // Guardar para reintento
    setStep('done');
    onImported && onImported(saved + updated, false);
  };

  const handleRetryFailed = async () => {
    if (!failedToRetry.length) return;
    setStep('saving');
    setProgressPct(0);
    setError(null);

    // Cargar nuevamente existentes para upsert
    setProgress('Cargando productos existentes...');
    let existing = [];
    try {
      let skip = 0;
      while (true) {
        const batch = await base44.entities.SupplierPrice.filter({ supplier_id: supplierId }, null, 500, skip);
        existing = existing.concat(batch);
        if (batch.length < 500) break;
        skip += 500;
      }
    } catch (_) { existing = []; }

    const existingByCode = {};
    existing.forEach(e => {
      if (e.product_code) existingByCode[e.product_code.trim().toLowerCase()] = e;
    });

    let saved = 0;
    let updated = 0;
    let retryFailed = [];

    // Reconstruir items fallidos desde parsedRef usando índices
    const toRetry = [];
    failedToRetry.forEach(f => {
      const idx = f.index - 1; // Los índices son 1-based en el resumen
      if (idx >= 0 && idx < parsedRef.current.length) {
        const item = parsedRef.current[idx];
        const costPrice = item.cost_price || 0;
        const salePrice = costPrice > 0 ? Math.round(costPrice * (1 + margin / 100) * 100) / 100 : 0;
        const codeKey = (item.product_code || '').trim().toLowerCase();

        if (codeKey && existingByCode[codeKey]) {
          toRetry.push({ ex: existingByCode[codeKey], item, costPrice, salePrice, idx, isUpdate: true });
        } else {
          toRetry.push({
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
            idx,
            isUpdate: false,
          });
        }
      }
    });

    // Separar nuevos de actualizaciones
    const toCreate = toRetry.filter(t => !t.isUpdate);
    const toUpdate = toRetry.filter(t => t.isUpdate);

    // Guardar nuevos — con lotes pequeños para mayor robustez
    const CREATE_BATCH = 50;
    for (let i = 0; i < toCreate.length; i += CREATE_BATCH) {
      if (abortRef.current) break;
      const batch = toCreate.slice(i, i + CREATE_BATCH);
      try {
        await base44.entities.SupplierPrice.bulkCreate(batch);
        saved += batch.length;
      } catch (err) {
        for (const rec of batch) {
          try {
            await base44.entities.SupplierPrice.bulkCreate([rec]);
            saved++;
          } catch (e2) {
            retryFailed.push({ index: rec.idx + 1, product_name: rec.product_name, product_code: rec.product_code, reason: e2?.message || 'Error' });
          }
        }
      }
      const done = saved + updated;
      setProgressPct(Math.round(done / toRetry.length * 100));
      setProgress(`Reintentando nuevos: ${saved.toLocaleString()} / ${toCreate.length.toLocaleString()}...`);
    }

    // Actualizar existentes
    const UPDATE_CONCURRENCY = 20;
    for (let i = 0; i < toUpdate.length; i += UPDATE_CONCURRENCY) {
      if (abortRef.current) break;
      const batch = toUpdate.slice(i, i + UPDATE_CONCURRENCY);
      const results = await Promise.allSettled(batch.map(({ ex, item, costPrice, salePrice }) =>
        base44.entities.SupplierPrice.update(ex.id, {
          cost_price: costPrice,
          sale_price: salePrice,
          margin: costPrice > 0 ? margin : ex.margin,
          product_name: item.product_name || ex.product_name,
        })
      ));
      results.forEach((r, ri) => {
        if (r.status === 'fulfilled') updated++;
        else retryFailed.push({ index: batch[ri].idx + 1, product_name: batch[ri].item.product_name || '—', product_code: batch[ri].item.product_code || '—', reason: r.reason?.message || 'Error' });
      });
      const done = saved + updated;
      setProgressPct(Math.round(done / toRetry.length * 100));
      setProgress(`Reintentando actualizaciones: ${updated.toLocaleString()} / ${toUpdate.length.toLocaleString()}...`);
    }

    // Actualizar resumen
    setImportSummary(prev => ({
      ...prev,
      saved: (prev.saved || 0) + saved,
      updated: (prev.updated || 0) + updated,
      failed: retryFailed,
    }));
    setFailedToRetry(retryFailed);
    setProgressPct(0);
    setProgress('');
  };

  const isLoadingStep = ['extracting', 'saving'].includes(step);
  const timer = useTimer(isLoadingStep, estimatedSecs);

  return (
    <>
      <Button onClick={() => { reset(); setOpen(true); }} className="gap-2 bg-purple-700 hover:bg-purple-800 text-white">
        <FileSpreadsheet className="w-4 h-4" />
        Importar tarifa de proveedor
      </Button>

      <Dialog open={open} onOpenChange={o => { if (!isLoadingStep) { setOpen(o); if (!o) reset(); } }}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[92vh] overflow-y-auto">
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
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-800">📋 Formatos aceptados</p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      <span className="font-bold text-emerald-700">⚡ Excel (.xlsx, .xls, CSV)</span> — instantáneo, sin IA, ilimitado<br/>
                      <span className="text-amber-700">🤖 PDF</span> — análisis IA (30–90 seg./parte). PDFs grandes se dividen automáticamente
                    </p>
                  </div>
                  <div className="flex-shrink-0"><DownloadExcelTemplate size="sm" /></div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">2. Sube el archivo</label>
                  <div
                    className="border-2 border-dashed border-purple-200 rounded-xl p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setError(null); } }}
                  >
                    <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                    <p className="font-semibold text-gray-700">Arrastra o haz clic para subir</p>
                    <p className="text-sm text-gray-400 mt-1">PDF, Excel (.xlsx, .xls) o CSV</p>
                    {file && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                        <FileSpreadsheet className="w-4 h-4" /> {file.name}
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" className="hidden"
                     onChange={async e => {
                       const f = e.target.files[0];
                       if (!f) return;

                       // PDFs de cualquier tamaño: se dividen automáticamente en partes

                       setFile(f);
                       setError(null);
                     }} />
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

                {file && isPdf(file) && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => setFastMode(true)}
                        className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 text-sm font-medium transition-colors border-r ${fastMode ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className="text-lg">⚡</span>
                        <span className="font-bold">Modo rápido</span>
                        <span className={`text-[10px] leading-tight text-center ${fastMode ? 'text-blue-100' : 'text-gray-400'}`}>
                          Solo tablas de precios<br/>~15–30 seg.
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFastMode(false)}
                        className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 text-sm font-medium transition-colors ${!fastMode ? 'bg-purple-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                      >
                        <span className="text-lg">🔍</span>
                        <span className="font-bold">Modo completo</span>
                        <span className={`text-[10px] leading-tight text-center ${!fastMode ? 'text-purple-100' : 'text-gray-400'}`}>
                          Incluye marca, categoría<br/>~30–90 seg.
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    4. Margen de venta: <span className="text-purple-700 font-bold">{margin}%</span>
                  </label>
                  <Input type="number" min="0" max="200" value={margin}
                    onChange={e => setMargin(parseInt(e.target.value) || 0)} className="w-32" />
                </div>
              </div>
            )}

            {/* ── Cargando ── */}
            {isLoadingStep && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <div>
                      <p className="font-semibold text-purple-800 text-sm">
                        {step === 'extracting' ? 'Analizando archivo...' : 'Procesando productos...'}
                      </p>
                      {progress && <p className="text-xs text-purple-600 mt-0.5">{progress}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-mono text-sm font-semibold">
                      <span>⏱</span>
                      {timer.fmt()}
                    </div>
                    {progressPct > 5 && timer.eta(progressPct) && (
                      <p className="text-xs text-purple-600 mt-1.5 font-medium">Quedan ~{timer.eta(progressPct)}</p>
                    )}
                  </div>
                </div>

                {/* Barra de progreso con contador */}
                {progressPct > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-purple-600 font-medium">
                      <span>Progreso: {progressPct}%</span>
                      <span>{parsedCount.toLocaleString()} productos analizados</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="h-2.5 bg-purple-600 rounded-full transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
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

            {/* ── Preview (confirmación) ── */}
            {step === 'preview' && parsedCount > 0 && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-emerald-800">{parsedCount.toLocaleString()} productos</p>
                  <p className="text-sm text-emerald-600 mt-1">listos para guardar en tarifa de <strong>{selectedSupplier?.name}</strong></p>
                  {applyIva && <p className="text-xs text-amber-600 mt-1">IVA {ivaRate}% aplicado a los precios</p>}
                  <p className="text-xs text-gray-500 mt-2">Margen de venta: {margin}%</p>
                </div>

                <Button onClick={handleSave}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2 text-base py-3">
                  <CheckCircle className="w-4 h-4" />
                  Guardar {parsedCount.toLocaleString()} productos · {selectedSupplier?.name}
                </Button>

                <Button variant="outline" onClick={reset} className="w-full">
                  Cancelar
                </Button>
              </div>
            )}

            {/* ── Done ── */}
            {step === 'done' && importSummary && (
              <div className="space-y-4">
                {/* Cabecera resumen */}
                <div className={`rounded-xl p-5 text-center border ${importSummary.failed.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <CheckCircle className={`w-10 h-10 mx-auto mb-2 ${importSummary.failed.length === 0 ? 'text-emerald-500' : 'text-amber-500'}`} />
                  <p className={`text-2xl font-bold ${importSummary.failed.length === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {(importSummary.saved + (importSummary.updated || 0)).toLocaleString()} / {importSummary.total.toLocaleString()} procesados
                  </p>
                  <p className="text-sm text-gray-600 mt-1">en tarifa de <strong>{selectedSupplier?.name}</strong></p>
                </div>

                {/* KPIs rápidos */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-emerald-700">{importSummary.saved.toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 font-medium">Nuevos ✓</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-blue-700">{(importSummary.updated || 0).toLocaleString()}</p>
                    <p className="text-xs text-blue-600 font-medium">Actualizados</p>
                  </div>
                  <div className={`border rounded-lg p-3 text-center ${importSummary.failed.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className={`text-xl font-bold ${importSummary.failed.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>{importSummary.failed.length.toLocaleString()}</p>
                    <p className={`text-xs font-medium ${importSummary.failed.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>Con error</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-purple-700">
                      {importSummary.total > 0 ? Math.round((importSummary.saved + (importSummary.updated || 0)) / importSummary.total * 100) : 0}%
                    </p>
                    <p className="text-xs text-purple-600 font-medium">Éxito</p>
                  </div>
                </div>

                {/* Lista de fallos */}
                {importSummary.failed.length > 0 && (
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <div className="bg-red-50 px-4 py-2.5 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <p className="text-sm font-semibold text-red-700">{importSummary.failed.length} filas con error — revisa y corrige</p>
                    </div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-red-50">
                      {importSummary.failed.map((f, i) => (
                        <div key={i} className="px-4 py-2 flex items-start gap-3 text-xs bg-white hover:bg-red-50 transition-colors">
                          <span className="text-gray-400 font-mono w-10 flex-shrink-0">F{f.index}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{f.product_name}</p>
                            {f.product_code && f.product_code !== '—' && (
                              <p className="text-gray-400">Cód: {f.product_code}</p>
                            )}
                          </div>
                          <span className="text-red-500 text-right flex-shrink-0 max-w-[140px] break-words">{f.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importSummary.failed.length === 0 && (
                   <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center text-sm text-emerald-700 font-medium">
                     ✅ Importación perfecta — sin ningún error
                   </div>
                 )}

                {importSummary.failed.length > 0 && failedToRetry.length > 0 && (
                  <Button onClick={handleRetryFailed} className="w-full bg-amber-600 hover:bg-amber-700 gap-2">
                    <Loader2 className="w-4 h-4" />
                    Reintentar {failedToRetry.length} productos fallidos
                  </Button>
                )}

                <Button onClick={() => { setOpen(false); reset(); }} className="w-full bg-emerald-600 hover:bg-emerald-700">
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