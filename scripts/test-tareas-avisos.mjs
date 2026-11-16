import assert from 'node:assert/strict';
import { construirAvisos, filtrarAvisos, contarPorTipo, leerAnulados, guardarAnulados } from '../src/lib/tareasAvisos.js';
const hoy = new Date('2026-11-16T10:00:00Z');
const d = (n) => new Date(hoy.getTime() - n * 864e5).toISOString().slice(0, 10);
const av = construirAvisos({
  hoy,
  invoices: [
    { id: 'i1', doc_type: 'presupuesto', status: 'enviado', date: d(25), doc_number: 'P-1', total: 100, contact_name: 'Ana', contact_id: 'c1' },
    { id: 'i2', doc_type: 'presupuesto', status: 'enviado', date: d(3), doc_number: 'P-2', total: 50 },          // reciente: no
    { id: 'i3', doc_type: 'presupuesto', status: 'cancelado', date: d(40), doc_number: 'P-3' },                   // anulado: no
    { id: 'i4', doc_type: 'factura', status: 'enviado', date: d(40), due_date: d(5), doc_number: 'F-1', total: 200, contact_name: 'Luis' },
    { id: 'i5', doc_type: 'factura', status: 'enviado', date: d(5), due_date: d(-30), doc_number: 'F-2' },       // vence en 30 días: no
    { id: 'i6', doc_type: 'factura', status: 'pagado', due_date: d(5), doc_number: 'F-3' },                       // pagada: no
  ],
  sats: [
    { id: 's1', status: 'pendiente', date: d(10), order_number: '7', contact_name: 'Eva', type: 'Avería' },
    { id: 's2', status: 'pendiente', date: d(2), order_number: '8' },                                            // reciente: no
    { id: 's3', status: 'en_curso', date: d(2), order_number: '9', signature_technician: 'x' },                  // firma cliente falta
    { id: 's4', status: 'completada', date: d(30), order_number: '1' },
  ],
  mantenimientos: [
    { id: 'm1', contact_id: 'c1', equipment_brand: 'Daikin', equipment_model: 'X', type: 'revision', date: d(200) },
    { id: 'm2', contact_id: 'c1', equipment_brand: 'Daikin', equipment_model: 'X', type: 'revision', date: d(20) },  // revisión reciente del mismo equipo
    { id: 'm3', contact_id: 'c2', contact_name: 'Pepe', equipment_brand: 'LG', equipment_model: 'Y', type: 'revision', date: d(100) },
  ],
  citas: [{ id: 'a1', title: 'Visita', time_start: '10:00', status: 'pendiente', contact_name: 'Ana' }, { id: 'a2', title: 'Hecha', status: 'completada' }],
  proyectos: [{ id: 'p1', name: 'Obra', end_date: d(3), status: 'en_curso' }, { id: 'p2', name: 'Fin', end_date: d(3), status: 'completado' }],
  opiniones: [{ id: 'o1', contact_name: 'Ana', doc_type: 'presupuesto', doc_number: 'P-1', total: 100 }],
});
const ids = av.map((a) => a.id).sort();
assert.deepEqual(ids, ['cita-a1', 'fac-i4', 'firma-s3', 'mant-m3', 'op-o1', 'pres-i1', 'proy-p1', 'sat-s1']);
// más urgente primero
assert.equal(av[0].nivel, 'rojo');
// acciones directas
const pres = av.find((a) => a.id === 'pres-i1');
assert.deepEqual(pres.acciones[0].datos, { status: 'cancelado' }); assert.equal(pres.acciones[0].entidad, 'Invoice'); assert.ok(pres.acciones[0].confirmar);
assert.deepEqual(av.find((a) => a.id === 'fac-i4').acciones.map((x) => x.id), ['cobrada', 'anular']);
assert.deepEqual(av.find((a) => a.id === 'sat-s1').acciones.map((x) => x.id), ['encurso', 'completar', 'anular']);
assert.match(av.find((a) => a.id === 'firma-s3').detalle, /falta firma cliente/);
assert.match(pres.mensaje('Ana'), /Estimado\/a Ana.*P-1/);
// mantenimiento: la revisión reciente del mismo equipo tapa la antigua
assert.equal(av.some((a) => a.id === 'mant-m1'), false);
// conteo, filtro, anulados
assert.equal(contarPorTipo(av).presupuesto, 1);
assert.equal(filtrarAvisos(av, { tipo: 'sat' }).length, 1);
assert.equal(filtrarAvisos(av, { texto: 'LUIS' }).length, 1);
assert.equal(filtrarAvisos(av, { anulados: ['pres-i1'] }).some((a) => a.id === 'pres-i1'), false);
assert.deepEqual(filtrarAvisos(av, { anulados: ['pres-i1'], verAnulados: true }).map((a) => a.id), ['pres-i1']);
assert.equal(contarPorTipo(av, ['pres-i1']).presupuesto, undefined);
// almacenamiento de anulados (con y sin localStorage)
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = v; }, removeItem(k) { delete this._[k]; } };
localStorage.setItem('dismissed_notifs', JSON.stringify(['viejo']));
assert.deepEqual(leerAnulados(), ['viejo']);
guardarAnulados(['viejo', 'x', 'x']);
assert.deepEqual(leerAnulados().sort(), ['viejo', 'x']);
console.log('Tareas y avisos: OK');
{
  const dia = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  const r = construirAvisos({ invoices: [{ id: 'v1', doc_type: 'factura', doc_number: 'F-9', status: 'vencido', date: dia(40), due_date: dia(5), total: 50 }] });
  if (r.length !== 1 || r[0].tipo !== 'factura') { console.error('Factura vencida no sale'); process.exit(1); }
}
