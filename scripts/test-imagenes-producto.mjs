import assert from 'node:assert/strict';
import { parsearGoogleHtml, parsearYandex, motoresPorDefecto, parsearBing, parsearDuck, parsearGoogle, puntuar, ordenar, consultas, buscarImagenProducto, claveCache } from '../src/lib/imagenesProducto.js';

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

const gh = 'x["https://encrypted-tbn0.gstatic.com/a.jpg",90,90] y["https://tienda.es/foto-abc123.jpg",800,600] z["https://tienda.es/foto-abc123.jpg",800,600]';
assert.deepEqual(parsearGoogleHtml(gh).map((x) => x.url), ['https://tienda.es/foto-abc123.jpg']);
assert.equal(parsearYandex('"img_href":"https:\\/\\/a.es\\/b.jpg?x=1\\u0026y=2"')[0].url, 'https://a.es/b.jpg?x=1&y=2');
assert.equal(motoresPorDefecto({ puente: { texto: async () => '' }, google: { clave: 'k', cx: 'c' } }).length, 5, 'Google API + Bing + DuckDuckGo + Google web + Yandex');
assert.equal(motoresPorDefecto({ puente: null, google: {} }).length, 0);
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

// ── web del proveedor y del fabricante primero ──
import { dominiosDe, hostDe, leerMapaDominios } from '../src/lib/imagenesProducto.js';
import { emparejar } from '../src/lib/imagenesPdf.js';
assert.equal(hostDe('https://www.Danfoss.com/es/'), 'danfoss.com');
assert.deepEqual(dominiosDe({ web: 'www.frigicoll.es', marca: 'Danfoss' }), ['frigicoll.es', 'danfoss.com']);
assert.deepEqual(dominiosDe({ web: '', marca: 'Marca Rara' }, leerMapaDominios('marca rara = https://www.rara.com/x')), ['rara.com']);
assert.deepEqual(consultas({ codigo: 'A1B', nombre: 'n', dominios: ['x.com'] }).map((q) => q.texto), ['A1B site:x.com', 'n site:x.com', 'A1B', 'n']);
const llamadas = [];
const motor = async (q) => { llamadas.push(q); return q.includes('site:frigicoll.es')
  ? [{ url: 'https://www.frigicoll.es/img/abc123.jpg', titulo: 'ABC-123', pagina: 'https://www.frigicoll.es/p/abc123' }, { url: 'https://otra.com/abc123.jpg', titulo: 'ABC-123', pagina: 'https://otra.com/x' }]
  : [{ url: 'https://general.com/abc123.jpg', titulo: 'ABC-123', pagina: 'https://general.com' }]; };
r = await buscarImagenProducto({ codigo: 'ABC-123', nombre: 'Valvula', dominios: ['frigicoll.es'] }, { cache: {}, motores: [motor], descargar: async (u) => u, enLinea: () => true });
assert.ok(r.ok && r.por === 'web' && r.url.startsWith('https://www.frigicoll.es'), 'primero la web del proveedor');
assert.equal(llamadas.length, 1, 'no hace falta buscar más si la web del proveedor la tiene');
llamadas.length = 0;
r = await buscarImagenProducto({ codigo: 'ZZZ-999', nombre: 'Valvula', dominios: ['nada.com'] }, { cache: {}, motores: [async (q) => { llamadas.push(q); return q.includes('site:') ? [] : [{ url: 'https://g.com/zzz999.jpg', titulo: 'ZZZ-999', pagina: '' }]; }], descargar: async (u) => u, enLinea: () => true });
assert.ok(r.ok && r.por === 'codigo' && llamadas.length === 3, 'si la web no la tiene, sigue en internet');

// ── fotos de un PDF: la más cercana al código ──
const textos = [{ texto: 'REF ABC-123', x: 100, y: 500 }, { texto: 'XYZ-9', x: 100, y: 200 }, { texto: 'Precio 12,00', x: 300, y: 500 }];
const imgs = [{ id: 'i1', x: 20, y: 480, w: 60, h: 60 }, { id: 'i2', x: 20, y: 180, w: 60, h: 60 }, { id: 'i3', x: 400, y: 20, w: 60, h: 60 }];
const pares = emparejar(textos, imgs, [{ id: 'a', codigo: 'abc 123' }, { id: 'b', codigo: 'XYZ9' }, { id: 'c', codigo: 'NOEXISTE' }]);
assert.deepEqual(pares.map((p) => [p.articulo.id, p.imagen.id]).sort(), [['a', 'i1'], ['b', 'i2']]);
assert.equal(emparejar([{ texto: 'ABC-123', x: 900, y: 900 }], imgs, [{ id: 'a', codigo: 'ABC-123' }]).length, 0, 'foto demasiado lejos: no se asigna');
console.log('web del proveedor y fotos de PDF: OK');

// ── rendimiento: índice por código y informe ──
import { indexarCodigos, codigosEnTexto } from '../src/lib/imagenesPdf.js';
import { construirCsvFotos } from '../src/lib/informeFotos.js';
const arts = Array.from({ length: 20000 }, (_, i) => ({ id: i, codigo: 'COD' + String(i).padStart(6, '0') }));
const indice = indexarCodigos(arts);
assert.deepEqual(codigosEnTexto('Ref. COD-000123 precio', indice), ['cod000123']);
assert.deepEqual(codigosEnTexto('COD 000124', indice), ['cod000124'], 'código partido en dos palabras');
const gran = Array.from({ length: 300 }, (_, i) => ({ texto: 'COD' + String(i * 50).padStart(6, '0'), x: i, y: i }));
const t0 = Date.now(); const pp = emparejar(gran, [{ id: 'i', x: 0, y: 0, w: 5000, h: 5000 }], arts, 1e9, indice); const ms = Date.now() - t0;
assert.equal(pp.length, 1); assert.ok(ms < 500, 'emparejar con 20.000 artículos tarda ' + ms + ' ms');
const csv = construirCsvFotos([{ proveedor: 'Frío "SL"', codigo: 'A;1', nombre: 'Válvula', motivo: 'No aparece', pagina: 3, archivo: 'x.pdf' }]);
assert.ok(csv.startsWith('\uFEFF"Proveedor"') && csv.includes('"Frío ""SL"""') && csv.includes('"A;1"'));
console.log('rendimiento PDF e informe: OK');
