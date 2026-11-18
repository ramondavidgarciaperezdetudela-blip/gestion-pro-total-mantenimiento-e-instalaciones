import { tarifasCaducadas, borrarEnLotes, recrearLineas } from '../src/lib/borrarTarifas.js';
let fallos = 0; const ok = (c, t) => { if (!c) { fallos++; console.log('  ✗ ' + t); } else console.log('  ✓ ' + t); };
const hoy = Date.parse('2026-10-30');
const items = [
  { id: 'a', validity_date: '2026-01-01' }, { id: 'b', validity_date: '2027-01-01' },
  { id: 'c', created_date: '2025-01-01T00:00:00Z' }, { id: 'd', created_date: '2026-10-01T00:00:00Z' }, { id: 'e' },
];
ok(tarifasCaducadas(items, { hoy }).map((x) => x.id).join() === 'a', 'solo las de vigencia pasada, si no hay fecha de corte');
ok(tarifasCaducadas(items, { hoy, antesDe: '2026-06-01' }).map((x) => x.id).join() === 'a,c', 'con fecha de corte entran las creadas antes y sin vigencia');
const api = { borradas: [], async delete(id) { if (id === 'x2') throw new Error('Permission denied'); this.borradas.push(id); }, creadas: [], async create(f) { this.creadas.push(f); } };
const prog = [];
const r = await borrarEnLotes(api, [{ id: 'x1' }, { id: 'x2' }, { id: 'x3' }], { onProgreso: (a, b) => prog.push(`${a}/${b}`) });
ok(r.borradas.length === 2 && r.fallidas.length === 1 && /Permission/.test(r.fallidas[0].error), 'no para en el fallo y cuenta los que no se pudieron borrar');
ok(prog.at(-1) === '3/3', 'informa del progreso');
const n = await recrearLineas(api, [{ id: 'x1', created_date: 'z', created_by: 'q', product_name: 'P', cost_price: 3 }]);
ok(n === 1 && api.creadas[0].product_name === 'P' && !('id' in api.creadas[0]) && !('created_by' in api.creadas[0]), 'deshacer: recrea sin los campos del servidor');
// Borrado de golpe: con almacén propio, una sola petición por bloque
{
  const llamadas = []; const ids = Array.from({ length: 2500 }, (_, i) => ({ id: 'i' + i }));
  const apiB = { borradoEnBloque: true, async deleteMany(q) { llamadas.push(q.id.$in.length); }, async delete() { throw new Error('no debería borrar de una en una'); } };
  const p = []; const r2 = await borrarEnLotes(apiB, ids, { onProgreso: (a, b) => p.push(`${a}/${b}`) });
  ok(r2.borradas.length === 2500 && llamadas.join() === '1000,1000,500', 'toda la tarifa: 3 peticiones para 2.500 líneas (no 2.500)');
  ok(p.at(-1) === '2500/2500', 'progreso por bloques');
  const apiC = { borradoEnBloque: true, borradas: [], async deleteMany() { throw new Error('rechazado'); }, async delete(id) { if (id === 'i3') throw new Error('Permission denied'); this.borradas.push(id); } };
  const r3 = await borrarEnLotes(apiC, ids.slice(0, 10));
  ok(r3.borradas.length === 9 && r3.fallidas.length === 1, 'si rechazan el bloque, solo ese bloque va línea a línea y cuenta los fallos');
  const apiD = { async deleteMany() { throw new Error('no se debe usar sin garantía'); }, async delete() {} };
  const r4 = await borrarEnLotes(apiD, ids.slice(0, 5));
  ok(r4.borradas.length === 5, 'sin garantía del almacén (Base44) no usa deleteMany');
  const creadas = []; const apiE = { borradoEnBloque: true, async bulkCreate(l) { creadas.push(l.length); } };
  const n2 = await recrearLineas(apiE, ids.map((x) => ({ ...x, product_name: 'P' })));
  ok(n2 === 2500 && creadas.join() === '500,500,500,500,500', 'deshacer: recrea por bloques de 500');
}
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
