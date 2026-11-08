// Estructura del menú principal con las páginas REALES de Gestión Pro Total.
// Cada apartado es una página del programa (id = nombre de la página) y todas
// las pantallas siguen siendo accesibles: solo están agrupadas por áreas.
//   pagina: nombre de la página de pages.config.js
//   ruta:   dirección dentro del programa (lleva ?type= cuando la página lo usa)
import { createPageUrl } from '@/utils';
import { PANELES } from '@/lib/panelesNegocio';

const ap = (pagina, texto, icono, extra = {}) => ({
  id: extra.id || pagina,
  pagina,
  texto,
  icono,
  ruta: createPageUrl(extra.ruta || pagina),
  ...(extra.detalle ? { detalle: extra.detalle } : {})
});

export const AREAS = [
  {
    id: 'operacion', texto: 'Operación', icono: 'operacion',
    apartados: [
      ap('RepartoDia', 'Reparto del día', 'reparto'),
      ap('SAT', 'Servicio técnico (SAT)', 'partes'),
      ap('SATChat', 'Chat SAT', 'avisos'),
      ap('Agenda', 'Agenda', 'calendario'),
      ap('SATCalendar', 'Calendario SAT', 'calendario'),
      ap('TechnicianDay', 'Vista del técnico', 'tecnicos'),
      ap('TechnicianFieldWork', 'Trabajo de campo', 'visita'),
      ap('TecniciansRoutes', 'Rutas', 'visita'),
      ap('Availability', 'Disponibilidad', 'ausencia'),
      ap('Maintenance', 'Mantenimiento', 'contrato'),
      ap('MaintenancePlanning', 'Plan de mantenimiento', 'contrato'),
      ap('PlanGamas', 'Gamas y plan', 'contrato'),
      ap('IncidentManagement', 'Incidencias', 'avisos'),
      ap('EquipmentFailureHistory', 'Averías', 'avisos'),
      ap('EquipmentDiaryPage', 'Diario de reparaciones', 'equipo'),
      ap('InstrumentosTaller', 'Instrumentos', 'medidas')
    ]
  },
  {
    id: 'clientes', texto: 'Clientes y proyectos', icono: 'clientes',
    apartados: [
      ap('Contacts', 'Clientes', 'cliente'),
      ap('ContactForm', 'Nuevo cliente', 'cliente'),
      ap('ClientPortal', 'Portal del cliente', 'portal'),
      ap('Projects', 'Proyectos', 'plano'),
      ap('ProjectTimeline', 'Cronograma', 'calendario')
    ]
  },
  {
    id: 'comercial', texto: 'Comercial', icono: 'comercial',
    apartados: [
      ap('Documents?type=presupuesto', 'Presupuestos', 'presupuesto', { id: 'Presupuestos' }),
      ap('AIBudget', 'Presupuesto con IA', 'presupuesto'),
      ap('CalculoCamaraGPT', 'Cálculo de cámaras', 'calculo'),
      ap('Visor3DGPT', 'Visor 3D de cámara', 'cubo3d'),
      ap('PlanoFrigorifico', 'Plano frigorífico', 'plano'),
      ap('PlanoIA', 'Plano y presupuesto', 'plano'),
      ap('CADCraft', 'CADCraft (dibujo CAD)', 'plano', { detalle: 'CAD' }),
      ap('BusinessCards', 'Tarjeta de visita', 'cliente'),
      ap('Catalogs', 'Catálogos', 'plantilla')
    ]
  },
  {
    id: 'calculo', texto: 'Cálculo y diagnóstico', icono: 'calculo',
    apartados: [
      ap('ColdRoomCalc', 'Cámara frigorífica', 'calculo'),
      ap('DiagnosticoCarga', 'Diagnóstico de carga', 'medidas'),
      ap('PresionesGas', 'Presiones y carga', 'medidas'),
      ap('TablasRefrigerantes', 'Tablas de gases', 'medidas'),
      ap('RefrigerantEquiv', 'Equivalencia de refrigerantes', 'calculo'),
      ap('CapillaryCalc', 'Tubo capilar', 'calculo'),
      ap('FilterCalc', 'Filtros', 'calculo'),
      ap('DanfossTools', 'Herramientas Danfoss', 'calculo'),
      ap('ThermalCalc', 'Cálculo térmico', 'calculo'),
      ap('MultiAreaCalc', 'Multi-área', 'calculo'),
      ap('ACPotenciaCalc', 'Potencia A/C', 'calculo'),
      ap('ACPlanAnalysis', 'Análisis A/C', 'calculo'),
      ap('CodigosError', 'Códigos de error', 'avisos'),
      ap('ElectricalCalc', 'Cálculo eléctrico', 'calculo'),
      ap('BatteryCalc', 'Baterías', 'calculo'),
      ap('SolarCalc', 'Cálculo solar', 'calculo'),
      ap('SolarBatteryCalc', 'Solar con batería', 'calculo')
    ]
  },
  {
    id: 'almacen', texto: 'Almacén y proveedores', icono: 'almacen',
    apartados: [
      ap('Inventory', 'Inventario', 'material'),
      ap('SparePartsManager', 'Repuestos', 'material'),
      ap('PurchaseSummary', 'Resumen de compras', 'pedido'),
      ap('Suppliers', 'Proveedores', 'proveedor'),
      ap('SupplierTariffs', 'Tarifas de proveedor', 'proveedor'),
      ap('GasSuppliers', 'Proveedores de gases', 'proveedor'),
      ap('GasesRefrigerantes', 'Gases refrigerantes', 'furgoneta')
    ]
  },
  {
    id: 'facturacion', texto: 'Facturación', icono: 'facturacion',
    apartados: [
      ap('Documents?type=factura', 'Facturas', 'factura', { id: 'Facturas' }),
      ap('Documents?type=recibo', 'Recibos', 'cobro', { id: 'Recibos' }),
      ap('Documents', 'Todos los documentos', 'factura'),
      ap('Reports', 'Informes', 'informe'),
      ap('AIReports', 'Informes con IA', 'informe'),
      ap('InformesTecnicos', 'Informes para aseguradoras', 'certificado')
    ]
  },
  {
    id: 'documentacion', texto: 'Documentación', icono: 'documentacion',
    apartados: [
      ap('DocumentTemplates', 'Plantillas', 'plantilla'),
      ap('LegalDocs', 'Modelos y legalización', 'certificado'),
      ap('Manuals', 'Manuales', 'documentacion'),
      ap('FichasMaquinas', 'Fichas técnicas de máquinas', 'equipo'),
      ap('Regulations', 'Normativas', 'certificado'),
      ap('GaleriaImagenes', 'Galería de imágenes', 'foto'),
      ap('Notes', 'Notas', 'plantilla')
    ]
  },
  {
    id: 'ia', texto: 'IA y asistencia', icono: 'avisos',
    apartados: [
      ap('AIAssistant', 'Asistente IA', 'avisos'),
      ap('AISearch', 'Búsqueda IA', 'avisos'),
      ap('AIPlanning', 'Planificación IA', 'avisos'),
      ap('SmartReminders', 'Recordatorios IA', 'avisos'),
      ap('AISupport', 'Soporte IA', 'avisos'),
      ap('CentroIA', 'Centro de IA (módulos y skills)', 'ajustes')
    ]
  },
  {
    id: 'paneles', texto: 'Paneles del negocio', icono: 'informe',
    apartados: [
      ap('PanelesNegocio', 'Resumen completo', 'informe'),
      ...PANELES.map((p) => ap('PanelesNegocio?panel=' + p.id, p.texto, p.icono, { id: 'Panel-' + p.id }))
    ]
  },
  {
    id: 'ajustes', texto: 'Ajustes', icono: 'ajustes',
    apartados: [
      ap('CompanyConfig', 'Configuración y empresa', 'empresa'),
      ap('BackupCenter', 'Copias de seguridad', 'datos'),
      ap('ExportData', 'Exportar datos', 'datos'),
      ap('Automations', 'Recordatorios automáticos', 'ausencia'),
      ap('AuditLog', 'Historial de cambios', 'informe'),
      ap('UpdateCenter', 'Actualizaciones', 'licencia'),
      ap('Novedades', 'Novedades', 'licencia')
    ]
  }
];

