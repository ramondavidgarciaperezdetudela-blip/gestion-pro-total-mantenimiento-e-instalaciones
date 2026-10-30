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
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PUERTO || 8787);
const DATOS = path.resolve(process.env.DATOS || path.join(AQUI, '..', 'datos-gpt'));
const WEB = path.resolve(process.env.WEB || path.join(AQUI, '..', 'dist'));
const MAX_CUERPO = 60 * 1024 * 1024;

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
function firmar(carga) {
  const cuerpo = b64(JSON.stringify({ ...carga, exp: Date.now() + 30 * 24 * 3600 * 1000 }));
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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Nombre',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
const json = (res, codigo, obj) => { res.writeHead(codigo, { ...CORS, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
const fallo = (res, codigo, message) => json(res, codigo, { message });

function cuerpo(req) {
  return new Promise((resolve, reject) => {
    const trozos = []; let n = 0;
    req.on('data', (c) => { n += c.length; if (n > MAX_CUERPO) { reject(Object.assign(new Error('Archivo demasiado grande.'), { codigo: 413 })); req.destroy(); } else trozos.push(c); });
    req.on('end', () => resolve(Buffer.concat(trozos)));
    req.on('error', reject);
  });
}
const cuerpoJson = async (req) => { const b = await cuerpo(req); return b.length ? JSON.parse(b.toString('utf8')) : {}; };

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
function estatico(res, base, ruta, spa) {
  let f = path.normalize(path.join(base, decodeURIComponent(ruta)));
  if (!f.startsWith(base)) return fallo(res, 403, 'Prohibido');
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    if (!spa) return fallo(res, 404, 'No existe');
    f = path.join(base, 'index.html');
    if (!fs.existsSync(f)) return fallo(res, 404, 'Aún no has compilado la aplicación (npm run build).');
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream', ...(spa ? {} : CORS) });
  fs.createReadStream(f).pipe(res);
}

const servidor = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const ruta = url.pathname;
    if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }

    if (ruta === '/api/estado') return json(res, 200, { ok: true, nombre: 'gestion-pro-total', usuarios: usuarios.length });

    if (ruta === '/api/registro' && req.method === 'POST') {
      const d = await cuerpoJson(req);
      const email = String(d.email || '').trim().toLowerCase();
      if (usuarios.length > 0) return fallo(res, 403, 'El registro está cerrado: pide al administrador que te cree la cuenta.');
      if (!/^\S+@\S+\.\S+$/.test(email)) return fallo(res, 400, 'El correo no es válido.');
      if (String(d.password || '').length < 8) return fallo(res, 400, 'La contraseña debe tener al menos 8 caracteres.');
      const u = { id: crypto.randomUUID(), email, nombre: d.nombre || email, role: 'admin', clave: hash(d.password) };
      usuarios.push(u); guardarUsuarios();
      return json(res, 200, { token: firmar({ id: u.id }), user: publico(u) });
    }
    if (ruta === '/api/login' && req.method === 'POST') {
      const d = await cuerpoJson(req);
      const u = usuarios.find((x) => x.email === String(d.email || '').trim().toLowerCase());
      if (!u || !comprobar(String(d.password || ''), u.clave)) return fallo(res, 401, 'Correo o contraseña incorrectos.');
      return json(res, 200, { token: firmar({ id: u.id }), user: publico(u) });
    }

    // Archivos subidos: se sirven sin sesión (la dirección lleva un nombre único e imposible de adivinar)
    if (ruta.startsWith('/archivos/') && req.method === 'GET') return estatico(res, path.join(DATOS, 'archivos'), ruta.slice('/archivos/'.length), false);

    if (ruta.startsWith('/api/')) {
      const sesion = verificar((req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
      const yo = sesion && usuarios.find((u) => u.id === sesion.id);
      if (!yo) return fallo(res, 401, 'Sesión caducada: vuelve a entrar.');

      if (ruta === '/api/yo') return json(res, 200, publico(yo));
      if (ruta === '/api/correo' && req.method === 'POST') {
        const d = await cuerpoJson(req);
        const c = d.smtp || {};
        try {
          await enviarCorreo({ host: c.host, port: c.port, user: c.user, pass: c.pass, ssl: c.ssl !== false, de: c.de, nombre: c.nombre, para: d.to, asunto: d.subject, texto: d.body, html: d.html });
          return json(res, 200, { ok: true });
        } catch (e) { return fallo(res, 502, e.message || 'No se pudo enviar el correo.'); }
      }
      if (ruta === '/api/clave' && req.method === 'POST') {
        const d = await cuerpoJson(req);
        if (!comprobar(String(d.actual || ''), yo.clave)) return fallo(res, 403, 'La clave actual no es correcta.');
        if (String(d.nueva || '').length < 8) return fallo(res, 400, 'La clave nueva debe tener al menos 8 caracteres.');
        yo.clave = hash(String(d.nueva)); guardarUsuarios();
        return json(res, 200, { ok: true });
      }
      if (ruta === '/api/usuarios' && req.method === 'POST') {
        if (yo.role !== 'admin') return fallo(res, 403, 'Solo el administrador crea cuentas.');
        const d = await cuerpoJson(req); const email = String(d.email || '').trim().toLowerCase();
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
        const datos = await cuerpo(req);
        const final = `${crypto.randomBytes(6).toString('hex')}-${nombre}`.slice(0, 160);
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
    return estatico(res, WEB, ruta === '/' ? 'index.html' : ruta.slice(1), true);
  } catch (e) {
    console.error('[servidor]', e);
    return fallo(res, e.codigo || 500, e.codigo === 413 ? e.message : 'Error interno del servidor.');
  }
});

servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log(`Gestión Pro Total — servidor en marcha en el puerto ${PUERTO}`);
  console.log(`Datos guardados en: ${DATOS}`);
  console.log(`Entra desde este ordenador: http://localhost:${PUERTO}`);
  console.log('Desde el móvil o la tablet (mismo wifi): http://IP-DE-ESTE-ORDENADOR:' + PUERTO);
});
export { servidor };
