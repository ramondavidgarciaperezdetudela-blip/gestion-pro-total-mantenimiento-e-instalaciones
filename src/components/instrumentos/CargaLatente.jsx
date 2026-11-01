import React, { useMemo, useState, useEffect } from 'react';
import { Droplets } from 'lucide-react';
import { Instrumento } from './Instrumentos';
import { cargaLatente } from '@/lib/psicrometria';

/**
 * Carga latente y de ventilación por psicrometría: temperatura y humedad
 * relativa interior y exterior, altitud (que cambia la presión y la densidad
 * del aire), caudal de ventilación, personas y fuentes de humedad.
 */
const CLAVE = 'psicro_entradas';
const INICIAL = { tInt: '24', hrInt: '50', tExt: '35', hrExt: '40', altitud: '0', caudal: '500', personas: '4', humedad: '0' };
const leer = () => { try { return { ...INICIAL, ...JSON.parse(localStorage.getItem(CLAVE) || '{}') }; } catch { return INICIAL; } };

function Campo({ etiqueta, unidad, valor, onChange, id }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</span>
      <div className="flex items-center gap-1">
        <input id={id} inputMode="decimal" value={valor} onChange={(e) => onChange(e.target.value)} className="w-full rounded-md border bg-background px-2 py-1 font-mono text-sm tabular-nums" />
        <span className="text-xs text-muted-foreground/70">{unidad}</span>
      </div>
    </label>
  );
}

export default function CargaLatente() {
  const [v, setV] = useState(leer);
  useEffect(() => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch { /* sin almacenamiento */ } }, [v]);
  const s = (k) => (x) => setV((p) => ({ ...p, [k]: x }));
  const r = useMemo(() => cargaLatente({
    interior: { t: v.tInt, hr: v.hrInt }, exterior: { t: v.tExt, hr: v.hrExt },
    altitud: v.altitud, caudalM3h: v.caudal, personas: v.personas, humedadKgH: v.humedad,
  }), [v]);

  return (
    <section className="rounded-lg border bg-card p-4" data-testid="carga-latente">
      <h2 className="mb-1 flex items-center gap-2 font-semibold"><Droplets className="h-4 w-4 text-frio" /> Carga latente y aire de ventilación (psicrometría)</h2>
      <p className="mb-3 text-xs text-muted-foreground">Orientativo para pre-dimensionar. La altitud corrige la presión y la densidad del aire.</p>
      <div className="grid grid-cols-2 gap-2 min-[520px]:grid-cols-4">
        <Campo id="pl-tint" etiqueta="T interior" unidad="°C" valor={v.tInt} onChange={s('tInt')} />
        <Campo id="pl-hrint" etiqueta="HR interior" unidad="%" valor={v.hrInt} onChange={s('hrInt')} />
        <Campo id="pl-text" etiqueta="T exterior" unidad="°C" valor={v.tExt} onChange={s('tExt')} />
        <Campo id="pl-hrext" etiqueta="HR exterior" unidad="%" valor={v.hrExt} onChange={s('hrExt')} />
        <Campo id="pl-alt" etiqueta="Altitud" unidad="m" valor={v.altitud} onChange={s('altitud')} />
        <Campo id="pl-caudal" etiqueta="Ventilación" unidad="m³/h" valor={v.caudal} onChange={s('caudal')} />
        <Campo id="pl-pers" etiqueta="Personas" unidad="" valor={v.personas} onChange={s('personas')} />
        <Campo id="pl-hum" etiqueta="Humedad extra" unidad="kg/h" valor={v.humedad} onChange={s('humedad')} />
      </div>

      {!r ? (
        <p className="mt-3 text-sm text-calor" data-testid="psicro-error">Revisa los datos: temperaturas, humedades (0–100 %) y caudal válidos.</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 min-[520px]:grid-cols-4 xl:grid-cols-6">
            <Instrumento etiqueta="Densidad interior" valor={r.int.rho} unidad="kg/m³" decimales={3} />
            <Instrumento etiqueta="Densidad exterior" valor={r.ext.rho} unidad="kg/m³" decimales={3} />
            <Instrumento etiqueta="Presión local" valor={r.int.P / 100} unidad="hPa" decimales={0} />
            <Instrumento etiqueta="Rocío interior" valor={r.int.tRocio} unidad="°C" />
            <Instrumento etiqueta="Rocío exterior" valor={r.ext.tRocio} unidad="°C" />
            <Instrumento etiqueta="Humedad abs. ext." valor={r.ext.W * 1000} unidad="g/kg" decimales={2} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 min-[520px]:grid-cols-4">
            <Instrumento etiqueta="Carga latente" valor={r.latenteKW} unidad="kW" decimales={2} tono="frio" grande data-testid="latente-kw" />
            <Instrumento etiqueta="Carga sensible vent." valor={r.sensibleKW} unidad="kW" decimales={2} tono="calor" grande />
            <Instrumento etiqueta="Total" valor={r.totalKW} unidad="kW" decimales={2} grande />
            <Instrumento etiqueta="Factor calor sensible" valor={r.fcs} unidad="" decimales={2} grande />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Latente = ventilación {r.ventLatenteKW.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kW + personas {r.personasLatenteKW.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kW + humedad extra {r.fuentesKW.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kW
            · agua a retirar ≈ {r.deshumidificarKgH.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg/h
            {r.fcs !== null && r.fcs < 0.7 ? ' · FCS bajo: elige una máquina con buena capacidad de deshumectación.' : ''}
          </p>
        </>
      )}
    </section>
  );
}