const ICONOS_MODULO = ['cuadro','operacion','clientes','comercial','almacen','facturacion','documentacion','ajustes','reparto','partes','avisos','calendario','cliente','equipo','contrato','presupuesto','visita','calculo','material','pedido','proveedor','factura','cobro','gasto','informe','horas','medidas','empresa','datos'];

/** Pone (o quita) el área «Mis módulos» con los módulos activos creados en el Centro de IA. */
export function registrarModulos(modulos) {
  const i = AREAS.findIndex((a) => a.id === 'modulos');
  const activos = (modulos || []).filter((m) => m && m.id && m.activo !== false);
  if (!activos.length) { if (i >= 0) AREAS.splice(i, 1); return; }
  const area = {
    id: 'modulos', texto: 'Mis módulos', icono: 'cuadro',
    apartados: activos.map((m) => ap('ModuloIA?id=' + encodeURIComponent(m.id), String(m.nombre || 'Módulo').slice(0, 40),
      ICONOS_MODULO.includes(m.icono) ? m.icono : 'cuadro', { id: 'Modulo-' + m.id }))
  };
  if (i >= 0) AREAS[i] = area; else AREAS.push(area);
}

const basePagina = (p) => String(p || '').split('?')[0];

/** Área y apartado a los que pertenece una página (null si no está en el menú). */
// Pantallas que no están en el menú pero cuelgan de una que sí.
const CUELGA_DE = { ContactDetail: 'Contacts', ClientPortal: 'ClientPortal' };

