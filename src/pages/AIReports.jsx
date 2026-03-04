import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, RefreshCw, Download, Users, FileText, Wrench, BarChart3, Loader2, Save, Printer } from 'lucide-react';
import { format, subMonths, parseISO, differenceInDays } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';

const REPORT_TYPES = [
  { value: 'ejecutivo', label: '📊 Informe Ejecutivo Mensual', desc: 'Resumen completo de facturación, clientes y operaciones' },
  { value: 'cliente', label: '👤 Análisis de Cliente', desc: 'Informe detallado de un cliente con recomendaciones' },
  { value: 'tecnico', label: '🔧 Informe Técnico SAT/Mantenimiento', desc: 'Análisis de órdenes y fichas de mantenimiento' },
  { value: 'financiero', label: '💶 Informe Financiero', desc: 'Análisis de ingresos, cobros y morosidad' },
  { value: 'stock', label: '📦 Informe de Inventario', desc: 'Estado del stock y necesidades de reposición' },
];

export default function AIReports() {
  const [reportType, setReportType] = useState('ejecutivo');
  const [selectedContact, setSelectedContact] = useState('');
  const [period, setPeriod] = useState('3');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [editingReport, setEditingReport] = useState(false);
  const [savedReports, setSavedReports] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [allData, setAllData] = useState({});
  const printRef = useRef(null);

  useEffect(() => {
    loadData();
    const stored = localStorage.getItem('ai_reports_history');
    if (stored) setSavedReports(JSON.parse(stored).slice(0, 10));
  }, []);

  const loadData = async () => {
    setDataLoading(true);
    const [cts, invoices, sat, maintenance, stock, projects, appointments] = await Promise.all([
      base44.entities.Contact.list('name', 500),
      base44.entities.Invoice.list('-date', 1000),
      base44.entities.SATOrder.list('-date', 500),
      base44.entities.MaintenanceSheet.list('-date', 500),
      base44.entities.StockItem.list('name', 300),
      base44.entities.Project.list('-created_date', 200),
      base44.entities.Appointment.list('-date', 200),
    ]);
    setContacts(cts);
    setAllData({ invoices, sat, maintenance, stock, projects, appointments, contacts: cts });
    setDataLoading(false);
  };

  const buildPrompt = () => {
    const months = parseInt(period);
    const cutoff = subMonths(new Date(), months);
    const { invoices = [], sat = [], maintenance = [], stock = [], projects = [], appointments = [], contacts: cts = [] } = allData;

    const filtInv = invoices.filter(i => { try { return parseISO(i.date) >= cutoff; } catch { return false; } });

    if (reportType === 'cliente' && selectedContact) {
      const c = cts.find(x => x.id === selectedContact);
      const cInv = invoices.filter(i => i.contact_id === selectedContact);
      const cSat = sat.filter(o => o.contact_id === selectedContact);
      const cMaint = maintenance.filter(m => m.contact_id === selectedContact);
      const cApt = appointments.filter(a => a.contact_id === selectedContact);
      const totalFact = cInv.filter(i=>i.doc_type==='factura').reduce((s,i)=>s+(i.total||0),0);
      const pendiente = cInv.filter(i=>['enviado','vencido'].includes(i.status)).reduce((s,i)=>s+(i.total||0),0);

      return `Eres el analista CRM de una empresa de instalaciones técnicas en España. Genera un informe profesional y detallado sobre este cliente.

DATOS DEL CLIENTE:
- Nombre: ${c?.name} ${c?.surname || ''}
- Empresa: ${c?.company_name || '-'}
- Tipo: ${c?.type} | Categoría: ${c?.category?.replace(/_/g,' ')}
- NIF: ${c?.nif || '-'} | Tel: ${c?.phone || '-'} | Email: ${c?.email || '-'}
- Dirección: ${c?.address || '-'}, ${c?.city || '-'} ${c?.province || '-'}
- Perfil de pago: ${c?.payment_profile} | Importe pendiente: ${c?.pending_amount || 0} €
- Observaciones internas: ${c?.internal_observations || 'Ninguna'}

HISTORIAL COMERCIAL:
- Facturas totales: ${cInv.filter(i=>i.doc_type==='factura').length} | Total facturado: ${totalFact.toFixed(2)} €
- Presupuestos: ${cInv.filter(i=>i.doc_type==='presupuesto').length}
- Pendiente de cobro: ${pendiente.toFixed(2)} €
- Última factura: ${cInv[0]?.date || 'N/D'}
- Órdenes SAT: ${cSat.length} (${cSat.filter(o=>o.status==='pendiente').length} pendientes, ${cSat.filter(o=>o.status==='completada').length} completadas)
- Fichas mantenimiento: ${cMaint.length}
- Citas: ${cApt.length}

TIPOS DE TRABAJO SAT: ${[...new Set(cSat.map(o=>o.type))].join(', ') || '-'}
EQUIPOS MANTENIDOS: ${[...new Set(cMaint.map(m=>`${m.equipment_brand} ${m.equipment_model}`).filter(Boolean))].join(', ') || '-'}

Genera un informe estructurado con:
1. **Resumen ejecutivo del cliente** (valoración general)
2. **Análisis comercial** (facturación, tendencia, rentabilidad)
3. **Historial técnico** (equipos, trabajos realizados)
4. **Situación financiera** (pagos, pendientes, riesgo)
5. **Oportunidades de negocio** (qué servicios podríamos ofrecerle)
6. **Recomendaciones de acción** (próximos pasos concretos)
7. **Valoración global** (semáforo: 🔴 Problemático / 🟡 Neutro / 🟢 Excelente)`;
    }

    if (reportType === 'ejecutivo') {
      const totalFact = filtInv.filter(i=>i.doc_type==='factura').reduce((s,i)=>s+(i.total||0),0);
      const totalCobrado = filtInv.filter(i=>i.status==='pagado').reduce((s,i)=>s+(i.total||0),0);
      const pendiente = filtInv.filter(i=>['enviado','vencido'].includes(i.status)).reduce((s,i)=>s+(i.total||0),0);
      return `Eres el analista financiero y de negocio de una empresa de instalaciones técnicas en España. Genera un informe ejecutivo mensual completo.

PERÍODO DE ANÁLISIS: Últimos ${months} meses

FACTURACIÓN:
- Total facturado: ${totalFact.toFixed(2)} €
- Total cobrado: ${totalCobrado.toFixed(2)} €
- Tasa de cobro: ${totalFact > 0 ? Math.round(totalCobrado/totalFact*100) : 0}%
- Pendiente de cobro: ${pendiente.toFixed(2)} €
- Facturas vencidas: ${filtInv.filter(i=>i.status==='vencido').length}
- Presupuestos emitidos: ${filtInv.filter(i=>i.doc_type==='presupuesto').length} por ${filtInv.filter(i=>i.doc_type==='presupuesto').reduce((s,i)=>s+(i.total||0),0).toFixed(2)} €

CLIENTES:
- Total en base de datos: ${cts.length}
- Clientes activos: ${cts.filter(c=>c.type==='cliente').length}
- Morosos: ${cts.filter(c=>c.payment_profile==='moroso').length}
- Mal pagadores: ${cts.filter(c=>c.payment_profile==='mal_pagador').length}

OPERACIONES:
- SAT completadas: ${sat.filter(o=>o.status==='completada').length}
- SAT pendientes: ${sat.filter(o=>o.status==='pendiente').length}
- SAT en curso: ${sat.filter(o=>o.status==='en_curso').length}
- Fichas mantenimiento: ${maintenance.length}
- Proyectos en curso: ${projects.filter(p=>p.status==='en_curso').length}
- Proyectos vencidos: ${projects.filter(p=>p.end_date&&p.end_date<format(new Date(),'yyyy-MM-dd')&&!['completado','cancelado'].includes(p.status)).length}

TIPOS DE TRABAJO SAT (top): ${Object.entries(sat.reduce((acc,o)=>{acc[o.type]=(acc[o.type]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}:${v}`).join(', ')}

Genera un informe ejecutivo completo con:
1. **Resumen ejecutivo** (KPIs clave con semáforo)
2. **Análisis de facturación** (tendencia, cobros, morosidad)
3. **Análisis de clientes** (captación, retención, riesgos)
4. **Rendimiento operacional** (SAT, mantenimientos, proyectos)
5. **Puntos fuertes y débiles**
6. **Recomendaciones estratégicas** (acciones concretas)
7. **Objetivos para el próximo período**`;
    }

    if (reportType === 'tecnico') {
      return `Eres el director técnico de una empresa de instalaciones técnicas. Genera un informe técnico operacional.

PERÍODO: Últimos ${months} meses

SAT - SERVICIO TÉCNICO:
- Total órdenes: ${sat.length}
- Por tipo: ${Object.entries(sat.reduce((acc,o)=>{acc[o.type]=(acc[o.type]||0)+1;return acc},{})).map(([k,v])=>`${k}:${v}`).join(', ')}
- Por equipo: ${Object.entries(sat.reduce((acc,o)=>{acc[o.equipment_type]=(acc[o.equipment_type]||0)+1;return acc},{})).map(([k,v])=>`${k?.replace(/_/g,' ')}:${v}`).join(', ')}
- Pendientes: ${sat.filter(o=>o.status==='pendiente').length}
- Completadas: ${sat.filter(o=>o.status==='completada').length}
- Urgentes: ${sat.filter(o=>o.priority==='urgente').length}
- Técnicos más activos: ${Object.entries(sat.filter(o=>o.technician).reduce((acc,o)=>{acc[o.technician]=(acc[o.technician]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k,v])=>`${k}:${v}`).join(', ') || 'N/D'}

MANTENIMIENTOS:
- Total fichas: ${maintenance.length}
- Por tipo: ${Object.entries(maintenance.reduce((acc,m)=>{acc[m.type]=(acc[m.type]||0)+1;return acc},{})).map(([k,v])=>`${k}:${v}`).join(', ')}
- Fichas antiguas (>1 año): ${maintenance.filter(m=>{try{return differenceInDays(new Date(),parseISO(m.date))>365}catch{return false}}).length}

Genera informe técnico con:
1. **Resumen operacional** (carga de trabajo, capacidad)
2. **Análisis SAT** (tipos de averías más frecuentes, equipos problemáticos)
3. **Análisis de mantenimientos** (coberturas, frecuencias)
4. **Rendimiento del equipo técnico**
5. **Equipos y tecnologías más demandados**
6. **Recomendaciones técnicas** (formación, herramientas, procesos)`;
    }

    if (reportType === 'financiero') {
      const totalFact = filtInv.filter(i=>i.doc_type==='factura').reduce((s,i)=>s+(i.total||0),0);
      const totalCobrado = filtInv.filter(i=>i.status==='pagado').reduce((s,i)=>s+(i.total||0),0);
      const vencidas = filtInv.filter(i=>i.status==='vencido');
      return `Eres el director financiero de una empresa de instalaciones técnicas. Genera un informe financiero detallado.

PERÍODO: Últimos ${months} meses

INGRESOS:
- Facturado: ${totalFact.toFixed(2)} €
- Cobrado: ${totalCobrado.toFixed(2)} €
- Pendiente: ${(totalFact-totalCobrado).toFixed(2)} €
- Tasa cobro: ${totalFact>0?Math.round(totalCobrado/totalFact*100):0}%
- Ticket medio factura: ${filtInv.filter(i=>i.doc_type==='factura'&&i.total>0).length > 0 ? (totalFact/filtInv.filter(i=>i.doc_type==='factura'&&i.total>0).length).toFixed(2) : 0} €

MOROSIDAD:
- Facturas vencidas: ${vencidas.length} — ${vencidas.reduce((s,i)=>s+(i.total||0),0).toFixed(2)} €
- Clientes morosos: ${cts.filter(c=>c.payment_profile==='moroso').length}
- Clientes mal pagadores: ${cts.filter(c=>c.payment_profile==='mal_pagador').length}
- Deuda total pendiente (clientes): ${cts.filter(c=>c.pending_amount>0).reduce((s,c)=>s+(c.pending_amount||0),0).toFixed(2)} €

PRESUPUESTOS:
- Presupuestos emitidos: ${filtInv.filter(i=>i.doc_type==='presupuesto').length}
- Valor total: ${filtInv.filter(i=>i.doc_type==='presupuesto').reduce((s,i)=>s+(i.total||0),0).toFixed(2)} €

Genera informe financiero con:
1. **Resumen de tesorería** (ingresos, cobros, ratio de conversión)
2. **Análisis de morosidad** (riesgos, clientes problemáticos)
3. **Análisis de presupuestos** (tasa de conversión)
4. **Recomendaciones financieras** (gestión de cobros, protección ante impagos)
5. **Proyección** (estimación próximo período)`;
    }

    if (reportType === 'stock') {
      const bajo = stock.filter(s=>s.min_stock>0&&s.quantity<=s.min_stock);
      const totalValor = stock.reduce((s,item)=>(s+(item.quantity||0)*(item.unit_price||0)),0);
      return `Eres el responsable de logística y compras de una empresa de instalaciones técnicas. Genera un informe de inventario.

INVENTARIO ACTUAL:
- Artículos totales: ${stock.length}
- Valor total estimado: ${totalValor.toFixed(2)} €
- Artículos bajo mínimo: ${bajo.length}
- Artículos sin stock: ${stock.filter(s=>s.quantity<=0).length}

POR CATEGORÍA:
${Object.entries(stock.reduce((acc,s)=>{acc[s.category]=(acc[s.category]||0)+1;return acc},{})).map(([k,v])=>`- ${k?.replace(/_/g,' ')}: ${v} artículos`).join('\n')}

ARTÍCULOS CRÍTICOS (bajo mínimo):
${bajo.slice(0,10).map(s=>`- ${s.name}: ${s.quantity} ${s.unit} (mín: ${s.min_stock}) — Proveedor: ${s.supplier_name||'N/D'}`).join('\n')}

Genera informe de inventario con:
1. **Estado general del stock**
2. **Artículos críticos** (necesitan reposición urgente)
3. **Análisis por categoría**
4. **Recomendaciones de compra** (qué pedir, a quién, cuánto)
5. **Optimización del inventario** (artículos obsoletos, sobrestock)`;
    }

    return `Genera un informe de tipo ${reportType} para una empresa de instalaciones técnicas en España.`;
  };

  const generateReport = async () => {
    if (reportType === 'cliente' && !selectedContact) return alert('Selecciona un cliente');
    setLoading(true);
    setReport(null);

    const prompt = buildPrompt();
    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
    });

    const reportData = {
      id: Date.now(),
      type: reportType,
      typeLabel: REPORT_TYPES.find(r=>r.value===reportType)?.label || reportType,
      contactId: selectedContact,
      contactName: contacts.find(c=>c.id===selectedContact)?.name || '',
      period,
      content: res,
      date: format(new Date(), 'dd/MM/yyyy HH:mm'),
    };

    setReport(reportData);
    const updated = [reportData, ...savedReports].slice(0, 10);
    setSavedReports(updated);
    localStorage.setItem('ai_reports_history', JSON.stringify(updated));
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Informes IA Detallados</h1>
          <p className="text-sm text-gray-500">Análisis inteligentes de tu negocio vinculados al cliente</p>
        </div>
      </div>

      {/* Configuración */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo de informe</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REPORT_TYPES.map(r => (
                <button key={r.value} onClick={() => setReportType(r.value)}
                  className={`text-left p-3 rounded-lg border transition-all ${reportType === r.value ? 'bg-purple-600 text-white border-purple-600' : 'bg-white border-gray-200 hover:border-purple-300'}`}>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className={`text-xs mt-0.5 ${reportType === r.value ? 'text-purple-200' : 'text-gray-500'}`}>{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {reportType === 'cliente' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Cliente a analizar *</label>
              <Select value={selectedContact} onValueChange={setSelectedContact}>
                <SelectTrigger><SelectValue placeholder="Selecciona un cliente..." /></SelectTrigger>
                <SelectContent>
                  {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname || ''} {c.company_name ? `— ${c.company_name}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {reportType !== 'stock' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Período de análisis</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último mes</SelectItem>
                  <SelectItem value="3">Últimos 3 meses</SelectItem>
                  <SelectItem value="6">Últimos 6 meses</SelectItem>
                  <SelectItem value="12">Último año</SelectItem>
                  <SelectItem value="24">Últimos 2 años</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={generateReport} disabled={loading || dataLoading} className="w-full bg-purple-600 hover:bg-purple-700 gap-2">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Generando informe IA...</> : <><Bot className="w-4 h-4" />Generar Informe IA</>}
          </Button>
        </CardContent>
      </Card>

      {/* Informe generado */}
      {report && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-600" />
                  {report.typeLabel}
                </CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {report.contactName && <span>Cliente: <strong>{report.contactName}</strong> · </span>}
                  Generado: {report.date}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(report.content)}>
                  Copiar
                </Button>
                <PrintButton contentRef={printRef} title={report.typeLabel} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div ref={printRef} className="space-y-4">
              <CompanyHeader className="pb-3 border-b" />
              <div className="text-right text-xs text-gray-400">{report.typeLabel} · {report.date}</div>
              <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 prose-headings:text-gray-800 prose-headings:font-bold prose-h2:text-base prose-h3:text-sm prose-strong:text-gray-900 prose-ul:list-disc prose-ol:list-decimal">
                {report.content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial de informes */}
      {savedReports.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Informes generados anteriormente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-y-auto">
              {savedReports.map((r, i) => (
                <button key={r.id || i} onClick={() => setReport(r)}
                  className="w-full text-left p-3 hover:bg-gray-50 flex items-center gap-3">
                  <BarChart3 className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.typeLabel}</p>
                    <p className="text-xs text-gray-400">{r.contactName && `${r.contactName} · `}{r.date}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0">{r.period}m</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}