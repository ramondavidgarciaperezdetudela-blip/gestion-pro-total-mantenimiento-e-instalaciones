import React, { useMemo, useState } from 'react';
import { Link2, Wind, Zap, AlertTriangle } from 'lucide-react';
import { longitudConexion } from '@/lib/planoCalculo';
import {
  sugerirDiametros, sugerirSeccion, DIAMETROS, SECCIONES,
  TIPOS_CONEXION_ELECTRICA, BUSES_COMUNICACION,
} from '@/lib/instalacionCalculos';

/**
 * DialogoNuevaConexion — nada más trazar una tubería o una línea eléctrica,
 * este diálogo pide lo que hace falta para que el montador lo tenga claro:
 *
 *  - Refrigerante: diámetro de la línea de gas y de la de líquido.
 *  - Eléctrica:    la línea de POTENCIA (tipo de conexión, sección, tensión)
 *                  y la línea de COMUNICACIÓN de máquinas (bus y cable), para
 *                  dárselo al electricista o al técnico que monte la instalación.
 *  - Conducto:      forma, sección y caudal.
 *
 * Todo viene pre-sugerido con la potencia del equipo y la longitud dibujada,
 * así que en la mayoría de casos es aceptar y seguir.
 *
 * Los valores son orientativos: el bueno es el de la ficha técnica del equipo
 * (tubería) o el del REBT (eléctrica). Se avisa de ello dentro del diálogo.
 */

const POWER_OPTS = [
  'Manguera 3G1.5', 'Manguera 3G2.5', 'Manguera 5G6', 'Manguera 5G10', 'Manguera 7G16',
  'Barra omnibus', 'Cable H07RN-F 3G2.5', 'Toma industrial 16A', 'Toma industrial 32A', 'Directo a borne',
];
const TENSIONES = ['230 V monofásica', '400 V trifásica', '24 V', '12 V'];

