import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Save, RefreshCw, Phone, Mail, Printer, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import CompanyHeader from './CompanyHeader';
import PrintButton from './PrintButton';

const TYPES = ['reparacion', 'mantenimiento', 'instalacion', 'revision', 'urgencia'];
const EQUIPMENT = ['aire_acondicionado', 'bomba_calor', 'camara_frigorifica', 'electrico', 'solar', 'otro'];
const STATUSES = ['pendiente', 'en_curso', 'completada', 'cancelada'];
const PRIORITIES = ['baja', 'normal', 'alta', 'urgente'];

const STATUS_COLORS = {
  pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  en_curso: 'bg-blue-100 text-blue-700 border-blue-300',
  completada: 'bg-green-100 text-green-700 border-green-300',
  cancelada: 'bg-gray-100 text-gray-600 border-gray-300',
};

const EMPTY_FORM = {
  order_number: '', contact_id: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'),
  type: 'reparacion', equipment_type: 'otro', description: '', diagnosis: '', solution: '',
  status: 'pendiente', priority: 'normal', photos_before: [], photos_after: [],
  materials_used: [], labor_hours: 0, labor_rate: 35, total: 0, technician: '', notes: ''
};

// ─── VISTA PREVIA ────────────────────────────────────────────────────────────
function SATPreview({ order, onEdit, onClose, contact }) {
  const printRef = useRef(null);

  const sendWhatsApp = () => {
    const phone = contact?.phone?.replace(/[^0-9]/g, '') || '';
    const msg = encodeURIComponent(`*Orden SAT #${order.order_number}*\nCliente: ${order.contact_name}\nFecha: ${order.date}\nTipo: ${order.type}\nEstado: ${order.status}\n\nDescripción: ${order.description || '-'}\nSolución: ${order.solution || '-'}\nTotal: ${order.total?.toFixed(2)} €`);
    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const sendEmail = () => {
    if (!contact?.email) return;
    const subject = encodeURIComponent(`Orden SAT #${order.order_number}`);
    const body = encodeURIComponent(`Estimado/a ${order.contact_name},\n\nOrden SAT #${order.order_number}\nFecha: ${order.date}\nEstado: ${order.status}\nDescripción: ${order.description || '-'}\nSolución: ${order.solution || '-'}\nTotal: ${order.total?.toFixed(2)} €\n\nAtentamente`);
    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <>
      <div ref={printRef} className="space-y-3">
        <CompanyHeader />
        <div className="border-b pb-2 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-orange-700">Orden SAT #{order.order_number || 'S/N'}</h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge className={STATUS_COLORS[order.status] || ''}>{order.status}</Badge>
              {order.priority && order.priority !== 'normal' && <Badge className="bg-orange-100 text-orange-700">{order.priority}</Badge>}
            </div>
          </div>
          <p className="text-sm text-gray-500">Fecha: {order.date}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-500 text-xs font-medium uppercase">Cliente</p><p className="font-semibold">{order.contact_name}</p></div>
          <div><p className="text-gray-500 text-xs font-medium uppercase">Tipo / Equipo</p><p className="capitalize">{order.type?.replace(/_/g,' ')} / {order.equipment_type?.replace(/_/g, ' ')}</p></div>
          {order.technician && <div><p className="text-gray-500 text-xs font-medium uppercase">Técnico</p><p>{order.technician}</p></div>}
          {order.scheduled_date && <div><p className="text-gray-500 text-xs font-medium uppercase">Fecha programada</p><p>{order.scheduled_date} {order.scheduled_time}</p></div>}
        </div>

        {order.description && <div className="bg-gray-50 rounded p-3"><p className="text-xs font-medium text-gray-500 uppercase mb-1">Descripción del problema</p><p className="text-sm whitespace-pre-wrap">{order.description}</p></div>}
        {order.diagnosis && <div className="bg-blue-50 rounded p-3"><p className="text-xs font-medium text-blue-500 uppercase mb-1">Diagnóstico</p><p className="text-sm whitespace-pre-wrap">{order.diagnosis}</p></div>}
        {order.solution && <div className="bg-green-50 rounded p-3"><p className="text-xs font-medium text-green-500 uppercase mb-1">Solución aplicada</p><p className="text-sm whitespace-pre-wrap">{order.solution}</p></div>}

        {order.materials_used?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Materiales utilizados</p>
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-100">
                <th className="border p-1.5 text-left">Material</th>
                <th className="border p-1.5 text-right">Cant.</th>
                <th className="border p-1.5 text-right">€/ud</th>
                <th className="border p-1.5 text-right">Total</th>
              </tr></thead>
              <tbody>{order.materials_used.map((m, i) => (
                <tr key={i}>
                  <td className="border p-1.5">{m.material}</td>
                  <td className="border p-1.5 text-right">{m.quantity}</td>
                  <td className="border p-1.5 text-right">{m.unit_price} €</td>
                  <td className="border p-1.5 text-right font-medium">{((m.quantity||0)*(m.unit_price||0)).toFixed(2)} €</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <div className="border-t pt-2 text-sm flex justify-between items-end">
          <p>Mano de obra: {order.labor_hours}h × {order.labor_rate} €/h = <strong>{((order.labor_hours||0)*(order.labor_rate||0)).toFixed(2)} €</strong></p>
          <p className="text-lg font-bold text-orange-700">TOTAL: {order.total?.toFixed(2)} €</p>
        </div>

        {order.photos_before?.length > 0 && (
          <div><p className="text-xs text-gray-500 font-medium mb-1">Fotos antes:</p><div className="flex flex-wrap gap-2">{order.photos_before.map((p, i) => <img key={i} src={p} alt="" className="w-24 h-24 object-cover rounded border" />)}</div></div>
        )}
        {order.photos_after?.length > 0 && (
          <div><p className="text-xs text-gray-500 font-medium mb-1">Fotos después:</p><div className="flex flex-wrap gap-2">{order.photos_after.map((p, i) => <img key={i} src={p} alt="" className="w-24 h-24 object-cover rounded border" />)}</div></div>
        )}
        {order.notes && <div className="bg-amber-50 rounded p-3 text-sm"><p className="text-xs font-medium text-amber-600 mb-1">Notas</p>{order.notes}</div>}

        <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="border-b border-gray-400 h-16 mb-1"></div>
            <p className="text-xs text-gray-500">Firma del Técnico</p>
            {order.technician && <p className="text-xs font-medium">{order.technician}</p>}
          </div>
          <div className="text-center">
            <div className="border-b border-gray-400 h-16 mb-1"></div>
            <p className="text-xs text-gray-500">Conformidad del Cliente</p>
            <p className="text-xs font-medium">{order.contact_name}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap pt-3 border-t">
        <PrintButton contentRef={printRef} title={`SAT_${order.order_number || 'orden'}`} />
        <Button variant="outline" size="sm" onClick={onEdit}><Edit className="w-3.5 h-3.5 mr-1" />Editar</Button>
        <Button variant="outline" size="sm" className="text-green-700" onClick={sendWhatsApp}><Phone className="w-3.5 h-3.5 mr-1" />WA</Button>
        {contact?.email && <Button variant="outline" size="sm" className="text-blue-700" onClick={sendEmail}><Mail className="w-3.5 h-3.5 mr-1" />Email</Button>}
      </div>
    </>
  );
}

// ─── FORMULARIO EDICIÓN ───────────────────────────────────────────────────────
function SATForm({ order, contact, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...order, materials_used: order?.materials_used || [], photos_before: order?.photos_before || [], photos_after: order?.photos_after || [] });
  const [saving, setSaving] = useState(false);

  const calcTotal = (f) => (f.labor_hours || 0) * (f.labor_rate || 0) + (f.materials_used || []).reduce((s, m) => s + (m.quantity || 0) * (m.unit_price || 0), 0);

  const addMaterial = () => setForm(prev => ({ ...prev, materials_used: [...(prev.materials_used || []), { material: '', quantity: 1, unit_price: 0 }] }));
  const updateMaterial = (i, field, val) => setForm(prev => ({ ...prev, materials_used: prev.materials_used.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }));
  const removeMaterial = (i) => setForm(prev => ({ ...prev, materials_used: prev.materials_used.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    setSaving(true);
    const total = calcTotal(form);
    const data = { ...form, total };
    if (order?.id) {
      await base44.entities.SATOrder.update(order.id, data);
    }
    setSaving(false);
    onSave({ ...data, id: order?.id });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Nº orden" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} />
        <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.equipment_type} onValueChange={v => setForm({ ...form, equipment_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{EQUIPMENT.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.priority || 'normal'} onValueChange={v => setForm({ ...form, priority: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Input placeholder="Técnico responsable" value={form.technician || ''} onChange={e => setForm({ ...form, technician: e.target.value })} />

      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Descripción del problema" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Diagnóstico" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} rows={2} />
      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Solución aplicada" value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} rows={2} />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">Materiales utilizados</label>
          <Button size="sm" variant="outline" onClick={addMaterial}><Plus className="w-3 h-3 mr-1" />Añadir</Button>
        </div>
        {form.materials_used?.map((m, i) => (
          <div key={i} className="grid grid-cols-4 gap-1 mb-1">
            <input className="col-span-2 h-7 text-xs border border-input rounded-md px-2 focus:outline-none" placeholder="Material" value={m.material} onChange={e => updateMaterial(i, 'material', e.target.value)} />
            <input type="number" className="h-7 text-xs border border-input rounded-md px-2 focus:outline-none" placeholder="Cant" value={m.quantity} onChange={e => updateMaterial(i, 'quantity', parseFloat(e.target.value) || 0)} />
            <div className="flex gap-1">
              <input type="number" className="h-7 text-xs flex-1 border border-input rounded-md px-2 focus:outline-none" placeholder="€/ud" value={m.unit_price} onChange={e => updateMaterial(i, 'unit_price', parseFloat(e.target.value) || 0)} />
              <button onClick={() => removeMaterial(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder="Horas trabajo" value={form.labor_hours} onChange={e => setForm({ ...form, labor_hours: parseFloat(e.target.value) || 0 })} />
        <Input type="number" placeholder="€/hora" value={form.labor_rate} onChange={e => setForm({ ...form, labor_rate: parseFloat(e.target.value) || 0 })} />
      </div>
      <p className="text-xs text-right text-gray-500">Total estimado: <strong className="text-orange-700">{calcTotal(form).toFixed(2)} €</strong></p>

      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Notas internas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
          {saving ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Guardando...</> : <><Save className="w-4 h-4 mr-1" />Actualizar orden</>}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function SATOrderDialog({ order, contact, mode = 'view', open, onClose, onSaved }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [currentOrder, setCurrentOrder] = useState(order);

  const handleSaved = (updatedOrder) => {
    setCurrentOrder(updatedOrder);
    setCurrentMode('view');
    if (onSaved) onSaved(updatedOrder);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {currentMode === 'edit' ? '✏️ Editar' : '👁 Ver'} Orden SAT #{currentOrder?.order_number || 'S/N'}
            </DialogTitle>
            <div className="flex gap-2 mr-6">
              <button
                onClick={() => setCurrentMode('view')}
                className={`text-xs px-2 py-1 rounded transition-colors ${currentMode === 'view' ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Eye className="w-3 h-3 inline mr-1" />Vista previa
              </button>
              <button
                onClick={() => setCurrentMode('edit')}
                className={`text-xs px-2 py-1 rounded transition-colors ${currentMode === 'edit' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Edit className="w-3 h-3 inline mr-1" />Editar
              </button>
            </div>
          </div>
        </DialogHeader>

        {currentMode === 'view' ? (
          <SATPreview order={currentOrder} contact={contact} onEdit={() => setCurrentMode('edit')} onClose={onClose} />
        ) : (
          <SATForm order={currentOrder} contact={contact} onSave={handleSaved} onCancel={() => setCurrentMode('view')} />
        )}
      </DialogContent>
    </Dialog>
  );
}