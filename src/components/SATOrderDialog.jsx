import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TechnicianSelect from './TechnicianSelect';
import { Eye, Edit, Save, RefreshCw, Phone, Mail, Trash2, Plus, FileDown, Gauge, Printer } from 'lucide-react';
import { format } from 'date-fns';
import CompanyHeader from './CompanyHeader';
import PhotoGallery from './PhotoGallery';
import SATSignaturePanel from './SATSignaturePanel';
import MaterialAutocomplete from './MaterialAutocomplete';
import MaterialsExportButton from './MaterialsExportButton';
import { createPageUrl } from '../utils';
import { withTimeout, getFallbackPhotosSize, MAX_TOTAL_FALLBACK_PAYLOAD, PHOTOS_TOO_LARGE_MESSAGE } from '@/lib/uploadImage';
import { describeSaveError, esErrorDeFotoDemasiadoGrande, reducirFotos, tamanoFotoMayor, guardarLimiteAprendido } from '@/lib/saveErrorMessage';

const TYPES = ['reparacion', 'mantenimiento', 'instalacion', 'revision', 'urgencia'];
const EQUIPMENT = ['aire_acondicionado', 'bomba_calor', 'camara_frigorifica', 'electrico', 'solar', 'otro'];
const STATUSES = ['pendiente', 'en_curso', 'completada', 'cancelada'];
const PRIORITIES = ['baja', 'normal', 'alta', 'urgente'];

const STATUS_COLORS = {
  pendiente: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  en_curso: 'bg-blue-100 text-blue-700 border-blue-300',
  completada: 'bg-green-100 text-green-700 border-green-300',
  cancelada: 'bg-gray-100 text-gray-600 border-gray-300',
};

const EMPTY_FORM = {
  order_number: '', contact_id: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'),
  type: 'reparacion', equipment_type: 'otro', description: '', diagnosis: '', solution: '',
  status: 'pendiente', priority: 'normal', photos_before: [], photos_after: [],
  materials_used: [], labor_hours: '', labor_rate: 35, total: 0, technician: '', notes: ''
};

// Campos que gestiona el panel de firma por su cuenta. El formulario no debe
// enviarlos vacíos al actualizar la orden, o borraría una firma ya hecha.
const CAMPOS_FIRMA = [
  'signature_technician', 'sign_datetime_technician',
  'signature_client', 'sign_datetime_client',
];

