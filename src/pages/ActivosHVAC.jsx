import { useEffect, useMemo, useState } from 'react';
import NavBar from '@/components/NavBar';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { AlertTriangle, BellRing, Calculator, CheckCircle2, ClipboardList, Gauge, Save, ShieldCheck, Snowflake } from 'lucide-react';
import {
  situacionFGas, calcularCargaTermica, diagnosticar, planPreventivo, alertasCartera,
  sumarMeses, TIPOS_ACEITE, CAMPOS_OBLIGATORIOS, num,
} from '@/lib/hvacCmms';
import { idsConDatos } from '@/lib/saturacion';

// CMMS HVAC: ficha técnica del activo, cálculo de carga, diagnóstico con mediciones obligatorias,
// control de fugas y alertas del plan preventivo. Toda la física está en lib/hvacCmms.js.

const PESTANAS = [
  ['alertas', 'Alertas', BellRing],
  ['ficha', 'Ficha', ClipboardList],
  ['carga', 'Carga térmica', Calculator],
  ['diagnostico', 'Diagnóstico', Gauge],
  ['fugas', 'Control fugas', ShieldCheck],
];

const GASES = idsConDatos().filter((g) => !['R-12', 'R-717'].includes(g));
const hoyIso = () => new Date().toISOString().slice(0, 10);
const fmt = (v, d = 1, u = '') => (v == null ? '—' : `${Number(v).toLocaleString('es-ES', { maximumFractionDigits: d })}${u ? ' ' + u : ''}`);

const COLOR_ESTADO = {
  vencida: 'bg-red-50 border-red-300 text-red-800',
  proxima: 'bg-amber-50 border-amber-300 text-amber-800',
  sin_fecha: 'bg-slate-50 border-slate-300 text-slate-700',
  en_plazo: 'bg-emerald-50 border-emerald-300 text-emerald-800',
};
const COLOR_NIVEL = { bajo: 'text-sky-700', alto: 'text-red-700', normal: 'text-emerald-700' };

function Campo({ label, obligatorio, children }) {
  return (
    <label className="block text-[12px] text-slate-600">
      <span>{label}{obligatorio && <span className="text-red-600"> *</span>}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  );
}

