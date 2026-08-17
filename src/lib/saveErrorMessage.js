/**
 * Traduce un error de guardado a un mensaje que sirva de verdad.
 *
 * Antes se mostraba siempre "Comprueba tu conexión e inténtalo de nuevo",
 * incluso cuando el problema no tenía nada que ver con la red (petición
 * demasiado grande, sesión caducada, validación...). Eso hacía imposible
 * saber qué pasaba de verdad: el usuario revisaba el wifi y el fallo seguía.
 *
 * Ahora se identifica la causa por el código HTTP cuando está disponible y,
 * si no se reconoce, se muestra el mensaje real del error en vez de ocultarlo.
 */

import { recomprimirDataURL, guardarLimiteAprendido } from './compressImage';

/**
 * ¿El servidor ha rechazado el guardado porque UNA FOTO concreta es demasiado
 * grande? El mensaje típico es:
 *   Field 'photos_before[0]' exceeds the maximum allowed size.
 * Ojo: el límite es POR CAMPO, no por el total de la ficha, y no está
 * documentado, así que hay que descubrirlo probando.
 */
export function esErrorDeFotoDemasiadoGrande(err) {
  const m = String(err?.message || '') + ' ' + String(err?.response?.data?.message || '');
  return /exceeds the maximum allowed size/i.test(m);
}

/**
 * Reduce todas las fotos guardadas dentro de la ficha (Data URL) a `limite`,
 * para reintentar el guardado. Las que ya son URL de la nube no se tocan.
 *
 * @param {string[]} fotos
 * @param {number} limite
 * @returns {Promise<string[]>}
 */
export async function reducirFotos(fotos, limite) {
  if (!Array.isArray(fotos) || !fotos.length) return fotos;
  return Promise.all(fotos.map(f => recomprimirDataURL(f, limite)));
}

/** Tamaño de la foto más grande guardada dentro de la ficha. */
export function tamanoFotoMayor(...listas) {
  return listas
    .flat()
    .reduce((max, f) => (typeof f === 'string' && f.startsWith('data:') ? Math.max(max, f.length) : max), 0);
}

export { guardarLimiteAprendido };

/** Extrae el código HTTP de un error del SDK, venga en el campo que venga. */
function getStatus(err) {
  return (
    err?.status ??
    err?.statusCode ??
    err?.response?.status ??
    err?.cause?.status ??
    null
  );
}

/**
 * @param {unknown} err          error capturado
 * @param {string}  [entidad]    qué se estaba guardando ("la orden", "el parte"...)
 * @returns {string} mensaje para mostrar al usuario
 */
export function describeSaveError(err, entidad = 'los cambios') {
  // El timeout ya trae su propio mensaje explicativo.
  if (err?.message?.includes('tardado')) return err.message;

  const status = getStatus(err);

  if (status === 413) {
    return `No se pudo guardar ${entidad}: las fotos ocupan demasiado para enviarlas de una vez. Quita alguna foto y vuelve a intentarlo.`;
  }
  if (status === 401 || status === 403) {
    return `No se pudo guardar ${entidad}: la sesión ha caducado o no tienes permiso. Cierra sesión y vuelve a entrar.`;
  }
  if (status === 422 || status === 400) {
    return `No se pudo guardar ${entidad}: el servidor ha rechazado los datos (${status}). ${err?.message || ''}`.trim();
  }
  if (status >= 500) {
    return `No se pudo guardar ${entidad}: error del servidor (${status}). Inténtalo de nuevo en unos minutos.`;
  }

  // Fallo de red real: fetch lanza TypeError sin código HTTP.
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err?.message || '')) {
    return `No se pudo guardar ${entidad}: sin conexión con el servidor. Comprueba tu conexión e inténtalo de nuevo.`;
  }

  // Desconocido: mostrar el error real en vez de esconderlo tras un genérico.
  const detalle = [status && `HTTP ${status}`, err?.message].filter(Boolean).join(' — ');
  return `No se pudo guardar ${entidad}${detalle ? `: ${detalle}` : '. Inténtalo de nuevo.'}`;
}
