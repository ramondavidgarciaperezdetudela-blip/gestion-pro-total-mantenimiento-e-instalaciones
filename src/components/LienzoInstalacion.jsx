import React, { useRef, useEffect, useState, useCallback } from 'react';
import { dibujarEquipo } from '@/lib/planoSimbolos';
import { elemento } from '@/lib/instalacionCatalogo';
import { TIPOS_CONEXION_ELECTRICA } from '@/lib/instalacionCalculos';

/**
 * LienzoInstalacion — el plano en sí.
 *
 * ─── Por qué el local NO es un rectángulo ───────────────────────────────────
 *
 * Los locales reales no son cajas: tienen entrantes, pilares en medio, muros
 * que no llegan al techo y rincones imposibles. Obligar a empezar por una
 * habitación cuadrada de 1 × 1 m convierte el plano en un dibujo que no se
 * parece al sitio donde hay que trabajar, y entonces no sirve para medir
 * tubería ni para colocar la condensadora.
 *
 * Aquí las paredes se dibujan a mano, tramo a tramo, como se recorre el local
 * con el metro. Se cierran si se quiere, o se dejan abiertas. Los pilares van
 * donde están. No hay forma obligatoria.
 *
 * ─── Herramientas ──────────────────────────────────────────────────────────
 *   pared      · tramos seguidos; doble clic o Escape para terminar
 *   equipo     · coloca el elemento elegido del catálogo
 *   tuberia    · une equipos (si se pulsa sobre uno, se engancha solo)
 *   electrico  · igual, pero línea eléctrica
 *   mover      · arrastra lo que haya debajo
 *   cota       · mide una distancia y la escribe
 *   texto      · una nota sobre el plano
 *   borrar     · quita lo que se pulse
 */

const REJILLA = 20;          // píxeles entre líneas de la rejilla
const METROS_POR_REJILLA = 0.5;

