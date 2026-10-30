import React, { useState } from 'react';
import { AlertTriangle, Droplets, Gauge, Scale, ListChecks, Info, Wrench, FlaskConical } from 'lucide-react';
import { ESTADOS } from '@/lib/refrigerantes';
import {
  TIPOS, CAMBIO_ACEITE, FUENTES, CONDICIONES, PASOS_CONVERSION, TOLERANCIA_ESTIMADA,
  comparacionFisica, gasesParecidos, cargaConvertida, condicionTipica, avisoSeguridad, esInflamable,
  capacidadVolumetrica, condicion,
} from '@/lib/equivalenciasGases';
import { ATM } from '@/lib/saturacion';

/**
 * Piezas de pantalla de la conversión entre gases. Las usan «Equivalencias de gases» y la pestaña de
 * conversión del diagnóstico de carga, de modo que las dos enseñan exactamente lo mismo.
 * Todo sale de `equivalenciasGases.js`; aquí solo se pinta.
 */

const num = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const menos = (s) => String(s).replace('-', '−');
/** Presión absoluta → bar de manómetro, como se lee en el reloj. */
const bar = (abs) => menos(num(Math.round((abs - ATM) * 100) / 100 + 0, 2));
const pct = (r) => `${num(r * 100, 0)} %`;

export function Etiqueta({ children, className = '', ...props }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${className}`} {...props}>
      {children}
    </span>
  );
}

export const EtiquetaTipo = ({ tipo }) => (
  <Etiqueta className={TIPOS[tipo]?.color || ''} title={TIPOS[tipo]?.resumen} data-prueba="etq-tipo">{TIPOS[tipo]?.etiqueta || tipo}</Etiqueta>
);

export const EtiquetaEstado = ({ estado }) =>
  ESTADOS[estado] ? (
    <Etiqueta className={ESTADOS[estado].color} title={ESTADOS[estado].explicacion} data-prueba="etq-estado">{ESTADOS[estado].etiqueta}</Etiqueta>
  ) : null;

export function EtiquetaSeguridad({ clase }) {
  const aviso = avisoSeguridad(clase);
  if (!aviso) return clase && clase !== '—' ? <Etiqueta className="bg-emerald-50 text-emerald-800 border-emerald-200" title="No inflamable ni tóxico">{clase}</Etiqueta> : null;
  return (
    <Etiqueta className={esInflamable(clase) ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-purple-100 text-purple-800 border-purple-300'} title={aviso} data-prueba="etq-seguridad">
      {aviso}
    </Etiqueta>
  );
}

/** Texto del rango de carga de una ficha (fracciones → «90 % – 96 %»). */
export function textoCarga(factor) {
  if (!factor || factor.desde == null) return null;
  return factor.desde === factor.hasta ? pct(factor.desde) : `${pct(factor.desde)} – ${pct(factor.hasta)}`;
}

/* ───────────────────────────── Comparación física ───────────────────────────── */

/**
 * Presiones, capacidad y compresión de dos gases en las tres condiciones de trabajo.
 * Los números salen de las propiedades de cada gas (CoolProp), no de la ficha comercial.
 */
export function ComparacionFisica({ de, a }) {
  const filas = comparacionFisica(de, a);
  if (!filas) {
    return <p className="text-[11px] text-muted-foreground">No hay tabla de propiedades de {de} ni de {a}: no se puede comparar la física.</p>;
  }
  return (
    <div className="space-y-2" data-prueba="comparacion-fisica">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse max-w-none whitespace-nowrap">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="p-1.5 font-medium" rowSpan={2}>Condición</th>
              <th className="p-1.5 font-medium text-center border-l" colSpan={2}>{de} (bar)</th>
              <th className="p-1.5 font-medium text-center border-l" colSpan={2}>{a} (bar)</th>
              <th className="p-1.5 font-medium text-center border-l" colSpan={2}>{a} frente a {de}</th>
            </tr>
            <tr className="text-left text-muted-foreground border-b">
              <th className="p-1.5 font-medium border-l">Baja</th><th className="p-1.5 font-medium">Alta</th>
              <th className="p-1.5 font-medium border-l">Baja</th><th className="p-1.5 font-medium">Alta</th>
              <th className="p-1.5 font-medium border-l">Capacidad*</th><th className="p-1.5 font-medium">Compresión</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ condicion, de: A, a: B, razon }) => (
              <tr key={condicion.id} className="border-b last:border-0" data-prueba={`fila-fisica-${condicion.id}`}>
                <td className="p-1.5">
                  <div className="font-semibold text-foreground">{condicion.nombre}</div>
                  <div className="text-[10px] text-muted-foreground tabular">{menos(condicion.te)} / {menos(condicion.tc)} °C</div>
                </td>
                <td className="p-1.5 tabular border-l">{A ? bar(A.pe) : '—'}</td>
                <td className="p-1.5 tabular">{A ? bar(A.pc) : '—'}</td>
                <td className="p-1.5 tabular border-l">{B ? bar(B.pe) : '—'}</td>
                <td className="p-1.5 tabular">{B ? bar(B.pc) : '—'}</td>
                <td className="p-1.5 tabular border-l font-semibold">{razon ? pct(razon.qv) : '—'}</td>
                <td className="p-1.5 tabular">{razon ? `×${num(razon.compresion, 2)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground leading-snug">
        Presiones de manómetro a la temperatura de evaporación y de condensación indicadas (rocío). *Capacidad = calor que absorbe por cada
        m³ que aspira el compresor, en ciclo ideal: con el mismo compresor, el gas nuevo da esa fracción de la capacidad del anterior.
        Por debajo del 90 % el equipo notará la pérdida; por encima del 110 %, el compresor trabajará más cargado.
      </p>
    </div>
  );
}

