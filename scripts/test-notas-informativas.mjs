import assert from 'node:assert/strict';
import { textoAHtml, crearEnvios, enlaceNota, resumenEnvios, htmlNotaFirmada, leerNotaIA, documentoDeFicha, sincronizarFirmadas, registrarFirma, mensajeNota } from '../src/lib/notasInformativas.js';
// XSS: el texto se escapa
assert.ok(!textoAHtml('<script>x</script>\n\nhola').includes('<script>'));
assert.equal((textoAHtml('a\n\nb').match(/<p /g) || []).length, 2);
const nota = { id: 'n1', title: 'Cierre agosto', body: 'Cerramos.' };
const cs = [{ id: 'c1', name: 'Ana', surname: 'Gil', email: 'a@x.es', phone: '600' }, { id: 'c2', name: 'Luis' }, { id: 'c1', name: 'Ana' }];
const envs = crearEnvios(nota, cs);
assert.equal(envs.length, 2); assert.ok(envs[0].token.length >= 32); assert.notEqual(envs[0].token, envs[1].token);
assert.equal(envs[0].nota_body, 'Cerramos.');                      // copia del texto
assert.equal(crearEnvios(nota, cs, [{ nota_id: 'n1', contact_id: 'c1' }]).length, 1); // no repite
assert.equal(enlaceNota('https://x.es/', { id: 'e1', token: 't' }), 'https://x.es/nota-publica?id=e1&t=t');
assert.equal(enlaceNota('', { id: 'e1', token: 't' }), '');
assert.deepEqual(resumenEnvios([{ status: 'firmada' }, { status: 'pendiente' }]), { total: 2, firmadas: 1, pendientes: 1 });
assert.ok(mensajeNota({ envio: envs[0], empresa: { company_name: 'GPT' }, enlace: 'L' }).cuerpo.includes('L'));
const f = { ...envs[0], id: 'e1', status: 'firmada', signed_at: '2026-11-13T10:00:00Z', signature: 'data:image/png;base64,AAA', signature_via: 'enlace' };
const h = htmlNotaFirmada({ envio: f, empresa: { company_name: 'GPT' } });
assert.ok(h.includes('LEÍDA Y FIRMADA') && h.includes('data:image/png'));
assert.ok(htmlNotaFirmada({ envio: { ...f, signature: 'javascript:x', status: 'firmada' }, empresa: {} }).includes('<img') === false);
assert.ok(htmlNotaFirmada({ envio: envs[0], empresa: {} }).includes('PENDIENTE DE FIRMA'));
assert.equal(leerNotaIA('{"titulo":"T","cuerpo":"<b>C</b>"}').cuerpo, 'C');
assert.equal(documentoDeFicha(f).doc_type, 'nota_informativa');
// Sincronizar: archiva en la ficha solo las firmadas sin archivar
const creados = []; const actual = [];
const b44 = { entities: { ClientDocument: { create: async (d) => { creados.push(d); return { id: 'd' + creados.length }; } }, NotaEnvio: { update: async (id, d) => { actual.push([id, d]); } } } };
const h2 = await sincronizarFirmadas(b44, [f, { ...f, id: 'e2', client_doc_id: 'x' }, { ...f, id: 'e3', status: 'pendiente' }]);
assert.equal(h2.length, 1); assert.equal(creados.length, 1); assert.equal(actual[0][0], 'e1');
const r = await registrarFirma(b44, { ...envs[1], id: 'e9' }, { signature: 'data:image/png;base64,B', via: 'pantalla' });
assert.equal(r.status, 'firmada'); assert.equal(creados[1].reference_id, 'e9');
console.log('notas-informativas OK');
