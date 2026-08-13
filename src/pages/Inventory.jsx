import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Trash2, Edit, Package, Wrench, AlertTriangle, Upload, Barcode, ScanLine, Users } from 'lucide-react';
import PrintButton from '../components/PrintButton';
import { compressImage } from '@/lib/compressImage';

const EQ_CATEGORIES = ['herramienta', 'maquinaria', 'vehiculo', 'instrumento_medicion', 'equipo_proteccion', 'otro'];
const EQ_STATUSES = ['operativo', 'en_revision', 'averiado', 'baja'];
const STOCK_CATEGORIES = ['tuberias_accesorios', 'cables_electricidad', 'refrigerantes', 'filtros', 'herramientas_consumibles', 'equipos_climatizacion', 'material_solar', 'fontaneria', 'otro'];
const STATUS_COLORS = { operativo: 'bg-green-100 text-green-700', en_revision: 'bg-yellow-100 text-yellow-700', averiado: 'bg-red-100 text-red-700', baja: 'bg-gray-100 text-gray-500' };
const CM_TYPES = ['aire_acondicionado','bomba_calor','camara_frigorifica','ventilacion','caldera','aerotermia','solar_fotovoltaico','solar_termico','electrico_cuadro','grupo_frio','otro'];
const CM_STATUSES = ['operativo','en_reparacion','fuera_servicio','baja'];
const EMPTY_CM = { contact_id: '', contact_name: '', name: '', machine_type: 'otro', brand: '', model: '', serial_number: '', installation_date: '', location: '', refrigerant_type: '', power_kw: '', warranty_expiry: '', next_maintenance_date: '', maintenance_interval_months: 12, status: 'operativo', photo_url: '', notes: '' };

const EMPTY_EQ = { name: '', brand: '', model: '', serial_number: '', category: 'herramienta', status: 'operativo', purchase_date: '', purchase_price: '', next_revision_date: '', location: '', assigned_to: '', notes: '', photo_url: '' };
const EMPTY_STOCK = { name: '', reference: '', barcode: '', category: 'otro', supplier_name: '', quantity: '', unit: 'uds', min_stock: '', unit_price: '', location: '', notes: '', photo_url: '' };

function BarcodeImage({ barcode }) {
  if (!barcode || barcode.length < 4) return null;
  const barcodeUrl = `https://barcodeapi.org/api/auto/${encodeURIComponent(barcode)}`;
  return (
    <div className="mt-2 text-center">
      <img src={barcodeUrl} alt={`Código: ${barcode}`} className="mx-auto h-12 max-w-full" />
      <p className="text-xs text-gray-400 mt-1 font-mono">{barcode}</p>
    </div>
  );
}

function PhotoUploader({ photoUrl, onUpload, uploading, inputRef, label }) {
  return (
    <div className="flex flex-col items-center">
      {photoUrl ? (
        <img src={photoUrl} alt="" className="w-24 h-24 object-cover rounded-lg border shadow-sm" />
      ) : (
        <div className="w-24 h-24 bg-gray-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed text-gray-300 cursor-pointer hover:border-blue-400 hover:text-blue-400 transition-colors" onClick={() => inputRef.current?.click()}>
          <Upload className="w-6 h-6" />
          <span className="text-[10px] mt-1">Foto</span>
        </div>
      )}
      <Button type="button" size="sm" variant="outline" className="mt-1 text-xs w-24" onClick={() => inputRef.current?.click()} disabled={uploading}>
        {uploading ? '⏳' : <><Upload className="w-3 h-3 mr-1" />{label || 'Foto'}</>}
      </Button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onUpload} />
    </div>
  );
}

