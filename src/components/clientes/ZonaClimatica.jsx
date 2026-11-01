import React, { useMemo, useState } from 'react';
import { Map as IconoMapa } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MAPA_PROVINCIAS, MAPA_VIEWBOX, MAPA_CANARIAS } from '@/data/mapaEspana';
import {
  COMUNIDADES, FILAS_ZONA, comunidadDe, nombreProvincia, zonaDeProvincia, zonaDelCliente,
} from '@/lib/zonaClimatica';

/**
 * Zona climática del CTE (DB-HE) de un cliente: mapa de provincias coloreado por
 * zona, búsqueda por comunidad autónoma y provincia, tarjeta con la zona y
 * rejilla para fijarla a mano. Sin `onCambiar` es de solo lectura.
 *
 * Es la zona de la CAPITAL de provincia (Anejo B): orientativa, el municipio
 * puede variar por su altitud, por eso se puede fijar a mano.
 */
export const COLOR_ZONA = { 'α': '#f08a3c', A: '#f7b267', B: '#fbe08f', C: '#a6e6f2', D: '#52c7e3', E: '#1f7694' };

export default function ZonaClimatica({ contacto, onCambiar, compacto = false }) {
  const editable = typeof onCambiar === 'function';
  const [comunidadLocal, setComunidadLocal] = useState('');
  const z = useMemo(() => zonaDelCliente(contacto || {}), [contacto]);
  const clave = z?.clave || null;
  const comunidad = clave ? comunidadDe(clave) : null;
  const altitud = parseFloat(String(contacto?.altitude_m ?? '').replace(',', '.'));
  const zonaAuto = clave ? zonaDeProvincia(clave) : null;

  const elegirProvincia = (c) => { setComunidadLocal(''); onCambiar?.({ province: nombreProvincia(c), climate_zone: '' }); };
  const elegirComunidad = (nombre) => {
    const com = COMUNIDADES.find((x) => x.nombre === nombre);
    if (com?.provincias.length === 1) elegirProvincia(com.provincias[0]);
    else setComunidadLocal(nombre);
  };
  const comunidadElegida = (comunidadLocal ? COMUNIDADES.find((x) => x.nombre === comunidadLocal) : comunidad) || null;
  const fijar = (zona) => onCambiar?.({ climate_zone: zona === zonaAuto ? '' : zona });

  return (
    <section className="rounded-lg border bg-card" data-testid="zona-climatica">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <IconoMapa className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Zona climática (CTE DB-HE)</h3>
      </header>
      <div className="space-y-3 p-3">
        {editable && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Comunidad autónoma</div>
              <Select value={comunidadElegida?.nombre || ''} onValueChange={elegirComunidad}>
                <SelectTrigger data-testid="zona-comunidad"><SelectValue placeholder="Elige comunidad…" /></SelectTrigger>
                <SelectContent>{COMUNIDADES.map((c) => <SelectItem key={c.nombre} value={c.nombre}>{c.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Provincia</div>
              <Select value={clave && (!comunidadElegida || comunidadElegida.provincias.includes(clave)) ? clave : ''} onValueChange={elegirProvincia} disabled={!comunidadElegida}>
                <SelectTrigger data-testid="zona-provincia"><SelectValue placeholder={comunidadElegida ? 'Elige provincia…' : 'Primero la comunidad'} /></SelectTrigger>
                <SelectContent>{(comunidadElegida?.provincias || []).map((p) => <SelectItem key={p} value={p}>{nombreProvincia(p)} · {zonaDeProvincia(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className={`flex gap-3 ${compacto ? 'flex-col sm:flex-row' : 'flex-col'}`}>
          <div className="relative mx-auto w-full max-w-[460px]">
            <svg viewBox={MAPA_VIEWBOX} className="w-full" role="img" aria-label="Mapa de zonas climáticas por provincia">
              <rect x={MAPA_CANARIAS.x} y={MAPA_CANARIAS.y} width={MAPA_CANARIAS.w} height={MAPA_CANARIAS.h} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="4 3" />
              {MAPA_PROVINCIAS.map((p) => {
                const zp = zonaDeProvincia(p.clave); const sel = p.clave === clave;
                return (
                  <path key={p.clave} d={p.d} data-provincia={p.clave} data-zona={zp}
                    fill={COLOR_ZONA[zp?.[0]] || '#ddd'} stroke={sel ? '#111' : '#ffffff'} strokeWidth={sel ? 2.2 : 0.8} strokeLinejoin="round"
                    className={editable ? 'cursor-pointer transition-opacity hover:opacity-70' : ''}
                    onClick={editable ? () => elegirProvincia(p.clave) : undefined}
                    style={sel ? { filter: 'drop-shadow(0 0 2px rgba(0,0,0,.4))' } : undefined}>
                    <title>{`${p.nombre}: ${zp}`}</title>
                  </path>
                );
              })}
            </svg>
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="rounded-md border bg-background p-3" data-testid="zona-tarjeta">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Zona del cliente</div>
              {z ? (
                <>
                  <div className="font-mono text-3xl font-semibold leading-tight tabular-nums" style={{ color: z.letra === 'E' || z.letra === 'D' ? '#0e7490' : '#c2410c' }} data-testid="zona-valor">{z.zona}</div>
                  <div className="text-xs text-muted-foreground">{z.invierno[0].toUpperCase() + z.invierno.slice(1)} · {z.verano[0].toUpperCase() + z.verano.slice(1)}</div>
                  {z.origen === 'manual' && <div className="mt-1 text-[10px] uppercase tracking-wider text-aviso">Fijada a mano{zonaAuto ? ` (automática: ${zonaAuto})` : ''}</div>}
                  {editable && z.origen === 'manual' && (
                    <button type="button" onClick={() => onCambiar({ climate_zone: '' })} data-testid="zona-quitar" className="mt-1 text-xs text-primary underline">Quitar la zona fijada a mano</button>
                  )}
                </>
              ) : (
                <div className="mt-1 text-sm text-muted-foreground">Indica provincia o código postal, o elige en el mapa.</div>
              )}
            </div>

            {!compacto && (
              <div data-testid="zona-rejilla">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Severidad de invierno (α suave → E frío) · filas · verano (1 suave → 4 muy cálido) · columnas</div>
                <div className="space-y-1">
                  {FILAS_ZONA.map((f) => (
                    <div key={f.letra} className="flex items-center gap-1">
                      <span className="w-4 text-center font-mono text-[10px] text-muted-foreground">{f.letra}</span>
                      {[1, 2, 3, 4].map((n) => {
                        const nombre = `${f.letra}${n}`; const existe = f.numeros.includes(n);
                        if (!existe) return <span key={n} className="h-7 flex-1" />;
                        const activa = z?.zona === nombre; const auto = zonaAuto === nombre;
                        return (
                          <button key={n} type="button" disabled={!editable} onClick={() => fijar(nombre)} data-zona-celda={nombre}
                            className={`h-7 flex-1 rounded border font-mono text-xs tabular-nums transition-colors ${activa ? 'border-primary bg-primary/15 font-semibold' : 'bg-background hover:bg-accent'} ${auto && !activa ? 'border-dashed border-primary' : ''} ${editable ? '' : 'cursor-default'}`}>
                            {nombre}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {['α', 'A', 'B', 'C', 'D', 'E'].map((l) => (
            <span key={l} className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_ZONA[l] }} />{l}</span>
          ))}
          <span className="text-[10px] text-muted-foreground">severidad de invierno (α suave → E frío)</span>
        </div>

        <p className="text-[11px] leading-snug text-muted-foreground">
          {z?.capital ? `Zona de referencia de ${z.capital} según el CTE DB-HE, Anejo B. ` : 'Zona de referencia de la capital de provincia según el CTE DB-HE, Anejo B. '}
          Compruébala para el municipio y su altitud.{editable ? ' El recuadro discontinuo es la referencia; pulsa una casilla para fijar la del emplazamiento.' : ''}
          {Number.isFinite(altitud) && altitud > 0 ? ` Altitud indicada: ${altitud.toLocaleString('es-ES')} m; si está muy por encima de la capital, la zona real puede ser más fría.` : ''}
        </p>
      </div>
    </section>
  );
}
