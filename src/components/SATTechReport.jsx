import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileDown, ClipboardList, CheckCircle, Loader2, Camera, X } from 'lucide-react';
import PhotoGallery from './PhotoGallery';
import SignatureCanvas from './SignaturePad';
// SignaturePad.jsx exports as SignatureCanvas
import { format } from 'date-fns';

export default function SATTechReport({ order, open, onClose }) {
  const [step, setStep] = useState('form'); // form | signature | done
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({
    work_done: order?.solution || '',
    observations: '',
    recommendations: '',
    photos: [...(order?.photos_after || [])],
    client_name: order?.contact_name || '',
  });
  const [signatureData, setSignatureData] = useState(null);
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    base44.entities.CompanySettings.list().then(d => { if (d[0]) setCompany(d[0]); });
  }, []);

  const generateAndPrintPDF = async (sig) => {
    const cs = company || {};
    const now = format(new Date(), 'dd/MM/yyyy HH:mm');

    const photosHtml = (form.photos || []).slice(0, 12).map((p, i) =>
      `<div style="display:inline-block;margin:4px"><img src="${p}" style="width:140px;height:110px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb" /></div>`
    ).join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Informe Técnico SAT #${order?.order_number || ''}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial,sans-serif;font-size:10px;color:#111;padding:24px;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #ea580c;padding-bottom:14px;margin-bottom:18px}
      .company-info{flex:1}
      .doc-title{text-align:right}
      .logo{max-height:52px;max-width:120px;object-fit:contain;margin-bottom:6px}
      .title{font-size:22px;font-weight:800;color:#ea580c;letter-spacing:-0.5px}
      .subtitle{font-size:11px;color:#666;margin-top:2px}
      .section{background:#f9fafb;border-left:4px solid #e5e7eb;padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0}
      .section.blue{border-left-color:#3b82f6;background:#eff6ff}
      .section.green{border-left-color:#16a34a;background:#f0fdf4}
      .section.amber{border-left-color:#d97706;background:#fffbeb}
      .section.orange{border-left-color:#ea580c;background:#fff7ed}
      .label{font-size:8px;font-weight:700;text-transform:uppercase;color:#6b7280;margin-bottom:4px;letter-spacing:.5px}
      .value{font-size:10px;white-space:pre-wrap;line-height:1.5}
      .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
      .photos-section{margin:16px 0}
      .sig-block{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;padding-top:16px;border-top:2px solid #e5e7eb}
      .sig-box{text-align:center}
      .sig-box img{height:70px;max-width:100%;object-fit:contain;border:1px solid #e5e7eb;border-radius:4px;background:#fff;padding:4px}
      .sig-line{height:70px;border-bottom:1px solid #aaa;margin:0 20px}
      .sig-label{font-size:8px;color:#666;margin-top:6px}
      .sig-name{font-size:9px;font-weight:700;margin-top:2px}
      .footer{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:8px;color:#aaa;text-align:center}
      .badge{display:inline-block;background:#fed7aa;color:#9a3412;padding:2px 10px;border-radius:12px;font-size:8px;font-weight:700;margin-left:8px}
      @media print{@page{margin:12mm;size:A4}body{padding:10px}}
    </style></head><body>

    <div class="header">
      <div class="company-info">
        ${cs.logo_url ? `<img src="${cs.logo_url}" class="logo" alt="Logo" /><br/>` : ''}
        <strong style="font-size:14px;color:#1e3a5f">${cs.company_name || ''}</strong>
        ${cs.nif ? `<div style="font-size:9px;color:#555;margin-top:2px">NIF: ${cs.nif}</div>` : ''}
        <div style="font-size:9px;color:#555">${[cs.phone, cs.email].filter(Boolean).join(' · ')}</div>
        ${cs.address ? `<div style="font-size:9px;color:#555">${cs.address}${cs.city ? ', ' + cs.city : ''}</div>` : ''}
      </div>
      <div class="doc-title">
        <div class="title">INFORME TÉCNICO</div>
        <div class="subtitle">Orden SAT <strong>#${order?.order_number || 'S/N'}</strong></div>
        <div style="font-size:9px;color:#666;margin-top:4px">Fecha: ${now}</div>
        <div style="margin-top:6px"><span class="badge">${(order?.status || '').toUpperCase()}</span></div>
      </div>
    </div>

    <div class="grid2">
      <div class="section"><div class="label">Cliente</div><div class="value"><strong>${order?.contact_name || '-'}</strong></div></div>
      <div class="section"><div class="label">Técnico responsable</div><div class="value">${order?.technician || '-'}</div></div>
      <div class="section"><div class="label">Tipo de servicio</div><div class="value">${(order?.type || '').replace(/_/g, ' ')} / ${(order?.equipment_type || '').replace(/_/g, ' ')}</div></div>
      <div class="section"><div class="label">Fecha de visita</div><div class="value">${order?.date || '-'}</div></div>
    </div>

    ${order?.description ? `<div class="section"><div class="label">Descripción del problema</div><div class="value">${order.description}</div></div>` : ''}
    ${order?.diagnosis ? `<div class="section blue"><div class="label">Diagnóstico técnico</div><div class="value">${order.diagnosis}</div></div>` : ''}

    ${form.work_done ? `<div class="section green"><div class="label">Trabajos realizados</div><div class="value">${form.work_done}</div></div>` : ''}
    ${form.observations ? `<div class="section amber"><div class="label">Observaciones del técnico</div><div class="value">${form.observations}</div></div>` : ''}
    ${form.recommendations ? `<div class="section orange"><div class="label">Recomendaciones y próximas acciones</div><div class="value">${form.recommendations}</div></div>` : ''}

    ${order?.materials_used?.length ? `
    <div style="margin:12px 0">
      <div class="label" style="margin-bottom:6px">Materiales y piezas utilizadas</div>
      <table style="width:100%;border-collapse:collapse;font-size:9px">
        <thead><tr style="background:#374151;color:#fff">
          <th style="padding:5px 8px;text-align:left">Material</th>
          <th style="padding:5px 8px;text-align:center">Cant.</th>
          <th style="padding:5px 8px;text-align:right">€/ud</th>
          <th style="padding:5px 8px;text-align:right">Total</th>
        </tr></thead>
        <tbody>${order.materials_used.map((m, i) => `
          <tr style="background:${i%2===0?'#f9fafb':'#fff'}">
            <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb">${m.material}</td>
            <td style="padding:5px 8px;text-align:center;border-bottom:1px solid #e5e7eb">${m.quantity}</td>
            <td style="padding:5px 8px;text-align:right;border-bottom:1px solid #e5e7eb">${(m.unit_price||0).toFixed(2)} €</td>
            <td style="padding:5px 8px;text-align:right;font-weight:600;border-bottom:1px solid #e5e7eb">${((m.quantity||0)*(m.unit_price||0)).toFixed(2)} €</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right;margin-top:8px;padding-top:6px;border-top:2px solid #e5e7eb">
        <span style="font-size:9px;color:#555">Mano de obra: ${order.labor_hours||0}h × ${order.labor_rate||0} €/h = ${((order.labor_hours||0)*(order.labor_rate||0)).toFixed(2)} €</span><br/>
        <span style="font-size:16px;font-weight:800;color:#ea580c">TOTAL: ${(order.total||0).toFixed(2)} €</span>
      </div>
    </div>` : ''}

    ${photosHtml ? `<div class="photos-section"><div class="label" style="margin-bottom:8px">Fotografías de la intervención</div><div style="text-align:left">${photosHtml}</div></div>` : ''}

    <div class="sig-block">
      <div class="sig-box">
        ${order?.signature_technician
          ? `<img src="${order.signature_technician}" alt="Firma técnico" style="height:80px;max-width:100%;object-fit:contain;border:1px solid #e5e7eb;border-radius:4px;background:#fff;padding:4px" />`
          : `<div style="height:80px;border-bottom:1px dashed #aaa;margin:0 10px"></div>`}
        <div class="sig-label">Firma del Técnico</div>
        <div class="sig-name">${order?.technician || 'Técnico'}</div>
        ${order?.sign_datetime_technician ? `<div style="font-size:7px;color:#aaa;margin-top:2px">${order.sign_datetime_technician}</div>` : ''}
      </div>
      <div class="sig-box" style="${sig ? 'background:#f0fdf4;border:2px solid #16a34a;border-radius:8px;padding:8px' : ''}">
        ${sig
          ? `<img src="${sig}" alt="Firma cliente" style="height:80px;max-width:100%;object-fit:contain;background:#fff;border-radius:4px;padding:4px" />`
          : `<div style="height:80px;border-bottom:2px dashed #dc2626;margin:0 10px;position:relative"><span style="position:absolute;bottom:4px;width:100%;text-align:center;font-size:9px;color:#dc2626">Pendiente de firma</span></div>`}
        <div class="sig-label" style="${sig ? 'color:#16a34a;font-weight:700' : ''}">
          ${sig ? '✓ Conformidad del Cliente' : 'Conformidad del Cliente'}
        </div>
        <div class="sig-name">${form.client_name || order?.contact_name || ''}</div>
        ${sig ? `<div style="font-size:7px;color:#16a34a;margin-top:2px;font-weight:600">Firmado: ${now}</div>` : ''}
      </div>
    </div>

    <div class="footer">${cs.company_name || ''} · ${cs.phone || ''} · ${cs.email || ''} · Informe generado el ${now}</div>
    </body></html>`;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 600);
  };

  const handleFinish = async () => {
    if (!signatureData) return;
    setLoading(true);
    // Guardar firma del cliente en la orden si no la tenía
    if (!order.signature_client && signatureData) {
      const now = format(new Date(), 'dd/MM/yyyy HH:mm:ss');
      await base44.entities.SATOrder.update(order.id, {
        signature_client: signatureData,
        sign_datetime_client: now,
        status: order.status === 'pendiente' ? 'completada' : order.status,
      });
    }
    await generateAndPrintPDF(signatureData);
    setReportGenerated(true);
    setLoading(false);
    setStep('done');
  };

  const handleSkipSignature = async () => {
    setLoading(true);
    await generateAndPrintPDF(null);
    setLoading(false);
    setStep('done');
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl w-full max-h-[95vh] overflow-y-auto sm:max-h-[90vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-orange-600" />
            <span className="text-sm sm:text-base">Informe Técnico — SAT #{order?.order_number || 'S/N'}</span>
          </DialogTitle>
        </DialogHeader>

        {/* PASO 1: Formulario */}
        {step === 'form' && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800">
              Completa el informe de la visita. Podrás añadir fotos y obtener la firma del cliente antes de generar el PDF.
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Trabajos realizados *</label>
              <textarea
                className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Describe los trabajos realizados durante la visita..."
                value={form.work_done}
                onChange={e => setForm({ ...form, work_done: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Observaciones técnicas</label>
              <textarea
                className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Estado del equipo, incidencias observadas, condiciones del lugar..."
                value={form.observations}
                onChange={e => setForm({ ...form, observations: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Recomendaciones y próximas acciones</label>
              <textarea
                className="mt-1 w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Revisiones futuras, piezas a cambiar, mantenimientos recomendados..."
                value={form.recommendations}
                onChange={e => setForm({ ...form, recommendations: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase mb-2 block">
                <Camera className="w-3.5 h-3.5 inline mr-1" />
                Fotos de la intervención
              </label>
              <PhotoGallery
                photos={form.photos}
                onChange={p => setForm({ ...form, photos: p })}
                label="Añadir fotos"
                maxPhotos={20}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase">Nombre del cliente (para firma)</label>
              <Input
                className="mt-1"
                value={form.client_name}
                onChange={e => setForm({ ...form, client_name: e.target.value })}
                placeholder="Nombre completo del cliente"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={() => setStep('signature')}
                disabled={!form.work_done.trim()}
              >
                Siguiente: Firma del cliente →
              </Button>
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
            </div>
          </div>
        )}

        {/* PASO 2: Firma cliente en el móvil */}
        {step === 'signature' && (
          <div className="space-y-4">
            {/* Aviso para entregar el móvil al cliente */}
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 text-center">
              <p className="text-lg font-bold text-amber-800">📱 Entrega el móvil al cliente</p>
              <p className="text-sm text-amber-700 mt-1">El cliente debe firmar abajo para confirmar los trabajos realizados</p>
            </div>

            {/* Resumen compacto visible para el cliente */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-sm">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Resumen del servicio</p>
              <p className="text-sm font-semibold text-gray-800">{order?.contact_name}</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{form.work_done}</p>
              {form.observations && <p className="text-xs text-gray-500 italic">{form.observations}</p>}
              {order?.total > 0 && (
                <p className="text-base font-bold text-orange-700 pt-1 border-t border-gray-100">
                  Total: {order.total?.toFixed(2)} €
                </p>
              )}
              <p className="text-xs text-gray-400">Fecha: {order?.date} · Técnico: {order?.technician || '-'}</p>
            </div>

            {/* Canvas de firma grande y táctil */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2 text-center">
                ✍️ Firma del cliente: <span className="text-orange-600">{form.client_name || order?.contact_name}</span>
              </p>
              <SignatureCanvas
                onSave={(dataUrl) => setSignatureData(dataUrl)}
                label={null}
              />
              {signatureData && (
                <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1 font-semibold">
                  <CheckCircle className="w-4 h-4" /> Firma capturada correctamente
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-base py-6 sm:py-2"
                onClick={handleFinish}
                disabled={loading || !signatureData}
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Generando PDF...</>
                  : <><FileDown className="w-4 h-4 mr-1" />Generar PDF con firma</>
                }
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSkipSignature} disabled={loading} className="flex-1 sm:flex-none text-xs">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sin firma'}
                </Button>
                <Button variant="ghost" onClick={() => setStep('form')} className="flex-1 sm:flex-none text-xs">← Atrás</Button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: Finalizado */}
        {step === 'done' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">¡Informe generado!</h3>
              <p className="text-sm text-gray-500 mt-1">El PDF se ha abierto en una nueva pestaña listo para imprimir o guardar.</p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={async () => { await generateAndPrintPDF(signatureData); }}
              >
                <FileDown className="w-4 h-4 mr-1" /> Regenerar PDF
              </Button>
              <Button onClick={onClose} className="bg-orange-600 hover:bg-orange-700">
                Cerrar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}