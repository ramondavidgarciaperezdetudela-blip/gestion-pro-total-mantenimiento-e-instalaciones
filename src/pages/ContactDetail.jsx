import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, Mail, MapPin, Navigation, FileText, Wrench, ClipboardList, StickyNote, FolderOpen, Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';

export default function ContactDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const contactId = urlParams.get('id');
  const [contact, setContact] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [satOrders, setSatOrders] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteDialog, setNoteDialog] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
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
    ]).then(([c, inv, sat, maint, docs, nts]) => {
      setContact(c);
      setInvoices(inv);
      setSatOrders(sat);
      setMaintenance(maint);
      setDocuments(docs);
      setNotes(nts);
    });
  }, [contactId]);

  const saveNote = async () => {
    await base44.entities.ClientNote.create({ ...noteForm, contact_id: contactId, contact_name: contact?.name, date: format(new Date(), 'yyyy-MM-dd') });
    setNoteDialog(false);
    setNoteForm({ title: '', content: '' });
    const nts = await base44.entities.ClientNote.filter({ contact_id: contactId });
    setNotes(nts);
  };

  const openGPS = () => {
    const addr = encodeURIComponent(`${contact.address || ''}, ${contact.city || ''}, ${contact.province || ''}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${addr}`, '_blank');
  };

  if (!contact) return <div className="text-center py-8 text-gray-400">Cargando...</div>;

  return (
    <div className="space-y-4" ref={printRef}>
      <CompanyHeader />
      
      {/* Contact info */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
              {contact.name?.[0] || 'C'}
            </div>
            <div>
              <h1 className="text-xl font-bold">{contact.name} {contact.surname}</h1>
              {contact.company_name && <p className="text-gray-500">{contact.company_name}</p>}
              <div className="flex gap-1 mt-1">
                <Badge variant="outline">{contact.type}</Badge>
                <Badge variant="outline">{contact.category?.replace(/_/g, ' ')}</Badge>
              </div>
            </div>
          </div>
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
          </div>
        </CardContent>
      </Card>

      <PrintButton contentRef={printRef} title={`Ficha ${contact.name}`} />

      <Tabs defaultValue="docs">
        <TabsList className="w-full flex">
          <TabsTrigger value="docs" className="flex-1 text-xs">Documentos</TabsTrigger>
          <TabsTrigger value="sat" className="flex-1 text-xs">SAT</TabsTrigger>
          <TabsTrigger value="maint" className="flex-1 text-xs">Manten.</TabsTrigger>
          <TabsTrigger value="files" className="flex-1 text-xs">Archivos</TabsTrigger>
          <TabsTrigger value="notes" className="flex-1 text-xs">Notas</TabsTrigger>
        </TabsList>

        <TabsContent value="docs">
          <div className="space-y-2">
            <Link to={createPageUrl(`Documents?contact_id=${contactId}`)}>
              <Button size="sm" className="bg-blue-600"><Plus className="w-4 h-4 mr-1" />Nuevo documento</Button>
            </Link>
            {invoices.map(inv => (
              <Card key={inv.id} className="hover:shadow-sm">
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{inv.doc_type} - {inv.doc_number}</p>
                    <p className="text-xs text-gray-500">{inv.date} | {inv.total?.toFixed(2)} €</p>
                  </div>
                  <Badge>{inv.status}</Badge>
                </CardContent>
              </Card>
            ))}
            {invoices.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin documentos</p>}
          </div>
        </TabsContent>

        <TabsContent value="sat">
          <div className="space-y-2">
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

        <TabsContent value="maint">
          <div className="space-y-2">
            {maintenance.map(m => (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <p className="font-medium text-sm">Ficha #{m.sheet_number} - {m.type}</p>
                  <p className="text-xs text-gray-500">{m.date} | {m.equipment_brand} {m.equipment_model}</p>
                </CardContent>
              </Card>
            ))}
            {maintenance.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin fichas</p>}
          </div>
        </TabsContent>

        <TabsContent value="files">
          <div className="space-y-2">
            {documents.map(d => (
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
            {documents.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Sin archivos</p>}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <div className="space-y-2">
            <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-blue-600"><Plus className="w-4 h-4 mr-1" />Nueva nota</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nueva nota</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Input placeholder="Título" value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} />
                  <Textarea placeholder="Contenido..." value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})} rows={5} />
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