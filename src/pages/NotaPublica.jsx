import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parametrosDeUrl } from '@/lib/parametrosUrl';
import { textoAHtml, fechaLarga } from '@/lib/notasInformativas';
import FirmaClienteBoton from '@/components/FirmaClienteBoton';
import BotonImprimirCliente from '@/components/BotonImprimirCliente';

/** Página que ve el cliente: lee la nota informativa y firma que la ha leído. */
export default function NotaPublica() {
  const params = parametrosDeUrl();
  const id = params.get('id');
  const token = params.get('t');
  const [envio, setEnvio] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!id || !token) { setError('Enlace no válido'); setCargando(false); return; }
    base44.functions.invoke('getNotaPublica', { envio_id: id, token })
      .then((r) => { if (r?.data?.envio) { setEnvio(r.data.envio); setCompany(r.data.company); } else setError('Nota no encontrada'); })
      .catch(() => setError('No se pudo abrir la nota. Comprueba que el enlace está completo.'))
      .finally(() => setCargando(false));
  }, [id, token]);

  const firmar = async (firma) => {
    setGuardando(true); setError('');
    try {
      const r = await base44.functions.invoke('firmarNota', { envio_id: id, token, signature: firma });
      setEnvio((e) => ({ ...e, status: 'firmada', signature: firma, signed_at: r?.data?.signed_at || new Date().toISOString(), signature_via: 'enlace' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) { setError(e?.message || 'No se pudo guardar la firma. Inténtelo de nuevo.'); }
    finally { setGuardando(false); }
  };

  if (cargando) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  if (!envio) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center">
      <div><AlertTriangle className="mx-auto mb-3 h-12 w-12 text-orange-400" /><p className="text-gray-600">{error || 'Nota no encontrada'}</p></div>
    </div>
  );
  const firmada = envio.status === 'firmada';
  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="sombra-al-imprimir rounded-2xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{company?.company_name} · Nota informativa</p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{envio.nota_title}</h1>
          <p className="mb-4 text-xs text-slate-500">Para: {envio.contact_name}</p>
          <div className="text-sm text-slate-800" dangerouslySetInnerHTML={{ __html: textoAHtml(envio.nota_body) }} />
        </div>
        {firmada ? (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center" data-testid="nota-firmada">
            <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
            <p className="mt-2 font-semibold text-green-800">Gracias, queda constancia de que la ha leído.</p>
            <p className="text-sm text-green-700">Firmada el {fechaLarga(envio.signed_at)}</p>
            {envio.signature && <img src={envio.signature} alt="Su firma" className="mx-auto mt-3 max-h-24 rounded border bg-white p-1" />}
          </div>
        ) : (
          <div className="no-imprimir rounded-2xl border bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm text-slate-700">Firme para confirmar que ha leído esta nota.</p>
            {guardando ? <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
              : <FirmaClienteBoton onSave={firmar} titulo="Firma de lectura" texto="Toque aquí para firmar" />}
            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}
          </div>
        )}
        <BotonImprimirCliente etiqueta="Imprimir o guardar en PDF" />
      </div>
    </div>
  );
}
