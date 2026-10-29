import React, { useRef, useState, useEffect, useMemo } from 'react';
import { crearConexion } from '@/lib/planoCalculo';
import { CAT_CAPA } from '@/lib/planoFrigorificoCatalogo';
import PlanoSimbolo from './PlanoSimbolo';

// Lienzo SVG del diseñador de planos frigoríficos con distribución de aire.
//
// Modos:
//  - select: mover/seleccionar equipos, paredes y conexiones.
//  - wall:   dibujar paredes encadenando segmentos.
//  - place:  soltar un elemento del catálogo.
//  - connect: unir dos equipos con una conexión (tubería, eléctrica o
//             conducto según `connectType`).
//
// La cuadrícula se configura en metros (1 m por defecto, 0,5 m si se quiere
// más fino), y el movimiento puede ser libre a pasos de 0,1 m o engancharse
// a la cuadrícula. Las capas (frigorífico, ventilación, eléctrico, seguridad,
// estructura) se muestran u ocultan sin borrar lo que ya está dibujado.

export const CANVAS_W = 1400;
export const CANVAS_H = 900;

function distSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

const CONN_COLOR = { refrigerante: '#00A0E9', electrica: '#F5821F', conducto: '#10b981' };

// Convierte una secuencia de puntos en una polilínea ortogonal con codos a 90°.
function ortogonalizar(pts) {
  if (pts.length < 2) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = out[out.length - 1], b = pts[i];
    if (a.x === b.x || a.y === b.y) { out.push(b); continue; }
    out.push({ x: b.x, y: a.y });
    out.push(b);
  }
  return out;
}

// Capa a la que pertenece una conexión según su tipo.
function capaConexion(c) {
  if (c.type === 'conducto') return 'ventilacion';
  if (c.type === 'electrica') return 'electrico';
  return 'frio';
}

