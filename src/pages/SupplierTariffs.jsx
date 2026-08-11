import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Building2, Package, Image as ImageIcon, ChevronDown, ChevronRight,
  Upload, Trash2, Edit, Loader2, RefreshCw, Check, TrendingDown, AlertTriangle, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import SupplierCatalogImportWithSupplier from '../components/SupplierCatalogImportWithSupplier';
import PriceComparator from '../components/PriceComparator';
import ProductPriceHistoryChart from '../components/ProductPriceHistoryChart';
import SupplierOnlineUpdate from '../components/SupplierOnlineUpdate';
import UpdateErrorsTable from '../components/UpdateErrorsTable';
import SupplierProductQuery from '../components/SupplierProductQuery';
import GasSupplierPortal from '../components/GasSupplierPortal';

const CATEGORIES = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general', 'material', 'mano_obra', 'otro'];

// Reintento con backoff exponencial para fallos de conexión
async function withRetry(fn, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = String(err?.message || err || '').toLowerCase();
      const isTransient = msg.includes('fetch') || msg.includes('network') ||
        msg.includes('timeout') || msg.includes('500') || msg.includes('502') ||
        msg.includes('503') || msg.includes('429') || msg.includes('failed to load');
      if (isTransient && attempt < maxRetries) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt), 15000);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }
}

