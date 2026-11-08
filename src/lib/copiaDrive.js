/**
 * copiaDrive.js — Copias de seguridad en el Google Drive de CADA empresa.
 *
 * No hay ninguna cuenta del programa por medio: cada empresa instala un
 * pequeño script en su propia cuenta de Google (drive-copias/script-google-
 * drive.gs) y pega aquí su dirección y su clave. Así las copias van al Drive
 * del correo de esa empresa y desde cualquier equipo con el mismo enlace se
 * pueden recuperar.
 *
 * Las peticiones van como texto plano (sin cabeceras especiales) para que el
 * navegador no pida permiso previo, que Google Apps Script no contesta.
 */

const CLAVE_ALMACEN = 'gpt_drive_copia';
export const TROZO = 1_000_000; // caracteres por petición

export function normalizarEnlace(t) {
  const s = String(t || '').trim();
  return /^https:\/\/script\.google\.com\/(macros\/s\/[^/\s]+|a\/[^\s]+\/macros\/s\/[^/\s]+)\/exec$/.test(s) ? s : '';
}

export function leerDrive(almacen = globalThis.localStorage) {
  try {
    const o = JSON.parse(almacen.getItem(CLAVE_ALMACEN) || '{}');
    return { enlace: o.enlace || '', clave: o.clave || '', auto: !!o.auto, correo: o.correo || '' };
  } catch { return { enlace: '', clave: '', auto: false, correo: '' }; }
}

export function guardarDrive(v, almacen = globalThis.localStorage) {
  try { almacen.setItem(CLAVE_ALMACEN, JSON.stringify(v)); } catch { /* sin sitio */ }
}

export function driveListo(c = leerDrive()) {
  return !!(normalizarEnlace(c.enlace) && c.clave);
}

async function llamar(cfg, cuerpo, f = globalThis.fetch) {
  const r = await f(cfg.enlace, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...cuerpo, clave: cfg.clave }),
    redirect: 'follow',
  });
  let j;
  try { j = await r.json(); } catch { throw new Error('El enlace no ha respondido como se esperaba. Revisa que la implementación sea «Cualquier usuario» y la dirección termine en /exec.'); }
  if (!j.ok) throw new Error(j.error || 'Google Drive ha rechazado la petición');
  return j;
}

export const probarDrive = (cfg, f) => llamar(cfg, { accion: 'probar' }, f);
export const listarCopiasDrive = async (cfg, f) => (await llamar(cfg, { accion: 'listar' }, f)).copias || [];

/**
 * Subidor que recibe la copia por trozos mientras se escribe, sin juntarla
 * entera en memoria (con fotos y documentos puede ser enorme).
 */
export function crearSubidor(cfg, nombre, f) {
  let buffer = '';
  let n = 0;
  let cola = Promise.resolve();
  let fallo = null;

  const enviar = (datos) => {
    const k = n++;
    cola = cola.then(async () => {
      if (fallo) return;
      try { await llamar(cfg, { accion: 'parte', nombre, n: k, datos }, f); } catch (e) { fallo = e; }
    });
  };

  return {
    anadir(t) {
      buffer += t;
      while (buffer.length >= TROZO) { enviar(buffer.slice(0, TROZO)); buffer = buffer.slice(TROZO); }
    },
    async cerrar() {
      if (buffer.length || n === 0) { enviar(buffer); buffer = ''; }
      await cola;
      if (fallo) return { ok: false, error: fallo.message || String(fallo) };
      return { ok: true, partes: n };
    },
  };
}

/** Descarga una copia entera (por trozos) y devuelve su texto. */
export async function descargarCopiaDrive(cfg, nombre, avisar, f) {
  let desde = 0;
  let total = Infinity;
  const partes = [];
  while (desde < total) {
    const j = await llamar(cfg, { accion: 'leer', nombre, desde, largo: TROZO }, f);
    total = j.total;
    partes.push(j.datos);
    desde += TROZO;
    avisar?.(Math.min(100, Math.round((desde / Math.max(total, 1)) * 100)));
    if (!j.datos) break;
  }
  return partes.join('');
}
