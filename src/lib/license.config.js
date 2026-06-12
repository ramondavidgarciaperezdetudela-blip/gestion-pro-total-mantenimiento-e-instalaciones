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
  // Protección activa.
  enabled: true,

  // 'cloud' si hay endpoint configurado; si no, 'local' (clave pública).
  mode: import.meta.env.VITE_LICENSE_ENDPOINT ? 'cloud' : 'local',

  cloudEndpoint: import.meta.env.VITE_LICENSE_ENDPOINT || '',

  // Tu build personal: VITE_LICENSE_OWNER_BYPASS=1 para no pedir licencia.
  ownerBypass: import.meta.env.VITE_LICENSE_OWNER_BYPASS === '1',

  // Rutas que nunca se bloquean (vistas públicas para clientes).
  publicPaths: ['/presupuesto-publico', '/sat-publico'],
};

export default licenseConfig;
