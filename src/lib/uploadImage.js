import { base44 } from '@/api/base44Client';
import { compressImage, compressImageToDataURL } from './compressImage';
import { isExternalStorageEnabled, uploadToExternalStorage } from './externalStorage';

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
// El estado se recuerda ENTRE SESIONES (no solo dentro de una): si la cuenta
// se quedó sin crédito, no tiene sentido que cada vez que se abre la app se
// vuelva a intentar subir foto por foto, esperando y fallando cada vez. Se
// reintenta pasado RECHECK_MS, para que cuando el crédito vuelva la app se
// recupere sola sin tener que tocar nada.
const CLOUD_STATE_KEY = 'gpt_cloud_upload_state';
const RECHECK_MS = 6 * 60 * 60 * 1000; // 6 horas

function readCloudState() {
  try {
    const raw = localStorage.getItem(CLOUD_STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s?.ts || Date.now() - s.ts > RECHECK_MS) return null; // caducado: reintentar
    return s;
  } catch { return null; }
}

function writeCloudState(reason) {
  try {
    localStorage.setItem(CLOUD_STATE_KEY, JSON.stringify({ ts: Date.now(), reason }));
  } catch { /* almacenamiento lleno o bloqueado: seguir sin recordar */ }
}

const persisted = typeof localStorage !== 'undefined' ? readCloudState() : null;
let cloudUploadUnavailable = !!persisted;
// Motivo por el que la nube dejó de estar disponible. Se expone para poder
// enseñárselo al usuario: sin esto, una subida que falla siempre acaba en
// "revisa tu conexión" aunque la causa real sea otra (sesión no iniciada,
// cuota agotada, permisos...), y es imposible saber qué arreglar.
let cloudUploadFailureReason = persisted?.reason || '';

// Motivo del fallo del almacén externo, si está configurado y falla. Se
// muestra aparte del de Base44 porque la solución es distinta: aquí suele ser
// que el "cloud name" o el "upload preset" están mal escritos.
let externalStorageFailureReason = '';

/** Motivo del último fallo del almacén externo ('' si no ha fallado). */
export function getExternalStorageFailureReason() {
  return externalStorageFailureReason;
}

/** Motivo del último fallo de subida a la nube ('' si no ha fallado). */
export function getCloudUploadFailureReason() {
  return cloudUploadFailureReason;
}

/** true si las subidas a la nube están desactivadas por fallos previos. */
export function isCloudUploadUnavailable() {
  return cloudUploadUnavailable;
}

/**
 * Vuelve a permitir subidas a la nube (p. ej. tras recargar el crédito de
 * Base44). Sin esto habría que esperar a que caduque el estado guardado.
 */
export function resetCloudUploadState() {
  cloudUploadUnavailable = false;
  cloudUploadFailureReason = '';
  try { localStorage.removeItem(CLOUD_STATE_KEY); } catch { /* ignorar */ }
}

/** Describe el fallo de subida usando el código HTTP cuando existe. */
function describeUploadFailure(err) {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status ?? null;
  if (status === 401 || status === 403) return 'no hay sesión iniciada o falta permiso para subir archivos';
  if (status === 402) return 'la cuenta de Base44 no tiene crédito para subir archivos';
  if (status === 413) return 'el archivo es demasiado grande para el servidor';
  if (status === 429) return 'se ha superado el límite de subidas por ahora';
  if (status >= 500) return `error del servidor al subir (${status})`;
  if (err?.message === UPLOAD_TIMEOUT_MESSAGE) return 'la subida tardó demasiado';
  if (err instanceof TypeError || /failed to fetch|networkerror|load failed/i.test(err?.message || '')) {
    return 'no hay conexión con el servidor';
  }
  return [status && `HTTP ${status}`, err?.message].filter(Boolean).join(' — ') || 'motivo desconocido';
}
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
export async function uploadImage(file, compressOpts, limiteLocal) {
  // 1º almacén externo si está configurado: sube en calidad completa y no
  // gasta crédito de Base44, así que es la mejor opción cuando existe.
  if (await isExternalStorageEnabled()) {
    try {
      const compressed = await compressImage(file, compressOpts);
      return await uploadToExternalStorage(compressed);
    } catch (err) {
      console.error('[uploadImage] Falló el almacén externo, se prueba Base44:', err);
      if (!externalStorageFailureReason) externalStorageFailureReason = err?.message || 'error desconocido';
    }
  }
  // Si ya sabemos que UploadFile no responde, vamos directos al Data URL
  // comprimido sin perder tiempo reintentando la subida en cada foto.
  if (cloudUploadUnavailable && file && file.type?.startsWith('image/')) {
    try {
      return await compressImageToDataURL(file, 1100, 0.72, limiteLocal);
    } catch { /* sigue abajo */ }
  }
  try {
    const compressed = await compressImage(file, compressOpts);
    const { file_url } = await withTimeout(
      base44.sinAvisos.integrations.Core.UploadFile({ file: compressed }),
      UPLOAD_TIMEOUT_MS,
      UPLOAD_TIMEOUT_MESSAGE
    );
    return file_url;
  } catch (err) {
    // Fallo no recuperable (no timeout): marcar el servicio como no
    // disponible para el resto de la sesión — acelera el lote.
    if (err?.message !== UPLOAD_TIMEOUT_MESSAGE) {
      cloudUploadUnavailable = true;
      if (!cloudUploadFailureReason) cloudUploadFailureReason = describeUploadFailure(err);
      writeCloudState(cloudUploadFailureReason);
    }
    // Fallback: comprimir a Data URL y devolver para que se guarde igual.
    if (FALLBACK_ENABLED && file && file.type?.startsWith('image/')) {
      try {
        return await compressImageToDataURL(file, 1100, 0.72, limiteLocal);
      } catch {
        // si el fallback también falla, relanzar el error original
      }
    }
    throw toSpanishError(err);
  }
}