export default function PlanoCanvas({
  walls, elements, connections, selectedId, mode, activeElement, connectType, polyline,
  scale = 50, gridMeters = 1, snapMode = 'libre', capasVisibles = {}, onChange,
  fullscreen = false,
}) {
  const svgRef = useRef(null);
  const [mouse, setMouse] = useState(null);
  const [wallStart, setWallStart] = useState(null);
  const [drag, setDrag] = useState(null);
  const [connFrom, setConnFrom] = useState(null);
  const [connPath, setConnPath] = useState([]);

  const major = Math.max(8, gridMeters * scale);          // cuadrícula mayor (m)
  const minor = major / 5;                                  // subdivisión fina
  const snapStep = snapMode === 'cuadricula' ? major : Math.max(2, 0.1 * scale); // libre = 0,1 m

  // Un elemento y sus conexiones son visibles si su capa lo está. La
  // estructura siempre acompaña al frigorífico, así que no se oculta sola.
  const capaDe = (el) => CAT_CAPA[el?.cat] || 'frio';
  const visible = (el) => capasVisibles[capaDe(el)] !== false;
  const connVisible = (c) => capasVisibles[capaConexion(c)] !== false;

  const toSvg = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_W;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_H;
    return { x, y };
  };
  const snap = (v) => Math.round(v / snapStep) * snapStep;

  const hitElement = (p) => [...elements].reverse().find((el) => {
    if (!visible(el)) return false;
    const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
    const x0 = el.x - w / 2, y0 = el.y - h / 2;
    return p.x >= x0 && p.x <= x0 + w && p.y >= y0 && p.y <= y0 + h;
  });

  const hitConnection = (p) => connections.find((c) => {
    if (!connVisible(c)) return false;
    const a = elements.find((e) => e.id === c.from_id);
    const b = elements.find((e) => e.id === c.to_id);
    if (!a || !b) return false;
    const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
    for (let i = 1; i < pts.length; i++) {
      if (distSeg(p.x, p.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) < 7) return true;
    }
    return false;
  });

  const cerrarConexion = (hit) => {
    const pts = polyline ? ortogonalizar(connPath) : [];
    const nueva = crearConexion(connectType || 'refrigerante', connFrom, hit.id, pts);
    onChange({ connections: [...connections, nueva], selectedId: nueva.id });
    setConnFrom(null);
    setConnPath([]);
  };

  const handleDown = (e) => {
    const raw = toSvg(e);
    const p = { x: snap(raw.x), y: snap(raw.y) };

    if (mode === 'wall') {
      if (!wallStart) { setWallStart(p); }
      else {
        onChange({ walls: [...walls, { id: crypto.randomUUID(), x1: wallStart.x, y1: wallStart.y, x2: p.x, y2: p.y }] });
        setWallStart(p);
      }
      return;
    }

    if (mode === 'connect') {
      const hit = hitElement(p);
      if (!connFrom) {
        if (hit) { setConnFrom(hit.id); setConnPath([]); onChange({ selectedId: null }); }
        else { const c = hitConnection(p); if (c) onChange({ selectedId: c.id }); }
        return;
      }
      if (hit && hit.id !== connFrom) { cerrarConexion(hit); return; }
      if (polyline && !hit) { setConnPath((pp) => [...pp, p]); return; }
      setConnFrom(null); setConnPath([]);
      return;
    }

    if (mode === 'select') {
      const hit = hitElement(p);
      if (hit) { onChange({ selectedId: hit.id }); setDrag({ id: hit.id, ox: p.x - hit.x, oy: p.y - hit.y }); return; }
      const c = hitConnection(p);
      if (c) { onChange({ selectedId: c.id }); return; }
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
      glyph: def.glyph, color: def.color || '#888', datos: {},
      x: p.x, y: p.y, w_m: def.w_m, h_m: def.h_m,
      brand: '', model: '', notes: '', qty: 1,
    };
    onChange({ elements: [...elements, el], selectedId: el.id });
  };

  const handleMove = (e) => {
    if (e.buttons === 0 && drag) { setDrag(null); return; }
    const raw = toSvg(e);
    const p = { x: snap(raw.x), y: snap(raw.y) };
    setMouse(p);
    if (drag) {
      const els = elements.map((el) => el.id === drag.id ? { ...el, x: p.x - drag.ox, y: p.y - drag.oy } : el);
      onChange({ elements: els });
    }
  };

  const handleUp = () => { if (drag) setDrag(null); };

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { setWallStart(null); setConnFrom(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const m = (px) => (px / scale).toFixed(2);
  const elementosVisibles = useMemo(() => elements.filter(visible), [elements, capasVisibles]);
  const conexionesVisibles = useMemo(() => connections.filter(connVisible), [connections, capasVisibles]);

  return (
    <div className="overflow-auto rounded-lg border border-border bg-card"
      style={fullscreen ? { height: '100%', minHeight: 0 } : { maxHeight: '70vh' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{ width: '100%', minWidth: fullscreen ? 0 : 720, height: fullscreen ? '100%' : '70vh', display: 'block', touchAction: 'none', cursor: mode === 'wall' || mode === 'connect' ? 'crosshair' : mode === 'select' ? 'default' : 'copy' }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
      >
        <defs>
          <pattern id="pf-grid-min" width={minor} height={minor} patternUnits="userSpaceOnUse">
            <path d={`M ${minor} 0 L 0 0 0 ${minor}`} fill="none" stroke="hsl(var(--border))" strokeWidth="0.6" opacity="0.35" />
          </pattern>
          <pattern id="pf-grid-maj" width={major} height={major} patternUnits="userSpaceOnUse">
            <rect width={major} height={major} fill="url(#pf-grid-min)" />
            <path d={`M ${major} 0 L 0 0 0 ${major}`} fill="none" stroke="hsl(var(--border))" strokeWidth="1.2" opacity="0.8" />
          </pattern>
        </defs>
        <rect width={CANVAS_W} height={CANVAS_H} fill="url(#pf-grid-maj)" />

        {/* Etiquetas de metro en la cuadrícula mayor */}
        {capasVisibles.estructura !== false && [...Array(Math.floor(CANVAS_W / major) + 1)].map((_, i) => (
          i % 1 === 0 && i > 0 ? <text key={'gx' + i} x={i * major + 2} y={12} fontSize="9" fill="hsl(var(--muted-foreground))" opacity="0.6">{i * gridMeters}m</text> : null
        ))}

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

        {/* Conexiones (tuberías / eléctricas / conductos), con o sin codos */}
        {conexionesVisibles.map((c) => {
          const a = elements.find((e) => e.id === c.from_id);
          const b = elements.find((e) => e.id === c.to_id);
          if (!a || !b) return null;
          const sel = c.id === selectedId;
          const esDatos = c.type === 'electrica' && c.conn_kind === 'comunicacion';
          const color = esDatos ? '#8b5cf6' : (CONN_COLOR[c.type] || '#888');
          const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
          const mid = pts[Math.floor(pts.length / 2)] || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          let tag;
          if (c.type === 'conducto') {
            tag = c.duct_section ? `${c.duct_section} mm${c.duct_shape && c.duct_shape !== 'Rectangular' ? ' ' + c.duct_shape : ''}` : 'Conducto';
          } else if (c.type === 'refrigerante') {
            tag = (c.gas_diameter || c.liquid_diameter ? `G ${c.gas_diameter || '—'} · L ${c.liquid_diameter || '—'}` : 'Tubería');
          } else {
            tag = esDatos ? (c.comm_type || 'Comunicación')
              : (c.section_mm2 ? `${c.section_mm2} mm²${c.power_type ? ` · ${c.power_type}` : ''}` : (c.power_type || 'Eléctrica'));
          }
          const esConducto = c.type === 'conducto';
          return (
            <g key={c.id}>
              {esConducto ? (
                // Conducto: dos líneas paralelas (las paredes del conducto)
                (() => {
                  const paralelo = (off) => pts.map((p, i) => {
                    const prev = pts[i - 1], next = pts[i + 1];
                    let dx = 0, dy = 0;
                    if (next) { dx = next.x - p.x; dy = next.y - p.y; }
                    else if (prev) { dx = p.x - prev.x; dy = p.y - prev.y; }
                    const L = Math.hypot(dx, dy) || 1;
                    return { x: p.x + (-dy / L) * off, y: p.y + (dx / L) * off };
                  });
                  const o = 4;
                  return (
                    <g>
                      <polyline points={paralelo(o).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={sel ? 2.2 : 1.5} opacity="0.9" strokeLinejoin="round" />
                      <polyline points={paralelo(-o).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={sel ? 2.2 : 1.5} opacity="0.9" strokeLinejoin="round" />
                    </g>
                  );
                })()
              ) : (
                <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color}
                  strokeWidth={sel ? 4 : 2.5}
                  strokeDasharray={c.type === 'refrigerante' ? '8 5' : '2 4'}
                  strokeLinejoin="round" strokeLinecap="round" />
              )}
              {sel && (c.path || []).map((pp, i) => (
                <rect key={i} x={pp.x - 3} y={pp.y - 3} width="6" height="6" fill={color} stroke="#fff" strokeWidth="1" />
              ))}
              <circle cx={a.x} cy={a.y} r="3" fill={color} />
              <circle cx={b.x} cy={b.y} r="3" fill={color} />
              {sel && (
                <rect x={mid.x - 56} y={mid.y - 9} width={112} height={14} rx="3" fill="hsl(var(--card))" stroke={color} strokeWidth="1" />
              )}
              <text x={mid.x} y={mid.y + 2} textAnchor="middle" fontSize="9" fill={sel ? color : 'hsl(var(--muted-foreground))'} style={{ pointerEvents: 'none' }}>{tag}</text>
            </g>
          );
        })}

        {/* Elementos colocados (símbolos realistas) */}
        {elementosVisibles.map((el) => {
          const sel = el.id === selectedId;
          const fromHere = el.id === connFrom;
          const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
          const y0 = el.y - h / 2;
          return (
            <g key={el.id} transform={`translate(${el.x},${el.y})`} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
              <PlanoSimbolo el={el} scale={scale} selected={sel} fromHere={fromHere} />
              <text x={0} y={y0 + h + 12} textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))" style={{ pointerEvents: 'none' }}>{el.label}</text>
            </g>
          );
        })}

        {/* Vista previa de pared en curso */}
        {mode === 'wall' && wallStart && mouse && (
          <line x1={wallStart.x} y1={wallStart.y} x2={mouse.x} y2={mouse.y} stroke="#00D4FF" strokeWidth="3" strokeDasharray="6 6" opacity="0.7" />
        )}

        {/* Vista previa de conexión en curso */}
        {mode === 'connect' && connFrom && mouse && (() => {
          const a = elements.find((e) => e.id === connFrom);
          if (!a) return null;
          const color = CONN_COLOR[connectType] || '#00D4FF';
          const preview = ortogonalizar([{ x: a.x, y: a.y }, ...connPath, mouse]);
          return <polyline points={preview.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="6 6" opacity="0.6" strokeLinejoin="round" />;
        })()}

        {/* Vista previa fantasma del elemento a colocar */}
        {mode === 'place' && activeElement && mouse && !drag && (
          <g transform={`translate(${mouse.x},${mouse.y})`} opacity="0.6">
            <PlanoSimbolo el={{ ...activeElement, type: activeElement.type || activeElement.id, id: 'ghost', color: activeElement.color, datos: {} }} scale={scale} />
          </g>
        )}

        {/* Cursor de coordenadas */}
        {mouse && (
          <text x={12} y={CANVAS_H - 14} fontSize="12" fill="hsl(var(--muted-foreground))" style={{ pointerEvents: 'none' }}>
            {mode === 'connect' && connFrom
              ? (polyline
                  ? `Codos: ${connPath.length} · clic en el equipo destino para cerrar (Esc cancela)`
                  : `Conectando: clic en el equipo destino · ${connectType === 'refrigerante' ? 'tubería' : connectType === 'conducto' ? 'conducto' : 'eléctrica'}`)
              : `${m(mouse.x)} m × ${m(mouse.y)} m`}
          </text>
        )}
      </svg>
    </div>
  );
}