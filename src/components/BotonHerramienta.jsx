import React, { useRef, useEffect } from 'react';
import { dibujarEquipo } from '@/lib/planoSimbolos';

/**
 * BotonHerramienta — botón de la barra de dibujo.
 *
 * En el móvil la barra se comía media pantalla con los nombres puestos, así
 * que ahí solo va el icono y el nombre queda en el título; en pantallas
 * anchas se ve el texto completo. El icono se dibuja igual en los dos casos.
 */
export default function BotonHerramienta({
  activo, onClick, nombre, icono: Icono, equipo, variante = null,
  compacto = false, conSubmenu = false,
}) {
  return (
    <button
      onClick={onClick}
      title={nombre}
      aria-label={nombre}
      className={`relative flex items-center justify-center gap-1.5 rounded-lg border transition-colors shrink-0
        ${compacto ? 'w-11 h-10' : 'px-2.5 h-9'}
        ${activo
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
    >
      {equipo
        ? <SimboloEquipo tipo={equipo} claro={activo} variante={variante} />
        : <Icono className="w-5 h-5 shrink-0" />}
      {!compacto && <span className="text-xs whitespace-nowrap">{nombre}</span>}
      {/* La esquinita avisa de que ese botón esconde un submenú con las
          versiones del equipo, que si no se queda sin descubrir. */}
      {conSubmenu && (
        <span className={`absolute bottom-0.5 right-0.5 w-0 h-0 border-l-[5px] border-l-transparent
          border-b-[5px] ${activo ? 'border-b-white' : 'border-b-slate-400'}`} />
      )}
    </button>
  );
}

/**
 * El símbolo de la máquina de verdad, el mismo que sale en el plano.
 *
 * Así el botón enseña lo que se va a dibujar en vez de un icono genérico:
 * no hay que acordarse de qué era cada cosa.
 */
export function SimboloEquipo({ tipo, claro = false, tamano = 26, variante = null }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (claro) {
      // Sobre fondo azul el símbolo necesita un halo claro para verse.
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - 1, 0, Math.PI * 2);
      ctx.fill();
    }
    dibujarEquipo(ctx, tipo, canvas.width / 2, canvas.height / 2, 0.55, false, variante);
  }, [tipo, claro, variante]);

  return <canvas ref={ref} width={tamano} height={tamano} className="block shrink-0" />;
}
