import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pencil, Move, Trash2, Wind, Sparkles, FileText, Loader2,
  RotateCcw, AlertCircle, Ruler, Wrench, Euro, Layers, Plus, X,
  Spline, Box, Map, Check, Image as ImageIcon, Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TIPOS_MAQUINA, FACTOR_USO, FACTOR_ORIENTACION, FACTOR_AISLAMIENTO,
  EQUIPOS_SUELTOS, PRECIOS_REFERENCIA,
  resumenPlano, listaMateriales, totalMateriales, planoComoTexto,
} from '@/lib/planoCalculos';
import { dibujarEquipo, nombreEquipo, colorEquipo, radioAproximado } from '@/lib/planoSimbolos';
import PaletaEquipos from '@/components/PaletaEquipos';
import Vista3DPlano from '@/components/Vista3DPlano';
import {
  evaluarRecorrido, evaluarConducto, caudalDeKw, LIMITES,
} from '@/lib/planoRecorrido';
import {
  genericasDeTipo, sugerirMaquina, fichaEstancia, diametrosDeKw,
} from '@/lib/catalogoMaquinas';

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
  { id: 'recorrido', nombre: 'Trazar tubería', icono: Spline },
  { id: 'conducto', nombre: 'Trazar conducto', icono: Map },
  { id: 'mover', nombre: 'Seleccionar', icono: Move },
  { id: 'borrar', nombre: 'Borrar', icono: Trash2 },
];

const nuevoId = () => Math.random().toString(36).slice(2, 9);

// Los precios se guardan en este equipo. Cambian con el tiempo y cada uno
// tiene los suyos, así que no tiene sentido que haya que reescribirlos en
// cada presupuesto.
const CLAVE_PRECIOS = 'gpt_precios_plano';

function cargarPrecios() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_PRECIOS) || '{}');
    return { ...PRECIOS_REFERENCIA, ...guardado };
  } catch {
    return { ...PRECIOS_REFERENCIA };
  }
}

/** Redondeo a céntimos, para que las sumas del presupuesto cuadren. */
const aCentimos = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Redondea a medios metros: dibujar a mano alzada nunca sale exacto. */
const aRejilla = (m) => Math.round(m * 2) / 2;

