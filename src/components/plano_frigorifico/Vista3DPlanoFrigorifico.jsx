import React, { useRef, useEffect, useState } from 'react';
import { Move3d, RotateCcw, Box } from 'lucide-react';
// El dibujo vive en un módulo compartido porque la misma vista se usa para
// el archivo PNG que se guarda junto al plano (ver generarVista3DPng).
import { dibujarVista3D, calcularZoomAjustado, ALTURA_SUELO } from '@/lib/planoVista3D';

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
export default function Vista3DPlanoFrigorifico({ walls = [], elements = [], scale = 50, alturaSuelo = ALTURA_SUELO }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [giro, setGiro] = useState(Math.PI / 5);
  const [zoom, setZoom] = useState(18);
  const [zoomTocado, setZoomTocado] = useState(false);
  const arrastre = useRef(null);
  // Tamaño real del lienzo: se mide del contenedor para que en móvil y tablet
  // el render ocupe todo el ancho disponible y el zoom se calcule con él.
  const [dims, setDims] = useState({ w: 320, h: 180 });
  const aspect = 16 / 9;

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = dims.w; canvas.height = dims.h;
    dibujarVista3D(ctx, dims.w, dims.h, { walls, elements, scale, alturaSuelo, giro, zoom });
  }, [walls, elements, scale, alturaSuelo, giro, zoom, dims]);

  // Auto-ajustar el zoom a lo dibujado mientras el usuario no lo toque.
  // Se calcula con el tamaño REAL del canvas (dims) para que el render
  // completo quepa siempre, también en pantallas pequeñas.
  useEffect(() => {
    if (zoomTocado) return;
    const z = calcularZoomAjustado(dims.w, dims.h, { walls, elements, scale, alturaSuelo, maxZoom: 48 });
    if (z != null) setZoom(z);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walls, elements, zoomTocado, dims, alturaSuelo, scale]);

  const alPulsar = (ev) => { ev.currentTarget.setPointerCapture?.(ev.pointerId); arrastre.current = { x: ev.clientX, giro }; };
  const alMover = (ev) => { if (!arrastre.current) return; setGiro(arrastre.current.giro + (ev.clientX - arrastre.current.x) * 0.01); };
  const alSoltar = () => { arrastre.current = null; };

  const hayAlgo = walls.length > 0 || elements.some((e) => e.type !== 'texto' && e.type !== 'cota' && e.type !== 'trazo');

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