/* ───────────────────────────── Carga ───────────────────────────── */

/** Cuánto gas cargar al convertir una instalación de `kg` kilos. */
export function CargaConvertida({ de, a, kg }) {
  const c = cargaConvertida(de, a, kg);
  if (!c) return null;
  if (c.sinConversion) {
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 text-sky-900 p-3 text-xs" data-prueba="carga-nuevo">
        <b>Equipo nuevo:</b> no hay una carga que convertir. La carga la marca la placa del equipo nuevo y depende de su diseño
        (volumen de líquido, longitud de líneas y gas).
        {c.ratioDensidad ? <> Como orden de magnitud, por la densidad del líquido el peso de gas sería de un {pct(c.ratioDensidad)} del actual, pero un equipo nuevo suele llevar menos.</> : null}
      </div>
    );
  }
  const f = c.factor;
  return (
    <div className="space-y-2" data-prueba="carga-convertida">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/60 p-2">
          <div className="tech-label">Peso actual</div>
          <div className="text-lg font-bold tabular">{num(c.pesoOriginal, 2)} kg</div>
          <div className="text-[10px] text-muted-foreground">{de}</div>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2" data-prueba="carga-inicial">
          <div className="tech-label text-amber-700">Cargar al empezar</div>
          <div className="text-lg font-bold tabular text-amber-800">{num(c.kg.inicial, 2)} kg</div>
          <div className="text-[10px] text-amber-700">{pct(f.inicial)} del peso actual</div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2" data-prueba="carga-final">
          <div className="tech-label text-emerald-700">Carga final esperada</div>
          {c.kg.desde != null ? (
            <>
              <div className="text-lg font-bold tabular text-emerald-800">{c.kg.desde === c.kg.hasta ? num(c.kg.desde, 2) : `${num(c.kg.desde, 2)} – ${num(c.kg.hasta, 2)}`} kg</div>
              <div className="text-[10px] text-emerald-700">{textoCarga(f)} · {c.origen === 'fabricante' ? 'guía del fabricante' : 'estimada'}</div>
            </>
          ) : (
            <div className="text-xs text-emerald-800 pt-2">Sin cifra publicada</div>
          )}
        </div>
      </div>
      {c.kg.max != null && (
        <p className="text-[11px] text-red-700 font-semibold" data-prueba="carga-max">No pases de {num(c.kg.max, 2)} kg ({pct(f.max)} del peso actual).</p>
      )}
      <p className="text-[11px] text-muted-foreground leading-snug">
        {c.origen === 'fabricante' && 'Cifras de la guía de reconversión del fabricante del gas. '}
        {c.origen === 'estimada' && (
          <>No hay cifra publicada para esta pareja: se ha estimado con la densidad del líquido (el volumen de líquido de la instalación es el mismo), con una banda de ±{num(TOLERANCIA_ESTIMADA * 100, 0)} %. Es una estimación, no un dato del fabricante. </>
        )}
        {c.origen === 'sinDato' && 'No hay cifra publicada ni datos físicos para estimarla. '}
        Empieza por el {pct(f.inicial)} y completa de 5 en 5 % pesando, hasta que el recalentamiento y el subenfriamiento sean los correctos: la carga correcta la da el funcionamiento, no la báscula.
      </p>
    </div>
  );
}

