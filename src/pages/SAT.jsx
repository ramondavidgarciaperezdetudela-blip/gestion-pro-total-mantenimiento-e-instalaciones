import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Wrench, Trash2, Search, Edit, Eye, Send, Phone } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';

const TYPES = ['reparacion', 'mantenimiento', 'instalacion', 'revision', 'urgencia'];
const EQUIPMENT = ['aire_acondicionado', 'bomba_calor', 'camara_frigorifica', 'electrico', 'solar', 'otro'];
const STATUSES = ['pendiente', 'en_curso', 'completada', 'cancelada'];

export default function SAT() {
  const [orders, setOrders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [form, setForm] = useState({
    order_number: '', contact_id: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'),
    type: 'reparacion', equipment_type: 'otro', description: '', diagnosis: '', solution: '',
    status: 'pendiente', photos_before: [], photos_after: [],
    materials_used: [], labor_hours: 0, labor_rate: 35, total: 0, technician: '', notes: ''
  });
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.SATOrder.list('-date', 500),
      base44.entities.Contact.list(),
      base44.entities.CompanySettings.list(),
    ]).then(([o, c, settings]) => {
      setOrders(o);
      setContacts(c);
      if (settings[0]?.technicians) setTechnicians(settings[0].technicians);
    });
  }, []);

  const handleSave = async () => {
    const total = (form.labor_hours || 0) * (form.labor_rate || 0) + (form.materials_used || []).reduce((sum, m) => sum + (m.quantity || 0) * (m.unit_price || 0), 0);
    const data = { ...form, total };
    if (editing) {
      await base44.entities.SATOrder.update(editing.id, data);
    } else {
      await base44.entities.SATOrder.create(data);
    }
    setDialogOpen(false);
    setEditing(null);
    const o = await base44.entities.SATOrder.list('-date', 500);
    setOrders(o);
  };

  const handleEdit = (order) => {
    setEditing(order);
    setForm({
      order_number: order.order_number || '', contact_id: order.contact_id || '', contact_name: order.contact_name || '',
      date: order.date || '', type: order.type || 'reparacion', equipment_type: order.equipment_type || 'otro',
      description: order.description || '', diagnosis: order.diagnosis || '', solution: order.solution || '',
      status: order.status || 'pendiente', photos_before: order.photos_before || [], photos_after: order.photos_after || [],
      materials_used: order.materials_used || [], labor_hours: order.labor_hours || 0, labor_rate: order.labor_rate || 35,
      total: order.total || 0, technician: order.technician || '', notes: order.notes || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    await base44.entities.SATOrder.delete(id);
    setOrders(orders.filter(o => o.id !== id));
  };

  const filtered = orders.filter(o => {
    const matchSearch = `${o.order_number} ${o.contact_name} ${o.description}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusColors = { pendiente: 'bg-yellow-100 text-yellow-700', en_curso: 'bg-blue-100 text-blue-700', completada: 'bg-green-100 text-green-700', cancelada: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Órdenes SAT</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700"><Plus className="w-4 h-4 mr-2" />Nueva orden</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nueva'} orden SAT</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nº orden" value={form.order_number} onChange={e => setForm({...form, order_number: e.target.value})} />
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <Select value={form.contact_id} onValueChange={v => {
                const c = contacts.find(co => co.id === v);
                setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
              }}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.equipment_type} onValueChange={v => setForm({...form, equipment_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EQUIPMENT.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Descripción del problema" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              <Textarea placeholder="Diagnóstico" value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} />
              <Textarea placeholder="Solución aplicada" value={form.solution} onChange={e => setForm({...form, solution: e.target.value})} />
              {technicians.length > 0 ? (
                <Select value={form.technician} onValueChange={v => setForm({...form, technician: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar técnico" /></SelectTrigger>
                  <SelectContent>
                    {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    <SelectItem value="__manual__">Escribir manualmente...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Técnico" value={form.technician} onChange={e => setForm({...form, technician: e.target.value})} />
              )}
              {form.technician === '__manual__' && (
                <Input placeholder="Nombre del técnico" onChange={e => setForm({...form, technician: e.target.value})} />
              )}
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" placeholder="Horas trabajo" value={form.labor_hours} onChange={e => setForm({...form, labor_hours: parseFloat(e.target.value) || 0})} />
                <Input type="number" placeholder="€/hora" value={form.labor_rate} onChange={e => setForm({...form, labor_rate: parseFloat(e.target.value) || 0})} />
              </div>
              <PhotoGallery photos={form.photos_before} onChange={p => setForm({...form, photos_before: p})} label="Fotos antes de reparación" maxPhotos={30} />
              <PhotoGallery photos={form.photos_after} onChange={p => setForm({...form, photos_after: p})} label="Fotos después de reparación" maxPhotos={30} />
              <Textarea placeholder="Notas" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              <Button onClick={handleSave} className="w-full bg-orange-600">{editing ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <Dialog open={!!previewOrder} onOpenChange={() => setPreviewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {previewOrder && (
            <div ref={printRef}>
              <CompanyHeader className="mb-3" />
              <h2 className="text-xl font-bold">Orden SAT #{previewOrder.order_number}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                <p><span className="text-gray-500">Cliente:</span> {previewOrder.contact_name}</p>
                <p><span className="text-gray-500">Fecha:</span> {previewOrder.date}</p>
                <p><span className="text-gray-500">Tipo:</span> {previewOrder.type}</p>
                <p><span className="text-gray-500">Equipo:</span> {previewOrder.equipment_type?.replace(/_/g, ' ')}</p>
              </div>
              {previewOrder.description && <div className="mt-3"><p className="text-xs text-gray-500">Descripción:</p><p className="text-sm">{previewOrder.description}</p></div>}
              {previewOrder.diagnosis && <div className="mt-2"><p className="text-xs text-gray-500">Diagnóstico:</p><p className="text-sm">{previewOrder.diagnosis}</p></div>}
              {previewOrder.solution && <div className="mt-2"><p className="text-xs text-gray-500">Solución:</p><p className="text-sm">{previewOrder.solution}</p></div>}
              {previewOrder.photos_before?.length > 0 && (
                <div className="mt-3"><p className="text-xs text-gray-500 mb-1">Fotos antes:</p><div className="flex flex-wrap gap-2">{previewOrder.photos_before.map((p, i) => <img key={i} src={p} className="w-24 h-24 object-cover rounded" />)}</div></div>
              )}
              {previewOrder.photos_after?.length > 0 && (
                <div className="mt-3"><p className="text-xs text-gray-500 mb-1">Fotos después:</p><div className="flex flex-wrap gap-2">{previewOrder.photos_after.map((p, i) => <img key={i} src={p} className="w-24 h-24 object-cover rounded" />)}</div></div>
              )}
              <p className="font-bold mt-3 text-right">Total: {previewOrder.total?.toFixed(2)} €</p>
            </div>
          )}
          <PrintButton contentRef={printRef} title={`SAT ${previewOrder?.order_number}`} />
        </DialogContent>
      </Dialog>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No hay órdenes SAT</p>
          <p className="text-xs mt-1">Crea una nueva orden con el botón de arriba</p>
        </div>
      )}
      <div className="space-y-2">
        {filtered.map(order => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Wrench className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">#{order.order_number || 'S/N'} — {order.contact_name}</p>
                    <p className="text-xs text-gray-500">{order.date} | {order.type?.replace(/_/g,' ')} | {order.equipment_type?.replace(/_/g, ' ')}</p>
                    {order.description && <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{order.description}</p>}
                    {order.technician && <p className="text-xs text-blue-600 mt-0.5">👷 {order.technician}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <Badge className={statusColors[order.status]}>{order.status}</Badge>
                  {order.total > 0 && <span className="text-xs font-semibold text-gray-700">{order.total?.toFixed(2)} €</span>}
                </div>
              </div>
              <div className="flex gap-1 mt-2 border-t pt-2">
                <button onClick={() => setPreviewOrder(order)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-orange-50 text-orange-700 hover:bg-orange-100">
                  <Eye className="w-3 h-3" /> Ver
                </button>
                <button onClick={() => handleEdit(order)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                  <Edit className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => {
                    const msg = encodeURIComponent(`Orden SAT #${order.order_number}\nCliente: ${order.contact_name}\nFecha: ${order.date}\nTipo: ${order.type}\nDescripción: ${order.description || '-'}\nEstado: ${order.status}`);
                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
                  <Phone className="w-3 h-3" /> WA
                </button>
                <button onClick={() => handleDelete(order.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}