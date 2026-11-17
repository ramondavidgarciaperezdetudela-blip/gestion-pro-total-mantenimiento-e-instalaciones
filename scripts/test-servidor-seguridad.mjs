// Prueba del blindaje del servidor propio: arranca uno temporal y le lanza ataques típicos.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-seg-'));
const web = path.join(dir, 'web'); fs.mkdirSync(web); fs.writeFileSync(path.join(web, 'index.html'), '<html>ok</html>');
fs.writeFileSync(path.join(dir, 'secreto-fuera.txt'), 'NO DEBE SALIR');
const falso = http.createServer((q, r) => {
  if (q.url.startsWith('/foto')) { r.writeHead(200, { 'Content-Type': 'image/png' }); return r.end(Buffer.from('PNGDATA')); }
  if (q.url.startsWith('/svg')) { r.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return r.end('<svg/>'); }
  r.writeHead(200, { 'Content-Type': 'text/html' }); r.end('<html>resultado de busqueda</html>');
});
await new Promise((ok) => falso.listen(0, '127.0.0.1', ok));
const puertoFalso = falso.address().port;
const puerto = 20000 + Math.floor(Math.random() * 20000);
const hijo = spawn(process.execPath, ['servidor-datos/servidor.mjs'], { env: { ...process.env, PUERTO: String(puerto), DATOS: path.join(dir, 'datos'), WEB: web, ADMIN_EMAIL: 'a@b.es', ADMIN_PASSWORD: 'claveSegura123', FALLOS_LOGIN: '4', PERMITIR_WEB_LOCAL: '', }, stdio: 'pipe' });
const base = `http://127.0.0.1:${puerto}`;
for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/estado'); break; } catch { await new Promise((r) => setTimeout(r, 150)); } }
const post = (r, b, h = {}) => fetch(base + r, { method: 'POST', headers: { 'Content-Type': 'application/json', ...h }, body: typeof b === 'string' ? b : JSON.stringify(b) });
let ok = 0; const t = (n, f) => f().then(() => { ok++; console.log('  ✓', n); }, (e) => { console.error('  ✗', n, e.message); process.exitCode = 1; });
try {
  await t('sin sesión no se leen datos', async () => { assert.equal((await fetch(base + '/api/datos/Client')).status, 401); });
  await t('token falso rechazado', async () => { assert.equal((await fetch(base + '/api/datos/Client', { headers: { Authorization: 'Bearer abc.def' } })).status, 401); });
  await t('estado no revela usuarios', async () => { const j = await (await fetch(base + '/api/estado')).json(); assert.equal(j.usuarios, undefined); });
  await t('registro cerrado con admin existente', async () => { assert.equal((await post('/api/registro', { email: 'x@y.es', password: '12345678' })).status, 403); });
  await t('cabeceras de seguridad', async () => { const r = await fetch(base + '/'); assert.equal(r.headers.get('x-content-type-options'), 'nosniff'); assert.equal(r.headers.get('x-frame-options'), 'DENY'); assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/); });
  await t('JSON roto → 400', async () => { assert.equal((await post('/api/login', '{no')).status, 400); });
  await t('cuerpo enorme en login → cortado', async () => { let r; try { r = await post('/api/login', { email: 'a', password: 'x'.repeat(200000) }); } catch { return; } assert.equal(r.status, 413); });
  let token;
  await t('login correcto', async () => { const r = await post('/api/login', { email: 'a@b.es', password: 'claveSegura123' }); assert.equal(r.status, 200); token = (await r.json()).token; });
  const H = () => ({ Authorization: 'Bearer ' + token });
  await t('con token se leen datos', async () => { assert.equal((await fetch(base + '/api/datos/Client', { headers: H() })).status, 200); });
  await t('no sale de la carpeta (../)', async () => {
    for (const p of ['/..%2fsecreto-fuera.txt', '/%2e%2e/secreto-fuera.txt', '/archivos/..%2f..%2fsecreto-fuera.txt', '/archivos/%00']) {
      const r = await fetch(base + p); const x = await r.text(); assert.ok(!x.includes('NO DEBE SALIR'), p);
    }
  });
  await t('subida: sin .html y con sandbox', async () => {
    assert.equal((await fetch(base + '/api/archivos', { method: 'POST', headers: { ...H(), 'X-Nombre': 'x.html' }, body: '<script>1</script>' })).status, 415);
    const r = await fetch(base + '/api/archivos', { method: 'POST', headers: { ...H(), 'X-Nombre': 'foto.png' }, body: 'PNG' });
    const { ruta } = await r.json(); const g = await fetch(base + ruta);
    assert.equal(g.status, 200); assert.match(g.headers.get('content-security-policy'), /sandbox/); assert.equal(g.headers.get('x-content-type-options'), 'nosniff');
  });
  await t('correo no puede apuntar a la red interna ni a otros puertos', async () => {
    for (const smtp of [{ host: '127.0.0.1', port: 587 }, { host: '192.168.1.5', port: 465 }, { host: 'example.com', port: 22 }, { host: '169.254.169.254', port: 25 }]) {
      const r = await post('/api/correo', { smtp, to: 'a@b.es', subject: 's', body: 'b' }, H()); assert.ok(r.status >= 400, JSON.stringify(smtp));
    }
  });
  await t('/api/web: sin sesión no; a la red interna no; puertos raros no', async () => {
    assert.equal((await post('/api/web', { accion: 'texto', url: 'https://example.com' })).status, 401);
    for (const url of [`http://127.0.0.1:${puertoFalso}/`, 'http://169.254.169.254/latest', 'http://192.168.1.1/', 'ftp://example.com/', 'https://example.com:22/', 'file:///etc/passwd']) {
      const r = await post('/api/web', { accion: 'texto', url }, H()); assert.ok(r.status >= 400, url);
    }
  });
  await t('cambiar la clave invalida las sesiones antiguas', async () => {
    const r = await post('/api/clave', { actual: 'claveSegura123', nueva: 'otraClave456' }, H()); assert.equal(r.status, 200);
    assert.equal((await fetch(base + '/api/datos/Client', { headers: H() })).status, 401);
    token = (await r.json()).token; assert.equal((await fetch(base + '/api/datos/Client', { headers: H() })).status, 200);
  });
  await t('bloqueo tras varios intentos fallidos', async () => {
    let ultimo; for (let i = 0; i < 6; i++) ultimo = await post('/api/login', { email: 'a@b.es', password: 'mala' + i });
    assert.equal(ultimo.status, 429);
    assert.equal((await post('/api/login', { email: 'a@b.es', password: 'otraClave456' })).status, 429); // aunque acierte, sigue bloqueado
  });
  // Camino bueno: con permiso local (solo pruebas) el servidor sí trae páginas e imágenes
  const puerto2 = puerto + 1; const dir2 = path.join(dir, 'datos2');
  const hijo2 = spawn(process.execPath, ['servidor-datos/servidor.mjs'], { env: { ...process.env, PUERTO: String(puerto2), DATOS: dir2, WEB: web, ADMIN_EMAIL: 'a@b.es', ADMIN_PASSWORD: 'claveSegura123', PERMITIR_WEB_LOCAL: '1' }, stdio: 'pipe' });
  try {
    const base2 = `http://127.0.0.1:${puerto2}`;
    for (let i = 0; i < 50; i++) { try { await fetch(base2 + '/api/estado'); break; } catch { await new Promise((r) => setTimeout(r, 150)); } }
    const tk = (await (await fetch(base2 + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@b.es', password: 'claveSegura123' }) })).json()).token;
    const web2 = (b) => fetch(base2 + '/api/web', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tk }, body: JSON.stringify(b) }).then(async (r) => ({ s: r.status, j: await r.json() }));
    await t('/api/web trae una página y una imagen, y rechaza SVG/no-imagen', async () => {
      const a = await web2({ accion: 'texto', url: `http://127.0.0.1:${puertoFalso}/x` }); assert.match(a.j.texto, /resultado de busqueda/);
      const b = await web2({ accion: 'imagen', url: `http://127.0.0.1:${puertoFalso}/foto.png` }); assert.match(b.j.dataUrl, /^data:image\/png;base64,/);
      assert.ok((await web2({ accion: 'imagen', url: `http://127.0.0.1:${puertoFalso}/svg` })).s >= 400);
      assert.ok((await web2({ accion: 'imagen', url: `http://127.0.0.1:${puertoFalso}/x` })).s >= 400);
    });
  } finally { hijo2.kill(); }
} finally { falso.close(); hijo.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
console.log(`Seguridad del servidor: ${ok} pruebas correctas`);
