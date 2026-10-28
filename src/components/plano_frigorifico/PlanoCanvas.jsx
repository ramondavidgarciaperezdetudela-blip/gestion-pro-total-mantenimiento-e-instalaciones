import React, { useRef, useState, useEffect } from 'react';

// Lienzo SVG del diseñador de planos frigoríficos.
//
// Permite dibujar paredes encadenando segmentos (sin obligar a una habitación
// cuadrada ni a un mínimo de 1x1 m), colocar equipos/aparamenta/seguridad
// pinchando del catálogo, y seleccionar/mover/borrar lo colocado.
//
// Es un componente controlado: el estado lo mantiene la página y se avisa vía
// onChange con parches parciales ({walls?, elements?, selectedId?}).

export const CANVAS_W = 1400;
export const CANVAS_H = 900;
const GRID = 20;      // rejilla menor (px)
const MAJOR = 100;     // rejilla mayor (px)

function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export default function PlanoCanvas({ walls, elements, selectedId, mode, activeElement, scale = 50, onChange }) {
  const svgRef = useRef(null);
  const [mouse, setMouse] = useState(null);
  const [wallStart, setWallStart] = useState(null);
  const [drag, setDrag] = useState(null);

  const toSvg = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    return { x: Math.round(x), y: Math.round(y) };
  };
  const snap = (v) => Math.round(v / GRID) * GRID;

  const handleDown = (e) => {
    const p = toSvg(e); p.x = snap(p.x); p.y = snap(p.y);
    if (mode === 'wall') {
      if (!wallStart) { setWallStart(p); }
      else {
        // compromiso del segmento y encadena desde el extremo recién puesto
        onChange({ walls: [...walls, { id: crypto.randomUUID(), x1: wallStart.x, y1: wallStart.y, x2: p.x, y2: p.y }] });
        setWallStart(p);
      }
      return;
    }
    if (mode === 'select') {
      // hit-test elementos (de arriba abajo)
      const hit = [...elements].reverse().find((el) => {
        const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
        const x0 = el.x - w / 2, y0 = el.y - h / 2;
        return p.x >= x0 && p.x <= x0 + w && p.y >= y0 && p.y <= y0 + h;
      });
      if (hit) {
        onChange({ selectedId: hit.id });
        setDrag({ id: hit.id, ox: p.x - hit.x, oy: p.y - hit.y });
        return;
      }
      // si no, paredes
      const wall = walls.find((w) => distSeg(p.x, p.y, w.x1, w.y1, w.x2, w.y2) < 8);
      if (wall) { onChange({ selectedId: wall.id }); return; }
      onChange({ selectedId: null });
      return;
    }
    // colocación de elemento
    const def = activeElement;
    if (!def) return;
    const el = {
      id: crypto.randomUUID(), type: def.id, cat: def.cat, label: def.label,
      glyph: def.glyph, color: def.color || '#888',
      x: p.x, y: p.y, w_m: def.w_m, h_m: def.h_m,
      brand: '', model: '', notes: '', qty: 1,
    };
    onChange({ elements: [...elements, el], selectedId: el.id });
  };

  const handleMove = (e) => {
    if (e.buttons === 0 && drag) { setDrag(null); return; }
    const p = toSvg(e); p.x = snap(p.x); p.y = snap(p.y);
    setMouse(p);
    if (drag) {
      const els = elements.map((el) => el.id === drag.id ? { ...el, x: p.x - drag.ox, y: p.y - drag.oy } : el);
      onChange({ elements: els });
    }
  };

  const handleUp = () => { if (drag) setDrag(null); };

  // Esc cancela la cadena de paredes y suelta la selección
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') { setWallStart(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const m = (px) => (px / scale).toFixed(2);

  return (
    <div className="overflow-auto rounded-lg border border-border bg-card" style={{ maxHeight: '70vh' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ width: '100%', minWidth: 720, height: '70vh', display: 'block', touchAction: 'none', cursor: mode === 'wall' ? 'crosshair' : mode === 'select' ? 'default' : 'copy' }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
      >
        <defs>
          <pattern id="pf-grid-min" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
            <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.4" />
          </pattern>
          <pattern id="pf-grid-maj" width={MAJOR} height={MAJOR} patternUnits="userSpaceOnUse">
            <rect width={MAJOR} height={MAJOR} fill="url(#pf-grid-min)" />
            <path d={`M ${MAJOR} 0 L 0 0 0 ${MAJOR}`} fill="none" stroke="hsl(var(--border))" strokeWidth="1.4" opacity="0.8" />
          </pattern>
        </defs>
        <rect width={CANVAS_W} height={CANVAS_H} fill="url(#pf-grid-maj)" />

        {/* Paredes */}
        {walls.map((w) => {
          const sel = w.id === selectedId;
          const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
          const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
          return (
            <g key={w.id}>
              <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={sel ? '#00D4FF' : '#cbd5e1'} strokeWidth={sel ? 7 : 5} strokeLinecap="round" />
              <text x={mx} y={my - 6} textAnchor="middle" fontSize="11" fill="hsl(var(--muted-foreground))" style={{ pointerEvents: 'none' }}>{m(len)} m</text>
            </g>
          );
        })}

        {/* Elementos colocados */}
        {elements.map((el) => {
          const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
          const sel = el.id === selectedId;
          const x0 = el.x - w / 2, y0 = el.y - h / 2;
          return (
            <g key={el.id} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
              <rect x={x0} y={y0} width={w} height={h} rx={6}
                fill={(el.color || '#888') + '22'} stroke={el.color || '#888'} strokeWidth={sel ? 3 : 2} />
              {w > 26 && h > 20 && (
                <text x={el.x} y={el.y} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(16, Math.min(w, h) / 2)} fill={el.color || '#888'} fontWeight="700" style={{ pointerEvents: 'none' }}>{el.glyph}</text>
              )}
              <text x={el.x} y={y0 + h + 12} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))" style={{ pointerEvents: 'none' }}>{el.label}</text>
            </g>
          );
        })}

        {/* Vista previa de pared en curso */}
        {mode === 'wall' && wallStart && mouse && (
          <line x1={wallStart.x} y1={wallStart.y} x2={mouse.x} y2={mouse.y} stroke="#00D4FF" strokeWidth={3} strokeDasharray="6 6" opacity="0.7" />
        )}

        {/* Vista previa fantasma del elemento a colocar */}
        {mode === 'place' && activeElement && mouse && !drag && (
          <rect
            x={mouse.x - (activeElement.w_m * scale) / 2}
            y={mouse.y - (activeElement.h_m * scale) / 2}
            width={activeElement.w_m * scale} height={activeElement.h_m * scale}
            rx={6} fill={(activeElement.color || '#888') + '22'} stroke={activeElement.color || '#888'} strokeWidth={2} strokeDasharray="5 5" opacity="0.6"
          />
        )}

        {/* Cursor de coordenadas */}
        {mouse && (
          <text x={12} y={CANVAS_H - 14} fontSize="12" fill="hsl(var(--muted-foreground))" style={{ pointerEvents: 'none' }}>
            {m(mouse.x)} m × {m(mouse.y)} m
          </text>
        )}
      </svg>
    </div>
  );
}