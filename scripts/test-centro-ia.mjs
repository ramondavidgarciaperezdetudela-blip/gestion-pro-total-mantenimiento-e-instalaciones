import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parsePermiso, normalizaPermisos, permitido, quitaCamposSensibles, tieneCamposSensibles, describePermiso } from '../src/lib/iaModulos/permisos.js';
import { validarModulo, validarSkill, validarPeticion, extraerRespuesta, documentoDelModulo, cuerpoDelModulo } from '../src/lib/iaModulos/modulo.js';
import { crearPuente, urlDelConector } from '../src/lib/iaModulos/puente.js';
import { exportarComplemento, leerComplemento, nombreLibre, validarConector } from '../src/lib/iaModulos/complementos.js';
import { llamarClaude, ajustesClaude, guardarAjustesClaude, hayClave, mensajeDeError } from '../src/lib/iaModulos/claude.js';
import { construirSistema, recortarHistorial } from '../src/lib/iaModulos/promptIA.js';

const rechaza = async (p, re) => { await assert.rejects(p, re); };

// ── permisos ──
assert.deepEqual(parsePermiso('leer:Contact'), { accion: 'leer', objetivo: 'Contact' });
assert.deepEqual(parsePermiso('ia'), { accion: 'ia', objetivo: '' });
assert.equal(parsePermiso('leer:User'), null);
assert.equal(parsePermiso('leer:CompanySettings'), null);
assert.equal(parsePermiso('borrar:ModuloIA'), null);
assert.equal(parsePermiso('todo:Contact'), null);
assert.equal(parsePermiso('leer:../x'), null);
assert.equal(parsePermiso('http:Mi Webhook').accion, 'http');
const np = normalizaPermisos(['leer:Contact', 'leer:Contact', 'leer:User', 'ia', 'xx']);
assert.deepEqual(np.validos, ['leer:Contact', 'ia']);
assert.deepEqual(np.rechazados, ['leer:User', 'xx']);
assert.ok(permitido(['leer:Contact'], 'leer', 'Contact'));
assert.ok(!permitido(['leer:Contact'], 'crear', 'Contact'));
assert.ok(permitido(['ia'], 'ia'));
assert.deepEqual(quitaCamposSensibles({ name: 'a', api_key: 'x', n: [{ password: 1, ok: 2 }] }), { name: 'a', n: [{ ok: 2 }] });
assert.ok(tieneCamposSensibles({ a: { token: 1 } }));
assert.ok(!tieneCamposSensibles({ a: { nombre: 1 } }));
assert.match(describePermiso('borrar:Contact'), /Borrar registros de «Contact»/);

// ── módulo ──
assert.equal(validarModulo({ nombre: '', html: 'x' }).ok, false);
assert.equal(validarModulo({ nombre: 'a', html: '' }).ok, false);
assert.equal(validarModulo({ nombre: 'a', html: 'x'.repeat(400 * 1024 + 1) }).ok, false);
const vm = validarModulo({ nombre: ' Mi módulo ', html: '<p>hola</p>', permisos: ['leer:Contact', 'leer:User'] });
assert.ok(vm.ok); assert.equal(vm.modulo.nombre, 'Mi módulo'); assert.deepEqual(vm.modulo.permisos, ['leer:Contact']); assert.equal(vm.avisos.length, 1);
assert.equal(validarSkill({ nombre: 'x', instrucciones: '' }).ok, false);
assert.ok(validarSkill({ nombre: 'x', instrucciones: 'hazlo así' }).ok);
assert.ok(validarPeticion({ titulo: 't', detalle: 'd' }).ok);
assert.equal(validarPeticion({ titulo: 't' }).ok, false);

const r1 = extraerRespuesta('Te lo creo.\n```gpt-modulo\n{"nombre":"A","html":"<b>x</b>","permisos":[]}\n```\nListo.');
assert.equal(r1.tipo, 'modulo'); assert.equal(r1.datos.nombre, 'A'); assert.match(r1.texto, /Te lo creo\.\s*Listo\./);
assert.equal(extraerRespuesta('solo texto').tipo, undefined);
assert.ok(extraerRespuesta('```gpt-skill\n{roto\n```').error);
assert.equal(extraerRespuesta('```gpt-peticion_cambio\n{"titulo":"a","detalle":"b"}\n```').tipo, 'peticion_cambio');

