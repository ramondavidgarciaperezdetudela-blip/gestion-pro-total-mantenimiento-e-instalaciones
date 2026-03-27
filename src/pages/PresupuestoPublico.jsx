import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, X, PenLine, RotateCcw, CheckCircle, XCircle, Loader2, AlertTriangle, Phone, MessageCircle } from 'lucide-react';

// Skeleton loader
const DocumentSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4 animate-pulse">
    <div className="flex justify-between items-start border-b pb-3">
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
        <div className="h-6 w-32 bg-gray-200 rounded"></div>
        <div className="h-3 w-24 bg-gray-100 rounded"></div>
      </div>
      <div className="space-y-2 text-right">
        <div className="h-7 w-20 bg-gray-200 rounded"></div>
        <div className="h-3 w-32 bg-gray-100 rounded"></div>
      </div>
    </div>
    <div className="h-20 bg-gray-100 rounded"></div>
    <div className="space-y-2">
      <div className="h-4 w-full bg-gray-100 rounded"></div>
      <div className="h-4 w-5/6 bg-gray-100 rounded"></div>
    </div>
  </div>
);

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

function PresupuestoPublico() {
  const params = new URLSearchParams(window.location.search);
  const docId = params.get('id');
  const method = params.get('method') || 'web'; // Detecta si vino por email, whatsapp o web
  const changeOpinionToken = params.get('token'); // Token único del cambio de opinión
  const isChangeOpinion = !!changeOpinionToken; // Es cambio de opinión si hay token

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
    try {
      const res = await base44.functions.invoke('aceptarPresupuesto', {
        doc_id: docId,
        signature: signatureDataUrl,
        action: 'aceptar',
        method: method,
        change_opinion_token: changeOpinionToken
      });
      const dt = res?.data?.sign_datetime || null;
      const updatedDoc = { ...doc, status: 'enviado', signature_client: signatureDataUrl, sign_datetime: dt };
      setDoc(updatedDoc);
      
      // Si hay signature_history, es cambio de opinión — enviar copia firmada
      if (doc.signature_history && doc.signature_history.length > 0) {
        try {
          await base44.functions.invoke('enviarCopiaFirmada', {
            doc_id: docId,
            action: 'aceptar',
            is_change_opinion: true
          });
        } catch (e) {
          console.error('Error enviando copia:', e);
        }
      }
      
      // Si es cambio de opinión, recargar documento para obtener historial actualizado
      if (isChangeOpinion) {
        try {
          const reloadRes = await base44.functions.invoke('getPresupuestoPublico', { doc_id: docId });
          if (reloadRes?.data?.doc) setDoc(reloadRes.data.doc);
        } catch (e) {
          console.error('Error recargando documento:', e);
        }
      }
    } finally {
      setSaving(false);
    }
    // Si viene por email o whatsapp, mostrar confirmación. Si no, volver a decision
    if (method === 'email' || method === 'whatsapp') {
      setStep('done');
    } else {
      setStep('decision');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRejectWithSign = async (signatureDataUrl) => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('aceptarPresupuesto', {
        doc_id: docId,
        signature: signatureDataUrl,
        action: 'rechazar',
        method: method,
        change_opinion_token: changeOpinionToken
      });
      const dt = res?.data?.sign_datetime || null;
      const updatedDoc = { ...doc, status: 'cancelado', signature_client: signatureDataUrl, sign_datetime: dt };
      setDoc(updatedDoc);
      
      // Si hay signature_history, es cambio de opinión — enviar copia firmada
      if (doc.signature_history && doc.signature_history.length > 0) {
        try {
          await base44.functions.invoke('enviarCopiaFirmada', {
            doc_id: docId,
            action: 'rechazar',
            is_change_opinion: true
          });
        } catch (e) {
          console.error('Error enviando copia:', e);
        }
      }
      
      // Si es cambio de opinión, recargar documento para obtener historial actualizado
      if (isChangeOpinion) {
        try {
          const reloadRes = await base44.functions.invoke('getPresupuestoPublico', { doc_id: docId });
          if (reloadRes?.data?.doc) setDoc(reloadRes.data.doc);
        } catch (e) {
          console.error('Error recargando documento:', e);
        }
      }
    } finally {
      setSaving(false);
    }
    // Si viene por email o whatsapp, mostrar confirmación. Si no, volver a decision
    if (method === 'email' || method === 'whatsapp') {
      setStep('rejected');
    } else {
      setStep('decision');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!company && loading) return (
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
  // Aceptado: tiene firma y status es enviado, pagado o vencido (no borrador, no cancelado)
  const isPresupuesto = doc?.doc_type === 'presupuesto';
  const isFactura = doc?.doc_type === 'factura';
  const isRecibo = doc?.doc_type === 'recibo';
  
  // Detectar si es cambio de opinión (por parámetro URL o por historial múltiple)
  const esChangioDeOpinion = isChangeOpinion || (doc && doc.signature_history && doc.signature_history.length > 0);
  
  // Detectar si hay una firma reciente (última en el historial)
  const ultimaFirma = doc?.signature_history?.[doc.signature_history.length - 1];
  const tieneUltimaFirma = !!ultimaFirma;
  
  const yaFirmado = doc && doc.signature_client && ['enviado', 'pagado', 'vencido'].includes(doc.status) && !esChangioDeOpinion;
  const rechazadoYFirmado = doc && doc.status === 'cancelado' && doc.signature_client && !esChangioDeOpinion;

  const scrollToSign = () => {
    setTimeout(() => signRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleRequestChangeOpinion = async () => {
    setSaving(true);
    try {
      const previousDecision = yaFirmado ? 'aceptado' : (rechazadoYFirmado ? 'rechazado' : '');
      const res = await base44.functions.invoke('notifyChangeOpinionRequest', {
        doc_id: docId,
        doc_number: doc.doc_number,
        doc_type: doc.doc_type,
        contact_name: doc.contact_name,
        contact_id: doc.contact_id,
        contact_phone: doc.contact_phone,
        total: doc.total,
        previous_decision: previousDecision
      });
      if (res?.data?.ok) {
        alert('✅ Se ha enviado tu solicitud. El equipo se pondrá en contacto contigo pronto para enviar el enlace actualizado.');
      } else {
        throw new Error('No se confirmó el envío');
      }
    } catch (error) {
      console.error('Error en solicitud de cambio:', error);
      alert('✅ Tu solicitud ha sido registrada. El equipo se pondrá en contacto contigo en breve.\n\n(Si tienes dudas, contacta directamente al equipo)');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header empresa — aparece inmediatamente */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-4">
          {cs.logo_url && <img src={cs.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-contain border" loading="eager" />}
          <div>
            <h1 className="font-bold text-lg text-slate-800">{cs.company_name || 'Presupuesto'}</h1>
            <p className="text-sm text-gray-400">{cs.phone} {cs.email ? `· ${cs.email}` : ''}</p>
          </div>
        </div>

        {/* Documento completo o skeleton mientras carga */}
        {!doc ? (
          <DocumentSkeleton />
        ) : (
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

          {/* Historial de decisiones */}
          {doc.signature_history && doc.signature_history.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-bold text-sm text-blue-800 mb-3">📋 Historial de decisiones</h4>
              <div className="space-y-3">
                {doc.signature_history.map((item, idx) => {
                  const isAccepted = item.action === 'aceptar';
                  const icon = isAccepted ? '✅' : '❌';
                  const actionText = isAccepted ? 'ACEPTADO' : 'RECHAZADO';
                  const color = isAccepted ? 'text-green-700' : 'text-red-700';
                  const methodLabel = item.method === 'email' ? '📧 Email' : item.method === 'whatsapp' ? '📱 WhatsApp' : '🌐 Web';
                  return (
                    <div key={idx} className="border-b border-blue-100 pb-2 last:border-b-0 last:pb-0">
                      <p className={`font-bold text-sm ${color}`}>{icon} {actionText}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-600">📅 {item.datetime}</p>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{methodLabel}</span>
                      </div>
                      {item.signature_url && (
                        <div className="mt-2">
                          <img src={item.signature_url} alt="Firma" className="max-w-[150px] border border-blue-200 rounded bg-white p-1" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Botones según tipo de documento - mostrar si es cambio de opinión O si no tiene firma */}
          {(isChangeOpinion || (!yaFirmado && !rechazadoYFirmado && !tieneUltimaFirma)) && step === 'decision' && (
            <div className="border-t pt-4 space-y-3">
              {/* Si es cambio de opinión, mostrar decisión anterior */}
              {isChangeOpinion && tieneUltimaFirma && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-semibold text-blue-700 text-center mb-3">
                    📋 Decisión anterior • Puede cambiar de opinión
                  </p>
                  <div className={`rounded-lg p-3 ${
                    ultimaFirma.action === 'aceptar' 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="text-center space-y-2">
                      <p className={`font-bold text-sm ${ultimaFirma.action === 'aceptar' ? 'text-green-700' : 'text-red-700'}`}>
                        {ultimaFirma.action === 'aceptar' ? '✅ Fue ACEPTADO' : '❌ Fue RECHAZADO'}
                      </p>
                      {ultimaFirma.datetime && <p className="text-xs text-gray-600">🕐 {ultimaFirma.datetime}</p>}
                    </div>
                  </div>
                </div>
              )}

              {isPresupuesto && (
                <>
                  <p className="text-center text-sm font-semibold text-slate-700">{isChangeOpinion ? '¿Desea cambiar su decisión?' : '¿Acepta este presupuesto?'}</p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => { setStep('sign-reject'); scrollToSign(); }}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-12 text-base"
                    >
                      <X className="w-4 h-4 mr-2" /> {isChangeOpinion ? 'Rechazar' : 'No acepto'}
                    </Button>
                    <Button
                      onClick={() => { setStep('sign'); scrollToSign(); }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                    >
                      <Check className="w-4 h-4 mr-2" /> {isChangeOpinion ? 'Aceptar' : 'Acepto y firmo'}
                    </Button>
                  </div>
                </>
              )}
              {(isFactura || isRecibo) && (
                <>
                  <p className="text-center text-sm font-semibold text-slate-700">
                    {isFactura ? 'Confirme recepción de la factura' : 'Firme para confirmar recepción'}
                  </p>
                  <Button
                    onClick={() => { setStep('sign'); scrollToSign(); }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold"
                  >
                    <Check className="w-4 h-4 mr-2" /> {isFactura ? 'Confirmar y firmar' : 'Firmar'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Mostrar última firma si existe - siempre en recuadro coloreado */}
          {tieneUltimaFirma && step === 'decision' && !isChangeOpinion && (
            <div className="border-t pt-4 space-y-3">
              <div className={`rounded-lg p-4 ${
                ultimaFirma.action === 'aceptar' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="text-center space-y-3">
                  {ultimaFirma.action === 'aceptar' ? (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-green-700">✅ ACEPTADO</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-red-700">❌ RECHAZADO</span>
                      </div>
                    </>
                  )}
                  
                  {ultimaFirma.signature_url && (
                    <div className="mt-3">
                      <img src={ultimaFirma.signature_url} alt="Firma" className="max-h-24 mx-auto border rounded bg-white p-2" />
                    </div>
                  )}
                  
                  <div className={`text-sm font-semibold ${ultimaFirma.action === 'aceptar' ? 'text-green-700' : 'text-red-700'}`}>
                    {ultimaFirma.datetime && <p>🕐 {ultimaFirma.datetime}</p>}
                  </div>
                  
                  {ultimaFirma.method && (
                    <p className={`text-xs inline-block px-2.5 py-1 rounded font-medium ${
                      ultimaFirma.method === 'email' ? 'bg-blue-100 text-blue-700' : 
                      ultimaFirma.method === 'whatsapp' ? 'bg-green-100 text-green-700' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {ultimaFirma.method === 'email' ? '📧 Firma por email' : ultimaFirma.method === 'whatsapp' ? '📱 Firma por WhatsApp' : '🌐 Firma por web'}
                    </p>
                  )}
                </div>
              </div>
              
              {isPresupuesto && !isChangeOpinion && (
                <Button
                  onClick={handleRequestChangeOpinion}
                  disabled={saving}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-10"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Solicitar cambio de opinión
                </Button>
              )}
            </div>
          )}



          {/* Ya firmado - pero NO si es cambio de opinión */}
          {yaFirmado && !isChangeOpinion && (
            <div className="border-t pt-4 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p className="font-semibold text-green-700">
                {isPresupuesto ? 'Este presupuesto ya fue aceptado y firmado.' : `Este ${doc.doc_type} ya fue ${isFactura ? 'recibido' : 'firmado'}.`}
              </p>
              {doc.sign_datetime && <p className="text-xs text-gray-400 font-mono">🕐 {doc.sign_datetime}</p>}
              {doc.signature_method && (
                <p className="text-xs bg-green-100 text-green-700 inline-block px-2 py-1 rounded">
                  {doc.signature_method === 'email' ? '📧 Firma cliente por email' : doc.signature_method === 'whatsapp' ? '📱 Firma cliente por WhatsApp' : '🌐 Firma cliente por web'}
                </p>
              )}
              {isPresupuesto && !isChangeOpinion && (
                <Button
                  onClick={handleRequestChangeOpinion}
                  disabled={saving}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-10 text-sm"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Solicitar cambio de opinión
                </Button>
              )}
            </div>
          )}

          {/* Rechazado — opción de cambiar de opinión (solo presupuestos) - pero NO si ya hay token */}
          {rechazadoYFirmado && step === 'decision' && isPresupuesto && !isChangeOpinion && (
            <div className="border-t pt-4 text-center space-y-3">
              <XCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="font-semibold text-gray-700">Este presupuesto fue rechazado y firmado.</p>
              {doc.sign_datetime && <p className="text-xs text-gray-400 font-mono">🕐 {doc.sign_datetime}</p>}
              {doc.signature_method && (
                <p className="text-xs bg-red-100 text-red-700 inline-block px-2 py-1 rounded">
                  {doc.signature_method === 'email' ? '📧 Firma cliente por email' : doc.signature_method === 'whatsapp' ? '📱 Firma cliente por WhatsApp' : '🌐 Firma cliente por web'}
                </p>
              )}
              <p className="text-sm text-gray-500">¿Ha cambiado de opinión?</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => { setStep('sign'); scrollToSign(); }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" /> Sí, aceptar
                </Button>
                {!isChangeOpinion && (
                  <Button
                    onClick={handleRequestChangeOpinion}
                    disabled={saving}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white h-12 text-base font-semibold"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" /> Solicitar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Zona de firma — aparece debajo del documento */}
        {doc && (
        <div ref={signRef}>
          {step === 'sign' && (
            <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-5 space-y-4">
              <h3 className="text-base font-bold text-green-700 text-center flex items-center justify-center gap-2">
                <PenLine className="w-5 h-5" /> 
                {isPresupuesto ? 'Firma de aceptación' : isFactura ? 'Firma de recepción' : 'Firma de conformidad'}
              </h3>
              <p className="text-sm text-gray-500 text-center">
                {isPresupuesto ? (
                  <>Al firmar confirma la aceptación del presupuesto <strong>Nº {doc.doc_number}</strong> por importe de <strong>{(doc.total || 0).toFixed(2)} €</strong></>
                ) : isFactura ? (
                  <>Al firmar confirma la recepción de la factura <strong>Nº {doc.doc_number}</strong> por importe de <strong>{(doc.total || 0).toFixed(2)} €</strong></>
                ) : (
                  <>Al firmar confirma la recepción del recibo <strong>Nº {doc.doc_number}</strong> por importe de <strong>{(doc.total || 0).toFixed(2)} €</strong></>
                )}
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

          {step === 'sign-reject' && isPresupuesto && (
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

          {/* Confirmación de cambio de opinión */}
          {(step === 'done' || step === 'rejected') && isChangeOpinion && (
            <div className={`rounded-2xl shadow-sm border p-6 space-y-4 ${
              step === 'done' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  {step === 'done' ? (
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  ) : (
                    <XCircle className="w-12 h-12 text-red-600" />
                  )}
                </div>
                <h3 className={`text-lg font-bold ${step === 'done' ? 'text-green-700' : 'text-red-700'}`}>
                  {step === 'done' ? '✅ ACEPTADO' : '❌ RECHAZADO'}
                </h3>
                {doc.sign_datetime && (
                  <p className={`text-sm font-mono ${step === 'done' ? 'text-green-600' : 'text-red-600'}`}>
                    🕐 {doc.sign_datetime}
                  </p>
                )}
                {doc.signature_client && (
                  <div className="mt-4">
                    <img src={doc.signature_client} alt="Firma" className={`max-w-[200px] mx-auto border rounded bg-white p-2 ${
                      step === 'done' ? 'border-green-300' : 'border-red-300'
                    }`} />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">Se ha enviado una copia firmada a su correo electrónico</p>
            </div>
          )}
          </div>
          )}

        {doc && (
          <p className="text-center text-xs text-gray-400 pb-6">
            Documento seguro · No requiere instalación · {cs.company_name} {cs.nif ? `· NIF ${cs.nif}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(PresupuestoPublico);