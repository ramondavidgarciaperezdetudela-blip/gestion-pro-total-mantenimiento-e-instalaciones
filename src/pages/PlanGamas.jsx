import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, ListChecks, Sparkles, Plus, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import TechnicianSelect from '@/components/TechnicianSelect';
import { getNextAvailableNumber } from '@/components/autoNumber';
import { Tarjeta, Campo, Entrada, Selector, Cabecera, Kpi, fechaES } from '@/components/taller/Ficha';
import { resumenPlan, porGenerar, proximaGama, hoyISO } from '@/lib/taller';

const GAMA_VACIA = { name: '', applies_to: '', interval_months: 3, duration_h: '', reference: '', active: true, tasks: [] };
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : null; };
const lista = (p) => p.then((x) => (Array.isArray(x) ? x : x?.items || [])).catch(() => []);

function FormularioGama({ inicial, onCancel, onGuardar }) {
  const [f, setF] = useState({ ...GAMA_VACIA, ...inicial, tasks: inicial?.tasks || [] });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));
  const setTarea = (i, texto) => setF((p) => ({ ...p, tasks: p.tasks.map((t, j) => (j === i ? { text: texto } : t)) }));
  const guardar = () => {
    if (!f.name.trim()) { toast.error('Indica el nombre de la gama.'); return; }
    if (!(num(f.interval_months) > 0)) { toast.error('Indica cada cuántos meses se hace.'); return; }
    onGuardar({ ...f, name: f.name.trim(), interval_months: num(f.interval_months), duration_h: num(f.duration_h), tasks: f.tasks.filter((t) => t.text.trim()) });
  };
  return (
    <div data-testid="formulario-gama">
      <Cabecera migas={[{ texto: 'Gamas de mantenimiento', onClick: onCancel }, { texto: inicial?.id ? 'Editar' : 'Nuevo' }]} titulo={inicial?.id ? f.name || 'Gama' : 'Nueva gama de mantenimiento'}
        acciones={<><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={guardar} data-testid="guardar-gama"><Save className="mr-1 h-4 w-4" />{inicial?.id ? 'Guardar cambios' : 'Añadir gama de mantenimiento'}</Button></>} />
      <div className="space-y-3">
        <Tarjeta titulo="Gama" className="max-w-3xl">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Campo etiqueta="Nombre" obligatorio><Entrada value={f.name} onChange={set('name')} placeholder="Revisión trimestral split / conductos" data-prueba="gama-nombre" /></Campo>
            <Campo etiqueta="Aplica a"><Entrada value={f.applies_to} onChange={set('applies_to')} placeholder="Splits, VRF, enfriadoras…" /></Campo>
            <Campo etiqueta="Cada (meses)" obligatorio><Entrada inputMode="decimal" value={f.interval_months} onChange={set('interval_months')} data-prueba="gama-meses" /></Campo>
            <Campo etiqueta="Duración estimada (h)"><Entrada inputMode="decimal" value={f.duration_h} onChange={set('duration_h')} /></Campo>
            <Campo etiqueta="Normativa de referencia" className="md:col-span-2"><Entrada value={f.reference} onChange={set('reference')} placeholder="RITE IT 3 · Reglamento (UE) 2024/573" /></Campo>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Activa</label>
        </Tarjeta>
        <Tarjeta titulo="Tareas">
          {f.tasks.length === 0 && <p className="text-sm text-muted-foreground">Sin tareas.</p>}
          {f.tasks.map((t, i) => (
            <div key={i} className="flex gap-2"><Entrada value={t.text} onChange={(e) => setTarea(i, e.target.value)} placeholder={`Tarea ${i + 1}`} data-prueba={`gama-tarea-${i}`} /><button type="button" className="px-1 text-destructive" aria-label="Quitar tarea" onClick={() => setF((p) => ({ ...p, tasks: p.tasks.filter((_, j) => j !== i) }))}><Trash2 className="h-4 w-4" /></button></div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setF((p) => ({ ...p, tasks: [...p.tasks, { text: '' }] }))} data-testid="anadir-tarea"><Plus className="mr-1 h-4 w-4" />Añadir tarea</Button>
        </Tarjeta>
      </div>
    </div>
  );
}

function Gamas({ gamas, recargar }) {
  const [edit, setEdit] = useState(null);
  const guardar = async (d) => {
    try { if (d.id) { const { id, ...r } = d; await base44.entities.MaintenanceGama.update(id, r); } else await base44.entities.MaintenanceGama.create(d); toast.success('Gama guardada'); setEdit(null); recargar(); }
    catch (e) { toast.error('No se pudo guardar la gama', { description: String(e?.message || e) }); }
  };
  const borrar = async (g) => { if (confirm(`¿Borrar la gama «${g.name}»?`)) { await base44.entities.MaintenanceGama.delete(g.id); recargar(); } };
  if (edit) return <FormularioGama inicial={edit.id ? edit : null} onCancel={() => setEdit(null)} onGuardar={guardar} />;
  return (
    <div>
      <div className="mb-2 flex justify-end"><Button onClick={() => setEdit({})} data-testid="nueva-gama"><Plus className="mr-1 h-4 w-4" />Añadir gama</Button></div>
      <div className="space-y-2" data-testid="lista-gamas">
        {gamas.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay gamas. Crea la primera con sus tareas.</p>}
        {gamas.map((g) => (
          <Tarjeta key={g.id} data-gama={g.name}>
            <div className="flex items-start justify-between gap-2">
              <div><div className="font-semibold">{g.name}{g.active === false && <span className="ml-2 text-xs text-muted-foreground">(inactiva)</span>}</div><div className="text-xs text-muted-foreground">{[g.applies_to, `cada ${g.interval_months} meses`, g.duration_h ? `${g.duration_h} h` : '', g.reference].filter(Boolean).join(' · ')}</div></div>
              <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setEdit(g)}>Editar</Button><Button size="sm" variant="ghost" onClick={() => borrar(g)} aria-label="Borrar"><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
            {(g.tasks || []).length > 0 && <ol className="list-decimal pl-5 text-sm">{g.tasks.map((t, i) => <li key={i}>{t.text}</li>)}</ol>}
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}

function Plan({ gamas, asignaciones, maquinas, recargar }) {
  const [dias, setDias] = useState('30');
  const [f, setF] = useState({ gama_id: '', machine_id: '', technician: '', last_done: '', next_date: '' });
  const [ocupado, setOcupado] = useState(false);
  const plan = resumenPlan(asignaciones, gamas);
  const gamaDe = (id) => gamas.find((g) => String(g.id) === String(id));
  const asignar = async () => {
    const g = gamaDe(f.gama_id); const m = maquinas.find((x) => String(x.id) === String(f.machine_id));
    if (!g || !m) { toast.error('Elige la gama y el equipo.'); return; }
    try {
      await base44.entities.GamaAssignment.create({ gama_id: g.id, gama_name: g.name, machine_id: m.id, machine_name: m.name || m.model || '', contact_id: m.contact_id || '', contact_name: m.contact_name || '', technician: f.technician, last_done: f.last_done, next_date: f.next_date });
      toast.success('Gama asignada'); setF({ gama_id: '', machine_id: '', technician: '', last_done: '', next_date: '' }); recargar();
    } catch (e) { toast.error('No se pudo asignar', { description: String(e?.message || e) }); }
  };
  const quitar = async (a) => { if (confirm('¿Quitar esta gama del equipo?')) { await base44.entities.GamaAssignment.delete(a.id); recargar(); } };
  const generar = async () => {
    const pend = porGenerar(asignaciones, gamas, parseInt(dias, 10));
    if (!pend.length) { toast.info('No hay gamas que venzan en ese plazo (o ya tienen orden abierta).'); return; }
    setOcupado(true);
    try {
      const existentes = (await lista(base44.entities.SATOrder.list('-date', 1000))).map((x) => x.order_number || '');
      for (const a of pend) {
        const g = gamaDe(a.gama_id); const m = maquinas.find((x) => String(x.id) === String(a.machine_id));
        const numero = getNextAvailableNumber(existentes); existentes.push(numero);
        const orden = await base44.entities.SATOrder.create({
          order_number: numero, status: 'pendiente', type: 'mantenimiento', priority: 'normal', equipment_type: 'otro', date: hoyISO(), scheduled_date: a.proxima,
          contact_id: a.contact_id || m?.contact_id || '', contact_name: a.contact_name || m?.contact_name || '', technician: a.technician || '',
          equipment_brand: m?.brand || '', equipment_model: m?.model || '', equipment_serial: m?.serial_number || '', equipment_location: m?.location || '',
          description: `Mantenimiento preventivo — ${g?.name || a.gama_name} — ${a.machine_name}`,
          notes: (g?.tasks || []).map((t, i) => `${i + 1}. ${t.text}`).join('\n'),
        });
        await base44.entities.GamaAssignment.update(a.id, { open_order_id: orden?.id || 'creada', open_order_number: numero });
      }
      toast.success(`${pend.length} orden(es) preventiva(s) creada(s) en SAT`); recargar();
    } catch (e) { toast.error('No se pudieron generar las órdenes', { description: String(e?.message || e) }); } finally { setOcupado(false); }
  };
  const marcarHecha = async (a) => {
    const g = gamaDe(a.gama_id); const hoy = hoyISO();
    await base44.entities.GamaAssignment.update(a.id, { last_done: hoy, next_date: '', open_order_id: '', open_order_number: '' });
    toast.success(`Hecha. Próxima: ${fechaES(proximaGama({ last_done: hoy }, g, hoy))}`); recargar();
  };
  const color = { vencida: 'text-red-600', proxima: 'text-amber-600', ok: 'text-emerald-600', 'sin-fecha': 'text-muted-foreground' };
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
      <div className="space-y-3">
        <Tarjeta icono={Sparkles} titulo="Generar órdenes">
          <Campo etiqueta="Gamas que vencen en los próximos"><Selector opciones={[{ value: '7', label: '7 días' }, { value: '15', label: '15 días' }, { value: '30', label: '30 días' }, { value: '60', label: '60 días' }, { value: '90', label: '90 días' }]} value={dias} onChange={setDias} vacio={null} data-prueba="plan-dias" /></Campo>
          <Button onClick={generar} disabled={ocupado} data-testid="generar-ordenes"><Sparkles className="mr-1 h-4 w-4" />Generar órdenes preventivas</Button>
        </Tarjeta>
        <Tarjeta icono={Plus} titulo="Asignar gama a un equipo" data-testid="asignar-gama">
          <Campo etiqueta="Gama" obligatorio><Selector opciones={gamas.filter((g) => g.active !== false).map((g) => ({ value: g.id, label: g.name }))} value={f.gama_id} onChange={(v) => setF({ ...f, gama_id: v })} vacio="Elige la gama" data-prueba="asig-gama" /></Campo>
          <Campo etiqueta="Equipo" obligatorio><Selector opciones={maquinas.map((m) => ({ value: m.id, label: `${m.name || m.model || m.id}${m.contact_name ? ` — ${m.contact_name}` : ''}` }))} value={f.machine_id} onChange={(v) => setF({ ...f, machine_id: v })} vacio="Elige el equipo" data-prueba="asig-equipo" /></Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Técnico habitual"><TechnicianSelect value={f.technician} onChange={(v) => setF({ ...f, technician: v })} placeholder="—" /></Campo>
            <Campo etiqueta="Última vez que se hizo" ayuda="Si se conoce, la próxima se calcula sola"><Entrada type="date" value={f.last_done} onChange={(e) => setF({ ...f, last_done: e.target.value })} /></Campo>
          </div>
          <Campo etiqueta="Próxima fecha" ayuda="Vacío = según la última o desde hoy"><Entrada type="date" value={f.next_date} onChange={(e) => setF({ ...f, next_date: e.target.value })} /></Campo>
          {gamas.length === 0 && <p className="text-xs text-amber-600">Primero crea una gama en la pestaña «Gamas».</p>}
          <Button variant="outline" onClick={asignar} data-testid="asignar">Asignar gama</Button>
        </Tarjeta>
      </div>
      <Tarjeta icono={CalendarClock} titulo="Plan de mantenimiento" data-testid="plan-lista">
        {plan.filas.length === 0 ? <p className="text-sm text-muted-foreground">No hay gamas asignadas.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th>Equipo</th><th>Gama</th><th>Próxima</th><th>Orden</th><th /></tr></thead>
            <tbody>{plan.filas.map((a) => <tr key={a.id} className="border-t" data-asignacion={a.machine_name}>
              <td className="py-1.5"><div className="font-medium">{a.machine_name}</div><div className="text-[11px] text-muted-foreground">{a.contact_name}</div></td>
              <td>{a.gama_name}</td><td className={`font-mono ${color[a.estado]}`} data-estado={a.estado}>{fechaES(a.proxima)}</td>
              <td>{a.open_order_number ? `SAT ${a.open_order_number}` : '—'}</td>
              <td className="whitespace-nowrap text-right"><button className="px-1 text-xs text-primary hover:underline" onClick={() => marcarHecha(a)}>Hecha hoy</button><button className="px-1 text-destructive" aria-label="Quitar" onClick={() => quitar(a)}><Trash2 className="inline h-3.5 w-3.5" /></button></td></tr>)}</tbody></table>)}
      </Tarjeta>
    </div>
  );
}

export default function PlanGamas() {
  const [tab, setTab] = useState('plan');
  const [gamas, setGamas] = useState([]); const [asignaciones, setAsignaciones] = useState([]); const [maquinas, setMaquinas] = useState([]);
  const cargar = useCallback(async () => {
    const [g, a, m] = await Promise.all([lista(base44.entities.MaintenanceGama.list()), lista(base44.entities.GamaAssignment.list()), lista(base44.entities.ClientMachine.list())]);
    setGamas(g); setAsignaciones(a); setMaquinas(m);
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const r = resumenPlan(asignaciones, gamas);
  return (
    <div className="mx-auto max-w-6xl p-3 md:p-5" data-testid="plan-gamas">
      <Cabecera titulo="Mantenimiento preventivo" descripcion="Asigna gamas a los equipos y genera las órdenes preventivas cuando toca." />
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4" data-testid="kpis-plan">
        <Kpi etiqueta="Gamas asignadas" valor={r.asignadas} /><Kpi etiqueta="Vencidas" valor={r.vencidas} tono={r.vencidas ? 'mal' : 'ok'} /><Kpi etiqueta="Próximos 15 días" valor={r.proximas} tono={r.proximas ? 'aviso' : 'ok'} /><Kpi etiqueta="Con orden abierta" valor={r.conOrden} />
      </div>
      <div className="mb-3 flex gap-1 border-b" role="tablist">{[['plan', CalendarClock, 'Plan de mantenimiento'], ['gamas', ListChecks, 'Gamas']].map(([id, Icono, t]) => <button key={id} role="tab" aria-selected={tab === id} data-pestana={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${tab === id ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'}`}><Icono className="h-4 w-4" />{t}</button>)}</div>
      {tab === 'plan' ? <Plan gamas={gamas} asignaciones={asignaciones} maquinas={maquinas} recargar={cargar} /> : <Gamas gamas={gamas} recargar={cargar} />}
    </div>
  );
}
