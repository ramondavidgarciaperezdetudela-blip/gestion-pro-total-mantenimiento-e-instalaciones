// Almacenes en red: servidor propio (servidor-datos/) y Supabase.
import { leerConfig, leerSesion, guardarSesion } from './config';
import { errorHttp, leerError } from './errores';

const TROZO = 200;

async function peticion(url, opciones = {}, { reintentarSesion = true } = {}) {
  const cfg = leerConfig() || {};
  const ses = leerSesion();
  const h = { ...(opciones.headers || {}) };
  if (cfg.modo === 'supabase') {
    h.apikey = cfg.clave;
    h.Authorization = `Bearer ${ses?.token || cfg.clave}`;
  } else if (ses?.token) {
    h.Authorization = `Bearer ${ses.token}`;
  }
  let r;
  try {
    r = await fetch(url, { ...opciones, headers: h });
  } catch (e) {
    throw errorHttp(0, `No hay conexión con ${cfg.modo === 'supabase' ? 'Supabase' : 'el servidor'} (${e?.message || 'red'}).`);
  }
  if (r.status === 401 && reintentarSesion && cfg.modo === 'supabase' && ses?.refresh) {
    const ok = await renovarSesionSupabase();
    if (ok) return peticion(url, opciones, { reintentarSesion: false });
  }
  if (!r.ok) throw await leerError(r);
  return r;
}

export async function renovarSesionSupabase() {
  const cfg = leerConfig(); const ses = leerSesion();
  if (!cfg || !ses?.refresh) return false;
  try {
    const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', headers: { apikey: cfg.clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: ses.refresh }),
    });
    if (!r.ok) return false;
    const j = await r.json();
    guardarSesion({ token: j.access_token, refresh: j.refresh_token, user: ses.user });
    return true;
  } catch { return false; }
}

export const almacenServidor = {
  nombre: 'servidor',
  async listar(ent) {
    const { url } = leerConfig();
    const r = await peticion(`${url}/api/datos/${encodeURIComponent(ent)}`);
    return r.json();
  },
  async poner(ent, regs) {
    const { url } = leerConfig();
    for (let i = 0; i < regs.length; i += 500) {
      await peticion(`${url}/api/datos/${encodeURIComponent(ent)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regs.slice(i, i + 500)),
      });
    }
  },
  async quitar(ent, ids) {
    const { url } = leerConfig();
    await peticion(`${url}/api/datos/${encodeURIComponent(ent)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
    });
  },
};

export const almacenSupabase = {
  nombre: 'supabase',
  async listar(ent) {
    const { url } = leerConfig();
    const todo = [];
    for (let desde = 0; ; desde += 1000) {
      const r = await peticion(`${url}/rest/v1/registros?entidad=eq.${encodeURIComponent(ent)}&select=data&order=id`, {
        headers: { 'Range-Unit': 'items', Range: `${desde}-${desde + 999}` },
      });
      const filas = await r.json();
      filas.forEach((f) => todo.push(f.data));
      if (filas.length < 1000) break;
    }
    return todo;
  },
  async poner(ent, regs) {
    const { url } = leerConfig();
    for (let i = 0; i < regs.length; i += TROZO) {
      const filas = regs.slice(i, i + TROZO).map((d) => ({ entidad: ent, id: d.id, data: d, updated_date: d.updated_date }));
      await peticion(`${url}/rest/v1/registros?on_conflict=entidad,id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(filas),
      });
    }
  },
  async quitar(ent, ids) {
    const { url } = leerConfig();
    for (let i = 0; i < ids.length; i += TROZO) {
      const lista = ids.slice(i, i + TROZO).map((x) => `"${String(x).replace(/"/g, '')}"`).join(',');
      await peticion(`${url}/rest/v1/registros?entidad=eq.${encodeURIComponent(ent)}&id=in.(${lista})`, { method: 'DELETE' });
    }
  },
};

export { peticion };
