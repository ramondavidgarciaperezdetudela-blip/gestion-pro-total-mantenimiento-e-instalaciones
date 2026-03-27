import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, X, PenLine, RotateCcw, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

// Mini SignaturePad inline para esta página pública
function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }, [getPos]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDraw = useCallback((e) => {
    if (e) e.preventDefault();
    setIsDrawing(false);
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    const temp = document.createElement('canvas');
    temp.width = 600;
    temp.height = 200;
    const ctx = temp.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 200);
    ctx.drawImage(canvas, 0, 0, 600, 200);
    onSave(temp.toDataURL('image/png'));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 text-center">Firme aquí con su dedo o ratón:</p>
      <div className="border-2 border-dashed border-blue-300 rounded-xl overflow-hidden bg-white shadow-inner relative">
        <canvas
          ref={canvasRef}
          width={900}
          height={280}
          className="w-full cursor-crosshair block"
          style={{ touchAction: 'none', minHeight: '140px' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-200 text-sm select-none">← Firme aquí →</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={clear} className="flex-1">
          <RotateCcw className="w-3.5 h-3.5 mr-1" /> Borrar
        </Button>
        <Button size="sm" onClick={save} disabled={!hasDrawn} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
          <Check className="w-3.5 h-3.5 mr-1" /> Confirmar firma
        </Button>
      </div>
    </div>
  );
}

export default function PresupuestoPublico() {
  const params = new URLSearchParams(window.location.search);
  const docId = params.get('id');

  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('decision'); // 'decision' | 'sign' | 'sign-reject' | 'rejected' | 'done'
  const [saving, setSaving] = useState(false);
  const [signDatetime, setSignDatetime] = useState(null);

  useEffect(() => {
    if (!docId) { setError('Enlace inválido'); setLoading(false); return; }
    Promise.all([
      base44.functions.invoke('getPresupuestoPublico', { doc_id: docId }),
      base44.functions.invoke('getPresupuestoPublico', { doc_id: docId, company_only: true })
    ]).then(([res]) => {
      if (res?.data?.doc) setDoc(res.data.doc);
      if (res?.data?.company) setCompany(res.data.company);
      if (!res?.data?.doc) setError('Presupuesto no encontrado');
    }).catch(() => setError('No se pudo cargar el presupuesto')).finally(() => setLoading(false));
  }, [docId]);

  const handleSign = async (signatureDataUrl) => {
    setSaving(true);
    const res = await base44.functions.invoke('aceptarPresupuesto', {
      doc_id: docId,
      signature: signatureDataUrl,
      action: 'aceptar'
    });
    setSaving(false);
    setSignDatetime(res?.data?.sign_datetime || null);
    if (res?.data?.whatsapp_url) {
      setTimeout(() => window.open(res.data.whatsapp_url, '_blank'), 500);
    }
    setStep('done');
  };

  const handleRejectWithSign = async (signatureDataUrl) => {
    setSaving(true);
    const res = await base44.functions.invoke('aceptarPresupuesto', {
      doc_id: docId,
      signature: signatureDataUrl,
      action: 'rechazar'
    });
    setSaving(false);
    setSignDatetime(res?.data?.sign_datetime || null);
    if (res?.data?.whatsapp_url) {
      setTimeout(() => window.open(res.data.whatsapp_url, '_blank'), 500);
    }
    setStep('rejected');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-orange-400 mx-auto mb-3" />
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  if (step === 'done') return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="text-center max-w-sm">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-green-700 mb-2">¡Presupuesto aceptado!</h2>
        <p className="text-gray-600">Gracias por su confirmación. Hemos recibido su firma y nos pondremos en contacto con usted en breve.</p>
        {signDatetime && (
          <div className="mt-5 bg-white border border-green-200 rounded-xl px-4 py-3 inline-block shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Firma digital registrada</p>
            <p className="text-base font-bold text-green-700">✅ {signDatetime}</p>
          </div>
        )}
        <p className="text-sm text-gray-400 mt-5">Le hemos enviado una copia a su WhatsApp.</p>
        <p className="text-sm text-gray-400 mt-1">{company?.company_name}</p>
      </div>
    </div>
  );

  if (step === 'rejected') return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
      <div className="text-center max-w-sm">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-2">Presupuesto rechazado</h2>
        <p className="text-gray-600">Hemos registrado su rechazo firmado. Le hemos enviado una copia a su WhatsApp.</p>
        {signDatetime && (
          <div className="mt-5 bg-white border border-red-200 rounded-xl px-4 py-3 inline-block shadow-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Firma digital registrada</p>
            <p className="text-base font-bold text-red-600">❌ {signDatetime}</p>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-5">Si desea revisarlo o tiene alguna duda, contacte con nosotros de nuevo.</p>
        <p className="text-sm text-gray-400 mt-2">{company?.company_name} · {company?.phone}</p>
      </div>
    </div>
  );

  const cs = company || {};

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header empresa */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4 flex items-center gap-4">
          {cs.logo_url && <img src={cs.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-contain border" />}
          <div>
            <h1 className="font-bold text-lg text-slate-800">{cs.company_name || 'Presupuesto'}</h1>
            <p className="text-sm text-gray-400">{cs.phone} · {cs.email}</p>
          </div>
        </div>

        {/* Documento */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 mb-4 space-y-4">
          <div className="flex justify-between items-start border-b pb-3">
            <div>
              <span className="text-xs uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{doc.doc_type}</span>
              <h2 className="text-xl font-bold mt-1">Nº {doc.doc_number || '-'}</h2>
              <p className="text-sm text-gray-500">Fecha: {doc.date}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-800">{(doc.total || 0).toFixed(2)} €</p>
              <p className="text-xs text-gray-400">IVA incluido ({doc.iva_rate || 21}%)</p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
            <p className="font-bold text-sm">{doc.contact_name}</p>
            {doc.contact_nif && <p className="text-xs text-gray-500">NIF: {doc.contact_nif}</p>}
            {doc.contact_address && <p className="text-xs text-gray-500">{doc.contact_address}</p>}
          </div>

          {/* Líneas */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs text-gray-500 font-medium">Descripción</th>
                <th className="text-center py-2 text-xs text-gray-500 font-medium">Cant.</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {(doc.items || []).map((item, i) => (
                <tr key={i} className="border-b border-slate-50">
                  <td className="py-2 text-sm text-gray-700">{item.description}</td>
                  <td className="py-2 text-center text-sm text-gray-500">{item.quantity}</td>
                  <td className="py-2 text-right text-sm font-medium">{(item.total || 0).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-right space-y-1 border-t pt-3">
            <p className="text-sm text-gray-500">Subtotal: <strong>{(doc.subtotal || 0).toFixed(2)} €</strong></p>
            <p className="text-sm text-gray-500">IVA ({doc.iva_rate || 21}%): <strong>{(doc.iva_amount || 0).toFixed(2)} €</strong></p>
            <p className="text-xl font-black text-slate-800">TOTAL: {(doc.total || 0).toFixed(2)} €</p>
          </div>

          {doc.observations && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap">
              <strong>Observaciones:</strong> {doc.observations}
            </div>
          )}
          {doc.payment_terms && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 whitespace-pre-wrap">{doc.payment_terms}</div>
          )}
        </div>

        {/* Acciones */}
        {step === 'decision' && (
          <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
            {(doc.status === 'pagado' || doc.status === 'cancelado' || doc.signature_client) ? (
              <div className="text-center py-6 space-y-3">
                <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${doc.status === 'cancelado' ? 'bg-red-100' : 'bg-green-100'}`}>
                  {doc.status === 'cancelado'
                    ? <XCircle className="w-8 h-8 text-red-500" />
                    : <CheckCircle className="w-8 h-8 text-green-500" />}
                </div>
                <p className="font-semibold text-gray-700">
                  {doc.status === 'cancelado' ? 'Este presupuesto ya fue rechazado y firmado.' : 'Este presupuesto ya fue aceptado y firmado.'}
                </p>
                <p className="text-sm text-gray-400">Este enlace ya no está disponible. Si desea modificar su respuesta, contacte con nosotros directamente.</p>
                {company?.phone && (
                  <a href={`https://wa.me/${company.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Contactar por WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-800 text-center">¿Acepta este presupuesto?</h3>
                <p className="text-sm text-gray-500 text-center">Al aceptar, se le solicitará su firma digital como conformidad.</p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep('sign-reject')}
                    disabled={saving}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-12"
                  >
                    <X className="w-4 h-4 mr-2" /> Rechazar y firmar
                  </Button>
                  <Button
                    onClick={() => setStep('sign')}
                    disabled={saving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12"
                  >
                    <Check className="w-4 h-4 mr-2" /> Aceptar y firmar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'sign' && (
          <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-800 text-center">Firma de conformidad</h3>
            <p className="text-sm text-gray-500 text-center">
              Al firmar confirma la aceptación del presupuesto <strong>Nº {doc.doc_number}</strong> por importe de <strong>{(doc.total || 0).toFixed(2)} €</strong>
            </p>
            {saving ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                <span className="text-gray-500">Guardando su firma...</span>
              </div>
            ) : (
              <SignaturePad onSave={handleSign} />
            )}
            <Button variant="ghost" size="sm" className="w-full text-gray-400" onClick={() => setStep('decision')}>
              Volver
            </Button>
          </div>
        )}

        {step === 'sign-reject' && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-5 space-y-4">
            <h3 className="text-base font-bold text-red-700 text-center flex items-center justify-center gap-2">
              <XCircle className="w-5 h-5" /> Firma de rechazo
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Para dejar constancia del rechazo del presupuesto <strong>Nº {doc.doc_number}</strong>, le solicitamos su firma.
            </p>
            {saving ? (
              <div className="flex items-center justify-center py-8 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                <span className="text-gray-500">Registrando su respuesta...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 text-center">Firme aquí con su dedo o ratón:</p>
                <SignaturePad onSave={handleRejectWithSign} />
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full text-gray-400" onClick={() => setStep('decision')}>
              Volver
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Documento seguro · {cs.company_name} · {cs.nif}
        </p>
      </div>
    </div>
  );
}