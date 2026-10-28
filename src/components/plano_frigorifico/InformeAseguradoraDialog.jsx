import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, X, Upload, FileDown, Save, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generarInformeAseguradora, exportarInformeAseguradora } from '@/lib/informeAseguradoraPlano';
import { getNextAvailableNumber } from '@/components/autoNumber';
import DualSignaturePanel from '@/components/DualSignaturePanel';

const TIPOS = [
  { id: 'aire_acondicionado', label: 'Aire acondicionado' },
  { id: 'bomba_calor', label: 'Bomba de calor' },
  { id: 'camara_frigorifica', label: 'Cámara frigorífica' },
  { id: 'electrico', label: 'Eléctrico' },
  { id: 'solar', label: 'Solar' },
  { id: 'fontaneria', label: 'Fontanería' },
  { id: 'otro', label: 'Otro' },
];
const VIABILIDAD = [
  { id: 'reparable', label: 'Reparable' },
  { id: 'irreparable', label: 'Irreparable' },
  { id: 'pendiente_valoracion', label: 'Pendiente de valoración' },
];

const hoy = () => new Date().toISOString().slice(0, 10);
const ahora = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const VACIO = {
  report_number: '', insurance_company: '', insurance_policy: '', insurance_claim_ref: '',
  claim_date: '', report_date: hoy(), technician: '',
  equipment_type: 'camara_frigorifica', equipment_brand: '', equipment_model: '', equipment_serial: '',
  location: '', failure_description: '', damage_assessment: '', cause_analysis: '', repair_proposal: '',
  repair_viable: 'pendiente_valoracion', estimated_cost: '', observations: '',
};

// Sube una foto al almacenamiento privado y devuelve { file_uri, signed_url }.
async function subirFotoPrivada(file, onProgreso) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri, expires_in: 3600 * 24 * 7,
  });
  return { file_uri, signed_url };
}

function BloqueFotos({ titulo, fotos, setFotos, color }) {
  const [subiendo, setSubiendo] = useState(false);
  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setSubiendo(true);
    try {
      for (let i = 0; i < files.length; i++) {
        toast.info(`Subiendo foto ${i + 1} de ${files.length}`);
        const { file_uri, signed_url } = await subirFotoPrivada(files[i]);
        setFotos((p) => [...p, { file_uri, signed_url }]);
      }
      toast.success('Fotos subidas (almacenadas privadamente)');
    } catch (err) {
      console.error(err); toast.error('No se pudo subir la foto', { description: String(err?.message || err) });
    } finally { setSubiendo(false); e.target.value = ''; }
  };
  return (
    <div className="rounded-lg border p-2.5" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold" style={{ color }}>{titulo}</span>
        <label className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md cursor-pointer hover:opacity-90"
          style={{ background: color, color: '#fff' }}>
          {subiendo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          {subiendo ? 'Subiendo…' : 'Añadir'}
          <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} disabled={subiendo} />
        </label>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {fotos.map((f, i) => (
          <div key={i} className="relative group aspect-square rounded-md overflow-hidden border" style={{ borderColor: 'hsl(var(--border))' }}>
            <img src={f.signed_url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => setFotos((p) => p.filter((_, j) => j !== i))}
              className="absolute top-0.5 right-0.5 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: '#000a' }}>
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        ))}
        {fotos.length === 0 && <span className="text-[10px] text-muted-foreground col-span-3">Sin fotos</span>}
      </div>
    </div>
  );
}

