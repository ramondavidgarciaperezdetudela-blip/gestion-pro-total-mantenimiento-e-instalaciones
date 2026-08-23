import React, { useEffect, useState } from 'react';
import { Sparkles, PowerOff } from 'lucide-react';
import {
  escucharEstadoIA, activarIA, activarActualizacionDiaria, iaActivada,
} from '@/lib/modoSinIA';

/**
 * Encender o apagar la ayuda con IA, y con ella el gasto de créditos.
 *
 * Viene apagada: el programa funciona entero sin ella. Esto es lo único que
 * la enciende, y se ve de un vistazo si está gastando o no.
 */
export default function InterruptorIA() {
  const [estado, setEstado] = useState({ ia: false, diaria: false });

  useEffect(() => escucharEstadoIA(setEstado), []);

  const encendida = estado.ia;

  return (
    <div className="space-y-3" data-prueba="interruptor-ia">
      <div
        className={`rounded-xl border p-4 ${encendida ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}
      >
        <div className="flex items-start gap-3">
          {encendida
            ? <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            : <PowerOff className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${encendida ? 'text-amber-800' : 'text-emerald-800'}`}
               data-prueba="estado-ia">
              {encendida
                ? 'Ayuda con IA ENCENDIDA — consume créditos de tu cuenta'
                : 'Ayuda con IA APAGADA — el programa no gasta créditos'}
            </p>
            <p className={`mt-1 text-sm leading-snug ${encendida ? 'text-amber-700' : 'text-emerald-700'}`}>
              {encendida
                ? 'Los botones de IA (presupuesto por IA, informes, búsqueda de datos por NIF, plantillas…) llamarán al servidor y gastarán créditos.'
                : 'Todo lo demás sigue funcionando igual: clientes, presupuestos, facturas, partes, agenda, almacén, cálculos, documentos, códigos postales y las copias de seguridad. La sincronización entre ordenador, tablet y móvil tampoco depende de la IA.'}
            </p>
          </div>
        </div>

        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={encendida}
            onChange={(e) => activarIA(e.target.checked)}
            className="h-4 w-4"
            aria-label="Encender la ayuda con IA"
          />
          Encender la ayuda con IA (gasta créditos)
        </label>
      </div>

      <label
        className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${encendida ? 'cursor-pointer border-slate-200 text-slate-700' : 'border-slate-200 text-slate-400'}`}
      >
        <input
          type="checkbox"
          checked={estado.diaria}
          disabled={!encendida}
          onChange={(e) => activarActualizacionDiaria(e.target.checked)}
          className="mt-0.5 h-4 w-4"
          aria-label="Actualizar normativas y precios una vez al día"
        />
        <span>
          <span className="font-medium">Buscar novedades una vez al día, solo.</span>{' '}
          Son 5 consultas con búsqueda en internet cada día <strong>y en cada aparato</strong>:
          con el ordenador, la tablet y el móvil son 15 diarias. Déjalo apagado si quieres
          gastar lo mínimo; siempre puedes darle a «Actualizar» a mano cuando te interese.
        </span>
      </label>
    </div>
  );
}

export { iaActivada };
