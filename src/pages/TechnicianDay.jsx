import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadImage } from '@/lib/uploadImage';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NumberField } from '@/components/ui/number-field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Wrench, CheckCircle2, Clock, ChevronRight,
  Camera, Package, AlertTriangle, RefreshCw, Save, Loader2, Plus, X,
  ImagePlus, TrendingDown
} from 'lucide-react';
import ClientHistorySection from '../components/ClientHistorySection';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pendiente: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-400' },
  en_curso: { label: 'En curso', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
  completada: { label: 'Completada', color: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' },
  cancelada: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500 border-gray-300', dot: 'bg-gray-400' },
};

const STATUSES = ['pendiente', 'en_curso', 'completada', 'cancelada'];

export default function TechnicianDay() {
  const [technician, setTechnician] = useState('');
  const [techInput, setTechInput] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateForm, setUpdateForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ material: '', quantity: 1, unit_price: '' });
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(null); // 'before' | 'after' | null
  const [viewDate, setViewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stockItems, setStockItems] = useState([]);
  const [stockSearch, setStockSearch] = useState('');
  const [discounting, setDiscounting] = useState(false);

  // Recuperar técnico guardado
  useEffect(() => {
    const saved = localStorage.getItem('sat_technician');
    if (saved) { setTechnician(saved); setTechInput(saved); }
    loadTechnicians();
    loadStock();
  }, []);

  const loadStock = async () => {
    try {
      const items = await base44.entities.StockItem.list('name', 300);
      setStockItems(items);
    } catch (_) {}
  };

  const loadTechnicians = async () => {
    const [sats, company] = await Promise.all([
      base44.entities.SATOrder.list('-date', 100),
      base44.entities.CompanySettings.list(),
    ]);
    const techs = new Set();
    sats.forEach(s => s.technician && techs.add(s.technician));
    if (company[0]?.technicians) company[0].technicians.forEach(t => techs.add(t.name));
    setTechnicians([...techs].filter(Boolean));
  };

  const loadOrders = async (tech, date) => {
    if (!tech) return;
    setLoading(true);
    const all = await base44.entities.SATOrder.list('-date', 300);
    // Filtrar por técnico y fecha (scheduled_date o date)
    const filtered = all.filter(o => {
      const matchTech = o.technician === tech;
      const orderDate = o.scheduled_date || o.date;
      const matchDate = orderDate === date;
      return matchTech && matchDate;
    });
    setOrders(filtered);
    setLoading(false);
  };

  const handleSetTechnician = (name) => {
    setTechnician(name);
    setTechInput(name);
    localStorage.setItem('sat_technician', name);
    loadOrders(name, viewDate);
  };

  useEffect(() => {
    if (technician) loadOrders(technician, viewDate);
  }, [viewDate]);

  const openOrder = (order) => {
    setSelectedOrder(order);
    setUpdateForm({
      status: order.status || 'pendiente',
      diagnosis: order.diagnosis || '',
      solution: order.solution || '',
      notes: order.notes || '',
      materials_used: [...(order.materials_used || [])],
      photos_before: [...(order.photos_before || [])],
      photos_after: [...(order.photos_after || [])],
      labor_hours: order.labor_hours || '',
    });
    setShowMaterialForm(false);
    setStockSearch('');
  };

  const handleSaveUpdate = async () => {
    setSaving(true);
    const wasCompleted = selectedOrder.status === 'completada';
    const isNowCompleted = updateForm.status === 'completada';
    const total =
      (updateForm.labor_hours || 0) * (selectedOrder.labor_rate || 35) +
      (updateForm.materials_used || []).reduce((s, m) => s + (m.quantity || 0) * (m.unit_price || 0), 0);
    const data = { ...updateForm, total };
    await base44.entities.SATOrder.update(selectedOrder.id, data);
    setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, ...data } : o));

    // Descontar materiales del stock al marcar como completada (solo si no estaba ya completada)
    if (isNowCompleted && !wasCompleted && (updateForm.materials_used || []).length > 0) {
      setDiscounting(true);
      try {
        const res = await base44.functions.invoke('stockDiscount', {
          materials: updateForm.materials_used,
          source: 'sat',
          source_id: selectedOrder.id,
          source_number: selectedOrder.order_number,
        });
        const { discounted = [], not_found = [], low_stock_alerts = [] } = res.data || {};
        if (discounted.length > 0) {
          toast.success(`✅ Stock descontado: ${discounted.length} artículo(s)`);
        }
        if (not_found.length > 0) {
          toast.warning(`⚠️ No encontrado en stock: ${not_found.map(m => m.material).join(', ')}`);
        }
        if (low_stock_alerts.length > 0) {
          toast.error(`📦 Stock mínimo alcanzado: ${low_stock_alerts.map(a => a.name).join(', ')} — te hemos enviado un aviso`);
        }
        // Recargar stock actualizado
        loadStock();
      } catch (_) {}
      setDiscounting(false);
    }

    toast.success('Parte de trabajo guardado');
    setSaving(false);
    setSelectedOrder(null);
  };

  const handlePhotoUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(field);
    try {
      const file_url = await uploadImage(file);
      setUpdateForm(f => ({ ...f, [field]: [...(f[field] || []), file_url] }));
      toast.success('Foto añadida');
    } catch (err) {
      toast.error('Error al subir la foto. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setUploadingPhoto(null);
      e.target.value = '';
    }
  };

  // Añadir material del stock directamente
  const addStockMaterial = (item) => {
    const exists = (updateForm.materials_used || []).find(m => m.material === item.name);
    if (exists) {
      setUpdateForm(f => ({
        ...f,
        materials_used: f.materials_used.map(m =>
          m.material === item.name ? { ...m, quantity: (m.quantity || 0) + 1 } : m
        ),
      }));
    } else {
      setUpdateForm(f => ({
        ...f,
        materials_used: [...(f.materials_used || []), {
          material: item.name,
          quantity: 1,
          unit_price: item.unit_price || 0,
        }],
      }));
    }
    toast.success(`${item.name} añadido`);
  };

  const addMaterial = () => {
    if (!newMaterial.material.trim()) return;
    setUpdateForm(f => ({ ...f, materials_used: [...(f.materials_used || []), { ...newMaterial }] }));
    setNewMaterial({ material: '', quantity: 1, unit_price: '' });
    setShowMaterialForm(false);
  };

  const removeMaterial = (i) => {
    setUpdateForm(f => ({ ...f, materials_used: f.materials_used.filter((_, idx) => idx !== i) }));
  };

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isViewingToday = viewDate === todayStr;

  const stats = useMemo(() => ({
    total: orders.length,
    completadas: orders.filter(o => o.status === 'completada').length,
    pendientes: orders.filter(o => o.status === 'pendiente').length,
    en_curso: orders.filter(o => o.status === 'en_curso').length,
  }), [orders]);

  // Pantalla de login de técnico
  if (!technician) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-orange-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Portal Técnico</h1>
            <p className="text-sm text-gray-500 mt-1">Accede a tus órdenes del día</p>
          </div>
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">Selecciona tu nombre</label>
            <Select onValueChange={handleSetTechnician}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Elige tu nombre..." />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">o escribe tu nombre</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Tu nombre..."
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                className="h-12"
                onKeyDown={e => e.key === 'Enter' && techInput.trim() && handleSetTechnician(techInput.trim())}
              />
              <Button className="h-12 px-5 bg-orange-600 hover:bg-orange-700" onClick={() => techInput.trim() && handleSetTechnician(techInput.trim())}>
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header técnico */}
      <div className="bg-slate-800 text-white px-4 py-4 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center font-bold text-sm">
              {technician.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{technician}</p>
              <p className="text-xs text-slate-300">
                {isViewingToday ? 'Hoy — ' : ''}{format(parseISO(viewDate), "d 'de' MMM", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)}
              className="text-xs bg-slate-700 text-white border border-slate-600 rounded-lg px-2 py-1.5 focus:outline-none" />
            <Button size="icon" variant="ghost" className="text-white hover:bg-slate-700" onClick={() => loadOrders(technician, viewDate)} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white text-xs" onClick={() => { setTechnician(''); localStorage.removeItem('sat_technician'); }}>
              Salir
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* KPIs del día */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-700 bg-white' },
            { label: 'Pendiente', value: stats.pendientes, color: 'text-yellow-700 bg-yellow-50' },
            { label: 'En curso', value: stats.en_curso, color: 'text-blue-700 bg-blue-50' },
            { label: 'Hechas', value: stats.completadas, color: 'text-green-700 bg-green-50' },
          ].map((s, i) => (
            <div key={i} className={`rounded-xl p-2.5 text-center border ${s.color}`}>
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] font-medium opacity-70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Alerta stock bajo */}
        {stockItems.filter(s => s.min_stock > 0 && s.quantity <= s.min_stock).length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800">⚠ Stock bajo en almacén</p>
              <p className="text-xs text-orange-600 mt-0.5">
                {stockItems.filter(s => s.min_stock > 0 && s.quantity <= s.min_stock).map(s => `${s.name} (${s.quantity} ${s.unit})`).join(' · ')}
              </p>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-400">Cargando órdenes...</span>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-3" />
            <p className="font-semibold text-gray-700">No hay órdenes para este día</p>
            <p className="text-sm text-gray-400 mt-1">
              {isViewingToday ? '¡Día libre! 🎉' : 'Sin órdenes asignadas para esta fecha'}
            </p>
          </div>
        )}

        {/* Lista de órdenes */}
        <div className="space-y-3">
          {orders.map(order => {
            const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.pendiente;
            const isUrgent = order.priority === 'urgente' || order.priority === 'alta';
            return (
              <button
                key={order.id}
                className={`w-full text-left bg-white rounded-2xl shadow-sm border-2 p-4 transition-all active:scale-[0.98]
                  ${isUrgent ? 'border-red-200' : 'border-transparent'}
                  ${order.status === 'completada' ? 'opacity-70' : ''}
                  hover:shadow-md`}
                onClick={() => openOrder(order)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Número + prioridad */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-gray-400">#{order.order_number || 'S/N'}</span>
                      {isUrgent && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />{order.priority}</span>}
                    </div>
                    {/* Cliente */}
                    <p className="font-bold text-gray-900 text-base leading-tight">{order.contact_name}</p>
                    {/* Tipo y equipo */}
                    <p className="text-sm text-gray-500 mt-0.5 capitalize">{order.type?.replace(/_/g, ' ')} · {order.equipment_type?.replace(/_/g, ' ')}</p>
                    {/* Descripción */}
                    {order.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{order.description}</p>}
                    {/* Hora */}
                    {order.scheduled_time && (
                      <p className="text-xs text-purple-600 font-semibold mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{order.scheduled_time}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Badge className={`text-[11px] border ${sc.color}`}>{sc.label}</Badge>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dialog: actualizar orden */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg w-[96vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              #{selectedOrder?.order_number || 'S/N'} — {selectedOrder?.contact_name}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Info rápida */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1.5">
                <p className="font-medium capitalize">{selectedOrder.type?.replace(/_/g, ' ')} · {selectedOrder.equipment_type?.replace(/_/g, ' ')}</p>
                {selectedOrder.description && <p className="text-gray-600 text-xs">{selectedOrder.description}</p>}
                {selectedOrder.diagnosis && <p className="text-xs text-blue-700 bg-blue-50 rounded p-1.5">🔍 Diagnóstico previo: {selectedOrder.diagnosis}</p>}
              </div>

              {/* Estado */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Estado de la orden</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUSES.map(s => {
                    const sc = STATUS_CONFIG[s];
                    return (
                      <button key={s} onClick={() => setUpdateForm(f => ({ ...f, status: s }))}
                        className={`py-2.5 px-3 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2
                          ${updateForm.status === s ? `${sc.color} border-current shadow-sm` : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                        <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Diagnóstico */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Diagnóstico</label>
                <textarea
                  className="w-full border border-input rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={2}
                  placeholder="Describe el problema encontrado..."
                  value={updateForm.diagnosis}
                  onChange={e => setUpdateForm(f => ({ ...f, diagnosis: e.target.value }))}
                />
              </div>

              {/* Solución */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Solución aplicada</label>
                <textarea
                  className="w-full border border-input rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={2}
                  placeholder="Describe la solución que has aplicado..."
                  value={updateForm.solution}
                  onChange={e => setUpdateForm(f => ({ ...f, solution: e.target.value }))}
                />
              </div>

              {/* Horas */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Horas trabajadas</label>
                <NumberField
                  value={updateForm.labor_hours}
                  onChange={v => setUpdateForm(f => ({ ...f, labor_hours: v }))}
                  className="w-28"
                  placeholder="0"
                />
              </div>

              {/* Materiales con búsqueda de stock */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Materiales usados</label>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setShowMaterialForm(p => !p)}>
                    <Plus className="w-3 h-3 mr-1" />Manual
                  </Button>
                </div>

                {/* Buscar en almacén */}
                <div className="mb-2">
                  <Input
                    placeholder="🔍 Buscar en almacén..."
                    value={stockSearch}
                    onChange={e => setStockSearch(e.target.value)}
                    className="text-sm h-8"
                  />
                  {stockSearch.length >= 2 && (
                    <div className="border rounded-lg mt-1 bg-white shadow-sm max-h-36 overflow-y-auto divide-y">
                      {stockItems
                        .filter(s => s.name.toLowerCase().includes(stockSearch.toLowerCase()) || (s.reference || '').toLowerCase().includes(stockSearch.toLowerCase()))
                        .slice(0, 8)
                        .map(item => (
                          <button key={item.id} type="button"
                            onClick={() => { addStockMaterial(item); setStockSearch(''); }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-blue-50 transition-colors">
                            <div>
                              <p className="font-medium text-gray-800">{item.name}</p>
                              {item.reference && <p className="text-gray-400">Ref: {item.reference}</p>}
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                              <p className={`font-bold ${item.min_stock > 0 && item.quantity <= item.min_stock ? 'text-orange-600' : 'text-green-600'}`}>{item.quantity} {item.unit}</p>
                              {item.unit_price > 0 && <p className="text-gray-400">{item.unit_price}€/ud</p>}
                            </div>
                          </button>
                        ))}
                      {stockItems.filter(s => s.name.toLowerCase().includes(stockSearch.toLowerCase())).length === 0 &&
                        <p className="text-center text-gray-400 py-3 text-xs">Sin resultados en almacén</p>
                      }
                    </div>
                  )}
                </div>

                {showMaterialForm && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-2 space-y-2">
                    <Input placeholder="Material *" value={newMaterial.material} onChange={e => setNewMaterial(m => ({ ...m, material: e.target.value }))} className="text-sm h-8" />
                    <div className="grid grid-cols-2 gap-2">
                      <NumberField placeholder="Cant." value={newMaterial.quantity} onChange={v => setNewMaterial(m => ({ ...m, quantity: v }))} className="text-sm h-8" />
                      <NumberField placeholder="€/ud" value={newMaterial.unit_price} onChange={v => setNewMaterial(m => ({ ...m, unit_price: v }))} className="text-sm h-8" />
                    </div>
                    <Button size="sm" className="w-full h-8 bg-blue-600 hover:bg-blue-700 text-xs" onClick={addMaterial}>Añadir material</Button>
                  </div>
                )}

                {(updateForm.materials_used || []).length > 0 && (
                  <div className="space-y-1.5">
                    {updateForm.materials_used.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm">
                        <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="flex-1 truncate">{m.material}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setUpdateForm(f => ({
                            ...f, materials_used: f.materials_used.map((mat, idx) =>
                              idx === i ? { ...mat, quantity: Math.max(0.1, (mat.quantity || 1) - 1) } : mat)
                          }))} className="text-gray-400 hover:text-gray-600 w-5 h-5 rounded border text-xs flex items-center justify-center">−</button>
                          <span className="text-gray-600 text-xs w-8 text-center">{m.quantity}</span>
                          <button onClick={() => setUpdateForm(f => ({
                            ...f, materials_used: f.materials_used.map((mat, idx) =>
                              idx === i ? { ...mat, quantity: (mat.quantity || 1) + 1 } : mat)
                          }))} className="text-gray-400 hover:text-gray-600 w-5 h-5 rounded border text-xs flex items-center justify-center">+</button>
                        </div>
                        <span className="font-semibold text-gray-700 text-xs">{((m.quantity || 0) * (m.unit_price || 0)).toFixed(2)}€</span>
                        <button onClick={() => removeMaterial(i)} className="text-red-400 hover:text-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <p className="text-right text-xs text-gray-500 pr-1">
                      Total materiales: <strong>{(updateForm.materials_used || []).reduce((s, m) => s + (m.quantity || 0) * (m.unit_price || 0), 0).toFixed(2)} €</strong>
                    </p>
                  </div>
                )}

                {/* Aviso descuento automático */}
                {updateForm.status === 'completada' && (updateForm.materials_used || []).length > 0 && selectedOrder?.status !== 'completada' && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
                    <TrendingDown className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">Al guardar como <strong>Completada</strong> se descontarán automáticamente {(updateForm.materials_used || []).length} material(es) del almacén.</p>
                  </div>
                )}
              </div>

              {/* Fotos ANTES */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">📷 Fotos ANTES del trabajo</label>
                {(updateForm.photos_before || []).length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {updateForm.photos_before.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setUpdateForm(f => ({ ...f, photos_before: f.photos_before.filter((_, idx) => idx !== i) }))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-orange-200 rounded-xl cursor-pointer hover:bg-orange-50 text-sm text-orange-500 transition-colors ${uploadingPhoto === 'photos_before' ? 'opacity-60' : ''}`}>
                  {uploadingPhoto === 'photos_before' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  {uploadingPhoto === 'photos_before' ? 'Subiendo...' : 'Foto antes / avería'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!!uploadingPhoto}
                    onChange={e => handlePhotoUpload(e, 'photos_before')} />
                </label>
              </div>

              {/* Fotos DESPUÉS */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">✅ Fotos DESPUÉS del trabajo</label>
                {(updateForm.photos_after || []).length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {updateForm.photos_after.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setUpdateForm(f => ({ ...f, photos_after: f.photos_after.filter((_, idx) => idx !== i) }))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className={`flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-green-200 rounded-xl cursor-pointer hover:bg-green-50 text-sm text-green-600 transition-colors ${uploadingPhoto === 'photos_after' ? 'opacity-60' : ''}`}>
                  {uploadingPhoto === 'photos_after' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                  {uploadingPhoto === 'photos_after' ? 'Subiendo...' : 'Foto instalación terminada'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" disabled={!!uploadingPhoto}
                    onChange={e => handlePhotoUpload(e, 'photos_after')} />
                </label>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1 block">Notas adicionales</label>
                <textarea
                  className="w-full border border-input rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={2}
                  placeholder="Observaciones, recomendaciones..."
                  value={updateForm.notes}
                  onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              {/* Historial de visitas anteriores a este cliente */}
              {selectedOrder?.contact_id && <ClientHistorySection contactId={selectedOrder.contact_id} currentOrderId={selectedOrder.id} />}

              <Button onClick={handleSaveUpdate} disabled={saving || discounting} className="w-full h-12 text-base bg-orange-600 hover:bg-orange-700 gap-2">
                {(saving || discounting) ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {discounting ? 'Actualizando almacén...' : saving ? 'Guardando...' : 'Guardar parte de trabajo'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}