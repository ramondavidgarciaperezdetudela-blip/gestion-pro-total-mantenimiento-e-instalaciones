import BotonImprimirCliente from '@/components/BotonImprimirCliente';
import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, X, PenLine, RotateCcw, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

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

function SATPublico() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('id');
  const method = params.get('method') || 'web';
  const changeOpinionToken = params.get('token');
  const isChangeOpinion = !!changeOpinionToken;

  const [order, setOrder] = useState(null);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('decision');
  const [saving, setSaving] = useState(false);
  const [isChangingOpinion, setIsChangingOpinion] = useState(false);
  const [tempSignature, setTempSignature] = useState(null);
  const [signAction, setSignAction] = useState(null);
  const signRef = useRef(null);

  useEffect(() => {
    if (!orderId) { setError('Enlace inválido'); setLoading(false); return; }
    base44.functions.invoke('getSATPublico', { order_id: orderId })
      .then((res) => {
        if (res?.data?.order) setOrder(res.data.order);
        if (res?.data?.company) setCompany(res.data.company);
        if (!res?.data?.order) setError('Orden SAT no encontrada');
      })
      .catch(() => setError('No se pudo cargar la orden'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleSign = (signatureDataUrl) => {
    setTempSignature(signatureDataUrl);
    setSignAction('aceptar');
    setStep('save');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRejectWithSign = (signatureDataUrl) => {
    setTempSignature(signatureDataUrl);
    setSignAction('rechazar');
    setStep('save');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDocument = async () => {
    setSaving(true);
    try {
      const res = await base44.functions.invoke('aceptarSAT', {
        order_id: orderId,
        signature: tempSignature,
        action: signAction,
        method: method,
        change_opinion_token: changeOpinionToken
      });
      const dt = res?.data?.sign_datetime || null;
      const newStatus = signAction === 'aceptar' ? 'en_curso' : 'cancelada';
      const updatedOrder = { ...order, status: newStatus, signature_client: tempSignature, sign_datetime_client: dt };
      setOrder(updatedOrder);
      
      if (isChangeOpinion || isChangingOpinion) {
        try {
          const reloadRes = await base44.functions.invoke('getSATPublico', { order_id: orderId });
          if (reloadRes?.data?.order) setOrder(reloadRes.data.order);
        } catch (e) {
          console.error('Error recargando orden:', e);
        }
      }
      
      setTempSignature(null);
      setSignAction(null);
      if (method === 'email' || method === 'whatsapp' || isChangingOpinion || isChangeOpinion) {
        setStep(signAction === 'aceptar' ? 'done' : 'rejected');
      } else {
        setStep('decision');
      }
      setIsChangingOpinion(false);
    } finally {
      setSaving(false);
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
  const esChangioDeOpinion = isChangeOpinion || (order && order.signature_history && order.signature_history.length > 0);
  const ultimaFirma = order?.signature_history?.[order.signature_history.length - 1];
  const tieneUltimaFirma = !!ultimaFirma;
  const yaFirmado = order && order.signature_client && ['en_curso', 'completada'].includes(order.status) && !esChangioDeOpinion;
  const rechazadoYFirmado = order && order.status === 'cancelada' && order.signature_client && !esChangioDeOpinion;

  const scrollToSign = () => {
    setTimeout(() => signRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleRequestChangeOpinion = async () => {
    setIsChangingOpinion(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">

        <BotonImprimirCliente etiqueta="Imprimir o guardar el parte en PDF" />

        <div className="bg-white rounded-2xl shadow-sm border p-4 flex items-center gap-4">
          {cs.logo_url && <img src={cs.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-contain border" loading="eager" />}
          <div>
            <h1 className="font-bold text-lg text-slate-800">{cs.company_name || 'Orden SAT'}</h1>
            <p className="text-sm text-gray-400">{cs.phone} {cs.email ? `· ${cs.email}` : ''}</p>
          </div>
        </div>

        {!order ? (
          <DocumentSkeleton />
        ) : (
        <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-4">
          <div className="flex justify-between items-start border-b pb-3">
            <div>
              <span className="text-xs uppercase font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Orden SAT</span>
              <h2 className="text-xl font-bold mt-1">Nº {order.order_number || '-'}</h2>
              <p className="text-sm text-gray-500">Fecha: {order.date}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-slate-800">{(order.total || 0).toFixed(2)} €</p>
              <p className="text-xs text-gray-400">Total a firmar</p>
            </div>
          </div>

          <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
            <p className="font-bold text-sm">{order.contact_name}</p>
            <p className="text-xs text-gray-500 mt-1">
              <strong>Tipo:</strong> {order.type?.replace(/_/g, ' ')} | <strong>Equipo:</strong> {order.equipment_type?.replace(/_/g, ' ')}
            </p>
          </div>

          {order.description && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-600 mb-1">DESCRIPCIÓN</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.description}</p>
            </div>
          )}

          {order.diagnosis && (
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs font-bold text-blue-600 mb-1">DIAGNÓSTICO</p>
              <p className="text-sm text-blue-800 whitespace-pre-wrap">{order.diagnosis}</p>
            </div>
          )}

          {order.solution && (
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-bold text-green-600 mb-1">SOLUCIÓN</p>
              <p className="text-sm text-green-800 whitespace-pre-wrap">{order.solution}</p>
            </div>
          )}

          {order.materials_used?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Materiales utilizados</p>
              <table className="w-full text-sm border-collapse">
                <thead><tr className="bg-gray-100"><th className="border p-2 text-left">Material</th><th className="border p-2 text-center">Cant.</th><th className="border p-2 text-right">€/ud</th><th className="border p-2 text-right">Total</th></tr></thead>
                <tbody>{order.materials_used.map((m, i) => (
                  <tr key={i}><td className="border p-2">{m.material}</td><td className="border p-2 text-center">{m.quantity}</td><td className="border p-2 text-right">{m.unit_price}</td><td className="border p-2 text-right">{((m.quantity || 0) * (m.unit_price || 0)).toFixed(2)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}

          <div className="border-t pt-3 text-right space-y-1">
            <p className="text-sm text-gray-500">Mano de obra: {order.labor_hours}h × {order.labor_rate} €/h = <strong>{((order.labor_hours || 0) * (order.labor_rate || 0)).toFixed(2)} €</strong></p>
            <p className="text-xl font-black text-slate-800">TOTAL: {(order.total || 0).toFixed(2)} €</p>
          </div>

          {order.signature_history && order.signature_history.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-bold text-sm text-blue-800 mb-3">📋 Historial de decisiones</h4>
              <div className="space-y-3">
                {order.signature_history.map((item, idx) => {
                  const isAccepted = item.action === 'aceptar';
                  const icon = isAccepted ? '✅' : '❌';
                  const actionText = isAccepted ? 'ACEPTADA' : 'RECHAZADA';
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

          {(isChangeOpinion || isChangingOpinion || (!yaFirmado && !rechazadoYFirmado && !tieneUltimaFirma)) && step === 'decision' && (
            <div className="border-t pt-4 space-y-3">
              {(isChangeOpinion || isChangingOpinion) && tieneUltimaFirma && (
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
                        {ultimaFirma.action === 'aceptar' ? '✅ Fue ACEPTADA' : '❌ Fue RECHAZADA'}
                      </p>
                      {ultimaFirma.datetime && <p className="text-xs text-gray-600">🕐 {ultimaFirma.datetime}</p>}
                    </div>
                  </div>
                </div>
              )}

              <p className="text-center text-sm font-semibold text-slate-700">{isChangeOpinion || isChangingOpinion ? '¿Desea cambiar su decisión?' : '¿Acepta esta orden SAT?'}</p>
              <div className="flex gap-3">
                <Button
                  onClick={() => { setStep('sign-reject'); scrollToSign(); }}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 h-12 text-base"
                >
                  <X className="w-4 h-4 mr-2" /> {isChangeOpinion || isChangingOpinion ? 'Rechazar' : 'No acepto'}
                </Button>
                <Button
                  onClick={() => { setStep('sign'); scrollToSign(); }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" /> {isChangeOpinion || isChangingOpinion ? 'Aceptar' : 'Acepto y firmo'}
                </Button>
              </div>
            </div>
          )}

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
                        <span className="font-bold text-green-700">✅ ACEPTADA</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2">
                        <XCircle className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-red-700">❌ RECHAZADA</span>
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
                </div>
              </div>
              
              <Button
                onClick={handleRequestChangeOpinion}
                disabled={saving}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-10"
              >
                Cambiar de opinión
              </Button>
            </div>
          )}

          {yaFirmado && !isChangeOpinion && (
            <div className="border-t pt-4 text-center space-y-3">
              <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
              <p className="font-semibold text-green-700">Esta orden SAT ya fue aceptada y firmada.</p>
              {order.sign_datetime_client && <p className="text-xs text-gray-400 font-mono">🕐 {order.sign_datetime_client}</p>}
              <Button
                onClick={handleRequestChangeOpinion}
                disabled={saving}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white h-10 text-sm"
              >
                Cambiar de opinión
              </Button>
            </div>
          )}

          {rechazadoYFirmado && step === 'decision' && !isChangeOpinion && (
            <div className="border-t pt-4 text-center space-y-3">
              <XCircle className="w-10 h-10 text-red-400 mx-auto" />
              <p className="font-semibold text-gray-700">Esta orden SAT fue rechazada y firmada.</p>
              {order.sign_datetime_client && <p className="text-xs text-gray-400 font-mono">🕐 {order.sign_datetime_client}</p>}
              <p className="text-sm text-gray-500">¿Ha cambiado de opinión?</p>
              <div className="flex gap-2">
                <Button
                  onClick={() => { setStep('sign'); scrollToSign(); }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" /> Sí, aceptar
                </Button>
              </div>
            </div>
          )}
        </div>
        )}

        {order && (
        <div ref={signRef}>
          {step === 'sign' && (
            <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-5 space-y-4">
              <h3 className="text-base font-bold text-green-700 text-center flex items-center justify-center gap-2">
                <PenLine className="w-5 h-5" /> Firma de aceptación
              </h3>
              <p className="text-sm text-gray-500 text-center">
                Al firmar confirma la aceptación de la orden SAT <strong>Nº {order.order_number}</strong> por importe de <strong>{(order.total || 0).toFixed(2)} €</strong>
              </p>
              {saving ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  <span className="text-gray-500 font-medium">Guardando su firma...</span>
                </div>
              ) : (
                <SignaturePad onSave={handleSign} abrirAlEntrar />
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
                Firme para dejar constancia de que rechaza la orden SAT <strong>Nº {order.order_number}</strong>
              </p>
              {saving ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <span className="text-gray-500 font-medium">Registrando su respuesta...</span>
                </div>
              ) : (
                <SignaturePad onSave={handleRejectWithSign} abrirAlEntrar />
              )}
              <Button variant="ghost" size="sm" className="w-full text-gray-400" onClick={() => setStep('decision')}>
                Cancelar
              </Button>
            </div>
          )}

          {step === 'save' && (
            <div className="bg-white rounded-2xl shadow-sm border border-blue-200 p-5 space-y-4">
              <h3 className="text-base font-bold text-blue-700 text-center">📋 Revisar y guardar documento</h3>
              <div className="bg-blue-50 rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-700">
                  <strong>Resumen de firmas:</strong>
                </p>
                <div className="space-y-2 text-sm">
                  {tempSignature && (
                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-200">
                      <span className="text-gray-700">Firma capturada</span>
                      <span className="text-green-600 font-bold">✓</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">Al guardar, la firma se almacenará permanentemente en el documento.</p>
              </div>
              {saving ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="text-gray-500 font-medium">Guardando documento...</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep(signAction === 'aceptar' ? 'sign' : 'sign-reject')}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveDocument} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                    <Check className="w-4 h-4 mr-2" /> Guardar documento
                  </Button>
                </div>
              )}
            </div>
          )}

          {(step === 'done' || step === 'rejected') && (isChangeOpinion || isChangingOpinion) && (
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
                  {step === 'done' ? '✅ ACEPTADA' : '❌ RECHAZADA'}
                </h3>
                {order.sign_datetime_client && (
                  <p className={`text-sm font-mono ${step === 'done' ? 'text-green-600' : 'text-red-600'}`}>
                    🕐 {order.sign_datetime_client}
                  </p>
                )}
                {order.signature_client && (
                  <div className="mt-4">
                    <img src={order.signature_client} alt="Firma" className={`max-w-[200px] mx-auto border rounded bg-white p-2 ${
                      step === 'done' ? 'border-green-300' : 'border-red-300'
                    }`} />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">Puede imprimir o guardar su copia con el botón de arriba</p>
            </div>
          )}
        </div>
        )}

        {order && (
          <p className="text-center text-xs text-gray-400 pb-6">
            Documento seguro · No requiere instalación · {cs.company_name} {cs.nif ? `· NIF ${cs.nif}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(SATPublico);