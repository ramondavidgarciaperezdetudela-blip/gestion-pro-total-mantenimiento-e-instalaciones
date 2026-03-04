import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Save, Check } from 'lucide-react';

export default function LegalDocSignaturePanel({ onTechnicianSign, onClientSign, docContent, setDocContent }) {
  const technicianCanvasRef = useRef(null);
  const clientCanvasRef = useRef(null);
  const [isDrawingTechnician, setIsDrawingTechnician] = useState(false);
  const [isDrawingClient, setIsDrawingClient] = useState(false);
  const [technicianName, setTechnicianName] = useState('');
  const [clientName, setClientName] = useState('');
  const [technicianSigned, setTechnicianSigned] = useState(false);
  const [clientSigned, setClientSigned] = useState(false);

  const startDrawing = (e, isClient) => {
    const canvas = isClient ? clientCanvasRef.current : technicianCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isClient) {
      setIsDrawingClient(true);
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      setIsDrawingTechnician(true);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  };

  const draw = (e, isClient) => {
    if ((isClient && !isDrawingClient) || (!isClient && !isDrawingTechnician)) return;
    const canvas = isClient ? clientCanvasRef.current : technicianCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (isClient) => {
    if (isClient) {
      setIsDrawingClient(false);
    } else {
      setIsDrawingTechnician(false);
    }
  };

  const clearSignature = (isClient) => {
    const canvas = isClient ? clientCanvasRef.current : technicianCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isClient) setClientSigned(false);
      else setTechnicianSigned(false);
    }
  };

  const saveSignature = (isClient) => {
    const canvas = isClient ? clientCanvasRef.current : technicianCanvasRef.current;
    const name = isClient ? clientName : technicianName;
    
    if (!canvas || !name) {
      alert(`Por favor ingresa el nombre ${isClient ? 'del cliente' : 'del técnico'}`);
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');
    
    if (isClient) {
      setClientSigned(true);
      onClientSign({ name, signature: signatureDataUrl });
    } else {
      setTechnicianSigned(true);
      onTechnicianSign({ name, signature: signatureDataUrl });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Firma Técnico */}
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📝 Firma Técnico
              {technicianSigned && <Check className="w-4 h-4 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Nombre técnico"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              className="text-sm"
            />
            <canvas
              ref={technicianCanvasRef}
              width={300}
              height={120}
              className="border border-gray-300 rounded bg-white cursor-crosshair"
              onMouseDown={(e) => startDrawing(e, false)}
              onMouseMove={(e) => draw(e, false)}
              onMouseUp={() => stopDrawing(false)}
              onMouseLeave={() => stopDrawing(false)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => clearSignature(false)}
                className="flex-1 gap-1"
              >
                <Trash2 className="w-3 h-3" /> Limpiar
              </Button>
              <Button
                size="sm"
                onClick={() => saveSignature(false)}
                className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-3 h-3" /> Guardar firma
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Firma Cliente */}
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              📝 Firma Cliente
              {clientSigned && <Check className="w-4 h-4 text-green-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Input
              placeholder="Nombre cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="text-sm"
            />
            <canvas
              ref={clientCanvasRef}
              width={300}
              height={120}
              className="border border-gray-300 rounded bg-white cursor-crosshair"
              onMouseDown={(e) => startDrawing(e, true)}
              onMouseMove={(e) => draw(e, true)}
              onMouseUp={() => stopDrawing(true)}
              onMouseLeave={() => stopDrawing(true)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => clearSignature(true)}
                className="flex-1 gap-1"
              >
                <Trash2 className="w-3 h-3" /> Limpiar
              </Button>
              <Button
                size="sm"
                onClick={() => saveSignature(true)}
                className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-3 h-3" /> Guardar firma
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}