// Tope del fichero guardado en local (firmas, PDFs...). Va incrustado en la
// ficha, así que por encima de esto el guardado empieza a peligrar y es mejor
// avisar que dejar que falle luego sin explicación.
const MAX_LOCAL_FILE_LENGTH = 700 * 1024; // ~700 KB de texto base64

/** Lee un fichero como Data URL, para guardarlo sin pasar por la nube. */
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un fichero sin comprimir (firmas, PDFs, catálogos...) pero con el
 * mismo timeout de red que uploadImage, para que una conexión caída no deje
 * el formulario esperando indefinidamente.
 *
 * Si la nube no está disponible (p. ej. sin crédito en la cuenta de Base44),
 * el fichero se guarda en local dentro de la propia ficha en vez de fallar.
 * Antes esto reventaba sin red de seguridad, así que sin crédito no se podía
 * ni firmar un parte ni adjuntar un documento.
 *
 * @param {File|Blob} file
 * @returns {Promise<string>} file_url (o Data URL local si no hay nube)
 */
export async function uploadFile(file) {
  // Igual que en uploadImage: el almacén externo va primero cuando existe.
  if (await isExternalStorageEnabled()) {
    try {
      return await uploadToExternalStorage(file);
    } catch (err) {
      console.error('[uploadFile] Falló el almacén externo, se prueba Base44:', err);
      if (!externalStorageFailureReason) externalStorageFailureReason = err?.message || 'error desconocido';
    }
  }
  if (!cloudUploadUnavailable) {
    try {
      const { file_url } = await withTimeout(
        base44.sinAvisos.integrations.Core.UploadFile({ file }),
        UPLOAD_TIMEOUT_MS,
        UPLOAD_TIMEOUT_MESSAGE
      );
      return file_url;
    } catch (err) {
      if (err?.message !== UPLOAD_TIMEOUT_MESSAGE) {
        cloudUploadUnavailable = true;
        if (!cloudUploadFailureReason) cloudUploadFailureReason = describeUploadFailure(err);
        writeCloudState(cloudUploadFailureReason);
      }
      console.error('[uploadFile] Subida a la nube no disponible, se guarda en local:', err);
    }
  }

  // Sin nube: guardar el fichero dentro de la ficha.
  let dataUrl;
  try {
    // Las imágenes se comprimen; el resto (PDF, firmas ya reducidas) va tal cual.
    dataUrl = file?.type?.startsWith('image/')
      ? await compressImageToDataURL(file)
      : await fileToDataURL(file);
  } catch (err) {
    throw toSpanishError(err);
  }
  // Fuera del try: este aviso es explicativo y no debe acabar convertido en el
  // mensaje genérico "no se pudo subir, comprueba tu conexión".
  if (dataUrl.length > MAX_LOCAL_FILE_LENGTH) {
    throw new Error(
      `El archivo es demasiado grande para guardarlo sin subirlo a la nube (${Math.round(dataUrl.length / 1024)} KB). ` +
      'Usa un archivo más pequeño, o recarga el crédito de Base44 para poder subirlo.'
    );
  }
  return dataUrl;
}