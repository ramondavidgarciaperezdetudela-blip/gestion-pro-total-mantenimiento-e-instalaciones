/**
 * licenseManager.js — Capa OPCIONAL de licencias para Gestión Pro Total
 * ---------------------------------------------------------------------
 * Módulo independiente y AUTOCONTENIDO. Por defecto NO se usa en la app
 * (no está enrutado ni bloquea nada). Para activarlo, mira:
 *   docs/SISTEMA-LICENCIAS.md
 *
 * Diseño:
 *   - Cada licencia es:  base64url(payloadJSON) + "." + base64url(HMAC-SHA256(payload, SECRET))
 *   - El payload contiene: cliente, email, deviceId, plan, emitida, expira.
 *   - La licencia se ata al `deviceId` del equipo (anti-compartición).
 *   - La verificación se puede hacer de 2 formas:
 *       a) LOCAL   -> recalculando el HMAC con el SECRET (modo offline).
 *       b) CLOUD   -> enviando la licencia a un endpoint que la valida
 *                     en servidor (el SECRET nunca sale del servidor).
 *   - Este fichero NO contiene la clave secreta. Para validación local
 *     debes inyectarla por configuración (no recomendado en producción
 *     pública). Para validación cloud no hace falta secret en el cliente.
 *
 * IMPORTANTE sobre seguridad: la validación 100% offline obliga a tener
 * el SECRET en el cliente, que es extraíble. Para protección fuerte usa
 * el modo CLOUD (Panel-Cloud). Esta capa es un control comercial básico,
 * no un DRM infranqueable.
 */

const LS_KEY = 'gpt_license_v1';
const LS_DEVICE = 'gpt_device_id_v1';

// Hash público de verificación de la clave maestra (informativo, NO es el secret).
export const MASTER_KEY_FINGERPRINT =
  '95a98140f7c06711128264653447379f43a7db3c97cb14377933f1e2289199ce';

/* ----------------------------- utilidades ----------------------------- */

function toB64url(bytes) {
  let bin = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function strToBytes(s) {
  return new TextEncoder().encode(s);
}

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    strToBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, strToBytes(message));
  return new Uint8Array(sig);
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/* --------------------------- device id (huella) ------------------------ */

/**
 * Genera (y persiste) un identificador estable del equipo/navegador.
 * No es un fingerprint invasivo: combina datos básicos + aleatorio,
 * y se guarda en localStorage para que sea estable en ese equipo.
 */
export function getDeviceId() {
  let id = localStorage.getItem(LS_DEVICE);
  if (id) return id;
  const seed = [
    navigator.userAgent,
    navigator.language,
    navigator.platform || '',
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    (crypto.randomUUID && crypto.randomUUID()) || Math.random().toString(36),
  ].join('|');
  // hash corto y legible
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  id = 'DEV-' + (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  localStorage.setItem(LS_DEVICE, id);
  return id;
}

/* ----------------------- generación (lado admin) ----------------------- */

/**
 * Crea una licencia firmada. SOLO se usa en el panel de administración,
 * donde tú introduces el SECRET. No lo llames desde la app del cliente.
 *
 * @param {object} data { cliente, email, deviceId, plan, dias }
 * @param {string} secret clave maestra (hex)
 * @returns {Promise<string>} clave de licencia
 */
export async function generateLicense(data, secret) {
  const now = Date.now();
  const dias = Number(data.dias) || 365;
  const payload = {
    cliente: data.cliente || '',
    email: data.email || '',
    deviceId: data.deviceId || '',
    plan: data.plan || 'PRO',
    emitida: now,
    expira: dias > 0 ? now + dias * 86400000 : 0, // 0 = perpetua
    v: 1,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = toB64url(strToBytes(payloadStr));
  const sig = await hmacSha256(secret, payloadB64);
  return payloadB64 + '.' + toB64url(sig);
}

/* --------------------- verificación (lado cliente) --------------------- */

export function parseLicense(key) {
  if (!key || typeof key !== 'string' || key.indexOf('.') < 0) return null;
  const [payloadB64] = key.split('.');
  try {
    const json = new TextDecoder().decode(fromB64url(payloadB64));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Valida una licencia OFFLINE recomputando el HMAC con el secret.
 * Devuelve { valid, reason, payload }.
 */
export async function validateLicenseLocal(key, secret, opts = {}) {
  const payload = parseLicense(key);
  if (!payload) return { valid: false, reason: 'FORMATO_INVALIDO' };
  const [payloadB64, sigB64] = key.split('.');
  const expected = await hmacSha256(secret, payloadB64);
  let provided;
  try {
    provided = fromB64url(sigB64);
  } catch {
    return { valid: false, reason: 'FIRMA_INVALIDA' };
  }
  if (!constantTimeEqual(expected, provided)) {
    return { valid: false, reason: 'FIRMA_NO_COINCIDE', payload };
  }
  if (payload.expira && Date.now() > payload.expira) {
    return { valid: false, reason: 'CADUCADA', payload };
  }
  const expectedDevice = opts.deviceId || getDeviceId();
  if (payload.deviceId && payload.deviceId !== expectedDevice) {
    return { valid: false, reason: 'OTRO_EQUIPO', payload };
  }
  return { valid: true, reason: 'OK', payload };
}

/**
 * Valida una licencia CONTRA UN SERVIDOR (modo recomendado).
 * El endpoint guarda el secret y responde { valid, reason }.
 */
export async function validateLicenseCloud(key, endpoint, opts = {}) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ license: key, deviceId: opts.deviceId || getDeviceId() }),
    });
    if (!res.ok) return { valid: false, reason: 'SERVIDOR_' + res.status };
    return await res.json();
  } catch (e) {
    // Sin conexión: permitir gracia si hay licencia local válida cacheada.
    return { valid: false, reason: 'SIN_CONEXION', offline: true };
  }
}

/* --------------------------- almacenamiento ---------------------------- */

export function saveLicense(key) {
  localStorage.setItem(LS_KEY, key);
}
export function loadLicense() {
  return localStorage.getItem(LS_KEY) || '';
}
export function clearLicense() {
  localStorage.removeItem(LS_KEY);
}

export function describeReason(reason) {
  const map = {
    OK: 'Licencia válida.',
    FORMATO_INVALIDO: 'La clave no tiene un formato válido.',
    FIRMA_INVALIDA: 'La firma de la licencia no es válida.',
    FIRMA_NO_COINCIDE: 'La licencia ha sido manipulada o no es auténtica.',
    CADUCADA: 'La licencia ha caducado. Renueva tu suscripción.',
    OTRO_EQUIPO: 'Esta licencia está activada en otro equipo.',
    SIN_CONEXION: 'No se pudo contactar con el servidor de licencias.',
  };
  return map[reason] || 'Estado de licencia desconocido.';
}

export default {
  getDeviceId,
  generateLicense,
  parseLicense,
  validateLicenseLocal,
  validateLicenseCloud,
  saveLicense,
  loadLicense,
  clearLicense,
  describeReason,
  MASTER_KEY_FINGERPRINT,
};
