import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Save, Check, Calendar, PenLine } from 'lucide-react';
import FirmaPantallaCompleta from '@/components/FirmaPantallaCompleta';
import { base44 } from '@/api/base44Client';

export default function LegalDocSignaturePanel({ onTechnicianSign, onClientSign, docContent, setDocContent, technicians = [], contactName = '', contacts = [], technicianName: initialTechnicianName = '', docTitle = 'Documento Legal', contactEmail = null }) {
  // Firma hecha en el panel de pantalla completa (imagen), pendiente de guardar.
  const [technicianSig, setTechnicianSig] = useState(null);
  const [clientSig, setClientSig] = useState(null);
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

  const clearSignature = (isClient) => {
    if (isClient) { setClientSig(null); setClientSigned(false); }
    else { setTechnicianSig(null); setTechnicianSigned(false); }
  };

  const saveSignature = (isClient) => {
    const signatureDataUrl = isClient ? clientSig : technicianSig;
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

    if (!name) {
      alert(`Por favor ingresa el nombre ${isClient ? 'del cliente' : 'del técnico'}`);
      return;
    }
    if (!signatureDataUrl) {
      alert('Primero firma en el recuadro (se abre a pantalla completa).');
      return;
    }

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

  return (
    <div className="space-y-4">
      <FirmaPantallaCompleta
        abierto={expandedCanvas === 'technician'}
        titulo="Firma del técnico"
        color="#1d4ed8"
        formato="png"
        onCancelar={() => setExpandedCanvas(null)}
        onConfirmar={(img) => { setTechnicianSig(img); setTechnicianSigned(false); setExpandedCanvas(null); }}
      />
      <FirmaPantallaCompleta
        abierto={expandedCanvas === 'client'}
        titulo="Firma del cliente"
        color="#15803d"
        formato="png"
        onCancelar={() => setExpandedCanvas(null)}
        onConfirmar={(img) => { setClientSig(img); setClientSigned(false); setExpandedCanvas(null); }}
      />
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
              <button
                type="button"
                onClick={() => setExpandedCanvas('technician')}
                data-testid="abrir-firma-technician"
                className="flex w-full flex-col items-center justify-center rounded border-2 border-dashed border-blue-300 bg-white py-6 text-blue-700 active:bg-blue-50"
              >
                {technicianSig ? (
                  <img src={technicianSig} alt="Firma" className="max-h-24 object-contain" />
                ) : (
                  <><PenLine className="h-7 w-7" /><span className="text-sm font-semibold">Toca aquí para firmar</span><span className="text-xs text-gray-500">Se abre a pantalla completa</span></>
                )}
              </button>
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
              <button
                type="button"
                onClick={() => setExpandedCanvas('client')}
                data-testid="abrir-firma-client"
                className="flex w-full flex-col items-center justify-center rounded border-2 border-dashed border-green-300 bg-white py-6 text-green-700 active:bg-green-50"
              >
                {clientSig ? (
                  <img src={clientSig} alt="Firma" className="max-h-24 object-contain" />
                ) : (
                  <><PenLine className="h-7 w-7" /><span className="text-sm font-semibold">Toca aquí para firmar</span><span className="text-xs text-gray-500">Se abre a pantalla completa</span></>
                )}
              </button>
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