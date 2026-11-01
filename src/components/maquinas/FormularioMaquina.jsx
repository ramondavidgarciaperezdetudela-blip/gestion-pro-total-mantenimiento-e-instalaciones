import FotoFicha from '@/components/FotoFicha';
import React, { useMemo } from 'react';
import { ClipboardList, Leaf, Cpu, SlidersHorizontal, Wrench, Camera, StickyNote } from 'lucide-react';
import { Input } from '@/components/ui/input';
import BuscadorCliente from '@/components/BuscadorCliente';
import { REFRIGERANTES } from '@/lib/refrigerantes';
import {
  TIPOS_MAQUINA, ESTADOS_MAQUINA, ACEITES, EXPANSIONES, COMPRESORES, calcularFgas, proximoPreventivo,
} from '@/lib/maquinaFgas';

/**
 * Ficha de una máquina en secciones, una tarjeta por tema:
 * Identificación · Refrigerante (Reglamento UE 2024/573) · Circuito frigorífico ·
 * Potencias y consignas · Mantenimiento preventivo · Notas y foto.
 * Con el gas y la carga calcula al momento el CO₂ equivalente, los kg de HFO
 * y el control de fugas obligatorio.
 */

/** Campo numérico que guarda el TEXTO escrito (vacío = sin dato, no 0) y admite coma o punto. */
function Num({ value, onChange, decimals = true, ...rest }) {
  return (
    <Input type="text" inputMode={decimals ? 'decimal' : 'numeric'} value={value ?? ''} {...rest}
      onChange={(e) => {
        const v = e.target.value.replace(',', '.');
        if (decimals ? /^-?\d*\.?\d*$/.test(v) : /^-?\d*$/.test(v)) onChange(v);
      }} />
  );
}

const SELECT = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function Seccion({ icono: Icono, titulo, children, className = '' }) {
  return (
    <section className={`rounded-lg border border-border bg-card shadow-sm ${className}`}>
      <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Icono className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">{titulo}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Campo({ etiqueta, requerido, ancho = '', children }) {
  return (
    <label className={`block ${ancho}`}>
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-muted-foreground">
        {etiqueta}{requerido && <span className="text-red-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Casilla({ etiqueta, checked, onChange, ...rest }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-sm">
      <input type="checkbox" className="h-4 w-4" checked={!!checked} onChange={(e) => onChange(e.target.checked)} {...rest} />
      {etiqueta}
    </label>
  );
}

const fmt = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: d });
const fechaES = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

function Medida({ etiqueta, valor, unidad, estado, nota, ...rest }) {
  const tono = estado === 'si' ? 'border-aviso/50 bg-aviso/5' : estado === 'no' ? 'border-ok/40' : 'border-border';
  return (
    <div className={`rounded-lg border p-3 ${tono}`} {...rest}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{etiqueta}</div>
      <div className="mt-1.5 font-mono tabular-nums">
        <span className="text-xl font-semibold">{valor}</span>{unidad && <span className="ml-1 text-xs text-muted-foreground/70">{unidad}</span>}
      </div>
      {nota && <div className="mt-1 font-mono text-[10px] leading-snug text-muted-foreground">{nota}</div>}
    </div>
  );
}

/**
 * @param form        ficha (ver MAQUINA_VACIA)
 * @param setForm     setter de React
 * @param contacts    clientes para el buscador; si no se pasa, el cliente ya viene fijado y no se muestra
 * @param onFoto      (evento de input file) => void
 */
