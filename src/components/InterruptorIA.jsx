import React, { useEffect, useState } from 'react';
import { Sparkles, PowerOff } from 'lucide-react';
import {
  escucharEstadoIA, activarIA, activarActualizacionDiaria, iaActivada,
} from '@/lib/modoSinIA';
import { escucharAjustesIA, esProveedorLibre } from '@/lib/proveedorIA';
import PrepararIA from '@/components/PrepararIA';

/**
 * Encender o apagar la ayuda con IA, y con ella el gasto de créditos.
 *
 * Viene apagada: el programa funciona entero sin ella. Esto es lo único que
 * la enciende, y se ve de un vistazo si está gastando o no.
 */
export default function InterruptorIA() {
  const [estado, setEstado] = useState({ ia: false, diaria: false });
  const [cfg, setCfg] = useState({ proveedor: 'ollama' });

  useEffect(() => escucharEstadoIA(setEstado), []);
  useEffect(() => escucharAjustesIA(setCfg), []);

  const encendida = estado.ia;
  // Con una IA libre no se gastan créditos aunque esté encendida: el aviso no
  // puede decir lo mismo en los dos casos.
  const gasta = encendida && !esProveedorLibre(cfg.proveedor);

  return (
    <div className="space-y-3" data-prueba="interruptor-ia">
      <div
        className={`rounded-xl border p-4 ${gasta ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}
      >
        <div className="flex items-start gap-3">
          {gasta
            ? <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            : <PowerOff className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
          <div className="min-w-0 flex-1">
            <p className={`font-semibold ${gasta ? 'text-amber-800' : 'text-emerald-800'}`}
               data-prueba="estado-ia">
              {!encendida
                ? 'Ayuda con IA APAGADA — el programa no gasta créditos'
                : gasta
                  ? 'Ayuda con IA ENCENDIDA con la de Base44 — consume créditos de tu cuenta'
                  : 'Ayuda con IA ENCENDIDA con una IA libre — no gasta créditos'}
            </p>
            <p className={`mt-1 text-sm leading-snug ${gasta ? 'text-amber-700' : 'text-emerald-700'}`}>
              {!encendida
                ? 'Todo lo demás sigue funcionando igual: clientes, presupuestos, facturas, partes, agenda, almacén, cálculos, documentos, códigos postales y las copias de seguridad. La sincronización entre ordenador, tablet y móvil tampoco depende de la IA.'
                : gasta
                  ? 'Los botones de IA (presupuesto por IA, informes, búsqueda de datos por NIF, plantillas…) llamarán al servidor de Base44 y gastarán créditos. Abajo puedes cambiar a una IA libre y dejar de gastar.'
                  : 'Las consultas van a la IA libre que has elegido, no al servidor de Base44. No se gasta ni un crédito.'}
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
          Encender la ayuda con IA
        </label>
      </div>

      {encendida && (
        <div className="rounded-xl border border-slate-200 p-3">
          <PrepararIA />
        </div>
      )}

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
