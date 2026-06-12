/**
 * licenseManager.js — Capa de licencias para Gestión Pro Total (ECDSA P-256)
 * -------------------------------------------------------------------------
 * Módulo autocontenido. Usa firma de CLAVE PÚBLICA:
 *   - La app lleva solo la CLAVE PÚBLICA (segura, puede ir en el repo y en
 *     el bundle del cliente: no permite falsificar licencias).
 *   - Tú firmas las licencias con la CLAVE PRIVADA (carpeta SOLO-PARA-MI),
 *     que NUNCA se sube ni se entrega.
 *
 * Formato de licencia:  base64url(payloadJSON) + "." + base64url(firmaECDSA)
 *   payload = { cliente, email, deviceId, plan, emitida, expira, v }
 *   firma   = ECDSA(P-256, SHA-256) del texto base64url del payload.
 *
 * La licencia se ata al `deviceId` del equipo (si se rellena) para evitar
 * que se comparta. Verificación local (offline) o cloud (servidor).
 */

const LS_KEY = 'gpt_license_v1';
const LS_DEVICE = 'gpt_device_id_v1';

// Clave PÚBLICA de verificación (segura de publicar). Se puede sobreescribir
// por configuración con VITE_LICENSE_PUBKEY (JSON JWK) si algún día rotas claves.
export const PUBLIC_KEY_JWK = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_LICENSE_PUBKEY) {
      return JSON.parse(import.meta.env.VITE_LICENSE_PUBKEY);
    }
  } catch { /* noop */ }
  return { kty: 'EC', crv: 'P-256', x: '41ltfzdxFBhY6qcPIdFrjdzFJBkqUYeU3pp4qTK_ab4', y: 'Utb-BOZYRf9pF2oC_19wwfbsc704IiM3fsGazMYoHrc' };
})();

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

async function importPublicKey(jwk = PUBLIC_KEY_JWK) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
}

async function importPrivateKey(jwk) {
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/* --------------------------- device id (huella) ------------------------ */

/**
 * Genera (y persiste) un identificador estable del equipo/navegador.
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
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  id = 'DEV-' + (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
  localStorage.setItem(LS_DEVICE, id);
  return id;
}

/* ----------------------- generación (lado admin) ----------------------- */

/**
 * Crea una licencia firmada. SOLO en el panel de administración, con la
 * CLAVE PRIVADA (JWK). No se usa nunca en la app del cliente.
 *
 * @param {object} data { cliente, email, deviceId, plan, dias }
 * @param {object} privateJwk clave privada en formato JWK
 * @returns {Promise<string>} clave de licencia
 */
export async function generateLicense(data, privateJwk) {
  const now = Date.now();
  const dias = Number(data.dias) || 0;
  const payload = {
    cliente: data.cliente || '',
    email: data.email || '',
    deviceId: data.deviceId || '',
    plan: data.plan || 'PRO',
    emitida: now,
    expira: dias > 0 ? now + dias * 86400000 : 0, // 0 = perpetua
    v: 1,
  };
  const payloadB64 = toB64url(strToBytes(JSON.stringify(payload)));
  const key = await importPrivateKey(privateJwk);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, strToBytes(payloadB64));
  return payloadB64 + '.' + toB64url(new Uint8Array(sig));
}

/* --------------------- verificación (lado cliente) --------------------- */

export function parseLicense(key) {
  if (!key || typeof key !== 'string' || key.indexOf('.') < 0) return null;
  const [payloadB64] = key.split('.');
  try {
    return JSON.parse(new TextDecoder().decode(fromB64url(payloadB64)));
  } catch {
    return null;
  }
}

/**
 * Valida una licencia OFFLINE verificando la firma con la CLAVE PÚBLICA.
 * Devuelve { valid, reason, payload }.
 */
export async function validateLicenseLocal(key, _unused, opts = {}) {
  const payload = parseLicense(key);
  if (!payload) return { valid: false, reason: 'FORMATO_INVALIDO' };
  const [payloadB64, sigB64] = key.split('.');
  let okSig = false;
  try {
    const pub = await importPublicKey(opts.publicJwk || PUBLIC_KEY_JWK);
    okSig = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pub,
      fromB64url(sigB64),
      strToBytes(payloadB64)
    );
  } catch {
    return { valid: false, reason: 'FIRMA_INVALIDA', payload };
  }
  if (!okSig) return { valid: false, reason: 'FIRMA_NO_COINCIDE', payload };
  if (payload.expira && Date.now() > payload.expira) return { valid: false, reason: 'CADUCADA', payload };
  const expectedDevice = opts.deviceId || getDeviceId();
  if (payload.deviceId && payload.deviceId !== expectedDevice) return { valid: false, reason: 'OTRO_EQUIPO', payload };
  return { valid: true, reason: 'OK', payload };
}

/**
 * Valida una licencia CONTRA UN SERVIDOR (modo recomendado para revocar).
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
  } catch {
    return { valid: false, reason: 'SIN_CONEXION', offline: true };
  }
}

/* --------------------------- almacenamiento ---------------------------- */

export function saveLicense(key) { localStorage.setItem(LS_KEY, key); }
export function loadLicense() { return localStorage.getItem(LS_KEY) || ''; }
export function clearLicense() { localStorage.removeItem(LS_KEY); }

export function describeReason(reason) {
  const map = {
    OK: 'Licencia válida.',
    SIN_LICENCIA: 'Introduce tu clave de licencia.',
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
  PUBLIC_KEY_JWK,
};
