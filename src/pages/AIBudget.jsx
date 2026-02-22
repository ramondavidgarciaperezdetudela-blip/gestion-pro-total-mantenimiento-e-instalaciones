import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bot, Plus, Trash2, Send, Search, Edit, Printer, Mail, User } from 'lucide-react';
import { format } from 'date-fns';
import CompanyHeader from '../components/CompanyHeader';
import PrintButton from '../components/PrintButton';
import { useRef } from 'react';

export default function AIBudget() {
  const [contacts, setContacts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [items, setItems] = useState([]);
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [showSupplierPick, setShowSupplierPick] = useState(null);
  const [previewBudget, setPreviewBudget] = useState(null);
  const [budgetTitle, setBudgetTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [historyRetain, setHistoryRetain] = useState(90);
  const printRef = useRef(null);
  const IVA = 21;

  useEffect(() => {
    Promise.all([
      base44.entities.Contact.list('name', 500),
      base44.entities.Supplier.list('name', 100),
      base44.entities.AIConsultation.filter({ type: 'presupuesto' }, '-created_date', 50),
    ]).then(([c, s, b]) => {
      setContacts(c);
      setSuppliers(s);
      // Filtrar por fecha de retención
      setBudgets(b.filter(x => {
        if (!x.expires_days) return true;
        const created = new Date(x.created_date || x.date);
        const diff = (Date.now() - created.getTime()) / 86400000;
        return diff < (x.expires_days || 90);
      }));
    });
  }, []);

  const filteredContacts = contacts.filter(c =>
    `${c.name} ${c.surname || ''} ${c.company_name || ''}`.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const addItemManually = () => {
    setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0, supplier: '', discount: 0 }]);
  };

  const updateItem = (i, field, val) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };

  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    const supplierNames = suppliers.map(s => s.name).join(', ');
    const prompt = `Eres un asistente técnico de climatización/refrigeración/electricidad en España.
El usuario busca: "${aiQuery}"
Proveedores disponibles: ${supplierNames || 'varios'}
Devuelve una lista de materiales/partidas para un presupuesto profesional.
Incluye descripción, cantidad sugerida, precio unitario orientativo (€), y proveedor recomendado.
`;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
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
    setItems(prev => [...prev, { ...s, supplier: supplierOverride || s.supplier || '', discount: 0 }]);
  };

  const [ivaRate, setIvaRate] = useState(21);
  const subtotal = items.reduce((s, i) => s + (i.quantity || 0) * (i.unit_price || 0) * (1 - (i.discount || 0) / 100), 0);
  const ivaAmount = subtotal * ivaRate / 100;
  const total = subtotal + ivaAmount;

  const saveBudget = async () => {
    const data = {
      query: budgetTitle || aiQuery || 'Presupuesto',
      response: JSON.stringify(items),
      type: 'presupuesto',
      date: format(new Date(), 'yyyy-MM-dd'),
      contact_id: selectedContact?.id || '',
      contact_name: selectedContact ? `${selectedContact.name} ${selectedContact.surname || ''}` : '',
      budget_items: items,
      expires_days: historyRetain,
    };
    await base44.entities.AIConsultation.create(data);
    // Vincular al cliente
    if (selectedContact?.id) {
      await base44.entities.ClientDocument.create({
        contact_id: selectedContact.id,
        contact_name: `${selectedContact.name} ${selectedContact.surname || ''}`,
        title: budgetTitle || 'Presupuesto IA',
        doc_type: 'presupuesto',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: `Total: ${total.toFixed(2)} €`
      });
    }
    const b = await base44.entities.AIConsultation.filter({ type: 'presupuesto' }, '-created_date', 50);
    setBudgets(b);
    alert('Presupuesto guardado y vinculado al cliente');
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Bot className="w-6 h-6 text-blue-600" />Presupuesto Asistido por IA
      </h1>

      {/* Selección de cliente */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            {selectedContact ? (
              <div className="flex items-center gap-2 flex-1">
                <div>
                  <p className="font-medium">{selectedContact.name} {selectedContact.surname}</p>
                  {selectedContact.company_name && <p className="text-xs text-gray-500">{selectedContact.company_name}</p>}
                  {selectedContact.phone && <p className="text-xs text-gray-500">{selectedContact.phone}</p>}
                  {selectedContact.address && <p className="text-xs text-gray-500">{selectedContact.address}, {selectedContact.city}</p>}
                </div>
                <Button size="sm" variant="outline" className="ml-auto" onClick={() => setSelectedContact(null)}>Cambiar</Button>
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-2">Selecciona el cliente para este presupuesto</p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9" placeholder="Buscar cliente..." value={contactSearch}
                    onChange={e => { setContactSearch(e.target.value); setShowContactSearch(true); }}
                    onFocus={() => setShowContactSearch(true)} />
                </div>
                {showContactSearch && contactSearch && (
                  <div className="border rounded-lg mt-1 bg-white shadow-lg max-h-48 overflow-y-auto z-10 relative">
                    {filteredContacts.slice(0, 10).map(c => (
                      <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                        onClick={() => { setSelectedContact(c); setContactSearch(''); setShowContactSearch(false); }}>
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

      {/* Título y configuración */}
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Título del presupuesto" value={budgetTitle} onChange={e => setBudgetTitle(e.target.value)} />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">Guardar historial:</label>
          <Select value={String(historyRetain)} onValueChange={v => setHistoryRetain(Number(v))}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="60">60 días</SelectItem>
              <SelectItem value="90">90 días</SelectItem>
              <SelectItem value="180">6 meses</SelectItem>
              <SelectItem value="365">1 año</SelectItem>
              <SelectItem value="9999">Siempre</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Búsqueda IA */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm font-medium text-blue-700 mb-2">🤖 Buscar materiales con IA</p>
          <div className="flex gap-2">
            <Input placeholder='Ej: "Instalación split 3000 frigorías" o "Cámara frigorífica 20m²"...'
              value={aiQuery} onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askAI()} />
            <Button onClick={askAI} disabled={aiLoading} className="bg-blue-600 shrink-0">
              {aiLoading ? '...' : <Send className="w-4 h-4" />}
            </Button>
          </div>
          {aiSuggestions.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-blue-700">Sugerencias IA — haz clic para añadir:</p>
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
                      Cambiar proveedor
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

      {/* Líneas del presupuesto */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Líneas del presupuesto</CardTitle>
            <Button size="sm" variant="outline" onClick={addItemManually}><Plus className="w-4 h-4 mr-1" />Añadir línea</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Busca con IA o añade líneas manualmente</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-y">
                    <th className="text-left p-2 font-medium text-gray-600">Descripción</th>
                    <th className="text-center p-2 font-medium text-gray-600 w-16">Cant.</th>
                    <th className="text-center p-2 font-medium text-gray-600 w-24">P. Unit. €</th>
                    <th className="text-center p-2 font-medium text-gray-600 w-16">Dto %</th>
                    <th className="text-left p-2 font-medium text-gray-600">Proveedor</th>
                    <th className="text-right p-2 font-medium text-gray-600 w-24">Total €</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item, i) => {
                    const lineTotal = (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100);
                    return (
                      <tr key={i}>
                        <td className="p-1"><Input className="h-7 text-xs" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></td>
                        <td className="p-1"><Input type="number" className="h-7 text-xs text-center" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} /></td>
                        <td className="p-1"><Input type="number" className="h-7 text-xs text-center" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} /></td>
                        <td className="p-1"><Input type="number" className="h-7 text-xs text-center" value={item.discount || 0} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value) || 0)} /></td>
                        <td className="p-1"><Input className="h-7 text-xs" value={item.supplier || ''} onChange={e => updateItem(i, 'supplier', e.target.value)} /></td>
                        <td className="p-2 text-right font-medium text-xs">{lineTotal.toFixed(2)}</td>
                        <td className="p-1"><button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4 border-t bg-gray-50 text-sm space-y-1 text-right">
                <p>Subtotal: <strong>{subtotal.toFixed(2)} €</strong></p>
                <p>IVA ({ivaRate}%): <strong>{ivaAmount.toFixed(2)} €</strong></p>
                <p className="text-lg font-bold text-blue-700">TOTAL: {total.toFixed(2)} €</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* IVA y notas */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 whitespace-nowrap">IVA:</label>
        <Select value={String(ivaRate)} onValueChange={v => setIvaRate(Number(v))}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0% (Exento)</SelectItem>
            <SelectItem value="4">4% (Superreducido)</SelectItem>
            <SelectItem value="10">10% (Reducido)</SelectItem>
            <SelectItem value="21">21% (General)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex-1 text-right text-sm font-bold text-blue-700">TOTAL: {total.toFixed(2)} €</div>
      </div>
      <Textarea placeholder="Observaciones y condiciones del presupuesto..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />

      {/* Acciones */}
      {items.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={saveBudget} className="bg-blue-700">Guardar presupuesto</Button>
          <Button variant="outline" onClick={() => setPreviewBudget({ items, selectedContact, budgetTitle, notes, subtotal, ivaAmount, total })}>
            <Printer className="w-4 h-4 mr-1" />Vista previa / Imprimir
          </Button>
          {selectedContact?.email && (
            <Button variant="outline" onClick={() => {
              const body = encodeURIComponent(`Estimado/a ${selectedContact.name},\n\nAdjuntamos presupuesto por importe de ${total.toFixed(2)} €.\n\n${notes || ''}\n\nQuedamos a su disposición.`);
              window.open(`mailto:${selectedContact.email}?subject=Presupuesto&body=${body}`, '_blank');
            }}>
              <Mail className="w-4 h-4 mr-1" />Enviar por email
            </Button>
          )}
        </div>
      )}

      {/* Preview/Print */}
      <Dialog open={!!previewBudget} onOpenChange={() => setPreviewBudget(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div ref={printRef} className="space-y-4">
            <CompanyHeader />
            <div className="border-b pb-3">
              <h2 className="text-xl font-bold">{previewBudget?.budgetTitle || 'PRESUPUESTO'}</h2>
              <p className="text-sm text-gray-400">Nº: PRES-{Date.now().toString().slice(-6)} · Válido 30 días</p>
              {previewBudget?.selectedContact && (
                <div className="text-sm mt-1">
                  <p><strong>Cliente:</strong> {previewBudget.selectedContact.name} {previewBudget.selectedContact.surname}</p>
                  {previewBudget.selectedContact.company_name && <p>{previewBudget.selectedContact.company_name}</p>}
                  {previewBudget.selectedContact.address && <p>{previewBudget.selectedContact.address}, {previewBudget.selectedContact.city}</p>}
                  {previewBudget.selectedContact.nif && <p>NIF: {previewBudget.selectedContact.nif}</p>}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-1">Fecha: {format(new Date(), 'dd/MM/yyyy')}</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-gray-50"><th className="text-left p-2">Descripción</th><th className="text-center p-2">Cant.</th><th className="text-right p-2">P. Unit.</th><th className="text-right p-2">Total</th></tr></thead>
              <tbody className="divide-y">
                {previewBudget?.items?.map((item, i) => {
                  const lt = (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100);
                  return (
                    <tr key={i}>
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
              <p>IVA ({ivaRate}%): {previewBudget?.ivaAmount?.toFixed(2)} €</p>
              <p className="text-lg font-bold">TOTAL: {previewBudget?.total?.toFixed(2)} €</p>
            </div>
            {previewBudget?.notes && <p className="text-sm border-t pt-2 text-gray-600">{previewBudget.notes}</p>}
          </div>
          <PrintButton contentRef={printRef} title="Presupuesto" />
        </DialogContent>
      </Dialog>

      {/* Historial de presupuestos guardados */}
      {budgets.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Historial de presupuestos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-64 overflow-y-auto">
              {budgets.map(b => (
                <div key={b.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-sm">{b.query}</p>
                    <p className="text-xs text-gray-500">{b.date} {b.contact_name && `| ${b.contact_name}`}</p>
                    {b.budget_items?.length > 0 && <p className="text-xs text-gray-400">{b.budget_items.length} líneas</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => {
                    setItems(b.budget_items || []);
                    setBudgetTitle(b.query);
                    const c = contacts.find(x => x.id === b.contact_id);
                    if (c) setSelectedContact(c);
                  }}>Editar</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}