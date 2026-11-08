import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { navigateTo } from '@/utils';
import { documentoDelModulo } from '@/lib/iaModulos/modulo';
import { crearPuente } from '@/lib/iaModulos/puente';
import { llamarClaude, ajustesClaude } from '@/lib/iaModulos/claude';
import { leerSecreto } from '@/lib/iaModulos/datos';

/**
 * Ejecuta un módulo aislado: iframe sin acceso al programa (sandbox sin allow-same-origin,
 * CSP sin red). Solo habla con el puente, que comprueba los permisos de cada petición.
 */
export default function SandboxModulo({ modulo, concedidos = [], conectores = [], modoPrueba = false, alturaMin = 240, onRegistro }) {
  const ref = useRef(null);
  const [alto, setAlto] = useState(alturaMin);
  const [fallo, setFallo] = useState('');
  const doc = useMemo(() => documentoDelModulo(modulo), [modulo?.html]); // eslint-disable-line react-hooks/exhaustive-deps

  const manejar = useMemo(() => crearPuente({
    base44, modulo: { id: modulo?.id || 'prueba', nombre: modulo?.nombre }, concedidos, modoPrueba, conectores,
    secretoDe: leerSecreto,
    preguntarIA: async (pregunta, sistema) => llamarClaude({ system: sistema || undefined, messages: [{ role: 'user', content: pregunta }], maxTokens: 4000 }, ajustesClaude()),
    avisar: (t, tipo) => (tipo === 'error' ? toast.error(t) : toast.success(t)),
    irA: (p) => navigateTo(p),
    registrar: (t) => onRegistro?.(t)
  }), [modulo?.id, JSON.stringify(concedidos), modoPrueba, JSON.stringify(conectores.map((c) => c.nombre + c.url_base))]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setFallo('');
    const escuchar = async (ev) => {
      const f = ref.current;
      if (!f || ev.source !== f.contentWindow) return; // solo este iframe
      const m = ev.data;
      if (!m || typeof m !== 'object') return;
      if (m.gpt === 'alto') { const a = Math.min(Math.max(Number(m.alto) || 0, alturaMin), 6000); setAlto(a); return; }
      if (m.gpt === 'error') { setFallo(String(m.texto || '').slice(0, 300)); return; }
      if (m.gpt !== 'req') return;
      let resp;
      try { resp = { gpt: 'res', id: m.id, ok: true, data: await manejar(m.op, m.args) }; }
      catch (err) { resp = { gpt: 'res', id: m.id, ok: false, error: String(err?.message || err).slice(0, 400) }; }
      try { f.contentWindow?.postMessage(resp, '*'); } catch { /* el iframe ya no existe */ }
    };
    window.addEventListener('message', escuchar);
    return () => window.removeEventListener('message', escuchar);
  }, [manejar, alturaMin]);

  return (
    <div>
      {fallo && <div className="mb-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" data-prueba="modulo-error">Error dentro del módulo: {fallo}</div>}
      <iframe
        ref={ref}
        title={modulo?.nombre || 'Módulo'}
        sandbox="allow-scripts"
        srcDoc={doc}
        data-prueba="modulo-iframe"
        style={{ width: '100%', height: alto, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff' }}
      />
    </div>
  );
}
