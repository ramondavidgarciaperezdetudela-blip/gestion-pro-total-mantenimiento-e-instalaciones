// Paneles que antes llenaban la pantalla principal y ahora se abren desde el menú
// «Paneles del negocio». `icono` es un nombre de src/componentes/tema/Iconos.jsx.
export const PANELES = [
  { id: 'negocio', texto: 'Cómo va el negocio', icono: 'informe' },
  { id: 'cifras', texto: 'Cifras clave', icono: 'informe' },
  { id: 'hoy', texto: 'Hoy: citas, documentos y SAT', icono: 'visita' },
  { id: 'sat', texto: 'Tablero SAT', icono: 'partes' },
  { id: 'agenda', texto: 'Agenda y firmas pendientes', icono: 'calendario' },
  { id: 'tareas', texto: 'Tareas y avisos', icono: 'avisos' },
  { id: 'presupuestos', texto: 'Presupuestos aceptados y rechazados', icono: 'presupuesto' },
  { id: 'documentos', texto: 'Estado de documentos y facturas', icono: 'factura' },
  { id: 'ingresos', texto: 'Ingresos y trabajos pendientes', icono: 'cobro' },
  { id: 'compras', texto: 'Compras y proveedores', icono: 'pedido' },
  { id: 'mantenimiento', texto: 'Mantenimiento y stock bajo', icono: 'contrato' },
  { id: 'clientes', texto: 'Clientes recientes y crear documento', icono: 'cliente' },
  { id: 'automatizaciones', texto: 'Automatizaciones activas', icono: 'ausencia' }
];

export const tituloPanel = (id) => PANELES.find((p) => p.id === id)?.texto || 'Resumen completo';
