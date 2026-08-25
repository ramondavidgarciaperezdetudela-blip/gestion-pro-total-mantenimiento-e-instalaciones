import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import BuscadorCliente from '@/components/BuscadorCliente';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Pencil, Trash2, Wind, Sparkles, FileText, Loader2,
  RotateCcw, AlertCircle, Ruler, Wrench, Euro, Layers, Plus, X,
  Spline, Box, Map, Check, Image as ImageIcon, Eye,
  Undo2, Redo2, PenLine, Hand, Maximize2, Printer, Crosshair, Shapes,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  TIPOS_MAQUINA, FACTOR_USO, FACTOR_ORIENTACION, FACTOR_AISLAMIENTO,
  EQUIPOS_SUELTOS, PRECIOS_REFERENCIA, USOS_CAMARA, SOPORTES_SOPORTE,
  resumenPlano, listaMateriales, totalMateriales, planoComoTexto,
} from '@/lib/planoCalculos';
import {
  dibujarEquipo, nombreEquipo, colorEquipo, radioAproximado, dibujarSoporte, altoSoporte,
} from '@/lib/planoSimbolos';
import BotonHerramienta from '@/components/BotonHerramienta';
import PaletaEquipos, { SubmenuVariantes } from '@/components/PaletaEquipos';
import LeyendaPlano, { entradasLeyenda } from '@/components/LeyendaPlano';
import { varianteDefecto, cortoVariante } from '@/lib/planoVariantes';
import {
  DIRECCIONES, puntoDesde, longitudTramo, areaPoligono, perimetroPoligono,
  estanciaDesdeForma, moverPoligono, dentroDelPoligono,
} from '@/lib/planoFormas';
import { useHistorial } from '@/hooks/useHistorial';
import { informeHtml } from '@/lib/informePlano';
import { printDocument } from '@/lib/printHelper';
import Vista3DPlano from '@/components/Vista3DPlano';
import {
  evaluarRecorrido, evaluarConducto, caudalDeKw, LIMITES,
} from '@/lib/planoRecorrido';
import {
  genericasDeTipo, sugerirMaquina, fichaEstancia, diametrosDeKw,
} from '@/lib/catalogoMaquinas';
import {
  REVESTIMIENTO_PARED, TIPO_SUELO, SUELO_DEBAJO, TIPO_TECHO, TECHO_ENCIMA,
  VENTANA_MARCO, VENTANA_VIDRIO, PROTECCION_SOLAR, cargaVentana,
  SUELO_CAMARA, PANEL_CAMARA, panelRecomendado,
} from '@/lib/cerramientos';

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

const METRO_PX_BASE = 40;   // píxeles por metro al zoom normal

