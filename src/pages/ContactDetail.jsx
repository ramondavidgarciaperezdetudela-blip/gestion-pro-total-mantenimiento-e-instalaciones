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
import { Phone, Mail, Navigation, Plus, Calendar, Wrench, FileText, ClipboardList, Calculator, AlertCircle, CheckCircle, Clock, XCircle, Upload, Trash2, Edit, Eye, Send, Bot, ArrowLeft, Printer, MessageCircle, Camera, History } from 'lucide-react';
import ClientMachineTab from '../components/ClientMachineTab';
import EquipmentDiaryTab from '../components/EquipmentDiaryTab';
import SATOrderDialog from '../components/SATOrderDialog';
import { logChange } from '../components/ChangeLogger';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

function ChangeHistoryTab({ contactId }) {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    base44.entities.ChangeLog.filter({ contact_id: contactId }).then(data => {
      setLogs(data.sort((a, b) => (b.datetime || b.date || '').localeCompare(a.datetime || a.date || '')));
      setLoading(false);
    });
  }, [contactId]);

  const actionColors = { crear: 'bg-green-100 text-green-700', editar: 'bg-blue-100 text-blue-700', eliminar: 'bg-red-100 text-red-700' };

  if (loading) return <p className="text-center text-gray-400 py-6 text-sm">Cargando historial...</p>;

  return (
    <div className="space-y-2 mt-2">
      {logs.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin historial de cambios registrado</p>
        </div>
      )}
      {logs.map(log => (
        <div key={log.id} className="flex items-start gap-2 text-sm border-b pb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>{log.action}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-xs">{log.entity_type} {log.entity_label && `— ${log.entity_label}`}</p>
            {log.changes_summary && <p className="text-xs text-gray-500">{log.changes_summary}</p>}
            <p className="text-[10px] text-gray-400">{log.datetime || log.date} {log.user_email && `· ${log.user_email}`}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [uploadDialog, setUploadDialog] = useState(false);
  const [uploadDocType, setUploadDocType] = useState('otro');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [equipmentPhotos, setEquipmentPhotos] = useState([]);
  const [photoGalleryDialog, setPhotoGalleryDialog] = useState(false);
  const photoUploadRef = useRef(null);
  const [editDocDialog, setEditDocDialog] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editDocForm, setEditDocForm] = useState({ title: '', doc_type: 'otro', description: '' });
  const [satDialog, setSatDialog] = useState(null); // { order, mode }
  const [satDialogMode, setSatDialogMode] = useState('view');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [aiReportDialog, setAiReportDialog] = useState(false);
  const fileUploadRef = useRef(null);
  const photoRef = useRef(null);
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
      // Cargar fotos de equipos instalados
      const equipPhotos = docs.filter(d => d.doc_type === 'foto_equipo') || [];
      setEquipmentPhotos(equipPhotos);
    });
  }, [contactId]);

  const saveNote = async () => {
    await base44.entities.ClientNote.create({ ...noteForm, contact_id: contactId, contact_name: contact?.name, date: format(new Date(), 'yyyy-MM-dd') });
    setNoteDialog(false);
    setNoteForm({ title: '', content: '' });
    const nts = await base44.entities.ClientNote.filter({ contact_id: contactId });
    setNotes(nts);
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ClientDocument.create({
      contact_id: contactId,
      contact_name: contact?.name,
      title: uploadTitle || file.name,
      doc_type: uploadDocType,
      file_url,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setUploading(false);
    setUploadDialog(false);
    setUploadTitle('');
    const docs = await base44.entities.ClientDocument.filter({ contact_id: contactId });
    setDocuments(docs);
  };

  const saveContact = async () => {
    await base44.entities.Contact.update(contactId, contactForm);
    logChange({ entityType: 'Contact', entityId: contactId, entityLabel: `${contact.name} ${contact.surname || ''}`.trim(), action: 'editar', contactId, contactName: contact.name, changesSummary: 'Datos del contacto actualizados' });
    setContact({ ...contact, ...contactForm });
    setEditingContact(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setPhotoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updated = { ...contact, photo_url: file_url };
    await base44.entities.Contact.update(contactId, { photo_url: file_url });
    setContact(updated);
    setContactForm(prev => ({ ...prev, photo_url: file_url }));
    setPhotoUploading(false);
  };

  const handleEquipmentPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const photoDoc = await base44.entities.ClientDocument.create({
      contact_id: contactId,
      contact_name: contact?.name,
      title: `Equipo instalado - ${format(new Date(), 'dd/MM/yyyy')}`,
      doc_type: 'foto_equipo',
      file_url,
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setEquipmentPhotos([...equipmentPhotos, photoDoc]);
    setUploading(false);
  };

  const deleteEquipmentPhoto = async (id) => {
    if (!confirm('¿Eliminar esta fotografía?')) return;
    await base44.entities.ClientDocument.delete(id);
    setEquipmentPhotos(equipmentPhotos.filter(p => p.id !== id));
  };

  const generateAIReport = async () => {
    setAiReportLoading(true); setAiReportDialog(true); setAiReport('');
    const totalFacturado = invoices.filter(i => i.doc_type === 'factura').reduce((s, i) => s + (i.total || 0), 0);
    const pendiente = invoices.filter(i => ['enviado','vencido'].includes(i.status)).reduce((s, i) => s + (i.total || 0), 0);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Genera un informe profesional en español sobre el cliente con los siguientes datos:
Nombre: ${contact.name} ${contact.surname || ''} ${contact.company_name ? `(${contact.company_name})` : ''}
Tipo: ${contact.type} | Categoría: ${contact.category}
Perfil de pago: ${contact.payment_profile}
Teléfono: ${contact.phone || '-'} | Email: ${contact.email || '-'}
Dirección: ${contact.address || '-'}, ${contact.city || '-'}

HISTORIAL:
- Facturas: ${invoices.filter(i=>i.doc_type==='factura').length} (Total facturado: ${totalFacturado.toFixed(2)} €, Pendiente: ${pendiente.toFixed(2)} €)
- Presupuestos: ${invoices.filter(i=>i.doc_type==='presupuesto').length}
- Órdenes SAT: ${satOrders.length} (${satOrders.filter(s=>s.status==='pendiente').length} pendientes)
- Fichas mantenimiento: ${maintenance.length}
- Citas: ${appointments.length}
- Notas: ${notes.length}
${contact.internal_observations ? `Observaciones internas: ${contact.internal_observations}` : ''}

Redacta un informe conciso con: resumen del cliente, valoración de la relación comercial, historial de trabajos, situación financiera y recomendaciones. Máximo 400 palabras.`,
    });
    setAiReport(result);
    setAiReportLoading(false);
  };

  const openGPS = () => {
    const addr = encodeURIComponent(`${contact.address || ''}, ${contact.city || ''}, ${contact.province || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
  };

  const reloadAll = async () => {
    const [inv, sat, maint, docs, nts, apts] = await Promise.all([
      base44.entities.Invoice.filter({ contact_id: contactId }),
      base44.entities.SATOrder.filter({ contact_id: contactId }),
      base44.entities.MaintenanceSheet.filter({ contact_id: contactId }),
      base44.entities.ClientDocument.filter({ contact_id: contactId }),
      base44.entities.ClientNote.filter({ contact_id: contactId }),
      base44.entities.Appointment.filter({ contact_id: contactId }),
    ]);
    setInvoices(inv); setSatOrders(sat); setMaintenance(maint);
    setDocuments(docs); setNotes(nts); setAppointments(apts);
  };

  const deleteSat = async (id) => {
    if (!confirm('¿Eliminar esta orden SAT?')) return;
    await base44.entities.SATOrder.delete(id);
    setSatOrders(satOrders.filter(o => o.id !== id));
  };

  const deleteMaintenance = async (id) => {
    if (!confirm('¿Eliminar esta ficha?')) return;
    await base44.entities.MaintenanceSheet.delete(id);
    setMaintenance(maintenance.filter(m => m.id !== id));
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

  const deleteInvoice = async (id) => {
    await base44.entities.Invoice.delete(id);
    const inv = await base44.entities.Invoice.filter({ contact_id: contactId });
    setInvoices(inv);
  };

  const deleteDocument = async (id) => {
    await base44.entities.ClientDocument.delete(id);
    const docs = await base44.entities.ClientDocument.filter({ contact_id: contactId });
    setDocuments(docs);
  };

  const deleteNote = async (id) => {
    await base44.entities.ClientNote.delete(id);
    const nts = await base44.entities.ClientNote.filter({ contact_id: contactId });
    setNotes(nts);
  };

  const openEditDoc = (doc) => {
    setEditingDoc(doc);
    setEditDocForm({ title: doc.title || '', doc_type: doc.doc_type || 'otro', description: doc.description || '' });
    setEditDocDialog(true);
  };

  const saveEditDoc = async () => {
    await base44.entities.ClientDocument.update(editingDoc.id, editDocForm);
    setEditDocDialog(false);
    setEditingDoc(null);
    const docs = await base44.entities.ClientDocument.filter({ contact_id: contactId });
    setDocuments(docs);
  };

  const sendWhatsApp = (text) => {
    const phone = contact.phone?.replace(/\D/g, '');
    const msg = encodeURIComponent(text);
    if (phone) {
      window.open(`https://wa.me/34${phone}?text=${msg}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${msg}`, '_blank');
    }
  };

  const sendEmail = (subject, body) => {
    window.open(`mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const fmtDate = (d) => {
    if (!d) return '';
    try { return format(new Date(d), "EEEE, d 'de' MMMM yyyy", { locale: es }); } catch { return d; }
  };

  const printDoc = (doc) => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${doc.doc_number || doc.title || 'Documento'}</title></head><body style="font-family:sans-serif;padding:20px"><h2>${doc.doc_number || doc.title || 'Documento'}</h2><p>Cliente: ${contact.name} ${contact.surname || ''}</p><p>Fecha: ${fmtDate(doc.date)}</p>${doc.total != null ? `<p>Total: ${doc.total?.toFixed(2)} €</p>` : ''}${doc.file_url ? `<p><a href="${doc.file_url}">Ver archivo adjunto</a></p>` : ''}</body></html>`);
    w.document.close();
    w.print();
  };

  const DocCard = ({ doc, type, onDelete }) => (
    <Card className="hover:shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{doc.doc_number || doc.title || doc.order_number || `${type} sin nº`}</p>
            <p className="text-xs text-gray-500">{fmtDate(doc.date)} {doc.total != null ? `| ${doc.total?.toFixed(2)} €` : ''}</p>
            <Badge variant="outline" className="text-[10px] mt-1">{doc.status || doc.doc_type || type}</Badge>
          </div>
        </div>
        <div className="flex gap-1 mt-2 flex-wrap">
          {doc.file_url && (
            <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
              <Eye className="w-3 h-3" /> Ver
            </a>
          )}
          <Link to={createPageUrl(`Documents?edit=${doc.id}`)}>
            <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 cursor-pointer">
              <Edit className="w-3 h-3" /> Editar
            </span>
          </Link>
          <button onClick={() => printDoc(doc)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-50 text-slate-700 hover:bg-slate-100">
            <Printer className="w-3 h-3" /> Imprimir
          </button>
          <button
            onClick={() => sendWhatsApp(`Le enviamos el ${type} ${doc.doc_number || ''} del ${fmtDate(doc.date)}. Total: ${doc.total?.toFixed(2) || '-'} €`)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
            <MessageCircle className="w-3 h-3" /> WA
          </button>
          {contact.email && (
            <button
              onClick={() => sendEmail(`${type} ${doc.doc_number || ''}`, `Estimado/a ${contact.name},\n\nAdjuntamos ${type} ${doc.doc_number || ''} de fecha ${fmtDate(doc.date)}.\n\nTotal: ${doc.total?.toFixed(2) || '-'} €\n\nAtentamente`)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
              <Send className="w-3 h-3" /> Email
            </button>
          )}
          {onDelete && (
            <button onClick={() => { if(confirm('¿Eliminar?')) onDelete(doc.id); }} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
              <Trash2 className="w-3 h-3" /> Eliminar
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4" ref={printRef}>
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Link to={createPageUrl('Contacts')}>
          <Button size="sm" variant="outline" className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Button>
        </Link>
      </div>
      <CompanyHeader />

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4 mb-4">
            {/* Foto cliente — clic para cambiar */}
            <div className="relative w-20 h-20 flex-shrink-0 group cursor-pointer" onClick={() => photoRef.current?.click()}>
              {contact.photo_url ? (
                <img src={contact.photo_url} alt="" className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200 shadow" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-3xl shadow">
                  {contact.name?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
              <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {photoUploading ? <span className="text-white text-xs">⏳</span> : <Camera className="w-6 h-6 text-white" />}
              </div>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{contact.name} {contact.surname}</h1>
              {contact.company_name && <p className="text-gray-500">{contact.company_name}</p>}
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline">{contact.type}</Badge>
                <Badge variant="outline">{contact.category?.replace(/_/g, ' ')}</Badge>
                <Badge className={pp.color}>{pp.icon} {pp.label}</Badge>
                {contact.pending_amount > 0 && <Badge className="bg-red-100 text-red-700">⚠️ Debe {contact.pending_amount?.toFixed(2)} €</Badge>}
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
              <Button size="sm" variant="outline" onClick={generateAIReport} title="Informe IA">
                <Bot className="w-3.5 h-3.5 mr-1" />IA
              </Button>
              <Button size="sm" variant="outline" onClick={() => setUploadDialog(true)} title="Subir documento">
                <Upload className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingContact(!editingContact)}>{editingContact ? 'Cancelar' : 'Editar'}</Button>
            </div>
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

      {/* Upload document dialog */}
      <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Subir documento</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título del documento" value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} />
            <Select value={uploadDocType} onValueChange={setUploadDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['factura','presupuesto','recibo','ficha_mantenimiento','orden_sat','calculo_termico','calculo_solar','informe','nota','otro'].map(t => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full" onClick={() => fileUploadRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />{uploading ? 'Subiendo...' : 'Seleccionar archivo / foto'}
            </Button>
            <input ref={fileUploadRef} type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleDocUpload} />
            <p className="text-xs text-gray-400">Admite imágenes (fotos del escáner), PDF y Word</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Document Dialog */}
      <Dialog open={editDocDialog} onOpenChange={setEditDocDialog}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar archivo — {editDocForm.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Título</label>
                <Input value={editDocForm.title} onChange={e => setEditDocForm({ ...editDocForm, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo de documento</label>
                <Select value={editDocForm.doc_type} onValueChange={v => setEditDocForm({ ...editDocForm, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['factura','presupuesto','recibo','ficha_mantenimiento','orden_sat','calculo_termico','calculo_solar','informe','nota','otro'].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Si la descripción contiene HTML (documentos LEGAL/generados), mostrar previsualización */}
            {editDocForm.description && editDocForm.description.trim().startsWith('<') ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700">Contenido del documento</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditDocForm(f => ({ ...f, _htmlMode: !f._htmlMode }))}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${editDocForm._htmlMode ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
                    >
                      {editDocForm._htmlMode ? '← Vista previa' : 'Editar HTML'}
                    </button>
                  </div>
                </div>

                {editDocForm._htmlMode ? (
                  <textarea
                    className="w-full border border-input rounded-md px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                    value={editDocForm.description}
                    onChange={e => setEditDocForm({ ...editDocForm, description: e.target.value })}
                    rows={20}
                  />
                ) : (
                  <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[50vh]">
                    <CompanyHeader className="pb-3 border-b mb-4" />
                    <div
                      className="text-xs"
                      style={{ lineHeight: '1.6' }}
                      dangerouslySetInnerHTML={{
                        __html: editDocForm.description
                          .replace(/<table/g, '<table style="border-collapse:collapse;width:100%;margin:8px 0"')
                          .replace(/<td/g, '<td style="border:1px solid #ccc;padding:4px 8px;vertical-align:top"')
                          .replace(/<th/g, '<th style="border:1px solid #ccc;padding:4px 8px;background:#f3f4f6;font-weight:600;text-align:left"')
                          .replace(/<h2/g, '<h2 style="font-size:14px;font-weight:700;margin:16px 0 6px;color:#1e3a5f;border-bottom:2px solid #1e3a5f;padding-bottom:4px"')
                          .replace(/<h3/g, '<h3 style="font-size:12px;font-weight:600;margin:12px 0 4px;color:#374151"')
                      }}
                    />
                    <div className="mt-6 pt-3 border-t text-[10px] text-gray-400">
                      Documento generado por sistema informático — Requiere revisión y firma de técnico cualificado
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="text-xs text-gray-500">Descripción / Notas</label>
                <Textarea rows={5} value={editDocForm.description} onChange={e => setEditDocForm({ ...editDocForm, description: e.target.value })} placeholder="Descripción del documento..." />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={saveEditDoc} className="flex-1 bg-blue-600">Guardar cambios</Button>
              <Button variant="outline" onClick={() => setEditDocDialog(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Report Dialog */}
      <Dialog open={aiReportDialog} onOpenChange={setAiReportDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>📊 Informe IA — {contact.name} {contact.surname}</DialogTitle></DialogHeader>
          {aiReportLoading ? (
            <div className="text-center py-10">
              <Bot className="w-10 h-10 mx-auto text-purple-400 animate-pulse mb-2" />
              <p className="text-sm text-gray-500">Generando informe...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-purple-50 border border-purple-100 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed">{aiReport}</div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(aiReport)}>Copiar</Button>
                <Button size="sm" variant="outline" onClick={generateAIReport}>Regenerar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
          <TabsTrigger value="aibudget" className="flex-1 text-xs min-w-[80px]">Presup. IA</TabsTrigger>
          <TabsTrigger value="legalizacion" className="flex-1 text-xs min-w-[80px]">Legaliz.</TabsTrigger>
          <TabsTrigger value="maquinaria" className="flex-1 text-xs min-w-[80px]">Maquinaria</TabsTrigger>
          <TabsTrigger value="historial" className="flex-1 text-xs min-w-[80px]">Historial</TabsTrigger>
          <TabsTrigger value="fotos_equipo" className="flex-1 text-xs min-w-[80px]">📸 Equipo ({equipmentPhotos.length})</TabsTrigger>
          <TabsTrigger value="diario" className="flex-1 text-xs min-w-[80px]">🔧 Diario</TabsTrigger>
          </TabsList>

        {/* FACTURAS */}
        <TabsContent value="facturas">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`Documents?contact_id=${contactId}&type=factura`)}>
              <Button size="sm" className="bg-violet-600"><Plus className="w-4 h-4 mr-1" />Nueva factura</Button>
            </Link>
            {docsByType.factura.map(inv => <DocCard key={inv.id} doc={inv} type="factura" onDelete={deleteInvoice} />)}
            {docsByType.factura.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin facturas</p>}
          </div>
        </TabsContent>

        {/* PRESUPUESTOS */}
        <TabsContent value="presupuestos">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`Documents?contact_id=${contactId}&type=presupuesto`)}>
              <Button size="sm" className="bg-blue-600"><Plus className="w-4 h-4 mr-1" />Nuevo presupuesto</Button>
            </Link>
            {docsByType.presupuesto.map(inv => <DocCard key={inv.id} doc={inv} type="presupuesto" onDelete={deleteInvoice} />)}
            {docsByType.presupuesto.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin presupuestos</p>}
          </div>
        </TabsContent>

        {/* RECIBOS */}
        <TabsContent value="recibos">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`Documents?contact_id=${contactId}&type=recibo`)}>
              <Button size="sm" className="bg-teal-600"><Plus className="w-4 h-4 mr-1" />Nuevo recibo</Button>
            </Link>
            {docsByType.recibo.map(inv => <DocCard key={inv.id} doc={inv} type="recibo" onDelete={deleteInvoice} />)}
            {docsByType.recibo.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin recibos</p>}
          </div>
        </TabsContent>

        {/* SAT */}
        <TabsContent value="sat">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`SAT?contact_id=${contactId}`)}>
              <Button size="sm" className="bg-orange-600"><Plus className="w-4 h-4 mr-1" />Nueva orden SAT</Button>
            </Link>
            {satOrders.map(o => {
              const statusColors = { pendiente: 'bg-yellow-100 text-yellow-700', en_curso: 'bg-blue-100 text-blue-700', completada: 'bg-green-100 text-green-700', cancelada: 'bg-gray-100 text-gray-700' };
              return (
                <Card key={o.id} className="hover:shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">#{o.order_number || 'S/N'} — {o.type?.replace(/_/g,' ')}</p>
                        <p className="text-xs text-gray-500">{fmtDate(o.date)} | {o.equipment_type?.replace(/_/g,' ')}</p>
                        {o.description && <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{o.description}</p>}
                        {o.technician && <p className="text-xs text-blue-600">👷 {o.technician}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <Badge className={statusColors[o.status] || ''}>{o.status}</Badge>
                        {o.total > 0 && <span className="text-xs font-semibold">{o.total?.toFixed(2)} €</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2 border-t pt-2 flex-wrap">
                      <button onClick={() => { setSatDialog(o); setSatDialogMode('view'); }} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-orange-50 text-orange-700 hover:bg-orange-100">
                        <Eye className="w-3 h-3" /> Ver
                      </button>
                      <button onClick={() => { setSatDialog(o); setSatDialogMode('edit'); }} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                        <Edit className="w-3 h-3" /> Editar
                      </button>
                      <button onClick={() => sendWhatsApp(`Orden SAT #${o.order_number || ''}\nFecha: ${o.date}\nTipo: ${o.type}\nDescripción: ${o.description || '-'}\nEstado: ${o.status}`)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
                        <MessageCircle className="w-3 h-3" /> WA
                      </button>
                      {contact.email && (
                        <button onClick={() => sendEmail(`Orden SAT #${o.order_number || ''}`, `Estimado/a ${contact.name},\n\nAdjuntamos resumen de la Orden SAT #${o.order_number}.\nFecha: ${o.date} | Tipo: ${o.type}\n${o.solution ? `Solución: ${o.solution}` : ''}\n\nAtentamente`)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                          <Send className="w-3 h-3" /> Email
                        </button>
                      )}
                      <button onClick={() => deleteSat(o.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
                        <Trash2 className="w-3 h-3" /> Eliminar
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {satOrders.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin órdenes SAT</p>}
          </div>

          {/* SAT inline dialog */}
          {satDialog && (
            <SATOrderDialog
              order={satDialog}
              contact={contact}
              mode={satDialogMode}
              open={!!satDialog}
              onClose={() => setSatDialog(null)}
              onSaved={(updated) => {
                setSatOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
                setSatDialog(updated);
                setSatDialogMode('view');
              }}
            />
          )}
        </TabsContent>

        {/* MANTENIMIENTO */}
        <TabsContent value="maint">
          <div className="space-y-2 mt-2">
            <Link to={createPageUrl(`Maintenance?contact_id=${contactId}`)}>
              <Button size="sm" className="bg-cyan-600"><Plus className="w-4 h-4 mr-1" />Nueva ficha mantenimiento</Button>
            </Link>
            {maintenance.map(m => (
              <Card key={m.id} className="hover:shadow-md">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">Ficha #{m.sheet_number} — {m.type}</p>
                      <p className="text-xs text-gray-500">{fmtDate(m.date)} | {m.equipment_brand} {m.equipment_model}</p>
                      {m.technician_name && <p className="text-xs text-blue-600">👷 {m.technician_name}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-1 text-xs">
                        {m.signature_technician && <span title="Firmado técnico">✍️</span>}
                        {m.signature_client && <span title="Firmado cliente">👤</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2 border-t pt-2 flex-wrap">
                    <Link to={createPageUrl(`Maintenance?view=${m.id}`)}>
                      <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100 cursor-pointer">
                        <Eye className="w-3 h-3" /> Ver
                      </span>
                    </Link>
                    <Link to={createPageUrl(`Maintenance?edit=${m.id}`)}>
                      <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer">
                        <Edit className="w-3 h-3" /> Editar
                      </span>
                    </Link>
                    <button onClick={() => sendWhatsApp(`Ficha Mantenimiento #${m.sheet_number}\nFecha: ${m.date}\nTipo: ${m.type}\nEquipo: ${m.equipment_brand} ${m.equipment_model}\nObservaciones: ${m.observations || '-'}`)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
                      <Phone className="w-3 h-3" /> WA
                    </button>
                    {contact.email && (
                      <button onClick={() => sendEmail(`Ficha Mantenimiento #${m.sheet_number}`, `Estimado/a ${contact.name},\n\nAdjuntamos ficha de mantenimiento #${m.sheet_number}.\nFecha: ${m.date} | Tipo: ${m.type} | Equipo: ${m.equipment_brand} ${m.equipment_model}\n${m.recommendations ? `Recomendaciones: ${m.recommendations}` : ''}\n\nAtentamente`)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                        <Send className="w-3 h-3" /> Email
                      </button>
                    )}
                    <button onClick={() => deleteMaintenance(m.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
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
              <Link to={createPageUrl('ThermalCalc')}><Button size="sm" variant="outline">+ Térmico</Button></Link>
              <Link to={createPageUrl('ColdRoomCalc')}><Button size="sm" variant="outline">+ Cámara</Button></Link>
              <Link to={createPageUrl('SolarCalc')}><Button size="sm" variant="outline">+ Solar</Button></Link>
              <Link to={createPageUrl('BatteryCalc')}><Button size="sm" variant="outline">+ Baterías</Button></Link>
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
            <Button size="sm" variant="outline" onClick={() => setUploadDialog(true)}>
              <Upload className="w-4 h-4 mr-1" />Subir documento
            </Button>
            {documents.map(d => {
              const isHtmlDoc = d.description && d.description.trim().startsWith('<');
              const openDocPreview = () => {
                const w = window.open('', '_blank');
                if (isHtmlDoc) {
                  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${d.title}</title><style>
                    body{font-family:Arial,sans-serif;padding:20px;max-width:900px;margin:0 auto;font-size:10px;line-height:1.6}
                    h2{font-size:14px;font-weight:700;color:#1e3a5f;border-bottom:2px solid #0ea5e9;padding-bottom:6px}
                    h3{font-size:12px;font-weight:600;color:#374151}
                    table{width:100%;border-collapse:collapse;margin:8px 0}
                    td,th{border:1px solid #ccc;padding:4px 8px;vertical-align:top}
                    th{background:#f3f4f6;font-weight:600;text-align:left}
                    .header{display:flex;align-items:center;gap:12px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;margin-bottom:14px}
                    .footer{margin-top:20px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:8px;color:#9ca3af;text-align:center}
                    @media print{body{padding:10px}}
                  </style></head><body>
                  <div class="header"><div><strong style="font-size:13px">${d.title}</strong><br/><span style="color:#64748b;font-size:9px">Cliente: ${contact.name} ${contact.surname||''} | Fecha: ${d.date || ''}</span></div></div>
                  ${d.description}
                  <div class="footer">Documento generado — Requiere revisión y firma de técnico cualificado</div>
                  </body></html>`);
                } else {
                  w.document.write(`<!DOCTYPE html><html><head><title>${d.title}</title><style>body{font-family:Arial,sans-serif;padding:20px;font-size:11px}</style></head><body>
                  <h2>${d.title}</h2>
                  <p>Cliente: ${contact.name} ${contact.surname||''}</p>
                  <p>Fecha: ${d.date || ''} | Tipo: ${d.doc_type?.replace(/_/g,' ')}</p>
                  ${d.description ? `<div style="white-space:pre-wrap;margin-top:12px">${d.description}</div>` : ''}
                  ${d.file_url ? `<p><a href="${d.file_url}">Ver archivo adjunto</a></p>` : ''}
                  </body></html>`);
                }
                w.document.close();
              };
              return (
                <Card key={d.id} className="hover:shadow-md">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{d.title}</p>
                        <p className="text-xs text-gray-500">{d.doc_type?.replace(/_/g, ' ')} | {d.date}</p>
                        {!isHtmlDoc && d.description && <p className="text-xs text-gray-400 truncate">{d.description}</p>}
                        {isHtmlDoc && <span className="text-[10px] text-indigo-500 font-medium">📄 Documento HTML generado</span>}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Badge variant="outline" className="text-[10px]">{d.doc_type?.replace(/_/g,' ')}</Badge>
                        <button
                          onClick={() => { if(confirm('¿Eliminar este archivo?')) deleteDocument(d.id); }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-2 border-t pt-2 flex-wrap">
                      {isHtmlDoc && (
                        <button onClick={openDocPreview} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                          <Eye className="w-3 h-3" /> Ver impresión
                        </button>
                      )}
                      {d.file_url && (
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                          <Eye className="w-3 h-3" /> {isHtmlDoc ? 'Adjunto' : 'Ver'}
                        </a>
                      )}
                      <button onClick={() => openEditDoc(d)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-50 text-gray-700 hover:bg-gray-100">
                        <Edit className="w-3 h-3" /> Editar
                      </button>
                      <button onClick={openDocPreview} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-50 text-slate-700 hover:bg-slate-100">
                        <Printer className="w-3 h-3" /> Imprimir
                      </button>
                      <button onClick={() => sendWhatsApp(`Documento: ${d.title} — ${d.doc_type?.replace(/_/g,' ')} del ${d.date}${d.file_url ? '\n' + d.file_url : ''}`)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
                        <MessageCircle className="w-3 h-3" /> WA
                      </button>
                      {contact.email && (
                        <button onClick={() => sendEmail(`Documento: ${d.title}`, `Estimado/a ${contact.name},\n\nLe enviamos el documento: ${d.title}\nTipo: ${d.doc_type?.replace(/_/g,' ')}\nFecha: ${d.date}\n\nAtentamente`)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                          <Send className="w-3 h-3" /> Email
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {documents.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin archivos</p>}
          </div>
        </TabsContent>

        {/* CITAS */}
        <TabsContent value="citas">
          <div className="space-y-3 mt-2">
            <Link to={createPageUrl(`Agenda?contact_id=${contactId}`)}>
              <Button size="sm" className="bg-blue-600"><Plus className="w-4 h-4 mr-1" />Nueva cita</Button>
            </Link>
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
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{n.title}</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{n.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{n.date}</p>
                    </div>
                    <button onClick={() => deleteNote(n.id)} className="text-red-400 hover:text-red-600 ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {notes.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin notas</p>}
          </div>
        </TabsContent>

        {/* LEGALIZACIÓN */}
        <TabsContent value="legalizacion">
          <div className="space-y-3 mt-2">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-sm text-indigo-800">
              <p className="font-medium mb-1">📄 Documentos de Legalización</p>
              <p className="text-xs">Genera certificados, memorias y boletines vinculados a este cliente.</p>
            </div>
            <Link to={createPageUrl(`LegalDocs?contact_id=${contactId}`)}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <FileText className="w-4 h-4 mr-2" />Generar documento de legalización
              </Button>
            </Link>
            {/* Mostrar documentos de legalización guardados */}
            {documents.filter(d => d.title?.startsWith('LEGAL:')).map(d => (
              <Card key={d.id} className="hover:shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{d.title.replace('LEGAL: ', '')}</p>
                      <p className="text-xs text-gray-500">{fmtDate(d.date)}</p>
                    </div>
                    <div className="flex gap-1">
                      <Link to={createPageUrl(`LegalDocs?contact_id=${contactId}`)}>
                        <span className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer">
                          <Edit className="w-3 h-3" />Editar
                        </span>
                      </Link>
                      <button onClick={() => deleteDocument(d.id)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {documents.filter(d => d.title?.startsWith('LEGAL:')).length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">Sin documentos de legalización guardados</p>
            )}
          </div>
        </TabsContent>

        {/* MAQUINARIA */}
        <TabsContent value="maquinaria">
          <ClientMachineTab contactId={contactId} contactName={`${contact.name} ${contact.surname || ''}`.trim()} />
        </TabsContent>

        {/* HISTORIAL DE CAMBIOS */}
        <TabsContent value="historial">
          <ChangeHistoryTab contactId={contactId} />
        </TabsContent>

        {/* PRESUPUESTO IA */}
        <TabsContent value="aibudget">
          <div className="space-y-3 mt-2">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800">
              <p className="font-medium mb-1">🤖 Presupuesto Asistido por IA</p>
              <p className="text-xs">Los presupuestos generados con IA se guardan aquí vinculados a este cliente.</p>
            </div>
            <Link to={createPageUrl(`AIBudget?contact_id=${contactId}`)}>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Bot className="w-4 h-4 mr-2" />Nuevo Presupuesto IA
              </Button>
            </Link>
          </div>
        </TabsContent>

        {/* FOTOS DE EQUIPO INSTALADO */}
        <TabsContent value="fotos_equipo">
          <div className="space-y-3 mt-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              <p className="font-medium mb-1">📸 Fotografías del Equipo Instalado</p>
              <p className="text-xs">Las imágenes se incluirán automáticamente como anexos en los documentos de legalización.</p>
            </div>
            <Button size="sm" className="bg-amber-600" onClick={() => photoUploadRef.current?.click()} disabled={uploading}>
              <Camera className="w-4 h-4 mr-1" />{uploading ? 'Subiendo...' : 'Añadir fotografía'}
            </Button>
            <input ref={photoUploadRef} type="file" accept="image/*" className="hidden" onChange={handleEquipmentPhotoUpload} />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {equipmentPhotos.map(photo => (
                <Card key={photo.id} className="overflow-hidden hover:shadow-lg">
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img src={photo.file_url} alt={photo.title} className="w-full h-full object-cover" />
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs truncate">{photo.title}</p>
                    <p className="text-[10px] text-gray-400">{photo.date}</p>
                    <button
                      onClick={() => deleteEquipmentPhoto(photo.id)}
                      className="mt-1 w-full flex items-center justify-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {equipmentPhotos.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay fotografías del equipo instalado</p>
                <p className="text-xs">Sube imágenes que se adjuntarán automáticamente a los documentos de legalización</p>
              </div>
            )}
          </div>
        </TabsContent>
        {/* DIARIO DE REPARACIONES */}
        <TabsContent value="diario">
          <div className="mt-2">
            <EquipmentDiaryTab contactId={contactId} contactName={`${contact.name} ${contact.surname || ''}`.trim()} />
          </div>
        </TabsContent>

        </Tabs>
        </div>
        );
        }