export default function FormularioMaquina({ form, setForm, contacts }) {
  const set = (campo) => (v) => setForm((f) => ({ ...f, [campo]: v }));
  const setE = (campo) => (e) => set(campo)(e.target.value);
  const fg = useMemo(() => calcularFgas(form), [form]);
  const proxPrev = proximoPreventivo(form.last_maintenance_date, form.maintenance_interval_months);

  const elegirGas = (id) => {
    const gas = REFRIGERANTES.find((r) => r.id === id);
    setForm((f) => ({ ...f, refrigerant_type: id, gwp: gas?.gwp != null ? String(gas.gwp) : '', oil_type: f.oil_type || (gas?.aceite?.match(/POE|PVE|PAG/)?.[0] ?? '') }));
  };

  return (
    <div className="space-y-4" data-prueba="formulario-maquina">
      <p className="text-sm text-muted-foreground">Con el refrigerante y la carga se calcula al momento el control de fugas obligatorio.</p>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Seccion icono={ClipboardList} titulo="Identificación">
            <FotoFicha value={form.photo_url} onChange={(url) => setForm((f) => ({ ...f, photo_url: url }))} etiqueta="Foto del equipo" icono={Camera} className="mb-3" tamano="h-24 w-32" />
            <div className="grid grid-cols-6 gap-3">
              {contacts && (
                <Campo etiqueta="Cliente" requerido ancho="col-span-6">
                  <BuscadorCliente contacts={contacts} value={form.contact_id}
                    onValueChange={(v) => {
                      const c = contacts.find((x) => x.id === v);
                      setForm((f) => ({ ...f, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}`.trim() : '' }));
                    }} placeholder="Elige un cliente" />
                </Campo>
              )}
              <Campo etiqueta="Nombre del equipo" requerido ancho="col-span-6 sm:col-span-4">
                <Input value={form.name} onChange={setE('name')} placeholder="Split sala de reuniones" data-prueba="maq-nombre" />
              </Campo>
              <Campo etiqueta="Tipo" ancho="col-span-6 sm:col-span-2">
                <select className={SELECT} value={form.machine_type} onChange={setE('machine_type')}>
                  {TIPOS_MAQUINA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Marca" ancho="col-span-6 sm:col-span-2"><Input value={form.brand} onChange={setE('brand')} /></Campo>
              <Campo etiqueta="Modelo" ancho="col-span-6 sm:col-span-2"><Input value={form.model} onChange={setE('model')} /></Campo>
              <Campo etiqueta="Nº de serie" ancho="col-span-6 sm:col-span-2"><Input value={form.serial_number} onChange={setE('serial_number')} className="font-mono" /></Campo>
              <Campo etiqueta="Ubicación" ancho="col-span-6 sm:col-span-2"><Input value={form.location} onChange={setE('location')} /></Campo>
              <Campo etiqueta="Instalación" ancho="col-span-6 sm:col-span-2"><Input type="date" value={form.installation_date} onChange={setE('installation_date')} /></Campo>
              <Campo etiqueta="Estado" ancho="col-span-6 sm:col-span-2">
                <select className={SELECT} value={form.status} onChange={setE('status')}>
                  {ESTADOS_MAQUINA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </Campo>
            </div>
          </Seccion>

          <Seccion icono={Cpu} titulo="Circuito frigorífico">
            <div className="grid grid-cols-3 gap-3">
              <Campo etiqueta="Aceite">
                <select className={SELECT} value={form.oil_type} onChange={setE('oil_type')}>
                  <option value="">—</option>{ACEITES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Carga de aceite (L)"><Num value={form.oil_charge_l} onChange={set('oil_charge_l')} /></Campo>
              <Campo etiqueta="Expansión">
                <select className={SELECT} value={form.expansion_type} onChange={setE('expansion_type')}>
                  <option value="">—</option>{EXPANSIONES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Compresor">
                <select className={SELECT} value={form.compressor_type} onChange={setE('compressor_type')}>
                  <option value="">—</option>{COMPRESORES.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="P. nominal baja (bar)"><Num value={form.nominal_low_bar} onChange={set('nominal_low_bar')} /></Campo>
              <Campo etiqueta="P. nominal alta (bar)"><Num value={form.nominal_high_bar} onChange={set('nominal_high_bar')} /></Campo>
              <Campo etiqueta="PS de placa (bar)"><Num value={form.ps_bar} onChange={set('ps_bar')} /></Campo>
            </div>
          </Seccion>

          <Seccion icono={Wrench} titulo="Mantenimiento preventivo">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Campo etiqueta="Cada (meses)"><Num decimals={false} value={form.maintenance_interval_months} onChange={set('maintenance_interval_months')} /></Campo>
              <Campo etiqueta="Último preventivo"><Input type="date" value={form.last_maintenance_date} onChange={setE('last_maintenance_date')} data-prueba="maq-ultimo-prev" /></Campo>
              <Campo etiqueta="Fin de garantía"><Input type="date" value={form.warranty_expiry} onChange={setE('warranty_expiry')} /></Campo>
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground" data-prueba="maq-proximo-prev">
              {proxPrev ? `PRÓXIMO PREVENTIVO: ${fechaES(proxPrev)}` : 'Indica el último preventivo para calcular el próximo.'}
            </p>
          </Seccion>
        </div>

        <div className="space-y-4">
          <Seccion icono={Leaf} titulo="Refrigerante · Reglamento (UE) 2024/573">
            <div className="grid grid-cols-3 gap-3">
              <Campo etiqueta="Refrigerante" requerido>
                <select className={SELECT} value={form.refrigerant_type} onChange={(e) => elegirGas(e.target.value)} data-prueba="maq-gas">
                  <option value="">Elige el gas</option>
                  {REFRIGERANTES.map((r) => <option key={r.id} value={r.id}>{r.id}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Carga (kg)" requerido><Num value={form.refrigerant_charge_kg} onChange={set('refrigerant_charge_kg')} data-prueba="maq-carga" /></Campo>
              <Campo etiqueta="PCA"><Num value={form.gwp} onChange={set('gwp')} data-prueba="maq-pca" /></Campo>
              <Campo etiqueta="Último control de fugas" ancho="col-span-3 sm:col-span-1"><Input type="date" value={form.last_leak_check} onChange={setE('last_leak_check')} /></Campo>
              <div className="col-span-3 flex flex-wrap items-end gap-x-4 gap-y-2 sm:col-span-2 sm:pb-1.5">
                <Casilla etiqueta="Hermético" checked={form.hermetic} onChange={set('hermetic')} data-prueba="maq-hermetico" />
                <Casilla etiqueta="Detección de fugas" checked={form.leak_detection} onChange={set('leak_detection')} data-prueba="maq-deteccion" />
                <Casilla etiqueta="Residencial" checked={form.residential} onChange={set('residential')} />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Medida etiqueta="CO₂ equivalente" valor={fg.tCO2 === null ? '—' : fmt(fg.tCO2)} unidad="t" data-prueba="maq-co2" />
              <Medida etiqueta="HFO (Anexo II)" valor={fg.kgHFO === null ? '—' : fmt(fg.kgHFO, 3)} unidad="kg" data-prueba="maq-hfo" />
              <Medida etiqueta="Control de fugas" estado={fg.control.estado}
                valor={fg.control.estado === 'si' ? `${fg.control.meses}` : '—'} unidad={fg.control.estado === 'si' ? 'meses' : ''}
                nota={fg.control.estado === 'sin-datos' ? 'no obligatorio' : fg.control.texto + (fg.control.proximo ? ` · próximo ${fechaES(fg.control.proximo)}` : '')} data-prueba="maq-fugas" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground" data-prueba="maq-fugas-texto">
              {fg.control.estado === 'sin-datos' ? 'Falta la carga de refrigerante en kg.' : `Control de fugas: ${fg.control.texto}.`}
              {form.residential && ' Marcada como residencial: confirma en el reglamento si te aplica el control.'}
            </p>
          </Seccion>

          <Seccion icono={SlidersHorizontal} titulo="Potencias y consignas">
            <div className="grid grid-cols-3 gap-3">
              <Campo etiqueta="P. frigorífica (kW)"><Num value={form.power_kw} onChange={set('power_kw')} /></Campo>
              <Campo etiqueta="De ella, sensible (kW)"><Num value={form.sensible_kw} onChange={set('sensible_kw')} /></Campo>
              <Campo etiqueta="P. calorífica (kW)"><Num value={form.heating_kw} onChange={set('heating_kw')} /></Campo>
              <Campo etiqueta="Consigna frío (°C)"><Num value={form.setpoint_cold_c} onChange={set('setpoint_cold_c')} /></Campo>
              <Campo etiqueta="Consigna calor (°C)"><Num value={form.setpoint_heat_c} onChange={set('setpoint_heat_c')} /></Campo>
              <Campo etiqueta="Humedad relativa (%)"><Num value={form.humidity_pct} onChange={set('humidity_pct')} /></Campo>
            </div>
          </Seccion>

          <Seccion icono={StickyNote} titulo="Observaciones">
            <div className="flex items-start gap-3">
              <label className="block flex-1">
                <span className="mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground"><StickyNote className="h-3 w-3" />Notas / estado de conservación</span>
                <textarea rows={4} value={form.notes} onChange={setE('notes')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </label>
            </div>
          </Seccion>
        </div>
      </div>
    </div>
  );
}

/** Lo que se guarda: números como números y próximo preventivo calculado si falta. */
export function prepararMaquina(form) {
  const nums = ['refrigerant_charge_kg', 'gwp', 'oil_charge_l', 'nominal_low_bar', 'nominal_high_bar', 'ps_bar', 'power_kw', 'sensible_kw', 'heating_kw', 'setpoint_cold_c', 'setpoint_heat_c', 'humidity_pct', 'maintenance_interval_months'];
  const out = { ...form };
  nums.forEach((k) => {
    const n = parseFloat(String(form[k] ?? '').replace(',', '.'));
    if (Number.isFinite(n)) out[k] = n; else delete out[k];
  });
  const prox = proximoPreventivo(form.last_maintenance_date, form.maintenance_interval_months);
  if (prox) out.next_maintenance_date = prox;
  return out;
}
