import assert from 'node:assert/strict';
import { normaliza, coincideNombre, contactoDelDiario, maquinaDelDiario, planDeVinculos, filtrarPorTipo, tiposPresentes } from '../src/lib/vinculoDiarios.js';

assert.equal(normaliza('  Álvaro  Maqueda-Novillo, S.L. '), 'alvaro maqueda novillo s l');
const alvaro = { id: 'c1', name: 'Álvaro', surname: 'Maqueda Novillo' };
const amir = { id: 'c2', name: 'Amir KPC REUS', surname: '' };
const bon = { id: 'c3', name: 'Bon Frutas y Verdura', company_name: 'Bon Frutas y Verdura S.L' };
const juan1 = { id: 'c4', name: 'Juan', surname: 'Pérez' };
const juan2 = { id: 'c5', name: 'Juan', surname: 'Pérez' };
const contactos = [alvaro, amir, bon, juan1, juan2];

assert.equal(coincideNombre('alvaro maqueda novillo', alvaro), 'exacto');
assert.equal(coincideNombre('MAQUEDA NOVILLO ALVARO', alvaro), 'exacto');
assert.equal(coincideNombre('Alvaro Maqueda', alvaro), 'parecido');
assert.equal(coincideNombre('Alvaro', alvaro), 'exacto');
assert.equal(coincideNombre('Pedro Maqueda', alvaro), null);
assert.equal(coincideNombre('', alvaro), null);
assert.equal(coincideNombre('bon frutas y verdura s.l', bon), 'exacto');

assert.deepEqual(contactoDelDiario({ contact_id: 'c1' }, contactos).por, 'id');
assert.equal(contactoDelDiario({ contact_id: 'borrado', contact_name: 'amir kpc reus' }, contactos).contacto.id, 'c2');
assert.equal(contactoDelDiario({ contact_name: 'Álvaro Maqueda Novillo' }, contactos).por, 'nombre');
assert.equal(contactoDelDiario({ contact_name: 'Juan Perez' }, contactos).ambiguo, true);
assert.equal(contactoDelDiario({ contact_name: 'Nadie Conocido' }, contactos), null);
assert.equal(contactoDelDiario({}, contactos), null);

const maquinas = [
  { id: 'm1', name: 'Cámara fruta 1', machine_type: 'camara_frigorifica', brand: 'Kide', model: 'K1', serial_number: 'SN-001' },
  { id: 'm2', name: 'Cámara carne', machine_type: 'camara_frigorifica', brand: 'Taver', model: 'T2', serial_number: '' },
  { id: 'm3', name: 'Split oficina', machine_type: 'aire_acondicionado' },
];
assert.deepEqual(maquinaDelDiario({ serial_number: 'sn 001', machine_type: 'otro' }, maquinas).por, 'serie');
assert.equal(maquinaDelDiario({ machine_type: 'aire_acondicionado', machine_name: 'Aire' }, maquinas).maquina.id, 'm3');
assert.equal(maquinaDelDiario({ machine_type: 'camara_frigorifica', machine_name: 'Cámara carne' }, maquinas).maquina.id, 'm2');
assert.equal(maquinaDelDiario({ machine_type: 'camara_frigorifica', equipment_brand: 'Kide', equipment_model: 'k1' }, maquinas).maquina.id, 'm1');
assert.equal(maquinaDelDiario({ machine_type: 'camara_frigorifica', machine_name: 'Otra cosa' }, maquinas), null);
assert.equal(maquinaDelDiario({ machine_type: 'caldera' }, maquinas), null);
assert.equal(maquinaDelDiario({ machine_id: 'm2', machine_type: 'caldera' }, maquinas).por, 'id');
assert.equal(maquinaDelDiario({ machine_type: 'caldera' }, []), null);

const diarios = [
  { id: 'd1', contact_id: 'c1', contact_name: 'Álvaro Maqueda Novillo', machine_type: 'aire_acondicionado', machine_name: 'Split' }, // solo falta máquina
  { id: 'd2', contact_id: '', contact_name: 'amir kpc reus', machine_type: 'camara_frigorifica', serial_number: 'SN-001' }, // cliente por nombre + máquina por serie
  { id: 'd3', contact_id: 'zzz', contact_name: 'Juan Pérez', machine_type: 'otro' }, // ambiguo → no se toca
  { id: 'd4', contact_id: 'c2', contact_name: 'Amir KPC REUS', machine_type: 'caldera', machine_id: '' }, // ya bien, sin máquina → nada
  { id: 'd5', contact_id: 'c1', contact_name: 'Álvaro Maqueda Novillo', machine_type: 'aire_acondicionado', machine_id: 'm3' }, // ya vinculado → nada
];
const maquinasDe = (id) => (id === 'c1' || id === 'c2' ? maquinas : []);
const plan = planDeVinculos({ diarios, contactos, maquinasDe });
assert.deepEqual(plan.map((p) => p.diarioId).sort(), ['d1', 'd2']);
assert.deepEqual(plan.find((p) => p.diarioId === 'd1').cambios, { machine_id: 'm3' });
assert.deepEqual(plan.find((p) => p.diarioId === 'd2').cambios, { contact_id: 'c2', contact_name: 'Amir KPC REUS', machine_id: 'm1' });
// Segunda pasada con el resultado aplicado: no hay nada más que cambiar (idempotente).
const aplicados = diarios.map((d) => ({ ...d, ...(plan.find((p) => p.diarioId === d.id)?.cambios || {}) }));
assert.equal(planDeVinculos({ diarios: aplicados, contactos, maquinasDe }).length, 0);

assert.equal(filtrarPorTipo(diarios, 'todos').length, 5);
assert.equal(filtrarPorTipo(diarios, 'aire_acondicionado').length, 2);
assert.deepEqual(tiposPresentes(diarios)[0], { tipo: 'aire_acondicionado', n: 2 });
console.log('vínculo de diarios: OK');
