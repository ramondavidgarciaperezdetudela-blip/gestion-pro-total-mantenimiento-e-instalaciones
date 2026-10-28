import React from 'react';
import { Trash2 } from 'lucide-react';

// Panel de detalles del elemento o pared seleccionada. Permite editar marca,
// modelo, cantidad y notas, y borrar la selección.
export default function PlanoEquipoDetalles({ element, wall, scale, onUpdate, onDelete }) {
  if (!element && !wall) {
    return (
      <div className="text-xs text-muted-foreground p-2">
        Selecciona un equipo o una pared en el lienzo para ver sus datos.
      </div>
    );
  }

  if (wall) {
    const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
    return (
      <div className="flex flex-col gap-2">
        <div className="tech-label">Pared seleccionada</div>
        <div className="text-sm">Longitud: <span className="font-mono font-bold">{(len / scale).toFixed(2)} m</span></div>
        <button onClick={onDelete} className="flex items-center justify-center gap-1.5 rounded-md border border-destructive/40 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" /> Borrar pared
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="tech-label" style={{ color: element.color }}>{element.label}</div>
        <button onClick={onDelete} className="p-1 rounded text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <Campo label="Etiqueta">
        <input value={element.label || ''} onChange={(e) => onUpdate({ label: e.target.value })}
          className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
      </Campo>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Marca">
          <input value={element.brand || ''} onChange={(e) => onUpdate({ brand: e.target.value })}
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
        <Campo label="Modelo">
          <input value={element.model || ''} onChange={(e) => onUpdate({ model: e.target.value })}
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tamaño (m)">
          <div className="flex gap-1">
            <input type="number" step="0.1" value={element.w_m ?? ''} onChange={(e) => onUpdate({ w_m: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
            <input type="number" step="0.1" value={element.h_m ?? ''} onChange={(e) => onUpdate({ h_m: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
          </div>
        </Campo>
        <Campo label="Cantidad">
          <input type="number" min="1" value={element.qty ?? 1} onChange={(e) => onUpdate({ qty: parseInt(e.target.value) || 1 })}
            className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs" />
        </Campo>
      </div>
      <Campo label="Notas">
        <textarea value={element.notes || ''} onChange={(e) => onUpdate({ notes: e.target.value })} rows={2}
          className="w-full rounded-md border border-border bg-input px-2 py-1 text-xs resize-none" />
      </Campo>
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