import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Plus, Trash2, Send, Search, Edit, Printer, Mail, User, Save, RefreshCw, Copy, Eye } from 'lucide-react';
import { format } from 'date-fns';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';

const EMPTY_BUDGET = {
  budgetTitle: '',
  notes: '',
  items: [],
  ivaRate: 21,
  selectedContact: null,
  historyRetain: 9999,
  editingId: null,
};

export default function AIBudget() {
  const [contacts, setContacts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [current, setCurrent] = useState({ ...EMPTY_BUDGET });
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showSupplierPick, setShowSupplierPick] = useState(null);
  const [previewBudget, setPreviewBudget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    Promise.all([
      base44.entities.Contact.list('name', 500),
      base44.entities.Supplier.list('name', 100),
      base44.entities.AIConsultation.filter({ type: 'presupuesto' }, '-created_date', 100),
    ]).then(([c, s, b]) => {
      setContacts(c);
      setSuppliers(s);
      setBudgets(b);
    });
  };

  const filteredContacts = contacts.filter(c =>
    `${c.name} ${c.surname || ''} ${c.company_name || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const set = (field, val) => setCurrent(prev => ({ ...prev, [field]: val }));

  const addItemManually = () => {
    set('items', [...current.items, { description: '', quantity: 1, unit_price: 0, supplier: '', discount: 0 }]);
  };

  const updateItem = (i, field, val) => {
    set('items', current.items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  const removeItem = (i) => set('items', current.items.filter((_, idx) => idx !== i));

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    const supplierNames = suppliers.map(s => s.name).join(', ');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Eres un asistente técnico de climatización/refrigeración/electricidad en España.
El usuario busca: "${aiQuery}"
Proveedores disponibles: ${supplierNames || 'varios'}
Devuelve materiales/partidas para presupuesto profesional con descripción, cantidad, precio unitario (€) y proveedor recomendado.`,
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unit_price: { type: 'number' },
                supplier: { type: 'string' }
              }
            }
          }
        }
      }
    });
    setAiSuggestions(result?.items || []);
    setAiLoading(false);
  };

  const addSuggestion = (s, supplierOverride) => {
    set('items', [...current.items, { ...s, supplier: supplierOverride || s.supplier || '', discount: 0 }]);
  };

  const subtotal = current.items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0) * (1 - (i.discount || 0) / 100), 0);
  const ivaAmount = subtotal * current.ivaRate / 100;
  const total = subtotal + ivaAmount;

  const buildSaveData = () => ({
    query: current.budgetTitle || aiQuery || 'Presupuesto sin título',
    response: JSON.stringify(current.items),
    type: 'presupuesto',
    date: format(new Date(), 'yyyy-MM-dd'),
    contact_id: current.selectedContact?.id || '',
    contact_name: current.selectedContact
      ? `${current.selectedContact.name} ${current.selectedContact.surname || ''}`.trim()
      : '',
    budget_items: current.items,
    expires_days: current.historyRetain,
    notes: current.notes,
    iva_rate: current.ivaRate,
    subtotal,
    iva_amount: ivaAmount,
    total,
  });

  const saveBudget = async () => {
    setSaving(true);
    const data = buildSaveData();
    let savedId = current.editingId;

    if (current.editingId) {
      await base44.entities.AIConsultation.update(current.editingId, data);
    } else {
      const created = await base44.entities.AIConsultation.create(data);
      savedId = created.id;
      set('editingId', created.id);
    }

    // Vincular al cliente si hay uno seleccionado
    if (current.selectedContact?.id) {
      await base44.entities.ClientDocument.create({
        contact_id: current.selectedContact.id,
        contact_name: `${current.selectedContact.name} ${current.selectedContact.surname || ''}`.trim(),
        title: current.budgetTitle || 'Presupuesto IA',
        doc_type: 'presupuesto',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: `Total: ${total.toFixed(2)} €`
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadAll();
  };

  const updateBudget = async () => {
    if (!current.editingId) return saveBudget();
    setSaving(true);
    await base44.entities.AIConsultation.update(current.editingId, buildSaveData());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadAll();
  };

  const deleteBudget = async (id) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    await base44.entities.AIConsultation.delete(id);
    if (current.editingId === id) setCurrent({ ...EMPTY_BUDGET });
    loadAll();
  };

  const loadBudget = (b) => {
    const contact = contacts.find(x => x.id === b.contact_id) || null;
    setCurrent({
      budgetTitle: b.query || '',
      notes: b.notes || '',
      items: b.budget_items || [],
      ivaRate: b.iva_rate || 21,
      selectedContact: contact,
      historyRetain: b.expires_days || 9999,
      editingId: b.id,
    });
    setAiSuggestions([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const duplicateBudget = (b) => {
    const contact = contacts.find(x => x.id === b.contact_id) || null;
    setCurrent({
      budgetTitle: `${b.query || ''} (copia)`,
      notes: b.notes || '',
      items: b.budget_items || [],
      ivaRate: b.iva_rate || 21,
      selectedContact: contact,
      historyRetain: b.expires_days || 9999,
      editingId: null,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const newBudget = () => {
    setCurrent({ ...EMPTY_BUDGET });
    setAiSuggestions([]);
    setAiQuery('');
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" /> Presupuesto IA
        </h1>
        <div className="flex gap-2 flex-wrap">
          {current.editingId && (
            <Badge className="bg-blue-100 text-blue-700 text-xs py-1">Editando #{current.editingId.slice(-6)}</Badge>
          )}
          <Button size="sm" variant="outline" onClick={newBudget}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo
          </Button>
        </div>
      </div>

      {/* Cliente */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400 flex-shrink-0" />
            {current.selectedContact ? (
              <div className="flex items-center gap-2 flex-1">
                <div>
                  <p className="font-medium">{current.selectedContact.name} {current.selectedContact.surname}</p>
                  {current.selectedContact.company_name && <p className="text-xs text-gray-500">{current.selectedContact.company_name}</p>}
                  {current.selectedContact.phone && <p className="text-xs text-gray-500">{current.selectedContact.phone}</p>}
                </div>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => set('selectedContact', null)}>Cambiar</Button>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-xs text-gray-400 mb-1">Cliente (opcional — si no se vincula, se guarda en historial general)</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Buscar cliente..." value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); setShowContactSearch(true); }}
                    onFocus={() => setShowContactSearch(true)} />
                </div>
                {showContactSearch && contactSearch && (
                  <div className="border rounded-lg mt-1 bg-white shadow-lg max-h-48 overflow-y-auto z-20 absolute w-64">
                    {filteredContacts.slice(0, 10).map(c => (
                      <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                        onClick={() => { set('selectedContact', c); setContactSearch(''); setShowContactSearch(false); }}>
                        <p className="font-medium">{c.name} {c.surname}</p>
                        {c.company_name && <p className="text-xs text-gray-400">{c.company_name}</p>}
                      </button>
                    ))}
                    {filteredContacts.length === 0 && <p className="p-3 text-sm text-gray-400">No encontrado</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Título + IVA + retención */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Input className="sm:col-span-2" placeholder="Título del presupuesto" value={current.budgetTitle}
          onChange={e => set('budgetTitle', e.target.value)} />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">IVA:</label>
          <Select value={String(current.ivaRate)} onValueChange={v => set('ivaRate', Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="4">4%</SelectItem>
              <SelectItem value="10">10%</SelectItem>
              <SelectItem value="21">21%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Búsqueda IA */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-700 mb-2">🤖 Buscar materiales con IA</p>
          <div className="flex gap-2">
            <Input placeholder='Ej: "Instalación split 3000 frigorías", "Cámara frigorífica 20m²", "Cuadro eléctrico industrial"...'
              value={aiQuery} onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askAI()} />
            <Button onClick={askAI} disabled={aiLoading} className="bg-blue-600 shrink-0">
              {aiLoading ? <span className="animate-spin">⏳</span> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {aiSuggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-blue-700">Sugerencias IA — haz clic para añadir:</p>
                <Button size="sm" variant="outline" className="text-xs h-6"
                  onClick={() => { aiSuggestions.forEach(s => addSuggestion(s)); setAiSuggestions([]); }}>
                  Añadir todas
                </Button>
              </div>
              {aiSuggestions.map((s, i) => (
                <div key={i} className="bg-white border rounded-lg p-2 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.description}</p>
                    <p className="text-xs text-gray-500">{s.quantity} uds × {s.unit_price?.toFixed(2)} €
                      {s.supplier && <span className="ml-2 text-blue-600">— {s.supplier}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" className="bg-blue-600 text-xs h-7" onClick={() => addSuggestion(s)}>
                      <Plus className="w-3 h-3 mr-1" />Añadir
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowSupplierPick(i)}>
                      Proveedor
                    </Button>
                  </div>
                  {showSupplierPick === i && (
                    <Dialog open={true} onOpenChange={() => setShowSupplierPick(null)}>
                      <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>Elegir proveedor</DialogTitle></DialogHeader>
                        <div className="space-y-2">
                          {suppliers.map(sup => (
                            <button key={sup.id} className="w-full text-left p-2 hover:bg-blue-50 border rounded text-sm"
                              onClick={() => { addSuggestion(s, sup.name); setShowSupplierPick(null); }}>
                              {sup.name}
                            </button>
                          ))}
                          <Button variant="outline" className="w-full" onClick={() => { addSuggestion(s); setShowSupplierPick(null); }}>
                            Sin proveedor específico
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Líneas */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Líneas del presupuesto</CardTitle>
            <Button size="sm" variant="outline" onClick={addItemManually}><Plus className="w-4 h-4 mr-1" />Añadir línea</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {current.items.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Busca con IA o añade líneas manualmente</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-y">
                    <th className="text-left p-2 font-medium text-gray-600">Descripción</th>
                    <th className="text-center p-2 font-medium text-gray-600 w-16">Cant.</th>
                    <th className="text-center p-2 font-medium text-gray-600 w-24">P.Unit €</th>
                    <th className="text-center p-2 font-medium text-gray-600 w-16">Dto%</th>
                    <th className="text-left p-2 font-medium text-gray-600 hidden sm:table-cell">Proveedor</th>
                    <th className="text-right p-2 font-medium text-gray-600 w-20">Total</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {current.items.map((item, i) => {
                    const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100);
                    return (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-1"><Input className="h-7 text-xs" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></td>
                        <td className="p-1"><Input type="number" className="h-7 text-xs text-center" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                        <td className="p-1"><Input type="number" className="h-7 text-xs text-center" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                        <td className="p-1"><Input type="number" className="h-7 text-xs text-center" value={item.discount || 0} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} /></td>
                        <td className="p-1 hidden sm:table-cell"><Input className="h-7 text-xs" value={item.supplier || ''} onChange={e => updateItem(i, 'supplier', e.target.value)} /></td>
                        <td className="p-2 text-right font-medium text-xs">{lineTotal.toFixed(2)} €</td>
                        <td className="p-1"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4 border-t bg-gray-50 text-sm space-y-1 text-right">
                <p>Subtotal: <strong>{subtotal.toFixed(2)} €</strong></p>
                <p>IVA ({current.ivaRate}%): <strong>{ivaAmount.toFixed(2)} €</strong></p>
                <p className="text-lg font-bold text-blue-700">TOTAL: {total.toFixed(2)} €</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Textarea placeholder="Observaciones, condiciones, validez del presupuesto..." value={current.notes}
        onChange={e => set('notes', e.target.value)} rows={3} />

      {/* Botones acción */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={saveBudget} disabled={saving || current.items.length === 0} className="bg-blue-700 gap-2">
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : current.editingId ? 'Guardar copia' : 'Guardar presupuesto'}
        </Button>
        {current.editingId && (
          <Button onClick={updateBudget} disabled={saving} variant="outline" className="gap-2 border-blue-400 text-blue-600">
            <RefreshCw className="w-4 h-4" />
            {saving ? 'Actualizando...' : saved ? '✓ Actualizado' : 'Actualizar datos'}
          </Button>
        )}
        {current.items.length > 0 && (
          <Button variant="outline" onClick={() => setPreviewBudget({ ...current, subtotal, ivaAmount, total })}>
            <Eye className="w-4 h-4 mr-1" />Vista previa / Imprimir
          </Button>
        )}
        {current.selectedContact?.email && current.items.length > 0 && (
          <Button variant="outline" onClick={() => {
            const body = encodeURIComponent(`Estimado/a ${current.selectedContact.name},\n\nAdjuntamos presupuesto "${current.budgetTitle || 'Presupuesto'}" por importe de ${total.toFixed(2)} €.\n\n${current.notes || ''}\n\nQuedamos a su disposición.`);
            window.open(`mailto:${current.selectedContact.email}?subject=Presupuesto ${current.budgetTitle || ''}&body=${body}`, '_blank');
          }}>
            <Mail className="w-4 h-4 mr-1" />Email
          </Button>
        )}
      </div>

      {/* Historial */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Historial de presupuestos ({budgets.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {budgets.map(b => {
                const isLoaded = current.editingId === b.id;
                return (
                  <div key={b.id} className={`p-3 flex items-center justify-between hover:bg-gray-50 gap-2 ${isLoaded ? 'bg-blue-50 border-l-4 border-blue-400' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{b.query}</p>
                      <p className="text-xs text-gray-500">
                        {b.date}
                        {b.contact_name && <span> · 👤 {b.contact_name}</span>}
                        {b.total > 0 && <span className="ml-1 font-semibold text-blue-600"> · {b.total?.toFixed(2)} €</span>}
                      </p>
                      <p className="text-xs text-gray-400">{b.budget_items?.length || 0} líneas</p>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => loadBudget(b)}>
                        <Edit className="w-3 h-3" />Editar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                        setPreviewBudget({
                          budgetTitle: b.query, notes: b.notes || '',
                          items: b.budget_items || [],
                          selectedContact: contacts.find(x => x.id === b.contact_id) || null,
                          subtotal: b.subtotal || 0, ivaAmount: b.iva_amount || 0, total: b.total || 0,
                          ivaRate: b.iva_rate || 21,
                        });
                      }}>
                        <Printer className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => duplicateBudget(b)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <button onClick={() => deleteBudget(b.id)} className="p-1.5 text-red-300 hover:text-red-500 rounded hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview/Imprimir */}
      <Dialog open={!!previewBudget} onOpenChange={() => setPreviewBudget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vista previa del presupuesto</DialogTitle>
          </DialogHeader>
          <div ref={printRef} className="space-y-4 p-2">
            <CompanyHeader />
            <div className="border-b pb-3">
              <h2 className="text-xl font-bold">{previewBudget?.budgetTitle || 'PRESUPUESTO'}</h2>
              <p className="text-sm text-gray-400">Nº: PRES-{Date.now().toString().slice(-6)} · Válido 30 días · Fecha: {format(new Date(), 'dd/MM/yyyy')}</p>
              {previewBudget?.selectedContact && (
                <div className="text-sm mt-2 p-2 bg-gray-50 rounded">
                  <p><strong>Cliente:</strong> {previewBudget.selectedContact.name} {previewBudget.selectedContact.surname}</p>
                  {previewBudget.selectedContact.company_name && <p>{previewBudget.selectedContact.company_name}</p>}
                  {previewBudget.selectedContact.nif && <p>NIF: {previewBudget.selectedContact.nif}</p>}
                  {previewBudget.selectedContact.address && <p>{previewBudget.selectedContact.address}, {previewBudget.selectedContact.city}</p>}
                </div>
              )}
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left p-2">Descripción</th>
                  <th className="text-center p-2 w-14">Cant.</th>
                  <th className="text-right p-2 w-20">P.Unit.</th>
                  <th className="text-right p-2 w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {previewBudget?.items?.map((item, i) => {
                  const lt = (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100);
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="p-2">{item.description}{item.supplier && <span className="text-xs text-gray-400 ml-1">({item.supplier})</span>}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right">{(item.unit_price || 0).toFixed(2)} €</td>
                      <td className="p-2 text-right font-medium">{lt.toFixed(2)} €</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-right space-y-1 text-sm border-t pt-2">
              <p>Subtotal: {previewBudget?.subtotal?.toFixed(2)} €</p>
              <p>IVA ({previewBudget?.ivaRate || 21}%): {previewBudget?.ivaAmount?.toFixed(2)} €</p>
              <p className="text-lg font-bold text-blue-700">TOTAL: {previewBudget?.total?.toFixed(2)} €</p>
            </div>
            {previewBudget?.notes && (
              <div className="text-sm border-t pt-2 text-gray-600 bg-gray-50 p-3 rounded">
                <strong>Observaciones:</strong> {previewBudget.notes}
              </div>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <PrintButton contentRef={printRef} title={previewBudget?.budgetTitle || 'Presupuesto'} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}