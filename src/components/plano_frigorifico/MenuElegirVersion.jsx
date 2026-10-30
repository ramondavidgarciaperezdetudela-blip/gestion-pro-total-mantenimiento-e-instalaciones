import React from 'react';
import { CAT_COLOR } from '@/lib/planoFrigorificoCatalogo';
import PlanoSimbolo from './PlanoSimbolo';

/**
 * MenuElegirVersion — pequeño menú que aparece al pulsar un equipo en la
 * paleta o en los menús a pantalla completa. Muestra las dos versiones del
 * icono (el símbolo técnico estándar y el icono generado por IA) para que el
 * instalador elija cuál colocar en el plano. Si el equipo no tiene icono IA
 * no se muestra este menú: se coloca el estándar directamente.
 */
export default function MenuElegirVersion({ el, onChoose, onClose, align = 'left' }) {
  const color = CAT_COLOR[el.cat] || '#888';
  const stdEl = { ...el, image_url: undefined };
  const iaEl = { ...el, image_url: el.image_url };

  const Opcion = ({ variant, titulo, desc }) => (
    <button
      onClick={() => { onChoose(variant); onClose?.(); }}
      title={titulo}
      className="flex flex-col items-center gap-1 rounded-md border border-border bg-card px-2 py-2 w-[104px] transition-all hover:scale-[1.03]"
      style={{ borderColor: color + '66', borderTopColor: color, borderTopWidth: 2 }}>
      <svg viewBox="-40 -30 80 60" width="72" height="54" style={{ display: 'block' }}>
        <PlanoSimbolo
          el={{ ...variant, type: el.id, id: 'mv-' + (variant.image_url ? 'ia' : 'std'),
            datos: variant.image_url ? { image_url: variant.image_url } : {}, color, w_m: el.w_m, h_m: el.h_m }}
          scale={48} mini />
      </svg>
      <span className="text-[10px] font-semibold" style={{ color }}>{titulo}</span>
      <span className="text-[9px] text-muted-foreground leading-tight text-center">{desc}</span>
    </button>
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="absolute z-50 mt-1 rounded-lg border border-border bg-card shadow-2xl p-2 flex gap-2"
        style={{ [align]: 0, top: '100%', width: 'max-content', maxWidth: '92vw' }}>
        <Opcion variant={stdEl} titulo="Estándar" desc="Símbolo técnico ISO" />
        {el.image_url ? (
          <Opcion variant={iaEl} titulo="IA" desc="Icono generado por IA" />
        ) : (
          <div className="flex flex-col items-center justify-center w-[104px] rounded-md border border-dashed border-border px-2 py-2 text-center">
            <span className="text-[10px] text-muted-foreground">Sin icono IA</span>
            <span className="text-[9px] text-muted-foreground/70">Genera uno desde «Editar iconos»</span>
          </div>
        )}
      </div>
    </>
  );
}