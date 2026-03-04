import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sun, Battery, Zap, Calculator, Save, UserCheck, Download, FileText, Printer, ShoppingCart, Plug, Cpu, Package, Cable, Layers, Edit3, CheckCircle, Sparkles, Wrench } from 'lucide-react';
import SolarSparePartsTab from '../components/solar/SolarSparePartsTab';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import SolarWiringDiagram from '../components/SolarWiringDiagram';
import BatteryWiringDiagram from '../components/BatteryWiringDiagram';
import AIReportPanel from '../components/solar/AIReportPanel';

// ─── CÁLCULO SOLAR ────────────────────────────────────────────────────────────
function calcSolar(form, mode) {
  let numPanels = parseInt(form.num_panels) || 0;
  let panelW = parseInt(form.panel_power_w) || 400;
  let consumKwh = parseFloat(form.consumption_kwh) || 0;
  const hsp = 4.5;
  if (mode === 'por_consumo') {
    const dailyKwh = consumKwh > 50 ? consumKwh / 365 : consumKwh;
    numPanels = Math.ceil((dailyKwh * 1000) / (panelW * hsp * 0.8));
  }
  const totalKwp = (numPanels * panelW) / 1000;
  const dailyProduction = totalKwp * hsp * 0.8;
  const yearlyProduction = dailyProduction * 365;
  const inverterKw = Math.ceil(totalKwp * 0.9) || 1;
  const numStrings = Math.max(1, Math.ceil(numPanels / 16));
  const batteryKwh = dailyProduction * 0.5;
  const numBatteries = Math.ceil(batteryKwh / 2.4) || 1;
  const distPanelsDC = parseFloat(form.distance_panels_to_dc_box) || 10;
  const distInvBat = parseFloat(form.distance_inverter_to_batteries) || 3;
  const distAC = parseFloat(form.distance_to_ac_box) || 5;
  const dcCurrentA = Math.ceil((numPanels / numStrings) * (panelW / (32 * numStrings)));
  const dcCableMm2 = dcCurrentA > 20 ? 6 : 4;

  const materials = [
    { material: `Panel solar ${panelW}Wp monocristalino PERC`, qty: numPanels, unit: 'ud', spec: `${panelW}W, Voc≈37V, Isc≈13A`, brands: 'JA Solar, Longi Solar, Canadian Solar, REC', shop: 'Solarwind, Soltec, ER Solar, Krannich Solar', approx_price: (panelW * 0.22).toFixed(0) + ' €/ud' },
    { material: `Inversor híbrido ${inverterKw}kW`, qty: 1, unit: 'ud', spec: `${inverterKw}kW, MPPT doble, WiFi, 230V AC`, brands: 'SolarEdge, Huawei SUN2000, Fronius, Growatt, SMA', shop: 'Solarwind, Electro Depot, Distrisol', approx_price: (inverterKw * 180 + 400).toFixed(0) + ' €' },
    { material: `Cable solar DC 6mm² H1Z2Z2-K`, qty: distPanelsDC * 2, unit: 'm', spec: '6mm², rojo + negro, 1,5kV DC', brands: 'Prysmian, Nexans, Top Cable, Lapp', shop: 'RS Components, Würth, Conrad', approx_price: '1,80 €/m' },
    { material: `Conector MC4 macho+hembra`, qty: numPanels * 4, unit: 'par', spec: 'MC4, IP67, 1000V DC, 30A', brands: 'Stäubli, Amphenol, Weidmüller', shop: 'RS Components, Mouser, Conrad', approx_price: '1,50 €/par' },
    { material: `Estructura soporte aluminio`, qty: numPanels, unit: 'ud panel', spec: 'Cubierta plana o inclinada, aluminio anodizado', brands: 'Conergy, Schletter, K2 Systems, Unirac', shop: 'Solarwind, ER Solar, Krannich', approx_price: '25 €/panel' },
    { material: `Cable AC 3x${dcCableMm2}mm² RZ1-K`, qty: distAC, unit: 'm', spec: `3x${dcCableMm2}mm², 1kV AC, flexible`, brands: 'Prysmian, Nexans, Lapp', shop: 'Würth, RS Components', approx_price: '4,50 €/m' },
    { material: `Cable DC baterías 35mm² flexible`, qty: distInvBat * 2, unit: 'm', spec: '35mm² negro/rojo, 1kV DC', brands: 'Prysmian, Top Cable', shop: 'RS Components, Würth', approx_price: '8 €/m' },
    { material: `Batería LiFePO4 2,4kWh 51,2V`, qty: numBatteries, unit: 'ud', spec: '100Ah, 51,2V, BMS integrado, ciclos >6000', brands: 'Pylontech US2000, BYD Battery Box, Huawei LUNA', shop: 'Solarwind, Distrisol, Krannich', approx_price: '850 €/ud' },
    { material: `Tubo corrugado PVC Ø32mm`, qty: distPanelsDC + distAC, unit: 'm', spec: 'Ø32mm, doble capa, libre halógenos', brands: 'Gewiss, Pemsa, Aiscan', shop: 'Würth, Bricomart, Leroy Merlin', approx_price: '1,20 €/m' },
    { material: `Contador bidireccional', qty: 1, unit: 'ud`, spec: 'MID, M-Bus o DLMS, trifásico 63A', brands: 'Circutor, Schneider iEM, Carlo Gavazzi', shop: 'Solarwind, RS Components, TEV', approx_price: '180 €' },
  ];

  const electricalPanelItems = [
    { element: 'Caja cuadro DC (fusibles + seccionador)', spec: 'IP65, DIN 8 módulos, con puerta', qty: numStrings, brands: 'Solaredge, ABB, Hager', shop: 'RS Components, Würth', notes: 'Cuadro DC protección strings' },
    { element: `Portafusibles DC ${numStrings} polos`, spec: `10x38mm, ${numStrings} polos, 1000V DC`, qty: numStrings * 2, brands: 'Siba, Bussmann, ABB', shop: 'RS Components, TEV', notes: 'Positivo y negativo por string' },
    { element: 'Fusibles gPV 15A/1000V DC', spec: '10x38mm, 15A, gPV', qty: numStrings * 2, brands: 'Siba, Bussmann, Mersen', shop: 'RS Components, Mouser', notes: '1 por polo + repuesto' },
    { element: 'Descargador sobretensión DC tipo 2', spec: '1000V DC, Imax 40kA, tipo 2', qty: numStrings, brands: 'Dehn, OBO Bettermann, Citel', shop: 'RS Components, TEV', notes: 'Por string' },
    { element: 'Seccionador DC 2P 32A 1000V', spec: '2 polos, 32A, 1000V DC, rotativo', qty: numStrings, brands: 'ABB, Schneider, Hager', shop: 'RS Components, Würth, TEV', notes: 'Seguridad desconexión string' },
    { element: 'Caja cuadro AC (cuadro principal)', spec: 'IP40-IP65, DIN 12 módulos', qty: 1, brands: 'ABB, Hager, Legrand, Gewiss', shop: 'Leroy Merlin, Würth, RS Comp.', notes: 'Cuadro AC inversor' },
    { element: `IGA (Interruptor General Automático) ${inverterKw > 5 ? 40 : 25}A`, spec: `${inverterKw > 5 ? 40 : 25}A, 3P+N, curva C, 6kA`, qty: 1, brands: 'ABB, Schneider, Hager, Legrand', shop: 'Leroy Merlin, Bricomart, TEV', notes: 'Protección general AC' },
    { element: 'Diferencial 40A 30mA AC', spec: '4P, 40A, 30mA, clase AC', qty: 1, brands: 'ABB, Schneider, Hager', shop: 'Leroy Merlin, Würth, RS Comp.', notes: 'Protección diferencial AC' },
    { element: 'Descargador sobretensión AC tipo 2', spec: '40kA, 4P, Uc 275V', qty: 1, brands: 'Dehn, OBO Bettermann, Citel', shop: 'RS Components, TEV', notes: 'Cuadro AC' },
    { element: 'Bornas carril DIN 6mm²', spec: '6mm², carril 35mm', qty: 20, brands: 'Phoenix Contact, Wago, Wieland', shop: 'RS Components, Würth, Conrad', notes: 'Conexiones cuadro' },
    { element: 'Etiquetas señalización riesgo eléctrico', spec: 'Autoadhesivas, normativa IEC', qty: 5, brands: 'Brady, Bossert, Panduit', shop: 'RS Components, Würth', notes: 'Obligatorio normativa' },
  ];

  return { numPanels, totalKwp, dailyProduction, yearlyProduction, inverterKw, numStrings, batteryKwh, numBatteries, materials, electricalPanelItems, dcCableMm2, distPanelsDC, distInvBat, distAC };
}

