import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Search, FileText, Trash2, Edit, Eye, ShoppingCart, Copy,
  ChevronDown, ChevronUp, Save, Phone, Mail, BarChart3, TrendingUp,
  Euro, AlertCircle, CheckCircle, Clock, Filter, Download, Printer
} from 'lucide-react';
import SupplierProductSearch from '../components/SupplierProductSearch';
import { format, startOfMonth } from 'date-fns';
import { getNextAvailableNumber } from '../components/autoNumber';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

const DOC_TYPES = ['factura', 'presupuesto', 'recibo'];
const STATUSES = ['borrador', 'enviado', 'pagado', 'vencido', 'cancelado'];
const WORK_TYPES = ['electrico', 'clima', 'refrigeracion_industrial', 'solar', 'otro'];

const STATUS_COLORS = {
  borrador: 'bg-gray-100 text-gray-600',
  enviado: 'bg-blue-100 text-blue-700',
  pagado: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-orange-100 text-orange-700',
};

const STATUS_ICONS = {
  borrador: Clock,
  enviado: FileText,
  pagado: CheckCircle,
  vencido: AlertCircle,
  cancelado: AlertCircle,
};

const NORMATIVE_MAP = {
  electrico: 'REBT (Reglamento Electrotécnico de Baja Tensión), RD 842/2002',
  clima: 'RITE (Reglamento de Instalaciones Térmicas en los Edificios), RD 1027/2007. F-Gas RD 115/2017',
  refrigeracion_industrial: 'Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017',
  solar: 'CTE DB HE, RD 244/2019 Autoconsumo, REBT',
  otro: ''
};

const PAYMENT_TERMS = "Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)";

let _itemId = 0;
const newItem = () => ({ _id: ++_itemId, description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 });

const EMPTY_FORM = {
  doc_type: 'presupuesto', doc_number: '', contact_id: '', contact_name: '', contact_nif: '', contact_address: '',
  date: format(new Date(), 'yyyy-MM-dd'), due_date: '', status: 'borrador', work_type: 'otro',
  items: [newItem()],
  subtotal: 0, iva_rate: 21, iva_amount: 0, total: 0, observations: '', payment_terms: PAYMENT_TERMS, normative_references: ''
};

function recalculate(items, iva_rate) {
  const updatedItems = items.map(item => ({
    ...item,
    total: (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100)
  }));
  const subtotal = updatedItems.reduce((sum, i) => sum + i.total, 0);
  const iva_amount = subtotal * (iva_rate / 100);
  return { items: updatedItems, subtotal, iva_amount, total: subtotal + iva_amount };
}

