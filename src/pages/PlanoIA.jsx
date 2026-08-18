import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pencil, Move, Trash2, Wind, Sparkles, FileText, Loader2,
  RotateCcw, AlertCircle, Ruler, Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TIPOS_MAQUINA, FACTOR_USO, FACTOR_ORIENTACION, FACTOR_AISLAMIENTO,
  EQUIPOS_SUELTOS,
  resumenPlano, listaMateriales, totalMateriales, planoComoTexto,
} from '@/lib/planoCalculos';
import { dibujarEquipo, nombreEquipo, colorEquipo, radioAproximado } from '@/lib/planoSimbolos';
import PaletaEquipos from '@/components/PaletaEquipos';

/**
 * Plano IA — dibujar la planta, colocar las máquinas y sacar el presupuesto.
 *
 * El dibujo se hace a mano sobre una cuadrícula en metros. Con eso ya se
 * calcula todo (superficies, cargas, tubería, material y precios) SIN IA: así
 * el presupuesto sale igual aunque no haya cobertura en la obra o no queden
 * créditos. La IA es un paso opcional encima, para afinar marcas, modelos y
 * precios y avisar de lo que se haya pasado por alto.
 *
 * Los cálculos viven en src/lib/planoCalculos.js, aparte y comprobados.
 */

const METRO_PX = 40;   // píxeles por metro al zoom 1
const ANCHO_M = 24;    // tamaño del lienzo en metros
const ALTO_M = 18;

const HERRAMIENTAS = [
  { id: 'estancia', nombre: 'Dibujar estancia', icono: Pencil },
  { id: 'maquina', nombre: 'Poner equipo', icono: Wind },
  { id: 'exterior', nombre: 'Exterior / condensadora', icono: Wrench },
  { id: 'mover', nombre: 'Seleccionar', icono: Move },
  { id: 'borrar', nombre: 'Borrar', icono: Trash2 },
];

const nuevoId = () => Math.random().toString(36).slice(2, 9);

/** Redondeo a céntimos, para que las sumas del presupuesto cuadren. */
const aCentimos = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Redondea a medios metros: dibujar a mano alzada nunca sale exacto. */
const aRejilla = (m) => Math.round(m * 2) / 2;

