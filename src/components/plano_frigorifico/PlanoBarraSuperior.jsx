import React, { useState, useMemo } from 'react';
import {
  Save, FileDown, Box, Minimize2, Search, Plus, Wand2, Sparkles,
} from 'lucide-react';
import { CATEGORIAS, ELEMENTOS } from '@/lib/planoFrigorificoCatalogo';
import PlanoMenuEquipos from './PlanoMenuEquipos';
import PlanoSimbolo from './PlanoSimbolo';
import PlanoBarraHerramientas from './PlanoBarraHerramientas';
import MenuElegirVersion from './MenuElegirVersion';

/**
 * PlanoBarraSuperior — barra de herramientas del editor a pantalla completa.
 *
 * Arriba va la barra de dibujo y edición (estilo Paint), después las acciones
 * (Guardar, PDF, Visor 3D, Salir) y debajo los menús de equipos por categoría
 * con el buscador. El lienzo ocupa todo lo que queda.
 */
export default function PlanoBarraSuperior({
  mode, activeType, connectType, onPick, onSala, onCamara,
  onUndo, onRedo, onCopy, onCut, onPaste, canUndo, canRedo, canCopy, canPaste,
  saving, onSave, onPDF, on3D, onExit,
  extraPorCat, onAddElement, onEditarIconos, iaIcons = {},
}) {
  const [q, setQ] = useState('');
  const [busqAbierta, setBusqAbierta] = useState(false);
  // Catálogo de fábrica + los elementos personalizados del usuario, en una
  // sola lista para poder buscar en todos a la vez desde la barra superior.
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const todos = useMemo(() => {
    // Cada símbolo lleva su versión IA si la tiene, igual que en la paleta.
    const conIA = (el) => (iaIcons[el.id] ? { ...el, image_url: iaIcons[el.id] } : el);
    const out = ELEMENTOS.map(conIA);
    if (extraPorCat) Object.values(extraPorCat).forEach((arr) => { if (arr?.length) out.push(...arr); });
    return out;
  }, [extraPorCat, iaIcons]);
  const resultados = q.trim()
    ? todos.filter((e) => norm(`${e.label} ${e.cat}`).includes(norm(q))).slice(0, 24)
    : [];
  const elegir = (el) => { onPick({ mode: 'place', element: el }); setQ(''); setBusqAbierta(false); };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
      {/* Fila 1: barra de dibujo y edición (estilo Paint) */}
      <PlanoBarraHerramientas
        mode={mode} connectType={connectType} onPick={onPick} onSala={onSala} onCamara={onCamara}
        onUndo={onUndo} onRedo={onRedo} onCopy={onCopy} onCut={onCut} onPaste={onPaste}
        canUndo={canUndo} canRedo={canRedo} canCopy={canCopy} canPaste={canPaste} />

      {/* Fila 2: acciones de plano */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button onClick={onPDF}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted">
          <FileDown className="w-3.5 h-3.5" /> PDF
        </button>
        <button onClick={on3D}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}>
          <Box className="w-3.5 h-3.5" /> Visor 3D
        </button>
        <button onClick={onExit}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-white hover:opacity-90 ml-auto"
          style={{ background: '#0f172a' }}>
          <Minimize2 className="w-3.5 h-3.5" /> Salir
        </button>
      </div>

      {/* Fila 3: menús de equipos por categoría + buscador */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Equipos</span>
        {CATEGORIAS.map((cat) => (
          <PlanoMenuEquipos key={cat.id} cat={cat} activeType={activeType} onPick={onPick} extraPorCat={extraPorCat} iaIcons={iaIcons} />
        ))}
        {onAddElement && (
          <button onClick={onAddElement}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-white hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#00D4FF,#7C3AED)' }}
            title="Añadir un elemento o maquinaria propia al catálogo">
            <Plus className="w-3.5 h-3.5" /> Añadir
          </button>
        )}
        {onEditarIconos && (
          <button onClick={onEditarIconos}
            className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
            title="Crear la versión IA de cualquier equipo, regenerarla o editarla a mano">
            <Wand2 className="w-3.5 h-3.5" style={{ color: '#7C3AED' }} /> Iconos
          </button>
        )}
        <div className="relative ml-auto">
          <div className="flex items-center gap-1 rounded-md border border-border bg-input px-2 py-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <input value={q}
              onChange={(e) => { setQ(e.target.value); setBusqAbierta(true); }}
              onFocus={() => setBusqAbierta(true)}
              placeholder="Buscar equipo…"
              className="bg-transparent text-xs outline-none w-32" />
            {q && (
              <button onClick={() => { setQ(''); setBusqAbierta(false); }}
                className="text-[10px] text-muted-foreground hover:text-foreground">✕</button>
            )}
          </div>
          {/* Resultados: lista ágil de todas las categorías a la vez. */}
          {busqAbierta && q.trim() && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBusqAbierta(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-card shadow-2xl p-2 max-h-[60vh] overflow-y-auto"
                style={{ width: 'max-content', maxWidth: '90vw', minWidth: 224 }}>
                {resultados.length === 0 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">Nada encontrado</span>
                )}
                <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
                  {resultados.map((el) => {
                    const color = CATEGORIAS.find((c) => c.id === el.cat)?.color || '#888';
                    return (
                      <button key={el.id} onClick={() => elegir(el)} title={el.label}
                        className="relative flex flex-col items-center gap-0.5 rounded-md border px-1 py-1 w-[96px] transition-all hover:scale-[1.03]"
                        style={{ borderColor: color + '66', borderTopColor: color, borderTopWidth: 2 }}>
                        {el.glyph && (
                          <span className="absolute top-0.5 right-1 text-[8px] font-bold" style={{ color }}>{el.glyph}</span>
                        )}
                        <svg viewBox="-40 -30 80 60" width="64" height="48" style={{ display: 'block' }}>
                          <PlanoSimbolo el={{ ...el, type: el.id, id: 'b-' + el.id, datos: el.image_url ? { image_url: el.image_url } : {}, color, w_m: el.w_m, h_m: el.h_m }} scale={46} mini />
                        </svg>
                        <span className="text-[9px] leading-tight text-center w-full truncate">{el.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}