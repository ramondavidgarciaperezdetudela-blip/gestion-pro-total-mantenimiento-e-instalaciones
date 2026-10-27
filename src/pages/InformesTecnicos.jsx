import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { ShieldCheck, Plus, Search, FileText, Trash2, Edit3, Printer, Eye, LayoutGrid, List } from 'lucide-react';
import PhotoBlock from '@/components/PhotoBlock';
import DualSignaturePanel from '@/components/DualSignaturePanel';
import BuscadorCliente from '@/components/BuscadorCliente';
import GaleriaInformes from '@/components/GaleriaInformes';
import { getNextAvailableNumber } from '@/components/autoNumber';

const EQUIPOS = [
  { value: 'aire_acondicionado', label: 'Aire acondicionado' },
  { value: 'bomba_calor', label: 'Bomba de calor' },
  { value: 'camara_frigorifica', label: 'Cámara frigorífica' },
  { value: 'electrico', label: 'Eléctrico' },
  { value: 'solar', label: 'Solar' },
  { value: 'fontaneria', label: 'Fontanería' },
  { value: 'otro', label: 'Otro' },
];

const ESTADOS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'firmado', label: 'Firmado' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'cancelado', label: 'Cancelado' },
];

const VACIO = {
  report_number: '', contact_id: '', contact_name: '',
  insurance_company: '', insurance_policy: '', insurance_claim_ref: '',
  claim_date: '', report_date: new Date().toISOString().slice(0, 10),
  technician: '', equipment_type: 'otro', equipment_brand: '', equipment_model: '',
  equipment_serial: '', location: '', failure_description: '', damage_assessment: '',
  cause_analysis: '', repair_proposal: '', repair_viable: 'pendiente_valoracion',
  estimated_cost: 0, photos_before: [], photos_after: [], photos_damage: [],
  materials_used: [], labor_hours: 0, labor_rate: 0, total: 0, observations: '',
  signature_technician: '', signature_client: '',
  sign_datetime_technician: '', sign_datetime_client: '', status: 'borrador',
};

const hoy = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

