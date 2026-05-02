import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import PullToRefresh from '../components/PullToRefresh';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
   Plus, Search, Phone, Mail, Building2, User, Navigation, Trash2, Edit,
   Camera, Users, AlertTriangle, Euro, LayoutGrid, List, Star, MapPin,
   ChevronRight, TrendingUp, FileText, Wrench, Download, WifiOff, RefreshCw
 } from 'lucide-react';
import { saveToCache, loadFromCache, formatCacheDate } from '@/lib/offlineCache';
import { fetchCompanyLogo } from '../components/LogoFetcher';
import CityAutocomplete from '../components/CityAutocomplete';
import PostalCodeSearch from '../components/PostalCodeSearch';

const PAYMENT_PROFILES = {
  buen_pagador: { label: 'Buen pagador', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  pagador_normal: { label: 'Pagador normal', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  regateador: { label: 'Regateador', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  mal_pagador: { label: 'Mal pagador', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  moroso: { label: 'Moroso', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

const TYPES = ['cliente', 'proveedor', 'colaborador', 'otro'];
const CATEGORIES = ['residencial', 'comercial', 'industrial', 'administracion_publica', 'comunidad_propietarios', 'otro'];
const CATEGORY_COLORS = {
  residencial: 'bg-blue-50 text-blue-700',
  comercial: 'bg-purple-50 text-purple-700',
  industrial: 'bg-orange-50 text-orange-700',
  administracion_publica: 'bg-teal-50 text-teal-700',
  comunidad_propietarios: 'bg-rose-50 text-rose-700',
  otro: 'bg-gray-50 text-gray-600',
};

const EMPTY_FORM = {
  type: 'cliente', category: 'residencial', name: '', surname: '', company_name: '',
  nif: '', email: '', phone: '', phone2: '', address: '', city: '', province: '',
  postal_code: '', country: 'España', notes: '', payment_profile: 'pagador_normal',
  pending_amount: 0, internal_observations: '', photo_url: ''
};

function ContactCard({ contact, onEdit, onDelete }) {
  const pp = PAYMENT_PROFILES[contact.payment_profile] || PAYMENT_PROFILES.pagador_normal;

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Link to={createPageUrl(`ContactDetail?id=${contact.id}`)} className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden border-2 border-white shadow">
              {contact.photo_url ? (
                <img src={contact.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-lg font-bold text-blue-700">{(contact.name?.[0] || 'C').toUpperCase()}</span>
              )}
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <Link to={createPageUrl(`ContactDetail?id=${contact.id}`)}>
              <p className="font-semibold text-sm text-gray-900 truncate hover:text-blue-600 transition-colors">
                {contact.name} {contact.surname}
              </p>
              {contact.company_name && (
                <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3" />{contact.company_name}
                </p>
              )}
            </Link>
            <div className="flex flex-wrap gap-1 mt-1.5">
              <Badge variant="outline" className="text-[10px] capitalize">{contact.type}</Badge>
              <Badge className={`text-[10px] ${CATEGORY_COLORS[contact.category] || ''}`}>
                {contact.category?.replace(/_/g, ' ')}
              </Badge>
              {contact.payment_profile !== 'pagador_normal' && (
                <Badge className={`text-[10px] ${pp.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1 inline-block ${pp.dot}`} />
                  {pp.label}
                </Badge>
              )}
              {contact.pending_amount > 0 && (
                <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">
                  <AlertTriangle className="w-2.5 h-2.5 mr-1" />Debe {contact.pending_amount?.toFixed(0)}€
                </Badge>
              )}
            </div>
            {(contact.phone || contact.city) && (
              <div className="flex items-center gap-3 mt-1.5">
                {contact.phone && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{contact.phone}</span>}
                {contact.city && <span className="text-[10px] text-gray-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{contact.city}</span>}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Phone className="w-3.5 h-3.5" /></a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Mail className="w-3.5 h-3.5" /></a>
            )}
            <button onClick={() => onEdit(contact)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg"><Edit className="w-3.5 h-3.5" /></button>
            <button onClick={() => onDelete(contact.id)} className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactRow({ contact, onEdit, onDelete }) {
  const pp = PAYMENT_PROFILES[contact.payment_profile] || PAYMENT_PROFILES.pagador_normal;
  return (
    <div className="flex items-center gap-3 p-3 border-b hover:bg-gray-50 transition-colors group">
      <Link to={createPageUrl(`ContactDetail?id=${contact.id}`)} className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {contact.photo_url ? (
            <img src={contact.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-sm font-bold text-blue-700">{(contact.name?.[0] || 'C').toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-4 gap-2 items-center">
          <div className="col-span-1 min-w-0">
            <p className="text-sm font-medium truncate">{contact.name} {contact.surname}</p>
            {contact.company_name && <p className="text-[10px] text-gray-500 truncate">{contact.company_name}</p>}
          </div>
          <div className="col-span-1 hidden md:block">
            <p className="text-xs text-gray-500">{contact.phone || '-'}</p>
            {contact.email && <p className="text-[10px] text-gray-400 truncate">{contact.email}</p>}
          </div>
          <div className="col-span-1 hidden md:block">
            <Badge variant="outline" className="text-[10px] capitalize">{contact.type}</Badge>
          </div>
          <div className="col-span-1">
            {contact.pending_amount > 0 ? (
              <Badge className="text-[10px] bg-red-100 text-red-700">{contact.pending_amount?.toFixed(0)}€</Badge>
            ) : (
              <Badge className={`text-[10px] ${pp.color}`}>{pp.label}</Badge>
            )}
          </div>
        </div>
      </Link>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {contact.phone && <a href={`tel:${contact.phone}`} className="p-1 text-green-600 hover:bg-green-50 rounded"><Phone className="w-3.5 h-3.5" /></a>}
        <button onClick={() => onEdit(contact)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><Edit className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(contact.id)} className="p-1 text-red-300 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [view, setView] = useState('cards'); // cards | list
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheDate, setCacheDate] = useState('');
  const photoInputRef = React.useRef(null);
  const cameraInputRef = React.useRef(null);

  useEffect(() => {
    // Cargar caché inmediatamente mientras se espera la red
    const cached = loadFromCache('contacts');
    if (cached) {
      setContacts(cached.data);
      setCacheDate(formatCacheDate(cached.ts));
    }
    loadContacts();
  }, []);

  const loadContacts = useCallback(async () => {
    try {
      const data = await base44.entities.Contact.list('-created_date', 500);
      setContacts(data);
      saveToCache('contacts', data);
      setCacheDate(formatCacheDate(Date.now()));
      setIsOffline(false);
    } catch {
      // Sin red: usar caché existente
      setIsOffline(true);
    }
  }, []);

  const handleSave = async () => {
    if (editing) await base44.entities.Contact.update(editing.id, form);
    else await base44.entities.Contact.create(form);
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    loadContacts();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, photo_url: file_url }));
    setPhotoUploading(false);
  };

  const handleAutoFetchLogo = async () => {
    setFetchingLogo(true);
    // Buscar logo por website si existe, sino por nombre de empresa
    const logoUrl = form.website 
      ? await fetchCompanyLogo(form.website, form.company_name)
      : await fetchCompanyLogo(null, form.company_name);
    if (logoUrl) {
      setForm(prev => ({ ...prev, company_logo_url: logoUrl }));
      if (editing) {
        await base44.entities.Contact.update(editing.id, { ...form, company_logo_url: logoUrl });
        loadContacts();
      }
    }
    setFetchingLogo(false);
  };

  const handleEdit = (c) => {
    setEditing(c);
    setForm({ ...EMPTY_FORM, ...c });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar contacto?')) return;
    await base44.entities.Contact.delete(id);
    loadContacts();
  };

  const filtered = contacts.filter(c => {
    const matchSearch = `${c.name} ${c.surname} ${c.company_name} ${c.phone} ${c.email} ${c.city}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || c.type === filterType;
    const matchPayment = filterPayment === 'all' || c.payment_profile === filterPayment;
    return matchSearch && matchType && matchPayment;
  });

  // Stats
  const totalPending = contacts.reduce((s, c) => s + (c.pending_amount || 0), 0);
  const morosoCount = contacts.filter(c => c.payment_profile === 'moroso').length;
  const clientCount = contacts.filter(c => c.type === 'cliente').length;

  return (
    <PullToRefresh onRefresh={loadContacts}>
    <div className="space-y-4">
      {isOffline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Sin conexión — mostrando caché{cacheDate ? ` del ${cacheDate}` : ''}</span>
          <button onClick={loadContacts} className="ml-auto flex items-center gap-1 text-amber-700 hover:text-amber-900">
            <RefreshCw className="w-3 h-3" />Reintentar
          </button>
        </div>
      )}
      {!isOffline && cacheDate && (
        <div className="text-[10px] text-gray-400 text-right -mb-2">
          Caché actualizada: {cacheDate}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6 text-emerald-500" />Contactos
        </h1>
        <Dialog open={dialogOpen} onOpenChange={() => {}}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setEditing(null); setForm(EMPTY_FORM); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl w-[98vw] max-h-[98vh] overflow-y-auto" onPointerDownOutside={e => e.preventDefault()} onInteractOutside={e => e.preventDefault()}>
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{editing ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle>
                <Button size="sm" variant="ghost" onClick={() => { setDialogOpen(false); setEditing(null); setForm(EMPTY_FORM); }} className="text-gray-400">✕</Button>
              </div>
            </DialogHeader>
            <div className="space-y-3">
              {/* Foto */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 flex-shrink-0">
                  {form.photo_url ? <img src={form.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-gray-400" />}
                </div>
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => photoInputRef.current?.click()} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50" disabled={photoUploading}>
                    <Camera className="w-3 h-3" />{photoUploading ? 'Subiendo...' : 'Desde archivo'}
                  </button>
                  <button type="button" onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-1 text-xs text-green-600 border border-green-300 rounded px-2 py-1 hover:bg-green-50" disabled={photoUploading}>
                    <Camera className="w-3 h-3" />Usar cámara
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Empresa" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
              <Input placeholder="Website de empresa" value={form.website || ''} onChange={e => setForm({...form, website: e.target.value})} />
              <Button onClick={handleAutoFetchLogo} variant="outline" size="sm" className="w-full" disabled={fetchingLogo || (!form.company_name && !form.website)}>
                <Download className="w-3.5 h-3.5 mr-2" />
                {fetchingLogo ? 'Buscando logo...' : 'Descarga logo empresa'}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input placeholder="Apellidos" value={form.surname} onChange={e => setForm({...form, surname: e.target.value})} />
              </div>
              <Input placeholder="NIF / CIF" value={form.nif} onChange={e => setForm({...form, nif: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <Input placeholder="Teléfono 2" value={form.phone2} onChange={e => setForm({...form, phone2: e.target.value})} />
              </div>
              <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <Input placeholder="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <PostalCodeSearch
                  type="city"
                  onSelect={(result) => {
                    setForm(prev => ({
                      ...prev,
                      postal_code: result.postal_code,
                      city: result.city,
                      province: result.province
                    }));
                  }}
                />
                <PostalCodeSearch
                  type="province"
                  onSelect={(result) => {
                    setForm(prev => ({
                      ...prev,
                      postal_code: result.postal_code,
                      city: result.city,
                      province: result.province
                    }));
                  }}
                />
                <PostalCodeSearch
                  type="postal_code"
                  onSelect={(result) => {
                    setForm(prev => ({
                      ...prev,
                      postal_code: result.postal_code,
                      city: result.city,
                      province: result.province
                    }));
                  }}
                />
              </div>
              <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Perfil de pago</label>
                  <Select value={form.payment_profile} onValueChange={v => setForm({...form, payment_profile: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PAYMENT_PROFILES).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Importe pendiente (€)</label>
                  <Input type="number" value={form.pending_amount || 0} onChange={e => setForm({...form, pending_amount: parseFloat(e.target.value)})} />
                </div>
              </div>
              <Textarea placeholder="Observaciones internas (no aparece en documentos)" value={form.internal_observations} onChange={e => setForm({...form, internal_observations: e.target.value})} rows={2} />
              <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700">{editing ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-emerald-50 border-emerald-200"><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-emerald-700">{clientCount}</p>
          <p className="text-xs text-emerald-600">Clientes</p>
        </CardContent></Card>
        <Card className="bg-red-50 border-red-200"><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-red-700">{totalPending.toFixed(0)}€</p>
          <p className="text-xs text-red-600">Pendiente cobro</p>
        </CardContent></Card>
        <Card className="bg-orange-50 border-orange-200"><CardContent className="p-3 text-center">
          <p className="text-lg font-bold text-orange-700">{morosoCount}</p>
          <p className="text-xs text-orange-600">Morosos</p>
        </CardContent></Card>
      </div>

      {/* Filtros + vista */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar nombre, empresa, teléfono, ciudad..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Pago" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos (pago)</SelectItem>
            {Object.entries(PAYMENT_PROFILES).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex border rounded-lg overflow-hidden">
          <button onClick={() => setView('cards')} className={`px-3 py-2 ${view === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('list')} className={`px-3 py-2 ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} contacto{filtered.length !== 1 ? 's' : ''}</p>

      {/* Lista */}
      {view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(c => <ContactCard key={c.id} contact={c} onEdit={handleEdit} onDelete={handleDelete} />)}
        </div>
      ) : (
        <Card>
          <div className="hidden md:grid grid-cols-4 gap-2 p-3 bg-gray-50 border-b text-xs font-medium text-gray-500">
            <span>Nombre / Empresa</span>
            <span>Contacto</span>
            <span>Tipo</span>
            <span>Pago</span>
          </div>
          {filtered.map(c => <ContactRow key={c.id} contact={c} onEdit={handleEdit} onDelete={handleDelete} />)}
        </Card>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No hay contactos</p>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}