import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ListTree, Search } from 'lucide-react';
import { listaDelPlano } from '@/lib/planoLista';

/**
 * Lista de TODO lo que hay dibujado en el plano (cámaras, puertas, equipos, conexiones, paredes), para
 * seleccionarlo desde aquí cuando en el dibujo cuesta acertar —las puertas, sobre todo, que quedan
 * pegadas a la pared de la cámara—.
 */
export default function PlanoListaElementos({ walls, elements, connections, scale, selectedId, onSelect }) {
  const [abierto, setAbierto] = useState(true);
  const [q, setQ] = useState('');
  const [cerrados, setCerrados] = useState({});
  const filaSel = useRef(null);

  const grupos = useMemo(() => {
    const t = q.trim().toLowerCase();
    return listaDelPlano({ walls, elements, connections, scale })
      .map((g) => ({ ...g, items: t ? g.items.filter((i) => `${i.etiqueta} ${i.detalle}`.toLowerCase().includes(t)) : g.items }))
      .filter((g) => g.items.length);
  }, [walls, elements, connections, scale, q]);
  const total = useMemo(() => listaDelPlano({ walls, elements, connections, scale }).reduce((n, g) => n + g.items.length, 0), [walls, elements, connections, scale]);

  // Si se selecciona en el dibujo, la lista se desplaza hasta esa fila.
  useEffect(() => { filaSel.current?.scrollIntoView?.({ block: 'nearest' }); }, [selectedId]);

  return (
    <div className="rounded-lg border border-border mb-3" data-prueba="lista-elementos">
      <button type="button" onClick={() => setAbierto((v) => !v)} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold">
        <ListTree className="w-3.5 h-3.5" /> Elementos del plano ({total})
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="border-t border-border p-1.5 space-y-1.5">
          {total > 8 && (
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="w-full h-7 rounded-md border border-border bg-input pl-6 pr-2 text-xs" />
            </div>
          )}
          {total === 0 && <p className="text-[10px] text-muted-foreground px-1">Todavía no hay nada dibujado.</p>}
          <div className="max-h-64 overflow-y-auto space-y-1">
            {grupos.map((g) => {
              const cerrado = cerrados[g.grupo] && !q;
              return (
                <div key={g.grupo}>
                  <button type="button" onClick={() => setCerrados((c) => ({ ...c, [g.grupo]: !c[g.grupo] }))}
                    className="w-full flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold px-1 py-0.5">
                    <ChevronDown className={`w-3 h-3 transition-transform ${cerrado ? '-rotate-90' : ''}`} />{g.grupo} ({g.items.length})
                  </button>
                  {!cerrado && g.items.map((i) => {
                    const sel = i.id === selectedId;
                    return (
                      <button key={i.id} type="button" ref={sel ? filaSel : null} onClick={() => onSelect(i.id)}
                        data-prueba="fila-elemento" aria-pressed={sel}
                        className="w-full flex items-start gap-1.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors"
                        style={sel ? { background: 'hsl(var(--primary)/0.15)', outline: '1px solid hsl(var(--primary))' } : undefined}>
                        <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: i.color }} />
                        <span className="min-w-0">
                          <span className={`block truncate ${sel ? 'font-semibold' : ''}`}>{i.etiqueta}</span>
                          {i.detalle && <span className="block truncate text-[10px] text-muted-foreground">{i.detalle}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
