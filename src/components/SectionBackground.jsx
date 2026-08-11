import React from 'react';

// Imagen de fondo industrial sutil (generada)
const BG_URL = 'https://media.base44.com/images/public/6994f99700e8a842baf72997/8da28a740_generated_image.png';

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