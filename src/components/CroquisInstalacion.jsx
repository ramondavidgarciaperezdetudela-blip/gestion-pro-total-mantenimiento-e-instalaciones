import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Type, Trash2, Image as ImageIcon, Check, Undo2, MousePointer2, Eraser } from 'lucide-react';
import { TIPOS_MAQUINA } from '@/lib/planoCalculos';
import { dibujarEquipo, nombreEquipo } from '@/lib/planoSimbolos';
import { recomprimirDataURL } from '@/lib/compressImage';
import { toast } from 'sonner';

/**
 * CroquisInstalacion — dibujar dónde está cada máquina y meterlo en el documento.
 *
 * Es lo mismo que ya se puede hacer en el cálculo de potencias, pero pensado
 * para acompañar a un certificado o a un parte: colocas la condensadora, la
 * evaporadora y lo que haga falta, trazas por dónde va la línea frigorífica,
 * escribes las aclaraciones encima del propio dibujo y se va todo al documento
 * con su leyenda. Se dibuja con los mismos símbolos del plano, así que quien
 * lo reciba reconoce lo que está viendo.
 *
 * Se puede poner de fondo una foto o un plano del local: se dibuja encima.
 *
 * Todo se hace en el lienzo del propio navegador, sin subir nada a ningún
 * sitio: funciona en la furgoneta sin cobertura.
 */

const ANCHO = 900;
const ALTO = 560;

/** Prefijo del rótulo de cada equipo, para que la leyenda se lea sola. */
const SIGLA = {
  exterior: 'UE',
  unidad_condensadora: 'UC',
  mural: 'UI',
  cassette: 'UI',
  conductos: 'UI',
  suelo: 'UI',
  evaporador_camara: 'EV',
  vitrina: 'VT',
  arcon: 'AR',
  camara_puerta: 'PT',
  control_temperatura: 'CT',
};

