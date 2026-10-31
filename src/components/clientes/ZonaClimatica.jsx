import React, { useMemo } from 'react';
import { Thermometer, MapPin } from 'lucide-react';
import { CAPITALES, COLOR_LETRA, zonaClimaticaDe } from '@/lib/zonaClimatica';

/**
 * Tarjeta de zona climática (CTE DB-HE) del cliente: letra de invierno + número
 * de verano y un mapa de puntos con las capitales de provincia coloreadas por
 * severidad de invierno. La capital de referencia del cliente va resaltada.
 * Es la zona de la CAPITAL (orientativa; el municipio puede variar por altitud).
 */
const ANCHO = 300, ALTO = 210;
const LON0 = -9.6, LON1 = 4.6, LAT0 = 35.6, LAT1 = 44.0;
const proyectar = (lat, lon) => {
  // Canarias en un recuadro abajo-izquierda para que quepan en el mapa.
  if (lat < 30) return [10 + ((lon + 18.3) / 3.2) * 62, ALTO - 22 - ((lat - 27.6) / 1.6) * 24];
  return [((lon - LON0) / (LON1 - LON0)) * ANCHO, ((LAT1 - lat) / (LAT1 - LAT0)) * ALTO];
};

export default function ZonaClimatica({ contacto }) {
  const z = useMemo(() => zonaClimaticaDe(contacto), [contacto?.postal_code, contacto?.province, contacto?.city, contacto?.latitude, contacto?.longitude]);
  const puntos = useMemo(() => CAPITALES.map((c) => ({ ...c, xy: proyectar(c.lat, c.lon) })), []);

  return (
    <section className="rounded-lg border bg-card p-3" data-testid="zona-climatica">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3" /> Zona climática (CTE)</div>
          {z ? (
            <>
              <div className="font-mono text-3xl font-semibold tabular-nums leading-tight" style={{ color: COLOR_LETRA[z.letra] }} data-testid="zona-valor">{z.zona}</div>
              <div className="text-xs text-muted-foreground">{z.invierno} · {z.verano}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground"><MapPin className="h-3 w-3" /> Referencia: {z.capital} (por {z.por})</div>
            </>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">Indica código postal o provincia para ver la zona.</div>
          )}
        </div>
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-36 w-auto shrink-0" role="img" aria-label="Mapa de zonas climáticas">
          <rect x="4" y={ALTO - 52} width="76" height="46" rx="3" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="3 3" />
          {puntos.map((c) => {
            const activo = z && c.nombre === z.capital;
            return (
              <g key={c.nombre}>
                {activo && <circle cx={c.xy[0]} cy={c.xy[1]} r="11" fill="none" stroke={COLOR_LETRA[c.zona[0]]} strokeWidth="1.5" className="pulso-critico" />}
                <circle cx={c.xy[0]} cy={c.xy[1]} r={activo ? 5 : 3.2} fill={COLOR_LETRA[c.zona[0]]} fillOpacity={z && !activo ? 0.45 : 0.95}><title>{`${c.nombre}: ${c.zona}`}</title></circle>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {['E', 'D', 'C', 'B', 'A'].map((l) => (
          <span key={l} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: COLOR_LETRA[l] }} />{l}
          </span>
        ))}
      </div>
    </section>
  );
}
