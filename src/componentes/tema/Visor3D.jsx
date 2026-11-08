import { useEffect, useMemo, useRef, useState } from 'react';

// Visor 3D ligero para cámaras frigoríficas, sin librerías externas.
// Dibuja por capas ordenadas por distancia (algoritmo del pintor) sobre un <canvas>.
// Para naves o instalaciones con muchos equipos conviene pasar a three.js (WebGL).
//
// Props: largo, ancho, alto (m), evaporador y unidad (textos), puerta (ancho en m).

const VISTAS = {
  iso: { yaw: -0.65, pitch: 0.5, texto: 'Isométrica' },
  frente: { yaw: 0, pitch: 0.02, texto: 'Frontal' },
  planta: { yaw: 0, pitch: 1.57, texto: 'Planta' },
  lado: { yaw: -1.5708, pitch: 0.02, texto: 'Lateral' }
};

function caja(id, x0, x1, y0, y1, z0, z1, color, alfa) {
  const p = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const caras = [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7], [4, 5, 6, 7], [0, 3, 2, 1]];
  return caras.map((c) => ({ id, tipo: 'cara', pts: c.map((i) => p[i]), color, alfa }));
}

function rgba(hex, a) {
  const r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const cifra = (n) => n.toFixed(2).replace('.', ',');

export function Visor3D({ largo = 4, ancho = 3, alto = 2.6, puerta = 1, evaporador = 'Evaporador', unidad = 'Unidad condensadora', alSeleccionar }) {
  const lienzo = useRef(null);
  const arrastre = useRef(null);
  const [vista, setVista] = useState({ yaw: VISTAS.iso.yaw, pitch: VISTAS.iso.pitch });
  const [zoom, setZoom] = useState(1);
  const [sel, setSel] = useState('evaporador');
  const [capas, setCapas] = useState({ transp: true, tubos: true, cotas: true });

  const elementos = useMemo(() => {
    const t = capas.transp ? 0.18 : 0.88;
    const L = largo, A = ancho, H = alto;
    const ex0 = L / 2 - 0.6, ex1 = L / 2 + 0.6;
    const ux0 = L + 0.35, ux1 = L + 1.35, uy0 = A / 2 - 0.5, uy1 = A / 2 + 0.05;
    let items = [
      ...caja('camara', 0, L, 0, A, 0, H, '#E8ECEA', t),
      { id: 'puerta', tipo: 'cara', pts: [[0.8, -0.02, 0], [0.8 + puerta, -0.02, 0], [0.8 + puerta, -0.02, Math.min(2, H - 0.1)], [0.8, -0.02, Math.min(2, H - 0.1)]], color: '#8E9591', alfa: 0.95 },
      ...caja('evaporador', ex0, ex1, A - 0.5, A - 0.05, H - 0.5, H - 0.1, '#1E4C8A', 0.95),
      ...caja('unidad', ux0, ux1, uy0, uy1, 0.15, 0.85, '#474A50', 0.95),
      ...caja('unidad', ux0 - 0.05, ux1 + 0.05, uy0 - 0.05, uy1 + 0.05, 0, 0.15, '#23282B', 0.95),
      ...caja('estanterias', 0.08, 0.55, 0.3, A - 0.1, 0, Math.min(2, H - 0.3), '#C9CDD0', 0.55)
    ];
    if (L > 2.5) items = items.concat(caja('estanterias', L - 0.55, L - 0.08, 0.3, A * 0.73, 0, Math.min(2, H - 0.3), '#C9CDD0', 0.55));
    if (capas.tubos) {
      const ux = ux0 + 0.15, cx = L / 2 - 0.1;
      const liq = [[ux, uy0 + 0.2, 0.85], [ux, uy0 + 0.2, H + 0.25], [cx, uy0 + 0.2, H + 0.25], [cx, A - 0.3, H + 0.25], [cx, A - 0.3, H - 0.1]];
      const asp = [[ux + 0.2, uy0 + 0.35, 0.85], [ux + 0.2, uy0 + 0.35, H + 0.35], [cx + 0.2, uy0 + 0.35, H + 0.35], [cx + 0.2, A - 0.25, H + 0.35], [cx + 0.2, A - 0.25, H - 0.1]];
      for (let i = 0; i < liq.length - 1; i++) items.push({ id: 'lineas', tipo: 'linea', pts: [liq[i], liq[i + 1]], color: '#23282B', ancho: 3 });
      for (let i = 0; i < asp.length - 1; i++) items.push({ id: 'lineas', tipo: 'linea', pts: [asp[i], asp[i + 1]], color: '#1E4C8A', ancho: 5 });
    }
    return items;
  }, [largo, ancho, alto, puerta, capas]);

  useEffect(() => {
    const cv = lienzo.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    const W = 1000, H = 680;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cy = Math.cos(vista.yaw), sy = Math.sin(vista.yaw), cp = Math.cos(vista.pitch), sp = Math.sin(vista.pitch);
    const tam = Math.max(largo + 1.4, ancho, alto);
    const esc = (95 * zoom * 5.4) / tam, dist = 14;
    const cx = (largo + 1.4) / 2, cyc = ancho / 2, cz = alto / 2;
    const proy = (p) => {
      const x = p[0] - cx, y = p[1] - cyc, z = p[2] - cz;
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
      const arriba = z * cp + y1 * sp, prof = y1 * cp - z * sp;
      const k = dist / (dist + prof);
      return { x: W / 2 + x1 * esc * k, y: H / 2 + 40 - arriba * esc * k, d: prof };
    };
    ctx.fillStyle = '#F4F4F4';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#A9AFAB'; ctx.lineWidth = 1;
    for (let g = -1; g <= Math.ceil(largo + 2); g++) { const a = proy([g, -1, 0]), b = proy([g, ancho + 1, 0]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (let g = -1; g <= Math.ceil(ancho + 1); g++) { const a = proy([-1, g, 0]), b = proy([largo + 2, g, 0]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    const lista = elementos.map((it) => {
      const pp = it.pts.map(proy);
      return { it, pp, d: pp.reduce((s, q) => s + q.d, 0) / pp.length };
    }).sort((a, b) => b.d - a.d);

    for (const { it, pp } of lista) {
      const marcado = it.id === sel;
      if (it.tipo === 'cara') {
        ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y);
        for (let i = 1; i < pp.length; i++) ctx.lineTo(pp[i].x, pp[i].y);
        ctx.closePath();
        ctx.fillStyle = rgba(it.color, it.alfa); ctx.fill();
        ctx.strokeStyle = marcado ? '#1E4C8A' : '#23282B'; ctx.lineWidth = marcado ? 2.5 : 1.2; ctx.stroke();
      } else {
        ctx.strokeStyle = marcado ? '#F9A800' : it.color; ctx.lineWidth = marcado ? it.ancho + 2 : it.ancho; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y); ctx.lineTo(pp[1].x, pp[1].y); ctx.stroke();
      }
    }

    if (capas.cotas) {
      const cota = (a, b, texto) => {
        const pa = proy(a), pb = proy(b);
        ctx.strokeStyle = '#23282B'; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.setLineDash([]);
        const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        ctx.font = '700 14px Archivo, Arial, sans-serif';
        const w = ctx.measureText(texto).width;
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(mx - w / 2 - 5, my - 11, w + 10, 20);
        ctx.strokeStyle = '#23282B'; ctx.lineWidth = 1; ctx.strokeRect(mx - w / 2 - 5, my - 11, w + 10, 20);
        ctx.fillStyle = '#23282B'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, mx, my);
      };
      cota([0, -0.45, 0], [largo, -0.45, 0], cifra(largo) + ' m');
      cota([-0.45, 0, 0], [-0.45, ancho, 0], cifra(ancho) + ' m');
      cota([-0.45, -0.45, 0], [-0.45, -0.45, alto], cifra(alto) + ' m');
    }
  }, [elementos, vista, zoom, sel, capas.cotas, largo, ancho, alto]);

  const alPulsar = (ev) => {
    arrastre.current = { x: ev.clientX, y: ev.clientY, ...vista };
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  };
  const alMover = (ev) => {
    const a = arrastre.current;
    if (!a) return;
    setVista({ yaw: a.yaw - (ev.clientX - a.x) * 0.01, pitch: Math.max(-0.1, Math.min(1.57, a.pitch + (ev.clientY - a.y) * 0.01)) });
  };
  const alSoltar = () => { arrastre.current = null; };
  const alTeclear = (ev) => {
    const paso = { ArrowLeft: [0.1, 0], ArrowRight: [-0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[ev.key];
    if (!paso) return;
    ev.preventDefault();
    setVista((v) => ({ yaw: v.yaw + paso[0], pitch: Math.max(-0.1, Math.min(1.57, v.pitch + paso[1])) }));
  };

  const ELEMENTOS = [
    { id: 'camara', texto: 'Cámara' }, { id: 'puerta', texto: 'Puerta' }, { id: 'evaporador', texto: evaporador },
    { id: 'unidad', texto: unidad }, { id: 'lineas', texto: 'Líneas frigoríficas' }, { id: 'estanterias', texto: 'Estanterías' }
  ];
  const elegir = (id) => { setSel(id); alSeleccionar && alSeleccionar(id); };
  const alternar = (clave) => setCapas((c) => ({ ...c, [clave]: !c[clave] }));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      <nav aria-label="Elementos del modelo" className="gpt-panel" style={{ flex: '0 0 220px', padding: 0 }}>
        {ELEMENTOS.map((e) => (
          <button key={e.id} type="button" aria-pressed={sel === e.id} className="gpt-boton" onClick={() => elegir(e.id)}
            style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', border: 0, borderBottom: '1px solid var(--gpt-linea)', background: sel === e.id ? undefined : 'transparent' }}>
            {e.texto}
          </button>
        ))}
      </nav>
      <div style={{ flex: '999 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div role="toolbar" aria-label="Controles de la vista" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {Object.entries(VISTAS).map(([k, v]) => (
            <button key={k} type="button" className="gpt-boton" onClick={() => setVista({ yaw: v.yaw, pitch: v.pitch })}>{v.texto}</button>
          ))}
          <button type="button" className="gpt-boton" aria-pressed={capas.transp} onClick={() => alternar('transp')}>Paneles transparentes</button>
          <button type="button" className="gpt-boton" aria-pressed={capas.tubos} onClick={() => alternar('tubos')}>Tuberías</button>
          <button type="button" className="gpt-boton" aria-pressed={capas.cotas} onClick={() => alternar('cotas')}>Cotas</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', fontSize: 13 }}>
            Zoom
            <input type="range" min="0.6" max="1.8" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: 140 }} />
            <span className="gpt-num" style={{ width: 44, fontWeight: 700 }}>{Math.round(zoom * 100)} %</span>
          </label>
        </div>
        <div style={{ background: 'var(--gpt-blanco)', border: 'var(--gpt-borde-fuerte)', position: 'relative' }}>
          <canvas
            ref={lienzo} tabIndex={0} role="img"
            aria-label={`Vista 3D de la cámara de ${cifra(largo)} por ${cifra(ancho)} por ${cifra(alto)} metros. Usa las flechas para girarla.`}
            onPointerDown={alPulsar} onPointerMove={alMover} onPointerUp={alSoltar} onPointerCancel={alSoltar} onKeyDown={alTeclear}
            style={{ display: 'block', width: '100%', aspectRatio: '1000 / 680', touchAction: 'none', cursor: 'grab' }}
          />
          <div className="gpt-etiqueta" style={{ position: 'absolute', right: 12, bottom: 10, background: 'rgba(244,244,244,0.9)', padding: '4px 8px' }}>
            Arrastra o usa las flechas para girar
          </div>
        </div>
      </div>
    </div>
  );
}

export default Visor3D;
