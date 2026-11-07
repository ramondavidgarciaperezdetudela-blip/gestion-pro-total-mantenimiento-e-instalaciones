export function errorHttp(estado, texto, extra) {
  const e = new Error(texto || `Error ${estado}`);
  e.status = estado;
  e.data = extra;
  return e;
}
export async function leerError(r) {
  let t = '';
  try { t = await r.text(); } catch { /* sin cuerpo */ }
  let msg = t;
  try { const j = JSON.parse(t); msg = j.message || j.msg || j.error_description || j.error || t; } catch { /* texto plano */ }
  return errorHttp(r.status, String(msg || r.statusText || `Error ${r.status}`).slice(0, 300));
}
