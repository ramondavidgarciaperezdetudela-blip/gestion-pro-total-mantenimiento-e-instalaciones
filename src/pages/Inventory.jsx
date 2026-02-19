import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2, Edit, Package, Wrench, AlertTriangle, Upload, Printer } from 'lucide-react';
import PrintButton from '../components/PrintButton';

const EQ_CATEGORIES = ['herramienta', 'maquinaria', 'vehiculo', 'instrumento_medicion', 'equipo_proteccion', 'otro'];
const EQ_STATUSES = ['operativo', 'en_revision', 'averiado', 'baja'];
const STOCK_CATEGORIES = ['tuberias_accesorios', 'cables_electricidad', 'refrigerantes', 'filtros', 'herramientas_consumibles', 'equipos_climatizacion', 'material_solar', 'fontaneria', 'otro'];
const statusColors = { operativo: 'bg-green-100 text-green-700', en_revision: 'bg-yellow-100 text-yellow-700', averiado: 'bg-red-100 text-red-700', baja: 'bg-gray-100 text-gray-500' };

const EMPTY_EQ = { name: '', brand: '', model: '', serial_number: '', category: 'herramienta', status: 'operativo', purchase_date: '', purchase_price: '', next_revision_date: '', location: '', assigned_to: '', notes: '', photo_url: '' };
const EMPTY_STOCK = { name: '', reference: '', category: 'otro', supplier_name: '', quantity: 0, unit: 'uds', min_stock: 0, unit_price: '', location: '', notes: '', photo_url: '' };

