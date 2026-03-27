import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, X, PenLine, RotateCcw, CheckCircle, XCircle, Loader2, AlertTriangle, Phone } from 'lucide-react';

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
    temp.width = 400;
    temp.height = 130;
    const ctx = temp.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 130);
    ctx.drawImage(canvas, 0, 0, 400, 130);
    onSave(temp.toDataURL('image/jpeg', 0.7));
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
  const [step, setStep] = useState('decision'); // 'decision' | 'sign' | 'sign-reject' | 'done' | 'rejected'
  const [saving, setSaving] = useState(false);
  const signRef = useRef(null);

  useEffect(() => {
    if (!docId) { setError('Enlace inválido'); setLoading(false); return; }
    base44.functions.invoke('getPresupuestoPublico', { doc_id: docId })
      .then((res) => {
        if (res?.data?.doc) setDoc(res.data.doc);
        if (res?.data?.company) setCompany(res.data.company);
        if (!res?.data?.doc) setError('Presupuesto no encontrado');
      })
      .catch(() => setError('No se pudo cargar el presupuesto'))
      .finally(() => setLoading(false));
  }, [docId]);

  const handleSign = async (signatureDataUrl) => {
    setSaving(true);
    const res = await base44.functions.invoke('aceptarPresupuesto', {
      doc_id: docId,
      signature: signatureDataUrl,
      action: 'aceptar'
    });
    const dt = res?.data?.sign_datetime || null;
    setSaving(false);
    // Actualizar doc local para mostrar estado firmado
    setDoc(prev => ({ ...prev, status: 'enviado', signature_client: signatureDataUrl, sign_datetime: dt }));
    setStep('decision');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRejectWithSign = async (signatureDataUrl) => {
    setSaving(true);
    const res = await base44.functions.invoke('aceptarPresupuesto', {
      doc_id: docId,
      signature: signatureDataUrl,
      action: 'rechazar'
    });
    const dt = res?.data?.sign_datetime || null;
    setSaving(false);
    // Actualizar doc local para mostrar estado rechazado
    setDoc(prev => ({ ...prev, status: 'cancelado', signature_client: signatureDataUrl, sign_datetime: dt }));
    setStep('decision');
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const cs = company || {};
  const yaFirmado = doc && (doc.signature_client && doc.status !== 'cancelado' && doc.status !== 'borrador' && doc.status !== 'enviado');
  const rechazadoYFirmado = doc && doc.status === 'cancelado' && doc.signature_client;

  const scrollToSign = () => {
    setTimeout(() => signRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header empresa */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-4">
          {cs.logo_url && <img src={cs.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-contain border" />}
          <div>
            <h1 className="font-bold text-lg text-slate-800">{cs.company_name || 'Presupuesto'}</h1>
            <p className="text-sm text-gray-400">{cs.phone} {cs.email ? `· ${cs.email}` : ''}</p>
          </div>
        </div>

        {/* Documento completo */}
        <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
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

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 text-xs text-gray-500 font-medium">Descripción</th>
                <th className="text-center py-2 text-xs text-gray-500 font-medium w-12">Cant.</th>
                <th className="text-right py-2 text-xs text-gray-500 font-medium w-20">Total</th>
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

          {/* Botones de acción dentro del documento — siempre visibles */}
          {!yaFirmado && !rechazadoYFirmado && step === 'decision' && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-center text-sm font-semibold text-slate-700">¿Acepta este presupuesto?</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => { setStep('sign-reject'); scrollToSign(); }}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-12 text-base"
                >
                  <X className="w-4 h-4 mr-2" /> No acepto
                </Button>
                <Button
                  onClick={() => { setStep('sign'); scrollToSign(); }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" /> Acepto y firmo
                </Button>
              </div>
            </div>
          )}

          {/* Ya aceptado */}
          {yaFirmado && (
            <div className="border-t pt-4 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p className="font-semibold text-green-700">Este presupuesto ya fue aceptado y firmado.</p>
              {doc.sign_datetime && <p className="text-xs text-gray-400 font-mono">🕐 {doc.sign_datetime}</p>}
            </div>
          )}

          {/* Rechazado — opción de cambiar de opinión */}
          {rechazadoYFirmado && step === 'decision' && (
            <div className="border-t pt-4 text-center space-y-3">
              <XCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="font-semibold text-gray-700">Este presupuesto fue rechazado y firmado.</p>
              {doc.sign_datetime && <p className="text-xs text-gray-400 font-mono">🕐 {doc.sign_datetime}</p>}
              <p className="text-sm text-gray-500">¿Ha cambiado de opinión?</p>
              <Button
                onClick={() => { setStep('sign'); scrollToSign(); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
              >
                <Check className="w-4 h-4 mr-2" /> Cambiar de opinión y aceptar
              </Button>
            </div>
          )}
        </div>

        {/* Zona de firma — aparece debajo del documento */}
        <div ref={signRef}>
          {step === 'sign' && (
            <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-5 space-y-4">
              <h3 className="text-base font-bold text-green-700 text-center flex items-center justify-center gap-2">
                <PenLine className="w-5 h-5" /> Firma de aceptación
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Al firmar confirma la aceptación del presupuesto <strong>Nº {doc.doc_number}</strong> por importe de <strong>{(doc.total || 0).toFixed(2)} €</strong>
              </p>
              {saving ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  <span className="text-gray-500 font-medium">Guardando su firma...</span>
                  <p className="text-xs text-gray-400">Espere un momento, se está registrando su conformidad</p>
                </div>
              ) : (
                <SignaturePad onSave={handleSign} />
              )}
              <Button variant="ghost" size="sm" className="w-full text-gray-400" onClick={() => setStep('decision')}>
                Cancelar
              </Button>
            </div>
          )}

          {step === 'sign-reject' && (
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-5 space-y-4">
              <h3 className="text-base font-bold text-red-700 text-center flex items-center justify-center gap-2">
                <XCircle className="w-5 h-5" /> Firma de rechazo
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Firme para dejar constancia de que rechaza el presupuesto <strong>Nº {doc.doc_number}</strong>
              </p>
              {saving ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <span className="text-gray-500 font-medium">Registrando su respuesta...</span>
                </div>
              ) : (
                <SignaturePad onSave={handleRejectWithSign} />
              )}
              <Button variant="ghost" size="sm" className="w-full text-gray-400" onClick={() => setStep('decision')}>
                Cancelar
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-6">
          Documento seguro · No requiere instalación · {cs.company_name} {cs.nif ? `· NIF ${cs.nif}` : ''}
        </p>
      </div>
    </div>
  );
}