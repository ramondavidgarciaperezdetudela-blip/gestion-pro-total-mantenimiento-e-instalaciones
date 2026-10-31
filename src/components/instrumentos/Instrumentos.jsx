import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDot } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TONOS, aNumero, porcentaje, segmentos } from '@/lib/instrumentos';

/**
 * Instrumentos de panel de control (estética SCADA): displays numéricos en
 * monoespaciada, medidores con zonas y tarjetas que cambian de borde y pulsan
 * cuando el estado es CRÍTICO.
 */

const COLOR_ESTADO = { ok: 'bg-ok', aviso: 'bg-aviso', critico: 'bg-calor' };
const TEXTO_ESTADO = { ok: 'ESTABLE', aviso: 'TOLERANCIA', critico: 'CRÍTICO', neutro: 'SIN LECTURA' };

/** Display de instrumento: etiqueta en mayúsculas pequeñas + valor mono + unidad más clara. */
export function Instrumento({ etiqueta, valor, unidad, decimales = 1, className = '', tono, grande = false, ...rest }) {
  const n = aNumero(valor);
  const txt = n === null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }).replace('-', '−');
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{etiqueta}</div>
      <div className="font-mono tabular-nums leading-tight" style={tono ? { color: TONOS[tono] || tono } : undefined}>
        <span className={`${grande ? 'text-3xl' : 'text-xl'} font-semibold`} {...rest}>{txt}</span>
        {unidad && <span className="ml-1 text-xs font-normal text-muted-foreground/70">{unidad}</span>}
      </div>
    </div>
  );
}

/** Barra de rango con zonas (crítica · tolerancia · estable · tolerancia · crítica) y aguja. */
export function Medidor({ valor, zonas, unidad = '' }) {
  const pos = porcentaje(valor, zonas.escala);
  const segs = segmentos(zonas);
  const fmt = (x) => Number(x).toLocaleString('es-ES', { maximumFractionDigits: 1 }).replace('-', '−');
  return (
    <div role="meter" aria-valuemin={zonas.escala[0]} aria-valuemax={zonas.escala[1]} aria-valuenow={aNumero(valor) ?? undefined}>
      <div className="relative h-2.5 rounded-full overflow-hidden bg-muted">
        {segs.map((s, i) => (
          <div key={i} className={`absolute inset-y-0 ${COLOR_ESTADO[s.estado] || 'bg-muted'} opacity-40`} style={{ left: `${s.desde}%`, width: `${s.hasta - s.desde}%` }} />
        ))}
        {pos !== null && <div className="absolute -top-0.5 -bottom-0.5 w-1 rounded bg-foreground shadow" style={{ left: `calc(${pos}% - 2px)` }} data-prueba="aguja" />}
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[10px] tabular-nums text-muted-foreground/70">
        <span>{fmt(zonas.escala[0])}</span><span>{unidad}</span><span>{fmt(zonas.escala[1])}</span>
      </div>
    </div>
  );
}

/** Tarjeta de estado: métrica + medidor + estado. Crítico = borde rojo que pulsa. */
export function TarjetaEstado({ etiqueta, valor, unidad, decimales = 1, estado = 'neutro', zonas, objetivo, aviso, frio, calor, ...rest }) {
  const borde = estado === 'critico' ? 'border-red-500/50 bg-red-500/5 pulso-critico'
    : estado === 'aviso' ? 'border-aviso/50 bg-aviso/5'
      : estado === 'ok' ? 'border-ok/40' : 'border-border';
  const acento = frio ? 'border-t-frio' : calor ? 'border-t-calor' : '';
  const Icono = estado === 'critico' ? AlertTriangle : estado === 'ok' ? CheckCircle2 : CircleDot;
  const colorIcono = estado === 'critico' ? 'text-red-500' : estado === 'aviso' ? 'text-aviso' : estado === 'ok' ? 'text-ok' : 'text-muted-foreground';
  return (
    <div className={`rounded-lg border border-t-2 bg-card p-2.5 shadow-sm ${borde} ${acento}`} data-estado={estado} {...rest}>
      <Instrumento etiqueta={etiqueta} valor={valor} unidad={unidad} decimales={decimales} />
      {zonas && <div className="mt-2"><Medidor valor={valor} zonas={zonas} unidad={unidad} /></div>}
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
        <span className={`flex items-center gap-1 text-[10px] font-semibold tracking-wider ${colorIcono}`}>
          <Icono className="h-3.5 w-3.5" />{TEXTO_ESTADO[estado]}
        </span>
        {objetivo && <span className="font-mono text-[10px] text-muted-foreground/70">OBJ. {objetivo}</span>}
      </div>
      {aviso && <div className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-red-500"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />{aviso}</div>}
    </div>
  );
}

/** Tendencia de presiones: baja (cian) y alta (rojo) en el mismo eje, como un manómetro digital. */
export function GraficaPresiones({ datos, alto = 200 }) {
  return (
    <div style={{ height: alto }} className="font-mono text-[10px]" data-prueba="grafica-presiones">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.12} />
          <XAxis dataKey="hora" tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.6} />
          <YAxis tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.6} unit=" bar" width={56} />
          <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="baja" name="Baja" stroke={TONOS.frio} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
          <Line type="monotone" dataKey="alta" name="Alta" stroke={TONOS.calor} strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
