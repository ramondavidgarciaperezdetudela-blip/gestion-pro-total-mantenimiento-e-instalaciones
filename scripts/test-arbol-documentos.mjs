import { construirArbol, totalDocumentos } from '../src/lib/arbolDocumentos.js';
let f = 0; const ok = (c, t, d = '') => { if (!c) { f++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } else console.log('  ✓ ' + t); };
const vacio = construirArbol();
ok(vacio.length === 6 && totalDocumentos(vacio) === 0 && vacio.every((m) => m.hijos.length >= 1), 'árbol vacío: 6 menús, 0 ficheros');
const a = construirArbol({
  invoices: [{ id: 'i1', doc_type: 'factura', doc_number: 'F-001', date: '2026-10-01', total: 1210, status: 'pagada' }, { id: 'i2', doc_type: 'presupuesto', doc_number: 'P-001', date: '2026-09-01', total: 500 }, { id: 'i3', doc_type: 'recibo', doc_number: 'R-1' }],
  satOrders: [{ id: 's1', order_number: '002', date: '2026-10-20', type: 'reparacion', status: 'completada', total: 90 }],
  maintenance: [{ id: 'm1', sheet_number: 7, date: '2026-10-10', type: 'preventivo', equipment_brand: 'Daikin' }],
  insuranceReports: [{ id: 'r1', report_number: 'IA-1', insurance_company: 'Mapfre', report_date: '2026-08-01' }],
  calculations: [{ id: 'c1', calc_type: 'carga_termica', date: '2026-07-01' }],
  documents: [
    { id: 'd1', doc_type: 'factura', title: 'Copia F-001', reference_id: 'i1' },        // copia → no se repite
    { id: 'd2', doc_type: 'factura', title: 'Factura escaneada', file_url: 'https://x/f.pdf', date: '2026-05-05' },
    { id: 'd3', doc_type: 'orden_sat', title: 'Orden SAT #002', reference_id: 's1' },   // copia
    { id: 'd4', doc_type: 'manual', title: 'Manual Daikin', file_url: 'https://x/m.pdf' },
    { id: 'd5', doc_type: 'foto_equipo', title: 'Placa' },
    { id: 'd6', doc_type: 'otro', title: 'Contrato firmado' },
    { id: 'd7', doc_type: 'informe', title: 'Informe de visita' },
    { id: 'd8', doc_type: 'otro', title: 'LEGAL: Boletín eléctrico', date: '2026-06-01' },
    { id: 'd9', doc_type: 'calculo_solar', title: 'Solar 5 kW' },
    { id: 'd10', doc_type: 'diagnostico_frigorifico', title: 'Diagnóstico R-404A' },
    { id: 'd11', doc_type: 'nota', title: 'Nota suelta' },
  ],
});
const sub = (m, h) => a.find((x) => x.id === m).hijos.find((x) => x.id === h);
ok(sub('administracion', 'facturas').archivos.length === 2, 'facturas: la propia + la escaneada (sin la copia)', String(sub('administracion', 'facturas').archivos.length));
ok(sub('administracion', 'facturas').archivos[0].titulo === 'F-001' && sub('administracion', 'facturas').archivos[0].tab === 'facturas', 'la más reciente primero y con su pestaña');
ok(sub('administracion', 'facturas').archivos[1].url === 'https://x/f.pdf', 'el escaneado conserva su enlace');
ok(sub('administracion', 'presupuestos').archivos.length === 1 && sub('administracion', 'recibos').archivos.length === 1, 'presupuesto y recibo');
ok(sub('servicio', 'sat').archivos.length === 1 && sub('servicio', 'sat').archivos[0].titulo === 'Orden SAT 002', 'SAT sin duplicar su copia');
ok(sub('servicio', 'mantenimiento').archivos[0].detalle === 'preventivo · Daikin', 'ficha de mantenimiento con detalle');
ok(sub('servicio', 'aseguradora').archivos[0].titulo === 'Informe IA-1 — Mapfre', 'informe de aseguradora');
ok(sub('servicio', 'diagnosticos').archivos.length === 1 && sub('servicio', 'informes').archivos.length === 1, 'diagnósticos e informes');
ok(sub('legalizacion', 'legales').archivos.length === 1 && sub('legalizacion', 'legales').archivos[0].titulo === 'Boletín eléctrico', 'legalización sin el prefijo LEGAL:');
ok(sub('calculos', 'termicos').archivos.length === 1 && sub('calculos', 'solares').archivos.length === 1, 'cálculos térmico y solar');
ok(sub('equipos', 'manuales').archivos.length === 1 && sub('equipos', 'fotos').archivos[0].tab === 'fotos_equipo', 'manuales y fotos');
ok(sub('otros', 'varios').archivos.map((x) => x.titulo).sort().join('|') === 'Contrato firmado|Nota suelta', 'otros: contrato y nota (sin los legales)');
ok(totalDocumentos(a) === 16, 'total de ficheros', String(totalDocumentos(a)));
console.log(f ? `\n${f} FALLOS` : '\nTODO OK'); process.exit(f ? 1 : 0);
