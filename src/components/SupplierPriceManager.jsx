import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, Plus, Upload, Loader2, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function SupplierPriceManager({ supplierId, supplierName }) {
  const [prices, setPrices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState({
    product_code: '',
    product_name: '',
    cost_price: 0,
    sale_price: 0,
    validity_date: '',
    quantity: 0,
    unit: 'uds',
    category: '',
    notes: '',
    is_active: true
  });

  const loadPrices = async () => {
    const data = await base44.entities.SupplierPrice.filter({ supplier_id: supplierId });
    setPrices(data || []);
  };

  React.useEffect(() => {
    if (supplierId) {
      loadPrices();
    }
  }, [supplierId]);

  const calculateMargin = (cost, sale) => {
    if (cost <= 0) return 0;
    return Math.round(((sale - cost) / cost) * 100);
  };

  const handleSave = async () => {
    if (!form.product_code || !form.product_name || form.cost_price <= 0) {
      toast.error('Código, nombre y precio de coste son obligatorios');
      return;
    }
    try {
      const margin = calculateMargin(form.cost_price, form.sale_price);
      const priceData = {
        supplier_id: supplierId,
        supplier_name: supplierName,
        ...form,
        sale_price: form.sale_price || form.cost_price,
        margin
      };
      
      if (editingPrice) {
        await base44.entities.SupplierPrice.update(editingPrice.id, priceData);
      } else {
        await base44.entities.SupplierPrice.create(priceData);
      }
      
      await loadPrices();
      setDialogOpen(false);
      setEditingPrice(null);
      setForm({ product_code: '', product_name: '', cost_price: 0, sale_price: 0, validity_date: '', quantity: 0, unit: 'uds', category: '', notes: '', is_active: true });
      toast.success('Precio guardado');
    } catch (error) {
      toast.error('Error al guardar');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.SupplierPrice.delete(id);
    await loadPrices();
  };

  const handleEdit = (price) => {
    setEditingPrice(price);
    setForm({
      product_code: price.product_code || '',
      product_name: price.product_name || '',
      cost_price: price.cost_price || 0,
      sale_price: price.sale_price || 0,
      validity_date: price.validity_date || '',
      quantity: price.quantity || 0,
      unit: price.unit || 'uds',
      category: price.category || '',
      notes: price.notes || '',
      is_active: price.is_active !== false
    });
    setDialogOpen(true);
  };

  const handleImportCSV = async (file) => {
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const schema = {
        type: "object",
        properties: {
          products: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_code: { type: "string" },
                product_name: { type: "string" },
                cost_price: { type: "number" },
                sale_price: { type: "number" },
                validity_date: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                category: { type: "string" }
              }
            }
          }
        }
      };

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      if (extracted.status === 'success' && extracted.output?.products?.length > 0) {
        let created = 0;
        for (const product of extracted.output.products) {
          if (product.product_code && product.product_name && product.cost_price) {
            const margin = calculateMargin(product.cost_price, product.sale_price || product.cost_price);
            await base44.entities.SupplierPrice.create({
              supplier_id: supplierId,
              supplier_name: supplierName,
              product_code: product.product_code,
              product_name: product.product_name,
              cost_price: product.cost_price,
              sale_price: product.sale_price || product.cost_price,
              validity_date: product.validity_date || '',
              quantity: product.quantity || 0,
              unit: product.unit || 'uds',
              category: product.category || '',
              margin,
              is_active: true
            });
            created++;
          }
        }
        await loadPrices();
        toast.success(`${created} productos importados`);
      } else {
        toast.error('No se encontraron productos válidos en el archivo');
      }
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Error al importar el archivo');
    }
    setImporting(false);
  };

  const activePrices = prices.filter(p => p.is_active !== false);
  const inactivePrices = prices.filter(p => p.is_active === false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">Precios ({activePrices.length})</h3>
        <div className="flex gap-2">
          <label className="relative">
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 cursor-pointer"
              disabled={importing}
              onClick={(e) => {
                if (importing) e.preventDefault();
              }}
            >
              {importing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Upload className="w-3 h-3 mr-1" />}
              {importing ? 'Importando...' : 'Importar CSV'}
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImportCSV(e.target.files[0])}
              disabled={importing}
            />
          </label>
          <Button
            onClick={() => {
              setEditingPrice(null);
              setForm({ product_code: '', product_name: '', cost_price: 0, sale_price: 0, validity_date: '', quantity: 0, unit: 'uds', category: '', notes: '', is_active: true });
              setDialogOpen(true);
            }}
            size="sm"
            className="text-xs h-8 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-3 h-3 mr-1" />
            Añadir precio
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {prices.length === 0 ? (
          <p className="text-xs text-gray-400">Sin precios. Añade o importa desde CSV.</p>
        ) : (
          <>
            {activePrices.length > 0 && (
              <div className="space-y-2">
                {activePrices.map(price => (
                  <Card key={price.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-xs">{price.product_name}</h4>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-gray-600">{price.product_code}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-1 text-xs">
                          <div>
                            <span className="text-gray-500">Coste:</span> <span className="font-medium text-green-600">{price.cost_price}€</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Venta:</span> <span className="font-medium text-blue-600">{price.sale_price}€</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-gray-500">
                          {price.margin !== undefined && (
                            <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                              Margen: {price.margin}%
                            </span>
                          )}
                          {price.validity_date && (
                            <span>Válido hasta: {new Date(price.validity_date).toLocaleDateString()}</span>
                          )}
                          {price.quantity > 0 && <span>Stock: {price.quantity} {price.unit}</span>}
                        </div>
                        {price.notes && <p className="text-[10px] text-gray-500 mt-1">{price.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => handleEdit(price)} className="p-1.5 text-blue-400 hover:text-blue-600 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(price.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            {inactivePrices.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Inactivos ({inactivePrices.length})</p>
                <div className="space-y-1 opacity-60">
                  {inactivePrices.map(price => (
                    <Card key={price.id} className="p-2">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium">{price.product_name}</span>
                          <span className="text-gray-500 ml-2">({price.product_code})</span>
                        </div>
                        <button onClick={() => handleEdit(price)} className="text-blue-400 hover:text-blue-600">
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPrice ? 'Editar' : 'Nuevo'} precio</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Código *" value={form.product_code} onChange={e => setForm({...form, product_code: e.target.value})} />
              <Input placeholder="Unidad" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
            </div>
            <Input placeholder="Nombre del producto *" value={form.product_name} onChange={e => setForm({...form, product_name: e.target.value})} />
            <Input placeholder="Categoría" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
            
            <div className="border-t pt-2">
              <p className="text-xs font-semibold text-gray-700 mb-2">Precios</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-600">Precio coste *</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={form.cost_price} 
                    onChange={e => setForm({...form, cost_price: parseFloat(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Precio venta</label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={form.sale_price} 
                    onChange={e => setForm({...form, sale_price: parseFloat(e.target.value) || 0})}
                    className="mt-1"
                  />
                </div>
              </div>
              {form.cost_price > 0 && form.sale_price > 0 && (
                <div className="mt-2 p-2 bg-green-50 rounded text-xs text-green-700">
                  Margen: {calculateMargin(form.cost_price, form.sale_price)}%
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-600">Cantidad</label>
                <Input 
                  type="number" 
                  value={form.quantity} 
                  onChange={e => setForm({...form, quantity: parseFloat(e.target.value) || 0})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Válido hasta</label>
                <Input 
                  type="date" 
                  value={form.validity_date} 
                  onChange={e => setForm({...form, validity_date: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />

            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
              Precio activo
            </label>

            <Button onClick={handleSave} className="w-full">{editingPrice ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}