function NumInput({ value, onChange, ...rest }) {
  return <Input inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

function Selector({ value, onChange, opciones, vacio = '—' }) {
  return (
    <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">{vacio}</option>
      {opciones.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  );
}

function Tarjeta({ titulo, icono: Icono, children }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-4 space-y-3">
      {titulo && <p className="text-sm font-semibold flex items-center gap-2">{Icono && <Icono className="w-4 h-4 text-blue-600" />}{titulo}</p>}
      {children}
    </div>
  );
}

export default function ActivosHVAC() {
  const [tab, setTab] = useState('alertas');
  const [equipos, setEquipos] = useState([]);
  const [selId, setSelId] = useState('');
  const [ficha, setFicha] = useState({});
  const [guardando, setGuardando] = useState(false);

  const cargar = () => base44.entities.ClientMachine.list('-created_date', 1000)
    .then((l) => setEquipos(Array.isArray(l) ? l : []))
    .catch(() => toast.error('No se pudieron cargar los equipos.'));
  useEffect(() => { cargar(); }, []);

  const equipo = equipos.find((e) => e.id === selId) || null;
  useEffect(() => { setFicha(equipo ? { ...equipo } : {}); }, [selId, equipos]);
  const set = (k) => (v) => setFicha((f) => ({ ...f, [k]: v }));

  const fgas = useMemo(() => situacionFGas({
    gas: ficha.refrigerant_type, cargaKg: ficha.refrigerant_charge_kg, pcaManual: ficha.gwp_override,
    hermetico: ficha.hermetically_sealed, conDetector: ficha.leak_detection_system, residencial: ficha.residential,
  }), [ficha]);

  const alertas = useMemo(() => alertasCartera(equipos), [equipos]);

  async function guardarFicha(extra = {}) {
    if (!equipo) return;
    setGuardando(true);
    try {
      const base = { ...ficha, ...extra };
      const plan = planPreventivo(base);
      const tFugas = plan.tareas.find((t) => t.codigo === 'CONTROL_FUGAS');
      const datos = {
        ...base,
        co2e_tonnes: plan.fgas.tco2e,
        leak_check_interval_months: plan.fgas.meses,
        next_leak_check_date: tFugas?.proxima || null,
      };
      for (const k of Object.keys(datos)) {
        if (['id', 'created_date', 'updated_date', 'created_by', 'created_by_id'].includes(k)) delete datos[k];
        else if (k.match(/_(kg|kw|bar|c|pct|m2|w|l|months|tonnes|override|factor|ratio)$/) && typeof datos[k] === 'string') datos[k] = num(datos[k]);
      }
      await base44.entities.ClientMachine.update(equipo.id, datos);
      toast.success('Ficha guardada.');
      await cargar();
    } catch (e) {
      toast.error('No se pudo guardar la ficha: ' + (e?.message || e));
    } finally { setGuardando(false); }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Activos HVAC (CMMS)" />
      <div className="max-w-5xl mx-auto px-3 py-3 space-y-3">
        <div className="flex flex-wrap rounded-xl overflow-hidden border border-slate-200 bg-white shadow text-sm">
          {PESTANAS.map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 min-w-[110px] py-2.5 font-medium flex items-center justify-center gap-1.5 ${tab === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>
              <I className="w-4 h-4" />{l}{k === 'alertas' && alertas.length > 0 && <span className="ml-1 rounded-full bg-red-600 text-white text-[10px] px-1.5">{alertas.length}</span>}
            </button>
          ))}
        </div>

        {tab !== 'alertas' && (
          <Tarjeta>
            <Campo label="Equipo">
              <Selector value={selId} onChange={setSelId} vacio="Elige un equipo…"
                opciones={equipos.map((e) => [e.id, `${e.name}${e.contact_name ? ' — ' + e.contact_name : ''}${e.refrigerant_type ? ' (' + e.refrigerant_type + ')' : ''}`])} />
            </Campo>
          </Tarjeta>
        )}

        {tab === 'alertas' && <PanelAlertas alertas={alertas} onAbrir={(id) => { setSelId(id); setTab('ficha'); }} />}
        {tab === 'ficha' && equipo && <PanelFicha ficha={ficha} set={set} fgas={fgas} guardando={guardando} onGuardar={() => guardarFicha()} />}
        {tab === 'carga' && equipo && <PanelCarga ficha={ficha} set={set} guardando={guardando} onGuardar={guardarFicha} />}
        {tab === 'diagnostico' && equipo && <PanelDiagnostico equipo={equipo} />}
        {tab === 'fugas' && equipo && <PanelFugas equipo={equipo} fgas={fgas} onRegistrado={(fecha) => guardarFicha({ last_leak_check_date: fecha })} />}
        {tab !== 'alertas' && !equipo && <p className="text-sm text-slate-500 text-center py-6">Elige un equipo para continuar.</p>}
      </div>
    </div>
  );
}

/* ───────────────────────────── Alertas ───────────────────────────── */

