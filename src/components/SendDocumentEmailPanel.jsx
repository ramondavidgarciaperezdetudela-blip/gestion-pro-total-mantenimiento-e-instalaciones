import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Send, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SendDocumentEmailPanel({ 
  docContent, 
  selectedDoc, 
  contact, 
  companyData,
  onEmailSent 
}) {
  const [showPanel, setShowPanel] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailTo, setEmailTo] = useState(contact?.email || '');
  const [subject, setSubject] = useState(`Documentación finalizada - ${selectedDoc?.label || 'Documento'}`);
  const [body, setBody] = useState(`Estimado/a ${contact?.name || 'cliente'},\n\nLe adjuntamos la documentación técnica finalizada de su instalación.\n\nLa instalación ha sido completada según las normativas vigentes.\n\nNo dude en contactarnos si tiene alguna duda.\n\nSaludos,\n${companyData?.company_name || 'Equipo técnico'}`);

  const handleSend = async () => {
    if (!emailTo) {
      toast.error('Ingresa un email válido');
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke('sendLegalDocEmail', {
        to: emailTo,
        subject,
        body,
        htmlContent: docContent,
        documentTitle: selectedDoc?.label || 'documento',
        contactName: contact?.name || 'Cliente'
      });
      
      toast.success(`📧 Email enviado a ${emailTo}`);
      setShowPanel(false);
      if (onEmailSent) onEmailSent();
    } catch (error) {
      toast.error('Error al enviar: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  if (!showPanel) {
    return (
      <Button 
        onClick={() => setShowPanel(true)}
        className="gap-2 bg-purple-600 hover:bg-purple-700"
      >
        <Mail className="w-4 h-4" />
        Enviar por email
      </Button>
    );
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="w-4 h-4 text-purple-600" />
            Enviar documento por email
          </CardTitle>
          <button 
            onClick={() => setShowPanel(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-xs text-gray-600 mb-1 block">Email del cliente</label>
          <Input 
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="cliente@example.com"
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Asunto del email</label>
          <Input 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Asunto..."
            className="text-sm"
          />
        </div>

        <div>
          <label className="text-xs text-gray-600 mb-1 block">Mensaje personalizado</label>
          <Textarea 
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe el mensaje..."
            className="text-sm min-h-32"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPanel(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending}
            className="flex-1 gap-1 bg-purple-600 hover:bg-purple-700"
          >
            {sending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-3 h-3" />
                Enviar email
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}