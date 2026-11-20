import assert from 'node:assert/strict';
import { crearEscritorReanudable, nuevoDiario, leerDiario, guardarDiario, borrarDiario, pendientes, tamPaginaPara, nombreParte, EDAD_MAX } from '../src/lib/copiaReanudable.js';
import { escribirSeccionPorPaginas } from '../src/lib/escribirSeccion.js';

const disco = new Map(); let final = null;   // "teléfono": ficheros de partes y fichero final
const fs = {
  escribirParte: async (n, t) => { disco.set(n, t); }, leerParte: async (n) => disco.get(n),
  crearFinal: async () => { final = ''; }, anadirFinal: async (t) => { final += t; },
  cerrarFinal: async () => ({ ok: true, ruta: '/Documents/copia.json' }), borrarPartes: async () => { disco.clear(); }, cancelarFinal: async () => { final = null; },
};
const alm = (() => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; })();
const ENT = ['A', 'B', 'C']; const TOTAL = { A: 1200, B: 2500, C: 300 };
const registro = (e, i) => ({ id: `${e}${i}`, foto: 'x'.repeat(500), n: 'ñ🔧' });
// "Servidor": páginas por desplazamiento
const leerDe = (e, desde, tam, anadir) => async () => { let skip = desde, total = 0; for (;;) { const lote = []; for (let i = skip; i < Math.min(skip + tam, TOTAL[e]); i++) lote.push(registro(e, i)); if (!lote.length) break; await anadir(lote, skip + lote.length); total += lote.length; skip += lote.length; if (lote.length < tam) break; } return total; };

/** Una "ejecución" de la copia; `moririEn` simula que Android cierra el programa tras N páginas. */
async function ejecutar(diario, { morirTrasPaginas = Infinity, tam = 500 } = {}) {
  const esc = crearEscritorReanudable({ fs, diario, guardar: (d) => guardarDiario(d, alm), umbral: 100_000 });
  if (!diario.cabecera) { await esc.escribir('{\n"version":"3.0"'); await esc.punto({ cabecera: true }); }
  let paginas = 0;
  for (const ent of pendientes(diario)) {
    const rep = diario.actual?.ent === ent ? diario.actual : null;
    const fichero = { ...esc, punto: esc.punto };
    let acumulado = rep ? rep.n : 0;
    const n = await escribirSeccionPorPaginas(fichero, ent, async (anadir) => {
      const total = await leerDe(ent, rep ? rep.skip : 0, tam, async (regs, sigSkip) => {
        await anadir(regs); acumulado += regs.length;
        await esc.punto({ ent, skip: sigSkip, n: acumulado });
        if (++paginas >= morirTrasPaginas) throw new Error('CIERRE (sin memoria)');
      })();
      return (rep ? rep.n : 0) + total;
    }, { reanudar: rep ? { n: rep.n } : null, respiro: async () => {} });
    await esc.punto({ hecha: ent, n });
  }
  await esc.escribir('\n}\n');
  return esc.cerrar();
}

// 1) Primera ejecución: se cierra en mitad de B
let d = nuevoDiario('copia.json', ENT); guardarDiario(d, alm);
await assert.rejects(() => ejecutar(d, { morirTrasPaginas: 4 }), /CIERRE/);
d = leerDiario(alm);
assert.deepEqual(Object.keys(d.hechas), ['A']); assert.equal(d.actual.ent, 'B'); assert.ok(d.actual.skip > 0 && d.actual.skip < 2500);
assert.equal(d.hechas.A, 1200);
// 2) Se vuelve a cerrar otra vez más tarde (en B también) y se retoma de nuevo
d.intentos++; await assert.rejects(() => ejecutar(d, { morirTrasPaginas: 2, tam: 250 }), /CIERRE/);
d = leerDiario(alm); assert.equal(d.actual.ent, 'B');
// 3) Esta vez termina
d.intentos++; const fin = await ejecutar(d, { tam: 250 });
assert.equal(fin.ok, true);
const j = JSON.parse(final);
assert.equal(j.A.length, 1200); assert.equal(j.B.length, 2500); assert.equal(j.C.length, 300);
assert.deepEqual(j.B.map((r) => r.id), Array.from({ length: 2500 }, (_, i) => 'B' + i), 'ni un registro repetido ni perdido');
assert.equal(disco.size, 0, 'se borran los tramos al terminar');
borrarDiario(alm); assert.equal(leerDiario(alm), null);
// Sin cierres: mismo resultado
disco.clear(); const d2 = nuevoDiario('otra.json', ENT); await ejecutar(d2); assert.equal(JSON.parse(final).C.length, 300);
// Utilidades
assert.equal(tamPaginaPara({ intentos: 0 }), 1000); assert.equal(tamPaginaPara({ intentos: 1 }), 500); assert.equal(tamPaginaPara({ intentos: 9 }), 100);
assert.equal(nombreParte(7), '000007.parte');
assert.equal(leerDiario({ getItem: () => JSON.stringify({ ...nuevoDiario('x', ['A']), creado: Date.now() - EDAD_MAX - 1000 }) }), null, 'un diario viejo no se retoma');
console.log('copia reanudable: OK');
