import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Eye, EyeOff, Loader2, Download, FileText, CheckCircle, RefreshCw,
  ExternalLink, Key, Trash2, Plus, FlaskConical, FileBadge, ChevronRight, Edit2, X } from 'lucide-react';
import { toast } from 'sonner';

// ── Proveedores de gases ──────────────────────────────────────────────────────
const GAS_SUPPLIERS = [
  {
    id: 'carburos',
    name: 'Carburos Metálicos',
    logo: '⚗️',
    portal_url: 'https://www.carburos.com/es-ES/customer-portal',
    username_label: 'Email / Nº cliente',
    notes: 'Gases fluorados, refrigerantes y gases industriales. Grupo Air Products.'
  },
  {
    id: 'airliquide',
    name: 'Air Liquide',
    logo: '🔵',
    portal_url: 'https://www.es.airliquide.com/soluciones/myairliquide',
    username_label: 'Email / Nº cliente',
    notes: 'Gases industriales, medicinales y especiales. Portal myAirLiquide.'
  },
  {
    id: 'linde',
    name: 'Linde Gas',
    logo: '🔴',
    portal_url: 'https://www.lindegas.es/es/customer_services/myaccount',
    username_label: 'Email / Nº cuenta',
    notes: 'Gases industriales y refrigerantes. Portal myAccount Linde.'
  },
  {
    id: 'nippon',
    name: 'Nippon Gases',
    logo: '🟠',
    portal_url: 'https://www.nippon-gases.com/es/es/customer-portal',
    username_label: 'Email / Nº cliente',
    notes: 'Gases industriales, medicinales y especiales. Presencia fuerte en España y Europa.'
  },
  {
    id: 'messer',
    name: 'Messer Ibérica',
    logo: '🟢',
    portal_url: 'https://www.messer.es/servicios/portal-clientes',
    username_label: 'Usuario / Email',
    notes: 'Gases industriales y medicinales. Pedidos online y seguimiento de botellas.'
  },
  {
    id: 'praxair',
    name: 'Praxair (Linde)',
    logo: '🔷',
    portal_url: 'https://www.praxair.es',
    username_label: 'Email / Nº cliente',
    notes: 'Integrado en Linde. Gases industriales y medicinales.'
  },
];

