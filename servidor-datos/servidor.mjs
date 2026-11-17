#!/usr/bin/env node
// Servidor propio de Gestión Pro Total. Sin dependencias: solo Node 18+.
//   node servidor-datos/servidor.mjs            (puerto 8787, datos en ./datos-gpt)
//   PUERTO=9000 DATOS=/ruta node servidor-datos/servidor.mjs
// Sirve además la aplicación (carpeta ../dist) para entrar desde el móvil o la
// tablet escribiendo http://IP-DEL-ORDENADOR:8787 en el navegador.
import { enviarCorreo } from './correo.mjs';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import https from 'node:https';
import zlib from 'node:zlib';
import dns from 'node:dns/promises';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PUERTO || 8787);
const DATOS = path.resolve(process.env.DATOS || path.join(AQUI, '..', 'datos-gpt'));
const WEB = path.resolve(process.env.WEB || path.join(AQUI, '..', 'dist'));
const MAX_CUERPO = 60 * 1024 * 1024;
const MAX_CUERPO_CORTO = 64 * 1024; // inicio de sesión, claves, cuentas…: nunca necesitan más
// Detrás de un proxy con HTTPS (Caddy, Nginx, Cloudflare Tunnel…) la IP real viene en X-Forwarded-For.
const CONFIAR_PROXY = /^(1|si|sí|true)$/i.test(process.env.CONFIAR_PROXY || '');
const DURACION_SESION = Number(process.env.DIAS_SESION || 7) * 24 * 3600 * 1000;

fs.mkdirSync(path.join(DATOS, 'entidades'), { recursive: true });
fs.mkdirSync(path.join(DATOS, 'archivos'), { recursive: true });

