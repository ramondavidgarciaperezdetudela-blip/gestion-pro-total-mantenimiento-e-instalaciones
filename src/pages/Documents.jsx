import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, Trash2, Edit, Eye, ShoppingCart, Copy, Printer, ChevronDown, ChevronUp } from 'lucide-react';
import SupplierProductSearch from '../components/SupplierProductSearch';
import { format } from 'date-fns';
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

const NORMATIVE_MAP = {
  electrico: 'REBT (Reglamento Electrotécnico de Baja Tensión), RD 842/2002',
  clima: 'RITE (Reglamento de Instalaciones Térmicas en los Edificios), RD 1027/2007. F-Gas RD 115/2017',
  refrigeracion_industrial: 'Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017',
  solar: 'CTE DB HE, RD 244/2019 Autoconsumo, REBT',
  otro: ''
};

const PAYMENT_TERMS = "Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)";

const EMPTY_FORM = {
  doc_type: 'presupuesto', doc_number: '', contact_id: '', contact_name: '', contact_nif: '', contact_address: '',
  date: format(new Date(), 'yyyy-MM-dd'), due_date: '', status: 'borrador', work_type: 'otro',
  items: [{ description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }],
  subtotal: 0, iva_rate: 21, iva_amount: 0, total: 0, observations: '', payment_terms: PAYMENT_TERMS, normative_references: ''
};

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM, doc_type: preType || 'presupuesto', contact_id: preContactId || '' });
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list('-date', 500),
      base44.entities.Contact.list(),
      base44.entities.DocumentTemplate.list('name', 50),
    ]).then(([d, c, t]) => {
      setDocs(d);
      setContacts(c);
      setTemplates(t);
      // Auto-open form if came from contact detail
      if (preContactId && preType) {
        const contact = c.find(co => co.id === preContactId);
        if (contact) {
          const defaultTpl = t.find(tp => tp.doc_type === preType && tp.is_default);
          openNew(preType, contact, defaultTpl);
        }
      }
    });
  }, []);

  const openNew = (docType = 'presupuesto', contact = null, tpl = null) => {
    const baseForm = { ...EMPTY_FORM, doc_type: docType };
    if (tpl) {
      baseForm.iva_rate = tpl.iva_rate || 21;
      baseForm.observations = tpl.notes_template || '';
      baseForm.payment_terms = PAYMENT_TERMS;
    }
    if (contact) {
      baseForm.contact_id = contact.id;
      baseForm.contact_name = `${contact.name} ${contact.surname || ''}`.trim();
      baseForm.contact_nif = contact.nif || '';
      baseForm.contact_address = `${contact.address || ''}, ${contact.city || ''} ${contact.postal_code || ''} ${contact.province || ''}`.trim();
    }
    setEditing(null);
    setForm(baseForm);
    setDialogOpen(true);
  };

  const recalculate = (items, iva_rate) => {
    const updatedItems = items.map(item => ({
      ...item,
      total: (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100)
    }));
    const subtotal = updatedItems.reduce((sum, i) => sum + i.total, 0);
    const iva_amount = subtotal * (iva_rate / 100);
    return { items: updatedItems, subtotal, iva_amount, total: subtotal + iva_amount };
  };

  const updateItem = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    const calc = recalculate(newItems, form.iva_rate);
    setForm({ ...form, ...calc });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }] });

  const addItemFromSupplier = (item) => {
    const newItems = [...form.items, item];
    const calc = recalculate(newItems, form.iva_rate);
    setForm({ ...form, ...calc });
  };

  const removeItem = (i) => {
    const newItems = form.items.filter((_, idx) => idx !== i);
    const calc = recalculate(newItems, form.iva_rate);
    setForm({ ...form, ...calc });
  };

  const handleContactSelect = (contactId) => {
    const c = contacts.find(co => co.id === contactId);
    if (c) setForm({ ...form, contact_id: contactId, contact_name: `${c.name} ${c.surname || ''}`.trim(), contact_nif: c.nif || '', contact_address: `${c.address || ''}, ${c.city || ''} ${c.postal_code || ''}`.trim() });
  };

  const handleWorkTypeChange = (wt) => setForm({ ...form, work_type: wt, normative_references: NORMATIVE_MAP[wt] || '' });

  const handleIvaChange = (val) => {
    const iva_rate = parseFloat(val) || 0;
    const calc = recalculate(form.items, iva_rate);
    setForm({ ...form, iva_rate, ...calc });
  };

  const handleSave = async () => {
    if (editing) {
      await base44.entities.Invoice.update(editing.id, form);
    } else {
      await base44.entities.Invoice.create(form);
    }
    setDialogOpen(false);
    setEditing(null);
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
    const newDoc = { ...rest, doc_number: `${rest.doc_number}-COPIA`, status: 'borrador', date: format(new Date(), 'yyyy-MM-dd') };
    await base44.entities.Invoice.create(newDoc);
    const d = await base44.entities.Invoice.list('-date', 500);
    setDocs(d);
  };

  const handleEdit = (doc) => {
    setEditing(doc);
    setForm({ ...EMPTY_FORM, ...doc });
    setDialogOpen(true);
  };

  const handleStatusChange = async (doc, newStatus) => {
    await base44.entities.Invoice.update(doc.id, { status: newStatus });
    setDocs(docs.map(d => d.id === doc.id ? { ...d, status: newStatus } : d));
  };

  const filtered = docs.filter(d => {
    const matchSearch = `${d.doc_number} ${d.contact_name}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.doc_type === filterType;
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  // Resumen financiero
  const totals = { facturas: docs.filter(d => d.doc_type === 'factura').reduce((s, d) => s + (d.total || 0), 0), pendiente: docs.filter(d => d.doc_type === 'factura' && ['enviado', 'vencido'].includes(d.status)).reduce((s, d) => s + (d.total || 0), 0) };

  const DocForm = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Select value={form.doc_type} onValueChange={v => setForm({ ...form, doc_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Nº documento" value={form.doc_number} onChange={e => setForm({ ...form, doc_number: e.target.value })} />
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Select value={form.contact_id} onValueChange={handleContactSelect}>
        <SelectTrigger><SelectValue placeholder="Seleccionar cliente *" /></SelectTrigger>
        <SelectContent>
          {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>)}
        </SelectContent>
      </Select>

      {form.contact_name && (
        <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
          <strong>{form.contact_name}</strong>{form.contact_nif ? ` · NIF: ${form.contact_nif}` : ''}<br />
          {form.contact_address}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div><label className="text-xs text-gray-500">Fecha</label><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div>
        <div><label className="text-xs text-gray-500">Vencimiento</label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
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

      {/* Items */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Líneas del documento</label>
        <div className="hidden md:grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-1">
          <span className="col-span-5">Descripción</span>
          <span className="col-span-2">Cant.</span>
          <span className="col-span-2">€/u</span>
          <span className="col-span-1">Dto%</span>
          <span className="col-span-1 text-right">Total</span>
        </div>
        {form.items.map((item, i) => (
          <div key={i} className="grid grid-cols-12 gap-1 items-center">
            <Input className="col-span-5 text-xs" placeholder="Descripción" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
            <Input className="col-span-2 text-xs" type="number" placeholder="Cant." value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
            <Input className="col-span-2 text-xs" type="number" placeholder="Precio" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
            <Input className="col-span-1 text-xs" type="number" placeholder="Dto" value={item.discount || 0} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} />
            <span className="col-span-1 text-xs text-right font-medium text-green-700">{item.total?.toFixed(2)}</span>
            <button className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none" onClick={() => removeItem(i)}>×</button>
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

      {/* Advanced section toggle */}
      <button className="text-xs text-gray-500 flex items-center gap-1" onClick={() => setShowAdvanced(!showAdvanced)}>
        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Observaciones y condiciones de pago
      </button>
      {showAdvanced && (
        <div className="space-y-2">
          <Textarea placeholder="Observaciones" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} rows={2} />
          <Textarea placeholder="Condiciones de pago" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} rows={3} />
          {form.normative_references && (
            <div className="bg-blue-50 p-3 rounded-lg text-xs">
              <p className="font-medium text-blue-700 mb-1">Normativa aplicable:</p>
              <p className="text-blue-600">{form.normative_references}</p>
            </div>
          )}
        </div>
      )}

      <Button onClick={handleSave} className="w-full bg-blue-600">{editing ? 'Actualizar documento' : 'Crear documento'}</Button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header + stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <div className="flex gap-2">
          <Button className="bg-blue-600" onClick={() => openNew('presupuesto', null, templates.find(t => t.doc_type === 'presupuesto' && t.is_default))}>
            <Plus className="w-4 h-4 mr-1" />Presupuesto
          </Button>
          <Button className="bg-violet-600" onClick={() => openNew('factura', null, templates.find(t => t.doc_type === 'factura' && t.is_default))}>
            <Plus className="w-4 h-4 mr-1" />Factura
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-violet-50 border-violet-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-violet-500">Facturado</p>
            <p className="font-bold text-violet-700">{totals.facturas.toFixed(0)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-orange-500">Pendiente cobro</p>
            <p className="font-bold text-orange-700">{totals.pendiente.toFixed(0)} €</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-blue-500">Total documentos</p>
            <p className="font-bold text-blue-700">{docs.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos estados</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditing(null); setShowAdvanced(false); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar documento' : 'Nuevo documento'}</DialogTitle></DialogHeader>
          <DocForm />
        </DialogContent>
      </Dialog>

      <SupplierProductSearch open={supplierSearchOpen} onClose={() => setSupplierSearchOpen(false)} onAddItem={addItemFromSupplier} />

      {/* Preview dialog */}
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
                    <p className="font-bold">{previewDoc.contact_name}</p>
                    {previewDoc.contact_nif && <p className="text-gray-500">NIF: {previewDoc.contact_nif}</p>}
                    <p className="text-gray-500">{previewDoc.contact_address}</p>
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
              <div className="flex gap-2 justify-end mt-3 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => { setPreviewDoc(null); handleEdit(previewDoc); }}>
                  <Edit className="w-4 h-4 mr-1" />Editar
                </Button>
                <PrintButton contentRef={printRef} title={`${previewDoc?.doc_type} ${previewDoc?.doc_number}`} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Document list */}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No hay documentos</p>}
        {filtered.map(doc => (
          <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPreviewDoc(doc)}>
            <CardContent className="p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg flex-shrink-0 ${doc.doc_type === 'factura' ? 'bg-violet-100' : doc.doc_type === 'presupuesto' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  <FileText className={`w-4 h-4 ${doc.doc_type === 'factura' ? 'text-violet-600' : doc.doc_type === 'presupuesto' ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm capitalize truncate">{doc.doc_type} {doc.doc_number}</p>
                  <p className="text-xs text-gray-500 truncate">{doc.contact_name} · {doc.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-bold text-sm">{doc.total?.toFixed(2)} €</span>
                <Select value={doc.status} onValueChange={v => { handleStatusChange(doc, v); }} onClick={e => e.stopPropagation()}>
                  <SelectTrigger className={`h-6 text-[10px] w-24 border-0 ${STATUS_COLORS[doc.status] || ''}`} onClick={e => e.stopPropagation()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <button onClick={e => { e.stopPropagation(); handleDuplicate(doc); }} className="text-gray-400 hover:text-blue-600 p-1" title="Duplicar">
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(doc.id); }} className="text-red-300 hover:text-red-500 p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}