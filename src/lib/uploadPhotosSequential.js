import { uploadImage } from './uploadImage';
import { compressImageToDataURL } from './compressImage';

/**
 * Sube una lista de fotos EN SECUENCIA (nunca en paralelo).
 *
 * Por cada foto:
 *   1. Intenta subirla a la nube con `uploadImage` (que ya comprime).
 *   2. Si la subida falla (créditos agotados, red caída...), comprime la
 *      imagen a Data URL y la usa directamente. Así las fotos siempre
 *      terminan estando disponibles, incluso sin UploadFile.
 *   3. Llama `onPhoto(url, file)` para que el componente la añada a la
 *      cuadrícula de forma incremental.
 *   4. Si una foto falla por completo (formato no válido), la acumula en
 *      `failed` y continúa con la siguiente.
 *
 * Mientras sube, llama `onProgress(actual, total)` para que el componente
 * pueda mostrar "Subiendo foto X de Y…".
 *
 * @param {File[]} files
 * @param {object} opts
 * @param {(url: string, file: File) => Promise<void>|void} opts.onPhoto
 * @param {(actual: number, total: number) => void} [opts.onProgress]
 * @returns {Promise<{ failed: File[] }>}
 */
export async function uploadPhotosSequential(files, { onPhoto, onProgress } = {}) {
  const failed = [];
  const total = files.length;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) onProgress(i + 1, total);
    try {
      let url;
      try {
        url = await uploadImage(file);
      } catch {
        // Fallback: comprimir a Data URL y usarlo directamente.
        url = await compressImageToDataURL(file);
      }
      await onPhoto?.(url, file);
    } catch {
      // Error irrecuperable para esta foto (formato no compatible...).
      failed.push(file);
    }
  }
  return { failed };
}