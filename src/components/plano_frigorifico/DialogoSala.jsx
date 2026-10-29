import React, { useState, useEffect } from 'react';
import { Square, Ruler } from 'lucide-react';

/**
 * DialogoSala — pide las medidas (ancho y largo en metros) antes de dibujar
 * una sala cuadrada o rectangular en el plano.
 *
 * El dibujo se hace en la página, que es quien conoce la escala y las paredes
 * existentes. Aquí solo se valida que las medidas sean positivas.
 *
 * Si llega `valorInicial` (al editar una sala ya dibujada), se parte de esas
 * medidas y el botón dice "Actualizar": así, al variarlas, el dibujo cambia.
 */
export default function DialogoSala({ open, valorInicial, onConfirm, onClose }) {
  const [ancho, setAncho] = useState('4');
  const [largo, setLargo] = useState('3');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAncho(valorInicial?.ancho != null ? String(valorInicial.ancho) : '4');
    setLargo(valorInicial?.largo != null ? String(valorInicial.largo) : '3');
    setError('');
  }, [open, valorInicial]);

  if (!open) return null;

  const aceptar = () => {
    const a = parseFloat(ancho);
    const l = parseFloat(largo);
    if (!(a > 0) || !(l > 0)) {
      setError('Las dos medidas deben ser mayores que 0.');
      return;
    }
    onConfirm({ ancho: a, largo: l });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-card border border-border p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0ea5e915' }}>
            <Square className="w-4 h-4" style={{ color: '#0ea5e9' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold">{valorInicial ? 'Editar sala' : 'Dibujar sala'}</h3>
            <p className="text-[11px] text-muted-foreground">
              Indica las medidas en metros y se dibujan las cuatro paredes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Ancho (m)
            </span>
            <input
              inputMode="decimal"
              value={ancho}
              onChange={(e) => setAncho(e.target.value)}
              placeholder="4"
              autoFocus
              className="rounded-md border border-border bg-input px-2 py-1.5 text-xs"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Largo (m)
            </span>
            <input
              inputMode="decimal"
              value={largo}
              onChange={(e) => setLargo(e.target.value)}
              placeholder="3"
              className="rounded-md border border-border bg-input px-2 py-1.5 text-xs"
            />
          </label>
        </div>

        {/* Vista previa de la proporción: un rectángulo que escala con las
            medidas, para hacerse idea del tamaño antes de dibujar. */}
        <div className="mt-3 flex items-end justify-center rounded-md border border-border bg-muted/30 py-3" style={{ height: 110 }}>
          {(() => {
            const a = Math.max(parseFloat(ancho) || 0, 0.1);
            const l = Math.max(parseFloat(largo) || 0, 0.1);
            const maxW = 150, maxH = 80;
            const k = Math.min(maxW / a, maxH / l);
            return (
              <div className="rounded-sm border-2" style={{
                width: Math.max(a * k, 10),
                height: Math.max(l * k, 10),
                borderColor: '#0ea5e9',
                background: '#0ea5e915',
              }} />
            );
          })()}
        </div>

        {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">
            Cancelar
          </button>
          <button onClick={aceptar}
            className="rounded-md px-3 py-1.5 text-xs text-white hover:opacity-90"
            style={{ background: '#0ea5e9' }}>
            {valorInicial ? 'Actualizar' : 'Dibujar'}
          </button>
        </div>
      </div>
    </div>
  );
}