// ─── CÁLCULO BATERÍAS ─────────────────────────────────────────────────────────
function calcBattery(form) {
  const consumoDiarioKwh = parseFloat(form.consumo_diario) || 5;
  const autonomiaDias = parseFloat(form.autonomia_dias) || 2;
  const profundidadDescarga = parseFloat(form.profundidad_descarga) || 0.8;
  const voltajeSistema = parseInt(form.voltaje_sistema) || 48;
  const eficienciaInversor = parseFloat(form.eficiencia_inversor) || 0.9;
  const potenciaPicoW = parseFloat(form.potencia_pico_w) || 3000;
  const tipoRed = form.tipo_red || 'aislada';
  const energiaNecesariaKwh = (consumoDiarioKwh * autonomiaDias) / (profundidadDescarga * eficienciaInversor);
  const energiaNecesariaAh = (energiaNecesariaKwh * 1000) / voltajeSistema;
  const capBateria = voltajeSistema === 48 ? 100 : (voltajeSistema === 24 ? 200 : 400);
  const numBaterias = Math.ceil(energiaNecesariaAh / capBateria);
  const energiaTotalKwh = (numBaterias * capBateria * voltajeSistema) / 1000;
  const potenciaInversorKw = Math.ceil(potenciaPicoW / 1000 * 1.25);
  const potenciaInversorW = potenciaInversorKw * 1000;
  const corrienteCargaA = Math.ceil(energiaNecesariaAh * 0.2);
  const potenciaCargadorKw = Math.ceil((corrienteCargaA * voltajeSistema) / 1000 * 1.1);
  const potenciaGeneradorKva = Math.ceil(potenciaInversorKw * 1.3);
  const panelW = parseInt(form.panel_power_w) || 400;
  const numPaneles = parseInt(form.num_paneles) || 0;
  const totalPanelW = numPaneles * panelW;
  const mpptA = totalPanelW > 0 ? Math.ceil(totalPanelW / voltajeSistema * 1.25) : 0;
  const mpptKw = totalPanelW > 0 ? Math.ceil(totalPanelW / 1000 * 1.1) : 0;
  const corrienteBmsA = Math.ceil(potenciaInversorW / voltajeSistema * 1.2);
  const cableSeccionMm2 = corrienteBmsA > 200 ? 70 : corrienteBmsA > 100 ? 50 : 35;

  const equipmentTable = [
    { equipo: '🔋 Batería LiFePO4', qty: numBaterias, spec: `${capBateria}Ah ${voltajeSistema}V (${(capBateria * voltajeSistema / 1000).toFixed(1)} kWh/ud)`, brands: 'Pylontech US2000/US3000, BYD Battery Box Premium, Huawei LUNA 2000, Eve Energy', shop: 'Solarwind, Distrisol, Krannich Solar, Soltec', notes: `BMS integrado, >6000 ciclos, comun. CAN/RS485`, price_ref: `${(capBateria * voltajeSistema / 1000 * 300).toFixed(0)} €/ud` },
    { equipo: '⚡ Inversor/Cargador', qty: 1, spec: `${potenciaInversorKw}kW ${voltajeSistema}V DC, onda senoidal pura`, brands: 'Victron MultiPlus II, Growatt SPF, Studer Xtender, SMA Sunny Island, Schneider XW+', shop: 'Victron Energy ES, Solarwind, Distrisol', notes: 'Paralizable, arranque automático generador', price_ref: `${(potenciaInversorKw * 250 + 500).toFixed(0)} €` },
    { equipo: '☀️ Regulador MPPT', qty: mpptKw > 0 ? 1 : 0, spec: `${mpptA}A / ${mpptKw}kW, ${voltajeSistema}V`, brands: 'Victron SmartSolar 150/85, EPEver Tracer AN, Renogy Rover, Morningstar', shop: 'Victron Energy ES, RS Components, Renogy.es', notes: `Solo si hay paneles. Voc máx 150V`, price_ref: mpptKw > 0 ? `${(mpptKw * 80 + 150).toFixed(0)} €` : 'N/A' },
    { equipo: '🏭 Generador apoyo', qty: 1, spec: `${potenciaGeneradorKva}kVA, monofásico, arranque eléctrico`, brands: 'Honda EU série, Genmac Click, Mosa GE, Briggs&Stratton', shop: 'Bricomart, Leroy Merlin, Amazon, Generadorelectrico.es', notes: 'Arranque automático por bajo voltaje batería', price_ref: `${(potenciaGeneradorKva * 180 + 200).toFixed(0)} €` },
    { equipo: '🛡️ BMS', qty: 1, spec: `Mín. ${corrienteBmsA}A ${voltajeSistema}V, CAN/RS485`, brands: 'Integrado en Pylontech/BYD/Huawei. Ext: Daly, JK BMS, Seplos', shop: 'Incluido en batería. Externo: AliExpress Pro, Batería Litio ES', notes: 'Gestión carga, temperatura y equilibrado', price_ref: 'Incluido en batería' },
    { equipo: '🔌 Cable DC baterías', qty: Math.ceil(energiaNecesariaAh / 100) * 2 + 4, spec: `${cableSeccionMm2}mm² flexible, ${voltajeSistema}V DC, rojo+negro`, brands: 'Prysmian, Top Cable, Nexans', shop: 'RS Components, Würth, Bricolemar', notes: `Sección mínima ${cableSeccionMm2}mm² para ${corrienteBmsA}A`, price_ref: `${(cableSeccionMm2 * 0.3 + 3).toFixed(0)} €/m` },
    { equipo: '🔴 Shunt/Coulómetro', qty: 1, spec: `${corrienteBmsA * 1.5 > 500 ? 500 : Math.ceil(corrienteBmsA * 1.5)}A / 75mV`, brands: 'Victron SmartShunt 500A, Yuk Power, Daly BMS', shop: 'Victron Energy ES, RS Components', notes: 'Monitorización estado de carga real', price_ref: '45–90 €' },
  ];

  const electricalPanelBat = [
    { element: 'Fusible DC main 250A/48V + portafusibles', spec: 'ANL/MIDI, 250A o según corriente, 80V DC', qty: 1, brands: 'Littelfuse, Blue Sea Systems, ANL', shop: 'RS Components, Caraudiovideo, Amazon', notes: 'Protección principal entre batería e inversor' },
    { element: `Seccionador DC ${voltajeSistema}V 2P`, spec: `2 polos, ${Math.ceil(corrienteBmsA * 1.2)}A mín., ${voltajeSistema}V DC`, qty: 1, brands: 'ABB, Schneider, Hager, Mersen', shop: 'RS Components, TEV, Würth', notes: 'Desconexión segura baterías' },
    { element: 'Descargador sobretensión DC tipo 1+2', spec: '40kA, Uc 60V DC (para 48V), carril DIN', qty: 1, brands: 'Dehn, OBO Bettermann, Citel', shop: 'RS Components, TEV, Elecsa', notes: 'Cuadro baterías' },
    { element: 'IGA AC salida inversor', spec: `${Math.ceil(potenciaInversorW / 230 * 1.25)}A, 1P+N o 3P+N, curva C`, qty: 1, brands: 'ABB, Schneider, Hager, Legrand', shop: 'Leroy Merlin, Bricomart, TEV', notes: 'Protección salida AC inversor' },
    { element: 'Diferencial 40A 30mA tipo A', spec: '4P, 40A, 30mA, clase A (admite armónicos)', qty: 1, brands: 'ABB, Schneider, Hager', shop: 'Leroy Merlin, RS Components', notes: 'Cuadro salida AC. Tipo A para inversores' },
    { element: 'Relé de arranque automático generador', spec: '24V/12V DC, 30A, temporizable', qty: hasGen(tipoRed) ? 1 : 0, brands: 'Victron Auto Transfer Switch, Datakom', shop: 'Victron Energy ES, Solarwind', notes: 'Arranque generador por bajo voltaje' },
    { element: 'Caja cuadro IP65 DIN', spec: 'IP65, 12-24 módulos, exterior/interior', qty: 1, brands: 'Hager Volta, ABB Mistral, Legrand', shop: 'RS Components, Würth, Leroy Merlin', notes: 'Cuadro principal sistema almacenamiento' },
  ];

  function hasGen(t) { return t === 'aislada' || t === 'backup'; }

  return { consumoDiarioKwh, autonomiaDias, voltajeSistema, energiaNecesariaKwh: energiaNecesariaKwh.toFixed(2), energiaNecesariaAh: energiaNecesariaAh.toFixed(0), numBaterias, capBateria, energiaTotalKwh: energiaTotalKwh.toFixed(2), potenciaInversorKw, potenciaInversorW, corrienteCargaA, potenciaCargadorKw, potenciaGeneradorKva, mpptA, mpptKw, numPaneles, totalPanelW, corrienteBmsA, tipoRed, cableSeccionMm2, equipmentTable, electricalPanelBat };
}

