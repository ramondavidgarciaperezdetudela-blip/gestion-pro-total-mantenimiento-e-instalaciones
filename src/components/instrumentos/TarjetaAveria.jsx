import React from 'react';
import { AlertOctagon, Wrench, CheckCircle2, Ban, Pencil, Trash2, Clock } from 'lucide-react';
import { resumenAveria, costePiezas } from '@/lib/averiasEstado';

/**
 * Tarjeta con micro-estados para una avería: borde fino, color semántico
 * (rojo / ámbar / verde), icono mínimo y rejilla densa de datos con etiquetas
 * pequeñas. Sustituye a las filas de tabla del historial.
 */
const ESTILO = {
  critico: { borde: 'border-calor/50', barra: 'bg-calor', texto: 'text-calor', Icono: AlertOctagon, pulso: true },
  aviso: { borde: 'border-aviso/50', barra: 'bg-aviso', texto: 'text-aviso', Icono: Wrench, pulso: false },
  ok: { borde: 'border-ok/40', barra: 'bg-ok', texto: 'text-ok', Icono: CheckCircle2, pulso: false },
  neutro: { borde: 'border-border', barra: 'bg-muted-foreground/40', texto: 'text-muted-foreground', Icono: Ban, pulso: false },
};

const Dato = ({ etiqueta, children }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</div>
    <div className="font-mono text-sm tabular-nums truncate">{children || '—'}</div>
  </div>
);

const fecha = (f) => { const d = f ? new Date(f) : null; return d && !isNaN(d) ? d.toLocaleDateString('es-ES') : null; };

export default function TarjetaAveria({ averia, onEditar, onEliminar, acciones }) {
  const r = resumenAveria(averia);
  const e = ESTILO[r.estado];
  const Icono = e.Icono;
  const piezas = costePiezas(averia);
  return (
    <article data-estado={r.estado} className={`relative overflow-hidden rounded-lg border bg-card ${e.borde} ${e.pulso ? 'pulso-critico' : ''}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${e.barra}`} aria-hidden />
      <div className="p-3 pl-4 space-y-2">
        <header className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight truncate">{[averia.equipment_brand, averia.equipment_model].filter(Boolean).join(' ') || 'Equipo sin identificar'}</h3>
            <p className="text-xs text-muted-foreground truncate">{averia.contact_name}{averia.serial_number ? ` · S/N ${averia.serial_number}` : ''}</p>
          </div>
          <span className={`inline-flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${e.texto}`}>
            <Icono className="h-3.5 w-3.5" /> {r.urgente && r.etiqueta !== 'Reparada' ? `${r.etiqueta} · urgente` : r.etiqueta}
          </span>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
          <Dato etiqueta="Tipo">{r.tipo}</Dato>
          <Dato etiqueta="Reportada">{fecha(averia.failure_date)}</Dato>
          <Dato etiqueta={r.abierta ? 'Abierta hace' : 'Tardó'}>{r.dias === null ? null : `${r.dias} d`}</Dato>
          <Dato etiqueta="Coste">{averia.total_cost > 0 ? `${Number(averia.total_cost).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €` : null}</Dato>
          {averia.technician && <Dato etiqueta="Técnico">{averia.technician}</Dato>}
          {averia.repair_hours > 0 && <Dato etiqueta="Horas">{averia.repair_hours} h</Dato>}
          {averia.repair_date && <Dato etiqueta="Reparada">{fecha(averia.repair_date)}</Dato>}
          {piezas > 0 && <Dato etiqueta="Piezas">{piezas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</Dato>}
        </div>

        {averia.description && <p className="text-sm"><span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Avería</span>{averia.description}</p>}
        {averia.diagnosis && <p className="text-sm"><span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Diagnóstico</span>{averia.diagnosis}</p>}
        {averia.solution && <p className="text-sm"><span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">Solución</span>{averia.solution}</p>}

        {averia.photos?.length > 0 && (
          <div className="flex gap-1">{averia.photos.slice(0, 4).map((p, i) => <img key={i} src={p} alt="Foto avería" className="h-10 w-14 rounded object-cover border" />)}</div>
        )}

        <footer className="flex items-center justify-between pt-1 border-t">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" />{averia.id ? `#${String(averia.id).slice(-6)}` : ''}</span>
          <div className="flex gap-1">
            {acciones}
            {onEditar && <button type="button" onClick={() => onEditar(averia)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"><Pencil className="h-3 w-3" /> Editar</button>}
            {onEliminar && <button type="button" onClick={() => onEliminar(averia)} aria-label="Eliminar avería" className="inline-flex items-center rounded border px-2 py-1 text-xs text-calor hover:bg-accent"><Trash2 className="h-3 w-3" /></button>}
          </div>
        </footer>
      </div>
    </article>
  );
}
