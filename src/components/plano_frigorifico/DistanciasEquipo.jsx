import React, { useEffect, useState } from 'react';
import { distanciasAParedes, colocarADistancia, LADOS, NOMBRE_LADO, textoMetros } from '@/lib/planoImanes';

/**
 * Distancias del equipo seleccionado a las paredes. Se puede escribir cualquier medida (desde 1 mm: 0,375 m)
 * y, al pulsar Intro, el equipo se coloca exactamente a esa distancia de la pared elegida.
 */
export default function DistanciasEquipo({ elemento, walls, scale, onMover }) {
  const [vals, setVals] = useState({});
  const dist = elemento ? distanciasAParedes(elemento, walls, scale) : null;
  const clave = elemento ? `${elemento.id}|${elemento.x}|${elemento.y}|${elemento.rot || 0}` : '';
  useEffect(() => { setVals({}); }, [clave]);
  if (!elemento || !dist || !LADOS.some((l) => dist[l])) return null;

  const aplicar = (lado) => {
    const txt = vals[lado];
    if (txt == null || txt === '') return;
    const m = Number(String(txt).replace(',', '.'));
    if (!Number.isFinite(m) || m < 0) return;
    const pos = colocarADistancia(elemento, walls, scale, lado, m);
    if (pos) onMover(elemento.id, pos);
  };

  return (
    <div className="rounded-md border border-border p-2 space-y-1.5 text-xs" data-prueba="distancias-equipo">
      <div className="font-semibold">Distancia a las paredes (m)</div>
      {LADOS.filter((l) => dist[l]).map((l) => (
        <label key={l} className="flex items-center gap-2">
          <span className="w-40 text-muted-foreground">{NOMBRE_LADO[l]}</span>
          <input
            inputMode="decimal"
            data-prueba={`distancia-${l}`}
            className="w-24 rounded border border-border bg-background px-1.5 py-1"
            value={vals[l] ?? textoMetros(dist[l].m)}
            onChange={(e) => setVals((v) => ({ ...v, [l]: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); aplicar(l); } }}
            onBlur={() => aplicar(l)}
          />
        </label>
      ))}
      <div className="text-muted-foreground">Escribe la medida que quieras (hasta el milímetro) y pulsa Intro.</div>
    </div>
  );
}
