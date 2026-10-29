import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Save, Sparkles, FileDown, Printer, Link2, Trash2, Mail, Spline, FileBox, AlertTriangle, Grid3x3, Ruler, Eye, EyeOff, ShieldCheck, Maximize2, Minimize2, Eraser, Zap, Box } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuscadorCliente from '@/components/BuscadorCliente';
import { getNextAvailableNumber } from '@/components/autoNumber';
import PlanoCanvas from '@/components/plano_frigorifico/PlanoCanvas';
import PlanoPaleta from '@/components/plano_frigorifico/PlanoPaleta';
import PlanoEquipoDetalles from '@/components/plano_frigorifico/PlanoEquipoDetalles';
import { construirPDF, exportarPDF, imprimirPlano } from '@/components/plano_frigorifico/PlanoExporter';
import { exportarDXF } from '@/lib/planoDxfExport';
import { exportarEsquemaElectrico, imprimirEsquemaElectrico } from '@/lib/planoEsquemaElectrico';
import InformeAseguradoraDialog from '@/components/plano_frigorifico/InformeAseguradoraDialog';
import DialogoNuevaConexion from '@/components/plano_frigorifico/DialogoNuevaConexion';
import DialogoSala from '@/components/plano_frigorifico/DialogoSala';
import DialogoCamara from '@/components/plano_frigorifico/DialogoCamara';
import GestorCatalogoPlano from '@/components/plano_frigorifico/GestorCatalogoPlano';
import LeyendaPlano from '@/components/plano_frigorifico/LeyendaPlano';
import PlanoBarraSuperior from '@/components/plano_frigorifico/PlanoBarraSuperior';
import Vista3DPlanoFrigorifico from '@/components/plano_frigorifico/Vista3DPlanoFrigorifico';
import ControlMoverFlotante from '@/components/plano_frigorifico/ControlMoverFlotante';
import { autoConectar, resumenTuberias } from '@/lib/planoCalculo';
import { CAT_COLOR, CAPAS, elementoDe } from '@/lib/planoFrigorificoCatalogo';
import { presupuestoAproximado } from '@/lib/instalacionCalculos';

const PLANO_VACIO = {
  id: null, name: '', contact_id: '', contact_name: '', description: '',
  scale: 50, walls: [], elements: [], connections: [], observations: '', status: 'borrador',
};

