import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, Check, Calendar, Maximize2, Minimize2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function LegalDocSignaturePanel({ onTechnicianSign, onClientSign, docContent, setDocContent, technicians = [], contactName = '', contacts = [], technicianName: initialTechnicianName = '', docTitle = 'Documento Legal', contactEmail = null }) {
  const technicianCanvasRef = useRef(null);
  const clientCanvasRef = useRef(null);
  const [isDrawingTechnician, setIsDrawingTechnician] = useState(false);
  const [isDrawingClient, setIsDrawingClient] = useState(false);
  const [technicianName, setTechnicianName] = useState(initialTechnicianName || '');
  const [technicianDate, setTechnicianDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientNameInput, setClientNameInput] = useState(contactName || '');
  const [clientNameCustom, setClientNameCustom] = useState('');
  const [technicianSigned, setTechnicianSigned] = useState(false);
  const [clientSigned, setClientSigned] = useState(false);
  const [expandedCanvas, setExpandedCanvas] = useState(null);
  const [techSignDatetime, setTechSignDatetime] = useState(null);
  const [clientSignDatetime, setClientSignDatetime] = useState(null);

  const getNowDatetime = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  const getPointerPosition = (e) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e, isClient) => {
    e.preventDefault();
    const canvas = isClient ? clientCanvasRef.current : technicianCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPointerPosition(e);
    
    if (isClient) {
      setIsDrawingClient(true);
    } else {
      setIsDrawingTechnician(true);
    }
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e, isClient) => {
    e.preventDefault();
    if ((isClient && !isDrawingClient) || (!isClient && !isDrawingTechnician)) return;
    const canvas = isClient ? clientCanvasRef.current : technicianCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pos = getPointerPosition(e);

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingClient(false);
    setIsDrawingTechnician(false);
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
    let name = '';

    if (isClient) {
      if (selectedClientId) {
        const selectedContact = contacts.find(c => c.id === selectedClientId);
        name = selectedContact ? `${selectedContact.name} ${selectedContact.surname || ''}`.trim() : '';
      } else if (clientNameCustom) {
        name = clientNameCustom;
      } else {
        name = clientNameInput;
      }
    } else {
      name = technicianName;
    }

    if (!canvas || !name) {
      alert(`Por favor ingresa el nombre ${isClient ? 'del cliente' : 'del técnico'}`);
      return;
    }

    // Redimensionar la firma a tamaño más pequeño para el documento
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 300;
    tempCanvas.height = 120;
    const ctx = tempCanvas.getContext('2d');
    ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    const signatureDataUrl = tempCanvas.toDataURL('image/png');

    const dt = getNowDatetime();
    if (isClient) {
      setClientSigned(true);
      setClientSignDatetime(dt);
      onClientSign({ name, signature: signatureDataUrl, sign_datetime: dt });
      // Enviar copia firmada al cliente
      base44.functions.invoke('enviarCopiaFirmada', {
        contact_email: contactEmail || null,
        contact_name: name,
        doc_title: docTitle,
        doc_type: 'documento_legal',
        sign_datetime: dt,
        signature_url: signatureDataUrl,
        signer_role: 'cliente',
      }).catch(() => {});
    } else {
      setTechnicianSigned(true);
      setTechSignDatetime(dt);
      onTechnicianSign({ name, signature: signatureDataUrl, date: technicianDate, sign_datetime: dt });
      // Enviar copia firmada (técnico — solo al admin)
      base44.functions.invoke('enviarCopiaFirmada', {
        contact_email: null,
        contact_name: name,
        doc_title: docTitle,
        doc_type: 'documento_legal',
        sign_datetime: dt,
        signature_url: signatureDataUrl,
        signer_role: 'tecnico',
      }).catch(() => {});
    }
  };

  // Modal expandido para firma en grande
  if (expandedCanvas) {
    const isClient = expandedCanvas === 'client';
    const canvas = isClient ? clientCanvasRef.current : technicianCanvasRef.current;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex flex-col p-4">
        <div className="bg-white rounded-lg flex flex-col h-full max-w-4xl mx-auto w-full shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">{isClient ? 'Firma Cliente - Zona Ampliada' : 'Firma Técnico - Zona Ampliada'}</h2>
            <Button variant="outline" size="sm" onClick={() => setExpandedCanvas(null)}>
              <Minimize2 className="w-4 h-4 mr-2" /> Cerrar
            </Button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <canvas
              ref={isClient ? clientCanvasRef : technicianCanvasRef}
              width={1200}
              height={600}
              className="border-3 border-gray-400 rounded bg-white cursor-crosshair touch-none max-w-full max-h-full shadow-lg"
              onMouseDown={(e) => startDrawing(e, isClient)}
              onMouseMove={(e) => draw(e, isClient)}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => startDrawing(e, isClient)}
              onTouchMove={(e) => draw(e, isClient)}
              onTouchEnd={stopDrawing}
            />
          </div>
          <div className="flex gap-2 p-4 border-t">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => clearSignature(isClient)}>
              <Trash2 className="w-4 h-4 mr-2" /> Limpiar firma
            </Button>
            <Button size="sm" className={`flex-1 ${isClient ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={() => { saveSignature(isClient); setExpandedCanvas(null); }}>
              <Save className="w-4 h-4 mr-2" /> Guardar y cerrar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Firma Técnico */}
        <Card className="border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              📝 Firma Técnico Frigorista
              {technicianSigned && <Check className="w-4 h-4 text-green-600" />}
              {techSignDatetime && <span className="text-[10px] font-mono text-gray-400 font-normal">🕐 {techSignDatetime}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {technicians.length > 0 ? (
              <Select value={technicianName} onValueChange={setTechnicianName}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecciona técnico" /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t, i) => {
                    const name = typeof t === 'object' ? t.name : t;
                    return name ? <SelectItem key={i} value={name}>{name}</SelectItem> : null;
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Nombre técnico"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                className="text-sm"
              />
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nombre técnico responsable</label>
                <Input
                  placeholder="Nombre técnico"
                  value={technicianName}
                  onChange={(e) => setTechnicianName(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Fecha de la hoja</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={technicianDate}
                    onChange={(e) => setTechnicianDate(e.target.value)}
                    className="text-sm flex-1"
                  />
                  <Calendar className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
            <div className="relative">
              <canvas
                ref={technicianCanvasRef}
                width={800}
                height={300}
                className="border-2 border-blue-300 rounded bg-white cursor-crosshair touch-none w-full"
                onMouseDown={(e) => startDrawing(e, false)}
                onMouseMove={(e) => draw(e, false)}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => startDrawing(e, false)}
                onTouchMove={(e) => draw(e, false)}
                onTouchEnd={stopDrawing}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setExpandedCanvas('technician')}
                className="absolute top-2 right-2 bg-white/90"
                title="Expandir zona de firma para firmar en grande"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
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
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              📝 Firma Cliente
              {clientSigned && <Check className="w-4 h-4 text-green-600" />}
              {clientSignDatetime && <span className="text-[10px] font-mono text-gray-400 font-normal">🕐 {clientSignDatetime}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.length > 0 ? (
              <>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Selecciona cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>— O escribe el nombre manualmente —</SelectItem>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.surname || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedClientId && (
                  <Input
                    placeholder="Nombre cliente (manual)"
                    value={clientNameCustom}
                    onChange={(e) => setClientNameCustom(e.target.value)}
                    className="text-sm"
                  />
                )}
              </>
            ) : (
              <Input
                placeholder="Nombre cliente"
                value={clientNameInput}
                onChange={(e) => setClientNameInput(e.target.value)}
                className="text-sm"
              />
            )}
            <div className="relative">
              <canvas
                ref={clientCanvasRef}
                width={800}
                height={300}
                className="border-2 border-green-300 rounded bg-white cursor-crosshair touch-none w-full"
                onMouseDown={(e) => startDrawing(e, true)}
                onMouseMove={(e) => draw(e, true)}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => startDrawing(e, true)}
                onTouchMove={(e) => draw(e, true)}
                onTouchEnd={stopDrawing}
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setExpandedCanvas('client')}
                className="absolute top-2 right-2 bg-white/90"
                title="Expandir zona de firma para firmar en grande"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
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