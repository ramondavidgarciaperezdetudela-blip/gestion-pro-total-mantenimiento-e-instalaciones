import React, { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Download, Github, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { editar, borrar, leerSecreto, peticionEnMarkdown, descargarTexto } from '@/lib/iaModulos/datos';

const ESTADOS = [['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['hecha', 'Hecha'], ['descartada', 'Descartada']];

export default function PestanaPeticiones({ peticiones, conectores, onCambios }) {
  const [enviando, setEnviando] = useState('');
  const github = conectores.find((c) => c.tipo === 'github' && c.activo !== false);

  const copiar = async (p) => { try { await navigator.clipboard.writeText(peticionEnMarkdown(p)); toast.success('Copiada. Pégala en Claude Code.'); } catch { toast.error('No se pudo copiar. Usa «Descargar».'); } };
  const incidencia = async (p) => {
    const token = leerSecreto(github);
    if (!token) { toast.error(`Falta el token de GitHub del conector «${github.nombre}» (botón «Clave» en Conectores).`); return; }
    setEnviando(p.id);
    try {
      const r = await fetch(`https://api.github.com/repos/${github.repo}/issues`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: p.titulo.slice(0, 200), labels: ['claude'], body: `@claude Implementa esta petición en el programa, con pruebas, y abre una pull request.\n\n${peticionEnMarkdown(p)}` })
      });
      if (!r.ok) throw new Error(`GitHub respondió ${r.status}`);
      const d = await r.json();
      await editar('PeticionCambioIA', p.id, { url_incidencia: d.html_url, estado: p.estado === 'pendiente' ? 'en_curso' : p.estado });
      toast.success('Incidencia creada en GitHub'); onCambios();
    } catch (e) { toast.error('No se pudo crear la incidencia: ' + (e.message || e)); }
    setEnviando('');
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Aquí quedan las funciones que exigen cambiar el propio programa. Cópialas a Claude Code, descárgalas como archivo o, con un conector de GitHub, pulsa «Que Claude la implemente»: se crea la incidencia y el flujo automático del repositorio (Claude Code en GitHub) programa el cambio y abre una pull request para que la revises y la fusiones. Necesita configurar una vez la clave en el repositorio (ver LEEME del Centro de IA en el repositorio: docs/CLAUDE-IMPLEMENTA.md).</p>
      {!peticiones.length && <p className="rounded border border-dashed p-4 text-center text-sm text-slate-600">No hay peticiones.</p>}
      {peticiones.map((p) => (
        <div key={p.id} className="rounded-lg border bg-white p-3" data-prueba="fila-peticion">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold">{p.titulo}</div>
            <select className="rounded border px-2 py-1 text-sm" value={p.estado || 'pendiente'} onChange={async (e) => { await editar('PeticionCambioIA', p.id, { estado: e.target.value }); onCambios(); }}>
              {ESTADOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-sm text-slate-700">{p.detalle}</div>
          {p.url_incidencia && <a className="mt-1 block text-xs text-blue-600 underline" href={p.url_incidencia} target="_blank" rel="noreferrer">Ver incidencia en GitHub</a>}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => copiar(p)}><Copy className="mr-1 h-4 w-4" />Copiar</Button>
            <Button size="sm" variant="outline" onClick={() => descargarTexto(`peticion-${p.titulo.replace(/[^\w\-]+/g, '_').slice(0, 40)}.md`, peticionEnMarkdown(p), 'text/markdown')}><Download className="mr-1 h-4 w-4" />Descargar .md</Button>
            {github && !p.url_incidencia && <Button size="sm" variant="outline" disabled={enviando === p.id} onClick={() => incidencia(p)}><Github className="mr-1 h-4 w-4" />Que Claude la implemente</Button>}
            <Button size="sm" variant="outline" className="text-red-600" onClick={async () => { if (window.confirm('¿Borrar esta petición?')) { await borrar('PeticionCambioIA', p.id); onCambios(); } }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