assert.equal(cuerpoDelModulo('<!doctype html><html><head><style>a{}</style></head><body><p>x</p></body></html>').includes('<html'), false);
assert.match(cuerpoDelModulo('<!doctype html><html><head><style>a{}</style></head><body><p>x</p></body></html>'), /<style>a\{\}<\/style>[\s\S]*<p>x<\/p>/);
const doc = documentoDelModulo({ html: '<p>hola</p><script>GPT.aviso("a")</script>' });
assert.ok(doc.indexOf('Content-Security-Policy') < doc.indexOf('window.GPT'));
assert.ok(doc.indexOf('window.GPT') < doc.indexOf('<p>hola</p>'));
assert.match(doc, /default-src 'none'/);
assert.ok(!/connect-src/.test(doc)); // sin connect-src cae en default-src 'none': no hay red

// ── puente ──
const guardados = [];
const tablas = {
  Contact: [{ id: 'c1', name: 'Ana', api_key: 'SECRETO' }, { id: 'c2', name: 'Luis' }],
  DatoModulo: []
};
const base44 = { entities: new Proxy({}, { get: (_, n) => ({
  async list(o, l) { return (tablas[n] || []).slice(0, l); },
  async filter(q, o, l) { return (tablas[n] || []).filter((r) => Object.entries(q).every(([k, v]) => r[k] === v)).slice(0, l || 999); },
  async get(id) { return (tablas[n] || []).find((r) => r.id === id); },
  async create(d) { const r = { id: 'n' + (tablas[n]?.length || 0), ...d }; (tablas[n] ||= []).push(r); guardados.push(['crear', n, d]); return r; },
  async update(id, d) { guardados.push(['editar', n, id, d]); const r = tablas[n].find((x) => x.id === id); Object.assign(r, d); return r; },
  async delete(id) { guardados.push(['borrar', n, id]); tablas[n] = tablas[n].filter((x) => x.id !== id); }
}) }) };
const avisos = []; const paginas = [];
const mk = (extra = {}) => crearPuente({ base44, modulo: { id: 'mod1' }, concedidos: ['leer:Contact', 'crear:Contact', 'ia', 'http:Hook'], avisar: (t, k) => avisos.push([t, k]), irA: (p) => paginas.push(p), ...extra });

const p = mk();
const lista = await p('listar', { entidad: 'Contact', limite: 1 });
assert.equal(lista.length, 1); assert.equal('api_key' in lista[0], false);
assert.equal((await p('listar', { entidad: 'Contact', filtro: { name: 'Luis' } }))[0].id, 'c2');
assert.equal((await p('obtener', { entidad: 'Contact', id: 'c1' })).name, 'Ana');
await rechaza(p('listar', { entidad: 'Supplier' }), /no tiene permiso/);
await rechaza(p('listar', { entidad: 'User' }), /no está disponible/);
await rechaza(p('listar', { entidad: 'DatoModulo' }), /no está disponible/);
await rechaza(p('editar', { entidad: 'Contact', id: 'c1', datos: { name: 'x' } }), /no tiene permiso/);
await rechaza(p('borrar', { entidad: 'Contact', id: 'c1' }), /no tiene permiso/);
await rechaza(p('crear', { entidad: 'Contact', datos: { name: 'x', password: '1' } }), /contraseñas/);
await rechaza(p('crear', { entidad: 'Contact', datos: 'texto' }), /objeto/);
await rechaza(p('hackear', {}), /desconocida/);
await rechaza(p('constructor', {}), /desconocida/);
await rechaza(p('listar', { entidad: '__proto__' }), /Nombre de entidad/);
await p('crear', { entidad: 'Contact', datos: { name: 'Nuevo' } });
assert.deepEqual(guardados.at(-1), ['crear', 'Contact', { name: 'Nuevo' }]);

// almacenamiento propio
await p('guardar', { coleccion: 'notas', clave: 'a', datos: { t: 1 } });
await p('guardar', { coleccion: 'notas', clave: 'a', datos: { t: 2 } });
assert.deepEqual(await p('leer', { coleccion: 'notas', clave: 'a' }), { t: 2 });
assert.equal(tablas.DatoModulo.length, 1);
assert.equal((await p('listarColeccion', { coleccion: 'notas' })).length, 1);
await p('borrarDato', { coleccion: 'notas', clave: 'a' });
assert.equal(await p('leer', { coleccion: 'notas', clave: 'a' }), null);
await rechaza(p('guardar', { coleccion: '../x', clave: 'a', datos: {} }), /no válido/);

