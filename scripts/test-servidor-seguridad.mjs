// Prueba del blindaje del servidor propio: arranca uno temporal y le lanza ataques típicos.
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert/strict';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gpt-seg-'));
const web = path.join(dir, 'web'); fs.mkdirSync(web); fs.writeFileSync(path.join(web, 'index.html'), '<html>ok</html>');
fs.writeFileSync(path.join(dir, 'secreto-fuera.txt'), 'NO DEBE SALIR');
const puerto = 20000 + Math.floor(Math.random() * 20000);
const hijo = spawn(process.execPath, ['servidor-datos/servidor.mjs'], { env: { ...process.env, PUERTO: String(puerto), DATOS: path.join(dir, 'datos'), WEB: web, ADMIN_EMAIL: 'a@b.es', ADMIN_PASSWORD: 'claveSegura123', FALLOS_LOGIN: '4' }, stdio: 'pipe' });
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
} finally { hijo.kill(); fs.rmSync(dir, { recursive: true, force: true }); }
console.log(`Seguridad del servidor: ${ok} pruebas correctas`);
