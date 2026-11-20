import assert from 'node:assert/strict';
import { rescatarCopiaDanada } from '../src/lib/copiaFormato.js';
const reg = (n, extra = '') => ({ id: 'r' + n, name: 'Cliente "' + n + '" } , {' + extra });
const sec = (nombre, regs) => `,\n${JSON.stringify(nombre)}:[${regs.map((r) => JSON.stringify(r)).join(',')}]`;
const cab = '{\n"exported_at":"2026-11-20","version":"3.0",\n"config_local":{"a":{"b":1}}';
const A = [reg(1), reg(2), reg(3)]; const B = [reg(4), reg(5), reg(6)]; const C = [reg(7), reg(8)];
const bueno = cab + sec('Contact', A) + sec('Invoice', B) + sec('Project', C) + '\n}\n';
assert.doesNotThrow(() => JSON.parse(bueno));
let r = rescatarCopiaDanada(bueno);
assert.equal(r.registros, 8); assert.deepEqual(r.danadas, []); assert.equal(r.datos.config_local.a.b, 1);
// 1) Roto en medio de un registro de la 2ª sección (falta una coma y llaves): se pierde solo ese registro
const roto = bueno.replace('"id":"r5"', '"id":"r5" "x"');
assert.throws(() => JSON.parse(roto));
r = rescatarCopiaDanada(roto);
assert.equal(r.datos.Contact.length, 3); assert.equal(r.datos.Invoice.length, 2); assert.equal(r.datos.Project.length, 2);
assert.deepEqual(r.danadas, ['Invoice']); assert.equal(r.registros, 7);
// 2) Cortado a mitad (el programa se cerró): se recupera todo lo anterior
const corte = bueno.slice(0, bueno.indexOf('"id":"r5"') + 5);
r = rescatarCopiaDanada(corte);
assert.equal(r.datos.Contact.length, 3); assert.equal(r.datos.Invoice.length, 1); assert.equal(r.perdidaFinal, true); assert.deepEqual(r.danadas, ['Invoice']);
// 3) No es una copia
assert.equal(rescatarCopiaDanada('hola'), null);
console.log('copia dañada: OK');
