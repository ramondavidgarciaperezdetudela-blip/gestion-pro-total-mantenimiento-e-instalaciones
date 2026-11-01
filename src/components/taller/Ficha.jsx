import React from 'react';
import { ChevronRight } from 'lucide-react';

/** Piezas comunes de las fichas de taller: tarjeta, campo, entrada, selector y cabecera con migas. */
export function Tarjeta({ icono: Icono, titulo, children, className = '', ...rest }) {
  return (
    <section className={`rounded-lg border bg-card ${className}`} {...rest}>
      {titulo && <header className="flex items-center gap-2 border-b px-3 py-2">{Icono && <Icono className="h-4 w-4 text-muted-foreground" />}<h3 className="text-sm font-semibold">{titulo}</h3></header>}
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}
export function Campo({ etiqueta, obligatorio, ayuda, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}{obligatorio && <span className="ml-0.5 text-destructive">*</span>}</span>
      <div className="mt-0.5">{children}</div>
      {ayuda && <span className="mt-0.5 block text-[11px] text-muted-foreground">{ayuda}</span>}
    </label>
  );
}
const base = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
export const Entrada = React.forwardRef(function Entrada({ className = '', ...p }, ref) { return <input ref={ref} className={`${base} ${className}`} {...p} />; });
export function Selector({ opciones, value, onChange, vacio = '—', ...p }) {
  return (
    <select className={base} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p}>
      {vacio !== null && <option value="">{vacio}</option>}
      {opciones.map((o) => { const v = typeof o === 'string' ? o : o.value; const l = typeof o === 'string' ? o : o.label; return <option key={v} value={v}>{l}</option>; })}
    </select>
  );
}
export const AreaTexto = (p) => <textarea rows={3} className={base} {...p} />;
export function Cabecera({ migas = [], titulo, descripcion, acciones }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        {migas.length > 0 && <nav className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">{migas.map((m, i) => <React.Fragment key={i}>{i > 0 && <ChevronRight className="h-3 w-3" />}{m.onClick ? <button type="button" onClick={m.onClick} className="hover:underline">{m.texto}</button> : <span>{m.texto}</span>}</React.Fragment>)}</nav>}
        <h1 className="text-xl font-bold">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex gap-2">{acciones}</div>}
    </div>
  );
}
export function Kpi({ etiqueta, valor, tono, ...rest }) {
  const color = tono === 'aviso' ? 'bg-amber-500' : tono === 'mal' ? 'bg-red-500' : tono === 'ok' ? 'bg-emerald-500' : '';
  return (
    <div className="rounded-lg border bg-card p-3" {...rest}>
      <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{etiqueta}</span>{color && <span className={`h-2 w-2 rounded-full ${color}`} />}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{valor}</div>
    </div>
  );
}
export const fechaES = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
