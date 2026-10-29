import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import PlanoSimbolo from './PlanoSimbolo';
import { elementosPorCategoria } from '@/lib/planoFrigorificoCatalogo';

/**
 * PlanoMenuEquipos — menú desplegable de una categoría de equipos.
 *
 * En la pantalla completa la paleta lateral no cabe bien, así que las
 * familias de equipos se ponen arriba como menús: al pulsar se despliegan
 * sus máquinas con el símbolo y el nombre, y se elige la que se quiera
 * colocar. Así todo está accesible sin hacer scroll.
 */
export default function PlanoMenuEquipos({ cat, activeType, onPick, extraPorCat }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // Equipos de fábrica + los personalizados que el usuario haya añadido a
  // este apartado.
  const items = [
    ...(elementosPorCategoria()[cat.id] || []),
    ...(extraPorCat?.[cat.id] || []),
  ];

  // Cerrar al pulsar fuera.
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    window.addEventListener('pointerdown', h);
    return () => window.removeEventListener('pointerdown', h);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all"
        style={{
          borderColor: open ? cat.color : cat.color + '66',
          color: open ? cat.color : 'hsl(var(--foreground))',
          background: open ? cat.color + '22' : cat.color + '0d',
        }}
      >
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
        {cat.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-2xl p-2"
          style={{ width: 'max-content', maxWidth: '90vw' }}>
          <div className="grid grid-cols-3 gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
            {items.map((el) => {
              const activo = activeType === el.id;
              return (
                <button key={el.id}
                  onClick={() => { onPick({ mode: 'place', element: el }); setOpen(false); }}
                  title={el.label}
                  className="relative flex flex-col items-center gap-0.5 rounded-md border px-1 py-1 w-[96px] transition-all hover:scale-[1.03]"
                  style={{
                    borderColor: activo ? cat.color : 'hsl(var(--border))',
                    background: activo ? cat.color + '22' : 'transparent',
                    borderTopColor: cat.color, borderTopWidth: 2,
                  }}
                >
                  {el.glyph && (
                    <span className="absolute top-0.5 right-1 text-[8px] font-bold px-0.5 rounded leading-none"
                      style={{ color: cat.color, background: cat.color + '1a' }}>{el.glyph}</span>
                  )}
                  <svg viewBox="-40 -30 80 60" width="72" height="54" style={{ display: 'block' }}>
                    <PlanoSimbolo el={{ ...el, type: el.id, id: 'm-' + el.id, datos: {}, color: cat.color, w_m: el.w_m, h_m: el.h_m }} scale={48} mini />
                  </svg>
                  <span className="text-[9px] leading-tight text-center w-full truncate"
                    style={{ color: activo ? cat.color : 'hsl(var(--foreground))', fontWeight: activo ? 700 : 500 }}>
                    {el.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}