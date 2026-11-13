import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, Copy, PenLine, Printer, CheckCircle2, Clock } from 'lucide-react';
import { ESTADOS, fechaLarga } from '@/lib/notasInformativas';

/** Una fila de envío: estado y las acciones que tocan según esté firmada o no. */
export default function FilaEnvio({ envio, onWhatsApp, onCorreo, onCopiar, onFirmar, onImprimir, mostrarNota = false }) {
  const firmada = envio.status === 'firmada';
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2 last:border-0" data-envio={envio.id}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{mostrarNota ? envio.nota_title : envio.contact_name}</p>
        <p className={`flex items-center gap-1 text-xs ${firmada ? 'text-green-700' : 'text-amber-700'}`}>
          {firmada ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {ESTADOS[envio.status] || envio.status}{firmada && envio.signed_at ? ` · ${fechaLarga(envio.signed_at)}` : ''}
        </p>
      </div>
      {!firmada && onWhatsApp && <Button size="sm" variant="outline" onClick={() => onWhatsApp(envio)} title="Enviar por WhatsApp"><MessageCircle className="h-4 w-4" /></Button>}
      {!firmada && onCorreo && <Button size="sm" variant="outline" onClick={() => onCorreo(envio)} title="Enviar por correo"><Mail className="h-4 w-4" /></Button>}
      {!firmada && onCopiar && <Button size="sm" variant="outline" onClick={() => onCopiar(envio)} title="Copiar enlace"><Copy className="h-4 w-4" /></Button>}
      {!firmada && onFirmar && <Button size="sm" variant="outline" className="gap-1" onClick={() => onFirmar(envio)}><PenLine className="h-4 w-4" />Firmar aquí</Button>}
      {onImprimir && <Button size="sm" variant={firmada ? 'default' : 'outline'} className="gap-1" onClick={() => onImprimir(envio)} data-testid="imprimir-nota"><Printer className="h-4 w-4" />Imprimir</Button>}
    </div>
  );
}
