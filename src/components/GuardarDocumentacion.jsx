import React, { useState } from 'react';
import { BookDown, Loader2, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  sePuedeDescargar, porQueNoSePuede, descargarDocumento, comoFichero,
  nombreDesdeUrl, portalDeLaMarca,
} from '@/lib/documentacionTecnica';
import { uploadImage } from '@/lib/uploadImage';
import { base44 } from '@/api/base44Client';

/**
 * Traerse la documentación del fabricante a Manuales, en la carpeta de su
 * marca.
 *
 * Se pega la dirección del PDF y se guarda. Se comprueba que lo descargado sea
 * un PDF de verdad mirando la firma del propio fichero: guardar la página de
 * "no encontrado" del fabricante como si fuera el manual es peor que no
 * guardar nada, porque se descubre el día que hace falta, delante de la
 * máquina y sin cobertura.
 */
export default function GuardarDocumentacion({ marca = '', modelo = '', referencia = '' }) {
  const [abierto, setAbierto] = useState(false);
  const [url, setUrl] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const portal = portalDeLaMarca(marca);
  const puede = sePuedeDescargar();

  const guardar = async () => {
    const direccion = url.trim();
    if (!direccion) return;
    setGuardando(true);
    setResultado(null);
    try {
      const bajado = await descargarDocumento(direccion);
      if (!bajado?.ok) {
        setResultado({ ok: false, texto: bajado?.error || 'No se ha podido descargar.' });
        setGuardando(false);
        return;
      }
      const nombre = nombreDesdeUrl(direccion, `${referencia || modelo || 'documento'}.pdf`);
      const fichero = comoFichero(bajado.base64, nombre, bajado.tipo);
      const file_url = await uploadImage(fichero);

      await base44.entities.ClientDocument.create({
        contact_id: 'MANUAL_LIBRARY',
        contact_name: marca || 'Sin marca',
        title: `${referencia || modelo || nombre}`,
        doc_type: 'manual',
        file_url,
        description: JSON.stringify({
          brand: marca || 'Sin marca',
          model: modelo || referencia || '',
          category: 'Ficha técnica del fabricante',
          notes: `Descargado de ${direccion}`,
          origen: direccion,
        }),
        date: format(new Date(), 'yyyy-MM-dd'),
      });

      const kb = Math.round((bajado.bytes || 0) / 1024);
      setResultado({
        ok: true,
        texto: `Guardado en Manuales, carpeta «${marca || 'Sin marca'}» (${kb} KB). Lo tendrás ahí para futuras consultas.`,
      });
      setUrl('');
    } catch (e) {
      setResultado({ ok: false, texto: String(e?.message || e) });
    }
    setGuardando(false);
  };

  return (
    <div className="space-y-2" data-prueba="guardar-documentacion">
      <button
        type="button"
        onClick={() => { setAbierto((v) => !v); setResultado(null); }}
        data-prueba="abrir-guardar-doc"
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
      >
        <BookDown className="h-3.5 w-3.5" />
        Guardar la documentación en Manuales
      </button>

      {abierto && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-2">
          {portal && (
            <a
              href={portal.url}
              target="_blank"
              rel="noopener noreferrer"
              data-prueba="portal-marca"
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir la página de descargas de {portal.marca}
            </a>
          )}
          <p className="text-xs text-slate-500">
            Busca el PDF en la web del fabricante, copia su dirección y pégala aquí.
            Se guarda en Manuales, en la carpeta de {marca || 'la marca'}.
          </p>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/ficha-tecnica.pdf"
            aria-label="Dirección del documento"
            data-prueba="url-documento"
            className="w-full rounded-lg border p-2 font-mono text-xs"
          />
          <button
            type="button"
            onClick={guardar}
            disabled={!url.trim() || guardando || !puede}
            data-prueba="descargar-documento"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 p-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {guardando ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Descargando…</> : 'Descargar y guardar'}
          </button>

          {!puede && (
            <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800" data-prueba="aviso-no-se-puede">
              {porQueNoSePuede()}
            </p>
          )}
        </div>
      )}

      {resultado && (
        <div
          className={`flex items-start gap-2 rounded-lg p-2 text-xs ${resultado.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
          role="status"
          data-prueba="resultado-documentacion"
        >
          {resultado.ok
            ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
          <span className="min-w-0 break-words">{resultado.texto}</span>
        </div>
      )}
    </div>
  );
}
