import React, { useState, useMemo, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, Download } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { diagnosticoSimulado, estadosSimulados } from '@/lib/simuladorCiclo';
import { TONOS } from '@/lib/instrumentos';

/**
 * Simulador de ciclo frigorífico: deslizadores que hacen de «mandos físicos»
 * (presión de baja/alta, recalentamiento, subenfriamiento). El diagnóstico se
 * recalcula en cada movimiento. «Cargar mis medidas» parte de las lecturas
 * reales; «Aplicar» devuelve los valores al diagnóstico.
 */
const TXT_COLOR = { ok: 'text-ok', aviso: 'text-aviso', critico: 'text-calor', neutro: 'text-muted-foreground' };
const BG = { ok: 'border-ok/40 bg-ok/5', aviso: 'border-aviso/50 bg-aviso/5', critico: 'border-calor/50 bg-calor/5', neutro: 'border-border' };

function Mando({ etiqueta, unidad, valor, min, max, paso, estado, onChange }) {
  return (
    <div className="rounded-md border bg-card p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</span>
        <span className={`font-mono tabular-nums text-lg font-semibold ${TXT_COLOR[estado]}`} data-testid={`sim-${etiqueta}`}>
          {valor.toLocaleString('es-ES', { minimumFractionDigits: paso < 1 ? 1 : 0, maximumFractionDigits: 1 }).replace('-', '−')}
          <span className="ml-1 text-xs font-normal text-muted-foreground/70">{unidad}</span>
        </span>
      </div>
      <Slider className="mt-2" value={[valor]} min={min} max={max} step={paso} onValueChange={([v]) => onChange(v)} aria-label={etiqueta} />
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground/70"><span>{min}</span><span>{max}</span></div>
    </div>
  );
}

export default function SimuladorCiclo({ rec, inicial, onAplicar }) {
  const base = useMemo(() => {
    const medio = (a, b, d) => (Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : d);
    return {
      pBaja: Number.isFinite(inicial?.pBaja) ? inicial.pBaja : medio(rec?.bajaMin, rec?.bajaMax, 4),
      pAlta: Number.isFinite(inicial?.pAlta) ? inicial.pAlta : medio(rec?.altaMin, rec?.altaMax, 18),
      recal: Number.isFinite(inicial?.recal) ? inicial.recal : 6,
      subenf: Number.isFinite(inicial?.subenf) ? inicial.subenf : 6,
    };
  }, [rec?.bajaMin, rec?.bajaMax, rec?.altaMin, rec?.altaMax, inicial?.pBaja, inicial?.pAlta, inicial?.recal, inicial?.subenf]);
  const [v, setV] = useState(base);
  useEffect(() => { setV(base); }, [base]);

  const set = (k) => (x) => setV((p) => ({ ...p, [k]: x }));
  const est = estadosSimulados({ ...v, rec });
  const diag = diagnosticoSimulado({ ...v, rec });
  const peor = diag.some((d) => d.estado === 'critico') ? 'critico' : diag.some((d) => d.estado === 'aviso') ? 'aviso' : 'ok';
  const maxBaja = Math.max(10, Math.ceil((rec?.bajaMax || 6) * 2)), maxAlta = Math.max(30, Math.ceil((rec?.altaMax || 22) * 1.6));

  return (
    <section className="mt-3 border-t pt-3" data-testid="simulador-ciclo">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" style={{ color: TONOS.frio }} /> Simulador: mueve los mandos y mira el diagnóstico</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => setV(base)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"><RotateCcw className="h-3 w-3" /> Restablecer</button>
          {onAplicar && <button type="button" onClick={() => onAplicar(v)} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"><Download className="h-3 w-3" /> Aplicar al diagnóstico</button>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 xl:grid-cols-4">
        <Mando etiqueta="Presión de baja" unidad="bar" valor={v.pBaja} min={0} max={maxBaja} paso={0.1} estado={est.pBaja} onChange={set('pBaja')} />
        <Mando etiqueta="Presión de alta" unidad="bar" valor={v.pAlta} min={0} max={maxAlta} paso={0.5} estado={est.pAlta} onChange={set('pAlta')} />
        <Mando etiqueta="Recalentamiento" unidad="K" valor={v.recal} min={0} max={30} paso={0.5} estado={est.recal} onChange={set('recal')} />
        <Mando etiqueta="Subenfriamiento" unidad="K" valor={v.subenf} min={0} max={25} paso={0.5} estado={est.subenf} onChange={set('subenf')} />
      </div>
      <ul className={`mt-2 space-y-1 rounded-md border p-2 ${BG[peor]}`} aria-live="polite" data-testid="simulador-diagnostico">
        {diag.map((d) => (
          <li key={d.e} className="text-sm"><span className={`mr-2 text-[10px] font-semibold uppercase tracking-wider ${TXT_COLOR[d.estado]}`}>{d.e}</span><span className="text-muted-foreground">{d.t}</span></li>
        ))}
      </ul>
    </section>
  );
}
