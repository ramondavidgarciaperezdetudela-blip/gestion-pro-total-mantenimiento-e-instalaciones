import React, { useEffect, useRef } from 'react';

/**
 * Navegación de la ficha del cliente en dos niveles: menús (arriba) y
 * submenús (debajo). Cada submenú es una de las pestañas de la ficha.
 */
export const MENUS_FICHA = [
  { id: 'documentacion', titulo: '📁 Documentación', subs: [['docs', 'Todos los documentos']] },
  { id: 'facturacion', titulo: '💶 Facturación', subs: [['facturas', 'Facturas'], ['presupuestos', 'Presupuestos'], ['recibos', 'Recibos'], ['aibudget', 'Presup. IA']] },
  { id: 'servicio', titulo: '🔧 Servicio técnico', subs: [['sat', 'SAT'], ['maint', 'Mantenimiento'], ['intervenciones', 'Intervenciones'], ['informes_aseg', 'Informes aseguradora'], ['diario', 'Diario'], ['citas', 'Citas']] },
  { id: 'legalizacion', titulo: '📜 Legalización', subs: [['legalizacion', 'Documentos legales']] },
  { id: 'calculos', titulo: '🧮 Cálculos', subs: [['calcs', 'Cálculos']] },
  { id: 'equipos', titulo: '🏭 Equipos', subs: [['maquinaria', 'Maquinaria'], ['instalaciones', 'Instalaciones'], ['planos', 'Planos'], ['fotos_equipo', 'Fotos de equipo'], ['galeria_fotos', 'Galería']] },
  { id: 'archivos', titulo: '🗂️ Archivos y notas', subs: [['files', 'Archivos'], ['notes', 'Notas'], ['historial', 'Historial de cambios']] },
];

export const menuDePestana = (tab) => MENUS_FICHA.find((m) => m.subs.some((s) => s[0] === tab)) || MENUS_FICHA[0];

export default function NavegacionFicha({ pestana, onCambiar, contadores = {} }) {
  const menu = menuDePestana(pestana);
  const ultima = useRef({}); // última pestaña vista de cada menú
  useEffect(() => { ultima.current[menu.id] = pestana; }, [menu.id, pestana]);
  const suma = (m) => m.subs.reduce((a, s) => a + (contadores[s[0]] || 0), 0);

  return (
    <nav aria-label="Secciones de la ficha" className="space-y-1" data-testid="navegacion-ficha">
      <div role="tablist" aria-label="Menús" className="flex flex-wrap gap-1">
        {MENUS_FICHA.map((m) => {
          const activo = m.id === menu.id; const n = suma(m);
          return (
            <button key={m.id} type="button" role="tab" aria-selected={activo} data-menu={m.id}
              onClick={() => onCambiar(ultima.current[m.id] || m.subs[0][0])}
              className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${activo ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent'}`}>
              {m.titulo}{n > 0 && <span className={`rounded-full px-1.5 font-mono text-[10px] tabular-nums ${activo ? 'bg-primary-foreground/20' : 'bg-muted'}`}>{n}</span>}
            </button>
          );
        })}
      </div>
      {menu.subs.length > 1 && (
        <div role="tablist" aria-label="Submenús" className="flex flex-wrap gap-1 rounded-md border bg-muted/40 p-1">
          {menu.subs.map(([id, titulo]) => {
            const activo = id === pestana; const n = contadores[id];
            return (
              <button key={id} type="button" role="tab" aria-selected={activo} data-submenu={id} onClick={() => onCambiar(id)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${activo ? 'bg-background shadow border' : 'text-muted-foreground hover:bg-background/60'}`}>
                {titulo}{n > 0 ? ` (${n})` : ''}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
