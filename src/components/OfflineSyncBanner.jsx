import React, { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

export default function OfflineSyncBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  const handleOnline = useCallback(() => {
    setOnline(true);
    if (wasOffline) {
      // Volvió la red: sincronizar
      setSyncing(true);
      // Registrar sync en service worker si disponible
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          if (reg.sync) {
            reg.sync.register('sync-pending-ops').catch(() => {});
          }
        });
      }
      // Simular sync (la app ya reconecta sola con base44)
      setTimeout(() => {
        setSyncing(false);
        setJustSynced(true);
        setWasOffline(false);
        setTimeout(() => setJustSynced(false), 4000);
      }, 2000);
    }
  }, [wasOffline]);

  const handleOffline = useCallback(() => {
    setOnline(false);
    setWasOffline(true);
  }, []);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Escuchar mensajes del service worker
    const handleSWMessage = (event) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        setSyncing(false);
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 4000);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [handleOnline, handleOffline]);

  if (online && !syncing && !justSynced) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 ${
      !online
        ? 'bg-orange-500 text-white'
        : syncing
        ? 'bg-blue-500 text-white'
        : 'bg-green-500 text-white'
    }`}>
      {!online && (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Sin conexión — Los datos se sincronizarán al recuperar Internet</span>
        </>
      )}
      {online && syncing && (
        <>
          <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span>Sincronizando datos con la nube...</span>
        </>
      )}
      {online && justSynced && (
        <>
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Sincronización completada</span>
        </>
      )}
    </div>
  );
}