// ── Secreto y usuarios ────────────────────────────────────────────────────
const rutaSecreto = path.join(DATOS, 'secreto.txt');
if (!fs.existsSync(rutaSecreto)) fs.writeFileSync(rutaSecreto, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
const SECRETO = fs.readFileSync(rutaSecreto, 'utf8').trim();
const rutaUsuarios = path.join(DATOS, 'usuarios.json');
const usuarios = fs.existsSync(rutaUsuarios) ? JSON.parse(fs.readFileSync(rutaUsuarios, 'utf8')) : [];
const guardarUsuarios = () => escribirAtomico(rutaUsuarios, JSON.stringify(usuarios, null, 2));

function escribirAtomico(ruta, texto) {
  const tmp = `${ruta}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, texto);
  fs.renameSync(tmp, ruta);
}

function hash(pass, sal = crypto.randomBytes(16).toString('hex')) {
  return `${sal}:${crypto.scryptSync(pass, sal, 64).toString('hex')}`;
}
function comprobar(pass, guardado) {
  const [sal, h] = String(guardado).split(':');
  const a = Buffer.from(h || '', 'hex'); const b = crypto.scryptSync(pass, sal || '', 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const b64 = (x) => Buffer.from(x).toString('base64url');
// «v» = huella de la clave: al cambiarla (o si alguien la roba y tú la cambias) todas las sesiones abiertas dejan de valer.
const huellaClave = (u) => crypto.createHash('sha256').update(String(u.clave)).digest('hex').slice(0, 12);
function firmar(carga) {
  const cuerpo = b64(JSON.stringify({ ...carga, exp: Date.now() + DURACION_SESION }));
  return `${cuerpo}.${crypto.createHmac('sha256', SECRETO).update(cuerpo).digest('base64url')}`;
}
function verificar(token) {
  const [cuerpo, firma] = String(token || '').split('.');
  if (!cuerpo || !firma) return null;
  const esperada = crypto.createHmac('sha256', SECRETO).update(cuerpo).digest('base64url');
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;
  try { const c = JSON.parse(Buffer.from(cuerpo, 'base64url').toString()); return c.exp > Date.now() ? c : null; } catch { return null; }
}
// ── Administrador de serie ────────────────────────────────────────────────
// En un servidor nuevo ya existe la cuenta de administrador, así que se puede
// entrar sin pasar por "crear cuenta". Correo y clave se pueden fijar con
// ADMIN_EMAIL y ADMIN_PASSWORD; si no hay clave, se inventa una larga y se
// guarda en ADMIN-CLAVE.txt dentro de la carpeta de datos (cámbiala al entrar).
if (usuarios.length === 0) {
  const correo = String(process.env.ADMIN_EMAIL || 'kairigardia.gestionprototal@gmail.com').trim().toLowerCase();
  const clave = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  usuarios.push({ id: crypto.randomUUID(), email: correo, nombre: 'Administrador', role: 'admin', clave: hash(clave) });
  guardarUsuarios();
  if (!process.env.ADMIN_PASSWORD) {
    fs.writeFileSync(path.join(DATOS, 'ADMIN-CLAVE.txt'), `Administrador: ${correo}\nClave inicial: ${clave}\n(Cámbiala desde Configuración y borra este archivo.)\n`, { mode: 0o600 });
  }
  console.log(`Administrador creado: ${correo}${process.env.ADMIN_PASSWORD ? '' : ` — clave inicial en ${path.join(DATOS, 'ADMIN-CLAVE.txt')}`}`);
}
const publico = (u) => ({ id: u.id, email: u.email, full_name: u.nombre || u.email, role: u.role });

// ── Datos: un archivo JSON por entidad, en memoria y volcado con retraso ──
const entidades = new Map();
const sucias = new Set();
const nombreSeguro = (n) => /^[A-Za-z0-9_]{1,80}$/.test(n) ? n : null;
function cargar(ent) {
  if (!entidades.has(ent)) {
    const r = path.join(DATOS, 'entidades', `${ent}.json`);
    let lista = [];
    try { lista = JSON.parse(fs.readFileSync(r, 'utf8')); } catch { /* aún no existe */ }
    entidades.set(ent, new Map(lista.map((x) => [x.id, x])));
  }
  return entidades.get(ent);
}
function marcar(ent) { sucias.add(ent); }
function volcar() {
  for (const ent of sucias) {
    escribirAtomico(path.join(DATOS, 'entidades', `${ent}.json`), JSON.stringify([...cargar(ent).values()]));
  }
  sucias.clear();
}
setInterval(volcar, 1500).unref();
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => { volcar(); process.exit(0); });

// ── HTTP ──────────────────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': process.env.ORIGEN_PERMITIDO || '*', // en internet: pon aquí la dirección de tu web
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Nombre',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
// Cabeceras que se ponen a TODO lo que sale del servidor
const SEGURIDAD = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=(self), payment=(), usb=()',
};
// La aplicación (HTML): solo carga código de sí misma; no se puede incrustar en otra web; sin plugins ni <base> ajenos.
const CSP_APP = [
  "default-src 'self'", "script-src 'self' 'unsafe-inline' blob:", "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:", "media-src 'self' data: blob:", "connect-src 'self' https: wss: http://localhost:* http://127.0.0.1:*",
  "frame-src 'self' blob: data:", "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');
// Archivos subidos: nunca se ejecutan (un .html o .svg subido no puede leer la sesión de la aplicación).
const CSP_ARCHIVO = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
const esHttps = (req) => req.socket.encrypted || /https/i.test(req.headers['x-forwarded-proto'] || '') || /^(1|si|sí|true)$/i.test(process.env.FORZAR_HTTPS || '');
const cabeceras = (req, extra = {}) => ({ ...SEGURIDAD, ...(req && esHttps(req) ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}), ...extra });
const json = (res, codigo, obj) => { res.writeHead(codigo, { ...CORS, ...cabeceras(res.req), 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const fallo = (res, codigo, message) => json(res, codigo, { message });

// ── Frenos contra adivinar claves y saturar el servidor ───────────────────
const ipDe = (req) => {
  if (CONFIAR_PROXY) { const x = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); if (x) return x; }
  return req.socket.remoteAddress || '?';
};
const intentos = new Map(); // clave → { n, hasta }
const FALLOS_MAX = Number(process.env.FALLOS_LOGIN || 6); const BLOQUEO_MS = 15 * 60 * 1000;
function bloqueado(clave) { const x = intentos.get(clave); if (!x) return 0; if (x.hasta && x.hasta > Date.now()) return x.hasta - Date.now(); if (x.hasta) intentos.delete(clave); return 0; }
function falloLogin(clave) {
  const x = intentos.get(clave) || { n: 0, hasta: 0 }; x.n++;
  if (x.n >= FALLOS_MAX) { x.hasta = Date.now() + BLOQUEO_MS; x.n = 0; }
  intentos.set(clave, x);
}
const peticiones = new Map(); // ip → { desde, n }
const PETICIONES_MIN = Number(process.env.PETICIONES_POR_MINUTO || 1500);
function demasiadas(ip) {
  const t = Date.now(); const x = peticiones.get(ip);
  if (!x || t - x.desde > 60000) { peticiones.set(ip, { desde: t, n: 1 }); return false; }
  return ++x.n > PETICIONES_MIN;
}
setInterval(() => { const t = Date.now(); for (const [k, v] of peticiones) if (t - v.desde > 120000) peticiones.delete(k); for (const [k, v] of intentos) if (!v.hasta && false) intentos.delete(k); }, 60000).unref();
const CLAVE_FALSA = hash('clave-que-no-existe'); // para tardar lo mismo si el correo no existe (no revela qué cuentas hay)

// Correo: solo puertos de correo y nunca hacia la red interna (evita usar el servidor para escanear tu red)
const PUERTOS_CORREO = new Set([25, 465, 587, 2525]);
const esPrivada = (ip) => {
  if (net.isIPv4(ip)) { const [a, b] = ip.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254) || (a === 100 && b >= 64 && b <= 127); }
  if (net.isIPv6(ip)) { const l = ip.toLowerCase(); return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.'); }
  return true;
};
async function comprobarDestinoCorreo(host, port) {
  if (!PUERTOS_CORREO.has(Number(port))) throw new Error('Puerto de correo no permitido (usa 465, 587, 25 o 2525).');
  if (/^(1|si|sí|true)$/i.test(process.env.PERMITIR_CORREO_LOCAL || '')) return;
  let dirs;
  try { dirs = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true }); } catch { throw new Error('No se encuentra el servidor de correo.'); }
  if (!dirs.length || dirs.some((d) => esPrivada(d.address))) throw new Error('El servidor de correo no puede estar en una red interna.');
}

function cuerpo(req, max = MAX_CUERPO) {
  return new Promise((resolve, reject) => {
    const trozos = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > max) { reject(Object.assign(new Error('Archivo demasiado grande.'), { codigo: 413 })); req.destroy(); } else trozos.push(c); });
    req.on('end', () => resolve(Buffer.concat(trozos)));
    req.on('error', reject);
  });
}
const cuerpoJson = async (req, max = MAX_CUERPO) => {
  const b = await cuerpo(req, max);
  try { return b.length ? JSON.parse(b.toString('utf8')) : {}; } catch { throw Object.assign(new Error('El cuerpo de la petición no es JSON válido.'), { codigo: 400 }); }
};

// ── Lectura de páginas e imágenes de internet (para «Rellenar imágenes» desde el navegador) ──────────
// Un navegador no puede leer Bing/Google por sí solo; el servidor sí. Solo con sesión iniciada, solo http(s) a
// puertos 80/443, nunca a la red interna (la dirección se comprueba y se fija antes de conectar) y con límites.
const MAX_WEB_TEXTO = 2.5 * 1024 * 1024; const MAX_WEB_IMAGEN = 6 * 1024 * 1024;
async function traerWeb(urlTxt, { imagen = false } = {}, saltos = 0) {
  let u; try { u = new URL(String(urlTxt)); } catch { throw new Error('Dirección no válida.'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Solo se permiten direcciones http o https.');
  if (u.username || u.password) throw new Error('Dirección no válida.');
  const puerto = Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  const permitirLocal = /^(1|si|sí|true)$/i.test(process.env.PERMITIR_WEB_LOCAL || ''); // solo para las pruebas
  if (!permitirLocal && puerto !== 80 && puerto !== 443) throw new Error('Puerto no permitido.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  let dir;
  try { dir = net.isIP(host) ? { address: host, family: net.isIP(host) } : (await dns.lookup(host, { all: true }))[0]; } catch { throw new Error('No se encuentra esa página.'); }
  if (!dir) throw new Error('No se encuentra esa página.');
  if (!permitirLocal && esPrivada(dir.address)) throw new Error('Esa dirección está en una red interna.');
  const lib = u.protocol === 'https:' ? https : http;
  const respuesta = await new Promise((resolver, rechazar) => {
    const req = lib.request({
      host: u.hostname.replace(/^\[|\]$/g, ''), port: puerto, path: u.pathname + u.search, method: 'GET', timeout: 15000,
      lookup: (_h, _o, cb) => cb(null, dir.address, dir.family), // se conecta justo a la dirección ya comprobada
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept-Language': 'es-ES,es;q=0.9', 'Accept-Encoding': 'gzip, br', Accept: imagen ? 'image/*' : 'text/html,application/json,*/*' },
    }, resolver);
    req.on('timeout', () => req.destroy(new Error('La página tarda demasiado.')));
    req.on('error', rechazar); req.end();
  });
  if (respuesta.statusCode >= 300 && respuesta.statusCode < 400 && respuesta.headers.location) {
    respuesta.resume();
    if (saltos >= 4) throw new Error('Demasiadas redirecciones.');
    return traerWeb(new URL(respuesta.headers.location, u).href, { imagen }, saltos + 1);
  }
  if (respuesta.statusCode < 200 || respuesta.statusCode >= 300) { respuesta.resume(); throw new Error(`La página respondió ${respuesta.statusCode}.`); }
  const tipo = String(respuesta.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (imagen && (!/^image\//.test(tipo) || /svg/.test(tipo))) { respuesta.resume(); throw new Error('No es una imagen.'); }
  const max = imagen ? MAX_WEB_IMAGEN : MAX_WEB_TEXTO;
  const cod = String(respuesta.headers['content-encoding'] || '').toLowerCase();
  const flujo = cod === 'gzip' ? respuesta.pipe(zlib.createGunzip()) : cod === 'br' ? respuesta.pipe(zlib.createBrotliDecompress()) : respuesta;
  const trozos = []; let total = 0;
  for await (const t of flujo) { total += t.length; if (total > max) { respuesta.destroy(); throw new Error('El archivo es demasiado grande.'); } trozos.push(t); }
  return { tipo, datos: Buffer.concat(trozos) };
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
function estatico(req, res, base, ruta, spa) {
  let rel;
  try { rel = decodeURIComponent(ruta); } catch { return fallo(res, 400, 'Dirección no válida.'); }
  if (rel.includes('\0')) return fallo(res, 400, 'Dirección no válida.');
  let f = path.resolve(base, rel);
  const dentro = (x) => { const r = path.relative(base, x); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)); };
  if (!dentro(f)) return fallo(res, 403, 'Prohibido');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    if (!spa) return fallo(res, 404, 'No existe');
    f = path.join(base, 'index.html');
    if (!fs.existsSync(f)) return fallo(res, 404, 'Aún no has compilado la aplicación (npm run build).');
  }
  const ext = path.extname(f).toLowerCase();
  const tipo = TIPOS[ext] || 'application/octet-stream';
  const extra = spa
    ? (ext === '.html' ? { 'Content-Security-Policy': CSP_APP, 'Cache-Control': 'no-cache' } : { 'Cache-Control': 'public, max-age=3600' })
    : { ...CORS, 'Content-Security-Policy': CSP_ARCHIVO, 'Content-Disposition': ext === '.svg' || tipo === 'application/octet-stream' ? 'attachment' : 'inline', 'Cache-Control': 'private, max-age=3600' };
  res.writeHead(200, { 'Content-Type': tipo, ...cabeceras(req, extra) });
  fs.createReadStream(f).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const ruta = url.pathname;
    if (demasiadas(ipDe(req))) { res.setHeader('Retry-After', '60'); return fallo(res, 429, 'Demasiadas peticiones. Espera un minuto.'); }
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

    if (ruta === '/api/estado') return json(res, 200, { ok: true, nombre: 'gestion-pro-total' });

    if (ruta === '/api/registro' && req.method === 'POST') {
      const d = await cuerpoJson(req, MAX_CUERPO_CORTO);
      const email = String(d.email || '').trim().toLowerCase();
      if (usuarios.length > 0) return fallo(res, 403, 'El registro está cerrado: pide al administrador que te cree la cuenta.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return fallo(res, 400, 'El correo no es válido.');
      if (String(d.password || '').length < 8) return fallo(res, 400, 'La contraseña debe tener al menos 8 caracteres.');
      const u = { id: crypto.randomUUID(), email, nombre: d.nombre || email, role: 'admin', clave: hash(d.password) };
      usuarios.push(u); guardarUsuarios();
      return json(res, 200, { token: firmar({ id: u.id, v: huellaClave(u) }), user: publico(u) });
    }
    if (ruta === '/api/login' && req.method === 'POST') {
      const d = await cuerpoJson(req, MAX_CUERPO_CORTO);
      const correo = String(d.email || '').trim().toLowerCase();
      const claveIp = `ip:${ipDe(req)}`; const claveCorreo = `mail:${correo}`;
      const espera = Math.max(bloqueado(claveIp), bloqueado(claveCorreo));
      if (espera) { res.setHeader('Retry-After', Math.ceil(espera / 1000)); return fallo(res, 429, `Demasiados intentos. Espera ${Math.ceil(espera / 60000)} minutos y vuelve a probar.`); }
      const u = usuarios.find((x) => x.email === correo);
      const bien = comprobar(String(d.password || ''), u ? u.clave : CLAVE_FALSA) && !!u;
      if (!bien) { falloLogin(claveIp); falloLogin(claveCorreo); console.warn(`[seguridad] intento de acceso fallido (${ipDe(req)}) con «${correo.slice(0, 60)}»`); return fallo(res, 401, 'Correo o contraseña incorrectos.'); }
      intentos.delete(claveIp); intentos.delete(claveCorreo);
      return json(res, 200, { token: firmar({ id: u.id, v: huellaClave(u) }), user: publico(u) });
    }

    // Archivos subidos: se sirven sin sesión (la dirección lleva un nombre único e imposible de adivinar)
    if (ruta.startsWith('/archivos/') && req.method === 'GET') return estatico(req, res, path.join(DATOS, 'archivos'), ruta.slice('/archivos/'.length), false);

    if (ruta.startsWith('/api/')) {
      const sesion = verificar((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      const yo = sesion && usuarios.find((u) => u.id === sesion.id && sesion.v === huellaClave(u));
      if (!yo) return fallo(res, 401, 'Sesión caducada: vuelve a entrar.');

      if (ruta === '/api/yo') return json(res, 200, publico(yo));
      if (ruta === '/api/web' && req.method === 'POST') {
        const d = await cuerpoJson(req, MAX_CUERPO_CORTO);
        try {
          const r = await traerWeb(d.url, { imagen: d.accion === 'imagen' });
          if (d.accion === 'imagen') return json(res, 200, { dataUrl: `data:${r.tipo};base64,${r.datos.toString('base64')}` });
          return json(res, 200, { texto: r.datos.toString('utf8') });
        } catch (e) { return fallo(res, 502, e.message || 'No se pudo leer la página.'); }
      }
      if (ruta === '/api/correo' && req.method === 'POST') {
        const d = await cuerpoJson(req);
        const c = d.smtp || {};
        try {
          await comprobarDestinoCorreo(String(c.host || ''), c.port);
          await enviarCorreo({ host: c.host, port: c.port, user: c.user, pass: c.pass, ssl: c.ssl !== false, de: c.de, nombre: c.nombre, para: d.to, asunto: d.subject, texto: d.body, html: d.html });
          return json(res, 200, { ok: true });
        } catch (e) { return fallo(res, 502, e.message || 'No se pudo enviar el correo.'); }
      }
      if (ruta === '/api/clave' && req.method === 'POST') {
        const d = await cuerpoJson(req, MAX_CUERPO_CORTO);
        if (!comprobar(String(d.actual || ''), yo.clave)) return fallo(res, 403, 'La clave actual no es correcta.');
        if (String(d.nueva || '').length < 8) return fallo(res, 400, 'La clave nueva debe tener al menos 8 caracteres.');
        yo.clave = hash(String(d.nueva)); guardarUsuarios();
        // Las demás sesiones abiertas caducan (la huella cambió); esta recibe una nueva
        return json(res, 200, { ok: true, token: firmar({ id: yo.id, v: huellaClave(yo) }) });
      }
      if (ruta === '/api/usuarios' && req.method === 'POST') {
        if (yo.role !== 'admin') return fallo(res, 403, 'Solo el administrador crea cuentas.');
        const d = await cuerpoJson(req, MAX_CUERPO_CORTO); const email = String(d.email || '').trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email) || String(d.password || '').length < 8) return fallo(res, 400, 'Correo o contraseña no válidos.');
        if (usuarios.some((u) => u.email === email)) return fallo(res, 409, 'Ese correo ya existe.');
        const u = { id: crypto.randomUUID(), email, nombre: d.nombre || email, role: d.role === 'admin' ? 'admin' : 'user', clave: hash(d.password) };
        usuarios.push(u); guardarUsuarios();
        return json(res, 200, publico(u));
      }
      if (ruta === '/api/archivos' && req.method === 'POST') {
        let bruto = 'archivo';
        try { bruto = decodeURIComponent(req.headers['x-nombre'] || 'archivo'); } catch { /* nombre raro */ }
        const nombre = bruto.replace(/[^\w.\-]+/g, '_').replace(/^\.+/, '') || 'archivo';
        if (/\.(html?|xhtml|js|mjs|cjs|php|exe|bat|cmd|com|scr|msi|sh|jar|dll|ps1|vbs)$/i.test(nombre)) return fallo(res, 415, 'Ese tipo de archivo no se puede subir.');
        const datos = await cuerpo(req);
        const final = `${crypto.randomBytes(16).toString('hex')}-${nombre}`.slice(0, 160);
        fs.writeFileSync(path.join(DATOS, 'archivos', final), datos);
        return json(res, 200, { ruta: `/archivos/${encodeURIComponent(final)}` });
      }
      const m = ruta.match(/^\/api\/datos\/([^/]+)$/);
      if (m) {
        const ent = nombreSeguro(decodeURIComponent(m[1]));
        if (!ent) return fallo(res, 400, 'Nombre de entidad no válido.');
        const mapa = cargar(ent);
        if (req.method === 'GET') return json(res, 200, [...mapa.values()]);
        if (req.method === 'PUT') {
          const lista = await cuerpoJson(req);
          if (!Array.isArray(lista)) return fallo(res, 400, 'Se esperaba una lista.');
          for (const r of lista) if (r && r.id) mapa.set(String(r.id), r);
          marcar(ent); return json(res, 200, { ok: true, n: lista.length });
        }
        if (req.method === 'DELETE') {
          const { ids = [] } = await cuerpoJson(req);
          ids.forEach((id) => mapa.delete(String(id)));
          marcar(ent); return json(res, 200, { ok: true, n: ids.length });
        }
      }
      return fallo(res, 404, 'Ruta desconocida.');
    }
    return estatico(req, res, WEB, ruta === '/' ? 'index.html' : ruta.slice(1), true);
  } catch (e) {
    console.error('[servidor]', e);
    return fallo(res, e.codigo || 500, e.codigo === 413 ? e.message : 'Error interno del servidor.');
  }
});

// Contra conexiones lentas que dejan el servidor bloqueado
servidor.headersTimeout = 20000; servidor.requestTimeout = 120000; servidor.keepAliveTimeout = 10000; servidor.maxHeadersCount = 60;
servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Gestión Pro Total — servidor en marcha en el puerto ${PUERTO}`);
  console.log(`Datos guardados en: ${DATOS}`);
  console.log(`Entra desde este ordenador: http://localhost:${PUERTO}`);
  console.log('Desde el móvil o la tablet (mismo wifi): http://IP-DE-ESTE-ORDENADOR:' + PUERTO);
});
export { servidor };
