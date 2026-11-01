// Comprueba que la actualización de las rutinas de CADCraft nunca pisa los cambios del usuario.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import assert from 'node:assert'; import Module from 'node:module';
const require = Module.createRequire(import.meta.url);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-'));
const userData = path.join(tmp, 'ud'); fs.mkdirSync(userData);
const orig = Module._load;
Module._load = function (req, ...r) { return req === 'electron' ? { app: { isPackaged: false, getPath: (n) => (n === 'userData' ? userData : tmp) } } : orig.call(this, req, ...r); };
const cc = require('../electron/cadcraft.cjs');
// Simula la versión actualizada con rutinas nuevas
const sup = path.join(userData, 'cadcraft-app', 'support'); fs.mkdirSync(sup, { recursive: true });
const conf = path.join(userData, 'cadcraft');
const leer = (f) => fs.readFileSync(path.join(conf, 'support', f), 'utf8');
fs.writeFileSync(path.join(sup, 'hvac.lsp'), 'v1');
// instalarSoporte no está exportada: se ejecuta a través de abrirLibre sin ejecutable (devuelve error pero no instala) → usamos el módulo interno
const m = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../electron/cadcraft.cjs'), 'utf8');
const fn = new Function('require', 'module', '__dirname', m + '\nmodule.exports.__soporte = instalarSoporte;');
const mod = { exports: {} }; Module._load; fn(require, mod, path.join(tmp, 'x'));
mod.exports.__soporte(conf);
assert.equal(leer('hvac.lsp'), 'v1');
fs.writeFileSync(path.join(sup, 'hvac.lsp'), 'v2'); mod.exports.__soporte(conf);
assert.equal(leer('hvac.lsp'), 'v2', 'se actualiza si el usuario no lo tocó');
fs.writeFileSync(path.join(conf, 'support', 'hvac.lsp'), 'MIO');
fs.writeFileSync(path.join(sup, 'hvac.lsp'), 'v3'); mod.exports.__soporte(conf);
assert.equal(leer('hvac.lsp'), 'MIO', 'no pisa los cambios del usuario');
assert.equal(leer('hvac.lsp.nuevo'), 'v3', 'deja la nueva al lado');
fs.writeFileSync(path.join(conf, 'support', 'mio.lsp'), 'propio'); mod.exports.__soporte(conf);
assert.equal(leer('mio.lsp'), 'propio');
console.log('OK actualización de CADCraft conserva los cambios del usuario');