// modo prueba: lee real, escribe simulado
const antes = guardados.length;
const pp = mk({ modoPrueba: true, concedidos: ['leer:Contact', 'crear:Contact', 'editar:Contact', 'borrar:Contact'] });
assert.equal((await pp('crear', { entidad: 'Contact', datos: { name: 'Z' } })).simulado, true);
assert.equal((await pp('editar', { entidad: 'Contact', id: 'c1', datos: { name: 'Z' } })).simulado, true);
assert.equal((await pp('borrar', { entidad: 'Contact', id: 'c1' })).simulado, true);
assert.equal(guardados.length, antes);
assert.equal((await pp('listar', { entidad: 'Contact' })).length, 3);
await pp('guardar', { coleccion: 'k', clave: 'a', datos: { v: 1 } });
assert.deepEqual(await pp('leer', { coleccion: 'k', clave: 'a' }), { v: 1 });
assert.equal(tablas.DatoModulo.length, 0);

// http por conector
assert.equal(urlDelConector({ url_base: 'https://api.ejemplo.com/' }, '/v1/x'), 'https://api.ejemplo.com/v1/x');
assert.throws(() => urlDelConector({ url_base: 'http://api.ejemplo.com' }, '/x'), /https/);
assert.throws(() => urlDelConector({ url_base: 'https://a.com' }, '//evil.com'), /no permitida/);
assert.throws(() => urlDelConector({ url_base: 'https://a.com' }, '/../x'), /no permitida/);
assert.throws(() => urlDelConector({ url_base: 'https://a.com' }, 'https://evil.com'), /empezar por/);
const llamadas = [];
const fetchFalso = async (url, o) => { llamadas.push([url, o]); return { status: 200, ok: true, text: async () => '{"hola":1}' }; };
const ph = mk({ conectores: [{ nombre: 'Hook', url_base: 'https://h.example.com', cabecera_nombre: 'X-Key', activo: true }], secretoDe: () => 'S3', fetchFn: fetchFalso });
const resp = await ph('http', { conector: 'Hook', metodo: 'post', ruta: '/in', cuerpo: { a: 1 } });
assert.deepEqual(resp.datos, { hola: 1 });
assert.equal(llamadas[0][0], 'https://h.example.com/in');
assert.equal(llamadas[0][1].headers['X-Key'], 'S3');
assert.equal(llamadas[0][1].redirect, 'error');
await rechaza(ph('http', { conector: 'Otro' }), /no tiene permiso/);
await rechaza(mk({ concedidos: ['http:Hook'], conectores: [] })('http', { conector: 'Hook' }), /no existe/);
const pph = mk({ modoPrueba: true, conectores: [{ nombre: 'Hook', url_base: 'https://h.example.com' }], fetchFn: fetchFalso });
llamadas.length = 0;
assert.equal((await pph('http', { conector: 'Hook', metodo: 'POST', ruta: '/in', cuerpo: {} })).simulado, true);
assert.equal(llamadas.length, 0);

// ia, aviso, irA
await rechaza(mk({ concedidos: [] })('ia', { pregunta: 'hola' }), /permiso/);
await rechaza(mk()('ia', { pregunta: 'hola' }), /no está configurada/);
const pi = mk({ preguntarIA: async (q) => 'resp:' + q });
assert.equal(await pi('ia', { pregunta: 'hola' }), 'resp:hola');
for (let i = 0; i < 19; i++) await pi('ia', { pregunta: 'x' });
await rechaza(pi('ia', { pregunta: 'x' }), /demasiadas/);
await p('aviso', { texto: 'hecho', tipo: 'ok' }); assert.deepEqual(avisos.at(-1), ['hecho', 'ok']);
await p('irA', { pagina: 'Contacts' }); assert.equal(paginas.at(-1), 'Contacts');
await rechaza(p('irA', { pagina: 'javascript:alert(1)' }), /no válida/);
await rechaza(p('irA', { pagina: '//evil.com' }), /no válida/);

