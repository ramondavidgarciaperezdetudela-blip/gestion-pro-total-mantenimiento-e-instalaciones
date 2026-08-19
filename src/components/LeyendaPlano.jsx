import React, { useRef, useEffect } from 'react';
import { dibujarEquipo, nombreEquipo, dibujarSoporte } from '@/lib/planoSimbolos';
import { nombreVariante } from '@/lib/planoVariantes';
import { SOPORTES_SOPORTE } from '@/lib/planoCalculos';

/**
 * LeyendaPlano — qué es cada dibujo del plano.
 *
 * Un plano se entrega y lo mira otro: el cliente, el que va a montar, el que
 * lo revisa dentro de dos años. Los símbolos están hechos para reconocerse,
 * pero sin leyenda siempre hay quien duda, y la duda en una puerta de cámara
 * es "¿esto abre hacia el pasillo o hacia dentro?".
 *
 * Solo se listan los símbolos que están puestos en el plano: una leyenda con
 * once equipos cuando en el plano hay tres no la lee nadie.
 */

function SimboloLeyenda({ tipo, variante, soporte }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - (soporte ? 4 : 0);
    if (soporte) dibujarSoporte(ctx, soporte, cx, cy, 0.62);
    dibujarEquipo(ctx, tipo, cx, cy, 0.62, false, variante);
  }, [tipo, variante, soporte]);

  return <canvas ref={ref} width={54} height={40} className="block shrink-0" />;
}

/**
 * Recorre lo que hay dibujado y saca la lista de símbolos distintos.
 * Se exporta porque el informe impreso necesita la misma lista.
 *
 * @param {Array} maquinas   equipos colocados
 * @param {object|null} exterior  unidad exterior, si la hay
 * @param {string} tipoExterior   'exterior' | 'unidad_condensadora'
 * @param {string} soporteExterior  montaje de la exterior
 * @returns {Array<{clave, tipo, variante, soporte, nombre, detalle, cantidad}>}
 */
export function entradasLeyenda(maquinas = [], exterior = null, tipoExterior = 'exterior', soporteExterior = 'ninguno') {
  const mapa = new Map();

  for (const m of maquinas) {
    const clave = `${m.tipo}|${m.variante || ''}`;
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        clave,
        tipo: m.tipo,
        variante: m.variante || null,
        soporte: null,
        nombre: nombreEquipo(m.tipo),
        detalle: nombreVariante(m.tipo, m.variante),
        cantidad: 0,
      });
    }
    mapa.get(clave).cantidad += 1;
  }

  if (exterior) {
    const montaje = SOPORTES_SOPORTE[soporteExterior];
    mapa.set('exterior', {
      clave: 'exterior',
      tipo: tipoExterior,
      variante: null,
      soporte: soporteExterior,
      nombre: nombreEquipo(tipoExterior),
      detalle: montaje?.clave ? montaje.nombre : 'Sin soporte',
      cantidad: 1,
    });
  }

  return [...mapa.values()];
}

export default function LeyendaPlano({
  maquinas = [], exterior = null, tipoExterior = 'exterior',
  soporteExterior = 'ninguno', compacto = false,
}) {
  const entradas = entradasLeyenda(maquinas, exterior, tipoExterior, soporteExterior);
  if (!entradas.length) return null;

  return (
    <div className="border rounded-lg bg-white px-2 py-1.5">
      <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
        Leyenda del plano
      </p>
      <div className={`grid gap-x-3 gap-y-1 ${
        compacto ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
      }`}>
        {entradas.map(e => (
          <div key={e.clave} className="flex items-center gap-1.5 min-w-0">
            <SimboloLeyenda tipo={e.tipo} variante={e.variante} soporte={e.soporte} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-700 leading-tight truncate">
                {e.nombre}{e.cantidad > 1 ? ` ×${e.cantidad}` : ''}
              </p>
              {e.detalle && (
                <p className="text-[10px] text-slate-500 leading-tight truncate" title={e.detalle}>
                  {e.detalle}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
