import React from 'react';
import { MousePointer2, Minus, Thermometer, Zap, ShieldAlert, Box } from 'lucide-react';
import { CATEGORIAS, elementosPorCategoria } from '@/lib/planoFrigorificoCatalogo';

const CAT_ICON = {
  refrigeracion: Thermometer,
  electrico: Zap,
  seguridad: ShieldAlert,
  estructura: Box,
};

// Paleta de herramientas y elementos colocables. Avisa al padre del modo
// activo ('select' | 'wall' | 'place') y, en 'place', del catálogo elegido.
export default function PlanoPaleta({ mode, activeType, onPick }) {
  const porCat = elementosPorCategoria();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="tech-label mb-1.5 px-1">Herramientas</div>
        <div className="grid grid-cols-2 gap-1.5">
          <BotonHerr
            activo={mode === 'select'}
            onClick={() => onPick({ mode: 'select' })}
            icon={MousePointer2} label="Seleccionar" />
          <BotonHerr
            activo={mode === 'wall'}
            onClick={() => onPick({ mode: 'wall' })}
            icon={Minus} label="Pared" />
        </div>
        <p className="text-[10px] text-muted-foreground px-1 mt-1 leading-tight">
          Pared: clic para empezar, clic siguiente punto, sigue encadenando. Esc para cortar.
        </p>
      </div>

      {CATEGORIAS.map((cat) => {
        const Icon = CAT_ICON[cat.id];
        const items = porCat[cat.id] || [];
        return (
          <div key={cat.id}>
            <div className="flex items-center gap-1.5 tech-label mb-1.5 px-1" style={{ color: cat.color }}>
              <Icon className="w-3 h-3" /> {cat.label}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {items.map((el) => (
                <button
                  key={el.id}
                  onClick={() => onPick({ mode: 'place', element: el })}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-all"
                  style={{
                    borderColor: mode === 'place' && activeType === el.id ? cat.color : 'hsl(var(--border))',
                    background: mode === 'place' && activeType === el.id ? cat.color + '22' : 'transparent',
                    color: mode === 'place' && activeType === el.id ? cat.color : 'hsl(var(--foreground))',
                    fontWeight: mode === 'place' && activeType === el.id ? 600 : 400,
                  }}
                >
                  <span className="font-mono font-bold text-[10px]" style={{ color: cat.color }}>{el.glyph}</span>
                  <span className="truncate">{el.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BotonHerr({ activo, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-all"
      style={{
        borderColor: activo ? 'hsl(var(--primary))' : 'hsl(var(--border))',
        background: activo ? 'hsl(var(--primary) / 0.15)' : 'transparent',
        color: activo ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
        fontWeight: activo ? 600 : 400,
      }}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}