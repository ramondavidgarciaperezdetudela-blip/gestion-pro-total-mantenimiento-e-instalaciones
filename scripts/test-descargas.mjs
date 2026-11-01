import assert from 'node:assert/strict';
globalThis.fetch = async () => { throw new Error('sin red'); };
const d = await import('../src/lib/descargas.js');
const f = await import('../src/lib/fuentesDirectas.js');

assert.equal(d.porcentaje(1, 4), 25); assert.equal(d.porcentaje(5, 4), 100); assert.equal(d.porcentaje(1, 0), 0);

// La tarea aparece con porcentaje y desaparece sola al terminar.
let vista = [];
d.suscribirDescargas((l) => { vista = l; });
const r = await d.procesarPorLotes([1, 2, 3, 4], async (x) => { assert.ok(vista.length === 1); return x * 2; }, { titulo: 'T', concurrencia: 2 });
assert.deepEqual(r.resultados, [2, 4, 6, 8]);
assert.equal(vista[0].pct, 100); assert.equal(vista[0].estado, 'hecha');
await new Promise((ok) => setTimeout(ok, 1700));
assert.equal(vista.length, 0, 'la barra debe desaparecer al acabar');

// Un fallo no frena al resto.
const r2 = await d.procesarPorLotes([1, 2, 3], async (x) => { if (x === 2) throw new Error('x'); return x; }, { titulo: 'F' });
assert.equal(r2.fallos, 1); assert.deepEqual(r2.resultados, [1, null, 3]);

// Cancelar.
const r3 = await d.procesarPorLotes([1, 2, 3, 4, 5], async (x) => { if (x === 2) d.cancelarTarea(vista[vista.length - 1].id); return x; }, { titulo: 'C', concurrencia: 1 });
assert.equal(r3.cancelada, true);

// Ceder el hilo: un temporizador debe poder dispararse durante un proceso largo.
let latidos = 0; const t = setInterval(() => latidos++, 1);
await d.procesarPorLotes(Array.from({ length: 200 }, (_, i) => i), async () => { const e = Date.now(); while (Date.now() - e < 1); }, { titulo: 'L', concurrencia: 1 });
clearInterval(t); assert.ok(latidos > 20, `el hilo debe cederse (latidos ${latidos})`);

// Parsers.
assert.equal(f.primeraImagenDeWikimedia({ query: { pages: { 1: { index: 2, imageinfo: [{ mime: 'image/png', url: 'b' }] }, 2: { index: 1, imageinfo: [{ mime: 'image/jpeg', thumburl: 'a' }] } } } }), 'a');
assert.equal(f.primeraImagenDeWikimedia({}), null);
const csv = 'Código;Descripción;Precio\nA1;Tubo;"1.234,50"\nB2;Válvula;9,9\n';
const filas = f.normalizarTarifa(f.parsearCSV(csv));
assert.deepEqual(filas.map((x) => [x.codigo, x.precio]), [['A1', 1234.5], ['B2', 9.9]]);
assert.deepEqual(f.normalizarTarifa([{ sku: 'z', price: 3 }]).map((x) => x.precio), [3]);
const cam = f.cambiosDePrecio([{ id: 1, product_code: 'a1', cost_price: 1000 }, { id: 2, product_code: 'B2', cost_price: 9.9 }], filas);
assert.deepEqual(cam, [{ id: 1, antes: 1000, despues: 1234.5 }]);
const boe = { data: { sumario: { diario: [{ seccion: [{ item: [{ identificador: 'BOE-A-1', titulo: 'Reglamento de instalaciones frigoríficas', url_pdf: { texto: 'u' } }, { identificador: 'BOE-A-2', titulo: 'Premios literarios' }] }] }] } } };
assert.deepEqual(f.filtrarSumarioBOE(boe).map((x) => x.id), ['BOE-A-1']);
assert.equal(f.fechaBOE(new Date(2026, 0, 5)), '20260105');
console.log('descargas OK');