// ─── VISTA PREVIA ────────────────────────────────────────────────────────────
function SATPreview({ order, onEdit, onClose, contact, onUpdate }) {
  const printRef = useRef(null);

  const exportPDF = async () => {
    const csArr = await base44.entities.CompanySettings.list();
    const cs = csArr?.[0] || {};
    const materialsHtml = (order.materials_used || []).map((m, i) => `
      <tr style="background:${i%2===0?'#f9fafb':'#fff'}">
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb">${m.material||''}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${m.quantity||0}</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${(m.unit_price||0).toFixed(2)} €</td>
        <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${((m.quantity||0)*(m.unit_price||0)).toFixed(2)} €</td>
      </tr>`).join('');

    const photosBeforeHtml = (order.photos_before||[]).slice(0,6).map(p => `<img src="${p}" style="width:100px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb" />`).join('');
    const photosAfterHtml = (order.photos_after||[]).slice(0,6).map(p => `<img src="${p}" style="width:100px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #e5e7eb" />`).join('');

    const signaturesHtml = (order.signature_technician || order.signature_client) ? `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;padding-top:12px;border-top:1px solid #e5e7eb">
        <div style="text-align:center">
          ${order.signature_technician ? `<img src="${order.signature_technician}" style="height:60px;max-width:100%;object-fit:contain" />` : '<div style="height:60px;border-bottom:1px solid #ccc;margin:0 20px"></div>'}
          <p style="font-size:9px;color:#666;margin-top:4px">Firma del Técnico</p>
          <p style="font-size:9px;font-weight:700">${order.technician||''}</p>
        </div>
        <div style="text-align:center">
          ${order.signature_client ? `<img src="${order.signature_client}" style="height:60px;max-width:100%;object-fit:contain" />` : '<div style="height:60px;border-bottom:1px solid #ccc;margin:0 20px"></div>'}
          <p style="font-size:9px;color:#666;margin-top:4px">Conformidad del Cliente</p>
          <p style="font-size:9px;font-weight:700">${order.contact_name||''}</p>
        </div>
      </div>` : '';

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>SAT #${order.order_number||''}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:20px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #c2410c;padding-bottom:12px;margin-bottom:16px}
    .title{font-size:20px;font-weight:800;color:#c2410c}.badge{background:#fed7aa;color:#9a3412;padding:2px 8px;border-radius:12px;font-size:8px;font-weight:700}
    .section{background:#f9fafb;border-left:3px solid #e5e7eb;padding:8px 12px;border-radius:4px;margin:8px 0}
    .section-title{font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
    table{width:100%;border-collapse:collapse;font-size:9px;margin:8px 0}th{background:#374151;color:white;padding:6px 8px;text-align:left}
    .logo{max-height:45px;max-width:100px;object-fit:contain}
    @media print{body{padding:10px}@page{margin:10mm;size:A4}}</style></head><body>
    <div class="header">
      <div>${cs.logo_url?`<img src="${cs.logo_url}" class="logo" alt="Logo" /><br/>`:''}
        <span style="font-size:13px;font-weight:700;color:#1e3a5f">${cs.company_name||''}</span>
        <div style="font-size:9px;color:#555;margin-top:2px">${cs.nif?`NIF: ${cs.nif} · `:''}${cs.phone||''} ${cs.email?'· '+cs.email:''}</div>
        ${cs.address?`<div style="font-size:9px;color:#555">${cs.address}${cs.city?', '+cs.city:''}</div>`:''}
      </div>
      <div style="text-align:right"><div class="title">ORDEN SAT</div>
        <div style="font-size:11px;font-weight:700">#${order.order_number||'S/N'}</div>
        <div style="margin-top:4px"><span class="badge">${(order.status||'').toUpperCase()}</span></div>
        <div style="font-size:9px;color:#666;margin-top:4px">Fecha: ${order.date||'-'}</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div class="section"><div class="section-title">Cliente</div><strong>${order.contact_name||''}</strong></div>
      <div class="section"><div class="section-title">Tipo / Equipo</div>${(order.type||'').replace(/_/g,' ')} / ${(order.equipment_type||'').replace(/_/g,' ')}</div>
      ${order.technician?`<div class="section"><div class="section-title">Técnico</div>${order.technician}</div>`:''}
    </div>
    ${order.description?`<div class="section"><div class="section-title">Descripción del problema</div><p style="white-space:pre-wrap">${order.description}</p></div>`:''}
    ${order.diagnosis?`<div class="section" style="border-left-color:#3b82f6"><div class="section-title" style="color:#3b82f6">Diagnóstico</div><p style="white-space:pre-wrap">${order.diagnosis}</p></div>`:''}
    ${order.solution?`<div class="section" style="border-left-color:#16a34a"><div class="section-title" style="color:#16a34a">Solución aplicada</div><p style="white-space:pre-wrap">${order.solution}</p></div>`:''}
    ${order.materials_used?.length?`<table><thead><tr><th>Material</th><th style="text-align:center">Cant.</th><th style="text-align:right">€/ud</th><th style="text-align:right">Total</th></tr></thead><tbody>${materialsHtml}</tbody></table>`:''}
    <div style="text-align:right;border-top:2px solid #e5e7eb;padding-top:8px;margin-top:8px">
      <span style="font-size:9px;color:#555">Mano de obra: ${order.labor_hours||0}h × ${order.labor_rate||0} €/h = ${((order.labor_hours||0)*(order.labor_rate||0)).toFixed(2)} €</span><br/>
      <span style="font-size:16px;font-weight:800;color:#c2410c">TOTAL: ${(order.total||0).toFixed(2)} €</span>
    </div>
    ${photosBeforeHtml?`<div style="margin-top:10px"><div class="section-title" style="margin-bottom:6px">Fotos antes de reparación</div><div style="display:flex;flex-wrap:wrap;gap:6px">${photosBeforeHtml}</div></div>`:''}
    ${photosAfterHtml?`<div style="margin-top:10px"><div class="section-title" style="margin-bottom:6px">Fotos después de reparación</div><div style="display:flex;flex-wrap:wrap;gap:6px">${photosAfterHtml}</div></div>`:''}
    ${signaturesHtml}
    <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:6px;font-size:8px;color:#aaa;text-align:center">${cs.company_name||''} · ${cs.phone||''} · ${cs.email||''}</div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  const sendWhatsApp = () => {
    const phone = contact?.phone?.replace(/[^0-9]/g, '') || '';
    const msg = encodeURIComponent(`*Orden SAT #${order.order_number}*\nCliente: ${order.contact_name}\nFecha: ${order.date}\nTipo: ${order.type}\nEstado: ${order.status}\n\nDescripción: ${order.description || '-'}\nSolución: ${order.solution || '-'}\nTotal: ${order.total?.toFixed(2)} €`);
    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
  };

  const sendEmail = () => {
    if (!contact?.email) return;
    const subject = encodeURIComponent(`Orden SAT #${order.order_number}`);
    const body = encodeURIComponent(`Estimado/a ${order.contact_name},\n\nOrden SAT #${order.order_number}\nFecha: ${order.date}\nEstado: ${order.status}\nDescripción: ${order.description || '-'}\nSolución: ${order.solution || '-'}\nTotal: ${order.total?.toFixed(2)} €\n\nAtentamente`);
    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Imprime / exporta a PDF (vía diálogo de impresión) el diagnóstico frigorífico
  // guardado como "antes" o "después" de la reparación (desde Diagnóstico Carga).
  const printDiagnostic = async (diag, etiqueta) => {
    if (!diag) return;
    const csArr = await base44.entities.CompanySettings.list();
    const cs = csArr?.[0] || {};
    let averias = [];
    try { averias = JSON.parse(diag.data_json || '{}')?.posiblesAverias || []; } catch { /* ignore */ }
    const averiasHtml = averias.map(a => `<div class="section" style="border-left-color:#dc2626"><div class="section-title" style="color:#dc2626">${a.evento}</div><p>${a.detalle}</p></div>`).join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Diagnóstico ${etiqueta} — SAT #${order.order_number || ''}</title>
    <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:20px;max-width:800px;margin:0 auto}
    .header{display:flex;justify-content:space-between;border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:16px}
    .title{font-size:18px;font-weight:800;color:#4f46e5}
    .section{background:#f9fafb;border-left:3px solid #e5e7eb;padding:8px 12px;border-radius:4px;margin:8px 0}
    .section-title{font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
    img.diag{max-width:100%;border:1px solid #e5e7eb;border-radius:6px;margin-top:8px}
    @media print{body{padding:10px}@page{margin:10mm;size:A4}}</style></head><body>
    <div class="header">
      <div>${cs.logo_url ? `<img src="${cs.logo_url}" style="max-height:45px;max-width:100px;object-fit:contain" alt="Logo" /><br/>` : ''}
        <span style="font-size:13px;font-weight:700;color:#1e3a5f">${cs.company_name || ''}</span>
      </div>
      <div style="text-align:right"><div class="title">DIAGNÓSTICO ${etiqueta.toUpperCase()}</div>
        <div style="font-size:11px;font-weight:700">Orden SAT #${order.order_number || 'S/N'}</div>
        <div style="font-size:9px;color:#666;margin-top:4px">Cliente: ${order.contact_name || ''}</div>
        <div style="font-size:9px;color:#666">Guardado: ${diag.date || ''}</div>
      </div>
    </div>
    <div class="section"><div class="section-title">Resumen</div><p>${diag.summary || ''}</p></div>
    ${diag.manufacturer_values ? `<div class="section" style="border-left-color:#0d9488"><div class="section-title" style="color:#0d9488">Valores del fabricante</div><p>${diag.manufacturer_values}</p></div>` : ''}
    ${averiasHtml}
    ${diag.image_url ? `<img class="diag" src="${diag.image_url}" alt="Esquema y medidas" />` : ''}
    <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:6px;font-size:8px;color:#aaa;text-align:center">${cs.company_name || ''} · ${cs.phone || ''} · ${cs.email || ''}</div>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 500);
  };

  return (
    <>
      <div ref={printRef} className="space-y-3">
        <CompanyHeader />
        <div className="border-b pb-2 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-orange-700">Orden SAT #{order.order_number || 'S/N'}</h2>
            <div className="flex gap-2 mt-1 flex-wrap">
              <Badge className={STATUS_COLORS[order.status] || ''}>{order.status}</Badge>
              {order.priority && order.priority !== 'normal' && <Badge className="bg-orange-100 text-orange-700">{order.priority}</Badge>}
            </div>
          </div>
          <p className="text-sm text-gray-500">Fecha: {order.date}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-500 text-xs font-medium uppercase">Cliente</p><p className="font-semibold">{order.contact_name}</p></div>
          <div><p className="text-gray-500 text-xs font-medium uppercase">Tipo / Equipo</p><p className="capitalize">{order.type?.replace(/_/g,' ')} / {order.equipment_type?.replace(/_/g, ' ')}</p></div>
          {order.technician && <div><p className="text-gray-500 text-xs font-medium uppercase">Técnico</p><p>{order.technician}</p></div>}
          {order.scheduled_date && <div><p className="text-gray-500 text-xs font-medium uppercase">Fecha programada</p><p>{order.scheduled_date} {order.scheduled_time}</p></div>}
        </div>

        {order.description && <div className="bg-gray-50 rounded p-3"><p className="text-xs font-medium text-gray-500 uppercase mb-1">Descripción del problema</p><p className="text-sm whitespace-pre-wrap">{order.description}</p></div>}
        {order.diagnosis && <div className="bg-blue-50 rounded p-3"><p className="text-xs font-medium text-blue-500 uppercase mb-1">Diagnóstico</p><p className="text-sm whitespace-pre-wrap">{order.diagnosis}</p></div>}
        {order.solution && <div className="bg-green-50 rounded p-3"><p className="text-xs font-medium text-green-500 uppercase mb-1">Solución aplicada</p><p className="text-sm whitespace-pre-wrap">{order.solution}</p></div>}

        {order.materials_used?.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase mb-1">Materiales utilizados</p>
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-100">
                <th className="border p-1.5 text-left">Material</th>
                <th className="border p-1.5 text-right">Cant.</th>
                <th className="border p-1.5 text-right">€/ud</th>
                <th className="border p-1.5 text-right">Total</th>
              </tr></thead>
              <tbody>{order.materials_used.map((m, i) => (
                <tr key={i}>
                  <td className="border p-1.5">{m.material}</td>
                  <td className="border p-1.5 text-right">{m.quantity}</td>
                  <td className="border p-1.5 text-right">{m.unit_price} €</td>
                  <td className="border p-1.5 text-right font-medium">{((m.quantity||0)*(m.unit_price||0)).toFixed(2)} €</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        <div className="border-t pt-2 text-sm flex justify-between items-end">
          <p>Mano de obra: {order.labor_hours}h × {order.labor_rate} €/h = <strong>{((order.labor_hours||0)*(order.labor_rate||0)).toFixed(2)} €</strong></p>
          <p className="text-lg font-bold text-orange-700">TOTAL: {order.total?.toFixed(2)} €</p>
        </div>

        {/* Fotos antes */}
        {order.photos_before?.length > 0 && (
          <div><p className="text-xs text-gray-500 font-medium mb-1">Fotos antes:</p><div className="flex flex-wrap gap-2">{order.photos_before.map((p, i) => <img key={i} src={p} alt="" className="w-24 h-24 object-cover rounded border" />)}</div></div>
        )}

        {/* Fotos después — con galería para añadir desde vista previa */}
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">Fotos después de reparación:</p>
          {order.photos_after?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">{order.photos_after.map((p, i) => <img key={i} src={p} alt="" className="w-24 h-24 object-cover rounded border" />)}</div>
          )}
          <PhotoGallery
            photos={order.photos_after || []}
            onChange={async (newPhotos) => {
              await base44.entities.SATOrder.update(order.id, { photos_after: newPhotos });
              if (onUpdate) onUpdate({ ...order, photos_after: newPhotos });
            }}
            label=""
            maxPhotos={200}
          />
        </div>

        {/* Diagnóstico frigorífico guardado desde Diagnóstico Carga (antes / después) */}
        {(order.diagnostic_before?.image_url || order.diagnostic_after?.image_url) && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Diagnóstico frigorífico:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[['Antes de la reparación', order.diagnostic_before], ['Después de la reparación', order.diagnostic_after]].map(([etiqueta, diag]) => (
                diag?.image_url && (
                  <div key={etiqueta} className="border rounded-lg p-2 bg-indigo-50/50">
                    <p className="text-[11px] font-semibold text-indigo-700 mb-1">{etiqueta}</p>
                    <img src={diag.image_url} alt={etiqueta} className="w-full rounded border max-h-40 object-contain bg-white" />
                    <p className="text-[10px] text-gray-500 mt-1">{diag.date}</p>
                    {diag.summary && <p className="text-[11px] text-gray-700 mt-1">{diag.summary}</p>}
                    {diag.manufacturer_values && <p className="text-[10px] text-teal-700 mt-1">{diag.manufacturer_values}</p>}
                    <div className="flex gap-1 mt-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => window.open(diag.image_url, '_blank')}>
                        <Eye className="w-3 h-3" />Ver
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => printDiagnostic(diag, etiqueta)}>
                        <Printer className="w-3 h-3" />Imprimir / PDF
                      </Button>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {order.notes && <div className="bg-amber-50 rounded p-3 text-sm"><p className="text-xs font-medium text-amber-600 mb-1">Notas</p>{order.notes}</div>}

        {/* Firmas digitales */}
        <SATSignaturePanel order={order} onUpdate={onUpdate || (() => {})} />

        {/* Mostrar firmas guardadas en print */}
        {(order.signature_technician || order.signature_client) && (
          <div className="grid grid-cols-2 gap-6 mt-2 pt-2 border-t print-only">
            <div className="text-center">
              {order.signature_technician && <img src={order.signature_technician} alt="Firma técnico" className="h-16 mx-auto object-contain" />}
              <p className="text-xs text-gray-500 mt-1">Firma del Técnico</p>
              {order.technician && <p className="text-xs font-medium">{order.technician}</p>}
            </div>
            <div className="text-center">
              {order.signature_client && <img src={order.signature_client} alt="Firma cliente" className="h-16 mx-auto object-contain" />}
              <p className="text-xs text-gray-500 mt-1">Conformidad del Cliente</p>
              <p className="text-xs font-medium">{order.contact_name}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3 flex-wrap pt-3 border-t">
        <MaterialsExportButton
          items={(order.materials_used || []).map(m => ({ description: m.material, quantity: m.quantity, unit_price: m.unit_price, total: (m.quantity||0)*(m.unit_price||0) }))}
          title={`Orden SAT #${order.order_number} — ${order.contact_name}`}
        />
        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={exportPDF}>
          <FileDown className="w-3.5 h-3.5 mr-1" />Exportar PDF
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}><Edit className="w-3.5 h-3.5 mr-1" />Editar</Button>
        <Button variant="outline" size="sm" className="text-green-700" onClick={sendWhatsApp}><Phone className="w-3.5 h-3.5 mr-1" />WA</Button>
        {contact?.email && <Button variant="outline" size="sm" className="text-blue-700" onClick={sendEmail}><Mail className="w-3.5 h-3.5 mr-1" />Email</Button>}
        {order.contact_id && (
          <Link to={createPageUrl(`DiagnosticoCarga?contact_id=${order.contact_id}&sat_order_id=${order.id}`)}>
            <Button variant="outline" size="sm" className="text-teal-700 border-teal-200 hover:bg-teal-50">
              <Gauge className="w-3.5 h-3.5 mr-1" />Diagnóstico
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}

// ─── FORMULARIO EDICIÓN ───────────────────────────────────────────────────────
function SATForm({ order, contact, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...order, materials_used: order?.materials_used || [], photos_before: order?.photos_before || [], photos_after: order?.photos_after || [] });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const calcTotal = (f) => (f.labor_hours || 0) * (f.labor_rate || 0) + (f.materials_used || []).reduce((s, m) => s + (m.quantity || 0) * (m.unit_price || 0), 0);

  const addMaterial = () => setForm(prev => ({ ...prev, materials_used: [...(prev.materials_used || []), { material: '', quantity: 1, unit_price: '' }] }));
  const updateMaterial = (i, field, val) => setForm(prev => ({ ...prev, materials_used: prev.materials_used.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }));
  const removeMaterial = (i) => setForm(prev => ({ ...prev, materials_used: prev.materials_used.filter((_, idx) => idx !== i) }));

  const handleSave = async (fotosReducidas = null, intento = 0) => {
    setSaveError('');
    // Ver comentario equivalente en pages/SAT.jsx: si varias fotos cayeron en
    // el fallback local (subida a la nube no disponible), su suma puede
    // superar lo que admite el guardado en una sola petición.
    if (!fotosReducidas &&
        getFallbackPhotosSize(form.photos_before, form.photos_after) > MAX_TOTAL_FALLBACK_PAYLOAD) {
      setSaveError(PHOTOS_TOO_LARGE_MESSAGE);
      return;
    }
    setSaving(true);
    const total = calcTotal(form);
    const base = fotosReducidas ? { ...form, ...fotosReducidas } : form;
    const data = { ...base, total };
    // No pisar una firma existente con un hueco (ver CAMPOS_FIRMA).
    for (const k of CAMPOS_FIRMA) {
      const actual = data[k] ?? order?.[k];
      if (actual) data[k] = actual; else delete data[k];
    }
    try {
      if (order?.id) {
        await withTimeout(base44.entities.SATOrder.update(order.id, data), 30000, 'El guardado ha tardado demasiado. Comprueba tu conexión e inténtalo de nuevo.');
      }
      if (fotosReducidas) {
        setForm(prev => ({ ...prev, ...fotosReducidas }));
        guardarLimiteAprendido(
          Math.max(20 * 1024, tamanoFotoMayor(fotosReducidas.photos_before, fotosReducidas.photos_after))
        );
      }
      onSave({ ...data, id: order?.id });
    } catch (err) {
      // El servidor limita el tamaño de CADA foto por separado. En vez de dar
      // el error y perder el trabajo, se reduce la foto y se reintenta.
      if (esErrorDeFotoDemasiadoGrande(err) && intento < 3) {
        const mayor = tamanoFotoMayor(
          (fotosReducidas || form).photos_before, (fotosReducidas || form).photos_after
        );
        const nuevoLimite = Math.max(20 * 1024, Math.round((mayor || 48 * 1024) * 0.6));
        setSaveError(`Las fotos eran demasiado grandes para el servidor. Reduciéndolas e intentándolo de nuevo (${intento + 1}/3)…`);
        const [antes, despues] = await Promise.all([
          reducirFotos((fotosReducidas || form).photos_before, nuevoLimite),
          reducirFotos((fotosReducidas || form).photos_after, nuevoLimite),
        ]);
        setSaving(false);
        return handleSave({ photos_before: antes, photos_after: despues }, intento + 1);
      }
      console.error('[SATOrderDialog] Error real al guardar:', err);
      setSaveError(describeSaveError(err, 'la orden'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Nº orden" value={form.order_number} onChange={e => setForm({ ...form, order_number: e.target.value })} />
        <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.equipment_type} onValueChange={v => setForm({ ...form, equipment_type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{EQUIPMENT.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={form.priority || 'normal'} onValueChange={v => setForm({ ...form, priority: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <TechnicianSelect value={form.technician || ''} onChange={v => setForm({ ...form, technician: v })} placeholder="Seleccionar técnico" />

      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Descripción del problema" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Diagnóstico" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} rows={2} />
      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Solución aplicada" value={form.solution} onChange={e => setForm({ ...form, solution: e.target.value })} rows={2} />

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">Materiales utilizados</label>
          <Button size="sm" variant="outline" onClick={addMaterial}><Plus className="w-3 h-3 mr-1" />Añadir</Button>
        </div>
        {form.materials_used?.map((m, i) => (
          <div key={i} className="grid grid-cols-4 gap-1 mb-1 items-center">
            <div className="col-span-2">
              <MaterialAutocomplete
                value={m.material}
                onChange={v => updateMaterial(i, 'material', v)}
                onSelectItem={sel => setForm(prev => ({
                  ...prev,
                  materials_used: prev.materials_used.map((mat, idx) => idx === i
                    ? { ...mat, material: sel.description, unit_price: sel.unit_price || mat.unit_price }
                    : mat)
                }))}
                placeholder="Material"
              />
            </div>
            <NumberField className="h-8 text-xs border border-input rounded-md px-2 focus:outline-none" placeholder="Cant" value={m.quantity} onChange={v => updateMaterial(i, 'quantity', v)} />
            <div className="flex gap-1">
              <NumberField className="h-8 text-xs flex-1 border border-input rounded-md px-2 focus:outline-none" placeholder="€/ud" value={m.unit_price} onChange={v => updateMaterial(i, 'unit_price', v)} />
              <button onClick={() => removeMaterial(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField placeholder="Horas trabajo" value={form.labor_hours} onChange={v => setForm({ ...form, labor_hours: v })} />
        <NumberField placeholder="€/hora" value={form.labor_rate} onChange={v => setForm({ ...form, labor_rate: v })} />
      </div>
      <p className="text-xs text-right text-gray-500">Total estimado: <strong className="text-orange-700">{calcTotal(form).toFixed(2)} €</strong></p>

      <PhotoGallery photos={form.photos_before||[]} onChange={p => setForm({...form, photos_before: p})} label="Fotos antes de reparación" maxPhotos={200} />
      <PhotoGallery photos={form.photos_after||[]} onChange={p => setForm({...form, photos_after: p})} label="Fotos después de reparación" maxPhotos={200} />

      <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Notas internas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />

      {/* Firmas en modo edición también */}
      {/* Se propagan TODOS los campos de firma, incluidas la fecha y la hora:
          antes solo se copiaban las dos imágenes y el momento de la firma se
          perdía al guardar la orden. */}
      {order?.id && (
        <SATSignaturePanel
          order={{ ...order, ...form }}
          onUpdate={(updated) => setForm(prev => {
            const firmas = {};
            for (const k of CAMPOS_FIRMA) if (updated[k]) firmas[k] = updated[k];
            return { ...prev, ...firmas };
          })}
        />
      )}

      {saveError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">{saveError}</p>
      )}
      <div className="flex gap-2">
        <Button onClick={() => handleSave()} disabled={saving} className="flex-1 bg-orange-600 hover:bg-orange-700">
          {saving ? <><RefreshCw className="w-4 h-4 mr-1 animate-spin" />Guardando...</> : <><Save className="w-4 h-4 mr-1" />Actualizar orden</>}
        </Button>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function SATOrderDialog({ order, contact, mode = 'view', open, onClose, onSaved }) {
  const [currentMode, setCurrentMode] = useState(mode);
  const [currentOrder, setCurrentOrder] = useState(order);

  const handleSaved = (updatedOrder) => {
    setCurrentOrder(updatedOrder);
    setCurrentMode('view');
    if (onSaved) onSaved(updatedOrder);
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {currentMode === 'edit' ? '✏️ Editar' : '👁 Ver'} Orden SAT #{currentOrder?.order_number || 'S/N'}
            </DialogTitle>
            <div className="flex gap-2 mr-6">
              <button
                onClick={() => setCurrentMode('view')}
                className={`text-xs px-2 py-1 rounded transition-colors ${currentMode === 'view' ? 'bg-orange-100 text-orange-700 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Eye className="w-3 h-3 inline mr-1" />Vista previa
              </button>
              <button
                onClick={() => setCurrentMode('edit')}
                className={`text-xs px-2 py-1 rounded transition-colors ${currentMode === 'edit' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Edit className="w-3 h-3 inline mr-1" />Editar
              </button>
            </div>
          </div>
        </DialogHeader>

        {currentMode === 'view' ? (
          <SATPreview order={currentOrder} contact={contact} onEdit={() => setCurrentMode('edit')} onClose={onClose} onUpdate={(updated) => { setCurrentOrder(updated); if (onSaved) onSaved(updated); }} />
        ) : (
          <SATForm order={currentOrder} contact={contact} onSave={handleSaved} onCancel={() => setCurrentMode('view')} />
        )}
      </DialogContent>
    </Dialog>
  );
}