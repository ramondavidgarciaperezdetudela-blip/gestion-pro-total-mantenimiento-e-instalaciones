import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Check, X, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  completarDatosEmpresa, losQueFaltan, analizarNif, ETIQUETAS_CAMPO,
} from '@/lib/datosEmpresa';
import { toast } from 'sonner';

/**
 * CompletarDatosEmpresa — el botón de "rellena tú lo que falta".
 *
 * Escribes el NIF o el nombre y busca el resto: dirección, código postal,
 * provincia, teléfono, correo, web y logotipo.
 *
 * Dos decisiones que no son negociables:
 *
 *   · NO pisa nada por su cuenta. Enseña lo que ha encontrado, campo por
 *     campo, con lo que hay ahora al lado, y tú marcas qué se aplica. Vienen
 *     marcados solo los huecos vacíos. Un buscador que te machaca la dirección
 *     buena por una sacada de internet hace más daño que no tenerlo.
 *
 *   · Lo que sale del propio NIF —si es válido, qué forma jurídica es y de qué
 *     provincia está registrada la sociedad— es aritmética y sale siempre,
 *     aunque no haya cobertura ni créditos de IA. Eso se enseña aparte, porque
 *     es lo único de aquí que no puede venir mal.
 */
export default function CompletarDatosEmpresa({ actuales = {}, onAplicar, campos: camposPermitidos = null }) {
  const [buscando, setBuscando] = useState(false);
  const [hallazgo, setHallazgo] = useState(null);
  const [elegidos, setElegidos] = useState({});

  const nifAhora = analizarNif(actuales.nif);

  const buscar = async () => {
    if (!String(actuales.nif || '').trim() && !String(actuales.company_name || '').trim()) {
      toast.error('Escribe primero el NIF o el nombre de la empresa');
      return;
    }
    setBuscando(true);
    setHallazgo(null);
    try {
      const r = await completarDatosEmpresa({
        nif: actuales.nif,
        nombre: actuales.company_name || actuales.name,
        web: actuales.website,
        actuales,
        base44,
      });

      // Si nos han acotado los campos (p. ej. la ficha de cliente no tiene
      // logotipo), se descarta lo que aquí no pinta nada.
      if (camposPermitidos) {
        for (const k of Object.keys(r.campos)) {
          if (!camposPermitidos.includes(k)) { delete r.campos[k]; delete r.origen[k]; }
        }
      }

      const encontrados = Object.keys(r.campos);
      if (encontrados.length === 0) {
        toast.info(r.avisos[0] || 'No se ha encontrado ningún dato nuevo. Escríbelos a mano.');
        setHallazgo({ ...r, vacio: true });
        return;
      }

      // Vienen marcados solo los huecos que estaban vacíos.
      const faltaban = losQueFaltan(r.campos, actuales);
      setElegidos(Object.fromEntries(encontrados.map((k) => [k, faltaban.includes(k)])));
      setHallazgo(r);
    } catch (e) {
      toast.error('No se ha podido buscar: ' + (e?.message || 'revisa la conexión'));
    } finally {
      // Pase lo que pase el botón vuelve.
      setBuscando(false);
    }
  };

  const aplicar = () => {
    const aponer = {};
    for (const [k, si] of Object.entries(elegidos)) {
      if (si && hallazgo.campos[k] !== undefined) aponer[k] = hallazgo.campos[k];
    }
    const cuantos = Object.keys(aponer).length;
    if (cuantos === 0) { toast.info('No has marcado ningún dato'); return; }
    onAplicar(aponer);
    setHallazgo(null);
    toast.success(`${cuantos} ${cuantos === 1 ? 'dato puesto' : 'datos puestos'}`);
  };

  const marcarTodos = (si) =>
    setElegidos(Object.fromEntries(Object.keys(hallazgo.campos).map((k) => [k, si])));

  return (
    <div className="space-y-2" data-prueba="completar-empresa">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" size="sm" variant="outline" onClick={buscar} disabled={buscando}
          data-prueba="btn-completar" className="gap-1 border-indigo-300 text-indigo-700">
          {buscando
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Buscando...</>
            : <><Wand2 className="w-3.5 h-3.5" />Rellenar con el NIF o el nombre</>}
        </Button>

        {/* Lo que dice el NIF, siempre y sin conexión. */}
        {nifAhora.tipo && (
          <span
            data-prueba="aviso-nif"
            className={`text-[11px] px-2 py-1 rounded border ${
              nifAhora.valido
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'}`}
          >
            {nifAhora.valido ? '✓ ' : '⚠ '}{nifAhora.mensaje}
          </span>
        )}
      </div>

      {hallazgo && !hallazgo.vacio && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 space-y-2" data-prueba="hallazgo">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold text-indigo-900">
              Encontrado. Marca lo que quieras poner:
            </p>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => marcarTodos(true)}>Marcar todo</Button>
              <Button type="button" size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => marcarTodos(false)}>Ninguno</Button>
            </div>
          </div>

          <div className="space-y-1">
            {Object.entries(hallazgo.campos).map(([clave, valor]) => {
              const ahora = String(actuales[clave] ?? '').trim();
              const pisa = ahora && ahora !== valor;
              return (
                <label key={clave} className="flex items-start gap-2 bg-white rounded border p-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    data-prueba={`campo-${clave}`}
                    checked={Boolean(elegidos[clave])}
                    onChange={(e) => setElegidos((p) => ({ ...p, [clave]: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-gray-700">{ETIQUETAS_CAMPO[clave] || clave}</p>
                    {clave === 'logo_url' ? (
                      <img src={valor} alt="Logotipo encontrado" className="h-10 mt-0.5 object-contain" />
                    ) : (
                      <p className="text-[11px] text-gray-900 break-words">{valor}</p>
                    )}
                    <p className="text-[10px] text-gray-400">Según {hallazgo.origen[clave]}</p>
                    {pisa && (
                      <p className="text-[10px] text-amber-700 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                        Sustituiría lo que hay ahora: «{ahora}»
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {hallazgo.avisos.length > 0 && (
            <div className="space-y-0.5">
              {hallazgo.avisos.map((a, i) => (
                <p key={i} className="text-[10px] text-amber-800">{a}</p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={aplicar} data-prueba="btn-aplicar" className="bg-indigo-600 hover:bg-indigo-700">
              <Check className="w-3.5 h-3.5 mr-1" />Poner los marcados
            </Button>
            <Button type="button" size="sm" variant="ghost" className="text-gray-500" onClick={() => setHallazgo(null)}>
              <X className="w-3.5 h-3.5 mr-1" />Dejarlo como está
            </Button>
          </div>

          <p className="text-[10px] text-gray-500">
            Lo que sale del NIF (validez, forma jurídica y provincia de registro) es exacto y funciona sin
            conexión. El resto viene de una búsqueda: repásalo antes de guardarlo, sobre todo la dirección.
          </p>
        </div>
      )}

      {hallazgo?.vacio && hallazgo.avisos.length > 0 && (
        <p className="text-[11px] text-amber-800">{hallazgo.avisos.join(' ')}</p>
      )}
    </div>
  );
}
