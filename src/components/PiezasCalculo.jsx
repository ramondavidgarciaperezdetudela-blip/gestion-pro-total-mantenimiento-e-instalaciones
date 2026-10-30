import React from 'react';
import { AlertTriangle, Info, XCircle } from 'lucide-react';

/**
 * Piezas pequeñas que comparten las pantallas de cálculo (capilar, filtro…): campo con etiqueta, panel,
 * indicador, línea de dato, aviso e interruptor. Usan los colores del tema, así que se leen en claro y en oscuro.
 */

export function Campo({ etiqueta, ayuda, children }) {
  return (
    <div className="space-y-1">
      <span className="tech-label block">{etiqueta}</span>
      {children}
      {ayuda && <span className="block text-[11px] leading-tight text-muted-foreground">{ayuda}</span>}
    </div>
  );
}

export function Panel({ titulo, icono: Icono, children, className = '' }) {
  return (
    <section className={`tech-panel p-4 ${className}`}>
      {titulo && (
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          {Icono && <Icono className="h-4 w-4 text-primary" />}
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}

export function Kpi({ etiqueta, valor, unidad, sub }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <p className="tech-label">{etiqueta}</p>
      <p className="tabular text-lg font-bold leading-tight text-foreground">
        {valor}
        {unidad && <span className="ml-1 text-xs font-normal text-muted-foreground">{unidad}</span>}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Dato({ etiqueta, valor }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-border py-1 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="tabular text-right font-semibold text-foreground">{valor}</span>
    </div>
  );
}

const ESTILO_AVISO = {
  error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200',
  aviso: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
  info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
};

export function Aviso({ nivel = 'info', children }) {
  const Icono = nivel === 'error' ? XCircle : nivel === 'aviso' ? AlertTriangle : Info;
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-2.5 text-xs ${ESTILO_AVISO[nivel] || ESTILO_AVISO.info}`} role={nivel === 'error' ? 'alert' : 'status'}>
      <Icono className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function Interruptor({ activo, onChange, children, prueba }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={activo}
        onChange={(e) => onChange(e.target.checked)}
        data-prueba={prueba}
        className="h-4 w-4 rounded border-border accent-cyan-600"
      />
      {children}
    </label>
  );
}

