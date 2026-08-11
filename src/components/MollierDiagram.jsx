import React, { useRef, useEffect, useState, useCallback } from 'react';

// ─── Datos termodinámicos reales (ASHRAE/NIST) ────────────────────────────────
// Ciclo ideal de compresión de vapor: Te=7°C (evap) Tc=50°C (cond)
const REF_DATA = {
  'R-32': {
    label:'R-32', gwp:675, color:'#3b82f6',
    Te:7, Tc:50, Pe:9.52, Pc:28.35,
    h1:488.8, h2:537.4, h3:271.9, h4:271.9,
    hMin:200, hMax:600, pMin:4, pMax:45,
    Tcrit:78.1, Pcrit:57.82,
    desc:'Sustituto R-22, bajo GWP, alta eficiencia',
  },
  'R-410A': {
    label:'R-410A', gwp:2088, color:'#8b5cf6',
    Te:7, Tc:50, Pe:12.12, Pc:33.95,
    h1:423.5, h2:458.2, h3:275.1, h4:275.1,
    hMin:180, hMax:520, pMin:8, pMax:55,
    Tcrit:72.1, Pcrit:49.26,
    desc:'Muy extendido, alto GWP, se está sustituyendo',
  },
  'R-290': {
    label:'R-290 (Propano)', gwp:3, color:'#10b981',
    Te:7, Tc:50, Pe:7.06, Pc:18.93,
    h1:571.9, h2:630.4, h3:332.7, h4:332.7,
    hMin:250, hMax:740, pMin:3, pMax:32,
    Tcrit:96.7, Pcrit:42.47,
    desc:'Natural, GWP mínimo, inflamable A3',
  },
  'R-134a': {
    label:'R-134a', gwp:1430, color:'#f59e0b',
    Te:7, Tc:50, Pe:3.08, Pc:13.18,
    h1:415.6, h2:447.8, h3:271.8, h4:271.8,
    hMin:160, hMax:510, pMin:1.5, pMax:22,
    Tcrit:101.1, Pcrit:40.59,
    desc:'Muy común en automoción y frigoríficos',
  },
  'R-407C': {
    label:'R-407C', gwp:1774, color:'#ef4444',
    Te:7, Tc:50, Pe:5.17, Pc:18.15,
    h1:430.8, h2:468.3, h3:279.4, h4:279.4,
    hMin:190, hMax:560, pMin:3, pMax:30,
    Tcrit:86.7, Pcrit:46.34,
    desc:'Mezcla zeotrópica, sustituto R-22',
  },
  'R-454B': {
    label:'R-454B', gwp:466, color:'#06b6d4',
    Te:7, Tc:50, Pe:10.2, Pc:29.8,
    h1:491.0, h2:542.0, h3:280.0, h4:280.0,
    hMin:200, hMax:610, pMin:5, pMax:45,
    Tcrit:76.1, Pcrit:52.9,
    desc:'Sustituto R-410A, bajo GWP, mínima modificación',
  },
};

// Función segura: evita NaN e Infinity
function safe(v, dec = 2) {
  if (v === null || v === undefined) return '—';
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? n.toFixed(dec) : '—';
}

