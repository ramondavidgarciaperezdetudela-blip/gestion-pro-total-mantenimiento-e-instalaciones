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
  const [step, setStep] = useState('decision'); // 'decision' | 'sign' | 'rejected' | 'done'
  const [saving, setSaving] = useState(false);

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
    await base44.functions.invoke('aceptarPresupuesto', {
      doc_id: docId,
      signature: signatureDataUrl,
      action: 'aceptar'
    });
    setSaving(false);
    setStep('done');
  };

  const handleReject = async () => {
    setSaving(true);
    await base44.functions.invoke('aceptarPresupuesto', {
      doc_id: docId,
      action: 'rechazar'
    });
    setSaving(false);
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
        <p className="text-sm text-gray-400 mt-4">{company?.company_name}</p>
      </div>
    </div>
  );

  if (step === 'rejected') return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
      <div className="text-center max-w-sm">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-red-600 mb-2">Presupuesto rechazado</h2>
        <p className="text-gray-600">Hemos registrado su respuesta. Si tiene alguna duda o quiere revisarlo, contacte con nosotros.</p>
        <p className="text-sm text-gray-400 mt-4">{company?.company_name} · {company?.phone}</p>
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
            {doc.status === 'pagado' || doc.status === 'cancelado' ? (
              <p className="text-center text-gray-500 text-sm py-4">Este presupuesto ya ha sido procesado.</p>
            ) : (
              <>
                <h3 className="text-base font-bold text-slate-800 text-center">¿Acepta este presupuesto?</h3>
                <p className="text-sm text-gray-500 text-center">Al aceptar, se le solicitará su firma digital como conformidad.</p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={saving}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-12"
                  >
                    <X className="w-4 h-4 mr-2" /> Rechazar
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

        <p className="text-center text-xs text-gray-400 mt-6">
          Documento seguro · {cs.company_name} · {cs.nif}
        </p>
      </div>
    </div>
  );
}