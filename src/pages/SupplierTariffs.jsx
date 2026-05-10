import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Search, Building2, Package, Image as ImageIcon, ChevronDown, ChevronRight,
  Upload, Trash2, Edit, Plus, Loader2, RefreshCw, X, Check, TrendingDown, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import SupplierCatalogImportWithSupplier from '../components/SupplierCatalogImportWithSupplier';
import PriceComparator from '../components/PriceComparator';
import ProductPriceHistoryChart from '../components/ProductPriceHistoryChart';
import SupplierOnlineUpdate from '../components/SupplierOnlineUpdate';
import UpdateErrorsTable from '../components/UpdateErrorsTable';

// Cache simple para reducir re-renders
const imageCache = new Map();

const CATEGORIES = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general', 'material', 'mano_obra', 'otro'];

export default function SupplierTariffs() {
  const [suppliers, setSuppliers] = useState([]);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [fetchingImage, setFetchingImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState('tarifas'); // 'tarifas' | 'comparador' | 'errores'
  const imageFileRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    const PAGE = 1000; // Aumentar a 1000 para menos requests

    // Cargar proveedores y primera página de productos en paralelo
    const [supp, firstBatch] = await Promise.all([
      base44.entities.Supplier.list('name', 200),
      base44.entities.SupplierPrice.list('-created_date', PAGE, 0),
    ]);

    setSuppliers(supp);
    setPrices(firstBatch);
    setLoading(false); // UI ya usable con los primeros 1000

    // Seguir cargando el resto en background sin bloquear la interfaz
    // Cargar próximas 3 páginas en paralelo para acelerar
    if (firstBatch.length === PAGE) {
      let allPrices = [...firstBatch];
      let skip = PAGE;
      
      const loadBatchesInParallel = async () => {
        while (skip < PAGE * 5) { // Cargar máx 5 páginas total
          const batchRequests = [];
          for (let i = 0; i < 3 && skip < PAGE * 5; i++) {
            batchRequests.push(base44.entities.SupplierPrice.list('-created_date', PAGE, skip));
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
          
          if (allPrices.length > prices.length) {
            setPrices([...allPrices]);
          }
          
          if (!hasMore) break;
        }
      };
      
      loadBatchesInParallel().catch(() => {});
    }
  };

  useEffect(() => { loadData(); }, []);

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
    await base44.entities.SupplierPrice.delete(id);
    setPrices(prev => prev.filter(p => p.id !== id));
    toast.success('Producto eliminado');
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
        <SupplierCatalogImportWithSupplier suppliers={suppliers} onImported={(saved, partial) => {
          // En importación parcial solo recargamos al final para no saturar
          if (!partial) loadData();
        }} />
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
      </div>}

      {activeTab === 'tarifas' && loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando tarifas...
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

              <Input placeholder="Nombre del producto *" value={editForm.product_name || ''} onChange={e => setEditForm(f => ({ ...f, product_name: e.target.value }))} />
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