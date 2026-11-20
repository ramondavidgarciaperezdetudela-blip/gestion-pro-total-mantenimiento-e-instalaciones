import assert from 'node:assert/strict';
import { crearEscritorReanudable, nuevoDiario, leerDiario, guardarDiario, borrarDiario, pendientes, tamPaginaPara, EDAD_MAX } from '../src/lib/copiaReanudable.js';
import { escribirSeccionPorPaginas } from '../src/lib/escribirSeccion.js';

// "Teléfono": un solo fichero final en bytes; se escribe directamente en él.
let fichero = Buffer.alloc(0); let appends = 0; let maxAppend = 0;
const fs = {
  anadir: async (t) => { const b = Buffer.from(t, 'utf8'); maxAppend = Math.max(maxAppend, b.length); fichero = Buffer.concat([fichero, b]); appends++; },
  tamano: async () => fichero.length,
  recortar: async (n) => { fichero = fichero.subarray(0, n); },
  cerrar: async () => ({ ok: true, ruta: '/Documents/copia.json' }), cancelar: async () => { fichero = Buffer.alloc(0); },
};
const alm = (() => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; })();
const ENT = ['A', 'B', 'C']; const TOTAL = { A: 1200, B: 2500, C: 300 };
const registro = (e, i) => ({ id: `${e}${i}`, foto: 'x'.repeat(500), n: 'ñ🔧' });
const leerDe = (e, desde, tam, anadir) => async () => { let skip = desde, total = 0; for (;;) { const lote = []; for (let i = skip; i < Math.min(skip + tam, TOTAL[e]); i++) lote.push(registro(e, i)); if (!lote.length) break; await anadir(lote, skip + lote.length); total += lote.length; skip += lote.length; if (lote.length < tam) break; } return total; };

async function ejecutar(diario, { morirTrasPaginas = Infinity, tam = 500, cierreEnPleno = false } = {}) {
  const esc = crearEscritorReanudable({ fs, diario, guardar: (d) => guardarDiario(d, alm), umbral: 100_000 });
  if (diario.bytes > 0) assert.equal(await esc.comprobarFichero(), true);
  if (!diario.cabecera) { await esc.escribir('{\n"version":"3.0"'); await esc.punto({ cabecera: true }); }
  let paginas = 0;
  for (const ent of pendientes(diario)) {
    const rep = diario.actual?.ent === ent ? diario.actual : null;
    let acumulado = rep ? rep.n : 0;
    const n = await escribirSeccionPorPaginas(esc, ent, async (anadir) => {
      const total = await leerDe(ent, rep ? rep.skip : 0, tam, async (regs, sigSkip) => {
        await anadir(regs); acumulado += regs.length;
        if (++paginas >= morirTrasPaginas && cierreEnPleno) { await fs.anadir(',{"id":"MEDIO-ESCRITO'); throw new Error('CIERRE en pleno guardado'); } // queda texto de más SIN apuntar
        await esc.punto({ ent, skip: sigSkip, n: acumulado });
        if (paginas >= morirTrasPaginas) throw new Error('CIERRE (sin memoria)');
      })();
      return (rep ? rep.n : 0) + total;
    }, { reanudar: rep, respiro: async () => {} });
    await esc.punto({ hecha: ent, n });
  }
  await esc.escribir('\n}\n');
  return esc.cerrar();
}

// 1) Se cierra en mitad de B
let d = nuevoDiario('copia.json', ENT); guardarDiario(d, alm);
await assert.rejects(() => ejecutar(d, { morirTrasPaginas: 4 }), /CIERRE/);
d = leerDiario(alm); assert.equal(d.actual.ent, 'B'); assert.equal(d.hechas.A, 1200); assert.ok(d.bytes > 0);
assert.equal(fichero.length, d.bytes, 'el fichero tiene justo lo apuntado');
// 2) Se cierra otra vez, esta vez en pleno guardado (queda un trozo de más en el fichero sin apuntar)
d.intentos++; await assert.rejects(() => ejecutar(d, { morirTrasPaginas: 2, tam: 250, cierreEnPleno: true }), /pleno guardado/);
d = leerDiario(alm); assert.ok(fichero.length > d.bytes, 'hay texto de más sin apuntar');
// 3) Esta vez termina: recorta lo sobrante y sigue
d.intentos++; const fin = await ejecutar(d, { tam: 250 });
assert.equal(fin.ok, true);
const j = JSON.parse(fichero.toString('utf8'));
assert.equal(j.A.length, 1200); assert.equal(j.B.length, 2500); assert.equal(j.C.length, 300);
assert.deepEqual(j.B.map((r) => r.id), Array.from({ length: 2500 }, (_, i) => 'B' + i), 'ni un registro repetido ni perdido');
assert.ok(maxAppend < 1_400_000, 'nunca se escribe más de ~1 MB de una vez');
// Fichero más corto de lo apuntado: no se puede seguir
const corto = crearEscritorReanudable({ fs: { ...fs, tamano: async () => 5 }, diario: { ...nuevoDiario('x', ['A']), bytes: 100 } });
assert.equal(await corto.comprobarFichero(), false);
// Utilidades
borrarDiario(alm); assert.equal(leerDiario(alm), null);
assert.equal(tamPaginaPara({ intentos: 0 }), 1000); assert.equal(tamPaginaPara({ intentos: 1 }), 500); assert.equal(tamPaginaPara({ intentos: 9 }), 100);
assert.equal(leerDiario({ getItem: () => JSON.stringify({ ...nuevoDiario('x', ['A']), creado: Date.now() - EDAD_MAX - 1000 }) }), null);
console.log('copia reanudable (escritura directa): OK');
