import assert from 'node:assert/strict';
import { escribirSeccionPorPaginas } from '../src/lib/escribirSeccion.js';
const trozos = []; const fichero = { escribir: async (t) => { trozos.push(t); } };
let enMemoria = 0, maxEnMemoria = 0;
const pagina = (k) => Array.from({ length: 500 }, (_, i) => ({ id: `p${k}-${i}`, foto: 'x'.repeat(2000), nombre: 'ñ🔧' }));
await fichero.escribir('{"a":1');
const n = await escribirSeccionPorPaginas(fichero, 'SupplierPrice', async (anadir) => {
  let total = 0;
  for (let k = 0; k < 8; k++) { const p = pagina(k); enMemoria = p.length; maxEnMemoria = Math.max(maxEnMemoria, enMemoria); await anadir(p); total += p.length; }
  return total;
}, { trozoBytes: 200_000, respiro: async () => {} });
await fichero.escribir('\n}\n');
assert.equal(n, 4000); assert.equal(maxEnMemoria, 500, 'nunca más de una página a la vez');
const texto = trozos.join(''); const j = JSON.parse(texto);
assert.equal(j.SupplierPrice.length, 4000); assert.equal(j.SupplierPrice[3999].id, 'p7-499'); assert.equal(j.a, 1);
assert.ok(Math.max(...trozos.map((t) => t.length)) < 260_000, 'ningún trozo se pasa de lo previsto');
// Sección vacía
const t2 = []; await escribirSeccionPorPaginas({ escribir: async (x) => t2.push(x) }, 'Vacia', async () => 0);
assert.deepEqual(JSON.parse('{"x":1' + t2.join('') + '}').Vacia, []);
console.log('copia por páginas: OK');
