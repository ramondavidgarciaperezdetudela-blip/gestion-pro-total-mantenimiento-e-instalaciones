import { fechaLimite, debeVencer, conAvisoVencido, diasDeRetraso, cambiosAlVencer, cambiosAlRecuperar, cambiosAlAmpliar, isoDia } from '../src/lib/vencimientos.js';
let total = 0, fallos = 0;
const ok = (c, t, d = '') => { total++; if (!c) { fallos++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const hoy = new Date(2026, 10, 6); // 6-nov-2026

console.log('1. Cuándo vence');
const pres = (o) => ({ doc_type: 'presupuesto', status: 'enviado', date: '2026-09-20', ...o });
ok(debeVencer(pres({}), hoy, 30), 'enviado hace 47 días, plazo 30: vence');
ok(!debeVencer(pres({ date: '2026-10-20' }), hoy, 30), 'enviado hace 17 días: no vence');
ok(!debeVencer(pres({ date: '2026-10-07' }), hoy, 30), 'justo en el último día (30): aún no');
ok(debeVencer(pres({ date: '2026-10-06' }), hoy, 30), 'un día después del último: vence');
ok(debeVencer(pres({ status: 'borrador' }), hoy, 30), 'presupuesto en borrador sin respuesta: vence');
ok(!debeVencer({ doc_type: 'factura', status: 'borrador', date: '2026-01-01' }, hoy, 30), 'factura en borrador no vence');
ok(debeVencer({ doc_type: 'factura', status: 'enviado', date: '2026-01-01', due_date: '2026-02-01' }, hoy, 30), 'factura enviada pasada de su vencimiento: vence');
ok(!debeVencer(pres({ signature_client: 'data:...' }), hoy, 30), 'si el cliente firmó, no vence');
ok(!debeVencer(pres({ status: 'pagado' }), hoy, 30) && !debeVencer(pres({ status: 'cancelado' }), hoy, 30) && !debeVencer(pres({ status: 'vencido' }), hoy, 30), 'otros estados no se tocan');
ok(!debeVencer({ doc_type: 'recibo', status: 'enviado', date: '2026-01-01' }, hoy, 30), 'los recibos no vencen');
ok(!debeVencer(pres({ due_date: '2026-12-01' }), hoy, 30), 'manda la fecha de vencimiento del documento aunque la emisión sea antigua');
ok(debeVencer(pres({ date: '2026-11-01', due_date: '2026-11-05' }), hoy, 30), 'vencimiento propio ya pasado: vence aunque sea reciente');
ok(fechaLimite(pres({}), 30).getDate() === 20 && fechaLimite(pres({}), 30).getMonth() === 9, 'fecha límite = emisión + 30 (20-oct)');
ok(!debeVencer({ doc_type: 'presupuesto', status: 'enviado' }, hoy, 30), 'sin fecha: no hace nada');
ok(diasDeRetraso(pres({}), hoy, 30) === 17, 'días de retraso', diasDeRetraso(pres({}), hoy, 30));

console.log('2. El aviso');
const docs = [
  { id: 1, ...pres({}), ...cambiosAlVencer(hoy) },
  { id: 2, ...pres({}), ...cambiosAlVencer(hoy), vencido_aviso_cerrado: true },
  { id: 3, ...pres({}), status: 'enviado' },
  { id: 4, ...pres({}), ...cambiosAlVencer(hoy), signature_client: 'x' },
];
ok(conAvisoVencido(docs).map((d) => d.id).join() === '1', 'solo avisa de los vencidos sin gestionar', conAvisoVencido(docs).map((d) => d.id).join());
ok(cambiosAlVencer(hoy).vencido_el === '2026-11-06', 'guarda cuándo venció');

console.log('3. Recuperar');
const v = { id: 1, ...pres({}), ...cambiosAlVencer(hoy) };
const rec = cambiosAlRecuperar(v, 'enviado', { hoy, dias: 30 });
ok(rec.status === 'enviado' && rec.vencido_aviso_cerrado && rec.due_date === '2026-12-06', 'volver a enviado renueva el plazo (si no, vencería otra vez)', JSON.stringify(rec));
const rec2 = cambiosAlRecuperar(v, 'pagado', { hoy, dias: 30 });
ok(rec2.status === 'pagado' && !rec2.due_date && rec2.vencido_aviso_cerrado, 'aceptado/pagado no toca el plazo');
const amp = cambiosAlAmpliar(v, 15, hoy);
ok(amp.status === 'enviado' && amp.due_date === '2026-11-21', 'ampliar 15 días', JSON.stringify(amp));
const tras = { ...v, ...rec };
ok(!debeVencer(tras, hoy, 30) && conAvisoVencido([tras]).length === 0, 'recuperado: no vuelve a vencer hoy y el aviso desaparece');
const futuro = new Date(2026, 11, 8);
ok(debeVencer(tras, futuro, 30), 'si pasa de nuevo el plazo renovado, vuelve a vencer');

console.log(`\n${total - fallos}/${total} comprobaciones correctas`);
process.exit(fallos ? 1 : 0);
