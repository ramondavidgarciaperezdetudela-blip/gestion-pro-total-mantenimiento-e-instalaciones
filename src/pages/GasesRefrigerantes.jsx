import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Cylinder, History, FileBarChart, Plus, Trash2, Printer, Save } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import TechnicianSelect from '@/components/TechnicianSelect';
import { Tarjeta, Campo, Entrada, Selector, AreaTexto, Cabecera, fechaES } from '@/components/taller/Ficha';
import { GASES } from '@/lib/presionesRefrigerante';
import { OPERACIONES_GAS, operacionGas, saldoBotella, validarMovimiento, resumenAnual, hoyISO, redondear } from '@/lib/taller';

const TIPOS = [{ value: 'nuevo', label: 'Gas nuevo' }, { value: 'regenerado', label: 'Regenerado' }, { value: 'recuperado', label: 'Recuperado' }];
const ESTADOS = [{ value: 'llena', label: 'Llena' }, { value: 'en_uso', label: 'En uso' }, { value: 'vacia', label: 'Vacía' }, { value: 'devuelta', label: 'Devuelta al proveedor' }];
const BOTELLA_VACIA = { number: '', refrigerant: '', kind: 'nuevo', capacity_kg: '', initial_kg: '', status: 'llena', supplier: '', entry_date: '', return_date: '', notes: '' };
const GASES_OPC = GASES.map((g) => g.id);
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : null; };
const rotulo = (v, lista) => lista.find((o) => o.value === v)?.label || v || '—';

function FormularioBotella({ inicial, proveedores, onCancel, onGuardar }) {
  const [f, setF] = useState({ ...BOTELLA_VACIA, ...inicial });
  const set = (k) => (v) => setF((p) => ({ ...p, [k]: v?.target ? v.target.value : v }));
  const guardar = async () => {
    const e = [];
    if (!f.number.trim()) e.push('Indica el nº de botella.'); if (!f.refrigerant) e.push('Elige el refrigerante.'); if (!(num(f.capacity_kg) > 0)) e.push('Indica la capacidad en kg.');
    if (e.length) { toast.error(e[0]); return; }
    const kg = num(f.initial_kg);
    await onGuardar({ ...f, number: f.number.trim(), capacity_kg: num(f.capacity_kg), initial_kg: kg === null ? (f.status === 'llena' ? num(f.capacity_kg) : 0) : kg });
  };
  return (
    <div data-testid="formulario-botella">
      <Cabecera migas={[{ texto: 'Botellas de refrigerante', onClick: onCancel }, { texto: inicial?.id ? 'Editar' : 'Nueva' }]} titulo={inicial?.id ? `Botella ${inicial.number}` : 'Nueva botella'}
        acciones={<><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={guardar} data-testid="guardar-botella"><Save className="mr-1 h-4 w-4" />{inicial?.id ? 'Guardar cambios' : 'Añadir botella'}</Button></>} />
      <Tarjeta titulo="Botella">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Campo etiqueta="Nº de botella" obligatorio><Entrada value={f.number} onChange={set('number')} data-prueba="botella-numero" /></Campo>
          <Campo etiqueta="Refrigerante" obligatorio><Selector opciones={GASES_OPC} value={f.refrigerant} onChange={set('refrigerant')} vacio="Elige el gas" data-prueba="botella-gas" /></Campo>
          <Campo etiqueta="Tipo" obligatorio><Selector opciones={TIPOS} value={f.kind} onChange={set('kind')} vacio={null} /></Campo>
          <Campo etiqueta="Capacidad (kg)" obligatorio><Entrada inputMode="decimal" value={f.capacity_kg} onChange={set('capacity_kg')} data-prueba="botella-capacidad" /></Campo>
          <Campo etiqueta="Contenido inicial (kg)" ayuda="Después cambia con cargas y recuperaciones"><Entrada inputMode="decimal" value={f.initial_kg} onChange={set('initial_kg')} /></Campo>
          <Campo etiqueta="Estado" obligatorio><Selector opciones={ESTADOS} value={f.status} onChange={set('status')} vacio={null} /></Campo>
          <Campo etiqueta="Proveedor"><Selector opciones={proveedores} value={f.supplier} onChange={set('supplier')} /></Campo>
          <Campo etiqueta="Fecha de entrada"><Entrada type="date" value={f.entry_date} onChange={set('entry_date')} /></Campo>
          <Campo etiqueta="Fecha de devolución"><Entrada type="date" value={f.return_date} onChange={set('return_date')} /></Campo>
        </div>
        <Campo etiqueta="Notas"><AreaTexto value={f.notes} onChange={set('notes')} /></Campo>
      </Tarjeta>
    </div>
  );
}

