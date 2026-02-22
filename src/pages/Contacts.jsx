import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Phone, Mail, Building2, User, Navigation, Trash2, Edit, Upload, Camera } from 'lucide-react';
import { base44 as b44 } from '@/api/base44Client';

const PAYMENT_PROFILES = {
  buen_pagador: { label: 'Buen pagador', color: 'bg-green-100 text-green-700', icon: '✅' },
  pagador_normal: { label: 'Pagador normal', color: 'bg-blue-100 text-blue-700', icon: '💳' },
  regateador: { label: 'Regateador', color: 'bg-yellow-100 text-yellow-700', icon: '⚠️' },
  mal_pagador: { label: 'Mal pagador', color: 'bg-orange-100 text-orange-700', icon: '🔶' },
  moroso: { label: 'Moroso', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

const TYPES = ['cliente', 'proveedor', 'colaborador', 'otro'];
const CATEGORIES = ['residencial', 'comercial', 'industrial', 'administracion_publica', 'comunidad_propietarios', 'otro'];

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ type: 'cliente', category: 'residencial', name: '', surname: '', company_name: '', nif: '', email: '', phone: '', phone2: '', address: '', city: '', province: '', postal_code: '', country: 'España', notes: '', payment_profile: 'pagador_normal', pending_amount: 0, internal_observations: '', photo_url: '' });
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = React.useRef(null);

  useEffect(() => { loadContacts(); }, []);

  const loadContacts = async () => {
    const data = await base44.entities.Contact.list('-created_date', 500);
    setContacts(data);
  };

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Contact.update(editing.id, form);
    } else {
      await base44.entities.Contact.create(form);
    }
    setDialogOpen(false);
    setEditing(null);
    resetForm();
    loadContacts();
  };

  const resetForm = () => setForm({ type: 'cliente', category: 'residencial', name: '', surname: '', company_name: '', nif: '', email: '', phone: '', phone2: '', address: '', city: '', province: '', postal_code: '', country: 'España', notes: '', payment_profile: 'pagador_normal', pending_amount: 0, internal_observations: '', photo_url: '' });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, photo_url: file_url }));
    setPhotoUploading(false);
  };

  const handleEdit = (c) => {
    setEditing(c);
    setForm({ type: c.type || 'cliente', category: c.category || 'residencial', name: c.name || '', surname: c.surname || '', company_name: c.company_name || '', nif: c.nif || '', email: c.email || '', phone: c.phone || '', phone2: c.phone2 || '', address: c.address || '', city: c.city || '', province: c.province || '', postal_code: c.postal_code || '', country: c.country || 'España', notes: c.notes || '', payment_profile: c.payment_profile || 'pagador_normal', pending_amount: c.pending_amount || 0, internal_observations: c.internal_observations || '', photo_url: c.photo_url || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Contact.delete(id);
    loadContacts();
  };

  const openGPS = (contact) => {
    const addr = encodeURIComponent(`${contact.address || ''}, ${contact.city || ''}, ${contact.province || ''}, ${contact.postal_code || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
  };

  const filtered = contacts.filter(c => {
    const matchSearch = `${c.name} ${c.surname} ${c.company_name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || c.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar contacto' : 'Nuevo contacto'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {/* Photo upload */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 flex-shrink-0">
                  {form.photo_url ? (
                    <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-7 h-7 text-gray-400" />
                  )}
                </div>
                <div>
                  <button type="button" onClick={() => photoInputRef.current?.click()} className="flex items-center gap-1 text-xs text-blue-600 border border-blue-300 rounded px-2 py-1 hover:bg-blue-50" disabled={photoUploading}>
                    <Camera className="w-3 h-3" />{photoUploading ? 'Subiendo...' : 'Foto contacto'}
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input placeholder="Empresa" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                <Input placeholder="Apellidos" value={form.surname} onChange={e => setForm({...form, surname: e.target.value})} />
              </div>
              <Input placeholder="NIF" value={form.nif} onChange={e => setForm({...form, nif: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <Input placeholder="Teléfono 2" value={form.phone2} onChange={e => setForm({...form, phone2: e.target.value})} />
              </div>
              <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              <Input placeholder="Dirección" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Ciudad" value={form.city} onChange={e => setForm({...form, city: e.target.value})} />
                <Input placeholder="Provincia" value={form.province} onChange={e => setForm({...form, province: e.target.value})} />
                <Input placeholder="C.P." value={form.postal_code} onChange={e => setForm({...form, postal_code: e.target.value})} />
              </div>
              <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Perfil de pago</label>
                  <Select value={form.payment_profile} onValueChange={v => setForm({...form, payment_profile: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PAYMENT_PROFILES).map(([k,v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Importe pendiente (€)</label>
                  <Input type="number" value={form.pending_amount || 0} onChange={e => setForm({...form, pending_amount: parseFloat(e.target.value)})} />
                </div>
              </div>
              <Textarea placeholder="Observaciones internas (no aparece en documentos)" value={form.internal_observations} onChange={e => setForm({...form, internal_observations: e.target.value})} rows={2} />
              <Button onClick={handleSave} className="w-full bg-blue-600">{editing ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar contacto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(contact => (
          <Card key={contact.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <Link to={createPageUrl(`ContactDetail?id=${contact.id}`)} className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden border">
                      {contact.photo_url || contact.company_logo_url ? (
                        <img src={contact.photo_url || contact.company_logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-blue-600">{(contact.name?.[0] || 'C').toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{contact.name} {contact.surname}</p>
                      {contact.company_name && <p className="text-xs text-gray-500 truncate">{contact.company_name}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px]">{contact.type}</Badge>
                        <Badge variant="outline" className="text-[10px]">{contact.category?.replace(/_/g, ' ')}</Badge>
                        {contact.payment_profile && contact.payment_profile !== 'pagador_normal' && (
                          <Badge className={`text-[10px] ${PAYMENT_PROFILES[contact.payment_profile]?.color}`}>{PAYMENT_PROFILES[contact.payment_profile]?.icon} {PAYMENT_PROFILES[contact.payment_profile]?.label}</Badge>
                        )}
                        {contact.pending_amount > 0 && <Badge className="text-[10px] bg-red-100 text-red-700">Debe {contact.pending_amount?.toFixed(0)}€</Badge>}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="p-2 text-green-600 hover:bg-green-50 rounded-lg">
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {contact.address && (
                    <button onClick={() => openGPS(contact)} className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg">
                      <Navigation className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => handleEdit(contact)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(contact.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No hay contactos</p>}
      </div>
    </div>
  );
}