// ─── DOCUMENTOS LEGALIZACIÓN ─────────────────────────────────────────────────
const LEGAL_DOCS = [
  {
    title: '📋 Memoria Técnica de Diseño (MTD)',
    desc: 'Documento técnico obligatorio con la descripción de la instalación, cálculos justificativos, esquemas y características de los equipos.',
    download: 'https://www.mincotur.gob.es/energia/electricidad/AutoconsumoFotovoltaico/Documents/Modelo_MTD_instalaciones_autoconsumo.pdf',
    type: 'Descargar modelo oficial (MINCOTUR)',
    where: 'Se presenta ante la Comunidad Autónoma (Delegación de Industria) + copia a la distribuidora eléctrica.',
    required: true,
  },
  {
    title: '📝 Certificado de Instalación Eléctrica (CIE)',
    desc: 'Documento firmado por instalador eléctrico autorizado (carnet de instalador categoría B mínimo) que certifica la correcta ejecución de la instalación.',
    download: 'https://www.mincotur.gob.es/energia/electricidad/InstalacionesElectricas/Documents/CIE_Baja_tension.pdf',
    type: 'Modelo estándar CIE',
    where: 'Presentar en la Delegación de Industria/Energía de tu Comunidad Autónoma. Necesario para el boletín eléctrico.',
    required: true,
  },
  {
    title: '🔌 Boletín/Certificado de Instalación Baja Tensión',
    desc: 'Emitido por el instalador eléctrico autorizado. Necesario para la legalización ante Industria y para contratar la conexión con la distribuidora.',
    download: 'https://www.mincotur.gob.es/energia/electricidad/InstalacionesElectricas/Documents/BT_modelo_boletin.pdf',
    type: 'Modelo boletín BT',
    where: 'Industria autonómica + distribuidora (Endesa, Iberdrola, Naturgy, etc.) para autorizar la conexión.',
    required: true,
  },
  {
    title: '☀️ Formulario Comunicación Autoconsumo (CAU)',
    desc: 'Formulario de Comunicación de Autoconsumo a la distribuidora eléctrica. Obligatorio para toda instalación fotovoltaica conectada a red.',
    download: 'https://www.ree.es/sites/default/files/01_ACTIVIDADES/Documentos/Acceso_conexion/Formulario-solicitud-acceso-conexion-autoconsumo.pdf',
    type: 'Formulario solicitud conexión/autoconsumo',
    where: 'Presentar a la empresa distribuidora de tu zona (Endesa Distribución, i-DE Iberdrola, UFD Naturgy). También por sede electrónica.',
    required: true,
  },
  {
    title: '🏛️ Solicitud Inscripción RAIPREE',
    desc: 'Registro Administrativo de Instalaciones de Producción de Energía Eléctrica. Obligatorio para instalaciones > 100kW. Para < 100kW se inscribe automáticamente tras comunicación a la CC.AA.',
    download: 'https://sede.gob.es/tramites/es/tramites/T1149.html',
    type: 'Portal Sede Electrónica del Gobierno',
    where: 'Ministerio para la Transición Ecológica (MITERD). Para instalaciones > 100kW o cuando la CC.AA. lo exija.',
    required: false,
  },
  {
    title: '🔐 Licencia de Obras / Autorización Municipal',
    desc: 'Según el municipio, puede requerirse licencia de obra menor para la instalación de paneles en cubierta. Consultar ordenanza local.',
    download: 'https://www.mitma.gob.es/urbanismo-y-politica-del-suelo/documentacion-y-publicaciones',
    type: 'Consultar Ayuntamiento',
    where: 'Ayuntamiento del municipio donde se realiza la instalación. Muchos municipios tienen tramitación online.',
    required: false,
  },
  {
    title: '📦 Declaración de Conformidad CE Equipos',
    desc: 'Documentación CE de paneles, inversor y baterías. Obligatoria para la inscripción y auditorías. Proporcionada por el fabricante.',
    download: null,
    type: 'Solicitar al proveedor del equipo',
    where: 'Conservar en el dossier de la instalación. Presentar si lo solicita Industria o la distribuidora.',
    required: true,
  },
  {
    title: '🌡️ Estudio de Impacto (instalaciones > 1MW)',
    desc: 'Para instalaciones de gran escala. Requiere Evaluación de Impacto Ambiental y autorización administrativa previa.',
    download: 'https://www.miteco.gob.es/es/ministerio/servicios/evaluacion-ambiental/',
    type: 'Portal EIA MITECO',
    where: 'Ministerio de Transición Ecológica + CC.AA. correspondiente.',
    required: false,
  },
];

const PASOS_LEGALIZACION = [
  { step: 1, title: 'Diseño y proyecto técnico', desc: 'El instalador certific. prepara la MTD (Memoria Técnica de Diseño) con los cálculos, esquemas y especificaciones de todos los equipos.' },
  { step: 2, title: 'Solicitud punto de conexión a distribuidora', desc: 'Presentar formulario CAU (Código Autoconsumo) a la distribuidora (Endesa, Iberdrola, Naturgy...) para obtener el punto de conexión y condiciones técnicas.' },
  { step: 3, title: 'Ejecución de la instalación', desc: 'Instalación por técnico autorizado con carnet de instalador eléctrico categoría B. Se realiza toda la instalación según proyecto.' },
  { step: 4, title: 'Certificado de Instalación (CIE + Boletín BT)', desc: 'El instalador autorizado emite el Certificado de Instalación Eléctrica y el Boletín de Baja Tensión firmado.' },
  { step: 5, title: 'Inscripción en Delegación de Industria (CC.AA.)', desc: 'Presentar MTD + CIE + Boletín BT + facturas de equipos en la Delegación de Industria/Energía de tu Comunidad Autónoma. Se obtiene la resolución de inscripción.' },
  { step: 6, title: 'Activación autoconsumo con distribuidora', desc: 'Con la resolución de Industria, la distribuidora instala el contador bidireccional y activa el contrato de autoconsumo. A partir de aquí la instalación es legal y funciona.' },
  { step: 7, title: '(Opcional) Solicitar compensación económica', desc: 'Si hay excedentes, tramitar con la comercializadora el contrato de compensación de excedentes (RD 244/2019) para recibir compensación en factura.' },
];