export default function InformeAseguradoraDialog({ open, onClose, plan, elements, walls, connections, empresa, contacts }) {
  const [datos, setDatos] = useState({ ...VACIO });
  const [fotos, setFotos] = useState({ before: [], after: [], damage: [] });
  const [firmaTec, setFirmaTec] = useState('');
  const [firmaCli, setFirmaCli] = useState('');
  const [fechaTec, setFechaTec] = useState('');
  const [fechaCli, setFechaCli] = useState('');
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const existentes = await base44.entities.InsuranceReport.list({ limit: 1000 }).catch(() => []);
        const nums = (existentes || []).map((r) => (r.report_number || '').replace(/^INF-/, '')).filter(Boolean);
        const num = getNextAvailableNumber(nums);
        setDatos((d) => ({ ...d, report_number: `INF-${num}` }));
      } catch {}
    })();
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setDatos((d) => ({ ...d, [k]: e.target.value }));
  const contacto = contacts?.find((c) => c.id === plan?.contact_id);

  const validar = () => {
    if (!datos.insurance_company.trim()) { toast.error('Indica la compañía aseguradora'); return false; }
    if (!datos.failure_description.trim()) { toast.error('Describe la avería / siniestro'); return false; }
    if (!firmaTec) { toast.error('Falta la firma del técnico'); return false; }
    return true;
  };

  const onGenerar = async () => {
    if (!validar()) return;
    setGenerando(true);
    try {
      const doc = await generarInformeAseguradora({
        plan, elements, walls, connections, empresa,
        datos: { ...datos, contact_name: plan?.contact_name },
        fotos: {
          before: fotos.before.map((f) => f.signed_url),
          after: fotos.after.map((f) => f.signed_url),
          damage: fotos.damage.map((f) => f.signed_url),
        },
        firmas: {
          tecnico: firmaTec, cliente: firmaCli,
          fecha_tecnico: fechaTec, fecha_cliente: fechaCli,
          nombre_tecnico: datos.technician, nombre_cliente: plan?.contact_name,
        },
      });
      exportarInformeAseguradora(doc, `informe_aseguradora_${(plan?.name || 'plano').replace(/\s+/g, '_')}`);
      toast.success('Informe de aseguradora generado');
    } catch (err) {
      console.error(err); toast.error('No se pudo generar el informe', { description: String(err?.message || err) });
    } finally { setGenerando(false); }
  };

  const onGuardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = {
        report_number: datos.report_number,
        contact_id: plan?.contact_id || null,
        contact_name: plan?.contact_name || 'Sin cliente vinculado',
        insurance_company: datos.insurance_company,
        insurance_policy: datos.insurance_policy,
        insurance_claim_ref: datos.insurance_claim_ref,
        claim_date: datos.claim_date || null,
        report_date: datos.report_date,
        report_datetime: ahora(),
        technician: datos.technician,
        equipment_type: datos.equipment_type,
        equipment_brand: datos.equipment_brand,
        equipment_model: datos.equipment_model,
        equipment_serial: datos.equipment_serial,
        location: datos.location,
        failure_description: datos.failure_description,
        damage_assessment: datos.damage_assessment,
        cause_analysis: datos.cause_analysis,
        repair_proposal: datos.repair_proposal,
        repair_viable: datos.repair_viable,
        estimated_cost: datos.estimated_cost ? Number(datos.estimated_cost) : null,
        photos_before: fotos.before.map((f) => f.file_uri),
        photos_after: fotos.after.map((f) => f.file_uri),
        photos_damage: fotos.damage.map((f) => f.file_uri),
        signature_technician: firmaTec,
        signature_client: firmaCli,
        sign_datetime_technician: fechaTec,
        sign_datetime_client: fechaCli,
        observations: datos.observations,
        status: firmaTec ? 'firmado' : 'borrador',
      };
      await base44.entities.InsuranceReport.create(payload);
      toast.success('Informe guardado', { description: 'Disponible en Informes Aseguradora' });
      onClose();
    } catch (err) {
      console.error(err); toast.error('No se pudo guardar el informe', { description: String(err?.message || err) });
    } finally { setGuardando(false); }
  };

  const inputCls = 'rounded-md border border-border bg-input px-2 py-1.5 text-xs w-full';
  const lblCls = 'flex flex-col gap-1';
  const lblTxt = 'text-[10px] text-muted-foreground';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" onClick={() => !generando && !guardando && onClose()}>
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-card border border-border p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 sticky top-0 bg-card pb-2 -mx-4 px-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2563eb' }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Informe técnico para aseguradora</h3>
              <p className="text-[11px] text-muted-foreground">Plano: {plan?.name || '—'} · Cliente: {plan?.contact_name || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={generando || guardando} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Datos aseguradora */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <label className={lblCls}><span className={lblTxt}>Nº informe</span><input className={inputCls} value={datos.report_number} onChange={set('report_number')} /></label>
            <label className={lblCls}><span className={lblTxt}>Compañía aseguradora *</span><input className={inputCls} value={datos.insurance_company} onChange={set('insurance_company')} placeholder="Mapfre, Allianz…" /></label>
            <label className={lblCls}><span className={lblTxt}>Nº póliza</span><input className={inputCls} value={datos.insurance_policy} onChange={set('insurance_policy')} /></label>
            <label className={lblCls}><span className={lblTxt}>Ref. siniestro</span><input className={inputCls} value={datos.insurance_claim_ref} onChange={set('insurance_claim_ref')} /></label>
            <label className={lblCls}><span className={lblTxt}>Fecha siniestro</span><input type="date" className={inputCls} value={datos.claim_date} onChange={set('claim_date')} /></label>
            <label className={lblCls}><span className={lblTxt}>Fecha informe</span><input type="date" className={inputCls} value={datos.report_date} onChange={set('report_date')} /></label>
            <label className={lblCls}><span className={lblTxt}>Técnico</span><input className={inputCls} value={datos.technician} onChange={set('technician')} placeholder="Nombre del técnico" /></label>
            <label className={lblCls}><span className={lblTxt}>Tipo de equipo</span>
              <select className={inputCls} value={datos.equipment_type} onChange={set('equipment_type')}>
                {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <label className={lblCls}><span className={lblTxt}>Ubicación</span><input className={inputCls} value={datos.location} onChange={set('location')} placeholder="Dirección del equipo" /></label>
            <label className={lblCls}><span className={lblTxt}>Marca</span><input className={inputCls} value={datos.equipment_brand} onChange={set('equipment_brand')} /></label>
            <label className={lblCls}><span className={lblTxt}>Modelo</span><input className={inputCls} value={datos.equipment_model} onChange={set('equipment_model')} /></label>
            <label className={lblCls}><span className={lblTxt}>Nº de serie</span><input className={inputCls} value={datos.equipment_serial} onChange={set('equipment_serial')} /></label>
          </div>

          <label className={lblCls}><span className={lblTxt}>Descripción de la avería / siniestro *</span>
            <textarea rows={2} className={inputCls} value={datos.failure_description} onChange={set('failure_description')} /></label>
          <label className={lblCls}><span className={lblTxt}>Valoración técnica de los daños</span>
            <textarea rows={2} className={inputCls} value={datos.damage_assessment} onChange={set('damage_assessment')} /></label>
          <label className={lblCls}><span className={lblTxt}>Análisis de la causa probable</span>
            <textarea rows={2} className={inputCls} value={datos.cause_analysis} onChange={set('cause_analysis')} /></label>
          <label className={lblCls}><span className={lblTxt}>Propuesta de reparación</span>
            <textarea rows={2} className={inputCls} value={datos.repair_proposal} onChange={set('repair_proposal')} /></label>

          <div className="grid grid-cols-2 gap-2">
            <label className={lblCls}><span className={lblTxt}>Viabilidad</span>
              <select className={inputCls} value={datos.repair_viable} onChange={set('repair_viable')}>
                {VIABILIDAD.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </label>
            <label className={lblCls}><span className={lblTxt}>Coste estimado (€)</span>
              <input type="number" className={inputCls} value={datos.estimated_cost} onChange={set('estimated_cost')} placeholder="0.00" /></label>
          </div>

          {/* Fotos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <BloqueFotos titulo="Fotos del DAÑO" fotos={fotos.damage} setFotos={(fn) => setFotos((p) => ({ ...p, damage: fn(p.damage) }))} color="#b91c1c" />
            <BloqueFotos titulo="ANTES de reparar" fotos={fotos.before} setFotos={(fn) => setFotos((p) => ({ ...p, before: fn(p.before) }))} color="#2563eb" />
            <BloqueFotos titulo="DESPUÉS de reparar" fotos={fotos.after} setFotos={(fn) => setFotos((p) => ({ ...p, after: fn(p.after) }))} color="#15803d" />
          </div>

          {/* Firmas */}
          <div>
            <div className="text-xs font-semibold mb-1.5">Doble firma digital</div>
            <DualSignaturePanel
              firmaTecnico={firmaTec} setFirmaTecnico={(v) => { setFirmaTec(v); if (v && !fechaTec) setFechaTec(ahora()); }}
              firmaCliente={firmaCli} setFirmaCliente={(v) => { setFirmaCli(v); if (v && !fechaCli) setFechaCli(ahora()); }}
              fechaTecnico={fechaTec} fechaCliente={fechaCli}
              setFechaTecnico={setFechaTec} setFechaCliente={setFechaCli} />
          </div>

          <label className={lblCls}><span className={lblTxt}>Observaciones</span>
            <textarea rows={2} className={inputCls} value={datos.observations} onChange={set('observations')} /></label>
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 sticky bottom-0 bg-card" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <button onClick={onClose} disabled={generando || guardando} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancelar</button>
          <button onClick={onGuardar} disabled={guardando || generando}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50">
            {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {guardando ? 'Guardando…' : 'Guardar informe'}
          </button>
          <button onClick={onGenerar} disabled={generando || guardando}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-white hover:opacity-90 disabled:opacity-50"
            style={{ background: '#2563eb' }}>
            {generando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} {generando ? 'Generando…' : 'Generar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}