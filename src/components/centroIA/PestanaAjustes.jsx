import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ajustesClaude, guardarAjustesClaude, hayClave, llamarClaude, MODELOS } from '@/lib/iaModulos/claude';

export default function PestanaAjustes({ onCambios }) {
  const [cfg, setCfg] = useState(ajustesClaude());
  const [ver, setVer] = useState(false);
  const [probando, setProbando] = useState(false);
  const guardar = () => { setCfg(guardarAjustesClaude(cfg)); toast.success('Ajustes guardados en este aparato'); onCambios?.(); };
  const probar = async () => {
    guardarAjustesClaude(cfg); setProbando(true);
    try { await llamarClaude({ messages: [{ role: 'user', content: 'Responde solo: OK' }], maxTokens: 20 }, cfg); toast.success('La clave funciona.'); }
    catch (e) { toast.error(e.message || String(e)); }
    setProbando(false);
  };
  return (
    <div className="max-w-xl space-y-3">
      <p className="text-sm text-slate-600">Cada empresa usa su propia clave de Anthropic (se crea en console.anthropic.com). Se guarda <b>solo en este aparato</b>, no entra en las copias de seguridad y las consultas se pagan en tu cuenta de Anthropic. Funciona igual en la versión con y sin Base44.</p>
      <label className="block text-sm font-medium">Clave de Anthropic
        <div className="mt-1 flex gap-2">
          <Input type={ver ? 'text' : 'password'} autoComplete="off" placeholder="sk-ant-…" value={cfg.clave} onChange={(e) => setCfg({ ...cfg, clave: e.target.value })} data-prueba="ajustes-clave" />
          <Button variant="outline" type="button" onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Ver'}</Button>
        </div>
      </label>
      <label className="block text-sm font-medium">Modelo
        <select className="mt-1 w-full rounded border px-2 py-2 text-sm" value={cfg.modelo} onChange={(e) => setCfg({ ...cfg, modelo: e.target.value })}>
          {MODELOS.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button onClick={guardar} data-prueba="ajustes-guardar">Guardar</Button>
        <Button variant="outline" onClick={probar} disabled={probando || !hayClave(cfg)}>Probar la clave</Button>
        <Button variant="outline" className="text-red-600" onClick={() => { setCfg(guardarAjustesClaude({ clave: '' })); toast.success('Clave borrada de este aparato'); onCambios?.(); }}>Borrar la clave</Button>
      </div>
    </div>
  );
}
