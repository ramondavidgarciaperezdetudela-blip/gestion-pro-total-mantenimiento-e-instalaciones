import React, { useCallback, useEffect, useState } from 'react';
import { Gauge, Plus, Save, Trash2, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import TechnicianSelect from '@/components/TechnicianSelect';
import FotoFicha from '@/components/FotoFicha';
import { Tarjeta, Campo, Entrada, Selector, AreaTexto, Cabecera, Kpi, fechaES } from '@/components/taller/Ficha';
import { estadoCalibracion, proximaCalibracion } from '@/lib/taller';

const TIPOS = ['Analizador digital 4 vías', 'Manómetros', 'Termómetro', 'Pinza amperimétrica', 'Multímetro', 'Bomba de vacío', 'Vacuómetro', 'Detector de fugas', 'Báscula de gas', 'Anemómetro', 'Otro'];
const ESTADOS = [{ value: 'operativo', label: 'Operativo' }, { value: 'en_calibracion', label: 'En calibración' }, { value: 'averiado', label: 'Averiado' }, { value: 'baja', label: 'Baja' }];
const VACIO = { name: '', type: '', brand: '', model: '', serial: '', assigned_to: '', purchase_date: '', status: 'operativo', last_calibration: '', interval_months: 12, certificate_no: '', notes: '', photo_url: '' };
const num = (v) => { const x = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(x) ? x : null; };

function Formulario({ inicial, onCancel, onGuardar }) {
  const [f, setF] = useState({ ...VACIO, ...inicial });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e?.target ? e.target.value : e }));
  const guardar = () => {
    if (!f.name.trim()) { toast.error('Indica el nombre del instrumento.'); return; }
    if (!(num(f.interval_months) > 0)) { toast.error('Indica cada cuántos meses se calibra.'); return; }
    onGuardar({ ...f, name: f.name.trim(), interval_months: num(f.interval_months) });
  };
  return (
    <div data-testid="formulario-instrumento">
      <Cabecera migas={[{ texto: 'Instrumentos', onClick: onCancel }, { texto: inicial?.id ? 'Editar' : 'Nuevo' }]} titulo={inicial?.id ? f.name : 'Nuevo instrumento'}
        acciones={<><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={guardar} data-testid="guardar-instrumento"><Save className="mr-1 h-4 w-4" />{inicial?.id ? 'Guardar cambios' : 'Añadir instrumento'}</Button></>} />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Tarjeta titulo="Instrumento">
          <FotoFicha value={f.photo_url} onChange={(u) => setF((p) => ({ ...p, photo_url: u }))} etiqueta="Foto del instrumento" icono={Gauge} tamano="h-24 w-32" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Campo etiqueta="Nombre" obligatorio><Entrada value={f.name} onChange={set('name')} placeholder="Analizador digital 4 vías" data-prueba="inst-nombre" /></Campo>
            <Campo etiqueta="Tipo"><Selector opciones={TIPOS} value={f.type} onChange={set('type')} /></Campo>
          </div>
          <div className="grid grid-cols-3 gap-3"><Campo etiqueta="Marca"><Entrada value={f.brand} onChange={set('brand')} /></Campo><Campo etiqueta="Modelo"><Entrada value={f.model} onChange={set('model')} /></Campo><Campo etiqueta="Nº de serie"><Entrada value={f.serial} onChange={set('serial')} /></Campo></div>
          <div className="grid grid-cols-3 gap-3"><Campo etiqueta="Asignado a"><TechnicianSelect value={f.assigned_to} onChange={(v) => setF((p) => ({ ...p, assigned_to: v }))} placeholder="—" /></Campo><Campo etiqueta="Fecha de compra"><Entrada type="date" value={f.purchase_date} onChange={set('purchase_date')} /></Campo><Campo etiqueta="Estado" obligatorio><Selector opciones={ESTADOS} value={f.status} onChange={set('status')} vacio={null} /></Campo></div>
        </Tarjeta>
        <Tarjeta titulo="Calibración">
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="Última calibración"><Entrada type="date" value={f.last_calibration} onChange={set('last_calibration')} data-prueba="inst-ultima" /></Campo>
            <Campo etiqueta="Cada (meses)" obligatorio><Entrada inputMode="decimal" value={f.interval_months} onChange={set('interval_months')} data-prueba="inst-meses" /></Campo>
            <Campo etiqueta="Nº certificado de calibración"><Entrada value={f.certificate_no} onChange={set('certificate_no')} /></Campo>
          </div>
          <p className="text-xs text-muted-foreground">Próxima calibración: <strong data-testid="inst-proxima">{fechaES(proximaCalibracion(f)) || '—'}</strong></p>
          <Campo etiqueta="Notas"><AreaTexto rows={5} value={f.notes} onChange={set('notes')} /></Campo>
        </Tarjeta>
      </div>
    </div>
  );
}

