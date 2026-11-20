// Prueba del flujo de copia en Drive EJECUTANDO el script real (drive-copias/script-google-drive.gs) con un Drive simulado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { generarClave, scriptConClave, normalizarEnlace, crearSubidor, descargarCopiaDrive, listarCopiasDrive, probarDrive, TROZO } from '../src/lib/copiaDrive.js';

// ── Drive simulado ──
let reloj = 1;
const nuevoFichero = (nombre, datos) => ({ nombre, datos, papelera: false, t: reloj++,
  getName() { return this.nombre; }, getSize() { return Buffer.byteLength(this.datos); }, setTrashed(v) { this.papelera = v; },
  getBlob() { const d = this.datos; return { getDataAsString: () => d }; }, getLastUpdated() { return new Date(1.7e12 + this.t * 1000); } });
const nuevaCarpeta = (nombre) => ({ nombre, ficheros: [], carpetas: [], papelera: false, t: reloj++,
  getName() { return this.nombre; }, getUrl() { return 'https://drive.google.com/x/' + this.nombre; }, setTrashed(v) { this.papelera = v; }, getLastUpdated() { return new Date(1.7e12 + this.t * 1000); },
  createFile(n, d) { const f = nuevoFichero(n, d); this.ficheros.push(f); return f; },
  createFolder(n) { const c = nuevaCarpeta(n); this.carpetas.push(c); return c; },
  getFilesByName(n) { return iter(this.ficheros.filter((f) => !f.papelera && f.nombre === n)); },
  getFoldersByName(n) { return iter(this.carpetas.filter((c) => !c.papelera && c.nombre === n)); },
  getFiles() { return iter(this.ficheros.filter((f) => !f.papelera)); }, getFolders() { return iter(this.carpetas.filter((c) => !c.papelera)); } });
const iter = (a) => { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; };
function montar({ autorizado = true } = {}) {
  const raiz = nuevaCarpeta('raiz');
  const ctx = {
    DriveApp: { getFoldersByName: (n) => { if (!autorizado) throw new Error('Authorization required'); return raiz.getFoldersByName(n); }, createFolder: (n) => raiz.createFolder(n), getFolderById: () => raiz },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ t, setMimeType() { return this; } }) },
    Logger: { log() {} }, JSON, String, Math, parseInt, Object,
  };
  vm.createContext(ctx);
  return { ctx, raiz };
}
const cargar = (ctx, clave) => vm.runInContext(fs.readFileSync('drive-copias/script-google-drive.gs', 'utf8').replace("'CAMBIA-ESTA-CLAVE';", `'${clave}';`) + '\n;({ doGet, doPost, autorizar })', ctx);
const fetchDe = (script) => async (url, { method, body }) => {
  const salida = method === 'GET' ? script.doGet() : script.doPost({ postData: { contents: body } });
  return { text: async () => salida.t };
};

const cfg = { enlace: 'https://script.google.com/macros/s/ABC/exec', clave: 'secreta-larga-123' };
assert.equal(normalizarEnlace(cfg.enlace), cfg.enlace);
assert.equal(normalizarEnlace('https://evil.com/exec'), '');
assert.equal(normalizarEnlace('https://script.google.com/macros/s/ABC/dev'), '');

{ // Flujo completo con el script real
  const { ctx } = montar(); const f = fetchDe(cargar(ctx, cfg.clave));
  assert.equal((await probarDrive(cfg, f)).carpeta, 'Gestión Pro Total - Copias');
  await assert.rejects(() => probarDrive({ ...cfg, clave: 'mala' }, f), /clave no coincide/);
  const original = '{"Contact":' + JSON.stringify(Array.from({ length: 30000 }, (_, i) => ({ id: i, nombre: `Cliente ñandú ${i} 🔧`, nota: 'x'.repeat(60) }))) + '}';
  assert.ok(original.length > 2.5 * TROZO);
  const s = crearSubidor(cfg, 'copia.json', f);
  for (let i = 0; i < original.length; i += 7777) s.anadir(original.slice(i, i + 7777));
  const cierre = await s.cerrar(); assert.equal(cierre.ok, true); assert.equal(cierre.partes, Math.ceil(original.length / TROZO));
  const lista = await listarCopiasDrive(cfg, f); assert.equal(lista.length, 1); assert.equal(lista[0].nombre, 'copia.json');
  assert.equal(await descargarCopiaDrive(cfg, 'copia.json', null, f), original, 'lo que se baja es idéntico a lo que se subió');
  // Subir otra vez con el mismo nombre la sustituye
  const s2 = crearSubidor(cfg, 'copia.json', f); s2.anadir('{"a":[1]}'); assert.equal((await s2.cerrar()).ok, true);
  assert.equal(await descargarCopiaDrive(cfg, 'copia.json', null, f), '{"a":[1]}'); assert.equal((await listarCopiasDrive(cfg, f)).length, 1);
}
{ // Subida sin terminar (la app se cerró): no se ofrece como copia
  const { ctx } = montar(); const sc = cargar(ctx, cfg.clave); const f = fetchDe(sc);
  const s = crearSubidor(cfg, 'cortada.json', f); s.anadir('x'.repeat(TROZO + 5)); // se envía el trozo 0 pero NO se cierra
  await new Promise((r) => setTimeout(r, 50));
  assert.equal((await listarCopiasDrive(cfg, f)).length, 0);
}
{ // Script con la clave de ejemplo sin cambiar → mensaje claro
  const { ctx } = montar(); const f = fetchDe(vm.runInContext(fs.readFileSync('drive-copias/script-google-drive.gs', 'utf8') + '\n;({ doGet, doPost })', ctx));
  await assert.rejects(() => probarDrive(cfg, f), /CAMBIA-ESTA-CLAVE/);
}
{ // Falta autorizar: el script devuelve error → se explica el paso
  const { ctx } = montar({ autorizado: false }); const f = fetchDe(cargar(ctx, cfg.clave));
  await assert.rejects(() => probarDrive(cfg, f), /autorizar/);
  // Google devuelve una página en vez de datos
  const html = async () => ({ text: async () => '<html>Autorización necesaria</html>' });
  await assert.rejects(() => probarDrive(cfg, html), /Cualquier usuario/);
  const login = async () => ({ text: async () => '<html>accounts.google.com ServiceLogin</html>' });
  await assert.rejects(() => probarDrive(cfg, login), /Cualquier usuario/);
  const red = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(() => probarDrive(cfg, red), /No se ha podido conectar/);
}
{ // Clave generada y puesta en el código
  const k = generarClave(); assert.match(k, /^[A-Za-z0-9]{24}$/); assert.notEqual(k, generarClave());
  const cod = scriptConClave(fs.readFileSync('drive-copias/script-google-drive.gs', 'utf8'), k);
  assert.ok(cod.includes(`var CLAVE = '${k}';`)); assert.ok(!cod.includes("var CLAVE = 'CAMBIA"));
}
console.log('OK copia Drive (script real)');