/* ───────────────────────────── Ficha de una conversión ───────────────────────────── */

export function PasosConversion() {
  return (
    <details className="rounded-lg border bg-card" data-prueba="pasos-conversion">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold flex items-center gap-1.5 text-foreground">
        <ListChecks className="w-3.5 h-3.5" /> Procedimiento de la conversión paso a paso
      </summary>
      <ol className="px-4 pb-3 pt-1 space-y-1.5 text-[11px] text-foreground list-decimal ml-3">
        {PASOS_CONVERSION.map((p) => <li key={p}>{p}</li>)}
      </ol>
    </details>
  );
}

/** Datos de una conversión: tipo, legal, GWP, aceite, nota y fuente. */
export function DatosFicha({ ficha }) {
  const { origen, destino } = ficha;
  const aceite = CAMBIO_ACEITE[ficha.cambioAceite];
  return (
    <div className="space-y-2" data-prueba="datos-ficha">
      <div className="flex flex-wrap gap-1.5">
        <EtiquetaTipo tipo={ficha.tipo} />
        <EtiquetaEstado estado={destino.estado} />
        <EtiquetaSeguridad clase={destino.seguridad} />
      </div>
      {ficha.prohibido && (
        <div className="flex items-start gap-2 text-[11px] bg-red-50 border border-red-200 text-red-700 rounded-md p-2" data-prueba="aviso-prohibido">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><b>{destino.id} está prohibido en la Unión Europea.</b> {ESTADOS.prohibido.explicacion}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md bg-muted/60 p-2">
          <div className="tech-label">GWP</div>
          <div className="tabular font-semibold text-foreground">
            {origen?.gwp != null ? num(origen.gwp, 0) : '—'} → {destino?.gwp != null ? num(destino.gwp, 0) : '—'}
            {ficha.reduccionGWP != null && ficha.reduccionGWP > 0 && <span className="ml-1 text-emerald-700">({menos(`-${ficha.reduccionGWP}`)} %)</span>}
            {ficha.reduccionGWP != null && ficha.reduccionGWP < 0 && <span className="ml-1 text-red-700">(+{Math.abs(ficha.reduccionGWP)} %)</span>}
          </div>
        </div>
        <div className="rounded-md bg-muted/60 p-2">
          <div className="tech-label flex items-center gap-1"><Droplets className="w-3 h-3" /> Aceite</div>
          <div className="text-foreground">{ficha.aceite}</div>
          {aceite && <div className={`font-semibold ${aceite.color}`} data-prueba="cambio-aceite">{aceite.etiqueta}</div>}
        </div>
      </div>
      <p className="text-[11px] text-foreground leading-snug bg-muted/40 rounded-md p-2 flex gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground" />
        <span>{ficha.nota}</span>
      </p>
      <p className="text-[10px] text-muted-foreground">
        Fuente: {FUENTES[ficha.fuente] || ficha.fuente}{ficha.ref ? ` (${ficha.ref})` : ''}.
      </p>
    </div>
  );
}

/* ───────────────────────────── Gases de presiones parecidas ───────────────────────────── */

/** Otros gases con presiones y capacidad parecidas, sin ficha de conversión. Solo comparación física. */
export function GasesParecidos({ de, onElegir }) {
  const [cond, setCond] = useState(condicionTipica(de));
  const lista = gasesParecidos(de, cond, { maximo: 40 }).filter((g) => !g.citado).slice(0, 10);
  const c = condicion(cond);
  const sinTabla = !(c && capacidadVolumetrica(de, c.te, c.tc));
  return (
    <div className="rounded-xl border bg-card p-3 space-y-2" data-prueba="gases-parecidos">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <FlaskConical className="w-4 h-4 text-muted-foreground" /> Otros gases con presiones parecidas
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Gases cuyas presiones y capacidad por m³ se parecen a las de {de} (±25 % en presión, −25 % a +30 % en capacidad). Es solo una
        comparación física: que se parezcan no significa que el fabricante del compresor los admita ni que se puedan usar legalmente.
      </p>
      <div className="flex gap-1" role="tablist" aria-label="Condición de comparación">
        {CONDICIONES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCond(c.id)}
            data-prueba={`parecidos-${c.id}`}
            className={`flex-1 rounded-md border px-2 py-1 text-[11px] font-medium ${cond === c.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground hover:bg-muted'}`}
          >
            {c.nombre}
            <span className="block text-[9px] opacity-80 tabular">{menos(c.te)} / {menos(c.tc)} °C</span>
          </button>
        ))}
      </div>
      {sinTabla ? (
        <p className="text-[11px] text-muted-foreground" data-prueba="parecidos-vacio">No hay tabla de propiedades de {de}: no se puede comparar con otros gases.</p>
      ) : lista.length === 0 ? (
        <p className="text-[11px] text-muted-foreground" data-prueba="parecidos-vacio">Ningún otro gas con tabla se parece lo bastante en esta condición.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {lista.map((g) => (
            <li key={g.id} className="rounded-md border bg-muted/30 p-2 text-[11px]" data-prueba="gas-parecido">
              <div className="flex flex-wrap items-center gap-1">
                <b className="text-sm text-foreground">{g.id}</b>
                <EtiquetaEstado estado={g.gas?.estado} />
                <EtiquetaSeguridad clase={g.gas?.seguridad} />
              </div>
              <div className="text-muted-foreground tabular mt-1">
                Presión baja {pct(g.razon.pe)} · alta {pct(g.razon.pc)} · capacidad {pct(g.razon.qv)}
              </div>
              {onElegir && (
                <button type="button" onClick={() => onElegir(g.id)} className="mt-1 text-[11px] text-primary underline">Ver conversiones desde {g.id}</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────────────────────────── Tarjeta de un sustituto ───────────────────────────── */

/** Una posible sustitución dentro de la lista de un gas. */
export function TarjetaSustituto({ ficha, onCalcular }) {
  const [verFisica, setVerFisica] = useState(false);
  const cargaTxt = ficha.carga ? textoCarga(ficha.carga) : ficha.ratioDensidad && ficha.tipo !== 'nuevo' ? `≈ ${pct(ficha.ratioDensidad)} (estimada)` : null;
  const fondo = ficha.prohibido ? 'border-red-200 bg-red-50/40' : ficha.tipo === 'directo' ? 'border-green-200' : ficha.tipo === 'conversion' ? 'border-amber-200' : 'border-border';
  return (
    <div className={`rounded-xl border bg-card p-3 space-y-2 ${fondo}`} data-prueba="tarjeta-sustituto" data-gas={ficha.a}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-bold text-foreground leading-tight">{ficha.a}</div>
          <div className="text-[11px] text-muted-foreground">{ficha.destino?.nombre !== ficha.a ? ficha.destino?.nombre : ficha.destino?.uso}</div>
        </div>
        {cargaTxt && (
          <div className="text-right shrink-0">
            <div className="tech-label">Carga</div>
            <div className="text-sm font-bold tabular text-foreground">{cargaTxt}</div>
          </div>
        )}
      </div>
      <DatosFicha ficha={ficha} />
      <div className="flex flex-wrap gap-2">
        {onCalcular && ficha.tipo !== 'sinFicha' && (
          <button type="button" onClick={() => onCalcular(ficha.a)} data-prueba="btn-calcular-carga"
            className="inline-flex items-center gap-1 rounded-md border bg-card hover:bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
            <Scale className="w-3.5 h-3.5" /> Calcular la carga
          </button>
        )}
        {ficha.tieneFisica && (
          <button type="button" onClick={() => setVerFisica((v) => !v)} aria-expanded={verFisica} data-prueba="btn-ver-fisica"
            className="inline-flex items-center gap-1 rounded-md border bg-card hover:bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground">
            <Gauge className="w-3.5 h-3.5" /> {verFisica ? 'Ocultar presiones' : 'Comparar presiones y capacidad'}
          </button>
        )}
      </div>
      {verFisica && <ComparacionFisica de={ficha.de} a={ficha.a} />}
    </div>
  );
}

/** Resumen de seguridad de la conversión a un equipo inflamable. */
export function AvisoInflamable({ ficha }) {
  if (!esInflamable(ficha?.destino?.seguridad)) return null;
  return (
    <div className="flex items-start gap-2 text-[11px] bg-orange-50 border border-orange-200 text-orange-800 rounded-md p-2" data-prueba="aviso-inflamable">
      <Wrench className="w-4 h-4 shrink-0 mt-0.5" />
      <span>
        <b>{ficha.destino.id} es {avisoSeguridad(ficha.destino.seguridad).split(': ')[1]}.</b> La instalación debe cumplir la UNE-EN 378 en carga máxima,
        ventilación, detección y fuentes de ignición, y los componentes eléctricos deben ser aptos. Consulta al fabricante del equipo antes de cambiar.
      </span>
    </div>
  );
}