export function ubicarPagina(nombrePagina, busqueda = '') {
  const pag = CUELGA_DE[basePagina(nombrePagina)] || basePagina(nombrePagina);
  const q = new URLSearchParams(busqueda);
  const clave = q.get('type') ? 'type' : q.get('panel') ? 'panel' : q.get('id') ? 'id' : null;
  const tipo = clave && q.get(clave);
  for (const a of AREAS) {
    const exacto = tipo && a.apartados.find((x) => x.pagina === pag + '?' + clave + '=' + tipo);
    if (exacto) return { area: a, apartado: exacto };
  }
  for (const a of AREAS) {
    const x = a.apartados.find((y) => basePagina(y.pagina) === pag && !y.pagina.includes('?'));
    if (x) return { area: a, apartado: x };
  }
  for (const a of AREAS) {
    const x = a.apartados.find((y) => basePagina(y.pagina) === pag);
    if (x) return { area: a, apartado: x };
  }
  return null;
}

// Dibujo de fondo de cada pantalla (tipos de FondoTecnico).
export const FONDO_POR_PAGINA = {
  RepartoDia: 'reparto', Agenda: 'reparto', SATCalendar: 'reparto', TecniciansRoutes: 'reparto', Availability: 'reparto',
  TechnicianDay: 'tecnico', TechnicianFieldWork: 'tecnico', SAT: 'tecnico', SATChat: 'tecnico', IncidentManagement: 'tecnico',
  Maintenance: 'equipo', MaintenancePlanning: 'equipo', PlanGamas: 'equipo', EquipmentDiaryPage: 'equipo',
  EquipmentFailureHistory: 'equipo', FichasMaquinas: 'equipo', Manuals: 'equipo',
  Contacts: 'clientes', ClientPortal: 'clientes', Projects: 'clientes', ProjectTimeline: 'clientes',
  ContactDetail: 'cliente', ContactForm: 'cliente',
  InstrumentosTaller: 'medidas', DiagnosticoCarga: 'medidas', PresionesGas: 'medidas', TablasRefrigerantes: 'medidas',
  GaleriaImagenes: 'fotos',
  CalculoCamaraGPT: 'calculo', Visor3DGPT: 'calculo', ColdRoomCalc: 'calculo', PlanoFrigorifico: 'calculo', PlanoIA: 'calculo',
  CADCraft: 'calculo', ThermalCalc: 'calculo', MultiAreaCalc: 'calculo', ACPotenciaCalc: 'calculo', ACPlanAnalysis: 'calculo',
  Home: 'logo'
};
