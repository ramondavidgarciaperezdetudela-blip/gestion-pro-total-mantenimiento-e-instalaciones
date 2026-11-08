// Precarga de pantallas: al pasar el ratón (o tocar) un enlace del menú se empieza a
// descargar la pantalla, de modo que al hacer clic ya está lista y abre al instante.
// La lista de cargadores sale de los «lazy» de pages.config.js y App.jsx; scripts/test-precarga.mjs
// comprueba que no falta ninguna.
const CARGADORES = {
  ACPlanAnalysis: () => import('../pages/ACPlanAnalysis'),
  ACPotenciaCalc: () => import('../pages/ACPotenciaCalc'),
  AIAssistant: () => import('../pages/AIAssistant'),
  AIBudget: () => import('../pages/AIBudget'),
  AIPlanning: () => import('../pages/AIPlanning'),
  AIReports: () => import('../pages/AIReports'),
  AISearch: () => import('../pages/AISearch'),
  AISupport: () => import('../pages/AISupport'),
  Agenda: () => import('../pages/Agenda'),
  AuditLog: () => import('../pages/AuditLog'),
  Automations: () => import('../pages/Automations'),
  Availability: () => import('../pages/Availability'),
  BackupCenter: () => import('../pages/BackupCenter'),
  BatteryCalc: () => import('../pages/BatteryCalc'),
  BusinessCards: () => import('../pages/BusinessCards'),
  CADCraft: () => import('../pages/CADCraft'),
  CalculoCamaraGPT: () => import('../pages/CalculoCamaraGPT'),
  CapillaryCalc: () => import('../pages/CapillaryCalc'),
  Catalogs: () => import('../pages/Catalogs'),
  ClientPortal: () => import('../pages/ClientPortal'),
  CodigosError: () => import('../pages/CodigosError'),
  ColdRoomCalc: () => import('../pages/ColdRoomCalc'),
  CompanyConfig: () => import('../pages/CompanyConfig'),
  ContactDetail: () => import('../pages/ContactDetail'),
  ContactForm: () => import('../pages/ContactForm'),
  Contacts: () => import('../pages/Contacts'),
  DanfossTools: () => import('../pages/DanfossTools'),
  DiagnosticoCarga: () => import('../pages/DiagnosticoCarga'),
  DocumentTemplates: () => import('../pages/DocumentTemplates'),
  Documents: () => import('../pages/Documents'),
  ElectricalCalc: () => import('../pages/ElectricalCalc'),
  EquipmentDiaryPage: () => import('../pages/EquipmentDiaryPage'),
  EquipmentFailureHistory: () => import('../pages/EquipmentFailureHistory'),
  ExportData: () => import('../pages/ExportData'),
  FichasMaquinas: () => import('../pages/FichasMaquinas'),
  FilterCalc: () => import('../pages/FilterCalc'),
  GaleriaImagenes: () => import('../pages/GaleriaImagenes'),
  GasSuppliers: () => import('../pages/GasSuppliers'),
  GasesRefrigerantes: () => import('../pages/GasesRefrigerantes'),
  Home: () => import('../pages/Home'),
  IncidentManagement: () => import('../pages/IncidentManagement'),
  InformesTecnicos: () => import('../pages/InformesTecnicos'),
  InstrumentosTaller: () => import('../pages/InstrumentosTaller'),
  Inventory: () => import('../pages/Inventory'),
  LegalDocs: () => import('../pages/LegalDocs'),
  LicenseActivation: () => import('../pages/LicenseActivation'),
  LicenseRenewal: () => import('../pages/LicenseRenewal'),
  Maintenance: () => import('../pages/Maintenance'),
  MaintenancePlanning: () => import('../pages/MaintenancePlanning'),
  Manuals: () => import('../pages/Manuals'),
  MultiAreaCalc: () => import('../pages/MultiAreaCalc'),
  Notes: () => import('../pages/Notes'),
  Novedades: () => import('../pages/Novedades'),
  CentroIA: () => import('../pages/CentroIA'),
  ModuloIA: () => import('../pages/ModuloIA'),
  PanelesNegocio: () => import('../pages/PanelesNegocio'),
  PlanGamas: () => import('../pages/PlanGamas'),
  PlanoFrigorifico: () => import('../pages/PlanoFrigorifico'),
  PlanoIA: () => import('../pages/PlanoIA'),
  PresionesGas: () => import('../pages/PresionesGas'),
  PresupuestoPublico: () => import('../pages/PresupuestoPublico'),
  ProjectTimeline: () => import('../pages/ProjectTimeline'),
  Projects: () => import('../pages/Projects'),
  PurchaseSummary: () => import('../pages/PurchaseSummary'),
  RefrigerantEquiv: () => import('../pages/RefrigerantEquiv'),
  Regulations: () => import('../pages/Regulations'),
  RepartoDia: () => import('../pages/RepartoDia'),
  Reports: () => import('../pages/Reports'),
  SAT: () => import('../pages/SAT'),
  SATCalendar: () => import('../pages/SATCalendar'),
  SATChat: () => import('../pages/SATChat'),
  SATPublico: () => import('../pages/SATPublico'),
  SharingWarning: () => import('../pages/SharingWarning'),
  SmartReminders: () => import('../pages/SmartReminders'),
  SolarBatteryCalc: () => import('../pages/SolarBatteryCalc'),
  SolarCalc: () => import('../pages/SolarCalc'),
  SparePartsManager: () => import('../pages/SparePartsManager'),
  SupplierTariffs: () => import('../pages/SupplierTariffs'),
  Suppliers: () => import('../pages/Suppliers'),
  TablasRefrigerantes: () => import('../pages/TablasRefrigerantes'),
  TechnicianDay: () => import('../pages/TechnicianDay'),
  TechnicianFieldWork: () => import('../pages/TechnicianFieldWork'),
  TecniciansRoutes: () => import('../pages/TecniciansRoutes'),
  ThermalCalc: () => import('../pages/ThermalCalc'),
  UpdateCenter: () => import('../pages/UpdateCenter'),
  VerificarDocumento: () => import('../pages/VerificarDocumento'),
  Visor3DGPT: () => import('../pages/Visor3DGPT')
};

const pedidas = new Set();

export function nombreDePagina(destino) {
  const limpio = String(destino || '').split('?')[0].split('#')[0].replace(/^\/+/, '');
  return limpio === '' ? 'Home' : limpio;
}

export function precargarPagina(destino) {
  const nombre = nombreDePagina(destino);
  const carga = CARGADORES[nombre];
  if (!carga || pedidas.has(nombre)) return;
  pedidas.add(nombre);
  carga().catch(() => { pedidas.delete(nombre); });
}

// Tras arrancar, y sin molestar, se adelantan las pantallas más usadas.
const FRECUENTES = ['SAT', 'Contacts', 'Documents', 'Agenda', 'RepartoDia', 'Inventory', 'SupplierTariffs', 'PanelesNegocio', 'Maintenance', 'Suppliers'];
export function precargarFrecuentes() {
  if (typeof window === 'undefined') return;
  if (navigator.connection?.saveData) return;
  const cola = FRECUENTES.slice();
  const siguiente = () => {
    const n = cola.shift();
    if (!n) return;
    precargarPagina(n);
    setTimeout(pedir, 400);
  };
  const pedir = () => (window.requestIdleCallback ? window.requestIdleCallback(siguiente, { timeout: 3000 }) : setTimeout(siguiente, 200));
  setTimeout(pedir, 2500);
}

export const PAGINAS_PRECARGABLES = Object.keys(CARGADORES);
