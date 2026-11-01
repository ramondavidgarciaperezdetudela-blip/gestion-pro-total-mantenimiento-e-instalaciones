import { puntosImantables, imanCercano, parsearMedida, extremoConLargo } from '@/lib/planoImanes';
import { materialDe, espesorPared } from '@/lib/planoParedes';
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { crearConexion } from '@/lib/planoCalculo';
import { CAT_CAPA, CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';
import { contarCodos } from '@/lib/planoRecorrido';
import { esHueco, encajarEnPared, TIPOS_HUECO } from '@/lib/planoHuecos';
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

// Giro (grados) y espejo de un icono: se guardan en el elemento como rot, flip_x, flip_y.
export function transformacionIcono(el) {
  const r = Number(el.rot) || 0;
  const fx = el.flip_x ? -1 : 1, fy = el.flip_y ? -1 : 1;
  return `translate(${el.x},${el.y})${r ? ` rotate(${r})` : ''}${fx === -1 || fy === -1 ? ` scale(${fx},${fy})` : ''}`;
}

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
  walls, elements, connections, selectedId, mode, activeElement, connectType, polyline, orto = true,
  scale = 50, gridMeters = 1, snapMode = 'libre', iman = true, capasVisibles = {}, onChange,
  onConexionCreada, fullscreen = false, zoom = 1, onZoom, vistaKey = 0,
}) {
  const svgRef = useRef(null);
  // Desplazamiento de la vista: esquina superior izquierda de lo que se ve, en
  // unidades del lienzo. El zoom y el desplazamiento se hacen con el viewBox,
  // no con barras de scroll, así se puede arrastrar el plano en cualquier
  // pantalla (ratón, trackpad o dedo).
  const [vista, setVista] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState(null);
  const [espacio, setEspacio] = useState(false);
  const vistaRef = useRef(vista);
  const zoomRef = useRef(zoom);
  const zoomPrevio = useRef(zoom);
  vistaRef.current = vista;
  zoomRef.current = zoom;
  const vw = CANVAS_W / zoom, vh = CANVAS_H / zoom;
  const [mouse, setMouse] = useState(null);
  const [wallStart, setWallStart] = useState(null);
  const [drag, setDrag] = useState(null);
  const [connFrom, setConnFrom] = useState(null);
  const [connPath, setConnPath] = useState([]);
  // Cota: primer clic guarda el origen, el segundo cierra la línea de medida.
  const [cotaStart, setCotaStart] = useState(null);
  // Mano alzada: puntos recogidos mientras se arrastra.
  const [trazoPts, setTrazoPts] = useState(null);
  const ultimoToque = useRef({});
  // Medida escrita con el teclado mientras se dibuja una pared (como en CAD).
  const [tecleado, setTecleado] = useState('');
  // Dedos sobre la pantalla (móvil/tableta): con dos dedos se desplaza y se
  // acerca/aleja el plano en cualquier herramienta, sin dibujar nada.
  const dedos = useRef(new Map());
  const gesto = useRef(null);

  const major = Math.max(8, gridMeters * scale);          // cuadrícula mayor (m)
  const minor = major / 5;                                  // subdivisión fina
  const snapStep = snapMode === 'cuadricula' ? major : 0.001 * scale; // libre = 1 mm (sin límite de cuadrícula)

  // Un elemento y sus conexiones son visibles si su capa lo está. La
  // estructura siempre acompaña al frigorífico, así que no se oculta sola.
  const capaDe = (el) => CAT_CAPA[el?.cat] || 'frio';
  const visible = (el) => capasVisibles[capaDe(el)] !== false;
  const connVisible = (c) => capasVisibles[capaConexion(c)] !== false;

  // Punto del lienzo bajo el puntero. Usa la matriz real del SVG, así es exacto
  // con cualquier zoom, desplazamiento o bandas laterales de la pantalla.
  const toSvg = (e) => {
    const svg = svgRef.current;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const r = pt.matrixTransform(ctm.inverse());
    return { x: r.x, y: r.y };
  };
  const limitarVista = (v, z = zoomRef.current) => {
    const ancho = CANVAS_W / z, alto = CANVAS_H / z;
    const mx = ancho * 0.15, my = alto * 0.15;
    return {
      x: Math.min(Math.max(v.x, Math.min(0, CANVAS_W - ancho) - mx), Math.max(0, CANVAS_W - ancho) + mx),
      y: Math.min(Math.max(v.y, Math.min(0, CANVAS_H - alto) - my), Math.max(0, CANVAS_H - alto) + my),
    };
  };
  const iniciarPan = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPanDrag({ sx: e.clientX, sy: e.clientY, vx: vista.x, vy: vista.y });
  };
  const snap = (v) => Math.round(v / snapStep) * snapStep;
  // Punto del ratón: rejilla (o 1 mm) y, al dibujar paredes o cotas, imán a
  // extremos, centros, equipos y alineaciones, como el «punto cercano» de CAD.
  const puntoFino = (raw) => {
    if (iman && (mode === 'wall' || mode === 'cota')) {
      const k = svgRef.current?.getScreenCTM()?.a || 1;
      const hit = imanCercano(raw, puntosImantables(walls, elements), 12 / k);
      if (hit) return { x: hit.x, y: hit.y, iman: hit.tipo };
    }
    return { x: snap(raw.x), y: snap(raw.y) };
  };

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
    let w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
    if ((Math.round((Number(el.rot) || 0) / 90) % 2 + 2) % 2 === 1) [w, h] = [h, w];
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
    // En trazado a mano el recorrido es el que se ha ido marcando, desde el
    // primer equipo hasta el último: con «90°» activado se añaden los codos
    // que hagan falta para que cada tramo salga recto, también el primero y el último.
    const a = elements.find((e) => e.id === connFrom);
    let pts = [];
    if (polyline && a) {
      const camino = [{ x: a.x, y: a.y }, ...connPath, { x: hit.x, y: hit.y }];
      pts = (orto ? ortogonalizar(camino) : camino).slice(1, -1);
    }
    const nueva = crearConexion(connectType || 'refrigerante', connFrom, hit.id, pts);
    onChange({ connections: [...connections, nueva], selectedId: nueva.id });
    setConnFrom(null);
    setConnPath([]);
    // Avisa a la página de que se acaba de trazar una línea: así puede abrir
    // el diálogo que pide el diámetro (tubería) o el tipo de cable (eléctrica).
    if (onConexionCreada) onConexionCreada(nueva);
  };

  const puntoSvg = (cx, cy, v, z) => {
    const svg = svgRef.current; const ctm = svg?.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    // convierte pantalla → lienzo con la vista y zoom del inicio del gesto
    const r = svg.getBoundingClientRect();
    const k = Math.min(r.width / (CANVAS_W / z), r.height / (CANVAS_H / z));
    const offX = (r.width - (CANVAS_W / z) * k) / 2, offY = (r.height - (CANVAS_H / z) * k) / 2;
    return { x: v.x + (cx - r.left - offX) / k, y: v.y + (cy - r.top - offY) / k, k };
  };
  const medidaDedos = () => { const [a, b] = [...dedos.current.values()]; return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 }; };
  const toqueAbajoCaptura = (e) => {
    if (e.pointerType !== 'touch') return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dedos.current.size === 2) {
      // Empieza el gesto de dos dedos: se anula lo que se estuviera haciendo con uno.
      setDrag(null); setPanDrag(null); setTrazoPts(null);
      const m = medidaDedos();
      gesto.current = { ...m, v: vistaRef.current, z: zoomRef.current };
      e.stopPropagation();
    } else if (gesto.current) e.stopPropagation();
  };
  const toqueMovCaptura = (e) => {
    if (e.pointerType !== 'touch' || !dedos.current.has(e.pointerId)) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesto.current || dedos.current.size < 2) return;
    e.stopPropagation();
    const g = gesto.current; const m = medidaDedos();
    const z2 = Math.min(4, Math.max(0.5, g.z * (m.d / g.d)));
    const antes = puntoSvg(g.cx, g.cy, g.v, g.z); // punto del lienzo bajo el centro inicial
    const ahora = puntoSvg(m.cx, m.cy, { x: 0, y: 0 }, z2); // posición relativa del centro actual
    zoomPrevio.current = z2;
    setVista(limitarVista({ x: antes.x - ahora.x, y: antes.y - ahora.y }, z2));
    if (onZoom) onZoom(Math.round(z2 * 100) / 100);
  };
  const toqueFinCaptura = (e) => {
    if (e.pointerType !== 'touch') return;
    const habia = dedos.current.size;
    dedos.current.delete(e.pointerId);
    if (gesto.current) { e.stopPropagation(); if (dedos.current.size < 2) { gesto.current = null; if (habia >= 2) { setDrag(null); setPanDrag(null); } } }
  };

  const handleDown = (e) => {
    // Desplazar el plano: botón central o derecho, barra espaciadora o herramienta «Mover plano».
    if (e.button === 1 || e.button === 2 || espacio || mode === 'pan') { e.preventDefault(); iniciarPan(e); return; }
    const raw = toSvg(e);
    const p = puntoFino(raw);

    if (mode === 'wall') {
      setTecleado('');
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
      // Recorrido de una tubería o cable seleccionado: se arrastran sus puntos,
      // un doble clic en un punto lo borra y un clic en el «+» de un tramo
      // añade un punto nuevo para doblar por donde se quiera.
      const selC = connections.find((c) => c.id === selectedId);
      if (selC && connVisible(selC)) {
        const a = elements.find((e2) => e2.id === selC.from_id);
        const b = elements.find((e2) => e2.id === selC.to_id);
        if (a && b) {
          const path = selC.path || [];
          const cambiar = (nuevoPath) => onChange({ connections: connections.map((c) => (c.id === selC.id ? { ...c, path: nuevoPath } : c)) });
          for (let i = 0; i < path.length; i++) {
            if (Math.hypot(p.x - path[i].x, p.y - path[i].y) < 9) {
              const clave = `${selC.id}:${i}`;
              if (ultimoToque.current.clave === clave && Date.now() - ultimoToque.current.t < 400) {
                ultimoToque.current = {};
                cambiar(path.filter((_, k) => k !== i));
                return;
              }
              ultimoToque.current = { clave, t: Date.now() };
              setDrag({ tipo: 'punto', connId: selC.id, idx: i });
              return;
            }
          }
          const pts = [{ x: a.x, y: a.y }, ...path, { x: b.x, y: b.y }];
          for (let j = 0; j < pts.length - 1; j++) {
            const mx = (pts[j].x + pts[j + 1].x) / 2, my = (pts[j].y + pts[j + 1].y) / 2;
            if (Math.hypot(pts[j + 1].x - pts[j].x, pts[j + 1].y - pts[j].y) > 18 && Math.hypot(p.x - mx, p.y - my) < 8) {
              cambiar([...path.slice(0, j), { x: mx, y: my }, ...path.slice(j)]);
              setDrag({ tipo: 'punto', connId: selC.id, idx: j });
              return;
            }
          }
        }
      }
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
      // Pulsar en un hueco: se deselecciona y, si se arrastra, se desplaza el plano.
      onChange({ selectedId: null });
      iniciarPan(e);
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
    // Puertas y ventanas se pegan a la pared más cercana: toman su ángulo,
    // su espesor y el ancho de la ficha, y abren hacia el interior.
    if (esHueco(el)) {
      const ancho = TIPOS_HUECO[el.type].ancho;
      el.w_m = ancho;
      el.datos = { ...el.datos, ancho_cm: Math.round(ancho * 100) };
      Object.assign(el, encajarEnPared(el, walls, scale, { orientar: true, maxPx: 44 }) || {});
    }
    onChange({ elements: [...elements, el], selectedId: el.id });
  };

  const handleMove = (e) => {
    if (panDrag) {
      if (e.buttons === 0 && e.pointerType !== 'touch') { setPanDrag(null); return; }
      const ctm = svgRef.current.getScreenCTM();
      const k = ctm ? ctm.a : 1;
      setVista(limitarVista({ x: panDrag.vx - (e.clientX - panDrag.sx) / k, y: panDrag.vy - (e.clientY - panDrag.sy) / k }));
      return;
    }
    if (e.buttons === 0 && e.pointerType !== 'touch' && drag) { setDrag(null); }
    const raw = toSvg(e);
    const p = puntoFino(raw);
    setMouse(p);
    // Arrastre de una sala o cámara: se desplazan sus cuatro paredes a la vez,
    // tomando como referencia dónde estaba la sala al empezar a arrastrar.
    if (drag?.tipo === 'punto') {
      onChange({
        connections: connections.map((c) => (c.id === drag.connId
          ? { ...c, path: (c.path || []).map((q, i) => (i === drag.idx ? { x: p.x, y: p.y } : q)) } : c)),
      });
      return;
    }
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
      const els = elements.map((el) => {
        if (el.id !== drag.id) return el;
        const movido = { ...el, x: p.x - drag.ox, y: p.y - drag.oy };
        // Un hueco sigue la pared: se desliza por ella y salta a otra si se acerca.
        if (esHueco(el)) {
          const pegado = encajarEnPared(movido, walls, scale, { maxPx: 44 });
          if (pegado) return { ...movido, ...pegado };
          return { ...movido, pared_id: undefined };
        }
        return movido;
      });
      onChange({ elements: els });
    }
    // Mano alzada: añadir punto si se ha movido lo suficiente.
    if (mode === 'trazo' && trazoPts && e.buttons === 1) {
      const last = trazoPts[trazoPts.length - 1];
      if (Math.hypot(p.x - last.x, p.y - last.y) > 3) setTrazoPts((pp) => [...pp, p]);
    }
  };

  const handleUp = () => {
    if (panDrag) { setPanDrag(null); return; }
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
    if (mode !== 'wall' || !wallStart) { setTecleado(''); return undefined; }
    const h = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '')) return;
      if (/^[0-9.,]$/.test(e.key)) { setTecleado((t) => (t + e.key).slice(0, 8)); e.preventDefault(); }
      else if (e.key === 'Backspace') setTecleado((t) => t.slice(0, -1));
      else if (e.key === 'Enter') {
        const metros = parsearMedida(tecleado);
        if (!metros || !mouse) return;
        const fin = extremoConLargo(wallStart, mouse, metros * scale);
        onChange({ walls: [...walls, { id: crypto.randomUUID(), x1: wallStart.x, y1: wallStart.y, x2: fin.x, y2: fin.y }] });
        setWallStart(fin); setTecleado('');
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') { setTecleado(''); setWallStart(null); setConnFrom(null); setCotaStart(null); setTrazoPts(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Retroceso: en el trazado a mano borra el último punto marcado.
  useEffect(() => {
    if (mode !== 'connect' || !connFrom || !connPath.length) return undefined;
    const h = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Backspace') { e.preventDefault(); setConnPath((pp) => pp.slice(0, -1)); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [mode, connFrom, connPath.length]);

  // Barra espaciadora: mientras se mantiene, arrastrar desplaza el plano.
  useEffect(() => {
    const enCampo = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    const abajo = (e) => { if (e.code === 'Space' && !enCampo(e.target)) { e.preventDefault(); setEspacio(true); } };
    const arriba = (e) => { if (e.code === 'Space') setEspacio(false); };
    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    return () => { window.removeEventListener('keydown', abajo); window.removeEventListener('keyup', arriba); };
  }, []);

  // Rueda: desplaza el plano; con Ctrl (o pellizco del trackpad) acerca o aleja
  // manteniendo fijo el punto que hay bajo el puntero.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const rueda = (e) => {
      e.preventDefault();
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const z = zoomRef.current, v = vistaRef.current;
      if (e.ctrlKey || e.metaKey) {
        const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        const q = pt.matrixTransform(ctm.inverse());
        const z2 = Math.min(4, Math.max(0.5, z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
        const f = z / z2;
        zoomPrevio.current = z2;
        setVista(limitarVista({ x: q.x - (q.x - v.x) * f, y: q.y - (q.y - v.y) * f }, z2));
        if (onZoom) onZoom(Math.round(z2 * 100) / 100);
      } else {
        setVista(limitarVista({ x: v.x + e.deltaX / ctm.a, y: v.y + e.deltaY / ctm.a }));
      }
    };
    svg.addEventListener('wheel', rueda, { passive: false });
    return () => svg.removeEventListener('wheel', rueda);
     
  }, [onZoom]);

  // Si el zoom cambia con los botones, se conserva el centro de lo que se ve.
  useEffect(() => {
    if (zoomPrevio.current === zoom) return;
    const previo = zoomPrevio.current;
    zoomPrevio.current = zoom;
    const v = vistaRef.current;
    const cxv = v.x + CANVAS_W / previo / 2, cyv = v.y + CANVAS_H / previo / 2;
    setVista(limitarVista({ x: cxv - CANVAS_W / zoom / 2, y: cyv - CANVAS_H / zoom / 2 }, zoom));
     
  }, [zoom]);

  // «Centrar»: vuelve a la esquina inicial.
  useEffect(() => { setVista({ x: 0, y: 0 }); }, [vistaKey]);

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
    <div className="overflow-hidden rounded-lg border border-border bg-card"
      style={fullscreen ? { height: '100%', minHeight: 0 } : { aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, maxHeight: '75vh', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`${vista.x} ${vista.y} ${vw} ${vh}`}
        data-prueba="plano-svg"
        data-vista={`${Math.round(vista.x)},${Math.round(vista.y)}`}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
          cursor: panDrag ? 'grabbing' : (espacio || mode === 'pan') ? 'grab' : (mode === 'wall' || mode === 'connect' || mode === 'cota' || mode === 'trazo') ? 'crosshair' : mode === 'eraser' ? 'cell' : mode === 'text' ? 'text' : mode === 'select' ? 'default' : 'copy',
        }}
        onPointerDownCapture={toqueAbajoCaptura}
        onPointerMoveCapture={toqueMovCaptura}
        onPointerUpCapture={toqueFinCaptura}
        onPointerCancelCapture={toqueFinCaptura}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
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
              <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke={sel ? '#00D4FF' : (materialDe(w)?.color || '#cbd5e1')}
                strokeWidth={Math.max(sel ? 7 : 5, (w.material || w.espesor_mm) ? Math.min(24, espesorPared(w) * scale) : 0)} strokeLinecap="butt" />
              <text x={mx} y={my - 8} textAnchor="middle" fontSize="15" fontWeight="700" fill={sel ? '#00A0E9' : 'hsl(var(--foreground))'} style={{ pointerEvents: 'none' }}>{m(len)} m{materialDe(w) ? ` · ${materialDe(w).etiqueta}` : ''}</text>
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
                <rect key={i} x={pp.x - 5} y={pp.y - 5} width="10" height="10" rx="2" fill={esRef ? colorGas : color} stroke="#fff" strokeWidth="1.5" style={{ cursor: 'move' }} data-prueba="punto-ruta" />
              ))}
              {sel && pts.slice(0, -1).map((q, j) => {
                const r = pts[j + 1];
                if (Math.hypot(r.x - q.x, r.y - q.y) <= 18) return null;
                const mx = (q.x + r.x) / 2, my = (q.y + r.y) / 2;
                return (
                  <g key={`m${j}`} style={{ cursor: 'copy' }} data-prueba="punto-medio">
                    <circle cx={mx} cy={my} r="6" fill="#fff" stroke={esRef ? colorGas : color} strokeWidth="1.5" opacity="0.9" />
                    <path d={`M${mx - 3},${my} H${mx + 3} M${mx},${my - 3} V${my + 3}`} stroke={esRef ? colorGas : color} strokeWidth="1.5" />
                  </g>
                );
              })}
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
              <g key={el.id} transform={transformacionIcono(el)} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
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

          let h = (el.h_m || 0.5) * scale;
          if ((Math.round((Number(el.rot) || 0) / 90) % 2 + 2) % 2 === 1) h = (el.w_m || 0.5) * scale;
          h = Math.max(14, h);
          return (
            <g key={el.id} transform={`translate(${el.x},${el.y})`} style={{ cursor: mode === 'select' ? 'move' : 'default' }}>
              <g transform={transformacionIcono({ ...el, x: 0, y: 0 })}>
                <PlanoSimbolo el={el} scale={scale} selected={sel} fromHere={fromHere} />
              </g>
              <text x={0} y={h / 2 + 15} textAnchor="middle" fontSize="13" fontWeight="600" fill="hsl(var(--foreground))" style={{ pointerEvents: 'none' }}>{el.label}</text>
            </g>
          );
        })}

        {/* Vista previa de pared en curso */}
        {mode === 'wall' && wallStart && mouse && (
          <g data-prueba="pared-en-curso" style={{ pointerEvents: 'none' }}>
            <line x1={wallStart.x} y1={wallStart.y} x2={mouse.x} y2={mouse.y} stroke="#00D4FF" strokeWidth="3" strokeDasharray="6 6" opacity="0.7" />
            <circle cx={wallStart.x} cy={wallStart.y} r="5" fill="#00D4FF" />
            {mouse.iman && (
              <g data-prueba="marca-iman">
                <rect x={mouse.x - 7} y={mouse.y - 7} width="14" height="14" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                <text x={mouse.x + 11} y={mouse.y - 9} fontSize="12" fontWeight="700" fill="#b45309">{mouse.iman}</text>
              </g>
            )}
            {(() => {
              const largo = Math.hypot(mouse.x - wallStart.x, mouse.y - wallStart.y);
              if (largo < 2) return null;
              const mx = (wallStart.x + mouse.x) / 2, my = (wallStart.y + mouse.y) / 2;
              const txt = tecleado ? `${tecleado} m ⏎` : `${(largo / scale).toFixed(3).replace('.', ',')} m`;
              return (
                <g>
                  <rect x={mx - 44} y={my - 30} width="88" height="22" rx="5" fill="hsl(var(--card))" stroke="#00D4FF" />
                  <text x={mx} y={my - 14} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0891b2" data-prueba="pared-medida-viva">{txt}</text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Vista previa de conexión en curso */}
        {mode === 'connect' && connFrom && mouse && (() => {
          const a = elements.find((e) => e.id === connFrom);
          if (!a) return null;
          const bruto = [{ x: a.x, y: a.y }, ...connPath, mouse];
          const preview = !polyline ? [{ x: a.x, y: a.y }, mouse] : (orto ? ortogonalizar(bruto) : bruto);
          const largoM = preview.reduce((t, q, i) => (i ? t + Math.hypot(q.x - preview[i - 1].x, q.y - preview[i - 1].y) : 0), 0) / scale;
          const codos = contarCodos(preview);
          const etiqueta = (
            <g style={{ pointerEvents: 'none' }}>
              {connPath.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r="4" fill="#fff" stroke={CONN_COLOR[connectType] || '#00D4FF'} strokeWidth="2" />)}
              <rect x={mouse.x + 12} y={mouse.y - 30} width={polyline ? 120 : 70} height="20" rx="4" fill="hsl(var(--card))" stroke={CONN_COLOR[connectType] || '#00D4FF'} />
              <text x={mouse.x + 18} y={mouse.y - 16} fontSize="12" fontWeight="700" fill="hsl(var(--foreground))" data-prueba="trazo-longitud">
                {String(Math.round(largoM * 100) / 100).replace('.', ',')} m{polyline ? ` · ${codos} codo${codos === 1 ? '' : 's'}` : ''}
              </text>
            </g>
          );
          // En tubería se previsualizan las dos líneas (gas rojo + líquido azul).
          if (connectType === 'refrigerante') {
            return (
              <g>
                <polyline points={offsetPts(preview, 4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.6" strokeLinejoin="round" />
                <polyline points={offsetPts(preview, -4).map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeDasharray="6 6" opacity="0.6" strokeLinejoin="round" />
                {etiqueta}
              </g>
            );
          }
          const color = CONN_COLOR[connectType] || '#00D4FF';
          return (
            <g>
              <polyline points={preview.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray="6 6" opacity="0.6" strokeLinejoin="round" />
              {etiqueta}
            </g>
          );
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
                  ? `Trazado a mano: clic para marcar cada punto del recorrido (${connPath.length} marcados) · clic en el equipo destino para terminar · Retroceso borra el último punto · Esc cancela`
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