export default function DialogoNuevaConexion({ connection, elements, scale, onSave, onClose }) {
  const esRef = connection.type === 'refrigerante';
  const esConducto = connection.type === 'conducto';
  const esElec = !esRef && !esConducto;

  // La potencia sale del equipo al que está enganchada la línea.
  const a = elements.find((e) => e.id === connection.from_id);
  const b = elements.find((e) => e.id === connection.to_id);
  const L = longitudConexion(connection, elements, scale);
  const conDato = [a, b].find((e) => Number(e?.datos?.potencia_w) > 0)
    || [a, b].find((e) => Number(e?.datos?.consumo_w) > 0) || a || b;
  const potenciaW = Number(connection.power_w ?? conDato?.datos?.potencia_w ?? conDato?.datos?.consumo_w) || 0;
  const tension = connection.voltage || conDato?.datos?.tension || '230 V monofásica';

  const sugTub = useMemo(
    () => (esRef ? sugerirDiametros({ potenciaW, longitudM: L, desnivelM: Number(connection.height_m) || 0 }) : null),
    [esRef, potenciaW, L, connection.height_m],
  );
  const sugEle = useMemo(
    () => (esElec ? sugerirSeccion({ potenciaW, tension, longitudM: L }) : null),
    [esElec, potenciaW, tension, L],
  );

  const [form, setForm] = useState(() => ({
    gas_diameter: connection.gas_diameter || sugTub?.gas?.pulgadas || '',
    liquid_diameter: connection.liquid_diameter || sugTub?.liquido?.pulgadas || '',
    power_w: connection.power_w ?? conDato?.datos?.potencia_w ?? conDato?.datos?.consumo_w ?? '',
    height_m: connection.height_m ?? '',
    conn_kind: connection.conn_kind || 'potencia',
    power_type: connection.power_type || '',
    voltage: tension,
    section_mm2: connection.section_mm2 || sugEle?.seccion?.mm2 || '',
    comm_type: connection.comm_type || '',
    cable: connection.cable || '',
    duct_shape: connection.duct_shape || 'Rectangular',
    duct_section: connection.duct_section || '',
    duct_caudal_m3h: connection.duct_caudal_m3h ?? conDato?.datos?.caudal_m3h ?? '',
  }));
  const poner = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const aceptar = () => {
    onSave(form);
    onClose();
  };

  const titulo = esRef ? 'Tubería refrigerante' : esConducto ? 'Conducto de ventilación' : 'Línea eléctrica';
  const Icono = esRef ? Link2 : esConducto ? Wind : Zap;
  const color = esRef ? '#00A0E9' : esConducto ? '#10b981' : '#F5821F';

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card border border-border shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: color + '22' }}>
            <Icono className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-bold">{titulo}</h3>
            <p className="text-[11px] text-muted-foreground">
              {(a?.label) || '?'} → {(b?.label) || '?'} · <span className="font-mono">{L.toFixed(2)} m</span>
            </p>
          </div>
        </div>

        {esRef && (
          <div className="flex flex-col gap-2">
            <Campo label="Línea de gas (diámetro)">
              <select value={form.gas_diameter} data-prueba="dlg-gas" onChange={(e) => poner('gas_diameter', e.target.value)}
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
                <option value="">—</option>
                {DIAMETROS.map((d) => <option key={d.pulgadas} value={d.pulgadas}>{d.pulgadas} ({d.mm} mm)</option>)}
              </select>
            </Campo>
            <Campo label="Línea de líquido (diámetro)">
              <select value={form.liquid_diameter} data-prueba="dlg-liquido" onChange={(e) => poner('liquid_diameter', e.target.value)}
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
                <option value="">—</option>
                {DIAMETROS.map((d) => <option key={d.pulgadas} value={d.pulgadas}>{d.pulgadas} ({d.mm} mm)</option>)}
              </select>
            </Campo>
            <div className="grid grid-cols-2 gap-2">
              <Campo label="Potencia que mueve (W)">
                <input inputMode="decimal" value={form.power_w} onChange={(e) => poner('power_w', e.target.value)}
                  placeholder="de la placa" className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
              </Campo>
              <Campo label="Desnivel (m)">
                <input inputMode="decimal" value={form.height_m} onChange={(e) => poner('height_m', e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
              </Campo>
            </div>
            {sugTub?.gas && (
              <div className="rounded-md px-2 py-1.5 text-[11px]" style={{ background: '#00A0E915', color: '#0369a1' }}>
                <b>Sugerido:</b> gas {sugTub.gas.pulgadas} · líquido {sugTub.liquido.pulgadas}
                {sugTub.cargaEstimadaG > 0 && <> · carga ≈ {sugTub.cargaEstimadaG} g</>}
              </div>
            )}
          </div>
        )}

        {esElec && (
          <div className="flex flex-col gap-2">
            {/* ── Línea de POTENCIA ── */}
            <div className="rounded-md border border-border p-2">
              <div className="tech-label mb-1.5" style={{ color: '#eab308' }}>Línea de potencia</div>
              <Campo label="Conexión de potencia">
                <select value={form.power_type} data-prueba="dlg-potencia-tipo" onChange={(e) => poner('power_type', e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
                  <option value="">— Selecciona —</option>
                  {POWER_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Potencia (W)">
                  <input inputMode="decimal" value={form.power_w} data-prueba="dlg-potencia-w"
                    onChange={(e) => poner('power_w', e.target.value)}
                    className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
                </Campo>
                <Campo label="Tensión">
                  <select value={form.voltage} onChange={(e) => poner('voltage', e.target.value)}
                    className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
                    {TENSIONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Campo>
              </div>
              <Campo label="Sección del cable (mm²)">
                <select value={form.section_mm2} data-prueba="dlg-seccion" onChange={(e) => poner('section_mm2', e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
                  <option value="">—</option>
                  {SECCIONES.map((s) => <option key={s.mm2} value={s.mm2}>{s.mm2} mm²</option>)}
                </select>
              </Campo>
              {sugEle?.seccion && (
                <div className="rounded-md px-2 py-1.5 text-[11px]" style={{ background: '#F5821F15', color: '#b45309' }}>
                  <b>Sugerido:</b> {sugEle.seccion.mm2} mm² · {sugEle.intensidadA} A
                </div>
              )}
            </div>

            {/* ── Línea de COMUNICACIÓN de máquinas ── */}
            <div className="rounded-md border border-border p-2">
              <div className="tech-label mb-1.5" style={{ color: '#8b5cf6' }}>Línea de comunicación de máquinas</div>
              <Campo label="Bus / protocolo">
                <select value={form.comm_type} data-prueba="dlg-bus" onChange={(e) => poner('comm_type', e.target.value)}
                  className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
                  <option value="">Sin comunicación</option>
                  {BUSES_COMUNICACION.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Campo>
              <Campo label="Tipo de cable">
                <input value={form.cable} data-prueba="dlg-cable" onChange={(e) => poner('cable', e.target.value)}
                  placeholder="p. ej. 2×0,75 apantallado (RS-485)"
                  className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
              </Campo>
              <p className="text-[10px] leading-snug text-muted-foreground">
                Para dárselo al electricista o al técnico que monte la instalación: el bus de datos va aparte de la fuerza.
              </p>
            </div>
          </div>
        )}

        {esConducto && (
          <div className="flex flex-col gap-2">
            <Campo label="Forma del conducto">
              <select value={form.duct_shape} onChange={(e) => poner('duct_shape', e.target.value)}
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs">
                <option value="Rectangular">Rectangular</option>
                <option value="Circular">Circular</option>
                <option value="Flexible">Flexible</option>
              </select>
            </Campo>
            <Campo label="Sección / diámetro (mm)">
              <input value={form.duct_section} onChange={(e) => poner('duct_section', e.target.value)}
                placeholder="p. ej. 400×200 o Ø250"
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
            </Campo>
            <Campo label="Caudal (m³/h)">
              <input inputMode="decimal" value={form.duct_caudal_m3h} onChange={(e) => poner('duct_caudal_m3h', e.target.value)}
                className="w-full rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
            </Campo>
          </div>
        )}

        <p className="mt-2 flex gap-1 text-[10px] leading-snug text-amber-600">
          <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" />
          Valores orientativos: el definitivo es el de la ficha técnica del equipo (tubería) o el del REBT (eléctrica).
        </p>

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Omitir</button>
          <button onClick={aceptar} className="rounded-md px-3 py-1.5 text-xs text-white hover:opacity-90" style={{ background: color }}>
            Guardar datos
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}