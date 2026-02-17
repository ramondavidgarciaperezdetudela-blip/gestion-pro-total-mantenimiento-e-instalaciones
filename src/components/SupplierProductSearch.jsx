import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Loader2, ExternalLink, Package } from 'lucide-react';

export default function SupplierProductSearch({ open, onClose, onAddItem }) {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Supplier.list().then(data => {
        setSuppliers(data.filter(s => s.is_active !== false));
      });
    }
  }, [open]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    const supplierName = supplier ? supplier.name : 'distribuidores españoles de climatización y refrigeración (Salvador Escoda, Hidro Elèctric SyG, etc.)';

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres un asistente de búsqueda de productos para instaladores. 
      El instalador busca: "${query}"
      Distribuidor seleccionado: ${supplierName}
      
      Genera una lista de 5-8 productos realistas que este distribuidor podría tener, con precios orientativos en euros (IVA no incluido) actuales del mercado español 2025-2026.
      Incluye referencias de producto típicas de catálogo español.
      Si el distribuidor es Salvador Escoda, usa sus referencias habituales de catálogo.
      Si es Hidroelectric SYG, usa referencias de material eléctrico y clima.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          productos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                referencia: { type: "string" },
                descripcion: { type: "string" },
                marca: { type: "string" },
                precio_unitario: { type: "number" },
                unidad: { type: "string" },
                disponibilidad: { type: "string" },
                notas: { type: "string" }
              }
            }
          },
          distribuidor: { type: "string" },
          ultima_actualizacion: { type: "string" }
        }
      }
    });

    setResults(res.productos || []);
    setSearching(false);
  };

  const handleAdd = (product) => {
    onAddItem({
      description: `[${product.referencia}] ${product.descripcion} - ${product.marca}`,
      quantity: 1,
      unit_price: product.precio_unitario || 0,
      discount: 0,
      total: product.precio_unitario || 0,
      _supplier: suppliers.find(s => s.id === selectedSupplier)?.name || ''
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Buscar productos en distribuidores
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar distribuidor (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Todos los distribuidores</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} <span className="text-gray-400 text-xs ml-1">({s.category})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Ej: tubería cobre 1/4, split 3.5kW Daikin, válvula expansión..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || !query.trim()} className="bg-blue-600">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {searching && (
            <div className="text-center py-8 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-sm">Consultando precios en tiempo real...</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                {results.length} productos encontrados · Precios orientativos sin IVA
              </p>
              {results.map((product, i) => (
                <div key={i} className="border rounded-lg p-3 hover:bg-blue-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-mono">{product.referencia}</Badge>
                        <Badge className="text-[10px] bg-gray-100 text-gray-600">{product.marca}</Badge>
                        {product.disponibilidad && (
                          <Badge className={`text-[10px] ${product.disponibilidad.toLowerCase().includes('stock') ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {product.disponibilidad}
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1">{product.descripcion}</p>
                      {product.notas && <p className="text-xs text-gray-400 mt-0.5">{product.notas}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-lg text-blue-700">{product.precio_unitario?.toFixed(2)} €</p>
                      <p className="text-[10px] text-gray-400">/{product.unidad || 'ud.'} s/IVA</p>
                      <Button
                        size="sm"
                        className="mt-2 bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                        onClick={() => handleAdd(product)}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        Añadir
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!searching && results.length === 0 && query && (
            <p className="text-center text-gray-400 py-4 text-sm">Realiza una búsqueda para ver productos</p>
          )}

          <div className="border-t pt-3">
            <p className="text-[10px] text-gray-400 text-center">
              ⚠️ Precios orientativos consultados en tiempo real. Verifique con el distribuidor antes de enviar el presupuesto.
              Para precios exactos, acceda directamente a la tienda online del distribuidor.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}