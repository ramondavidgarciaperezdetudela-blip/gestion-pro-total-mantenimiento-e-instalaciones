import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Mail, Link as LinkIcon, Check, AlertTriangle } from 'lucide-react';
import { prepararCopiaFirmada, abrirCorreo, abrirWhatsApp } from '@/lib/copiaFirmada';

/**
 * Mandarle al cliente su copia firmada, sin gastar créditos.
 *
 * Antes esto lo hacía una función del servidor de Base44 nada más firmar, y
 * cuando se acababan los créditos saltaba el cartel rojo de "no se ha podido
 * enviar la copia firmada" con el cliente delante — y el cliente se quedaba
 * sin copia, porque no había otra manera.
 *
 * Ahora se manda desde el propio aparato: el documento ya tiene su página
 * pública, donde se ve entero y hay botones de imprimir y guardar en PDF, así
 * que la copia es ese enlace y va por WhatsApp o por el correo del móvil. No
 * cuesta nada y funciona igual con la cuenta caducada.
 */
export default function EnviarCopiaFirmada({ doc, empresa, tipo = 'documento', email, telefono }) {
  const [copiado, setCopiado] = useState(false);
  const { listo, motivo, enlace, asunto, cuerpo } = prepararCopiaFirmada({ doc, empresa, tipo });

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch { /* algunos navegadores no dejan; quedan los otros botones */ }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2" data-prueba="enviar-copia-firmada">
      <p className="text-xs font-semibold text-slate-700">📄 Mandarle su copia al cliente</p>
      <p className="text-[11px] text-slate-500">
        Se manda desde este aparato, sin gastar créditos de Base44. El cliente abre el enlace y ahí
        mismo puede imprimirlo o guardarlo en PDF.
      </p>

      {!listo && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{motivo}</span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="gap-1.5 bg-green-600 text-white hover:bg-green-700"
          data-prueba="copia-whatsapp"
          onClick={() => abrirWhatsApp({ telefono, texto: cuerpo })}
        >
          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          data-prueba="copia-correo"
          onClick={() => abrirCorreo({ email, asunto, cuerpo })}
        >
          <Mail className="h-3.5 w-3.5" /> Correo
        </Button>
        {listo && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            data-prueba="copia-enlace"
            onClick={copiarEnlace}
          >
            {copiado ? <Check className="h-3.5 w-3.5 text-green-600" /> : <LinkIcon className="h-3.5 w-3.5" />}
            {copiado ? 'Copiado' : 'Copiar enlace'}
          </Button>
        )}
      </div>
    </div>
  );
}