export default function Inventory() {
  const [equipment, setEquipment] = useState([]);
  const [stock, setStock] = useState([]);
  const printRef = useRef(null);
  const [eqSearch, setEqSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [eqDialog, setEqDialog] = useState(false);
  const [stockDialog, setStockDialog] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [eqForm, setEqForm] = useState(EMPTY_EQ);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK);
  const [uploading, setUploading] = useState(false);
  const [uploadingStock, setUploadingStock] = useState(false);
  const fileRef = useRef(null);
  const fileStockRef = useRef(null);

  useEffect(() => {
    base44.entities.Equipment.list('name', 200).then(setEquipment);
    base44.entities.StockItem.list('name', 200).then(setStock);
  }, []);

  const loadAll = () => {
    base44.entities.Equipment.list('name', 200).then(setEquipment);
    base44.entities.StockItem.list('name', 200).then(setStock);
  };

  const handleSaveEq = async () => {
    if (editingEq) {
      await base44.entities.Equipment.update(editingEq.id, eqForm);
    } else {
      await base44.entities.Equipment.create(eqForm);
    }
    setEqDialog(false); setEditingEq(null); setEqForm(EMPTY_EQ); loadAll();
  };

  const handleSaveStock = async () => {
    if (editingStock) {
      await base44.entities.StockItem.update(editingStock.id, stockForm);
    } else {
      await base44.entities.StockItem.create(stockForm);
    }
    setStockDialog(false); setEditingStock(null); setStockForm(EMPTY_STOCK); loadAll();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setEqForm(prev => ({ ...prev, photo_url: file_url }));
    setUploading(false);
  };

  const filteredEq = equipment.filter(e =>
    e.name?.toLowerCase().includes(eqSearch.toLowerCase()) ||
    e.brand?.toLowerCase().includes(eqSearch.toLowerCase()) ||
    e.model?.toLowerCase().includes(eqSearch.toLowerCase())
  );

  const handleStockPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingStock(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setStockForm(prev => ({ ...prev, photo_url: file_url }));
    setUploadingStock(false);
  };

  const filteredStock = stock.filter(s =>
    s.name?.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.reference?.toLowerCase().includes(stockSearch.toLowerCase()) ||
    s.category?.toLowerCase().includes(stockSearch.toLowerCase())
  );

  const lowStock = stock.filter(s => s.min_stock > 0 && s.quantity <= s.min_stock);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-slate-600" />Inventario
        </h1>
        <PrintButton contentRef={printRef} title="Inventario" />
      </div>

      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">Stock bajo en {lowStock.length} artículo(s)</p>
            <p className="text-xs text-orange-600">{lowStock.map(s => s.name).join(', ')}</p>
          </div>
        </div>
      )}

      <div ref={printRef}><Tabs defaultValue="maquinaria">
        <TabsList className="w-full">
          <TabsTrigger value="maquinaria" className="flex-1">
            <Wrench className="w-4 h-4 mr-1" />Maquinaria y equipos ({equipment.length})
          </TabsTrigger>
          <TabsTrigger value="material" className="flex-1">
            <Package className="w-4 h-4 mr-1" />Material en stock ({stock.length})
          </TabsTrigger>
        </TabsList>

        {/* MAQUINARIA */}
        <TabsContent value="maquinaria" className="space-y-3 pt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Buscar..." value={eqSearch} onChange={e => setEqSearch(e.target.value)} />
            </div>
            <Button onClick={() => { setEditingEq(null); setEqForm(EMPTY_EQ); setEqDialog(true); }} className="bg-slate-700">
              <Plus className="w-4 h-4 mr-1" />Añadir
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredEq.map(eq => (
              <Card key={eq.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {eq.photo_url ? (
                      <img src={eq.photo_url} alt="" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Wrench className="w-6 h-6 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm truncate">{eq.name}</h3>
                          {eq.brand && <p className="text-xs text-gray-500">{eq.brand} {eq.model}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingEq(eq); setEqForm({...EMPTY_EQ, ...eq}); setEqDialog(true); }} className="p-1 text-gray-400 hover:text-gray-600"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => { await base44.entities.Equipment.delete(eq.id); loadAll(); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <Badge className={`text-[10px] mt-1 ${statusColors[eq.status] || 'bg-gray-100'}`}>{eq.status}</Badge>
                      {eq.next_revision_date && <p className="text-[10px] text-gray-400 mt-1">Rev: {eq.next_revision_date}</p>}
                      {eq.location && <p className="text-[10px] text-gray-500 truncate">{eq.location}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredEq.length === 0 && <p className="text-center text-gray-400 py-8 col-span-3">No hay equipos registrados</p>}
          </div>
        </TabsContent>

        {/* MATERIAL STOCK */}
        <TabsContent value="material" className="space-y-3 pt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Buscar..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
            </div>
            <Button onClick={() => { setEditingStock(null); setStockForm(EMPTY_STOCK); setStockDialog(true); }} className="bg-slate-700">
              <Plus className="w-4 h-4 mr-1" />Añadir
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-3 font-medium text-gray-600">Artículo</th>
                  <th className="text-left p-3 font-medium text-gray-600">Categoría</th>
                  <th className="text-center p-3 font-medium text-gray-600">Stock</th>
                  <th className="text-center p-3 font-medium text-gray-600">Mín.</th>
                  <th className="text-right p-3 font-medium text-gray-600">Precio</th>
                  <th className="text-left p-3 font-medium text-gray-600">Proveedor</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredStock.map(s => (
                  <tr key={s.id} className={`hover:bg-gray-50 ${s.min_stock > 0 && s.quantity <= s.min_stock ? 'bg-orange-50' : ''}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt="" className="w-10 h-10 object-cover rounded border flex-shrink-0" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{s.name}</p>
                          {s.reference && <p className="text-xs text-gray-400">Ref: {s.reference}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Badge variant="outline" className="text-[10px]">{s.category?.replace(/_/g, ' ')}</Badge></td>
                    <td className="p-3 text-center">
                      <span className={`font-bold ${s.min_stock > 0 && s.quantity <= s.min_stock ? 'text-orange-600' : 'text-gray-800'}`}>
                        {s.quantity} {s.unit}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-500">{s.min_stock || '-'}</td>
                    <td className="p-3 text-right">{s.unit_price ? `${s.unit_price}€` : '-'}</td>
                    <td className="p-3 text-gray-500 text-xs">{s.supplier_name || '-'}</td>
                    <td className="p-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => { setEditingStock(s); setStockForm({...EMPTY_STOCK, ...s}); setStockDialog(true); }} className="p-1 text-gray-400 hover:text-gray-600"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={async () => { await base44.entities.StockItem.delete(s.id); loadAll(); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStock.length === 0 && <p className="text-center text-gray-400 py-8">No hay material registrado</p>}
          </div>
        </TabsContent>
      </Tabs>

      </div>{/* Equipment Dialog */}
      <Dialog open={eqDialog} onOpenChange={o => { setEqDialog(o); if (!o) { setEditingEq(null); setEqForm(EMPTY_EQ); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEq ? 'Editar equipo' : 'Nuevo equipo/maquinaria'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div>
                {eqForm.photo_url ? (
                  <img src={eqForm.photo_url} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed">
                    <Wrench className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <Button type="button" size="sm" variant="outline" className="mt-1 w-20 text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? '...' : <><Upload className="w-3 h-3 mr-1" />Foto</>}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex-1 space-y-2">
                <Input placeholder="Nombre *" value={eqForm.name} onChange={e => setEqForm({...eqForm, name: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Marca" value={eqForm.brand} onChange={e => setEqForm({...eqForm, brand: e.target.value})} />
                  <Input placeholder="Modelo" value={eqForm.model} onChange={e => setEqForm({...eqForm, model: e.target.value})} />
                </div>
              </div>
            </div>
            <Input placeholder="Nº de serie" value={eqForm.serial_number} onChange={e => setEqForm({...eqForm, serial_number: e.target.value})} />
            <div className="grid grid-cols-2 gap-2">
              <Select value={eqForm.category} onValueChange={v => setEqForm({...eqForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EQ_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={eqForm.status} onValueChange={v => setEqForm({...eqForm, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EQ_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Fecha compra</label><Input type="date" value={eqForm.purchase_date} onChange={e => setEqForm({...eqForm, purchase_date: e.target.value})} className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Precio compra (€)</label><Input type="number" value={eqForm.purchase_price} onChange={e => setEqForm({...eqForm, purchase_price: parseFloat(e.target.value)})} className="mt-1" /></div>
            </div>
            <div><label className="text-xs text-gray-500">Próxima revisión</label><Input type="date" value={eqForm.next_revision_date} onChange={e => setEqForm({...eqForm, next_revision_date: e.target.value})} className="mt-1" /></div>
            <Input placeholder="Ubicación" value={eqForm.location} onChange={e => setEqForm({...eqForm, location: e.target.value})} />
            <Input placeholder="Asignado a" value={eqForm.assigned_to} onChange={e => setEqForm({...eqForm, assigned_to: e.target.value})} />
            <Textarea placeholder="Notas" value={eqForm.notes} onChange={e => setEqForm({...eqForm, notes: e.target.value})} rows={2} />
            <Button onClick={handleSaveEq} className="w-full bg-slate-700">{editingEq ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Dialog */}
      <Dialog open={stockDialog} onOpenChange={o => { setStockDialog(o); if (!o) { setEditingStock(null); setStockForm(EMPTY_STOCK); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStock ? 'Editar material' : 'Nuevo material en stock'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div>
                {stockForm.photo_url ? (
                  <img src={stockForm.photo_url} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                )}
                <Button type="button" size="sm" variant="outline" className="mt-1 w-20 text-xs" onClick={() => fileStockRef.current?.click()} disabled={uploadingStock}>
                  {uploadingStock ? '...' : <><Upload className="w-3 h-3 mr-1" />Foto</>}
                </Button>
                <input ref={fileStockRef} type="file" accept="image/*" className="hidden" onChange={handleStockPhotoUpload} />
              </div>
              <div className="flex-1">
                <Input placeholder="Nombre *" value={stockForm.name} onChange={e => setStockForm({...stockForm, name: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Referencia" value={stockForm.reference} onChange={e => setStockForm({...stockForm, reference: e.target.value})} />
              <Select value={stockForm.category} onValueChange={v => setStockForm({...stockForm, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STOCK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-gray-500">Cantidad</label><Input type="number" value={stockForm.quantity} onChange={e => setStockForm({...stockForm, quantity: parseFloat(e.target.value)})} className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Unidad</label><Input placeholder="uds" value={stockForm.unit} onChange={e => setStockForm({...stockForm, unit: e.target.value})} className="mt-1" /></div>
              <div><label className="text-xs text-gray-500">Stock mínimo</label><Input type="number" value={stockForm.min_stock} onChange={e => setStockForm({...stockForm, min_stock: parseFloat(e.target.value)})} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Precio unitario (€)" type="number" value={stockForm.unit_price} onChange={e => setStockForm({...stockForm, unit_price: parseFloat(e.target.value)})} />
              <Input placeholder="Proveedor" value={stockForm.supplier_name} onChange={e => setStockForm({...stockForm, supplier_name: e.target.value})} />
            </div>
            <Input placeholder="Ubicación (almacén, estantería...)" value={stockForm.location} onChange={e => setStockForm({...stockForm, location: e.target.value})} />
            <Textarea placeholder="Notas" value={stockForm.notes} onChange={e => setStockForm({...stockForm, notes: e.target.value})} rows={2} />
            <Button onClick={handleSaveStock} className="w-full bg-slate-700">{editingStock ? 'Actualizar' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}