import React, { useRef, useEffect, useState } from 'react';
import { Move3d, RotateCcw } from 'lucide-react';

/**
 * Vista3DPlano — el plano en tres dimensiones.
 *
 * Sirve para ver de un vistazo cómo queda la instalación entre plantas: por
 * dónde baja la tubería, dónde queda la unidad exterior y si el recorrido
 * cruza media casa. En planta eso no se aprecia; en 3D, sí.
 *
 * Está dibujado con proyección isométrica sobre un lienzo normal, NO con
 * WebGL. Es a propósito: en móviles antiguos y en el WebView de Android el 3D
 * por hardware falla o va a tirones, y aquí no hace falta nada más: son cajas,
 * líneas y poco más. Así funciona en cualquier cacharro y sin descargar nada.
 */

/** Proyección isométrica: pasa un punto (x, y, z) en metros a píxeles. */
function proyectar(x, y, z, giro, zoom, centroX, centroY) {
  // Girar sobre el eje vertical para poder mirar la casa por otro lado.
  const cos = Math.cos(giro), sen = Math.sin(giro);
  const xr = x * cos - y * sen;
  const yr = x * sen + y * cos;

  // Isométrica clásica: 30° a cada lado, y la altura sube en pantalla.
  const px = (xr - yr) * Math.cos(Math.PI / 6) * zoom;
  const py = (xr + yr) * Math.sin(Math.PI / 6) * zoom - z * zoom;
  return { x: centroX + px, y: centroY + py };
}

