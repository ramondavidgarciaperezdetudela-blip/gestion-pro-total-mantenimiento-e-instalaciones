import assert from 'node:assert/strict';
import { normalizarCopia, limpiarTexto, motivoCopiaIlegible } from '../src/lib/copiaFormato.js';
const conocidas = ['Contact', 'SATOrder'];
// Copia actual
let r = normalizarCopia({ version: '3.0', app: 'TechManager Pro', Contact: [{ id: 1 }], SATOrder: [] }, conocidas);
assert.deepEqual(r.secciones, ['Contact']); assert.equal(r.cabecera.app, 'TechManager Pro');
// Versión antigua con envoltorio y otro nombre de app y otra capitalización
r = normalizarCopia({ version: '1.0', app: 'Otro', data: { contact: [{ id: 1 }, { id: 2 }], Nueva: { items: [{ a: 1 }] } } }, conocidas);
assert.deepEqual(r.secciones.sort(), ['Contact', 'Nueva']); assert.equal(r.datos.Contact.length, 2);
// Sin versión ni app
assert.deepEqual(normalizarCopia({ SATOrder: [{ id: 1 }] }, conocidas).secciones, ['SATOrder']);
// Nada reconocible
assert.deepEqual(normalizarCopia({ version: '9' }, conocidas).secciones, []);
assert.deepEqual(normalizarCopia([1], conocidas).secciones, []);
assert.equal(limpiarTexto('﻿ {"a":1} '), '{"a":1}');
assert.match(motivoCopiaIlegible('{"a": [1,', new Error('x')), /incompleto/);
assert.match(motivoCopiaIlegible('PK\u0003', new Error('x')), /ZIP/);
assert.match(motivoCopiaIlegible('', null), /vacío/);
console.log('copia-formato OK');
