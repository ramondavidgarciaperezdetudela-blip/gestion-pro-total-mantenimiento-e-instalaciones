import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tag } from 'lucide-react';

/**
 * Muestra un selector de proveedor y el precio real del producto del catálogo.
 * materialName: string para hacer fuzzy match con los product_name de SupplierPrice
 */
export default function SupplierPriceLookup({ materialName, defaultPrice }) {
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [supplierPrices, setSupplierPrices] = useState([]);
  const [matched, setMatched] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.Supplier.list().then(data => setSuppliers(data.filter(s => s.is_active !== false)));
  }, []);

  const handleSelectSupplier = async (supplierId) => {
    setSelectedSupplier(supplierId);
    if (!supplierId) { setMatched(null); return; }
    setLoading(true);
    const prices = await base44.entities.SupplierPrice.filter({ supplier_id: supplierId });
    setSupplierPrices(prices || []);
    // Fuzzy match: find best price for this material
    const keywords = materialName.toLowerCase().split(' ').filter(w => w.length > 3);
    const found = (prices || []).find(p => {
      const pname = p.product_name?.toLowerCase() || '';
      return keywords.some(k => pname.includes(k));
    });
    setMatched(found || null);
    setLoading(false);
  };

  const supplierName = suppliers.find(s => s.id === selectedSupplier)?.name;

  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <Select value={selectedSupplier} onValueChange={handleSelectSupplier}>
        <SelectTrigger className="h-7 text-[10px] border-gray-200">
          <SelectValue placeholder="Proveedor..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>— Sin proveedor —</SelectItem>
          {suppliers.map(s => (
            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {loading && <span className="text-[10px] text-gray-400 animate-pulse">Buscando precio...</span>}
      {!loading && selectedSupplier && (
        matched ? (
          <div className="flex flex-col gap-0.5">
            <Badge className="bg-green-100 text-green-800 text-[10px] w-fit flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />
              Coste: <strong>{matched.cost_price} €/{matched.unit || 'ud'}</strong>
            </Badge>
            {matched.sale_price > 0 && matched.sale_price !== matched.cost_price && (
              <Badge className="bg-blue-100 text-blue-800 text-[10px] w-fit">
                Venta: {matched.sale_price} €/{matched.unit || 'ud'}
              </Badge>
            )}
            {matched.validity_date && (
              <span className="text-[9px] text-gray-400">Válido: {new Date(matched.validity_date).toLocaleDateString('es-ES')}</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-amber-600">Sin precio en catálogo</span>
        )
      )}
      {!selectedSupplier && defaultPrice && (
        <span className="text-[10px] text-gray-400">Ref: {defaultPrice}</span>
      )}
    </div>
  );
}