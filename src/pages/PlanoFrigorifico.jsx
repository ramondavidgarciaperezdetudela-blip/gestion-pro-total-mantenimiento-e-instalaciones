import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Save, Sparkles, FileDown, Printer, Link2, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import BuscadorCliente from '@/components/BuscadorCliente';
import { getNextAvailableNumber } from '@/components/autoNumber';
import PlanoCanvas from '@/components/plano_frigorifico/PlanoCanvas';
import PlanoPaleta from '@/components/plano_frigorifico/PlanoPaleta';
import PlanoEquipoDetalles from '@/components/plano_frigorifico/PlanoEquipoDetalles';
import { exportarPDF, imprimirPlano } from '@/components/plano_frigorifico/PlanoExporter';
import { autoConectar, resumenTuberias } from '@/lib/planoCalculo';
import { CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';

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

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [ps, cs] = await Promise.all([
        base44.entities.RefrigerationPlan.filter({}, { sort: '-created_date', limit: 100 }).catch(() => ({ items: [] })),
        base44.entities.Contact.list({ limit: 500 }).catch(() => []),
      ]);
      setPlanos(ps?.items || []);
      setContacts(cs || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

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
    try { exportarPDF(plan, plan.elements, plan.walls, plan.connections); toast.success('PDF generado'); }
    catch (e) { console.error(e); toast.error('No se pudo generar el PDF', { description: String(e?.message || e) }); }
  };
  const onImprimir = () => {
    try { imprimirPlano(plan, plan.elements, plan.walls, plan.connections); }
    catch (e) { console.error(e); toast.error('No se pudo abrir la impresión', { description: String(e?.message || e) }); }
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

Incluye conceptos de mano de obra, materiales, aparamenta eléctrica y de seguridad necesaria, desplazamiento y puesta en marcha. Precios en euros SIN IVA (21% aparte), realistas para España. Devuelve un JSON con "items" (cada uno con description, quantity y unit_price) y "observations" (resumen técnico breve de 1-3 líneas).`;

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

      {/* Segunda fila de acciones: auto-conectar, PDF, imprimir */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={autoConectarPlano} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <Link2 className="w-3.5 h-3.5" /> Auto-conectar
        </button>
        <button onClick={onExportarPDF} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <FileDown className="w-3.5 h-3.5" /> Exportar PDF
        </button>
        <button onClick={onImprimir} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">
          <Printer className="w-3.5 h-3.5" /> Imprimir
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

      {/* Cuerpo: paleta · lienzo · detalles */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_240px] gap-3">
        <div className="rounded-lg border border-border bg-card p-3 lg:max-h-[70vh] overflow-y-auto">
          <PlanoPaleta mode={mode} activeType={activeType} connectType={connectType} onPick={onPick} />
        </div>

        <PlanoCanvas
          walls={plan.walls} elements={plan.elements} connections={plan.connections}
          selectedId={selectedId} mode={mode} activeElement={activeElement} connectType={connectType}
          scale={plan.scale} onChange={handleChange} />

        <div className="rounded-lg border border-border bg-card p-3 lg:max-h-[70vh] overflow-y-auto">
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
          </div>
        </div>
      </div>
    </div>
  );
}