import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Printer, FileBox, RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { SECCIONES, opcionesPorDefecto } from '@/lib/planoPaquete';

/**
 * DialogoExportarPlano — pide cómo sacar el plano: formato (PDF, imprimir o CAD),
 * tamaño de papel y, apartado por apartado, si se incluye y si la hoja va en
 * vertical u horizontal. Cada apartado sale en su propia hoja:
 *   · Plano frigorífico (con leyenda y datos de los elementos)
 *   · Plano eléctrico (con su leyenda)
 *   · Cálculos y medidas
 *   · Vista 3D (solo PDF e impresión: un CAD no guarda imágenes)
 * Lo elegido se recuerda para la próxima vez.
 */
const CLAVE = 'plano_export_opciones';

function leer() {
  const base = opcionesPorDefecto();
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (!g) return { ...base, formato: 'pdf' };
    return {
      formato: ['pdf', 'imprimir', 'cad'].includes(g.formato) ? g.formato : 'pdf',
      papel: g.papel === 'a4' ? 'a4' : 'a3',
      secciones: base.secciones.map((s) => {
        const x = (g.secciones || []).find((y) => y.id === s.id);
        return x ? { ...s, incluir: x.incluir !== false, orientacion: x.orientacion === 'vertical' ? 'vertical' : 'horizontal' } : s;
      }),
    };
  } catch { return { ...base, formato: 'pdf' }; }
}

const FORMATOS = [
  { id: 'pdf', t: 'PDF', Icono: FileDown },
  { id: 'imprimir', t: 'Imprimir', Icono: Printer },
  { id: 'cad', t: 'CAD (DXF)', Icono: FileBox },
];

export default function DialogoExportarPlano({ open, onClose, onConfirm }) {
  const [op, setOp] = useState(leer);
  useEffect(() => { if (open) setOp(leer()); }, [open]);
  if (!open) return null;

  const cambia = (id, parche) => setOp((o) => ({ ...o, secciones: o.secciones.map((s) => (s.id === id ? { ...s, ...parche } : s)) }));
  const esCad = op.formato === 'cad';
  const visibles = op.secciones.filter((s) => !(esCad && SECCIONES.find((x) => x.id === s.id && !x.cad)));
  const elegidas = visibles.filter((s) => s.incluir);

  const aceptar = () => {
    try { localStorage.setItem(CLAVE, JSON.stringify(op)); } catch { /* sin almacenamiento: no pasa nada */ }
    onConfirm({ formato: op.formato, opciones: { papel: op.papel, secciones: visibles } });
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 10002, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} data-prueba="dialogo-exportar">
      <div className="bg-card text-card-foreground border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Guardar o imprimir el plano</h2>
          <p className="text-xs text-muted-foreground">Cada apartado sale en su propia hoja. Elige cuáles y si la hoja va en vertical u horizontal.</p>
        </div>

        <div>
          <div className="text-xs font-medium mb-1.5">Formato</div>
          <div className="grid grid-cols-3 gap-2">
            {FORMATOS.map(({ id, t, Icono }) => (
              <button key={id} type="button" onClick={() => setOp((o) => ({ ...o, formato: id }))} data-prueba={`formato-${id}`}
                className="flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs"
                style={op.formato === id ? { borderColor: '#2563eb', background: '#2563eb22', color: '#2563eb', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
                <Icono className="w-3.5 h-3.5" /> {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium mb-1.5">Papel</div>
          <div className="grid grid-cols-2 gap-2">
            {[['a3', 'A3 (420 × 297 mm)'], ['a4', 'A4 (297 × 210 mm)']].map(([id, t]) => (
              <button key={id} type="button" onClick={() => setOp((o) => ({ ...o, papel: id }))} data-prueba={`papel-${id}`}
                className="rounded-lg border px-2 py-2 text-xs"
                style={op.papel === id ? { borderColor: '#2563eb', background: '#2563eb22', color: '#2563eb', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium mb-1.5">Apartados y posición de la hoja</div>
          <div className="space-y-2">
            {visibles.map((s) => {
              const def = SECCIONES.find((x) => x.id === s.id);
              return (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2" style={{ opacity: s.incluir ? 1 : 0.55 }}>
                  <label className="flex items-center gap-2 flex-1 min-w-0 text-sm cursor-pointer">
                    <input type="checkbox" checked={s.incluir} onChange={(e) => cambia(s.id, { incluir: e.target.checked })} data-prueba={`incluir-${s.id}`} />
                    <span className="truncate">{def?.titulo}</span>
                  </label>
                  <div className="flex gap-1">
                    {[['horizontal', RectangleHorizontal, 'Horizontal'], ['vertical', RectangleVertical, 'Vertical']].map(([o, Icono, t]) => (
                      <button key={o} type="button" disabled={!s.incluir} onClick={() => cambia(s.id, { orientacion: o })}
                        data-prueba={`orient-${s.id}-${o}`} title={t}
                        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs disabled:cursor-not-allowed"
                        style={s.orientacion === o ? { borderColor: '#2563eb', background: '#2563eb22', color: '#2563eb', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
                        <Icono className="w-3.5 h-3.5" /> {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {esCad && <p className="text-[11px] text-muted-foreground mt-1.5">El CAD guarda las hojas una al lado de otra, cada apartado en sus capas. La vista 3D es una imagen y solo va en PDF e impresión.</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancelar</button>
          <button type="button" onClick={aceptar} disabled={!elegidas.length} data-prueba="exportar-aceptar"
            className="rounded-lg px-4 py-1.5 text-xs text-white disabled:opacity-40" style={{ background: '#2563eb' }}>
            {op.formato === 'imprimir' ? 'Imprimir' : op.formato === 'cad' ? 'Guardar CAD' : 'Guardar PDF'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
