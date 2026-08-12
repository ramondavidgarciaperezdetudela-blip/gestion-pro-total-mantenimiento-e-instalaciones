import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Loader2 } from 'lucide-react';

// Página PÚBLICA de verificación de un documento (se abre al escanear el QR).
export default function VerificarDocumento() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? (window.location.search || (window.location.hash.split('?')[1] ? '?' + window.location.hash.split('?')[1] : '')) : '');
  const docId = params.get('id');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!docId) { setErr('Falta el identificador del documento.'); setLoading(false); return; }
    base44.functions.invoke('verificarDocumento', { doc_id: docId })
      .then((res) => setData(res?.data || res))
      .catch(() => setErr('No se pudo verificar el documento.'))
      .finally(() => setLoading(false));
  }, [docId]);

  const money = (n) => (Number(n) || 0).toFixed(2) + ' €';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,.12)', maxWidth: 460, width: '100%', overflow: 'hidden' }}>
        <div style={{ background: '#1e3a5f', color: '#fff', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck className="w-6 h-6" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Verificación de documento</div>
            <div style={{ fontSize: 12, opacity: .8 }}>Gestión Pro Total</div>
          </div>
        </div>

        <div style={{ padding: 22 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>
              <Loader2 className="w-8 h-8 animate-spin" style={{ margin: '0 auto 10px' }} /> Comprobando…
            </div>
          ) : err ? (
            <p style={{ color: '#b91c1c', textAlign: 'center' }}>{err}</p>
          ) : !data?.found ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <XCircle className="w-12 h-12" style={{ color: '#dc2626', margin: '0 auto 10px' }} />
              <p style={{ fontWeight: 700, color: '#dc2626' }}>Documento no encontrado</p>
              <p style={{ fontSize: 13, color: '#64748b' }}>No existe un documento con este código.</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                {data.valido ? (
                  <>
                    <CheckCircle2 className="w-14 h-14" style={{ color: '#16a34a', margin: '0 auto 8px' }} />
                    <p style={{ fontWeight: 800, color: '#16a34a', fontSize: 18 }}>DOCUMENTO AUTÉNTICO</p>
                  </>
                ) : data.caducado ? (
                  <>
                    <Clock className="w-14 h-14" style={{ color: '#d97706', margin: '0 auto 8px' }} />
                    <p style={{ fontWeight: 800, color: '#d97706', fontSize: 18 }}>VERIFICACIÓN CADUCADA</p>
                    <p style={{ fontSize: 12, color: '#64748b' }}>El periodo de verificación de este documento ha finalizado.</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-14 h-14" style={{ color: '#dc2626', margin: '0 auto 8px' }} />
                    <p style={{ fontWeight: 800, color: '#dc2626', fontSize: 18 }}>VERIFICACIÓN NO DISPONIBLE</p>
                  </>
                )}
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', fontSize: 14 }}>
                {[
                  ['Tipo', (data.documento.tipo || '').toUpperCase()],
                  ['Número', data.documento.numero || '—'],
                  ['Fecha', data.documento.fecha || '—'],
                  ['Cliente', data.documento.cliente || '—'],
                  ['Importe', money(data.documento.total)],
                  ['Estado', data.documento.estado || '—'],
                  ['Firmado', data.documento.firmado ? `Sí${data.documento.firma_fecha ? ' · ' + data.documento.firma_fecha : ''}` : 'No'],
                ].map(([k, v], i) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: i % 2 ? '#f8fafc' : '#fff' }}>
                    <span style={{ color: '#64748b' }}>{k}</span>
                    <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
                  </div>
                ))}
              </div>

              {data.empresa?.nombre && (
                <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 12 }}>
                  Emitido por <b>{data.empresa.nombre}</b>{data.empresa.nif ? ` · ${data.empresa.nif}` : ''}
                </p>
              )}
              {data.valido && data.verify_expires && (
                <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 6 }}>
                  Verificación válida hasta {new Date(data.verify_expires).toLocaleDateString('es-ES')}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
