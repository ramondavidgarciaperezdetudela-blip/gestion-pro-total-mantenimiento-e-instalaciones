import React from 'react';

// Imagen de fondo industrial sutil (generada)
const BG_URL = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22400%22%20height=%22400%22%20viewBox=%220%200%20400%20400%22%3E%3Cdefs%3E%3Cpattern%20id=%22g%22%20width=%2240%22%20height=%2240%22%20patternUnits=%22userSpaceOnUse%22%3E%3Cpath%20d=%22M40%200H0V40%22%20fill=%22none%22%20stroke=%22%237aa2c8%22%20stroke-width=%221%22/%3E%3C/pattern%3E%3Cpattern%20id=%22G%22%20width=%22200%22%20height=%22200%22%20patternUnits=%22userSpaceOnUse%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22url(%23g)%22/%3E%3Cpath%20d=%22M200%200H0V200%22%20fill=%22none%22%20stroke=%22%237aa2c8%22%20stroke-width=%222%22/%3E%3C/pattern%3E%3C/defs%3E%3Crect%20width=%22400%22%20height=%22400%22%20fill=%22url(%23G)%22/%3E%3Cg%20fill=%22none%22%20stroke=%22%237aa2c8%22%20stroke-width=%222%22%3E%3Ccircle%20cx=%22100%22%20cy=%22100%22%20r=%2234%22/%3E%3Ccircle%20cx=%22100%22%20cy=%22100%22%20r=%226%22/%3E%3Crect%20x=%22230%22%20y=%2260%22%20width=%22110%22%20height=%2280%22%20rx=%226%22/%3E%3Cpath%20d=%22M60%20300h120M60%20300v40M180%20300v40M250%20290l20%2020%2020-20%2020%2020%2020-20%22/%3E%3C/g%3E%3C/svg%3E"; // dibujo propio, sin depender de ningún servidor externo

// Mapea el nombre de la página a un tinte/sub-título según el módulo
const SECTION_THEME = {
  Home: { tint: 'rgba(0,212,255,0.06)', label: 'Panel principal' },
  SAT: { tint: 'rgba(251,146,60,0.08)', label: 'Servicio técnico' },
  SATChat: { tint: 'rgba(0,212,255,0.07)', label: 'Chat SAT' },
  Maintenance: { tint: 'rgba(56,189,248,0.07)', label: 'Mantenimiento' },
  Agenda: { tint: 'rgba(124,58,237,0.07)', label: 'Agenda' },
  Contacts: { tint: 'rgba(16,185,129,0.06)', label: 'Contactos' },
  Suppliers: { tint: 'rgba(245,158,11,0.07)', label: 'Proveedores' },
  SupplierTariffs: { tint: 'rgba(245,158,11,0.08)', label: 'Tarifas de proveedor' },
  Inventory: { tint: 'rgba(148,163,184,0.08)', label: 'Inventario' },
  Documents: { tint: 'rgba(99,102,241,0.07)', label: 'Documentos' },
  Projects: { tint: 'rgba(59,130,246,0.07)', label: 'Proyectos' },
  ThermalCalc: { tint: 'rgba(239,68,68,0.08)', label: 'Cálculo térmico' },
  ColdRoomCalc: { tint: 'rgba(56,189,248,0.08)', label: 'Cámara frigorífica' },
  SolarCalc: { tint: 'rgba(245,158,11,0.09)', label: 'Cálculo solar' },
  SolarBatteryCalc: { tint: 'rgba(245,158,11,0.09)', label: 'Solar + batería' },
  ElectricalCalc: { tint: 'rgba(250,204,21,0.08)', label: 'Cálculo eléctrico' },
  CapillaryCalc: { tint: 'rgba(6,182,212,0.09)', label: 'Tubo capilar' },
  FilterCalc: { tint: 'rgba(217,119,6,0.09)', label: 'Filtro deshidratador' },
  RefrigerantEquiv: { tint: 'rgba(6,182,212,0.08)', label: 'Refrigerantes' },
  Regulations: { tint: 'rgba(148,163,184,0.08)', label: 'Normativas' },
  Reports: { tint: 'rgba(34,197,94,0.07)', label: 'Informes' },
  AIAssistant: { tint: 'rgba(124,58,237,0.09)', label: 'Asistente IA' },
};

export default function SectionBackground({ pageName }) {
  const theme = SECTION_THEME[pageName] || { tint: 'rgba(99,102,241,0.05)', label: '' };
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{
        backgroundImage: `url('${BG_URL}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.12,
      }}
    >
      <div className="absolute inset-0" style={{ background: theme.tint }} />
    </div>
  );
}