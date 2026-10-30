import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, TrendingUp, Users, FileText, Wrench, DollarSign, Package, AlertTriangle, CheckCircle, Link2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { format, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function Reports() {
  const [data, setData] = useState({ invoices: [], contacts: [], sat: [], maintenance: [], stock: [] });
  const [period, setPeriod] = useState('12');
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.Invoice.list('-date', 1000),
      base44.entities.Contact.list('-created_date', 1000),
      base44.entities.SATOrder.list('-date', 500),
      base44.entities.MaintenanceSheet.list('-date', 500),
      base44.entities.StockItem.list('name', 500),
    ]).then(([invoices, contacts, sat, maintenance, stock]) => {
      setData({ invoices, contacts, sat, maintenance, stock });
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const months = parseInt(period);
    const cutoff = subMonths(new Date(), months);
    const now = new Date();

    // Init single-pass buckets for monthly data
    const monthlyBuckets = {};
    for (let i = 0; i < Math.min(months, 12); i++) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      monthlyBuckets[key] = {
        name: format(d, 'MMM yy', { locale: es }),
        facturado: 0,
        cobrado: 0,
        presupuestos: 0
      };
    }

    // Single-pass processing for Invoices
    let totalFacturado = 0;
    let totalPagado = 0;
    let pendienteCobro = 0;
    let totalPresupuestado = 0;
    let factVencidas = 0;
    let invoiceCountForAvg = 0;
    const clientMap = {};
    const filteredInvoices = [];

    data.invoices.forEach(i => {
      const total = i.total || 0;
      if (i.status === 'vencido') factVencidas++;

      try {
        if (!i.date) return;
        const dt = parseISO(i.date);
        if (dt < cutoff) return;

        filteredInvoices.push(i);

        // Monthly bucketing
        const mKey = format(dt, 'yyyy-MM');
        if (monthlyBuckets[mKey]) {
          if (i.doc_type === 'factura') monthlyBuckets[mKey].facturado += total;
          if (i.status === 'pagado') monthlyBuckets[mKey].cobrado += total;
          if (i.doc_type === 'presupuesto') monthlyBuckets[mKey].presupuestos += total;
        }

        // Global KPIs
        if (i.doc_type === 'factura') {
          totalFacturado += total;
          if (total > 0) invoiceCountForAvg++;
          if (i.contact_name) {
            clientMap[i.contact_name] = (clientMap[i.contact_name] || 0) + total;
          }
        }
        if (i.status === 'pagado') totalPagado += total;
        if (i.status === 'enviado') pendienteCobro += total;
        if (i.doc_type === 'presupuesto') totalPresupuestado += total;
      } catch (e) { /* skip invalid dates */ }
    });

    const monthlyData = Object.values(monthlyBuckets).reverse();
    const topClients = Object.entries(clientMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, total]) => ({ name, total }));

    // SAT analytics
    const satCounts = {};
    const techMap = {};
    let satCompletadas = 0;
    let satPendientes = 0;
    let satEnCurso = 0;

    data.sat.forEach(s => {
      if (s.status === 'completada') satCompletadas++;
      else if (s.status === 'pendiente') satPendientes++;
      else if (s.status === 'en_curso') satEnCurso++;

      if (s.type) satCounts[s.type] = (satCounts[s.type] || 0) + 1;
      if (s.technician) techMap[s.technician] = (techMap[s.technician] || 0) + 1;
    });

    const satByType = ['reparacion', 'mantenimiento', 'instalacion', 'revision', 'urgencia']
      .map(t => ({
        name: t.charAt(0).toUpperCase() + t.slice(1),
        value: satCounts[t] || 0
      }))
      .filter(i => i.value > 0);

    const techData = Object.entries(techMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Contacts & Stock
    const contactsByType = ['cliente', 'proveedor', 'colaborador', 'otro']
      .map(t => ({
        name: t.charAt(0).toUpperCase() + t.slice(1),
        value: data.contacts.filter(c => c.type === t).length
      }))
      .filter(i => i.value > 0);

    const clientesActivos = data.contacts.filter(c => c.type === 'cliente' && c.is_active !== false).length;
    const lowStock = data.stock.filter(s => s.min_stock > 0 && s.quantity <= s.min_stock);
    const stockBajoMinimo = lowStock.length;

    const ticketMedio = invoiceCountForAvg > 0 ? totalFacturado / invoiceCountForAvg : 0;

    const kpis = [
      { title: 'Facturado', value: `${totalFacturado.toFixed(0)} €`, sub: `${months} meses`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
      { title: 'Cobrado', value: `${totalPagado.toFixed(0)} €`, sub: `${Math.round(totalPagado / Math.max(totalFacturado, 1) * 100)}% del total`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
      { title: 'Pendiente cobro', value: `${pendienteCobro.toFixed(0)} €`, sub: `${factVencidas} vencidas`, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
      { title: 'Presupuestado', value: `${totalPresupuestado.toFixed(0)} €`, sub: 'en presupuestos', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      { title: 'Ticket medio', value: `${ticketMedio.toFixed(0)} €`, sub: 'por factura', icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
      { title: 'Clientes activos', value: clientesActivos, sub: `${data.contacts.length} total`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
      { title: 'SAT completadas', value: satCompletadas, sub: `${satPendientes} pendientes`, icon: Wrench, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
      { title: 'Stock bajo mínimo', value: stockBajoMinimo, sub: 'artículos', icon: Package, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    ];

    return {
      filteredInvoices,
      monthlyData,
      topClients,
      satByType,
      techData,
      contactsByType,
      clientesActivos,
      lowStock,
      stockBajoMinimo,
      kpis,
      satCompletadas,
      satEnCurso,
      satPendientes
    };
  }, [data, period]);

  const {
    filteredInvoices, monthlyData, topClients, satByType, techData,
    contactsByType, lowStock, kpis,
    satCompletadas, satEnCurso, satPendientes
  } = stats;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-fuchsia-600" /> Panel de Control e Informes
        </h1>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
              <SelectItem value="24">Últimos 2 años</SelectItem>
            </SelectContent>
          </Select>
          <PrintButton contentRef={printRef} title="Informe" />
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12">Cargando datos...</p>
      ) : (
        <div ref={printRef} className="space-y-6">
          <CompanyHeader />

          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {kpis.map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i} className={`border ${s.border}`}>
                  <CardContent className="p-3">
                    <div className={`inline-flex p-1.5 rounded-lg ${s.bg} mb-1.5`}>
                      <Icon className={`w-4 h-4 ${s.color}`} />
                    </div>
                    <p className="text-[11px] text-gray-500">{s.title}</p>
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-400">{s.sub}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Tabs defaultValue="facturacion">
            <TabsList className="w-full flex-wrap h-auto">
              <TabsTrigger value="facturacion" className="flex-1 text-xs">Facturación</TabsTrigger>
              <TabsTrigger value="clientes" className="flex-1 text-xs">Clientes</TabsTrigger>
              <TabsTrigger value="sat" className="flex-1 text-xs">SAT</TabsTrigger>
              <TabsTrigger value="stock" className="flex-1 text-xs">Stock</TabsTrigger>
            </TabsList>

            <TabsContent value="facturacion" className="space-y-4 pt-3">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Evolución mensual (€)</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={v => `${typeof v === 'number' ? v.toFixed(2) : v} €`} />
                      <Legend />
                      <Line type="monotone" dataKey="facturado" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Facturado" />
                      <Line type="monotone" dataKey="cobrado" stroke="#10b981" strokeWidth={2} dot={false} name="Cobrado" />
                      <Line type="monotone" dataKey="presupuestos" stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Presupuestos" strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Documentos por tipo</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={[
                        { name: 'Facturas', v: filteredInvoices.filter(i => i.doc_type === 'factura').length },
                        { name: 'Presupuestos', v: filteredInvoices.filter(i => i.doc_type === 'presupuesto').length },
                        { name: 'Recibos', v: filteredInvoices.filter(i => i.doc_type === 'recibo').length },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="v" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Facturas por estado</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={['pagado', 'enviado', 'vencido', 'borrador', 'cancelado'].map(s => ({
                          name: s, value: data.invoices.filter(i => i.status === s).length
                        })).filter(i => i.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                          {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="clientes" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Contactos por tipo</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={contactsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                          {contactsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Top clientes por facturación</CardTitle></CardHeader>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      {topClients.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                      {topClients.map((c, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{c.name}</p>
                            <div className="h-1.5 bg-gray-100 rounded-full mt-0.5">
                              <div className="h-1.5 bg-violet-500 rounded-full" style={{ width: `${Math.min(100, c.total / topClients[0]?.total * 100)}%` }} />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-violet-700 ml-2">{c.total.toFixed(0)} €</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="sat" className="space-y-4 pt-3">
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[
                  { l: 'Completadas', v: satCompletadas, c: 'text-green-600 bg-green-50 border-green-200' },
                  { l: 'En curso', v: satEnCurso, c: 'text-blue-600 bg-blue-50 border-blue-200' },
                  { l: 'Pendientes', v: satPendientes, c: 'text-orange-600 bg-orange-50 border-orange-200' },
                ].map((s, i) => (
                  <Card key={i} className={`border ${s.c.split(' ').slice(2).join(' ')}`}>
                    <CardContent className={`p-3 text-center ${s.c.split(' ').slice(1, 2).join(' ')}`}>
                      <p className={`text-2xl font-bold ${s.c.split(' ')[0]}`}>{s.v}</p>
                      <p className="text-xs">{s.l}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Órdenes SAT por tipo de trabajo</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={satByType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Últimas órdenes SAT</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y max-h-60 overflow-y-auto">
                    {data.sat.slice(0, 10).map(s => (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs">{s.contact_name}</p>
                          <p className="text-xs text-gray-400">{s.date} · {s.type?.replace(/_/g,' ')} · {s.equipment_type?.replace(/_/g,' ')}</p>
                          {s.technician && <p className="text-[10px] text-blue-600">👷 {s.technician}</p>}
                          {s.total > 0 && <p className="text-[10px] font-semibold text-orange-700">{s.total?.toFixed(2)} €</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={s.status === 'completada' ? 'bg-green-100 text-green-700' : s.status === 'pendiente' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'} variant="secondary">
                            {s.status}
                          </Badge>
                          <Link to={createPageUrl(`SAT?view=${s.id}`)}>
                            <span className="text-[10px] text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5">
                              <Link2 className="w-3 h-3" />Ver
                            </span>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* SAT por técnico */}
              {(() => {
                const techMap = {};
                data.sat.forEach(s => { if (s.technician) { techMap[s.technician] = (techMap[s.technician] || 0) + 1; } });
                const techData = Object.entries(techMap).sort((a,b) => b[1]-a[1]);
                return techData.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">SAT por técnico</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={techData.map(([name, value]) => ({ name, value }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#f59e0b" radius={[4,4,0,0]} name="Órdenes" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                ) : null;
              })()}
            </TabsContent>

            <TabsContent value="stock" className="space-y-4 pt-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" /> Artículos bajo stock mínimo ({lowStock.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {lowStock.length === 0 ? (
                    <p className="text-center text-gray-400 py-6 text-sm">✅ Todo el stock está por encima del mínimo</p>
                  ) : (
                    <div className="divide-y max-h-64 overflow-y-auto">
                      {lowStock.map(s => (
                        <div key={s.id} className="flex items-center justify-between px-3 py-2">
                          <div>
                            <p className="font-medium text-sm">{s.name}</p>
                            <p className="text-xs text-gray-400">{s.category} · {s.supplier_name || 'Sin proveedor'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-600">{s.quantity} {s.unit}</p>
                            <p className="text-xs text-gray-400">mín: {s.min_stock}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Stock por categoría</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={['tuberias_accesorios','cables_electricidad','refrigerantes','filtros','equipos_climatizacion','material_solar','otro'].map(cat => ({
                      name: cat.replace(/_/g, ' ').slice(0, 12),
                      value: data.stock.filter(s => s.category === cat).length
                    })).filter(i => i.value > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}