import React, { useMemo, useState } from 'react';
import { Sparkles, Search, ChevronDown, ChevronRight, FileClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import NavBar from '@/components/NavBar';
import { leerNovedades, partirPunto, cuantosCambios } from '@/lib/novedades';

/**
 * Novedades — qué ha cambiado en el programa, versión por versión.
 *
 * Por qué hace falta: el historial que ya había dentro del programa solo anota
 * ediciones de DATOS (clientes, documentos…), porque es lo único que pasa por
 * el registrador de cambios. Los arreglos y mejoras del programa se escriben en
 * el CHANGELOG, que vivía solo en el repositorio. Resultado: podías tener dos
 * días de trabajo hecho y, mirando el programa, parecía que no había pasado
 * nada.
 *
 * El CHANGELOG se empaqueta dentro del programa, así que esta pantalla
 * funciona sin conexión y sin ir a buscar nada fuera.
 */

const COLORES = {
  emerald: { fondo: 'bg-emerald-50', borde: 'border-emerald-200', texto: 'text-emerald-800', punto: 'bg-emerald-500' },
  red: { fondo: 'bg-red-50', borde: 'border-red-200', texto: 'text-red-800', punto: 'bg-red-500' },
  blue: { fondo: 'bg-blue-50', borde: 'border-blue-200', texto: 'text-blue-800', punto: 'bg-blue-500' },
  slate: { fondo: 'bg-slate-50', borde: 'border-slate-200', texto: 'text-slate-700', punto: 'bg-slate-400' },
  amber: { fondo: 'bg-amber-50', borde: 'border-amber-200', texto: 'text-amber-800', punto: 'bg-amber-500' },
  violet: { fondo: 'bg-violet-50', borde: 'border-violet-200', texto: 'text-violet-800', punto: 'bg-violet-500' },
};

/** La fecha como se dice aquí: 28/10/2026. */
function fechaBonita(f) {
  const m = String(f || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (f || '');
}

function Punto({ texto }) {
  const { titulo, detalle } = partirPunto(texto);
  const [principal, ...subs] = detalle.split('\n');
  return (
    <li className="flex gap-2 text-sm leading-relaxed">
      <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-slate-300" />
      <span className="min-w-0 text-slate-700">
        {titulo && <strong className="text-slate-900">{titulo}. </strong>}
        {principal}
        {subs.length > 0 && (
          <span className="mt-1 block space-y-0.5">
            {subs.map((s, i) => (
              <span key={i} className="block pl-3 font-mono text-[11px] text-slate-500">{s}</span>
            ))}
          </span>
        )}
      </span>
    </li>
  );
}

export default function Novedades() {
  const versiones = useMemo(() => leerNovedades(), []);
  const [busqueda, setBusqueda] = useState('');
  // La última siempre abierta: es lo que se viene a mirar.
  const [abiertas, setAbiertas] = useState(() => new Set(versiones.slice(0, 1).map((v) => v.version)));

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return versiones;
    return versiones
      .map((v) => ({
        ...v,
        apartados: v.apartados
          .map((a) => ({ ...a, puntos: a.puntos.filter((p) => p.toLowerCase().includes(q)) }))
          .filter((a) => a.puntos.length > 0),
      }))
      .filter((v) => v.apartados.length > 0 || v.version.includes(q));
  }, [versiones, busqueda]);

  const alternar = (v) => setAbiertas((s) => {
    const n = new Set(s);
    if (n.has(v)) n.delete(v); else n.add(v);
    return n;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Novedades del programa" />
      <div className="mx-auto max-w-3xl space-y-3 px-3 py-3">

        <div className="rounded-xl bg-white p-4 shadow" data-prueba="cabecera-novedades">
          <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Qué ha cambiado en el programa
          </h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Aquí van los arreglos y las mejoras de cada versión. Es distinto del historial de la
            ficha de cada cliente, que anota quién tocó qué dato: esto es el programa en sí.
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-8"
              data-prueba="buscar-novedades"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar un cambio… (copias, gas, impresión, firma…)"
            />
          </div>
        </div>

        {filtradas.length === 0 && (
          <p className="rounded-xl bg-white p-6 text-center text-sm text-slate-500 shadow" data-prueba="sin-novedades">
            {versiones.length === 0
              ? 'Todavía no hay novedades registradas.'
              : `No hay ningún cambio que hable de «${busqueda}».`}
          </p>
        )}

        {filtradas.map((v, i) => {
          const abierta = abiertas.has(v.version) || !!busqueda;
          return (
            <div key={v.version} className="overflow-hidden rounded-xl bg-white shadow" data-prueba={`version-${v.version}`}>
              <button
                type="button"
                onClick={() => alternar(v.version)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-slate-50"
              >
                {abierta ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  : <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />}
                <span className="text-base font-bold text-slate-800">Versión {v.version}</span>
                {i === 0 && !busqueda && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    la que tienes
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                  <FileClock className="h-3.5 w-3.5" />
                  {fechaBonita(v.fecha)} · {cuantosCambios(v)} cambios
                </span>
              </button>

              {abierta && (
                <div className="space-y-3 border-t px-4 py-3">
                  {v.apartados.map((a) => {
                    const c = COLORES[a.color] || COLORES.slate;
                    return (
                      <div key={a.titulo} className={`rounded-lg border ${c.borde} ${c.fondo} p-3`}>
                        <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${c.texto}`}>
                          {a.icono} {a.titulo}
                        </p>
                        <ul className="space-y-2">
                          {a.puntos.map((p, k) => <Punto key={k} texto={p} />)}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <p className="px-1 pb-4 text-center text-[11px] text-slate-400">
          Esta lista viene dentro del programa: se ve también sin cobertura.
        </p>
      </div>
    </div>
  );
}
