import React, { useState } from 'react';
import { toast } from 'sonner';
import { Trash2, PlugZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { validarConector } from '@/lib/iaModulos/complementos';
import { urlDelConector } from '@/lib/iaModulos/puente';
import { crear, editar, borrar, leerSecreto, guardarSecreto } from '@/lib/iaModulos/datos';

const VACIO = { nombre: '', tipo: 'http', url_base: '', cabecera_nombre: 'Authorization', repo: '', notas: '', secreto: '' };

export async function probarConector(c, secreto) {
  if (c.tipo === 'github') {
    const r = await fetch(`https://api.github.com/repos/${c.repo}`, { headers: secreto ? { Authorization: `Bearer ${secreto}` } : {} });
    return r.ok ? 'Conexión correcta con el repositorio.' : `GitHub respondió ${r.status}. Revisa el repositorio y el token.`;
  }
  const r = await fetch(urlDelConector(c, ''), { headers: c.cabecera_nombre && secreto ? { [c.cabecera_nombre]: secreto } : {}, redirect: 'error' });
  return `El servidor respondió ${r.status}.`;
}

export default function PestanaConectores({ conectores, onCambios }) {
  const [f, setF] = useState(VACIO);
  const [probando, setProbando] = useState('');
  const guardar = async () => {
    const v = validarConector(f.tipo === 'github' ? { nombre: f.nombre, tipo: 'github', repo: f.repo, notas: f.notas } : { nombre: f.nombre, tipo: 'http', url_base: f.url_base, cabecera_nombre: f.cabecera_nombre, notas: f.notas });
    if (!v.ok) { toast.error(v.errores.join(' ')); return; }
    if (conectores.some((c) => c.nombre.toLowerCase() === v.conector.nombre.toLowerCase())) { toast.error('Ya hay un conector con ese nombre.'); return; }
    try {
      await crear('ConectorIA', { ...v.conector, activo: true });
      guardarSecreto(v.conector.nombre, f.secreto.trim());
      toast.success('Conector guardado'); setF(VACIO); onCambios();
    } catch (e) { toast.error('No se pudo guardar: ' + (e.message || e)); }
  };
  const probar = async (c) => {
    setProbando(c.nombre);
    try { toast.message(await probarConector(c, leerSecreto(c))); } catch (e) { toast.error('No se pudo conectar: ' + (e.message || e)); }
    setProbando('');
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Un conector deja que tus módulos hablen con otro servicio (una API, un programa de contabilidad, GitHub…). La clave o token se guarda <b>solo en este aparato</b>: no entra en las copias de seguridad ni se comparte con el módulo.</p>
      <div className="space-y-2">
        {conectores.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-white p-3" data-prueba="fila-conector">
            <div className="min-w-0"><div className="font-semibold">{c.nombre} <span className="text-xs font-normal text-slate-500">({c.tipo === 'github' ? 'GitHub' : 'web/API'})</span></div>
              <div className="truncate text-xs text-slate-600">{c.tipo === 'github' ? c.repo : c.url_base}</div>
              <div className="text-xs text-slate-500">{leerSecreto(c) ? 'Clave guardada en este aparato' : 'Sin clave en este aparato'}</div></div>
            <div className="flex items-center gap-2">
              <Switch checked={c.activo !== false} onCheckedChange={async (v) => { await editar('ConectorIA', c.id, { activo: v }); onCambios(); }} />
              <Button size="sm" variant="outline" onClick={() => probar(c)} disabled={probando === c.nombre}><PlugZap className="mr-1 h-4 w-4" />Probar</Button>
              <Button size="sm" variant="outline" onClick={() => { const v = window.prompt(`Clave o token de «${c.nombre}» (solo se guarda en este aparato; vacío = quitarla):`, ''); if (v !== null) { guardarSecreto(c.nombre, v.trim()); onCambios(); } }}>Clave</Button>
              <Button size="sm" variant="outline" className="text-red-600" onClick={async () => { if (window.confirm(`¿Borrar el conector «${c.nombre}»?`)) { await borrar('ConectorIA', c.id); guardarSecreto(c.nombre, ''); onCambios(); } }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {!conectores.length && <p className="rounded border border-dashed p-4 text-center text-sm text-slate-600">No hay conectores.</p>}
      </div>
      <div className="space-y-2 rounded-lg border bg-white p-3">
        <div className="text-sm font-medium">Nuevo conector</div>
        <div className="flex gap-2">
          <Input placeholder="Nombre (sin espacios, ej. Contabilidad)" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} data-prueba="conector-nombre" />
          <select className="rounded border px-2 text-sm" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} data-prueba="conector-tipo"><option value="http">Web / API</option><option value="github">GitHub</option></select>
        </div>
        {f.tipo === 'http' ? (<>
          <Input placeholder="Dirección base (https://…)" value={f.url_base} onChange={(e) => setF({ ...f, url_base: e.target.value })} data-prueba="conector-url" />
          <Input placeholder="Cabecera de la clave (ej. Authorization o X-Api-Key)" value={f.cabecera_nombre} onChange={(e) => setF({ ...f, cabecera_nombre: e.target.value })} />
        </>) : <Input placeholder="Repositorio (usuario/repositorio)" value={f.repo} onChange={(e) => setF({ ...f, repo: e.target.value })} data-prueba="conector-repo" />}
        <Input type="password" autoComplete="off" placeholder={f.tipo === 'github' ? 'Token de GitHub (solo en este aparato)' : 'Clave o token (solo en este aparato)'} value={f.secreto} onChange={(e) => setF({ ...f, secreto: e.target.value })} />
        <Input placeholder="Notas (opcional)" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
        <Button onClick={guardar} data-prueba="conector-guardar">Guardar conector</Button>
      </div>
    </div>
  );
}
