import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, RefreshCw, Check, AlertTriangle } from 'lucide-react';
import { listarImpresoras, impresoraElegida, guardarImpresoraElegida, printDocument } from '@/lib/printHelper';

/**
 * Elegir con qué impresora se imprime.
 *
 * En el navegador no se puede: el diálogo de impresión lo enseña el propio
 * navegador y las impresoras las lista él. En el programa instalado sí, y hace
 * falta — quien tiene una impresora de etiquetas y otra de papel quiere
 * decirlo una vez y no acordarse en cada documento. En el móvil lo enseña
 * Android al imprimir, con sus impresoras y el "Guardar como PDF".
 */
export default function ElegirImpresora() {
  const [impresoras, setImpresoras] = useState([]);
  const [elegida, setElegida] = useState(impresoraElegida());
  const [estado, setEstado] = useState('cargando');
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState('');

  const buscar = useCallback(async () => {
    setEstado('cargando');
    const r = await listarImpresoras();
    if (!r.ok) { setEstado(r.motivo === 'sin_puente' ? 'sin_puente' : 'error'); return; }
    setImpresoras(r.impresoras);
    setEstado('listo');
  }, []);

  useEffect(() => { buscar(); }, [buscar]);

  const elegir = (nombre) => {
    const nueva = nombre === elegida ? '' : nombre;
    setElegida(nueva);
    guardarImpresoraElegida(nueva);
    setResultado('');
  };

  const probar = async () => {
    setProbando(true);
    setResultado('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Prueba</title></head>
      <body style="font-family:Arial,sans-serif;padding:28px">
        <h1 style="color:#1e3a5f;margin:0 0 6px">Prueba de impresión</h1>
        <p style="margin:0 0 14px;color:#555">Gestión Pro Total · ${new Date().toLocaleString('es-ES')}</p>
        <p>Si estás leyendo esto en papel, la impresora
          <b>${elegida ? elegida.replace(/</g, '&lt;') : 'que hayas elegido en el diálogo'}</b>
          está bien configurada.</p>
        <hr style="border:none;border-top:1px solid #ccc;margin:18px 0">
        <p style="font-size:12px;color:#777">Comprueba que el texto no sale cortado por los lados.
          Si se sale, ajusta los márgenes y el tamaño de papel aquí abajo.</p>
      </body></html>`;
    const ok = await printDocument(html, 'Prueba de impresión');
    setResultado(ok ? 'Mandado a imprimir. Mira la bandeja de la impresora.' : 'No se ha podido imprimir.');
    setProbando(false);
  };

  return (
    <div className="space-y-3" data-prueba="elegir-impresora">
      <div>
        <p className="flex items-center gap-2 border-b pb-1 text-sm font-semibold text-slate-700">
          <Printer className="h-4 w-4" /> Impresora
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Con cuál se imprimen los documentos, las fichas y las hojas de Sanidad.
        </p>
      </div>

      {estado === 'sin_puente' && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
          <p className="font-semibold">Aquí la elige el propio aparato</p>
          <p>
            Estás en el navegador o en el móvil. En el móvil, al darle a imprimir sale el menú de
            Android con tus impresoras y la opción «Guardar como PDF». En el navegador sale su
            diálogo de impresión. En los dos casos eliges ahí mismo, así que no hay nada que
            configurar.
          </p>
          <p>
            Para dejar una impresora fija y que no te la vuelva a preguntar, usa el
            <strong> programa instalado en el ordenador</strong>.
          </p>
        </div>
      )}

      {estado === 'error' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>No se ha podido leer la lista de impresoras del ordenador. Prueba a volver a buscar.</span>
        </div>
      )}

      {estado === 'listo' && impresoras.length === 0 && (
        <p className="text-xs text-slate-500">
          El ordenador no ve ninguna impresora instalada. Instálala primero desde los ajustes de
          Windows y vuelve a buscar.
        </p>
      )}

      {estado === 'listo' && impresoras.length > 0 && (
        <div className="space-y-1.5">
          {impresoras.map((i) => {
            const puesta = i.nombre === elegida;
            return (
              <button
                key={i.nombre}
                type="button"
                onClick={() => elegir(i.nombre)}
                data-prueba="impresora"
                aria-pressed={puesta}
                className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition ${
                  puesta ? 'border-blue-500 bg-blue-50 font-semibold' : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                {puesta ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : <Printer className="h-4 w-4 shrink-0 text-slate-400" />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{i.descripcion || i.nombre}</span>
                  {i.pordefecto && <span className="block text-[10px] text-slate-400">Predeterminada del sistema</span>}
                </span>
              </button>
            );
          })}
          <p className="text-[11px] text-slate-400">
            {elegida
              ? 'Se imprimirá directamente en esta, sin preguntar.'
              : 'Sin ninguna elegida, cada vez saldrá el diálogo de impresión del sistema. Toca una para fijarla; tócala otra vez para quitarla.'}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {estado !== 'sin_puente' && (
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={buscar} data-prueba="buscar-impresoras">
            <RefreshCw className={`h-3.5 w-3.5 ${estado === 'cargando' ? 'animate-spin' : ''}`} /> Buscar impresoras
          </Button>
        )}
        <Button type="button" size="sm" className="gap-1.5" onClick={probar} disabled={probando} data-prueba="probar-impresion">
          <Printer className="h-3.5 w-3.5" /> {probando ? 'Mandando…' : 'Imprimir una hoja de prueba'}
        </Button>
      </div>

      {resultado && <p className="text-xs text-slate-600" data-prueba="resultado-impresion">{resultado}</p>}
    </div>
  );
}