function Botellas({ botellas, movimientos, proveedores, recargar, irARegistro }) {
  const [edit, setEdit] = useState(null);
  const guardar = async (datos) => {
    try {
      if (datos.id) { const { id, ...resto } = datos; await base44.entities.RefrigerantCylinder.update(id, resto); } else await base44.entities.RefrigerantCylinder.create(datos);
      toast.success('Botella guardada'); setEdit(null); recargar();
    } catch (e) { toast.error('No se pudo guardar la botella', { description: String(e?.message || e) }); }
  };
  const borrar = async (b) => { if (!confirm(`¿Borrar la botella ${b.number}? Sus movimientos del registro se conservan.`)) return; await base44.entities.RefrigerantCylinder.delete(b.id); recargar(); };
  if (edit) return <FormularioBotella inicial={edit.id ? edit : null} proveedores={proveedores} onCancel={() => setEdit(null)} onGuardar={guardar} />;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><p className="text-sm text-muted-foreground">{botellas.length} botella{botellas.length === 1 ? '' : 's'} registrada{botellas.length === 1 ? '' : 's'}.</p><Button onClick={() => setEdit({})} data-testid="nueva-botella"><Plus className="mr-1 h-4 w-4" />Añadir botella</Button></div>
      <Tarjeta className="overflow-x-auto" titulo="Existencias">
        {botellas.length === 0 ? <p className="text-sm text-muted-foreground">No hay botellas. Da de alta la primera.</p> : (
          <table className="w-full text-sm" data-testid="tabla-botellas"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th className="py-1">Nº</th><th>Gas</th><th>Tipo</th><th className="text-right">Contenido</th><th>Estado</th><th>Proveedor</th><th /></tr></thead>
            <tbody>{botellas.map((b) => (
              <tr key={b.id} className="border-t" data-botella={b.number}>
                <td className="py-1.5 font-medium">{b.number}</td><td>{b.refrigerant}</td><td>{rotulo(b.kind, TIPOS)}</td>
                <td className="text-right font-mono tabular-nums">{saldoBotella(b, movimientos)} / {b.capacity_kg} kg</td><td>{rotulo(b.status, ESTADOS)}</td><td>{b.supplier || '—'}</td>
                <td className="whitespace-nowrap text-right"><button className="px-1 text-xs text-primary hover:underline" onClick={() => setEdit(b)}>Editar</button><button className="px-1 text-xs text-primary hover:underline" onClick={() => irARegistro(b.id)}>Operar</button><button className="px-1 text-destructive" onClick={() => borrar(b)} aria-label="Borrar"><Trash2 className="inline h-3.5 w-3.5" /></button></td>
              </tr>))}</tbody></table>)}
      </Tarjeta>
    </div>
  );
}

