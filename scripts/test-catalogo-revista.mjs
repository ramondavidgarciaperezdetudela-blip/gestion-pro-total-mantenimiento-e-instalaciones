// Prueba del lector de catálogos de revista (fotos + tabla de precios) con una página sintética.
import assert from 'node:assert/strict';
import { articulosDePagina, esCodigoRevista, cajaDeMatriz } from '../src/lib/catalogoRevista.js';

const T = (t, x, y) => ({ t, x, y, w: t.length * 5 });
// Foto arriba, título, descripción y tabla: Variante | Código | Precio €
const trozos = [
  T('LADRILLO CARAVISTA', 130, 666), T('Pieza cerámica para fachada', 130, 650),
  T('Código', 175, 634), T('Precio', 240, 634),
  T('Rojo', 130, 620), T('10821986', 175, 620), T('0,26 €', 240, 620),
  T('Gris', 130, 604), T('10923073', 175, 604), T('0,80 €', 240, 604),
  T('LAMA DE MADERA', 130, 366), T('Para suelo exterior', 130, 350),
  T('Código', 175, 334), T('Precio', 240, 334),
  T('200x14', 130, 320), T('25032683', 175, 320), T('1.234,50 €', 240, 320),
];
const imagenes = [{ id: 'img_a', x: 130, y: 690, w: 120, h: 90 }, { id: 'img_b', x: 130, y: 390, w: 120, h: 90 }];
const r = articulosDePagina(trozos, imagenes);

assert.ok(esCodigoRevista('10821986')); assert.ok(!esCodigoRevista('0,26 €'));
assert.equal(r.length, 3, 'tres artículos');
const por = Object.fromEntries(r.map((a) => [a.product_code, a]));
assert.equal(por['10821986'].cost_price, 0.26);
assert.equal(por['10923073'].cost_price, 0.8);
assert.equal(por['25032683'].cost_price, 1234.5);
assert.match(por['10821986'].product_name, /LADRILLO CARAVISTA/);
assert.match(por['10821986'].product_name, /Rojo/);
assert.match(por['25032683'].product_name, /LAMA DE MADERA/);
assert.equal(por['10821986']._foto, 'img_a'); assert.equal(por['10923073']._foto, 'img_a');
assert.equal(por['25032683']._foto, 'img_b', 'cada bloque con su foto');
// imagen girada 90°
const c = cajaDeMatriz([0, 50, -80, 0, 100, 10]); assert.deepEqual([c.x, c.y, c.w, c.h], [20, 10, 80, 50]);

// misma descripción en otra medida → todas con la foto principal (la que más se repite)
const { compartirFotoPrincipal } = await import('../src/lib/catalogoRevistaPdf.js');
const { unirFotosPorCodigo } = await import('../src/lib/tarifaPdf.js');
const { nombreBase, consultas } = await import('../src/lib/imagenesProducto.js');
const mk = (c, img) => ({ product_code: c, image_url: img });
const A = [mk('1', 'F1'), mk('2', ''), mk('3', 'F1'), mk('4', 'F9'), mk('5', 'OTRO')];
const g = new Map([[A[0], 'x|d'], [A[1], 'x|d'], [A[2], 'x|d'], [A[3], 'x|d'], [A[4], 'y|d']]);
assert.equal(compartirFotoPrincipal(A, g), 5);
assert.deepEqual(A.map((a) => a.image_url), ['F1', 'F1', 'F1', 'F1', 'OTRO']);
const B = [mk('AB-1', ''), mk('zz', '')];
assert.equal(unirFotosPorCodigo(B, new Map([['ab-1', 'FOTO']])), 1); assert.equal(B[0].image_url, 'FOTO'); assert.equal(B[1].image_url, '');
// búsqueda de imágenes: por nombre sin medida y por descripción
assert.equal(nombreBase('LADRILLO CARAVISTA — 24x11.5x5 Rojo · Cepillado'), 'LADRILLO CARAVISTA');
const q = consultas({ codigo: '10821986', nombre: 'LADRILLO CARAVISTA', descripcion: 'Pieza cerámica para fachada', proveedor: 'Tarragona' }).map((x) => x.texto);
assert.ok(q.some((t) => t.includes('10821986')) && q.some((t) => t === 'LADRILLO CARAVISTA') && q.some((t) => t.includes('Pieza cerámica')), q.join(' | '));
console.log('Catálogo de revista: todo correcto');
