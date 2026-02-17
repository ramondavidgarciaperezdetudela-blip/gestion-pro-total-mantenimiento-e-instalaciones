import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Plus, Phone, Mail, Globe, Trash2, Edit, ExternalLink } from 'lucide-react';

const CATEGORIES = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general'];

const DEFAULT_SUPPLIERS = [
  { name: 'Salvador Escoda', website: 'https://www.salvadorescoda.com', category: 'refrigeracion', phone: '93 265 81 00', email: 'info@salvadorescoda.com', notes: 'Distribuidor oficial climatización y refrigeración', is_active: true },
  { name: 'Hidroelectric SYG', website: 'https://www.syg.es', category: 'clima', phone: '', email: '', notes: 'Distribuidor material climatización', is_active: true },
];

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', website: '', login_url: '', category: 'general', phone: '', email: '', contact_person: '', notes: '', is_active: true });

  useEffect(() => {
    base44.entities.Supplier.list().then(data => {
      if (data.length === 0) {
        // Crear proveedores por defecto
        Promise.all(DEFAULT_SUPPLIERS.map(s => base44.entities.Supplier.create(s))).then(() => {
          base44.entities.Supplier.list().then(setSuppliers);
        });
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
    setForm({ name: '', website: '', login_url: '', category: 'general', phone: '', email: '', contact_person: '', notes: '', is_active: true });
    base44.entities.Supplier.list().then(setSuppliers);
  };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name||'', website: s.website||'', login_url: s.login_url||'', category: s.category||'general', phone: s.phone||'', email: s.email||'', contact_person: s.contact_person||'', notes: s.notes||'', is_active: s.is_active !== false });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.Supplier.delete(id);
    setSuppliers(suppliers.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-700 hover:bg-slate-800"><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} proveedor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Sitio web" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
              <Input placeholder="URL acceso tienda online / login" value={form.login_url} onChange={e => setForm({...form, login_url: e.target.value})} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <Input placeholder="Persona de contacto" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
              <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <Button onClick={handleSave} className="w-full bg-slate-700">{editing ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {suppliers.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge variant="outline" className="text-[10px]">{s.category}</Badge>
                    {!s.is_active && <Badge className="bg-gray-100 text-gray-500 text-[10px]">Inactivo</Badge>}
                  </div>
                  {s.notes && <p className="text-xs text-gray-500 mb-2">{s.notes}</p>}
                  <div className="flex flex-wrap gap-3 text-xs">
                    {s.phone && <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-blue-600"><Phone className="w-3 h-3" />{s.phone}</a>}
                    {s.email && <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-blue-600"><Mail className="w-3 h-3" />{s.email}</a>}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  {(s.login_url || s.website) && (
                    <a href={s.login_url || s.website} target="_blank" rel="noopener noreferrer"
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg text-xs flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => handleEdit(s)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}