// ── complementos ──
const paquete = exportarComplemento({
  modulos: [{ id: 'x', nombre: 'M1', html: '<p>1</p>', permisos: ['leer:Contact'], permisos_concedidos: ['leer:Contact'] }],
  skills: [{ id: 's', nombre: 'S1', instrucciones: 'haz esto', activo: true }],
  conectores: [{ id: 'k', nombre: 'Hook', tipo: 'http', url_base: 'https://h.example.com', cabecera_nombre: 'X-Key', clave_secreta: 'NOPE' }]
}, 'Pack');
const texto = JSON.stringify(paquete);
assert.ok(!texto.includes('NOPE')); assert.ok(!texto.includes('permisos_concedidos')); assert.ok(!/"id":/.test(texto));
const leido = leerComplemento(texto);
assert.ok(leido.ok); assert.equal(leido.modulos.length, 1); assert.equal(leido.skills.length, 1); assert.equal(leido.conectores.length, 1);
assert.equal(leerComplemento('no json').ok, false);
assert.equal(leerComplemento('{"formato":"otro"}').ok, false);
assert.equal(leerComplemento(JSON.stringify({ formato: 'gpt-complemento', version: 99 })).ok, false);
assert.equal(leerComplemento(JSON.stringify({ formato: 'gpt-complemento', version: 1, modulos: [] })).ok, false);
const sucio = leerComplemento(JSON.stringify({ formato: 'gpt-complemento', version: 1, modulos: [{ nombre: 'A', html: '<p/>', permisos: ['leer:User', 'leer:Contact'] }, { nombre: '', html: 'x' }], conectores: [{ nombre: 'M', tipo: 'http', url_base: 'http://mal.com' }] }));
assert.ok(sucio.ok); assert.deepEqual(sucio.modulos[0].permisos, ['leer:Contact']); assert.ok(sucio.avisos.length >= 3);
assert.equal(nombreLibre('M1', ['m1', 'M1 (2)']), 'M1 (3)'); assert.equal(nombreLibre('Nuevo', ['M1']), 'Nuevo');
assert.equal(validarConector({ nombre: 'G', tipo: 'github', repo: 'a/b' }).ok, true);
assert.equal(validarConector({ nombre: 'G', tipo: 'github', repo: 'ab' }).ok, false);

// ── claude ──
const mem = new Map(); const alm = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
assert.equal(hayClave(ajustesClaude(alm)), false);
guardarAjustesClaude({ clave: 'sk-ant-abc' }, alm);
assert.equal(hayClave(ajustesClaude(alm)), true);
assert.equal(ajustesClaude(alm).modelo, 'claude-sonnet-5-5');
let ultima;
const okFetch = async (url, o) => { ultima = [url, o]; return { ok: true, status: 200, text: async () => JSON.stringify({ content: [{ type: 'text', text: 'hola' }] }) }; };
assert.equal(await llamarClaude({ system: 's', messages: [{ role: 'user', content: 'q' }] }, ajustesClaude(alm), okFetch), 'hola');
assert.equal(ultima[1].headers['x-api-key'], 'sk-ant-abc');
assert.equal(ultima[1].headers['anthropic-dangerous-direct-browser-access'], 'true');
assert.equal(JSON.parse(ultima[1].body).model, 'claude-sonnet-5-5');
await rechaza(llamarClaude({ messages: [] }, { clave: '', modelo: 'm' }, okFetch), /Falta la clave/);
await rechaza(llamarClaude({ messages: [] }, ajustesClaude(alm), async () => ({ ok: false, status: 401, text: async () => '{}' })), /clave de Anthropic no es válida/);
await rechaza(llamarClaude({ messages: [] }, ajustesClaude(alm), async () => { throw new Error('x'); }), /No se pudo conectar/);
assert.match(mensajeDeError(400, '{"error":{"message":"Your credit balance is too low"}}'), /sin saldo/);

// ── instrucciones ──
const cat = JSON.parse(fs.readFileSync('src/lib/iaModulos/catalogoEntidades.json', 'utf8'));
assert.ok(cat.Contact && cat.EquipmentDiary);
assert.ok(!JSON.stringify(cat).match(/password|api_key/i));
const sis = construirSistema({ catalogo: cat, skills: [{ nombre: 'Tono', instrucciones: 'trata de usted', activo: true }, { nombre: 'Off', instrucciones: 'NO', activo: false }], conectores: [{ nombre: 'Hook', url_base: 'https://h.example.com' }], modulo: { nombre: 'M', html: '<p>x</p>', permisos: [] } });
assert.match(sis, /gpt-modulo/); assert.match(sis, /Contact:/); assert.match(sis, /trata de usted/); assert.ok(!sis.includes('NO\n')); assert.match(sis, /Hook/); assert.match(sis, /MÓDULO QUE SE ESTÁ EDITANDO/);
const hist = recortarHistorial([{ role: 'assistant', content: 'a' }, { role: 'user', content: 'u'.repeat(50) }, { role: 'assistant', content: 'b'.repeat(50) }, { role: 'user', content: 'ultimo' }], 80);
assert.equal(hist[0].role, 'user'); assert.equal(hist.at(-1).content, 'ultimo');

console.log('centro IA: OK');
// El catálogo no enseña a la IA entidades prohibidas.
import { ENTIDADES_PROHIBIDAS } from '../src/lib/iaModulos/permisos.js';
for (const n of ENTIDADES_PROHIBIDAS) assert.ok(!(n in cat), 'catálogo con entidad prohibida: ' + n);
console.log('catálogo sin entidades prohibidas: OK');
