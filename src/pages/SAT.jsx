import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import PullToRefresh from '../components/PullToRefresh';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wrench, Trash2, Search, Edit, Eye, Send, Phone, Mail, Calendar, BarChart3, Clock, CheckCircle2, AlertTriangle, Save, RefreshCw, Printer, FileText, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, parseISO, differenceInDays } from 'date-fns';
import { getNextAvailableNumber } from '../components/autoNumber';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';
import AIChat from '../components/AIChat';

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
const PRIORITY_COLORS = {
  baja: 'bg-gray-100 text-gray-600',
  normal: 'bg-blue-50 text-blue-600',
  alta: 'bg-orange-100 text-orange-700',
  urgente: 'bg-red-100 text-red-700',
};

const EMPTY_FORM = {
  order_number: '', contact_id: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'),
  scheduled_date: '', scheduled_time: '', priority: 'normal',
  type: 'reparacion', equipment_type: 'otro', description: '', diagnosis: '', solution: '',
  status: 'pendiente', photos_before: [], photos_after: [],
  materials_used: [], labor_hours: 0, labor_rate: 35, total: 0, technician: '', notes: ''
};

export default function SAT() {
  const urlParams = new URLSearchParams(window.location.search);
  const preContactId = urlParams.get('contact_id');
  const preViewId = urlParams.get('view');
  const preEditId = urlParams.get('edit');

  const [orders, setOrders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(preContactId ? { contact_id: preContactId } : {}) });
  const [activeTab, setActiveTab] = useState('lista');
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(false);
  const printRef = useRef(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [o, c, settings] = await Promise.all([
      base44.entities.SATOrder.list('-date', 500),
      base44.entities.Contact.list('name', 500),
      base44.entities.CompanySettings.list(),
    ]);
    setOrders(o);
    setContacts(c);
    if (settings[0]?.technicians) setTechnicians(settings[0].technicians);

    // Abrir orden desde URL params
    if (preViewId) {
      const found = o.find(ord => ord.id === preViewId);
      if (found) setPreviewOrder(found);
    }
    if (preEditId) {
      const found = o.find(ord => ord.id === preEditId);
      if (found) { setEditing(found); setForm({ ...EMPTY_FORM, ...found, materials_used: found.materials_used || [], photos_before: found.photos_before || [], photos_after: found.photos_after || [] }); setDialogOpen(true); }
    }
    if (preContactId && !preEditId && !preViewId) {
      const ct = c.find(co => co.id === preContactId);
      if (ct) {
        setForm({ ...EMPTY_FORM, contact_id: preContactId, contact_name: `${ct.name} ${ct.surname || ''}`.trim(), order_number: getNextAvailableNumber(o.map(x => x.order_number || '')) });
        setDialogOpen(true);
      }
    }
  };

  const calcTotal = (f) =>
    (f.labor_hours || 0) * (f.labor_rate || 0) +
    (f.materials_used || []).reduce((s, m) => s + (m.quantity || 0) * (m.unit_price || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    const total = calcTotal(form);
    const data = { ...form, total };
    let savedOrder = null;

    if (editing) {
      await base44.entities.SATOrder.update(editing.id, data);
      savedOrder = { ...data, id: editing.id };
      // Actualizar el documento vinculado si existe
      if (form.contact_id) {
        const docs = await base44.entities.ClientDocument.filter({ contact_id: form.contact_id, doc_type: 'orden_sat' });
        const linked = docs.find(d => d.title?.includes(editing.order_number || editing.id.slice(-6)));
        if (linked) {
          await base44.entities.ClientDocument.update(linked.id, {
            title: `Orden SAT #${form.order_number || editing.id.slice(-6)} - ${form.type}`,
            description: `${form.type} | ${form.equipment_type?.replace(/_/g, ' ')} | ${form.description || ''} | Estado: ${form.status} | Total: ${total.toFixed(2)} €`,
            date: form.date,
          });
        }
      }
    } else {
      // Recalcular número justo antes de guardar por si hubo concurrencia
      const latest = await base44.entities.SATOrder.list('-date', 500);
      if (!data.order_number) {
        data.order_number = getNextAvailableNumber(latest.map(x => x.order_number || ''));
      }
      const saved = await base44.entities.SATOrder.create(data);
      savedOrder = saved;
      if (form.contact_id) {
        await base44.entities.ClientDocument.create({
          contact_id: form.contact_id,
          contact_name: form.contact_name,
          title: `Orden SAT #${data.order_number || saved.id.slice(-6)} - ${form.type}`,
          doc_type: 'orden_sat',
          date: form.date,
          description: `${form.type} | ${form.equipment_type?.replace(/_/g, ' ')} | ${form.description || ''} | Estado: ${form.status} | Total: ${total.toFixed(2)} €`,
        });
      }
    }

    // Auto-generar factura si orden está completada y opción activa
    if (autoGenerateInvoice && form.status === 'completada' && form.contact_id && savedOrder) {
      try {
        await base44.entities.Invoice.create({
          doc_type: 'factura',
          contact_id: form.contact_id,
          contact_name: form.contact_name,
          date: form.date,
          status: 'borrador',
          work_type: form.equipment_type || 'otro',
          items: form.materials_used?.length > 0 ? form.materials_used.map(m => ({
            description: m.material,
            quantity: m.quantity,
            unit_price: m.unit_price,
            total: (m.quantity || 0) * (m.unit_price || 0)
          })) : [{
            description: form.description,
            quantity: 1,
            unit_price: (form.labor_hours || 0) * (form.labor_rate || 0),
            total: (form.labor_hours || 0) * (form.labor_rate || 0)
          }],
          subtotal: total,
          iva_rate: 21,
          iva_amount: total * 0.21,
          total: total * 1.21,
          observations: `Generada automáticamente desde Orden SAT #${form.order_number || savedOrder.id.slice(-6)}`
        });
      } catch (e) {
        console.log('Auto-invoice creation skipped');
      }
    }

    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    setAutoGenerateInvoice(false);
    await loadAll();
  };

  const getNextSATNumber = (currentOrders) => {
    const nums = currentOrders.map(o => o.order_number || '');
    return getNextAvailableNumber(nums);
  };

  const handleEdit = (order) => {
    setEditing(order);
    setForm({ ...EMPTY_FORM, ...order, materials_used: order.materials_used || [], photos_before: order.photos_before || [], photos_after: order.photos_after || [] });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta orden SAT?')) return;
    await base44.entities.SATOrder.delete(id);
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const sendEmail = (order) => {
    const c = contacts.find(x => x.id === order.contact_id);
    if (!c?.email) return alert('Este cliente no tiene email registrado');
    const subject = encodeURIComponent(`Orden SAT #${order.order_number} - ${order.type}`);
    const body = encodeURIComponent(`Estimado/a ${order.contact_name},\n\nLe informamos del estado de su orden SAT:\n\nNº: ${order.order_number}\nTipo: ${order.type}\nEstado: ${order.status}\nDescripción: ${order.description || '-'}\nSolución: ${order.solution || '-'}\nTotal: ${order.total?.toFixed(2)} €\n\nQuedamos a su disposición.`);
    window.open(`mailto:${c.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const sendWhatsApp = (order) => {
    const c = contacts.find(x => x.id === order.contact_id);
    const phone = c?.phone?.replace(/[^0-9]/g, '') || '';
    const msg = encodeURIComponent(`*Orden SAT #${order.order_number}*\nCliente: ${order.contact_name}\nFecha: ${order.date}\nTipo: ${order.type}\nEstado: ${order.status}\n\nDescripción: ${order.description || '-'}\nSolución: ${order.solution || '-'}\nTotal: ${order.total?.toFixed(2)} €`);
    const url = phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, '_blank');
  };

  const addMaterial = () => setForm(prev => ({ ...prev, materials_used: [...(prev.materials_used || []), { material: '', quantity: 1, unit_price: 0 }] }));
  const updateMaterial = (i, field, val) => setForm(prev => ({ ...prev, materials_used: prev.materials_used.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }));
  const removeMaterial = (i) => setForm(prev => ({ ...prev, materials_used: prev.materials_used.filter((_, idx) => idx !== i) }));

  const filtered = orders.filter(o => {
    const matchSearch = `${o.order_number} ${o.contact_name} ${o.description} ${o.technician}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    const matchPriority = filterPriority === 'all' || o.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  // Stats
  const stats = {
    total: orders.length,
    pendiente: orders.filter(o => o.status === 'pendiente').length,
    en_curso: orders.filter(o => o.status === 'en_curso').length,
    urgentes: orders.filter(o => o.priority === 'urgente' && o.status !== 'completada').length,
  };

  // Planificación (ordenar por fecha programada)
  const scheduled = orders
    .filter(o => o.scheduled_date && o.status !== 'completada' && o.status !== 'cancelada')
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return (
    <>
    <AIChat />
    <PullToRefresh onRefresh={loadAll}>
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="w-6 h-6 text-orange-600" /> Órdenes SAT
        </h1>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { setEditing(null); setForm({ ...EMPTY_FORM, order_number: getNextSATNumber(orders) }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" />Nueva orden
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Total', value: stats.total, icon: BarChart3, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Pendientes', value: stats.pendiente, icon: Clock, color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'En curso', value: stats.en_curso, icon: Wrench, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Urgentes', value: stats.urgentes, icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className={s.bg}>
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className={`w-7 h-7 ${s.color} opacity-70`} />
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Prioridad</SelectItem>
            {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista">Lista ({filtered.length})</TabsTrigger>
          <TabsTrigger value="planificacion">📅 Planificación ({scheduled.length})</TabsTrigger>
        </TabsList>

        {/* ===== LISTA ===== */}
        <TabsContent value="lista" className="space-y-2 pt-2">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No hay órdenes SAT</p>
            </div>
          )}
          {filtered.map(order => (
            <Card key={order.id} className={`hover:shadow-md transition-shadow border-l-4 ${
              order.priority === 'urgente' ? 'border-l-red-500' :
              order.priority === 'alta' ? 'border-l-orange-400' :
              order.status === 'completada' ? 'border-l-green-400' :
              order.status === 'en_curso' ? 'border-l-blue-500' :
              'border-l-gray-200'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Wrench className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">#{order.order_number || 'S/N'} — {order.contact_name}</p>
                      <p className="text-xs text-gray-500">{order.date} | {order.type?.replace(/_/g, ' ')} | {order.equipment_type?.replace(/_/g, ' ')}</p>
                      {order.description && <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{order.description}</p>}
                      {order.technician && <p className="text-xs text-blue-600">👷 {order.technician}</p>}
                      {order.scheduled_date && <p className="text-xs text-purple-600">📅 Programado: {order.scheduled_date} {order.scheduled_time}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                    {order.priority && order.priority !== 'normal' && <Badge className={PRIORITY_COLORS[order.priority]}>{order.priority}</Badge>}
                    {order.total > 0 && <span className="text-xs font-semibold text-gray-700">{order.total?.toFixed(2)} €</span>}
                  </div>
                </div>
                <div className="flex gap-1 mt-2 pt-2 border-t flex-wrap">
                  <button onClick={() => setPreviewOrder(order)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-orange-50 text-orange-700 hover:bg-orange-100">
                    <Eye className="w-3 h-3" />Ver
                  </button>
                  <button onClick={() => handleEdit(order)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                    <Edit className="w-3 h-3" />Editar
                  </button>
                  <button onClick={() => sendWhatsApp(order)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
                    <Phone className="w-3 h-3" />WA
                  </button>
                  <button onClick={() => sendEmail(order)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-purple-50 text-purple-700 hover:bg-purple-100">
                    <Mail className="w-3 h-3" />Email
                  </button>
                  <button onClick={() => handleDelete(order.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
                    <Trash2 className="w-3 h-3" />Eliminar
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ===== PLANIFICACIÓN ===== */}
        <TabsContent value="planificacion" className="pt-2 space-y-3">
          <p className="text-sm text-gray-500">Órdenes con fecha programada, ordenadas cronológicamente.</p>
          {scheduled.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No hay órdenes planificadas</p>
              <p className="text-xs mt-1">Añade fecha programada al crear o editar una orden SAT</p>
            </div>
          )}
          <div className="space-y-2">
            {scheduled.map(order => {
              const daysUntil = differenceInDays(parseISO(order.scheduled_date), new Date());
              return (
                <Card key={order.id} className={`border-l-4 ${
                  order.priority === 'urgente' ? 'border-l-red-500' :
                  daysUntil <= 1 ? 'border-l-orange-400' :
                  'border-l-blue-400'
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">#{order.order_number || 'S/N'}</span>
                          <span className="text-sm text-gray-700">{order.contact_name}</span>
                          <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                          {order.priority && order.priority !== 'normal' && <Badge className={PRIORITY_COLORS[order.priority]}>{order.priority}</Badge>}
                        </div>
                        <p className="text-xs text-purple-700 font-semibold mt-1">
                          📅 {order.scheduled_date} {order.scheduled_time && `a las ${order.scheduled_time}`}
                          {daysUntil === 0 && <span className="ml-2 text-orange-600">— HOY</span>}
                          {daysUntil === 1 && <span className="ml-2 text-orange-500">— Mañana</span>}
                          {daysUntil < 0 && <span className="ml-2 text-red-600">— Vencida ({Math.abs(daysUntil)}d)</span>}
                          {daysUntil > 1 && <span className="ml-2 text-gray-400">— en {daysUntil}d</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{order.type?.replace(/_/g, ' ')} | {order.equipment_type?.replace(/_/g, ' ')}</p>
                        {order.description && <p className="text-xs text-gray-600 line-clamp-1">{order.description}</p>}
                        {order.technician && <p className="text-xs text-blue-600">👷 {order.technician}</p>}
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreviewOrder(order)}><Eye className="w-3 h-3 mr-1" />Ver</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEdit(order)}><Edit className="w-3 h-3 mr-1" />Editar</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-700" onClick={() => sendWhatsApp(order)}><Phone className="w-3 h-3 mr-1" />WA</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOG EDITAR/CREAR ===== */}
      <Dialog open={dialogOpen} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editing ? `Editar Orden SAT #${editing.order_number || editing.id.slice(-6)}` : 'Nueva Orden SAT'}</DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => { setDialogOpen(false); setEditing(null); setForm(EMPTY_FORM); }} className="text-gray-400 hover:text-gray-600">✕</Button>
            </div>
          </DialogHeader>
          <div className="space-y-3">
            {/* Datos básicos */}
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Nº orden" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} />
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>

            <Select value={form.contact_id || ''} onValueChange={v => {
              const c = contacts.find(co => co.id === v);
              setForm({ ...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}`.trim() : '' });
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente *" /></SelectTrigger>
              <SelectContent>
                {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname} {c.company_name && `(${c.company_name})`}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-4 gap-2">
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.equipment_type} onValueChange={v => setForm({ ...form, equipment_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EQUIPMENT.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.priority || 'normal'} onValueChange={v => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Planificación */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <label className="text-xs font-medium text-purple-700 flex items-center gap-1 mb-2">
                <Calendar className="w-3.5 h-3.5" /> Planificación de la orden
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Fecha programada</label>
                  <Input type="date" className="mt-1" value={form.scheduled_date || ''} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Hora programada</label>
                  <Input type="time" className="mt-1" value={form.scheduled_time || ''} onChange={e => setForm({ ...form, scheduled_time: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Técnico */}
            {technicians.length > 0 ? (
              <Select value={form.technician} onValueChange={v => setForm({ ...form, technician: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar técnico" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t, i) => {
                    const name = typeof t === 'object' ? t.name : t;
                    return name ? <SelectItem key={i} value={name}>{name}</SelectItem> : null;
                  })}
                  <SelectItem value="__otro__">Otro (escribir)</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
            {(form.technician === '__otro__' || technicians.length === 0) && (
              <Input placeholder="Nombre del técnico" value={form.technician === '__otro__' ? '' : form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} />
            )}

            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Descripción del problema *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Diagnóstico" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} rows={2} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Solución aplicada" value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} rows={2} />

            {/* Materiales */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">Materiales utilizados</label>
                <Button size="sm" variant="outline" onClick={addMaterial}><Plus className="w-3 h-3 mr-1" />Añadir</Button>
              </div>
              {form.materials_used?.map((m, i) => (
                <div key={i} className="grid grid-cols-4 gap-1 mb-1">
                  <input className="col-span-2 h-7 text-xs border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Material" value={m.material} onChange={e => updateMaterial(i, 'material', e.target.value)} />
                  <input type="number" className="h-7 text-xs border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Cant" value={m.quantity} onChange={e => updateMaterial(i, 'quantity', parseFloat(e.target.value) || 0)} />
                  <div className="flex gap-1">
                    <input type="number" className="h-7 text-xs flex-1 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring" placeholder="€/ud" value={m.unit_price} onChange={e => updateMaterial(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                    <button onClick={() => removeMaterial(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>

            {/* Horas */}
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Horas trabajo" value={form.labor_hours} onChange={e => setForm({ ...form, labor_hours: parseFloat(e.target.value) || 0 })} />
              <Input type="number" placeholder="€/hora" value={form.labor_rate} onChange={e => setForm({ ...form, labor_rate: parseFloat(e.target.value) || 0 })} />
            </div>
            <p className="text-xs text-right text-gray-500">Total estimado: <strong className="text-orange-700">{calcTotal(form).toFixed(2)} €</strong></p>

            <PhotoGallery photos={form.photos_before} onChange={p => setForm({ ...form, photos_before: p })} label="Fotos antes de reparación" maxPhotos={30} />
            <PhotoGallery photos={form.photos_after} onChange={p => setForm({ ...form, photos_after: p })} label="Fotos después de reparación" maxPhotos={30} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Notas internas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />

            {/* Auto-generar factura */}
            {form.contact_id && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <label className="text-xs font-medium text-blue-900">Auto-generar factura</label>
                  <p className="text-[10px] text-blue-700">Si marca, genera factura automáticamente al completar</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenerateInvoice}
                  onChange={e => setAutoGenerateInvoice(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700 gap-2">
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Guardando...</> : <><Save className="w-4 h-4" />{editing ? 'Actualizar orden' : 'Guardar orden'}</>}
              </Button>
              {editing && (
                <Button variant="outline" onClick={() => { setPreviewOrder(editing); setDialogOpen(false); }} className="gap-2">
                  <Eye className="w-4 h-4" />Vista previa
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== PREVIEW / IMPRIMIR ===== */}
      <Dialog open={!!previewOrder} onOpenChange={() => setPreviewOrder(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {previewOrder && (
            <>
              <DialogHeader>
                <DialogTitle>Orden SAT #{previewOrder.order_number || 'S/N'}</DialogTitle>
              </DialogHeader>
              <div ref={printRef} className="space-y-3">
                <CompanyHeader />
                <div className="border-b pb-2 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-orange-700">Orden SAT #{previewOrder.order_number || 'S/N'}</h2>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <Badge className={STATUS_COLORS[previewOrder.status]}>{previewOrder.status}</Badge>
                      {previewOrder.priority && previewOrder.priority !== 'normal' && <Badge className={PRIORITY_COLORS[previewOrder.priority]}>{previewOrder.priority}</Badge>}
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Fecha: {previewOrder.date}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-gray-500 text-xs font-medium">CLIENTE</p><p className="font-semibold">{previewOrder.contact_name}</p></div>
                  <div><p className="text-gray-500 text-xs font-medium">TIPO / EQUIPO</p><p className="capitalize">{previewOrder.type?.replace(/_/g,' ')} / {previewOrder.equipment_type?.replace(/_/g, ' ')}</p></div>
                  {previewOrder.technician && <div><p className="text-gray-500 text-xs font-medium">TÉCNICO</p><p>{previewOrder.technician}</p></div>}
                  {previewOrder.scheduled_date && <div><p className="text-gray-500 text-xs font-medium">FECHA PROGRAMADA</p><p>{previewOrder.scheduled_date} {previewOrder.scheduled_time}</p></div>}
                </div>
                {previewOrder.description && <div className="bg-gray-50 rounded p-3"><p className="text-xs font-medium text-gray-500 uppercase mb-1">Descripción del problema</p><p className="text-sm whitespace-pre-wrap">{previewOrder.description}</p></div>}
                {previewOrder.diagnosis && <div className="bg-blue-50 rounded p-3"><p className="text-xs font-medium text-blue-500 uppercase mb-1">Diagnóstico</p><p className="text-sm whitespace-pre-wrap">{previewOrder.diagnosis}</p></div>}
                {previewOrder.solution && <div className="bg-green-50 rounded p-3"><p className="text-xs font-medium text-green-500 uppercase mb-1">Solución aplicada</p><p className="text-sm whitespace-pre-wrap">{previewOrder.solution}</p></div>}
                {previewOrder.materials_used?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Materiales utilizados</p>
                    <table className="w-full text-xs border-collapse">
                      <thead><tr className="bg-gray-100"><th className="border p-1 text-left">Material</th><th className="border p-1 text-right">Cant.</th><th className="border p-1 text-right">€/ud</th><th className="border p-1 text-right">Total</th></tr></thead>
                      <tbody>{previewOrder.materials_used.map((m, i) => (
                        <tr key={i}><td className="border p-1">{m.material}</td><td className="border p-1 text-right">{m.quantity}</td><td className="border p-1 text-right">{m.unit_price}</td><td className="border p-1 text-right">{((m.quantity || 0) * (m.unit_price || 0)).toFixed(2)}</td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                <div className="border-t pt-2 text-sm flex justify-between items-end">
                  <p>Mano de obra: {previewOrder.labor_hours}h × {previewOrder.labor_rate} €/h = <strong>{((previewOrder.labor_hours || 0) * (previewOrder.labor_rate || 0)).toFixed(2)} €</strong></p>
                  <p className="text-lg font-bold text-orange-700">TOTAL: {previewOrder.total?.toFixed(2)} €</p>
                </div>
                {previewOrder.photos_before?.length > 0 && (
                  <div><p className="text-xs text-gray-500 font-medium mb-1">Fotos antes:</p><div className="flex flex-wrap gap-2">{previewOrder.photos_before.map((p, i) => <img key={i} src={p} alt="" className="w-24 h-24 object-cover rounded border" />)}</div></div>
                )}
                {previewOrder.photos_after?.length > 0 && (
                  <div><p className="text-xs text-gray-500 font-medium mb-1">Fotos después:</p><div className="flex flex-wrap gap-2">{previewOrder.photos_after.map((p, i) => <img key={i} src={p} alt="" className="w-24 h-24 object-cover rounded border" />)}</div></div>
                )}
                {previewOrder.notes && <div className="bg-amber-50 rounded p-3 text-sm"><p className="text-xs font-medium text-amber-600 mb-1">Notas</p>{previewOrder.notes}</div>}

                {/* Firma / conformidad */}
                <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t">
                  <div className="text-center">
                    <div className="border-b border-gray-400 h-16 mb-1"></div>
                    <p className="text-xs text-gray-500">Firma del Técnico</p>
                    {previewOrder.technician && <p className="text-xs font-medium">{previewOrder.technician}</p>}
                  </div>
                  <div className="text-center">
                    <div className="border-b border-gray-400 h-16 mb-1"></div>
                    <p className="text-xs text-gray-500">Conformidad del Cliente</p>
                    <p className="text-xs font-medium">{previewOrder.contact_name}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap no-print">
                <PrintButton contentRef={printRef} title={`SAT_${previewOrder.order_number || 'orden'}`} />
                <Button variant="outline" size="sm" onClick={() => { handleEdit(previewOrder); setPreviewOrder(null); }}>
                  <Edit className="w-4 h-4 mr-1" />Editar
                </Button>
                <Button variant="outline" size="sm" className="text-green-700" onClick={() => sendWhatsApp(previewOrder)}>
                  <Phone className="w-4 h-4 mr-1" />WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="text-purple-700" onClick={() => sendEmail(previewOrder)}>
                  <Mail className="w-4 h-4 mr-1" />Email
                </Button>
                {previewOrder.contact_id && (
                  <Link to={createPageUrl(`Documents?contact_id=${previewOrder.contact_id}&from_sat=${previewOrder.id}&type=factura`)}>
                    <Button variant="outline" size="sm" className="text-violet-700 border-violet-300">
                      <FileText className="w-4 h-4 mr-1" />Generar Factura
                    </Button>
                  </Link>
                )}
                {previewOrder.contact_id && (
                  <Link to={createPageUrl(`ContactDetail?id=${previewOrder.contact_id}`)}>
                    <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
                      <Link2 className="w-4 h-4 mr-1" />Ver Cliente
                    </Button>
                  </Link>
                )}
                </div>
                </>
                )}
                </DialogContent>
                </Dialog>
                </div>
                </PullToRefresh>
                </>
                );
                }