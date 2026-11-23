import { escribirArchivos, leerCopiaDeFichero, urlsEnTexto, remapearUrls, MARCA, indexarCopia, leerSeccion, leerArchivosDesde, copiaPideSecciones } from '../src/lib/archivosCopia.js';
import { normalizarCopia } from '../src/lib/copiaFormato.js';
import crypto from 'node:crypto';
const ok = (c, m) => { if (!c) { console.error('FALLO:', m); process.exit(1); } };
const sha = async (b) => crypto.createHash('sha256').update(Buffer.from(await b.arrayBuffer())).digest('hex');
const rnd = (n) => new Blob([crypto.randomBytes(n)]);
const a = rnd(10 * 1024 * 1024 + 7), b = rnd(5), c = rnd(0);
const items = [a, b, c].map((blob, i) => ({ id: `gptblob:${i}`, nombre: `f"${i}".pdf`, tipo: 'application/pdf', origen: 'local', abrir: async () => ({ reader: blob.stream().getReader(), bytes: blob.size }) }));
items.push({ id: 'roto', nombre: 'x', origen: 'servidor', abrir: async () => { throw new Error('404'); } });
const partes = ['{\n"version":"3.0"', ',\n"Client":[{"id":1,"u":"gptblob:0"}]'];
const r = await escribirArchivos(async (t) => { partes.push(t); }, items);
partes.push('\n}\n');
ok(r.n === 3 && r.fallos.length === 1, 'n/fallos');
const fichero = new Blob(partes);
const L = await leerCopiaDeFichero(fichero);
const j = JSON.parse(L.texto); ok(j.Client[0].id === 1 && !('__archivos_grandes' in j), 'datos');
ok(L.archivos.length === 3, 'archivos ' + L.archivos.length);
for (const [i, orig] of [a, b, c].entries()) ok(await sha(L.archivos[i].blob) === await sha(orig), 'sha ' + i);
ok(L.archivos[0].nombre === 'f"0".pdf', 'nombre');
// el fichero completo es JSON válido (lo leen versiones antiguas)
const completo = JSON.parse(await fichero.text()); ok(Array.isArray(completo.__archivos_grandes), 'json válido');
ok(normalizarCopia(completo, ['Client']).datos.Client.length === 1, 'normalizar');
// copia antigua (sin sección) idéntica
const vieja = new Blob(['﻿{"Client":[{"id":2}],"version":"2"}']);
const V = await leerCopiaDeFichero(vieja); ok(V.archivos.length === 0 && JSON.parse(V.texto.replace(/^﻿/, '')).Client[0].id === 2, 'vieja');
// sin archivos: no se escribe nada
const vacio = []; const r0 = await escribirArchivos(async (t) => vacio.push(t), []); ok(r0.n === 0 && !vacio.length, 'vacío');
ok([...urlsEnTexto('{"u":"http://h:1/archivos/a-b.pdf","v":"http://h:1/archivos/c%20d.xlsx"}', 'http://h:1/')].length === 2, 'urls');
const datos = { Client: [{ id: 1, u: 'http://h:1/archivos/a.pdf', o: 'gptblob:0' }] };
ok(remapearUrls(datos, { 'http://h:1/archivos/a.pdf': 'http://z/archivos/n.pdf', 'gptblob:0': 'data:x' }) === 1 && datos.Client[0].u === 'http://z/archivos/n.pdf' && datos.Client[0].o === 'data:x', 'remap');
// Lectura por secciones (copias grandes en tablets)
{
  const regs = (n, t) => Array.from({ length: n }, (_, i) => ({ id: i, t, texto: 'línea\ncon salto "y comillas", y coma' }));
  const trozos = ['{\n"version":"3.0",\n"app":"x"'];
  trozos.push(`,\n"Client":${JSON.stringify(regs(50, 'c'))}`); trozos.push(`,\n"Supplier":${JSON.stringify(regs(7, 's'))}`); trozos.push(',\n"Vacia":[]'); trozos.push(',\n"config_local":{"a":"1"}');
  const arch = []; await escribirArchivos(async (t) => { arch.push(t); }, items.slice(0, 2));
  const f2 = new Blob([...trozos, ...arch, '\n}\n']);
  const idx = await indexarCopia(f2);
  ok(idx && idx.secciones.Client.n === 50 && idx.secciones.Supplier.n === 7 && idx.secciones.Vacia.n === 0 && idx.cabecera.version === '3.0' && idx.cabecera.config_local.a === '1', 'índice');
  ok(JSON.stringify(await leerSeccion(f2, idx.secciones.Supplier, 'Supplier')) === JSON.stringify(regs(7, 's')), 'sección');
  const metas = []; await leerArchivosDesde(f2, idx.archivosIni, async (a) => { metas.push(a.nombre + a.blob.size); return {}; });
  ok(metas.length === 2, 'archivos desde índice');
  ok(copiaPideSecciones({ size: 50e6, slice() {}, stream() {} }) && !copiaPideSecciones({ size: 5e6, slice() {}, stream() {} }), 'umbral');
  // un salto de línea suelto dentro de un texto mal formado → no se fía del índice
  ok((await indexarCopia(new Blob(['{"a":1,\nX]']))) === null, 'forma rara');
}
console.log('copia-archivos OK');
