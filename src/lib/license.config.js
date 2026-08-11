/**
 * Configuración de la capa de licencias (firma de clave pública ECDSA).
 * --------------------------------------------------------------------
 * La app verifica las licencias con la CLAVE PÚBLICA incrustada en
 * `licenseManager.js` (segura de publicar). NO hay ningún secreto en el
 * cliente: las licencias se firman con la clave PRIVADA, que solo tú tienes.
 *
 * Variables de entorno opcionales (build):
 *   VITE_LICENSE_ENDPOINT     -> URL del validador en servidor (modo cloud)
 *   VITE_LICENSE_OWNER_BYPASS -> "1" para tu build personal sin pedir licencia
 *   VITE_LICENSE_PUBKEY       -> JWK alternativo si rotas la clave pública
 *
 * Comportamiento:
 *   - enabled=true  -> exige licencia válida (salvo rutas públicas y bypass).
 *   - enabled=false -> la app no pide licencia (modo normal).
 *   - Rutas públicas (presupuestos/SAT compartidos) nunca se bloquean.
 */
export const licenseConfig = {
  // ⚠️ DESACTIVADA temporalmente: el programa NO pide clave de registro al
  // iniciar (hasta nuevo aviso). El gestor de licencias se conserva en
  // /LICENCIAS-GUARDADO para reactivarlo cuando todo esté listo.
  enabled: false,

  // 'cloud' si hay endpoint configurado; si no, 'local' (clave pública).
  mode: import.meta.env.VITE_LICENSE_ENDPOINT ? 'cloud' : 'local',

  cloudEndpoint: import.meta.env.VITE_LICENSE_ENDPOINT || '',

  // Validación en la nube por JSONP (Apps Script). Si está definida, la app
  // comprueba al abrir si la licencia está REVOCADA o COMPARTIDA (otro equipo).
  // Si no hay internet, sigue funcionando con la validación local (offline).
  cloudJsonp: import.meta.env.VITE_LICENSE_JSONP ||
    'https://script.google.com/macros/s/AKfycbwzhYoqLgif9YEUVbosytFDII_9wyZtLCN2_gxau4VwlfcOUpxcPyQqM-ondccvL3uc/exec',

  // Tu build personal: VITE_LICENSE_OWNER_BYPASS=1 para no pedir licencia.
  ownerBypass: import.meta.env.VITE_LICENSE_OWNER_BYPASS === '1',

  // Rutas que nunca se bloquean (vistas públicas para clientes).
  publicPaths: ['/presupuesto-publico', '/sat-publico'],
};

export default licenseConfig;