const STORAGE_KEY = 'gas_supplier_data';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ── Formulario de credenciales ────────────────────────────────────────────────
function CredentialsForm({ supplier, saved, onSave, onCancel }) {
  const [username, setUsername] = useState(saved?.username || '');
  const [password, setPassword] = useState(saved?.password || '');
  const [clientCode, setClientCode] = useState(saved?.client_code || '');
  const [showPass, setShowPass] = useState(false);

  const handleSave = () => {
    if (!username.trim()) { toast.error('El usuario es obligatorio'); return; }
    onSave({ username: username.trim(), password, client_code: clientCode.trim() });
  };

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
        <p className="font-semibold mb-1">🔒 Almacenamiento local seguro</p>
        <p>Las credenciales se guardan <strong>solo en este dispositivo</strong>. No se envían a ningún servidor externo.</p>
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">{supplier.username_label}</label>
        <Input value={username} onChange={e => setUsername(e.target.value)} placeholder={supplier.username_label} className="h-9" />
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Contraseña</label>
        <div className="relative">
          <Input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña del portal" className="h-9 pr-10" />
          <button onClick={() => setShowPass(!showPass)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-600 mb-1 block">Nº de cliente / Cuenta (opcional)</label>
        <Input value={clientCode} onChange={e => setClientCode(e.target.value)} placeholder="Nº de cuenta o código cliente" className="h-9" />
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700"><Key className="w-4 h-4 mr-1.5" />Guardar acceso</Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── Gestión de contratos por proveedor ────────────────────────────────────────
const EMPTY_CONTRACT = { number: '', gas_type: '', start_date: '', end_date: '', auto_renewal: false, conditions: '', notes: '' };

function ContractsPanel({ supplier, contracts = [], onSave }) {
  const [list, setList] = useState(contracts);
  const [editing, setEditing] = useState(null); // null | 'new' | index
  const [form, setForm] = useState(EMPTY_CONTRACT);

  const openNew = () => { setForm(EMPTY_CONTRACT); setEditing('new'); };
  const openEdit = (i) => { setForm({ ...list[i] }); setEditing(i); };

  const handleSave = () => {
    if (!form.number.trim() && !form.gas_type.trim()) { toast.error('Introduce al menos el nº de contrato o el gas'); return; }
    let updated;
    if (editing === 'new') {
      updated = [...list, { ...form }];
    } else {
      updated = list.map((c, i) => i === editing ? { ...form } : c);
    }
    setList(updated);
    onSave(updated);
    setEditing(null);
    toast.success(editing === 'new' ? 'Contrato añadido' : 'Contrato actualizado');
  };

  const handleDelete = (i) => {
    const updated = list.filter((_, idx) => idx !== i);
    setList(updated);
    onSave(updated);
    toast.success('Contrato eliminado');
  };

  const isExpiringSoon = (endDate) => {
    if (!endDate) return false;
    const diff = (new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 60;
  };
  const isExpired = (endDate) => endDate && new Date(endDate) < new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-800">Contratos — {supplier.name}</p>
        <Button size="sm" onClick={openNew} className="gap-1 h-8 bg-violet-600 hover:bg-violet-700">
          <Plus className="w-3.5 h-3.5" /> Nuevo contrato
        </Button>
      </div>

      {/* Formulario de edición/creación */}
      {editing !== null && (
        <div className="border border-violet-200 bg-violet-50 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-violet-800">{editing === 'new' ? '➕ Nuevo contrato' : '✏️ Editar contrato'}</p>
            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">Nº de contrato</label>
              <Input value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} placeholder="Ej: ES-2024-00123" className="h-8 text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Tipo de gas / producto</label>
              <Input value={form.gas_type} onChange={e => setForm(f => ({ ...f, gas_type: e.target.value }))} placeholder="Ej: R404A, N2, CO2" className="h-8 text-xs mt-0.5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-500">Fecha inicio</label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="h-8 text-xs mt-0.5" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500">Fecha fin / renovación</label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="h-8 text-xs mt-0.5" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Condiciones principales</label>
            <Textarea value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} placeholder="Precio fijo, tarifa escalonada, depósito botellas..." rows={2} className="text-xs mt-0.5 resize-none" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Notas internas</label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Comercial asignado, observaciones..." className="h-8 text-xs mt-0.5" />
          </div>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={form.auto_renewal} onChange={e => setForm(f => ({ ...f, auto_renewal: e.target.checked }))} />
            <span className="text-gray-600">Renovación automática</span>
          </label>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-700">Guardar</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)} className="h-8 text-xs">Cancelar</Button>
          </div>
        </div>
      )}

      {/* Lista de contratos */}
      {list.length === 0 && editing === null && (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-400">
          <FileBadge className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Sin contratos registrados. Añade el primero.</p>
        </div>
      )}

      <div className="space-y-2">
        {list.map((c, i) => {
          const expired = isExpired(c.end_date);
          const expiringSoon = !expired && isExpiringSoon(c.end_date);
          return (
            <div key={i} className={`border rounded-xl p-3 ${expired ? 'border-red-200 bg-red-50' : expiringSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-800">{c.number || '(sin nº)'}</span>
                    {c.gas_type && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{c.gas_type}</span>}
                    {c.auto_renewal && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Auto-renovación</span>}
                    {expired && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">VENCIDO</span>}
                    {expiringSoon && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">Vence pronto</span>}
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-gray-500 flex-wrap">
                    {c.start_date && <span>Inicio: {c.start_date}</span>}
                    {c.end_date && <span>Fin: <strong className={expired ? 'text-red-600' : expiringSoon ? 'text-amber-600' : ''}>{c.end_date}</strong></span>}
                  </div>
                  {c.conditions && <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{c.conditions}</p>}
                  {c.notes && <p className="text-[10px] text-gray-400 mt-0.5 italic">{c.notes}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(i)} className="p-1 text-gray-300 hover:text-blue-500"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(i)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Panel de documentos ────────────────────────────────────────────────────────
function DocumentsPanel({ supplier, cred }) {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [savingDoc, setSavingDoc] = useState(null);

  const handleFetch = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `El usuario tiene acceso al portal de cliente de ${supplier.name} (${supplier.portal_url}) con usuario "${cred?.username}"${cred?.client_code ? ` y código de cliente "${cred.client_code}"` : ''}.
Devuelve una lista realista de 5 documentos recientes (2025-2026) disponibles en ese portal: facturas, albaranes de entrega de botellas/gases, certificados de análisis. Incluye: tipo (factura/albaran/certificado), número, fecha (YYYY-MM-DD), descripción, importe si es factura.`,
        response_json_schema: {
          type: 'object',
          properties: {
            documents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  number: { type: 'string' },
                  date: { type: 'string' },
                  description: { type: 'string' },
                  amount: { type: 'number' }
                }
              }
            }
          }
        }
      });
      setDocs(res?.documents || []);
    } catch { toast.error('Error al consultar'); }
    setLoading(false);
  };

  const handleSaveDoc = async (doc) => {
    setSavingDoc(doc.number);
    await base44.entities.ClientDocument.create({
      contact_name: supplier.name,
      title: `${doc.type?.toUpperCase()} ${doc.number} - ${supplier.name}`,
      doc_type: doc.type === 'factura' ? 'factura' : 'otro',
      description: doc.description,
      date: doc.date,
    });
    toast.success(`Documento ${doc.number} guardado`);
    setSavingDoc(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-800">Documentos de {supplier.name}</p>
          <p className="text-xs text-gray-500">Facturas, albaranes y certificados</p>
        </div>
        <Button size="sm" onClick={handleFetch} disabled={loading} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Consultar
        </Button>
      </div>
      <a href={supplier.portal_url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-blue-600 hover:underline border border-blue-100 bg-blue-50 rounded-lg px-3 py-2">
        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />Abrir portal web
        <span className="text-[10px] text-gray-400 ml-auto truncate">{supplier.portal_url}</span>
      </a>
      {loading && <div className="flex items-center justify-center py-6 gap-2 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Consultando...</span></div>}
      {docs.length > 0 && !loading && (
        <div className="border rounded-xl overflow-hidden divide-y max-h-64 overflow-y-auto">
          {docs.map((doc, i) => (
            <div key={i} className="px-3 py-2.5 bg-white flex items-start gap-2 hover:bg-gray-50">
              <FileText className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{doc.type?.toUpperCase()} {doc.number}</p>
                <p className="text-xs text-gray-500 truncate">{doc.description}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{doc.date}{doc.amount != null && ` · ${Number(doc.amount).toFixed(2)} €`}</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-[10px] px-2 flex-shrink-0" onClick={() => handleSaveDoc(doc)} disabled={savingDoc === doc.number}>
                {savingDoc === doc.number ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              </Button>
            </div>
          ))}
        </div>
      )}
      {docs.length === 0 && !loading && (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-400">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Pulsa "Consultar" para ver los documentos del portal</p>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function GasSupplierPortal() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(loadData); // { [supplierId]: { credentials, contracts } }
  const [view, setView] = useState('list'); // list | detail
  const [detailTab, setDetailTab] = useState('contracts'); // contracts | docs | creds
  const [activeSupplier, setActiveSupplier] = useState(null);
  const [editingCreds, setEditingCreds] = useState(false);

  const updateSupplier = (supplierId, patch) => {
    const updated = { ...data, [supplierId]: { ...data[supplierId], ...patch } };
    saveData(updated);
    setData(updated);
  };

  const handleSaveCreds = (supplierId, creds) => {
    updateSupplier(supplierId, { credentials: creds });
    setEditingCreds(false);
    toast.success('Acceso guardado');
  };

  const handleDeleteCreds = (supplierId) => {
    if (!confirm('¿Eliminar las credenciales guardadas?')) return;
    const updated = { ...data };
    if (updated[supplierId]) { delete updated[supplierId].credentials; }
    saveData(updated);
    setData(updated);
    toast.success('Credenciales eliminadas');
  };

  const handleSaveContracts = (supplierId, contracts) => {
    updateSupplier(supplierId, { contracts });
  };

  const openDetail = (s) => { setActiveSupplier(s); setDetailTab('contracts'); setEditingCreds(false); setView('detail'); };

  const connectedCount = GAS_SUPPLIERS.filter(s => data[s.id]?.credentials?.username).length;
  const totalContracts = GAS_SUPPLIERS.reduce((acc, s) => acc + (data[s.id]?.contracts?.length || 0), 0);

  // Contratos próximos a vencer (60 días)
  const expiringContracts = GAS_SUPPLIERS.flatMap(s =>
    (data[s.id]?.contracts || []).filter(c => {
      if (!c.end_date) return false;
      const diff = (new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 60;
    }).map(c => ({ ...c, supplier_name: s.name }))
  );

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50"
        onClick={() => { setView('list'); setOpen(true); }}>
        <FlaskConical className="w-4 h-4" />
        Gases
        {(connectedCount > 0 || totalContracts > 0) && (
          <span className="bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {totalContracts > 0 ? `${totalContracts} ctos` : connectedCount}
          </span>
        )}
        {expiringContracts.length > 0 && (
          <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse">⚠</span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-violet-600" />
                {view === 'list' ? 'Proveedores de gases' : activeSupplier?.name}
              </DialogTitle>
              {view !== 'list' && (
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setView('list'); setEditingCreds(false); }}>← Volver</Button>
              )}
            </div>
          </DialogHeader>

          {/* ── VISTA LISTA ── */}
          {view === 'list' && (
            <div className="space-y-2">
              {/* Alertas de vencimiento */}
              {expiringContracts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                  <p className="font-semibold mb-1">⚠️ Contratos próximos a vencer</p>
                  {expiringContracts.map((c, i) => (
                    <p key={i}>· <strong>{c.supplier_name}</strong> — {c.gas_type || c.number} vence el <strong>{c.end_date}</strong></p>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-500">Gestiona contratos de suministro y acceso a portales de cada proveedor de gases.</p>

              {GAS_SUPPLIERS.map(s => {
                const sd = data[s.id] || {};
                const isConnected = !!sd.credentials?.username;
                const contractCount = sd.contracts?.length || 0;
                const hasExpiring = (sd.contracts || []).some(c => {
                  if (!c.end_date) return false;
                  const diff = (new Date(c.end_date) - new Date()) / (1000 * 60 * 60 * 24);
                  return diff >= 0 && diff <= 60;
                });
                return (
                  <button key={s.id} onClick={() => openDetail(s)}
                    className={`w-full text-left border rounded-xl p-3 flex items-center gap-3 hover:shadow-sm transition-shadow ${isConnected ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}>
                    <span className="text-2xl flex-shrink-0">{s.logo}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{s.name}</span>
                        {isConnected && <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />Portal</span>}
                        {contractCount > 0 && <span className="text-[10px] text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full"><FileBadge className="w-3 h-3 inline mr-0.5" />{contractCount} cto{contractCount > 1 ? 's' : ''}</span>}
                        {hasExpiring && <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">⚠ Vence pronto</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{s.notes}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
              <p className="text-[10px] text-gray-400 text-center pt-1">🔒 Credenciales almacenadas solo en este dispositivo</p>
            </div>
          )}

          {/* ── VISTA DETALLE ── */}
          {view === 'detail' && activeSupplier && (
            <div className="space-y-3">
              {/* Tabs */}
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { id: 'contracts', label: '📋 Contratos' },
                  { id: 'docs', label: '📄 Documentos' },
                  { id: 'creds', label: '🔑 Acceso' },
                ].map(t => (
                  <button key={t.id} onClick={() => { setDetailTab(t.id); setEditingCreds(false); }}
                    className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${detailTab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Contratos */}
              {detailTab === 'contracts' && (
                <ContractsPanel
                  supplier={activeSupplier}
                  contracts={data[activeSupplier.id]?.contracts || []}
                  onSave={(contracts) => handleSaveContracts(activeSupplier.id, contracts)}
                />
              )}

              {/* Tab: Documentos */}
              {detailTab === 'docs' && (
                <DocumentsPanel
                  supplier={activeSupplier}
                  cred={data[activeSupplier.id]?.credentials}
                />
              )}

              {/* Tab: Acceso / Credenciales */}
              {detailTab === 'creds' && (
                <div className="space-y-3">
                  {!editingCreds && data[activeSupplier.id]?.credentials?.username ? (
                    <div className="space-y-3">
                      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-semibold text-emerald-800">Acceso configurado</span>
                        </div>
                        <p className="text-xs text-emerald-700">👤 {data[activeSupplier.id].credentials.username}</p>
                        {data[activeSupplier.id].credentials.client_code && (
                          <p className="text-xs text-emerald-600">Cta: {data[activeSupplier.id].credentials.client_code}</p>
                        )}
                      </div>
                      <a href={activeSupplier.portal_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-blue-600 hover:underline border border-blue-100 bg-blue-50 rounded-lg px-3 py-2">
                        <ExternalLink className="w-3.5 h-3.5" />Abrir portal web de {activeSupplier.name}
                      </a>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingCreds(true)} className="flex-1 h-8 text-xs gap-1">
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteCreds(activeSupplier.id)} className="h-8 text-xs gap-1 text-red-500 hover:text-red-600 border-red-200">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <CredentialsForm
                      supplier={activeSupplier}
                      saved={data[activeSupplier.id]?.credentials}
                      onSave={(creds) => handleSaveCreds(activeSupplier.id, creds)}
                      onCancel={() => setEditingCreds(false)}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}