import React from 'react';
import { Palette } from 'lucide-react';

/**
 * SelectorColor — botonera para elegir el color de un elemento, pared o
 * conexión del plano. Sirve para diferenciar partes de la instalación (por
 * ejemplo, una ampliación de cámara en otro color).
 *
 * Mantiene una paleta de colores técnicos y un input nativo para cualquier
 * otro tono. El color elegido se pasa arriba con `onChange`.
 */
const PALETA = [
  '#00D4FF', '#3b82f6', '#10b981', '#22c55e',
  '#eab308', '#f59e0b', '#f97316', '#ef4444',
  '#ec4899', '#7C3AED', '#64748b', '#0f172a',
];

export default function SelectorColor({ value, onChange, label = 'Color' }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
        <Palette className="w-3 h-3" /> {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {PALETA.map((c) => (
          <button key={c} type="button" title={c} onClick={() => onChange(c)}
            className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
            style={{ background: c, borderColor: value === c ? '#fff' : 'hsl(var(--border))', outline: value === c ? `2px solid ${c}` : 'none' }} />
        ))}
        <label className="relative w-5 h-5 rounded-full border-2 border-border cursor-pointer overflow-hidden" title="Color personalizado"
          style={{ background: value || '#888' }}>
          <input type="color" value={value || '#888'} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
        </label>
      </div>
    </div>
  );
}