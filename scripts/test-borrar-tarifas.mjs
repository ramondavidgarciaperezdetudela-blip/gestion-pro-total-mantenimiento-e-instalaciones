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
console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO OK'); process.exit(fallos ? 1 : 0);