function safeNum(v, fallback = 0) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return isFinite(n) ? n : fallback;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MollierDiagram({ refrigerante = 'R-32', potenciaKw = 3.5, onRefrigeranteChange }) {
  const canvasRef = useRef(null);
  const [hover, setHover]         = useState(null);   // punto bajo el cursor
  const [selected, setSelected]   = useState(null);   // punto seleccionado con clic
  const [zoom, setZoom]           = useState(1);
  const [pan, setPan]             = useState({ x:0, y:0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef(null);

  const d   = REF_DATA[refrigerante] || REF_DATA['R-32'];
  const Qf  = safeNum(potenciaKw, 3.5);

  // ── Cálculos del ciclo ────────────────────────────────────────────────────
  const hEvap  = safeNum(d.h1 - d.h4, 1);
  const hComp  = safeNum(d.h2 - d.h1, 1);
  const hCond  = safeNum(d.h2 - d.h3, 1);
  const mRef   = hEvap > 0 ? Qf / hEvap : 0;
  const Qc     = safeNum(mRef * hCond);
  const Wcomp  = safeNum(mRef * hComp);
  const COP    = hComp > 0 ? safeNum(hEvap / hComp) : 0;
  const EER    = safeNum(COP * 3.412); // en BTU/W·h

  // ── Puntos del ciclo ──────────────────────────────────────────────────────
  const CYCLE_PTS = [
    { id:'1', label:'1 — Salida evaporador',   h:d.h1, p:d.Pe, color:'#22d3ee', T:d.Te,  state:'Vapor saturado seco',       phase:'Vapor' },
    { id:'2', label:'2 — Salida compresor',    h:d.h2, p:d.Pc, color:'#f97316', T:d.Tc+15, state:'Vapor sobrecalentado',    phase:'Vapor' },
    { id:'3', label:'3 — Salida condensador',  h:d.h3, p:d.Pc, color:'#a78bfa', T:d.Tc,  state:'Líquido saturado',          phase:'Líquido' },
    { id:'4', label:'4 — Salida expansión',    h:d.h4, p:d.Pe, color:'#34d399', T:d.Te,  state:'Mezcla líquido-vapor',      phase:'Bifásico' },
  ];

  // ── Dibujo en Canvas ──────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Márgenes y rango
    const pad = { l:58, r:24, t:36, b:48 };
    const hRange = safeNum(d.hMax - d.hMin, 400);
    const logPMin = Math.log(safeNum(d.pMin, 1));
    const logPMax = Math.log(safeNum(d.pMax, 50));
    const logRange = safeNum(logPMax - logPMin, 3);

    // Transformaciones (con zoom y pan)
    const toX = (hv) => {
      const base = pad.l + ((safeNum(hv) - d.hMin) / hRange) * (W - pad.l - pad.r);
      return base * zoom + pan.x;
    };
    const toY = (pBar) => {
      const p = Math.max(d.pMin * 0.5, Math.min(d.pMax * 2, safeNum(pBar, d.pMin)));
      const logP = Math.log(p);
      const base = H - pad.b - ((logP - logPMin) / logRange) * (H - pad.t - pad.b);
      return base * zoom + pan.y;
    };

    // ── Fondo ───────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // ── Grid ────────────────────────────────────────────────────────────────
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth   = 0.5;

    // Líneas verticales (entalpía)
    const hStep = hRange > 300 ? 50 : 25;
    for (let hv = Math.ceil(d.hMin / hStep) * hStep; hv <= d.hMax; hv += hStep) {
      const x = toX(hv);
      ctx.beginPath(); ctx.moveTo(x, pad.t * zoom + pan.y); ctx.lineTo(x, (H - pad.b) * zoom + pan.y); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.font = '8px monospace'; ctx.textAlign = 'center';
      ctx.fillText(hv, x, (H - pad.b + 14) * zoom + pan.y);
    }

    // Líneas horizontales (presión, escala logarítmica)
    const pVals = [];
    let pv = d.pMin;
    while (pv <= d.pMax * 1.01) {
      pVals.push(parseFloat(pv.toFixed(2)));
      pv = pv < 1 ? pv * 2 : pv < 5 ? pv + 1 : pv < 20 ? pv + 2.5 : pv < 50 ? pv + 5 : pv + 10;
    }
    pVals.forEach(p => {
      const y = toY(p);
      ctx.beginPath(); ctx.moveTo(pad.l * zoom + pan.x, y); ctx.lineTo((W - pad.r) * zoom + pan.x, y); ctx.stroke();
      ctx.fillStyle = '#475569'; ctx.font = '8px monospace'; ctx.textAlign = 'right';
      ctx.fillText(p % 1 === 0 ? p : p.toFixed(1), pad.l * zoom + pan.x - 4, y + 3);
    });

    // ── Curva de saturación (campana) ────────────────────────────────────────
    const satPts = [];
    // Rama líquida (de Te a Tcrit)
    for (let f = 0; f <= 1; f += 0.04) {
      const h = d.h4 + f * (d.h3 - d.h4) * 0.95;
      const p = d.Pe * Math.exp(f * Math.log(Math.max(0.001, d.Pcrit / d.Pe)));
      if (isFinite(h) && isFinite(p) && p > 0) satPts.push({ h, p, liq: true });
    }
    // Punto crítico
    satPts.push({ h: (d.h1 + d.h4) / 2 + (d.h3 - d.h4) * 0.1, p: d.Pcrit, crit: true });
    // Rama vapor (de Tcrit a Te)
    for (let f = 1; f >= 0; f -= 0.04) {
      const h = d.h4 + f * (d.h1 - d.h4) * 1.02;
      const p = d.Pe * Math.exp(f * Math.log(Math.max(0.001, d.Pcrit / d.Pe)));
      if (isFinite(h) && isFinite(p) && p > 0) satPts.push({ h, p, liq: false });
    }

    // Relleno zona bifásica
    if (satPts.length > 2) {
      ctx.beginPath();
      satPts.forEach((pt, i) => {
        const x = toX(pt.h), y = toY(pt.p);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = d.color + '18';
      ctx.fill();
    }

    // Línea de saturación
    ctx.beginPath();
    satPts.forEach((pt, i) => {
      const x = toX(pt.h), y = toY(pt.p);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = d.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Punto crítico
    const cx = toX((d.h1 + d.h4) / 2 + (d.h3 - d.h4) * 0.1);
    const cy = toY(d.Pcrit);
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = d.color; ctx.fill();
    ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`Pc=${safe(d.Pcrit,1)}bar Tc=${d.Tcrit}°C`, cx + 7, cy + 3);

    // ── Ciclo frigorífico ────────────────────────────────────────────────────
    // Relleno interior
    ctx.beginPath();
    ctx.moveTo(toX(d.h1), toY(d.Pe));
    ctx.lineTo(toX(d.h2), toY(d.Pc));
    ctx.lineTo(toX(d.h3), toY(d.Pc));
    ctx.lineTo(toX(d.h4), toY(d.Pe));
    ctx.closePath();
    ctx.fillStyle = 'rgba(251,191,36,0.06)';
    ctx.fill();

    // Líneas del ciclo con flechas
    const segs = [
      { x1:toX(d.h1),y1:toY(d.Pe), x2:toX(d.h2),y2:toY(d.Pc), color:'#f97316', label:'COMPRESIÓN' },
      { x1:toX(d.h2),y1:toY(d.Pc), x2:toX(d.h3),y2:toY(d.Pc), color:'#a78bfa', label:'CONDENSACIÓN' },
      { x1:toX(d.h3),y1:toY(d.Pc), x2:toX(d.h4),y2:toY(d.Pe), color:'#34d399', label:'EXPANSIÓN' },
      { x1:toX(d.h4),y1:toY(d.Pe), x2:toX(d.h1),y2:toY(d.Pe), color:'#22d3ee', label:'EVAPORACIÓN' },
    ];

    segs.forEach(seg => {
      if (!isFinite(seg.x1)||!isFinite(seg.y1)||!isFinite(seg.x2)||!isFinite(seg.y2)) return;
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.strokeStyle = seg.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Flecha en el punto medio
      const mx = (seg.x1 + seg.x2) / 2, my = (seg.y1 + seg.y2) / 2;
      const ang = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
      ctx.beginPath();
      ctx.moveTo(mx + Math.cos(ang) * 6, my + Math.sin(ang) * 6);
      ctx.lineTo(mx + Math.cos(ang - 2.4) * 10, my + Math.sin(ang - 2.4) * 10);
      ctx.lineTo(mx + Math.cos(ang + 2.4) * 10, my + Math.sin(ang + 2.4) * 10);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      // Etiqueta
      ctx.fillStyle = seg.color + 'cc';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(seg.label, mx, my - 8);
    });

    // ── Puntos del ciclo ────────────────────────────────────────────────────
    CYCLE_PTS.forEach(pt => {
      const x = toX(pt.h), y = toY(pt.p);
      if (!isFinite(x) || !isFinite(y)) return;
      // Halo
      ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = pt.color + '30'; ctx.fill();
      // Punto
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = pt.color; ctx.fill();
      ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 1.5; ctx.stroke();
      // Número
      ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
      ctx.fillText(pt.id, x, y + 3);
    });

    // ── Punto hover interactivo ──────────────────────────────────────────────
    if (hover && isFinite(toX(hover.h)) && isFinite(toY(hover.p))) {
      const hx = toX(hover.h), hy = toY(hover.p);
      ctx.beginPath(); ctx.arc(hx, hy, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.stroke();
    }

    // ── Ejes ────────────────────────────────────────────────────────────────
    ctx.strokeStyle = '#64748b'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l * zoom + pan.x, pad.t * zoom + pan.y);
    ctx.lineTo(pad.l * zoom + pan.x, (H - pad.b) * zoom + pan.y);
    ctx.lineTo((W - pad.r) * zoom + pan.x, (H - pad.b) * zoom + pan.y);
    ctx.stroke();

    // ── Etiquetas ejes ──────────────────────────────────────────────────────
    ctx.fillStyle = '#94a3b8'; ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Entalpía específica h (kJ/kg)', (W / 2), H - 4);
    ctx.save();
    ctx.translate(12, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Presión P (bar) — escala logarítmica', 0, 0);
    ctx.restore();

    // ── Título ──────────────────────────────────────────────────────────────
    ctx.fillStyle = d.color;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Diagrama Mollier — ${d.label}  |  GWP: ${d.gwp}  |  COP: ${safe(COP, 2)}`, W / 2, 18);

    // Presiones de nivel
    ctx.fillStyle = '#22d3ee'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`Pe=${safe(d.Pe,2)}bar`, (W - pad.r) * zoom + pan.x + 2, toY(d.Pe) + 3);
    ctx.fillStyle = '#f97316';
    ctx.fillText(`Pc=${safe(d.Pc,2)}bar`, (W - pad.r) * zoom + pan.x + 2, toY(d.Pc) + 3);

  }, [d, hover, zoom, pan, COP]);

  useEffect(() => { draw(); }, [draw]);

  // ── Interactividad ───────────────────────────────────────────────────────
  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const H = canvas.height, W = canvas.width;
    const pad = { l:58, r:24, t:36, b:48 };
    const hRange = safeNum(d.hMax - d.hMin, 400);
    const logPMin = Math.log(safeNum(d.pMin, 1));
    const logPMax = Math.log(safeNum(d.pMax, 50));
    const logRange = safeNum(logPMax - logPMin, 3);

    const hv = d.hMin + ((cx - pan.x) / zoom - pad.l) / (W - pad.l - pad.r) * hRange;
    const logP = logPMin + (1 - ((cy - pan.y) / zoom - pad.t) / (H - pad.t - pad.b)) * logRange;
    const pv = Math.exp(logP);

    if (!isFinite(hv) || !isFinite(pv)) return null;
    return { h: parseFloat(hv.toFixed(1)), p: parseFloat(pv.toFixed(3)) };
  }, [d, zoom, pan]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging && dragStart.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan(p => ({ x: p.x + dx, y: p.y + dy }));
      dragStart.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const pt = getPoint(e);
    setHover(pt && pt.h >= d.hMin && pt.h <= d.hMax && pt.p >= d.pMin * 0.5 && pt.p <= d.pMax * 1.5 ? pt : null);
  }, [isDragging, getPoint, d]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e) => {
    if (!isDragging || !dragStart.current) return;
    const dist = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
    setIsDragging(false);
    dragStart.current = null;
    if (dist < 5) {
      // Fue un clic, no un arrastre
      const pt = getPoint(e);
      setSelected(pt);
    }
  };

  // Wheel handler registrado con passive:false via useEffect para poder usar preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom(z => Math.max(0.5, Math.min(5, z * factor)));
    };
    canvas.addEventListener('wheel', handler, { passive: false });
    return () => canvas.removeEventListener('wheel', handler);
  }, []);

  const handleWheel = (e) => { /* manejado por useEffect con passive:false */ };

  const resetView = () => { setZoom(1); setPan({ x:0, y:0 }); setSelected(null); };

  return (
    <div className="space-y-3">
      {/* Selector de refrigerante */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-slate-400 text-xs font-medium">Refrigerante:</span>
        {Object.entries(REF_DATA).map(([key, rd]) => (
          <button key={key} onClick={() => onRefrigeranteChange?.(key)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              refrigerante === key
                ? 'text-white border-transparent shadow-lg'
                : 'text-slate-400 border-slate-600 hover:border-slate-400 bg-transparent'
            }`}
            style={refrigerante === key ? { background: rd.color, borderColor: rd.color } : {}}>
            {rd.label}
          </button>
        ))}
        <button onClick={resetView} className="ml-auto px-2 py-1 text-[10px] text-slate-400 border border-slate-700 rounded hover:bg-slate-800">
          Reset vista
        </button>
        <span className="text-[10px] text-slate-600">Rueda = zoom · Arrastrar = pan · Clic = info</span>
      </div>

      {/* Canvas interactivo */}
      <div className="relative rounded-xl overflow-hidden border border-slate-700 select-none">
        <canvas
          ref={canvasRef}
          width={700} height={380}
          className="w-full"
          style={{ cursor: isDragging ? 'grabbing' : 'crosshair', background:'#0f172a', display:'block' }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setHover(null); setIsDragging(false); }}
          onWheel={handleWheel}
        />
        {/* Tooltip hover */}
        {hover && (
          <div className="absolute top-2 right-2 bg-slate-800/95 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none backdrop-blur-sm">
            <p className="font-bold text-slate-200 mb-1">📍 Cursor</p>
            <p className="text-cyan-400">h = {safe(hover.h, 1)} kJ/kg</p>
            <p className="text-orange-400">P = {safe(hover.p, 3)} bar</p>
            <p className="text-slate-500 text-[10px] mt-1">Clic para fijar punto</p>
          </div>
        )}
        {/* Info punto seleccionado */}
        {selected && (
          <div className="absolute bottom-2 left-2 bg-slate-800/95 border border-yellow-500/50 rounded-lg px-3 py-2 text-xs shadow-xl backdrop-blur-sm">
            <p className="font-bold text-yellow-400 mb-1">📌 Punto seleccionado</p>
            <p className="text-slate-300">h = {safe(selected.h, 1)} kJ/kg</p>
            <p className="text-slate-300">P = {safe(selected.p, 3)} bar</p>
            <button onClick={() => setSelected(null)} className="text-slate-500 text-[10px] mt-1 hover:text-slate-300">✕ Cerrar</button>
          </div>
        )}
      </div>

      {/* Puntos del ciclo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CYCLE_PTS.map(pt => (
          <div key={pt.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 text-center">
            <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center font-bold text-xs text-slate-900"
              style={{ background: pt.color }}>{pt.id}</div>
            <p className="text-slate-200 text-[11px] font-semibold leading-tight">{pt.label.split('—')[1]?.trim()}</p>
            <p className="text-slate-400 text-[10px] mt-1">h = {safe(pt.h, 1)} kJ/kg</p>
            <p className="text-slate-400 text-[10px]">P = {safe(pt.p, 2)} bar</p>
            <p className="text-slate-400 text-[10px]">T ≈ {pt.T}°C</p>
            <p className="text-slate-600 text-[9px] italic mt-0.5">{pt.state}</p>
          </div>
        ))}
      </div>

      {/* KPIs del ciclo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label:'Qf — Efecto frigorífico',  value:`${safe(Qf,2)} kW`,      sub:`${safe(hEvap,1)} kJ/kg`,      color:'#22d3ee' },
          { label:'Qc — Calor condensador',   value:`${safe(Qc,2)} kW`,      sub:`${safe(hCond,1)} kJ/kg`,      color:'#f97316' },
          { label:'W — Potencia compresor',   value:`${safe(Wcomp,2)} kW`,   sub:`${safe(hComp,1)} kJ/kg`,      color:'#a78bfa' },
          { label:'COP estimado',             value:safe(COP, 2),             sub:`EER = ${safe(EER,2)} BTU/Wh`, color:'#4ade80' },
          { label:'Caudal másico ṁ',          value:`${safe(mRef*1000,1)} g/s`, sub:`${safe(mRef,4)} kg/s`,     color:'#60a5fa' },
          { label:'T evaporación',            value:`${d.Te}°C`,              sub:`Pe = ${safe(d.Pe,2)} bar`,    color:'#22d3ee' },
          { label:'T condensación',           value:`${d.Tc}°C`,              sub:`Pc = ${safe(d.Pc,2)} bar`,    color:'#f87171' },
          { label:'GWP refrigerante',         value:d.gwp,                    sub:d.desc,                        color:'#fbbf24' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-2.5">
            <p className="text-slate-500 text-[10px] leading-tight">{label}</p>
            <p className="font-bold text-sm mt-0.5" style={{ color }}>{value}</p>
            <p className="text-slate-600 text-[10px] mt-0.5 leading-tight">{sub}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-600 text-center">
        Diagrama Mollier de compresión de vapor · Datos ASHRAE/NIST · Te={d.Te}°C / Tc={d.Tc}°C ·
        Rueda del ratón para zoom · Arrastrar para mover · Clic para inspeccionar punto
      </p>
    </div>
  );
}