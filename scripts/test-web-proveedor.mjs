import assert from 'node:assert/strict';
import http from 'node:http';
import { precioDe, descubrirBuscador, extraerProductos, fichaProducto, categoriasPara, familiasDe, leerPlantillasPropias, buscarEnWebProveedor } from '../src/lib/webProveedor.js';

assert.equal(precioDe('Precio 1.234,56 €'), 1234.56); assert.equal(precioDe('12,5€'), 12.5); assert.equal(precioDe('sin precio'), null);
const portada = `<form action="/buscar" method="get"><input type="hidden" name="lang" value="es"><input type="search" name="texto" placeholder="Buscar"></form>`;
assert.equal(descubrirBuscador(portada, 'https://x.es/'), 'https://x.es/buscar?lang=es&texto={q}');
assert.equal(descubrirBuscador('<form method="post"><input name="q"></form>', 'https://x.es/'), null);
assert.deepEqual(leerPlantillasPropias('www.a.es=https://a.es/s?q={q}\nmal=sin'), { 'a.es': 'https://a.es/s?q={q}' });
assert.ok(familiasDe('Gas refrigerante R-32').includes('refrigeracion'));

const listado = `<div><a href="/p/val-123"><img data-src="/img/val123.jpg" alt="Válvula expansión TGE 123"><span>Válvula expansión TGE 123</span></a><span class="precio">45,90 €</span></div>
<a href="/p/otro"><img src="/img/logo.png" alt="logo"></a><a href="/p/tubo"><img src="/img/tubo.jpg" alt="Tubo cobre 1/4"></a> 3,20 €
<script type="application/ld+json">{"@type":"Product","name":"Pieza JSON","sku":"JS-9","image":["/img/js9.jpg"],"offers":{"price":"10.50"}}</script>`;
const ps = extraerProductos(listado, 'https://x.es/');
assert.equal(ps.length, 3);
assert.equal(ps.find((p) => p.url.endsWith('js9.jpg')).precio, 10.5);
assert.equal(ps.find((p) => p.url.endsWith('val123.jpg')).precio, 45.9);
assert.equal(fichaProducto('<meta property="og:image" content="/g.jpg"><meta property="product:price:amount" content="7.25">', 'https://x.es/p').precio, 7.25);
const tarifas = `<a href="/tarifas/refrigeracion">Refrigeración</a><a href="/tarifas/agua">Agua</a><a href="https://otro.com/x">Refrigeración ext</a>`;
assert.equal(categoriasPara(tarifas, 'https://x.es/tarifas/', { nombre: 'Compresor frigorífico' })[0].texto, 'Refrigeración');

// Web simulada completa: portada con buscador + resultados + ficha + categorías
const pagina = { };
const srv = http.createServer((q, r) => {
  const u = new URL(q.url, 'http://x'); const f = (b, t = 'text/html') => { r.writeHead(200, { 'Content-Type': t }); r.end(b); };
  if (u.pathname === '/') return f(portada);
  if (u.pathname === '/buscar') { const t = u.searchParams.get('texto') || ''; if (t) pagina.ultima = t; return f(t.includes('VAL-123') || /valvula/i.test(t) ? listado : '<p>Sin resultados</p>'); }
  if (u.pathname === '/tarifas/') return f(tarifas);
  if (u.pathname === '/tarifas/refrigeracion') return f(`<a href="/p/comp"><img src="/img/comp.jpg" alt="Compresor frigorífico Danfoss 2HP"></a> 310,00 €`);
  r.writeHead(404); r.end('no');
});
await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${srv.address().port}`;
const aprendidas = {};
const dep = () => ({ texto: async (u) => { const x = await fetch(u); if (!x.ok) throw new Error('HTTP ' + x.status); return x.text(); }, descargar: async (u) => 'data:' + u, aprender: (h, p) => { aprendidas[h] = p; } });
// por código, detectando el buscador de la portada
let r = await buscarEnWebProveedor({ web: base, codigo: 'VAL-123', nombre: 'Válvula expansión' }, dep());
assert.ok(r.ok && r.url.endsWith('val123.jpg') && r.precio === 45.9 && r.via === 'buscador', JSON.stringify(r));
assert.equal(pagina.ultima, 'VAL-123');
assert.match(Object.values(aprendidas)[0], /buscar\?lang=es&texto=\{q\}/, 'aprende el buscador');
// sin resultado en el buscador → submenú de tarifas por familia
r = await buscarEnWebProveedor({ web: base, codigo: '', nombre: 'Compresor frigorífico Danfoss 2HP' }, dep());
assert.ok(r.ok && r.via === 'categoria' && r.url.endsWith('comp.jpg') && r.precio === 310, JSON.stringify(r));
// no existe
r = await buscarEnWebProveedor({ web: base, codigo: 'ZZZ', nombre: 'Artículo inexistente raro' }, dep());
assert.equal(r.ok, false);
// web caída
r = await buscarEnWebProveedor({ web: 'http://127.0.0.1:1', codigo: 'A1', nombre: 'x' }, dep());
assert.equal(r.ok, false);
// buscando por código y la tarjeta no escribe el código: con un solo resultado se acepta
const uno = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'); r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(u.pathname === '/' ? portada : `<a href="/p/1"><img src="/i/foto.jpg" alt="Pieza genérica"></a> 9,99 €`); });
await new Promise((ok) => uno.listen(0, '127.0.0.1', ok));
r = await buscarEnWebProveedor({ web: `http://127.0.0.1:${uno.address().port}`, codigo: 'REF-77', nombre: 'Cosa' }, dep());
assert.ok(r.ok && r.precio === 9.99, JSON.stringify(r)); uno.close();
// varios resultados plausibles: en la descarga masiva (revisar) se devuelven para elegir; sin revisar se toma el mejor
const dos = http.createServer((q, r) => { const u = new URL(q.url, 'http://x'); r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(u.pathname === '/' ? portada : `<a href="/p/1"><img src="/i/a.jpg" alt="Válvula de expansión TGE 2"></a> 40,00 €<a href="/p/2"><img src="/i/b.jpg" alt="Válvula de expansión TGE 5"></a> 55,50 €`); });
await new Promise((ok) => dos.listen(0, '127.0.0.1', ok));
const wd = `http://127.0.0.1:${dos.address().port}`;
r = await buscarEnWebProveedor({ web: wd, codigo: '', nombre: 'Válvula de expansión' }, { ...dep(), revisar: true });
assert.equal(r.motivo, 'varias'); assert.equal(r.candidatas.length, 2); assert.deepEqual(r.candidatas.map((c) => c.precio).sort(), [40, 55.5]);
r = await buscarEnWebProveedor({ web: wd, codigo: '', nombre: 'Válvula de expansión' }, dep());
assert.ok(r.ok && r.titulo.startsWith('Válvula'), 'sin revisar elige el mejor y trae el título'); dos.close();
srv.close();
console.log('web proveedor OK');
