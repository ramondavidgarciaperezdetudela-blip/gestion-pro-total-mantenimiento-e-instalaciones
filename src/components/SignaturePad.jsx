import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, PenLine, AlertCircle, Loader2 } from 'lucide-react';

/**
 * SignatureCanvas — Componente de firma digital táctil/ratón
 * El canvas de firma se muestra como overlay fijo para evitar que la pantalla se mueva al firmar.
 */
export default function SignatureCanvas({ label, value, onSave, onCancel, showCancelIfSigned = true, existingDatetime = null }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showCanvas, setShowCanvas] = useState(!value);
  const [signDatetime, setSignDatetime] = useState(existingDatetime);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const initCanvas = useCallback(() => {
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setHasDrawn(false);
    });
  }, []);

  useEffect(() => {
    if (showCanvas) initCanvas();
  }, [showCanvas, initCanvas]);

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
    e.stopPropagation();
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
    e.stopPropagation();
    if (!isDrawing) return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDraw = useCallback((e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setIsDrawing(false);
  }, []);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = async () => {
    const canvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 130;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 130);
    ctx.drawImage(canvas, 0, 0, 400, 130);
    const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.7);
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dt = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    setSaving(true);
    setSaveError('');
    try {
      // Esperamos a que la firma se suba/guarde de verdad antes de cerrar
      // el panel: si onSave falla o se cae la red, el canvas se queda
      // visible con un aviso en vez de desaparecer sin dejar rastro.
      await onSave(dataUrl, dt);
      setSignDatetime(dt);
      setShowCanvas(false);
    } catch (err) {
      setSaveError(err?.message || 'No se pudo guardar la firma. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Vista de firma ya guardada
  if (!showCanvas && value) {
    return (
      <div className="border rounded-xl p-3 bg-gray-50 space-y-2">
        {label && <p className="text-xs font-semibold text-gray-700">{label}</p>}
        <img src={value} alt="Firma" className="w-full max-h-24 object-contain border rounded bg-white" />
        <div className="text-center">
          <p className="text-[10px] text-green-600">✓ Firmado correctamente</p>
          {signDatetime && (
            <p className="text-[10px] text-gray-500 font-mono mt-0.5">🕐 {signDatetime}</p>
          )}
        </div>
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => { setShowCanvas(true); setSignDatetime(null); }}>
          <PenLine className="w-3 h-3 mr-1" />Volver a firmar
        </Button>
      </div>
    );
  }

  // Panel de firma inline (sin overlay, con touch-action none para bloquear scroll sólo en el canvas)
  if (!showCanvas) return null;

  return (
    <>
      {/* Overlay fijo que cubre toda la pantalla para evitar scroll */}
      <div
        className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
        style={{ touchAction: 'none' }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-4 space-y-3" style={{ touchAction: 'auto' }}>
          {label && <p className="text-sm font-semibold text-gray-800 text-center">{label}</p>}
          <p className="text-xs text-gray-400 text-center">Firme con el dedo o ratón en el recuadro de abajo</p>

          <div className="border-2 border-dashed border-blue-300 rounded-xl overflow-hidden bg-white relative">
            <canvas
              ref={canvasRef}
              width={900}
              height={280}
              className="w-full cursor-crosshair block"
              style={{ touchAction: 'none', display: 'block', minHeight: 140 }}
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

          {saveError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{saveError}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clear} disabled={saving} className="flex-1 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />Borrar
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={!hasDrawn || saving}
              className="flex-1 text-xs bg-blue-700 hover:bg-blue-800 text-white"
            >
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
              {saving ? 'Guardando...' : 'Confirmar firma'}
            </Button>
          </div>

          {showCancelIfSigned && value && (
            <Button size="sm" variant="ghost" className="w-full text-xs text-gray-400" onClick={() => setShowCanvas(false)}>
              Cancelar
            </Button>
          )}
          {!value && onCancel && (
            <Button size="sm" variant="ghost" className="w-full text-xs text-gray-400" onClick={() => { setShowCanvas(false); onCancel?.(); }}>
              Cancelar
            </Button>
          )}
        </div>
      </div>
    </>
  );
}