export default function InformesTecnicos() {
  const [informes, setInformes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [vista, setVista] = useState('lista'); // lista | form | preview
  const [modoLista, setModoLista] = useState('lista'); // lista | galeria
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [contacto, setContacto] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const r = await base44.entities.InsuranceReport.list('-report_date', 100);
      setInformes(Array.isArray(r) ? r : (r?.items || []));
    } catch (e) {
      setInformes([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const setCampo = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const totalCalculado = useMemo(() => {
    const mats = (form.materials_used || []).reduce((s, m) => s + (Number(m.quantity) || 0) * (Number(m.unit_price) || 0), 0);
    const mo = (Number(form.labor_hours) || 0) * (Number(form.labor_rate) || 0);
    return mats + mo + (Number(form.estimated_cost) || 0);
  }, [form.materials_used, form.labor_hours, form.labor_rate, form.estimated_cost]);

  const nuevo = () => {
    setEditando(null);
    setForm({ ...VACIO, report_date: new Date().toISOString().slice(0, 10) });
    setContacto(null);
    setVista('form');
  };

  const editar = (inf) => {
    setEditando(inf);
    setForm({ ...VACIO, ...inf });
    setContacto(inf.contact_id ? { id: inf.contact_id, name: inf.contact_name } : null);
    setVista('form');
  };

  const guardar = async () => {
    if (!form.contact_name) { toast.error('Indica el cliente/asegurado'); return; }
    if (!form.failure_description) { toast.error('Describe la avería/siniestro'); return; }
    setGuardando(true);
    try {
      const numeros = informes.map((i) => (i.report_number || '').replace(/\D/g, '')).filter(Boolean);
      const numero = 'IT-' + getNextAvailableNumber(numeros, 4);
      const payload = {
        ...form,
        report_number: form.report_number || numero,
        report_datetime: form.report_datetime || hoy(),
        total: totalCalculado,
      };
      // limpiar campos internos
      delete payload._id; delete payload.created_date; delete payload.updated_date; delete payload.created_by_id;
      if (editando) {
        await base44.entities.InsuranceReport.update(editando.id, payload);
        toast.success('Informe actualizado');
      } else {
        await base44.entities.InsuranceReport.create(payload);
        toast.success('Informe creado');
      }
      await cargar();
      setVista('lista');
    } catch (e) {
      toast.error('No se pudo guardar el informe: ' + (e?.message || ''));
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (inf) => {
    if (!confirm(`¿Eliminar el informe ${inf.report_number || ''} de ${inf.contact_name}?`)) return;
    try {
      await base44.entities.InsuranceReport.delete(inf.id);
      toast.success('Informe eliminado');
      cargar();
    } catch (e) {
      toast.error('No se pudo eliminar: ' + (e?.message || ''));
    }
  };

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    return informes.filter((i) => {
      if (filtroEstado && i.status !== filtroEstado) return false;
      if (!q) return true;
      const txt = `${i.report_number || ''} ${i.contact_name || ''} ${i.insurance_company || ''} ${i.insurance_claim_ref || ''} ${i.equipment_brand || ''}`.toLowerCase();
      return txt.includes(q);
    });
  }, [informes, busqueda, filtroEstado]);

  // ─── VISTA PREVIA / IMPRESIÓN ───────────────────────────────────
  if (vista === 'preview' && editando) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 print:hidden">
          <button onClick={() => setVista('lista')} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>← Volver</button>
          <button onClick={() => window.print()} className="text-sm px-3 py-1.5 rounded-lg flex items-center gap-1" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}><Printer className="w-4 h-4" /> Imprimir</button>
        </div>
        <InformePreview inf={editando} />
      </div>
    );
  }

  // ─── FORMULARIO ─────────────────────────────────────────────────
  if (vista === 'form') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} /> {editando ? 'Editar' : 'Nuevo'} informe técnico (aseguradora)</h2>
          <button onClick={() => setVista('lista')} className="text-sm px-3 py-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }}>← Cancelar</button>
        </div>

        {/* Datos aseguradora */}
        <Seccion titulo="Datos de la aseguradora">
          <Campo label="Compañía aseguradora"><input value={form.insurance_company} onChange={(e) => setCampo('insurance_company', e.target.value)} className="inp" /></Campo>
          <Campo label="Nº de póliza"><input value={form.insurance_policy} onChange={(e) => setCampo('insurance_policy', e.target.value)} className="inp" /></Campo>
          <Campo label="Nº de siniestro / ref."><input value={form.insurance_claim_ref} onChange={(e) => setCampo('insurance_claim_ref', e.target.value)} className="inp" /></Campo>
          <Campo label="Fecha del siniestro"><input type="date" value={form.claim_date || ''} onChange={(e) => setCampo('claim_date', e.target.value)} className="inp" /></Campo>
        </Seccion>

        {/* Cliente */}
        <Seccion titulo="Cliente / Asegurado">
          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Cliente</label>
            <BuscadorCliente
              value={contacto}
              onChange={(c) => { setContacto(c); setCampo('contact_id', c?.id || ''); setCampo('contact_name', c?.name || ''); }}
              placeholder="Buscar cliente..."
            />
          </div>
          <Campo label="Técnico responsable"><input value={form.technician} onChange={(e) => setCampo('technician', e.target.value)} className="inp" /></Campo>
          <Campo label="Fecha del informe"><input type="date" value={form.report_date} onChange={(e) => setCampo('report_date', e.target.value)} className="inp" /></Campo>
        </Seccion>

        {/* Equipo */}
        <Seccion titulo="Equipo inspeccionado">
          <Campo label="Tipo de equipo">
            <select value={form.equipment_type} onChange={(e) => setCampo('equipment_type', e.target.value)} className="inp">
              {EQUIPOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Campo>
          <Campo label="Marca"><input value={form.equipment_brand} onChange={(e) => setCampo('equipment_brand', e.target.value)} className="inp" /></Campo>
          <Campo label="Modelo"><input value={form.equipment_model} onChange={(e) => setCampo('equipment_model', e.target.value)} className="inp" /></Campo>
          <Campo label="Nº de serie"><input value={form.equipment_serial} onChange={(e) => setCampo('equipment_serial', e.target.value)} className="inp" /></Campo>
          <div className="md:col-span-2">
            <Campo label="Ubicación / dirección"><input value={form.location} onChange={(e) => setCampo('location', e.target.value)} className="inp" /></Campo>
          </div>
        </Seccion>

        {/* Valoración técnica */}
        <Seccion titulo="Valoración técnica">
          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Descripción de la avería / siniestro</label>
            <textarea rows={3} value={form.failure_description} onChange={(e) => setCampo('failure_description', e.target.value)} className="inp" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Valoración de daños</label>
            <textarea rows={3} value={form.damage_assessment} onChange={(e) => setCampo('damage_assessment', e.target.value)} className="inp" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Análisis de la causa</label>
            <textarea rows={3} value={form.cause_analysis} onChange={(e) => setCampo('cause_analysis', e.target.value)} className="inp" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Propuesta de reparación</label>
            <textarea rows={3} value={form.repair_proposal} onChange={(e) => setCampo('repair_proposal', e.target.value)} className="inp" />
          </div>
          <Campo label="¿Reparable?">
            <select value={form.repair_viable} onChange={(e) => setCampo('repair_viable', e.target.value)} className="inp">
              <option value="pendiente_valoracion">Pendiente de valoración</option>
              <option value="reparable">Reparable</option>
              <option value="irreparable">Irreparable</option>
            </select>
          </Campo>
          <Campo label="Coste estimado (€)"><input type="number" value={form.estimated_cost} onChange={(e) => setCampo('estimated_cost', Number(e.target.value))} className="inp" /></Campo>
          <Campo label="Horas mano de obra"><input type="number" value={form.labor_hours} onChange={(e) => setCampo('labor_hours', Number(e.target.value))} className="inp" /></Campo>
          <Campo label="Tarifa hora (€)"><input type="number" value={form.labor_rate} onChange={(e) => setCampo('labor_rate', Number(e.target.value))} className="inp" /></Campo>
          <div className="md:col-span-2">
            <label className="text-xs font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>Observaciones</label>
            <textarea rows={2} value={form.observations} onChange={(e) => setCampo('observations', e.target.value)} className="inp" />
          </div>
          <div className="md:col-span-2 text-sm tabular" style={{ color: 'hsl(var(--primary))' }}>
            Total estimado: <strong>{totalCalculado.toFixed(2)} €</strong>
          </div>
        </Seccion>

        {/* Fotos */}
        <Seccion titulo="Fotografía del estado">
          <div className="md:col-span-2"><PhotoBlock label="Fotos ANTES de la reparación" photos={form.photos_before} onChange={(v) => setCampo('photos_before', v)} /></div>
          <div className="md:col-span-2"><PhotoBlock label="Fotos DESPUÉS de la reparación" photos={form.photos_after} onChange={(v) => setCampo('photos_after', v)} /></div>
          <div className="md:col-span-2"><PhotoBlock label="Fotos del detalle del daño/siniestro" photos={form.photos_damage} onChange={(v) => setCampo('photos_damage', v)} /></div>
        </Seccion>

        {/* Firmas */}
        <Seccion titulo="Firmas con fecha y hora">
          <div className="md:col-span-2">
            <DualSignaturePanel
              firmaTecnico={form.signature_technician} setFirmaTecnico={(v) => setCampo('signature_technician', v)}
              firmaCliente={form.signature_client} setFirmaCliente={(v) => setCampo('signature_client', v)}
              fechaTecnico={form.sign_datetime_technician} fechaCliente={form.sign_datetime_client}
              setFechaTecnico={(v) => setCampo('sign_datetime_technician', v)} setFechaCliente={(v) => setCampo('sign_datetime_client', v)}
            />
          </div>
          <Campo label="Estado">
            <select value={form.status} onChange={(e) => setCampo('status', e.target.value)} className="inp">
              {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Campo>
        </Seccion>

        {/* Guardar */}
        <div className="flex gap-2 print:hidden">
          <button onClick={guardar} disabled={guardando} className="px-4 py-2 rounded-lg text-sm flex items-center gap-2" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            {guardando ? <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} /> : null}
            {editando ? 'Guardar cambios' : 'Crear informe'}
          </button>
          <button onClick={() => setVista('lista')} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: 'hsl(var(--border))' }}>Cancelar</button>
        </div>

        <style>{`.inp{width:100%;padding:6px 10px;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:hsl(var(--foreground));font-size:14px}`}</style>
      </div>
    );
  }

  // ─── LISTA ─────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} /> Informes técnicos para aseguradoras</h2>
        <button onClick={nuevo} className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}><Plus className="w-4 h-4" /> Nuevo informe</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--muted-foreground))' }} />
          <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por cliente, aseguradora, siniestro..." className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }} />
        </div>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
          <button onClick={() => setModoLista('lista')} className="px-2.5 py-2 flex items-center gap-1 text-xs transition-colors"
            style={modoLista === 'lista' ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--card))' }}
            title="Vista de lista">
            <List className="w-4 h-4" /> Lista
          </button>
          <button onClick={() => setModoLista('galeria')} className="px-2.5 py-2 flex items-center gap-1 text-xs transition-colors"
            style={modoLista === 'galeria' ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--card))' }}
            title="Vista de galería con fotos antes/después">
            <LayoutGrid className="w-4 h-4" /> Galería
          </button>
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-3 rounded-full animate-spin" style={{ borderColor: 'hsl(var(--primary))', borderTopColor: 'transparent' }} /></div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          No hay informes técnicos. Pulsa "Nuevo informe" para crear el primero.
        </div>
      ) : modoLista === 'galeria' ? (
        <GaleriaInformes
          informes={filtrados}
          onAbrir={(inf) => { setEditando(inf); setVista('preview'); }}
          onEditar={editar}
          onEliminar={eliminar}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {filtrados.map((inf) => (
            <div key={inf.id} className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))' }}>{inf.report_number || 'S/N'}</span>
                    <EstadoBadge estado={inf.status} />
                  </div>
                  <p className="font-semibold truncate mt-1">{inf.contact_name}</p>
                  <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{inf.insurance_company || 'Sin aseguradora'}{inf.insurance_claim_ref ? ` · ${inf.insurance_claim_ref}` : ''}</p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{inf.report_date || ''} · {(inf.photos_before?.length || 0) + (inf.photos_after?.length || 0) + (inf.photos_damage?.length || 0)} fotos · {inf.signature_technician ? 'Firmado' : 'Sin firmar'}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => editar(inf)} className="p-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }} title="Editar"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => { setEditando(inf); setVista('preview'); }} className="p-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }} title="Ver"><Eye className="w-3.5 h-3.5" /></button>
                  <button onClick={() => eliminar(inf)} className="p-1.5 rounded-lg border" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--destructive))' }} title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`.inp{width:100%;padding:6px 10px;border-radius:8px;border:1px solid hsl(var(--border));background:hsl(var(--background));color:hsl(var(--foreground));font-size:14px}`}</style>
    </div>
  );
}

