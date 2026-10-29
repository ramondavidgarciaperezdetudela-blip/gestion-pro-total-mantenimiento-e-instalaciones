import React, { useState } from 'react';
import {
  MousePointer2, Minus, Link2, Zap, Wind, Type, Ruler, Spline,
  Save, FileDown, Box, Minimize2, Search,
} from 'lucide-react';
import { CATEGORIAS } from '@/lib/planoFrigorificoCatalogo';
import PlanoMenuEquipos from './PlanoMenuEquipos';

/**
 * PlanoBarraSuperior — barra de herramientas del editor a pantalla completa.
 *
 * Sustituye a la paleta lateral cuando se dibuja a pantalla completa: las
 * herramientas de dibujo y los menús de equipos (por categorías) van arriba,
 * en una sola fila que no necesita scroll, y el lienzo ocupa todo lo que
 * queda. Así se eliminan las distracciones pero todo sigue accesible.
 */
export default function PlanoBarraSuperior({
  mode, activeType, connectType, onPick,
  saving, onSave, onPDF, on3D, onExit,
}) {
  const [q, setQ] = useState('');

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
      {/* Fila 1: herramientas de dibujo + acciones */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Dibujo</span>
        <BotonHerr activo={mode === 'select'} onClick={() => onPick({ mode: 'select' })} icon={MousePointer2} label="Seleccionar" />
        <BotonHerr activo={mode === 'wall'} onClick={() => onPick({ mode: 'wall' })} icon={Minus} label="Pared" />
        <BotonHerr activo={mode === 'text'} onClick={() => onPick({ mode: 'text' })} icon={Type} label="Texto" color="#64748b" />
        <BotonHerr activo={mode === 'cota'} onClick={() => onPick({ mode: 'cota' })} icon={Ruler} label="Cota" color="#64748b" />
        <BotonHerr activo={mode === 'trazo'} onClick={() => onPick({ mode: 'trazo' })} icon={Spline} label="Mano alzada" color="#64748b" />
        <div className="w-px h-6 bg-border mx-0.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Conexiones</span>
        <BotonHerr activo={mode === 'connect' && connectType === 'refrigerante'}
          onClick={() => onPick({ mode: 'connect', connectType: 'refrigerante' })} icon={Link2} label="Tubería" color="#00A0E9" />
        <BotonHerr activo={mode === 'connect' && connectType === 'conducto'}
          onClick={() => onPick({ mode: 'connect', connectType: 'conducto' })} icon={Wind} label="Conducto" color="#10b981" />
        <BotonHerr activo={mode === 'connect' && connectType === 'electrica'}
          onClick={() => onPick({ mode: 'connect', connectType: 'electrica' })} icon={Zap} label="Eléctrica" color="#F5821F" />

        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={onPDF}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={on3D}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
            <Box className="w-3.5 h-3.5" /> Visor 3D
          </button>
          <button onClick={onExit}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white hover:opacity-90"
            style={{ background: '#0f172a' }}>
            <Minimize2 className="w-3.5 h-3.5" /> Salir
          </button>
        </div>
      </div>

      {/* Fila 2: menús de equipos por categoría + buscador */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Equipos</span>
        {CATEGORIAS.map((cat) => (
          <PlanoMenuEquipos key={cat.id} cat={cat} activeType={activeType} onPick={onPick} />
        ))}
        <div className="flex items-center gap-1 ml-auto rounded-md border border-border bg-input px-2 py-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
            className="bg-transparent text-xs outline-none w-28" />
        </div>
      </div>
    </div>
  );
}

function BotonHerr({ activo, onClick, icon: Icon, label, color }) {
  return (
    <button
      onClick={onClick}
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