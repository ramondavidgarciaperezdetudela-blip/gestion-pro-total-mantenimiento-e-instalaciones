import React, { useState } from 'react';
import { Edit3, Eye, Trash2, ImageOff, Camera, ShieldCheck } from 'lucide-react';

/**
 * Galería visual de informes técnicos para aseguradoras.
 *
 * Muestra cada informe como una tarjeta con las miniaturas ANTES/DESPUÉS
 * en cuadrícula, de modo que se ve el trabajo de un vistazo antes de abrirlo.
 * Sin fotos, se enseña un hueco con el icono de cámara para que se note.
 */

const ESTADOS_COLOR = {
  borrador: { bg: 'hsl(0 0% 80%)', fg: 'hsl(0 0% 25%)' },
  enviado: { bg: 'hsl(43 90% 85%)', fg: 'hsl(43 80% 30%)' },
  firmado: { bg: 'hsl(142 70% 85%)', fg: 'hsl(142 70% 30%)' },
  cerrado: { bg: 'hsl(191 90% 85%)', fg: 'hsl(191 80% 30%)' },
  cancelado: { bg: 'hsl(0 72% 88%)', fg: 'hsl(0 72% 40%)' },
};

const ESTADOS_LABEL = {
  borrador: 'Borrador', enviado: 'Enviado', firmado: 'Firmado',
  cerrado: 'Cerrado', cancelado: 'Cancelado',
};

function Miniatura({ src, alt, etiqueta }) {
  const [rota, setRota] = useState(false);
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted))' }}>
      <span className="absolute top-1 left-1 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
        style={{ background: 'hsl(var(--background) / 0.85)', color: 'hsl(var(--foreground))' }}>
        {etiqueta}
      </span>
      {src && !rota ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setRota(true)}
          className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <ImageOff className="w-5 h-5 opacity-50" />
          <span className="text-[9px]">Sin foto</span>
        </div>
      )}
    </div>
  );
}

function TarjetaGaleria({ inf, onAbrir, onEditar, onEliminar }) {
  const antes = inf.photos_before || [];
  const despues = inf.photos_after || [];
  const dano = inf.photos_damage || [];
  const totalFotos = antes.length + despues.length + dano.length;

  const est = ESTADOS_COLOR[inf.status] || ESTADOS_COLOR.borrador;

  return (
    <div className="rounded-xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md"
      style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      {/* Cabecera: folio + estado */}
      <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'hsl(var(--primary))' }} />
          <span className="text-xs font-bold tabular truncate" style={{ color: 'hsl(var(--primary))' }}>
            {inf.report_number || 'S/N'}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: est.bg, color: est.fg }}>
          {ESTADOS_LABEL[inf.status] || inf.status}
        </span>
      </div>

      {/* Cuadrícula ANTES / DESPUÉS: hasta 2+2 miniaturas */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <Miniatura src={antes[0]} alt="Antes" etiqueta="Antes" />
          <Miniatura src={despues[0]} alt="Después" etiqueta="Después" />
          <Miniatura src={antes[1]} alt="Antes 2" etiqueta="Antes" />
          <Miniatura src={despues[1]} alt="Después 2" etiqueta="Después" />
        </div>
        {totalFotos > 4 && (
          <p className="text-[10px] mt-1.5 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
            +{totalFotos - 4} fotos más
          </p>
        )}
        {totalFotos === 0 && (
          <div className="flex items-center justify-center gap-1 py-2 text-[10px]" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Camera className="w-3 h-3" /> Sin fotos todavía
          </div>
        )}
      </div>

      {/* Pie: cliente + aseguradora + acciones */}
      <div className="mt-auto px-3 pb-3 space-y-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{inf.contact_name || 'Sin cliente'}</p>
          <p className="text-[11px] truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {inf.insurance_company || 'Sin aseguradora'}{inf.insurance_claim_ref ? ` · ${inf.insurance_claim_ref}` : ''}
          </p>
          <p className="text-[10px] mt-0.5 tabular" style={{ color: 'hsl(var(--muted-foreground))' }}>
            {inf.report_date || ''} · {inf.equipment_brand || inf.equipment_type || ''}
            {inf.signature_technician ? ' · Firmado' : ' · Sin firmar'}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onAbrir(inf)} className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded-lg"
            style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            <Eye className="w-3.5 h-3.5" /> Abrir
          </button>
          <button onClick={() => onEditar(inf)} className="p-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }} title="Editar">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onEliminar(inf)} className="p-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--destructive))' }} title="Eliminar">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GaleriaInformes({ informes, onAbrir, onEditar, onEliminar }) {
  if (!informes || informes.length === 0) {
    return (
      <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
        <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
        No hay informes con fotos para mostrar.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {informes.map((inf) => (
        <TarjetaGaleria key={inf.id} inf={inf} onAbrir={onAbrir} onEditar={onEditar} onEliminar={onEliminar} />
      ))}
    </div>
  );
}