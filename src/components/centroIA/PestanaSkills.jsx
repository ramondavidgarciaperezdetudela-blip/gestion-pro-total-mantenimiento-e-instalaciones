import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { validarSkill } from '@/lib/iaModulos/modulo';
import { crear, editar, borrar } from '@/lib/iaModulos/datos';

const PLANTILLAS = [
  { nombre: 'Tono de los presupuestos', descripcion: 'Cómo redactar presupuestos y correos a clientes.', instrucciones: 'Redacta siempre con trato de usted, frases cortas y sin tecnicismos. Indica el plazo de validez de 30 días y que los precios no incluyen IVA salvo que se diga lo contrario.' },
  { nombre: 'Normativa de frío y climatología', descripcion: 'Recuerda la normativa al hablar de instalaciones.', instrucciones: 'Cuando se hable de instalaciones de frío o climatización, menciona si aplica el RITE, el Reglamento de Seguridad para Instalaciones Frigoríficas (RSIF) y el reglamento de gases fluorados, y recuerda las revisiones periódicas obligatorias.' },
  { nombre: 'Diseño de los módulos', descripcion: 'Estilo visual de las pantallas que cree la IA.', instrucciones: 'Las pantallas nuevas usan fondo claro, botones grandes y redondeados en azul oscuro, tablas con filas alternas y todos los importes con dos decimales y el símbolo €.' }
];

export default function PestanaSkills({ skills, onCambios }) {
  const [f, setF] = useState({ nombre: '', descripcion: '', instrucciones: '' });
  const guardar = async (datos) => {
    const v = validarSkill(datos);
    if (!v.ok) { toast.error(v.errores.join(' ')); return false; }
    try { await crear('SkillIA', { ...v.skill, activo: true }); toast.success('Skill guardada'); onCambios(); return true; }
    catch (e) { toast.error('No se pudo guardar: ' + (e.message || e)); return false; }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Una skill son instrucciones permanentes para la IA («así redactamos los presupuestos», «usa siempre este diseño»…). Las activas se aplican en todas las conversaciones del Centro de IA.</p>
      <div className="space-y-2">
        {skills.map((s) => (
          <div key={s.id} className="rounded-lg border bg-white p-3" data-prueba="fila-skill">
            <div className="flex items-start justify-between gap-2">
              <div><div className="font-semibold">{s.nombre}</div><div className="text-sm text-slate-600">{s.descripcion}</div></div>
              <div className="flex items-center gap-2">
                <Switch checked={s.activo !== false} onCheckedChange={async (v) => { await editar('SkillIA', s.id, { activo: v }); onCambios(); }} />
                <Button size="sm" variant="outline" className="text-red-600" onClick={async () => { if (window.confirm(`¿Borrar la skill «${s.nombre}»?`)) { await borrar('SkillIA', s.id); onCambios(); } }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-xs">{s.instrucciones}</pre>
          </div>
        ))}
        {!skills.length && <p className="rounded border border-dashed p-4 text-center text-sm text-slate-600">No tienes skills todavía. Añade una de las plantillas o crea la tuya.</p>}
      </div>
      <div className="rounded-lg border bg-slate-50 p-3">
        <div className="mb-2 text-sm font-medium">Plantillas para empezar</div>
        <div className="flex flex-wrap gap-2">
          {PLANTILLAS.filter((p) => !skills.some((s) => s.nombre === p.nombre)).map((p) => (
            <Button key={p.nombre} size="sm" variant="outline" onClick={() => guardar(p)}><Plus className="mr-1 h-4 w-4" />{p.nombre}</Button>
          ))}
        </div>
      </div>
      <div className="space-y-2 rounded-lg border bg-white p-3">
        <div className="text-sm font-medium">Nueva skill</div>
        <Input placeholder="Nombre" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} data-prueba="skill-nombre" />
        <Input placeholder="Para qué sirve (opcional)" value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} />
        <Textarea rows={5} placeholder="Instrucciones para la IA" value={f.instrucciones} onChange={(e) => setF({ ...f, instrucciones: e.target.value })} data-prueba="skill-instrucciones" />
        <Button onClick={async () => { if (await guardar(f)) setF({ nombre: '', descripcion: '', instrucciones: '' }); }} data-prueba="skill-guardar">Guardar skill</Button>
      </div>
    </div>
  );
}
