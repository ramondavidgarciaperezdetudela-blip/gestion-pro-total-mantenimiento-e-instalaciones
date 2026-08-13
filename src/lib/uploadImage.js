import { base44 } from '@/api/base44Client';
import { compressImage } from './compressImage';

const UPLOAD_TIMEOUT_MS = 45000;
export const UPLOAD_TIMEOUT_MESSAGE = 'La subida ha tardado demasiado. Comprueba tu conexión e inténtalo de nuevo.';
const UPLOAD_GENERIC_MESSAGE = 'No se pudo subir el archivo. Comprueba tu conexión e inténtalo de nuevo.';

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// El navegador o el SDK pueden lanzar errores en inglés (p.ej. "Failed to
// fetch"). Normalizamos aquí para que quien llame a uploadImage/uploadFile
// reciba siempre un err.message en español, nunca mezclado con inglés.
function toSpanishError(err) {
  if (err instanceof Error && err.message === UPLOAD_TIMEOUT_MESSAGE) return err;
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
  try {
    const compressed = await compressImage(file, compressOpts);
    const { file_url } = await withTimeout(
      base44.integrations.Core.UploadFile({ file: compressed }),
      UPLOAD_TIMEOUT_MS,
      UPLOAD_TIMEOUT_MESSAGE
    );
    return file_url;
  } catch (err) {
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
