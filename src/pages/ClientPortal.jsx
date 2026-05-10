import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Users, FileText, Wrench, CheckCircle, Clock, AlertCircle,
  Download, Send, Eye, Search, Phone, Mail, MessageCircle,
  Euro, TrendingUp, FileCheck, XCircle, Link
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  borrador: 'bg-gray-100 text-gray-600',
  enviado: 'bg-blue-100 text-blue-700',
  pagado: 'bg-green-100 text-green-700',
  vencido: 'bg-red-100 text-red-700',
  cancelado: 'bg-gray-100 text-gray-500',
  pendiente: 'bg-yellow-100 text-yellow-700',
  en_curso: 'bg-blue-100 text-blue-700',
  completada: 'bg-green-100 text-green-700',
};

const DOC_ICONS = {
  factura: <Euro className="w-4 h-4" />,
  presupuesto: <FileText className="w-4 h-4" />,
  recibo: <FileCheck className="w-4 h-4" />,
};

export default function ClientPortal() {
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [satOrders, setSatOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [sendingLink, setSendingLink] = useState(null);
  const [tab, setTab] = useState('resumen');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [c, inv, sat] = await Promise.all([
      base44.entities.Contact.list('name', 500),
      base44.entities.Invoice.list('-date', 500),
      base44.entities.SATOrder.list('-date', 200),
    ]);
    setContacts(c);
    setInvoices(inv);
    setSatOrders(sat);
    setLoading(false);
  };

  const filteredContacts = contacts.filter(c =>
    `${c.name} ${c.surname || ''} ${c.company_name || ''} ${c.phone || ''} ${c.email || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const clientDocs = selectedContact
    ? invoices.filter(i => i.contact_id === selectedContact.id)
    : [];

  const clientSATs = selectedContact
    ? satOrders.filter(s => s.contact_id === selectedContact.id)
    : [];

  const pendingDocs = clientDocs.filter(d => ['enviado', 'vencido'].includes(d.status));
  const pendingBudgets = clientDocs.filter(d => d.doc_type === 'presupuesto' && d.status === 'enviado');

  // Generar enlace público para presupuesto
  const getPresupuestoLink = (doc) => {
    const base = window.location.origin;
    return `${base}/presupuesto-publico?id=${doc.id}`;
  };

  const getSATLink = (sat) => {
    const base = window.location.origin;
    return `${base}/sat-publico?id=${sat.id}`;
  };

  const handleSendDocLink = async (doc) => {
    setSendingLink(doc.id);
    const contact = contacts.find(c => c.id === doc.contact_id);
    const link = doc.doc_type === 'presupuesto' || doc.doc_type === 'factura'
      ? getPresupuestoLink(doc)
      : null;
    if (!link) { setSendingLink(null); return; }

    const docLabel = doc.doc_type === 'presupuesto' ? 'presupuesto' : 'factura';
    const msg = `Hola ${contact?.name || doc.contact_name},\n\nTe enviamos el enlace para ver y ${doc.doc_type === 'presupuesto' ? 'aceptar' : 'descargar'} tu ${docLabel} nº ${doc.doc_number || ''}:\n\n${link}\n\nCualquier duda, estamos a tu disposición.`;

    if (contact?.phone) {
      const phone = contact.phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/34${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else if (contact?.email) {
      window.open(`mailto:${contact.email}?subject=Tu ${docLabel}&body=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(link);
      alert('Enlace copiado al portapapeles');
    }
    setSendingLink(null);
  };

  const handleSendSATLink = async (sat) => {
    const contact = contacts.find(c => c.id === sat.contact_id);
    const link = getSATLink(sat);
    const msg = `Hola ${contact?.name || sat.contact_name},\n\nPuedes ver el estado de tu orden de servicio (SAT):\n\n${link}\n\nGracias por confiar en nosotros.`;
    if (contact?.phone) {
      window.open(`https://wa.me/34${contact.phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(link);
      alert('Enlace copiado al portapapeles');
    }
  };

  // KPIs globales
  const totalPending = invoices.filter(i => i.status === 'enviado').length;
  const totalOverdue = invoices.filter(i => i.status === 'vencido').length;
  const totalBudgetsPending = invoices.filter(i => i.doc_type === 'presupuesto' && i.status === 'enviado').length;
  const totalActiveSATs = satOrders.filter(s => ['pendiente','en_curso'].includes(s.status)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-600" /> Portal de Cliente
        </h1>
        <p className="text-sm text-gray-500">Gestiona el acceso de tus clientes a sus documentos y pedidos</p>
      </div>

      {/* KPIs globales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-blue-50 border-blue-100">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-500 opacity-80" />
            <div><p className="text-2xl font-bold text-blue-700">{totalPending}</p><p className="text-xs text-gray-500">Facturas enviadas</p></div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-500 opacity-80" />
            <div><p className="text-2xl font-bold text-red-700">{totalOverdue}</p><p className="text-xs text-gray-500">Facturas vencidas</p></div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-100">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500 opacity-80" />
            <div><p className="text-2xl font-bold text-yellow-700">{totalBudgetsPending}</p><p className="text-xs text-gray-500">Presupuestos pendientes</p></div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-100">
          <CardContent className="p-4 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-orange-500 opacity-80" />
            <div><p className="text-2xl font-bold text-orange-700">{totalActiveSATs}</p><p className="text-xs text-gray-500">SATs activos</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Panel izquierdo: lista de clientes */}
        <div className="lg:col-span-1 space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" /> Seleccionar cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-9 text-sm"
                  placeholder="Buscar cliente..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                />
              </div>

              <div className="max-h-[60vh] overflow-y-auto space-y-1">
                {filteredContacts.slice(0, 30).map(c => {
                  const cDocs = invoices.filter(i => i.contact_id === c.id);
                  const cPending = cDocs.filter(i => ['enviado','vencido'].includes(i.status)).length;
                  const cSATs = satOrders.filter(s => s.contact_id === c.id && ['pendiente','en_curso'].includes(s.status)).length;
                  const isSelected = selectedContact?.id === c.id;

                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedContact(c); setTab('documentos'); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-start gap-2 ${isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-gray-50 border border-transparent'}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
                        {(c.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{c.name} {c.surname || ''}</p>
                        {c.company_name && <p className="text-xs text-gray-400 truncate">{c.company_name}</p>}
                        <div className="flex gap-1.5 mt-0.5">
                          {cPending > 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-medium">{cPending} doc.</span>}
                          {cSATs > 0 && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 rounded-full font-medium">{cSATs} SAT</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-6">Sin resultados</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel derecho: detalle del cliente */}
        <div className="lg:col-span-2">
          {!selectedContact ? (
            <Card className="h-full">
              <CardContent className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-medium">Selecciona un cliente</p>
                <p className="text-sm mt-1">para ver sus documentos, facturas y órdenes de servicio</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Ficha del cliente */}
              <Card>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl flex-shrink-0">
                    {(selectedContact.name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900">{selectedContact.name} {selectedContact.surname || ''}</h2>
                    {selectedContact.company_name && <p className="text-sm text-gray-500">{selectedContact.company_name}</p>}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {selectedContact.phone && (
                        <a href={`tel:${selectedContact.phone}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                          <Phone className="w-3.5 h-3.5" />{selectedContact.phone}
                        </a>
                      )}
                      {selectedContact.email && (
                        <a href={`mailto:${selectedContact.email}`} className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
                          <Mail className="w-3.5 h-3.5" />{selectedContact.email}
                        </a>
                      )}
                      {selectedContact.phone && (
                        <a href={`https://wa.me/34${selectedContact.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700">
                          <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{clientDocs.length} docs · {clientSATs.length} SATs</p>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs */}
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="documentos" className="flex-1">
                    <FileText className="w-3.5 h-3.5 mr-1" />
                    Docs ({clientDocs.length})
                  </TabsTrigger>
                  <TabsTrigger value="sat" className="flex-1">
                    <Wrench className="w-3.5 h-3.5 mr-1" />
                    SATs ({clientSATs.length})
                  </TabsTrigger>
                  <TabsTrigger value="enlaces" className="flex-1">
                    <Link className="w-3.5 h-3.5 mr-1" />
                    Enviar acceso
                  </TabsTrigger>
                </TabsList>

                {/* DOCUMENTOS */}
                <TabsContent value="documentos" className="space-y-2 pt-2">
                  {clientDocs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay documentos para este cliente</p>
                    </div>
                  ) : (
                    clientDocs.map(doc => (
                      <Card key={doc.id} className={`border-l-4 ${doc.status === 'vencido' ? 'border-l-red-400' : doc.status === 'pagado' ? 'border-l-green-400' : doc.doc_type === 'presupuesto' ? 'border-l-yellow-400' : 'border-l-blue-400'}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${doc.doc_type === 'factura' ? 'bg-blue-50 text-blue-600' : doc.doc_type === 'presupuesto' ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                              {DOC_ICONS[doc.doc_type] || <FileText className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm capitalize">{doc.doc_type}</span>
                                <span className="text-xs text-gray-400 font-mono">#{doc.doc_number || '—'}</span>
                                <Badge className={`text-[10px] ${STATUS_COLORS[doc.status] || 'bg-gray-100 text-gray-600'}`}>{doc.status}</Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-sm font-bold text-gray-800">{doc.total != null ? `${Number(doc.total).toFixed(2)} €` : '—'}</span>
                                <span className="text-xs text-gray-400">{doc.date}</span>
                                {doc.due_date && <span className="text-xs text-gray-400">Vence: {doc.due_date}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setPreviewDoc(doc)}
                              >
                                <Eye className="w-3 h-3" />Ver
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50"
                                disabled={sendingLink === doc.id}
                                onClick={() => handleSendDocLink(doc)}
                              >
                                <Send className="w-3 h-3" />Enviar
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* SATs */}
                <TabsContent value="sat" className="space-y-2 pt-2">
                  {clientSATs.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay órdenes de servicio para este cliente</p>
                    </div>
                  ) : (
                    clientSATs.map(sat => (
                      <Card key={sat.id} className={`border-l-4 ${sat.status === 'completada' ? 'border-l-green-400' : sat.status === 'en_curso' ? 'border-l-blue-400' : sat.priority === 'urgente' ? 'border-l-red-400' : 'border-l-yellow-400'}`}>
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">SAT #{sat.order_number || sat.id?.slice(-6)}</span>
                                <Badge className={`text-[10px] ${STATUS_COLORS[sat.status] || 'bg-gray-100 text-gray-600'}`}>{sat.status}</Badge>
                                {sat.priority === 'urgente' && <Badge className="text-[10px] bg-red-100 text-red-700">Urgente</Badge>}
                              </div>
                              <p className="text-sm text-gray-700 mt-0.5 line-clamp-1">{sat.description || sat.type}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{sat.date} · {sat.type}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1 text-green-700 border-green-200 hover:bg-green-50 flex-shrink-0"
                              onClick={() => handleSendSATLink(sat)}
                            >
                              <Send className="w-3 h-3" />Enviar estado
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* ENLACES */}
                <TabsContent value="enlaces" className="pt-2">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                        <h3 className="font-semibold text-indigo-800 mb-2 flex items-center gap-2">
                          <Link className="w-4 h-4" />Cómo funciona el acceso sin registro
                        </h3>
                        <ul className="text-sm text-indigo-700 space-y-1.5">
                          <li>✅ El cliente recibe un enlace único por WhatsApp o email</li>
                          <li>✅ Puede ver, descargar y aceptar/rechazar presupuestos</li>
                          <li>✅ Puede ver el estado de sus órdenes SAT</li>
                          <li>✅ No necesita crear cuenta ni contraseña</li>
                        </ul>
                      </div>

                      {pendingBudgets.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Presupuestos pendientes de aceptar:</p>
                          {pendingBudgets.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-2">
                              <div>
                                <span className="text-sm font-medium">Presupuesto #{doc.doc_number || '—'}</span>
                                <span className="text-xs text-gray-500 ml-2">{doc.total != null ? `${Number(doc.total).toFixed(2)} €` : ''}</span>
                              </div>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-yellow-600 hover:bg-yellow-700 gap-1"
                                onClick={() => handleSendDocLink(doc)}
                              >
                                <Send className="w-3 h-3" />Enviar enlace
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {pendingDocs.filter(d => d.doc_type === 'factura').length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Facturas pendientes de pago:</p>
                          {pendingDocs.filter(d => d.doc_type === 'factura').map(doc => (
                            <div key={doc.id} className="flex items-center justify-between gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
                              <div>
                                <span className="text-sm font-medium">Factura #{doc.doc_number || '—'}</span>
                                <span className="text-xs text-gray-500 ml-2">{doc.total != null ? `${Number(doc.total).toFixed(2)} €` : ''}</span>
                                {doc.status === 'vencido' && <Badge className="ml-2 text-[10px] bg-red-100 text-red-700">Vencida</Badge>}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleSendDocLink(doc)}
                              >
                                <Send className="w-3 h-3" />Enviar
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {pendingBudgets.length === 0 && pendingDocs.filter(d => d.doc_type === 'factura').length === 0 && (
                        <div className="text-center py-6 text-gray-400">
                          <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No hay documentos pendientes de enviar a este cliente</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* Dialog preview documento */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {previewDoc && DOC_ICONS[previewDoc.doc_type]}
              {previewDoc?.doc_type} #{previewDoc?.doc_number || '—'}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Cliente</p>
                  <p className="font-semibold text-sm">{previewDoc.contact_name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Fecha</p>
                  <p className="font-semibold text-sm">{previewDoc.date}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Estado</p>
                  <Badge className={STATUS_COLORS[previewDoc.status]}>{previewDoc.status}</Badge>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="font-bold text-lg text-emerald-700">{previewDoc.total != null ? `${Number(previewDoc.total).toFixed(2)} €` : '—'}</p>
                </div>
              </div>

              {previewDoc.items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">Líneas ({previewDoc.items.length})</p>
                  <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                    {previewDoc.items.map((item, i) => (
                      <div key={i} className="flex justify-between px-3 py-1.5 text-xs">
                        <span className="text-gray-700 flex-1 truncate">{item.description}</span>
                        <span className="font-semibold text-gray-900 ml-2">{item.total != null ? `${Number(item.total).toFixed(2)} €` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-600 font-semibold mb-1">Enlace para el cliente:</p>
                <p className="text-xs font-mono text-indigo-800 break-all">{getPresupuestoLink(previewDoc)}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                  onClick={() => { handleSendDocLink(previewDoc); setPreviewDoc(null); }}
                >
                  <Send className="w-4 h-4" />Enviar por WhatsApp / Email
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => { navigator.clipboard.writeText(getPresupuestoLink(previewDoc)); }}
                >
                  <Link className="w-4 h-4" />Copiar enlace
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}