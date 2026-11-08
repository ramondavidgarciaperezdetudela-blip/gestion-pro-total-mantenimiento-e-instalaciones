import fs from 'node:fs';
import assert from 'node:assert/strict';
const pre = fs.readFileSync('src/lib/precarga.js', 'utf8');
const lazy = [];
for (const f of ['src/pages.config.js', 'src/App.jsx']) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/const (\w+) = lazy\(\(\) => import\('\.\/pages\/(\w+)'\)\)/g)) lazy.push([m[1], m[2]]);
}
assert.ok(lazy.length > 50);
for (const [v, p] of lazy) assert.ok(pre.includes(`  ${v}: () => import('../pages/${p}')`), 'falta en precarga.js: ' + v);
// Todas las pantallas del menú se pueden precargar.
const menu = fs.readFileSync('src/componentes/tema/menu.js', 'utf8');
for (const m of menu.matchAll(/ap\('([A-Za-z0-9]+)/g)) assert.ok(pre.includes(`  ${m[1]}: () =>`), 'pantalla del menú sin precarga: ' + m[1]);
console.log('precarga: OK (' + lazy.length + ' pantallas)');
