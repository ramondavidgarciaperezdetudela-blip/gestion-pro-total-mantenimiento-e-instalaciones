import React, { useState, useEffect } from 'react';
import { Activity, Plus, Trash2 } from 'lucide-react';
import { TarjetaEstado, GraficaPresiones } from './Instrumentos';
import {
  evaluar, peorEstado, aNumero, zonasPresion, golpeDeLiquido,
  ZONAS_RECALENTAMIENTO, ZONAS_SUBENFRIAMIENTO, ZONAS_FILTRO,
} from '@/lib/instrumentos';

const CLAVE = 'diag_lecturas_presion';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; } };
const guardar = (v) => { try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

const BANNER = {
  critico: 'border-red-500/50 bg-red-500/5 text-red-500',
  aviso: 'border-aviso/50 bg-aviso/5 text-aviso',
  ok: 'border-ok/40 bg-ok/5 text-ok',
  neutro: 'border-border text-muted-foreground',
};
const TXT = { critico: 'CRÍTICO — revisar ya', aviso: 'FUERA DE TOLERANCIA', ok: 'CICLO ESTABLE', neutro: 'INTRODUCE LECTURAS' };

/**
 * Panel de instrumentos del diagnóstico: presiones, recalentamiento, subenfriamiento
 * y filtro como tarjetas con medidor, más la tendencia de presiones alta/baja.
 * `rec` = referencia de presiones { hay, bajaMin, bajaMax, altaMin, altaMax }.
 */
export default function PanelCiclo({ pBaja, pAlta, recal, subenf, dtFiltro, rec }) {
  const [lecturas, setLecturas] = useState(leer);
  useEffect(() => { guardar(lecturas); }, [lecturas]);

  const zBaja = rec?.hay ? zonasPresion(rec.bajaMin, rec.bajaMax) : null;
  const zAlta = rec?.hay ? zonasPresion(rec.altaMin, rec.altaMax) : null;
  const eBaja = zBaja ? evaluar(pBaja, zBaja) : 'neutro';
  const eAlta = zAlta ? evaluar(pAlta, zAlta) : 'neutro';
  const eSH = golpeDeLiquido(recal) ? 'critico' : evaluar(recal, ZONAS_RECALENTAMIENTO);
  const eSC = evaluar(subenf, ZONAS_SUBENFRIAMIENTO);
  const eFiltro = evaluar(dtFiltro, ZONAS_FILTRO);
  const global = peorEstado([eBaja, eAlta, eSH, eSC, eFiltro]);

  const anotar = () => {
    const b = aNumero(pBaja), a = aNumero(pAlta);
    if (b === null && a === null) return;
    const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLecturas((l) => [...l, { hora, baja: b, alta: a }].slice(-60));
  };

  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 space-y-3" data-prueba="panel-ciclo">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-frio" />Panel de instrumentos</p>
        <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider ${BANNER[global]} ${global === 'critico' ? 'pulso-critico' : ''}`} data-prueba="estado-global">{TXT[global]}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 min-[520px]:grid-cols-2 xl:grid-cols-4">
        <TarjetaEstado frio etiqueta="Presión baja" unidad="bar" decimales={1} valor={pBaja} estado={eBaja} zonas={zBaja}
          objetivo={rec?.hay ? `${rec.bajaMin.toFixed(1)}–${rec.bajaMax.toFixed(1)} bar` : null} data-prueba="tarjeta-baja" />
        <TarjetaEstado calor etiqueta="Presión alta" unidad="bar" decimales={1} valor={pAlta} estado={eAlta} zonas={zAlta}
          objetivo={rec?.hay ? `${rec.altaMin.toFixed(1)}–${rec.altaMax.toFixed(1)} bar` : null} data-prueba="tarjeta-alta" />
        <TarjetaEstado frio etiqueta="Recalentamiento SH" unidad="K" valor={recal} estado={eSH} zonas={ZONAS_RECALENTAMIENTO}
          objetivo="4–9 K" aviso={golpeDeLiquido(recal) ? 'Peligro de golpe de líquido al compresor' : null} data-prueba="tarjeta-sh" />
        <TarjetaEstado calor etiqueta="Subenfriamiento SC" unidad="K" valor={subenf} estado={eSC} zonas={ZONAS_SUBENFRIAMIENTO}
          objetivo="3–11 K" data-prueba="tarjeta-sc" />
        {aNumero(dtFiltro) !== null && (
          <TarjetaEstado etiqueta="Salto en filtro" unidad="K" valor={dtFiltro} estado={eFiltro} zonas={ZONAS_FILTRO}
            objetivo="< 2 K" aviso={eFiltro === 'critico' ? 'Filtro deshidratador obstruido' : null} data-prueba="tarjeta-filtro" />
        )}
      </div>

      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Tendencia de presiones · {lecturas.length} lectura{lecturas.length === 1 ? '' : 's'}</p>
          <div className="flex gap-1.5">
            <button type="button" onClick={anotar} data-prueba="anotar-lectura" disabled={aNumero(pBaja) === null && aNumero(pAlta) === null}
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"><Plus className="h-3 w-3" />Anotar lectura</button>
            <button type="button" onClick={() => setLecturas([])} disabled={!lecturas.length} data-prueba="borrar-lecturas"
              className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"><Trash2 className="h-3 w-3" />Borrar</button>
          </div>
        </div>
        {lecturas.length >= 2
          ? <GraficaPresiones datos={lecturas} />
          : <p className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Anota al menos dos lecturas para ver las curvas de baja y alta superpuestas.</p>}
      </div>
    </div>
  );
}
