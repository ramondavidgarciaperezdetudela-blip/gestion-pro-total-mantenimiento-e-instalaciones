import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Save, Sparkles, FileDown, Printer, Link2, Trash2, Mail, Spline, FileBox, AlertTriangle, Grid3x3, Ruler, Eye, EyeOff, ShieldCheck, Maximize2, Minimize2, Eraser, Zap } from 'lucide-react';
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
import LeyendaPlano from '@/components/plano_frigorifico/LeyendaPlano';
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

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

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
        if (p) { setPlan({ ...PLANO_VACIO, ...p, connections: p.connections || [] }); setSelectedId(null); setMode('select'); }
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
    setPlan((p) => ({
      ...p,
      walls: patch.walls !== undefined ? patch.walls : p.walls,
      elements: patch.elements !== undefined ? patch.elements : p.elements,
      connections: patch.connections !== undefined ? patch.connections : p.connections,
    }));
    if (patch.selectedId !== undefined) setSelectedId(patch.selectedId);
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

  const selectedElement = plan.elements.find((e) => e.id === selectedId) || null;
  const selectedConnection = plan.connections.find((c) => c.id === selectedId) || null;
  const selectedWall = !selectedElement && !selectedConnection ? plan.walls.find((w) => w.id === selectedId) || null : null;

  const actualizarElemento = (patch) => {
    setPlan((p) => ({ ...p, elements: p.elements.map((e) => e.id === selectedId ? { ...e, ...patch } : e) }));
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
  };

  const cargarPlano = (id) => {
    if (!id) { nuevoPlano(); return; }
    const p = planos.find((x) => x.id === id);
    if (p) { setPlan({ ...PLANO_VACIO, ...p, connections: p.connections || [] }); setSelectedId(null); setMode('select'); }
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
        <div className="rounded-lg border border-border bg-card p-3">
          <PlanoPaleta mode={mode} activeType={activeType} connectType={connectType} onPick={onPick} />
        </div>

      {/* Controles de cuadrícula, movimiento y capas */}
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

      {/* Cuerpo: lienzo · detalles */}
      <div className={`grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-3 ${fullscreen ? 'flex-1 min-h-0' : ''}`}>
        <PlanoCanvas
          walls={plan.walls} elements={plan.elements} connections={plan.connections}
          selectedId={selectedId} mode={mode} activeElement={activeElement} connectType={connectType}
          polyline={polyline} scale={plan.scale} gridMeters={gridMeters} snapMode={snapMode}
          capasVisibles={capasVisibles} onChange={handleChange} fullscreen={fullscreen} />

        <div className={`rounded-lg border border-border bg-card p-3 overflow-y-auto ${fullscreen ? 'min-h-0 max-h-full' : 'lg:max-h-[70vh]'}`}>
          <PlanoEquipoDetalles
            element={selectedElement} connection={selectedConnection} wall={selectedWall}
            elements={plan.elements} scale={plan.scale}
            onUpdate={selectedConnection ? actualizarConexion : actualizarElemento}
            onDelete={borrarSeleccion} />
          <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground">Descripción del proyecto</span>
              <textarea value={plan.description || ''} onChange={(e) => setPlan((p) => ({ ...p, description: e.target.value }))}
                rows={2} className="rounded-md border border-border bg-input px-2 py-1 text-xs resize-none" />
            </label>
            <div className="text-[10px] text-muted-foreground">
              {plan.elements.length} elementos · {plan.walls.length} paredes · {plan.connections.length} conexiones
            </div>

            {/* Lo que va costando esto mientras se dibuja. No es el presupuesto
                que se manda, es la cifra para hablar con el cliente ahí mismo. */}
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

            {/* Leyenda de símbolos y conexiones, siempre visible en el panel
                lateral para que el dibujo se entienda a pantalla completa. */}
            <LeyendaPlano />
          </div>
        </div>
      </div>
      </PantallaCompleta>

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
      <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">{children}</div>
    </div>,
    document.body
  );
}