import React, { useRef, useEffect, useState } from 'react';
import { Move3d, RotateCcw, Box } from 'lucide-react';
import { CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';

/**
 * Vista3DPlanoFrigorifico — ve la instalación en tres dimensiones.
 *
 * No usa WebGL (en el WebView de Android y en móviles antiguos va a tirones
 * o falla): es una proyección isométrica dibujada sobre un <canvas> normal.
 * Convierte las paredes y equipos del plano (coordenadas en píxeles) a metros
 * y los levanta: el suelo, los muros a su altura y cada equipo como un
 * bloque coloreado según su familia, con su etiqueta. Así el cliente ve cómo
 * queda la instalación antes de instalar nada.
 *
 * El lienzo se ajusta al ancho real de su contenedor con un ResizeObserver,
 * así en móvil y en tablet siempre ocupa todo el sitio disponible y el
 * auto-ajuste del zoom se calcula con el tamaño de verdad (antes usaba un
 * tamaño fijo y en pantallas pequeñas la pieza se salía o quedaba enana).
 *
 * Arrastra para girar y usa + / − para acercar.
 */
function proyectar(x, y, z, giro, zoom, cx, cy) {
  const cos = Math.cos(giro), sen = Math.sin(giro);
  const xr = x * cos - y * sen;
  const yr = x * sen + y * cos;
  const px = (xr - yr) * Math.cos(Math.PI / 6) * zoom;
  const py = (xr + yr) * Math.sin(Math.PI / 6) * zoom - z * zoom;
  return { x: cx + px, y: cy + py };
}

// Altura aproximada (m) que se le da a cada equipo en el volumen 3D.
function alturaDe(el) {
  switch (el.type) {
    case 'camara_frigorifica': return 2.6;
    case 'central_frigorifica': return 2.0;
    case 'grupo_frio': return 1.6;
    case 'condensadora_aire':
    case 'condensadora_centrifugo':
    case 'condensadora_evaporativa':
    case 'condensadora_seca':
    case 'condensadora_agua':
    case 'condensador': return 1.4;
    case 'uvt': return 1.5;
    case 'evaporador': return 0.6;
    case 'cuadro_electrico': return 1.8;
    case 'vitrina':
    case 'mural':
    case 'botellero': return 0.9;
    case 'arcon': return 0.8;
    case 'pilar': return 2.6;
    default: return Math.max(0.4, (el.h_m || 0.5));
  }
}

export default function Vista3DPlanoFrigorifico({ walls = [], elements = [], scale = 50, alturaSuelo = 2.6, compact = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [giro, setGiro] = useState(Math.PI / 5);
  const [zoom, setZoom] = useState(18);
  const [zoomTocado, setZoomTocado] = useState(false);
  const arrastre = useRef(null);
  // Tamaño real del lienzo: se mide del contenedor para que en móvil y tablet
  // el render ocupe todo el ancho disponible y el zoom se calcule con él.
  const [dims, setDims] = useState({ w: 320, h: 180 });
  const aspect = compact ? 16 / 7 : 16 / 9;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const medir = () => {
      const w = Math.max(160, Math.round(el.clientWidth));
      setDims({ w, h: Math.round(w / aspect) });
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  // Pasa píxeles del lienzo a metros.
  const m = (px) => px / scale;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = dims.w, H = dims.h;
    canvas.width = W; canvas.height = H;
    const cx = W / 2, cy = H * 0.6;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, W, H);

    // Centrar en lo dibujado.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const meter = (x, y) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    };
    walls.forEach((w) => { meter(w.x1, w.y1); meter(w.x2, w.y2); });
    elements.forEach((el) => {
      const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
      meter(el.x - w / 2, el.y - h / 2); meter(el.x + w / 2, el.y + h / 2);
    });
    if (!Number.isFinite(minX)) { minX = 0; maxX = 28; minY = 0; maxY = 18; }

    const centroM = { x: m((minX + maxX) / 2), y: m((minY + maxY) / 2) };
    const P = (x, y, z) => proyectar(x - centroM.x, y - centroM.y, z, giro, zoom, cx, cy);

    // Suelo de referencia (rejilla).
    const g0x = Math.floor(m(minX)) - 2, g1x = Math.ceil(m(maxX)) + 2;
    const g0y = Math.floor(m(minY)) - 2, g1y = Math.ceil(m(maxY)) + 2;
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (let i = g0x; i <= g1x; i++) {
      const a = P(i, g0y, 0), b = P(i, g1y, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let j = g0y; j <= g1y; j++) {
      const a = P(g0x, j, 0), b = P(g1x, j, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // Paredes levantadas como muros.
    walls.forEach((w) => {
      const x1 = m(w.x1), y1 = m(w.y1), x2 = m(w.x2), y2 = m(w.y2);
      const a0 = P(x1, y1, 0), b0 = P(x2, y2, 0);
      const a1 = P(x1, y1, alturaSuelo), b1 = P(x2, y2, alturaSuelo);
      ctx.beginPath();
      ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y);
      ctx.lineTo(b1.x, b1.y); ctx.lineTo(a1.x, a1.y); ctx.closePath();
      ctx.fillStyle = 'rgba(203,213,225,0.65)';
      ctx.fill();
      ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.stroke();
    });

    // Equipos como bloques coloreados, ordenados por profundidad para tapar bien.
    const bloques = elements
      .filter((el) => el.type !== 'texto' && el.type !== 'cota' && el.type !== 'trazo')
      .map((el) => {
        const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
        const x0 = m(el.x - w / 2), y0 = m(el.y - h / 2);
        const x1 = m(el.x + w / 2), y1 = m(el.y + h / 2);
        const alt = alturaDe(el);
        const color = CAT_COLOR[el.cat] || el.color || '#64748b';
        return { el, x0, y0, x1, y1, alt, color, prof: (x0 + x1) / 2 + (y0 + y1) / 2 };
      })
      .sort((a, b) => b.prof - a.prof);

    bloques.forEach((b) => {
      const { x0, y0, x1, y1, alt, color, el } = b;
      const s = [P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0)];
      // Techo
      const t = [P(x0, y0, alt), P(x1, y0, alt), P(x1, y1, alt), P(x0, y1, alt)];
      // Cara frontal (la que mira al observador, la de mayor y)
      const f = [P(x0, y1, 0), P(x1, y1, 0), P(x1, y1, alt), P(x0, y1, alt)];
      // Cara derecha (mayor x)
      const r = [P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, alt), P(x1, y0, alt)];

      // Sombra en el suelo
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y); s.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
      ctx.fillStyle = 'rgba(15,23,42,0.10)'; ctx.fill();

      // Caras
      const relleno = (cara, alfa) => {
        ctx.beginPath();
        ctx.moveTo(cara[0].x, cara[0].y); cara.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
        ctx.fillStyle = color + alfa; ctx.fill();
        ctx.strokeStyle = 'rgba(15,23,42,0.45)'; ctx.lineWidth = 1; ctx.stroke();
      };
      relleno(r, 'cc');
      relleno(f, 'ff');
      // Techo más claro
      ctx.beginPath();
      ctx.moveTo(t[0].x, t[0].y); t.slice(1).forEach((p) => ctx.lineTo(p.x, p.y)); ctx.closePath();
      ctx.fillStyle = color + 'aa'; ctx.fill();
      ctx.strokeStyle = 'rgba(15,23,42,0.45)'; ctx.lineWidth = 1; ctx.stroke();

      // Etiqueta
      const centro = P((x0 + x1) / 2, (y0 + y1) / 2, alt + 0.15);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(el.label || el.type, centro.x, centro.y);
      ctx.textAlign = 'left';
    });
  }, [walls, elements, scale, alturaSuelo, giro, zoom, dims]);

  // Auto-ajustar el zoom a lo dibujado mientras el usuario no lo toque.
  // Se calcula con el tamaño REAL del canvas (dims) para que el render
  // completo quepa siempre, también en pantallas pequeñas.
  useEffect(() => {
    if (zoomTocado) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const meter = (x, y) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    };
    walls.forEach((w) => { meter(w.x1, w.y1); meter(w.x2, w.y2); });
    elements.forEach((el) => {
      const w = (el.w_m || 0.5) * scale, h = (el.h_m || 0.5) * scale;
      meter(el.x - w / 2, el.y - h / 2); meter(el.x + w / 2, el.y + h / 2);
    });
    if (!Number.isFinite(minX)) return;
    const dx = Math.max(2, m(maxX - minX)) + 2;
    const dy = Math.max(2, m(maxY - minY)) + 2;
    const diag = dx + dy;
    const W = dims.w, H = dims.h;
    const margen = 36;
    const cos30 = Math.cos(Math.PI / 6);
    const sin30 = Math.sin(Math.PI / 6);
    const zoomW = (W - margen * 2) / (diag * cos30);
    const zoomH = (H - margen * 2) / (diag * sin30 + alturaSuelo);
    setZoom(Math.max(6, Math.min(compact ? 60 : 48, Math.min(zoomW, zoomH))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walls, elements, zoomTocado, dims, alturaSuelo, compact]);

  const alPulsar = (ev) => { ev.currentTarget.setPointerCapture?.(ev.pointerId); arrastre.current = { x: ev.clientX, giro }; };
  const alMover = (ev) => { if (!arrastre.current) return; setGiro(arrastre.current.giro + (ev.clientX - arrastre.current.x) * 0.01); };
  const alSoltar = () => { arrastre.current = null; };

  const hayAlgo = walls.length > 0 || elements.some((e) => e.type !== 'texto' && e.type !== 'cota' && e.type !== 'trazo');

  if (compact) {
    // Vista mini para el panel lateral: no se arrastra (no-interactiva) y al
    // tocarla abre el visor grande. El lienzo se ajusta al ancho del panel.
    return (
      <div ref={containerRef} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 w-full">
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ height: 'auto', pointerEvents: 'none', touchAction: 'none' }}
        />
        {!hayAlgo && (
          <p className="text-[10px] text-slate-400 text-center py-1 flex items-center justify-center gap-1">
            <Box className="w-3 h-3" /> Coloca equipos y aparecerán aquí en 3D.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Move3d className="w-3.5 h-3.5" /> Arrastra para girar la vista
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => { setZoomTocado(true); setZoom((z) => Math.max(6, z - 3)); }}
            className="px-2 py-1 text-xs border rounded hover:bg-slate-50">−</button>
          <button onClick={() => { setZoomTocado(true); setZoom((z) => Math.min(48, z + 3)); }}
            className="px-2 py-1 text-xs border rounded hover:bg-slate-50">+</button>
          <button onClick={() => { setGiro(Math.PI / 5); setZoomTocado(false); }}
            className="px-2 py-1 text-xs border rounded hover:bg-slate-50 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Centrar
          </button>
        </div>
      </div>

      <div ref={containerRef} className="w-full touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={alPulsar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          className="block w-full border border-slate-200 rounded-lg cursor-grab active:cursor-grabbing"
          style={{ height: 'auto', touchAction: 'none' }}
        />
      </div>

      {!hayAlgo && (
        <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
          <Box className="w-3.5 h-3.5" /> Coloca paredes y equipos en el plano y aparecerán aquí en 3D.
        </p>
      )}
    </div>
  );
}