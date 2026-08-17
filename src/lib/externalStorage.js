/**
 * externalStorage.js — Subida de fotos y documentos a un almacén externo.
 *
 * Por qué existe: las subidas de Base44 (Core.UploadFile) consumen crédito de
 * la cuenta, y al agotarse devuelven 402. Sin crédito no se podía subir nada,
 * y las fotos acababan guardándose dentro de la propia ficha (comprimidas a
 * 90 KB, con pérdida de calidad y engordando cada registro).
 *
 * Con un almacén externo con plan gratuito (Cloudinary) los archivos se suben
 * en calidad completa, la ficha solo guarda la URL, y no se gasta crédito.
 *
 * Configuración: Configuración → Empresa → Almacén de fotos y documentos.
 * Se guarda en CompanySettings.storage_config, así que basta con ponerlo una
 * vez y queda disponible en el móvil, el ordenador y la web.
 *
 * Seguridad: se usa un "upload preset" SIN FIRMAR (unsigned), que es el
 * mecanismo que Cloudinary ofrece precisamente para subir desde el propio
 * dispositivo. No hace falta poner ninguna clave secreta dentro de la app —
 * de hecho no debe ponerse, porque cualquiera podría extraerla del programa.
 */

import { base44 } from '@/api/base44Client';

const UPLOAD_TIMEOUT_MS = 60000;

let cachedConfig;          // config ya resuelta (o null si no hay)
let cachedConfigPromise;   // evita pedirla varias veces a la vez

/** Configuración por defecto desde variables de entorno (opcional). */
function configFromEnv() {
  const cloudName = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (cloudName && uploadPreset) {
    return { provider: 'cloudinary', cloud_name: cloudName, upload_preset: uploadPreset, enabled: true };
  }
  return null;
}

function isUsable(cfg) {
  return !!(cfg && cfg.enabled && cfg.cloud_name && cfg.upload_preset);
}

/**
 * Lee la configuración del almacén externo (con caché en memoria).
 * @returns {Promise<object|null>}
 */
export async function getStorageConfig() {
  if (cachedConfig !== undefined) return cachedConfig;
  if (cachedConfigPromise) return cachedConfigPromise;

  cachedConfigPromise = (async () => {
    try {
      const settings = await base44.entities.CompanySettings.list();
      const cfg = settings?.[0]?.storage_config || null;
      cachedConfig = isUsable(cfg) ? cfg : configFromEnv();
    } catch {
      // Si no se puede leer la configuración, no bloquear: se usará el
      // camino de siempre (Base44 y, si falla, guardado dentro de la ficha).
      cachedConfig = configFromEnv();
    }
    return cachedConfig;
  })();

  return cachedConfigPromise;
}

/** Olvida la configuración cacheada (tras cambiarla en Configuración). */
export function resetStorageConfig() {
  cachedConfig = undefined;
  cachedConfigPromise = undefined;
}

/** true si hay un almacén externo configurado y activo. */
export async function isExternalStorageEnabled() {
  return isUsable(await getStorageConfig());
}

/**
 * Sube un archivo al almacén externo configurado.
 * @param {File|Blob} file
 * @param {(percent:number)=>void} [onProgress]
 * @returns {Promise<string>} URL pública del archivo
 * @throws si no hay almacén configurado o la subida falla
 */
export async function uploadToExternalStorage(file, onProgress) {
  const cfg = await getStorageConfig();
  if (!isUsable(cfg)) throw new Error('No hay almacén externo configurado');

  // Cloudinary usa una ruta distinta según el tipo: 'image' comprime y sirve
  // miniaturas; 'raw' se usa para PDF y demás, que no son imágenes.
  const kind = file?.type?.startsWith('image/') ? 'image' : 'raw';
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cfg.cloud_name)}/${kind}/upload`;

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', cfg.upload_preset);

  // XMLHttpRequest en vez de fetch porque permite informar del progreso, que
  // en fotos desde el móvil es la diferencia entre "va subiendo" y "se ha
  // colgado".
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.secure_url) return resolve(data.secure_url);
          reject(new Error('El almacén no devolvió ninguna URL'));
        } catch {
          reject(new Error('Respuesta no válida del almacén'));
        }
      } else {
        // Mensajes útiles para los fallos típicos al configurarlo.
        let detalle = `HTTP ${xhr.status}`;
        try {
          const e = JSON.parse(xhr.responseText);
          if (e?.error?.message) detalle = e.error.message;
        } catch { /* sin cuerpo legible */ }
        if (xhr.status === 400 && /preset/i.test(detalle)) {
          detalle = 'el "upload preset" no existe o no está configurado como sin firmar (unsigned)';
        }
        if (xhr.status === 401 || xhr.status === 404) {
          detalle = 'el "cloud name" o el "upload preset" no son correctos';
        }
        reject(new Error(`No se pudo subir al almacén externo: ${detalle}`));
      }
    };
    xhr.onerror = () => reject(new Error('No se pudo conectar con el almacén externo'));
    xhr.ontimeout = () => reject(new Error('La subida al almacén externo ha tardado demasiado'));

    xhr.send(form);
  });
}
