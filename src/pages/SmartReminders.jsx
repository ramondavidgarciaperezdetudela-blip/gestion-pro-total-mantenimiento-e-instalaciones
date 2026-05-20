import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  Bell, AlertTriangle, Clock, CheckCircle, FileText, Wrench,
  ClipboardList, Users, Mail, MessageCircle, Zap, RefreshCw,
  Calendar, Package, FolderOpen, Bot
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function SmartReminders() {
  const [data, setData] = useState({ invoices: [], sat: [], maintenance: [], appointments: [], projects: [], stock: [], contacts: [] });
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [contacts, setContacts] = useState([]);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [invoices, sat, maintenance, appointments, projects, stock, cts] = await Promise.all([
      base44.entities.Invoice.list('-date', 500),
      base44.entities.SATOrder.list('-date', 500),
      base44.entities.MaintenanceSheet.list('-date', 500),
      base44.entities.Appointment.list('-date', 200),
      base44.entities.Project.list('-created_date', 200),
      base44.entities.StockItem.list('name', 300),
      base44.entities.Contact.list('name', 500),
    ]);
    setData({ invoices, sat, maintenance, appointments, projects, stock, contacts: cts });
    setContacts(cts);
    setLoading(false);
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const now = new Date();

  // ─── ANÁLISIS AUTOMÁTICO ────────────────────────────────────────────────────

  // Facturas vencidas
  const factVencidas = data.invoices.filter(i => i.status === 'enviado' && i.due_date && i.due_date < today);
  // Facturas próximas a vencer (≤14 días)
  const factProximas = data.invoices.filter(i => i.status === 'enviado' && i.due_date && i.due_date >= today && differenceInDays(parseISO(i.due_date), now) <= 14);
  // SAT pendientes / urgentes
  const satPendientes = data.sat.filter(o => o.status === 'pendiente');
  const satUrgentes = data.sat.filter(o => o.priority === 'urgente' && o.status !== 'completada');
  // Mantenimientos sin fecha de revisión o antiguos (>365 días)
  const maintAntigu = data.maintenance.filter(m => {
    if (!m.date) return false;
    return differenceInDays(now, parseISO(m.date)) > 365;
  });
  // Citas de hoy y mañana
  const aptHoy = data.appointments.filter(a => a.date === today);
  const aptManana = data.appointments.filter(a => {
    const tom = format(new Date(now.getTime() + 86400000), 'yyyy-MM-dd');
    return a.date === tom;
  });
  // Proyectos vencidos
  const projVencidos = data.projects.filter(p => p.end_date && p.end_date < today && !['completado', 'cancelado'].includes(p.status));
  // Stock bajo mínimo
  const stockBajo = data.stock.filter(s => s.min_stock > 0 && s.quantity <= s.min_stock);
  // Clientes morosos / mal pagadores
  const clientesMorosos = data.contacts.filter(c => ['moroso', 'mal_pagador'].includes(c.payment_profile) && c.pending_amount > 0);

  const totalAlertas = factVencidas.length + satUrgentes.length + projVencidos.length + clientesMorosos.length;
  const totalAvisos = factProximas.length + satPendientes.length + maintAntigu.length + stockBajo.length;

  const getContact = (contactId) => contacts.find(c => c.id === contactId);

  const sendWhatsApp = (phone, text) => {
    const p = phone?.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(text);
    window.open(p ? `https://wa.me/34${p}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const sendEmail = (email, subject, body) => {
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const generateAISummary = async () => {
    setAiLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres el asistente de gestión de una empresa de instalaciones técnicas. Analiza la situación actual y da un resumen ejecutivo con prioridades.

ALERTAS URGENTES:
- Facturas vencidas sin cobrar: ${factVencidas.length} (${factVencidas.reduce((s,i)=>s+(i.total||0),0).toFixed(0)} €)
- Órdenes SAT urgentes: ${satUrgentes.length}
- Proyectos vencidos: ${projVencidos.length}
- Clientes morosos con deuda: ${clientesMorosos.length}

AVISOS IMPORTANTES:
- Facturas próximas a vencer (≤14 días): ${factProximas.length} (${factProximas.reduce((s,i)=>s+(i.total||0),0).toFixed(0)} €)
- SAT pendientes: ${satPendientes.length}
- Mantenimientos antiguos (>1 año): ${maintAntigu.length}
- Stock bajo mínimo: ${stockBajo.length} artículos

HOY: ${aptHoy.length} citas | Mañana: ${aptManana.length} citas

Genera un resumen ejecutivo en español con:
1. Situación actual (semáforo: 🔴/🟡/🟢)
2. Top 3 acciones urgentes
3. Recomendaciones de gestión
Máximo 300 palabras, usa bullet points.`,
    });
    setAiSummary(res);
    setAiLoading(false);
  };

  const AlertRow = ({ icon: Icon, color, title, sub, badge, badgeColor, page, phone, email, waText, emailSubject, emailBody }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${color} bg-white hover:shadow-sm transition-shadow`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
        {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
        {badge && <Badge className={`text-[10px] ${badgeColor}`}>{badge}</Badge>}
        {phone && waText && (
          <button onClick={() => sendWhatsApp(phone, waText)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="WhatsApp">
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
        )}
        {email && emailSubject && (
          <button onClick={() => sendEmail(email, emailSubject, emailBody || '')} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Email">
            <Mail className="w-3.5 h-3.5" />
          </button>
        )}
        {page && (
          <Link to={createPageUrl(page)}>
            <button className="p-1 text-gray-400 hover:text-gray-600 rounded" title="Ver">
              <Zap className="w-3.5 h-3.5" />
            </button>
          </Link>
        )}
      </div>
    </div>
  );

  if (loading) return <div className="text-center py-16 text-gray-400"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" /><p>Analizando datos...</p></div>;

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Recordatorios Inteligentes</h1>
            <p className="text-sm text-gray-500">Análisis automático de toda la gestión</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadAll}><RefreshCw className="w-4 h-4 mr-1" />Actualizar</Button>
          <Button size="sm" onClick={generateAISummary} disabled={aiLoading} className="bg-purple-600 hover:bg-purple-700 gap-1">
            {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            Resumen IA
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{totalAlertas}</p>
            <p className="text-xs text-red-500">🔴 Alertas urgentes</p>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{totalAvisos}</p>
            <p className="text-xs text-orange-500">🟡 Avisos importantes</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{aptHoy.length}</p>
            <p className="text-xs text-blue-500">📅 Citas hoy</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{factProximas.reduce((s,i)=>s+(i.total||0),0).toFixed(0)} €</p>
            <p className="text-xs text-green-500">💶 Pendiente cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* IA Summary */}
      {aiSummary && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1"><Bot className="w-3.5 h-3.5" />Resumen IA ejecutivo</p>
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="urgentes">
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="urgentes" className="flex-1 text-xs">🔴 Urgentes ({totalAlertas})</TabsTrigger>
          <TabsTrigger value="facturas" className="flex-1 text-xs">💶 Facturas ({factVencidas.length + factProximas.length})</TabsTrigger>
          <TabsTrigger value="sat" className="flex-1 text-xs">🔧 SAT ({satPendientes.length})</TabsTrigger>
          <TabsTrigger value="agenda" className="flex-1 text-xs">📅 Agenda ({aptHoy.length + aptManana.length})</TabsTrigger>
          <TabsTrigger value="otros" className="flex-1 text-xs">📋 Otros ({maintAntigu.length + stockBajo.length + projVencidos.length})</TabsTrigger>
        </TabsList>

        {/* URGENTES */}
        <TabsContent value="urgentes" className="space-y-2 pt-3">
          {totalAlertas === 0 && <div className="text-center py-10 text-gray-400"><CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" /><p>¡Sin alertas urgentes!</p></div>}
          {factVencidas.map(i => {
            const c = getContact(i.contact_id);
            return <AlertRow key={i.id} icon={AlertTriangle} color="border-l-red-500 bg-red-50" title={`Factura vencida: ${i.contact_name}`} sub={`${i.doc_number} · ${i.total?.toFixed(2)} € · Vencida: ${i.due_date}`} badge="VENCIDA" badgeColor="bg-red-100 text-red-700" page="Documents" phone={c?.phone} waText={`Estimado/a ${i.contact_name}, le recordamos que la factura Nº${i.doc_number} por importe de ${i.total?.toFixed(2)} € está pendiente de pago. Por favor, contacte con nosotros. Gracias.`} email={c?.email} emailSubject={`Factura Nº${i.doc_number} pendiente de pago`} emailBody={`Estimado/a ${i.contact_name},\n\nLe recordamos que la factura Nº${i.doc_number} por importe de ${i.total?.toFixed(2)} € con fecha de vencimiento ${i.due_date} está pendiente de pago.\n\nRuegamos atienda este pago a la mayor brevedad.\n\nAtentamente`} />;
          })}
          {satUrgentes.map(o => {
            const c = getContact(o.contact_id);
            return <AlertRow key={o.id} icon={AlertTriangle} color="border-l-red-500 bg-red-50" title={`SAT URGENTE: ${o.contact_name}`} sub={`#${o.order_number} · ${o.type} · ${o.description?.slice(0, 60) || ''}`} badge="URGENTE" badgeColor="bg-red-100 text-red-700" page={`SAT?view=${o.id}`} phone={c?.phone} waText={`Hola ${o.contact_name}, le confirmamos que hemos recibido su solicitud urgente y un técnico se pondrá en contacto con usted a la brevedad. SAT #${o.order_number}.`} email={c?.email} emailSubject={`Orden SAT urgente #${o.order_number}`} emailBody={`Estimado/a ${o.contact_name},\n\nHemos recibido su solicitud urgente (SAT #${o.order_number}).\nNuestro equipo técnico se pondrá en contacto con usted a la mayor brevedad.\n\nAtentamente`} />;
          })}
          {projVencidos.map(p => (
            <AlertRow key={p.id} icon={FolderOpen} color="border-l-red-400 bg-red-50" title={`Proyecto vencido: ${p.name}`} sub={`Cliente: ${p.contact_name || '-'} · Vencido: ${p.end_date} · Estado: ${p.status}`} badge="VENCIDO" badgeColor="bg-red-100 text-red-700" page="Projects" />
          ))}
          {clientesMorosos.map(c => (
            <AlertRow key={c.id} icon={Users} color="border-l-red-400 bg-red-50" title={`${c.name} ${c.surname || ''} — Deuda pendiente`} sub={`${c.company_name || ''} · ${c.payment_profile} · Pendiente: ${c.pending_amount?.toFixed(2)} €`} badge={`${c.pending_amount?.toFixed(0)} €`} badgeColor="bg-red-100 text-red-700" page={`ContactDetail?id=${c.id}`} phone={c.phone} waText={`Estimado/a ${c.name}, le contactamos respecto al importe pendiente de ${c.pending_amount?.toFixed(2)} €. Por favor, contacte con nosotros para regularizar su situación.`} email={c.email} emailSubject="Importe pendiente de pago" emailBody={`Estimado/a ${c.name},\n\nNos ponemos en contacto para informarle que existe un importe pendiente de ${c.pending_amount?.toFixed(2)} € en su cuenta.\n\nRogamos contacte con nosotros para regularizar la situación.\n\nAtentamente`} />
          ))}
        </TabsContent>

        {/* FACTURAS */}
        <TabsContent value="facturas" className="space-y-3 pt-3">
          {factVencidas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2">🔴 VENCIDAS ({factVencidas.length}) — {factVencidas.reduce((s,i)=>s+(i.total||0),0).toFixed(0)} €</p>
              <div className="space-y-2">
                {factVencidas.map(i => {
                  const c = getContact(i.contact_id);
                  const days = differenceInDays(now, parseISO(i.due_date));
                  return <AlertRow key={i.id} icon={FileText} color="border-l-red-500 bg-red-50" title={`${i.contact_name} — ${i.doc_number}`} sub={`${i.total?.toFixed(2)} € · Vencida hace ${days} días`} badge={`${days}d vencida`} badgeColor="bg-red-100 text-red-700" page="Documents" phone={c?.phone} waText={`Recordatorio de pago: Factura Nº${i.doc_number} por ${i.total?.toFixed(2)} € vencida el ${i.due_date}. Por favor, contacte con nosotros.`} email={c?.email} emailSubject={`Recordatorio: Factura ${i.doc_number} pendiente`} emailBody={`Estimado/a ${i.contact_name},\n\nLe recordamos el pago pendiente de la factura ${i.doc_number} por importe de ${i.total?.toFixed(2)} €.\n\nFecha de vencimiento: ${i.due_date}\n\nPor favor, proceda al pago o contacte con nosotros.\n\nAtentamente`} />;
                })}
              </div>
            </div>
          )}
          {factProximas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-600 mb-2">🟡 PRÓXIMAS A VENCER ({factProximas.length}) — {factProximas.reduce((s,i)=>s+(i.total||0),0).toFixed(0)} €</p>
              <div className="space-y-2">
                {factProximas.map(i => {
                  const c = getContact(i.contact_id);
                  const days = differenceInDays(parseISO(i.due_date), now);
                  return <AlertRow key={i.id} icon={Clock} color="border-l-orange-400 bg-orange-50" title={`${i.contact_name} — ${i.doc_number}`} sub={`${i.total?.toFixed(2)} € · Vence en ${days} días (${i.due_date})`} badge={`${days}d`} badgeColor="bg-orange-100 text-orange-700" page="Documents" phone={c?.phone} waText={`Estimado/a ${i.contact_name}, le recordamos que la factura Nº${i.doc_number} por ${i.total?.toFixed(2)} € vencerá el ${i.due_date}.`} email={c?.email} emailSubject={`Recordatorio vencimiento: Factura ${i.doc_number}`} emailBody={`Estimado/a ${i.contact_name},\n\nLe recordamos que la factura ${i.doc_number} por importe de ${i.total?.toFixed(2)} € vencerá el ${i.due_date}.\n\nAtentamente`} />;
                })}
              </div>
            </div>
          )}
          {factVencidas.length === 0 && factProximas.length === 0 && <div className="text-center py-10 text-gray-400"><CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" /><p>Todas las facturas al día</p></div>}
        </TabsContent>

        {/* SAT */}
        <TabsContent value="sat" className="space-y-2 pt-3">
          {satPendientes.length === 0 && <div className="text-center py-10 text-gray-400"><CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" /><p>Sin SAT pendientes</p></div>}
          {satPendientes.sort((a,b) => (b.priority==='urgente'?1:0)-(a.priority==='urgente'?1:0)).map(o => {
            const c = getContact(o.contact_id);
            const isUrgent = o.priority === 'urgente';
            return <AlertRow key={o.id} icon={Wrench} color={isUrgent ? 'border-l-red-500 bg-red-50' : 'border-l-orange-400 bg-orange-50'} title={`#${o.order_number || 'S/N'} — ${o.contact_name}`} sub={`${o.type} · ${o.equipment_type?.replace(/_/g,' ')} · ${o.date}`} badge={o.priority} badgeColor={isUrgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'} page={`SAT?view=${o.id}`} phone={c?.phone} waText={`Hola ${o.contact_name}, le contactamos sobre la orden de servicio SAT #${o.order_number} (${o.type}). ¿Cuándo le viene bien que pasemos un técnico?`} email={c?.email} emailSubject={`Orden SAT #${o.order_number} — ${o.type}`} emailBody={`Estimado/a ${o.contact_name},\n\nNos ponemos en contacto en relación a su solicitud de servicio técnico SAT #${o.order_number}.\nTipo: ${o.type}\nDescripción: ${o.description || '-'}\n\nNos pondremos en contacto para coordinar la visita.\n\nAtentamente`} />;
          })}
        </TabsContent>

        {/* AGENDA */}
        <TabsContent value="agenda" className="space-y-3 pt-3">
          {aptHoy.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-600 mb-2">📅 HOY ({aptHoy.length})</p>
              <div className="space-y-2">
                {aptHoy.sort((a,b) => (a.time_start||'').localeCompare(b.time_start||'')).map(a => {
                  const c = getContact(a.contact_id);
                  return <AlertRow key={a.id} icon={Calendar} color="border-l-blue-500 bg-blue-50" title={`${a.time_start || '?'} — ${a.title}`} sub={`${a.contact_name || 'Sin cliente'} · ${a.address || ''}`} badge={a.type} badgeColor="bg-blue-100 text-blue-700" page="Agenda" phone={c?.phone} waText={`Hola ${a.contact_name || ''}, le recordamos la cita de hoy ${a.time_start ? `a las ${a.time_start}h` : ''} para "${a.title}". Si necesita cambiarla, contáctenos.`} />;
                })}
              </div>
            </div>
          )}
          {aptManana.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-cyan-600 mb-2">📅 MAÑANA ({aptManana.length})</p>
              <div className="space-y-2">
                {aptManana.sort((a,b) => (a.time_start||'').localeCompare(b.time_start||'')).map(a => {
                  const c = getContact(a.contact_id);
                  return <AlertRow key={a.id} icon={Calendar} color="border-l-cyan-400 bg-cyan-50" title={`${a.time_start || '?'} — ${a.title}`} sub={`${a.contact_name || 'Sin cliente'} · ${a.address || ''}`} badge="Mañana" badgeColor="bg-cyan-100 text-cyan-700" page="Agenda" phone={c?.phone} waText={`Hola ${a.contact_name || ''}, le recordamos su cita de mañana ${a.time_start ? `a las ${a.time_start}h` : ''} para "${a.title}". Si necesita cambiarla, contáctenos.`} />;
                })}
              </div>
            </div>
          )}
          {aptHoy.length === 0 && aptManana.length === 0 && <div className="text-center py-10 text-gray-400"><Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Sin citas hoy ni mañana</p></div>}
        </TabsContent>

        {/* OTROS */}
        <TabsContent value="otros" className="space-y-3 pt-3">
          {maintAntigu.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 mb-2">🔧 MANTENIMIENTOS ANTIGUOS &gt;1 año ({maintAntigu.length})</p>
              <div className="space-y-2">
                {maintAntigu.slice(0, 10).map(m => {
                  const c = getContact(m.contact_id);
                  const days = differenceInDays(now, parseISO(m.date));
                  return <AlertRow key={m.id} icon={ClipboardList} color="border-l-amber-400 bg-amber-50" title={`${m.contact_name} — ${m.type}`} sub={`Ficha #${m.sheet_number} · ${m.equipment_brand} ${m.equipment_model} · Hace ${Math.round(days/30)} meses`} badge={`${Math.round(days/30)} meses`} badgeColor="bg-amber-100 text-amber-700" page="Maintenance" phone={c?.phone} waText={`Estimado/a ${m.contact_name}, le contactamos para informarle que el mantenimiento de su equipo ${m.equipment_brand} ${m.equipment_model} lleva más de un año sin revisión. ¿Le programamos una visita?`} email={c?.email} emailSubject={`Recordatorio mantenimiento: ${m.equipment_brand} ${m.equipment_model}`} emailBody={`Estimado/a ${m.contact_name},\n\nNos ponemos en contacto para informarle que el mantenimiento de su equipo ${m.equipment_brand} ${m.equipment_model} está pendiente de revisión (última: ${m.date}).\n\n¿Le programamos una visita de mantenimiento?\n\nAtentamente`} />;
                })}
              </div>
            </div>
          )}
          {stockBajo.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-2">📦 STOCK BAJO MÍNIMO ({stockBajo.length})</p>
              <div className="space-y-2">
                {stockBajo.map(s => (
                  <AlertRow key={s.id} icon={Package} color="border-l-red-400 bg-red-50" title={s.name} sub={`Stock: ${s.quantity} ${s.unit} · Mínimo: ${s.min_stock} · Proveedor: ${s.supplier_name || 'N/D'}`} badge={`${s.quantity} ${s.unit}`} badgeColor="bg-red-100 text-red-700" page="Inventory" />
                ))}
              </div>
            </div>
          )}
          {projVencidos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-orange-600 mb-2">📁 PROYECTOS VENCIDOS ({projVencidos.length})</p>
              <div className="space-y-2">
                {projVencidos.map(p => (
                  <AlertRow key={p.id} icon={FolderOpen} color="border-l-orange-400 bg-orange-50" title={`${p.name} — ${p.contact_name || 'Sin cliente'}`} sub={`Estado: ${p.status} · Fin: ${p.end_date} · Progreso: ${p.progress || 0}%`} badge="VENCIDO" badgeColor="bg-orange-100 text-orange-700" page="Projects" />
                ))}
              </div>
            </div>
          )}
          {maintAntigu.length === 0 && stockBajo.length === 0 && projVencidos.length === 0 && <div className="text-center py-10 text-gray-400"><CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400" /><p>Sin avisos adicionales</p></div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}