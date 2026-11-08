// Prueba del flujo de copia en Drive con un "Google Apps Script" simulado.
import assert from 'node:assert/strict';
import { normalizarEnlace, crearSubidor, descargarCopiaDrive, listarCopiasDrive, probarDrive, TROZO } from '../src/lib/copiaDrive.js';

const ficheros = new Map();
const fakeFetch = async (url, { body }) => {
  const p = JSON.parse(body);
  const r = (o) => ({ json: async () => o });
  if (p.clave !== 'secreta') return r({ ok: false, error: 'Clave incorrecta' });
  if (p.accion === 'probar') return r({ ok: true, carpeta: 'Gestión Pro Total - Copias' });
  if (p.accion === 'parte') {
    if (p.n === 0) ficheros.set(p.nombre, p.datos); else ficheros.set(p.nombre, ficheros.get(p.nombre) + p.datos);
    return r({ ok: true });
  }
  if (p.accion === 'listar') return r({ ok: true, copias: [...ficheros].map(([nombre, t]) => ({ nombre, bytes: t.length, fecha: new Date().toISOString() })) });
  if (p.accion === 'leer') { const t = ficheros.get(p.nombre); return r({ ok: true, total: t.length, datos: t.substr(p.desde, p.largo) }); }
};

const cfg = { enlace: 'https://script.google.com/macros/s/ABC/exec', clave: 'secreta' };
assert.equal(normalizarEnlace(cfg.enlace), cfg.enlace);
assert.equal(normalizarEnlace('https://evil.com/exec'), '');
assert.equal(normalizarEnlace('https://script.google.com/macros/s/ABC/dev'), '');
assert.equal((await probarDrive(cfg, fakeFetch)).carpeta, 'Gestión Pro Total - Copias');
await assert.rejects(() => probarDrive({ ...cfg, clave: 'mala' }, fakeFetch), /Clave incorrecta/);

// Copia de ~2,6 trozos con acentos y emojis, escrita en pedacitos.
const original = '{"Contact":' + JSON.stringify(Array.from({ length: 30000 }, (_, i) => ({ id: i, nombre: `Cliente ñandú ${i} 🔧`, nota: 'x'.repeat(60) }))) + '}';
assert.ok(original.length > 2.5 * TROZO);
const s = crearSubidor(cfg, 'copia.json', fakeFetch);
for (let i = 0; i < original.length; i += 7777) s.anadir(original.slice(i, i + 7777));
const cierre = await s.cerrar(); assert.equal(cierre.ok, true); assert.equal(cierre.partes, Math.ceil(original.length / TROZO));
assert.equal(ficheros.get('copia.json'), original);
assert.equal((await listarCopiasDrive(cfg, fakeFetch)).length, 1);
assert.equal(await descargarCopiaDrive(cfg, 'copia.json', null, fakeFetch), original);

// Un fallo se informa, no se traga.
const malo = crearSubidor({ ...cfg, clave: 'mala' }, 'x.json', fakeFetch);
malo.anadir('hola');
assert.equal((await malo.cerrar()).ok, false);
console.log('OK copia Drive');
