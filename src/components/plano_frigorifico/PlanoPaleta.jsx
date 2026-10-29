import React, { useState } from 'react';
import {
  MousePointer2, Minus, Link2, Zap, Wind, Thermometer, ShieldAlert, Box,
  ChevronDown, Search, Type, Ruler, Spline, Eraser, Boxes,
} from 'lucide-react';
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

// Paleta del plano: símbolos organizados por familia, todos visibles a la vez.
// Cada botón va con el dibujo realista GRANDE (para leer el símbolo y su
// descripción) y el código corto de la máquina en una esquina. Refrigeración
// en cian frío y climatización en ámbar cálido, para distinguirlas a primera
// vista.
//
// La barra de herramientas de dibujo incluye además de Pared y Conexiones:
// Texto (notas), Cota (línea de medida) y Mano alzada (trazo libre), que
// faltaban para hacer un plano completo.
export default function PlanoPaleta({ mode, activeType, connectType, onPick }) {
  const [abierta, setAbierta] = useState(() => Object.fromEntries(CATEGORIAS.map((c) => [c.id, true])));
  const [q, setQ] = useState('');
  const porCat = elementosPorCategoria();
  const resultados = q ? buscar(q) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* Barra de herramientas de dibujo */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1.5">
        <BotonHerr activo={mode === 'select'} onClick={() => onPick({ mode: 'select' })} icon={MousePointer2} label="Seleccionar" />
        <BotonHerr activo={mode === 'wall'} onClick={() => onPick({ mode: 'wall' })} icon={Minus} label="Pared" />
        <BotonHerr activo={mode === 'text'} onClick={() => onPick({ mode: 'text' })} icon={Type} label="Texto" color="#64748b" />
        <BotonHerr activo={mode === 'cota'} onClick={() => onPick({ mode: 'cota' })} icon={Ruler} label="Cota" color="#64748b" />
        <BotonHerr activo={mode === 'trazo'} onClick={() => onPick({ mode: 'trazo' })} icon={Spline} label="Mano alzada" color="#64748b" />
        <div className="w-px h-6 bg-border mx-0.5" />
        <BotonHerr activo={mode === 'connect' && connectType === 'refrigerante'}
          onClick={() => onPick({ mode: 'connect', connectType: 'refrigerante' })} icon={Link2} label="Tubería" color="#00A0E9" />
        <BotonHerr activo={mode === 'connect' && connectType === 'conducto'}
          onClick={() => onPick({ mode: 'connect', connectType: 'conducto' })} icon={Wind} label="Conducto" color="#10b981" />
        <BotonHerr activo={mode === 'connect' && connectType === 'electrica'}
          onClick={() => onPick({ mode: 'connect', connectType: 'electrica' })} icon={Zap} label="Eléctrica" color="#F5821F" />
        <div className="flex items-center gap-1 ml-auto rounded-md border border-border bg-input px-2 py-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar equipo…"
            className="bg-transparent text-xs outline-none w-36" />
        </div>
      </div>

      {/* Resultados de búsqueda */}
      {resultados ? (
        <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-border bg-muted/30">
          {resultados.length === 0 && <span className="text-xs text-muted-foreground p-1">Nada encontrado</span>}
          {resultados.map((el) => (
            <BotonEquipo key={el.id} el={el} activo={mode === 'place' && activeType === el.id}
              onClick={() => onPick({ mode: 'place', element: el })} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {CATEGORIAS.map((cat) => {
            const Icon = CAT_ICON[cat.id] || Box;
            const items = porCat[cat.id] || [];
            if (!items.length) return null;
            const open = abierta[cat.id];
            return (
              <div key={cat.id} className="rounded-lg border overflow-hidden" style={{ borderColor: cat.color + '55' }}>
                <button
                  onClick={() => setAbierta((a) => ({ ...a, [cat.id]: !a[cat.id] }))}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors"
                  style={{ color: cat.color, background: cat.color + '1a' }}>
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{cat.label}</span>
                  <span className="text-[10px] font-normal opacity-70 flex items-center gap-0.5">
                    <Boxes className="w-3 h-3" />{items.length}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="flex flex-wrap gap-2 p-2 bg-card/40">
                    {items.map((el) => (
                      <BotonEquipo key={el.id} el={el} activo={mode === 'place' && activeType === el.id}
                        onClick={() => onPick({ mode: 'place', element: el })} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BotonEquipo({ el, activo, onClick }) {
  const color = CAT_COLOR(el.cat);
  return (
    <button
      onClick={onClick}
      title={el.label}
      className="relative flex flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 w-[104px] transition-all hover:scale-[1.03]"
      style={{
        borderColor: activo ? color : 'hsl(var(--border))',
        background: activo ? color + '22' : 'transparent',
        borderTopColor: color,
        borderTopWidth: 3,
        boxShadow: activo ? `0 0 0 2px ${color}55` : 'none',
      }}
    >
      {/* Código corto de la máquina, como pista rápida de identificación */}
      {el.glyph && (
        <span className="absolute top-1 right-1.5 text-[9px] font-bold px-1 rounded leading-none"
          style={{ color, background: color + '1a' }}>{el.glyph}</span>
      )}
      <svg viewBox="-40 -30 80 60" width="84" height="62" style={{ display: 'block' }}>
        <PlanoSimbolo el={{ ...el, type: el.id, id: 'pal-' + el.id, datos: {}, color, w_m: el.w_m, h_m: el.h_m }} scale={52} mini />
      </svg>
      <span className="text-[10px] leading-tight text-center w-full"
        style={{ color: activo ? color : 'hsl(var(--foreground))', fontWeight: activo ? 700 : 500 }}>
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
        fontWeight: activo ? 700 : 500,
      }}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}