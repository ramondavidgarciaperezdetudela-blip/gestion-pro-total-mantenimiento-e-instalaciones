import assert from 'node:assert/strict';
import { parsearBing, parsearDuck, parsearGoogle, puntuar, ordenar, consultas, buscarImagenProducto, claveCache } from '../src/lib/imagenesProducto.js';

const bing = `<a class="iusc" m="{&quot;cid&quot;:&quot;x&quot;,&quot;purl&quot;:&quot;https://tienda.es/p/ABC-123&quot;,&quot;murl&quot;:&quot;https://tienda.es/img/abc123.jpg&quot;,&quot;turl&quot;:&quot;https://tse1.mm.bing.net/t.jpg&quot;,&quot;t&quot;:&quot;Valvula ABC-123 Danfoss&quot;}"></a>
<a m="{&quot;purl&quot;:&quot;https://otro.es/x&quot;,&quot;murl&quot;:&quot;https://otro.es/logo.png&quot;,&quot;t&quot;:&quot;logo tienda&quot;}"></a>`;
const c = parsearBing(bing);
assert.equal(c.length, 2); assert.equal(c[0].url, 'https://tienda.es/img/abc123.jpg'); assert.equal(c[0].titulo, 'Valvula ABC-123 Danfoss');
assert.equal(parsearDuck({ results: [{ image: 'https://a/b.jpg', title: 't', url: 'https://p' }] })[0].url, 'https://a/b.jpg');
assert.equal(parsearGoogle({ items: [{ link: 'https://a/b.png', title: 't' }] })[0].url, 'https://a/b.png');
const datos = { codigo: 'ABC-123', nombre: 'Válvula de expansión', marca: 'Danfoss' };
assert.equal(ordenar(c, datos)[0].url, 'https://tienda.es/img/abc123.jpg');
assert.ok(puntuar(c[0], datos) >= 100 && puntuar(c[1], datos) < 20);
assert.deepEqual(consultas({ codigo: '', nombre: 'x' }).map((q) => q.por), ['nombre']);
assert.deepEqual(consultas({ codigo: 'a1', nombre: 'x' }).map((q) => q.por), ['codigo', 'nombre']);

const mem = {};
const d = (extra) => ({ cache: {}, motores: [async () => c], descargar: async (u) => 'data:' + u, enLinea: () => true, ...extra });
let r = await buscarImagenProducto(datos, d());
assert.ok(r.ok && r.por === 'codigo' && r.url.includes('abc123'), 'por código');
// sin código en resultados → cae al nombre
r = await buscarImagenProducto({ codigo: 'ZZZ999', nombre: 'Valvula expansion', marca: 'Danfoss' }, d({ motores: [async (q) => (q.includes('ZZZ999') ? [] : [{ url: 'https://s/v.jpg', titulo: 'Valvula expansion Danfoss', pagina: '' }])] }));
assert.ok(r.ok && r.por === 'nombre', 'por nombre');
// la IA puede reordenar
r = await buscarImagenProducto({ codigo: '', nombre: 'Valvula expansion', marca: 'Danfoss' }, d({ motores: [async () => [{ url: 'https://s/1.jpg', titulo: 'Valvula expansion Danfoss', pagina: '' }, { url: 'https://s/2.jpg', titulo: 'Valvula expansion Danfoss', pagina: '' }]], elegirConIA: async () => 1 }));
assert.equal(r.url, 'data:https://s/2.jpg');
// sin conexión, sin motor, sin resultado, caché
assert.equal((await buscarImagenProducto(datos, d({ enLinea: () => false }))).motivo, 'sin_conexion');
assert.equal((await buscarImagenProducto(datos, d({ motores: [] }))).motivo, 'sin_motor');
assert.equal((await buscarImagenProducto(datos, d({ motores: [async () => []] }))).motivo, 'sin_resultado');
assert.equal((await buscarImagenProducto(datos, d({ motores: [async () => { throw new Error('x'); }] }))).motivo, 'sin_motor_responde');
const cache = { [claveCache(datos)]: { url: 'data:guardada', por: 'codigo' } };
r = await buscarImagenProducto(datos, d({ cache, enLinea: () => false }));
assert.ok(r.ok && r.desdeCache, 'la caché funciona sin conexión');
console.log('imágenes de producto: OK');
