import React, { useEffect, useState } from 'react';
import { Navigation, ExternalLink, MapPinOff } from 'lucide-react';
import { enlaceMapa, enlaceRuta, enlaceWaze, urlMapaIncrustado } from '@/lib/fichaProveedor';

/**
 * Plano de situación de una dirección (cliente u obra) con los botones para ir en GPS.
 * El plano necesita internet; sin conexión se avisa y los botones siguen ahí.
 */
export default function PlanoSituacion({ lugar, alto = 260 }) {
  const [enLinea, setEnLinea] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  useEffect(() => {
    const a = () => setEnLinea(true); const b = () => setEnLinea(false);
    window.addEventListener('online', a); window.addEventListener('offline', b);
    return () => { window.removeEventListener('online', a); window.removeEventListener('offline', b); };
  }, []);
  const src = urlMapaIncrustado(lugar);
  if (!src) return null;
  return (
    <div className="col-span-2 space-y-2" data-prueba="plano-situacion">
      {enLinea ? (
        <iframe title="Plano de situación" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="w-full rounded-lg border" style={{ height: alto }} data-prueba="plano-situacion-mapa" />
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground"><MapPinOff className="h-4 w-4" />Sin conexión: el plano necesita internet. Los botones de abajo abren la app de mapas cuando vuelva.</div>
      )}
      <div className="flex flex-wrap gap-2">
        <a href={enlaceRuta(lugar)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-orange-700" data-prueba="boton-como-llegar"><Navigation className="h-4 w-4" />Cómo llegar (GPS)</a>
        <a href={enlaceWaze(lugar)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent" data-prueba="boton-waze">Waze</a>
        <a href={enlaceMapa(lugar)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"><ExternalLink className="h-4 w-4" />Abrir mapa</a>
      </div>
    </div>
  );
}
