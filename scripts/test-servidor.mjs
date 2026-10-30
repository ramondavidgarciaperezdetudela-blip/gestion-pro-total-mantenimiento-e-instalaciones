// Prueba de extremo a extremo del servidor propio.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let fallos = 0; const ok = (c, t, d = '') => { if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } else console.log('  ✓ ' + t); };
const datos = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-'));
const PUERTO = 18787; const B = `http://127.0.0.1:${PUERTO}`;
const p = spawn('node', ['servidor-datos/servidor.mjs'], { env: { ...process.env, PUERTO: String(PUERTO), DATOS: datos, WEB: datos, ADMIN_EMAIL: 'david@x.es', ADMIN_PASSWORD: 'clave-larga-1' }, stdio: 'ignore' });
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 30; i++) { try { if ((await fetch(`${B}/api/estado`)).ok) break; } catch { /* aún arrancando */ } await dormir(200); }
const j = async (ruta, o = {}, token) => { const r = await fetch(B + ruta, { ...o, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(o.headers || {}) } }); let b = null; try { b = await r.json(); } catch { /* sin json */ } return { s: r.status, b }; };
try {
  ok((await j('/api/datos/Contact')).s === 401, 'sin sesión no se leen datos');
  const reg3 = await j('/api/registro', { method: 'POST', body: JSON.stringify({ email: 'otro@x.es', password: 'clave-larga-1' }) });
  ok(reg3.s === 403, 'el registro está cerrado: el administrador ya existe de serie');
  ok((await j('/api/login', { method: 'POST', body: JSON.stringify({ email: 'david@x.es', password: 'mal' }) })).s === 401, 'contraseña errónea rechazada');
  const lg = await j('/api/login', { method: 'POST', body: JSON.stringify({ email: 'david@x.es', password: 'clave-larga-1' }) });
  ok(lg.s === 200 && lg.b.token, 'login correcto'); const t = lg.b.token;
  ok((await j('/api/yo', {}, t)).b.role === 'administrador'.slice(0, 0) + 'admin', 'el administrador de serie tiene rol admin');
  const nu = await j('/api/usuarios', { method: 'POST', body: JSON.stringify({ email: 'tec@x.es', password: 'provisional-1', role: 'user' }) }, t);
  ok(nu.s === 200 && nu.b.role === 'user', 'el administrador crea otra cuenta');
  const lt = await j('/api/login', { method: 'POST', body: JSON.stringify({ email: 'tec@x.es', password: 'provisional-1' }) });
  ok(lt.s === 200, 'la cuenta nueva entra');
  ok((await j('/api/usuarios', { method: 'POST', body: JSON.stringify({ email: 'x@x.es', password: 'provisional-1' }) }, lt.b.token)).s === 403, 'un usuario normal no crea cuentas');
  ok((await j('/api/clave', { method: 'POST', body: JSON.stringify({ actual: 'mala', nueva: 'otra-clave-123' }) }, lt.b.token)).s === 403, 'cambiar clave exige la actual');
  ok((await j('/api/clave', { method: 'POST', body: JSON.stringify({ actual: 'provisional-1', nueva: 'otra-clave-123' }) }, lt.b.token)).s === 200, 'cambiar clave');
  const put = await j('/api/datos/Contact', { method: 'PUT', body: JSON.stringify([{ id: 'c1', name: 'Ana' }, { id: 'c2', name: 'Bar Sol' }]) }, t);
  ok(put.s === 200, 'guardar fichas');
  ok((await j('/api/datos/Contact', {}, t)).b.length === 2, 'leer fichas');
  await j('/api/datos/Contact', { method: 'DELETE', body: JSON.stringify({ ids: ['c1'] }) }, t);
  const tras = (await j('/api/datos/Contact', {}, t)).b;
  ok(tras.length === 1 && tras[0].id === 'c2', 'borrar ficha');
  ok((await j('/api/datos/..%2Fx', {}, t)).s === 400, 'nombre de entidad peligroso rechazado');
  const sub = await fetch(`${B}/api/archivos`, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'X-Nombre': encodeURIComponent('../foto 1.png'), 'Content-Type': 'image/png' }, body: Buffer.from('PNGDATA') });
  const sj = await sub.json();
  ok(sub.status === 200 && !sj.ruta.includes('..'), 'subir archivo con nombre saneado', sj.ruta);
  const got = await fetch(B + sj.ruta);
  ok(got.status === 200 && (await got.text()) === 'PNGDATA', 'descargar archivo');
  await dormir(1800);
  ok(JSON.parse(fs.readFileSync(path.join(datos, 'entidades', 'Contact.json'), 'utf8')).length === 1, 'los datos quedan en disco');
} finally { p.kill(); fs.rmSync(datos, { recursive: true, force: true }); }
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
