import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, FileText, Trash2, Edit, Eye, ShoppingCart } from 'lucide-react';
import SupplierProductSearch from '../components/SupplierProductSearch';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

const DOC_TYPES = ['factura', 'presupuesto', 'recibo'];
const STATUSES = ['borrador', 'enviado', 'pagado', 'vencido', 'cancelado'];
const WORK_TYPES = ['electrico', 'clima', 'refrigeracion_industrial', 'solar', 'otro'];

const NORMATIVE_MAP = {
  electrico: 'REBT (Reglamento Electrotécnico de Baja Tensión), RD 842/2002',
  clima: 'RITE (Reglamento de Instalaciones Térmicas en los Edificios), RD 1027/2007. F-Gas RD 115/2017',
  refrigeracion_industrial: 'Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017, Reglamento de comprobación de fugas de gases fluorados',
  solar: 'CTE DB HE, RD 244/2019 Autoconsumo, REBT',
  otro: ''
};

const PAYMENT_TERMS = "Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)";

export default function Documents() {
  const urlParams = new URLSearchParams(window.location.search);
  const preContactId = urlParams.get('contact_id');

  const [docs, setDocs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [supplierSearchOpen, setSupplierSearchOpen] = useState(false);
  const [form, setForm] = useState({
    doc_type: 'factura', doc_number: '', contact_id: preContactId || '', contact_name: '', contact_nif: '', contact_address: '',
    date: format(new Date(), 'yyyy-MM-dd'), due_date: '', status: 'borrador', work_type: 'otro',
    items: [{ description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 }],
    subtotal: 0, iva_rate: 21, iva_amount: 0, total: 0, observations: '', payment_terms: PAYMENT_TERMS, normative_references: ''
  });
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Invoice.list('-date', 500),
      base44.entities.Contact.list()
    ]).then(([d, c]) => { setDocs(d); setContacts(c); });
  }, []);

  const recalculate = (items, iva_rate) => {
    const updatedItems = items.map(item => ({ ...item, total: (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100) }));
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
    if (c) setForm({ ...form, contact_id: contactId, contact_name: `${c.name} ${c.surname || ''}`, contact_nif: c.nif || '', contact_address: `${c.address || ''}, ${c.city || ''} ${c.postal_code || ''} ${c.province || ''}` });
  };

  const handleWorkTypeChange = (wt) => {
    setForm({ ...form, work_type: wt, normative_references: NORMATIVE_MAP[wt] || '' });
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
    await base44.entities.Invoice.delete(id);
    setDocs(docs.filter(d => d.id !== id));
  };

  const filtered = docs.filter(d => {
    const matchSearch = `${d.doc_number} ${d.contact_name}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || d.doc_type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documentos</h1>
        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600"><Plus className="w-4 h-4 mr-2" />Nuevo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nuevo'} documento</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <Select value={form.doc_type} onValueChange={v => setForm({...form, doc_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input placeholder="Nº documento" value={form.doc_number} onChange={e => setForm({...form, doc_number: e.target.value})} />
                  <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Select value={form.contact_id} onValueChange={handleContactSelect}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname} {c.company_name ? `(${c.company_name})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  <Input type="date" placeholder="Vencimiento" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
                </div>
                <Select value={form.work_type} onValueChange={handleWorkTypeChange}>
                  <SelectTrigger><SelectValue placeholder="Tipo de trabajo" /></SelectTrigger>
                  <SelectContent>{WORK_TYPES.map(w => <SelectItem key={w} value={w}>{w.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>

                {/* Items */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Líneas</label>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-1 items-center">
                      <Input className="col-span-5 text-xs" placeholder="Descripción" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                      <Input className="col-span-2 text-xs" type="number" placeholder="Cant." value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} />
                      <Input className="col-span-2 text-xs" type="number" placeholder="Precio" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                      <span className="col-span-2 text-xs text-right font-medium">{item.total?.toFixed(2)} €</span>
                      <button className="col-span-1 text-red-400" onClick={() => removeItem(i)}>×</button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Línea</Button>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span>{form.subtotal?.toFixed(2)} €</span></div>
                  <div className="flex justify-between"><span>IVA ({form.iva_rate}%):</span><span>{form.iva_amount?.toFixed(2)} €</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{form.total?.toFixed(2)} €</span></div>
                </div>

                <Textarea placeholder="Observaciones" value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} rows={2} />
                <Textarea placeholder="Condiciones de pago" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} rows={3} />
                {form.normative_references && (
                  <div className="bg-blue-50 p-3 rounded-lg text-xs">
                    <p className="font-medium text-blue-700 mb-1">Normativa aplicable:</p>
                    <p className="text-blue-600">{form.normative_references}</p>
                  </div>
                )}
                <Button onClick={handleSave} className="w-full bg-blue-600">{editing ? 'Actualizar' : 'Guardar'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vista previa</DialogTitle></DialogHeader>
          {previewDoc && (
            <div ref={printRef}>
              <CompanyHeader className="mb-4 pb-4 border-b" />
              <div className="space-y-3">
                <div className="flex justify-between">
                  <div>
                    <h2 className="text-xl font-bold uppercase">{previewDoc.doc_type}</h2>
                    <p className="text-sm text-gray-500">Nº: {previewDoc.doc_number}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>Fecha: {previewDoc.date}</p>
                    {previewDoc.due_date && <p>Vencimiento: {previewDoc.due_date}</p>}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="font-medium">{previewDoc.contact_name}</p>
                  <p>{previewDoc.contact_nif && `NIF: ${previewDoc.contact_nif}`}</p>
                  <p>{previewDoc.contact_address}</p>
                </div>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left p-2">Descripción</th><th className="p-2 text-right">Cant.</th><th className="p-2 text-right">Precio</th><th className="p-2 text-right">Total</th></tr></thead>
                  <tbody>
                    {previewDoc.items?.map((item, i) => (
                      <tr key={i} className="border-b"><td className="p-2">{item.description}</td><td className="p-2 text-right">{item.quantity}</td><td className="p-2 text-right">{item.unit_price?.toFixed(2)} €</td><td className="p-2 text-right">{item.total?.toFixed(2)} €</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="text-right space-y-1 text-sm">
                  <p>Subtotal: {previewDoc.subtotal?.toFixed(2)} €</p>
                  <p>IVA ({previewDoc.iva_rate}%): {previewDoc.iva_amount?.toFixed(2)} €</p>
                  <p className="font-bold text-lg">Total: {previewDoc.total?.toFixed(2)} €</p>
                </div>
                {previewDoc.observations && <p className="text-xs text-gray-600 whitespace-pre-wrap">{previewDoc.observations}</p>}
                {previewDoc.payment_terms && <p className="text-xs text-gray-500 whitespace-pre-wrap">{previewDoc.payment_terms}</p>}
                {previewDoc.normative_references && <p className="text-xs text-blue-600">Normativa: {previewDoc.normative_references}</p>}
              </div>
            </div>
          )}
          <PrintButton contentRef={printRef} title={`${previewDoc?.doc_type} ${previewDoc?.doc_number}`} />
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {filtered.map(doc => (
          <Card key={doc.id} className="hover:shadow-sm cursor-pointer" onClick={() => setPreviewDoc(doc)}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${doc.doc_type === 'factura' ? 'bg-violet-100' : doc.doc_type === 'presupuesto' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  <FileText className={`w-4 h-4 ${doc.doc_type === 'factura' ? 'text-violet-600' : doc.doc_type === 'presupuesto' ? 'text-blue-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="font-medium text-sm capitalize">{doc.doc_type} {doc.doc_number}</p>
                  <p className="text-xs text-gray-500">{doc.contact_name} | {doc.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{doc.total?.toFixed(2)} €</span>
                <Badge variant="outline" className="text-[10px]">{doc.status}</Badge>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }} className="text-red-400 hover:text-red-600 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}