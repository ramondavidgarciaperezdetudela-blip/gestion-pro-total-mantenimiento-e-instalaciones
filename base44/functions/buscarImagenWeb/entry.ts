import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Ayuda al navegador a buscar fotos de artículos sin IA: el navegador no puede leer otras webs
// (lo impide el propio navegador), así que esta función las lee por él.
//   { accion: 'texto',  url }  → página de resultados de un buscador de imágenes (solo buscadores conocidos)
//   { accion: 'imagen', url }  → la foto, como data URL (solo imágenes, máximo 4 MB, solo https)
// Solo la puede usar quien ha iniciado sesión.
const BUSCADORES = ['www.bing.com', 'duckduckgo.com', 'www.google.com', 'yandex.com'];
const MAX = 4 * 1024 * 1024;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function publica(u: URL) {
  const h = u.hostname.toLowerCase();
  if (u.protocol !== 'https:') return false;
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return false; // nada de direcciones IP sueltas
  if (h.includes(':') || h.startsWith('[')) return false;
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const usuario = await base44.auth.me().catch(() => null);
    if (!usuario) return Response.json({ error: 'Inicia sesión' }, { status: 401 });
    const { accion, url } = await req.json();
    const u = new URL(String(url || ''));
    if (!publica(u)) return Response.json({ error: 'Dirección no permitida' }, { status: 400 });
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), 12000);
    try {
      if (accion === 'texto') {
        if (!BUSCADORES.includes(u.hostname.toLowerCase())) return Response.json({ error: 'Buscador no permitido' }, { status: 400 });
        const r = await fetch(u, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' }, signal: control.signal });
        if (!r.ok) return Response.json({ error: `El buscador respondió ${r.status}` }, { status: 502 });
        return Response.json({ texto: (await r.text()).slice(0, 2_000_000) });
      }
      if (accion === 'imagen') {
        const r = await fetch(u, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: control.signal });
        const tipo = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
        if (!r.ok || !/^image\/(jpeg|png|webp|gif)$/.test(tipo)) return Response.json({ error: 'No es una imagen' }, { status: 415 });
        const bytes = new Uint8Array(await r.arrayBuffer());
        if (bytes.length > MAX || bytes.length < 500) return Response.json({ error: 'Imagen demasiado grande o vacía' }, { status: 413 });
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        return Response.json({ dataUrl: `data:${tipo};base64,${btoa(bin)}` });
      }
      return Response.json({ error: 'Acción no válida' }, { status: 400 });
    } finally { clearTimeout(reloj); }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