export default function Documents() {
  const urlParams = new URLSearchParams(window.location.search);
  const preContactId = urlParams.get('contact_id');
  const preType = urlParams.get('type');

  const [docs, setDocs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(preType || 'all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkType, setFilterWorkType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, doc_type: preType || 'presupuesto', contact_id: preContactId || '' });
  const [activeTab, setActiveTab] = useState('all'); // all | facturas | presupuestos
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list('-date', 500),
      base44.entities.Contact.list('name', 500),
      base44.entities.DocumentTemplate.list('name', 50),
    ]).then(([d, c, t]) => {
      setDocs(d);
      setContacts(c);
      setTemplates(t);
      if (preContactId && preType) {
        const contact = c.find(co => co.id === preContactId);
        if (contact) {
          const tpl = t.find(tp => tp.doc_type === preType && tp.is_default);
          openNew(preType, contact, tpl);
        }
      }
    });
  }, []);

  const openNew = (docType = 'presupuesto', contact = null, tpl = null) => {
    const baseForm = { ...EMPTY_FORM, doc_type: docType };
    if (tpl) { baseForm.iva_rate = tpl.iva_rate || 21; baseForm.observations = tpl.notes_template || ''; }
    if (contact) {
      baseForm.contact_id = contact.id;
      baseForm.contact_name = `${contact.name} ${contact.surname || ''}`.trim();
      baseForm.contact_nif = contact.nif || '';
      baseForm.contact_address = `${contact.address || ''}, ${contact.city || ''} ${contact.postal_code || ''} ${contact.province || ''}`.trim();
    }
    // Auto-numerar: coger todos los doc_number del mismo tipo
    const sametype = docs.filter(d => d.doc_type === docType).map(d => d.doc_number || '');
    baseForm.doc_number = getNextAvailableNumber(sametype);
    setEditing(null); setForm(baseForm); setDialogOpen(true); setShowAdvanced(false);
  };

  const handleItemChange = useCallback((index, field, value) => {
    setForm(prev => {
      const newItems = prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const addItem = useCallback(() => {
    setForm(prev => ({ ...prev, items: [...prev.items, newItem()] }));
  }, []);

  const removeItem = useCallback((i) => {
    setForm(prev => {
      const newItems = prev.items.filter((_, idx) => idx !== i);
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const addItemFromSupplier = useCallback((item) => {
    setForm(prev => {
      const newItems = [...prev.items, item];
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const handleContactSelect = useCallback((contactId) => {
    setForm(prev => {
      const c = contacts.find(co => co.id === contactId);
      if (!c) return prev;
      return {
        ...prev, contact_id: contactId,
        contact_name: `${c.name} ${c.surname || ''}`.trim(),
        contact_nif: c.nif || '',
        contact_address: `${c.address || ''}, ${c.city || ''} ${c.postal_code || ''}`.trim()
      };
    });
  }, [contacts]);

  const handleIvaChange = useCallback((val) => {
    setForm(prev => {
      const iva_rate = parseFloat(val) || 0;
      return { ...prev, iva_rate, ...recalculate(prev.items, iva_rate) };
    });
  }, []);

  const handleWorkTypeChange = useCallback((wt) => {
    setForm(prev => ({ ...prev, work_type: wt, normative_references: NORMATIVE_MAP[wt] || '' }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const docLabel = form.doc_type === 'factura' ? 'Factura' : form.doc_type === 'presupuesto' ? 'Presupuesto' : 'Recibo';
    if (editing) {
      await base44.entities.Invoice.update(editing.id, form);
    } else {
      await base44.entities.Invoice.create(form);
      if (form.contact_id) {
        await base44.entities.ClientDocument.create({
          contact_id: form.contact_id, contact_name: form.contact_name,
          title: `${docLabel} ${form.doc_number || ''}`,
          doc_type: form.doc_type, date: form.date,
          description: `Total: ${form.total?.toFixed(2)} € | Estado: ${form.status}`,
        });
      }
    }
    setSaving(false);
    setDialogOpen(false); setEditing(null);
    const d = await base44.entities.Invoice.list('-date', 500);
    setDocs(d);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este documento?')) return;
    await base44.entities.Invoice.delete(id);
    setDocs(docs.filter(d => d.id !== id));
  };

  const handleDuplicate = async (doc) => {
    const { id, created_date, updated_date, ...rest } = doc;
    await base44.entities.Invoice.create({ ...rest, doc_number: `${rest.doc_number}-COPIA`, status: 'borrador', date: format(new Date(), 'yyyy-MM-dd') });
    const d = await base44.entities.Invoice.list('-date', 500);
    setDocs(d);
  };

  const handleEdit = (doc) => {
    setEditing(doc);
    const items = (doc.items?.length ? doc.items : [newItem()]).map((it, idx) => ({ _id: idx, ...it }));
    setForm({ ...EMPTY_FORM, ...doc, items });
    setDialogOpen(true);
  };

  const handleStatusChange = async (doc, newStatus) => {
    await base44.entities.Invoice.update(doc.id, { status: newStatus });
    setDocs(docs.map(d => d.id === doc.id ? { ...d, status: newStatus } : d));
  };

  const sendWhatsApp = (doc) => {
    const c = contacts.find(x => x.id === doc.contact_id);
    const phone = c?.phone?.replace(/[^0-9]/g, '') || '';
    const msg = encodeURIComponent(`*${doc.doc_type?.toUpperCase()} Nº${doc.doc_number}*\nCliente: ${doc.contact_name}\nFecha: ${doc.date}\nTotal: ${doc.total?.toFixed(2)} €\nEstado: ${doc.status}`);
    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const sendEmail = (doc) => {
    const c = contacts.find(x => x.id === doc.contact_id);
    const email = c?.email || '';
    const subject = encodeURIComponent(`${doc.doc_type?.toUpperCase()} Nº${doc.doc_number}`);
    const body = encodeURIComponent(`Estimado/a ${doc.contact_name},\n\nAdjunto ${doc.doc_type} Nº${doc.doc_number} de fecha ${doc.date}.\nTotal: ${doc.total?.toFixed(2)} €\n\nQuedamos a su disposición.`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Filtrado
  let filtered = docs.filter(d => {
    const matchSearch = `${d.doc_number} ${d.contact_name} ${d.work_type}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.doc_type === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchWork = filterWorkType === 'all' || d.work_type === filterWorkType;
    return matchSearch && matchType && matchStatus && matchWork;
  });

  // KPIs
  const facturas = docs.filter(d => d.doc_type === 'factura');
  const presupuestos = docs.filter(d => d.doc_type === 'presupuesto');
  const totalFacturado = facturas.reduce((s, d) => s + (d.total || 0), 0);
  const pendienteCobro = facturas.filter(d => ['enviado', 'vencido'].includes(d.status)).reduce((s, d) => s + (d.total || 0), 0);
  const cobradoMes = facturas.filter(d => d.status === 'pagado' && d.date >= format(startOfMonth(new Date()), 'yyyy-MM-dd')).reduce((s, d) => s + (d.total || 0), 0);
  const vencidas = facturas.filter(d => d.status === 'vencido').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-violet-500" />Documentos
        </h1>
        <div className="flex gap-2">
          <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={() => openNew('presupuesto', null, templates.find(t => t.doc_type === 'presupuesto' && t.is_default))}>
            <Plus className="w-4 h-4 mr-1" />Presupuesto
          </Button>
          <Button className="bg-violet-600 hover:bg-violet-700" size="sm" onClick={() => openNew('factura', null, templates.find(t => t.doc_type === 'factura' && t.is_default))}>
            <Plus className="w-4 h-4 mr-1" />Factura
          </Button>
          <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => openNew('recibo')}>
            <Plus className="w-4 h-4 mr-1" />Recibo
          </Button>
        </div>
      </div>

      {/* KPIs financieros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-violet-400">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500 mb-0.5">Total facturado</p>
            <p className="text-xl font-bold text-violet-700">{totalFacturado.toFixed(0)} €</p>
            <p className="text-[10px] text-gray-400">{facturas.length} facturas</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-green-400">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500 mb-0.5">Cobrado este mes</p>
            <p className="text-xl font-bold text-green-700">{cobradoMes.toFixed(0)} €</p>
            <p className="text-[10px] text-gray-400">Facturas pagadas</p>
          </CardContent>
        </Card>
        <Card className={`border-l-4 ${pendienteCobro > 0 ? 'border-orange-400' : 'border-gray-300'}`}>
          <CardContent className="p-3">
            <p className="text-xs text-gray-500 mb-0.5">Pendiente cobro</p>
            <p className={`text-xl font-bold ${pendienteCobro > 0 ? 'text-orange-700' : 'text-gray-400'}`}>{pendienteCobro.toFixed(0)} €</p>
            {vencidas > 0 && <p className="text-[10px] text-red-500 font-medium">{vencidas} vencidas</p>}
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-400">
          <CardContent className="p-3">
            <p className="text-xs text-gray-500 mb-0.5">Presupuestos</p>
            <p className="text-xl font-bold text-blue-700">{presupuestos.length}</p>
            <p className="text-[10px] text-gray-400">{presupuestos.filter(d => d.status === 'enviado').length} enviados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-36">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar nº, cliente, tipo trabajo..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo doc." /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterWorkType} onValueChange={setFilterWorkType}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Trabajo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos trabajos</SelectItem>
            {WORK_TYPES.map(w => <SelectItem key={w} value={w}>{w.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} documento{filtered.length !== 1 ? 's' : ''} · Total: <strong>{filtered.reduce((s,d)=>s+(d.total||0),0).toFixed(2)} €</strong></p>

      {/* ===== DIALOG CREAR/EDITAR ===== */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditing(null); setShowAdvanced(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.doc_type} ${editing.doc_number}` : 'Nuevo documento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.doc_type} onValueChange={v => setForm(p => ({ ...p, doc_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Nº documento" value={form.doc_number}
                onChange={e => { const v = e.target.value; setForm(p => ({ ...p, doc_number: v })); }} />
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <Select value={form.contact_id || ''} onValueChange={handleContactSelect}>
              <SelectTrigger><SelectValue placeholder="Seleccionar cliente (opcional)" /></SelectTrigger>
              <SelectContent>
                {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Si no hay cliente seleccionado, permitir introducir datos manualmente */}
            {!form.contact_id && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Nombre cliente (libre)" value={form.contact_name}
                  onChange={e => setForm(p => ({...p, contact_name: e.target.value}))} />
                <Input placeholder="NIF / CIF" value={form.contact_nif}
                  onChange={e => setForm(p => ({...p, contact_nif: e.target.value}))} />
              </div>
            )}

            {form.contact_name && (
              <div className="bg-blue-50 border border-blue-100 p-2 rounded text-xs text-gray-600">
                <strong>{form.contact_name}</strong>{form.contact_nif ? ` · NIF: ${form.contact_nif}` : ''}
                {form.contact_address && <><br />{form.contact_address}</>}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Fecha</label>
                <Input type="date" value={form.date} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, date: v })); }} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Vencimiento</label>
                <Input type="date" value={form.due_date || ''} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, due_date: v })); }} />
              </div>
              <div>
                <label className="text-xs text-gray-500">IVA (%)</label>
                <Select value={String(form.iva_rate)} onValueChange={handleIvaChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exento)</SelectItem>
                    <SelectItem value="4">4% (Super reducido)</SelectItem>
                    <SelectItem value="10">10% (Reducido)</SelectItem>
                    <SelectItem value="21">21% (General)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Select value={form.work_type} onValueChange={handleWorkTypeChange}>
              <SelectTrigger><SelectValue placeholder="Tipo de trabajo" /></SelectTrigger>
              <SelectContent>{WORK_TYPES.map(w => <SelectItem key={w} value={w}>{w.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>

            {/* Líneas */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Líneas del documento</label>
              <div className="hidden md:grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-1">
                <span className="col-span-5">Descripción</span>
                <span className="col-span-2">Cant.</span>
                <span className="col-span-2">€/ud</span>
                <span className="col-span-1">Dto%</span>
                <span className="col-span-1 text-right">Total</span>
                <span className="col-span-1"></span>
              </div>
              {form.items.map((item, i) => (
                 <div key={item._id ?? i} className="grid grid-cols-12 gap-1 items-center">
                   <input
                     className="col-span-5 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring"
                     placeholder="Descripción"
                     value={item.description}
                     onChange={e => handleItemChange(i, 'description', e.target.value)}
                   />
                   <input className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring" type="number" placeholder="Cant." value={item.quantity} onChange={e => handleItemChange(i, 'quantity', parseFloat(e.target.value) || 0)} />
                   <input className="col-span-2 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring" type="number" placeholder="Precio" value={item.unit_price} onChange={e => handleItemChange(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                   <input className="col-span-1 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring" type="number" placeholder="Dto" value={item.discount || 0} onChange={e => handleItemChange(i, 'discount', parseFloat(e.target.value) || 0)} />
                   <span className="col-span-1 text-xs text-right font-medium text-green-700">{item.total?.toFixed(2)}</span>
                   <button className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none text-center" onClick={() => removeItem(i)}>×</button>
                 </div>
               ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Línea</Button>
                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setSupplierSearchOpen(true)}>
                  <ShoppingCart className="w-3 h-3 mr-1" />Buscar en distribuidor
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>{form.subtotal?.toFixed(2)} €</span></div>
              <div className="flex justify-between text-gray-600"><span>IVA ({form.iva_rate}%):</span><span>{form.iva_amount?.toFixed(2)} €</span></div>
              <div className="flex justify-between font-bold text-lg text-blue-800"><span>TOTAL:</span><span>{form.total?.toFixed(2)} €</span></div>
            </div>

            <button className="text-xs text-gray-500 flex items-center gap-1" onClick={() => setShowAdvanced(v => !v)}>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Observaciones y condiciones de pago
            </button>
            {showAdvanced && (
              <div className="space-y-2">
                <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Observaciones" value={form.observations || ''} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, observations: v })); }} rows={3} />
                <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Condiciones de pago" value={form.payment_terms || ''} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, payment_terms: v })); }} rows={4} />
                {form.normative_references && (
                  <div className="bg-blue-50 p-3 rounded-lg text-xs">
                    <p className="font-medium text-blue-700 mb-1">Normativa aplicable:</p>
                    <textarea className="w-full border border-input rounded-md px-3 py-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring" value={form.normative_references || ''} onChange={e => { const v = e.target.value; setForm(p => ({ ...p, normative_references: v })); }} rows={2} />
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : editing ? 'Actualizar documento' : 'Guardar documento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SupplierProductSearch open={supplierSearchOpen} onClose={() => setSupplierSearchOpen(false)} onAddItem={addItemFromSupplier} />

      {/* ===== PREVIEW ===== */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">{previewDoc?.doc_type} {previewDoc?.doc_number}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <>
              <div ref={printRef} className="bg-white">
                <CompanyHeader className="mb-4 pb-4 border-b" />
                <div className="space-y-4 p-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold uppercase tracking-wide">{previewDoc.doc_type}</h2>
                      <p className="text-sm text-gray-500">Nº: {previewDoc.doc_number}</p>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>Fecha: <strong>{previewDoc.date}</strong></p>
                      {previewDoc.due_date && <p>Vencimiento: {previewDoc.due_date}</p>}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm border-l-4 border-blue-500">
                    <p className="font-bold">{previewDoc.contact_name || 'Sin cliente'}</p>
                    {previewDoc.contact_nif && <p className="text-gray-500">NIF: {previewDoc.contact_nif}</p>}
                    {previewDoc.contact_address && <p className="text-gray-500">{previewDoc.contact_address}</p>}
                  </div>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-800 text-white">
                        <th className="text-left p-2">Descripción</th>
                        <th className="p-2 text-center">Cant.</th>
                        <th className="p-2 text-right">P.Unit.</th>
                        {previewDoc.items?.some(i => i.discount > 0) && <th className="p-2 text-right">Dto%</th>}
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewDoc.items?.map((item, i) => (
                        <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">{item.unit_price?.toFixed(2)} €</td>
                          {previewDoc.items?.some(i => i.discount > 0) && <td className="p-2 text-right text-orange-600">{item.discount > 0 ? `${item.discount}%` : '-'}</td>}
                          <td className="p-2 text-right font-medium">{item.total?.toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-right space-y-1 text-sm border-t pt-3">
                    <p className="text-gray-600">Subtotal: <strong>{previewDoc.subtotal?.toFixed(2)} €</strong></p>
                    <p className="text-gray-600">IVA ({previewDoc.iva_rate}%): <strong>{previewDoc.iva_amount?.toFixed(2)} €</strong></p>
                    <p className="font-bold text-xl text-gray-900">TOTAL: {previewDoc.total?.toFixed(2)} €</p>
                  </div>
                  {previewDoc.observations && <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 whitespace-pre-wrap"><strong>Observaciones:</strong> {previewDoc.observations}</div>}
                  {previewDoc.payment_terms && <p className="text-xs text-gray-500 whitespace-pre-wrap border-t pt-2">{previewDoc.payment_terms}</p>}
                  {previewDoc.normative_references && <p className="text-xs text-blue-600 border-t pt-2">Normativa: {previewDoc.normative_references}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t flex-wrap no-print">
                <PrintButton contentRef={printRef} title={`${previewDoc?.doc_type}_${previewDoc?.doc_number}`} />
                <Button variant="outline" size="sm" onClick={() => { setPreviewDoc(null); handleEdit(previewDoc); }}>
                  <Edit className="w-4 h-4 mr-1" />Editar
                </Button>
                <Button variant="outline" size="sm" className="text-green-700" onClick={() => sendWhatsApp(previewDoc)}>
                  <Phone className="w-4 h-4 mr-1" />WhatsApp
                </Button>
                <Button variant="outline" size="sm" className="text-blue-700" onClick={() => sendEmail(previewDoc)}>
                  <Mail className="w-4 h-4 mr-1" />Email
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setPreviewDoc(null); handleDuplicate(previewDoc); }}>
                  <Copy className="w-4 h-4 mr-1" />Duplicar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== LISTA ===== */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No hay documentos</p>
          </div>
        )}
        {filtered.map(doc => {
          const StatusIcon = STATUS_ICONS[doc.status] || FileText;
          return (
            <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setPreviewDoc(doc)}>
              <CardContent className="p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`p-2 rounded-lg flex-shrink-0 ${doc.doc_type === 'factura' ? 'bg-violet-100' : doc.doc_type === 'presupuesto' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <FileText className={`w-4 h-4 ${doc.doc_type === 'factura' ? 'text-violet-600' : doc.doc_type === 'presupuesto' ? 'text-blue-600' : 'text-green-600'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm capitalize truncate">{doc.doc_type} {doc.doc_number}</p>
                    <p className="text-xs text-gray-500 truncate">{doc.contact_name || 'Sin cliente'} · {doc.date} {doc.work_type && doc.work_type !== 'otro' ? `· ${doc.work_type}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <span className="font-bold text-sm">{doc.total?.toFixed(2)} €</span>
                  <Select value={doc.status} onValueChange={v => handleStatusChange(doc, v)}>
                    <SelectTrigger className={`h-6 text-[10px] w-24 border-0 ${STATUS_COLORS[doc.status] || ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <button onClick={() => handleDuplicate(doc)} className="text-gray-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity" title="Duplicar"><Copy className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(doc.id)} className="text-red-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}