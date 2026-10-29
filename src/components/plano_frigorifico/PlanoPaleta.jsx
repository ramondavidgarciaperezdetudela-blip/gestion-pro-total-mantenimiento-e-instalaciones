import React, { useState, useMemo } from 'react';
import {
  Thermometer, Wind, Zap, ShieldAlert, Box, ChevronDown, Search, Boxes, Plus, Wand2, Sparkles, Loader2,
} from 'lucide-react';
import { CATEGORIAS, ELEMENTOS, elementosPorCategoria, buscar, DESCRIPCIONES_ELECTRICO } from '@/lib/planoFrigorificoCatalogo';
import PlanoSimbolo from './PlanoSimbolo';
import PlanoBarraHerramientas from './PlanoBarraHerramientas';
import MenuElegirVersion from './MenuElegirVersion';

const CAT_ICON = {
  refrigeracion: Thermometer,
  clima: Wind,
  ventilacion: Wind,
  electrico: Zap,
  seguridad: ShieldAlert,
  estructura: Box,
};

// Paleta del plano: símbolos organizados por familia, todos visibles a la vez.
// Cada botón va con el dibujo realista GRANDE (para leer el símbolo y su
// descripción) y el código corto de la máquina en una esquina. Refrigeración
// en cian frío y climatización en ámbar cálido, para distinguirlas a primera
// vista.
//
// La barra de herramientas de dibujo incluye además de Pared y Conexiones:
// Texto (notas), Cota (línea de medida) y Mano alzada (trazo libre), que
// faltaban para hacer un plano completo.
export default function PlanoPaleta({
  mode, activeType, connectType, onPick, onSala, onCamara,
  onUndo, onRedo, onCopy, onCut, onPaste, canUndo, canRedo, canCopy, canPaste,
  extraElementos = [], onAddElement, onEditarIconos, iaIcons = {}, onCrearIconoIA,
}) {
  // Filtro de categoría activo: 'todos' o el id de una. Al elegir un chip se
  // muestra solo ese apartado, desplegado, para llegar al símbolo sin tener que
  // navegar por todos los demás.
  const [catFiltro, setCatFiltro] = useState('todos');
  // Por defecto los apartados van cerrados (menús con icono): así no se tienen
  // todas las listas abiertas a la vez. El chip de categoría abre solo ese.
  const [abierta, setAbierta] = useState(() => Object.fromEntries(CATEGORIAS.map((c) => [c.id, false])));
  const [q, setQ] = useState('');
  // Catálogo de fábrica + los elementos personalizados que el usuario haya
  // añadido, agrupados por su apartado para que aparezcan donde corresponden.
  // Cada símbolo de fábrica lleva pegada su versión IA si la tiene generada:
  // así al pulsarlo se elige entre el símbolo técnico y el icono IA.
  const conIA = (el) => (iaIcons[el.id] ? { ...el, image_url: iaIcons[el.id] } : el);
  const porCat = useMemo(() => {
    const out = elementosPorCategoria();
    Object.keys(out).forEach((k) => { out[k] = out[k].map(conIA); });
    (extraElementos || []).forEach((it) => { (out[it.cat] = out[it.cat] || []).push(it); });
    // El apartado «Iconos IA» enseña TODO el catálogo, no solo lo ya generado:
    // de un golpe se ve qué equipos tienen ya su icono y cuáles se pueden crear.
    out.ia = [
      ...ELEMENTOS.map(conIA),
      ...(extraElementos || []).filter((it) => it.cat === 'ia'),
    ];
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraElementos, iaIcons]);
  // Icono que se está generando ahora mismo (para el giro del botón).
  const [creandoIA, setCreandoIA] = useState(null);
  const crearIA = async (el) => {
    if (!onCrearIconoIA) return;
    setCreandoIA(el.id);
    try { await onCrearIconoIA(el); } finally { setCreandoIA(null); }
  };
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const resultados = q
    ? [...ELEMENTOS.map(conIA), ...(extraElementos || [])].filter((e) => norm(`${e.label} ${e.cat}`).includes(norm(q)))
    : null;
  // Si hay chip de categoría activo se estrecha el listado a ese apartado.
  const catsVisibles = catFiltro === 'todos'
    ? CATEGORIAS
    : CATEGORIAS.filter((c) => c.id === catFiltro);
  const limpiar = () => { setQ(''); setCatFiltro('todos'); };

  return (
    <div className="flex flex-col gap-2">
      {/* Barra de herramientas de dibujo y edición (estilo Paint) */}
      <PlanoBarraHerramientas
        mode={mode} connectType={connectType} onPick={onPick} onSala={onSala} onCamara={onCamara}
        onUndo={onUndo} onRedo={onRedo} onCopy={onCopy} onCut={onCut} onPaste={onPaste}
        canUndo={canUndo} canRedo={canRedo} canCopy={canCopy} canPaste={canPaste} />

      {/* Buscador de equipos + botón para añadir un elemento propio */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-md border border-border bg-input px-2 py-1 flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar equipo… (ej: compresor, difusor)"
            className="bg-transparent text-xs outline-none flex-1 min-w-0" />
          {(q || catFiltro !== 'todos') && (
            <button onClick={limpiar} className="text-[10px] text-muted-foreground hover:text-foreground px-1">✕</button>
          )}
        </div>
        {onAddElement && (
          <button onClick={onAddElement}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] text-white hover:opacity-90 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}
            title="Añadir un elemento o maquinaria propia al catálogo">
            <Plus className="w-3.5 h-3.5" /> Añadir
          </button>
        )}
        {onEditarIconos && (
          <button onClick={onEditarIconos}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] hover:bg-muted whitespace-nowrap"
            title="Editar iconos del catálogo: regenerar con IA, editar a mano y elegir la mejor versión">
            <Wand2 className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} /> Editar iconos
          </button>
        )}
      </div>

      {/* Chips de categoría: salto rápido a un apartado sin buscar. Cada uno
          lleva el color de su familia y el recuento, para ver de un golpe
          cuántos símbolos hay en cada uno. */}
      {!resultados && (
        <div className="flex flex-wrap gap-1.5">
          <ChipCat label="Todos" activo={catFiltro === 'todos'} color="#8890a8"
            onClick={() => setCatFiltro('todos')} />
          {CATEGORIAS.map((cat) => (
            <ChipCat key={cat.id} label={cat.label} icon={CAT_ICON[cat.id] || Box}
              count={(porCat[cat.id] || []).length}
              activo={catFiltro === cat.id} color={cat.color}
              onClick={() => setCatFiltro(cat.id)} />
          ))}
        </div>
      )}

      {/* Resultados de búsqueda: busqueda ágil, muestra coincidencias de todas
          las familias a la vez, ordenadas por relevancia (primero las que
          empiezan por lo escrito). */}
      {resultados ? (
        <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-border bg-muted/30">
          {resultados.length === 0 && <span className="text-xs text-muted-foreground p-1">Nada encontrado</span>}
          {resultados.map((el) => (
            <BotonEquipo key={el.id} el={el} activo={mode === 'place' && activeType === el.id}
              onClick={(variant) => onPick({ mode: 'place', element: variant || el })} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {catsVisibles.map((cat) => {
            const Icon = CAT_ICON[cat.id] || Box;
            const items = porCat[cat.id] || [];
            if (!items.length) return null;
            // Con chip de categoría activo el panel se abre solo; en "Todos"
            // se respeta el estado de despliegue de cada uno.
            const open = catFiltro !== 'todos' ? true : abierta[cat.id];
            return (
              <div key={cat.id} className="rounded-lg border overflow-hidden" style={{ borderColor: cat.color + '55' }}>
                <button
                  onClick={() => setAbierta((a) => ({ ...a, [cat.id]: !a[cat.id] }))}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors"
                  style={{ color: cat.color, background: cat.color + '1a' }}>
                  <Icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{cat.label}</span>
                  <span className="text-[10px] font-normal opacity-70 flex items-center gap-0.5">
                    <Boxes className="w-3 h-3" />{items.length}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                  <div className="flex flex-wrap gap-2 p-2 bg-card/40">
                    {items.map((el) => (
                      <BotonEquipo key={el.id} el={el} activo={mode === 'place' && activeType === el.id}
                        onClick={(variant) => onPick({ mode: 'place', element: variant || el })}
                        onCrearIA={cat.id === 'ia' && onCrearIconoIA ? () => crearIA(el) : null}
                        creando={creandoIA === el.id} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChipCat({ label, icon: Icon, count, activo, color, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all whitespace-nowrap"
      style={{
        borderColor: activo ? color : 'hsl(var(--border))',
        color: activo ? color : 'hsl(var(--muted-foreground))',
        background: activo ? color + '1a' : 'transparent',
      }}>
      {Icon && <Icon className="w-3 h-3" />}
      {label}
      {count != null && <span className="text-[9px] opacity-70">{count}</span>}
    </button>
  );
}

function BotonEquipo({ el, activo, onClick, onCrearIA, creando }) {
  const color = CAT_COLOR(el.cat);
  const [menu, setMenu] = useState(false);
  // Si el equipo tiene icono IA, al pulsarlo se abre el menú para elegir la
  // versión (estándar/IA). Si no, se coloca el símbolo estándar directamente.
  const pulsar = () => {
    if (el.image_url) setMenu((v) => !v);
    else onClick();
  };
  const elegir = (variant) => onClick(variant);
  return (
    <div className="relative">
      <button
        onClick={pulsar}
        title={el.label}
        className="relative flex flex-col items-center gap-1 rounded-lg border px-1.5 py-1.5 w-[104px] transition-all hover:scale-[1.03]"
        style={{
          borderColor: activo ? color : 'hsl(var(--border))',
          background: activo ? color + '22' : 'transparent',
          borderTopColor: color,
          borderTopWidth: 3,
          boxShadow: activo ? `0 0 0 2px ${color}55` : 'none',
        }}
      >
        {/* Código corto de la máquina, como pista rápida de identificación */}
        {el.glyph && (
          <span className="absolute top-1 right-1.5 text-[9px] font-bold px-1 rounded leading-none"
            style={{ color, background: color + '1a' }}>{el.glyph}</span>
        )}
        {el.image_url && (
          <span className="absolute top-1 left-1 text-[8px] font-bold px-1 rounded leading-none flex items-center gap-0.5"
            style={{ color: '#7C3AED', background: '#7C3AED1a' }} title="Tiene versión IA">
            <Sparkles className="w-2 h-2" />IA
          </span>
        )}
        <svg viewBox="-40 -30 80 60" width="84" height="62" style={{ display: 'block' }}>
          <PlanoSimbolo el={{ ...el, type: el.id, id: 'pal-' + el.id, datos: el.image_url ? { image_url: el.image_url } : {}, color, w_m: el.w_m, h_m: el.h_m }} scale={52} mini />
        </svg>
        <span className="text-[10px] leading-tight text-center w-full"
          style={{ color: activo ? color : 'hsl(var(--foreground))', fontWeight: activo ? 700 : 500 }}>
          {el.label}
        </span>
        {/* Descripción clara de los símbolos eléctricos, para facilitar la
            lectura de la aparamenta en la paleta. */}
        {el.cat === 'electrico' && DESCRIPCIONES_ELECTRICO[el.id] && (
          <span className="text-[9px] leading-tight text-center w-full text-muted-foreground italic">
            {DESCRIPCIONES_ELECTRICO[el.id]}
          </span>
        )}
      </button>
      {/* En el apartado «Iconos IA», los equipos que aún no tienen su icono
          llevan aquí el botón para crearlo. */}
      {onCrearIA && !el.image_url && (
        <button onClick={onCrearIA} disabled={creando} title="Crear el icono IA de este equipo"
          className="mt-1 w-[104px] flex items-center justify-center gap-1 rounded-md border border-dashed px-1 py-1 text-[9px] font-semibold hover:bg-muted disabled:opacity-50"
          style={{ borderColor: '#7C3AED77', color: '#7C3AED' }}>
          {creando ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
          {creando ? 'Creando…' : 'Crear IA'}
        </button>
      )}
      {menu && el.image_url && (
        <MenuElegirVersion el={el} onChoose={elegir} onClose={() => setMenu(false)} />
      )}
    </div>
  );
}

function CAT_COLOR(cat) {
  return CATEGORIAS.find((c) => c.id === cat)?.color || '#888';
}