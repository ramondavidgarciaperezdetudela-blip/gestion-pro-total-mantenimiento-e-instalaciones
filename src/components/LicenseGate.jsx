/**
 * LicenseGate — control de licencia OPCIONAL.
 * Envuelve la parte protegida de la app. Si la licencia no es válida,
 * muestra la pantalla de activación. Las rutas públicas y el modo sin
 * configurar pasan siempre (ver src/lib/license.config.js).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  loadLicense, saveLicense, clearLicense, getDeviceId,
  validateLicenseLocal, validateLicenseCloud, describeReason,
} from '@/lib/licenseManager';
import { licenseConfig as cfg } from '@/lib/license.config';

function isPublicPath() {
  const p = (window.location.pathname || '').toLowerCase();
  return cfg.publicPaths.some((pp) => p.startsWith(pp.toLowerCase())) || p.includes('publico');
}

async function validateCurrent() {
  const key = loadLicense();
  if (!key) return { valid: false, reason: 'SIN_LICENCIA' };
  if (cfg.mode === 'cloud') return validateLicenseCloud(key, cfg.cloudEndpoint, { deviceId: getDeviceId() });
  return validateLicenseLocal(key, cfg.localSecret, { deviceId: getDeviceId() });
}

function ActivationScreen({ reason, onActivated }) {
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState(reason && reason !== 'SIN_LICENCIA' ? describeReason(reason) : '');
  const [busy, setBusy] = useState(false);
  const deviceId = getDeviceId();

  const activar = async () => {
    setBusy(true); setMsg('');
    saveLicense(key.trim());
    const res = await validateCurrent();
    setBusy(false);
    if (res.valid) { onActivated(); }
    else { clearLicense(); setMsg(describeReason(res.reason)); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-7">
        <h1 className="text-xl font-bold text-blue-800">Activar Gestión Pro Total</h1>
        <p className="text-slate-500 text-sm mt-1">
          Introduce tu clave de licencia para usar la aplicación.
        </p>

        <div className="mt-5">
          <label className="text-xs font-semibold text-slate-600">Tu identificador de equipo</label>
          <div className="mt-1 bg-slate-900 text-sky-300 rounded-lg py-2 text-center font-mono tracking-wider">
            {deviceId}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Envíanos este código para obtener tu licencia.
          </p>
        </div>

        <label className="block text-xs font-semibold text-slate-600 mt-4">Clave de licencia</label>
        <textarea
          rows={4}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="payload.firma"
          className="w-full mt-1 border border-slate-300 rounded-lg p-2 font-mono text-xs"
        />

        {msg && <p className="text-red-600 text-sm mt-2">{msg}</p>}

        <button
          onClick={activar}
          disabled={busy || !key.trim()}
          className="w-full mt-4 bg-green-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg hover:opacity-95"
        >
          {busy ? 'Comprobando…' : 'Activar'}
        </button>

        <p className="text-xs text-slate-400 mt-4 text-center">
          Soporte: ramondavidgarciaperezdetudela@gmail.com
        </p>
      </div>
    </div>
  );
}

export default function LicenseGate({ children }) {
  const [state, setState] = useState({ checking: true, valid: false, reason: '' });

  const run = useCallback(async () => {
    // No bloquear: rutas públicas, capa desactivada, modo propietario,
    // o falta de configuración (evita dejarte fuera por accidente).
    if (isPublicPath() || !cfg.enabled || cfg.ownerBypass) {
      return setState({ checking: false, valid: true });
    }
    const configured = cfg.mode === 'cloud' ? !!cfg.cloudEndpoint : !!cfg.localSecret;
    if (!configured) {
      if (import.meta.env.DEV) {
        console.warn('[Licencias] Capa activada sin secreto/endpoint: se deja pasar. Configura VITE_LICENSE_SECRET o VITE_LICENSE_ENDPOINT para exigir licencia.');
      }
      return setState({ checking: false, valid: true });
    }
    const res = await validateCurrent();
    setState({ checking: false, valid: res.valid, reason: res.reason });
  }, []);

  useEffect(() => { run(); }, [run]);

  if (state.checking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }
  if (state.valid) return children;
  return <ActivationScreen reason={state.reason} onActivated={() => window.location.reload()} />;
}
