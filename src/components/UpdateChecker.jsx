/* global __APP_VERSION__ */
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, X, AlertCircle, CheckCircle2, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ── Configuración del repositorio PÚBLICO de descargas ───────────────────────
// Las versiones nuevas se publican aquí (instaladores de escritorio + APK).
const GITHUB_USER  = 'ramondavidgarciaperezdetudela-blip';
const GITHUB_REPO  = 'gestion-pro-total-releases';
const VERSION_URL  = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/version.json`;
const RELEASES_URL = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/releases/latest`;
// Versión instalada real (inyectada en build desde package.json).
const CURRENT_VERSION = (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0');

// Comparar versiones semánticas  "2025.1.0" < "2025.2.0" → true
function isNewer(remote, current) {
  const toNum = v => v.split('.').map(Number);
  const r = toNum(remote), c = toNum(current);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    if ((r[i]||0) > (c[i]||0)) return true;
    if ((r[i]||0) < (c[i]||0)) return false;
  }
  return false;
}

// Detectar plataforma
const isAPK  = typeof window !== 'undefined' && typeof window.GPTPrint !== 'undefined';
const isIOS  = /iPad|iPhone|iPod/.test(navigator.userAgent);

export default function UpdateChecker({ compact = false, headless = false }) {
  const [state, setState] = useState('idle'); // idle | checking | update | uptodate | error
  const [info,  setInfo]  = useState(null);
  const [show,  setShow]  = useState(false);
  const [auto,  setAuto]  = useState(false); // true = comprobación automática al cargar

  // Comprobar actualizaciones
  const check = useCallback(async () => {
    setState('checking');
    try {
      // Intentar primero el version.json del repo (más rápido)
      const res = await fetch(VERSION_URL + '?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo conectar al repositorio');
      const data = await res.json();
      setInfo(data);
      if (isNewer(data.version, CURRENT_VERSION)) {
        setState('update');
        setShow(true);
      } else {
        setState('uptodate');
        if (!auto) setShow(true); // mostrar "al día" solo si fue manual
      }
    } catch (err) {
      // Fallback: GitHub releases API
      try {
        const res2 = await fetch(RELEASES_URL);
        if (res2.ok) {
          const rel = await res2.json();
          const ver = (rel.tag_name || '').replace(/^v/, '');
          const apkAsset = (rel.assets || []).find(a => a.name.endsWith('.apk'));
          const zipAsset = (rel.assets || []).find(a => a.name.endsWith('.zip'));
          setInfo({
            version: ver,
            notas: rel.body || '',
            apk_url:  apkAsset?.browser_download_url || '',
            zip_url:  zipAsset?.browser_download_url || '',
            changelog_url: rel.html_url,
            date: rel.published_at?.substring(0,10) || '',
          });
          if (ver && isNewer(ver, CURRENT_VERSION)) {
            setState('update');
            setShow(true);
          } else {
            setState('uptodate');
            if (!auto) setShow(true);
          }
        } else throw new Error();
      } catch {
        setState('error');
        if (!auto) setShow(true);
      }
    }
  }, [auto]);

  // Comprobar automáticamente al cargar (una vez al día)
  useEffect(() => {
    const lastCheck = localStorage.getItem('gpt_last_update_check');
    const now = Date.now();
    // Comprobar automáticamente si no se ha comprobado hoy
    if (!lastCheck || now - parseInt(lastCheck) > 86400000) {
      setAuto(true);
      localStorage.setItem('gpt_last_update_check', String(now));
      check();
    }
  }, []);

  const downloadURL = isAPK ? info?.apk_url : info?.zip_url;
  const downloadLabel = isAPK ? 'Descargar APK actualizado' : 'Descargar actualización';

  // Badge compacto para el header/navbar
  if (compact) {
    return (
      <button
        onClick={() => { setAuto(false); check(); setShow(true); }}
        className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors"
        title="Comprobar actualizaciones"
      >
        <RefreshCw className={`w-4 h-4 text-white ${state === 'checking' ? 'animate-spin' : ''}`} />
        {state === 'update' && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full border border-blue-800" />
        )}
      </button>
    );
  }

  return (
    <>
      {/* Botón principal (oculto en modo headless: solo auto-aviso) */}
      {!headless && (
      <Button
        variant="outline"
        onClick={() => { setAuto(false); check(); }}
        disabled={state === 'checking'}
        className="flex items-center gap-2 text-sm"
      >
        {state === 'checking' ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : state === 'update' ? (
          <ArrowUpCircle className="w-4 h-4 text-amber-500" />
        ) : (
          <RefreshCw className="w-4 h-4" />
        )}
        {state === 'checking' ? 'Comprobando...'
          : state === 'update'   ? `Actualización disponible v${info?.version}`
          : 'Comprobar actualizaciones'}
      </Button>
      )}

      {/* Modal de resultado */}
      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              state === 'update'   ? 'bg-amber-50 border-b border-amber-200'
            : state === 'uptodate'? 'bg-green-50 border-b border-green-200'
            : state === 'error'   ? 'bg-red-50 border-b border-red-200'
            : 'bg-slate-50 border-b'}`}
            >
              <div className="flex items-center gap-3">
                {state === 'update'    && <ArrowUpCircle className="w-7 h-7 text-amber-500" />}
                {state === 'uptodate' && <CheckCircle2  className="w-7 h-7 text-green-500" />}
                {state === 'error'    && <AlertCircle   className="w-7 h-7 text-red-500" />}
                <div>
                  <p className="font-bold text-slate-800 text-base">
                    {state === 'update'    ? '🚀 Nueva versión disponible'
                   : state === 'uptodate' ? '✅ El programa está actualizado'
                   : state === 'error'    ? '⚠️ Sin conexión al repositorio'
                   : 'Comprobando...'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Versión instalada: {CURRENT_VERSION}
                    {info?.version && state === 'update' && ` → Nueva: ${info.version}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setShow(false)}
                className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="p-6 space-y-4">
              {state === 'update' && info && (
                <>
                  {info.date && (
                    <p className="text-xs text-slate-500">📅 Publicada: {info.date}</p>
                  )}
                  {info.notas && (
                    <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 max-h-32 overflow-y-auto">
                      <p className="font-semibold mb-1 text-xs text-slate-500 uppercase">Novedades</p>
                      {info.notas}
                    </div>
                  )}
                  <div className="space-y-2">
                    {downloadURL && (
                      <a href={downloadURL} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors">
                        <Download className="w-5 h-5" />
                        {downloadLabel}
                      </a>
                    )}
                    {info.changelog_url && (
                      <a href={info.changelog_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full border border-slate-300 text-slate-600 hover:bg-slate-50 py-2.5 rounded-xl text-sm transition-colors">
                        Ver todos los cambios en GitHub
                      </a>
                    )}
                  </div>
                  {isAPK && (
                    <p className="text-xs text-slate-500 bg-blue-50 p-2 rounded">
                      💡 Descargue el APK y ábralo para instalar la actualización.
                      Android lo reconoce automáticamente como actualización del mismo programa.
                    </p>
                  )}
                </>
              )}

              {state === 'uptodate' && (
                <p className="text-sm text-slate-600 text-center py-2">
                  Tiene la última versión instalada. El programa comprobará automáticamente actualizaciones cada 24 horas.
                </p>
              )}

              {state === 'error' && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    No se pudo conectar al repositorio de GitHub. Verifique su conexión a internet e inténtelo de nuevo.
                  </p>
                  <p className="text-xs text-slate-500">
                    También puede comprobar manualmente las actualizaciones en:<br/>
                    <a href={`https://github.com/${GITHUB_USER}/${GITHUB_REPO}/releases`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-blue-500 hover:underline">
                      github.com/{GITHUB_USER}/{GITHUB_REPO}/releases
                    </a>
                  </p>
                  <Button onClick={() => { check(); }} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
