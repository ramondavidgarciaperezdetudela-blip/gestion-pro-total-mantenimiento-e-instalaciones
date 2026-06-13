import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Muestra un banner solo cuando NO hay red.
 * Cuando se restaura la conexión, muestra brevemente el éxito y desaparece.
 * NO parpadea — espera confirmación antes de cambiar estado.
 */
export default function NetworkStatus() {
  const [online,     setOnline]     = useState(true);   // Optimista: asume conectado
  const [showBanner, setShowBanner] = useState(false);
  const timerRef = useRef(null);

  const handleChange = (available) => {
    if (available) {
      setOnline(true);
      if (!available) return; // Ya estaba online
      // Mostrar brevemente "conexión restablecida"
      setShowBanner(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowBanner(false), 2500);
    } else {
      setOnline(false);
      setShowBanner(true);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  useEffect(() => {
    // Callback nativo del NetworkManager de Android
    window.__gptNetworkStatus = (available) => handleChange(available);

    // Eventos estándar del navegador
    const goOnline  = () => handleChange(true);
    const goOffline = () => handleChange(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.__gptNetworkStatus = null;
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 text-sm font-medium transition-all
      ${online ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
      {online
        ? <><Wifi className="w-4 h-4" /> Conexión restablecida</>
        : <><WifiOff className="w-4 h-4" /> Sin conexión — las herramientas externas no están disponibles</>
      }
    </div>
  );
}
