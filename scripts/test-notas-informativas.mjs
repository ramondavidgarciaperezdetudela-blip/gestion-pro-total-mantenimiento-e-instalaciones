import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
// Node 18 no trae crypto global (los navegadores sí).
if (!globalThis.crypto) globalThis.crypto = webcrypto;
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
// Personalización
import { personalizar, datosDeNota, actualizarPendientes, sincronizarDocumentos, esMarcadorAutomatico } from '../src/lib/notasInformativas.js';
const d = datosDeNota({ cliente: { name: 'Ana', surname: 'Gil', phone: '600', email: 'ana@x.es' }, empresa: { company_name: 'Frío SL', phone: '971000000', email: 'info@frio.es' }, remitente: 'David García' });
assert.equal(personalizar('Estimado/a [nombre de cliente], de [Nombre de tu EMPRESA]', d), 'Estimado/a Ana Gil, de Frío SL');
assert.equal(personalizar('{Nombre del cliente} y [NOMBRE DE LA EMPRESA]', d), 'Ana Gil y Frío SL');
assert.equal(personalizar('Un saludo,\n[Tu nombre]\n[Teléfono / Correo electrónico]', d), 'Un saludo,\nDavid García\n971000000 / info@frio.es');
assert.equal(personalizar('[TELÉFONO] [correo electrónico] [teléfono del cliente]', d), '971000000 info@frio.es 600');
assert.equal(personalizar('[Tu nombre]', datosDeNota({ empresa: { company_name: 'Frío SL' } })), 'Frío SL');   // sin usuario firma la empresa
assert.equal(personalizar('[Teléfono / Correo electrónico]', datosDeNota({})), '[Teléfono / Correo electrónico]');  // sin dato, se queda
assert.match(personalizar('Palma, [fecha]', datosDeNota({ fecha: new Date(2026, 10, 13) })), /Palma, 13 de noviembre de 2026/);
assert.equal(personalizar('Del [FECHA DEL CAMBIO]', d), 'Del [FECHA DEL CAMBIO]');   // otras fechas siguen siendo huecos
assert.equal(personalizar('[nombre de cliente]', { cliente: '' }), '[nombre de cliente]');   // sin dato, se queda
assert.equal(personalizar('Del [FECHA DE INICIO] al [OTRO]', d), 'Del [FECHA DE INICIO] al [OTRO]');            // otros huecos no se tocan
assert.ok(esMarcadorAutomatico('[Nombre de tu empresa]') && !esMarcadorAutomatico('[FECHA DEL CAMBIO]') && esMarcadorAutomatico('[fecha]'));
const nota2 = { id: 'n2', title: 'Aviso a [nombre de cliente]', body: 'Hola [nombre de cliente], le escribe [nombre de tu empresa].\n[Tu nombre] · [Teléfono / Correo electrónico]' };
const masivo = crearEnvios(nota2, [{ id: 'k1', name: 'Ana', surname: 'Gil' }, { id: 'k2', name: 'Luis', surname: 'Pons' }], [], { empresa: { company_name: 'Frío SL', phone: '971', email: 'a@b.es' }, remitente: 'David' });
assert.equal(masivo[0].nota_body, 'Hola Ana Gil, le escribe Frío SL.\nDavid · 971 / a@b.es');
assert.equal(masivo[1].nota_body, 'Hola Luis Pons, le escribe Frío SL.\nDavid · 971 / a@b.es');                    // cada una con SU nombre
assert.equal(masivo[1].nota_title, 'Aviso a Luis Pons');
// Ficha: pendiente al preparar y la MISMA ficha pasa a firmada
const docs = new Map(); let seq = 0; const upd = [];
const b44 = { entities: {
  ClientDocument: { create: async (x) => { const id = 'd' + (++seq); docs.set(id, { id, ...x }); return { id }; }, update: async (id, x) => { docs.set(id, { ...docs.get(id), ...x }); } },
  NotaEnvio: { update: async (id, x) => { upd.push([id, x]); } } } };
const e1 = { ...masivo[0], id: 'e1', created_date: '2026-11-13T08:00:00Z' };
await sincronizarDocumentos(b44, [e1]);
assert.equal(docs.size, 1); assert.match(docs.get('d1').title, /pendiente de firma/); assert.equal(docs.get('d1').contact_id, 'k1');
assert.equal((await sincronizarDocumentos(b44, [e1])).length, 0); assert.equal(docs.size, 1);  // idempotente
const f1 = { ...e1, status: 'firmada', signed_at: '2026-11-14T10:00:00Z', signature_via: 'enlace' };
const nuevas = await sincronizarDocumentos(b44, [f1]);
assert.equal(nuevas.length, 1); assert.equal(docs.size, 1);                                  // no duplica
assert.match(docs.get('d1').title, /firmada/); assert.match(docs.get('d1').description, /firmada el/);
assert.equal((await sincronizarDocumentos(b44, [f1])).length, 0);
const r = await registrarFirma(b44, { ...masivo[1], id: 'e9' }, { signature: 'data:image/png;base64,B', via: 'pantalla' });
assert.equal(r.status, 'firmada'); assert.equal(docs.size, 2);
// Editar la nota: se rehacen los pendientes, no los firmados
const cambios = [];
const b45 = { entities: { NotaEnvio: { update: async (id, x) => { cambios.push([id, x]); } }, ClientDocument: { update: async () => {} } } };
const n = await actualizarPendientes(b45, { id: 'n2', title: 'Nuevo', body: 'Cambio para [nombre de cliente]' },
  [{ id: 'p1', nota_id: 'n2', contact_id: 'k1', status: 'pendiente', client_doc_id: 'd1' }, { id: 'p2', nota_id: 'n2', contact_id: 'k2', status: 'firmada' }],
  [{ id: 'k1', name: 'Ana', surname: 'Gil' }, { id: 'k2', name: 'Luis' }], { empresa: { company_name: 'Frío SL' }, remitente: 'David' });
assert.equal(n, 1); assert.equal(cambios[0][1].nota_body, 'Cambio para Ana Gil');
console.log('notas-informativas OK');
