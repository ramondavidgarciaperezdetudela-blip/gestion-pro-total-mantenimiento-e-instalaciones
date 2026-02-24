import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Plus, Phone, Mail, Globe, Trash2, Edit, Key, Eye, EyeOff, ShoppingCart, ExternalLink, Bot, Users, MessageCircle, Download, Bell, Clock, TrendingUp } from 'lucide-react';
import { fetchCompanyLogo } from '../components/LogoFetcher';

const CATEGORIES = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general'];

const DEFAULT_SUPPLIERS = [
  {
    name: 'Salvador Escoda', website: 'https://www.salvadorescoda.com',
    login_url: 'https://www.salvadorescoda.com/tienda', category: 'refrigeracion',
    phone: '93 265 81 00', email: 'info@salvadorescoda.com',
    notes: 'Distribuidor oficial climatización y refrigeración. Sede Barcelona.', is_active: true
  },
  {
    name: 'Hidro Tarraco', website: 'https://www.hidrotarraco.com',
    login_url: 'https://www.hidrotarraco.com', category: 'fontaneria',
    phone: '977 55 00 00', email: 'info@hidrotarraco.com', contact_person: 'Comercial',
    notes: 'Distribuidor fontanería, climatización y energías renovables. Zona Tarragona.', is_active: true
  },
  {
    name: 'Elektra Cataluña', website: 'https://www.elektra.es',
    login_url: 'https://www.elektra.es', category: 'electrico',
    phone: '93 000 00 00', email: 'info@elektra.es',
    notes: 'Material eléctrico, automatización y electricidad industrial. Zona Cataluña.', is_active: true
  },
  {
    name: 'ABC Tarraconès', website: '', login_url: '', category: 'general',
    phone: '977 00 00 00', email: '', contact_person: 'Comercial',
    notes: 'Distribuidor material de construcción e instalaciones. Tarragona.', is_active: true
  },
  {
    name: 'Obramat', website: 'https://www.obramat.es',
    login_url: 'https://www.obramat.es', category: 'general',
    phone: '900 10 11 12', email: '',
    notes: 'Material de construcción y ferretería industrial. Amplia red de tiendas.', is_active: true
  },
  {
    name: 'Comfred Suministros', website: '', login_url: '', category: 'refrigeracion',
    phone: '977 00 11 22', email: 'info@comfred.es', contact_person: 'Dpt. Ventas',
    notes: 'Especialistas en componentes para refrigeración y climatización.', is_active: true
  },
  {
    name: 'Saltoki', website: 'https://www.saltoki.es',
    login_url: 'https://www.saltoki.es/catalogo', category: 'fontaneria',
    phone: '948 00 00 00', email: 'atencion@saltoki.es',
    notes: 'Material de fontanería, calefacción y climatización. Catálogo online amplio.', is_active: true
  },
];

const EMPTY_FORM = {
   name: '', website: '', login_url: '', category: 'general',
   phone: '', email: '', contact_person: '', notes: '', is_active: true,
   api_key: '', api_url: '', client_code: '', password_hint: '',
   commercials: [], logo_url: '', last_order_date: '', reorder_frequency_days: 30,
   enable_notifications: true
 };

