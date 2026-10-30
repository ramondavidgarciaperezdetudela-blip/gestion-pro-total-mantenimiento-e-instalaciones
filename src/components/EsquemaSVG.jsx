import React from 'react';

/**
 * Pinta en pantalla un esquema SVG de los que genera `lib/esquemasFrigorificos.js`.
 *
 * Los esquemas llevan siempre fondo claro y colores fijos, así que se leen igual con el tema claro
 * que con el oscuro. El texto que contienen ya viene escapado de origen (`esc()`), por lo que se
 * puede insertar tal cual.
 *
 * En el móvil un esquema de 860 unidades de ancho encogido a 340 píxeles deja los rótulos
 * ilegibles, así que por debajo del ancho de tableta se mantiene un ancho mínimo y se desliza.
 */
export default function EsquemaSVG({ svg, titulo = 'Esquema', className = '' }) {
  if (!svg) return null;
  return (
    <figure className={`m-0 overflow-hidden rounded-lg border border-slate-300 bg-[#fbfdff] ${className}`}>
      <div className="overflow-x-auto p-1">
        <div
          role="img"
          aria-label={titulo}
          className="min-w-[720px] sm:min-w-0 [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
      <figcaption className="px-2 pb-1 text-[10px] text-slate-500 sm:hidden">Desliza hacia los lados para ver el esquema completo.</figcaption>
    </figure>
  );
}
