import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { LinkIcon, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { direccionPublica } from '@/lib/copiaFirmada';

/**
 * AvisoDireccionPublica — el aviso que evita tres fallos silenciosos.
 *
 * Sin la dirección pública configurada pasan tres cosas, y ninguna avisaba:
 *
 *   · El enlace para ACEPTAR o RECHAZAR que se le manda al cliente se armaba
 *     con la dirección del propio aparato. En el móvil eso es «localhost», así
 *     que al cliente le llegaba un enlace que no abre en ninguna parte.
 *   · El QR de verificación de los documentos se generaba sin dominio, de modo
 *     que al escanearlo no llevaba a ningún sitio.
 *   · El aviso de vuelta —si ha aceptado o rechazado, con la fecha y la hora de
 *     la firma— no llegaba, porque el servidor no sabía a dónde apuntar.
 *
 * Todo eso ocurría sin un solo mensaje, así que parecía que el programa estaba
 * roto. Este aviso lo dice claro y lleva directo a donde se arregla. No se
 * puede cerrar «para siempre»: mientras falte, sigue haciendo falta.
 */

const OCULTO_HASTA = 'gpt_aviso_direccion_publica_hasta';

export default function AvisoDireccionPublica() {
  const [falta, setFalta] = useState(false);

  useEffect(() => {
    let vivo = true;
    // Si se ha cerrado hace poco, se respeta un rato: avisar es útil, dar la
    // lata cada dos minutos no.
    try {
      const hasta = Number(localStorage.getItem(OCULTO_HASTA) || 0);
      if (hasta && Date.now() < hasta) return undefined;
    } catch { /* sin almacenamiento, se avisa igual */ }

    base44.entities.CompanySettings.list()
      .then((lista) => {
        if (!vivo) return;
        const empresa = lista?.[0];
        // Solo molesta si además ya hay documentos: en un programa recién
        // instalado, sin nada que enviar, no hace falta el aviso todavía.
        if (!direccionPublica(empresa)) setFalta(true);
      })
      .catch(() => { /* sin conexión no se puede saber; no se avisa en falso */ });
    return () => { vivo = false; };
  }, []);

  if (!falta) return null;

  const cerrarUnRato = () => {
    try { localStorage.setItem(OCULTO_HASTA, String(Date.now() + 24 * 60 * 60 * 1000)); } catch { /* da igual */ }
    setFalta(false);
  };

  return (
    <div
      className="fixed bottom-3 left-1/2 z-40 w-[95%] max-w-xl -translate-x-1/2 rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-lg"
      data-prueba="aviso-direccion-publica"
    >
      <div className="flex items-start gap-2.5">
        <LinkIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            Falta la dirección pública del programa
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-900">
            Mientras no la pongas: el enlace para <b>aceptar o rechazar</b> que reciben tus
            clientes no se puede abrir, el <b>QR de verificación</b> no lleva a ninguna parte, y
            no te llegará el aviso de si han aceptado o rechazado.
          </p>
          <Link
            to={createPageUrl('CompanyConfig')}
            onClick={() => setFalta(false)}
            className="mt-2 inline-block rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Ponerla ahora
          </Link>
        </div>
        <button
          type="button"
          onClick={cerrarUnRato}
          aria-label="Ocultar el aviso durante un día"
          className="rounded p-1 text-amber-700 hover:bg-amber-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