export default function PlanoIA() {
  const canvasRef = useRef(null);

  const [herramienta, setHerramienta] = useState('estancia');
  // Qué equipo se coloca al pulsar con la herramienta "Poner equipo".
  const [equipoElegido, setEquipoElegido] = useState('mural');

  // Plantas del edificio. Un chalet o un local de dos alturas no se puede
  // dibujar en una sola hoja: cada planta lleva sus estancias y sus equipos,
  // y el presupuesto suma todas. La unidad exterior es UNA para el edificio.
  const [plantas, setPlantas] = useState([
    { id: nuevoId(), nombre: 'Planta baja', cota: 0, estancias: [], maquinas: [] },
  ]);
  const [plantaActiva, setPlantaActiva] = useState(0);
  const [exterior, setExterior] = useState(null);

  const planta = plantas[plantaActiva] || plantas[0];
  const estancias = planta?.estancias || [];
  const maquinas = planta?.maquinas || [];

  /** Cambia algo de la planta que se está dibujando. */
  const actualizarPlanta = (cambio) => {
    setPlantas(prev => prev.map((pl, i) => (i === plantaActiva ? { ...pl, ...cambio } : pl)));
  };
  const setEstancias = (valor) => {
    setPlantas(prev => prev.map((pl, i) => (
      i === plantaActiva
        ? { ...pl, estancias: typeof valor === 'function' ? valor(pl.estancias) : valor }
        : pl
    )));
  };
  const setMaquinas = (valor) => {
    setPlantas(prev => prev.map((pl, i) => (
      i === plantaActiva
        ? { ...pl, maquinas: typeof valor === 'function' ? valor(pl.maquinas) : valor }
        : pl
    )));
  };

  const anadirPlanta = () => {
    setPlantas(prev => {
      const n = prev.length;
      return [...prev, {
        id: nuevoId(),
        nombre: n === 0 ? 'Planta baja' : `Planta ${n}`,
        // Cota orientativa: cada planta, una altura de techo por encima.
        cota: Number((n * (Number(alturaDefecto) || 2.5)).toFixed(2)),
        estancias: [], maquinas: [],
      }];
    });
    setPlantaActiva(plantas.length);
    setSeleccion(null);
  };

  const borrarPlanta = (indice) => {
    if (plantas.length === 1) { toast.error('Tiene que quedar al menos una planta'); return; }
    setPlantas(prev => prev.filter((_, i) => i !== indice));
    setPlantaActiva(a => (a >= indice && a > 0 ? a - 1 : a));
    setSeleccion(null);
  };
  // Recorridos dibujados a mano: por dónde va DE VERDAD la instalación.
  // Se guardan por planta (cada uno lleva su cota) y son lo que manda sobre
  // los metros del presupuesto: el trazado real siempre gana a la estimación.
  const [recorridos, setRecorridos] = useState([]);   // [{id, tipo, planta, cota, puntos:[], caudal}]
  const [trazando, setTrazando] = useState(null);     // recorrido en curso
  const [vista, setVista] = useState('plano');        // 'plano' | '3d'
  const [tipoInstalacion, setTipoInstalacion] = useState('split_1x1');
  // Marca y modelo elegidos por estancia: { [estanciaId]: maquina }
  const [maquinasElegidas, setMaquinasElegidas] = useState({});
  const [verResumen, setVerResumen] = useState(false);

  // Plano de fondo para calcar: foto, escaneo o dibujo a mano. Se lee en el
  // propio equipo, NO se sube a ningún sitio: así funciona en la obra sin
  // cobertura y sin gastar crédito de la cuenta.
  const [fondo, setFondo] = useState(null);        // { imagen, nombre }
  const [fondoOpacidad, setFondoOpacidad] = useState(0.45);
  const [fondoEscala, setFondoEscala] = useState(1);
  const [fondoDesplaza, setFondoDesplaza] = useState({ x: 0, y: 0 });

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

  // Precios
  const [precios, setPrecios] = useState(cargarPrecios);
  const [verPrecios, setVerPrecios] = useState(false);

  const cambiarPrecio = (clave, valor) => {
    setPrecios(prev => {
      const nuevos = { ...prev, [clave]: Number(valor) || 0 };
      try { localStorage.setItem(CLAVE_PRECIOS, JSON.stringify(nuevos)); } catch { /* sin guardar */ }
      return nuevos;
    });
  };

  // Para calcular y presupuestar se juntan TODAS las plantas, no solo la que
  // se está dibujando: el presupuesto es del edificio entero. A cada estancia
  // y equipo se le pega la cota de su planta, que es lo que hace que la
  // tubería de un segundo piso salga más larga que la de la planta baja.
  const plano = useMemo(() => {
    const todasEstancias = [];
    const todasMaquinas = [];
    for (const pl of plantas) {
      for (const e of pl.estancias) todasEstancias.push({ ...e, planta: pl.nombre, cota: pl.cota });
      for (const m of pl.maquinas) todasMaquinas.push({ ...m, planta: pl.nombre, cota: pl.cota });
    }
    return {
      estancias: todasEstancias,
      maquinas: todasMaquinas,
      unidad_exterior: exterior,
      altura_defecto: alturaDefecto,
    };
  }, [plantas, exterior, alturaDefecto]);
  const resumen = useMemo(() => resumenPlano(plano), [plano]);

  // Cada recorrido, revisado: metros, codos, gas que hay que añadir y avisos.
  const recorridosRevisados = useMemo(() => recorridos.map(r => {
    if (r.tipo === 'conducto') {
      return { ...r, revision: evaluarConducto(r.puntos, r.caudal || 0, 'principal'), esConducto: true };
    }
    const primero = r.puntos[0];
    const ultimo = r.puntos[r.puntos.length - 1];
    // El desnivel es la cota de su planta más la bajada normal hasta la exterior.
    const desnivel = (Number(r.cota) || 0) + (Number(alturaDefecto) || 2.5);
    return {
      ...r,
      revision: evaluarRecorrido(r.puntos, desnivel, tipoInstalacion, primero,
        exterior || ultimo),
      esConducto: false,
    };
  }), [recorridos, exterior, alturaDefecto, tipoInstalacion]);

  // Caudal que hay que mover si hay máquinas de conductos, para proponerlo
  // al dimensionar el conducto en vez de tener que buscarlo en una tabla.
  const caudalSugerido = useMemo(() => {
    const kw = resumen.detalle
      .filter(d => d.maquina?.tipo === 'conductos')
      .reduce((s, d) => s + d.kw_comercial, 0);
    return caudalDeKw(kw);
  }, [resumen]);

  // Metros de tubería realmente trazados: si los hay, mandan sobre la estimación.
  const metrosTrazados = useMemo(
    () => recorridosRevisados
      .filter(r => !r.esConducto)
      .reduce((s, r) => s + r.revision.metros, 0),
    [recorridosRevisados]
  );

  // Ficha técnica de cada estancia: superficie, máquina, lo que cubre esa
  // máquina, diámetros de tubería y gas a añadir. Es el resumen que hace falta
  // para comprar el material y para explicárselo al cliente.
  const fichas = useMemo(() => resumen.detalle
    .filter(d => d.maquina)
    .map(d => {
      const factorUso = FACTOR_USO[d.estancia.uso] ?? FACTOR_USO.vivienda;
      // Si hay recorrido trazado para esa planta se usa; si no, el estimado.
      const trazado = recorridosRevisados.find(
        r => !r.esConducto && r.planta === d.estancia.planta
      );
      const metros = trazado ? trazado.revision.metros : d.metros_tuberia;
      // Si no se ha elegido máquina a mano, se usa la del catálogo que le
      // toca a ese TIPO de equipo. El escalón teórico no vale: no existe una
      // máquina de conductos de 2 kW, y presupuestarla es prometer algo que
      // luego no se puede comprar.
      const maquina = maquinasElegidas[d.estancia.id]
        || sugerirMaquina(d.kw, d.maquina.tipo);
      return fichaEstancia(d, factorUso, metros, maquina);
    }), [resumen, maquinasElegidas, recorridosRevisados]);

  // Si se ha trazado la instalación a mano, el presupuesto va con ESOS metros:
  // el recorrido real siempre manda sobre la estimación por recorrido de pared.
  const materiales = useMemo(() => {
    const base = metrosTrazados > 0
      ? { ...resumen, metros_tuberia_total: Number(metrosTrazados.toFixed(1)) }
      : resumen;
    return listaMateriales(base, precios);
  }, [resumen, precios, metrosTrazados]);
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

    // El plano de fondo va lo primero, para dibujar encima de él.
    if (fondo?.imagen) {
      ctx.save();
      ctx.globalAlpha = fondoOpacidad;
      const ancho = fondo.imagen.width * fondoEscala;
      const alto = fondo.imagen.height * fondoEscala;
      ctx.drawImage(fondo.imagen, fondoDesplaza.x, fondoDesplaza.y, ancho, alto);
      ctx.restore();
    }

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

    // Recorridos trazados a mano en esta planta
    for (const rec of recorridos) {
      if (rec.planta !== planta?.nombre) continue;
      const esConducto = rec.tipo === 'conducto';
      ctx.strokeStyle = esConducto ? '#f59e0b' : '#0f766e';
      ctx.lineWidth = esConducto ? 7 : 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = esConducto ? 0.55 : 0.9;
      ctx.beginPath();
      rec.puntos.forEach((pt, i) => {
        const px = pt.x * METRO_PX, py = pt.y * METRO_PX;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Puntos de paso, para ver dónde se hizo cada codo
      ctx.fillStyle = esConducto ? '#b45309' : '#0f766e';
      for (const pt of rec.puntos) {
        ctx.beginPath();
        ctx.arc(pt.x * METRO_PX, pt.y * METRO_PX, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // El trazado que se está haciendo ahora
    if (trazando && trazando.planta === planta?.nombre) {
      ctx.strokeStyle = trazando.tipo === 'conducto' ? '#f59e0b' : '#0f766e';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      trazando.puntos.forEach((pt, i) => {
        const px = pt.x * METRO_PX, py = pt.y * METRO_PX;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f766e';
      for (const pt of trazando.puntos) {
        ctx.beginPath();
        ctx.arc(pt.x * METRO_PX, pt.y * METRO_PX, 4, 0, Math.PI * 2);
        ctx.fill();
      }
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
  }, [estancias, maquinas, exterior, seleccion, arrastre, resumen.es_refrigeracion,
      recorridos, trazando, planta?.nombre, fondo, fondoOpacidad, fondoEscala, fondoDesplaza]);

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
    if (herramienta === 'recorrido' || herramienta === 'conducto') {
      // Se va marcando punto a punto por dónde pasa. Se cierra con el botón
      // "Terminar trazado" (o pulsando encima del último punto).
      setTrazando(prev => {
        if (!prev) {
          return {
            id: nuevoId(),
            tipo: herramienta === 'conducto' ? 'conducto' : 'tuberia',
            planta: planta?.nombre,
            cota: planta?.cota || 0,
            puntos: [{ x, y }],
          };
        }
        const ultimo = prev.puntos[prev.puntos.length - 1];
        // Pulsar dos veces en el mismo sitio cierra el trazado.
        if (Math.abs(ultimo.x - x) < 0.3 && Math.abs(ultimo.y - y) < 0.3) {
          terminarTrazado(prev);
          return null;
        }
        return { ...prev, puntos: [...prev.puntos, { x, y }] };
      });
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

  /** Carga un plano de fondo desde el equipo, sin subirlo a ningún servidor. */
  const cargarFondo = (ev) => {
    const fichero = ev.target.files?.[0];
    ev.target.value = '';
    if (!fichero) return;

    const nombre = fichero.name.toLowerCase();
    // Los ficheros de CAD no son imágenes: hay que decirlo claro en vez de
    // dejar que el usuario espere a que aparezca algo que no va a aparecer.
    if (nombre.endsWith('.dwg') || nombre.endsWith('.dxf')) {
      toast.error('Los ficheros de CAD (.dwg/.dxf) no se pueden calcar directamente. Expórtalo a PDF o imagen desde el programa de CAD y súbelo así.');
      return;
    }
    if (!fichero.type.startsWith('image/')) {
      toast.error('Sube una foto o imagen del plano (JPG, PNG…). Si es un PDF, exporta la página como imagen.');
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => {
        setFondo({ imagen: img, nombre: fichero.name });
        toast.success('Plano cargado: ajusta la escala y dibuja encima');
      };
      img.onerror = () => toast.error('No se pudo leer esa imagen');
      img.src = lector.result;
    };
    lector.onerror = () => toast.error('No se pudo leer el fichero');
    lector.readAsDataURL(fichero);
  };

  /** Guarda el trazado que se estaba dibujando (si tiene al menos dos puntos). */
  const terminarTrazado = (enCurso) => {
    const t = enCurso || trazando;
    if (!t) return;
    if (t.puntos.length < 2) {
      toast.error('Marca al menos dos puntos para trazar el recorrido');
      setTrazando(null);
      return;
    }
    setRecorridos(prev => [...prev, t]);
    setTrazando(null);
    toast.success(t.tipo === 'conducto' ? 'Conducto trazado' : 'Recorrido de tubería trazado');
  };

  const borrarRecorrido = (id) => setRecorridos(prev => prev.filter(r => r.id !== id));


  const actualizarEstancia = (id, campo, valor) => {
    setEstancias(prev => prev.map(e => (e.id === id ? { ...e, [campo]: valor } : e)));
  };

  const actualizarMaquina = (estanciaId, tipo) => {
    setMaquinas(prev => prev.map(m => (m.estancia_id === estanciaId ? { ...m, tipo } : m)));
  };

  const limpiar = () => {
    setPlantas([{ id: nuevoId(), nombre: 'Planta baja', cota: 0, estancias: [], maquinas: [] }]);
    setPlantaActiva(0);
    setExterior(null);
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
          // El recorrido dibujado a mano es lo que más se agradece que revise:
          // es donde el instalador duda y donde se va el dinero.
          ...(recorridosRevisados.length ? [
            'RECORRIDOS DE LA INSTALACIÓN YA TRAZADOS:',
            ...recorridosRevisados.map((r, i) => (
              r.esConducto
                ? `- Conducto ${i + 1} (${r.planta}): ${r.revision.metros} m, ${r.revision.codos} codos, caudal ${r.revision.caudal} m³/h, sección propuesta ${r.revision.lado_cm} cm.`
                : `- Tubería ${i + 1} (${r.planta}): ${r.revision.metros} m reales (${r.revision.horizontal} m de trazado y ${r.revision.desnivel} m de desnivel), ${r.revision.codos} codos, ${r.revision.metros_equivalentes} m equivalentes. El camino más corto serían ${r.revision.minimo} m.`
            )),
            `Tipo de instalación: ${LIMITES[tipoInstalacion]?.nombre}.`,
            '',
          ] : ['Aún no se ha trazado por dónde pasa la instalación.', '']),
          'Devuelve SOLO un JSON con esta forma:',
          '{',
          '  "maquinas_recomendadas": [{ "estancia": string, "marca": string, "modelo": string, "kw": numero, "seer": numero, "precio_estimado": numero }],',
          '  "recorrido_alternativo": [{ "cual": string, "propuesta": string, "por_que": string, "ahorro_estimado_m": numero }],',
          '  "materiales_extra": [{ "descripcion": string, "unidad": string, "cantidad": numero, "precio_ud": numero, "categoria": string }],',
          '  "avisos": [string],',
          '  "notas_tecnicas": string',
          '}',
          '',
          'En "recorrido_alternativo" propón otra forma de pasar la instalación si',
          'la ves mejor: por dónde llevarla, por qué (menos metros, menos codos,',
          'menos obra, mejor acceso para mantenimiento) y cuántos metros se',
          'ahorrarían. Si el trazado ya está bien, dilo y deja la lista vacía.',
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
            recorrido_alternativo: { type: 'array' },
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
        <div className="lg:col-span-2 space-y-2">
          {/* Plantas del edificio */}
          <Card>
            <CardContent className="p-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />Plantas
                </span>
                {plantas.map((pl, i) => (
                  <div key={pl.id} className="flex items-center">
                    <button
                      onClick={() => { setPlantaActiva(i); setSeleccion(null); }}
                      className={`px-2.5 py-1 text-xs rounded-l-lg border transition-colors ${
                        i === plantaActiva
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                      title={`Cota ${pl.cota} m · ${pl.estancias.length} estancias`}
                    >
                      {pl.nombre}
                      <span className={i === plantaActiva ? 'text-blue-100' : 'text-slate-400'}>
                        {' '}· {pl.estancias.length}
                      </span>
                    </button>
                    <button
                      onClick={() => borrarPlanta(i)}
                      title="Quitar esta planta"
                      className={`px-1.5 py-1 rounded-r-lg border border-l-0 ${
                        i === plantaActiva
                          ? 'bg-blue-600 border-blue-600 text-blue-100 hover:text-white'
                          : 'bg-white border-slate-300 text-slate-300 hover:text-red-600'
                      }`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={anadirPlanta}
                  className="px-2.5 py-1 text-xs rounded-lg border border-dashed border-slate-300 text-slate-500 hover:bg-slate-50 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />Añadir planta
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                <label className="text-[11px] text-slate-500">Nombre</label>
                <Input className="h-7 text-xs w-40" value={planta?.nombre || ''}
                  onChange={e => actualizarPlanta({ nombre: e.target.value })} />
                <label className="text-[11px] text-slate-500">Cota (m)</label>
                <Input type="number" step="0.1" className="h-7 text-xs w-20"
                  value={planta?.cota ?? 0}
                  onChange={e => actualizarPlanta({ cota: Number(e.target.value) || 0 })} />
                <span className="text-[10px] text-slate-400">
                  altura del suelo de esta planta; alarga la tubería hasta la exterior
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ver en planta o en 3D */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg overflow-hidden border border-slate-300">
              <button onClick={() => setVista('plano')}
                className={`px-3 py-1.5 text-xs font-medium ${vista === 'plano' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                Planta
              </button>
              <button onClick={() => setVista('3d')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${vista === '3d' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>
                <Box className="w-3.5 h-3.5" />Vista 3D
              </button>
            </div>

            {trazando && (
              <>
                <span className="text-xs text-slate-500">
                  {trazando.puntos.length} punto{trazando.puntos.length === 1 ? '' : 's'} ·
                  sigue marcando por dónde pasa
                </span>
                <Button size="sm" onClick={() => terminarTrazado()} className="gap-1 h-7">
                  <Check className="w-3.5 h-3.5" />Terminar trazado
                </Button>
                <Button size="sm" variant="outline" onClick={() => setTrazando(null)} className="h-7">
                  Cancelar
                </Button>
              </>
            )}
          </div>

          {/* Plano de fondo para calcar */}
          <Card className={vista === '3d' ? 'hidden' : ''}>
            <CardContent className="p-2 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  {fondo ? 'Cambiar plano' : 'Subir plano para calcar'}
                  <input type="file" accept="image/*" className="hidden" onChange={cargarFondo} />
                </label>

                {fondo && (
                  <>
                    <span className="text-[11px] text-slate-500 max-w-[160px] truncate">{fondo.nombre}</span>
                    <label className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <input type="range" min="0.1" max="1" step="0.05" className="w-20"
                        value={fondoOpacidad}
                        onChange={e => setFondoOpacidad(Number(e.target.value))} />
                    </label>
                    <label className="text-[11px] text-slate-500 flex items-center gap-1">
                      Escala
                      <input type="range" min="0.05" max="3" step="0.05" className="w-24"
                        value={fondoEscala}
                        onChange={e => setFondoEscala(Number(e.target.value))} />
                      <span className="w-8">{fondoEscala.toFixed(2)}</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setFondoDesplaza(d => ({ ...d, x: d.x - 20 }))}
                        className="px-1.5 py-0.5 text-xs border rounded">←</button>
                      <button onClick={() => setFondoDesplaza(d => ({ ...d, x: d.x + 20 }))}
                        className="px-1.5 py-0.5 text-xs border rounded">→</button>
                      <button onClick={() => setFondoDesplaza(d => ({ ...d, y: d.y - 20 }))}
                        className="px-1.5 py-0.5 text-xs border rounded">↑</button>
                      <button onClick={() => setFondoDesplaza(d => ({ ...d, y: d.y + 20 }))}
                        className="px-1.5 py-0.5 text-xs border rounded">↓</button>
                    </div>
                    <button onClick={() => { setFondo(null); setFondoEscala(1); setFondoDesplaza({ x: 0, y: 0 }); }}
                      className="text-[11px] text-red-600 hover:underline">quitar</button>
                  </>
                )}
              </div>

              {fondo && (
                <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded p-2">
                  Ajusta la <strong>escala</strong> hasta que una medida conocida del plano
                  (una pared, una puerta de 0,8 m) coincida con los cuadros de la rejilla,
                  que son de 1 metro. Después dibuja las estancias encima y ya tendrás el
                  plano pasado a ordenador, con sus medidas de verdad.
                </p>
              )}

              <div className="overflow-x-auto">
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
              </div>
            </CardContent>
          </Card>

          {vista === '3d' && (
            <Card>
              <CardContent className="p-2">
                <Vista3DPlano
                  plantas={plantas}
                  exterior={exterior}
                  alturaDefecto={alturaDefecto}
                  recorridos={recorridos.filter(r => r.tipo !== 'conducto')}
                />
              </CardContent>
            </Card>
          )}
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
                {maquinaSel && (() => {
                  const opciones = genericasDeTipo(maquinaSel.tipo);
                  const d = resumen.detalle.find(x => x.estancia.id === estanciaSel.id);
                  const sugerida = d ? sugerirMaquina(d.kw, maquinaSel.tipo) : null;
                  const elegida = maquinasElegidas[estanciaSel.id];
                  if (!opciones.length) return null;
                  return (
                    <div>
                      <label className="text-xs font-medium text-slate-600">Máquina</label>
                      <Select
                        value={elegida?.id || sugerida?.id || ''}
                        onValueChange={id => {
                          const m = opciones.find(o => o.id === id);
                          setMaquinasElegidas(prev => ({ ...prev, [estanciaSel.id]: m || null }));
                        }}
                      >
                        <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="Elegir…" /></SelectTrigger>
                        <SelectContent>
                          {opciones.map(o => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.kw} kW · líq {o.liquido} / gas {o.gas} · SEER {o.seer}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sugerida && !elegida && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          Propuesta según la carga: {sugerida.kw} kW.
                        </p>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const d = resumen.detalle.find(x => x.estancia.id === estanciaSel.id);
                  if (!d) return null;
                  const factorUso = FACTOR_USO[estanciaSel.uso] ?? FACTOR_USO.vivienda;
                  const ficha = d.maquina
                    ? fichaEstancia(d, factorUso, d.metros_tuberia,
                        maquinasElegidas[estanciaSel.id] || sugerirMaquina(d.kw, d.maquina.tipo))
                    : null;
                  const dia = diametrosDeKw(d.kw_comercial);
                  return (
                    <div className="text-xs bg-slate-50 border rounded p-2 space-y-0.5">
                      <p><strong>{d.area} m²</strong> · {d.volumen} m³</p>
                      <p>{d.frigorias} frig/h ({d.kw} kW)</p>
                      {ficha ? (
                        <>
                          <p className="font-medium">Máquina: {ficha.maquina} ({ficha.maquina_kw} kW)</p>
                          <p className={ficha.suficiente ? 'text-green-700' : 'text-red-600 font-medium'}>
                            Cubre {ficha.superficie_cubierta} m²
                            {ficha.suficiente
                              ? ` (sobran ${ficha.holgura} m²)`
                              : ` — SE QUEDA CORTA para ${d.area} m²`}
                          </p>
                          <p>Tubería: líquido {ficha.tuberia_liquido} · gas {ficha.tuberia_gas}</p>
                          {ficha.metros_tuberia > 0 && (
                            <>
                              <p>{ficha.metros_tuberia} m de tubería</p>
                              <p>
                                Gas extra: <strong>{ficha.gas_extra_g} g</strong>
                                <span className="text-slate-400"> ({ficha.gramos_por_metro} g/m
                                  desde {ficha.precarga_m} m)</span>
                              </p>
                            </>
                          )}
                          {ficha.seer && <p>SEER {ficha.seer}</p>}
                        </>
                      ) : (
                        <>
                          <p className="font-medium">Máquina propuesta: {d.kw_comercial} kW</p>
                          <p className="text-slate-400">Tubería: líquido {dia.liquido} · gas {dia.gas}</p>
                          <p className="text-amber-700">Pon un equipo en la estancia para el detalle.</p>
                        </>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Recorridos trazados: metros reales, gas y avisos */}
          {recorridosRevisados.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Spline className="w-4 h-4" />Instalación trazada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <label className="text-xs font-medium text-slate-600">Tipo de instalación</label>
                  <Select value={tipoInstalacion} onValueChange={setTipoInstalacion}>
                    <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LIMITES).map(([id, l]) => (
                        <SelectItem key={id} value={id}>{l.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Marca los límites con los que se avisa (longitud, desnivel y gas).
                  </p>
                </div>

                {recorridosRevisados.map((r, i) => (
                  <div key={r.id} className="border rounded-lg p-2 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-800 text-xs">
                        {r.esConducto ? '🟠 Conducto' : '🟢 Tubería'} {i + 1}
                        <span className="font-normal text-slate-400"> · {r.planta}</span>
                      </p>
                      <button onClick={() => borrarRecorrido(r.id)}
                        className="text-slate-300 hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {r.esConducto ? (
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p>{r.revision.metros} m · {r.revision.codos} codos</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span>Caudal:</span>
                          <Input type="number" min="0" step="50" className="h-6 w-24 text-xs"
                            value={r.caudal || ''}
                            placeholder="m³/h"
                            onChange={e => setRecorridos(prev => prev.map(x =>
                              x.id === r.id ? { ...x, caudal: Number(e.target.value) || 0 } : x))} />
                          <span>m³/h</span>
                          {caudalSugerido > 0 && (
                            <button
                              onClick={() => setRecorridos(prev => prev.map(x =>
                                x.id === r.id ? { ...x, caudal: caudalSugerido } : x))}
                              className="text-[10px] text-blue-600 hover:underline"
                              title="Calculado con la potencia de las máquinas de conductos"
                            >
                              usar {caudalSugerido}
                            </button>
                          )}
                        </div>
                        {r.revision.lado_cm > 0 && (
                          <p className="font-medium text-amber-700">
                            Sección: {r.revision.lado_cm} cm de lado (o ⌀ {r.revision.diametro_cm} cm)
                            a {r.revision.velocidad} m/s
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p>
                          {r.revision.metros} m reales ({r.revision.horizontal} m de trazado
                          + {r.revision.desnivel} m de bajada) · {r.revision.codos} codos
                        </p>
                        <p>{r.revision.metros_equivalentes} m equivalentes con los codos</p>
                        {r.revision.gas_adicional_g > 0 && (
                          <p className="font-medium text-slate-700">
                            Gas a añadir: {r.revision.gas_adicional_g} g
                          </p>
                        )}
                      </div>
                    )}

                    {r.revision.avisos.map((a, j) => (
                      <p key={j} className={`text-[11px] rounded p-1.5 border ${
                        a.nivel === 'error' ? 'bg-red-50 border-red-200 text-red-700'
                          : a.nivel === 'aviso' ? 'bg-amber-50 border-amber-200 text-amber-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}>
                        {a.texto}
                      </p>
                    ))}

                    {r.revision.avisos.length === 0 && (
                      <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded p-1.5">
                        Recorrido correcto, sin pegas.
                      </p>
                    )}
                  </div>
                ))}

                {metrosTrazados > 0 && (
                  <p className="text-xs bg-slate-50 border rounded p-2">
                    <strong>{metrosTrazados.toFixed(1)} m</strong> de tubería trazada a mano.
                    El presupuesto usa estos metros en vez de la estimación.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Precios: los de referencia son un punto de partida, no un dogma */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><Euro className="w-4 h-4" />Precios</span>
                <button onClick={() => setVerPrecios(v => !v)}
                  className="text-xs font-normal text-blue-600 hover:underline">
                  {verPrecios ? 'ocultar' : 'cambiar'}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <label className="text-xs font-medium text-slate-600">Mano de obra (€/hora)</label>
                <Input type="number" min="0" step="1" className="mt-1 h-8"
                  value={precios.mano_obra_hora}
                  onChange={e => cambiarPrecio('mano_obra_hora', e.target.value)} />
                <p className="text-[10px] text-slate-400 mt-1">
                  Pon aquí lo que cobras tú. Se guarda en este equipo y se aplica a
                  todos los presupuestos.
                </p>
              </div>

              {verPrecios && (
                <div className="space-y-2 pt-2 border-t">
                  {[
                    ['mural', 'Split mural (€/ud)'],
                    ['cassette', 'Cassette (€/ud)'],
                    ['conductos', 'Conductos (€/ud)'],
                    ['suelo', 'Consola de suelo (€/ud)'],
                    ['exterior_kw', 'Unidad exterior (€/kW)'],
                    ['evaporador_camara', 'Evaporador de cámara (€/ud)'],
                    ['unidad_condensadora_kw', 'Condensadora (€/kW)'],
                    ['vitrina', 'Vitrina (€/ud)'],
                    ['arcon', 'Arcón (€/ud)'],
                    ['camara_puerta', 'Puerta de cámara (€/ud)'],
                    ['tuberia_m', 'Tubería frigorífica (€/m)'],
                    ['desague_m', 'Desagüe (€/m)'],
                    ['cable_m', 'Cable (€/m)'],
                    ['soporte', 'Soportes (€/ud)'],
                    ['vacio_carga', 'Vacío y carga (€/ud)'],
                  ].map(([clave, etiqueta]) => (
                    <div key={clave} className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-600 flex-1">{etiqueta}</label>
                      <Input type="number" min="0" step="0.5" className="h-7 w-24 text-right"
                        value={precios[clave]}
                        onChange={e => cambiarPrecio(clave, e.target.value)} />
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      try { localStorage.removeItem(CLAVE_PRECIOS); } catch { /* nada */ }
                      setPrecios({ ...PRECIOS_REFERENCIA });
                    }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Volver a los precios de referencia
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

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
            {(sugerenciaIA.recorrido_alternativo || []).length > 0 && (
              <div className="bg-teal-50 border border-teal-200 rounded p-2">
                <p className="font-medium text-teal-800 mb-1 flex items-center gap-1">
                  <Spline className="w-3.5 h-3.5" />Otra forma de pasar la instalación
                </p>
                <ul className="space-y-1.5 text-teal-900">
                  {sugerenciaIA.recorrido_alternativo.map((p, i) => (
                    <li key={i}>
                      <strong>{p.cual}:</strong> {p.propuesta}
                      {p.por_que && <span className="text-teal-700"> — {p.por_que}</span>}
                      {p.ahorro_estimado_m > 0 && (
                        <span className="font-medium"> (ahorra unos {p.ahorro_estimado_m} m)</span>
                      )}
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

      {/* Resumen técnico: todo lo que hay que saber, estancia por estancia */}
      {fichas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Resumen técnico de la instalación</span>
              <button onClick={() => setVerResumen(v => !v)}
                className="text-xs font-normal text-blue-600 hover:underline">
                {verResumen ? 'ocultar' : 'ver'}
              </button>
            </CardTitle>
          </CardHeader>
          {verResumen && (
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left uppercase text-slate-500 bg-slate-50">
                    <th className="p-2">Estancia</th>
                    <th className="p-2 text-right">Superficie</th>
                    <th className="p-2 text-right">Carga</th>
                    <th className="p-2">Máquina</th>
                    <th className="p-2 text-right">Cubre</th>
                    <th className="p-2">Tubería</th>
                    <th className="p-2 text-right">Metros</th>
                    <th className="p-2 text-right">Gas extra</th>
                  </tr>
                </thead>
                <tbody>
                  {fichas.map((f, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2 font-medium">{f.estancia}</td>
                      <td className="p-2 text-right">{f.superficie} m²</td>
                      <td className="p-2 text-right">{f.carga_frigorias} frig/h</td>
                      <td className="p-2">{f.maquina}</td>
                      <td className={`p-2 text-right ${f.suficiente ? 'text-green-700' : 'text-red-600 font-semibold'}`}>
                        {f.superficie_cubierta} m²
                      </td>
                      <td className="p-2">{f.tuberia_liquido} / {f.tuberia_gas}</td>
                      <td className="p-2 text-right">{f.metros_tuberia} m</td>
                      <td className="p-2 text-right">
                        {f.gas_extra_g > 0 ? `${f.gas_extra_g} g` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-slate-50 font-semibold">
                    <td className="p-2" colSpan={6}>Gas adicional total</td>
                    <td className="p-2 text-right">
                      {fichas.reduce((s, f) => s + f.metros_tuberia, 0).toFixed(1)} m
                    </td>
                    <td className="p-2 text-right">
                      {fichas.reduce((s, f) => s + f.gas_extra_g, 0)} g
                    </td>
                  </tr>
                </tfoot>
              </table>
              {fichas.some(f => !f.suficiente) && (
                <p className="text-xs text-red-700 bg-red-50 border-t border-red-200 p-2">
                  Hay máquinas que no cubren la superficie de su estancia. Sube un
                  escalón de potencia o repasa el uso y el aislamiento.
                </p>
              )}
              <p className="text-[10px] text-slate-400 p-2 border-t">
                Los diámetros y los gramos por metro son los estándar del sector.
                Si la ficha de tu máquina dice otra cosa, manda la ficha.
              </p>
            </CardContent>
          )}
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
