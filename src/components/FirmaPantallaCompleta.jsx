import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, Check, X, Loader2, AlertCircle, Smartphone } from 'lucide-react';
import { cajaDeTrazos, ajusteSalida, firmaValida, SALIDA } from '@/lib/firmaTrazos';

/**
 * Panel de firma a PANTALLA COMPLETA para móvil, tableta y portátil.
 *
 * - Ocupa toda la pantalla y se pinta fuera de cualquier diálogo (portal en
 *   <body>), así que ningún contenedor con transformaciones lo desplaza.
 * - Bloquea el desplazamiento de la página mientras está abierto: no se mueve
 *   al firmar. Se recupera la posición exacta al cerrar.
 * - Usa eventos de puntero (dedo, lápiz y ratón) con touch-action: none.
 * - Conserva la firma al girar el dispositivo o cambiar el tamaño de la ventana.
 * - La imagen final se recorta a la firma y se encaja en un formato fijo.
 *
 * `onConfirmar(dataUrl, fechaHora)` puede ser asíncrona; si falla se muestra el
 * error sin cerrar para no perder la firma.
 */
const fechaHora = () => {
  const n = new Date(); const p = (x) => String(x).padStart(2, '0');
  return `${p(n.getDate())}/${p(n.getMonth() + 1)}/${n.getFullYear()} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;
};

export default function FirmaPantallaCompleta({ abierto, titulo = 'Firma', subtitulo = '', color = '#1e3a5f', formato = 'jpeg', onConfirmar, onCancelar }) {
  const overlayRef = useRef(null);
  const areaRef = useRef(null);
  const canvasRef = useRef(null);
  const trazos = useRef([]);          // [{x,y}] por trazo, en px CSS
  const actual = useRef(null);
  const [hayFirma, setHayFirma] = useState(false);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [vertical, setVertical] = useState(false);

  const pintar = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); const dpr = canvas.width / Math.max(canvas.clientWidth, 1);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.strokeStyle = color; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const t of trazos.current) {
      if (!t.length) continue;
      ctx.beginPath(); ctx.moveTo(t[0].x, t[0].y);
      if (t.length === 1) ctx.lineTo(t[0].x + 0.01, t[0].y);
      for (let i = 1; i < t.length - 1; i++) { const m = { x: (t[i].x + t[i + 1].x) / 2, y: (t[i].y + t[i + 1].y) / 2 }; ctx.quadraticCurveTo(t[i].x, t[i].y, m.x, m.y); }
      if (t.length > 1) ctx.lineTo(t[t.length - 1].x, t[t.length - 1].y);
      ctx.stroke();
    }
  }, [color]);

  // Ajusta el tamaño real del lienzo al del área (y a la densidad de la pantalla).
  const ajustar = useCallback(() => {
    const area = areaRef.current, canvas = canvasRef.current; if (!area || !canvas) return;
    const w = Math.max(area.clientWidth, 1), h = Math.max(area.clientHeight, 1), dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    setVertical(window.innerHeight > window.innerWidth && window.innerWidth < 700);
    pintar();
  }, [pintar]);

  // Bloquea el desplazamiento de la página y la restaura al cerrar.
  useLayoutEffect(() => {
    if (!abierto) return undefined;
    const y = window.scrollY, b = document.body, h = document.documentElement;
    const previo = { pos: b.style.position, top: b.style.top, w: b.style.width, ov: b.style.overflow, hov: h.style.overflow, ob: h.style.overscrollBehavior };
    b.style.position = 'fixed'; b.style.top = `-${y}px`; b.style.width = '100%'; b.style.overflow = 'hidden'; h.style.overflow = 'hidden'; h.style.overscrollBehavior = 'none';
    return () => {
      b.style.position = previo.pos; b.style.top = previo.top; b.style.width = previo.w; b.style.overflow = previo.ov; h.style.overflow = previo.hov; h.style.overscrollBehavior = previo.ob;
      window.scrollTo(0, y);
    };
  }, [abierto]);

  // Estado limpio cada vez que se abre.
  useEffect(() => { if (abierto) { trazos.current = []; actual.current = null; setHayFirma(false); setError(''); setGuardando(false); } }, [abierto]);

  useEffect(() => {
    if (!abierto) return undefined;
    ajustar();
    const ro = new ResizeObserver(ajustar); if (areaRef.current) ro.observe(areaRef.current);
    window.addEventListener('orientationchange', ajustar);
    return () => { ro.disconnect(); window.removeEventListener('orientationchange', ajustar); };
  }, [abierto, ajustar]);

  // Eventos nativos: dibujo con puntero y aislamiento de los diálogos de debajo.
  useEffect(() => {
    const overlay = overlayRef.current, canvas = canvasRef.current;
    if (!abierto || !overlay || !canvas) return undefined;
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const bajar = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
      actual.current = [pos(e)]; trazos.current.push(actual.current); setError(''); pintar();
    };
    const mover = (e) => {
      if (!actual.current) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of (evs.length ? evs : [e])) actual.current.push(pos(ev));
      pintar();
    };
    const subir = (e) => { if (!actual.current) return; actual.current = null; setHayFirma(firmaValida(trazos.current, 3, 6)); try { canvas.releasePointerCapture(e.pointerId); } catch { /* ya liberado */ } };
    canvas.addEventListener('pointerdown', bajar); canvas.addEventListener('pointermove', mover);
    canvas.addEventListener('pointerup', subir); canvas.addEventListener('pointercancel', subir);
    // La página de debajo no debe enterarse (un diálogo la cerraría al "tocar fuera") ni robar el foco.
    const aislar = (e) => e.stopPropagation();
    const noMover = (e) => e.preventDefault();
    ['pointerdown', 'mousedown', 'touchstart', 'focusin', 'focusout', 'keydown'].forEach((n) => overlay.addEventListener(n, aislar));
    ['touchmove', 'gesturestart', 'contextmenu', 'wheel'].forEach((n) => overlay.addEventListener(n, noMover, { passive: false }));
    return () => {
      canvas.removeEventListener('pointerdown', bajar); canvas.removeEventListener('pointermove', mover);
      canvas.removeEventListener('pointerup', subir); canvas.removeEventListener('pointercancel', subir);
      ['pointerdown', 'mousedown', 'touchstart', 'focusin', 'focusout', 'keydown'].forEach((n) => overlay.removeEventListener(n, aislar));
      ['touchmove', 'gesturestart', 'contextmenu', 'wheel'].forEach((n) => overlay.removeEventListener(n, noMover));
    };
  }, [abierto, pintar]);

  const borrar = () => { trazos.current = []; actual.current = null; setHayFirma(false); setError(''); pintar(); };

  const imagenFinal = () => {
    const caja = cajaDeTrazos(trazos.current); const aj = ajusteSalida(caja); if (!aj) return null;
    const out = document.createElement('canvas'); out.width = SALIDA.ancho; out.height = SALIDA.alto;
    const ctx = out.getContext('2d');
    if (formato === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, out.width, out.height); }
    ctx.strokeStyle = color; ctx.lineWidth = SALIDA.grosor; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const t of trazos.current) {
      if (!t.length) continue;
      const P = t.map((p) => ({ x: p.x * aj.escala + aj.dx, y: p.y * aj.escala + aj.dy }));
      ctx.beginPath(); ctx.moveTo(P[0].x, P[0].y); if (P.length === 1) ctx.lineTo(P[0].x + 0.01, P[0].y);
      for (let i = 1; i < P.length - 1; i++) ctx.quadraticCurveTo(P[i].x, P[i].y, (P[i].x + P[i + 1].x) / 2, (P[i].y + P[i + 1].y) / 2);
      if (P.length > 1) ctx.lineTo(P[P.length - 1].x, P[P.length - 1].y);
      ctx.stroke();
    }
    return formato === 'png' ? out.toDataURL('image/png') : out.toDataURL('image/jpeg', 0.85);
  };

  const confirmar = async () => {
    if (!firmaValida(trazos.current)) { setError('Firme con más detalle antes de continuar.'); return; }
    const img = imagenFinal(); if (!img) { setError('Debes firmar antes de continuar.'); return; }
    setGuardando(true); setError('');
    try { await onConfirmar?.(img, fechaHora()); }
    catch { setError('No se pudo guardar la firma. Comprueba tu conexión e inténtalo de nuevo.'); setGuardando(false); }
  };

  if (!abierto || typeof document === 'undefined') return null;
  return createPortal(
    <div ref={overlayRef} data-testid="firma-pantalla-completa" role="dialog" aria-modal="true" aria-label={titulo}
      className="fixed inset-0 z-[2147483000] flex flex-col bg-white select-none"
      style={{ touchAction: 'none', overscrollBehavior: 'none', pointerEvents: 'auto', height: '100dvh', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <header className="flex items-center justify-between gap-3 border-b bg-gray-50 px-4 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-800">{titulo}</p>
          <p className="truncate text-xs text-gray-500">{subtitulo || 'Firme con el dedo, el lápiz o el ratón dentro del recuadro'}</p>
        </div>
        <button type="button" onClick={() => !guardando && onCancelar?.()} disabled={guardando} aria-label="Cancelar" data-testid="firma-cancelar"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border bg-white px-3 py-2 text-sm text-gray-600 active:bg-gray-100"><X className="h-4 w-4" /> Cancelar</button>
      </header>

      <div className="relative flex-1 p-3" style={{ minHeight: 0 }}>
        <div ref={areaRef} className="relative h-full w-full overflow-hidden rounded-xl border-2 border-dashed bg-white" style={{ borderColor: color, minHeight: 0 }}>
          <canvas ref={canvasRef} data-testid="firma-lienzo" className="absolute inset-0 block cursor-crosshair" style={{ touchAction: 'none' }} />
          {!hayFirma && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="text-2xl text-gray-200">Firme aquí</span></div>}
          <div className="pointer-events-none absolute inset-x-8 bottom-[22%] border-b border-gray-300" aria-hidden />
        </div>
        {vertical && (
          <p className="pointer-events-none absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs text-white"><Smartphone className="h-3 w-3 rotate-90" /> Gire el móvil para firmar con más espacio</p>
        )}
      </div>

      {error && (
        <div className="mx-3 mb-2 flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>
      )}
      <footer className="flex gap-3 border-t bg-gray-50 px-3 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={borrar} disabled={guardando} data-testid="firma-borrar" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border bg-white py-3 text-base font-medium text-gray-700 active:bg-gray-100"><RotateCcw className="h-5 w-5" /> Borrar</button>
        <button type="button" onClick={confirmar} disabled={guardando} data-testid="firma-confirmar" className="inline-flex flex-[2] items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold text-white disabled:opacity-60" style={{ background: color }}>
          {guardando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}{guardando ? 'Guardando…' : 'Confirmar firma'}
        </button>
      </footer>
    </div>,
    document.body,
  );
}
