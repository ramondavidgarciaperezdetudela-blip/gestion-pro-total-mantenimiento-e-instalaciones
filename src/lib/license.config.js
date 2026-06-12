/**
 * Configuración de la capa de licencias.
 * --------------------------------------
 * La protección se controla aquí. Por seguridad NO se incrusta la clave
 * secreta en el código: se lee de variables de entorno en tiempo de build.
 *
 *   VITE_LICENSE_SECRET    -> clave maestra (modo local/offline)
 *   VITE_LICENSE_ENDPOINT  -> URL del validador en servidor (modo cloud)
 *   VITE_LICENSE_OWNER_BYPASS=1 -> tu propio build sin pedir licencia
 *
 * Comportamiento de seguridad:
 *   - Si `enabled` es false  -> la app NO pide licencia (modo normal).
 *   - Si `enabled` es true pero NO hay secreto ni endpoint configurado,
 *     la app TAMPOCO bloquea (evita dejarte fuera por accidente) y avisa
 *     por consola. Solo bloquea cuando hay con qué validar.
 *
 * Las rutas públicas (presupuestos/SAT compartidos con clientes) nunca se
 * bloquean.
 */
export const licenseConfig = {
  // Capa activada (cableada en App.jsx). Solo exige licencia si hay
  // secreto/endpoint configurado; si no, deja pasar para no bloquearte.
  enabled: true,

  // 'local' = validación offline con VITE_LICENSE_SECRET
  // 'cloud' = validación en servidor con VITE_LICENSE_ENDPOINT (recomendado)
  mode: import.meta.env.VITE_LICENSE_ENDPOINT ? 'cloud' : 'local',

  cloudEndpoint: import.meta.env.VITE_LICENSE_ENDPOINT || '',
  localSecret: import.meta.env.VITE_LICENSE_SECRET || '',

  // Tu build personal: pon VITE_LICENSE_OWNER_BYPASS=1 para no pedir licencia.
  ownerBypass: import.meta.env.VITE_LICENSE_OWNER_BYPASS === '1',

  // Rutas que nunca se bloquean (vistas públicas para clientes).
  publicPaths: ['/presupuesto-publico', '/sat-publico'],
};

export default licenseConfig;
