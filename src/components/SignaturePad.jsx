import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, PenLine } from 'lucide-react';

/**
 * SignatureCanvas — Componente de firma digital táctil/ratón
 * Funciona correctamente en móvil, tablet y ordenador.
 * El trazo sigue exactamente donde se toca/hace clic.
 */
export default function SignatureCanvas({ label, value, onSave, onCancel, showCancelIfSigned = true, existingDatetime = null }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showCanvas, setShowCanvas] = useState(!value);
  const [signDatetime, setSignDatetime] = useState(existingDatetime);
  const lastPos = useRef(null);

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

  // Calcula la posición correcta relativa al canvas, sin importar scroll ni zoom
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
    lastPos.current = pos;
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
    lastPos.current = pos;
  }, [isDrawing, getPos]);

  const stopDraw = useCallback((e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setIsDrawing(false);
    lastPos.current = null;
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
    // Guardar en resolución razonable
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 600;
    tempCanvas.height = 200;
    const ctx = tempCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 200);
    ctx.drawImage(canvas, 0, 0, 600, 200);
    const dataUrl = tempCanvas.toDataURL('image/png');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const dt = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    setSignDatetime(dt);
    onSave(dataUrl, dt);
    setShowCanvas(false);
  };

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

  return (
    <div ref={containerRef} className="border rounded-xl p-3 bg-gray-50 space-y-2">
      {label && <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>}
      <p className="text-[11px] text-gray-400 text-center">Firme directamente con el dedo o ratón en el recuadro de abajo</p>
      <div className="border-2 border-dashed border-blue-300 rounded-lg overflow-hidden bg-white shadow-inner relative">
        <canvas
          ref={canvasRef}
          width={900}
          height={280}
          className="w-full cursor-crosshair block"
          style={{ touchAction: 'none', minHeight: '160px', display: 'block' }}
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
        <Button size="sm" variant="outline" onClick={clear} className="flex-1 text-xs">
          <RotateCcw className="w-3 h-3 mr-1" />Borrar
        </Button>
        <Button size="sm" onClick={save} disabled={!hasDrawn} className="flex-1 text-xs bg-blue-700 hover:bg-blue-800 text-white">
          <Check className="w-3 h-3 mr-1" />Confirmar firma
        </Button>
      </div>
      {showCancelIfSigned && value && (
        <Button size="sm" variant="ghost" className="w-full text-xs text-gray-400" onClick={() => setShowCanvas(false)}>
          Cancelar
        </Button>
      )}
    </div>
  );
}