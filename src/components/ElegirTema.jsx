import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { TEMAS, escucharTema, guardarTema } from '@/lib/temas';

/**
 * Elegir el aspecto del programa.
 *
 * Se cambia al tocarlo, no al guardar: hay que VER cómo queda antes de
 * decidir. Un desplegable con nombres de colores no dice nada; una fila de
 * muestras sí.
 */
export default function ElegirTema() {
  const [tema, setTema] = useState(TEMAS[0]);

  useEffect(() => escucharTema(setTema), []);

  return (
    <div className="space-y-3" data-prueba="elegir-tema">
      <div>
        <p className="text-sm font-semibold text-slate-700 border-b pb-1">🎨 Aspecto del programa</p>
        <p className="mt-1 text-xs text-slate-500">
          Toca uno y el programa cambia al momento. Cambia todo: botones, cabeceras, avisos y bordes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {TEMAS.map((t) => {
          const elegido = t.id === tema.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => guardarTema(t.id)}
              data-prueba={`tema-${t.id}`}
              aria-label={`Tema ${t.nombre}`}
              aria-pressed={elegido}
              className={`relative rounded-xl border p-3 text-left transition ${elegido ? 'border-slate-800 ring-2 ring-slate-800' : 'border-slate-200 hover:border-slate-400'}`}
            >
              {elegido && (
                <span className="absolute right-2 top-2 rounded-full bg-slate-800 p-0.5 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className="text-lg">{t.simbolo}</span>
              <span className="mt-1 block text-sm font-semibold text-slate-800">{t.nombre}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{t.descripcion}</span>
              {/* Las muestras de color: se ve de un vistazo cómo va a quedar,
                  que es lo que hace falta para elegir. */}
              <span className="mt-2 flex gap-1">
                {[1, 3, 5, 6, 8].map((i) => (
                  <span
                    key={i}
                    className="h-4 w-4 rounded"
                    style={{ backgroundColor: t.gama[i] }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-slate-400" data-prueba="tema-actual">
        Ahora mismo: {tema.simbolo} {tema.nombre}
      </p>
    </div>
  );
}
