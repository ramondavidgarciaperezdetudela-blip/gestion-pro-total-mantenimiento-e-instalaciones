import React, { useState } from 'react';
import {
  Save, FileDown, Box, Minimize2, Search,
} from 'lucide-react';
import { CATEGORIAS } from '@/lib/planoFrigorificoCatalogo';
import PlanoMenuEquipos from './PlanoMenuEquipos';
import PlanoBarraHerramientas from './PlanoBarraHerramientas';

/**
 * PlanoBarraSuperior — barra de herramientas del editor a pantalla completa.
 *
 * Arriba va la barra de dibujo y edición (estilo Paint), después las acciones
 * (Guardar, PDF, Visor 3D, Salir) y debajo los menús de equipos por categoría
 * con el buscador. El lienzo ocupa todo lo que queda.
 */
export default function PlanoBarraSuperior({
  mode, activeType, connectType, onPick,
  onUndo, onRedo, onCopy, onCut, onPaste, canUndo, canRedo, canCopy, canPaste,
  saving, onSave, onPDF, on3D, onExit,
}) {
  const [q, setQ] = useState('');

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-2">
      {/* Fila 1: barra de dibujo y edición (estilo Paint) */}
      <PlanoBarraHerramientas
        mode={mode} connectType={connectType} onPick={onPick}
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
          <PlanoMenuEquipos key={cat.id} cat={cat} activeType={activeType} onPick={onPick} />
        ))}
        <div className="flex items-center gap-1 ml-auto rounded-md border border-border bg-input px-2 py-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…"
            className="bg-transparent text-xs outline-none w-28" />
        </div>
      </div>
    </div>
  );
}