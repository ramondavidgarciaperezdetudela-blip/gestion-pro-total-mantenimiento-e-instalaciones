import React, { useRef, useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, Printer, Phone, Mail, Copy, Save, Plus, ChevronDown, ChevronUp, FileDown, X } from 'lucide-react';
import CompanyHeader from './CompanyHeader';
import SignatureCanvas from './SignaturePad';
import { format } from 'date-fns';
import { getNextAvailableNumber } from './autoNumber';

const DOC_TYPES = ['factura', 'presupuesto', 'recibo'];
const STATUSES = ['borrador', 'enviado', 'pagado', 'vencido', 'cancelado'];
const WORK_TYPES = ['electrico', 'clima', 'refrigeracion_industrial', 'solar', 'otro'];
const NORMATIVE_MAP = {
  electrico: 'REBT (Reglamento Electrotécnico de Baja Tensión), RD 842/2002',
  clima: 'RITE (Reglamento de Instalaciones Térmicas en los Edificios), RD 1027/2007. F-Gas RD 115/2017',
  refrigeracion_industrial: 'Reglamento de Seguridad para Instalaciones Frigoríficas, F-Gas RD 115/2017',
  solar: 'CTE DB HE, RD 244/2019 Autoconsumo, REBT',
  otro: ''
};
const PAYMENT_TERMS = "Forma de pago: Máximo 3 pagos.\n1º Pago: 100% material + 50% mano de obra (al aceptar presupuesto)\n2º Pago: 25% mano de obra (al iniciar trabajos)\n3º Pago: 25% mano de obra restante (al finalizar)";

let _itemId = 0;
const newItem = () => ({ _id: ++_itemId, description: '', quantity: 1, unit_price: 0, discount: 0, total: 0 });

function recalculate(items, iva_rate) {
  const updatedItems = items.map(item => ({
    ...item,
    total: (item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount || 0) / 100)
  }));
  const subtotal = updatedItems.reduce((s, i) => s + i.total, 0);
  const iva_amount = subtotal * (iva_rate / 100);
  return { items: updatedItems, subtotal, iva_amount, total: subtotal + iva_amount };
}