export default function InstrumentosTaller() {
  const [items, setItems] = useState([]); const [edit, setEdit] = useState(null);
  const cargar = useCallback(async () => { const x = await base44.entities.Instrument.list().catch(() => []); setItems(Array.isArray(x) ? x : x?.items || []); }, []);
  useEffect(() => { cargar(); }, [cargar]);
  const guardar = async (d) => {
    try { if (d.id) { const { id, ...r } = d; await base44.entities.Instrument.update(id, r); } else await base44.entities.Instrument.create(d); toast.success('Instrumento guardado'); setEdit(null); cargar(); }
    catch (e) { toast.error('No se pudo guardar', { description: String(e?.message || e) }); }
  };
  const borrar = async (i) => { if (confirm(`¿Borrar «${i.name}»?`)) { await base44.entities.Instrument.delete(i.id); cargar(); } };
  const calibrar = async (i) => { const hoy = new Date().toISOString().slice(0, 10); await base44.entities.Instrument.update(i.id, { last_calibration: hoy }); toast.success('Calibración registrada hoy'); cargar(); };
  if (edit) return <div className="mx-auto max-w-6xl p-3 md:p-5"><Formulario inicial={edit.id ? edit : null} onCancel={() => setEdit(null)} onGuardar={guardar} /></div>;
  const estados = items.map((i) => estadoCalibracion(i));
  const color = { vencida: 'text-red-600', proxima: 'text-amber-600', ok: 'text-emerald-600', 'sin-fecha': 'text-muted-foreground' };
  const etiqueta = { vencida: 'Vencida', proxima: 'Próxima', ok: 'Vigente', 'sin-fecha': 'Sin calibrar' };
  return (
    <div className="mx-auto max-w-6xl p-3 md:p-5" data-testid="instrumentos">
      <Cabecera titulo="Instrumentos" descripcion="Equipos de medida del taller y vigencia de su calibración." acciones={<Button onClick={() => setEdit({})} data-testid="nuevo-instrumento"><Plus className="mr-1 h-4 w-4" />Añadir instrumento</Button>} />
      <div className="mb-3 grid grid-cols-3 gap-2"><Kpi etiqueta="Instrumentos" valor={items.length} /><Kpi etiqueta="Calibración vencida" valor={estados.filter((e) => e === 'vencida').length} tono={estados.includes('vencida') ? 'mal' : 'ok'} /><Kpi etiqueta="Vencen en 30 días" valor={estados.filter((e) => e === 'proxima').length} tono={estados.includes('proxima') ? 'aviso' : 'ok'} /></div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">No hay instrumentos. Añade el primero.</p>}
        {items.map((i, k) => (
          <Tarjeta key={i.id} data-instrumento={i.name}>
            <div className="flex items-center gap-3">
              {i.photo_url ? <img src={i.photo_url} alt="" className="h-14 w-14 rounded-md object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted"><Gauge className="h-6 w-6 text-muted-foreground" /></div>}
              <div className="min-w-0 flex-1"><div className="truncate font-semibold">{i.name}</div><div className="text-xs text-muted-foreground">{[i.brand, i.model, i.serial && `S/N ${i.serial}`, i.assigned_to].filter(Boolean).join(' · ')}</div></div>
              <div className="text-right text-xs"><div className={`font-medium ${color[estados[k]]}`} data-estado={estados[k]}>{etiqueta[estados[k]]}</div><div className="text-muted-foreground">Próxima: {fechaES(proximaCalibracion(i)) || '—'}</div></div>
              <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => calibrar(i)} title="Calibrado hoy"><CalendarCheck className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => setEdit(i)}>Editar</Button><Button size="sm" variant="ghost" onClick={() => borrar(i)} aria-label="Borrar"><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
            </div>
          </Tarjeta>
        ))}
      </div>
    </div>
  );
}
