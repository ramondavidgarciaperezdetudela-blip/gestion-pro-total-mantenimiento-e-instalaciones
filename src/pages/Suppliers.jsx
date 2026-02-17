import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, ExternalLink, Trash2, Edit, Phone, Mail } from 'lucide-react';

const CATEGORIES = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general'];
const DEFAULT_SUPPLIERS = [
  { name: 'Salvador Escoda', website: 'https://www.salvadorescoda.com', category: 'refrigeracion' },
  { name: 'Hidro Elèctric SyG', website: 'https://www.hidroelectric.com', category: 'electrico' },
];

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', website: '', login_url: '', category: 'general', phone: '', email: '', contact_person: '', notes: '' });

  useEffect(() => {
    base44.entities.Supplier.list().then(data => {
      setSuppliers(data);
      if (data.length === 0) {
        base44.entities.Supplier.bulkCreate(DEFAULT_SUPPLIERS).then(() => {
          base44.entities.Supplier.list().then(setSuppliers);
        });
      }
    });
  }, []);

  const handleSave = async () => {
    if (editing) await base44.entities.Supplier.update(editing.id, form);
    else await base44.entities.Supplier.create(form);
    setDialogOpen(false);
    setEditing(null);
    setForm({ name: '', website: '', login_url: '', category: 'general', phone: '', email: '', contact_person: '', notes: '' });
    const data = await base44.entities.Supplier.list();
    setSuppliers(data);
  };

  const handleEdit = (s) => {
    setEditing(s);
    setForm({ name: s.name, website: s.website || '', login_url: s.login_url || '', category: s.category || 'general', phone: s.phone || '', email: s.email || '', contact_person: s.contact_person || '', notes: s.notes || '' });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-slate-600"><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} proveedor</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nombre *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <Input placeholder="Sitio web" value={form.website} onChange={e => setForm({...form, website: e.target.value})} />
              <Input placeholder="URL acceso cliente" value={form.login_url} onChange={e => setForm({...form, login_url: e.target.value})} />
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                <Input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <Input placeholder="Persona de contacto" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
              <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <Button onClick={handleSave} className="w-full bg-slate-600">{editing ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {suppliers.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-semibold text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.contact_person} | {s.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded"><ExternalLink className="w-4 h-4" /></a>}
                {s.phone && <a href={`tel:${s.phone}`} className="p-2 text-green-600 hover:bg-green-50 rounded"><Phone className="w-4 h-4" /></a>}
                <button onClick={() => handleEdit(s)} className="p-2 text-gray-400 hover:text-gray-600"><Edit className="w-4 h-4" /></button>
                <button onClick={() => base44.entities.Supplier.delete(s.id).then(() => setSuppliers(suppliers.filter(x => x.id !== s.id)))} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}