import { base44 } from '@/api/base44Client';
import { compressImage, compressImageToDataURL } from './compressImage';

const UPLOAD_TIMEOUT_MS = 45000;
// Si UploadFile falla (créditos de integración agotados, red caída...),
// se usa un Data URL comprimido como fallback para que la foto quede
// guardada igualmente. Esto no aumenta coste porque solo ocurre cuando
// la subida a la nube ya ha fallado.
const FALLBACK_ENABLED = true;
// Si la primera subida a la nube falla por un error no recuperable
// (no timeout), marcamos el servicio como no disponible para el resto
// de la sesión: las siguientes imágenes van directas al Data URL sin
// volver a esperar una subida que va a fallar. Así el guardado por
// lotes va mucho más rápido cuando no hay crédito de integración.
let cloudUploadUnavailable = false;
export const UPLOAD_TIMEOUT_MESSAGE = 'La subida ha tardado demasiado. Comprueba tu conexión e inténtalo de nuevo.';
const UPLOAD_GENERIC_MESSAGE = 'No se pudo subir el archivo. Comprueba tu conexión e inténtalo de nuevo.';

// Cuando la subida a la nube no está disponible, las fotos de una orden se
// guardan como Data URL incrustados directamente en el documento. Cada foto
// individual ya está acotada (ver MAX_FALLBACK_DATA_URL_LENGTH en
// compressImage.js), pero varias fotos juntas pueden seguir sumando más de
// lo que el guardado del documento admite en una sola petición. Antes de
// intentar guardar comprobamos el total y avisamos con un mensaje real en
// vez de dejar que la petición falle y se muestre "revisa tu conexión".
export const MAX_TOTAL_FALLBACK_PAYLOAD = 2.5 * 1024 * 1024; // ~2.5 MB de texto base64
export const PHOTOS_TOO_LARGE_MESSAGE =
  'Las fotos ocupan demasiado espacio porque no se pudieron subir a la nube y se guardaron como copia local. Elimina alguna foto (o inténtalo de nuevo más tarde, cuando la subida a la nube esté disponible) antes de guardar.';

/**
 * Suma el tamaño de los Data URL (fotos guardadas como fallback local, sin
 * subir a la nube) presentes en uno o varios arrays de fotos. Las URLs
 * normales (subidas a la nube) no cuentan porque no viajan en el payload.
 * @param  {...string[]} photoArrays
 * @returns {number} tamaño total en caracteres (~bytes de base64)
 */
export function getFallbackPhotosSize(...photoArrays) {
  return photoArrays
    .flat()
    .reduce((sum, p) => sum + (typeof p === 'string' && p.startsWith('data:') ? p.length : 0), 0);
}

export function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// El navegador o el SDK pueden lanzar errores en inglés (p.ej. "Failed to
// fetch"). Normalizamos aquí para que quien llame a uploadImage/uploadFile
// reciba siempre un err.message en español, nunca mezclado con inglés.
// El error real (que puede no ser de red: token caducado, cuota, CORS...) se
// deja en consola para poder diagnosticarlo sin perder el mensaje amigable.
function toSpanishError(err) {
  if (err instanceof Error && err.message === UPLOAD_TIMEOUT_MESSAGE) return err;
  console.error('[uploadImage] Error real al subir el archivo:', err);
  return new Error(UPLOAD_GENERIC_MESSAGE);
}

/**
 * Comprime (si es imagen) y sube un fichero a base44.
 * Aplica un timeout para que una conexión lenta o caída no deje el
 * formulario esperando indefinidamente: pasado UPLOAD_TIMEOUT_MS lanza
 * un error legible en vez de colgarse en silencio.
 * @param {File|Blob} file
 * @param {object} [compressOpts] - ver compressImage
 * @returns {Promise<string>} file_url
 */
export async function uploadImage(file, compressOpts) {
  // Si ya sabemos que UploadFile no responde, vamos directos al Data URL
  // comprimido sin perder tiempo reintentando la subida en cada foto.
  if (cloudUploadUnavailable && file && file.type?.startsWith('image/')) {
    try {
      return await compressImageToDataURL(file);
    } catch { /* sigue abajo */ }
  }
  try {
    const compressed = await compressImage(file, compressOpts);
    const { file_url } = await withTimeout(
      base44.integrations.Core.UploadFile({ file: compressed }),
      UPLOAD_TIMEOUT_MS,
      UPLOAD_TIMEOUT_MESSAGE
    );
    return file_url;
  } catch (err) {
    // Fallo no recuperable (no timeout): marcar el servicio como no
    // disponible para el resto de la sesión — acelera el lote.
    if (err?.message !== UPLOAD_TIMEOUT_MESSAGE) cloudUploadUnavailable = true;
    // Fallback: comprimir a Data URL y devolver para que se guarde igual.
    if (FALLBACK_ENABLED && file && file.type?.startsWith('image/')) {
      try {
        return await compressImageToDataURL(file);
      } catch {
        // si el fallback también falla, relanzar el error original
      }
    }
    throw toSpanishError(err);
  }
}

/**
 * Sube un fichero sin comprimir (firmas, PDFs, catálogos...) pero con el
 * mismo timeout de red que uploadImage, para que una conexión caída no deje
 * el formulario esperando indefinidamente.
 * @param {File|Blob} file
 * @returns {Promise<string>} file_url
 */
export async function uploadFile(file) {
  try {
    const { file_url } = await withTimeout(
      base44.integrations.Core.UploadFile({ file }),
      UPLOAD_TIMEOUT_MS,
      UPLOAD_TIMEOUT_MESSAGE
    );
    return file_url;
  } catch (err) {
    throw toSpanishError(err);
  }
}