export default function Vista3DPlano({ plantas = [], exterior = null, alturaDefecto = 2.5, recorridos = [] }) {
  const canvasRef = useRef(null);
  const [giro, setGiro] = useState(Math.PI / 5);
  const [zoom, setZoom] = useState(20);
  const [zoomTocado, setZoomTocado] = useState(false);
  const arrastreRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H * 0.62;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, W, H);

    // Centrar en lo dibujado: si no, se dibuja algo en una esquina del plano
    // y en 3D no se ve, que es lo que pasaba antes.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const meter = (x, y) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    };
    for (const pl of plantas) {
      for (const e of pl.estancias || []) { meter(e.x, e.y); meter(e.x + e.ancho, e.y + e.alto); }
      for (const m of pl.maquinas || []) meter(m.x, m.y);
    }
    for (const rec of recorridos) for (const pt of (rec.puntos || [])) meter(pt.x, pt.y);
    if (exterior) meter(exterior.x, exterior.y);
    if (!Number.isFinite(minX)) { minX = 0; maxX = 12; minY = 0; maxY = 9; }

    const centroM = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    const P = (x, y, z) => proyectar(x - centroM.x, y - centroM.y, z, giro, zoom, cx, cy);

    // ── Suelo de referencia ──────────────────────────────────────────────
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    const g0x = Math.floor(minX) - 3, g1x = Math.ceil(maxX) + 3;
    const g0y = Math.floor(minY) - 3, g1y = Math.ceil(maxY) + 3;
    for (let i = g0x; i <= g1x; i++) {
      const a = P(i, g0y, 0), b = P(i, g1y, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (let j = g0y; j <= g1y; j++) {
      const a = P(g0x, j, 0), b = P(g1x, j, 0);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    // ── Plantas, de abajo arriba para que tapen bien ─────────────────────
    const ordenadas = [...plantas].sort((a, b) => (a.cota || 0) - (b.cota || 0));

    for (const planta of ordenadas) {
      const base = Number(planta.cota) || 0;

      for (const e of planta.estancias || []) {
        const alto = Number(e.altura) || alturaDefecto;
        const x0 = e.x, y0 = e.y, x1 = e.x + e.ancho, y1 = e.y + e.alto;
        const techo = base + alto;

        // Suelo de la estancia
        const s = [P(x0, y0, base), P(x1, y0, base), P(x1, y1, base), P(x0, y1, base)];
        ctx.beginPath();
        ctx.moveTo(s[0].x, s[0].y);
        s.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        ctx.fillStyle = 'rgba(148,163,184,0.30)';
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Paredes: solo las dos que se ven de frente, para no emborronar.
        const paredes = [
          [[x0, y1], [x1, y1]],
          [[x1, y0], [x1, y1]],
        ];
        for (const [[ax, ay], [bx, by]] of paredes) {
          const a0 = P(ax, ay, base), b0 = P(bx, by, base);
          const a1 = P(ax, ay, techo), b1 = P(bx, by, techo);
          ctx.beginPath();
          ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y);
          ctx.lineTo(b1.x, b1.y); ctx.lineTo(a1.x, a1.y);
          ctx.closePath();
          ctx.fillStyle = 'rgba(203,213,225,0.55)';
          ctx.fill();
          ctx.strokeStyle = '#94a3b8';
          ctx.stroke();
        }

        // Aristas verticales de las esquinas
        ctx.strokeStyle = '#cbd5e1';
        for (const [vx, vy] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]) {
          const a = P(vx, vy, base), b = P(vx, vy, techo);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }

        // Nombre de la estancia
        const centro = P(x0 + e.ancho / 2, y0 + e.alto / 2, base + 0.1);
        ctx.fillStyle = '#334155';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.nombre || 'Estancia', centro.x, centro.y);
        ctx.textAlign = 'left';
      }

      // ── Equipos de esta planta ─────────────────────────────────────────
      for (const m of planta.maquinas || []) {
        // Los interiores van colgados cerca del techo; el resto, en el suelo.
        const colgado = ['mural', 'cassette', 'conductos'].includes(m.tipo);
        const z = base + (colgado ? (alturaDefecto - 0.4) : 0.3);
        const p = P(m.x, m.y, z);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Palito hasta el suelo, para situarlo en el espacio
        const suelo = P(m.x, m.y, base);
        ctx.strokeStyle = 'rgba(239,68,68,0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(suelo.x, suelo.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── Recorridos de tubería dibujados a mano ───────────────────────────
    for (const rec of recorridos) {
      if (!rec?.puntos || rec.puntos.length < 2) continue;
      const z = (Number(rec.cota) || 0) + (Number(alturaDefecto) || 2.5) - 0.3;
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      rec.puntos.forEach((pt, i) => {
        const p = P(pt.x, pt.y, z);
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Bajada hasta la unidad exterior
      if (exterior) {
        const ultimo = rec.puntos[rec.puntos.length - 1];
        const a = P(ultimo.x, ultimo.y, z);
        const b = P(exterior.x, exterior.y, 0.4);
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── Unidad exterior ──────────────────────────────────────────────────
    if (exterior) {
      const p = P(exterior.x, exterior.y, 0.4);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(p.x - 11, p.y - 9, 22, 18);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x - 11, p.y - 9, 22, 18);
      ctx.fillStyle = '#0f766e';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXTERIOR', p.x, p.y + 24);
      ctx.textAlign = 'left';
    }
  }, [plantas, exterior, alturaDefecto, recorridos, giro, zoom]);

  // Ajustar el zoom a lo que hay dibujado, mientras el usuario no lo toque.
  useEffect(() => {
    if (zoomTocado) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const meter = (x, y) => {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    };
    for (const pl of plantas) {
      for (const e of pl.estancias || []) { meter(e.x, e.y); meter(e.x + e.ancho, e.y + e.alto); }
    }
    if (exterior) meter(exterior.x, exterior.y);
    if (!Number.isFinite(minX)) return;
    const ancho = Math.max(4, (maxX - minX) + (maxY - minY) + 6);
    setZoom(Math.max(7, Math.min(34, 640 / ancho)));
  }, [plantas, exterior, zoomTocado]);

  // Girar arrastrando: es lo primero que intenta cualquiera al ver un 3D.
  const alPulsar = (ev) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    arrastreRef.current = { x: ev.clientX, giro };
  };
  const alMover = (ev) => {
    if (!arrastreRef.current) return;
    const dx = ev.clientX - arrastreRef.current.x;
    setGiro(arrastreRef.current.giro + dx * 0.01);
  };
  const alSoltar = () => { arrastreRef.current = null; };

  const hayAlgo = plantas.some(p => (p.estancias || []).length > 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Move3d className="w-3.5 h-3.5" />
          Arrastra para girar la vista
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => { setZoomTocado(true); setZoom(z => Math.max(6, z - 3)); }}
            className="px-2 py-1 text-xs border rounded hover:bg-slate-50">−</button>
          <button onClick={() => { setZoomTocado(true); setZoom(z => Math.min(45, z + 3)); }}
            className="px-2 py-1 text-xs border rounded hover:bg-slate-50">+</button>
          <button onClick={() => { setGiro(Math.PI / 5); setZoomTocado(false); }}
            className="px-2 py-1 text-xs border rounded hover:bg-slate-50 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />Centrar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <canvas
          ref={canvasRef}
          width={900}
          height={520}
          onPointerDown={alPulsar}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          className="border border-slate-200 rounded touch-none cursor-grab active:cursor-grabbing"
          style={{ minWidth: 560, width: '100%' }}
        />
      </div>

      {!hayAlgo && (
        <p className="text-xs text-slate-400 text-center">
          Dibuja alguna estancia en el plano y aparecerá aquí en tres dimensiones.
        </p>
      )}
    </div>
  );
}
