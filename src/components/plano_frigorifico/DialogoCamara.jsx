import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Snowflake, Ruler, Layers } from 'lucide-react';

/**
 * DialogoCamara — pide los datos de una cámara frigorífica antes de dibujarla:
 *  - Medidas (ancho y largo en metros)
 *  - Tipo: positiva (conservación) o negativa (congelación)
 *  - Con suelo sanitario o sin él
 *  - Espesor del panel (mm)
 *
 * La cámara se dibuja distinta a una pared: como un recinto panelado de doble
 * línea, coloreado según el tipo (positiva en azul, negativa en rojo), con su
 * etiqueta en el centro. El dibujo lo hace la página a partir de los datos que
 * sale de aquí.
 *
 * Si llega `valorInicial` (al editar una cámara ya dibujada), parte de esos
 * valores y el botón dice "Actualizar".
 */
// Admite coma o punto decimal (3,5 o 3.5).
const aNum = (t) => parseFloat(String(t).replace(',', '.'));

export default function DialogoCamara({ open, valorInicial, onConfirm, onClose }) {
  const [ancho, setAncho] = useState('3');
  const [largo, setLargo] = useState('3');
  const [alto, setAlto] = useState('2.5');
  const [tipo, setTipo] = useState('positiva');
  const [suelo, setSuelo] = useState(true);
  const [espesor, setEspesor] = useState('100');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setAncho(valorInicial?.ancho != null ? String(valorInicial.ancho) : '3');
    setLargo(valorInicial?.largo != null ? String(valorInicial.largo) : '3');
    setAlto(valorInicial?.alto != null ? String(valorInicial.alto) : '2.5');
    setTipo(valorInicial?.tipo || 'positiva');
    setSuelo(valorInicial?.suelo !== false);
    setEspesor(valorInicial?.espesor != null ? String(valorInicial.espesor) : '100');
    setError('');
  }, [open, valorInicial]);

  if (!open) return null;

  const aceptar = () => {
    const a = aNum(ancho);
    const l = aNum(largo);
    const h = aNum(alto);
    if (!(a > 0) || !(l > 0) || !(h > 0)) { setError('El ancho, el largo y el alto deben ser mayores que 0.'); return; }
    onConfirm({ ancho: a, largo: l, alto: h, tipo, suelo: !!suelo, espesor: parseInt(espesor, 10) || 100 });
  };

  const colorTipo = tipo === 'positiva' ? '#3b82f6' : '#ef4444';

  // En un portal sobre <body>: así queda por encima de la pantalla completa del editor.
  return createPortal(
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-card border border-border p-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: colorTipo + '22' }}>
            <Snowflake className="w-4 h-4" style={{ color: colorTipo }} />
          </div>
          <div>
            <h3 className="text-sm font-bold">{valorInicial ? 'Editar cámara frigorífica' : 'Dibujar cámara frigorífica'}</h3>
            <p className="text-[11px] text-muted-foreground">
              Se dibuja como un recinto panelado distinto a una pared.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Ancho (m)
            </span>
            <input inputMode="decimal" value={ancho} onChange={(e) => setAncho(e.target.value)} placeholder="3"
              autoFocus className="rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Largo (m)
            </span>
            <input inputMode="decimal" value={largo} onChange={(e) => setLargo(e.target.value)} placeholder="3"
              className="rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Ruler className="w-3 h-3" /> Alto (m)
            </span>
            <input inputMode="decimal" value={alto} onChange={(e) => setAlto(e.target.value)} placeholder="2,5"
              data-prueba="camara-alto" className="rounded-md border border-border bg-input px-2 py-1.5 text-xs" />
          </label>
        </div>

        <label className="flex flex-col gap-1 mt-2">
          <span className="text-[10px] text-muted-foreground">Tipo de cámara</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'positiva', label: 'Positiva', desc: 'Conservación (≥ 0 °C)', color: '#3b82f6' },
              { id: 'negativa', label: 'Negativa', desc: 'Congelación (< 0 °C)', color: '#ef4444' },
            ].map((t) => (
              <button key={t.id} type="button" onClick={() => setTipo(t.id)}
                className="rounded-md border px-2 py-1.5 text-left transition-all"
                style={tipo === t.id
                  ? { borderColor: t.color, background: t.color + '1a', color: t.color, fontWeight: 600 }
                  : { borderColor: 'hsl(var(--border))' }}>
                <span className="text-xs">{t.label}</span>
                <span className="block text-[10px] opacity-70">{t.desc}</span>
              </button>
            ))}
          </div>
        </label>

        <label className="flex flex-col gap-1 mt-2">
          <span className="text-[10px] text-muted-foreground">Suelo sanitario</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setSuelo(true)}
              className="rounded-md border px-2 py-1.5 text-xs transition-all"
              style={suelo ? { borderColor: '#10b981', background: '#10b9811a', color: '#10b981', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
              Con suelo sanitario
            </button>
            <button type="button" onClick={() => setSuelo(false)}
              className="rounded-md border px-2 py-1.5 text-xs transition-all"
              style={!suelo ? { borderColor: '#64748b', background: '#64748b1a', color: '#475569', fontWeight: 600 } : { borderColor: 'hsl(var(--border))' }}>
              Sin suelo sanitario
            </button>
          </div>
        </label>

        <label className="flex flex-col gap-1 mt-2">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Layers className="w-3 h-3" /> Espesor del panel (mm)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {['60', '80', '100', '120', '150', '200'].map((e) => (
              <button key={e} type="button" onClick={() => setEspesor(e)}
                className="rounded-md border px-2.5 py-1 text-xs transition-all"
                style={espesor === e
                  ? { borderColor: colorTipo, background: colorTipo + '1a', color: colorTipo, fontWeight: 600 }
                  : { borderColor: 'hsl(var(--border))' }}>
                {e}
              </button>
            ))}
          </div>
        </label>

        {/* Vista previa de la proporción */}
        <div className="mt-3 flex items-end justify-center rounded-md border border-border bg-muted/30 py-3" style={{ height: 90 }}>
          {(() => {
            const a = Math.max(aNum(ancho) || 0, 0.1);
            const l = Math.max(aNum(largo) || 0, 0.1);
            const maxW = 140, maxH = 60;
            const k = Math.min(maxW / a, maxH / l);
            return (
              <div className="relative rounded-sm" style={{
                width: Math.max(a * k, 12), height: Math.max(l * k, 12),
                border: `3px solid ${colorTipo}`,
                background: colorTipo + '1a',
              }}>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: colorTipo }}>
                  ❄
                </span>
              </div>
            );
          })()}
        </div>

        {error && <p className="mt-2 text-[11px] text-destructive">{error}</p>}

        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted">Cancelar</button>
          <button onClick={aceptar} className="rounded-md px-3 py-1.5 text-xs text-white hover:opacity-90" style={{ background: colorTipo }}>
            {valorInicial ? 'Actualizar' : 'Dibujar cámara'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}