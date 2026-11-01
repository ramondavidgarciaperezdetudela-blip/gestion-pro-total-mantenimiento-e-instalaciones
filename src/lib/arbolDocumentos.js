/**
 * arbolDocumentos.js — todo lo que está vinculado a un cliente, ordenado en
 * menús y submenús con sus ficheros. Junta los registros propios (facturas,
 * órdenes SAT, fichas de mantenimiento, cálculos, informes) y los documentos
 * vinculados (ClientDocument) por su tipo, sin repetir los que son copia.
 *
 * Cada archivo lleva `tab`: la pestaña de la ficha donde se gestiona.
 */
const num = (...xs) => xs.find((x) => x !== undefined && x !== null && String(x).trim() !== '') ?? '';
const euros = (t) => (t === undefined || t === null || t === '' || Number.isNaN(Number(t)) ? '' : `${Number(t).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
const fechaDe = (x) => String(x?.date || x?.report_date || x?.updated_date || x?.created_date || '').slice(0, 10);
const esLegal = (d) => String(d?.title || '').startsWith('LEGAL:');

/** Tipos de ClientDocument que tienen submenú propio; el resto va a «Otros archivos». */
const TIPOS_DOC_PROPIOS = new Set(['factura', 'presupuesto', 'recibo', 'orden_sat', 'ficha_mantenimiento', 'calculo_termico', 'calculo_solar', 'manual', 'foto_equipo', 'diagnostico_frigorifico', 'informe']);

export const MENUS_DOCUMENTALES = ['administracion', 'servicio', 'legalizacion', 'calculos', 'equipos', 'otros'];

/**
 * @param {{invoices?:object[], satOrders?:object[], maintenance?:object[], documents?:object[], calculations?:object[], insuranceReports?:object[]}} d
 * @returns {{id:string, titulo:string, total:number, hijos:{id:string, titulo:string, tab:string, archivos:object[]}[]}[]}
 */
export function construirArbol({ invoices = [], satOrders = [], maintenance = [], documents = [], calculations = [], insuranceReports = [] } = {}) {
  const docs = documents.filter((d) => !esLegal(d));
  const porTipo = (t) => docs.filter((d) => d.doc_type === t);
  const idsPropios = (lista) => new Set(lista.map((x) => String(x.id)));
  const copiaDe = (lista) => { const ids = idsPropios(lista); return (d) => d.reference_id && ids.has(String(d.reference_id)); };
  const docComoArchivo = (d, tab) => ({ id: `doc-${d.id}`, titulo: num(d.title, 'Documento'), fecha: fechaDe(d), detalle: d.description && !String(d.description).trim().startsWith('<') ? String(d.description).slice(0, 80) : '', url: d.file_url || '', tab });
  const ordenar = (arr) => [...arr].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));

  const factura = (tipo) => {
    const propios = invoices.filter((i) => i.doc_type === tipo);
    const copias = porTipo(tipo).filter((d) => !copiaDe(propios)(d));
    return [
      ...propios.map((i) => ({ id: `inv-${i.id}`, titulo: `${num(i.doc_number, i.title, 'Sin número')}`, fecha: fechaDe(i), detalle: [euros(i.total), i.status].filter(Boolean).join(' · '), url: i.file_url || '', tab: tipo === 'factura' ? 'facturas' : tipo === 'presupuesto' ? 'presupuestos' : 'recibos' })),
      ...copias.map((d) => docComoArchivo(d, tipo === 'factura' ? 'facturas' : tipo === 'presupuesto' ? 'presupuestos' : 'recibos')),
    ];
  };

  const sat = [
    ...satOrders.map((o) => ({ id: `sat-${o.id}`, titulo: `Orden SAT ${num(o.order_number, 'sin nº')}`, fecha: fechaDe(o), detalle: [o.type, o.status, euros(o.total)].filter(Boolean).join(' · '), url: '', tab: 'sat' })),
    ...porTipo('orden_sat').filter((d) => !copiaDe(satOrders)(d)).map((d) => docComoArchivo(d, 'sat')),
  ];
  const mant = [
    ...maintenance.map((m) => ({ id: `mant-${m.id}`, titulo: `Ficha de mantenimiento ${num(m.sheet_number, 'sin nº')}`, fecha: fechaDe(m), detalle: [m.type, [m.equipment_brand, m.equipment_model].filter(Boolean).join(' ')].filter(Boolean).join(' · '), url: '', tab: 'maint' })),
    ...porTipo('ficha_mantenimiento').filter((d) => !copiaDe(maintenance)(d)).map((d) => docComoArchivo(d, 'maint')),
  ];
  const aseguradora = insuranceReports.map((r) => ({ id: `aseg-${r.id}`, titulo: `Informe ${num(r.report_number, 'sin nº')}${r.insurance_company ? ` — ${r.insurance_company}` : ''}`, fecha: fechaDe(r), detalle: [r.status, euros(r.total)].filter(Boolean).join(' · '), url: '', tab: 'informes_aseg' }));
  const diagnosticos = porTipo('diagnostico_frigorifico').map((d) => docComoArchivo(d, 'files'));
  const informes = porTipo('informe').map((d) => docComoArchivo(d, 'files'));

  const legales = documents.filter(esLegal).map((d) => ({ ...docComoArchivo(d, 'legalizacion'), titulo: String(d.title).replace(/^LEGAL:\s*/, '') }));

  const termicos = [
    ...calculations.map((c) => ({ id: `calc-${c.id}`, titulo: `Cálculo ${String(c.calc_type || 'térmico').replace(/_/g, ' ')}`, fecha: fechaDe(c), detalle: '', url: '', tab: 'calcs' })),
    ...porTipo('calculo_termico').map((d) => docComoArchivo(d, 'calcs')),
  ];
  const solares = porTipo('calculo_solar').map((d) => docComoArchivo(d, 'calcs'));

  const manuales = porTipo('manual').map((d) => docComoArchivo(d, 'files'));
  const fotos = porTipo('foto_equipo').map((d) => docComoArchivo(d, 'fotos_equipo'));
  const otros = docs.filter((d) => !TIPOS_DOC_PROPIOS.has(d.doc_type)).map((d) => docComoArchivo(d, 'files'));

  const menu = (id, titulo, hijos) => ({ id, titulo, hijos: hijos.map(([hid, htitulo, tab, archivos]) => ({ id: hid, titulo: htitulo, tab, archivos: ordenar(archivos) })), total: hijos.reduce((a, h) => a + h[3].length, 0) });
  return [
    menu('administracion', 'Facturación y presupuestos', [['facturas', 'Facturas', 'facturas', factura('factura')], ['presupuestos', 'Presupuestos', 'presupuestos', factura('presupuesto')], ['recibos', 'Recibos', 'recibos', factura('recibo')]]),
    menu('servicio', 'Servicio técnico', [['sat', 'Órdenes SAT', 'sat', sat], ['mantenimiento', 'Fichas de mantenimiento', 'maint', mant], ['aseguradora', 'Informes para aseguradora', 'informes_aseg', aseguradora], ['diagnosticos', 'Diagnósticos frigoríficos', 'files', diagnosticos], ['informes', 'Otros informes', 'files', informes]]),
    menu('legalizacion', 'Legalización', [['legales', 'Certificados, memorias y boletines', 'legalizacion', legales]]),
    menu('calculos', 'Cálculos', [['termicos', 'Cálculos térmicos y de climatización', 'calcs', termicos], ['solares', 'Cálculos solares', 'calcs', solares]]),
    menu('equipos', 'Equipos y manuales', [['manuales', 'Manuales', 'files', manuales], ['fotos', 'Fotos de equipos', 'fotos_equipo', fotos]]),
    menu('otros', 'Otros archivos', [['varios', 'Archivos varios', 'files', otros]]),
  ];
}

/** Recuento total de ficheros del árbol. */
export const totalDocumentos = (arbol) => arbol.reduce((a, m) => a + m.total, 0);
