import React, { useState } from 'react';
import { toast } from 'sonner';
import { Play, Pencil, Trash2, ShieldCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { navigateTo } from '@/utils';
import { editar, borrar, avisarCambios, descargarTexto } from '@/lib/iaModulos/datos';
import { exportarComplemento } from '@/lib/iaModulos/complementos';
import PermisosDialog from './PermisosDialog';

export default function PestanaModulos({ modulos, onCambios, onMejorar }) {
  const [revisar, setRevisar] = useState(null);

  const cambiar = async (m, datos, msg) => {
    try { await editar('ModuloIA', m.id, datos); if (msg) toast.success(msg); avisarCambios(); onCambios(); }
    catch (e) { toast.error('No se pudo guardar: ' + (e.message || e)); }
  };
  const activar = (m, v) => {
    if (v && !(m.permisos_concedidos || []).length && (m.permisos || []).length) { setRevisar(m); return; }
    cambiar(m, { activo: v }, v ? 'Módulo activado' : 'Módulo desactivado');
  };
  const quitar = async (m) => {
    if (!window.confirm(`¿Borrar el módulo «${m.nombre}»? Sus datos propios también dejarán de verse.`)) return;
    try { await borrar('ModuloIA', m.id); toast.success('Módulo borrado'); avisarCambios(); onCambios(); }
    catch (e) { toast.error('No se pudo borrar: ' + (e.message || e)); }
  };
  const exportar = (m) => descargarTexto(`${m.nombre.replace(/[^\w\-]+/g, '_')}.gpt-complemento.json`, JSON.stringify(exportarComplemento({ modulos: [m] }, m.nombre), null, 2), 'application/json');

  if (!modulos.length) return <p className="rounded border border-dashed p-6 text-center text-sm text-slate-600" data-prueba="sin-modulos">Todavía no tienes módulos. Pídele uno a la IA en la pestaña «Pídele una función», o importa un complemento.</p>;

  return (
    <div className="space-y-3">
      {modulos.map((m) => (
        <div key={m.id} className="rounded-lg border bg-white p-3" data-prueba="fila-modulo">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold">{m.nombre} {m.origen === 'importado' && <Badge variant="outline">importado</Badge>}</div>
              <div className="text-sm text-slate-600">{m.descripcion}</div>
              <div className="mt-1 text-xs text-slate-500">Permisos concedidos: {(m.permisos_concedidos || []).length ? (m.permisos_concedidos || []).join(', ') : 'ninguno'}</div>
            </div>
            <label className="flex items-center gap-2 text-sm">Activo <Switch checked={!!m.activo} onCheckedChange={(v) => activar(m, v)} /></label>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => navigateTo('ModuloIA?id=' + encodeURIComponent(m.id))} disabled={!m.activo}><Play className="mr-1 h-4 w-4" />Abrir</Button>
            <Button size="sm" variant="outline" onClick={() => onMejorar(m)}><Pencil className="mr-1 h-4 w-4" />Mejorar con IA</Button>
            <Button size="sm" variant="outline" onClick={() => setRevisar(m)}><ShieldCheck className="mr-1 h-4 w-4" />Permisos</Button>
            <Button size="sm" variant="outline" onClick={() => exportar(m)}><Download className="mr-1 h-4 w-4" />Exportar</Button>
            <Button size="sm" variant="outline" className="text-red-600" onClick={() => quitar(m)}><Trash2 className="mr-1 h-4 w-4" />Borrar</Button>
          </div>
        </div>
      ))}
      <PermisosDialog abierto={!!revisar} modulo={revisar} permisos={revisar?.permisos || []}
        textoBoton="Conceder y activar"
        onCancelar={() => setRevisar(null)}
        onAceptar={() => { const m = revisar; setRevisar(null); cambiar(m, { permisos_concedidos: m.permisos || [], activo: true }, 'Permisos concedidos y módulo activo'); }} />
    </div>
  );
}
