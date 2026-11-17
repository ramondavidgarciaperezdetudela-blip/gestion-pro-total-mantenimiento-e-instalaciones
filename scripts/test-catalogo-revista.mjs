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
console.log('Catálogo de revista: todo correcto');
