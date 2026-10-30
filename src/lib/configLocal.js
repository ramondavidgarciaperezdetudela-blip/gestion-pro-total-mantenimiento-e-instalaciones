/**
 * configLocal.js — La configuración del programa que vive en el aparato.
 *
 * Los datos de empresa y los ajustes del sistema ya van en la copia como
 * registros. Pero hay mucha configuración que solo está en el propio aparato
 * (aspecto, tipo de letra, IA y sus claves, impresión, carpeta de copias,
 * proveedor elegido, umbrales...). Sin esto, al restaurar en otro aparato o
 * tras reinstalar había que volver a ponerlo todo a mano.
 *
 * Aquí se recoge y se vuelve a poner, solo las claves que son ajustes: nunca
 * sesiones, licencias ni cachés.
 */

const AJUSTES = /^(gpt_|gpt:|ia_|plano_|backupConfig$|regulations_|supplier_|gas_supplier_data$|sat_technician$|currentTechnician$)/;

// Dentro de lo anterior, lo que NO es un ajuste: estado pasajero, avisos,
// sesiones, licencia de este aparato y contraseñas de soporte.
const EXCLUIDAS = /^(gpt_ultimo_error|gpt_last_update_check|gpt_vinculado_auto|gpt_trabajo_a_medias|gpt_cloud_upload_state|gpt_daily_autoupdate_last_date|gpt_license_v1|gpt_support_pwd|gpt_aviso_|gpt_emoji_recent|gpt_storage_notice_dismissed|regulations_last_check)/;
const SECRETAS = /token|session|sesion|auth|access|password_hash/i;

export function esAjuste(clave) {
  return AJUSTES.test(clave) && !EXCLUIDAS.test(clave) && !SECRETAS.test(clave);
}

/** { clave: texto } con todos los ajustes del aparato. */
export function recogerConfigLocal(almacen = globalThis.localStorage) {
  const salida = {};
  try {
    for (let i = 0; i < almacen.length; i++) {
      const k = almacen.key(i);
      if (k && esAjuste(k)) salida[k] = almacen.getItem(k);
    }
  } catch { /* sin acceso al almacenamiento */ }
  return salida;
}

/** Vuelve a poner los ajustes de una copia. Devuelve cuántos ha puesto. */
export function aplicarConfigLocal(config, almacen = globalThis.localStorage) {
  let n = 0;
  if (!config || typeof config !== 'object') return 0;
  for (const [k, v] of Object.entries(config)) {
    if (!esAjuste(k) || typeof v !== 'string') continue;
    try { almacen.setItem(k, v); n++; } catch { /* sin sitio */ }
  }
  return n;
}
