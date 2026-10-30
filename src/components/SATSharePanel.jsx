import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, Copy, Loader2 } from 'lucide-react';
import { direccionPublica, AVISO_SIN_DIRECCION } from '@/lib/copiaFirmada';
import { toast } from 'sonner';
import { abrirEnlaceAvisando } from '@/lib/abrirEnlace';

export default function SATSharePanel({ sat, company }) {
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!sat) return null;

  // La dirección pública configurada. Con la del aparato el cliente recibiría
  // un enlace a «localhost» que no abre en ningún sitio.
  const baseUrl = direccionPublica(company);
  const satPublicoUrl = baseUrl ? `${baseUrl}/sat-publico?id=${sat.id}&method=web` : '';

  const handleSendWhatsApp = () => {
    if (!sat.contact_name || !sat.contact_id) return;
    if (!satPublicoUrl) { toast.error(AVISO_SIN_DIRECCION); return; }
    const contact = sat.contact_name.split(' ')[0];
    const msg = encodeURIComponent(
      `Hola ${contact},\n\n📋 Le enviamos la Orden SAT Nº ${sat.order_number} para su revisión y firma digital.\n\nImporte: ${(sat.total || 0).toFixed(2)} €\n\n🔗 Firme aquí: ${satPublicoUrl}\n\nEste enlace es seguro y no requiere instalación.\n\n${company?.company_name || 'Su empresa'}`
    );
    abrirEnlaceAvisando(`https://wa.me/?text=${msg}`, (m) => toast.error(m, { duration: 12000 }));
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
      await base44.functions.invoke('enviarCopiaFirmadaSAT', {
        order_id: sat.id
      });
      alert('Email enviado al cliente');
    } catch (error) {
      alert('Error al enviar el email. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const handleCopyLink = () => {
    if (!satPublicoUrl) { toast.error(AVISO_SIN_DIRECCION); return; }
    navigator.clipboard.writeText(satPublicoUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        onClick={handleSendWhatsApp}
        className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
      >
        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleSendEmail}
        disabled={sending}
        className="gap-1 text-blue-600 border-blue-300 hover:bg-blue-50"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
        Email
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopyLink}
        className="gap-1 text-gray-600"
      >
        <Copy className="w-3.5 h-3.5" /> {copied ? 'Copiado' : 'Copiar enlace'}
      </Button>
    </div>
  );
}