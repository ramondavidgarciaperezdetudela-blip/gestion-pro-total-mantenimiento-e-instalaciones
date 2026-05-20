import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Search, Bot, Users, FileText, Wrench, ClipboardList, Package, Loader2, ExternalLink, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SEARCH_MODES = [
  { value: 'global', label: '🔍 Búsqueda global', desc: 'Busca en todos los datos de la empresa' },
  { value: 'precios', label: '💰 Precios de mercado', desc: 'Precios actuales de materiales y equipos' },
  { value: 'normativa', label: '📋 Normativa técnica', desc: 'REBT, RITE, F-Gas, autoconsumo...' },
  { value: 'tecnico', label: '🔧 Consulta técnica', desc: 'Cálculos, diagnósticos, soluciones' },
  { value: 'cliente', label: '👤 Análisis de cliente', desc: 'Resumen completo de un cliente' },
];

export default function AISearch() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('global');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [localResults, setLocalResults] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [satOrders, setSatOrders] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [stock, setStock] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedContact, setSelectedContact] = useState('');

  useEffect(() => {
    Promise.all([
      base44.entities.Contact.list('name', 500),
      base44.entities.Invoice.list('-date', 500),
      base44.entities.SATOrder.list('-date', 200),
      base44.entities.MaintenanceSheet.list('-date', 200),
      base44.entities.StockItem.list('name', 300),
    ]).then(([c, inv, sat, maint, stk]) => {
      setContacts(c);
      setInvoices(inv);
      setSatOrders(sat);
      setMaintenance(maint);
      setStock(stk);
    });
  }, []);

  // Búsqueda local instantánea
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setLocalResults([]); return; }
    const q = query.toLowerCase();
    const results = [];

    contacts.filter(c => `${c.name} ${c.surname} ${c.company_name} ${c.phone} ${c.email}`.toLowerCase().includes(q))
      .slice(0, 3).forEach(c => results.push({ type: 'contacto', icon: Users, color: 'text-blue-600', title: `${c.name} ${c.surname || ''}`, sub: c.company_name || c.phone || '', page: `ContactDetail?id=${c.id}` }));

    invoices.filter(i => `${i.doc_number} ${i.contact_name}`.toLowerCase().includes(q))
      .slice(0, 3).forEach(i => results.push({ type: 'documento', icon: FileText, color: 'text-violet-600', title: `${i.doc_type} ${i.doc_number}`, sub: `${i.contact_name} · ${i.total?.toFixed(2)} €`, page: 'Documents' }));

    satOrders.filter(o => `${o.order_number} ${o.contact_name} ${o.description}`.toLowerCase().includes(q))
      .slice(0, 2).forEach(o => results.push({ type: 'SAT', icon: Wrench, color: 'text-orange-600', title: `SAT #${o.order_number}`, sub: `${o.contact_name} · ${o.type}`, page: `SAT?view=${o.id}` }));

    maintenance.filter(m => `${m.sheet_number} ${m.contact_name} ${m.equipment_brand}`.toLowerCase().includes(q))
      .slice(0, 2).forEach(m => results.push({ type: 'mantenimiento', icon: ClipboardList, color: 'text-cyan-600', title: `Ficha #${m.sheet_number}`, sub: `${m.contact_name} · ${m.type}`, page: 'Maintenance' }));

    stock.filter(s => `${s.name} ${s.reference}`.toLowerCase().includes(q))
      .slice(0, 2).forEach(s => results.push({ type: 'stock', icon: Package, color: 'text-teal-600', title: s.name, sub: `Qty: ${s.quantity} ${s.unit} · ${s.category}`, page: 'Inventory' }));

    setLocalResults(results);
  }, [query, contacts, invoices, satOrders, maintenance, stock]);

  const buildContext = () => {
    if (mode === 'cliente' && selectedContact) {
      const c = contacts.find(x => x.id === selectedContact);
      const cInv = invoices.filter(i => i.contact_id === selectedContact);
      const cSat = satOrders.filter(o => o.contact_id === selectedContact);
      const cMaint = maintenance.filter(m => m.contact_id === selectedContact);
      return `CLIENTE: ${c?.name} ${c?.surname || ''} | Empresa: ${c?.company_name || '-'} | Tel: ${c?.phone || '-'} | Email: ${c?.email || '-'} | Tipo: ${c?.type} | Perfil pago: ${c?.payment_profile}
FACTURAS: ${cInv.length} (Total: ${cInv.reduce((s,i)=>s+(i.total||0),0).toFixed(2)} €, Pendiente: ${cInv.filter(i=>['enviado','vencido'].includes(i.status)).reduce((s,i)=>s+(i.total||0),0).toFixed(2)} €)
SAT: ${cSat.length} órdenes (${cSat.filter(o=>o.status==='pendiente').length} pendientes)
MANTENIMIENTOS: ${cMaint.length} fichas`;
    }

    return `EMPRESA - Datos globales:
Contactos: ${contacts.length} | Facturas: ${invoices.length} | Total facturado: ${invoices.filter(i=>i.doc_type==='factura').reduce((s,i)=>s+(i.total||0),0).toFixed(2)} €
SAT pendientes: ${satOrders.filter(o=>o.status==='pendiente').length} | Fichas mantenimiento: ${maintenance.length}
Stock bajo mínimo: ${stock.filter(s=>s.min_stock>0&&s.quantity<=s.min_stock).length} artículos`;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);

    const modeInfo = SEARCH_MODES.find(m => m.value === mode);
    const context = buildContext();
    const needsInternet = ['precios', 'normativa', 'tecnico'].includes(mode);

    const systemPrompts = {
      global: `Eres el asistente inteligente de una empresa de instalaciones técnicas (climatización, electricidad, refrigeración, solar). Contexto de la empresa:\n${context}\n\nResponde con información útil, específica y accionable.`,
      precios: 'Eres un experto en precios de materiales y equipos para instalaciones técnicas en España (climatización, solar, eléctrico, refrigeración). Da precios actuales orientativos para instalador, sin IVA, con marcas reales.',
      normativa: 'Eres un experto en normativa técnica española: REBT RD 842/2002, RITE RD 1027/2007, F-Gas RD 115/2017, RD 244/2019 autoconsumo, Reglamento frigorías RD 138/2011. Cita siempre el artículo o normativa exacta.',
      tecnico: 'Eres un técnico experto en climatización, refrigeración industrial, instalaciones eléctricas y energía solar. Da respuestas técnicas precisas con cálculos cuando sea necesario.',
      cliente: `Eres el asistente CRM de una empresa de instalaciones técnicas. Contexto del cliente:\n${context}\n\nAnaliza la relación comercial y da recomendaciones específicas.`,
    };

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${systemPrompts[mode]}\n\nConsulta: ${query}\n\nResponde en español, de forma clara, estructurada con markdown si es útil.`,
      add_context_from_internet: needsInternet,
    });

    setResult(res);
    setHistory(prev => [{ query, mode, result: res, ts: new Date().toLocaleTimeString('es-ES') }, ...prev.slice(0, 4)]);
    setLoading(false);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Búsqueda IA Global</h1>
          <p className="text-sm text-gray-500">Busca en tus datos o consulta al asistente inteligente</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2 flex-wrap">
        {SEARCH_MODES.map(m => (
          <button key={m.value} onClick={() => setMode(m.value)}
            className={`text-xs px-3 py-2 rounded-full border transition-all ${mode === m.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 hover:border-blue-300 text-gray-700'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Cliente selector for mode=cliente */}
      {mode === 'cliente' && (
        <Select value={selectedContact} onValueChange={setSelectedContact}>
          <SelectTrigger><SelectValue placeholder="Selecciona un cliente para analizarlo..." /></SelectTrigger>
          <SelectContent>
            {contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname} {c.company_name && `(${c.company_name})`}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            className="pl-9 text-base"
            placeholder={SEARCH_MODES.find(m2 => m2.value === mode)?.desc || 'Escribe tu consulta...'}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading || !query.trim()} className="bg-blue-600 hover:bg-blue-700 px-6">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        </Button>
      </div>

      {/* Resultados locales instantáneos */}
      {localResults.length > 0 && !result && !loading && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Resultados en tus datos:</p>
            <div className="space-y-1">
              {localResults.map((r, i) => {
                const Icon = r.icon;
                return (
                  <Link key={i} to={createPageUrl(r.page)}>
                    <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                      <Icon className={`w-4 h-4 ${r.color} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-gray-500 truncate">{r.sub}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] flex-shrink-0">{r.type}</Badge>
                      <ExternalLink className="w-3 h-3 text-gray-300 flex-shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-sm text-gray-500">Consultando IA{['precios','normativa','tecnico'].includes(mode) ? ' con datos actuales de internet' : ''}...</p>
          </CardContent>
        </Card>
      )}

      {/* Resultado IA */}
      {result && (
        <Card className="border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-5 h-5 text-blue-600" />
              <p className="text-sm font-semibold text-blue-700">Respuesta IA — {SEARCH_MODES.find(m2=>m2.value===mode)?.label}</p>
              <Badge variant="outline" className="text-[10px] ml-auto">{new Date().toLocaleTimeString('es-ES')}</Badge>
            </div>
            <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 prose-headings:text-gray-800 prose-a:text-blue-600">
              {result}
            </ReactMarkdown>
            <div className="flex gap-2 mt-4 pt-3 border-t">
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(result)}>Copiar</Button>
              <Button size="sm" variant="outline" onClick={() => { setResult(null); setQuery(''); }}>Nueva búsqueda</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">Búsquedas recientes:</p>
          <div className="space-y-1">
            {history.map((h, i) => (
              <button key={i} onClick={() => { setQuery(h.query); setMode(h.mode); setResult(h.result); }}
                className="w-full text-left p-2 bg-gray-50 rounded-lg hover:bg-gray-100 text-xs flex items-center gap-2">
                <Search className="w-3 h-3 text-gray-400" />
                <span className="flex-1 truncate">{h.query}</span>
                <Badge variant="outline" className="text-[9px]">{h.ts}</Badge>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}