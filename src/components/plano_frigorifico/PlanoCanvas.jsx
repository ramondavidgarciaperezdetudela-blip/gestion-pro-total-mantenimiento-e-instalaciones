import React, { useRef, useState, useEffect, useMemo } from 'react';
import { crearConexion } from '@/lib/planoCalculo';
import { CAT_CAPA, CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';
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

// Superficie de dibujo. Se ha ampliado para que quepan instalaciones grandes
// (varias cámaras y salas) sin quedarse sin sitio. Las coordenadas guardadas de
// los planos antiguos no cambian: siguen en su sitio, solo hay más lienzo.
export const CANVAS_W = 1600;
export const CANVAS_H = 1100;

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

// Devuelve los puntos de una polilínea desplazados `off` píxeles a un lado
// (perpendicular a cada tramo). Sirve para dibujar líneas paralelas: los
// conductos (doble pared) y las tuberías (línea de gas y de líquido juntas).
function offsetPts(pts, off) {
  return pts.map((p, i) => {
    const prev = pts[i - 1], next = pts[i + 1];
    let dx = 0, dy = 0;
    if (next) { dx = next.x - p.x; dy = next.y - p.y; }
    else if (prev) { dx = p.x - prev.x; dy = p.y - prev.y; }
    const L = Math.hypot(dx, dy) || 1;
    return { x: p.x + (-dy / L) * off, y: p.y + (dx / L) * off };
  });
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
  onConexionCreada, fullscreen = false, zoom = 1,
}) {
  const svgRef = useRef(null);
  const [mouse, setMouse] = useState(null);
  const [wallStart, setWallStart] = useState(null);
  const [drag, setDrag] = useState(null);
  const [connFrom, setConnFrom] = useState(null);
  const [connPath, setConnPath] = useState([]);
  // Cota: primer clic guarda el origen, el segundo cierra la línea de medida.
  const [cotaStart, setCotaStart] = useState(null);
  // Mano alzada: puntos recogidos mientras se arrastra.
  const [trazoPts, setTrazoPts] = useState(null);

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
    // Cota: se selecciona tocando su línea de medida, no el recuadro del origen.
    if (el.type === 'cota') {
      const x2 = el.datos?.x2 ?? el.x, y2 = el.datos?.y2 ?? el.y;
      return distSeg(p.x, p.y, el.x, el.y, x2, y2) < 8;
    }
    // Mano alzada: se selecciona tocando cualquiera de sus segmentos.
    if (el.type === 'trazo') {
      const pts = el.datos?.points || [];
      for (let i = 1; i < pts.length; i++) {
        if (distSeg(p.x, p.y, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y) < 7) return true;
      }
      return false;
    }
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

  // Sala o cámara bajo el puntero: se busca por el recinto completo (no pared a
  // pared) para poder seleccionarla y arrastrarla entera de una vez.
  const roomAt = (p) => walls.find((w) => {
    if (!w.room_id || !w.room_w_m || !w.room_h_m) return false;
    const x0 = w.room_x, y0 = w.room_y;
    return p.x >= x0 && p.x <= x0 + w.room_w_m * scale && p.y >= y0 && p.y <= y0 + w.room_h_m * scale;
  });

  const cerrarConexion = (hit) => {
    const pts = polyline ? ortogonalizar(connPath) : [];
    const nueva = crearConexion(connectType || 'refrigerante', connFrom, hit.id, pts);
    onChange({ connections: [...connections, nueva], selectedId: nueva.id });
    setConnFrom(null);
    setConnPath([]);
    // Avisa a la página de que se acaba de trazar una línea: así puede abrir
    // el diálogo que pide el diámetro (tubería) o el tipo de cable (eléctrica).
    if (onConexionCreada) onConexionCreada(nueva);
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

    // Texto: se pregunta el texto y se suelta como anotación en el plano.
    if (mode === 'text') {
      const texto = window.prompt('Texto a añadir en el plano:', 'Nota');
      if (!texto) return;
      const el = {
        id: crypto.randomUUID(), type: 'texto', cat: 'estructura', label: 'Texto',
        glyph: '', color: '#64748b', datos: { text: texto },
        x: p.x, y: p.y, w_m: 0.6, h_m: 0.3, qty: 1,
      };
      onChange({ elements: [...elements, el], selectedId: el.id });
      return;
    }

    // Cota: primer clic = origen, segundo = fin → línea de medida con su longitud.
    if (mode === 'cota') {
      if (!cotaStart) { setCotaStart(p); return; }
      const el = {
        id: crypto.randomUUID(), type: 'cota', cat: 'estructura', label: 'Cota',
        glyph: '', color: '#64748b', datos: { x2: p.x, y2: p.y },
        x: cotaStart.x, y: cotaStart.y, w_m: 0.2, h_m: 0.2, qty: 1,
      };
      onChange({ elements: [...elements, el], selectedId: el.id });
      setCotaStart(null);
      return;
    }

    // Mano alzada: al pulsar empieza a recoger puntos; al soltar crea el trazo.
    if (mode === 'trazo') {
      setTrazoPts([{ x: p.x, y: p.y }]);
      return;
    }

    // Borrador: al tocar un elemento, conexión o pared la borra directamente,
    // igual que la goma de Paint. No pide confirmación: para eso está Deshacer.
    if (mode === 'eraser') {
      const hit = hitElement(p);
      if (hit) { onChange({ elements: elements.filter((e) => e.id !== hit.id), selectedId: null }); return; }
      const c = hitConnection(p);
      if (c) { onChange({ connections: connections.filter((x) => x.id !== c.id), selectedId: null }); return; }
      const wall = walls.find((w) => distSeg(p.x, p.y, w.x1, w.y1, w.x2, w.y2) < 8);
      if (wall) { onChange({ walls: walls.filter((w) => w.id !== wall.id), selectedId: null }); return; }
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
      // Sala o cámara frigorífica: se selecciona y se arrastra ENTERA (sus
      // cuatro paredes a la vez), tanto pulsando dentro del recinto como sobre
      // cualquiera de sus paredes. Antes solo se podía tocar una pared suelta y
      // no había forma de cambiarla de sitio.
      const room = roomAt(p) || walls.find((w) => w.room_id && distSeg(p.x, p.y, w.x1, w.y1, w.x2, w.y2) < 12);
      if (room) {
        onChange({ selectedId: room.id });
        setDrag({
          tipo: 'sala', roomId: room.room_id,
          ox: p.x - room.room_x, oy: p.y - room.room_y,
          base: walls.filter((w) => w.room_id === room.room_id),
        });
        return;
      }
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
      glyph: def.glyph, color: CAT_COLOR[def.cat] || def.color || '#888',
      // El icono del elemento personalizado va en datos.image_url para que
      // se guarde con el plano (la imagen es una URL pública, no un campo
      // grande) y PlanoSimbolo la sepa dibujar.
      datos: def.image_url ? { image_url: def.image_url } : {},
      x: p.x, y: p.y, w_m: def.w_m, h_m: def.h_m,
      brand: '', model: '', notes: '', qty: 1,
    };
    onChange({ elements: [...elements, el], selectedId: el.id });
  };

  const handleMove = (e) => {
    if (e.buttons === 0 && drag) { setDrag(null); }
    const raw = toSvg(e);
    const p = { x: snap(raw.x), y: snap(raw.y) };
    setMouse(p);
    // Arrastre de una sala o cámara: se desplazan sus cuatro paredes a la vez,
    // tomando como referencia dónde estaba la sala al empezar a arrastrar.
    if (drag?.tipo === 'sala') {
      const dx = (p.x - drag.ox) - drag.base[0].room_x;
      const dy = (p.y - drag.oy) - drag.base[0].room_y;
      if (dx === 0 && dy === 0) return;
      // Las posiciones se calculan siempre desde la foto del inicio del
      // arrastre, no sobre lo ya movido: si no, el desplazamiento se sumaría
      // en cada movimiento del ratón.
      onChange({
        walls: walls.map((w) => {
          if (w.room_id !== drag.roomId) return w;
          const ini = drag.base.find((b) => b.id === w.id) || w;
          return {
            ...w,
            x1: ini.x1 + dx, y1: ini.y1 + dy, x2: ini.x2 + dx, y2: ini.y2 + dy,
            room_x: ini.room_x + dx, room_y: ini.room_y + dy,
          };
        }),
      });
      return;
    }
    if (drag) {
      const els = elements.map((el) => el.id === drag.id ? { ...el, x: p.x - drag.ox, y: p.y - drag.oy } : el);
      onChange({ elements: els });
    }
    // Mano alzada: añadir punto si se ha movido lo suficiente.
    if (mode === 'trazo' && trazoPts && e.buttons === 1) {
      const last = trazoPts[trazoPts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 3) setTrazoPts((pp) => [...pp, p]);
    }
  };

  const handleUp = () => {
    if (drag) setDrag(null);
    // Cerrar el trazo a mano alzada al soltar el puntero.
    if (mode === 'trazo' && trazoPts && trazoPts.length > 1) {
      const el = {
        id: crypto.randomUUID(), type: 'trazo', cat: 'estructura', label: 'Trazo',
        glyph: '', color: '#64748b', datos: { points: trazoPts },
        x: trazoPts[0].x, y: trazoPts[0].y, w_m: 0.2, h_m: 0.2, qty: 1,
      };
      onChange({ elements: [...elements, el], selectedId: el.id });
    }
    setTrazoPts(null);
  };

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { setWallStart(null); setConnFrom(null); setCotaStart(null); setTrazoPts(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const m = (px) => (px / scale).toFixed(2);
  const elementosVisibles = useMemo(() => elements.filter(visible), [elements, capasVisibles]);
  const conexionesVisibles = useMemo(() => connections.filter(connVisible), [connections, capasVisibles]);

  // Cámaras frigoríficas: se agrupan sus 4 paredes por room_id para dibujarlas
  // como un recinto panelado de doble línea, coloreado según el tipo (positiva
  // en azul, negativa en rojo). Las paredes normales y de salas van aparte.
  const camaras = useMemo(() => {
    const map = {};
    walls.forEach((w) => {
      if (!w.camara) return;
      (map[w.room_id] = map[w.room_id] || { ref: w, walls: [] }).walls.push(w);
    });
    return Object.values(map);
  }, [walls]);
  const paredesNormales = useMemo(() => walls.filter((w) => !w.camara), [walls]);

  return (
    <div className="overflow-auto rounded-lg border border-border bg-card"
      style={fullscreen ? { height: '100%', minHeight: 0, overflow: 'auto' } : { maxHeight: '75vh', overflow: 'auto' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        style={{
          // El zoom agranda el dibujo (y sus medidas) y el contenedor deja
          // desplazarse: así se trabaja cómodo en planos grandes.
          width: `${Math.round(zoom * 100)}%`,
          minWidth: 0,
          height: fullscreen && zoom <= 1 ? '100%' : 'auto',
          display: 'block',
          touchAction: 'none',
          cursor: (mode === 'wall' || mode === 'connect' || mode === 'cota' || mode === 'trazo') ? 'crosshair' : mode === 'eraser' ? 'cell' : mode === 'text' ? 'text' : mode === 'select' ? 'default' : 'copy',
        }}
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
          i % 1 === 0 && i > 0 ? <text key={'gx' + i} x={i * major + 2} y={14} fontSize="13" fontWeight="600" fill="hsl(var(--muted-foreground))" opacity="0.75">{i * gridMeters}m</text> : null
        ))}

        {/* Cámaras frigoríficas: recinto panelado de doble línea, coloreado
            según el tipo. Se dibuja una sola vez por cámara (no pared a pared)
            para que el panel aislante se vea entero y la etiqueta quede centrada. */}
        {camaras.map((cm) => {
          const ref = cm.ref;
          const w = (ref.room_w_m || 0) * scale, h = (ref.room_h_m || 0) * scale;
          const x = ref.room_x, y = ref.room_y;
          const sel = cm.walls.some((wd) => wd.id === selectedId);
          const color = ref.tipo === 'negativa' ? '#ef4444' : '#3b82f6';
          const off = 5;
          return (
            <g key={ref.room_id} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
              <rect x={x} y={y} width={w} height={h} fill={color + '12'} />
              <rect x={x} y={y} width={w} height={h} fill="none" stroke={sel ? '#00D4FF' : color} strokeWidth={sel ? 4 : 3} />
              <rect x={x + off} y={y + off} width={Math.max(0, w - 2 * off)} height={Math.max(0, h - 2 * off)} fill="none" stroke={sel ? '#00D4FF' : color} strokeWidth={sel ? 2.5 : 1.8} opacity="0.8" />
              <g transform={`translate(${x + w / 2}, ${y + h / 2})`} style={{ pointerEvents: 'none' }}>
                <text textAnchor="middle" y={-8} fontSize="17" fontWeight="700" fill={color}>
                  {ref.tipo === 'negativa' ? '❄ Cámara negativa' : '❄ Cámara positiva'}
                </text>
                <text textAnchor="middle" y={12} fontSize="13" fontWeight="600" fill={color} opacity="0.9">
                  {ref.room_w_m} × {ref.room_h_m} m · {ref.espesor_mm} mm{ref.suelo ? ' · suelo' : ''}
                </text>
              </g>
            </g>
          );
        })}

        {/* Paredes normales y de salas */}
        {paredesNormales.map((w) => {
          const sel = w.id === selectedId;
          const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
          const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
          return (
            <g key={w.id} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
              <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={sel ? '#00D4FF' : '#cbd5e1'} strokeWidth={sel ? 7 : 5} strokeLinecap="round" />
              <text x={mx} y={my - 8} textAnchor="middle" fontSize="15" fontWeight="700" fill={sel ? '#00A0E9' : 'hsl(var(--foreground))'} style={{ pointerEvents: 'none' }}>{m(len)} m</text>
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
          const esRef = c.type === 'refrigerante';
          const esConducto = c.type === 'conducto';
          // La tubería lleva dos circuitos: gas (rojo) y líquido (azul). Van
          // dibujados como dos líneas paralelas para que se vean los dos a la
          // vez, igual que en la realidad.
          const colorGas = '#ef4444';
          const colorLiq = '#3b82f6';
          const pts = [{ x: a.x, y: a.y }, ...(c.path || []), { x: b.x, y: b.y }];
          const mid = pts[Math.floor(pts.length / 2)] || { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          let tag;
          if (esConducto) {
            tag = c.duct_section ? `${c.duct_section} mm${c.duct_shape && c.duct_shape !== 'Rectangular' ? ' ' + c.duct_shape : ''}` : 'Conducto';
          } else if (esRef) {
            tag = (c.gas_diameter || c.liquid_diameter ? `G ${c.gas_diameter || '—'} · L ${c.liquid_diameter || '—'}` : 'Tubería');
          } else {
            tag = esDatos ? (c.comm_type || 'Comunicación')
              : (c.section_mm2 ? `${c.section_mm2} mm²${c.power_type ? ` · ${c.power_type}` : ''}` : (c.power_type || 'Eléctrica'));
          }
          return (
            <g key={c.id}>
              {esConducto ? (
                // Conducto: dos líneas paralelas (las paredes del conducto)
                <g>
                  <polyline points={offsetPts(pts, 4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={sel ? 2.2 : 1.5} opacity="0.9" strokeLinejoin="round" />
                  <polyline points={offsetPts(pts, -4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={sel ? 2.2 : 1.5} opacity="0.9" strokeLinejoin="round" />
                </g>
              ) : esRef ? (
                // Tubería: gas (rojo) y líquido (azul), cada uno con su diámetro
                <g>
                  <polyline points={offsetPts(pts, 4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colorGas} strokeWidth={sel ? 3 : 2.2} strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={offsetPts(pts, -4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colorLiq} strokeWidth={sel ? 3 : 2.2} strokeLinejoin="round" strokeLinecap="round" />
                </g>
              ) : (
                <polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color}
                  strokeWidth={sel ? 4 : 2.5}
                  strokeDasharray="2 4"
                  strokeLinejoin="round" strokeLinecap="round" />
              )}
              {sel && (c.path || []).map((pp, i) => (
                <rect key={i} x={pp.x - 3} y={pp.y - 3} width="6" height="6" fill={esRef ? colorGas : color} stroke="#fff" strokeWidth="1" />
              ))}
              <circle cx={a.x} cy={a.y} r="3" fill={esRef ? colorGas : color} />
              <circle cx={b.x} cy={b.y} r="3" fill={esRef ? colorLiq : color} />
              {sel && (
                <rect x={mid.x - 78} y={mid.y - 12} width={156} height={19} rx="3" fill="hsl(var(--card))" stroke={esRef ? colorGas : color} strokeWidth="1" />
              )}
              <text x={mid.x} y={mid.y + 3} textAnchor="middle" fontSize="12" fontWeight="600" fill={sel ? (esRef ? colorGas : color) : 'hsl(var(--muted-foreground))'} style={{ pointerEvents: 'none' }}>{tag}</text>
              {/* Diámetros de gas y líquido junto a cada extremo de la tubería */}
              {esRef && (c.gas_diameter || c.liquid_diameter) && (
                <g style={{ pointerEvents: 'none' }}>
                  <text x={a.x + 8} y={a.y - 10} fontSize="11" fontWeight="700" fill={colorGas}>G {c.gas_diameter || '—'}</text>
                  <text x={b.x + 8} y={b.y + 16} fontSize="11" fontWeight="700" fill={colorLiq}>L {c.liquid_diameter || '—'}</text>
                </g>
              )}
            </g>
          );
        })}

        {/* Elementos colocados (símbolos realistas) */}
        {elementosVisibles.map((el) => {
          const sel = el.id === selectedId;
          const fromHere = el.id === connFrom;

          // ── Texto: anotación libre sobre el plano ──
          if (el.type === 'texto') {
            return (
              <g key={el.id} transform={`translate(${el.x},${el.y})`} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
                {sel && <rect x={-4} y={-14} width={Math.max(40, (el.datos?.text || '').length * 6.5)} height={22} rx={3} fill="#64748b22" stroke="#64748b" strokeWidth="1" />}
                <text x={0} y={2} textAnchor="start" fontSize="16" fontWeight="700" fill={el.color || '#e2e8f0'} style={{ pointerEvents: 'none' }}>{el.datos?.text || 'Texto'}</text>
              </g>
            );
          }

          // ── Cota: línea de medida con flechas y longitud ──
          if (el.type === 'cota') {
            const x2 = el.datos?.x2 ?? el.x, y2 = el.datos?.y2 ?? el.y;
            const len = Math.hypot(x2 - el.x, y2 - el.y);
            const metros = (len / scale).toFixed(2);
            const mx = (el.x + x2) / 2, my = (el.y + y2) / 2;
            const ang = Math.atan2(y2 - el.y, x2 - el.x);
            const arr = 7;
            return (
              <g key={el.id} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
                <line x1={el.x} y1={el.y} x2={x2} y2={y2} stroke={el.color || '#64748b'} strokeWidth={sel ? 2 : 1.5} />
                {/* extensión a ambos extremos */}
                <line x1={el.x} y1={el.y} x2={el.x + Math.cos(ang + Math.PI / 2) * 5} y2={el.y + Math.sin(ang + Math.PI / 2) * 5} stroke={el.color || '#64748b'} strokeWidth="1" />
                <line x1={x2} y1={y2} x2={x2 + Math.cos(ang + Math.PI / 2) * 5} y2={y2 + Math.sin(ang + Math.PI / 2) * 5} stroke={el.color || '#64748b'} strokeWidth="1" />
                {/* flechas */}
                <polyline points={`${el.x + Math.cos(ang) * arr},${el.y + Math.sin(ang) * arr} ${el.x},${el.y} ${el.x + Math.cos(ang + 2.2) * arr},${el.y + Math.sin(ang + 2.2) * arr}`} fill="none" stroke={el.color || '#64748b'} strokeWidth="1.4" />
                <polyline points={`${x2 - Math.cos(ang) * arr},${y2 - Math.sin(ang) * arr} ${x2},${y2} ${x2 - Math.cos(ang - 2.2) * arr},${y2 - Math.sin(ang - 2.2) * arr}`} fill="none" stroke={el.color || '#64748b'} strokeWidth="1.4" />
                <g transform={`translate(${mx},${my}) rotate(${(ang * 180) / Math.PI})`}>
                  <rect x={-38} y={-12} width={76} height={22} rx={3} fill="hsl(var(--card))" stroke={el.color || '#64748b'} strokeWidth="0.8" />
                  <text x={0} y={4} textAnchor="middle" fontSize="14" fontWeight="700" fill={el.color || '#64748b'} style={{ pointerEvents: 'none' }}>{metros} m</text>
                </g>
              </g>
            );
          }

          // ── Mano alzada: polilínea libre ──
          if (el.type === 'trazo') {
            const pts = el.datos?.points || [];
            if (pts.length < 2) return null;
            return (
              <polyline key={el.id} points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none" stroke={el.color || '#64748b'} strokeWidth={sel ? 3 : 2} strokeLinecap="round" strokeLinejoin="round"
                style={{ cursor: mode === 'select' ? 'move' : 'default' }} />
            );
          }

          const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
          const y0 = el.y - h / 2;
          return (
            <g key={el.id} transform={`translate(${el.x},${el.y})`} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
              <PlanoSimbolo el={el} scale={scale} selected={sel} fromHere={fromHere} />
              <text x={0} y={y0 + h + 15} textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--foreground))" style={{ pointerEvents: 'none' }}>{el.label}</text>
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
          const preview = ortogonalizar([{ x: a.x, y: a.y }, ...connPath, mouse]);
          // En tubería se previsualizan las dos líneas (gas rojo + líquido azul).
          if (connectType === 'refrigerante') {
            return (
              <g>
                <polyline points={offsetPts(preview, 4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.6" strokeLinejoin="round" />
                <polyline points={offsetPts(preview, -4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.6" strokeLinejoin="round" />
              </g>
            );
          }
          const color = CONN_COLOR[connectType] || '#00D4FF';
          return <polyline points={preview.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="6 6" opacity="0.6" strokeLinejoin="round" />;
        })()}

        {/* Vista previa fantasma del elemento a colocar */}
        {mode === 'place' && activeElement && mouse && !drag && (
          <g transform={`translate(${mouse.x},${mouse.y})`} opacity="0.6">
            <PlanoSimbolo el={{ ...activeElement, type: activeElement.type || activeElement.id, id: 'ghost', color: activeElement.color, datos: {} }} scale={scale} />
          </g>
        )}

        {/* Vista previa de la cota en curso */}
        {mode === 'cota' && cotaStart && mouse && (
          <g>
            <line x1={cotaStart.x} y1={cotaStart.y} x2={mouse.x} y2={mouse.y} stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={(cotaStart.x + mouse.x) / 2} y={(cotaStart.y + mouse.y) / 2 - 8} textAnchor="middle" fontSize="14" fontWeight="600" fill="#64748b">
              {(Math.hypot(mouse.x - cotaStart.x, mouse.y - cotaStart.y) / scale).toFixed(2)} m
            </text>
          </g>
        )}

        {/* Vista previa del trazo a mano alzada */}
        {mode === 'trazo' && trazoPts && trazoPts.length > 1 && (
          <polyline points={trazoPts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
        )}

        {/* Cursor de coordenadas */}
        {mouse && (
          <text x={12} y={CANVAS_H - 14} fontSize="14" fontWeight="600" fill="hsl(var(--muted-foreground))" style={{ pointerEvents: 'none' }}>
            {mode === 'connect' && connFrom
              ? (polyline
                  ? `Codos: ${connPath.length} · clic en el equipo destino para cerrar (Esc cancela)`
                  : `Conectando: clic en el equipo destino · ${connectType === 'refrigerante' ? 'tubería' : connectType === 'conducto' ? 'conducto' : 'eléctrica'}`)
              : mode === 'cota' && cotaStart
                ? `Cota: clic en el segundo punto (Esc cancela) · ${m(mouse.x)} × ${m(mouse.y)} m`
                : mode === 'trazo'
                  ? `Mano alzada: pulsa y arrastra para dibujar (Esc cancela)`
                  : `${m(mouse.x)} m × ${m(mouse.y)} m`}
          </text>
        )}
      </svg>
    </div>
  );
}