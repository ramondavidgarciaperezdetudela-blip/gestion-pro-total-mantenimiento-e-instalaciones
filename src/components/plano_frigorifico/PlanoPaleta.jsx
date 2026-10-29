import React, { useState } from 'react';
import { MousePointer2, Minus, Link2, Zap, Wind, Thermometer, ShieldAlert, Box, ChevronDown, Search } from 'lucide-react';
import { CATEGORIAS, elementosPorCategoria, buscar } from '@/lib/planoFrigorificoCatalogo';
import PlanoSimbolo from './PlanoSimbolo';

const CAT_ICON = {
  refrigeracion: Thermometer,
  clima: Wind,
  ventilacion: Wind,
  electrico: Zap,
  seguridad: ShieldAlert,
  estructura: Box,
};

// Paleta superior: dibujos organizados por categorías, con todos los tipos
// de maquinaria. Se pliega por categoría para no ocupar toda la pantalla y
// cada elemento muestra su símbolo realista en miniatura (la leyenda se ve
// al colocar el plano). Las herramientas van a la izquierda.
export default function PlanoPaleta({ mode, activeType, connectType, onPick }) {
  const [abierta, setAbierta] = useState(() => Object.fromEntries(CATEGORIAS.map((c) => [c.id, c.id === 'refrigeracion' || c.id === 'ventilacion'])));
  const [q, setQ] = useState('');
  const porCat = elementosPorCategoria();
  const resultados = q ? buscar(q) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Herramientas + buscador */}
      <div className="flex flex-wrap items-center gap-1.5">
        <BotonHerr activo={mode === 'select'} onClick={() => onPick({ mode: 'select' })} icon={MousePointer2} label="Seleccionar" />
        <BotonHerr activo={mode === 'wall'} onClick={() => onPick({ mode: 'wall' })} icon={Minus} label="Pared" />
        <BotonHerr activo={mode === 'connect' && connectType === 'refrigerante'}
          onClick={() => onPick({ mode: 'connect', connectType: 'refrigerante' })} icon={Link2} label="Tubería" color="#00A0E9" />
        <BotonHerr activo={mode === 'connect' && connectType === 'conducto'}
          onClick={() => onPick({ mode: 'connect', connectType: 'conducto' })} icon={Wind} label="Conducto" color="#10b981" />
        <BotonHerr activo={mode === 'connect' && connectType === 'electrica'}
          onClick={() => onPick({ mode: 'connect', connectType: 'electrica' })} icon={Zap} label="Eléctrica" color="#F5821F" />
        <div className="flex items-center gap-1 ml-1 rounded-md border border-border bg-input px-2 py-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar equipo…"
            className="bg-transparent text-xs outline-none w-40" />
        </div>
        <span className="text-[10px] text-muted-foreground ml-auto hidden sm:block">
          Pared: encadena puntos (Esc corta) · Conexiones: clic en un equipo y luego en el destino
        </span>
      </div>

      {/* Resultados de búsqueda */}
      {resultados ? (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-border bg-muted/30">
          {resultados.length === 0 && <span className="text-xs text-muted-foreground p-1">Nada encontrado</span>}
          {resultados.map((el) => (
            <BotonEquipo key={el.id} el={el} activo={mode === 'place' && activeType === el.id}
              onClick={() => onPick({ mode: 'place', element: el })} />
          ))}
        </div>
      ) : (
        CATEGORIAS.map((cat) => {
          const Icon = CAT_ICON[cat.id] || Box;
          const items = porCat[cat.id] || [];
          if (!items.length) return null;
          const open = abierta[cat.id];
          return (
            <div key={cat.id} className="rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setAbierta((a) => ({ ...a, [cat.id]: !a[cat.id] }))}
                className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold transition-colors hover:bg-muted"
                style={{ color: cat.color, background: cat.color + '11' }}>
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1 text-left">{cat.label}</span>
                <span className="text-[10px] font-normal text-muted-foreground">{items.length}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="flex flex-wrap gap-1.5 p-2">
                  {items.map((el) => (
                    <BotonEquipo key={el.id} el={el} activo={mode === 'place' && activeType === el.id}
                      onClick={() => onPick({ mode: 'place', element: el })} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function BotonEquipo({ el, activo, onClick }) {
  return (
    <button
      onClick={onClick}
      title={el.label}
      className="flex flex-col items-center gap-1 rounded-md border px-1.5 py-1.5 w-[88px] transition-all"
      style={{
        borderColor: activo ? (CAT_COLOR(el.cat)) : 'hsl(var(--border))',
        background: activo ? CAT_COLOR(el.cat) + '22' : 'transparent',
      }}
    >
      <svg viewBox="-30 -22 60 44" width="58" height="40" style={{ display: 'block' }}>
        <PlanoSimbolo el={{ ...el, type: el.id, id: 'pal-' + el.id, datos: {}, color: CAT_COLOR(el.cat), w_m: el.w_m, h_m: el.h_m }} scale={42} mini />
      </svg>
      <span className="text-[9px] leading-tight text-center truncate w-full" style={{ color: activo ? CAT_COLOR(el.cat) : 'hsl(var(--foreground))', fontWeight: activo ? 600 : 400 }}>
        {el.label}
      </span>
    </button>
  );
}

function CAT_COLOR(cat) {
  return CATEGORIAS.find((c) => c.id === cat)?.color || '#888';
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