export default function SupplierTariffs() {
  const [suppliers, setSuppliers] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [autoFetchingImage, setAutoFetchingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('tarifas');
  const imageFileRef = useRef(null);
  // Relleno de imágenes en segundo plano (por lotes, poco a poco)
  const [bulkImg, setBulkImg] = useState(null); // { done, total, ok } | null
  const bulkCancelRef = useRef(false);
  // Actualización desde la web del proveedor (precio/foto/descripción)
  const [bulkUpd, setBulkUpd] = useState(null); // { done, total, ok } | null
  const bulkUpdCancelRef = useRef(false);
  const autoFetchTimerRef = useRef(null);
  const lastAutoFetchNameRef = useRef('');

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    const PAGE = 1000;

    let supp, firstBatch;
    try {
      [supp, firstBatch] = await withRetry(() => Promise.all([
        base44.entities.Supplier.list('name', 200),
        base44.entities.SupplierPrice.list('-created_date', PAGE, 0),
      ]));
    } catch (err) {
      setLoading(false);
      setLoadError(true);
      toast.error('Error de conexión. Pulsa recargar para reintentar.');
      return;
    }

    setSuppliers(supp);
    setPrices(firstBatch);
    setLoading(false);

    if (firstBatch.length === PAGE) {
      let allPrices = [...firstBatch];
      let skip = PAGE;
      // Sin tope artificial: cargar TODAS las tarifas (guardia de seguridad muy
      // alta por si hay catálogos enormes, p. ej. Salvador Escoda ~64.000 refs).
      const MAX_RECORDS = 500000;

      const loadBatchesInParallel = async () => {
        while (skip < MAX_RECORDS) {
          const batchRequests = [];
          for (let i = 0; i < 4 && skip < MAX_RECORDS; i++) {
            batchRequests.push(
              withRetry(() => base44.entities.SupplierPrice.list('-created_date', PAGE, skip))
            );
            skip += PAGE;
          }
          const batches = await Promise.all(batchRequests);
          let hasMore = false;
          batches.forEach(batch => {
            if (batch.length > 0) {
              allPrices = allPrices.concat(batch);
              if (batch.length === PAGE) hasMore = true;
            }
          });
          setPrices([...allPrices]);
          if (!hasMore) break;
        }
      };

      loadBatchesInParallel().catch(() => {});
    }
  };

  // Auto-búsqueda de imagen con debounce al cambiar el nombre
  const triggerAutoImageSearch = useCallback((productName, brand, productCode) => {
    if (!productName || productName.trim().length < 3) return;
    if (productName === lastAutoFetchNameRef.current) return;
    clearTimeout(autoFetchTimerRef.current);
    autoFetchTimerRef.current = setTimeout(async () => {
      lastAutoFetchNameRef.current = productName;
      setAutoFetchingImage(true);
      try {
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Busca en internet la imagen oficial del producto: "${productName}"${brand ? ` de la marca ${brand}` : ''}${productCode ? `, referencia ${productCode}` : ''}. Devuelve solo la URL directa de la imagen del producto (JPG, PNG o WebP). Si no encuentras una imagen fiable, devuelve null.`,
          add_context_from_internet: true,
          response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
        });
        if (res?.image_url) {
          setEditForm(f => ({ ...f, image_url: res.image_url }));
          toast.success('Imagen encontrada automáticamente');
        }
      } catch (_) {}
      setAutoFetchingImage(false);
    }, 1200);
  }, []);

  useEffect(() => { loadData(); }, []);

  // ── Rellenar imágenes que faltan, en segundo plano y poco a poco ───────────
  const fillMissingImages = async () => {
    if (bulkImg) { bulkCancelRef.current = true; return; } // segundo clic = detener
    // Productos sin imagen (respetando el filtro de proveedor si hay uno activo)
    const pendientes = prices.filter(p =>
      !p.image_url && (filterSupplier === 'all' || p.supplier_id === filterSupplier)
    );
    if (pendientes.length === 0) { toast.info('No hay productos sin imagen'); return; }
    bulkCancelRef.current = false;
    setBulkImg({ done: 0, total: pendientes.length, ok: 0 });
    let done = 0, ok = 0;
    const CONC = 2; // 2 en paralelo para no saturar
    let idx = 0;
    const worker = async () => {
      while (idx < pendientes.length && !bulkCancelRef.current) {
        const item = pendientes[idx++];
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `Busca en internet la imagen oficial del producto: "${item.product_name}"${item.brand ? ` de la marca ${item.brand}` : ''}${item.product_code ? `, referencia ${item.product_code}` : ''}. Devuelve solo la URL directa de la imagen (JPG, PNG o WebP). Si no encuentras una fiable, devuelve null.`,
            add_context_from_internet: true,
            response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
          });
          if (res?.image_url) {
            await base44.entities.SupplierPrice.update(item.id, { image_url: res.image_url });
            ok++;
            // actualizar la ficha en pantalla al momento
            setPrices(prev => prev.map(p => p.id === item.id ? { ...p, image_url: res.image_url } : p));
          }
        } catch (_) { /* seguir con el siguiente */ }
        done++;
        setBulkImg({ done, total: pendientes.length, ok });
        await new Promise(r => setTimeout(r, 250)); // ritmo suave
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONC, pendientes.length) }, worker));
    setBulkImg(null);
    toast.success(`Imágenes rellenadas: ${ok} de ${pendientes.length}${bulkCancelRef.current ? ' (detenido)' : ''}`);
  };

  // ── Actualizar precio/foto/descripción desde la web del proveedor ──────────
  const updateFromSupplierWeb = async () => {
    if (bulkUpd) { bulkUpdCancelRef.current = true; return; } // segundo clic = detener
    const lista = prices.filter(p => filterSupplier === 'all' || p.supplier_id === filterSupplier);
    if (lista.length === 0) { toast.info('No hay productos para actualizar'); return; }
    if (!window.confirm(`Se buscarán en internet los datos actuales (precio, foto y descripción) de ${lista.length} productos y se actualizarán. Va poco a poco en segundo plano. ¿Continuar?`)) return;
    bulkUpdCancelRef.current = false;
    setBulkUpd({ done: 0, total: lista.length, ok: 0 });
    let done = 0, ok = 0, idx = 0;
    const CONC = 2;
    const worker = async () => {
      while (idx < lista.length && !bulkUpdCancelRef.current) {
        const item = lista[idx++];
        try {
          const res = await base44.integrations.Core.InvokeLLM({
            prompt: `Busca en internet (preferiblemente en la web oficial del proveedor/fabricante) los datos ACTUALES del producto: "${item.product_name}"${item.brand ? ` marca ${item.brand}` : ''}${item.product_code ? `, referencia ${item.product_code}` : ''}${item.supplier_name ? ` del proveedor ${item.supplier_name}` : ''}. Devuelve: precio_actual (número en euros, sin IVA si es posible), image_url (URL directa de la foto oficial JPG/PNG/WebP) y descripcion (texto breve del producto). Si algún dato no es fiable, déjalo null.`,
            add_context_from_internet: true,
            response_json_schema: { type: 'object', properties: {
              precio_actual: { type: 'number' }, image_url: { type: 'string' }, descripcion: { type: 'string' }
            } }
          });
          const upd = {};
          if (res?.precio_actual && res.precio_actual > 0) upd.cost_price = res.precio_actual;
          if (res?.image_url) upd.image_url = res.image_url;
          if (res?.descripcion && res.descripcion.length > 3 && !item.product_name) upd.product_name = res.descripcion;
          if (res?.descripcion && res.descripcion.length > 3) upd.notes = res.descripcion;
          if (Object.keys(upd).length) {
            await base44.entities.SupplierPrice.update(item.id, upd);
            ok++;
            setPrices(prev => prev.map(p => p.id === item.id ? { ...p, ...upd } : p));
          }
        } catch (_) { /* seguir */ }
        done++;
        setBulkUpd({ done, total: lista.length, ok });
        await new Promise(r => setTimeout(r, 300));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONC, lista.length) }, worker));
    setBulkUpd(null);
    toast.success(`Actualizados desde web: ${ok} de ${lista.length}${bulkUpdCancelRef.current ? ' (detenido)' : ''}`);
  };

  // Agrupar por proveedor
  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = prices.filter(p => {
      const matchSearch = !q ||
        p.product_name?.toLowerCase().includes(q) ||
        p.product_code?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.supplier_name?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q);
      const matchCat = filterCategory === 'all' || p.category === filterCategory;
      const matchSupp = filterSupplier === 'all' || p.supplier_id === filterSupplier;
      return matchSearch && matchCat && matchSupp;
    });

    const map = {};
    filtered.forEach(p => {
      const key = p.supplier_id || 'sin_proveedor';
      if (!map[key]) {
        const supp = suppliers.find(s => s.id === p.supplier_id);
        map[key] = { supplier: supp || { id: key, name: p.supplier_name || 'Sin proveedor' }, items: [] };
      }
      map[key].items.push(p);
    });
    return Object.values(map).sort((a, b) => a.supplier.name.localeCompare(b.supplier.name));
  }, [prices, suppliers, search, filterCategory, filterSupplier]);

  const toggleSupplier = (id) => {
    setExpandedSuppliers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({ ...item });
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    await base44.entities.SupplierPrice.update(editItem.id, editForm);
    setPrices(prev => prev.map(p => p.id === editItem.id ? { ...p, ...editForm } : p));
    setEditItem(null);
    setSavingEdit(false);
    toast.success('Producto actualizado');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar esta tarifa? Esta acción no se puede deshacer.')) return;
    await base44.entities.SupplierPrice.delete(id);
    setPrices(prev => prev.filter(p => p.id !== id));
    toast.success('Tarifa eliminada');
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEditForm(f => ({ ...f, image_url: file_url }));
    setUploadingImage(false);
    toast.success('Imagen subida');
  };

  const handleFetchImage = async () => {
    if (!editForm.product_name) return;
    setFetchingImage(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Busca en internet la imagen oficial del producto: "${editForm.product_name}"${editForm.brand ? ` de la marca ${editForm.brand}` : ''}${editForm.product_code ? `, referencia ${editForm.product_code}` : ''}. Devuelve solo la URL directa de la imagen del producto (JPG o PNG). Si no encuentras una imagen fiable, devuelve null.`,
      add_context_from_internet: true,
      response_json_schema: { type: 'object', properties: { image_url: { type: 'string' } } }
    });
    if (res?.image_url) setEditForm(f => ({ ...f, image_url: res.image_url }));
    else toast.info('No se encontró imagen para este producto');
    setFetchingImage(false);
  };

  const totalProducts = prices.length;
  const totalSuppliers = new Set(prices.map(p => p.supplier_id)).size;

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tarifas por Proveedor</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalProducts} productos · {totalSuppliers} proveedores</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <SupplierProductQuery suppliers={suppliers} />
          <GasSupplierPortal />
          <SupplierCatalogImportWithSupplier suppliers={suppliers} onImported={(saved, partial) => {
            if (!partial) loadData();
          }} />
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('tarifas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tarifas' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Package className="w-4 h-4" />
          Tarifas
        </button>
        <button
          onClick={() => setActiveTab('comparador')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'comparador' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <TrendingDown className="w-4 h-4" />
          Comparador de precios
        </button>
        <button
          onClick={() => setActiveTab('errores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'errores' ? 'bg-white shadow text-orange-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          Errores de datos
        </button>
      </div>

      {/* Contenido del comparador */}
      {activeTab === 'comparador' && (
        <PriceComparator prices={prices} suppliers={suppliers} />
      )}

      {/* Errores de datos */}
      {activeTab === 'errores' && (
        <UpdateErrorsTable
          suppliers={suppliers}
          onFixed={(id, field, value) => {
            setPrices(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
          }}
        />
      )}

      {/* Filtros — solo en pestaña tarifas */}
      {activeTab === 'tarifas' && <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar producto, referencia..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterSupplier} onValueChange={setFilterSupplier}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los proveedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proveedores</SelectItem>
            {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadData} title="Recargar">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button
          variant={bulkImg ? 'destructive' : 'outline'}
          onClick={fillMissingImages}
          className="gap-2 whitespace-nowrap"
          title="Buscar y rellenar las imágenes que faltan, en segundo plano"
        >
          {bulkImg
            ? <><Loader2 className="w-4 h-4 animate-spin" />{`Imágenes ${bulkImg.done}/${bulkImg.total} — Detener`}</>
            : <><ImageIcon className="w-4 h-4" />Rellenar imágenes que faltan</>}
        </Button>
        <Button
          variant={bulkUpd ? 'destructive' : 'outline'}
          onClick={updateFromSupplierWeb}
          className="gap-2 whitespace-nowrap"
          title="Buscar en la web del proveedor el precio, foto y descripción actuales y actualizar"
        >
          {bulkUpd
            ? <><Loader2 className="w-4 h-4 animate-spin" />{`Actualizando ${bulkUpd.done}/${bulkUpd.total} — Detener`}</>
            : <><RefreshCw className="w-4 h-4" />Actualizar desde web (precio/foto/desc.)</>}
        </Button>
      </div>}
      {bulkUpd && (
        <div className="text-xs text-gray-500 -mt-2">
          Actualizando desde la web del proveedor: {bulkUpd.done}/{bulkUpd.total} ({bulkUpd.ok} actualizados). En segundo plano; puedes seguir trabajando.
        </div>
      )}
      {bulkImg && (
        <div className="text-xs text-gray-500 -mt-2">
          Rellenando imágenes en segundo plano: {bulkImg.done}/{bulkImg.total} ({bulkImg.ok} encontradas). Puedes seguir usando el programa.
        </div>
      )}

      {activeTab === 'tarifas' && loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando tarifas...
        </div>
      )}

      {activeTab === 'tarifas' && loadError && !loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
          <WifiOff className="w-10 h-10 text-red-400" />
          <p className="font-medium text-red-600">Error de conexión al cargar las tarifas</p>
          <p className="text-sm text-gray-400">Comprueba tu conexión e inténtalo de nuevo</p>
          <Button onClick={loadData} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Reintentar
          </Button>
        </div>
      )}

      {activeTab === 'tarifas' && !loading && grouped.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay productos en las tarifas</p>
          <p className="text-sm mt-1">Importa un catálogo PDF/Excel de tu proveedor para empezar</p>
        </div>
      )}

      {/* Lista agrupada por proveedor */}
      {activeTab === 'tarifas' && <div className="space-y-3">
        {grouped.map(({ supplier, items }) => {
          const isOpen = expandedSuppliers.has(supplier.id);
          return (
            <div key={supplier.id} className="border rounded-xl overflow-hidden shadow-sm">
              {/* Cabecera proveedor */}
              <button
                className="w-full flex items-center gap-3 p-4 bg-white hover:bg-gray-50 transition-colors"
                onClick={() => toggleSupplier(supplier.id)}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {supplier.logo_url ? (
                    <img 
                      src={supplier.logo_url} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">{supplier.name}</p>
                  <p className="text-xs text-gray-500">{items.length} productos en tarifa · {items.filter(i => !i.image_url).length} sin imagen</p>
                </div>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">{supplier.category || 'general'}</Badge>
                <div onClick={e => e.stopPropagation()}>
                  <SupplierOnlineUpdate supplier={supplier} prices={prices} onUpdated={loadData} />
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </button>

              {/* Tabla de productos */}
              {isOpen && (
                <div className="border-t bg-gray-50">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-xs text-gray-500 uppercase">
                          <th className="text-left p-3 w-12"></th>
                          <th className="text-left p-3">Producto</th>
                          <th className="text-left p-3 hidden sm:table-cell">Ref.</th>
                          <th className="text-left p-3 hidden md:table-cell">Categoría</th>
                          <th className="text-right p-3">Coste</th>
                          <th className="text-right p-3">Venta</th>
                          <th className="text-right p-3 hidden sm:table-cell">Margen</th>
                          <th className="p-3 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map(item => (
                          <tr key={item.id} className="bg-white hover:bg-blue-50 transition-colors">
                            <td className="p-2">
                              <div className="w-10 h-10 rounded-lg border bg-gray-50 flex items-center justify-center overflow-hidden">
                                {item.image_url ? (
                                  <img 
                                    src={item.image_url} 
                                    alt="" 
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                    decoding="async"
                                    onError={e => { e.target.style.display = 'none'; }} 
                                  />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-gray-300" />
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <p className="font-medium text-gray-900 line-clamp-2">{item.product_name}</p>
                              {item.notes && <p className="text-xs text-gray-400 truncate max-w-xs">{item.notes}</p>}
                            </td>
                            <td className="p-3 hidden sm:table-cell text-xs text-gray-500 font-mono">{item.product_code || '—'}</td>
                            <td className="p-3 hidden md:table-cell">
                              <Badge variant="outline" className="text-[10px]">{item.category || '—'}</Badge>
                            </td>
                            <td className="p-3 text-right font-semibold text-gray-800">
                              {item.cost_price != null ? `${Number(item.cost_price).toFixed(2)} €` : '—'}
                            </td>
                            <td className="p-3 text-right font-semibold text-emerald-700">
                              {item.sale_price != null ? `${Number(item.sale_price).toFixed(2)} €` : '—'}
                            </td>
                            <td className="p-3 text-right hidden sm:table-cell text-xs">
                              {item.margin != null ? <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">{item.margin}%</span> : '—'}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>}

      {/* Dialog editar producto */}
      <Dialog open={!!editItem} onOpenChange={o => !o && setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar producto</DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="space-y-3">
              {/* Imagen */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {editForm.image_url ? (
                    <img 
                      src={editForm.image_url} 
                      alt="" 
                      className="w-full h-full object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <Input
                    placeholder="URL imagen"
                    value={editForm.image_url || ''}
                    onChange={e => setEditForm(f => ({ ...f, image_url: e.target.value }))}
                    className="text-xs"
                  />
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={handleFetchImage} disabled={fetchingImage}>
                    {fetchingImage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                    Buscar imagen en internet
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs w-full" onClick={() => imageFileRef.current?.click()} disabled={uploadingImage}>
                    {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
                    Subir imagen desde archivo
                  </Button>
                  <input ref={imageFileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                </div>
              </div>

              <div className="relative">
                <Input
                  placeholder="Nombre del producto * (admite α β Ω °C µ etc.)"
                  value={editForm.product_name || ''}
                  onChange={e => {
                    const name = e.target.value;
                    setEditForm(f => ({ ...f, product_name: name }));
                    // Auto-buscar imagen solo si aún no hay imagen
                    if (!editForm.image_url) {
                      triggerAutoImageSearch(name, editForm.brand, editForm.product_code);
                    }
                  }}
                  inputMode="text"
                  style={{ unicodeBidi: 'plaintext' }}
                />
                {autoFetchingImage && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-blue-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> buscando imagen...
                  </div>
                )}
              </div>
              <Input placeholder="Código / Referencia" value={editForm.product_code || ''} onChange={e => setEditForm(f => ({ ...f, product_code: e.target.value }))} />
              <Select value={editForm.category || 'material'} onValueChange={v => setEditForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Precio coste (€)</label>
                  <Input type="number" step="0.01" value={editForm.cost_price ?? ''} onChange={e => setEditForm(f => ({ ...f, cost_price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Precio venta (€)</label>
                  <Input type="number" step="0.01" value={editForm.sale_price ?? ''} onChange={e => setEditForm(f => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Margen (%)</label>
                  <Input type="number" value={editForm.margin ?? ''} onChange={e => setEditForm(f => ({ ...f, margin: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <Input placeholder="Unidad (ud, m, kg...)" value={editForm.unit || ''} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} />
              <Input placeholder="Notas adicionales" value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />

              {/* Gráfica de evolución de precio */}
              <div className="border rounded-xl p-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />Evolución de precio entre proveedores
                </p>
                <ProductPriceHistoryChart product={editItem} allPrices={prices} />
              </div>

              <Button onClick={handleSaveEdit} disabled={savingEdit} className="w-full bg-blue-700 hover:bg-blue-800">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                Guardar cambios
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}