export default function LienzoInstalacion({
  plano, onCambio, herramienta, elementoElegido, seleccionado, onSeleccionar,
  ancho = 900, alto = 600, ajustarRejilla = true, verRejilla = true,
}) {
  const ref = useRef(null);
  const [enCurso, setEnCurso] = useState(null);   // lo que se está dibujando
  const [arrastre, setArrastre] = useState(null);
  const [raton, setRaton] = useState({ x: 0, y: 0 });

  const metrosPorPixel = METROS_POR_REJILLA / REJILLA;

  /* ── Utilidades de posición ── */
  const posicion = useCallback((ev) => {
    const r = ref.current.getBoundingClientRect();
    const t = ev.touches?.[0];
    let x = (t ? t.clientX : ev.clientX) - r.left;
    let y = (t ? t.clientY : ev.clientY) - r.top;
    if (ajustarRejilla) {
      x = Math.round(x / REJILLA) * REJILLA;
      y = Math.round(y / REJILLA) * REJILLA;
    }
    return { x: Math.round(x), y: Math.round(y) };
  }, [ajustarRejilla]);

  /** El equipo que hay debajo del punto, si lo hay. */
  const equipoEn = useCallback((p) => {
    const lista = plano.elementos || [];
    for (let i = lista.length - 1; i >= 0; i--) {
      const e = lista[i];
      if (Math.hypot(e.x - p.x, e.y - p.y) < 22) return e;
    }
    return null;
  }, [plano.elementos]);

  /* ── Pintar ── */
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);

    // Rejilla, con una línea más marcada cada metro.
    if (verRejilla) {
      for (let x = 0; x <= c.width; x += REJILLA) {
        ctx.strokeStyle = (x / REJILLA) % 2 === 0 ? '#dbe3ee' : '#eef2f7';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
      }
      for (let y = 0; y <= c.height; y += REJILLA) {
        ctx.strokeStyle = (y / REJILLA) % 2 === 0 ? '#dbe3ee' : '#eef2f7';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
      }
    }

    // Paredes.
    for (const pared of plano.paredes || []) {
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = pared.grosor || 6;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      pared.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (pared.cerrada) ctx.closePath();
      ctx.stroke();
    }

    // Tuberías.
    for (const t of plano.tuberias || []) {
      const sel = seleccionado?.clase === 'tuberia' && seleccionado.id === t.id;
      // Dos trazos: el gas más gordo debajo, el líquido fino encima.
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = sel ? '#0284c7' : '#38bdf8';
      ctx.lineWidth = sel ? 7 : 5;
      ctx.beginPath();
      t.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      t.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
      etiquetaLinea(ctx, t.puntos, `${t.longitudM ?? '?'} m${t.gas ? ` · ${t.gas}/${t.liquido}` : ''}`, '#0369a1');
    }

    // Líneas eléctricas.
    for (const l of plano.lineasElectricas || []) {
      const tipo = TIPOS_CONEXION_ELECTRICA.find((x) => x.id === l.tipo) || TIPOS_CONEXION_ELECTRICA[0];
      const sel = seleccionado?.clase === 'electrico' && seleccionado.id === l.id;
      ctx.strokeStyle = tipo.color;
      ctx.lineWidth = sel ? 5 : 3;
      ctx.setLineDash(l.tipo === 'comunicacion' ? [3, 3] : []);
      ctx.beginPath();
      l.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
      etiquetaLinea(ctx, l.puntos, `${l.longitudM ?? '?'} m${l.seccion ? ` · ${l.seccion} mm²` : ''}`, tipo.color);
    }

    // Cotas.
    for (const cota of plano.cotas || []) {
      ctx.strokeStyle = '#7c3aed'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cota.puntos[0].x, cota.puntos[0].y);
      ctx.lineTo(cota.puntos[1].x, cota.puntos[1].y);
      ctx.stroke();
      ctx.setLineDash([]);
      etiquetaLinea(ctx, cota.puntos, `${cota.longitudM} m`, '#7c3aed');
    }

    // Equipos.
    for (const e of plano.elementos || []) {
      const def = elemento(e.tipo);
      const sel = seleccionado?.clase === 'elemento' && seleccionado.id === e.id;
      dibujarEquipo(ctx, def?.dibujo || 'bancada', e.x, e.y, e.escala || 1, sel, e.variante || null);
      if (e.etiqueta) {
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(e.etiqueta, e.x, e.y + 26);
      }
    }

    // Textos.
    for (const t of plano.textos || []) {
      ctx.fillStyle = t.color || '#0f172a';
      ctx.font = `bold ${t.tamano || 13}px Arial`;
      ctx.textAlign = 'left';
      ctx.fillText(t.texto, t.x, t.y);
    }

    // Lo que se está dibujando ahora mismo.
    if (enCurso?.puntos?.length) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      enCurso.puntos.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.lineTo(raton.x, raton.y);
      ctx.stroke();
      ctx.setLineDash([]);
      const ult = enCurso.puntos[enCurso.puntos.length - 1];
      const m = (Math.hypot(raton.x - ult.x, raton.y - ult.y) * metrosPorPixel).toFixed(2);
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 11px Arial';
      ctx.fillText(`${m} m`, raton.x + 8, raton.y - 8);
    }
  }, [plano, seleccionado, enCurso, raton, verRejilla, metrosPorPixel]);

  /* ── Interacción ── */
  const alPulsar = (ev) => {
    ev.preventDefault();
    const p = posicion(ev);

    if (herramienta === 'borrar') { borrarEn(p); return; }
    if (herramienta === 'mover') {
      const e = equipoEn(p);
      if (e) { setArrastre({ id: e.id, dx: e.x - p.x, dy: e.y - p.y }); onSeleccionar?.({ clase: 'elemento', id: e.id }); }
      return;
    }
    if (herramienta === 'equipo') { colocarEquipo(p); return; }
    if (herramienta === 'texto') { ponerTexto(p); return; }

    // Las herramientas de línea van acumulando puntos.
    if (['pared', 'tuberia', 'electrico', 'cota'].includes(herramienta)) {
      // En tubería y eléctrico, si se pulsa sobre un equipo se engancha a él.
      const eq = ['tuberia', 'electrico'].includes(herramienta) ? equipoEn(p) : null;
      const punto = eq ? { x: eq.x, y: eq.y } : p;
      const actual = enCurso?.puntos || [];
      const nuevos = [...actual, punto];
      const engancheInicial = enCurso?.engancheInicial ?? eq?.id ?? null;
      // La cota son siempre dos puntos: al segundo se cierra sola.
      if (herramienta === 'cota' && nuevos.length === 2) { terminarLinea(nuevos); return; }
      // Conectar dos equipos: en cuanto se pulsa sobre el segundo, la línea se
      // cierra sola. Es lo que uno espera al unir dos máquinas, sin tener que
      // acordarse de pulsar Escape. Para llevarla por donde se quiera, se pulsa
      // en los codos intermedios (que no son equipos) y al llegar al segundo
      // equipo se termina igual.
      if (['tuberia', 'electrico'].includes(herramienta) && eq && nuevos.length >= 2 && eq.id !== engancheInicial) {
        terminarLinea(nuevos, { desde: engancheInicial, hasta: eq.id });
        return;
      }
      setEnCurso({ puntos: nuevos, engancheFinal: eq?.id || null, engancheInicial });
    }
  };

  const alMover = (ev) => {
    const p = posicion(ev);
    setRaton(p);
    if (arrastre) {
      onCambio({
        ...plano,
        elementos: plano.elementos.map((e) => (e.id === arrastre.id ? { ...e, x: p.x + arrastre.dx, y: p.y + arrastre.dy } : e)),
      });
    }
  };

  const alSoltar = () => setArrastre(null);

  const alDobleClic = () => { if (enCurso?.puntos?.length >= 2) terminarLinea(enCurso.puntos); };

  useEffect(() => {
    const esc = (e) => {
      if (e.key === 'Escape' && enCurso) {
        if (enCurso.puntos.length >= 2) terminarLinea(enCurso.puntos); else setEnCurso(null);
      }
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  });

  const terminarLinea = (puntos, enganches = null) => {
    const desde = enganches ? enganches.desde : (enCurso?.engancheInicial || null);
    const hasta = enganches ? enganches.hasta : (enCurso?.engancheFinal || null);
    const id = `${herramienta}-${Date.now()}`;
    const longitudM = Math.round(largoDe(puntos, metrosPorPixel) * 100) / 100;
    if (herramienta === 'pared') {
      onCambio({ ...plano, paredes: [...(plano.paredes || []), { id, puntos, grosor: 6 }] });
    } else if (herramienta === 'tuberia') {
      const nueva = { id, puntos, longitudM, desde, hasta };
      onCambio({ ...plano, tuberias: [...(plano.tuberias || []), nueva] });
      onSeleccionar?.({ clase: 'tuberia', id, recienCreada: true });
    } else if (herramienta === 'electrico') {
      const nueva = { id, puntos, longitudM, tipo: 'potencia', desde, hasta };
      onCambio({ ...plano, lineasElectricas: [...(plano.lineasElectricas || []), nueva] });
      onSeleccionar?.({ clase: 'electrico', id, recienCreada: true });
    } else if (herramienta === 'cota') {
      onCambio({ ...plano, cotas: [...(plano.cotas || []), { id, puntos, longitudM }] });
    }
    setEnCurso(null);
  };

  const colocarEquipo = (p) => {
    if (!elementoElegido) return;
    const id = `el-${Date.now()}`;
    const nuevo = { id, tipo: elementoElegido, x: p.x, y: p.y, escala: 1, datos: {}, etiqueta: '' };
    onCambio({ ...plano, elementos: [...(plano.elementos || []), nuevo] });
    onSeleccionar?.({ clase: 'elemento', id, recienCreada: true });
  };

  const ponerTexto = (p) => {
    const texto = window.prompt('¿Qué quieres escribir en el plano?');
    if (!texto) return;
    onCambio({ ...plano, textos: [...(plano.textos || []), { id: `tx-${Date.now()}`, x: p.x, y: p.y, texto }] });
  };

  const borrarEn = (p) => {
    const eq = equipoEn(p);
    if (eq) { onCambio({ ...plano, elementos: plano.elementos.filter((e) => e.id !== eq.id) }); return; }
    const cerca = (linea) => (linea.puntos || []).some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 16);
    const quitar = (lista) => (lista || []).filter((l) => !cerca(l));
    onCambio({
      ...plano,
      paredes: quitar(plano.paredes), tuberias: quitar(plano.tuberias),
      lineasElectricas: quitar(plano.lineasElectricas), cotas: quitar(plano.cotas),
      textos: (plano.textos || []).filter((t) => Math.hypot(t.x - p.x, t.y - p.y) > 24),
    });
  };

  return (
    <canvas
      ref={ref}
      width={ancho}
      height={alto}
      data-prueba="lienzo-instalacion"
      className="touch-none rounded-lg border border-slate-300 bg-white shadow-inner"
      style={{ cursor: herramienta === 'borrar' ? 'not-allowed' : herramienta === 'mover' ? 'grab' : 'crosshair', maxWidth: '100%' }}
      onMouseDown={alPulsar}
      onMouseMove={alMover}
      onMouseUp={alSoltar}
      onMouseLeave={alSoltar}
      onDoubleClick={alDobleClic}
      onTouchStart={alPulsar}
      onTouchMove={alMover}
      onTouchEnd={alSoltar}
    />
  );
}

/* ── Ayudas de dibujo ── */

function largoDe(puntos, metrosPorPixel) {
  let t = 0;
  for (let i = 1; i < puntos.length; i++) t += Math.hypot(puntos[i].x - puntos[i - 1].x, puntos[i].y - puntos[i - 1].y);
  return t * metrosPorPixel;
}

/** Escribe un texto en mitad de una línea, con fondo para que se lea. */
function etiquetaLinea(ctx, puntos, texto, color) {
  if (!puntos || puntos.length < 2 || !texto) return;
  const i = Math.floor((puntos.length - 1) / 2);
  const x = (puntos[i].x + puntos[i + 1].x) / 2;
  const y = (puntos[i].y + puntos[i + 1].y) / 2;
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  const w = ctx.measureText(texto).width + 8;
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.fillRect(x - w / 2, y - 14, w, 14);
  ctx.fillStyle = color;
  ctx.fillText(texto, x, y - 3);
}
