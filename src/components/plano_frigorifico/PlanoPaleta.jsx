import React from 'react';
import { MousePointer2, Minus, Thermometer, Zap, ShieldAlert, Box, Link2, Wind } from 'lucide-react';
import { CATEGORIAS, elementosPorCategoria } from '@/lib/planoFrigorificoCatalogo';

const CAT_ICON = {
  refrigeracion: Thermometer,
  clima: Wind,
  electrico: Zap,
  seguridad: ShieldAlert,
  estructura: Box,
};

// Paleta de herramientas y elementos colocables. Avisa al padre del modo
// activo ('select' | 'wall' | 'place' | 'connect') y, según el modo, del
// catálogo elegido o del tipo de conexión ('refrigerante' | 'electrica').
export default function PlanoPaleta({ mode, activeType, connectType, onPick }) {
  const porCat = elementosPorCategoria();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="tech-label mb-1.5 px-1">Herramientas</div>
        <div className="grid grid-cols-2 gap-1.5">
          <BotonHerr activo={mode === 'select'} onClick={() => onPick({ mode: 'select' })} icon={MousePointer2} label="Seleccionar" />
          <BotonHerr activo={mode === 'wall'} onClick={() => onPick({ mode: 'wall' })} icon={Minus} label="Pared" />
          <BotonHerr activo={mode === 'connect' && connectType === 'refrigerante'}
            onClick={() => onPick({ mode: 'connect', connectType: 'refrigerante' })} icon={Link2} label="Tubería" color="#00A0E9" />
          <BotonHerr activo={mode === 'connect' && connectType === 'electrica'}
            onClick={() => onPick({ mode: 'connect', connectType: 'electrica' })} icon={Zap} label="Eléctrica" color="#F5821F" />
        </div>
        <p className="text-[10px] text-muted-foreground px-1 mt-1 leading-tight">
          Pared: encadena puntos (Esc corta). Tubería/Eléctrica: clic en un equipo y luego en el destino.
        </p>
      </div>

      {CATEGORIAS.map((cat) => {
        // Con icono de reserva: una categoría nueva en el catálogo no puede
        // tumbar la pantalla por no tener su dibujo puesto aquí.
        const Icon = CAT_ICON[cat.id] || Box;
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

function BotonHerr({ activo, onClick, icon: Icon, label, color }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px] transition-all"
      style={{
        borderColor: activo ? (color || 'hsl(var(--primary))') : 'hsl(var(--border))',
        background: activo ? (color ? color + '22' : 'hsl(var(--primary) / 0.15)') : 'transparent',
        color: activo ? (color || 'hsl(var(--primary))') : 'hsl(var(--foreground))',
        fontWeight: activo ? 600 : 400,
      }}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
}