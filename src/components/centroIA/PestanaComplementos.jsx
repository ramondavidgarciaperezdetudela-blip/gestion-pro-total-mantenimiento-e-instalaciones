import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { exportarComplemento, leerComplemento, nombreLibre, MAX_ARCHIVO } from '@/lib/iaModulos/complementos';
import { crear, descargarTexto, avisarCambios } from '@/lib/iaModulos/datos';

export default function PestanaComplementos({ modulos, skills, conectores, onCambios }) {
  const [nombre, setNombre] = useState('Mi complemento');
  const [sel, setSel] = useState({});
  const [leido, setLeido] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const input = useRef(null);
  const marcar = (k) => setSel((s) => ({ ...s, [k]: !s[k] }));

  const exportar = () => {
    const paquete = exportarComplemento({
      modulos: modulos.filter((m) => sel['m' + m.id]), skills: skills.filter((s) => sel['s' + s.id]), conectores: conectores.filter((c) => sel['c' + c.id])
    }, nombre);
    if (!paquete.modulos.length && !paquete.skills.length && !paquete.conectores.length) { toast.error('Marca al menos una cosa para exportar.'); return; }
    descargarTexto(`${nombre.replace(/[^\w\-]+/g, '_') || 'complemento'}.gpt-complemento.json`, JSON.stringify(paquete, null, 2), 'application/json');
    toast.success('Complemento exportado. Las claves de los conectores no se incluyen.');
  };

  const elegir = async (ev) => {
    const archivo = ev.target.files?.[0]; ev.target.value = '';
    if (!archivo) return;
    if (archivo.size > MAX_ARCHIVO) { toast.error('El archivo es demasiado grande.'); return; }
    const r = leerComplemento(await archivo.text());
    if (!r.ok) { toast.error(r.errores.join(' ')); setLeido(null); return; }
    setLeido(r);
  };

  const importar = async () => {
    setTrabajando(true);
    try {
      const nm = modulos.map((m) => m.nombre); const ns = skills.map((s) => s.nombre); const nc = conectores.map((c) => c.nombre);
      for (const m of leido.modulos) { const n = nombreLibre(m.nombre, nm); nm.push(n); await crear('ModuloIA', { ...m, nombre: n, permisos_concedidos: [], activo: false, origen: 'importado', version: 1 }); }
      for (const s of leido.skills) { const n = nombreLibre(s.nombre, ns); ns.push(n); await crear('SkillIA', { ...s, nombre: n, activo: false }); }
      for (const c of leido.conectores) { const n = nombreLibre(c.nombre, nc); nc.push(n); await crear('ConectorIA', { ...c, nombre: n, activo: false }); }
      toast.success('Complemento importado. Todo está desactivado hasta que lo revises y actives.');
      setLeido(null); avisarCambios(); onCambios();
    } catch (e) { toast.error('No se pudo importar: ' + (e.message || e)); }
    setTrabajando(false);
  };

  const Casilla = ({ k, texto }) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!sel[k]} onChange={() => marcar(k)} />{texto}</label>;

  return (
    <div className="space-y-5">
      <section className="space-y-2 rounded-lg border bg-white p-3">
        <div className="font-medium">Exportar</div>
        <p className="text-xs text-slate-600">Guarda módulos, skills y conectores en un archivo para llevarlos a otro equipo o compartirlos con otra empresa. No incluye claves, permisos concedidos ni datos.</p>
        <div className="grid gap-1 sm:grid-cols-2">
          {modulos.map((m) => <Casilla key={m.id} k={'m' + m.id} texto={`Módulo: ${m.nombre}`} />)}
          {skills.map((s) => <Casilla key={s.id} k={'s' + s.id} texto={`Skill: ${s.nombre}`} />)}
          {conectores.map((c) => <Casilla key={c.id} k={'c' + c.id} texto={`Conector: ${c.nombre}`} />)}
        </div>
        {!modulos.length && !skills.length && !conectores.length && <p className="text-sm text-slate-500">Todavía no hay nada que exportar.</p>}
        <div className="flex gap-2"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="max-w-xs" /><Button onClick={exportar} data-prueba="exportar-complemento"><Download className="mr-1 h-4 w-4" />Exportar</Button></div>
      </section>
      <section className="space-y-2 rounded-lg border bg-white p-3">
        <div className="font-medium">Importar</div>
        <p className="text-xs text-slate-600">Importa un complemento que te hayan pasado. Todo entra <b>desactivado y sin permisos</b>: tú decides qué activar. Revisa siempre de quién viene.</p>
        <input ref={input} type="file" accept=".json,application/json" className="hidden" onChange={elegir} data-prueba="importar-archivo" />
        <Button variant="outline" onClick={() => input.current?.click()}><Upload className="mr-1 h-4 w-4" />Elegir archivo…</Button>
        {leido && (
          <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm" data-prueba="vista-importacion">
            <div className="font-semibold">{leido.nombre}</div>
            <ul className="list-disc pl-5">
              {leido.modulos.map((m) => <li key={m.nombre}>Módulo «{m.nombre}» (pide: {m.permisos.join(', ') || 'nada'})</li>)}
              {leido.skills.map((s) => <li key={s.nombre}>Skill «{s.nombre}»</li>)}
              {leido.conectores.map((c) => <li key={c.nombre}>Conector «{c.nombre}»</li>)}
            </ul>
            {leido.avisos.map((a) => <div key={a} className="text-xs text-amber-700">{a}</div>)}
            <Button size="sm" className="mt-2" onClick={importar} disabled={trabajando} data-prueba="confirmar-importar">Importar (desactivado)</Button>
          </div>
        )}
      </section>
    </div>
  );
}