// Genera HTML completo del documento para imprimir/PDF
function buildPrintHtml(doc, companySettings) {
  const cs = companySettings || {};
  const hasDiscount = doc.items?.some(i => i.discount > 0);
  const itemsHtml = (doc.items || []).map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${item.description || ''}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${item.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${(item.unit_price || 0).toFixed(2)} €</td>
      ${hasDiscount ? `<td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#d97706">${item.discount > 0 ? item.discount + '%' : '-'}</td>` : ''}
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${(item.total || 0).toFixed(2)} €</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${doc.doc_type?.toUpperCase()} ${doc.doc_number || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 20px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #1e3a5f; padding-bottom: 12px; margin-bottom: 16px; }
    .company-info { font-size: 9px; color: #555; line-height: 1.6; }
    .company-name { font-size: 14px; font-weight: 700; color: #1e3a5f; }
    .doc-title { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #1e3a5f; }
    .doc-meta { font-size: 9px; color: #666; margin-top: 4px; }
    .client-box { background: #f0f4ff; border-left: 4px solid #1e3a5f; padding: 10px 14px; margin: 12px 0; border-radius: 4px; }
    .client-name { font-size: 12px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9px; }
    th { background: #1e3a5f; color: white; padding: 7px 8px; text-align: left; }
    th.right { text-align: right; }
    th.center { text-align: center; }
    .totals { text-align: right; padding: 8px 0; border-top: 2px solid #e5e7eb; margin-top: 8px; }
    .total-line { display: flex; justify-content: flex-end; gap: 20px; margin: 2px 0; font-size: 9px; color: #555; }
    .total-final { font-size: 14px; font-weight: 800; color: #1e3a5f; margin-top: 4px; display: flex; justify-content: flex-end; gap: 20px; }
    .obs { background: #f9fafb; border-radius: 4px; padding: 8px 12px; font-size: 8px; color: #555; white-space: pre-wrap; margin-top: 10px; }
    .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 8px; color: #aaa; text-align: center; }
    .logo { max-height: 50px; max-width: 120px; object-fit: contain; }
    @media print {
      body { padding: 10px; }
      @page { margin: 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${cs.logo_url ? `<img src="${cs.logo_url}" class="logo" alt="Logo" /><br/>` : ''}
      <span class="company-name">${cs.company_name || ''}</span>
      <div class="company-info">
        ${cs.nif ? `NIF: ${cs.nif}<br/>` : ''}
        ${cs.address ? `${cs.address}${cs.city ? ', ' + cs.city : ''}${cs.postal_code ? ' ' + cs.postal_code : ''}<br/>` : ''}
        ${cs.phone ? `Tel: ${cs.phone}` : ''}${cs.email ? ` · ${cs.email}` : ''}
        ${cs.iban ? `<br/>IBAN: ${cs.iban}` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div class="doc-title">${doc.doc_type?.toUpperCase() || ''}</div>
      <div class="doc-meta">Nº: <strong>${doc.doc_number || '-'}</strong></div>
      <div class="doc-meta">Fecha: <strong>${doc.date || '-'}</strong></div>
      ${doc.due_date ? `<div class="doc-meta">Vencimiento: ${doc.due_date}</div>` : ''}
      <div style="margin-top:6px"><span style="background:${doc.status === 'pagado' ? '#dcfce7' : doc.status === 'vencido' ? '#fee2e2' : '#dbeafe'};color:${doc.status === 'pagado' ? '#166534' : doc.status === 'vencido' ? '#991b1b' : '#1e40af'};padding:2px 8px;border-radius:12px;font-size:8px;font-weight:700">${doc.status?.toUpperCase() || ''}</span></div>
    </div>
  </div>

  <div class="client-box">
    <div class="client-name">${doc.contact_name || 'Sin cliente'}</div>
    ${doc.contact_nif ? `<div style="font-size:9px;color:#555">NIF: ${doc.contact_nif}</div>` : ''}
    ${doc.contact_address ? `<div style="font-size:9px;color:#555">${doc.contact_address}</div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Descripción</th>
        <th class="center">Cant.</th>
        <th class="right">P.Unit.</th>
        ${hasDiscount ? '<th class="right">Dto%</th>' : ''}
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-line"><span>Subtotal:</span><span><strong>${(doc.subtotal || 0).toFixed(2)} €</strong></span></div>
    <div class="total-line"><span>IVA (${doc.iva_rate || 21}%):</span><span><strong>${(doc.iva_amount || 0).toFixed(2)} €</strong></span></div>
    <div class="total-final"><span>TOTAL:</span><span>${(doc.total || 0).toFixed(2)} €</span></div>
  </div>

  ${doc.observations ? `<div class="obs"><strong>Observaciones:</strong>\n${doc.observations}</div>` : ''}
  ${doc.payment_terms ? `<div class="obs" style="margin-top:6px">${doc.payment_terms}</div>` : ''}
  ${doc.normative_references ? `<div style="margin-top:8px;font-size:8px;color:#3b82f6">Normativa: ${doc.normative_references}</div>` : ''}

  ${doc.signature_client ? `
  <div style="margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb;text-align:right">
    <img src="${doc.signature_client}" style="height:60px;max-width:200px;object-fit:contain" />
    <p style="font-size:9px;color:#666;margin-top:4px">Firma de conformidad del cliente</p>
    <p style="font-size:9px;font-weight:700">${doc.contact_name||''}</p>
  </div>` : ''}

  <div class="footer">Documento generado por sistema · ${cs.company_name || ''} · ${cs.phone || ''} · ${cs.email || ''}</div>
</body>
</html>`;
}

export default function InvoicePreviewDialog({ doc, open, onClose, onSaved, contacts = [], allDocs = [], initialMode = 'view' }) {
  const printRef = useRef(null);
  const [mode, setMode] = useState('view'); // 'view' | 'edit'
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    if (open && doc) {
      setMode(initialMode === 'edit' ? 'edit' : 'view');
      const items = (doc.items?.length ? doc.items : [newItem()]).map((it, idx) => ({ _id: idx, ...it }));
      setForm({ ...doc, items });
      setShowAdvanced(false);
    }
  }, [open, doc]);

  React.useEffect(() => {
    base44.entities.CompanySettings.list().then(cs => {
      if (cs?.length) setCompanySettings(cs[0]);
    });
  }, []);

  const handleItemChange = useCallback((index, field, value) => {
    setForm(prev => {
      const newItems = prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item);
      return { ...prev, ...recalculate(newItems, prev.iva_rate) };
    });
  }, []);

  const addItem = () => setForm(prev => ({ ...prev, items: [...prev.items, newItem()] }));
  const removeItem = (i) => setForm(prev => {
    const newItems = prev.items.filter((_, idx) => idx !== i);
    return { ...prev, ...recalculate(newItems, prev.iva_rate) };
  });

  const handleIvaChange = (val) => setForm(prev => {
    const iva_rate = parseFloat(val) || 0;
    return { ...prev, iva_rate, ...recalculate(prev.items, iva_rate) };
  });

  const handleWorkTypeChange = (wt) => setForm(prev => ({
    ...prev, work_type: wt, normative_references: NORMATIVE_MAP[wt] || ''
  }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Invoice.update(doc.id, form);
    setSaving(false);
    setMode('view');
    if (onSaved) onSaved({ ...doc, ...form });
  };

  const exportPDF = () => {
    const html = buildPrintHtml(mode === 'edit' ? form : doc, companySettings);
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  };

  const sendWhatsApp = () => {
    const c = contacts.find(x => x.id === doc.contact_id);
    const phone = c?.phone?.replace(/[^0-9]/g, '') || '';
    const d = mode === 'edit' ? form : doc;
    const msg = encodeURIComponent(`*${d.doc_type?.toUpperCase()} Nº${d.doc_number}*\nCliente: ${d.contact_name}\nFecha: ${d.date}\nTotal: ${d.total?.toFixed(2)} €\nEstado: ${d.status}`);
    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const sendEmail = () => {
    const c = contacts.find(x => x.id === doc.contact_id);
    const email = c?.email || '';
    const d = mode === 'edit' ? form : doc;
    const subject = encodeURIComponent(`${d.doc_type?.toUpperCase()} Nº${d.doc_number}`);
    const body = encodeURIComponent(`Estimado/a ${d.contact_name},\n\nAdjunto ${d.doc_type} Nº${d.doc_number} de fecha ${d.date}.\nTotal: ${d.total?.toFixed(2)} €\n\nQuedamos a su disposición.`);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  if (!doc || !form) return null;

  const currentDoc = mode === 'edit' ? form : doc;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="capitalize text-base">
              {currentDoc.doc_type} {currentDoc.doc_number}
              <Badge className="ml-2 text-[10px]" variant="outline">{currentDoc.status}</Badge>
            </DialogTitle>
            <div className="flex items-center gap-1">
              {mode === 'view' && (
                <button onClick={() => setMode('edit')} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200">
                  <Edit className="w-3 h-3" /> Editar
                </button>
              )}
              <button onClick={exportPDF} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold">
                <FileDown className="w-3 h-3" /> PDF
              </button>
            </div>
          </div>
        </DialogHeader>

        {mode === 'view' && (
          <div ref={printRef} className="bg-white space-y-3">
            <CompanyHeader className="mb-4 pb-4 border-b" />
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wide text-slate-800">{doc.doc_type}</h2>
                <p className="text-sm text-gray-500">Nº: {doc.doc_number}</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Fecha: <strong>{doc.date}</strong></p>
                {doc.due_date && <p>Vencimiento: {doc.due_date}</p>}
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded text-sm border-l-4 border-blue-500">
              <p className="font-bold">{doc.contact_name || 'Sin cliente'}</p>
              {doc.contact_nif && <p className="text-gray-500 text-xs">NIF: {doc.contact_nif}</p>}
              {doc.contact_address && <p className="text-gray-500 text-xs">{doc.contact_address}</p>}
            </div>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left p-2 text-xs">Descripción</th>
                  <th className="p-2 text-center text-xs">Cant.</th>
                  <th className="p-2 text-right text-xs">P.Unit.</th>
                  {doc.items?.some(i => i.discount > 0) && <th className="p-2 text-right text-xs">Dto%</th>}
                  <th className="p-2 text-right text-xs">Total</th>
                </tr>
              </thead>
              <tbody>
                {doc.items?.map((item, i) => (
                  <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                    <td className="p-2 text-xs">{item.description}</td>
                    <td className="p-2 text-center text-xs">{item.quantity}</td>
                    <td className="p-2 text-right text-xs">{item.unit_price?.toFixed(2)} €</td>
                    {doc.items?.some(i => i.discount > 0) && <td className="p-2 text-right text-xs text-orange-600">{item.discount > 0 ? `${item.discount}%` : '-'}</td>}
                    <td className="p-2 text-right text-xs font-medium">{item.total?.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right space-y-1 text-sm border-t pt-3">
              <p className="text-gray-600">Subtotal: <strong>{doc.subtotal?.toFixed(2)} €</strong></p>
              <p className="text-gray-600">IVA ({doc.iva_rate}%): <strong>{doc.iva_amount?.toFixed(2)} €</strong></p>
              <p className="font-bold text-xl text-gray-900">TOTAL: {doc.total?.toFixed(2)} €</p>
            </div>
            {doc.observations && <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 whitespace-pre-wrap"><strong>Observaciones:</strong> {doc.observations}</div>}
            {doc.payment_terms && <p className="text-xs text-gray-500 whitespace-pre-wrap border-t pt-2">{doc.payment_terms}</p>}
            {doc.normative_references && <p className="text-xs text-blue-600 border-t pt-2">Normativa: {doc.normative_references}</p>}

            {/* Firma digital del cliente */}
            <div className="border-t pt-3 mt-2">
              <SignatureCanvas
                label="✍️ Firma de conformidad del cliente"
                value={doc.signature_client}
                onSave={async (dataUrl) => {
                  await base44.entities.Invoice.update(doc.id, { signature_client: dataUrl });
                  if (onSaved) onSaved({ ...doc, signature_client: dataUrl });
                }}
              />
            </div>

            <div className="flex gap-2 pt-3 border-t flex-wrap">
              <Button variant="outline" size="sm" className="text-green-700" onClick={sendWhatsApp}>
                <Phone className="w-3.5 h-3.5 mr-1" />WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="text-blue-700" onClick={sendEmail}>
                <Mail className="w-3.5 h-3.5 mr-1" />Email
              </Button>
            </div>
          </div>
        )}

        {mode === 'edit' && form && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <Select value={form.doc_type} onValueChange={v => setForm(p => ({ ...p, doc_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DOC_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Nº documento" value={form.doc_number} onChange={e => setForm(p => ({ ...p, doc_number: e.target.value }))} />
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {form.contact_name && (
              <div className="bg-blue-50 border border-blue-100 p-2 rounded text-xs text-gray-600">
                <strong>{form.contact_name}</strong>{form.contact_nif ? ` · NIF: ${form.contact_nif}` : ''}
                {form.contact_address && <><br />{form.contact_address}</>}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Fecha</label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Vencimiento</label>
                <Input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500">IVA (%)</label>
                <Select value={String(form.iva_rate)} onValueChange={handleIvaChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exento)</SelectItem>
                    <SelectItem value="4">4% (Super reducido)</SelectItem>
                    <SelectItem value="10">10% (Reducido)</SelectItem>
                    <SelectItem value="21">21% (General)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Select value={form.work_type || 'otro'} onValueChange={handleWorkTypeChange}>
              <SelectTrigger><SelectValue placeholder="Tipo de trabajo" /></SelectTrigger>
              <SelectContent>{WORK_TYPES.map(w => <SelectItem key={w} value={w}>{w.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
            </Select>

            <div className="space-y-2">
              <label className="text-sm font-medium">Líneas del documento</label>
              <div className="hidden md:grid grid-cols-12 gap-1 text-[10px] text-gray-400 px-1">
                <span className="col-span-5">Descripción</span>
                <span className="col-span-2">Cant.</span>
                <span className="col-span-2">€/ud</span>
                <span className="col-span-1">Dto%</span>
                <span className="col-span-1 text-right">Total</span>
              </div>
              {form.items.map((item, i) => (
                <div key={item._id ?? i} className="grid grid-cols-12 gap-1 items-center">
                  <input className="col-span-5 text-xs h-8 border border-input rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Descripción" value={item.description} onChange={e => handleItemChange(i, 'description', e.target.value)} />
                  <input className="col-span-2 text-xs h-8 border border-input rounded-md px-2" type="number" value={item.quantity} onChange={e => handleItemChange(i, 'quantity', parseFloat(e.target.value) || 0)} />
                  <input className="col-span-2 text-xs h-8 border border-input rounded-md px-2" type="number" value={item.unit_price} onChange={e => handleItemChange(i, 'unit_price', parseFloat(e.target.value) || 0)} />
                  <input className="col-span-1 text-xs h-8 border border-input rounded-md px-2" type="number" value={item.discount || 0} onChange={e => handleItemChange(i, 'discount', parseFloat(e.target.value) || 0)} />
                  <span className="col-span-1 text-xs text-right font-medium text-green-700">{item.total?.toFixed(2)}</span>
                  <button className="col-span-1 text-red-400 hover:text-red-600 text-lg leading-none text-center" onClick={() => removeItem(i)}>×</button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="w-3 h-3 mr-1" />Línea</Button>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span>{form.subtotal?.toFixed(2)} €</span></div>
              <div className="flex justify-between text-gray-600"><span>IVA ({form.iva_rate}%):</span><span>{form.iva_amount?.toFixed(2)} €</span></div>
              <div className="flex justify-between font-bold text-lg text-blue-800"><span>TOTAL:</span><span>{form.total?.toFixed(2)} €</span></div>
            </div>

            <button className="text-xs text-gray-500 flex items-center gap-1" onClick={() => setShowAdvanced(v => !v)}>
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Observaciones y condiciones de pago
            </button>
            {showAdvanced && (
              <div className="space-y-2">
                <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y" placeholder="Observaciones" value={form.observations || ''} onChange={e => setForm(p => ({ ...p, observations: e.target.value }))} rows={3} />
                <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y" placeholder="Condiciones de pago" value={form.payment_terms || ''} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} rows={4} />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
              <Button variant="outline" onClick={() => setMode('view')}>Cancelar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}