import assert from 'node:assert/strict';
import { construirCarpetas, filtrarCarpetas } from '../src/lib/galeria.js';
const c = construirCarpetas({
  sat: [{ id: 1, order_number: 'SAT-7', contact_name: 'Ana', date: '2026-01-02', photos_before: ['a.jpg'], photos_after: ['b.jpg', 'data:image/png;base64,xx'] }, { id: 2, order_number: 'SAT-8', photos_before: [] }],
  documentos: [{ id: 3, title: 'Manual.pdf', file_url: 'm.pdf' }, { id: 4, title: 'Foto placa', file_url: 'https://x/p.PNG?v=1', contact_name: 'Luis', date: '2026-03-01' }],
});
assert.deepEqual(c.map((x) => x.nombre), ['Foto placa', 'Orden SAT SAT-7']);
assert.equal(c[1].fotos.length, 3); assert.equal(c[1].fotos[0].etiqueta, 'Antes');
assert.equal(filtrarCarpetas(c, { texto: 'luis' }).length, 1);
assert.equal(filtrarCarpetas(c, { origen: 'sat' })[0].id, 'sat:1');
console.log('galeria OK');