function PanelAlertas({ alertas, onAbrir }) {
  if (!alertas.length) {
    return <Tarjeta><p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Todos los equipos están en plazo.</p></Tarjeta>;
  }
  return (
    <div className="space-y-2">
      {alertas.map((a, i) => (
        <button key={i} onClick={() => onAbrir(a.activoId)} className={`w-full text-left rounded-xl border p-3 ${COLOR_ESTADO[a.estado] || ''}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{a.activo}{a.cliente ? ` · ${a.cliente}` : ''}</p>
              <p className="text-[13px]">{a.normativa && <span className="font-semibold">[Normativa] </span>}{a.titulo}</p>
              {a.detalle && <p className="text-[11px] opacity-80 mt-0.5">{a.detalle}</p>}
            </div>
            <div className="text-right text-[12px] whitespace-nowrap">
              {a.proxima && <p>{a.proxima}</p>}
              {a.dias != null && <p className="font-semibold">{a.dias < 0 ? `Vencida hace ${-a.dias} d` : `En ${a.dias} d`}</p>}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────────── Ficha del activo ───────────────────────────── */

function PanelFicha({ ficha, set, fgas, guardando, onGuardar }) {
  const plan = planPreventivo(ficha);
  return (
    <div className="space-y-3">
      <Tarjeta titulo="Refrigerante y gases fluorados" icono={Snowflake}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Campo label="Refrigerante" obligatorio><Selector value={ficha.refrigerant_type} onChange={set('refrigerant_type')} opciones={GASES} /></Campo>
          <Campo label="Carga (kg)" obligatorio><NumInput value={ficha.refrigerant_charge_kg} onChange={set('refrigerant_charge_kg')} /></Campo>
          <Campo label="PCA manual (opcional)"><NumInput value={ficha.gwp_override} onChange={set('gwp_override')} placeholder={fgas.pca ? String(fgas.pca) : ''} /></Campo>
          <Campo label="Último control de fugas"><Input type="date" value={ficha.last_leak_check_date || ''} onChange={(e) => set('last_leak_check_date')(e.target.value)} /></Campo>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {[['hermetically_sealed', 'Sellado herméticamente'], ['leak_detection_system', 'Detección de fugas instalada'], ['residential', 'Edificio residencial']].map(([k, l]) => (
            <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={!!ficha[k]} onChange={(e) => set(k)(e.target.checked)} />{l}</label>
          ))}
        </div>
        <div className={`rounded-lg border p-3 text-sm ${fgas.aplica ? 'bg-amber-50 border-amber-300' : 'bg-slate-50'}`}>
          <p><b>{fmt(fgas.tco2e, 2, 't CO₂e')}</b>{fgas.kgHfo != null && <> · {fmt(fgas.kgHfo, 2, 'kg HFO')}</>} · PCA {fmt(fgas.pca, 0)}</p>
          <p className="text-[13px]">{fgas.motivo}</p>
          {fgas.avisos.map((a) => <p key={a} className="text-[12px] text-red-700 flex gap-1"><AlertTriangle className="w-3.5 h-3.5 mt-0.5" />{a}</p>)}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Circuito frigorífico" icono={Gauge}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Campo label="Tipo de aceite"><Selector value={ficha.oil_type} onChange={set('oil_type')} opciones={TIPOS_ACEITE} /></Campo>
          <Campo label="Carga de aceite (l)"><NumInput value={ficha.oil_charge_l} onChange={set('oil_charge_l')} /></Campo>
          <Campo label="Expansión"><Selector value={ficha.expansion_device} onChange={set('expansion_device')} opciones={[['valvula', 'Válvula termostática'], ['electronica', 'Válvula electrónica'], ['capilar', 'Capilar / orificio']]} /></Campo>
          <Campo label="Compresor"><Selector value={ficha.compressor_type} onChange={set('compressor_type')} opciones={['rotativo', 'scroll', 'piston', 'tornillo', 'centrifugo', 'otro']} /></Campo>
          <Campo label="P. nominal baja (bar)"><NumInput value={ficha.nominal_suction_pressure_bar} onChange={set('nominal_suction_pressure_bar')} /></Campo>
          <Campo label="P. nominal alta (bar)"><NumInput value={ficha.nominal_discharge_pressure_bar} onChange={set('nominal_discharge_pressure_bar')} /></Campo>
          <Campo label="PS de placa (bar)"><NumInput value={ficha.max_allowable_pressure_ps_bar} onChange={set('max_allowable_pressure_ps_bar')} /></Campo>
          <Campo label="Potencia frigorífica (kW)"><NumInput value={ficha.cooling_capacity_kw} onChange={set('cooling_capacity_kw')} /></Campo>
          <Campo label="Consigna frío (°C)"><NumInput value={ficha.setpoint_cooling_c} onChange={set('setpoint_cooling_c')} /></Campo>
          <Campo label="Consigna calor (°C)"><NumInput value={ficha.setpoint_heating_c} onChange={set('setpoint_heating_c')} /></Campo>
          <Campo label="Consigna HR (%)"><NumInput value={ficha.setpoint_humidity_pct} onChange={set('setpoint_humidity_pct')} /></Campo>
          <Campo label="Potencia calorífica (kW)"><NumInput value={ficha.heating_capacity_kw} onChange={set('heating_capacity_kw')} /></Campo>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Plan preventivo" icono={BellRing}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Campo label="Intervalo preventivo (meses)"><NumInput value={ficha.maintenance_interval_months} onChange={set('maintenance_interval_months')} /></Campo>
          <Campo label="Último preventivo"><Input type="date" value={ficha.last_maintenance_date || ''} onChange={(e) => set('last_maintenance_date')(e.target.value)} /></Campo>
          <Campo label="Fecha de instalación"><Input type="date" value={ficha.installation_date || ''} onChange={(e) => set('installation_date')(e.target.value)} /></Campo>
        </div>
        {plan.tareas.map((t) => (
          <div key={t.codigo} className={`rounded-lg border p-2 text-[13px] ${COLOR_ESTADO[t.estado]}`}>
            <b>{t.titulo}</b> — cada {t.periodicidadMeses} meses · próxima: {t.proxima || 'sin fecha base'}
          </div>
        ))}
      </Tarjeta>

      <Button onClick={onGuardar} disabled={guardando} className="w-full"><Save className="w-4 h-4 mr-1" />{guardando ? 'Guardando…' : 'Guardar ficha'}</Button>
    </div>
  );
}

/* ───────────────────────────── Carga térmica ───────────────────────────── */

function PanelCarga({ ficha, set, guardando, onGuardar }) {
  const r = calcularCargaTermica({
    areaM2: ficha.room_area_m2, cargaSensibleW: ficha.room_sensible_load_w, cargaLatenteW: ficha.room_latent_load_w,
    factorSeguridad: ficha.load_safety_factor ?? 0.1,
    equipo: { capacidadTotalKw: ficha.cooling_capacity_kw, capacidadSensibleKw: ficha.cooling_sensible_kw },
  });
  const v = r.verificacion;
  const colorV = !v ? '' : v.cubreDemanda && v.veredicto === 'adecuado' ? 'bg-emerald-50 border-emerald-300' : v.veredicto === 'sobredimensionado' ? 'bg-amber-50 border-amber-300' : 'bg-red-50 border-red-300';
  return (
    <div className="space-y-3">
      <Tarjeta titulo="Condiciones del local" icono={Calculator}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Campo label="Área (m²)" obligatorio><NumInput value={ficha.room_area_m2} onChange={set('room_area_m2')} /></Campo>
          <Campo label="Carga sensible (W)" obligatorio><NumInput value={ficha.room_sensible_load_w} onChange={set('room_sensible_load_w')} /></Campo>
          <Campo label="Carga latente (W)"><NumInput value={ficha.room_latent_load_w} onChange={set('room_latent_load_w')} /></Campo>
          <Campo label="Factor de seguridad"><NumInput value={ficha.load_safety_factor ?? 0.1} onChange={set('load_safety_factor')} /></Campo>
          <Campo label="Equipo: total (kW)"><NumInput value={ficha.cooling_capacity_kw} onChange={set('cooling_capacity_kw')} /></Campo>
          <Campo label="Equipo: sensible (kW)"><NumInput value={ficha.cooling_sensible_kw} onChange={set('cooling_sensible_kw')} placeholder="si se conoce" /></Campo>
        </div>
      </Tarjeta>
      {!r.ok && <Tarjeta><p className="text-sm text-slate-600">{r.errores.join(' ')}</p></Tarjeta>}
      {r.ok && (
        <Tarjeta titulo="Demanda del local">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
            {[['Sensible', fmt(r.requerido.sensibleKw, 2, 'kW')], ['Latente', fmt(r.requerido.latenteKw, 2, 'kW')], ['Total', fmt(r.requerido.totalKw, 2, 'kW')],
              ['Total', fmt(r.requerido.totalBtuh, 0, 'Btu/h')], ['FCS (SHR)', fmt(r.requerido.shr, 2)]].map(([l, x], i) => (
              <div key={i} className="rounded-lg bg-slate-50 border p-2"><p className="text-[11px] text-slate-500">{l}</p><p className="font-semibold">{x}</p></div>
            ))}
          </div>
          {v && (
            <div className={`rounded-lg border p-3 text-sm ${colorV}`}>
              <p className="font-semibold">Equipo {fmt(v.capacidadTotalKw, 2, 'kW')} → cobertura {fmt(v.coberturaTotal * 100, 0, '%')} · {v.veredicto.replace('_', ' ')}</p>
              <p className="text-[12px]">Sensible {fmt(v.capacidadSensibleKw, 2, 'kW')} ({fmt(v.coberturaSensible * 100, 0, '%')}) · Latente {fmt(v.capacidadLatenteKw, 2, 'kW')} ({fmt(v.coberturaLatente != null ? v.coberturaLatente * 100 : null, 0, '%')})</p>
              {v.avisos.map((a) => <p key={a} className="text-[12px] mt-1">• {a}</p>)}
            </div>
          )}
        </Tarjeta>
      )}
      <Button className="w-full" disabled={guardando || !r.ok}
        onClick={() => onGuardar({ load_coverage_ratio: v?.coberturaTotal ?? null, load_verdict: v?.veredicto ?? null })}>
        <Save className="w-4 h-4 mr-1" />Guardar cálculo en la ficha
      </Button>
    </div>
  );
}

/* ───────────────────────────── Diagnóstico de campo ───────────────────────────── */

const ETIQUETAS_CAMPOS = Object.fromEntries(CAMPOS_OBLIGATORIOS);

function PanelDiagnostico({ equipo }) {
  const [m, setM] = useState({ unidadPresion: 'bar', referenciaPresion: 'manometrica', modo: 'frio' });
  const [notas, setNotas] = useState('');
  const [tecnico, setTecnico] = useState('');
  const [guardando, setGuardando] = useState(false);
  const setv = (k) => (v) => setM((x) => ({ ...x, [k]: v }));
  const med = { ...m, gas: equipo.refrigerant_type, expansion: equipo.expansion_device || 'valvula' };
  const d = diagnosticar(med, { presionNominalBaja: equipo.nominal_suction_pressure_bar, presionNominalAlta: equipo.nominal_discharge_pressure_bar });
  const c = d.calculo;

  async function guardar() {
    if (!d.ok) { toast.error('Faltan mediciones obligatorias.'); return; }
    setGuardando(true);
    try {
      await base44.entities.HVACDiagnosis.create({
        machine_id: equipo.id, machine_name: equipo.name, contact_id: equipo.contact_id, contact_name: equipo.contact_name,
        date: hoyIso(), technician: tecnico, refrigerant: equipo.refrigerant_type, mode: m.modo,
        expansion_device: med.expansion, pressure_unit: m.unidadPresion, pressure_reference: m.referenciaPresion,
        suction_pressure: num(m.presionSuccion), discharge_pressure: num(m.presionDescarga),
        suction_line_temp_c: num(m.tLineaAspiracion), liquid_line_temp_c: num(m.tLineaLiquido), discharge_line_temp_c: num(m.tDescarga),
        evap_air_in_c: num(m.tAireEvapEntrada), evap_air_out_c: num(m.tAireEvapSalida),
        cond_air_in_c: num(m.tAireCondEntrada), cond_air_out_c: num(m.tAireCondSalida), evap_airflow_m3h: num(m.caudalEvapM3h),
        compressor_current_a: num(m.consumoA),
        evaporating_temp_c: c.tEvaporacion, condensing_temp_c: c.tCondensacion, superheat_k: c.recalentamiento, subcooling_k: c.subenfriamiento,
        evap_delta_t_k: c.dtEvaporador, cond_delta_t_k: c.dtCondensador, condenser_approach_k: c.aproximacionCondensador, compression_ratio: c.relacionCompresion,
        verdict: d.veredicto, hypotheses: d.hipotesis.map(({ codigo, titulo, confianza }) => ({ codigo, titulo, confianza })), warnings: d.avisos, notes: notas,
      });
      toast.success('Diagnóstico registrado en el historial del equipo.');
    } catch (e) { toast.error('No se pudo guardar: ' + (e?.message || e)); } finally { setGuardando(false); }
  }

  const u = m.unidadPresion;
  return (
    <div className="space-y-3">
      {!equipo.refrigerant_type && <Tarjeta><p className="text-sm text-red-700">El equipo no tiene refrigerante en la ficha: complétala antes de diagnosticar.</p></Tarjeta>}
      <Tarjeta titulo={`Mediciones en campo · ${equipo.refrigerant_type || '—'}`} icono={Gauge}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Campo label="Unidad"><Selector value={u} onChange={setv('unidadPresion')} opciones={[['bar', 'bar'], ['psi', 'psi']]} /></Campo>
          <Campo label="Referencia"><Selector value={m.referenciaPresion} onChange={setv('referenciaPresion')} opciones={[['manometrica', 'Manométrica'], ['absoluta', 'Absoluta']]} /></Campo>
          <Campo label={`P. succión (${u})`} obligatorio><NumInput value={m.presionSuccion} onChange={setv('presionSuccion')} /></Campo>
          <Campo label={`P. descarga (${u})`} obligatorio><NumInput value={m.presionDescarga} onChange={setv('presionDescarga')} /></Campo>
          <Campo label="T línea aspiración (°C)" obligatorio><NumInput value={m.tLineaAspiracion} onChange={setv('tLineaAspiracion')} /></Campo>
          <Campo label="T línea líquido (°C)" obligatorio><NumInput value={m.tLineaLiquido} onChange={setv('tLineaLiquido')} /></Campo>
          <Campo label="T línea descarga (°C)"><NumInput value={m.tDescarga} onChange={setv('tDescarga')} /></Campo>
          <Campo label="Consumo compresor (A)"><NumInput value={m.consumoA} onChange={setv('consumoA')} /></Campo>
          <Campo label="Aire entrada evaporador (°C)" obligatorio><NumInput value={m.tAireEvapEntrada} onChange={setv('tAireEvapEntrada')} /></Campo>
          <Campo label="Aire salida evaporador (°C)" obligatorio><NumInput value={m.tAireEvapSalida} onChange={setv('tAireEvapSalida')} /></Campo>
          <Campo label="Aire entrada condensador (°C)" obligatorio><NumInput value={m.tAireCondEntrada} onChange={setv('tAireCondEntrada')} /></Campo>
          <Campo label="Aire salida condensador (°C)" obligatorio><NumInput value={m.tAireCondSalida} onChange={setv('tAireCondSalida')} /></Campo>
          <Campo label="Caudal evaporador (m³/h)"><NumInput value={m.caudalEvapM3h} onChange={setv('caudalEvapM3h')} /></Campo>
          <Campo label="Técnico"><Input value={tecnico} onChange={(e) => setTecnico(e.target.value)} /></Campo>
        </div>
        <p className="text-[11px] text-slate-500">En modo calor, el evaporador es la unidad exterior y el condensador la interior: introduce cada temperatura según la función de la batería.</p>
      </Tarjeta>

      {!d.ok && <Tarjeta><ul className="text-[13px] text-slate-600 list-disc pl-4">{d.errores.map((e) => <li key={e}>{e}</li>)}</ul></Tarjeta>}

      {d.ok && (
        <>
          <Tarjeta titulo="Resultados termodinámicos">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              {[
                ['T evaporación (rocío)', fmt(c.tEvaporacion, 1, '°C')],
                ['T condensación (rocío)', fmt(c.tCondensacion, 1, '°C')],
                ['Recalentamiento', fmt(c.recalentamiento, 1, 'K'), d.estados.recalentamiento],
                ['Subenfriamiento', fmt(c.subenfriamiento, 1, 'K'), d.estados.subenfriamiento],
                ['ΔT evaporador', fmt(c.dtEvaporador, 1, 'K'), d.estados.dtEvaporador],
                ['ΔT condensador', fmt(c.dtCondensador, 1, 'K'), d.estados.dtCondensador],
                ['Aproximación cond.', fmt(c.aproximacionCondensador, 1, 'K'), d.estados.aproximacionCondensador],
                ['Relación compresión', fmt(c.relacionCompresion, 2)],
              ].map(([l, x, e]) => (
                <div key={l} className="rounded-lg bg-slate-50 border p-2">
                  <p className="text-[11px] text-slate-500">{l}</p>
                  <p className={`font-semibold ${COLOR_NIVEL[e] || ''}`}>{x}</p>
                  {e && <p className={`text-[10px] ${COLOR_NIVEL[e]}`}>{e}</p>}
                </div>
              ))}
            </div>
            {c.capacidadSensibleEvapKw != null && <p className="text-[12px]">Capacidad sensible real por el aire: <b>{fmt(c.capacidadSensibleEvapKw, 2, 'kW')}</b></p>}
          </Tarjeta>
          <Tarjeta titulo="Diagnóstico" icono={AlertTriangle}>
            {d.veredicto === 'FUNCIONAMIENTO_CORRECTO' && <p className="text-sm text-emerald-700 flex gap-1.5"><CheckCircle2 className="w-4 h-4" />Parámetros dentro de rango.</p>}
            {d.veredicto === 'SIN_PATRON_CLARO' && <p className="text-sm text-amber-700">Hay valores fuera de rango pero no encajan con un patrón conocido: revisar mediciones y sondas.</p>}
            {d.hipotesis.map((h) => (
              <div key={h.codigo} className="rounded-lg border p-2">
                <p className="text-sm font-semibold">{h.titulo} <span className="text-[11px] text-slate-500">({Math.round(h.confianza * 100)} % de síntomas)</span></p>
                <ul className="text-[12px] list-disc pl-4">{h.comprobar.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
            {d.avisos.map((a) => <p key={a} className="text-[12px] text-red-700">• {a}</p>)}
            <Textarea placeholder="Observaciones del técnico" value={notas} onChange={(e) => setNotas(e.target.value)} />
            <Button className="w-full" onClick={guardar} disabled={guardando}><Save className="w-4 h-4 mr-1" />Registrar diagnóstico</Button>
          </Tarjeta>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────── Registro de control de fugas ───────────────────────────── */

function PanelFugas({ equipo, fgas, onRegistrado }) {
  const [f, setF] = useState({ date: hoyIso(), method: 'directo_detector', result: 'sin_fugas' });
  const [historial, setHistorial] = useState([]);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const cargar = () => base44.entities.LeakCheck.filter({ machine_id: equipo.id }, '-date', 100).then(setHistorial).catch(() => setHistorial([]));
  useEffect(() => { cargar(); }, [equipo.id]);

  async function registrar() {
    if (!f.technician) { toast.error('Indica el técnico certificado.'); return; }
    try {
      await base44.entities.LeakCheck.create({
        ...f, machine_id: equipo.id, machine_name: equipo.name, contact_id: equipo.contact_id, contact_name: equipo.contact_name,
        refrigerant: equipo.refrigerant_type, charge_kg: num(equipo.refrigerant_charge_kg), co2e_tonnes: fgas.tco2e,
        refrigerant_added_kg: num(f.refrigerant_added_kg), refrigerant_recovered_kg: num(f.refrigerant_recovered_kg),
        next_check_date: fgas.meses ? sumarMeses(f.date, fgas.meses) : null,
        // Tras reparar una fuga, el reglamento exige verificar la reparación: se propone a un mes.
        follow_up_check_date: f.result !== 'sin_fugas' ? sumarMeses(f.date, 1) : null,
      });
      toast.success('Control de fugas registrado.');
      await onRegistrado(f.date);
      cargar();
    } catch (e) { toast.error('No se pudo registrar: ' + (e?.message || e)); }
  }

  return (
    <div className="space-y-3">
      <Tarjeta titulo="Nuevo control de fugas" icono={ShieldCheck}>
        <p className="text-[13px] text-slate-600">{fgas.motivo}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Campo label="Fecha" obligatorio><Input type="date" value={f.date} onChange={(e) => set('date')(e.target.value)} /></Campo>
          <Campo label="Técnico" obligatorio><Input value={f.technician || ''} onChange={(e) => set('technician')(e.target.value)} /></Campo>
          <Campo label="Nº certificado"><Input value={f.technician_certificate || ''} onChange={(e) => set('technician_certificate')(e.target.value)} /></Campo>
          <Campo label="Método"><Selector value={f.method} onChange={set('method')} opciones={[['directo_detector', 'Detector electrónico'], ['directo_espuma', 'Espuma'], ['directo_uv', 'Trazador UV'], ['indirecto_parametros', 'Indirecto (parámetros)'], ['nitrogeno', 'Prueba con nitrógeno']]} /></Campo>
          <Campo label="Resultado"><Selector value={f.result} onChange={set('result')} opciones={[['sin_fugas', 'Sin fugas'], ['fuga_detectada', 'Fuga detectada'], ['fuga_reparada', 'Fuga reparada']]} /></Campo>
          <Campo label="Ubicación de la fuga"><Input value={f.leak_location || ''} onChange={(e) => set('leak_location')(e.target.value)} /></Campo>
          <Campo label="Refrigerante añadido (kg)"><NumInput value={f.refrigerant_added_kg} onChange={set('refrigerant_added_kg')} /></Campo>
          <Campo label="Refrigerante recuperado (kg)"><NumInput value={f.refrigerant_recovered_kg} onChange={set('refrigerant_recovered_kg')} /></Campo>
        </div>
        <Textarea placeholder="Observaciones" value={f.notes || ''} onChange={(e) => set('notes')(e.target.value)} />
        <Button className="w-full" onClick={registrar}><Save className="w-4 h-4 mr-1" />Registrar control</Button>
      </Tarjeta>
      <Tarjeta titulo="Registro del equipo">
        {!historial.length && <p className="text-[13px] text-slate-500">Sin controles registrados.</p>}
        {historial.map((h) => (
          <div key={h.id} className="border-b last:border-0 py-1.5 text-[13px] flex justify-between gap-2">
            <span>{h.date} · {h.technician} · {String(h.result || '').replace('_', ' ')}{h.refrigerant_added_kg ? ` · +${h.refrigerant_added_kg} kg` : ''}</span>
            <span className="text-slate-500">próximo: {h.next_check_date || '—'}</span>
          </div>
        ))}
      </Tarjeta>
    </div>
  );
}