function Registro({ botellas, movimientos, maquinas, botellaInicial, recargar, irABotellas }) {
  const [f, setF] = useState({ operation: 'carga_equipo', machine_id: '', cylinder_id: botellaInicial || '', kg: '', technician: '', notes: '' });
  useEffect(() => { if (botellaInicial) setF((p) => ({ ...p, cylinder_id: botellaInicial })); }, [botellaInicial]);
  const op = operacionGas(f.operation);
  const botella = botellas.find((b) => String(b.id) === String(f.cylinder_id));
  const maquina = maquinas.find((m) => String(m.id) === String(f.machine_id));
  const registrar = async () => {
    const mov = { ...f, kg: num(f.kg), refrigerant: botella?.refrigerant || '' };
    const errores = validarMovimiento(mov, botella, movimientos);
    if (errores.length) { toast.error(errores[0]); return; }
    try {
      await base44.entities.GasMovement.create({ date: hoyISO(), operation: f.operation, machine_id: op.pideEquipo ? f.machine_id : '', machine_name: op.pideEquipo ? (maquina?.name || '') : '', cylinder_id: botella.id, cylinder_number: botella.number, refrigerant: botella.refrigerant, kg: num(f.kg), technician: f.technician, notes: f.notes });
      toast.success('Movimiento registrado'); setF((p) => ({ ...p, kg: '', notes: '' })); recargar();
    } catch (e) { toast.error('No se pudo registrar', { description: String(e?.message || e) }); }
  };
  const lista = [...movimientos].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Tarjeta icono={Plus} titulo="Nueva operación" data-testid="nueva-operacion">
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Operación" obligatorio><Selector opciones={OPERACIONES_GAS} value={f.operation} onChange={(v) => setF({ ...f, operation: v })} vacio={null} data-prueba="op-operacion" /></Campo>
          <Campo etiqueta="Equipo" obligatorio={op?.pideEquipo}><Selector opciones={maquinas.map((m) => ({ value: m.id, label: m.name || m.model || m.id }))} value={f.machine_id} onChange={(v) => setF({ ...f, machine_id: v })} vacio="Elige el equipo" disabled={!op?.pideEquipo} data-prueba="op-equipo" /></Campo>
        </div>
        <Campo etiqueta="Botella" obligatorio><Selector opciones={botellas.filter((b) => b.status !== 'devuelta').map((b) => ({ value: b.id, label: `${b.number} · ${b.refrigerant} · ${saldoBotella(b, movimientos)} kg` }))} value={f.cylinder_id} onChange={(v) => setF({ ...f, cylinder_id: v })} vacio="Elige la botella" data-prueba="op-botella" /></Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Kilos" obligatorio><Entrada inputMode="decimal" value={f.kg} onChange={(e) => setF({ ...f, kg: e.target.value })} data-prueba="op-kilos" /></Campo>
          <Campo etiqueta="Técnico"><TechnicianSelect value={f.technician} onChange={(v) => setF({ ...f, technician: v })} placeholder="—" /></Campo>
        </div>
        <Campo etiqueta="Notas"><Entrada value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Campo>
        <div className="flex items-center gap-3"><Button onClick={registrar} data-testid="registrar-operacion">Registrar</Button><button type="button" className="text-xs text-primary hover:underline" onClick={irABotellas}>Dar de alta una botella</button></div>
      </Tarjeta>
      <Tarjeta icono={History} titulo="Registro de manipulación" data-testid="registro-movimientos">
        {lista.length === 0 ? <p className="text-sm text-muted-foreground">Sin movimientos.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th>Fecha</th><th>Operación</th><th>Equipo</th><th>Botella</th><th className="text-right">Kg</th><th>Técnico</th></tr></thead>
            <tbody>{lista.map((m) => <tr key={m.id} className="border-t"><td className="py-1">{fechaES(m.date)}</td><td>{operacionGas(m.operation)?.label || m.operation}</td><td>{m.machine_name || '—'}</td><td>{m.cylinder_number} · {m.refrigerant}</td><td className="text-right font-mono tabular-nums">{(operacionGas(m.operation)?.signo < 0 ? '−' : '+') + m.kg}</td><td>{m.technician || '—'}</td></tr>)}</tbody></table>)}
      </Tarjeta>
    </div>
  );
}