export default function PlanoFrigorifico() {
  const navigate = useNavigate();
  const [planos, setPlanos] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [plan, setPlan] = useState({ ...PLANO_VACIO });
  const [mode, setMode] = useState('select');
  const [connectType, setConnectType] = useState('refrigerante');
  const [activeType, setActiveType] = useState(null);
  const [activeElement, setActiveElement] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [tarifas, setTarifas] = useState([]);
  const [polyline, setPolyline] = useState(false);
  const [gridMeters, setGridMeters] = useState(1);
  const [snapMode, setSnapMode] = useState('libre');
  const [capasVisibles, setCapasVisibles] = useState(() => Object.fromEntries(CAPAS.map((c) => [c.id, true])));
  const [gmailDialog, setGmailDialog] = useState(false);
  const [gmailForm, setGmailForm] = useState({ to: '', subject: '', body: '' });
  const [enviando, setEnviando] = useState(false);
  const [empresa, setEmpresa] = useState({});
  const [informeDialog, setInformeDialog] = useState(false);
  // El editor abre a pantalla completa por defecto: en una pestaña normal el
  // lienzo queda demasiado pequeño para dibujar cómodamente.
  const [fullscreen, setFullscreen] = useState(true);
  // Visor 3D de la instalación: se abre como un panel sobre el editor.
  const [ver3D, setVer3D] = useState(false);

  // ── Historial (deshacer/rehacer) y portapapeles (copiar/cortar/pegar) ──
  // El historial guarda instantáneas del dibujo (paredes, elementos y
  // conexiones). Se empuja una antes de cada cambio, agrupando los movimientos
  // continuos (arrastrar) en un solo paso para que Deshacer sea útil y no vaya
  // píxel a píxel.
  const historial = useRef([]);
  const futuro = useRef([]);
  const ultimoPush = useRef(Date.now());
  const [histTick, setHistTick] = useState(0);
  const [portapapeles, setPortapapeles] = useState(null);
  // Diálogo que pide el diámetro (tubería) o el tipo de cable (eléctrica) nada
  // más trazar una línea, para que el montador lo tenga anotado.
  const [conexionDialogo, setConexionDialogo] = useState(null);

  // Elementos/maquinaria que el usuario añade al catálogo del plano, para
  // tenerlos siempre disponibles en su apartado. Se guardan en la entidad
  // PlanoCatalogItem y aquí se cargan para mezclarlos con los de fábrica.
  const [catalogoExtra, setCatalogoExtra] = useState([]);
  const [dialogoCatalogo, setDialogoCatalogo] = useState(false);
  // Diálogo para dibujar o editar una sala (habitáculo cuadrado/rectangular):
  // pide ancho y largo en metros y dibuja las cuatro paredes. Al variar las
  // medidas, el rectángulo se redibuja solo.
  const [dialogoSala, setDialogoSala] = useState(null);
  // Diálogo para dibujar o editar una cámara frigorífica: pide medidas, tipo
  // (positiva/negativa), suelo sanitario y espesor del panel. La cámara se
  // dibuja distinta a una pared, como un recinto panelado de doble línea.
  const [dialogoCamara, setDialogoCamara] = useState(null);

  const cargarCatalogoExtra = useCallback(async () => {
    try {
      const res = await base44.entities.PlanoCatalogItem.filter({ is_active: true }, { limit: 200 });
      setCatalogoExtra(res?.items || []);
    } catch { /* sin catálogo personalizado: la paleta usa solo el de fábrica */ }
  }, []);

  const resetHistorial = () => {
    historial.current = [];
    futuro.current = [];
    ultimoPush.current = Date.now();
    setHistTick((t) => t + 1);
  };

  // Esc cierra la pantalla completa, igual que en el resto del programa.
  useEffect(() => {
    if (!fullscreen) return;
    const h = (e) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fullscreen]);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, cs, ts, emps] = await Promise.all([
        base44.entities.RefrigerationPlan.filter({}, { sort: '-created_date', limit: 100 }).catch(() => ({ items: [] })),
        base44.entities.Contact.list({ limit: 500 }).catch(() => []),
        base44.entities.PriceItem.list().catch(() => []),
        base44.entities.CompanySettings.list().catch(() => []),
      ]);
      setPlanos(ps?.items || []);
      setContacts(cs || []);
      setTarifas(ts || []);
      if (emps && emps.length) setEmpresa(emps[0]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargarDatos(); cargarCatalogoExtra(); }, [cargarDatos, cargarCatalogoExtra]);

  // Permite abrir este módulo desde la ficha del cliente con ?contact=<id>
  // para arrancar un plano ya vinculado a ese cliente.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('contact');
    if (cid) {
      setPlan((p) => {
        if (p.contact_id === cid) return p;
        const c = contacts.find((x) => x.id === cid);
        return { ...p, contact_id: cid, contact_name: c ? (c.full_name || c.name || c.company || '') : p.contact_name };
      });
    }
  }, [contacts]);

  // Cargar un plano concreto por id desde la URL (?plano=<id>), para editar
  // directamente desde la ficha del cliente.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pid = params.get('plano');
    if (!pid) return;
    (async () => {
      try {
        const p = await base44.entities.RefrigerationPlan.get(pid);
        if (p) { setPlan({ ...PLANO_VACIO, ...p, connections: p.connections || [] }); setSelectedId(null); setMode('select'); resetHistorial(); }
      } catch { /* plano no encontrado */ }
    })();
  }, []);

  // Cuando se elige un cliente, rellenamos el destinatario del correo con su email.
  useEffect(() => {
    if (!plan.contact_id) return;
    const c = contacts.find((x) => x.id === plan.contact_id);
    if (c?.email) setGmailForm((f) => ({ ...f, to: c.email }));
  }, [plan.contact_id, contacts]);

  // Borrado con teclado cuando hay selección y el foco no está en un input.
  useEffect(() => {
    const h = (e) => {
      if (!selectedId) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        borrarSeleccion();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const handleChange = (patch) => {
    setPlan((p) => {
      // Antes de aplicar, guarda el estado previo en el historial. Se agrupan
      // los cambios rápidos (arrastrar): si no ha pasado suficiente tiempo y
      // no es un cambio estructural (añadir/borrar), no se empuja otro paso.
      const snap = { walls: p.walls, elements: p.elements, connections: p.connections };
      const ult = historial.current[historial.current.length - 1];
      const estructural = !ult
        || ult.elements.length !== snap.elements.length
        || ult.walls.length !== snap.walls.length
        || ult.connections.length !== snap.connections.length;
      const ahora = Date.now();
      if (estructural || ahora - ultimoPush.current > 800) {
        historial.current.push(snap);
        if (historial.current.length > 80) historial.current.shift();
        futuro.current = [];
        ultimoPush.current = ahora;
        setHistTick((t) => t + 1);
      }
      return {
        ...p,
        walls: patch.walls !== undefined ? patch.walls : p.walls,
        elements: patch.elements !== undefined ? patch.elements : p.elements,
        connections: patch.connections !== undefined ? patch.connections : p.connections,
      };
    });
    if (patch.selectedId !== undefined) setSelectedId(patch.selectedId);
  };

  const undo = () => {
    setPlan((p) => {
      const prev = historial.current.pop();
      if (!prev) return p;
      futuro.current.push({ walls: p.walls, elements: p.elements, connections: p.connections });
      ultimoPush.current = Date.now();
      setHistTick((t) => t + 1);
      return { ...p, walls: prev.walls, elements: prev.elements, connections: prev.connections };
    });
    setSelectedId(null);
  };

  const redo = () => {
    setPlan((p) => {
      const next = futuro.current.pop();
      if (!next) return p;
      historial.current.push({ walls: p.walls, elements: p.elements, connections: p.connections });
      ultimoPush.current = Date.now();
      setHistTick((t) => t + 1);
      return { ...p, walls: next.walls, elements: next.elements, connections: next.connections };
    });
    setSelectedId(null);
  };

  const copiar = () => {
    if (selectedElement) setPortapapeles({ tipo: 'elemento', data: selectedElement });
    else if (selectedWall) setPortapapeles({ tipo: 'pared', data: selectedWall });
    else if (selectedConnection) setPortapapeles({ tipo: 'conexion', data: selectedConnection });
  };
  const cortar = () => { copiar(); borrarSeleccion(); };
  const pegar = () => {
    if (!portapapeles) return;
    historial.current.push({ walls: plan.walls, elements: plan.elements, connections: plan.connections });
    futuro.current = [];
    ultimoPush.current = Date.now();
    setHistTick((t) => t + 1);
    if (portapapeles.tipo === 'elemento') {
      const copia = { ...portapapeles.data, id: crypto.randomUUID(), x: portapapeles.data.x + 50, y: portapapeles.data.y + 50, label: `${portapapeles.data.label || 'Elemento'} (copia)` };
      setPlan((p) => ({ ...p, elements: [...p.elements, copia] }));
      setSelectedId(copia.id);
    } else if (portapapeles.tipo === 'pared') {
      const copia = { ...portapapeles.data, id: crypto.randomUUID(), x1: portapapeles.data.x1 + 50, y1: portapapeles.data.y1 + 50, x2: portapapeles.data.x2 + 50, y2: portapapeles.data.y2 + 50 };
      setPlan((p) => ({ ...p, walls: [...p.walls, copia] }));
      setSelectedId(copia.id);
    } else if (portapapeles.tipo === 'conexion') {
      const copia = { ...portapapeles.data, id: crypto.randomUUID() };
      setPlan((p) => ({ ...p, connections: [...p.connections, copia] }));
      setSelectedId(copia.id);
    }
  };

  // Actualiza una conexión por id (no por selección): lo usa el diálogo que
  // pide el diámetro/cable al trazar una línea.
  const actualizarConexionPorId = (id, patch) => {
    setPlan((p) => ({ ...p, connections: p.connections.map((c) => c.id === id ? { ...c, ...patch } : c) }));
  };

  const onConexionCreada = (nueva) => setConexionDialogo({ id: nueva.id, tipo: nueva.type });

  // ── Salas (habitáculos cuadrados/rectangulares) ──────────────────────────
  // Una sala son cuatro paredes que comparten un room_id. Cada pared guarda
  // además el origen (room_x, room_y) y las medidas (room_w_m, room_h_m) de
  // la sala, así al cambiar las medidas se pueden recalcular las cuatro
  // paredes sin perder la posición donde se dibujó.
  const paredesDeSala = (x, y, w_m, h_m, scale, roomId) => {
    const w = w_m * scale, h = h_m * scale;
    const base = { room_id: roomId, room_x: x, room_y: y, room_w_m: w_m, room_h_m: h_m };
    return [
      { ...base, id: crypto.randomUUID(), x1: x, y1: y, x2: x + w, y2: y },           // arriba
      { ...base, id: crypto.randomUUID(), x1: x + w, y1: y, x2: x + w, y2: y + h },  // derecha
      { ...base, id: crypto.randomUUID(), x1: x + w, y1: y + h, x2: x, y2: y + h },   // abajo
      { ...base, id: crypto.randomUUID(), x1: x, y1: y + h, x2: x, y2: y },           // izquierda
    ];
  };

  const crearSala = ({ ancho, largo }) => {
    // Se coloca la nueva sala un poco apartada de lo que ya hay, para que no
    // caiga encima de paredes anteriores.
    const xs = plan.walls.map((w) => Math.max(w.x1, w.x2)).concat(plan.walls.map((w) => Math.min(w.x1, w.x2)));
    const baseX = xs.length ? Math.max(...xs) + 60 : 60;
    const roomId = crypto.randomUUID();
    const nuevas = paredesDeSala(baseX, 60, ancho, largo, plan.scale || 50, roomId);
    handleChange({ walls: [...plan.walls, ...nuevas] });
    setSelectedId(nuevas[0].id);
    setDialogoSala(null);
    toast.success(`Sala ${ancho}×${largo} m dibujada`, { description: 'Selecciona una pared para cambiar sus medidas.' });
  };

  const actualizarSala = (roomId, { ancho, largo }) => {
    const ref = plan.walls.find((w) => w.room_id === roomId);
    if (!ref) { setDialogoSala(null); return; }
    const x = ref.room_x, y = ref.room_y, scale = plan.scale || 50;
    const w = ancho * scale, h = largo * scale;
    const coords = [
      [x, y, x + w, y],
      [x + w, y, x + w, y + h],
      [x + w, y + h, x, y + h],
      [x, y + h, x, y],
    ];
    // Se recorren las paredes de la sala en su orden original para asignar a
    // cada una su nuevo tramo. Así al variar las medidas el rectángulo se
    // redibuja sin mover la sala de sitio.
    let i = 0;
    const nuevas = plan.walls.map((pared) => {
      if (pared.room_id !== roomId) return pared;
      const [x1, y1, x2, y2] = coords[i] || coords[0];
      i += 1;
      return { ...pared, x1, y1, x2, y2, room_w_m: ancho, room_h_m: largo };
    });
    handleChange({ walls: nuevas });
    setDialogoSala(null);
    toast.success(`Sala actualizada a ${ancho}×${largo} m`);
  };

  const borrarSala = (roomId) => {
    setPlan((p) => ({ ...p, walls: p.walls.filter((w) => w.room_id !== roomId) }));
    setSelectedId(null);
  };

  // ── Cámaras frigoríficas ────────────────────────────────────────────────
  // Una cámara es un recinto panelado (cuatro paredes) con metadatos: tipo
  // (positiva/negativa), suelo sanitario y espesor del panel. Se dibuja
  // distinto a una pared (doble línea coloreada según el tipo) para que se
  // reconozca a primera vista en el plano. Comparte room_id como las salas,
  // pero lleva `camara: true` y sus datos propios.
  const paredesDeCamara = (x, y, w_m, h_m, scale, roomId, datos) => {
    const w = w_m * scale, h = h_m * scale;
    const base = {
      room_id: roomId, room_x: x, room_y: y, room_w_m: w_m, room_h_m: h_m,
      camara: true, ...datos,
    };
    return [
      { ...base, id: crypto.randomUUID(), x1: x, y1: y, x2: x + w, y2: y },
      { ...base, id: crypto.randomUUID(), x1: x + w, y1: y, x2: x + w, y2: y + h },
      { ...base, id: crypto.randomUUID(), x1: x + w, y1: y + h, x2: x, y2: y + h },
      { ...base, id: crypto.randomUUID(), x1: x, y1: y + h, x2: x, y2: y },
    ];
  };

  const crearCamara = ({ ancho, largo, tipo, suelo, espesor }) => {
    const xs = plan.walls.map((w) => Math.max(w.x1, w.x2)).concat(plan.walls.map((w) => Math.min(w.x1, w.x2)));
    const baseX = xs.length ? Math.max(...xs) + 80 : 80;
    const roomId = crypto.randomUUID();
    const nuevas = paredesDeCamara(baseX, 80, ancho, largo, plan.scale || 50, roomId, { tipo, suelo, espesor_mm: espesor });
    handleChange({ walls: [...plan.walls, ...nuevas] });
    setSelectedId(nuevas[0].id);
    setDialogoCamara(null);
    toast.success(`Cámara ${ancho}×${largo} m · ${tipo}`, { description: `${suelo ? 'Con suelo sanitario' : 'Sin suelo sanitario'} · ${espesor} mm` });
  };

  const actualizarCamara = (roomId, datos) => {
    const ref = plan.walls.find((w) => w.room_id === roomId && w.camara);
    if (!ref) { setDialogoCamara(null); return; }
    const x = ref.room_x, y = ref.room_y, scale = plan.scale || 50;
    const { ancho, largo, tipo, suelo, espesor } = datos;
    const w = ancho * scale, h = largo * scale;
    const coords = [
      [x, y, x + w, y],
      [x + w, y, x + w, y + h],
      [x + w, y + h, x, y + h],
      [x, y + h, x, y],
    ];
    let i = 0;
    const nuevas = plan.walls.map((pared) => {
      if (pared.room_id !== roomId) return pared;
      const [x1, y1, x2, y2] = coords[i] || coords[0];
      i += 1;
      return { ...pared, x1, y1, x2, y2, room_w_m: ancho, room_h_m: largo, tipo, suelo, espesor_mm: espesor };
    });
    handleChange({ walls: nuevas });
    setDialogoCamara(null);
    toast.success(`Cámara actualizada a ${ancho}×${largo} m`);
  };

  const borrarCamara = (roomId) => {
    setPlan((p) => ({ ...p, walls: p.walls.filter((w) => w.room_id !== roomId) }));
    setSelectedId(null);
  };

  const onPick = ({ mode: m, element, connectType: ct }) => {
    setMode(m);
    if (m === 'place' && element) {
      setActiveType(element.id);
      setActiveElement({ ...element, color: CAT_COLOR[element.cat] });
    } else if (m === 'connect') {
      setConnectType(ct || 'refrigerante');
      setActiveType(null);
      setActiveElement(null);
    } else {
      setActiveType(null);
      setActiveElement(null);
    }
  };

  // Si el usuario tiene sus propios precios en Tarifas, manda el suyo: los del
  // catálogo son de fábrica y están ahí para que salga una cifra el primer día.
  const precioDe = useCallback((tipo) => {
    const def = elementoDe(tipo);
    if (!def) return null;
    const t = tarifas.find((x) => `${x.description || ''} ${x.name || ''}`.toLowerCase().includes(def.label.toLowerCase()));
    return t?.unit_price ?? null;
  }, [tarifas]);

  const presupuesto = useMemo(() => presupuestoAproximado(plan, precioDe), [plan, precioDe]);

  // Los elementos personalizados se normalizan a la misma forma que los del
  // catálogo de fábrica, y se agrupan por su apartado para la paleta y los
  // menús a pantalla completa.
  const extraItems = useMemo(() => catalogoExtra.map((r) => ({
    id: 'custom_' + r.id, cat: r.cat, label: r.name,
    w_m: r.w_m || 0.6, h_m: r.h_m || 0.6,
    glyph: r.glyph || (r.name || '').slice(0, 3).toUpperCase(),
    precio: r.precio || 0, image_url: r.image_url, _custom: true,
  })), [catalogoExtra]);
  const extraPorCat = useMemo(() => {
    const out = {};
    extraItems.forEach((it) => { (out[it.cat] = out[it.cat] || []).push(it); });
    return out;
  }, [extraItems]);

  const selectedElement = plan.elements.find((e) => e.id === selectedId) || null;
  const selectedConnection = plan.connections.find((c) => c.id === selectedId) || null;
  const selectedWall = !selectedElement && !selectedConnection ? plan.walls.find((w) => w.id === selectedId) || null : null;

  // Estado de los botones de edición (deshacer/rehacer/copiar/pegar). canUndo
  // y canRedo leen los refs; histTick fuerza el repintado cuando cambian.
  void histTick;
  const canUndo = historial.current.length > 0;
  const canRedo = futuro.current.length > 0;
  const canCopy = !!(selectedElement || selectedWall || selectedConnection);
  const canPaste = !!portapapeles;

  const actualizarElemento = (patch) => {
    setPlan((p) => ({ ...p, elements: p.elements.map((e) => e.id === selectedId ? { ...e, ...patch } : e) }));
  };

  // Mover el equipo seleccionado en pasos finos (0,1 m). Lo usa el pad flotante
  // que aparece sobre el lienzo al seleccionar: en el móvil arrastrar con el
  // dedo es difícil de afinar, y así el ajuste siempre está a mano.
  const moverElemento = (dx, dy) => {
    if (!selectedElement) return;
    actualizarElemento({ x: (selectedElement.x || 0) + dx, y: (selectedElement.y || 0) + dy });
  };

  const actualizarConexion = (patch) => {
    setPlan((p) => ({ ...p, connections: p.connections.map((c) => c.id === selectedId ? { ...c, ...patch } : c) }));
  };

  const borrarSeleccion = () => {
    if (!selectedId) return;
    setPlan((p) => ({
      ...p,
      elements: p.elements.filter((e) => e.id !== selectedId),
      walls: p.walls.filter((w) => w.id !== selectedId),
      connections: p.connections.filter((c) => c.id !== selectedId),
    }));
    setSelectedId(null);
  };

  const nuevoPlano = () => {
    setPlan({ ...PLANO_VACIO });
    setSelectedId(null);
    setMode('select');
    resetHistorial();
  };

  const cargarPlano = (id) => {
    if (!id) { nuevoPlano(); return; }
    const p = planos.find((x) => x.id === id);
    if (p) { setPlan({ ...PLANO_VACIO, ...p, connections: p.connections || [] }); setSelectedId(null); setMode('select'); resetHistorial(); }
  };

  const guardar = async () => {
    if (!plan.name.trim()) { toast.error('Dale un nombre al plano'); return; }
    setSaving(true);
    try {
      const payload = {
        name: plan.name, contact_id: plan.contact_id, contact_name: plan.contact_name,
        description: plan.description, scale: plan.scale, walls: plan.walls,
        elements: plan.elements, connections: plan.connections, observations: plan.observations, status: plan.status,
      };
      if (plan.id) {
        await base44.entities.RefrigerationPlan.update(plan.id, payload);
        toast.success('Plano actualizado');
      } else {
        const created = await base44.entities.RefrigerationPlan.create(payload);
        setPlan((p) => ({ ...p, id: created.id }));
        toast.success('Plano guardado');
      }
      cargarDatos();
    } catch (e) {
      console.error(e); toast.error('No se pudo guardar', { description: String(e?.message || e) });
    } finally { setSaving(false); }
  };

  const borrarPlano = async () => {
    if (!plan.id) return;
    if (!confirm('¿Borrar este plano? No se puede deshacer.')) return;
    try {
      await base44.entities.RefrigerationPlan.delete(plan.id);
      toast.success('Plano borrado');
      nuevoPlano();
      cargarDatos();
    } catch (e) { toast.error('No se pudo borrar'); }
  };

  const autoConectarPlano = () => {
    const nuevas = autoConectar(plan.elements, plan.connections);
    if (nuevas.length === 0) {
      toast.info('No hay conexiones nuevas que añadir', { description: 'Coloca evaporadores, condensadores, grupos de frío o un cuadro eléctrico para auto-conectar.' });
      return;
    }
    setPlan((p) => ({ ...p, connections: [...p.connections, ...nuevas] }));
    toast.success(`${nuevas.length} conexiones añadidas`, { description: 'Revisa los diámetros y tipos en el panel de detalles.' });
  };

  const onExportarPDF = () => {
    try { exportarPDF(plan, plan.elements, plan.walls, plan.connections, presupuesto); toast.success('PDF generado'); }
    catch (e) { console.error(e); toast.error('No se pudo generar el PDF', { description: String(e?.message || e) }); }
  };
  const onImprimir = () => {
    try { imprimirPlano(plan, plan.elements, plan.walls, plan.connections, presupuesto); }
    catch (e) { console.error(e); toast.error('No se pudo abrir la impresión', { description: String(e?.message || e) }); }
  };

  const onEsquemaElectrico = () => {
    const hayElec = plan.connections.some((c) => c.type === 'electrica');
    if (!hayElec && !plan.elements.some((e) => e.type === 'cuadro_electrico')) {
      toast.error('No hay conexiones eléctricas', { description: 'Usa «Conectar» · «Eléctrica» entre los equipos para dibujar el esquema.' });
      return;
    }
    try { exportarEsquemaElectrico(plan, plan.elements, plan.connections, empresa); toast.success('Esquema eléctrico generado'); }
    catch (e) { console.error(e); toast.error('No se pudo generar el esquema', { description: String(e?.message || e) }); }
  };
  const onImprimirEsquema = () => {
    try { imprimirEsquemaElectrico(plan, plan.elements, plan.connections, empresa); }
    catch (e) { console.error(e); toast.error('No se pudo imprimir el esquema', { description: String(e?.message || e) }); }
  };

  const limpiarPlano = () => {
    if (!plan.elements.length && !plan.walls.length && !plan.connections.length) return;
    if (!confirm('¿Borrar todo lo dibujado en este plano? No se puede deshacer.')) return;
    setPlan((p) => ({ ...p, walls: [], elements: [], connections: [] }));
    setSelectedId(null);
    toast.success('Plano limpiado');
  };

  // ── Enviar el PDF por Gmail al cliente ───────────────────────────────────
  const enviarPorGmail = async () => {
    if (!gmailForm.to.trim()) { toast.error('Indica el correo del cliente'); return; }
    setEnviando(true);
    try {
      const doc = construirPDF(plan, plan.elements, plan.walls, plan.connections);
      const dataUri = doc.output('datauristring');
      const pdfBase64 = dataUri.split(',')[1];
      const filename = (plan.name || 'plano_frigorifico').replace(/[^\w\-]+/g, '_');
      const res = await base44.functions.invoke('enviarPlanoPorGmail', {
        to: gmailForm.to.trim(),
        subject: gmailForm.subject.trim() || `Plano frigorífico — ${plan.name || 'instalación'}`,
        body: gmailForm.body.trim() || `Hola,\n\nAdjunto el plano frigorífico de la instalación${plan.contact_name ? ' de ' + plan.contact_name : ''}.\n\nUn saludo.`,
        pdf_base64: pdfBase64,
        filename,
        contact_id: plan.contact_id,
      });
      if (res?.data?.ok) {
        toast.success('Plano enviado por Gmail', { description: `Enviado a ${gmailForm.to}` });
        setGmailDialog(false);
        if (plan.id) {
          base44.entities.RefrigerationPlan.update(plan.id, { status: 'enviado' })
            .then(() => setPlan((p) => ({ ...p, status: 'enviado' }))).catch(() => {});
        }
      } else {
        toast.error('No se pudo enviar', { description: res?.data?.error || 'Gmail rechazó el envío' });
      }
    } catch (e) {
      console.error(e); toast.error('No se pudo enviar el correo', { description: String(e?.message || e) });
    } finally { setEnviando(false); }
  };

  // ── Generar presupuesto con IA ──────────────────────────────────────────
  const generarPresupuestoIA = async () => {
    if (!plan.contact_id) { toast.error('Vincula un cliente antes de generar el presupuesto'); return; }
    if (plan.elements.length === 0 && plan.walls.length === 0) { toast.error('Añade equipos o paredes al plano'); return; }
    setGenerating(true);
    try {
      const conteo = {};
      plan.elements.forEach((el) => {
        const k = el.label || el.type;
        conteo[k] = (conteo[k] || 0) + (parseInt(el.qty) || 1);
      });
      const lista = Object.entries(conteo).map(([k, v]) => `- ${k}: ${v} ud(s)`).join('\n');
      const metrosPared = plan.walls.reduce((s, w) => s + Math.hypot(w.x2 - w.x1, w.y2 - w.y1), 0) / (plan.scale || 50);
      const { tub } = resumenTuberias(plan.connections, plan.elements, plan.scale);
      const tubStr = tub.length
        ? '\nTuberías refrigerantes:\n' + tub.map((c, i) => {
            const a = plan.elements.find((e) => e.id === c.from_id), b = plan.elements.find((e) => e.id === c.to_id);
            const L = Math.hypot(a.x - b.x, a.y - b.y) / (plan.scale || 50);
            return `- ${i + 1}. ${(a?.label) || '?'} → ${(b?.label) || '?'}: ${L.toFixed(1)} m · gas ${c.gas_diameter || '—'} · líquido ${c.liquid_diameter || '—'}`;
          }).join('\n')
        : '';

      const prompt = `Eres un instalador frigorífico senior en España (año 2026). Genera un presupuesto aproximado para una instalación frigorífica a partir del plano técnico.

Cliente: ${plan.contact_name}
Descripción: ${plan.description || 'Instalación frigorífica'}
Equipos / elementos del plano (cantidades):
${lista}
Metros lineales de pared/obra: ${metrosPared.toFixed(1)} m${tubStr}
Tubería frigorífica dibujada: ${presupuesto.metrosTuberia} m · línea eléctrica: ${presupuesto.metrosCable} m
Cálculo aproximado del programa (material + 35 % de mano de obra): ${presupuesto.materiales} € + ${presupuesto.manoObra} € = ${presupuesto.total} €

Parte de ese cálculo y corrígelo donde haga falta. Incluye conceptos de mano de obra, materiales, aparamenta eléctrica y de seguridad necesaria, desplazamiento y puesta en marcha. Precios en euros SIN IVA (21% aparte), realistas para España. Devuelve un JSON con "items" (cada uno con description, quantity y unit_price) y "observations" (resumen técnico breve de 1-3 líneas).`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  description: { type: 'string' },
                  quantity: { type: 'number' },
                  unit_price: { type: 'number' },
                },
                required: ['description', 'quantity', 'unit_price'],
              },
            },
            observations: { type: 'string' },
          },
          required: ['items'],
        },
      });

      const items = (res.items || []).map((it) => ({
        description: it.description, quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0, discount: 0,
        total: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
      }));
      const subtotal = items.reduce((s, it) => s + it.total, 0);
      const iva_rate = 21;
      const iva_amount = Math.round(subtotal * iva_rate) / 100;
      const total = subtotal + iva_amount;

      const existentes = await base44.entities.Invoice.filter({ doc_type: 'presupuesto' }, { limit: 1000 }).catch(() => ({ items: [] }));
      const doc_number = getNextAvailableNumber((existentes?.items || []).map((d) => d.doc_number || ''));

      await base44.entities.Invoice.create({
        doc_type: 'presupuesto', doc_number, contact_id: plan.contact_id, contact_name: plan.contact_name,
        date: format(new Date(), 'yyyy-MM-dd'), status: 'borrador', work_type: 'refrigeracion_industrial',
        items, subtotal, iva_rate, iva_amount, total,
        observations: (res.observations || '') + `\nGenerado automáticamente desde el plano «${plan.name}». Revista precios antes de enviar.`,
      });

      toast.success(`Presupuesto creado`, {
        description: `${total.toFixed(2)} € · revísalo en Documentos`,
        action: { label: 'Abrir', onClick: () => navigate('/Documents?type=presupuesto') },
      });
    } catch (e) {
      console.error(e); toast.error('No se pudo generar el presupuesto', { description: String(e?.message || e) });
    } finally { setGenerating(false); }
  };

  // Controles de cuadrícula, movimiento y capas: se reutilizan tal cual en
  // modo normal y en pantalla completa.
  const Controles = (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
      <div className="flex items-center gap-1.5 text-xs">
        <Grid3x3 className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Cuadrícula</span>
        {[1, 0.5].map((g) => (
          <button key={g} onClick={() => setGridMeters(g)}
            className="rounded-md border px-2 py-1 text-xs transition-all"
            style={gridMeters === g ? { borderColor: 'hsl(var(--primary))', background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
            {g} m
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-muted-foreground">Movimiento</span>
        <button onClick={() => setSnapMode('libre')}
          className="rounded-md border px-2 py-1 text-xs transition-all"
          style={snapMode === 'libre' ? { borderColor: 'hsl(var(--primary))', background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
          Libre (0,1 m)
        </button>
        <button onClick={() => setSnapMode('cuadricula')}
          className="rounded-md border px-2 py-1 text-xs transition-all"
          style={snapMode === 'cuadricula' ? { borderColor: 'hsl(var(--primary))', background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
          A cuadrícula
        </button>
      </div>
      <div className="w-px h-6 bg-border" />
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Capas</span>
        {CAPAS.map((capa) => {
          const on = capasVisibles[capa.id] !== false;
          return (
            <button key={capa.id} onClick={() => setCapasVisibles((v) => ({ ...v, [capa.id]: !on }))}
              className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-all"
              style={{ borderColor: on ? capa.color : 'hsl(var(--border))', color: on ? capa.color : 'hsl(var(--muted-foreground))', background: on ? capa.color + '15' : 'transparent' }}>
              {on ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {capa.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Panel lateral: detalles del elemento, descripción, presupuesto y leyenda.
  const PanelLateral = (
    <div className="rounded-lg border border-border bg-card p-3 overflow-y-auto min-h-0 h-full">
      <PlanoEquipoDetalles
        element={selectedElement} connection={selectedConnection} wall={selectedWall}
        elements={plan.elements} scale={plan.scale}
        onUpdate={selectedConnection ? actualizarConexion : actualizarElemento}
        onDelete={borrarSeleccion}
        onEditarSala={(roomId) => {
          const ref = plan.walls.find((w) => w.room_id === roomId);
          if (ref) setDialogoSala({ roomId, ancho: ref.room_w_m, largo: ref.room_h_m });
        }}
        onBorrarSala={borrarSala}
        onEditarCamara={(roomId) => {
          const ref = plan.walls.find((w) => w.room_id === roomId && w.camara);
          if (ref) setDialogoCamara({ roomId, ancho: ref.room_w_m, largo: ref.room_h_m, tipo: ref.tipo, suelo: ref.suelo, espesor: ref.espesor_mm });
        }}
        onBorrarCamara={borrarCamara} />
      <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-muted-foreground">Descripción del proyecto</span>
          <textarea value={plan.description || ''} onChange={(e) => setPlan((p) => ({ ...p, description: e.target.value }))}
            rows={2} className="rounded-md border border-border bg-input px-2 py-1 text-xs resize-none" />
        </label>
        <div className="text-[10px] text-muted-foreground">
          {plan.elements.length} elementos · {plan.walls.length} paredes · {plan.connections.length} conexiones
        </div>
        <div className="rounded-lg border border-border p-2" data-prueba="presupuesto-plano">
          <div className="tech-label mb-1.5">💶 Presupuesto aproximado</div>
          {presupuesto.lineas.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">
              Coloca equipos y tira tuberías: la cifra va saliendo aquí sola.
            </p>
          ) : (
            <>
              <div className="flex max-h-32 flex-col gap-0.5 overflow-y-auto">
                {presupuesto.lineas.map((l, i) => (
                  <div key={i} className="flex justify-between gap-2 text-[10px]">
                    <span className="truncate text-muted-foreground">
                      {l.unidades}{l.unidad ? ` ${l.unidad}` : '×'} {l.concepto}
                    </span>
                    <span className="font-mono">{l.total.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div className="mt-1.5 flex flex-col gap-0.5 border-t border-border pt-1.5 text-[10px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Material</span><span className="font-mono">{presupuesto.materiales.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Mano de obra (35 %)</span><span className="font-mono">{presupuesto.manoObra.toFixed(2)} €</span></div>
                <div className="flex justify-between text-xs font-bold"><span>Total</span><span className="font-mono">{presupuesto.total.toFixed(2)} €</span></div>
              </div>
              <p className="mt-1.5 flex gap-1 text-[9px] leading-snug text-amber-600">
                <AlertTriangle className="mt-0.5 h-2.5 w-2.5 flex-shrink-0" />{presupuesto.aviso}
              </p>
            </>
          )}
        </div>
        <LeyendaPlano />

        {/* Visor 3D en miniatura, debajo de la leyenda: al tocarlo se abre
            en grande. El botón "Visor 3D" de la barra superior también lo
            abre directamente a tamaño completo. */}
        <button type="button" onClick={() => setVer3D(true)}
          className="group w-full rounded-lg border border-border p-2 text-left hover:border-primary/40 transition-colors"
          title="Ampliar visor 3D">
          <div className="flex items-center justify-between mb-1">
            <span className="tech-label">Visor 3D</span>
            <span className="text-[10px] text-primary group-hover:underline">Ampliar ↗</span>
          </div>
          <Vista3DPlanoFrigorifico walls={plan.walls} elements={plan.elements} scale={plan.scale} compact />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
            <span className="text-black font-bold text-sm">PF</span>
          </div>
          <div>
            <h1 className="text-lg font-bold">Planos Frigoríficos</h1>
            <p className="text-xs text-muted-foreground">Diseña la instalación y genera el presupuesto con IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={nuevoPlano} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted">
            <Plus className="w-4 h-4" /> Nuevo
          </button>
          <button onClick={guardar} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={generarPresupuestoIA} disabled={generating}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-black hover:opacity-90 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
            <Sparkles className="w-4 h-4" /> {generating ? 'Generando…' : 'Presupuesto IA'}
          </button>
        </div>
      </div>

      {/* Segunda fila de acciones: auto-conectar, polilínea, PDF, CAD, imprimir, Gmail */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={autoConectarPlano} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <Link2 className="w-3.5 h-3.5" /> Auto-conectar
        </button>
        <button onClick={() => setDialogoCatalogo(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}
          title="Añadir un elemento o maquinaria propia al catálogo">
          <Plus className="w-3.5 h-3.5" /> Añadir elemento
          </button>
        <button onClick={() => setPolyline((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
          style={polyline
            ? { borderColor: '#00A0E9', background: '#00A0E922', color: '#00A0E9', fontWeight: 600 }
            : { borderColor: 'hsl(var(--border))' }}>
          <Spline className="w-3.5 h-3.5" /> {polyline ? 'Polilínea ON' : 'Polilínea (codos)'}
        </button>
        <div className="w-px h-5 bg-border mx-0.5" />
        <button onClick={() => setFullscreen((v) => !v)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white hover:opacity-90"
          style={{ background: '#0f172a' }}>
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {fullscreen ? 'Salir pantalla' : 'Pantalla completa'}
        </button>
        <button onClick={onExportarPDF} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
        <button onClick={() => exportarDXF(plan, plan.elements, plan.walls, plan.connections)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <FileBox className="w-3.5 h-3.5" /> CAD (DXF)
        </button>
        <button onClick={onEsquemaElectrico} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
          title="Esquema eléctrico de la instalación (para adjuntar al informe)">
          <Zap className="w-3.5 h-3.5" /> Esquema eléctrico
        </button>
        <button onClick={onImprimir} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <Printer className="w-3.5 h-3.5" /> Imprimir
        </button>
        <button onClick={() => setInformeDialog(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white hover:opacity-90"
          style={{ background: '#2563eb' }}>
          <ShieldCheck className="w-3.5 h-3.5" /> Informe aseguradora
        </button>
        <button onClick={borrarSeleccion} disabled={!selectedId}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-40">
          <Eraser className="w-3.5 h-3.5" /> Borrar selección
        </button>
        <button onClick={limpiarPlano}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" /> Limpiar plano
        </button>
        <button onClick={() => setGmailDialog(true)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white hover:opacity-90"
          style={{ background: '#D44638' }}>
          <Mail className="w-3.5 h-3.5" /> Enviar por Gmail
        </button>
        {plan.id && (
          <button onClick={borrarPlano} className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 ml-auto">
            <Trash2 className="w-3.5 h-3.5" /> Borrar plano
          </button>
        )}
      </div>

      {/* Barra superior: plano, cliente, escala */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">Plano</label>
          <select
            value={plan.id || ''}
            onChange={(e) => cargarPlano(e.target.value)}
            className="rounded-lg border border-border bg-input px-2 py-2 text-xs">
            <option value="">— Nuevo plano —</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.contact_name ? ` · ${p.contact_name}` : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">Cliente</label>
          <BuscadorCliente contacts={contacts} value={plan.contact_id}
            onValueChange={(id) => {
              const c = contacts.find((x) => x.id === id);
              setPlan((p) => ({ ...p, contact_id: id, contact_name: c ? (c.full_name || c.name || c.company || '') : '' }));
            }}
            placeholder="Vincula un cliente…" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground">Nombre del plano · escala (px/m)</label>
          <div className="flex gap-1.5">
            <input value={plan.name} onChange={(e) => setPlan((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ej. Cámara frigorífica nave 3"
              className="flex-1 rounded-lg border border-border bg-input px-2 py-2 text-xs" />
            <select value={plan.scale} onChange={(e) => setPlan((p) => ({ ...p, scale: parseInt(e.target.value) }))}
              className="rounded-lg border border-border bg-input px-2 py-2 text-xs">
              {[30, 50, 80, 100].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <PantallaCompleta open={fullscreen} onClose={() => setFullscreen(false)}>
        {fullscreen ? (
          // ── Pantalla completa real: barra superior con menús y el lienzo a
          //    toda la superficie. Sin scroll para alcanzar las herramientas.
          <div className="flex flex-col gap-2 min-h-0 flex-1">
            <PlanoBarraSuperior
              mode={mode} activeType={activeType} connectType={connectType} onPick={onPick}
              onSala={() => setDialogoSala({ nuevo: true })}
              onCamara={() => setDialogoCamara({ nuevo: true })}
              onUndo={undo} onRedo={redo} onCopy={copiar} onCut={cortar} onPaste={pegar}
              canUndo={canUndo} canRedo={canRedo} canCopy={canCopy} canPaste={canPaste}
              saving={saving} onSave={guardar} onPDF={onExportarPDF}
              on3D={() => setVer3D(true)} onExit={() => setFullscreen(false)}
              extraPorCat={extraPorCat} onAddElement={() => setDialogoCatalogo(true)} />

            {/* Visor 3D justo debajo de la barra de herramientas avanzada:
                una tira compacta de la instalación. Al tocarla se abre en
                grande. En móvil se oculta para dejar todo el sitio al lienzo:
                el botón "Visor 3D" y la miniatura del panel lo abren igual. */}
            <div className="hidden sm:block rounded-lg border border-border bg-card p-1.5">
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="tech-label flex items-center gap-1">
                  <Box className="w-3 h-3" style={{ color: '#7C3AED' }} /> Visor 3D
                </span>
                <button onClick={() => setVer3D(true)} className="text-[10px] text-primary hover:underline">Ampliar ↗</button>
              </div>
              <div className="max-h-[150px] overflow-hidden rounded-md">
                <Vista3DPlanoFrigorifico walls={plan.walls} elements={plan.elements} scale={plan.scale} compact canvasH={150} canvasW={900} />
              </div>
            </div>

            {Controles}
            {/* Layout flexible para que el lienzo ocupe el espacio disponible y
                el panel lateral se vea también en móvil y tablet. Antes usaba
                grid: en pantalla completa el lienzo colapsaba a altura 0 porque
                la celda no tenía alto definido y el SVG no se veía. */}
            <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
              <div className="flex-1 min-h-0 h-[55vh] lg:h-auto">
                <PlanoCanvas
                  walls={plan.walls} elements={plan.elements} connections={plan.connections}
                  selectedId={selectedId} mode={mode} activeElement={activeElement} connectType={connectType}
                  polyline={polyline} scale={plan.scale} gridMeters={gridMeters} snapMode={snapMode}
                  capasVisibles={capasVisibles} onChange={handleChange} onConexionCreada={onConexionCreada} fullscreen />
              </div>
              <div className="lg:w-[300px] lg:flex-shrink-0 lg:max-h-none">
                {PanelLateral}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <PlanoPaleta mode={mode} activeType={activeType} connectType={connectType} onPick={onPick}
                onSala={() => setDialogoSala({ nuevo: true })}
                onCamara={() => setDialogoCamara({ nuevo: true })}
                onUndo={undo} onRedo={redo} onCopy={copiar} onCut={cortar} onPaste={pegar}
                canUndo={canUndo} canRedo={canRedo} canCopy={canCopy} canPaste={canPaste}
                extraElementos={extraItems} onAddElement={() => setDialogoCatalogo(true)} />
            </div>
            {Controles}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3">
              <PlanoCanvas
                walls={plan.walls} elements={plan.elements} connections={plan.connections}
                selectedId={selectedId} mode={mode} activeElement={activeElement} connectType={connectType}
                polyline={polyline} scale={plan.scale} gridMeters={gridMeters} snapMode={snapMode}
                capasVisibles={capasVisibles} onChange={handleChange} onConexionCreada={onConexionCreada} fullscreen={false} />
              {PanelLateral}
            </div>
          </div>
        )}
      </PantallaCompleta>

      {/* Pad de movimiento flotante: aparece al seleccionar un equipo para
          ajustar su posición en el móvil sin arrastrar. */}
      {selectedElement && (
        <ControlMoverFlotante
          step={Math.max(2, 0.1 * (plan.scale || 50))}
          onMover={moverElemento}
        />
      )}

      {/* Botón flotante para entrar/salir de pantalla completa: siempre
          accesible aunque el botón de la barra quede fuera de vista. */}
      <button
        onClick={() => setFullscreen((v) => !v)}
        title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
        className="fixed bottom-20 lg:bottom-6 right-4 z-[9998] flex items-center gap-1.5 rounded-full px-3.5 py-3 text-xs font-bold text-white shadow-2xl hover:scale-105 transition-transform"
        style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        {fullscreen ? 'Salir' : 'Pantalla completa'}
      </button>

      {/* Visor 3D de la instalación */}
      {ver3D && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-3 sm:p-4" onClick={() => setVer3D(false)}>
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-xl bg-card border border-border shadow-2xl p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Box className="w-4 h-4" style={{ color: '#7C3AED' }} /> Visor 3D de la instalación
                </h3>
                <p className="text-[11px] text-muted-foreground">Así vería el cliente cómo queda la instalación</p>
              </div>
              <button onClick={() => setVer3D(false)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cerrar</button>
            </div>
            <Vista3DPlanoFrigorifico walls={plan.walls} elements={plan.elements} scale={plan.scale} />
          </div>
        </div>
      )}

      {/* Diálogo: enviar el plano por Gmail */}
      {gmailDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !enviando && setGmailDialog(false)}>
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D44638' }}>
                <Mail className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Enviar plano por Gmail</h3>
                <p className="text-[11px] text-muted-foreground">Se envía desde tu cuenta de Gmail conectada</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Para (correo del cliente)</span>
                <input value={gmailForm.to} onChange={(e) => setGmailForm((f) => ({ ...f, to: e.target.value }))}
                  placeholder="cliente@email.com" type="email"
                  className="rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Asunto</span>
                <input value={gmailForm.subject} onChange={(e) => setGmailForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder={`Plano frigorífico — ${plan.name || 'instalación'}`}
                  className="rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground">Mensaje</span>
                <textarea value={gmailForm.body} onChange={(e) => setGmailForm((f) => ({ ...f, body: e.target.value }))}
                  rows={4} className="rounded-md border border-border bg-input px-2 py-1.5 text-xs resize-none" />
              </label>
              <p className="text-[10px] text-muted-foreground">Se adjuntará el PDF del plano automáticamente.</p>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setGmailDialog(false)} disabled={enviando}
                className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancelar</button>
              <button onClick={enviarPorGmail} disabled={enviando}
                className="rounded-md px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
                style={{ background: '#D44638' }}>
                <Mail className="w-3.5 h-3.5" /> {enviando ? 'Enviando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Informe técnico para aseguradora: genera PDF estructurado con fotos,
          lista de materiales y doble firma a partir del plano actual. */}
      <InformeAseguradoraDialog
        open={informeDialog}
        onClose={() => setInformeDialog(false)}
        plan={plan}
        elements={plan.elements}
        walls={plan.walls}
        connections={plan.connections}
        empresa={empresa}
        contacts={contacts}
      />

      {/* Diálogo para añadir un elemento/maquinaria propia al catálogo del
          plano: se elige el apartado y la IA busca el icono. */}
      <GestorCatalogoPlano
        open={dialogoCatalogo}
        onClose={() => setDialogoCatalogo(false)}
        onSaved={cargarCatalogoExtra}
      />

      {/* Diálogo para dibujar o editar una sala (habitáculo cuadrado o
          rectangular). Pide ancho y largo en metros; al confirmar dibuja las
          cuatro paredes, y al editar, las redibuja con las medidas nuevas. */}
      <DialogoSala
        open={!!dialogoSala}
        valorInicial={dialogoSala && !dialogoSala.nuevo ? { ancho: dialogoSala.ancho, largo: dialogoSala.largo } : null}
        onConfirm={(dims) => dialogoSala?.nuevo ? crearSala(dims) : actualizarSala(dialogoSala.roomId, dims)}
        onClose={() => setDialogoSala(null)} />

      {/* Diálogo para dibujar o editar una cámara frigorífica. Pide medidas,
          tipo (positiva/negativa), suelo sanitario y espesor del panel, y la
          dibuja como un recinto panelado distinto a una pared. */}
      <DialogoCamara
        open={!!dialogoCamara}
        valorInicial={dialogoCamara && !dialogoCamara.nuevo
          ? { ancho: dialogoCamara.ancho, largo: dialogoCamara.largo, tipo: dialogoCamara.tipo, suelo: dialogoCamara.suelo, espesor: dialogoCamara.espesor }
          : null}
        onConfirm={(datos) => dialogoCamara?.nuevo ? crearCamara(datos) : actualizarCamara(dialogoCamara.roomId, datos)}
        onClose={() => setDialogoCamara(null)} />

      {/* Diálogo que pide el diámetro (tubería) o el cable (eléctrica) al
          trazar una línea nueva. */}
      {conexionDialogo && (() => {
        const conn = plan.connections.find((c) => c.id === conexionDialogo.id);
        if (!conn) return null;
        return (
          <DialogoNuevaConexion
            connection={conn} elements={plan.elements} scale={plan.scale}
            onSave={(patch) => actualizarConexionPorId(conn.id, patch)}
            onClose={() => setConexionDialogo(null)} />
        );
      })()}
    </div>
  );
}

// Pantalla completa del editor: cuando está activa, portaliza la paleta, los
// controles y el lienzo sobre el body para que ocupen todo el dispositivo;
// cuando no, los deja en su sitio sin tocar el layout.
function PantallaCompleta({ open, onClose, children }) {
  if (!open) return <>{children}</>;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col gap-2 overflow-hidden"
      style={{
        background: 'hsl(var(--background))',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
        paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 8px)',
        paddingRight: 'calc(env(safe-area-inset-right, 0px) + 8px)',
      }}>
      <div className="flex justify-end">
        <button onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-white hover:opacity-90"
          style={{ background: '#0f172a' }}>
          <Minimize2 className="w-3.5 h-3.5" /> Salir pantalla completa
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto lg:overflow-hidden">{children}</div>
    </div>,
    document.body
  );
}