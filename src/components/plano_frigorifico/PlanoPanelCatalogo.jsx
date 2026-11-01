import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { CATEGORIAS, ELEMENTOS, elementosPorCategoria } from '@/lib/planoFrigorificoCatalogo';
import { OpcionEquipo } from './PlanoMenuEquipos';

/**
 * Panel fijo de máquinas y elementos (estilo CAD): categorías plegables con
 * el símbolo de cada equipo y buscador. Un clic y se coloca en el plano.
 */
export default function PlanoPanelCatalogo({ activeType, onPick, extraPorCat = {}, iaIcons = {} }) {
  const [abiertas, setAbiertas] = useState({ refrigeracion: true });
  const [texto, setTexto] = useState('');
  const conIA = (el) => (iaIcons[el.id] ? { ...el, image_url: iaIcons[el.id] } : el);
  const porCat = useMemo(() => {
    const base = elementosPorCategoria();
    return CATEGORIAS.map((cat) => ({
      cat,
      items: cat.id === 'ia'
        ? [...ELEMENTOS.filter((e) => iaIcons[e.id]).map(conIA), ...(extraPorCat.ia || [])]
        : [...(base[cat.id] || []).map(conIA), ...(extraPorCat[cat.id] || [])],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraPorCat, iaIcons]);
  const t = texto.trim().toLowerCase();
  return (
    <div className="flex flex-col min-h-0 h-full rounded-lg border border-border bg-card" data-testid="panel-catalogo">
      <div className="px-3 py-2 border-b border-border text-xs font-bold tracking-wide">Máquinas y elementos</div>
      <div className="p-2 relative">
        <Search className="w-3.5 h-3.5 absolute left-4 top-4 text-muted-foreground" />
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar equipo…"
          className="w-full rounded-md border border-border bg-input pl-7 pr-2 py-1.5 text-xs" />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {porCat.map(({ cat, items }) => {
          const vis = t ? items.filter((e) => String(e.label).toLowerCase().includes(t)) : items;
          if (!vis.length) return null;
          const abierta = t ? true : abiertas[cat.id];
          return (
            <div key={cat.id}>
              <button className="w-full flex items-center gap-1.5 py-1.5 text-xs font-semibold" style={{ color: cat.color }}
                onClick={() => setAbiertas((a) => ({ ...a, [cat.id]: !a[cat.id] }))}>
                {abierta ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {cat.label} <span className="text-muted-foreground font-normal">({vis.length})</span>
              </button>
              {abierta && (
                <div className="grid grid-cols-2 gap-1.5 pb-1">
                  {vis.map((el) => (
                    <OpcionEquipo key={el.id} el={el} cat={cat} activo={activeType === el.id}
                      onPick={(variant) => onPick({ mode: 'place', element: variant || el })} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
