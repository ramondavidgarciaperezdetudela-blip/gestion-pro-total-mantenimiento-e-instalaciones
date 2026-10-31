import React, { useMemo, useState } from 'react';
import { ClipboardList, FileDown, FilePlus2, AlertOctagon, Clock, CheckCircle2, CircleDashed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { getNextAvailableNumber } from '@/components/autoNumber';
import { pendientes, construirOrden, ordenASAT } from '@/lib/ordenPreventivo';
import { construirPdfOrdenes } from '@/lib/ordenPreventivoPdf';
import { zonaClimaticaDe } from '@/lib/zonaClimatica';

/**
 * Generador de órdenes de mantenimiento preventivo: lista las máquinas que
 * tocan (vencidas, próximas), deja elegir cuáles y genera la hoja de trabajo
 * en PDF (una por página) o las crea como órdenes de SAT numeradas.
 */
const ESTILO = {
  vencida: { borde: 'border-calor/50', texto: 'text-calor', Icono: AlertOctagon, etiqueta: 'Vencida' },
  proxima: { borde: 'border-aviso/50', texto: 'text-aviso', Icono: Clock, etiqueta: 'Próxima' },
  ok: { borde: 'border-ok/40', texto: 'text-ok', Icono: CheckCircle2, etiqueta: 'Al día' },
  'sin-datos': { borde: 'border-border', texto: 'text-muted-foreground', Icono: CircleDashed, etiqueta: 'Sin periodicidad' },
};
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');

export default function GeneradorOrdenes({ machines, contacts, company, technicians = [] }) {
  const lista = useMemo(() => pendientes(machines), [machines]);
  const [sel, setSel] = useState({});
  const [tecnico, setTecnico] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const accionables = lista.filter((p) => p.estado === 'vencida' || p.estado === 'proxima');
  const marcadas = lista.filter((p) => sel[p.maquina.id]);

  const ordenesMarcadas = () => marcadas.map((p) => {
    const contacto = contacts.find((c) => c.id === p.maquina.contact_id);
    const hoy = new Date().toISOString().slice(0, 10);
    const fecha = p.proxima && p.proxima > hoy ? p.proxima : hoy;
    return construirOrden({ maquina: p.maquina, contacto, fecha, tecnico, zona: zonaClimaticaDe(contacto || {}) });
  });

  const descargarPdf = () => {
    if (!marcadas.length) return toast.error('Marca al menos una máquina');
    construirPdfOrdenes(ordenesMarcadas(), company || {}).save(`ordenes-preventivo-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(`${marcadas.length} hoja(s) de trabajo generada(s)`);
  };

  const crearSAT = async () => {
    if (!marcadas.length) return toast.error('Marca al menos una máquina');
    setOcupado(true);
    try {
      const existentes = (await base44.entities.SATOrder.list('-date', 1000)).map((x) => x.order_number || '');
      let creadas = 0;
      for (const o of ordenesMarcadas()) {
        const numero = getNextAvailableNumber(existentes);
        existentes.push(numero);
        await base44.entities.SATOrder.create({ ...ordenASAT(o), order_number: numero, status: 'pendiente' });
        creadas++;
      }
      toast.success(`${creadas} orden(es) de mantenimiento creada(s) en SAT`);
      setSel({});
    } catch (e) {
      console.error(e);
      toast.error('No se pudieron crear las órdenes en SAT');
    }
    setOcupado(false);
  };

  return (
    <section className="rounded-lg border bg-card p-3 space-y-3" data-testid="generador-ordenes">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><ClipboardList className="h-4 w-4" /> Generador de órdenes preventivas</h2>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{accionables.length} por hacer · {lista.length} equipos</p>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => setSel(Object.fromEntries(accionables.map((p) => [p.maquina.id, true])))} className="rounded border px-2 py-1 text-xs hover:bg-accent">Marcar pendientes</button>
          <button type="button" onClick={() => setSel({})} className="rounded border px-2 py-1 text-xs hover:bg-accent">Quitar marcas</button>
          {technicians.length > 0 && (
            <select value={tecnico} onChange={(e) => setTecnico(e.target.value)} aria-label="Técnico" className="rounded border bg-background px-2 py-1 text-xs">
              <option value="">Técnico…</option>
              {technicians.map((t) => { const n = typeof t === 'string' ? t : t.name; return <option key={n} value={n}>{n}</option>; })}
            </select>
          )}
          <button type="button" onClick={descargarPdf} disabled={!marcadas.length} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"><FileDown className="h-3 w-3" /> PDF ({marcadas.length})</button>
          <button type="button" onClick={crearSAT} disabled={!marcadas.length || ocupado} className="inline-flex items-center gap-1 rounded border border-ok/50 px-2 py-1 text-xs text-ok hover:bg-accent disabled:opacity-50">
            {ocupado ? <Loader2 className="h-3 w-3 animate-spin" /> : <FilePlus2 className="h-3 w-3" />} Crear en SAT
          </button>
        </div>
      </div>

      {lista.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No hay equipos registrados todavía.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => {
            const e = ESTILO[p.estado]; const Icono = e.Icono; const m = p.maquina;
            return (
              <label key={m.id} data-estado={p.estado} className={`flex cursor-pointer gap-2 rounded-md border bg-background p-2 ${e.borde} ${sel[m.id] ? 'ring-1 ring-primary' : ''}`}>
                <input type="checkbox" checked={!!sel[m.id]} onChange={(ev) => setSel((s) => ({ ...s, [m.id]: ev.target.checked }))} aria-label={`Marcar ${m.name || 'equipo'}`} className="mt-1" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{m.name || 'Equipo'}</span>
                    <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${e.texto}`}><Icono className="h-3 w-3" />{e.etiqueta}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.contact_name || '—'}{m.brand ? ` · ${m.brand}` : ''}</div>
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Toca</div><div className="font-mono text-xs tabular-nums">{fechaES(p.proxima)}</div></div>
                    <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.dias !== null && p.dias < 0 ? 'Retraso' : 'Faltan'}</div><div className={`font-mono text-xs tabular-nums ${e.texto}`}>{p.dias === null ? '—' : `${Math.abs(p.dias)} d`}</div></div>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </section>
  );
}
