import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Accesos directos de la pantalla de inicio de Android: al pulsarlos, la app
 * se abre con gestionpro://app/<Pantalla> y esto lleva a esa pantalla, tanto
 * si la app estaba cerrada como si estaba abierta.
 */
const PANTALLAS = ['SAT', 'Agenda', 'Contacts', 'Documents', 'PlanoFrigorifico', 'BackupCenter'];

export function rutaDeAcceso(url) {
  const m = String(url || '').match(/^gestionpro:\/\/app\/([A-Za-z0-9_]+)\/?(?:[?#].*)?$/);
  return m && PANTALLAS.includes(m[1]) ? `/${m[1]}` : null;
}

export default function AccesosDirectos() {
  const navigate = useNavigate();
  useEffect(() => {
    let quitar = null;
    let vivo = true;
    try {
      if (!window.Capacitor?.isNativePlatform?.()) return undefined;
    } catch { return undefined; }
    import('@capacitor/app').then(async ({ App }) => {
      if (!vivo) return;
      const ir = (url) => { const r = rutaDeAcceso(url); if (r) navigate(r); };
      try { ir((await App.getLaunchUrl())?.url); } catch { /* sin url de arranque */ }
      const h = await App.addListener('appUrlOpen', (e) => ir(e?.url));
      if (vivo) quitar = h; else h.remove();
    }).catch(() => { /* sin plugin: la app funciona igual */ });
    return () => { vivo = false; try { quitar?.remove(); } catch { /* ya quitado */ } };
  }, [navigate]);
  return null;
}
