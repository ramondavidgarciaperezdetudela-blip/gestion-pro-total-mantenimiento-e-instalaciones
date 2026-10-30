import React from 'react';
import {
  MousePointer2, Minus, Type, Ruler, Spline, Eraser, Square, Snowflake,
  Undo2, Redo2, Copy, Scissors, ClipboardPaste,
  Link2, Wind, Zap, PenLine,
} from 'lucide-react';

/**
 * PlanoBarraHerramientas — barra de dibujo y edición al estilo Paint.
 *
 * Tres bloques, como pide el instalador:
 *  - DIBUJO:   Seleccionar, Pared, Texto, Cota, Mano alzada y Borrador.
 *  - EDICIÓN:  Deshacer, Rehacer, Copiar, Cortar y Pegar.
 *  - CONEXIONES: Tubería, Conducto y Eléctrica.
 *
 * El estado activo de cada botón lo marca el `mode` y el `connectType` que
 * vienen de la página, así la barra es tonta: solo avisa de lo que se pulsa.
 * Las acciones de edición (deshacer/rehacer/copiar/cortar/pegar) se resuelven
 * en la página, que es quien tiene el historial y el portapapeles.
 */
export default function PlanoBarraHerramientas({
  mode, connectType, manual = false, onPick, onSala, onCamara,
  onUndo, onRedo, onCopy, onCut, onPaste,
  canUndo = true, canRedo = true, canCopy = false, canPaste = false,
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1.5">
      {/* ── DIBUJO ── */}
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Dibujo</span>
      <BotonHerr activo={mode === 'select'} onClick={() => onPick({ mode: 'select' })} icon={MousePointer2} label="Seleccionar" />
      <BotonHerr activo={mode === 'wall'} onClick={() => onPick({ mode: 'wall' })} icon={Minus} label="Pared" />
      {onSala && (
        <BotonHerr activo={false} onClick={onSala} icon={Square} label="Sala" color="#0ea5e9" />
      )}
      {onCamara && (
        <BotonHerr activo={false} onClick={onCamara} icon={Snowflake} label="Cámara" color="#3b82f6" />
      )}
      <BotonHerr activo={mode === 'text'} onClick={() => onPick({ mode: 'text' })} icon={Type} label="Texto" color="#64748b" />
      <BotonHerr activo={mode === 'cota'} onClick={() => onPick({ mode: 'cota' })} icon={Ruler} label="Cota" color="#64748b" />
      <BotonHerr activo={mode === 'trazo'} onClick={() => onPick({ mode: 'trazo' })} icon={Spline} label="Mano alzada" color="#64748b" />
      <BotonHerr activo={mode === 'eraser'} onClick={() => onPick({ mode: 'eraser' })} icon={Eraser} label="Borrar" color="#ef4444" />

      <Sep />

      {/* ── EDICIÓN ── */}
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Edición</span>
      <BotonAccion onClick={onUndo} disabled={!canUndo} icon={Undo2} label="Deshacer" />
      <BotonAccion onClick={onRedo} disabled={!canRedo} icon={Redo2} label="Rehacer" />
      <BotonAccion onClick={onCopy} disabled={!canCopy} icon={Copy} label="Copiar" />
      <BotonAccion onClick={onCut} disabled={!canCopy} icon={Scissors} label="Cortar" />
      <BotonAccion onClick={onPaste} disabled={!canPaste} icon={ClipboardPaste} label="Pegar" />

      <Sep />

      {/* ── CONEXIONES ── */}
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Conexiones</span>
      <BotonHerr activo={mode === 'connect' && connectType === 'refrigerante' && !manual}
        onClick={() => onPick({ mode: 'connect', connectType: 'refrigerante', manual: false })} icon={Link2} label="Tubería" color="#00A0E9" />
      <BotonHerr activo={mode === 'connect' && connectType === 'refrigerante' && manual} dato="tuberia-mano"
        onClick={() => onPick({ mode: 'connect', connectType: 'refrigerante', manual: true })} icon={PenLine} label="Tubería a mano" color="#00A0E9" />
      <BotonHerr activo={mode === 'connect' && connectType === 'conducto' && !manual}
        onClick={() => onPick({ mode: 'connect', connectType: 'conducto', manual: false })} icon={Wind} label="Conducto" color="#10b981" />
      <BotonHerr activo={mode === 'connect' && connectType === 'conducto' && manual} dato="conducto-mano"
        onClick={() => onPick({ mode: 'connect', connectType: 'conducto', manual: true })} icon={PenLine} label="Conducto a mano" color="#10b981" />
      <BotonHerr activo={mode === 'connect' && connectType === 'electrica' && !manual}
        onClick={() => onPick({ mode: 'connect', connectType: 'electrica', manual: false })} icon={Zap} label="Eléctrica" color="#F5821F" />
      <BotonHerr activo={mode === 'connect' && connectType === 'electrica' && manual} dato="cable-mano"
        onClick={() => onPick({ mode: 'connect', connectType: 'electrica', manual: true })} icon={PenLine} label="Cable a mano" color="#F5821F" />
    </div>
  );
}

function Sep() {
  return <div className="w-px h-7 bg-border mx-0.5" />;
}

function BotonHerr({ activo, onClick, icon: Icon, label, color, dato }) {
  return (
    <button
      onClick={onClick}
      title={label}
      data-prueba={dato}
      className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-all"
      style={{
        borderColor: activo ? (color || 'hsl(var(--primary))') : 'hsl(var(--border))',
        background: activo ? (color ? color + '22' : 'hsl(var(--primary) / 0.15)') : 'transparent',
        color: activo ? (color || 'hsl(var(--primary))') : 'hsl(var(--foreground))',
        fontWeight: activo ? 700 : 500,
      }}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}

function BotonAccion({ onClick, disabled, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-[11px] transition-all hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}