export default function CroquisInstalacion({ plano, onGuardar, onQuitar }) {
  const lienzo = useRef(null);
  const fondoImg = useRef(null);

  const [herramienta, setHerramienta] = useState('equipo');
  const [tipoElegido, setTipoElegido] = useState('exterior');
  const [piezas, setPiezas] = useState([]);       // equipos, textos y trazos
  const [fondo, setFondo] = useState(null);       // dataURL de la foto/plano
  const [seleccion, setSeleccion] = useState(null);
  const [notas, setNotas] = useState(plano?.notas || '');
  const [guardando, setGuardando] = useState(false);
  const arrastrando = useRef(null);
  const trazoActual = useRef(null);

  /** El rótulo que le toca a un equipo nuevo: UE-1, UE-2, UI-1… */
  const rotuloPara = (tipo, lista) => {
    const sigla = SIGLA[tipo] || 'EQ';
    const n = lista.filter((p) => p.clase === 'equipo' && (SIGLA[p.tipo] || 'EQ') === sigla).length + 1;
    return `${sigla}-${n}`;
  };

  // ─── Pintar ───────────────────────────────────────────────────────────────
  const pintar = useCallback(() => {
    const c = lienzo.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, ANCHO, ALTO);

    if (fondoImg.current) {
      const img = fondoImg.current;
      const escala = Math.min(ANCHO / img.width, ALTO / img.height);
      const w = img.width * escala;
      const h = img.height * escala;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(img, (ANCHO - w) / 2, (ALTO - h) / 2, w, h);
      ctx.globalAlpha = 1;
    } else {
      // Cuadrícula suave, para que se vea que es una hoja para dibujar.
      ctx.strokeStyle = '#eef2f7';
      ctx.lineWidth = 1;
      for (let x = 0; x <= ANCHO; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALTO); ctx.stroke(); }
      for (let y = 0; y <= ALTO; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(ANCHO, y); ctx.stroke(); }
    }

    for (const p of piezas) {
      const elegida = seleccion === p.id;
      if (p.clase === 'equipo') {
        dibujarEquipo(ctx, p.tipo, p.x, p.y, 1.2, elegida);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.rotulo, p.x, p.y + 32);
      } else if (p.clase === 'texto') {
        ctx.fillStyle = elegida ? '#b91c1c' : '#0f172a';
        ctx.font = '14px system-ui, sans-serif';
        ctx.textAlign = 'left';
        p.texto.split('\n').forEach((linea, i) => ctx.fillText(linea, p.x, p.y + i * 18));
      } else if (p.clase === 'trazo') {
        ctx.strokeStyle = elegida ? '#b91c1c' : '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        p.puntos.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
        ctx.stroke();
      }
    }
  }, [piezas, seleccion, fondo]);

  useEffect(() => { pintar(); }, [pintar]);

  // ─── Dónde se ha pinchado ────────────────────────────────────────────────
  const punto = (e) => {
    const c = lienzo.current;
    const r = c.getBoundingClientRect();
    const t = e.touches?.[0] || e.changedTouches?.[0] || e;
    return {
      x: ((t.clientX - r.left) / r.width) * ANCHO,
      y: ((t.clientY - r.top) / r.height) * ALTO,
    };
  };

  const piezaEn = (pt) => {
    for (let i = piezas.length - 1; i >= 0; i--) {
      const p = piezas[i];
      if (p.clase === 'equipo' && Math.hypot(p.x - pt.x, p.y - pt.y) < 26) return p;
      if (p.clase === 'texto' && pt.x > p.x - 6 && pt.x < p.x + 200 && pt.y > p.y - 18 && pt.y < p.y + 8) return p;
      if (p.clase === 'trazo' && p.puntos.some((q) => Math.hypot(q.x - pt.x, q.y - pt.y) < 10)) return p;
    }
    return null;
  };

  const alEmpezar = (e) => {
    e.preventDefault();
    const pt = punto(e);

    if (herramienta === 'equipo') {
      setPiezas((prev) => [...prev, {
        id: Date.now() + Math.random(), clase: 'equipo', tipo: tipoElegido,
        x: pt.x, y: pt.y, rotulo: rotuloPara(tipoElegido, prev),
        descripcion: nombreEquipo(tipoElegido),
      }]);
      return;
    }
    if (herramienta === 'texto') {
      const t = prompt('Aclaración que va escrita en el plano:');
      if (t && t.trim()) {
        setPiezas((prev) => [...prev, { id: Date.now() + Math.random(), clase: 'texto', texto: t.trim(), x: pt.x, y: pt.y }]);
      }
      return;
    }
    if (herramienta === 'linea') {
      trazoActual.current = { id: Date.now() + Math.random(), clase: 'trazo', puntos: [pt] };
      setPiezas((prev) => [...prev, trazoActual.current]);
      return;
    }
    if (herramienta === 'borrar') {
      const p = piezaEn(pt);
      if (p) setPiezas((prev) => prev.filter((q) => q.id !== p.id));
      return;
    }
    // Mover
    const p = piezaEn(pt);
    setSeleccion(p?.id ?? null);
    if (p && p.clase !== 'trazo') arrastrando.current = { id: p.id, dx: p.x - pt.x, dy: p.y - pt.y };
  };

  const alMover = (e) => {
    if (herramienta === 'linea' && trazoActual.current) {
      e.preventDefault();
      const pt = punto(e);
      trazoActual.current.puntos.push(pt);
      setPiezas((prev) => [...prev]);
      return;
    }
    if (!arrastrando.current) return;
    e.preventDefault();
    const pt = punto(e);
    const { id, dx, dy } = arrastrando.current;
    setPiezas((prev) => prev.map((p) => (p.id === id ? { ...p, x: pt.x + dx, y: pt.y + dy } : p)));
  };

  const alSoltar = () => { arrastrando.current = null; trazoActual.current = null; };

  // ─── Fondo ────────────────────────────────────────────────────────────────
  const ponerFondo = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Eso no es una imagen'); return; }
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => { fondoImg.current = img; setFondo(lector.result); };
      img.onerror = () => toast.error('No se ha podido abrir la imagen');
      img.src = lector.result;
    };
    lector.readAsDataURL(f);
    e.target.value = '';
  };

  const deshacer = () => setPiezas((prev) => prev.slice(0, -1));

  const limpiar = () => {
    if (!confirm('¿Borrar el croquis entero y empezar de cero?')) return;
    setPiezas([]);
    fondoImg.current = null;
    setFondo(null);
    setSeleccion(null);
  };

  /** Cambiar el texto de la leyenda de un equipo. */
  const cambiarDescripcion = (id, texto) =>
    setPiezas((prev) => prev.map((p) => (p.id === id ? { ...p, descripcion: texto } : p)));

  // ─── Llevarlo al documento ───────────────────────────────────────────────
  const usarEnElDocumento = async () => {
    const equipos = piezas.filter((p) => p.clase === 'equipo');
    if (piezas.length === 0 && !fondo) {
      toast.error('El croquis está vacío: coloca algún equipo o pon un plano de fondo');
      return;
    }
    setGuardando(true);
    try {
      // Se manda comprimido: un croquis a pelo puede pesar varios cientos de
      // kB y luego el documento no cabe al guardarlo.
      let imagen = lienzo.current.toDataURL('image/png');
      if (imagen.length > 300 * 1024) {
        imagen = await recomprimirDataURL(imagen, 260 * 1024);
      }
      onGuardar({
        imagen,
        leyenda: equipos.map((p) => ({ simbolo: p.rotulo, texto: p.descripcion || nombreEquipo(p.tipo) })),
        notas: notas.trim(),
      });
      toast.success('Croquis añadido al documento');
    } catch (e) {
      toast.error('No se ha podido añadir el croquis: ' + (e?.message || 'error al preparar la imagen'));
    } finally {
      setGuardando(false);
    }
  };

  const Herramienta = ({ id, icono: Icono, texto }) => (
    <Button size="sm" variant={herramienta === id ? 'default' : 'outline'}
      onClick={() => setHerramienta(id)}
      className={herramienta === id ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
      <Icono className="w-3.5 h-3.5 mr-1" />{texto}
    </Button>
  );

  return (
    <Card className="border-indigo-200" data-prueba="croquis">
      <CardHeader className="pb-2 bg-indigo-50">
        <CardTitle className="text-sm">Plano / croquis de la instalación</CardTitle>
        <p className="text-[11px] text-gray-500">
          Coloca cada máquina donde está, traza por dónde va la línea y escribe las aclaraciones
          encima del dibujo. Va al documento con su leyenda.
        </p>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Herramientas */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Herramienta id="equipo" icono={MousePointer2} texto="Colocar equipo" />
          <Herramienta id="mover" icono={Pencil} texto="Mover" />
          <Herramienta id="linea" icono={Pencil} texto="Trazar línea" />
          <Herramienta id="texto" icono={Type} texto="Escribir" />
          <Herramienta id="borrar" icono={Eraser} texto="Borrar uno" />
          <span className="w-px h-6 bg-gray-200 mx-1" />
          <Button size="sm" variant="outline" onClick={deshacer} disabled={piezas.length === 0}>
            <Undo2 className="w-3.5 h-3.5 mr-1" />Deshacer
          </Button>
          <label className="inline-flex">
            <input type="file" accept="image/*" className="hidden" onChange={ponerFondo} data-prueba="fondo-croquis" />
            <span className="inline-flex items-center h-8 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent cursor-pointer">
              <ImageIcon className="w-3.5 h-3.5 mr-1" />Poner un plano de fondo
            </span>
          </label>
          <Button size="sm" variant="outline" className="text-red-500" onClick={limpiar}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />Empezar de cero
          </Button>
        </div>

        {/* Paleta de equipos */}
        {herramienta === 'equipo' && (
          <div className="flex items-center gap-1.5 flex-wrap p-2 bg-gray-50 rounded-lg border">
            {TIPOS_MAQUINA.map((t) => (
              <button key={t.id} onClick={() => setTipoElegido(t.id)}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition-all ${
                  tipoElegido === t.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'}`}>
                <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: t.color }} />
                {t.nombre}
              </button>
            ))}
            <span className="text-[10px] text-gray-400 ml-1">Elige uno y pincha en el plano</span>
          </div>
        )}

        {/* El lienzo */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <canvas
            ref={lienzo}
            width={ANCHO}
            height={ALTO}
            className="w-full touch-none block cursor-crosshair"
            onMouseDown={alEmpezar}
            onMouseMove={alMover}
            onMouseUp={alSoltar}
            onMouseLeave={alSoltar}
            onTouchStart={alEmpezar}
            onTouchMove={alMover}
            onTouchEnd={alSoltar}
          />
        </div>

        {/* Leyenda editable */}
        {piezas.some((p) => p.clase === 'equipo') && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-600">Leyenda — escribe qué es cada uno</p>
            {piezas.filter((p) => p.clase === 'equipo').map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-700 w-12 flex-shrink-0">{p.rotulo}</span>
                <Input value={p.descripcion || ''} onChange={(e) => cambiarDescripcion(p.id, e.target.value)}
                  className="h-8 text-xs" placeholder={nombreEquipo(p.tipo)} />
              </div>
            ))}
          </div>
        )}

        {/* Aclaraciones */}
        <div>
          <label className="text-xs font-semibold text-gray-600">Aclaraciones que acompañan al plano</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            data-prueba="notas-croquis"
            className="w-full mt-1 text-xs border rounded-lg p-2"
            placeholder="Por ejemplo: la línea frigorífica va por el falso techo del pasillo; el desagüe de condensados baja al patio…"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={usarEnElDocumento} disabled={guardando} className="bg-indigo-600 hover:bg-indigo-700">
            <Check className="w-4 h-4 mr-1" />
            {guardando ? 'Preparando...' : 'Poner este plano en el documento'}
          </Button>
          {plano?.imagen && (
            <Button variant="ghost" className="text-gray-500 hover:text-red-600" onClick={onQuitar}>
              <Trash2 className="w-3.5 h-3.5 mr-1" />Quitar el plano del documento
            </Button>
          )}
          {plano?.imagen && <span className="text-[11px] text-emerald-700">✓ Hay un plano puesto en el documento</span>}
        </div>
      </CardContent>
    </Card>
  );
}
