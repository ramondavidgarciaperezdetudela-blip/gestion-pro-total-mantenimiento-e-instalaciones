import React from 'react';
import { Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * ControlMoverFlotante — pad direccional que aparece sobre el lienzo al
 * seleccionar un equipo. En el móvil arrastrar con el dedo es difícil de
 * afinar; este pad siempre está a mano para mover el elemento en pasos de
 * 0,1 m sin perder la selección.
 */
export default function ControlMoverFlotante({ step, onMover }) {
  const Btn = ({ onClick, children, label }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center rounded-lg border border-border bg-card w-10 h-10 text-foreground hover:bg-muted active:bg-primary active:text-primary-foreground transition-colors"
    >
      {children}
    </button>
  );

  return (
    <div className="fixed z-[10001] bottom-24 lg:bottom-6 left-3 select-none print:hidden">
      <div className="rounded-xl border border-border bg-card/95 backdrop-blur p-2 shadow-2xl">
        <div className="text-[9px] text-muted-foreground text-center mb-1 flex items-center justify-center gap-0.5">
          <Move className="w-3 h-3" /> Mover 0,1 m
        </div>
        <div className="grid grid-cols-3 gap-1">
          <span />
          <Btn onClick={() => onMover(0, -step)} label="Arriba"><ArrowUp className="w-4 h-4" /></Btn>
          <span />
          <Btn onClick={() => onMover(-step, 0)} label="Izquierda"><ArrowLeft className="w-4 h-4" /></Btn>
          <span className="text-[8px] text-muted-foreground flex items-center justify-center">0,1m</span>
          <Btn onClick={() => onMover(step, 0)} label="Derecha"><ArrowRight className="w-4 h-4" /></Btn>
          <span />
          <Btn onClick={() => onMover(0, step)} label="Abajo"><ArrowDown className="w-4 h-4" /></Btn>
          <span />
        </div>
      </div>
    </div>
  );
}