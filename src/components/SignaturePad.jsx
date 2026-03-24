import React, { useRef, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PenLine, RotateCcw, Check } from 'lucide-react';

export default function SignaturePad({ open, onClose, onSave, title = "Firma" }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        setHasSignature(false);
      }, 100);
    }
  }, [open]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
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
    setHasSignature(true);
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const save = () => {
    const canvas = canvasRef.current;
    // Redimensionar a tamaño pequeño para guardar
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 160;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    const dataUrl = tempCanvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl w-full" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="w-5 h-5 text-blue-600" />
              {title}
            </DialogTitle>
            <Button size="sm" variant="ghost" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</Button>
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Firme en el recuadro de abajo con el dedo o ratón. La zona de firma es amplia para mayor comodidad.</p>
          <div className="border-2 border-dashed border-blue-300 rounded-lg overflow-hidden bg-white shadow-inner">
            <canvas
              ref={canvasRef}
              width={900}
              height={320}
              className="w-full cursor-crosshair touch-none"
              style={{ minHeight: '200px' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <p className="text-xs text-center text-gray-400">↑ Zona de firma ampliada — firme aquí directamente</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clear} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />Borrar
            </Button>
            <Button onClick={save} disabled={!hasSignature} className="flex-1 bg-blue-700">
              <Check className="w-4 h-4 mr-2" />Confirmar firma
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}