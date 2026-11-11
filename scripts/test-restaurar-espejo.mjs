import assert from 'node:assert/strict';
import { planSobrantes, planRestauracion, elegirPorClave } from '../src/lib/copiasLotes.js';
import { mapaIds, reenlazarFilas } from '../src/lib/vinculos.js';
const clave = (r) => (r.nif || '').toLowerCase() || null;
// Hay un duplicado antiguo (id d1, mismo NIF que el cliente de la copia c1) y un cliente que no está en la copia (x).
const actuales = [
  { id: 'd1', nif: 'A1', name: 'Antiguo' },
  { id: 'c1', nif: 'A1', name: 'Cliente' },
  { id: 'x', nif: 'Z9', name: 'Viejo' },
  { id: 'c2', nif: 'B2', name: 'Otro' },
];
const copia = [{ id: 'c1', nif: 'A1', name: 'Cliente' }, { id: 'c2', nif: 'B2', name: 'Otro' }];
const { sobran } = planSobrantes(actuales, copia, clave);
assert.deepEqual(sobran.map((r) => r.id).sort(), ['d1', 'x']);          // el repetido y el que no está
assert.equal(elegirPorClave(actuales, copia, clave).get('a1').id, 'c1'); // se queda el de la copia
assert.equal(mapaIds(copia, actuales, clave).get('c1'), 'c1');            // y a él se vincula
const plan = planRestauracion(actuales, copia, clave);
assert.equal(plan.aCrear.length, 0); assert.equal(plan.aActualizar.length, 0);
// El parte SAT sigue unido al cliente que se conserva
const sat = reenlazarFilas([{ id: 's', contact_id: 'c1', contact_name: 'Cliente' }], mapaIds(copia, actuales, clave), copia);
assert.equal(sat.filas[0].contact_id, 'c1');
// Sin ninguna coincidencia no se borra nada
assert.equal(planSobrantes(actuales, [{ id: 'q', nif: 'Q' }], clave).sobran.length, 0);
// Sin id de copia coincidente: se queda el primero y el resto sobra
const s2 = planSobrantes([{ id: 'a', nif: 'K' }, { id: 'b', nif: 'K' }], [{ id: 'zz', nif: 'K' }], clave);
assert.deepEqual(s2.sobran.map((r) => r.id), ['b']);
console.log('restaurar-espejo OK');
