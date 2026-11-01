import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Sparkles } from 'lucide-react';
import PlanoSimbolo from './PlanoSimbolo';
import MenuElegirVersion from './MenuElegirVersion';
import { ELEMENTOS, elementosPorCategoria } from '@/lib/planoFrigorificoCatalogo';

/**
 * PlanoMenuEquipos — menú desplegable de una categoría de equipos.
 *
 * En la pantalla completa la paleta lateral no cabe bien, así que las
 * familias de equipos se ponen arriba como menús: al pulsar se despliegan
 * sus máquinas con el símbolo y el nombre, y se elige la que se quiera
 * colocar. Así todo está accesible sin hacer scroll.
 */
export default function PlanoMenuEquipos({ cat, activeType, onPick, extraPorCat, iaIcons = {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // Cada equipo con su versión IA si la tiene, para poder elegir al colocar.
  const conIA = (el) => (iaIcons[el.id] ? { ...el, image_url: iaIcons[el.id] } : el);
  // El apartado «Iconos IA» junta las versiones IA de todo el catálogo con los
  // iconos propios; el resto de apartados, sus equipos + los personalizados.
  const items = cat.id === 'ia'
    ? [
        ...ELEMENTOS.filter((e) => iaIcons[e.id]).map(conIA),
        ...(extraPorCat?.ia || []),
      ]
    : [
        ...(elementosPorCategoria()[cat.id] || []).map(conIA),
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
            {items.map((el) => (
              <OpcionEquipo key={el.id} el={el} cat={cat} activo={activeType === el.id}
                onPick={(variant) => { onPick({ mode: 'place', element: variant || el }); setOpen(false); }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Opción de equipo dentro del menú desplegable. Si el equipo tiene icono IA,
// al pulsarlo aparece el menú para elegir la versión (estándar/IA); si no,
// se coloca el símbolo estándar directamente.
export function OpcionEquipo({ el, cat, activo, onPick }) {
  const [menu, setMenu] = useState(false);
  const pulsar = () => {
    if (el.image_url) setMenu((v) => !v);
    else onPick();
  };
  return (
    <div className="relative">
      <button
        onClick={pulsar}
        title={el.label}
        className="relative flex flex-col items-center gap-0.5 rounded-md border px-1 py-1 w-full max-w-[96px] transition-all hover:scale-[1.03]"
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
        {el.image_url && (
          <span className="absolute top-0.5 left-1 text-[7px] font-bold px-0.5 rounded leading-none flex items-center gap-0.5"
            style={{ color: '#7C3AED', background: '#7C3AED1a' }}>
            <Sparkles className="w-2 h-2" />IA
          </span>
        )}
        <svg viewBox="-40 -30 80 60" width="72" height="54" style={{ display: 'block' }}>
          <PlanoSimbolo el={{ ...el, type: el.id, id: 'm-' + el.id, datos: el.image_url ? { image_url: el.image_url } : {}, color: cat.color, w_m: el.w_m, h_m: el.h_m }} scale={48} mini />
        </svg>
        <span className="text-[9px] leading-tight text-center w-full truncate"
          style={{ color: activo ? cat.color : 'hsl(var(--foreground))', fontWeight: activo ? 700 : 500 }}>
          {el.label}
        </span>
      </button>
      {menu && el.image_url && (
        <MenuElegirVersion el={el} onChoose={onPick} onClose={() => setMenu(false)} />
      )}
    </div>
  );
}