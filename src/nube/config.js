// Dónde guarda sus datos esta instalación. Se elige la primera vez que se abre
// el programa y se puede cambiar cuando se quiera (los datos NO se mueven solos:
// se pasan con Copia de seguridad → exportar / restaurar).
const CLAVE = 'gpt_almacen';
const CLAVE_SESION = 'gpt_sesion';

export const MODOS = {
  local: 'Solo en este dispositivo',
  supabase: 'Supabase (nube)',
  servidor: 'Servidor propio',
};

const oyentes = new Set();
const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const escribir = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } };

/** { modo:'local'|'supabase'|'servidor', url?, clave? } o null si aún no se ha elegido. */
export function leerConfig() {
  const c = leer(CLAVE);
  return c && MODOS[c.modo] ? c : null;
}
export function guardarConfig(c) {
  const limpia = { modo: c.modo };
  if (c.modo !== 'local') limpia.url = String(c.url || '').trim().replace(/\/+$/, '');
  if (c.modo === 'supabase') limpia.clave = String(c.clave || '').trim();
  escribir(CLAVE, limpia);
  oyentes.forEach((f) => f());
}
export function borrarConfig() {
  escribir(CLAVE, null);
  escribir(CLAVE_SESION, null);
  oyentes.forEach((f) => f());
}
export function escucharConfig(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

/** Sesión del modo remoto: { token, refresh?, user }. */
export const leerSesion = () => leer(CLAVE_SESION);
export const guardarSesion = (s) => escribir(CLAVE_SESION, s);
