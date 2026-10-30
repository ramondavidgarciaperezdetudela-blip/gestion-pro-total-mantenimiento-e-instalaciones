import React from 'react';
import { Edit3, Trash2, FolderOpen, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

/**
 * Galería visual de proyectos.
 *
 * Los proyectos no llevan fotos, así que la galería es una cuadrícula de
 * tarjetas compactas: color por tipo, nombre, cliente, progreso, presupuesto
 * y días restantes. Sirve de vista panorámica rápida frente a la lista y el
 * kanban.
 */

const TYPE_COLORS = {
  clima: 'hsl(199 89% 48%)', refrigeracion: 'hsl(187 85% 43%)',
  electrico: 'hsl(43 96% 56%)', solar: 'hsl(38 92% 50%)', mixto: 'hsl(262 83% 58%)',
};

const STATUS_COLORS = {
  planificacion: { bg: 'hsl(220 14% 90%)', fg: 'hsl(220 9% 46%)' },
  en_curso: { bg: 'hsl(212 95% 85%)', fg: 'hsl(217 91% 40%)' },
  pausado: { bg: 'hsl(43 90% 85%)', fg: 'hsl(43 80% 30%)' },
  completado: { bg: 'hsl(142 70% 85%)', fg: 'hsl(142 70% 30%)' },
  cancelado: { bg: 'hsl(0 72% 88%)', fg: 'hsl(0 72% 40%)' },
};

const STATUS_LABEL = {
  planificacion: 'Planificación', en_curso: 'En curso', pausado: 'Pausado',
  completado: 'Completado', cancelado: 'Cancelado',
};

function TarjetaProyecto({ p, onEdit, onDelete }) {
  const daysLeft = p.end_date ? differenceInDays(parseISO(p.end_date), new Date()) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && p.status !== 'completado';
  const isUrgent = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && p.status === 'en_curso';
  const tasks = p.tasks || [];
  const tasksDone = tasks.filter(t => t.status === 'completada').length;
  const color = TYPE_COLORS[p.type] || 'hsl(220 14% 50%)';
  const est = STATUS_COLORS[p.status] || STATUS_COLORS.planificacion;

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      {/* Banda de color por tipo */}
      <div className="h-1.5" style={{ background: color }} />

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color }} />
            <p className="text-sm font-semibold truncate">{p.name}</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: est.bg, color: est.fg }}>
            {STATUS_LABEL[p.status] || p.status}
          </span>
        </div>

        {p.contact_name && (
          <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
            👤 {p.contact_name}
          </p>
        )}

        {/* Progreso */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <span className="tabular">{p.progress || 0}%</span>
            {tasks.length > 0 && <span>{tasksDone}/{tasks.length} tareas</span>}
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${p.progress || 0}%`, background: color }} />
          </div>
        </div>

        {/* Pie: presupuesto + fechas */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[10px]"
          style={{ color: 'hsl(var(--muted-foreground))' }}>
          {p.budget > 0 && (
            <span className="font-medium" style={{ color: 'hsl(142 70% 35%)' }}>
              {p.budget.toLocaleString('es-ES')} €
            </span>
          )}
          {daysLeft !== null && p.status !== 'completado' && (
            isOverdue ? (
              <span className="flex items-center gap-0.5 font-semibold" style={{ color: 'hsl(0 72% 50%)' }}>
                <AlertTriangle className="w-3 h-3" /> Vencido {Math.abs(daysLeft)}d
              </span>
            ) : isUrgent ? (
              <span className="font-semibold" style={{ color: 'hsl(25 95% 53%)' }}>
                {daysLeft === 0 ? 'Vence hoy' : `${daysLeft}d restantes`}
              </span>
            ) : (
              <span className="tabular">
                {p.end_date ? format(parseISO(p.end_date), 'dd/MM/yyyy') : ''}
              </span>
            )
          )}
          {p.status === 'completado' && (
            <span className="flex items-center gap-0.5" style={{ color: 'hsl(142 70% 35%)' }}>
              <CheckCircle2 className="w-3 h-3" /> Completado
            </span>
          )}
        </div>

        {/* Acciones */}
        <div className="flex gap-1 pt-1">
          <button onClick={() => onEdit(p)} className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg"
            style={{ background: color, color: 'hsl(0 0% 100%)' }}>
            <Edit3 className="w-3.5 h-3.5" /> Abrir
          </button>
          <button onClick={() => onDelete(p.id)} className="p-1.5 rounded-lg border"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--destructive))' }} title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GaleriaProyectos({ proyectos, onEdit, onDelete }) {
  if (!proyectos || proyectos.length === 0) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
        No hay proyectos para mostrar.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {proyectos.map((p) => (
        <TarjetaProyecto key={p.id} p={p} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}