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

const AYUDA_ACCESO = 'Google no ha dejado entrar sin iniciar sesión. Revisa en el script: Implementar > Administrar implementaciones > ✏ y comprueba que «Ejecutar como» es «Yo» y «Quién tiene acceso» es «Cualquier usuario» (no «Solo yo»). Luego elige «Nueva versión» e Implementar, y usa la dirección /exec que sale.';
const AYUDA_PERMISO = 'El script todavía no tiene permiso para usar tu Drive. En el editor del script elige arriba la función «autorizar», pulsa ▶ Ejecutar y acepta los permisos de Google («Revisar permisos» → tu cuenta → «Avanzado» → «Ir a … (no seguro)» → «Permitir»). Después implementa una «Nueva versión» y vuelve a probar.';

async function llamar(cfg, cuerpo, f = globalThis.fetch) {
  let r;
  try {
    r = await f(cfg.enlace, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...cuerpo, clave: cfg.clave }),
      redirect: 'follow',
    });
  } catch (e) {
    throw new Error('No se ha podido conectar con Google. Comprueba que hay internet y que la dirección está bien copiada (termina en /exec).');
  }
  let texto = '';
  try { texto = await r.text(); } catch { /* sin cuerpo */ }
  let j;
  try { j = JSON.parse(texto); } catch {
    // Google contesta con una página web (no con datos) cuando falta el permiso o el acceso no es público.
    if (/accounts\.google\.com|Sign in|Iniciar sesi|ServiceLogin/i.test(texto)) throw new Error(AYUDA_ACCESO);
    if (/authorization|autorizaci|permiso|Permission/i.test(texto)) throw new Error(AYUDA_PERMISO);
    throw new Error(`${AYUDA_PERMISO} (Si ya lo hiciste: ${AYUDA_ACCESO})`);
  }
  if (!j.ok) throw new Error(/authoriz|autoriza|permission|permiso/i.test(j.error || '') ? AYUDA_PERMISO : (j.error || 'Google Drive ha rechazado la petición'));
  return j;
}

/** Genera una clave larga al azar para el script (así no hay que inventarla ni olvidarse de cambiarla). */
export function generarClave(cripto = globalThis.crypto) {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const b = new Uint8Array(24); cripto.getRandomValues(b);
  return Array.from(b, (x) => letras[x % letras.length]).join('');
}

/** El código del script con la clave ya puesta. */
export function scriptConClave(codigo, clave) {
  return String(codigo).replace("var CLAVE = 'CAMBIA-ESTA-CLAVE';", `var CLAVE = '${String(clave).replace(/[^A-Za-z0-9._-]/g, '')}';`);
}

/** Abre el enlace con GET (no necesita permisos): sirve para saber si el enlace está bien publicado. */
export async function comprobarEnlace(cfg, f = globalThis.fetch) {
  let r;
  try { r = await f(cfg.enlace, { method: 'GET', redirect: 'follow' }); }
  catch { throw new Error('No se ha podido conectar con Google. Comprueba que hay internet y que la dirección termina en /exec.'); }
  let j;
  try { j = JSON.parse(await r.text()); } catch { throw new Error(AYUDA_ACCESO); }
  return j;
}

/** Prueba completa, diciendo en cada fallo qué paso falta. */
export async function probarDrive(cfg, f) {
  const g = await comprobarEnlace(cfg, f);
  if (g && g.claveCambiada === false) throw new Error('El script todavía lleva la clave de ejemplo «CAMBIA-ESTA-CLAVE». Pega el código que te da el programa (ya lleva la clave puesta) y vuelve a implementar con «Nueva versión».');
  return llamar(cfg, { accion: 'probar' }, f);
}
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
      // El script comprueba que están todos los trozos. Un script antiguo no conoce esta acción: no es un fallo.
      try { await llamar(cfg, { accion: 'cerrar', nombre, partes: n }, f); }
      catch (e) { if (!/Acci[oó]n desconocida/i.test(e.message)) return { ok: false, error: e.message || String(e) }; }
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
