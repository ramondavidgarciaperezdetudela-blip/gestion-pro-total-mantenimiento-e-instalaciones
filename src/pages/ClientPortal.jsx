import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, MessageSquare, Send, Search, Phone, Mail,
  FileText, Wrench, Plus, Eye, Clock, CheckCircle, AlertCircle,
  MessageCircle, Star
} from 'lucide-react';
import { format } from 'date-fns';

// Entity: ClientMessage (se crea on-the-fly si no existe)
const CHANNELS = ['whatsapp', 'email', 'sms', 'portal', 'telefono'];
const MSG_TYPES = ['consulta', 'incidencia', 'solicitud_presupuesto', 'reclamacion', 'felicitacion', 'otro'];
const STATUS_COLORS = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_proceso: 'bg-blue-100 text-blue-700',
  resuelto: 'bg-green-100 text-green-700',
  cerrado: 'bg-gray-100 text-gray-600',
};

export default function ClientPortal() {
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [msgDialog, setMsgDialog] = useState(false);
  const [viewMsg, setViewMsg] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterChannel, setFilterChannel] = useState('all');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [msgForm, setMsgForm] = useState({
    contact_id: '', contact_name: '', contact_phone: '', contact_email: '',
    channel: 'whatsapp', type: 'consulta', subject: '', content: '',
    response: '', status: 'pendiente', priority: 'normal', date: format(new Date(), 'yyyy-MM-dd'),
    internal_notes: '',
  });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const [c, msgs] = await Promise.all([
      base44.entities.Contact.list('name', 500),
      base44.entities.ClientNote.list('-created_date', 200),
    ]);
    setContacts(c);
    // Usamos ClientNote como registro de comunicaciones
    setMessages(msgs.filter(m => m.title?.startsWith('[PORTAL]')));
  };

  const filteredContacts = contacts.filter(c =>
    `${c.name} ${c.surname || ''} ${c.company_name || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const handleSelectContact = (c) => {
    setSelectedContact(c);
    setMsgForm(prev => ({
      ...prev,
      contact_id: c.id,
      contact_name: `${c.name} ${c.surname || ''}`.trim(),
      contact_phone: c.phone || '',
      contact_email: c.email || '',
    }));
    setContactSearch('');
    setShowContactSearch(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const title = `[PORTAL] ${msgForm.type} — ${msgForm.subject || msgForm.channel}`;
    const content = JSON.stringify(msgForm);
    if (msgForm.contact_id) {
      await base44.entities.ClientNote.create({
        contact_id: msgForm.contact_id,
        contact_name: msgForm.contact_name,
        title,
        content,
        date: msgForm.date,
      });
    }
    setSaving(false);
    setMsgDialog(false);
    setMsgForm({ contact_id: '', contact_name: '', contact_phone: '', contact_email: '', channel: 'whatsapp', type: 'consulta', subject: '', content: '', response: '', status: 'pendiente', priority: 'normal', date: format(new Date(), 'yyyy-MM-dd'), internal_notes: '' });
    setSelectedContact(null);
    loadAll();
  };

  const generateAIResponse = async (msg) => {
    setAiLoading(true);
    const data = typeof msg.content === 'string' ? (()=>{ try { return JSON.parse(msg.content); } catch { return { content: msg.content }; } })() : msg.content;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres el asistente de atención al cliente de una empresa de climatización y electricidad en España.
El cliente "${data.contact_name || 'Cliente'}" ha enviado la siguiente comunicación:
Tipo: ${data.type || 'consulta'}
Asunto: ${data.subject || ''}
Mensaje: ${data.content || ''}

Redacta una respuesta profesional, cordial y concisa en español. Máximo 3 párrafos.`,
    });
    // Actualizar respuesta en el mensaje abierto
    setViewMsg(prev => ({ ...prev, aiResponse: result }));
    setAiLoading(false);
  };

  const sendWhatsAppResponse = (msg, response) => {
    const data = (() => { try { return JSON.parse(msg.content); } catch { return {}; } })();
    const phone = data.contact_phone?.replace(/[^0-9]/g, '') || '';
    const text = encodeURIComponent(response || data.response || '');
    const url = phone ? `https://wa.me/34${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const sendEmailResponse = (msg, response) => {
    const data = (() => { try { return JSON.parse(msg.content); } catch { return {}; } })();
    if (!data.contact_email) return alert('No hay email del cliente');
    const subject = encodeURIComponent(`Re: ${data.subject || 'Comunicación'}`);
    const body = encodeURIComponent(response || data.response || '');
    window.open(`mailto:${data.contact_email}?subject=${subject}&body=${body}`, '_blank');
  };

  const parseMsg = (msg) => {
    try { return JSON.parse(msg.content); } catch { return { content: msg.content, type: 'consulta', channel: 'portal', status: 'pendiente' }; }
  };

  const filtered = messages.filter(m => {
    const d = parseMsg(m);
    const matchSearch = `${m.contact_name} ${d.subject || ''} ${d.content || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || d.status === filterStatus;
    const matchChannel = filterChannel === 'all' || d.channel === filterChannel;
    return matchSearch && matchStatus && matchChannel;
  });

  // Stats
  const pendientes = messages.filter(m => { const d = parseMsg(m); return d.status === 'pendiente'; }).length;
  const resueltos = messages.filter(m => { const d = parseMsg(m); return d.status === 'resuelto'; }).length;

  // Contacts with recent activity
  const activeContacts = contacts
    .filter(c => messages.some(m => m.contact_id === c.id))
    .slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" /> Portal Cliente y Comunicación
        </h1>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => { setMsgDialog(true); setSelectedContact(null); }}>
          <Plus className="w-4 h-4 mr-1" />Nueva comunicación
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="bg-indigo-50"><CardContent className="p-3 flex items-center gap-3">
          <MessageSquare className="w-7 h-7 text-indigo-600 opacity-70" />
          <div><p className="text-2xl font-bold text-indigo-700">{messages.length}</p><p className="text-xs text-gray-500">Total mensajes</p></div>
        </CardContent></Card>
        <Card className="bg-yellow-50"><CardContent className="p-3 flex items-center gap-3">
          <Clock className="w-7 h-7 text-yellow-600 opacity-70" />
          <div><p className="text-2xl font-bold text-yellow-700">{pendientes}</p><p className="text-xs text-gray-500">Pendientes</p></div>
        </CardContent></Card>
        <Card className="bg-green-50"><CardContent className="p-3 flex items-center gap-3">
          <CheckCircle className="w-7 h-7 text-green-600 opacity-70" />
          <div><p className="text-2xl font-bold text-green-700">{resueltos}</p><p className="text-xs text-gray-500">Resueltos</p></div>
        </CardContent></Card>
        <Card className="bg-blue-50"><CardContent className="p-3 flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-600 opacity-70" />
          <div><p className="text-2xl font-bold text-blue-700">{activeContacts.length}</p><p className="text-xs text-gray-500">Clientes activos</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="mensajes">
        <TabsList>
          <TabsTrigger value="mensajes">Comunicaciones ({filtered.length})</TabsTrigger>
          <TabsTrigger value="clientes">Clientes con actividad</TabsTrigger>
        </TabsList>

        {/* ===== MENSAJES ===== */}
        <TabsContent value="mensajes" className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-36">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En proceso</SelectItem>
                <SelectItem value="resuelto">Resuelto</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos canales</SelectItem>
                {CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No hay comunicaciones registradas</p>
              <p className="text-xs mt-1">Registra el contacto con un cliente usando el botón de arriba</p>
            </div>
          )}
          <div className="space-y-2">
            {filtered.map(msg => {
              const d = parseMsg(msg);
              return (
                <Card key={msg.id} className={`border-l-4 ${d.priority === 'urgente' ? 'border-l-red-500' : d.channel === 'whatsapp' ? 'border-l-green-400' : d.channel === 'email' ? 'border-l-blue-400' : 'border-l-gray-300'}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{msg.contact_name}</span>
                          <Badge className={STATUS_COLORS[d.status] || 'bg-gray-100 text-gray-600'}>{d.status}</Badge>
                          <Badge variant="outline" className="text-xs">{d.channel}</Badge>
                          <Badge variant="outline" className="text-xs">{d.type?.replace(/_/g,' ')}</Badge>
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5 font-medium">{d.subject || '—'}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{d.content}</p>
                        <p className="text-xs text-gray-400 mt-1">{msg.date}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={() => setViewMsg({ ...msg, parsed: d })}>
                        <Eye className="w-3 h-3 mr-1" />Ver
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ===== CLIENTES ===== */}
        <TabsContent value="clientes" className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeContacts.map(c => {
              const clientMsgs = messages.filter(m => m.contact_id === c.id);
              const pending = clientMsgs.filter(m => parseMsg(m).status === 'pendiente').length;
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">{c.name} {c.surname}</p>
                        {c.company_name && <p className="text-xs text-gray-500">{c.company_name}</p>}
                        <p className="text-xs text-gray-500 mt-1">{clientMsgs.length} comunicaciones · {pending > 0 && <span className="text-yellow-600 font-medium">{pending} pendientes</span>}</p>
                      </div>
                      <div className="flex gap-1">
                        {c.phone && (
                          <a href={`tel:${c.phone}`} className="p-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="p-1.5 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                            <Mail className="w-4 h-4" />
                          </a>
                        )}
                        {c.phone && (
                          <a href={`https://wa.me/34${c.phone?.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100">
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {activeContacts.length === 0 && (
              <div className="col-span-2 text-center py-10 text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No hay clientes con comunicaciones registradas</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOG NUEVA COMUNICACIÓN ===== */}
      <Dialog open={msgDialog} onOpenChange={o => { setMsgDialog(o); if (!o) setSelectedContact(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar comunicación</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Búsqueda de cliente */}
            {selectedContact ? (
              <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{selectedContact.name} {selectedContact.surname}</p>
                  <p className="text-xs text-gray-500">{selectedContact.phone} · {selectedContact.email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setSelectedContact(null); setMsgForm(prev => ({ ...prev, contact_id: '', contact_name: '', contact_phone: '', contact_email: '' })); }}>Cambiar</Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Buscar cliente..." value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setShowContactSearch(true); }}
                  onFocus={() => setShowContactSearch(true)} />
                {showContactSearch && contactSearch && (
                  <div className="absolute z-20 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredContacts.slice(0, 8).map(c => (
                      <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm" onClick={() => handleSelectContact(c)}>
                        <p className="font-medium">{c.name} {c.surname}</p>
                        <p className="text-xs text-gray-400">{c.phone} {c.company_name && `· ${c.company_name}`}</p>
                      </button>
                    ))}
                    {filteredContacts.length === 0 && <p className="p-3 text-sm text-gray-400">No encontrado</p>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Input placeholder="Nombre cliente (sin buscar)" value={msgForm.contact_name} onChange={e => setMsgForm({ ...msgForm, contact_name: e.target.value })} />
                  <Input placeholder="Teléfono" value={msgForm.contact_phone} onChange={e => setMsgForm({ ...msgForm, contact_phone: e.target.value })} />
                </div>
                <Input className="mt-2" placeholder="Email" value={msgForm.contact_email} onChange={e => setMsgForm({ ...msgForm, contact_email: e.target.value })} />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <Select value={msgForm.channel} onValueChange={v => setMsgForm({ ...msgForm, channel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={msgForm.type} onValueChange={v => setMsgForm({ ...msgForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MSG_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={msgForm.priority} onValueChange={v => setMsgForm({ ...msgForm, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Estado</label>
                <Select value={msgForm.status} onValueChange={v => setMsgForm({ ...msgForm, status: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="resuelto">Resuelto</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Fecha</label>
                <Input type="date" className="mt-1" value={msgForm.date} onChange={e => setMsgForm({ ...msgForm, date: e.target.value })} />
              </div>
            </div>

            <Input placeholder="Asunto" value={msgForm.subject} onChange={e => setMsgForm({ ...msgForm, subject: e.target.value })} />
            <Textarea placeholder="Contenido del mensaje / comunicación del cliente..." value={msgForm.content} onChange={e => setMsgForm({ ...msgForm, content: e.target.value })} rows={3} />
            <Textarea placeholder="Respuesta / acción tomada..." value={msgForm.response} onChange={e => setMsgForm({ ...msgForm, response: e.target.value })} rows={3} />
            <Textarea placeholder="Notas internas (no visibles al cliente)" value={msgForm.internal_notes} onChange={e => setMsgForm({ ...msgForm, internal_notes: e.target.value })} rows={2} />

            <Button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600">
              {saving ? 'Guardando...' : 'Guardar comunicación'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG VER MENSAJE ===== */}
      <Dialog open={!!viewMsg} onOpenChange={() => setViewMsg(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Comunicación</DialogTitle></DialogHeader>
          {viewMsg && (() => {
            const d = viewMsg.parsed || parseMsg(viewMsg);
            return (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{viewMsg.contact_name}</span>
                  <Badge className={STATUS_COLORS[d.status] || ''}>{d.status}</Badge>
                  <Badge variant="outline">{d.channel}</Badge>
                  <Badge variant="outline">{d.type?.replace(/_/g,' ')}</Badge>
                </div>
                {d.subject && <p className="font-medium text-gray-800">{d.subject}</p>}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Mensaje del cliente</p>
                  <p className="text-sm whitespace-pre-wrap">{d.content}</p>
                </div>
                {d.response && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-400 mb-1">Respuesta enviada</p>
                    <p className="text-sm whitespace-pre-wrap">{d.response}</p>
                  </div>
                )}
                {viewMsg.aiResponse && (
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
                    <p className="text-xs text-indigo-500 mb-1">🤖 Respuesta sugerida por IA</p>
                    <p className="text-sm whitespace-pre-wrap">{viewMsg.aiResponse}</p>
                  </div>
                )}
                {d.internal_notes && (
                  <div className="bg-amber-50 rounded-lg p-2">
                    <p className="text-xs text-amber-600 font-medium">Notas internas</p>
                    <p className="text-xs mt-1">{d.internal_notes}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1 border-t">
                  <Button size="sm" variant="outline" className="text-indigo-600 gap-1" onClick={() => generateAIResponse(viewMsg)} disabled={aiLoading}>
                    {aiLoading ? '⏳ Generando...' : '🤖 Generar respuesta IA'}
                  </Button>
                  {d.contact_phone && (
                    <Button size="sm" variant="outline" className="text-green-700 gap-1" onClick={() => sendWhatsAppResponse(viewMsg, viewMsg.aiResponse || d.response)}>
                      <Phone className="w-3 h-3" />WhatsApp
                    </Button>
                  )}
                  {d.contact_email && (
                    <Button size="sm" variant="outline" className="text-blue-700 gap-1" onClick={() => sendEmailResponse(viewMsg, viewMsg.aiResponse || d.response)}>
                      <Mail className="w-3 h-3" />Email
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}