function Resumen({ botellas, movimientos }) {
  const anios = useMemo(() => { const s = new Set([String(new Date().getFullYear())]); movimientos.forEach((m) => m.date && s.add(String(m.date).slice(0, 4))); return [...s].sort().reverse(); }, [movimientos]);
  const [anio, setAnio] = useState(anios[0]);
  const r = resumenAnual(movimientos, botellas, anio);
  return (
    <div className="space-y-3" data-testid="resumen-anual">
      <div className="flex items-end gap-2"><Campo etiqueta="Año"><Selector opciones={anios} value={anio} onChange={setAnio} vacio={null} /></Campo><Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Imprimir</Button></div>
      <Tarjeta icono={FileBarChart} titulo={`Manipulación de gases fluorados · ${anio}`}>
        {r.filas.length === 0 ? <p className="text-sm text-muted-foreground">Sin movimientos en {anio}.</p> : (
          <table className="w-full text-sm"><thead><tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground"><th>Gas</th><th className="text-right">Cargado (kg)</th><th className="text-right">Recuperado (kg)</th><th className="text-right">Devuelto (kg)</th><th className="text-right">Movimientos</th></tr></thead>
            <tbody>{r.filas.map((g) => <tr key={g.gas} className="border-t"><td className="py-1 font-medium">{g.gas}</td><td className="text-right font-mono">{g.cargado}</td><td className="text-right font-mono">{g.recuperado}</td><td className="text-right font-mono">{g.devuelto}</td><td className="text-right font-mono">{g.movimientos}</td></tr>)}</tbody></table>)}
      </Tarjeta>
      <Tarjeta icono={Cylinder} titulo="Existencias en botellas">
        {r.existencias.length === 0 ? <p className="text-sm text-muted-foreground">No hay botellas en stock.</p> : <ul className="text-sm">{r.existencias.map((e) => <li key={e.gas} className="flex justify-between border-t py-1 first:border-t-0"><span>{e.gas}</span><span className="font-mono">{redondear(e.kg)} kg</span></li>)}</ul>}
      </Tarjeta>
      <p className="text-xs text-muted-foreground">Datos del registro de botellas de la empresa. Los controles de fugas de cada equipo están en su ficha (Reglamento (UE) 2024/573, art. 5).</p>
    </div>
  );
}

export default function GasesRefrigerantes() {
  const [tab, setTab] = useState('botellas');
  const [botellas, setBotellas] = useState([]); const [movimientos, setMovimientos] = useState([]); const [maquinas, setMaquinas] = useState([]); const [proveedores, setProveedores] = useState([]);
  const [botellaOp, setBotellaOp] = useState('');
  const cargar = useCallback(async () => {
    const seguro = (p) => p.then((x) => (Array.isArray(x) ? x : x?.items || [])).catch(() => []);
    const [b, m, mq, pv] = await Promise.all([seguro(base44.entities.RefrigerantCylinder.list()), seguro(base44.entities.GasMovement.list()), seguro(base44.entities.ClientMachine.list()), seguro(base44.entities.Supplier.list())]);
    setBotellas(b); setMovimientos(m); setMaquinas(mq); setProveedores(pv.map((s) => s.name).filter(Boolean));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const pestanas = [['botellas', Cylinder, 'Botellas'], ['registro', History, 'Registro de cargas'], ['resumen', FileBarChart, 'Resumen anual']];
  return (
    <div className="mx-auto max-w-6xl p-3 md:p-5" data-testid="gases-refrigerantes">
      <Cabecera titulo="Gases refrigerantes" descripcion="Botellas, cargas y recuperaciones, y el resumen anual de manipulación de gases fluorados." />
      <div className="mb-3 flex gap-1 border-b" role="tablist">{pestanas.map(([id, Icono, t]) => <button key={id} role="tab" aria-selected={tab === id} data-pestana={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${tab === id ? 'border-primary font-medium' : 'border-transparent text-muted-foreground'}`}><Icono className="h-4 w-4" />{t}</button>)}</div>
      {tab === 'botellas' && <Botellas botellas={botellas} movimientos={movimientos} proveedores={proveedores} recargar={cargar} irARegistro={(id) => { setBotellaOp(id); setTab('registro'); }} />}
      {tab === 'registro' && <Registro botellas={botellas} movimientos={movimientos} maquinas={maquinas} botellaInicial={botellaOp} recargar={cargar} irABotellas={() => setTab('botellas')} />}
      {tab === 'resumen' && <Resumen botellas={botellas} movimientos={movimientos} />}
    </div>
  );
}