export default function Inventory() {
  const [equipment, setEquipment] = useState([]);
  const [stock, setStock] = useState([]);
  const [clientMachines, setClientMachines] = useState([]);
  const [contacts, setContacts] = useState([]);
  const printRef = useRef(null);
  const [eqSearch, setEqSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [cmSearch, setCmSearch] = useState('');
  const [eqDialog, setEqDialog] = useState(false);
  const [stockDialog, setStockDialog] = useState(false);
  const [cmDialog, setCmDialog] = useState(false);
  const [editingEq, setEditingEq] = useState(null);
  const [editingStock, setEditingStock] = useState(null);
  const [editingCm, setEditingCm] = useState(null);
  const [eqForm, setEqForm] = useState(EMPTY_EQ);
  const [stockForm, setStockForm] = useState(EMPTY_STOCK);
  const [cmForm, setCmForm] = useState(EMPTY_CM);
  const [uploading, setUploading] = useState(false);
  const [uploadingStock, setUploadingStock] = useState(false);
  const [uploadingCm, setUploadingCm] = useState(false);
  const [viewEq, setViewEq] = useState(null);
  const [viewStock, setViewStock] = useState(null);
  const [viewCm, setViewCm] = useState(null);
  const fileRef = useRef(null);
  const fileStockRef = useRef(null);
  const fileCmRef = useRef(null);
  const barcodeRef = useRef(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    // Carga secuencial con pequeñas pausas para evitar rate limit
    try {
      const eq = await base44.entities.Equipment.list('name', 200);
      setEquipment(eq);
    } catch {}
    await new Promise(r => setTimeout(r, 120));
    try {
      const st = await base44.entities.StockItem.list('name', 300);
      setStock(st);
    } catch {}
    await new Promise(r => setTimeout(r, 120));
    try {
      const cm = await base44.entities.ClientMachine.list('name', 300);
      setClientMachines(cm);
    } catch {}
    await new Promise(r => setTimeout(r, 120));
    try {
      const co = await base44.entities.Contact.list('name', 200);
      setContacts(co);
    } catch {}
  };

  const handleSaveEq = async () => {
    if (!eqForm.name) return;
    if (editingEq) await base44.entities.Equipment.update(editingEq.id, eqForm);
    else await base44.entities.Equipment.create(eqForm);
    setEqDialog(false); setEditingEq(null); setEqForm(EMPTY_EQ); loadAll();
  };

  const handleSaveStock = async () => {
    if (!stockForm.name) return;
    if (editingStock) await base44.entities.StockItem.update(editingStock.id, stockForm);
    else await base44.entities.StockItem.create(stockForm);
    setStockDialog(false); setEditingStock(null); setStockForm(EMPTY_STOCK); loadAll();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const compressed = await compressImage(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    setEqForm(prev => ({ ...prev, photo_url: file_url }));
    setUploading(false);
  };

  const handleStockPhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingStock(true);
    const compressed = await compressImage(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    setStockForm(prev => ({ ...prev, photo_url: file_url }));
    setUploadingStock(false);
  };

  const handleCmPhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploadingCm(true);
    const compressed = await compressImage(file);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
    setCmForm(prev => ({ ...prev, photo_url: file_url }));
    setUploadingCm(false);
  };

  const handleSaveCm = async () => {
    if (!cmForm.name) return;
    if (editingCm) await base44.entities.ClientMachine.update(editingCm.id, cmForm);
    else await base44.entities.ClientMachine.create(cmForm);
    setCmDialog(false); setEditingCm(null); setCmForm(EMPTY_CM); loadAll();
  };

  const filteredEq = equipment.filter(e =>
    `${e.name} ${e.brand} ${e.model} ${e.serial_number}`.toLowerCase().includes(eqSearch.toLowerCase())
  );
  const filteredStock = stock.filter(s =>
    `${s.name} ${s.reference} ${s.barcode} ${s.category}`.toLowerCase().includes(stockSearch.toLowerCase())
  );
  const filteredCm = clientMachines.filter(m =>
    `${m.name} ${m.brand} ${m.model} ${m.serial_number} ${m.contact_name}`.toLowerCase().includes(cmSearch.toLowerCase())
  );
  const lowStock = stock.filter(s => s.min_stock > 0 && s.quantity <= s.min_stock);

  // Barcode scanner: focus input, reads via keyboard (lector USB actúa como teclado)
  const handleBarcodeKey = (e) => {
    if (e.key === 'Enter') {
      // barcode already captured in stockForm.barcode, try to find existing
      const found = stock.find(s => s.barcode === stockForm.barcode);
      if (found) {
        setEditingStock(found);
        setStockForm({ ...EMPTY_STOCK, ...found });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6 text-slate-600" /> Inventario
        </h1>
        <PrintButton contentRef={printRef} title="Inventario" />
      </div>

      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-orange-800">⚠ Stock bajo en {lowStock.length} artículo(s)</p>
            <p className="text-xs text-orange-600">{lowStock.map(s => s.name).join(', ')}</p>
          </div>
        </div>
      )}

      <div ref={printRef}>
        <Tabs defaultValue="maquinaria">
          <TabsList className="w-full">
            <TabsTrigger value="maquinaria" className="flex-1">
              <Wrench className="w-4 h-4 mr-1" />Maquinaria ({equipment.length})
            </TabsTrigger>
            <TabsTrigger value="material" className="flex-1">
              <Package className="w-4 h-4 mr-1" />Stock ({stock.length})
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex-1">
              <Users className="w-4 h-4 mr-1" />Equipos Cliente ({clientMachines.length})
            </TabsTrigger>
          </TabsList>

          {/* ===== MAQUINARIA ===== */}
          <TabsContent value="maquinaria" className="space-y-3 pt-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Buscar por nombre, marca, modelo, nº serie..." value={eqSearch} onChange={e => setEqSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingEq(null); setEqForm(EMPTY_EQ); setEqDialog(true); }} className="bg-slate-700">
                <Plus className="w-4 h-4 mr-1" />Añadir
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredEq.map(eq => (
                <Card key={eq.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewEq(eq)}>
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
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{eq.name}</h3>
                            {eq.brand && <p className="text-xs text-gray-500">{eq.brand} {eq.model}</p>}
                            {eq.serial_number && <p className="text-xs text-gray-400 font-mono">S/N: {eq.serial_number}</p>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditingEq(eq); setEqForm({ ...EMPTY_EQ, ...eq }); setEqDialog(true); }} className="p-1 text-gray-400 hover:text-blue-500"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (confirm('¿Eliminar?')) { await base44.entities.Equipment.delete(eq.id); loadAll(); } }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <Badge className={`text-[10px] mt-1 ${STATUS_COLORS[eq.status] || 'bg-gray-100'}`}>{eq.status}</Badge>
                        {eq.next_revision_date && <p className="text-[10px] text-orange-500 mt-1">🔧 Rev: {eq.next_revision_date}</p>}
                        {eq.location && <p className="text-[10px] text-gray-500 truncate">📍 {eq.location}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredEq.length === 0 && <p className="text-center text-gray-400 py-8 col-span-3">No hay equipos registrados</p>}
            </div>
          </TabsContent>

          {/* ===== MATERIAL STOCK ===== */}
          <TabsContent value="material" className="space-y-3 pt-2">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Buscar o escanear código de barras..." value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingStock(null); setStockForm(EMPTY_STOCK); setStockDialog(true); setTimeout(() => barcodeRef.current?.focus(), 200); }} className="bg-slate-700">
                <Plus className="w-4 h-4 mr-1" />Añadir
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">Artículo</th>
                    <th className="text-left p-3 font-medium text-gray-600 hidden sm:table-cell">Categoría</th>
                    <th className="text-center p-3 font-medium text-gray-600">Stock</th>
                    <th className="text-center p-3 font-medium text-gray-600 hidden md:table-cell">Mín.</th>
                    <th className="text-right p-3 font-medium text-gray-600 hidden md:table-cell">€/ud</th>
                    <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Proveedor</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStock.map(s => (
                    <tr key={s.id} className={`hover:bg-gray-50 cursor-pointer ${s.min_stock > 0 && s.quantity <= s.min_stock ? 'bg-orange-50' : ''}`}
                      onClick={() => setViewStock(s)}>
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
                            {s.barcode && <p className="text-xs text-gray-400 font-mono flex items-center gap-1"><Barcode className="w-3 h-3" />{s.barcode}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell"><Badge variant="outline" className="text-[10px]">{s.category?.replace(/_/g, ' ')}</Badge></td>
                      <td className="p-3 text-center">
                        <span className={`font-bold ${s.min_stock > 0 && s.quantity <= s.min_stock ? 'text-orange-600' : 'text-gray-800'}`}>
                          {s.quantity} {s.unit}
                        </span>
                      </td>
                      <td className="p-3 text-center text-gray-500 hidden md:table-cell">{s.min_stock || '-'}</td>
                      <td className="p-3 text-right hidden md:table-cell">{s.unit_price ? `${s.unit_price} €` : '-'}</td>
                      <td className="p-3 text-gray-500 text-xs hidden lg:table-cell">{s.supplier_name || '-'}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setEditingStock(s); setStockForm({ ...EMPTY_STOCK, ...s }); setStockDialog(true); }} className="p-1 text-gray-400 hover:text-blue-500"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={async () => { if (confirm('¿Eliminar?')) { await base44.entities.StockItem.delete(s.id); loadAll(); } }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredStock.length === 0 && <p className="text-center text-gray-400 py-8">No hay material registrado</p>}
            </div>
          </TabsContent>
          {/* ===== EQUIPOS CLIENTE ===== */}
          <TabsContent value="clientes" className="space-y-3 pt-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Buscar por cliente, nombre, marca, modelo, nº serie..." value={cmSearch} onChange={e => setCmSearch(e.target.value)} />
              </div>
              <Button onClick={() => { setEditingCm(null); setCmForm(EMPTY_CM); setCmDialog(true); }} className="bg-teal-700">
                <Plus className="w-4 h-4 mr-1" />Añadir
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredCm.map(cm => (
                <Card key={cm.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewCm(cm)}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {cm.photo_url ? (
                        <img src={cm.photo_url} alt="" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Wrench className="w-6 h-6 text-teal-200" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{cm.name}</h3>
                            {cm.brand && <p className="text-xs text-gray-500">{cm.brand} {cm.model}</p>}
                            {cm.serial_number && <p className="text-xs text-gray-400 font-mono">S/N: {cm.serial_number}</p>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => { setEditingCm(cm); setCmForm({ ...EMPTY_CM, ...cm }); setCmDialog(true); }} className="p-1 text-gray-400 hover:text-blue-500"><Edit className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (confirm('¿Eliminar?')) { await base44.entities.ClientMachine.delete(cm.id); loadAll(); } }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <Badge className={`text-[10px] mt-1 ${STATUS_COLORS[cm.status] || 'bg-gray-100'}`}>{cm.status?.replace(/_/g,' ')}</Badge>
                        {cm.contact_name && <p className="text-[10px] text-teal-600 mt-1 truncate">👤 {cm.contact_name}</p>}
                        {cm.next_maintenance_date && <p className="text-[10px] text-orange-500 mt-0.5">🔧 Mant: {cm.next_maintenance_date}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredCm.length === 0 && <p className="text-center text-gray-400 py-8 col-span-3">No hay equipos de clientes registrados</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== FICHA EQUIPO CLIENTE (VER) ===== */}
      <Dialog open={!!viewCm} onOpenChange={() => setViewCm(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Equipo del cliente</DialogTitle></DialogHeader>
          {viewCm && (
            <div className="space-y-3">
              {viewCm.photo_url && <img src={viewCm.photo_url} alt="" className="w-full h-48 object-cover rounded-xl border" />}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2"><p className="text-xs text-gray-400">Cliente</p><p className="font-semibold text-teal-700">{viewCm.contact_name || '-'}</p></div>
                <div><p className="text-xs text-gray-400">Nombre equipo</p><p className="font-semibold">{viewCm.name}</p></div>
                <div><p className="text-xs text-gray-400">Estado</p><Badge className={STATUS_COLORS[viewCm.status]}>{viewCm.status?.replace(/_/g,' ')}</Badge></div>
                {viewCm.machine_type && <div><p className="text-xs text-gray-400">Tipo</p><p className="capitalize">{viewCm.machine_type.replace(/_/g,' ')}</p></div>}
                {viewCm.brand && <div><p className="text-xs text-gray-400">Marca</p><p>{viewCm.brand}</p></div>}
                {viewCm.model && <div><p className="text-xs text-gray-400">Modelo</p><p>{viewCm.model}</p></div>}
                {viewCm.serial_number && <div className="col-span-2"><p className="text-xs text-gray-400">Nº de Serie</p><p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{viewCm.serial_number}</p></div>}
                {viewCm.installation_date && <div><p className="text-xs text-gray-400">Instalación</p><p>{viewCm.installation_date}</p></div>}
                {viewCm.refrigerant_type && <div><p className="text-xs text-gray-400">Gas refrigerante</p><p>{viewCm.refrigerant_type}</p></div>}
                {viewCm.power_kw && <div><p className="text-xs text-gray-400">Potencia</p><p>{viewCm.power_kw} kW</p></div>}
                {viewCm.location && <div className="col-span-2"><p className="text-xs text-gray-400">Ubicación</p><p>{viewCm.location}</p></div>}
                {viewCm.warranty_expiry && <div className="col-span-2 bg-blue-50 p-2 rounded"><p className="text-xs text-blue-600">🛡 Garantía hasta: {viewCm.warranty_expiry}</p></div>}
                {viewCm.next_maintenance_date && <div className="col-span-2 bg-orange-50 p-2 rounded"><p className="text-xs text-orange-600">⚠ Próximo mantenimiento: {viewCm.next_maintenance_date}</p></div>}
                {viewCm.notes && <div className="col-span-2"><p className="text-xs text-gray-400">Notas</p><p className="text-sm">{viewCm.notes}</p></div>}
              </div>
              <Button onClick={() => { setEditingCm(viewCm); setCmForm({ ...EMPTY_CM, ...viewCm }); setCmDialog(true); setViewCm(null); }} className="w-full bg-teal-700" size="sm">
                <Edit className="w-4 h-4 mr-1" /> Editar ficha
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG EQUIPO CLIENTE ===== */}
      <Dialog open={cmDialog} onOpenChange={o => { setCmDialog(o); if (!o) { setEditingCm(null); setCmForm(EMPTY_CM); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCm ? 'Editar equipo del cliente' : 'Nuevo equipo del cliente'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-4 items-start">
              <PhotoUploader photoUrl={cmForm.photo_url} onUpload={handleCmPhotoUpload} uploading={uploadingCm} inputRef={fileCmRef} label="Foto" />
              <div className="flex-1 space-y-2">
                <Select value={cmForm.contact_id} onValueChange={v => {
                  const c = contacts.find(x => x.id === v);
                  setCmForm(f => ({ ...f, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}`.trim() : '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente *" /></SelectTrigger>
                  <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname || ''} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Nombre del equipo *" value={cmForm.name} onChange={e => setCmForm({ ...cmForm, name: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={cmForm.machine_type} onValueChange={v => setCmForm({ ...cmForm, machine_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CM_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={cmForm.status} onValueChange={v => setCmForm({ ...cmForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CM_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Marca" value={cmForm.brand} onChange={e => setCmForm({ ...cmForm, brand: e.target.value })} />
              <Input placeholder="Modelo" value={cmForm.model} onChange={e => setCmForm({ ...cmForm, model: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Nº Serie:</span>
              <Input placeholder="Número de serie" value={cmForm.serial_number} onChange={e => setCmForm({ ...cmForm, serial_number: e.target.value })} className="font-mono text-sm border-0 bg-transparent focus-visible:ring-0 p-0 h-auto" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Fecha instalación</label><Input type="date" className="mt-1" value={cmForm.installation_date} onChange={e => setCmForm({ ...cmForm, installation_date: e.target.value })} /></div>
              <div><label className="text-xs text-gray-500">Garantía hasta</label><Input type="date" className="mt-1" value={cmForm.warranty_expiry} onChange={e => setCmForm({ ...cmForm, warranty_expiry: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Gas refrigerante" value={cmForm.refrigerant_type} onChange={e => setCmForm({ ...cmForm, refrigerant_type: e.target.value })} />
              <NumberField placeholder="Potencia (kW)" value={cmForm.power_kw} onChange={v => setCmForm({ ...cmForm, power_kw: v })} />
            </div>
            <Input placeholder="Ubicación (ej: planta 1, sala técnica)" value={cmForm.location} onChange={e => setCmForm({ ...cmForm, location: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Próximo mantenimiento</label><Input type="date" className="mt-1" value={cmForm.next_maintenance_date} onChange={e => setCmForm({ ...cmForm, next_maintenance_date: e.target.value })} /></div>
              <div><label className="text-xs text-gray-500">Intervalo mant. (meses)</label><NumberField decimals={false} className="mt-1" value={cmForm.maintenance_interval_months} onChange={v => setCmForm({ ...cmForm, maintenance_interval_months: v })} /></div>
            </div>
            <Textarea placeholder="Notas / estado de conservación" value={cmForm.notes} onChange={e => setCmForm({ ...cmForm, notes: e.target.value })} rows={2} />
            <Button onClick={handleSaveCm} className="w-full bg-teal-700">{editingCm ? 'Actualizar equipo' : 'Guardar equipo'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== FICHA EQUIPO (VER) ===== */}
      <Dialog open={!!viewEq} onOpenChange={() => setViewEq(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ficha de equipo</DialogTitle></DialogHeader>
          {viewEq && (
            <div className="space-y-3">
              {viewEq.photo_url && <img src={viewEq.photo_url} alt="" className="w-full h-48 object-cover rounded-xl border" />}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-gray-400">Nombre</p><p className="font-semibold">{viewEq.name}</p></div>
                <div><p className="text-xs text-gray-400">Estado</p><Badge className={STATUS_COLORS[viewEq.status]}>{viewEq.status}</Badge></div>
                {viewEq.brand && <div><p className="text-xs text-gray-400">Marca</p><p>{viewEq.brand}</p></div>}
                {viewEq.model && <div><p className="text-xs text-gray-400">Modelo</p><p>{viewEq.model}</p></div>}
                {viewEq.serial_number && <div className="col-span-2"><p className="text-xs text-gray-400">Nº de Serie</p><p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{viewEq.serial_number}</p></div>}
                {viewEq.category && <div><p className="text-xs text-gray-400">Categoría</p><p className="capitalize">{viewEq.category.replace(/_/g,' ')}</p></div>}
                {viewEq.location && <div><p className="text-xs text-gray-400">Ubicación</p><p>{viewEq.location}</p></div>}
                {viewEq.assigned_to && <div><p className="text-xs text-gray-400">Asignado a</p><p>{viewEq.assigned_to}</p></div>}
                {viewEq.purchase_date && <div><p className="text-xs text-gray-400">Fecha compra</p><p>{viewEq.purchase_date}</p></div>}
                {viewEq.purchase_price && <div><p className="text-xs text-gray-400">Precio compra</p><p>{viewEq.purchase_price} €</p></div>}
                {viewEq.next_revision_date && <div className="col-span-2 bg-orange-50 p-2 rounded"><p className="text-xs text-orange-500 font-medium">⚠ Próxima revisión: {viewEq.next_revision_date}</p></div>}
                {viewEq.notes && <div className="col-span-2"><p className="text-xs text-gray-400">Notas</p><p className="text-sm">{viewEq.notes}</p></div>}
              </div>
              <Button onClick={() => { setEditingEq(viewEq); setEqForm({ ...EMPTY_EQ, ...viewEq }); setEqDialog(true); setViewEq(null); }} className="w-full bg-slate-700" size="sm">
                <Edit className="w-4 h-4 mr-1" /> Editar ficha
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== FICHA STOCK (VER) ===== */}
      <Dialog open={!!viewStock} onOpenChange={() => setViewStock(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Ficha de artículo</DialogTitle></DialogHeader>
          {viewStock && (
            <div className="space-y-3">
              {viewStock.photo_url && <img src={viewStock.photo_url} alt="" className="w-full h-40 object-cover rounded-xl border" />}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2"><p className="text-xs text-gray-400">Nombre</p><p className="font-semibold text-base">{viewStock.name}</p></div>
                {viewStock.reference && <div><p className="text-xs text-gray-400">Referencia</p><p className="font-mono">{viewStock.reference}</p></div>}
                {viewStock.category && <div><p className="text-xs text-gray-400">Categoría</p><p className="capitalize">{viewStock.category.replace(/_/g,' ')}</p></div>}
                <div><p className="text-xs text-gray-400">Stock actual</p><p className={`font-bold text-lg ${viewStock.min_stock > 0 && viewStock.quantity <= viewStock.min_stock ? 'text-orange-600' : 'text-green-700'}`}>{viewStock.quantity} {viewStock.unit}</p></div>
                {viewStock.min_stock > 0 && <div><p className="text-xs text-gray-400">Stock mínimo</p><p>{viewStock.min_stock} {viewStock.unit}</p></div>}
                {viewStock.unit_price && <div><p className="text-xs text-gray-400">Precio unitario</p><p className="font-semibold">{viewStock.unit_price} €</p></div>}
                {viewStock.supplier_name && <div><p className="text-xs text-gray-400">Proveedor</p><p>{viewStock.supplier_name}</p></div>}
                {viewStock.location && <div className="col-span-2"><p className="text-xs text-gray-400">Ubicación</p><p>{viewStock.location}</p></div>}
                {viewStock.notes && <div className="col-span-2"><p className="text-xs text-gray-400">Notas</p><p className="text-sm">{viewStock.notes}</p></div>}
              </div>
              {viewStock.barcode && (
                <div className="border rounded-lg p-3 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Barcode className="w-3 h-3" /> Código de barras</p>
                  <BarcodeImage barcode={viewStock.barcode} />
                </div>
              )}
              <Button onClick={() => { setEditingStock(viewStock); setStockForm({ ...EMPTY_STOCK, ...viewStock }); setStockDialog(true); setViewStock(null); }} className="w-full bg-slate-700" size="sm">
                <Edit className="w-4 h-4 mr-1" /> Editar artículo
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG EQUIPO ===== */}
      <Dialog open={eqDialog} onOpenChange={o => { setEqDialog(o); if (!o) { setEditingEq(null); setEqForm(EMPTY_EQ); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEq ? 'Editar equipo' : 'Nuevo equipo / maquinaria'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-4 items-start">
              <PhotoUploader photoUrl={eqForm.photo_url} onUpload={handlePhotoUpload} uploading={uploading} inputRef={fileRef} label="Foto" />
              <div className="flex-1 space-y-2">
                <Input placeholder="Nombre *" value={eqForm.name} onChange={e => setEqForm({ ...eqForm, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Marca" value={eqForm.brand} onChange={e => setEqForm({ ...eqForm, brand: e.target.value })} />
                  <Input placeholder="Modelo" value={eqForm.model} onChange={e => setEqForm({ ...eqForm, model: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg p-2">
              <span className="text-xs text-gray-500 whitespace-nowrap">Nº Serie:</span>
              <Input placeholder="Número de serie de la maquinaria" value={eqForm.serial_number}
                onChange={e => setEqForm({ ...eqForm, serial_number: e.target.value })}
                className="font-mono text-sm border-0 bg-transparent focus-visible:ring-0 p-0 h-auto" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select value={eqForm.category} onValueChange={v => setEqForm({ ...eqForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EQ_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={eqForm.status} onValueChange={v => setEqForm({ ...eqForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EQ_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-gray-500">Fecha compra</label><Input type="date" className="mt-1" value={eqForm.purchase_date} onChange={e => setEqForm({ ...eqForm, purchase_date: e.target.value })} /></div>
              <div><label className="text-xs text-gray-500">Precio compra (€)</label><NumberField className="mt-1" value={eqForm.purchase_price} onChange={v => setEqForm({ ...eqForm, purchase_price: v })} /></div>
            </div>
            <div><label className="text-xs text-gray-500">Próxima revisión</label><Input type="date" className="mt-1" value={eqForm.next_revision_date} onChange={e => setEqForm({ ...eqForm, next_revision_date: e.target.value })} /></div>
            <Input placeholder="Ubicación" value={eqForm.location} onChange={e => setEqForm({ ...eqForm, location: e.target.value })} />
            <Input placeholder="Asignado a" value={eqForm.assigned_to} onChange={e => setEqForm({ ...eqForm, assigned_to: e.target.value })} />
            <Textarea placeholder="Notas" value={eqForm.notes} onChange={e => setEqForm({ ...eqForm, notes: e.target.value })} rows={2} />
            <Button onClick={handleSaveEq} className="w-full bg-slate-700">{editingEq ? 'Actualizar' : 'Guardar equipo'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG STOCK ===== */}
      <Dialog open={stockDialog} onOpenChange={o => { setStockDialog(o); if (!o) { setEditingStock(null); setStockForm(EMPTY_STOCK); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStock ? 'Editar artículo' : 'Nuevo artículo en stock'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-4 items-start">
              <PhotoUploader photoUrl={stockForm.photo_url} onUpload={handleStockPhotoUpload} uploading={uploadingStock} inputRef={fileStockRef} label="Foto" />
              <div className="flex-1 space-y-2">
                <Input placeholder="Nombre del artículo *" value={stockForm.name} onChange={e => setStockForm({ ...stockForm, name: e.target.value })} />
                <Input placeholder="Referencia interna" value={stockForm.reference} onChange={e => setStockForm({ ...stockForm, reference: e.target.value })} />
              </div>
            </div>

            {/* Código de barras — teclado o lector */}
            <div className="border-2 border-dashed border-blue-200 rounded-lg p-3 bg-blue-50">
              <label className="text-xs font-medium text-blue-700 flex items-center gap-1 mb-2">
                <ScanLine className="w-4 h-4" /> Código de barras (teclado o lector USB)
              </label>
              <Input
                ref={barcodeRef}
                placeholder="Escanea o escribe el código de barras..."
                value={stockForm.barcode || ''}
                onChange={e => setStockForm({ ...stockForm, barcode: e.target.value })}
                onKeyDown={handleBarcodeKey}
                className="font-mono bg-white"
              />
              <BarcodeImage barcode={stockForm.barcode} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select value={stockForm.category} onValueChange={v => setStockForm({ ...stockForm, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STOCK_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Proveedor" value={stockForm.supplier_name} onChange={e => setStockForm({ ...stockForm, supplier_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-xs text-gray-500">Cantidad</label><NumberField className="mt-1" value={stockForm.quantity} onChange={v => setStockForm({ ...stockForm, quantity: v })} /></div>
              <div><label className="text-xs text-gray-500">Unidad</label><Input className="mt-1" placeholder="uds" value={stockForm.unit} onChange={e => setStockForm({ ...stockForm, unit: e.target.value })} /></div>
              <div><label className="text-xs text-gray-500">Stock mín.</label><NumberField className="mt-1" value={stockForm.min_stock} onChange={v => setStockForm({ ...stockForm, min_stock: v })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <NumberField placeholder="Precio unitario (€)" value={stockForm.unit_price} onChange={v => setStockForm({ ...stockForm, unit_price: v })} />
              <Input placeholder="Ubicación" value={stockForm.location} onChange={e => setStockForm({ ...stockForm, location: e.target.value })} />
            </div>
            <Textarea placeholder="Notas" value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} rows={2} />
            <Button onClick={handleSaveStock} className="w-full bg-slate-700">{editingStock ? 'Actualizar artículo' : 'Guardar artículo'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}