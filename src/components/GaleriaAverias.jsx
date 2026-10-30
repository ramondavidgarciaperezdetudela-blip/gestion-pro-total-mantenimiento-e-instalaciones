import React, { useState } from 'react';
import { Edit3, Trash2, ImageOff, Camera, Wrench, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Galería visual del historial de averías frigoríficas.
 *
 * Muestra cada avería como una tarjeta con las miniaturas de sus fotos en
 * cuadrícula, de modo que se ve el estado del equipo de un vistazo antes de
 * abrirlo. Sin fotos, se enseña un hueco con el icono de cámara.
 */

const ESTADOS_COLOR = {
  reportada: { bg: 'hsl(0 72% 88%)', fg: 'hsl(0 72% 40%)' },
  en_reparacion: { bg: 'hsl(43 90% 85%)', fg: 'hsl(43 80% 30%)' },
  reparada: { bg: 'hsl(142 70% 85%)', fg: 'hsl(142 70% 30%)' },
  pendiente: { bg: 'hsl(191 90% 85%)', fg: 'hsl(191 80% 30%)' },
  cancelada: { bg: 'hsl(0 0% 88%)', fg: 'hsl(0 0% 40%)' },
};

const ESTADOS_LABEL = {
  reportada: 'Reportada', en_reparacion: 'En reparación', reparada: 'Reparada',
  pendiente: 'Pendiente', cancelada: 'Cancelada',
};

function Miniatura({ src, alt, etiqueta }) {
  const [rota, setRota] = useState(false);
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted))' }}>
      <span className="absolute top-1 left-1 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
        style={{ background: 'hsl(var(--background) / 0.85)', color: 'hsl(var(--foreground))' }}>
        {etiqueta}
      </span>
      {src && !rota ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setRota(true)}
          className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1"
          style={{ color: 'hsl(var(--muted-foreground))' }}>
          <ImageOff className="w-5 h-5 opacity-50" />
          <span className="text-[9px]">Sin foto</span>
        </div>
      )}
    </div>
  );
}

function TarjetaAveria({ av, onEditar, onEliminar }) {
  const fotos = av.photos || [];
  const est = ESTADOS_COLOR[av.status] || ESTADOS_COLOR.reportada;

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      {/* Cabecera: equipo + estado */}
      <div className="flex items-center justify-between gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Wrench className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(25 95% 53%)' }} />
          <span className="text-xs font-semibold truncate">
            {av.equipment_brand || av.equipment_type?.replace(/_/g, ' ') || 'Equipo'}
            {av.equipment_model ? ` ${av.equipment_model}` : ''}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: est.bg, color: est.fg }}>
          {ESTADOS_LABEL[av.status] || av.status}
        </span>
      </div>

      {/* Cuadrícula de fotos: hasta 4 miniaturas */}
      <div className="p-3">
        {fotos.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Miniatura key={i} src={fotos[i]} alt={`Foto ${i + 1}`} etiqueta={`Foto ${i + 1}`} />
              ))}
            </div>
            {fotos.length > 4 && (
              <p className="text-[10px] mt-1.5 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
                +{fotos.length - 4} fotos más
              </p>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center gap-1 py-6 text-[10px]"
            style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Camera className="w-3 h-3" /> Sin fotos todavía
          </div>
        )}
      </div>

      {/* Pie: cliente + fecha + acciones */}
      <div className="mt-auto px-3 pb-3 space-y-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{av.contact_name || 'Sin cliente'}</p>
          <p className="text-[11px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {av.failure_type?.replace(/_/g, ' ') || 'Avería'}
            {av.failure_date ? ` · ${format(new Date(av.failure_date), 'dd/MM/yyyy')}` : ''}
          </p>
          {(av.total_cost > 0 || av.repair_hours > 0) && (
            <p className="text-[10px] mt-0.5 tabular" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {av.total_cost > 0 && `${av.total_cost}€`}
              {av.total_cost > 0 && av.repair_hours > 0 && ' · '}
              {av.repair_hours > 0 && `${av.repair_hours}h`}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEditar(av)} className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg"
            style={{ background: 'hsl(25 95% 53%)', color: 'hsl(0 0% 100%)' }}>
            <Edit3 className="w-3.5 h-3.5" /> Editar
          </button>
          <button onClick={() => onEliminar(av)} className="p-1.5 rounded-lg border"
            style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--destructive))' }} title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GaleriaAverias({ averias, onEditar, onEliminar }) {
  if (!averias || averias.length === 0) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
        No hay averías con fotos para mostrar.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {averias.map((av) => (
        <TarjetaAveria key={av.id} av={av} onEditar={onEditar} onEliminar={onEliminar} />
      ))}
    </div>
  );
}