export default function PlanoIA() {
  const canvasRef = useRef(null);

  const [herramienta, setHerramienta] = useState('estancia');
  // Qué equipo se coloca al pulsar con la herramienta "Poner equipo".
  const [equipoElegido, setEquipoElegido] = useState('mural');
  const [estancias, setEstancias] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [exterior, setExterior] = useState(null);
  const [alturaDefecto, setAlturaDefecto] = useState(2.5);
  const [seleccion, setSeleccion] = useState(null); // id de estancia
  const [arrastre, setArrastre] = useState(null);   // {x0,y0,x1,y1} en metros

  // IA
  const [analizando, setAnalizando] = useState(false);
  const [sugerenciaIA, setSugerenciaIA] = useState(null);
  const [errorIA, setErrorIA] = useState('');

  // Presupuesto
  const [dialogoPresu, setDialogoPresu] = useState(false);
  const [contactos, setContactos] = useState([]);
  const [contactoId, setContactoId] = useState('');
  const [margen, setMargen] = useState(30);
  const [iva, setIva] = useState(21);
  const [guardando, setGuardando] = useState(false);

  const plano = useMemo(
    () => ({ estancias, maquinas, unidad_exterior: exterior, altura_defecto: alturaDefecto }),
    [estancias, maquinas, exterior, alturaDefecto]
  );
  const resumen = useMemo(() => resumenPlano(plano), [plano]);
  const materiales = useMemo(() => listaMateriales(resumen), [resumen]);
  const totalCoste = useMemo(() => totalMateriales(materiales), [materiales]);

  useEffect(() => {
    base44.entities.Contact.list('name', 500)
      .then(setContactos)
      .catch(() => setContactos([])); // sin clientes se puede presupuestar igual
  }, []);

  // ── Dibujo del lienzo ──────────────────────────────────────────────────────
  const pintar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // Cuadrícula de 1 m, con línea marcada cada 5 m para poder contar de un vistazo.
    for (let m = 0; m <= ANCHO_M; m++) {
      ctx.strokeStyle = m % 5 === 0 ? '#cbd5e1' : '#eef2f7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(m * METRO_PX, 0);
      ctx.lineTo(m * METRO_PX, H);
      ctx.stroke();
    }
    for (let m = 0; m <= ALTO_M; m++) {
      ctx.strokeStyle = m % 5 === 0 ? '#cbd5e1' : '#eef2f7';
      ctx.beginPath();
      ctx.moveTo(0, m * METRO_PX);
      ctx.lineTo(W, m * METRO_PX);
      ctx.stroke();
    }

    // Estancias
    for (const e of estancias) {
      const x = e.x * METRO_PX, y = e.y * METRO_PX;
      const w = e.ancho * METRO_PX, h = e.alto * METRO_PX;
      const activa = e.id === seleccion;

      ctx.fillStyle = activa ? 'rgba(37,99,235,0.12)' : 'rgba(100,116,139,0.08)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = activa ? '#2563eb' : '#475569';
      ctx.lineWidth = activa ? 3 : 2;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(e.nombre || 'Estancia', x + 6, y + 16);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(`${e.ancho}×${e.alto} m · ${(e.ancho * e.alto).toFixed(1)} m²`, x + 6, y + 30);
    }

    // Equipos colocados
    for (const mq of maquinas) {
      const x = mq.x * METRO_PX, y = mq.y * METRO_PX;

      // La tubería va primero, para que el símbolo quede encima y se lea.
      // Los equipos sueltos (vitrina, arcón, puerta) no llevan este trazado.
      if (exterior && !EQUIPOS_SUELTOS.includes(mq.tipo)) {
        ctx.strokeStyle = 'rgba(15,118,110,0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(exterior.x * METRO_PX, y);
        ctx.lineTo(exterior.x * METRO_PX, exterior.y * METRO_PX);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      dibujarEquipo(ctx, mq.tipo, x, y, 1, mq.estancia_id && mq.estancia_id === seleccion);

      ctx.fillStyle = '#475569';
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(nombreEquipo(mq.tipo), x, y + 26);
      ctx.textAlign = 'left';
    }

    // Unidad exterior / condensadora
    if (exterior) {
      const x = exterior.x * METRO_PX, y = exterior.y * METRO_PX;
      const tipoExt = resumen.es_refrigeracion ? 'unidad_condensadora' : 'exterior';
      dibujarEquipo(ctx, tipoExt, x, y, 1.1, false);
      ctx.fillStyle = colorEquipo(tipoExt);
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(resumen.es_refrigeracion ? 'CONDENSADORA' : 'EXTERIOR', x, y + 30);
      ctx.textAlign = 'left';
    }

    // Rectángulo que se está dibujando ahora mismo
    if (arrastre) {
      const x = Math.min(arrastre.x0, arrastre.x1) * METRO_PX;
      const y = Math.min(arrastre.y0, arrastre.y1) * METRO_PX;
      const w = Math.abs(arrastre.x1 - arrastre.x0) * METRO_PX;
      const h = Math.abs(arrastre.y1 - arrastre.y0) * METRO_PX;
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(
        `${Math.abs(arrastre.x1 - arrastre.x0)} × ${Math.abs(arrastre.y1 - arrastre.y0)} m`,
        x + 4, y - 4
      );
    }
  }, [estancias, maquinas, exterior, seleccion, arrastre, resumen.es_refrigeracion]);

  useEffect(() => { pintar(); }, [pintar]);

  // ── Coordenadas del puntero en metros ──────────────────────────────────────
  const posicionEnMetros = (ev) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    // El lienzo se escala con CSS, así que hay que pasar de píxeles de pantalla
    // a píxeles del lienzo antes de convertir a metros.
    const escalaX = canvas.width / r.width;
    const escalaY = canvas.height / r.height;
    const px = (ev.clientX - r.left) * escalaX;
    const py = (ev.clientY - r.top) * escalaY;
    return {
      x: Math.max(0, Math.min(ANCHO_M, aRejilla(px / METRO_PX))),
      y: Math.max(0, Math.min(ALTO_M, aRejilla(py / METRO_PX))),
    };
  };

  const estanciaEn = (x, y) =>
    // De atrás hacia delante: si se solapan, gana la dibujada encima.
    [...estancias].reverse().find(e => x >= e.x && x <= e.x + e.ancho && y >= e.y && y <= e.y + e.alto) || null;

  const onPointerDown = (ev) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    const { x, y } = posicionEnMetros(ev);

    if (herramienta === 'estancia') {
      setArrastre({ x0: x, y0: y, x1: x, y1: y });
      return;
    }
    if (herramienta === 'exterior') {
      setExterior({ x, y });
      return;
    }
    if (herramienta === 'maquina') {
      // Vitrinas, arcones y puertas se ponen donde haga falta: son mobiliario,
      // no van ligados a la carga de una estancia.
      if (EQUIPOS_SUELTOS.includes(equipoElegido)) {
        setMaquinas(prev => [...prev, { id: nuevoId(), tipo: equipoElegido, x, y }]);
        return;
      }
      const est = estanciaEn(x, y);
      if (!est) { toast.error('Pon el equipo dentro de una estancia dibujada'); return; }
      setMaquinas(prev => [
        // Una unidad interior por estancia: si ya había, se sustituye.
        ...prev.filter(m => m.estancia_id !== est.id),
        { id: nuevoId(), estancia_id: est.id, tipo: equipoElegido, x, y },
      ]);
      setSeleccion(est.id);
      return;
    }
    if (herramienta === 'borrar') {
      const maq = [...maquinas].reverse().find(m => {
        const r = radioAproximado(m.tipo);
        return Math.abs(m.x - x) <= r && Math.abs(m.y - y) <= r;
      });
      if (maq) { setMaquinas(prev => prev.filter(m => m.id !== maq.id)); return; }
      if (exterior && Math.abs(exterior.x - x) < 0.75 && Math.abs(exterior.y - y) < 0.75) {
        setExterior(null); return;
      }
      const est = estanciaEn(x, y);
      if (est) {
        setEstancias(prev => prev.filter(e => e.id !== est.id));
        setMaquinas(prev => prev.filter(m => m.estancia_id !== est.id));
        if (seleccion === est.id) setSeleccion(null);
      }
      return;
    }
    // Seleccionar
    setSeleccion(estanciaEn(x, y)?.id || null);
  };

  const onPointerMove = (ev) => {
    if (!arrastre) return;
    const { x, y } = posicionEnMetros(ev);
    setArrastre(a => (a ? { ...a, x1: x, y1: y } : null));
  };

  const onPointerUp = () => {
    if (!arrastre) return;
    const ancho = Math.abs(arrastre.x1 - arrastre.x0);
    const alto = Math.abs(arrastre.y1 - arrastre.y0);
    setArrastre(null);
    // Un toque suelto no es una estancia: hace falta arrastrar de verdad.
    if (ancho < 1 || alto < 1) { toast.error('Arrastra para marcar la estancia (mínimo 1×1 m)'); return; }

    const id = nuevoId();
    setEstancias(prev => [...prev, {
      id,
      nombre: `Estancia ${prev.length + 1}`,
      x: Math.min(arrastre.x0, arrastre.x1),
      y: Math.min(arrastre.y0, arrastre.y1),
      ancho, alto,
      altura: alturaDefecto,
      uso: 'vivienda',
      orientacion: 'este',
      aislamiento: 'normal',
    }]);
    setSeleccion(id);
  };

  const actualizarEstancia = (id, campo, valor) => {
    setEstancias(prev => prev.map(e => (e.id === id ? { ...e, [campo]: valor } : e)));
  };

  const actualizarMaquina = (estanciaId, tipo) => {
    setMaquinas(prev => prev.map(m => (m.estancia_id === estanciaId ? { ...m, tipo } : m)));
  };

  const limpiar = () => {
    setEstancias([]); setMaquinas([]); setExterior(null);
    setSeleccion(null); setSugerenciaIA(null); setErrorIA('');
  };

  // ── Afinar con IA ──────────────────────────────────────────────────────────
  const afinarConIA = async () => {
    if (!resumen.detalle.length) { toast.error('Dibuja al menos una estancia'); return; }
    setAnalizando(true);
    setErrorIA('');
    try {
      // Se manda el plano YA MEDIDO en texto, no la imagen: gasta muchísimo
      // menos y la IA no tiene que adivinar las cotas, que es donde falla.
      const respuesta = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: [
          'Eres un instalador de climatización con muchos años de oficio en España.',
          'Te paso un plano ya dibujado y medido, con la carga térmica ya estimada.',
          '',
          planoComoTexto(plano, resumen),
          '',
          'Devuelve SOLO un JSON con esta forma:',
          '{',
          '  "maquinas_recomendadas": [{ "estancia": string, "marca": string, "modelo": string, "kw": numero, "seer": numero, "precio_estimado": numero }],',
          '  "materiales_extra": [{ "descripcion": string, "unidad": string, "cantidad": numero, "precio_ud": numero, "categoria": string }],',
          '  "avisos": [string],',
          '  "notas_tecnicas": string',
          '}',
          '',
          'En "materiales_extra" pon SOLO lo que falte y no esté ya contemplado',
          '(máquinas, tubería, desagüe, cable, soportes, vacío y mano de obra ya están).',
          'En "avisos" señala lo que pueda dar problemas: distancias excesivas,',
          'desniveles, potencias justas, necesidad de línea eléctrica propia, etc.',
          'Precios de mercado español, en euros, sin IVA.',
        ].join('\n'),
        response_json_schema: {
          type: 'object',
          properties: {
            maquinas_recomendadas: { type: 'array' },
            materiales_extra: { type: 'array' },
            avisos: { type: 'array' },
            notas_tecnicas: { type: 'string' },
          },
        },
      });
      setSugerenciaIA(respuesta || null);
      toast.success('Propuesta de la IA lista');
    } catch (err) {
      console.error('[Plano IA] Error al consultar la IA:', err);
      // El cálculo propio sigue siendo válido: se dice claramente.
      setErrorIA('No se pudo consultar a la IA. Los cálculos y el presupuesto de abajo siguen siendo válidos, están hechos por el programa.');
    } finally {
      setAnalizando(false);
    }
  };

  // ── Presupuesto ────────────────────────────────────────────────────────────
  const lineasPresupuesto = useMemo(() => {
    const extra = (sugerenciaIA?.materiales_extra || []).map(m => ({
      descripcion: m.descripcion,
      unidad: m.unidad || 'ud',
      cantidad: Number(m.cantidad) || 1,
      precio_ud: Number(m.precio_ud) || 0,
      total: (Number(m.cantidad) || 1) * (Number(m.precio_ud) || 0),
      categoria: m.categoria || 'accesorios',
    }));
    return [...materiales, ...extra];
  }, [materiales, sugerenciaIA]);

  const totales = useMemo(() => {
    const coste = totalMateriales(lineasPresupuesto);
    const subtotal = aCentimos(coste * (1 + margen / 100));
    const ivaImporte = aCentimos(subtotal * iva / 100);
    return { coste, subtotal, ivaImporte, total: aCentimos(subtotal + ivaImporte) };
  }, [lineasPresupuesto, margen, iva]);

  const crearPresupuesto = async () => {
    const contacto = contactos.find(c => c.id === contactoId);
    const nombre = contacto ? `${contacto.name || ''} ${contacto.surname || ''}`.trim() : 'Cliente';
    setGuardando(true);
    try {
      const items = lineasPresupuesto.map(l => {
        const pvp = aCentimos(l.precio_ud * (1 + margen / 100));
        return {
          description: `${l.descripcion}${l.unidad && l.unidad !== 'ud' ? ` (${l.unidad})` : ''}`,
          quantity: l.cantidad,
          unit_price: pvp,
          discount: 0,
          total: aCentimos(l.cantidad * pvp),
        };
      });
      // El subtotal se suma de las líneas ya redondeadas: así el papel cuadra
      // al céntimo con lo que ve el cliente, sin descuadres de redondeo.
      const subtotal = aCentimos(items.reduce((s, i) => s + i.total, 0));
      const ivaImporte = aCentimos(subtotal * iva / 100);

      const notas = [
        `Presupuesto generado desde el plano dibujado el ${new Date().toLocaleDateString('es-ES')}.`,
        `Superficie total ${resumen.area_total} m², carga estimada ${resumen.frigorias_total} frig/h (${resumen.kw_total} kW).`,
        `Unidad exterior prevista de ${resumen.kw_exterior_comercial} kW.`,
        sugerenciaIA?.notas_tecnicas || '',
        (sugerenciaIA?.avisos || []).length ? `Avisos: ${sugerenciaIA.avisos.join(' · ')}` : '',
      ].filter(Boolean).join('\n');

      await base44.entities.Invoice.create({
        doc_type: 'presupuesto',
        contact_id: contactoId || '',
        contact_name: nombre,
        date: new Date().toISOString().split('T')[0],
        status: 'borrador',
        items,
        subtotal,
        iva_rate: iva,
        iva_amount: ivaImporte,
        total: aCentimos(subtotal + ivaImporte),
        observations: notas,
      });

      setDialogoPresu(false);
      toast.success('Presupuesto creado. Lo tienes en Documentos.');
    } catch (err) {
      console.error('[Plano IA] Error al crear el presupuesto:', err);
      toast.error('No se pudo crear el presupuesto. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const estanciaSel = estancias.find(e => e.id === seleccion) || null;
  const maquinaSel = maquinas.find(m => m.estancia_id === seleccion) || null;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Ruler className="w-6 h-6 text-blue-600" />
          Plano y presupuesto
        </h1>
        <p className="text-sm text-slate-500">
          Dibuja la planta, coloca las máquinas y sale el presupuesto con la lista de material.
        </p>
      </div>

      {/* Herramientas */}
      <div className="flex flex-wrap gap-2">
        {HERRAMIENTAS.map(h => {
          const Icono = h.icono;
          return (
            <Button
              key={h.id}
              size="sm"
              variant={herramienta === h.id ? 'default' : 'outline'}
              onClick={() => setHerramienta(h.id)}
              className="gap-1.5"
            >
              <Icono className="w-4 h-4" />{h.nombre}
            </Button>
          );
        })}
        <Button size="sm" variant="outline" onClick={limpiar} className="gap-1.5 text-red-600">
          <RotateCcw className="w-4 h-4" />Empezar de nuevo
        </Button>
      </div>

      <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-2.5">
        Cada cuadro de la rejilla es <strong>1 metro</strong> (las líneas gruesas, 5 m).
        Arrastra para marcar cada estancia, luego pon una máquina dentro de cada una
        y la unidad exterior donde vaya a ir de verdad: de ahí salen los metros de tubería.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lienzo */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-2 overflow-x-auto">
              <canvas
                ref={canvasRef}
                width={ANCHO_M * METRO_PX}
                height={ALTO_M * METRO_PX}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="border border-slate-200 rounded touch-none"
                style={{
                  // Ancho mínimo para que en el móvil el metro no quede tan
                  // pequeño que no se pueda dibujar: la tarjeta hace scroll.
                  minWidth: 640,
                  width: '100%',
                  cursor: herramienta === 'borrar' ? 'not-allowed' : 'crosshair',
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Panel lateral */}
        <div className="space-y-4">
          {herramienta === 'maquina' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Qué equipo pones</CardTitle>
              </CardHeader>
              <CardContent>
                <PaletaEquipos valor={equipoElegido} onChange={setEquipoElegido} />
                <p className="text-[10px] text-slate-400 mt-2">
                  Los de climatización y el evaporador de cámara van dentro de una
                  estancia (una por estancia). Vitrinas, arcones y puertas se ponen
                  donde haga falta.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Totales</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1.5">
              <Fila etiqueta="Estancias" valor={estancias.length} />
              <Fila etiqueta="Superficie" valor={`${resumen.area_total} m²`} />
              <Fila etiqueta="Carga estimada" valor={`${resumen.frigorias_total} frig/h`} />
              <Fila etiqueta="Potencia" valor={`${resumen.kw_total} kW`} />
              <Fila etiqueta="Unidad exterior" valor={`${resumen.kw_exterior_comercial} kW`} />
              <Fila etiqueta="Tubería" valor={`${resumen.metros_tuberia_total} m`} />
              <div className="pt-2 border-t flex justify-between font-semibold">
                <span>Coste material</span><span>{totalCoste.toFixed(2)} €</span>
              </div>

              <div className="pt-2">
                <label className="text-xs font-medium text-slate-600">Altura de techo por defecto (m)</label>
                <Input
                  type="number" step="0.1" min="2" max="6" className="mt-1 h-8"
                  value={alturaDefecto}
                  onChange={e => setAlturaDefecto(Number(e.target.value) || 2.5)}
                />
              </div>

              {resumen.camaras.length > 0 && (
                <p className="text-xs text-sky-800 bg-sky-50 border border-sky-200 rounded p-2 mt-2">
                  Hay cámaras dibujadas ({resumen.camaras.join(', ')}). Aquí sale un
                  primer dimensionado para presupuestar; para el cálculo fino (producto,
                  entradas diarias, renovaciones y horas de funcionamiento) usa la
                  pantalla de <strong>Cámara Frigorífica</strong>.
                </p>
              )}

              {resumen.sin_maquina.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
                  Sin máquina: {resumen.sin_maquina.join(', ')}
                </p>
              )}
              {!exterior && estancias.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                  Falta la unidad exterior: sin ella no se pueden medir los metros de tubería.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Estancia seleccionada */}
          {estanciaSel && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{estanciaSel.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div>
                  <label className="text-xs font-medium text-slate-600">Nombre</label>
                  <Input className="mt-1 h-8" value={estanciaSel.nombre}
                    onChange={e => actualizarEstancia(estanciaSel.id, 'nombre', e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Medida etiqueta="Ancho (m)" valor={estanciaSel.ancho}
                    onChange={v => actualizarEstancia(estanciaSel.id, 'ancho', v)} />
                  <Medida etiqueta="Fondo (m)" valor={estanciaSel.alto}
                    onChange={v => actualizarEstancia(estanciaSel.id, 'alto', v)} />
                  <Medida etiqueta="Altura (m)" valor={estanciaSel.altura}
                    onChange={v => actualizarEstancia(estanciaSel.id, 'altura', v)} />
                </div>
                <Desplegable etiqueta="Uso" valor={estanciaSel.uso} opciones={Object.keys(FACTOR_USO)}
                  onChange={v => actualizarEstancia(estanciaSel.id, 'uso', v)} />
                <Desplegable etiqueta="Orientación" valor={estanciaSel.orientacion} opciones={Object.keys(FACTOR_ORIENTACION)}
                  onChange={v => actualizarEstancia(estanciaSel.id, 'orientacion', v)} />
                <Desplegable etiqueta="Aislamiento" valor={estanciaSel.aislamiento} opciones={Object.keys(FACTOR_AISLAMIENTO)}
                  onChange={v => actualizarEstancia(estanciaSel.id, 'aislamiento', v)} />
                {maquinaSel && (
                  <Desplegable
                    etiqueta="Tipo de máquina" valor={maquinaSel.tipo}
                    opciones={TIPOS_MAQUINA.filter(t => t.id !== 'exterior' && t.id !== 'unidad_condensadora').map(t => t.id)}
                    nombres={Object.fromEntries(TIPOS_MAQUINA.map(t => [t.id, t.nombre]))}
                    onChange={v => actualizarMaquina(estanciaSel.id, v)}
                  />
                )}
                {(() => {
                  const d = resumen.detalle.find(x => x.estancia.id === estanciaSel.id);
                  if (!d) return null;
                  return (
                    <div className="text-xs bg-slate-50 border rounded p-2 space-y-0.5">
                      <p>{d.area} m² · {d.volumen} m³</p>
                      <p>{d.frigorias} frig/h ({d.kw} kW)</p>
                      <p className="font-medium">Máquina: {d.kw_comercial} kW</p>
                      {d.metros_tuberia > 0 && <p>{d.metros_tuberia} m de tubería</p>}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Button onClick={afinarConIA} disabled={analizando || !estancias.length}
              variant="outline" className="w-full gap-2">
              {analizando
                ? <><Loader2 className="w-4 h-4 animate-spin" />Consultando…</>
                : <><Sparkles className="w-4 h-4" />Afinar con IA (opcional)</>}
            </Button>
            <Button onClick={() => setDialogoPresu(true)} disabled={!materiales.length}
              className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4" />Pasar a presupuesto
            </Button>
          </div>
        </div>
      </div>

      {errorIA && (
        <div className="flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{errorIA}</span>
        </div>
      )}

      {/* Propuesta de la IA */}
      {sugerenciaIA && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />Propuesta de la IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(sugerenciaIA.maquinas_recomendadas || []).length > 0 && (
              <div>
                <p className="font-medium mb-1">Máquinas recomendadas</p>
                <ul className="space-y-1">
                  {sugerenciaIA.maquinas_recomendadas.map((m, i) => (
                    <li key={i} className="text-slate-600">
                      <strong>{m.estancia}:</strong> {m.marca} {m.modelo} · {m.kw} kW
                      {m.seer ? ` · SEER ${m.seer}` : ''}
                      {m.precio_estimado ? ` · ${Number(m.precio_estimado).toFixed(2)} €` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(sugerenciaIA.avisos || []).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-2">
                <p className="font-medium text-amber-800 mb-1">A tener en cuenta</p>
                <ul className="list-disc ml-4 text-amber-800 space-y-0.5">
                  {sugerenciaIA.avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
            {sugerenciaIA.notas_tecnicas && (
              <p className="text-slate-600 whitespace-pre-wrap">{sugerenciaIA.notas_tecnicas}</p>
            )}
            <p className="text-xs text-slate-400">
              Sugerencia orientativa: contrasta modelos y precios con tu proveedor antes de enviar el presupuesto.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Lista de material */}
      {lineasPresupuesto.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lista de material y mano de obra</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500 bg-slate-50">
                  <th className="p-2">Concepto</th>
                  <th className="p-2 text-center">Cant.</th>
                  <th className="p-2 text-right">Precio</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineasPresupuesto.map((l, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{l.descripcion}</td>
                    <td className="p-2 text-center">{l.cantidad} {l.unidad}</td>
                    <td className="p-2 text-right">{l.precio_ud.toFixed(2)} €</td>
                    <td className="p-2 text-right font-medium">{l.total.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-slate-50 font-semibold">
                  <td className="p-2" colSpan={3}>Coste total</td>
                  <td className="p-2 text-right">{totales.coste.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Diálogo de presupuesto */}
      <Dialog open={dialogoPresu} onOpenChange={setDialogoPresu}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Crear presupuesto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600">Cliente</label>
              <Select value={contactoId} onValueChange={setContactoId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Elegir cliente…" /></SelectTrigger>
                <SelectContent>
                  {contactos.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {`${c.name || ''} ${c.surname || ''}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400 mt-1">
                Si no eliges ninguno se guarda como «Cliente» y lo cambias luego en Documentos.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-600">Margen (%)</label>
                <Input type="number" min="0" max="200" className="mt-1"
                  value={margen} onChange={e => setMargen(Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600">IVA (%)</label>
                <Input type="number" min="0" max="30" className="mt-1"
                  value={iva} onChange={e => setIva(Number(e.target.value) || 0)} />
              </div>
            </div>
            <div className="text-sm bg-slate-50 border rounded p-3 space-y-1">
              <Fila etiqueta="Coste" valor={`${totales.coste.toFixed(2)} €`} />
              <Fila etiqueta={`Base con ${margen}% de margen`} valor={`${totales.subtotal.toFixed(2)} €`} />
              <Fila etiqueta={`IVA ${iva}%`} valor={`${totales.ivaImporte.toFixed(2)} €`} />
              <div className="flex justify-between font-semibold pt-1 border-t">
                <span>Total</span><span>{totales.total.toFixed(2)} €</span>
              </div>
            </div>
            <Button onClick={crearPresupuesto} disabled={guardando}
              className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
              {guardando
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creando…</>
                : <><FileText className="w-4 h-4" />Crear presupuesto</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Fila({ etiqueta, valor }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{etiqueta}</span>
      <span className="font-medium text-slate-800">{valor}</span>
    </div>
  );
}

function Medida({ etiqueta, valor, onChange }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-600">{etiqueta}</label>
      <Input type="number" step="0.5" min="0.5" className="mt-1 h-8"
        value={valor} onChange={e => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function Desplegable({ etiqueta, valor, opciones, onChange, nombres }) {
  const bonito = (s) => (nombres?.[s]) || s.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  return (
    <div>
      <label className="text-xs font-medium text-slate-600">{etiqueta}</label>
      <Select value={valor} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
        <SelectContent>
          {opciones.map(o => <SelectItem key={o} value={o}>{bonito(o)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
