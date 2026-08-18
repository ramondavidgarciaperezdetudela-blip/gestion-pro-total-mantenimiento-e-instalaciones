import React, { useRef, useEffect } from 'react';
import { TIPOS_MAQUINA } from '@/lib/planoCalculos';
import { dibujarEquipo } from '@/lib/planoSimbolos';

/**
 * PaletaEquipos — los equipos que se pueden poner en el plano, con su dibujo.
 *
 * Cada botón enseña el MISMO símbolo que va a aparecer en el plano, dibujado
 * en un lienzo diminuto. Así no hay que aprenderse ninguna leyenda: lo que se
 * elige es lo que se ve luego sobre el dibujo.
 *
 * Se separa climatización de refrigeración porque el técnico va a una cosa o a
 * la otra, y mezclarlas en una sola fila obliga a buscar.
 */

const GRUPOS = [
  { id: 'clima', titulo: '❄️ Climatización' },
  { id: 'refrigeracion', titulo: '🧊 Refrigeración' },
];

function MiniSimbolo({ tipo, activo }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Escala pequeña para que el símbolo entre entero en el botón.
    dibujarEquipo(ctx, tipo, canvas.width / 2, canvas.height / 2, 0.72, false);
  }, [tipo, activo]);

  return <canvas ref={ref} width={46} height={34} className="block" />;
}

export default function PaletaEquipos({ valor, onChange, incluirExterior = false }) {
  return (
    <div className="space-y-2.5">
      {GRUPOS.map(g => {
        const equipos = TIPOS_MAQUINA.filter(t =>
          t.categoria === g.id &&
          // La exterior/condensadora se coloca con su propia herramienta, no
          // desde aquí: solo hay una por instalación.
          (incluirExterior || (t.id !== 'exterior' && t.id !== 'unidad_condensadora'))
        );
        if (!equipos.length) return null;
        return (
          <div key={g.id}>
            <p className="text-[11px] font-medium text-slate-500 mb-1">{g.titulo}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {equipos.map(t => {
                const activo = valor === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onChange(t.id)}
                    title={t.nombre}
                    className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-colors ${
                      activo
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <MiniSimbolo tipo={t.id} activo={activo} />
                    <span className={`text-[10.5px] leading-tight ${activo ? 'text-blue-700 font-medium' : 'text-slate-600'}`}>
                      {t.nombre}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
