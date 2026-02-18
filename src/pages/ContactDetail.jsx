import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, Mail, Navigation, Plus, Calendar, Wrench, FileText, ClipboardList, Calculator, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

const PAYMENT_PROFILES = {
  buen_pagador: { label: 'Buen pagador', color: 'bg-green-100 text-green-700', icon: '✅' },
  pagador_normal: { label: 'Pagador normal', color: 'bg-blue-100 text-blue-700', icon: '💳' },
  regateador: { label: 'Regateador', color: 'bg-yellow-100 text-yellow-700', icon: '⚠️' },
  mal_pagador: { label: 'Mal pagador', color: 'bg-orange-100 text-orange-700', icon: '🔶' },
  moroso: { label: 'Moroso', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

const APT_STATUS_ICON = { pendiente: <Clock className="w-3 h-3" />, confirmada: <CheckCircle className="w-3 h-3" />, completada: <CheckCircle className="w-3 h-3 text-green-600" />, cancelada: <XCircle className="w-3 h-3 text-red-500" /> };

export default function ContactDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const contactId = urlParams.get('id');
  const [contact, setContact] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [satOrders, setSatOrders] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [calculations, setCalculations] = useState([]);
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({});
  const printRef = useRef(null);

  useEffect(() => {
    if (!contactId) return;
    Promise.all([
      base44.entities.Contact.list().then(cs => cs.find(c => c.id === contactId)),
      base44.entities.Invoice.filter({ contact_id: contactId }),
      base44.entities.SATOrder.filter({ contact_id: contactId }),
      base44.entities.MaintenanceSheet.filter({ contact_id: contactId }),
      base44.entities.ClientDocument.filter({ contact_id: contactId }),
      base44.entities.ClientNote.filter({ contact_id: contactId }),
      base44.entities.Appointment.filter({ contact_id: contactId }),
      base44.entities.ThermalCalculation.filter({ contact_id: contactId }),
    ]).then(([c, inv, sat, maint, docs, nts, apts, calcs]) => {
      setContact(c);
      setContactForm(c || {});
      setInvoices(inv);
      setSatOrders(sat);
      setMaintenance(maint);
      setDocuments(docs);
      setNotes(nts);
      setAppointments(apts);
      setCalculations(calcs);
    });
  }, [contactId]);

  const saveNote = async () => {
    await base44.entities.ClientNote.create({ ...noteForm, contact_id: contactId, contact_name: contact?.name, date: format(new Date(), 'yyyy-MM-dd') });
    setNoteDialog(false);
    setNoteForm({ title: '', content: '' });
    const nts = await base44.entities.ClientNote.filter({ contact_id: contactId });
    setNotes(nts);
  };

  const saveContact = async () => {
    await base44.entities.Contact.update(contactId, contactForm);
    setContact({ ...contact, ...contactForm });
    setEditingContact(false);
  };

  const openGPS = () => {
    const addr = encodeURIComponent(`${contact.address || ''}, ${contact.city || ''}, ${contact.province || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
  };

  if (!contact) return <div className="text-center py-8 text-gray-400">Cargando...</div>;

  const pp = PAYMENT_PROFILES[contact.payment_profile] || PAYMENT_PROFILES.pagador_normal;

  const docsByType = {
    factura: invoices.filter(i => i.doc_type === 'factura'),
    presupuesto: invoices.filter(i => i.doc_type === 'presupuesto'),
    recibo: invoices.filter(i => i.doc_type === 'recibo'),
  };

  const aptsByStatus = {
    pendiente: appointments.filter(a => ['pendiente', 'confirmada'].includes(a.status)),
    completada: appointments.filter(a => a.status === 'completada'),
    cancelada: appointments.filter(a => a.status === 'cancelada'),
  };

  const DocCard = ({ doc, type }) => (
    <Card className="hover:shadow-sm">
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{doc.doc_number || doc.title || doc.order_number || `${type} sin nº`}</p>
          <p className="text-xs text-gray-500">{doc.date} {doc.total != null ? `| ${doc.total?.toFixed(2)} €` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{doc.status || doc.doc_type || type}</Badge>
          {doc.file_url && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">Ver</a>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4" ref={printRef}>
      <CompanyHeader />

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0">
              {contact.name?.[0] || 'C'}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{contact.name} {contact.surname}</h1>
              {contact.company_name && <p className="text-gray-500">{contact.company_name}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline">{contact.type}</Badge>
                <Badge variant="outline">{contact.category?.replace(/_/g, ' ')}</Badge>
                <Badge className={pp.color}>{pp.icon} {pp.label}</Badge>
                {contact.pending_amount > 0 && <Badge className="bg-red-100 text-red-700">⚠️ Debe {contact.pending_amount?.toFixed(2)} €</Badge>}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditingContact(!editingContact)}>Editar</Button>
          </div>

          {editingContact ? (
            <div className="space-y-2 border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Perfil de pago</label>
                  <Select value={contactForm.payment_profile || 'pagador_normal'} onValueChange={v => setContactForm({ ...contactForm, payment_profile: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(PAYMENT_PROFILES).map(([k, v]) => <SelectItem key={k} value={k}>{v.icon} {v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Importe pendiente (€)</label>
                  <Input type="number" value={contactForm.pending_amount || 0} onChange={e => setContactForm({ ...contactForm, pending_amount: parseFloat(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">Observaciones internas (no aparece en documentos)</label>
                <Textarea rows={3} value={contactForm.internal_observations || ''} onChange={e => setContactForm({ ...contactForm, internal_observations: e.target.value })} />
              </div>
              <Button onClick={saveContact} className="bg-blue-600 w-full">Guardar cambios</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {contact.nif && <div><span className="text-gray-500">NIF:</span> {contact.nif}</div>}
              {contact.phone && <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-blue-600"><Phone className="w-4 h-4" />{contact.phone}</a>}
              {contact.email && <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-blue-600"><Mail className="w-4 h-4" />{contact.email}</a>}
              {contact.address && (
                <button onClick={openGPS} className="flex items-center gap-2 text-orange-600 text-left">
                  <Navigation className="w-4 h-4 flex-shrink-0" />
                  {contact.address}, {contact.city} {contact.postal_code} {contact.province}
                </button>
              )}
              {contact.internal_observations && (
                <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded p-2 text-xs">
                  <strong>Obs. internas:</strong> {contact.internal_observations}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <PrintButton contentRef={printRef} title={`Ficha ${contact.name}`} />

      <Tabs defaultValue="facturas">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="facturas" className="flex-1 text-xs min-w-[80px]">Facturas ({docsByType.factura.length})</TabsTrigger>
          <TabsTrigger value="presupuestos" className="flex-1 text-xs min-w-[80px]">Presupuestos ({docsByType.presupuesto.length})</TabsTrigger>
          <TabsTrigger value="recibos" className="flex-1 text-xs min-w-[80px]">Recibos ({docsByType.recibo.length})</TabsTrigger>
          <TabsTrigger value="sat" className="flex-1 text-xs min-w-[80px]">SAT ({satOrders.length})</TabsTrigger>
          <TabsTrigger value="maint" className="flex-1 text-xs min-w-[80px]">Manten. ({maintenance.length})</TabsTrigger>
          <TabsTrigger value="calcs" className="flex-1 text-xs min-w-[80px]">Cálculos ({calculations.length})</TabsTrigger>
          <TabsTrigger value="files" className="flex-1 text-xs min-w-[80px]">Archivos ({documents.length})</TabsTrigger>
          <TabsTrigger value="citas" className="flex-1 text-xs min-w-[80px]">Citas ({appointments.length})</TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 text-xs min-w-[80px]">Notas ({notes.length})</TabsTrigger>
        </TabsList>

        {/* FACTURAS */}
        <TabsContent value="facturas">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`Documents?contact_id=${contactId}&type=factura`)}>
              <Button size="sm" className="bg-violet-600"><Plus className="w-4 h-4 mr-1" />Nueva factura</Button>
            </Link>
            {docsByType.factura.map(inv => <DocCard key={inv.id} doc={inv} type="factura" />)}
            {docsByType.factura.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin facturas</p>}
          </div>
        </TabsContent>

        {/* PRESUPUESTOS */}
        <TabsContent value="presupuestos">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`Documents?contact_id=${contactId}&type=presupuesto`)}>
              <Button size="sm" className="bg-blue-600"><Plus className="w-4 h-4 mr-1" />Nuevo presupuesto</Button>
            </Link>
            {docsByType.presupuesto.map(inv => <DocCard key={inv.id} doc={inv} type="presupuesto" />)}
            {docsByType.presupuesto.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin presupuestos</p>}
          </div>
        </TabsContent>

        {/* RECIBOS */}
        <TabsContent value="recibos">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`Documents?contact_id=${contactId}&type=recibo`)}>
              <Button size="sm" className="bg-teal-600"><Plus className="w-4 h-4 mr-1" />Nuevo recibo</Button>
            </Link>
            {docsByType.recibo.map(inv => <DocCard key={inv.id} doc={inv} type="recibo" />)}
            {docsByType.recibo.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin recibos</p>}
          </div>
        </TabsContent>

        {/* SAT */}
        <TabsContent value="sat">
          <div className="space-y-2 mt-2">
            {satOrders.map(o => (
              <Card key={o.id}>
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{o.order_number} - {o.type}</p>
                  <p className="text-xs text-gray-500">{o.date} | {o.description}</p>
                  <Badge className="mt-1">{o.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {satOrders.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin órdenes SAT</p>}
          </div>
        </TabsContent>

        {/* MANTENIMIENTO */}
        <TabsContent value="maint">
          <div className="space-y-2 mt-2">
            {maintenance.map(m => (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Ficha #{m.sheet_number} - {m.type}</p>
                      <p className="text-xs text-gray-500">{m.date} | {m.equipment_brand} {m.equipment_model}</p>
                    </div>
                    <div className="flex gap-1">
                      {m.signature_technician && <span title="Firmado técnico" className="text-xs">✍️</span>}
                      {m.signature_client && <span title="Firmado cliente" className="text-xs">👤</span>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {maintenance.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin fichas</p>}
          </div>
        </TabsContent>

        {/* CÁLCULOS */}
        <TabsContent value="calcs">
          <div className="space-y-2 mt-2">
            <div className="flex gap-2 flex-wrap">
              <Link to={createPageUrl('ThermalCalc')}><Button size="sm" variant="outline">+ Cálculo Térmico</Button></Link>
              <Link to={createPageUrl('ColdRoomCalc')}><Button size="sm" variant="outline">+ Cámara</Button></Link>
              <Link to={createPageUrl('SolarCalc')}><Button size="sm" variant="outline">+ Solar</Button></Link>
              <Link to={createPageUrl('ElectricalCalc')}><Button size="sm" variant="outline">+ Eléctrico</Button></Link>
            </div>
            {calculations.map(c => (
              <Card key={c.id}>
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{c.calc_type} — {c.date}</p>
                  <p className="text-xs text-gray-500">Carga: {c.calculated_load} W | {c.suggested_brand} {c.suggested_model}</p>
                </CardContent>
              </Card>
            ))}
            {documents.filter(d => ['calculo_termico', 'calculo_solar'].includes(d.doc_type)).map(d => (
              <Card key={d.id}>
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{d.title}</p>
                    <p className="text-xs text-gray-500">{d.doc_type} | {d.date}</p>
                  </div>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">Ver</a>}
                </CardContent>
              </Card>
            ))}
            {calculations.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin cálculos guardados</p>}
          </div>
        </TabsContent>

        {/* ARCHIVOS */}
        <TabsContent value="files">
          <div className="space-y-2 mt-2">
            {documents.filter(d => !['calculo_termico', 'calculo_solar'].includes(d.doc_type)).map(d => (
              <Card key={d.id}>
                <CardContent className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{d.title}</p>
                    <p className="text-xs text-gray-500">{d.doc_type?.replace(/_/g, ' ')} | {d.date}</p>
                  </div>
                  {d.file_url && <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs">Ver</a>}
                </CardContent>
              </Card>
            ))}
            {documents.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin archivos</p>}
          </div>
        </TabsContent>

        {/* CITAS */}
        <TabsContent value="citas">
          <div className="space-y-3 mt-2">
            {['pendiente', 'completada', 'cancelada'].map(status => (
              <div key={status}>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                  {APT_STATUS_ICON[status]} {status === 'pendiente' ? 'Próximas / Pendientes' : status === 'completada' ? 'Realizadas' : 'Canceladas/Cambiadas'}
                  <span className="ml-1 text-gray-400">({aptsByStatus[status].length})</span>
                </p>
                {aptsByStatus[status].map(a => (
                  <Card key={a.id} className="mb-1">
                    <CardContent className="p-3">
                      <p className="font-medium text-sm">{a.title}</p>
                      <p className="text-xs text-gray-500">{a.date} {a.time_start && `| ${a.time_start}`} | {a.type}</p>
                      {a.notes && <p className="text-xs text-gray-400 mt-0.5">{a.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
                {aptsByStatus[status].length === 0 && <p className="text-xs text-gray-300 pl-2 mb-2">Sin citas en este estado</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* NOTAS */}
        <TabsContent value="notes">
          <div className="space-y-2 mt-2">
            <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600"><Plus className="w-4 h-4 mr-1" />Nueva nota</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva nota</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={noteForm.title} onChange={e => setNoteForm({ ...noteForm, title: e.target.value })} />
                  <Textarea placeholder="Contenido..." value={noteForm.content} onChange={e => setNoteForm({ ...noteForm, content: e.target.value })} rows={5} />
                  <Button onClick={saveNote} className="w-full bg-blue-600">Guardar nota</Button>
                </div>
              </DialogContent>
            </Dialog>
            {notes.map(n => (
              <Card key={n.id}>
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{n.content}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{n.date}</p>
                </CardContent>
              </Card>
            ))}
            {notes.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin notas</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}