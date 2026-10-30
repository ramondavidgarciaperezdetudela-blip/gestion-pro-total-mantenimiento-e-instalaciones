// Usuarios. En modo local hay un único usuario administrador implícito; en
// servidor propio y Supabase se entra con correo y contraseña.
import { leerConfig, leerSesion, guardarSesion, borrarConfig } from './config';
import { errorHttp, leerError } from './errores';

const USUARIO_LOCAL = { id: 'local', email: 'usuario@este-dispositivo', full_name: 'Usuario', role: 'admin' };

/** Usuario ya conocido, sin esperar a nadie (para sellar quién crea cada ficha). */
export function usuarioActual() {
  const c = leerConfig();
  if (!c) return null;
  if (c.modo === 'local') return USUARIO_LOCAL;
  return leerSesion()?.user || null;
}

export const hayQueEntrar = () => {
  const c = leerConfig();
  return !!c && c.modo !== 'local' && !leerSesion()?.token;
};

function usuarioDeSupabase(u) {
  return { id: u.id, email: u.email, full_name: u.user_metadata?.full_name || u.email, role: u.user_metadata?.role || 'admin' };
}

export async function iniciarSesion(email, password) {
  const c = leerConfig();
  if (c.modo === 'servidor') {
    const r = await fetch(`${c.url}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).catch(() => { throw errorHttp(0, 'No hay conexión con el servidor.'); });
    if (!r.ok) throw await leerError(r);
    const j = await r.json();
    guardarSesion({ token: j.token, user: j.user });
    return j.user;
  }
  const r = await fetch(`${c.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: c.clave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }).catch(() => { throw errorHttp(0, 'No hay conexión con Supabase.'); });
  if (!r.ok) throw await leerError(r);
  const j = await r.json();
  const user = usuarioDeSupabase(j.user);
  guardarSesion({ token: j.access_token, refresh: j.refresh_token, user });
  return user;
}

export async function registrarse(email, password, nombre) {
  const c = leerConfig();
  if (c.modo === 'servidor') {
    const r = await fetch(`${c.url}/api/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, nombre }) }).catch(() => { throw errorHttp(0, 'No hay conexión con el servidor.'); });
    if (!r.ok) throw await leerError(r);
    const j = await r.json();
    guardarSesion({ token: j.token, user: j.user });
    return j.user;
  }
  const r = await fetch(`${c.url}/auth/v1/signup`, { method: 'POST', headers: { apikey: c.clave, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, data: { full_name: nombre || email } }) }).catch(() => { throw errorHttp(0, 'No hay conexión con Supabase.'); });
  if (!r.ok) throw await leerError(r);
  const j = await r.json();
  if (!j.access_token) {
    throw errorHttp(200, 'Cuenta creada. Revisa tu correo para confirmarla y después entra.');
  }
  const user = usuarioDeSupabase(j.user);
  guardarSesion({ token: j.access_token, refresh: j.refresh_token, user });
  return user;
}

export const auth = {
  async me() {
    const u = usuarioActual();
    if (!u) throw errorHttp(401, 'No has iniciado sesión.');
    return { ...u };
  },
  async isAuthenticated() { return !!usuarioActual(); },
  async updateMe(datos) {
    const c = leerConfig();
    if (c?.modo === 'local') Object.assign(USUARIO_LOCAL, datos || {});
    return auth.me();
  },
  logout(redirigir) {
    guardarSesion(null);
    if (redirigir !== false && typeof window !== 'undefined') window.location.reload();
  },
  redirectToLogin() {
    // La pantalla de entrada se muestra sola cuando falta la sesión.
    guardarSesion(null);
    if (typeof window !== 'undefined') window.location.reload();
  },
  cambiarAlmacen() { borrarConfig(); if (typeof window !== 'undefined') window.location.reload(); },
};
