import React, { useRef, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { RotateCcw, Check, PenLine } from 'lucide-react';

function SignatureCanvas({ label, name, value, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [showCanvas, setShowCanvas] = useState(!value);

  useEffect(() => {
    if (showCanvas) initCanvas();
  }, [showCanvas]);

  const initCanvas = () => {
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1e3a5f';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setHasDrawn(false);
    }, 50);
  };

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDraw = (e) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    setShowCanvas(false);
  };

  return (
    <div className="border rounded-xl p-3 bg-gray-50">
      <p className="text-xs font-semibold text-gray-700 mb-2">{label}</p>
      {!showCanvas && value ? (
        <div className="space-y-2">
          <img src={value} alt="Firma" className="w-full h-20 object-contain border rounded bg-white" />
          <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setShowCanvas(true)}>
            <PenLine className="w-3 h-3 mr-1" />Volver a firmar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] text-gray-400 text-center">Firme directamente con el dedo o ratón</p>
          <div className="border-2 border-dashed border-blue-300 rounded-lg overflow-hidden bg-white touch-none">
            <canvas
              ref={canvasRef}
              width={600}
              height={180}
              className="w-full cursor-crosshair touch-none block"
              style={{ touchAction: 'none' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clear} className="flex-1 text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />Borrar
            </Button>
            <Button size="sm" onClick={save} disabled={!hasDrawn} className="flex-1 text-xs bg-blue-700">
              <Check className="w-3 h-3 mr-1" />Confirmar firma
            </Button>
          </div>
          {value && (
            <Button size="sm" variant="ghost" className="w-full text-xs text-gray-400" onClick={() => setShowCanvas(false)}>
              Cancelar
            </Button>
          )}
        </div>
      )}
      {value && !showCanvas && <p className="text-[10px] text-green-600 text-center mt-1">✓ Firmado — {name}</p>}
      {!value && !hasDrawn && <p className="text-[10px] text-gray-400 text-center mt-1">Pendiente de firma — {name}</p>}
    </div>
  );
}

export default function SATSignaturePanel({ order, onUpdate }) {
  const handleSaveTechSignature = async (dataUrl) => {
    const updated = { ...order, signature_technician: dataUrl };
    await base44.entities.SATOrder.update(order.id, { signature_technician: dataUrl });
    onUpdate(updated);
  };

  const handleSaveClientSignature = async (dataUrl) => {
    const updated = { ...order, signature_client: dataUrl };
    await base44.entities.SATOrder.update(order.id, { signature_client: dataUrl });
    onUpdate(updated);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Firmas de conformidad</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SignatureCanvas
          label="✍️ Firma del Técnico"
          name={order.technician || 'Técnico'}
          value={order.signature_technician}
          onSave={handleSaveTechSignature}
        />
        <SignatureCanvas
          label="✍️ Conformidad del Cliente"
          name={order.contact_name || 'Cliente'}
          value={order.signature_client}
          onSave={handleSaveClientSignature}
        />
      </div>
    </div>
  );
}