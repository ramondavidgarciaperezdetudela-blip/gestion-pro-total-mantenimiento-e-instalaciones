import { checklistDe, pendientes, construirOrden, ordenASAT, equipoSAT, diasHasta } from '../src/lib/ordenPreventivo.js';
let f = 0; const ok = (c, t) => { if (!c) { f++; console.log('  ✗ ' + t); } else console.log('  ✓ ' + t); };
const H = '2026-11-01';
ok(diasHasta('2026-11-11', H) === 10 && diasHasta('2026-10-31', H) === -1 && diasHasta('x', H) === null, 'diasHasta');
const ms = [
  { id: 1, name: 'A', last_maintenance_date: '2026-01-01', maintenance_days: 90 },
  { id: 2, name: 'B', last_maintenance_date: '2026-10-01', maintenance_days: 45 },
  { id: 3, name: 'C', last_maintenance_date: '2026-10-30', maintenance_days: 365 },
  { id: 4, name: 'D' },
  { id: 5, name: 'E', status: 'baja', last_maintenance_date: '2026-01-01', maintenance_days: 30 },
];
const p = pendientes(ms, H);
ok(p.length === 4, 'las máquinas de baja no entran');
ok(p[0].maquina.id === 1 && p[0].estado === 'vencida' && p[0].proxima === '2026-04-01', 'vencida primero, fecha correcta');
ok(p[1].maquina.id === 2 && p[1].estado === 'proxima' && p[1].proxima === '2026-11-15' && p[1].dias === 14, 'próxima en 14 días');
ok(p[2].estado === 'ok' && p[3].estado === 'sin-datos', 'ok y sin datos al final');
const c1 = checklistDe({ machine_type: 'aire_acondicionado', refrigerant_type: 'R-410A', refrigerant_charge_kg: 1.5 });
ok(c1.some((t) => /Inspección visual de fugas/.test(t)), 'carga pequeña → solo inspección visual');
const c2 = checklistDe({ machine_type: 'camara_frigorifica', refrigerant_type: 'R-404A', refrigerant_charge_kg: 20, last_leak_check: '2026-01-01' });
ok(c2.some((t) => /Control de fugas de gas fluorado \(cada 6 meses/.test(t)), 'R-404A 20 kg → control de fugas obligatorio');
const c3 = checklistDe({ machine_type: 'solar_fotovoltaico' });
ok(c3.length >= 5 && !c3.some((t) => /fugas/.test(t)), 'solar sin gas');
const c4 = checklistDe({ machine_type: 'caldera' });
ok(c4.some((t) => /combustión/.test(t)), 'caldera: combustión');
ok(checklistDe({ machine_type: 'inventado' }).length >= 3, 'tipo desconocido → lista general');
const o = construirOrden({ maquina: { name: 'Split salón', brand: 'Daikin', model: 'X', machine_type: 'aire_acondicionado', refrigerant_type: 'R-32', refrigerant_charge_kg: 1.2, serial_number: 'SN1', contact_id: 'c1' }, contacto: { id: 'c1', name: 'Ana', surname: 'Ruiz', address: 'C/ Sol 1', city: 'Málaga', postal_code: '29001' }, fecha: '2026-11-10', tecnico: 'Luis', zona: { zona: 'A3', capital: 'Málaga' } });
ok(o.cliente === 'Ana Ruiz' && o.direccion === 'C/ Sol 1, 29001, Málaga' && o.zona === 'A3 (Málaga)' && /R-32 · 1.2 kg/.test(o.gas), 'orden con cliente, dirección, zona y gas');
const s = ordenASAT(o);
ok(s.type === 'mantenimiento' && s.equipment_type === 'aire_acondicionado' && s.contact_name === 'Ana Ruiz' && /^1\. /.test(s.notes), 'conversión a SATOrder');
ok(equipoSAT('aerotermia') === 'bomba_calor' && equipoSAT('solar_termico') === 'solar' && equipoSAT('x') === 'otro', 'equipoSAT');
console.log(f ? `\n${f} FALLOS` : '\nTODO OK'); process.exit(f ? 1 : 0);