const EMPTY_COMMERCIAL = { name: '', phone: '', whatsapp: '', email: '', notes: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
     const [dialogOpen, setDialogOpen] = useState(false);
     const [editing, setEditing] = useState(null);
     const [form, setForm] = useState(EMPTY_FORM);
     const [showApiKey, setShowApiKey] = useState(false);
     const [fetchingLogo, setFetchingLogo] = useState(false);

  useEffect(() => {
    base44.entities.Supplier.list().then(data => {
      if (data.length === 0) {
        Promise.all(DEFAULT_SUPPLIERS.map(s => base44.entities.Supplier.create(s)))
          .then(() => base44.entities.Supplier.list().then(setSuppliers));
      } else {
        setSuppliers(data);
      }
    });
  }, []);

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Supplier.update(editing.id, form);
    } else {
      await base44.entities.Supplier.create(form);
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    base44.entities.Supplier.list().then(setSuppliers);
  };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({
      name: s.name || '', website: s.website || '', login_url: s.login_url || '',
      category: s.category || 'general', phone: s.phone || '', email: s.email || '',
      contact_person: s.contact_person || '', notes: s.notes || '',
      is_active: s.is_active !== false,
      api_key: s.api_key || '', api_url: s.api_url || '',
      client_code: s.client_code || '', password_hint: s.password_hint || '',
      commercials: s.commercials || [], logo_url: s.logo_url || '',
      last_order_date: s.last_order_date || '', reorder_frequency_days: s.reorder_frequency_days || 30,
      enable_notifications: s.enable_notifications !== false
    });
    setDialogOpen(true);
  };

  const handleAutoFetchLogo = async () => {
    setFetchingLogo(true);
    const logo = await fetchCompanyLogo(form.website, form.name);
    if (logo) {
      setForm(prev => ({ ...prev, logo_url: logo }));
      // Guardar automáticamente el logo en BD
      if (editing) {
        await base44.entities.Supplier.update(editing.id, { ...form, logo_url: logo });
        base44.entities.Supplier.list().then(setSuppliers);
      }
    }
    setFetchingLogo(false);
  };

  const addCommercial = () => setForm(prev => ({...prev, commercials: [...(prev.commercials || []), {...EMPTY_COMMERCIAL}]}));
  const updateCommercial = (i, field, val) => setForm(prev => ({...prev, commercials: prev.commercials.map((c, idx) => idx === i ? {...c, [field]: val} : c)}));
  const removeCommercial = (i) => setForm(prev => ({...prev, commercials: prev.commercials.filter((_, idx) => idx !== i)}));

  const handleDelete = async (id) => {
    await base44.entities.Supplier.delete(id);
    setSuppliers(suppliers.filter(s => s.id !== id));
  };

  const activeSuppliers = suppliers.filter(s => s.is_active !== false);
  const inactiveSuppliers = suppliers.filter(s => s.is_active === false);

  const getDaysUntilReorder = (lastDate, frequency) => {
    if (!lastDate) return 0;
    const last = new Date(lastDate);
    const nextDate = new Date(last.getTime() + (frequency || 30) * 24 * 60 * 60 * 1000);
    const days = Math.ceil((nextDate - new Date()) / (24 * 60 * 60 * 1000));
    return days;
  };

  const SupplierCard = ({ s }) => {
    const daysUntilReorder = getDaysUntilReorder(s.last_order_date, s.reorder_frequency_days);
    const needsReorder = daysUntilReorder <= 7 && s.enable_notifications;
    
    return (
      <Card className={`hover:shadow-md transition-shadow ${needsReorder ? 'border-amber-300 bg-amber-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            {s.logo_url && <img src={s.logo_url} alt={s.name} className="h-10 w-10 object-contain rounded border bg-white p-1 mr-2 flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {!s.logo_url && <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                <h3 className="font-semibold">{s.name}</h3>
                <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                {s.api_key && <Badge className="bg-green-100 text-green-700 text-[10px]"><Key className="w-2.5 h-2.5 mr-1" />API</Badge>}
                {needsReorder && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Bell className="w-2.5 h-2.5 mr-1" />Revisar</Badge>}
              </div>
              
              {s.enable_notifications && s.last_order_date && (
                <div className="mb-2 p-2 bg-white rounded border border-amber-200 text-xs">
                  <div className="flex items-center gap-1 text-gray-700">
                    <Clock className="w-3 h-3" />
                    <span>Próximo pedido: {daysUntilReorder > 0 ? `en ${daysUntilReorder} días` : 'HOY'}</span>
                  </div>
                </div>
              )}
              
              {s.notes && <p className="text-xs text-gray-500 mb-2">{s.notes}</p>}
              <div className="flex flex-wrap gap-3 text-xs mb-2">
                {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-blue-600"><Phone className="w-3 h-3" />{s.phone}</a>}
                {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-blue-600"><Mail className="w-3 h-3" />{s.email}</a>}
              </div>
              
              {s.commercials?.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-[10px] font-semibold text-gray-500 flex items-center gap-1 mb-1"><Users className="w-3 h-3" />Comerciales:</p>
                  <div className="flex flex-wrap gap-2">
                    {s.commercials.map((c, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs bg-gray-100 rounded px-2 py-1">
                        <span className="font-medium text-gray-700">{c.name}</span>
                        {c.phone && <a href={`tel:${c.phone}`} className="text-blue-500"><Phone className="w-3 h-3" /></a>}
                        {c.whatsapp && (
                          <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500">
                            <MessageCircle className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              {s.login_url && (
                <a href={s.login_url} target="_blank" rel="noopener noreferrer"
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Tienda online">
                  <ShoppingCart className="w-4 h-4" />
                </a>
              )}
              {s.website && (
                <a href={s.website} target="_blank" rel="noopener noreferrer"
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Sitio web">
                  <Globe className="w-4 h-4" />
                </a>
              )}
              <button onClick={() => handleEdit(s)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores / Distribuidores</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setShowApiKey(false); } }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-700 hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} proveedor</DialogTitle></DialogHeader>
            <Tabs defaultValue="datos">
              <TabsList className="w-full">
                <TabsTrigger value="datos" className="flex-1">Datos</TabsTrigger>
                <TabsTrigger value="comerciales" className="flex-1">Comerciales</TabsTrigger>
                <TabsTrigger value="acceso" className="flex-1">Acceso / API</TabsTrigger>
              </TabsList>

              <TabsContent value="datos" className="space-y-3 pt-2">
                 {form.logo_url && (
                   <div className="flex items-center gap-2">
                     <img src={form.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded border bg-gray-50 p-1" />
                     <button onClick={() => setForm(prev => ({ ...prev, logo_url: '' }))} className="text-xs text-red-600">Quitar</button>
                   </div>
                 )}
                 <Input placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                 <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                   <SelectTrigger><SelectValue /></SelectTrigger>
                   <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                 </Select>
                 <Input placeholder="Sitio web" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
                 <Button onClick={handleAutoFetchLogo} variant="outline" className="w-full" disabled={fetchingLogo || (!form.name && !form.website)}>
                   <Download className="w-3.5 h-3.5 mr-2" />
                   {fetchingLogo ? 'Descargando logo...' : 'Descargar logo automáticamente'}
                 </Button>
                <Input placeholder="URL tienda / pedidos online" value={form.login_url} onChange={e => setForm({...form, login_url: e.target.value})} />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <Input placeholder="Persona de contacto" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
                <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />

                {/* Automatización de pedidos */}
                <div className="border rounded-lg p-3 space-y-2 bg-blue-50">
                  <p className="text-sm font-medium text-blue-900 flex items-center gap-2"><Clock className="w-4 h-4" />Automatización de pedidos</p>
                  <div>
                    <label className="text-xs text-gray-700">Última fecha de pedido</label>
                    <Input type="date" value={form.last_order_date} onChange={e => setForm({...form, last_order_date: e.target.value})} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-700">Cada cuántos días hacer pedido</label>
                    <Input type="number" min="1" value={form.reorder_frequency_days} onChange={e => setForm({...form, reorder_frequency_days: parseInt(e.target.value) || 30})} className="mt-1" />
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={form.enable_notifications} onChange={e => setForm({...form, enable_notifications: e.target.checked})} />
                    <span className="text-gray-700">Activar notificaciones de revisión de pedidos</span>
                  </label>
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} />
                  Proveedor activo
                </label>
              </TabsContent>

              <TabsContent value="comerciales" className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Comerciales de {form.name || 'este proveedor'}</p>
                  <Button size="sm" variant="outline" onClick={addCommercial}><Plus className="w-3 h-3 mr-1" />Añadir</Button>
                </div>
                {(form.commercials || []).length === 0 && <p className="text-center text-gray-400 py-4 text-sm">No hay comerciales. Pulsa Añadir.</p>}
                {(form.commercials || []).map((c, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                    <button onClick={() => removeCommercial(i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    <Input placeholder="Nombre del comercial *" value={c.name} onChange={e => updateCommercial(i, 'name', e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Teléfono" value={c.phone} onChange={e => updateCommercial(i, 'phone', e.target.value)} />
                      <Input placeholder="WhatsApp" value={c.whatsapp} onChange={e => updateCommercial(i, 'whatsapp', e.target.value)} />
                    </div>
                    <Input placeholder="Email" value={c.email} onChange={e => updateCommercial(i, 'email', e.target.value)} />
                    <Input placeholder="Notas" value={c.notes} onChange={e => updateCommercial(i, 'notes', e.target.value)} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="acceso" className="space-y-3 pt-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                  <p className="font-medium mb-1">⚠️ Seguridad</p>
                  <p>Los datos de acceso se guardan en tu cuenta. No compartas esta información.</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Código de cliente</label>
                  <Input className="mt-1" placeholder="Tu nº de cliente en este distribuidor" value={form.client_code} onChange={e => setForm({...form, client_code: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">API Key (si el distribuidor la proporciona)</label>
                  <div className="relative mt-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="API Key del distribuidor"
                      value={form.api_key}
                      onChange={e => setForm({...form, api_key: e.target.value})}
                    />
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">URL API (si disponible)</label>
                  <Input className="mt-1" placeholder="https://api.distribuidor.com/v1" value={form.api_url} onChange={e => setForm({...form, api_url: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Nota de contraseña (recordatorio)</label>
                  <Input className="mt-1" placeholder="Ej: misma que email" value={form.password_hint} onChange={e => setForm({...form, password_hint: e.target.value})} />
                </div>
                <div className="border rounded-lg p-3 space-y-2">
                  <p className="text-sm font-medium">Acceso directo</p>
                  {form.login_url ? (
                    <a href={form.login_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 text-sm hover:underline">
                      <ExternalLink className="w-4 h-4" /> Ir a la tienda online
                    </a>
                  ) : <p className="text-xs text-gray-400">Introduce la URL de la tienda para acceso directo</p>}
                </div>
              </TabsContent>
            </Tabs>
            <Button onClick={handleSave} className="w-full bg-slate-700 mt-3">{editing ? 'Actualizar' : 'Guardar'}</Button>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {activeSuppliers.map(s => <SupplierCard key={s.id} s={s} />)}
        {inactiveSuppliers.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 mb-2">Inactivos</p>
            {inactiveSuppliers.map(s => <SupplierCard key={s.id} s={s} />)}
          </div>
        )}
        {suppliers.length === 0 && <p className="text-center text-gray-400 py-6">No hay proveedores configurados</p>}
      </div>
    </div>
  );
}