function Seccion({ titulo, children }) {
  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <h3 className="text-sm font-semibold mb-2 tech-label" style={{ color: 'hsl(var(--primary))' }}>{titulo}</h3>
      <div className="grid md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{label}</label>
      {children}
    </div>
  );
}

function EstadoBadge({ estado }) {
  const map = {
    borrador: { bg: 'hsl(0 0% 80%)', fg: 'hsl(0 0% 25%)' },
    enviado: { bg: 'hsl(43 90% 85%)', fg: 'hsl(43 80% 30%)' },
    firmado: { bg: 'hsl(142 70% 85%)', fg: 'hsl(142 70% 30%)' },
    cerrado: { bg: 'hsl(191 90% 85%)', fg: 'hsl(191 80% 30%)' },
    cancelado: { bg: 'hsl(0 72% 88%)', fg: 'hsl(0 72% 40%)' },
  };
  const s = map[estado] || map.borrador;
  const label = ESTADOS.find((e) => e.value === estado)?.label || estado;
  return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.fg }}>{label}</span>;
}

function InformePreview({ inf }) {
  return (
    <div className="max-w-3xl mx-auto rounded-xl border p-6 space-y-4" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <div className="text-center border-b pb-3" style={{ borderColor: 'hsl(var(--border))' }}>
        <h1 className="text-2xl font-bold">Informe Técnico para Aseguradora</h1>
        <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Nº {inf.report_number || 'S/N'} · {inf.report_date}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <Dato k="Aseguradora" v={inf.insurance_company} />
        <Dato k="Nº póliza" v={inf.insurance_policy} />
        <Dato k="Nº siniestro" v={inf.insurance_claim_ref} />
        <Dato k="Fecha siniestro" v={inf.claim_date} />
        <Dato k="Cliente" v={inf.contact_name} />
        <Dato k="Técnico" v={inf.technician} />
        <Dato k="Equipo" v={`${EQUIPOS.find((e) => e.value === inf.equipment_type)?.label || ''} ${inf.equipment_brand || ''} ${inf.equipment_model || ''}`} />
        <Dato k="Nº de serie" v={inf.equipment_serial} />
        <Dato k="Ubicación" v={inf.location} />
        <Dato k="Reparable" v={inf.repair_viable} />
        <Dato k="Coste estimado" v={inf.estimated_cost != null ? `${inf.estimated_cost} €` : ''} />
        <Dato k="Total" v={inf.total != null ? `${inf.total} €` : ''} />
      </div>
      <Bloque titulo="Descripción de la avería / siniestro">{inf.failure_description}</Bloque>
      <Bloque titulo="Valoración de daños">{inf.damage_assessment}</Bloque>
      <Bloque titulo="Análisis de la causa">{inf.cause_analysis}</Bloque>
      <Bloque titulo="Propuesta de reparación">{inf.repair_proposal}</Bloque>
      {inf.observations && <Bloque titulo="Observaciones">{inf.observations}</Bloque>}

      {inf.photos_before?.length > 0 && <Galeria titulo="Fotos ANTES" fotos={inf.photos_before} />}
      {inf.photos_after?.length > 0 && <Galeria titulo="Fotos DESPUÉS" fotos={inf.photos_after} />}
      {inf.photos_damage?.length > 0 && <Galeria titulo="Detalle del daño" fotos={inf.photos_damage} />}

      <div className="grid grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
        <div>
          <p className="text-xs font-semibold mb-1">Firma del técnico</p>
          {inf.signature_technician ? <img src={inf.signature_technician} alt="" className="max-h-20" /> : <div className="h-20 border rounded" style={{ borderColor: 'hsl(var(--border))' }} />}
          {inf.sign_datetime_technician && <p className="text-xs mt-1 tabular">{inf.sign_datetime_technician}</p>}
        </div>
        <div>
          <p className="text-xs font-semibold mb-1">Firma del cliente</p>
          {inf.signature_client ? <img src={inf.signature_client} alt="" className="max-h-20" /> : <div className="h-20 border rounded" style={{ borderColor: 'hsl(var(--border))' }} />}
          {inf.sign_datetime_client && <p className="text-xs mt-1 tabular">{inf.sign_datetime_client}</p>}
        </div>
      </div>
    </div>
  );
}

function Dato({ k, v }) { return v ? <div><span style={{ color: 'hsl(var(--muted-foreground))' }}>{k}:</span> <strong>{v}</strong></div> : null; }
function Bloque({ titulo, children }) {
  return children ? (
    <div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--primary))' }}>{titulo}</h3>
      <p className="text-sm whitespace-pre-wrap">{children}</p>
    </div>
  ) : null;
}
function Galeria({ titulo, fotos }) {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-2" style={{ color: 'hsl(var(--primary))' }}>{titulo}</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {fotos.map((f, i) => <img key={i} src={f} alt="" className="w-full aspect-square object-cover rounded-lg border" style={{ borderColor: 'hsl(var(--border))' }} />)}
      </div>
    </div>
  );
}