// ─── ICONOS POR TIPO DE MATERIAL ─────────────────────────────────────────────
const MATERIAL_ICONS = {
  'Panel': '☀️', 'Inversor': '⚡', 'Cable': '🔴', 'Conector': '🔌', 'Estructura': '🏗️',
  'Batería': '🔋', 'Tubo': '🔧', 'Contador': '📊', 'BMS': '🛡️', 'Regulador': '🔆',
  'Cargador': '🔌', 'Generador': '🏭', 'Shunt': '📡', 'Descargador': '⚡', 'Fusible': '🔴',
  'default': '📦'
};
function getMaterialIcon(name) {
  for (const [key, icon] of Object.entries(MATERIAL_ICONS)) {
    if (name?.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return MATERIAL_ICONS.default;
}

// ─── COMPONENTE TABLA MATERIALES SOLAR ───────────────────────────────────────
function MaterialTableSolar({ materials }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-amber-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-amber-600 text-white">
            <th className="p-2 text-left">Material / Equipo</th>
            <th className="p-2 text-center w-12">Cant.</th>
            <th className="p-2 text-left w-10">Ud.</th>
            <th className="p-2 text-left">Especificación</th>
            <th className="p-2 text-left">Marcas sugeridas</th>
            <th className="p-2 text-left">Dónde comprar</th>
            <th className="p-2 text-right w-20">Precio ref.</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-amber-50' : 'bg-amber-50 hover:bg-amber-100'}>
              <td className="border-b border-gray-100 p-2 font-medium">
                <span className="mr-1">{getMaterialIcon(m.material)}</span>{m.material}
              </td>
              <td className="border-b border-gray-100 p-2 text-center font-bold text-amber-700 bg-amber-50">{m.qty}</td>
              <td className="border-b border-gray-100 p-2 text-gray-500">{m.unit}</td>
              <td className="border-b border-gray-100 p-2 text-gray-600">{m.spec}</td>
              <td className="border-b border-gray-100 p-2 text-blue-700 font-medium">{m.brands}</td>
              <td className="border-b border-gray-100 p-2 text-green-700">{m.shop}</td>
              <td className="border-b border-gray-100 p-2 text-right font-semibold text-gray-700">{m.approx_price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── TABLA CUADRO ELÉCTRICO SOLAR ────────────────────────────────────────────
function ElecPanelTableSolar({ items }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-blue-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="p-2 text-left">⚡ Elemento</th>
            <th className="p-2 text-left">Especificación técnica</th>
            <th className="p-2 text-center w-12">Cant.</th>
            <th className="p-2 text-left">Marcas</th>
            <th className="p-2 text-left">Dónde comprar</th>
            <th className="p-2 text-left">Ubicación</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-blue-50 hover:bg-blue-100'}>
              <td className="border-b border-gray-100 p-2 font-medium">
                <span className="mr-1">{getMaterialIcon(m.element)}</span>{m.element}
              </td>
              <td className="border-b border-gray-100 p-2 text-gray-600">{m.spec}</td>
              <td className="border-b border-gray-100 p-2 text-center font-bold text-blue-700 bg-blue-50">{m.qty}</td>
              <td className="border-b border-gray-100 p-2 text-blue-700 font-medium">{m.brands}</td>
              <td className="border-b border-gray-100 p-2 text-green-700">{m.shop}</td>
              <td className="border-b border-gray-100 p-2 text-gray-500">{m.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── COMPONENTE TABLA EQUIPOS BATERÍAS ───────────────────────────────────────
function EquipmentTableBat({ items }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-green-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-green-700 text-white">
            <th className="p-2 text-left">🔋 Equipo</th>
            <th className="p-2 text-center w-12">Cant.</th>
            <th className="p-2 text-left">Especificación</th>
            <th className="p-2 text-left">Marcas / Modelos</th>
            <th className="p-2 text-left">Dónde comprar</th>
            <th className="p-2 text-left">Notas</th>
            <th className="p-2 text-right w-20">Precio ref.</th>
          </tr>
        </thead>
        <tbody>
          {items.filter(it => it.qty > 0).map((m, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-green-50' : 'bg-green-50 hover:bg-green-100'}>
              <td className="border-b border-gray-100 p-2 font-medium">{m.equipo}</td>
              <td className="border-b border-gray-100 p-2 text-center font-bold text-green-700 bg-green-50">{m.qty}</td>
              <td className="border-b border-gray-100 p-2 text-gray-600">{m.spec}</td>
              <td className="border-b border-gray-100 p-2 text-blue-700 font-medium">{m.brands}</td>
              <td className="border-b border-gray-100 p-2 text-green-700">{m.shop}</td>
              <td className="border-b border-gray-100 p-2 text-gray-500">{m.notes}</td>
              <td className="border-b border-gray-100 p-2 text-right font-semibold text-gray-700">{m.price_ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ElecPanelTableBat({ items }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-purple-200">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-purple-700 text-white">
            <th className="p-2 text-left">⚡ Elemento</th>
            <th className="p-2 text-left">Especificación</th>
            <th className="p-2 text-center w-12">Cant.</th>
            <th className="p-2 text-left">Marcas</th>
            <th className="p-2 text-left">Dónde comprar</th>
            <th className="p-2 text-left">Función</th>
          </tr>
        </thead>
        <tbody>
          {items.filter(it => it.qty > 0).map((m, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-white hover:bg-purple-50' : 'bg-purple-50 hover:bg-purple-100'}>
              <td className="border-b border-gray-100 p-2 font-medium">
                <span className="mr-1">{getMaterialIcon(m.element)}</span>{m.element}
              </td>
              <td className="border-b border-gray-100 p-2 text-gray-600">{m.spec}</td>
              <td className="border-b border-gray-100 p-2 text-center font-bold text-purple-700 bg-purple-50">{m.qty}</td>
              <td className="border-b border-gray-100 p-2 text-blue-700 font-medium">{m.brands}</td>
              <td className="border-b border-gray-100 p-2 text-green-700">{m.shop}</td>
              <td className="border-b border-gray-100 p-2 text-gray-500">{m.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── KPI BOX ─────────────────────────────────────────────────────────────────
function KpiBox({ value, label, sub, color }) {
  return (
    <div className={`${color} p-4 rounded-xl text-center border border-white/60 shadow-sm`}>
      <p className="text-xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── SECCIÓN LEGALIZACIÓN ─────────────────────────────────────────────────────
function LegalizacionSection() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />Documentación y Legalización de Instalaciones Solares</h2>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-blue-800 mb-1">ℹ️ Normativa de referencia en España</p>
          <p className="text-xs text-blue-700">Real Decreto 244/2019 (autoconsumo) · REBT e ITC-BT-40 (instalaciones generadoras) · Real Decreto 1183/2020 (acceso y conexión) · Normativa autonómica aplicable</p>
        </CardContent>
      </Card>

      {/* Pasos legalización */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">📍 Pasos para legalizar tu instalación solar</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-center w-10">Paso</th>
                  <th className="border p-2 text-left">Acción</th>
                  <th className="border p-2 text-left">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {PASOS_LEGALIZACION.map((p, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-2 text-center"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs">{p.step}</span></td>
                    <td className="border p-2 font-semibold text-blue-900">{p.title}</td>
                    <td className="border p-2 text-gray-600">{p.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Documentos descargables */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">📥 Documentos para descargar y rellenar</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Documento</th>
                  <th className="border p-2 text-left">Descripción</th>
                  <th className="border p-2 text-left">Dónde presentar</th>
                  <th className="border p-2 text-center">Oblig.</th>
                  <th className="border p-2 text-center">Enlace</th>
                </tr>
              </thead>
              <tbody>
                {LEGAL_DOCS.map((d, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-2 font-semibold">{d.title}</td>
                    <td className="border p-2 text-gray-600">{d.desc}</td>
                    <td className="border p-2 text-gray-700">{d.where}</td>
                    <td className="border p-2 text-center">{d.required ? <span className="text-red-600 font-bold">Sí</span> : <span className="text-gray-400">No</span>}</td>
                    <td className="border p-2 text-center">
                      {d.download ? (
                        <a href={d.download} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium">
                          <Download className="w-3 h-3" />{d.type}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-[10px]">{d.type}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Comparativa: otras instalaciones */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">⚖️ Comparativa legalización: Solar vs Eléctrica vs Clima vs Frío Industrial</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Tipo instalación</th>
                  <th className="border p-2">Certificado técnico</th>
                  <th className="border p-2">Dónde presentar</th>
                  <th className="border p-2">Carnet requerido</th>
                  <th className="border p-2">Plazo aprox.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tipo: '☀️ Solar fotovoltaica', cert: 'MTD + CIE + Boletín BT', donde: 'Industria CC.AA. + Distribuidora eléctrica', carnet: 'Instalador eléctrico cat. B + habilitación fotovoltaica', plazo: '2-8 semanas' },
                  { tipo: '⚡ Instalación eléctrica BT', cert: 'CIE + Boletín BT', donde: 'Delegación de Industria CC.AA.', carnet: 'Instalador eléctrico cat. B (o A para grandes)', plazo: '1-3 semanas' },
                  { tipo: '❄️ Climatización (RITE)', cert: 'Certificado RITE + Libro mantenimiento', donde: 'Industria CC.AA. + Ayuntamiento (licencia)', carnet: 'Empresa mantenedora RITE + instalador habilitado', plazo: '2-6 semanas' },
                  { tipo: '🧊 Refrigeración industrial (F-Gas)', cert: 'Certif. instalación + registro F-Gas + libro seguimiento', donde: 'Registro F-Gas (MAGRAMA) + Industria CC.AA.', carnet: 'Operador F-Gas habilitado (carnet AENOR/BV)', plazo: '2-4 semanas' },
                ].map((r, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border p-2 font-semibold">{r.tipo}</td>
                    <td className="border p-2">{r.cert}</td>
                    <td className="border p-2 text-blue-700">{r.donde}</td>
                    <td className="border p-2 text-orange-700">{r.carnet}</td>
                    <td className="border p-2 text-center">{r.plazo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function SolarBatteryCalc() {
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('solar');

  // Solar state
  const [solarMode, setSolarMode] = useState('directo');
  const [solarForm, setSolarForm] = useState({ contact_id: '', contact_name: '', num_panels: 8, panel_power_w: 400, consumption_kwh: 15, distance_panels_to_dc_box: 15, distance_inverter_to_batteries: 3, distance_to_ac_box: 8 });
  const [solarResult, setSolarResult] = useState(null);
  const [solarSavedId, setSolarSavedId] = useState(null);
  const [solarSavedMsg, setSolarSavedMsg] = useState('');
  const [solarEditing, setSolarEditing] = useState(false);
  const solarPrintRef = useRef(null);

  // Battery state
  const [batForm, setBatForm] = useState({ contact_id: '', contact_name: '', consumo_diario: 5, autonomia_dias: 2, profundidad_descarga: 0.8, voltaje_sistema: 48, eficiencia_inversor: 0.9, potencia_pico_w: 3000, tipo_red: 'aislada', num_paneles: 0, panel_power_w: 400 });
  const [batResult, setBatResult] = useState(null);
  const [batSavedId, setBatSavedId] = useState(null);
  const [batSavedMsg, setBatSavedMsg] = useState('');
  const [batEditing, setBatEditing] = useState(false);
  const batPrintRef = useRef(null);

  // Combined state
  const [combForm, setCombForm] = useState({ contact_id: '', contact_name: '', num_panels: 10, panel_power_w: 400, consumo_diario: 8, autonomia_dias: 1, profundidad_descarga: 0.8, voltaje_sistema: 48, potencia_pico_w: 5000, tipo_red: 'hibrida', distance_panels_to_dc_box: 15, distance_inverter_to_batteries: 3, distance_to_ac_box: 8 });
  const [combResult, setCombResult] = useState(null);
  const [combSavedId, setCombSavedId] = useState(null);
  const [combSavedMsg, setCombSavedMsg] = useState('');
  const [combEditing, setCombEditing] = useState(false);
  const combPrintRef = useRef(null);

  useEffect(() => { base44.entities.Contact.list().then(setContacts); }, [])

  const selectContact = (formSetter) => (v) => {
    const c = contacts.find(co => co.id === v);
    formSetter(f => ({ ...f, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : '' }));
  };

  const buildSolarTitle = (r) => `Cálculo solar ${r.totalKwp.toFixed(2)}kWp — ${format(new Date(), 'dd/MM/yyyy')}`;
  const buildSolarDesc = (r) => `${r.numPanels} paneles, ${r.totalKwp.toFixed(2)}kWp, inv. ${r.inverterKw}kW`;

  const saveSolar = async () => {
    if (!solarResult) return;
    const data = { contact_id: solarForm.contact_id || '', contact_name: solarForm.contact_name || 'Sin cliente', title: buildSolarTitle(solarResult), doc_type: 'calculo_solar', date: format(new Date(), 'yyyy-MM-dd'), description: buildSolarDesc(solarResult) };
    if (solarSavedId) {
      await base44.entities.SolarCalculation.update(solarSavedId, { num_panels: solarResult.numPanels, total_power_kwp: solarResult.totalKwp, inverter_power_w: solarResult.inverterKw * 1000, notes: buildSolarDesc(solarResult) });
    } else {
      const rec = await base44.entities.SolarCalculation.create({ contact_id: solarForm.contact_id || '', contact_name: solarForm.contact_name || 'Sin cliente', calc_mode: solarMode, num_panels: solarResult.numPanels, panel_power_w: parseInt(solarForm.panel_power_w), total_power_kwp: solarResult.totalKwp, inverter_power_w: solarResult.inverterKw * 1000, estimated_production_kwh_year: solarResult.yearlyProduction, date: format(new Date(), 'yyyy-MM-dd'), notes: buildSolarDesc(solarResult) });
      setSolarSavedId(rec.id);
      if (solarForm.contact_id) await base44.entities.ClientDocument.create(data);
    }
    setSolarSavedMsg(solarSavedId ? '¡Actualizado!' : '¡Guardado!');
    setSolarEditing(false);
    setTimeout(() => setSolarSavedMsg(''), 3000);
  };

  const buildBatTitle = (r) => `Cálculo baterías ${r.energiaTotalKwh}kWh — ${format(new Date(), 'dd/MM/yyyy')}`;
  const buildBatDesc = (r) => `${r.numBaterias}x ${r.capBateria}Ah ${r.voltajeSistema}V, inv. ${r.potenciaInversorKw}kW`;

  const saveBat = async () => {
    if (!batResult) return;
    if (batSavedId) {
      await base44.entities.SolarCalculation.update(batSavedId, { battery_capacity_kwh: parseFloat(batResult.energiaTotalKwh), num_batteries: batResult.numBaterias, inverter_power_w: batResult.potenciaInversorKw * 1000, notes: buildBatDesc(batResult) });
    } else {
      const rec = await base44.entities.SolarCalculation.create({ contact_id: batForm.contact_id || '', contact_name: batForm.contact_name || 'Sin cliente', calc_mode: 'directo', battery_capacity_kwh: parseFloat(batResult.energiaTotalKwh), num_batteries: batResult.numBaterias, inverter_power_w: batResult.potenciaInversorKw * 1000, date: format(new Date(), 'yyyy-MM-dd'), notes: buildBatDesc(batResult) });
      setBatSavedId(rec.id);
      if (batForm.contact_id) await base44.entities.ClientDocument.create({ contact_id: batForm.contact_id, contact_name: batForm.contact_name, title: buildBatTitle(batResult), doc_type: 'calculo_solar', date: format(new Date(), 'yyyy-MM-dd'), description: buildBatDesc(batResult) });
    }
    setBatSavedMsg(batSavedId ? '¡Actualizado!' : '¡Guardado!');
    setBatEditing(false);
    setTimeout(() => setBatSavedMsg(''), 3000);
  };

  const calcCombined = () => {
    const solar = calcSolar({ ...combForm, distance_panels_to_dc_box: combForm.distance_panels_to_dc_box, distance_inverter_to_batteries: combForm.distance_inverter_to_batteries, distance_to_ac_box: combForm.distance_to_ac_box }, 'directo');
    const bat = calcBattery({ ...combForm, num_paneles: combForm.num_panels });
    setCombResult({ solar, bat });
    setCombSavedId(null); // reset saved state when recalculating
    setCombEditing(false);
  };

  const saveComb = async () => {
    if (!combResult) return;
    const desc = `Solar ${combResult.solar.totalKwp.toFixed(1)}kWp + ${combResult.bat.numBaterias} baterías ${combResult.bat.energiaTotalKwh}kWh`;
    if (combSavedId) {
      await base44.entities.SolarCalculation.update(combSavedId, { num_panels: combResult.solar.numPanels, total_power_kwp: combResult.solar.totalKwp, battery_capacity_kwh: parseFloat(combResult.bat.energiaTotalKwh), num_batteries: combResult.bat.numBaterias, inverter_power_w: combResult.solar.inverterKw * 1000, notes: desc });
    } else {
      const rec = await base44.entities.SolarCalculation.create({ contact_id: combForm.contact_id || '', contact_name: combForm.contact_name || 'Sin cliente', calc_mode: 'directo', num_panels: combResult.solar.numPanels, panel_power_w: parseInt(combForm.panel_power_w), total_power_kwp: combResult.solar.totalKwp, battery_capacity_kwh: parseFloat(combResult.bat.energiaTotalKwh), num_batteries: combResult.bat.numBaterias, inverter_power_w: combResult.solar.inverterKw * 1000, date: format(new Date(), 'yyyy-MM-dd'), notes: desc });
      setCombSavedId(rec.id);
      if (combForm.contact_id) await base44.entities.ClientDocument.create({ contact_id: combForm.contact_id, contact_name: combForm.contact_name, title: `Sistema solar+baterías ${combResult.solar.totalKwp.toFixed(1)}kWp ${combResult.bat.energiaTotalKwh}kWh — ${format(new Date(), 'dd/MM/yyyy')}`, doc_type: 'calculo_solar', date: format(new Date(), 'yyyy-MM-dd'), description: desc });
    }
    setCombSavedMsg(combSavedId ? '¡Actualizado!' : '¡Guardado!');
    setCombEditing(false);
    setTimeout(() => setCombSavedMsg(''), 3000);
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#1e3a5f] via-[#1e5f4a] to-[#1e3a5f] p-6 text-white shadow-lg">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, #fbbf24 0%, transparent 50%), radial-gradient(circle at 80% 50%, #10b981 0%, transparent 50%)'}} />
        <div className="relative flex items-center gap-4">
          <div className="p-3 bg-white/15 backdrop-blur rounded-2xl border border-white/20 shadow">
            <Sun className="w-8 h-8 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cálculo Solar y Baterías</h1>
            <p className="text-sm text-white/70 mt-0.5">Fotovoltaico · Almacenamiento · Sistema completo · Informes IA · Legalización</p>
          </div>
          <div className="ml-auto hidden md:flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-3 py-2 border border-white/20">
            <Sparkles className="w-4 h-4 text-violet-300" />
            <span className="text-xs font-medium text-white/90">Con informes IA integrados</span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto bg-white border border-gray-200 shadow-sm rounded-xl p-1">
          <TabsTrigger value="solar" className="flex-1 gap-1.5 data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-lg"><Sun className="w-4 h-4" />Cálculo Solar</TabsTrigger>
          <TabsTrigger value="baterias" className="flex-1 gap-1.5 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-lg"><Battery className="w-4 h-4" />Baterías</TabsTrigger>
          <TabsTrigger value="combinado" className="flex-1 gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-green-600 data-[state=active]:text-white rounded-lg"><Zap className="w-4 h-4" />Solar + Baterías</TabsTrigger>
          <TabsTrigger value="legal" className="flex-1 gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg"><FileText className="w-4 h-4" />Legalización</TabsTrigger>
        </TabsList>

        {/* ═══ TAB SOLAR ══════════════════════════════════════════════════════ */}
        <TabsContent value="solar" className="space-y-4 mt-4">
          <Tabs value={solarMode} onValueChange={setSolarMode}>
            <TabsList className="w-full">
              <TabsTrigger value="directo" className="flex-1">Por número de paneles</TabsTrigger>
              <TabsTrigger value="por_consumo" className="flex-1">Por consumo (kWh)</TabsTrigger>
            </TabsList>
          </Tabs>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Select value={solarForm.contact_id} onValueChange={selectContact(setSolarForm)}>
                <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>
              {solarMode === 'por_consumo' ? (
                <div><label className="text-sm font-medium">Consumo diario (kWh/día) o anual (kWh/año)</label>
                  <Input type="number" value={solarForm.consumption_kwh} onChange={e => setSolarForm({ ...solarForm, consumption_kwh: e.target.value })} className="mt-1" />
                  <p className="text-[10px] text-gray-400 mt-1">Si introduces &gt;50 se trata como anual</p>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-3">
                {solarMode === 'directo' && <div><label className="text-xs text-gray-500">Nº paneles</label><Input type="number" value={solarForm.num_panels} onChange={e => setSolarForm({ ...solarForm, num_panels: e.target.value })} /></div>}
                <div><label className="text-xs text-gray-500">Potencia panel (W)</label><Input type="number" value={solarForm.panel_power_w} onChange={e => setSolarForm({ ...solarForm, panel_power_w: e.target.value })} /></div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p className="text-sm font-medium">Distancias de instalación</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] text-gray-500">Paneles→Cuadro DC (m)</label><Input type="number" value={solarForm.distance_panels_to_dc_box} onChange={e => setSolarForm({ ...solarForm, distance_panels_to_dc_box: e.target.value })} /></div>
                  <div><label className="text-[10px] text-gray-500">Inv.→Baterías (m)</label><Input type="number" value={solarForm.distance_inverter_to_batteries} onChange={e => setSolarForm({ ...solarForm, distance_inverter_to_batteries: e.target.value })} /></div>
                  <div><label className="text-[10px] text-gray-500">Inv.→Cuadro AC (m)</label><Input type="number" value={solarForm.distance_to_ac_box} onChange={e => setSolarForm({ ...solarForm, distance_to_ac_box: e.target.value })} /></div>
                </div>
              </div>
              {solarForm.contact_id && <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700 flex items-center gap-2"><UserCheck className="w-4 h-4" />Vinculado: <strong>{solarForm.contact_name}</strong></div>}
              <Button onClick={() => setSolarResult(calcSolar(solarForm, solarMode))} className="w-full bg-amber-500 hover:bg-amber-600"><Calculator className="w-4 h-4 mr-2" />Calcular instalación solar</Button>
            </CardContent>
          </Card>

          {solarResult && (
            <div ref={solarPrintRef} className="space-y-4">
              <CompanyHeader className="mb-2" />
              {/* Tabla datos introducidos */}
              <Card className="border-gray-200">
                <CardHeader className="bg-gray-50 py-2"><CardTitle className="text-gray-700 text-sm">📋 Datos de la instalación</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50 w-1/2">Modo de cálculo</td><td className="p-2">{solarMode === 'directo' ? 'Por número de paneles' : 'Por consumo (kWh)'}</td></tr>
                      {solarMode === 'directo' && <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Nº paneles</td><td className="p-2">{solarForm.num_panels}</td></tr>}
                      {solarMode === 'por_consumo' && <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Consumo (kWh)</td><td className="p-2">{solarForm.consumption_kwh}</td></tr>}
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Potencia panel</td><td className="p-2">{solarForm.panel_power_w} W</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Distancia paneles → Cuadro DC</td><td className="p-2">{solarForm.distance_panels_to_dc_box} m</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Distancia inversor → Baterías</td><td className="p-2">{solarForm.distance_inverter_to_batteries} m</td></tr>
                      <tr className="border-b border-gray-100 last:border-0"><td className="p-2 font-medium text-gray-600 bg-gray-50">Distancia inversor → Cuadro AC</td><td className="p-2">{solarForm.distance_to_ac_box} m</td></tr>
                      {solarForm.contact_name && <tr><td className="p-2 font-medium text-gray-600 bg-gray-50">Cliente</td><td className="p-2">{solarForm.contact_name}</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card className="border-amber-200">
                <CardHeader className="bg-amber-50 py-3"><CardTitle className="text-amber-700">Resultado — Instalación Fotovoltaica</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiBox value={solarResult.numPanels} label="Paneles" color="bg-amber-50 text-amber-700" />
                    <KpiBox value={`${solarResult.totalKwp.toFixed(2)} kWp`} label="Potencia pico" color="bg-orange-50 text-orange-700" />
                    <KpiBox value={`${solarResult.inverterKw} kW`} label="Inversor" color="bg-blue-50 text-blue-700" />
                    <KpiBox value={`${solarResult.numBatteries}x 2,4kWh`} label="Baterías" color="bg-green-50 text-green-700" />
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
                    <p>📊 Producción diaria: <strong>{solarResult.dailyProduction.toFixed(2)} kWh/día</strong> | Anual: <strong>{solarResult.yearlyProduction.toFixed(0)} kWh/año</strong></p>
                    <p>🔗 Nº strings: <strong>{solarResult.numStrings}</strong> | Cable DC: <strong>{solarResult.dcCableMm2} mm²</strong> | Cap. total baterías: <strong>{(solarResult.numBatteries * 2.4).toFixed(1)} kWh</strong></p>
                  </div>

                  <div><p className="font-semibold text-sm mb-2">📐 Esquema de conexionado eléctrico</p><SolarWiringDiagram result={solarResult} form={solarForm} /></div>

                  <div><p className="font-semibold text-sm mb-2">🛒 Lista de materiales con marcas y tiendas</p><MaterialTableSolar materials={solarResult.materials} /></div>

                  <div><p className="font-semibold text-sm mb-2">🔌 Material para cuadros eléctricos (DC y AC)</p><ElecPanelTableSolar items={solarResult.electricalPanelItems} /></div>

                  <AIReportPanel tipo="solar" datos={{ numPanels: solarResult.numPanels, totalKwp: solarResult.totalKwp, dailyProduction: solarResult.dailyProduction, yearlyProduction: solarResult.yearlyProduction, inverterKw: solarResult.inverterKw, numBatteries: solarResult.numBatteries, batteryKwh: solarResult.batteryKwh, numStrings: solarResult.numStrings, panelPowerW: solarForm.panel_power_w, modo: solarMode, cliente: solarForm.contact_name }} />

                  <div className="flex gap-2 flex-wrap no-print items-center pt-2 border-t border-gray-100">
                    <PrintButton contentRef={solarPrintRef} title="Cálculo Solar Fotovoltaico" />
                    {!solarEditing && !solarSavedId && (
                      <Button onClick={saveSolar} variant="outline" size="sm" className="border-amber-400 text-amber-700 hover:bg-amber-50"><Save className="w-4 h-4 mr-2" />Guardar cálculo</Button>
                    )}
                    {solarSavedId && !solarEditing && (
                      <Button onClick={() => setSolarEditing(true)} variant="outline" size="sm" className="border-blue-400 text-blue-600 hover:bg-blue-50"><Edit3 className="w-4 h-4 mr-2" />Editar y actualizar</Button>
                    )}
                    {solarEditing && (
                      <Button onClick={saveSolar} size="sm" className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar cambios</Button>
                    )}
                    {solarSavedMsg && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{solarSavedMsg}</span>}
                    {solarSavedId && !solarSavedMsg && <span className="text-[10px] text-gray-400">✓ Guardado en base de datos</span>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB BATERÍAS ═══════════════════════════════════════════════════ */}
        <TabsContent value="baterias" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <Select value={batForm.contact_id} onValueChange={selectContact(setBatForm)}>
                <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="font-semibold text-sm text-gray-700">Consumo y autonomía</p>
                  <div><label className="text-xs text-gray-500">Consumo diario (kWh/día)</label><Input type="number" step="0.5" value={batForm.consumo_diario} onChange={e => setBatForm({ ...batForm, consumo_diario: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500">Autonomía (días sin carga)</label><Input type="number" value={batForm.autonomia_dias} onChange={e => setBatForm({ ...batForm, autonomia_dias: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500">Potencia pico máxima (W)</label><Input type="number" value={batForm.potencia_pico_w} onChange={e => setBatForm({ ...batForm, potencia_pico_w: e.target.value })} /></div>
                </div>
                <div className="space-y-3">
                  <p className="font-semibold text-sm text-gray-700">Sistema</p>
                  <div><label className="text-xs text-gray-500">Voltaje sistema</label>
                    <Select value={String(batForm.voltaje_sistema)} onValueChange={v => setBatForm({ ...batForm, voltaje_sistema: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="12">12V</SelectItem><SelectItem value="24">24V</SelectItem><SelectItem value="48">48V (recomendado)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs text-gray-500">Tipo instalación</label>
                    <Select value={batForm.tipo_red} onValueChange={v => setBatForm({ ...batForm, tipo_red: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="aislada">Aislada (off-grid)</SelectItem><SelectItem value="hibrida">Híbrida (con red)</SelectItem><SelectItem value="backup">Backup / UPS</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-xs text-gray-500">Profundidad descarga</label>
                    <Select value={String(batForm.profundidad_descarga)} onValueChange={v => setBatForm({ ...batForm, profundidad_descarga: parseFloat(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="0.5">50% (máxima vida)</SelectItem><SelectItem value="0.7">70% (equilibrado)</SelectItem><SelectItem value="0.8">80% (LiFePO4)</SelectItem><SelectItem value="0.9">90% (máx aprovech.)</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <p className="text-sm font-medium text-amber-800">Paneles solares de carga (opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-gray-500">Nº paneles</label><Input type="number" value={batForm.num_paneles} onChange={e => setBatForm({ ...batForm, num_paneles: e.target.value })} /></div>
                  <div><label className="text-xs text-gray-500">W por panel</label><Input type="number" value={batForm.panel_power_w} onChange={e => setBatForm({ ...batForm, panel_power_w: e.target.value })} /></div>
                </div>
              </div>
              {batForm.contact_id && <div className="bg-green-50 border border-green-200 rounded p-2 text-xs text-green-700 flex items-center gap-2"><UserCheck className="w-4 h-4" />Vinculado: <strong>{batForm.contact_name}</strong></div>}
              <Button onClick={() => setBatResult(calcBattery(batForm))} className="w-full bg-green-600 hover:bg-green-700"><Calculator className="w-4 h-4 mr-2" />Calcular sistema de baterías</Button>
            </CardContent>
          </Card>

          {batResult && (
            <div ref={batPrintRef} className="space-y-4">
              <CompanyHeader className="mb-2" />
              {/* Tabla datos introducidos */}
              <Card className="border-gray-200">
                <CardHeader className="bg-gray-50 py-2"><CardTitle className="text-gray-700 text-sm">📋 Datos de la instalación</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50 w-1/2">Consumo diario</td><td className="p-2">{batForm.consumo_diario} kWh/día</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Autonomía</td><td className="p-2">{batForm.autonomia_dias} días</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Potencia pico máxima</td><td className="p-2">{batForm.potencia_pico_w} W</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Voltaje sistema</td><td className="p-2">{batForm.voltaje_sistema} V</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Tipo instalación</td><td className="p-2">{batForm.tipo_red}</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Profundidad descarga</td><td className="p-2">{(batForm.profundidad_descarga * 100).toFixed(0)}%</td></tr>
                      {batForm.num_paneles > 0 && <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Paneles solares de carga</td><td className="p-2">{batForm.num_paneles} × {batForm.panel_power_w} W</td></tr>}
                      {batForm.contact_name && <tr><td className="p-2 font-medium text-gray-600 bg-gray-50">Cliente</td><td className="p-2">{batForm.contact_name}</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              <Card className="border-green-200">
                <CardHeader className="bg-green-50 py-3"><CardTitle className="text-green-700">Resultado — Sistema de Almacenamiento</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-5">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiBox value={batResult.numBaterias} label="Baterías" sub={`${batResult.capBateria}Ah ${batResult.voltajeSistema}V`} color="bg-green-50 text-green-700" />
                    <KpiBox value={`${batResult.energiaTotalKwh} kWh`} label="Capacidad total" color="bg-blue-50 text-blue-700" />
                    <KpiBox value={`${batResult.potenciaInversorKw} kW`} label="Inversor/Cargador" color="bg-purple-50 text-purple-700" />
                    <KpiBox value={`${batResult.potenciaGeneradorKva} kVA`} label="Generador apoyo" color="bg-orange-50 text-orange-700" />
                  </div>
                  <Card className="border-gray-200">
                    <CardHeader className="bg-gray-50 py-2"><CardTitle className="text-gray-700 text-sm">📊 Resumen técnico del sistema</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-xs border-collapse">
                        <tbody>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50 w-1/2">Energía necesaria</td><td className="p-2 font-semibold">{batResult.energiaNecesariaKwh} kWh ({batResult.energiaNecesariaAh} Ah)</td></tr>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Nº baterías</td><td className="p-2 font-semibold text-green-700">{batResult.numBaterias} × {batResult.capBateria}Ah {batResult.voltajeSistema}V</td></tr>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Capacidad total almacenamiento</td><td className="p-2 font-semibold">{batResult.energiaTotalKwh} kWh</td></tr>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Inversor/Cargador</td><td className="p-2 font-semibold text-purple-700">{batResult.potenciaInversorKw} kW — {batResult.potenciaInversorW} W</td></tr>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Corriente carga baterías</td><td className="p-2">{batResult.corrienteCargaA} A / {batResult.potenciaCargadorKw} kW</td></tr>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">BMS mínimo</td><td className="p-2">{batResult.corrienteBmsA} A</td></tr>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Sección cable DC</td><td className="p-2">{batResult.cableSeccionMm2} mm²</td></tr>
                          <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Generador de apoyo</td><td className="p-2">{batResult.potenciaGeneradorKva} kVA</td></tr>
                          {batResult.mpptKw > 0 && <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Regulador MPPT</td><td className="p-2">{batResult.mpptKw} kW / {batResult.mpptA} A</td></tr>}
                          <tr><td className="p-2 font-medium text-gray-600 bg-gray-50">Tipo instalación</td><td className="p-2 capitalize">{batResult.tipoRed}</td></tr>
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>

                  <div><p className="font-semibold text-sm mb-2">📐 Esquema de conexionado</p><BatteryWiringDiagram result={batResult} form={batForm} /></div>

                  <div><p className="font-semibold text-sm mb-2">🛒 Equipos con marcas, modelos y dónde comprar</p><EquipmentTableBat items={batResult.equipmentTable} /></div>

                  <div><p className="font-semibold text-sm mb-2">🔌 Material cuadros eléctricos del sistema</p><ElecPanelTableBat items={batResult.electricalPanelBat} /></div>

                  <AIReportPanel tipo="baterias" datos={{ consumoDiarioKwh: batResult.consumoDiarioKwh, autonomiaDias: batResult.autonomiaDias, voltajeSistema: batResult.voltajeSistema, numBaterias: batResult.numBaterias, capBateria: batResult.capBateria, energiaTotalKwh: batResult.energiaTotalKwh, potenciaInversorKw: batResult.potenciaInversorKw, tipoRed: batResult.tipoRed, corrienteBmsA: batResult.corrienteBmsA, cliente: batForm.contact_name }} />

                  <div className="flex gap-2 flex-wrap no-print items-center pt-2 border-t border-gray-100">
                    <PrintButton contentRef={batPrintRef} title="Cálculo Baterías y Almacenamiento" />
                    {!batEditing && !batSavedId && (
                      <Button onClick={saveBat} variant="outline" size="sm" className="border-green-400 text-green-700 hover:bg-green-50"><Save className="w-4 h-4 mr-2" />Guardar cálculo</Button>
                    )}
                    {batSavedId && !batEditing && (
                      <Button onClick={() => setBatEditing(true)} variant="outline" size="sm" className="border-blue-400 text-blue-600 hover:bg-blue-50"><Edit3 className="w-4 h-4 mr-2" />Editar y actualizar</Button>
                    )}
                    {batEditing && (
                      <Button onClick={saveBat} size="sm" className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar cambios</Button>
                    )}
                    {batSavedMsg && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{batSavedMsg}</span>}
                    {batSavedId && !batSavedMsg && <span className="text-[10px] text-gray-400">✓ Guardado en base de datos</span>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB COMBINADO ══════════════════════════════════════════════════ */}
        <TabsContent value="combinado" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-green-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-amber-800">☀️🔋 Cálculo completo Solar + Almacenamiento</p>
                <p className="text-xs text-gray-600">Calcula simultáneamente la instalación fotovoltaica y el sistema de baterías, generando todos los informes, esquemas y tablas en un único documento.</p>
              </div>
              <Select value={combForm.contact_id} onValueChange={selectContact(setCombForm)}>
                <SelectTrigger><SelectValue placeholder="Vincular a cliente (opcional)" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-xs text-gray-500">Nº paneles</label><Input type="number" value={combForm.num_panels} onChange={e => setCombForm({ ...combForm, num_panels: e.target.value })} /></div>
                <div><label className="text-xs text-gray-500">W por panel</label><Input type="number" value={combForm.panel_power_w} onChange={e => setCombForm({ ...combForm, panel_power_w: e.target.value })} /></div>
                <div><label className="text-xs text-gray-500">Consumo diario (kWh/día)</label><Input type="number" value={combForm.consumo_diario} onChange={e => setCombForm({ ...combForm, consumo_diario: e.target.value })} /></div>
                <div><label className="text-xs text-gray-500">Autonomía (días)</label><Input type="number" value={combForm.autonomia_dias} onChange={e => setCombForm({ ...combForm, autonomia_dias: e.target.value })} /></div>
                <div><label className="text-xs text-gray-500">Potencia pico (W)</label><Input type="number" value={combForm.potencia_pico_w} onChange={e => setCombForm({ ...combForm, potencia_pico_w: e.target.value })} /></div>
                <div><label className="text-xs text-gray-500">Voltaje sistema</label>
                  <Select value={String(combForm.voltaje_sistema)} onValueChange={v => setCombForm({ ...combForm, voltaje_sistema: parseInt(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="12">12V</SelectItem><SelectItem value="24">24V</SelectItem><SelectItem value="48">48V</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs text-gray-500">Tipo instalación</label>
                  <Select value={combForm.tipo_red} onValueChange={v => setCombForm({ ...combForm, tipo_red: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="aislada">Aislada (off-grid)</SelectItem><SelectItem value="hibrida">Híbrida</SelectItem><SelectItem value="backup">Backup</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <p className="text-sm font-medium">Distancias</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] text-gray-500">Paneles→Cuadro DC (m)</label><Input type="number" value={combForm.distance_panels_to_dc_box} onChange={e => setCombForm({ ...combForm, distance_panels_to_dc_box: e.target.value })} /></div>
                  <div><label className="text-[10px] text-gray-500">Inv.→Baterías (m)</label><Input type="number" value={combForm.distance_inverter_to_batteries} onChange={e => setCombForm({ ...combForm, distance_inverter_to_batteries: e.target.value })} /></div>
                  <div><label className="text-[10px] text-gray-500">Inv.→Cuadro AC (m)</label><Input type="number" value={combForm.distance_to_ac_box} onChange={e => setCombForm({ ...combForm, distance_to_ac_box: e.target.value })} /></div>
                </div>
              </div>
              <Button onClick={calcCombined} className="w-full bg-gradient-to-r from-amber-500 to-green-600 hover:from-amber-600 hover:to-green-700 text-white"><Calculator className="w-4 h-4 mr-2" />Calcular sistema completo Solar + Baterías</Button>
            </CardContent>
          </Card>

          {combResult && (
            <div ref={combPrintRef} className="space-y-5">
              <CompanyHeader className="mb-2" />
              {/* Tabla datos introducidos */}
              <Card className="border-gray-200">
                <CardHeader className="bg-gray-50 py-2"><CardTitle className="text-gray-700 text-sm">📋 Datos de la instalación</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50 w-1/2">Nº paneles</td><td className="p-2">{combForm.num_panels}</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Potencia panel</td><td className="p-2">{combForm.panel_power_w} W</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Consumo diario</td><td className="p-2">{combForm.consumo_diario} kWh/día</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Autonomía</td><td className="p-2">{combForm.autonomia_dias} días</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Potencia pico máxima</td><td className="p-2">{combForm.potencia_pico_w} W</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Voltaje sistema</td><td className="p-2">{combForm.voltaje_sistema} V</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Tipo instalación</td><td className="p-2">{combForm.tipo_red}</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Distancia paneles → Cuadro DC</td><td className="p-2">{combForm.distance_panels_to_dc_box} m</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Distancia inversor → Baterías</td><td className="p-2">{combForm.distance_inverter_to_batteries} m</td></tr>
                      <tr className="border-b border-gray-100"><td className="p-2 font-medium text-gray-600 bg-gray-50">Distancia inversor → Cuadro AC</td><td className="p-2">{combForm.distance_to_ac_box} m</td></tr>
                      {combForm.contact_name && <tr><td className="p-2 font-medium text-gray-600 bg-gray-50">Cliente</td><td className="p-2">{combForm.contact_name}</td></tr>}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
              {/* Solar part */}
              <Card className="border-amber-200">
                <CardHeader className="bg-amber-50 py-3"><CardTitle className="text-amber-700 text-base">☀️ Instalación Fotovoltaica — {combResult.solar.totalKwp.toFixed(2)} kWp</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiBox value={combResult.solar.numPanels} label="Paneles" color="bg-amber-50 text-amber-700" />
                    <KpiBox value={`${combResult.solar.totalKwp.toFixed(2)} kWp`} label="Potencia pico" color="bg-orange-50 text-orange-700" />
                    <KpiBox value={`${combResult.solar.dailyProduction.toFixed(1)} kWh/día`} label="Producción diaria" color="bg-yellow-50 text-yellow-700" />
                    <KpiBox value={`${combResult.solar.inverterKw} kW`} label="Inversor híbrido" color="bg-blue-50 text-blue-700" />
                  </div>
                  <div><p className="font-semibold text-sm mb-2">Esquema conexionado solar</p><SolarWiringDiagram result={combResult.solar} form={{ ...combForm, distance_panels_to_dc_box: combForm.distance_panels_to_dc_box, distance_inverter_to_batteries: combForm.distance_inverter_to_batteries, distance_to_ac_box: combForm.distance_to_ac_box }} /></div>
                  <div><p className="font-semibold text-sm mb-2">Materiales fotovoltaicos</p><MaterialTableSolar materials={combResult.solar.materials} /></div>
                  <div><p className="font-semibold text-sm mb-2">Cuadros eléctricos DC/AC</p><ElecPanelTableSolar items={combResult.solar.electricalPanelItems} /></div>
                </CardContent>
              </Card>

              {/* Battery part */}
              <Card className="border-green-200">
                <CardHeader className="bg-green-50 py-3"><CardTitle className="text-green-700 text-base">🔋 Sistema de Almacenamiento — {combResult.bat.energiaTotalKwh} kWh</CardTitle></CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiBox value={combResult.bat.numBaterias} label="Baterías" sub={`${combResult.bat.capBateria}Ah ${combResult.bat.voltajeSistema}V`} color="bg-green-50 text-green-700" />
                    <KpiBox value={`${combResult.bat.energiaTotalKwh} kWh`} label="Capacidad total" color="bg-emerald-50 text-emerald-700" />
                    <KpiBox value={`${combResult.bat.potenciaInversorKw} kW`} label="Inv./Cargador" color="bg-purple-50 text-purple-700" />
                    <KpiBox value={`${combResult.bat.autonomiaDias}d`} label="Autonomía" color="bg-blue-50 text-blue-700" />
                  </div>
                  <div><p className="font-semibold text-sm mb-2">Esquema conexionado baterías</p><BatteryWiringDiagram result={combResult.bat} form={{ ...combForm, num_paneles: combForm.num_panels }} /></div>
                  <div><p className="font-semibold text-sm mb-2">Equipos almacenamiento</p><EquipmentTableBat items={combResult.bat.equipmentTable} /></div>
                  <div><p className="font-semibold text-sm mb-2">Cuadros eléctricos almacenamiento</p><ElecPanelTableBat items={combResult.bat.electricalPanelBat} /></div>
                </CardContent>
              </Card>

              <AIReportPanel tipo="combinado" datos={{ solar: { numPanels: combResult.solar.numPanels, totalKwp: combResult.solar.totalKwp, dailyProduction: combResult.solar.dailyProduction, yearlyProduction: combResult.solar.yearlyProduction, inverterKw: combResult.solar.inverterKw }, bat: { numBaterias: combResult.bat.numBaterias, energiaTotalKwh: combResult.bat.energiaTotalKwh, potenciaInversorKw: combResult.bat.potenciaInversorKw, autonomiaDias: combResult.bat.autonomiaDias, tipoRed: combResult.bat.tipoRed }, consumoDiario: combForm.consumo_diario, cliente: combForm.contact_name }} />

              <div className="flex gap-2 flex-wrap no-print items-center pt-2 border-t border-gray-100">
                <PrintButton contentRef={combPrintRef} title="Sistema Completo Solar + Baterías" />
                {!combEditing && !combSavedId && (
                  <Button onClick={saveComb} variant="outline" size="sm" className="border-amber-500 text-amber-700 hover:bg-amber-50"><Save className="w-4 h-4 mr-2" />Guardar cálculo</Button>
                )}
                {combSavedId && !combEditing && (
                  <Button onClick={() => setCombEditing(true)} variant="outline" size="sm" className="border-blue-400 text-blue-600 hover:bg-blue-50"><Edit3 className="w-4 h-4 mr-2" />Editar y actualizar</Button>
                )}
                {combEditing && (
                  <Button onClick={saveComb} size="sm" className="bg-blue-600 hover:bg-blue-700"><Save className="w-4 h-4 mr-2" />Guardar cambios</Button>
                )}
                {combSavedMsg && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />{combSavedMsg}</span>}
                {combSavedId && !combSavedMsg && <span className="text-[10px] text-gray-400">✓ Guardado en base de datos</span>}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ═══ TAB LEGALIZACIÓN ═══════════════════════════════════════════════ */}
        <TabsContent value="legal" className="mt-4">
          <LegalizacionSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}