const HERRAMIENTAS = [
  { id: 'estancia', nombre: 'Dibujar estancia', icono: Pencil },
  // Para lo que no es un rectángulo: se va poniendo tramo a tramo con la
  // medida escrita, que es como se levanta un plano de verdad en obra.
  { id: 'forma', nombre: 'Forma a medida', icono: Shapes },
  // Estas dos enseñan el símbolo de la máquina de verdad, no un icono
  // cualquiera: así se ve lo que se va a dibujar sin leer.
  { id: 'maquina', nombre: 'Poner equipo', icono: Wind, equipoDinamico: true, submenu: true },
  { id: 'exterior', nombre: 'Exterior / condensadora', icono: Wrench, equipo: 'exterior', submenu: true },
  { id: 'recorrido', nombre: 'Trazar tubería', icono: Spline },
  { id: 'conducto', nombre: 'Trazar conducto', icono: Map },
  { id: 'mover', nombre: 'Mover / mover el papel', icono: Hand },
  { id: 'libre', nombre: 'Dibujo a mano', icono: PenLine },
  { id: 'cota', nombre: 'Acotar', icono: Ruler },
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
  const contenedorRef = useRef(null);

  // Pantalla completa de dibujo: el lienzo ocupa todo el dispositivo y las
  // herramientas van dentro, que es como se dibuja de verdad. En un móvil, un
  // lienzo metido en una columna al lado de los paneles no sirve para nada.
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [zoomPlano, setZoomPlano] = useState(1);
  // Tamaño del lienzo en píxeles: se mide del contenedor de verdad.
  const [lienzo, setLienzo] = useState({ w: 960, h: 720 });
  // Desplazamiento del papel, en metros. Sirve para tener todo el área de
  // dibujo que haga falta: la pantalla es una ventana que se mueve sobre él.
  const [origen, setOrigen] = useState({ x: 0, y: 0 });
  const [arrastrandoLienzo, setArrastrandoLienzo] = useState(null);
  // En pantallas estrechas los botones van solo con icono: con el nombre
  // puesto, la barra se comía media pantalla del móvil.
  const [compacto, setCompacto] = useState(false);

  const metroPx = METRO_PX_BASE * zoomPlano;
  const ANCHO_M = lienzo.w / metroPx;
  const ALTO_M = lienzo.h / metroPx;

  const [herramienta, setHerramienta] = useState('estancia');
  // Qué equipo se coloca al pulsar con la herramienta "Poner equipo".
  const [equipoElegido, setEquipoElegido] = useState('mural');
  // Y dentro del equipo, su versión: cassette de 4 o de 2 vías, hacia dónde
  // abre la puerta de la cámara... Se guarda con cada máquina que se coloca.
  const [varianteElegida, setVarianteElegida] = useState(() => varianteDefecto('mural'));

  /** Al cambiar de equipo, su versión vuelve a la primera de su submenú. */
  const elegirEquipo = (tipo) => {
    setEquipoElegido(tipo);
    setVarianteElegida(varianteDefecto(tipo));
  };

  // Plantas del edificio. Un chalet o un local de dos alturas no se puede
  // dibujar en una sola hoja: cada planta lleva sus estancias y sus equipos,
  // y el presupuesto suma todas. La unidad exterior es UNA para el edificio.
  const [plantas, setPlantas] = useState([
    { id: nuevoId(), nombre: 'Planta baja', cota: 0, altura: 2.5, estancias: [], maquinas: [] },
  ]);
  const [plantaActiva, setPlantaActiva] = useState(0);
  const [exterior, setExterior] = useState(null);

  // Deshacer / rehacer
  const historial = useHistorial();

  /** Todo lo que se puede deshacer, en un solo objeto. */
  const capturarEstado = () => ({
    plantas, exterior, recorridos, trazosLibres, cotas, formas,
  });

  const aplicarEstado = (e) => {
    if (!e) return;
    setPlantas(e.plantas);
    setExterior(e.exterior);
    setRecorridos(e.recorridos || []);
    setTrazosLibres(e.trazosLibres || []);
    setCotas(e.cotas || []);
    setFormas(e.formas || []);
    setSeleccion(null);
  };

  /** Se llama ANTES de cada cambio, para poder volver atrás. */
  const antesDeCambiar = () => historial.guardar(capturarEstado());

  const deshacer = () => {
    const anterior = historial.deshacer(capturarEstado());
    if (anterior) aplicarEstado(anterior);
    else toast('No hay nada que deshacer');
  };

  const rehacer = () => {
    const siguiente = historial.rehacer(capturarEstado());
    if (siguiente) aplicarEstado(siguiente);
  };

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
      // La cota de la nueva planta sale de sumar las alturas de las de abajo,
      // que es como está el edificio de verdad.
      const cota = prev.reduce((s2, pl) => s2 + (Number(pl.altura) || 2.5), 0);
      return [...prev, {
        id: nuevoId(),
        nombre: n === 0 ? 'Planta baja' : `Planta ${n}`,
        cota: Number(cota.toFixed(2)),
        altura: Number(alturaDefecto) || 2.5,
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
  const [soporteExterior, setSoporteExterior] = useState('pared');
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

  // Trazos a mano alzada y cotas puestas a mano, por planta.
  const [trazosLibres, setTrazosLibres] = useState([]);  // [{id, planta, puntos, color}]
  const [cotas, setCotas] = useState([]);                // [{id, planta, a, b, texto}]
  const [dibujandoLibre, setDibujandoLibre] = useState(null);
  const [cotaEnCurso, setCotaEnCurso] = useState(null);
  const [colorLapiz, setColorLapiz] = useState('#1d4ed8');
  const [grosorLapiz, setGrosorLapiz] = useState(2.5);
  const [tipoLinea, setTipoLinea] = useState('solida');
  // Estancia que se está moviendo con la mano.
  // Formas levantadas tramo a tramo con la medida puesta a mano.
  const [formas, setFormas] = useState([]);        // [{id, planta, puntos, cerrada}]
  const [formaEnCurso, setFormaEnCurso] = useState(null);
  const [tramoLargo, setTramoLargo] = useState(3);
  const [tramoDir, setTramoDir] = useState('derecha');

  const [moviendo, setMoviendo] = useState(null);
  // Crear estancias escribiendo las medidas, sin tener que acertar con el ratón.
  const [medidas, setMedidas] = useState({ nombre: '', ancho: 4, largo: 3, alto: 2.5 });

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
  const [empresa, setEmpresa] = useState(null);   // para la cabecera del informe
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
      soporte_exterior: soporteExterior,
    };
  }, [plantas, exterior, alturaDefecto, soporteExterior]);
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

  // El lienzo se adapta al hueco que tiene de verdad, en pantalla completa o
  // dentro de la página, y se vuelve a medir si se gira el móvil.
  useEffect(() => {
    const medir = () => {
      setCompacto(window.innerWidth < 780);
      const caja = contenedorRef.current?.getBoundingClientRect();
      if (!caja || caja.width < 50) return;
      // El alto nunca puede pasar de la ventana, o el lienzo se sale y hay
      // que hacer scroll para ver lo que se está dibujando.
      const altoMax = window.innerHeight - caja.top - 12;
      setLienzo({
        w: Math.round(caja.width),
        h: Math.round(pantallaCompleta
          ? Math.max(280, Math.min(caja.height || altoMax, altoMax))
          : 720),
      });
    };
    medir();
    window.addEventListener('resize', medir);
    const t = setTimeout(medir, 250);   // tras pintar los paneles
    return () => { window.removeEventListener('resize', medir); clearTimeout(t); };
  }, [pantallaCompleta, vista]);

  // Ctrl+Z y Ctrl+Y, que es lo que todo el mundo pulsa sin pensar.
  useEffect(() => {
    const alPulsar = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const enCampo = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
      if (enCampo) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); deshacer(); }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); rehacer(); }
    };
    const alEscape = (e) => { if (e.key === 'Escape' && pantallaCompleta) setPantallaCompleta(false); };
    window.addEventListener('keydown', alEscape);
    window.addEventListener('keydown', alPulsar);
    return () => {
      window.removeEventListener('keydown', alPulsar);
      window.removeEventListener('keydown', alEscape);
    };
  });

  useEffect(() => {
    base44.entities.Contact.list('name', 500)
      .then(setContactos)
      .catch(() => setContactos([])); // sin clientes se puede presupuestar igual
    base44.entities.CompanySettings.list()
      .then(d => setEmpresa(d?.[0] || null))
      .catch(() => setEmpresa(null));  // el informe sale igual, sin membrete
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

    // Se mueve el papel bajo la ventana: a partir de aquí se dibuja en
    // coordenadas del plano y el desplazamiento lo aplica el propio lienzo.
    ctx.save();
    ctx.translate(-origen.x * metroPx, -origen.y * metroPx);

    // El plano de fondo va lo primero, para dibujar encima de él.
    if (fondo?.imagen) {
      ctx.save();
      ctx.globalAlpha = fondoOpacidad;
      const ancho = fondo.imagen.width * fondoEscala;
      const alto = fondo.imagen.height * fondoEscala;
      ctx.drawImage(fondo.imagen, fondoDesplaza.x, fondoDesplaza.y, ancho, alto);
      ctx.restore();
    }

    // Cuadrícula de 1 m, con línea marcada cada 5 m. Se dibuja solo la parte
    // que se ve, esté donde esté el papel: así el área de dibujo no se acaba.
    const m0x = Math.floor(origen.x) - 1, m1x = Math.ceil(origen.x + ANCHO_M) + 1;
    const m0y = Math.floor(origen.y) - 1, m1y = Math.ceil(origen.y + ALTO_M) + 1;
    for (let m = m0x; m <= m1x; m++) {
      ctx.strokeStyle = m % 5 === 0 ? '#cbd5e1' : '#eef2f7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(m * metroPx, m0y * metroPx);
      ctx.lineTo(m * metroPx, m1y * metroPx);
      ctx.stroke();
    }
    for (let m = m0y; m <= m1y; m++) {
      ctx.strokeStyle = m % 5 === 0 ? '#cbd5e1' : '#eef2f7';
      ctx.beginPath();
      ctx.moveTo(m0x * metroPx, m * metroPx);
      ctx.lineTo(m1x * metroPx, m * metroPx);
      ctx.stroke();
    }

    // Estancias
    for (const e of estancias) {
      const x = e.x * metroPx, y = e.y * metroPx;
      const w = e.ancho * metroPx, h = e.alto * metroPx;
      const activa = e.id === seleccion;

      ctx.fillStyle = activa ? 'rgba(37,99,235,0.12)' : 'rgba(100,116,139,0.08)';
      ctx.strokeStyle = activa ? '#2563eb' : '#475569';
      ctx.lineWidth = activa ? 3 : 2;

      if (e.poligono?.length >= 3) {
        // Estancia levantada con la forma a medida: se dibuja su contorno
        // real, no el rectángulo, y se acota tramo a tramo.
        ctx.beginPath();
        e.poligono.forEach((pt, i) => {
          const px = pt.x * metroPx, py = pt.y * metroPx;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        acotarTramos(ctx, e.poligono, metroPx, true);
      } else {
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      }

      // En las estancias acotadas el nombre baja: arriba está la cota de la
      // pared y si no se montan el uno encima del otro y no se lee ninguno.
      const yTexto = e.poligono?.length >= 3 ? y + 32 : y + 16;
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(e.nombre || 'Estancia', x + 6, yTexto);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, sans-serif';
      // Si la estancia viene de una forma acotada manda su superficie medida:
      // el ancho×alto de la envolvente daría metros que no existen. Ahí se
      // pone solo el dato, sin más texto: las medidas ya están acotadas pared
      // por pared y una línea larga se cruza con las cotas y no se lee nada.
      ctx.fillText(e.area_manual > 0
        ? `${e.area_manual} m²`
        : `${e.ancho}×${e.alto} m · ${(e.ancho * e.alto).toFixed(1)} m²`, x + 6, yTexto + 14);
    }

    // Formas a medida todavía sueltas (aún no convertidas en estancia).
    for (const fm of [...formas.filter(f2 => f2.planta === planta?.nombre),
      ...(formaEnCurso && formaEnCurso.planta === planta?.nombre ? [formaEnCurso] : [])]) {
      const enCurso = fm === formaEnCurso;
      ctx.strokeStyle = enCurso ? '#2563eb' : (fm.color || '#0f172a');
      ctx.lineWidth = enCurso ? 2.5 : 2;
      ctx.setLineDash(enCurso ? [7, 4] : []);
      ctx.beginPath();
      fm.puntos.forEach((pt, i) => {
        const px = pt.x * metroPx, py = pt.y * metroPx;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      if (fm.cerrada) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);

      // Los vértices, para poder verlos y borrarlos.
      ctx.fillStyle = enCurso ? '#2563eb' : '#334155';
      for (const pt of fm.puntos) {
        ctx.beginPath();
        ctx.arc(pt.x * metroPx, pt.y * metroPx, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      acotarTramos(ctx, fm.puntos, metroPx, fm.cerrada);

      if (fm.cerrada) {
        const cx = (fm.puntos.reduce((a2, pt) => a2 + pt.x, 0) / fm.puntos.length) * metroPx;
        const cy = (fm.puntos.reduce((a2, pt) => a2 + pt.y, 0) / fm.puntos.length) * metroPx;
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${areaPoligono(fm.puntos)} m²`, cx, cy);
        ctx.textAlign = 'left';
      }
    }

    // Equipos colocados
    for (const mq of maquinas) {
      const x = mq.x * metroPx, y = mq.y * metroPx;

      // La tubería va primero, para que el símbolo quede encima y se lea.
      // Los equipos sueltos (vitrina, arcón, puerta) no llevan este trazado.
      if (exterior && !EQUIPOS_SUELTOS.includes(mq.tipo)) {
        ctx.strokeStyle = 'rgba(15,118,110,0.55)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(exterior.x * metroPx, y);
        ctx.lineTo(exterior.x * metroPx, exterior.y * metroPx);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      dibujarEquipo(ctx, mq.tipo, x, y, 1,
        mq.estancia_id && mq.estancia_id === seleccion, mq.variante);

      ctx.fillStyle = '#475569';
      ctx.font = '9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(nombreEquipo(mq.tipo), x, y + 26);
      // Debajo, la versión concreta: hacia dónde abre la puerta, cuántas vías
      // tiene el cassette... Es lo que se pregunta al mirar el plano.
      const corto = cortoVariante(mq.tipo, mq.variante);
      if (corto) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8.5px system-ui, sans-serif';
        ctx.fillText(corto, x, y + 36);
      }
      ctx.textAlign = 'left';
    }

    // Unidad exterior / condensadora
    if (exterior) {
      const x = exterior.x * metroPx, y = exterior.y * metroPx;
      const tipoExt = resumen.es_refrigeracion ? 'unidad_condensadora' : 'exterior';
      // El soporte se dibuja debajo, para que se vea cómo va montada.
      dibujarSoporte(ctx, soporteExterior, x, y, 1.1);
      dibujarEquipo(ctx, tipoExt, x, y, 1.1, false);
      ctx.fillStyle = colorEquipo(tipoExt);
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      // El rótulo va por DEBAJO del soporte: sobre una bancada o el techo de
      // la cámara el dibujo baja bastante y el texto se montaba encima.
      const bajo = y + altoSoporte(soporteExterior) * 15 * 1.1 + 12;
      ctx.fillText(resumen.es_refrigeracion ? 'CONDENSADORA' : 'EXTERIOR', x, bajo);
      const montaje = cortoVariante('exterior', soporteExterior);
      if (montaje) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8.5px system-ui, sans-serif';
        ctx.fillText(montaje, x, bajo + 10);
      }
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
        const px = pt.x * metroPx, py = pt.y * metroPx;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Puntos de paso, para ver dónde se hizo cada codo
      ctx.fillStyle = esConducto ? '#b45309' : '#0f766e';
      for (const pt of rec.puntos) {
        ctx.beginPath();
        ctx.arc(pt.x * metroPx, pt.y * metroPx, 3, 0, Math.PI * 2);
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
        const px = pt.x * metroPx, py = pt.y * metroPx;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#0f766e';
      for (const pt of trazando.puntos) {
        ctx.beginPath();
        ctx.arc(pt.x * metroPx, pt.y * metroPx, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── Dibujo a mano alzada de esta planta ──────────────────────────────
    const pintarTrazo = (t) => {
      if (!t?.puntos?.length) return;
      ctx.strokeStyle = t.color || '#1d4ed8';
      ctx.lineWidth = t.grosor || 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.setLineDash(
        t.linea === 'discontinua' ? [10, 6] : t.linea === 'punteada' ? [2, 5] : []
      );
      ctx.beginPath();
      t.puntos.forEach((pt, i) => {
        const px = pt.x * metroPx, py = pt.y * metroPx;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };
    for (const t of trazosLibres) {
      if (t.planta === planta?.nombre) pintarTrazo(t);
    }
    if (dibujandoLibre) pintarTrazo(dibujandoLibre);

    // ── Cotas puestas a mano ─────────────────────────────────────────────
    for (const co of cotas) {
      if (co.planta !== planta?.nombre) continue;
      const ax = co.a.x * metroPx, ay = co.a.y * metroPx;
      const bx = co.b.x * metroPx, by = co.b.y * metroPx;
      const metros = Math.hypot(co.b.x - co.a.x, co.b.y - co.a.y);

      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.stroke();

      // Marcas en los extremos, como en un plano de verdad
      for (const [px, py] of [[ax, ay], [bx, by]]) {
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#be123c';
        ctx.fill();
      }

      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      const texto = `${metros.toFixed(2)} m`;
      ctx.font = 'bold 11px system-ui, sans-serif';
      const ancho = ctx.measureText(texto).width + 8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(mx - ancho / 2, my - 16, ancho, 15);
      ctx.strokeStyle = '#fecdd3';
      ctx.strokeRect(mx - ancho / 2, my - 16, ancho, 15);
      ctx.fillStyle = '#be123c';
      ctx.textAlign = 'center';
      ctx.fillText(texto, mx, my - 5);
      ctx.textAlign = 'left';
    }

    // Cota a medio poner
    if (cotaEnCurso) {
      const ax = cotaEnCurso.a.x * metroPx, ay = cotaEnCurso.a.y * metroPx;
      ctx.fillStyle = '#be123c';
      ctx.beginPath();
      ctx.arc(ax, ay, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rectángulo que se está dibujando ahora mismo
    if (arrastre) {
      const x = Math.min(arrastre.x0, arrastre.x1) * metroPx;
      const y = Math.min(arrastre.y0, arrastre.y1) * metroPx;
      const w = Math.abs(arrastre.x1 - arrastre.x0) * metroPx;
      const h = Math.abs(arrastre.y1 - arrastre.y0) * metroPx;
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

    ctx.restore();   // fin del desplazamiento del papel

    // Referencia de dónde estamos, para no perderse al mover el lienzo.
    if (origen.x !== 0 || origen.y !== 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(6, H - 24, 132, 18);
      ctx.fillStyle = '#64748b';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(`origen: ${origen.x.toFixed(1)} , ${origen.y.toFixed(1)} m`, 10, H - 11);
    }
  }, [estancias, maquinas, exterior, seleccion, arrastre, resumen.es_refrigeracion,
      origen,
      recorridos, trazando, planta?.nombre, fondo, fondoOpacidad, fondoEscala, fondoDesplaza,
      trazosLibres, dibujandoLibre, cotas, cotaEnCurso, soporteExterior,
      formas, formaEnCurso,
      // Al cambiar de tamaño, el navegador BORRA el contenido del lienzo:
      // sin esto, al salir de pantalla completa el plano se quedaba en blanco.
      lienzo.w, lienzo.h, metroPx]);

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
    // Se suma el desplazamiento del papel: lo que se ve es una ventana que
    // se mueve, así que el punto real está más allá de la esquina.
    return {
      x: aRejilla(px / metroPx + origen.x),
      y: aRejilla(py / metroPx + origen.y),
    };
  };

  const estanciaEn = (x, y) =>
    // De atrás hacia delante: si se solapan, gana la dibujada encima.
    // Las que vienen de una forma acotada se comprueban contra su polígono:
    // en una L, el hueco de la esquina NO es parte de la estancia aunque
    // caiga dentro del rectángulo que la envuelve.
    [...estancias].reverse().find(e => (
      e.poligono?.length >= 3
        ? dentroDelPoligono(e.poligono, x, y)
        : x >= e.x && x <= e.x + e.ancho && y >= e.y && y <= e.y + e.alto
    )) || null;

  const onPointerDown = (ev) => {
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    const { x, y } = posicionEnMetros(ev);

    if (herramienta === 'estancia') {
      setArrastre({ x0: x, y0: y, x1: x, y1: y });
      return;
    }
    if (herramienta === 'forma') {
      // El primer toque marca por dónde arranca la forma; a partir de ahí
      // los tramos se ponen con la medida escrita, no arrastrando.
      if (!formaEnCurso) {
        setFormaEnCurso({
          id: nuevoId(), planta: planta?.nombre, puntos: [{ x, y }], cerrada: false,
          color: colorLapiz, grosor: grosorLapiz,
        });
      } else {
        // Volver a pulsar mueve el punto de arranque, por si se falló al dar.
        setFormaEnCurso(f => ({ ...f, puntos: [{ x, y }, ...f.puntos.slice(1)] }));
      }
      return;
    }
    if (herramienta === 'libre') {
      antesDeCambiar();
      setDibujandoLibre({
        id: nuevoId(), planta: planta?.nombre, color: colorLapiz,
        grosor: grosorLapiz, linea: tipoLinea, puntos: [{ x, y }],
      });
      return;
    }
    if (herramienta === 'cota') {
      if (!cotaEnCurso) {
        setCotaEnCurso({ a: { x, y } });
      } else {
        antesDeCambiar();
        setCotas(prev => [...prev, {
          id: nuevoId(), planta: planta?.nombre, a: cotaEnCurso.a, b: { x, y },
        }]);
        setCotaEnCurso(null);
      }
      return;
    }
    if (herramienta === 'mover') {
      const est = estanciaEn(x, y);
      setSeleccion(est?.id || null);
      if (est) {
        antesDeCambiar();
        // Se guarda de dónde se ha agarrado, para que no salte al pulsar.
        setMoviendo({ id: est.id, dx: x - est.x, dy: y - est.y });
      } else {
        // En zona vacía se arrastra el papel: así hay todo el área de dibujo
        // que haga falta sin tener que encoger nada.
        setArrastrandoLienzo({ x0: ev.clientX, y0: ev.clientY, origen: { ...origen } });
      }
      return;
    }
    if (herramienta === 'exterior') {
      antesDeCambiar();
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
        antesDeCambiar();
        setMaquinas(prev => [...prev, {
          id: nuevoId(), tipo: equipoElegido, variante: varianteElegida, x, y,
        }]);
        return;
      }
      const est = estanciaEn(x, y);
      if (!est) { toast.error('Pon el equipo dentro de una estancia dibujada'); return; }
      antesDeCambiar();
      setMaquinas(prev => [
        // Una unidad interior por estancia: si ya había, se sustituye.
        ...prev.filter(m => m.estancia_id !== est.id),
        {
          id: nuevoId(), estancia_id: est.id, tipo: equipoElegido,
          variante: varianteElegida, x, y,
        },
      ]);
      setSeleccion(est.id);
      return;
    }
    if (herramienta === 'borrar') {
      // Las formas acotadas se borran por cualquiera de sus vértices.
      const forma = [...formas].reverse().find(fm => fm.planta === planta?.nombre &&
        fm.puntos.some(pt => Math.abs(pt.x - x) < 0.4 && Math.abs(pt.y - y) < 0.4));
      if (forma) {
        antesDeCambiar();
        setFormas(prev => prev.filter(fm => fm.id !== forma.id));
        return;
      }
      // Luego lo dibujado a mano y las cotas, que suelen estar encima.
      const trazo = [...trazosLibres].reverse().find(t => t.planta === planta?.nombre &&
        t.puntos.some(pt => Math.abs(pt.x - x) < 0.4 && Math.abs(pt.y - y) < 0.4));
      if (trazo) {
        antesDeCambiar();
        setTrazosLibres(prev => prev.filter(t => t.id !== trazo.id));
        return;
      }
      const cota = [...cotas].reverse().find(cc => cc.planta === planta?.nombre &&
        [cc.a, cc.b].some(pt => Math.abs(pt.x - x) < 0.5 && Math.abs(pt.y - y) < 0.5));
      if (cota) {
        antesDeCambiar();
        setCotas(prev => prev.filter(cc => cc.id !== cota.id));
        return;
      }
      const maq = [...maquinas].reverse().find(m => {
        const r = radioAproximado(m.tipo);
        return Math.abs(m.x - x) <= r && Math.abs(m.y - y) <= r;
      });
      if (maq) { antesDeCambiar(); setMaquinas(prev => prev.filter(m => m.id !== maq.id)); return; }
      if (exterior && Math.abs(exterior.x - x) < 0.75 && Math.abs(exterior.y - y) < 0.75) {
        antesDeCambiar(); setExterior(null); return;
      }
      const est = estanciaEn(x, y);
      if (est) {
        antesDeCambiar();
        setEstancias(prev => prev.filter(e => e.id !== est.id));
        setMaquinas(prev => prev.filter(m => m.estancia_id !== est.id));
        if (seleccion === est.id) setSeleccion(null);
      }
      return;
    }
    setSeleccion(estanciaEn(x, y)?.id || null);
  };

  const onPointerMove = (ev) => {
    if (arrastrandoLienzo) {
      const canvas = canvasRef.current;
      const r = canvas.getBoundingClientRect();
      const escala = canvas.width / r.width;
      setOrigen({
        x: arrastrandoLienzo.origen.x - ((ev.clientX - arrastrandoLienzo.x0) * escala) / metroPx,
        y: arrastrandoLienzo.origen.y - ((ev.clientY - arrastrandoLienzo.y0) * escala) / metroPx,
      });
      return;
    }

    const { x, y } = posicionEnMetros(ev);

    if (moviendo) {
      setEstancias(prev => prev.map(e => {
        if (e.id !== moviendo.id) return e;
        const nx = Math.max(0, x - moviendo.dx);
        const ny = Math.max(0, y - moviendo.dy);
        // Si viene de una forma acotada, el contorno se lleva el mismo
        // desplazamiento: si no, la estancia se movería y su dibujo no.
        const poligono = e.poligono
          ? moverPoligono(e.poligono, nx - e.x, ny - e.y)
          : undefined;
        return { ...e, x: nx, y: ny, ...(poligono ? { poligono } : {}) };
      }));
      return;
    }
    if (dibujandoLibre) {
      // A mano alzada no se redondea a la rejilla: se sigue el trazo tal cual.
      setDibujandoLibre(d => (d ? { ...d, puntos: [...d.puntos, { x, y }] } : null));
      return;
    }
    if (!arrastre) return;
    setArrastre(a => (a ? { ...a, x1: x, y1: y } : null));
  };

  const onPointerUp = () => {
    if (arrastrandoLienzo) { setArrastrandoLienzo(null); return; }
    if (moviendo) { setMoviendo(null); return; }
    if (dibujandoLibre) {
      if (dibujandoLibre.puntos.length > 2) {
        setTrazosLibres(prev => [...prev, dibujandoLibre]);
      }
      setDibujandoLibre(null);
      return;
    }
    if (!arrastre) return;
    const ancho = Math.abs(arrastre.x1 - arrastre.x0);
    const alto = Math.abs(arrastre.y1 - arrastre.y0);
    setArrastre(null);
    // Un toque suelto no es una estancia: hace falta arrastrar de verdad.
    if (ancho < 1 || alto < 1) { toast.error('Arrastra para marcar la estancia (mínimo 1×1 m)'); return; }

    antesDeCambiar();
    const id = nuevoId();
    setEstancias(prev => [...prev, {
      id,
      nombre: `Estancia ${prev.length + 1}`,
      x: Math.min(arrastre.x0, arrastre.x1),
      y: Math.min(arrastre.y0, arrastre.y1),
      ancho, alto,
      altura: planta?.altura || alturaDefecto,
      uso: 'vivienda',
      orientacion: 'este',
      aislamiento: 'normal',
      // Cerramientos: lo más habitual, para no dejarlo en blanco.
      pared_revestimiento: 'pintura',
      suelo_tipo: 'gres',
      suelo_debajo: 'terreno',
      techo_tipo: 'directo',
      techo_encima: 'climatizado',
      ventanas: [],
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
  // ── Forma a medida: el plano levantado tramo a tramo ──────────────────────
  // Se marca el punto de arranque en el lienzo y a partir de ahí cada tramo
  // se añade escribiendo cuánto mide y hacia dónde va. Nada de estirar con
  // el dedo y esperar que salga: la medida es la que se pone.

  const anadirTramo = () => {
    const largo = Number(tramoLargo);
    if (!(largo > 0)) { toast.error('Pon cuántos metros mide el tramo'); return; }
    if (!formaEnCurso) { toast.error('Pulsa antes en el plano para marcar por dónde empieza'); return; }
    setFormaEnCurso(f => ({
      ...f,
      puntos: [...f.puntos, puntoDesde(f.puntos[f.puntos.length - 1], largo, tramoDir)],
    }));
  };

  const quitarUltimoTramo = () => {
    setFormaEnCurso(f => {
      if (!f || f.puntos.length <= 1) return f;
      return { ...f, puntos: f.puntos.slice(0, -1) };
    });
  };

  /** Cierra la forma volviendo al punto de partida. */
  const cerrarForma = () => {
    if (!formaEnCurso || formaEnCurso.puntos.length < 3) {
      toast.error('Hacen falta al menos tres tramos para cerrar una forma');
      return;
    }
    antesDeCambiar();
    const forma = { ...formaEnCurso, cerrada: true };
    setFormas(prev => [...prev, forma]);
    setFormaEnCurso(null);
    toast.success(`Forma cerrada: ${areaPoligono(forma.puntos)} m²`);
  };

  /**
   * Convierte la forma cerrada en una estancia de verdad, con su superficie
   * medida del polígono. Es lo que hace que una nave en L no se calcule con
   * los metros de más del rectángulo que la envuelve.
   */
  const formaComoEstancia = () => {
    const f = formaEnCurso && formaEnCurso.puntos.length >= 3
      ? { ...formaEnCurso, cerrada: true }
      : [...formas].reverse().find(x => x.planta === planta?.nombre && x.cerrada);
    if (!f) { toast.error('Cierra antes una forma, o levanta al menos tres tramos'); return; }

    antesDeCambiar();
    const est = estanciaDesdeForma(f, {
      id: nuevoId(),
      nombre: medidas.nombre || `Estancia ${estancias.length + 1}`,
      altura: Number(medidas.alto) || alturaDefecto,
      uso: 'salon', orientacion: 'norte', aislamiento: 'normal',
    });
    setEstancias(prev => [...prev, est]);
    // La forma ya está representada por la estancia: se quita para no tener
    // el mismo contorno dibujado dos veces.
    setFormas(prev => prev.filter(x => x.id !== f.id));
    setFormaEnCurso(null);
    setSeleccion(est.id);
    toast.success(`Estancia de ${est.area_manual} m² añadida al cálculo`);
  };

  const terminarTrazado = (enCurso) => {
    const t = enCurso || trazando;
    if (!t) return;
    if (t.puntos.length < 2) {
      toast.error('Marca al menos dos puntos para trazar el recorrido');
      setTrazando(null);
      return;
    }
    antesDeCambiar();
    setRecorridos(prev => [...prev, t]);
    setTrazando(null);
    toast.success(t.tipo === 'conducto' ? 'Conducto trazado' : 'Recorrido de tubería trazado');
  };

  const borrarRecorrido = (id) => setRecorridos(prev => prev.filter(r => r.id !== id));


  const actualizarEstancia = (id, campo, valor) => {
    setEstancias(prev => prev.map(e => (e.id === id ? { ...e, [campo]: valor } : e)));
  };

  /**
   * Crea una estancia con las medidas escritas a mano.
   *
   * Dibujar con el ratón nunca sale exacto, y en una obra las medidas se
   * tienen apuntadas. Se coloca a la derecha de lo ya dibujado para que no
   * se monte encima, y luego se mueve con la mano donde toque.
   */
  const crearPorMedidas = () => {
    const ancho = Number(medidas.ancho) || 0;
    const largo = Number(medidas.largo) || 0;
    if (ancho < 0.5 || largo < 0.5) {
      toast.error('Pon un ancho y un largo de al menos 0,5 m');
      return;
    }
    antesDeCambiar();
    // A la derecha de lo que ya haya, con un metro de separación.
    const x = estancias.length
      ? Math.min(ANCHO_M - ancho, Math.max(...estancias.map(e => e.x + e.ancho)) + 1)
      : 0.5;
    const id = nuevoId();
    setEstancias(prev => [...prev, {
      id,
      nombre: medidas.nombre.trim() || `Estancia ${prev.length + 1}`,
      x: Math.max(0, x), y: 0.5,
      ancho, alto: largo,
      altura: Number(medidas.alto) || planta?.altura || alturaDefecto,
      uso: 'vivienda', orientacion: 'este', aislamiento: 'normal',
      pared_revestimiento: 'pintura', suelo_tipo: 'gres', suelo_debajo: 'terreno',
      techo_tipo: 'directo', techo_encima: 'climatizado', ventanas: [],
    }]);
    setSeleccion(id);
    setMedidas(m => ({ ...m, nombre: '' }));
    toast.success(`Estancia de ${ancho} × ${largo} m añadida`);
  };

  const anadirVentana = (estanciaId) => {
    setEstancias(prev => prev.map(e => (e.id === estanciaId ? {
      ...e,
      ventanas: [...(e.ventanas || []), {
        id: nuevoId(), ancho: 1.2, alto: 1.2, cantidad: 1,
        marco: 'aluminio_rpt', vidrio: 'doble',
        orientacion: e.orientacion || 'este', proteccion: 'persiana',
      }],
    } : e)));
  };

  const actualizarVentana = (estanciaId, ventanaId, campo, valor) => {
    setEstancias(prev => prev.map(e => (e.id === estanciaId ? {
      ...e,
      ventanas: (e.ventanas || []).map(v => (v.id === ventanaId ? { ...v, [campo]: valor } : v)),
    } : e)));
  };

  const borrarVentana = (estanciaId, ventanaId) => {
    setEstancias(prev => prev.map(e => (e.id === estanciaId ? {
      ...e, ventanas: (e.ventanas || []).filter(v => v.id !== ventanaId),
    } : e)));
  };

  const actualizarMaquina = (estanciaId, tipo) => {
    setMaquinas(prev => prev.map(m => (m.estancia_id === estanciaId ? { ...m, tipo } : m)));
  };

  const limpiar = () => {
    setPlantas([{ id: nuevoId(), nombre: 'Planta baja', cota: 0, altura: 2.5, estancias: [], maquinas: [] }]);
    setPlantaActiva(0);
    setExterior(null);
    setTrazosLibres([]); setCotas([]);
    setFormas([]); setFormaEnCurso(null);
    setSeleccion(null); setSugerenciaIA(null); setErrorIA('');
    historial.limpiar();
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

  /** Imprime o guarda en PDF el informe técnico y el presupuesto. */
  const imprimirInforme = async () => {
    if (!fichas.length && !materiales.length) {
      toast.error('Dibuja el plano y coloca los equipos antes de imprimir');
      return;
    }
    const contacto = contactos.find(c => c.id === contactoId);
    // El dibujo se mete como imagen: el informe se entrega y se archiva.
    let planoImg = '';
    try { planoImg = canvasRef.current?.toDataURL('image/png') || ''; } catch { /* sin plano */ }

    // La leyenda va con el plano en papel: el que lo recibe no tiene la
    // aplicación delante para pulsar en un símbolo y ver qué era.
    const leyenda = entradasLeyenda(
      plano.maquinas, exterior,
      resumen.es_refrigeracion ? 'unidad_condensadora' : 'exterior',
      soporteExterior,
    ).map(e => ({ ...e, img: simboloComoImagen(e) }));

    const html = informeHtml({
      empresa: empresa || {},
      cliente: contacto ? `${contacto.name || ''} ${contacto.surname || ''}`.trim() : '',
      fichas, resumen, lineas: lineasPresupuesto,
      totales: { ...totales, margen, iva },
      recorridos: recorridosRevisados,
      planoImg, plantas, leyenda,
    });
    await printDocument(html, 'Informe técnico y presupuesto');
  };

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
    <div className={pantallaCompleta ? '' : 'p-4 space-y-4 max-w-7xl mx-auto'}>
      <div className={pantallaCompleta ? 'hidden' : ''}>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Ruler className="w-6 h-6 text-blue-600" />
          Plano y presupuesto
        </h1>
        <p className="text-sm text-slate-500">
          Dibuja la planta, coloca las máquinas y sale el presupuesto con la lista de material.
        </p>
      </div>

      {/* Herramientas */}
      <div className={`flex flex-wrap gap-2 ${pantallaCompleta ? 'hidden' : ''}`}>
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
        <div className="flex items-center gap-1 border-l pl-2 ml-1">
          <Button size="sm" variant="outline" onClick={deshacer}
            disabled={!historial.puedeDeshacer} title="Deshacer (Ctrl+Z)" className="gap-1">
            <Undo2 className="w-4 h-4" />Deshacer
          </Button>
          <Button size="sm" variant="outline" onClick={rehacer}
            disabled={!historial.puedeRehacer} title="Rehacer (Ctrl+Y)">
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {herramienta === 'libre' && (
          <div className="flex items-center gap-1 border-l pl-2">
            {['#1d4ed8', '#dc2626', '#16a34a', '#000000', '#ea580c'].map(col => (
              <button key={col} onClick={() => setColorLapiz(col)}
                className={`w-6 h-6 rounded-full border-2 ${colorLapiz === col ? 'border-slate-800' : 'border-white'}`}
                style={{ background: col }} title="Color del lápiz" />
            ))}
          </div>
        )}

        <Button size="sm" variant="outline" onClick={limpiar} className="gap-1.5 text-red-600">
          <RotateCcw className="w-4 h-4" />Empezar de nuevo
        </Button>
      </div>

      <p className={`text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg p-2.5 ${pantallaCompleta ? 'hidden' : ''}`}>
        Cada cuadro de la rejilla es <strong>1 metro</strong> (las líneas gruesas, 5 m).
        Arrastra para marcar cada estancia, luego pon una máquina dentro de cada una
        y la unidad exterior donde vaya a ir de verdad: de ahí salen los metros de tubería.
      </p>

      <div className={pantallaCompleta ? '' : 'grid grid-cols-1 lg:grid-cols-3 gap-4'}>
        {/* Lienzo (a pantalla completa ocupa todo el dispositivo).
            Va en un portal sobre el body: dentro de la página, el menú y los
            fondos de la aplicación crean contextos que impiden que un
            position:fixed tape la pantalla de verdad. */}
        <EnvoltorioLienzo pantallaCompleta={pantallaCompleta}>

          {pantallaCompleta && (
            <>
            <div className={`flex items-center gap-1.5 shrink-0 ${
              compacto ? 'overflow-x-auto pb-1' : 'flex-wrap'
            }`}>
              {HERRAMIENTAS.map(h => (
                <BotonHerramienta
                  key={h.id}
                  activo={herramienta === h.id}
                  onClick={() => setHerramienta(h.id)}
                  nombre={h.nombre}
                  icono={h.icono}
                  equipo={h.equipoDinamico ? equipoElegido : h.equipo}
                  variante={h.equipoDinamico ? varianteElegida : null}
                  conSubmenu={!!h.submenu}
                  compacto={compacto}
                />
              ))}
            </div>

            {/* Segunda fila: deshacer, zoom y confirmar */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={deshacer}
                  disabled={!historial.puedeDeshacer}
                  className={compacto ? 'w-10 h-10 p-0' : 'h-9 px-2'} title="Deshacer">
                  <Undo2 className="w-5 h-5" />
                </Button>
                <Button size="sm" variant="outline" onClick={rehacer}
                  disabled={!historial.puedeRehacer}
                  className={compacto ? 'w-10 h-10 p-0' : 'h-9 px-2'} title="Rehacer">
                  <Redo2 className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex items-center gap-1 border-l pl-1.5">
                <Button size="sm" variant="outline"
                  className={compacto ? 'w-9 h-10 p-0 text-lg' : 'h-9 px-2'}
                  onClick={() => setZoomPlano(z => Math.max(0.3, z - 0.15))}>−</Button>
                <span className="text-[11px] text-slate-500 w-10 text-center">
                  {Math.round(zoomPlano * 100)}%
                </span>
                <Button size="sm" variant="outline"
                  className={compacto ? 'w-9 h-10 p-0 text-lg' : 'h-9 px-2'}
                  onClick={() => setZoomPlano(z => Math.min(3, z + 0.15))}>+</Button>
                <Button size="sm" variant="outline"
                  className={compacto ? 'w-10 h-10 p-0' : 'h-9 px-2'}
                  title="Centrar el papel"
                  onClick={() => { setOrigen({ x: 0, y: 0 }); setZoomPlano(1); }}>
                  <Crosshair className="w-5 h-5" />
                </Button>
              </div>
              <Button size="sm" onClick={() => setPantallaCompleta(false)}
                className={`gap-1 ml-auto bg-green-600 hover:bg-green-700 ${compacto ? 'h-10 px-3 text-xs' : 'h-9 text-xs'}`}>
                <Check className="w-4 h-4" />{compacto ? 'Confirmar' : 'Confirmar plano'}
              </Button>
            </div>
            </>
          )}

          {/* Paleta de equipos y opciones de dibujo, dentro de la pantalla */}
          {pantallaCompleta && ['maquina', 'libre', 'exterior', 'forma'].includes(herramienta) && (
            <div className={`shrink-0 border rounded-lg p-2 bg-slate-50 overflow-y-auto ${
              herramienta === 'forma' ? 'max-h-52' : 'max-h-40'
            }`}>
              {herramienta === 'maquina' && (
                <PaletaEquipos
                  valor={equipoElegido} onChange={elegirEquipo}
                  variante={varianteElegida} onVariante={setVarianteElegida}
                />
              )}
              {/* Submenú de la exterior: cómo va montada. Es lo que cambia el
                  dibujo del soporte y la línea del presupuesto. */}
              {herramienta === 'exterior' && (
                <SubmenuVariantes
                  tipo="exterior" valor={soporteExterior} onChange={setSoporteExterior}
                />
              )}
              {herramienta === 'forma' && (
                <PanelTramos
                  compacto={compacto}
                  forma={formaEnCurso}
                  largo={tramoLargo} setLargo={setTramoLargo}
                  direccion={tramoDir} setDireccion={setTramoDir}
                  onAnadir={anadirTramo} onQuitar={quitarUltimoTramo}
                  onCerrar={cerrarForma} onEstancia={formaComoEstancia}
                />
              )}
              {herramienta === 'libre' && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-slate-500">Color</span>
                  {['#1d4ed8', '#dc2626', '#16a34a', '#000000', '#ea580c', '#9333ea'].map(col => (
                    <button key={col} onClick={() => setColorLapiz(col)}
                      className={`w-7 h-7 rounded-full border-2 ${colorLapiz === col ? 'border-slate-800 scale-110' : 'border-white'}`}
                      style={{ background: col }} />
                  ))}
                  <span className="text-xs text-slate-500 ml-2">Grosor</span>
                  {[2, 3.5, 6].map(g => (
                    <button key={g} onClick={() => setGrosorLapiz(g)}
                      className={`px-2 py-1 rounded border text-xs ${grosorLapiz === g ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
                      {g === 2 ? 'Fino' : g === 3.5 ? 'Medio' : 'Grueso'}
                    </button>
                  ))}
                  <span className="text-xs text-slate-500 ml-2">Línea</span>
                  {[['solida', 'Continua'], ['discontinua', 'Discontinua'], ['punteada', 'Punteada']].map(([id, et]) => (
                    <button key={id} onClick={() => setTipoLinea(id)}
                      className={`px-2 py-1 rounded border text-xs ${tipoLinea === id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
                      {et}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Plantas del edificio */}
          <Card className={pantallaCompleta ? 'hidden' : ''}>
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
                <label className="text-[11px] text-slate-500">Altura techo (m)</label>
                <Input type="number" step="0.1" min="2" max="8" className="h-7 text-xs w-20"
                  value={planta?.altura ?? 2.5}
                  onChange={e => actualizarPlanta({ altura: Number(e.target.value) || 2.5 })} />
                <span className="text-[10px] text-slate-400">
                  la cota es a qué altura está el suelo de esta planta (alarga la tubería);
                  la altura de techo se aplica a las estancias nuevas
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Ver en planta o en 3D */}
          <div className={`flex items-center gap-2 flex-wrap ${pantallaCompleta ? 'hidden' : ''}`}>
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

            {vista === 'plano' && (
              <Button size="sm" onClick={() => setPantallaCompleta(true)}
                className="h-7 gap-1 text-xs bg-slate-800 hover:bg-slate-700">
                <Maximize2 className="w-3.5 h-3.5" />Dibujar a pantalla completa
              </Button>
            )}

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

          {/* Crear estancia escribiendo las medidas */}
          <Card className={pantallaCompleta ? 'hidden' : ''}>
            <CardContent className="p-2">
              <div className="flex items-end gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 pb-1.5">Añadir por medidas</span>
                <div>
                  <label className="text-[10px] text-slate-500 block">Nombre</label>
                  <Input className="h-7 text-xs w-28" placeholder="Salón"
                    value={medidas.nombre}
                    onChange={e => setMedidas({ ...medidas, nombre: e.target.value })} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Ancho (m)</label>
                  <Input type="number" step="0.1" min="0.5" className="h-7 text-xs w-20"
                    value={medidas.ancho}
                    onChange={e => setMedidas({ ...medidas, ancho: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Largo (m)</label>
                  <Input type="number" step="0.1" min="0.5" className="h-7 text-xs w-20"
                    value={medidas.largo}
                    onChange={e => setMedidas({ ...medidas, largo: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Alto (m)</label>
                  <Input type="number" step="0.1" min="2" className="h-7 text-xs w-20"
                    value={medidas.alto}
                    onChange={e => setMedidas({ ...medidas, alto: Number(e.target.value) || 2.5 })} />
                </div>
                <Button size="sm" onClick={crearPorMedidas} className="h-7 gap-1 text-xs">
                  <Plus className="w-3 h-3" />Añadir estancia
                </Button>
                <span className="text-[10px] text-slate-400 pb-1.5">
                  se coloca al lado; luego muévela con la mano
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Plano de fondo para calcar */}
          <Card className={`${vista === '3d' ? 'hidden' : ''} ${pantallaCompleta ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
            <CardContent className={`p-2 space-y-2 ${pantallaCompleta ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
              <div className={`flex items-center gap-2 flex-wrap ${pantallaCompleta ? 'hidden' : ''}`}>
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

              {fondo && !pantallaCompleta && (
                <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded p-2">
                  Ajusta la <strong>escala</strong> hasta que una medida conocida del plano
                  (una pared, una puerta de 0,8 m) coincida con los cuadros de la rejilla,
                  que son de 1 metro. Después dibuja las estancias encima y ya tendrás el
                  plano pasado a ordenador, con sus medidas de verdad.
                </p>
              )}

              <div ref={contenedorRef} className={pantallaCompleta ? 'flex-1 min-h-0' : ''}>
              <canvas
                ref={canvasRef}
                width={lienzo.w}
                height={lienzo.h}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="border border-slate-200 rounded touch-none block"
                style={{
                  width: '100%',
                  height: pantallaCompleta ? '100%' : 'auto',
                  cursor: herramienta === 'borrar' ? 'not-allowed'
                    : herramienta === 'mover' ? 'grab' : 'crosshair',
                }}
              />
              </div>

              {/* Leyenda: qué es cada dibujo del plano. Va debajo del lienzo
                  porque es donde se mira, sin salir de la pantalla de dibujo. */}
              <LeyendaPlano
                maquinas={maquinas}
                exterior={exterior}
                tipoExterior={resumen.es_refrigeracion ? 'unidad_condensadora' : 'exterior'}
                soporteExterior={soporteExterior}
                compacto={compacto}
              />
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
        </EnvoltorioLienzo>

        {/* Panel lateral */}
        <div className={`space-y-4 ${pantallaCompleta ? 'hidden' : ''}`}>
          {herramienta === 'maquina' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Qué equipo pones</CardTitle>
              </CardHeader>
              <CardContent>
                <PaletaEquipos
                  valor={equipoElegido} onChange={elegirEquipo}
                  variante={varianteElegida} onVariante={setVarianteElegida}
                />
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

                {/* Cerramientos: lo que hay de verdad en la obra */}
                <details className="border rounded-lg p-2" open>
                  <summary className="text-xs font-medium text-slate-700 cursor-pointer">
                    Paredes, suelo y techo
                  </summary>
                  <div className="space-y-2 mt-2">
                    <DesplegableObj etiqueta="Revestimiento de paredes"
                      valor={estanciaSel.pared_revestimiento} opciones={REVESTIMIENTO_PARED}
                      onChange={v => actualizarEstancia(estanciaSel.id, 'pared_revestimiento', v)} />
                    <DesplegableObj etiqueta="Suelo" valor={estanciaSel.suelo_tipo} opciones={TIPO_SUELO}
                      onChange={v => actualizarEstancia(estanciaSel.id, 'suelo_tipo', v)} />
                    <DesplegableObj etiqueta="Debajo del suelo hay" valor={estanciaSel.suelo_debajo} opciones={SUELO_DEBAJO}
                      onChange={v => actualizarEstancia(estanciaSel.id, 'suelo_debajo', v)} />
                    <DesplegableObj etiqueta="Techo" valor={estanciaSel.techo_tipo} opciones={TIPO_TECHO}
                      onChange={v => actualizarEstancia(estanciaSel.id, 'techo_tipo', v)} />
                    <DesplegableObj etiqueta="Encima del techo hay" valor={estanciaSel.techo_encima} opciones={TECHO_ENCIMA}
                      onChange={v => actualizarEstancia(estanciaSel.id, 'techo_encima', v)} />
                    <p className="text-[10px] text-slate-400">
                      Lo que más cambia el resultado es qué hay encima del techo y debajo del
                      suelo. El acabado (gres, terrazo…) apenas mueve la potencia: se guarda
                      para la memoria del trabajo.
                    </p>
                  </div>
                </details>

                {/* Cámara frigorífica: lo suyo propio */}
                {USOS_CAMARA.includes(estanciaSel.uso) && (
                  <details className="border-2 border-sky-200 bg-sky-50/40 rounded-lg p-2" open>
                    <summary className="text-xs font-medium text-sky-800 cursor-pointer">
                      Cámara frigorífica
                    </summary>
                    <div className="space-y-2 mt-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-600">
                          Temperatura de trabajo (°C)
                        </label>
                        <Input type="number" step="1" className="mt-1 h-8 text-xs"
                          value={estanciaSel.temp_camara ?? (estanciaSel.uso === 'camara_congelacion' ? -20 : 2)}
                          onChange={e => actualizarEstancia(estanciaSel.id, 'temp_camara', Number(e.target.value))} />
                      </div>

                      <DesplegableObj etiqueta="Cómo apoya en el suelo"
                        valor={estanciaSel.suelo_camara || 'aislado'} opciones={SUELO_CAMARA}
                        onChange={v => actualizarEstancia(estanciaSel.id, 'suelo_camara', v)} />
                      {SUELO_CAMARA[estanciaSel.suelo_camara || 'aislado']?.nota && (
                        <p className={`text-[10px] rounded p-1.5 border ${
                          (estanciaSel.suelo_camara || 'aislado') === 'directo_solera'
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          {SUELO_CAMARA[estanciaSel.suelo_camara || 'aislado'].nota}
                        </p>
                      )}

                      <DesplegableObj etiqueta="Panel de la cámara"
                        valor={estanciaSel.panel_camara || panelRecomendado(estanciaSel.temp_camara ?? 2)}
                        opciones={PANEL_CAMARA}
                        onChange={v => actualizarEstancia(estanciaSel.id, 'panel_camara', v)} />
                      {(() => {
                        const rec = panelRecomendado(estanciaSel.temp_camara ?? 2);
                        const puesto = estanciaSel.panel_camara || rec;
                        if (puesto === rec) {
                          return <p className="text-[10px] text-green-700">
                            Es el panel que toca para {estanciaSel.temp_camara ?? 2} °C ({PANEL_CAMARA[rec].uso}).
                          </p>;
                        }
                        return <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
                          Para {estanciaSel.temp_camara ?? 2} °C se recomienda {PANEL_CAMARA[rec].nombre} ({PANEL_CAMARA[rec].uso}).
                        </p>;
                      })()}

                      <p className="text-[10px] text-sky-800">
                        Coloca dentro el evaporador, la condensadora y el control de
                        temperatura desde «Poner equipo». Para el cálculo fino (producto,
                        entradas diarias, renovaciones) usa la pantalla de Cámara Frigorífica.
                      </p>
                    </div>
                  </details>
                )}

                {/* Ventanas: lo que más pesa en la carga */}
                <details className="border rounded-lg p-2" open>
                  <summary className="text-xs font-medium text-slate-700 cursor-pointer flex items-center justify-between">
                    <span>Ventanas ({(estanciaSel.ventanas || []).length})</span>
                  </summary>
                  <div className="space-y-2 mt-2">
                    {(estanciaSel.ventanas || []).map(v => {
                      const cv = cargaVentana(v, estanciaSel.orientacion);
                      return (
                        <div key={v.id} className="border rounded p-2 space-y-1.5 bg-slate-50">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-medium text-slate-600">
                              {cv.area} m² · {cv.total} W
                            </span>
                            <button onClick={() => borrarVentana(estanciaSel.id, v.id)}
                              className="text-slate-300 hover:text-red-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <Medida etiqueta="Ancho (m)" valor={v.ancho}
                              onChange={n => actualizarVentana(estanciaSel.id, v.id, 'ancho', n)} />
                            <Medida etiqueta="Alto (m)" valor={v.alto}
                              onChange={n => actualizarVentana(estanciaSel.id, v.id, 'alto', n)} />
                            <Medida etiqueta="Cantidad" valor={v.cantidad}
                              onChange={n => actualizarVentana(estanciaSel.id, v.id, 'cantidad', n)} />
                          </div>
                          <DesplegableObj etiqueta="Marco" valor={v.marco} opciones={VENTANA_MARCO}
                            onChange={n => actualizarVentana(estanciaSel.id, v.id, 'marco', n)} />
                          <DesplegableObj etiqueta="Acristalamiento" valor={v.vidrio} opciones={VENTANA_VIDRIO}
                            onChange={n => actualizarVentana(estanciaSel.id, v.id, 'vidrio', n)} />
                          <Desplegable etiqueta="Orientación" valor={v.orientacion}
                            opciones={Object.keys(FACTOR_ORIENTACION)}
                            onChange={n => actualizarVentana(estanciaSel.id, v.id, 'orientacion', n)} />
                          <DesplegableObj etiqueta="Protección solar" valor={v.proteccion} opciones={PROTECCION_SOLAR}
                            onChange={n => actualizarVentana(estanciaSel.id, v.id, 'proteccion', n)} />
                          <p className="text-[10px] text-slate-500">
                            Transmisión {cv.transmision} W · sol {cv.solar} W (U {cv.u} W/m²K)
                          </p>
                        </div>
                      );
                    })}
                    <Button size="sm" variant="outline" onClick={() => anadirVentana(estanciaSel.id)}
                      className="w-full h-7 gap-1 text-xs">
                      <Plus className="w-3 h-3" />Añadir ventana
                    </Button>
                    {(estanciaSel.ventanas || []).length === 0 && (
                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
                        Sin ventanas la carga sale corta. Un ventanal al oeste puede ser
                        la mitad de la potencia que hace falta.
                      </p>
                    )}
                  </div>
                </details>
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
                  <label className="text-xs font-medium text-slate-600">
                    Soporte de la unidad exterior
                  </label>
                  <Select value={soporteExterior} onValueChange={setSoporteExterior}>
                    <SelectTrigger className="mt-1 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SOPORTES_SOPORTE).map(([id, sp]) => (
                        <SelectItem key={id} value={id}>{sp.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Se dibuja debajo de la máquina en el plano y entra en el presupuesto.
                  </p>
                </div>

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
            <Button onClick={imprimirInforme} disabled={!materiales.length}
              variant="outline" className="w-full gap-2">
              <Printer className="w-4 h-4" />Imprimir / guardar en PDF
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
            <CardContent className="p-0">
              {/* La tabla hace scroll dentro de su caja, no rompe la página */}
              <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[860px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-600 bg-slate-100">
                    <th className="p-2.5 border-b-2 border-slate-300">Estancia</th>
                    <th className="p-2.5 border-b-2 border-slate-300 text-right">Superficie</th>
                    <th className="p-2.5 border-b-2 border-slate-300 text-right">Carga</th>
                    <th className="p-2.5 border-b-2 border-slate-300">Máquina</th>
                    <th className="p-2.5 border-b-2 border-slate-300 text-right">Cubre</th>
                    <th className="p-2.5 border-b-2 border-slate-300">Tubería</th>
                    <th className="p-2.5 border-b-2 border-slate-300 text-right">Metros</th>
                    <th className="p-2.5 border-b-2 border-slate-300 text-right">Gas extra</th>
                  </tr>
                </thead>
                <tbody>
                  {fichas.map((f, i) => (
                    <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                      <td className="p-2.5 font-medium border-b whitespace-nowrap">{f.estancia}</td>
                      <td className="p-2.5 text-right border-b whitespace-nowrap">{f.superficie} m²</td>
                      <td className="p-2.5 text-right border-b whitespace-nowrap">{f.carga_frigorias} frig/h</td>
                      <td className="p-2.5 border-b whitespace-nowrap">{f.maquina}</td>
                      <td className={`p-2.5 text-right border-b whitespace-nowrap ${f.suficiente ? 'text-green-700' : 'text-red-600 font-bold'}`}>
                        {f.superficie_cubierta} m²
                      </td>
                      <td className="p-2.5 border-b whitespace-nowrap">{f.tuberia_liquido} / {f.tuberia_gas}</td>
                      <td className="p-2.5 text-right border-b whitespace-nowrap">{f.metros_tuberia} m</td>
                      <td className="p-2.5 text-right border-b whitespace-nowrap">
                        {f.gas_extra_g > 0 ? `${f.gas_extra_g} g` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-semibold border-t-2 border-slate-300">
                    <td className="p-2.5" colSpan={6}>Totales</td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      {fichas.reduce((s, f) => s + f.metros_tuberia, 0).toFixed(1)} m
                    </td>
                    <td className="p-2.5 text-right whitespace-nowrap">
                      {fichas.reduce((s, f) => s + f.gas_extra_g, 0)} g
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse min-w-[560px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-600 bg-slate-100">
                  <th className="p-2.5 border-b-2 border-slate-300">Concepto</th>
                  <th className="p-2.5 border-b-2 border-slate-300 text-right">Cantidad</th>
                  <th className="p-2.5 border-b-2 border-slate-300 text-right">Precio</th>
                  <th className="p-2.5 border-b-2 border-slate-300 text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {lineasPresupuesto.map((l, i) => (
                  <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="p-2.5 border-b">{l.descripcion}</td>
                    <td className="p-2.5 text-right border-b whitespace-nowrap">{l.cantidad} {l.unidad}</td>
                    <td className="p-2.5 text-right border-b whitespace-nowrap">{l.precio_ud.toFixed(2)} €</td>
                    <td className="p-2.5 text-right border-b font-medium whitespace-nowrap">{l.total.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-base">
                  <td className="p-3" colSpan={3}>Coste total</td>
                  <td className="p-3 text-right whitespace-nowrap">{totales.coste.toFixed(2)} €</td>
                </tr>
              </tfoot>
            </table>
            </div>
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
              <BuscadorCliente
                contacts={contactos}
                value={contactoId}
                onValueChange={setContactoId}
                placeholder="Elegir cliente…"
              />
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

/**
 * Escribe la medida de cada tramo encima de su lado.
 *
 * Un plano sin cotas no sirve para pedir material ni para replantear en obra:
 * lo primero que se busca al mirarlo es cuánto mide cada pared.
 */
/**
 * PanelTramos — levantar la forma escribiendo cada medida.
 *
 * Se pone cuánto mide el tramo y hacia dónde va, y el punto siguiente sale
 * exacto. Es la diferencia entre un plano que sirve para pedir material y un
 * garabato: aquí las cotas son las que se han medido en la obra, no las que
 * han salido de arrastrar el dedo.
 */
function PanelTramos({
  forma, largo, setLargo, direccion, setDireccion,
  onAnadir, onQuitar, onCerrar, onEstancia, compacto = false,
}) {
  const puntos = forma?.puntos || [];
  const tramos = Math.max(0, puntos.length - 1);

  return (
    <div className="space-y-2">
      {!forma ? (
        <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded p-1.5">
          Pulsa en el plano para marcar <strong>por dónde empieza</strong> la forma.
          A partir de ahí, cada pared se añade con su medida.
        </p>
      ) : (
        <p className="text-[11px] text-slate-500">
          {tramos} tramo{tramos === 1 ? '' : 's'}
          {tramos >= 2 && ` · ${perimetroPoligono(puntos, false)} m recorridos`}
          {tramos >= 2 && ` · cerrada serían ${areaPoligono(puntos)} m²`}
        </p>
      )}

      <div className="flex items-end gap-2 flex-wrap">
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Mide (m)</label>
          <Input
            type="number" step="0.05" min="0" value={largo}
            onChange={(e) => setLargo(e.target.value)}
            className="h-9 w-20 text-sm"
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Hacia</label>
          <div className="grid grid-cols-4 gap-0.5">
            {DIRECCIONES.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDireccion(d.id)}
                title={d.nombre}
                className={`w-8 h-8 rounded border text-sm leading-none ${
                  direccion === d.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-slate-300 hover:bg-slate-50'
                }`}
              >
                {d.flecha}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={onAnadir} className="h-9 gap-1 px-2">
          <Plus className="w-4 h-4" />{compacto ? 'Tramo' : 'Añadir tramo'}
        </Button>
        <Button size="sm" variant="outline" onClick={onQuitar}
          disabled={tramos < 1} className="h-9 gap-1 px-2">
          <Undo2 className="w-4 h-4" />Quitar
        </Button>
        <Button size="sm" variant="outline" onClick={onCerrar}
          disabled={tramos < 2} className="h-9 gap-1 px-2">
          <Check className="w-4 h-4" />{compacto ? 'Cerrar' : 'Cerrar forma'}
        </Button>
        <Button size="sm" onClick={onEstancia} disabled={tramos < 2}
          className="h-9 gap-1 px-2 bg-green-600 hover:bg-green-700">
          <Shapes className="w-4 h-4" />{compacto ? 'Estancia' : 'Usarla como estancia'}
        </Button>
      </div>
    </div>
  );
}

/**
 * El símbolo de un equipo convertido en imagen, para meterlo en el informe.
 * Se pinta en un lienzo suelto (no el del plano) para no ensuciar el dibujo.
 */
function simboloComoImagen(entrada) {
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 48;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    const cy = c.height / 2 - (entrada.soporte ? 4 : 0);
    if (entrada.soporte) dibujarSoporte(ctx, entrada.soporte, c.width / 2, cy, 0.7);
    dibujarEquipo(ctx, entrada.tipo, c.width / 2, cy, 0.7, false, entrada.variante);
    return c.toDataURL('image/png');
  } catch {
    return '';   // sin dibujo, la leyenda sale igual con el nombre
  }
}

function acotarTramos(ctx, puntos, metroPx, cerrada) {
  if (!puntos || puntos.length < 2) return;
  ctx.save();
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const hasta = cerrada ? puntos.length : puntos.length - 1;
  for (let i = 0; i < hasta; i++) {
    const a = puntos[i];
    const b = puntos[(i + 1) % puntos.length];
    const largo = longitudTramo(a, b);
    if (largo < 0.3) continue;   // tramos diminutos: la cota no cabe
    const mx = ((a.x + b.x) / 2) * metroPx;
    const my = ((a.y + b.y) / 2) * metroPx;
    const texto = `${largo} m`;
    const ancho = ctx.measureText(texto).width + 6;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(mx - ancho / 2, my - 7, ancho, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillText(texto, mx, my);
  }
  ctx.restore();
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

/**
 * Envoltorio del lienzo: normal dentro de la página, y sobre el body cuando
 * se dibuja a pantalla completa.
 */
function EnvoltorioLienzo({ pantallaCompleta, children }) {
  if (!pantallaCompleta) {
    return <div className="lg:col-span-2 space-y-2">{children}</div>;
  }
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-white flex flex-col gap-1.5 overflow-hidden"
      style={{
        // Sin esto los botones se meten debajo del reloj y la batería del
        // móvil, y no se pueden ni pulsar.
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 6px)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 6px)',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

/** Desplegable para catálogos con forma { clave: { nombre } }. */
function DesplegableObj({ etiqueta, valor, opciones, onChange }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-slate-600">{etiqueta}</label>
      <Select value={valor || ''} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder="Elegir…" /></SelectTrigger>
        <SelectContent>
          {Object.entries(opciones).map(([clave, o]) => (
            <SelectItem key={clave} value={clave}>{o.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
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
