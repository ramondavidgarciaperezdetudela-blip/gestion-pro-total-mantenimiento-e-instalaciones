import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Thermometer, Calculator, Save, Trash2, User, Wind, CheckCircle, Loader2, FileText, Upload, MapPin, Package, X, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import NavBar from '@/components/NavBar';
import ACSystemDiagram from '@/components/ACSystemDiagram';
import MollierDiagram from '@/components/MollierDiagram';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

// ─── Tipos de máquina disponibles (definición explícita y ordenada) ─────────
const TIPOS_MAQUINA = [
  { key: 'todos',         label: 'Todos los tipos',              icon: '🔍' },
  { key: 'Split 1x1',    label: 'Split 1×1 (Mural)',            icon: '❄️' },
  { key: 'Split Suelo',  label: 'Split de Suelo/Techo',         icon: '📐' },
  { key: 'Cassette',     label: 'Cassette (4 vías)',             icon: '⊞' },
  { key: 'Conductos',    label: 'Climatizador de Conductos',     icon: '🌀' },
  { key: 'Multi-Split',  label: 'Multi-Split (varias unidades)', icon: '⚡' },
  { key: 'VRF/VRV',     label: 'Sistema VRF/VRV Industrial',    icon: '🏭' },
  { key: 'VRF Mini',    label: 'VRF/VRV Doméstico (Mini-VRV)',  icon: '🏠' },
  { key: 'Chiller',      label: 'Chiller / Enfriadora',         icon: '🧊' },
  { key: 'Aerotermia',   label: 'Bomba de Calor Aerotermia',    icon: '♨️' },
];
const tiposMaquina = TIPOS_MAQUINA.map(t => t.key);

// ─── Catálogo de máquinas por potencia (kW) ───────────────────────────────────
const AC_CATALOG = [
  // Split 1x1
  { brand: 'Daikin',      model: 'FTXC20C / RXC20C',     power_kw: 2.0, gas: 'R-32',   frigorias: 1720, tipo: 'Split 1x1', seer: 6.34 },
  { brand: 'Daikin',      model: 'FTXC25C / RXC25C',     power_kw: 2.5, gas: 'R-32',   frigorias: 2150, tipo: 'Split 1x1', seer: 6.34 },
  { brand: 'Daikin',      model: 'FTXC35C / RXC35C',     power_kw: 3.5, gas: 'R-32',   frigorias: 3010, tipo: 'Split 1x1', seer: 6.43 },
  { brand: 'Daikin',      model: 'FTXC50C / RXC50C',     power_kw: 5.0, gas: 'R-32',   frigorias: 4300, tipo: 'Split 1x1', seer: 6.52 },
  { brand: 'Daikin',      model: 'FTXC60C / RXC60C',     power_kw: 6.0, gas: 'R-32',   frigorias: 5160, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'Mitsubishi',  model: 'MSZ-HR20VF / MUZ-HR20VF', power_kw: 2.0, gas: 'R-32', frigorias: 1720, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'Mitsubishi',  model: 'MSZ-HR25VF / MUZ-HR25VF', power_kw: 2.5, gas: 'R-32', frigorias: 2150, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'Mitsubishi',  model: 'MSZ-HR35VF / MUZ-HR35VF', power_kw: 3.5, gas: 'R-32', frigorias: 3010, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'Mitsubishi',  model: 'MSZ-HR50VF / MUZ-HR50VF', power_kw: 5.0, gas: 'R-32', frigorias: 4300, tipo: 'Split 1x1', seer: 5.90 },
  { brand: 'Fujitsu',     model: 'ASY20UI-KP / AOY20UI-KN', power_kw: 2.0, gas: 'R-32', frigorias: 1720, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'Fujitsu',     model: 'ASY25UI-KP / AOY25UI-KN', power_kw: 2.5, gas: 'R-32', frigorias: 2150, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'Fujitsu',     model: 'ASY35UI-KP / AOY35UI-KN', power_kw: 3.5, gas: 'R-32', frigorias: 3010, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'Fujitsu',     model: 'ASY50UI-KP / AOY50UI-KN', power_kw: 5.0, gas: 'R-32', frigorias: 4300, tipo: 'Split 1x1', seer: 5.90 },
  { brand: 'Samsung',     model: 'AR07TXHQASI / AR07TXHQASIEUR', power_kw: 2.0, gas: 'R-32', frigorias: 1720, tipo: 'Split 1x1', seer: 6.20 },
  { brand: 'Samsung',     model: 'AR09TXHQASI',               power_kw: 2.5, gas: 'R-32', frigorias: 2150, tipo: 'Split 1x1', seer: 6.20 },
  { brand: 'Samsung',     model: 'AR12TXHQASI',               power_kw: 3.5, gas: 'R-32', frigorias: 3010, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'LG',          model: 'S09ET NSJ / UE09EC NSJ',    power_kw: 2.5, gas: 'R-32', frigorias: 2150, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'LG',          model: 'S12ET NSJ / UE12EC NSJ',    power_kw: 3.5, gas: 'R-32', frigorias: 3010, tipo: 'Split 1x1', seer: 6.10 },
  { brand: 'LG',          model: 'S18ET NSJ / UE18EC NSJ',    power_kw: 5.0, gas: 'R-32', frigorias: 4300, tipo: 'Split 1x1', seer: 5.80 },
  // Conductos
  { brand: 'Daikin',      model: 'FBQ35C / RXM35R',          power_kw: 3.5, gas: 'R-32', frigorias: 3010, tipo: 'Conductos', seer: 5.20 },
  { brand: 'Daikin',      model: 'FBQ60C / RXM60R',          power_kw: 6.0, gas: 'R-32', frigorias: 5160, tipo: 'Conductos', seer: 5.10 },
  { brand: 'Mitsubishi',  model: 'SEZ-M25DA / SUZ-M25VA',    power_kw: 2.5, gas: 'R-410A',frigorias: 2150, tipo: 'Conductos', seer: 5.00 },
  { brand: 'Mitsubishi',  model: 'SEZ-M35DA / SUZ-M35VA',    power_kw: 3.5, gas: 'R-410A',frigorias: 3010, tipo: 'Conductos', seer: 5.00 },
  // Split de Suelo/Techo
  { brand: 'Daikin',      model: 'FLXS25B / RXS25L3',         power_kw: 2.5, gas: 'R-410A',frigorias: 2150, tipo: 'Split Suelo', seer: 5.10 },
  { brand: 'Daikin',      model: 'FLXS35B / RXS35L3',         power_kw: 3.5, gas: 'R-410A',frigorias: 3010, tipo: 'Split Suelo', seer: 5.00 },
  { brand: 'Mitsubishi',  model: 'SRF25ZMX-S / SRC25ZMX-S',  power_kw: 2.5, gas: 'R-32',  frigorias: 2150, tipo: 'Split Suelo', seer: 5.50 },
  { brand: 'Mitsubishi',  model: 'SRF35ZMX-S / SRC35ZMX-S',  power_kw: 3.5, gas: 'R-32',  frigorias: 3010, tipo: 'Split Suelo', seer: 5.40 },
  { brand: 'Fujitsu',     model: 'ABYG24KRTA / AOYG24KRTA',  power_kw: 7.1, gas: 'R-410A',frigorias: 6100, tipo: 'Split Suelo', seer: 4.80 },
  // Cassette 4 vías
  { brand: 'Daikin',      model: 'FCQ35C / RXQ35T',           power_kw: 3.5, gas: 'R-410A',frigorias: 3010, tipo: 'Cassette', seer: 4.80 },
  { brand: 'Daikin',      model: 'FCQ50C / RXQ50T',           power_kw: 5.0, gas: 'R-410A',frigorias: 4300, tipo: 'Cassette', seer: 4.70 },
  { brand: 'Daikin',      model: 'FCQ60C / RXQ60T',           power_kw: 6.0, gas: 'R-410A',frigorias: 5160, tipo: 'Cassette', seer: 4.60 },
  { brand: 'Mitsubishi',  model: 'SLZ-M25FA / SUZ-M25VA',    power_kw: 2.5, gas: 'R-410A',frigorias: 2150, tipo: 'Cassette', seer: 4.90 },
  { brand: 'Mitsubishi',  model: 'SLZ-M35FA / SUZ-M35VA',    power_kw: 3.5, gas: 'R-410A',frigorias: 3010, tipo: 'Cassette', seer: 4.80 },
  { brand: 'LG',          model: 'UT30F / UU30WR3',           power_kw: 9.0, gas: 'R-410A',frigorias: 7740, tipo: 'Cassette', seer: 4.60 },
  // Multi-Split
  { brand: 'Daikin',      model: '2MXM40M / 2 × CTXM25R',    power_kw: 4.0, gas: 'R-32',  frigorias: 3440, tipo: 'Multi-Split', seer: 6.10 },
  { brand: 'Daikin',      model: '3MXM52N / 3 × CTXM20N',    power_kw: 5.2, gas: 'R-32',  frigorias: 4472, tipo: 'Multi-Split', seer: 5.80 },
  { brand: 'Mitsubishi',  model: 'MXZ-3F54VF / 3 × MSZ-HR',  power_kw: 5.4, gas: 'R-32',  frigorias: 4644, tipo: 'Multi-Split', seer: 5.90 },
  { brand: 'Fujitsu',     model: 'AOU3M18GBWH / 3 × ASYG',   power_kw: 5.3, gas: 'R-410A',frigorias: 4558, tipo: 'Multi-Split', seer: 5.50 },
  { brand: 'Samsung',     model: 'AJ052TXJ2KH/EU / 3 u.',     power_kw: 5.2, gas: 'R-32',  frigorias: 4472, tipo: 'Multi-Split', seer: 5.60 },
  // VRF/VRV
  { brand: 'Daikin',      model: 'RXYQ8T / VRV IV 8 HP',      power_kw: 22.4, gas: 'R-410A',frigorias: 19264,tipo: 'VRF/VRV', seer: 4.20 },
  { brand: 'Daikin',      model: 'RXYQ10T / VRV IV 10 HP',    power_kw: 28.0, gas: 'R-410A',frigorias: 24080,tipo: 'VRF/VRV', seer: 4.10 },
  { brand: 'Mitsubishi',  model: 'PUMY-P112VKM / City Multi', power_kw: 12.5, gas: 'R-410A',frigorias: 10750,tipo: 'VRF/VRV', seer: 4.10 },
  { brand: 'LG',          model: 'ARUN080GS2 / Multi V',      power_kw: 22.4, gas: 'R-410A',frigorias: 19264,tipo: 'VRF/VRV', seer: 4.00 },
  // VRF/VRV Doméstico — Mini-VRV para viviendas y locales pequeños
  // Daikin VRV Life / VRV-A (residencial, 1.5–3 HP, hasta 3 unidades interiores)
  { brand: 'Daikin',      model: 'RXYQ3T / VRV Life 1.5HP',    power_kw: 4.0,  gas:'R-410A', frigorias:3440, tipo:'VRF Mini', seer:5.20 },
  { brand: 'Daikin',      model: 'RXYQ4T / VRV Life 2HP',      power_kw: 5.6,  gas:'R-410A', frigorias:4816, tipo:'VRF Mini', seer:5.10 },
  { brand: 'Daikin',      model: 'RXYQ5T / VRV Life 2.5HP',    power_kw: 7.1,  gas:'R-410A', frigorias:6106, tipo:'VRF Mini', seer:5.00 },
  { brand: 'Daikin',      model: 'RXYQ8T7W1B / VRV-A 4HP',    power_kw:11.2,  gas:'R-410A', frigorias:9632, tipo:'VRF Mini', seer:4.90 },
  // Mitsubishi Electric City Multi S (doméstico/pequeño comercio)
  { brand: 'Mitsubishi',  model: 'PUMY-P71VKM / City Multi S', power_kw: 7.1,  gas:'R-410A', frigorias:6106, tipo:'VRF Mini', seer:4.80 },
  { brand: 'Mitsubishi',  model: 'PUMY-P112VKM / City Multi S',power_kw:12.5,  gas:'R-410A', frigorias:10750,tipo:'VRF Mini', seer:4.70 },
  // LG Multi V S (pequeño VRF residencial)
  { brand: 'LG',          model: 'ARUN040GSS4 / Multi V S 2T', power_kw:11.2,  gas:'R-410A', frigorias:9632, tipo:'VRF Mini', seer:4.85 },
  { brand: 'LG',          model: 'ARUN056GSS4 / Multi V S 2.5T',power_kw:14.0, gas:'R-410A', frigorias:12040,tipo:'VRF Mini', seer:4.75 },
  // Samsung DVM S (doméstico)
  { brand: 'Samsung',     model: 'AM052BXVAFH / DVM S 2HP',   power_kw: 5.2,  gas:'R-410A', frigorias:4472, tipo:'VRF Mini', seer:5.00 },
  { brand: 'Samsung',     model: 'AM072BXVAFH / DVM S 3HP',   power_kw: 7.2,  gas:'R-410A', frigorias:6192, tipo:'VRF Mini', seer:4.90 },
  // Hitachi Utopia (pequeño VRF)
  { brand: 'Hitachi',     model: 'RAS-4HVNP1E / Utopia 4HP',  power_kw:10.0,  gas:'R-410A', frigorias:8600, tipo:'VRF Mini', seer:4.80 },
  { brand: 'Hitachi',     model: 'RAS-6HVNP1E / Utopia 6HP',  power_kw:16.0,  gas:'R-410A', frigorias:13760,tipo:'VRF Mini', seer:4.70 },
  // Panasonic ECOi (mini VRF)
  { brand: 'Panasonic',   model: 'U-71PEY3E8 / ECOi S 3HP',   power_kw: 8.0,  gas:'R-410A', frigorias:6880, tipo:'VRF Mini', seer:4.85 },
  { brand: 'Panasonic',   model: 'U-96PEY3E8 / ECOi S 4HP',   power_kw:10.0,  gas:'R-410A', frigorias:8600, tipo:'VRF Mini', seer:4.75 },
  // Toshiba VRF Smms
  { brand: 'Toshiba',     model: 'MMY-MAP0561HT8P-E / Smms',  power_kw:16.0,  gas:'R-410A', frigorias:13760,tipo:'VRF Mini', seer:4.70 },
  // Chiller
  { brand: 'Daikin',      model: 'EWAQ011DAW',                power_kw: 11.0, gas: 'R-410A',frigorias: 9460,tipo: 'Chiller', seer: 3.50 },
  { brand: 'Carrier',     model: '30RB-017',                   power_kw: 17.0, gas: 'R-410A',frigorias:14620,tipo: 'Chiller', seer: 3.20 },
  { brand: 'Trane',       model: 'CGAM020',                   power_kw: 20.0, gas: 'R-410A',frigorias:17200,tipo: 'Chiller', seer: 3.40 },
  // Aerotermia
  { brand: 'Daikin',      model: 'Altherma 3 6kW',            power_kw: 6.0,  gas: 'R-32',  frigorias: 5160, tipo: 'Aerotermia', seer: 4.90 },
  { brand: 'Daikin',      model: 'Altherma 3 8kW',            power_kw: 8.0,  gas: 'R-32',  frigorias: 6880, tipo: 'Aerotermia', seer: 4.80 },
  { brand: 'Mitsubishi',  model: 'Ecodan 8.5kW',              power_kw: 8.5,  gas: 'R-32',  frigorias: 7310, tipo: 'Aerotermia', seer: 4.70 },
  { brand: 'Mitsubishi',  model: 'Ecodan 14kW',               power_kw: 14.0, gas: 'R-32',  frigorias:12040, tipo: 'Aerotermia', seer: 4.50 },
  { brand: 'Vaillant',    model: 'arotherm plus 5kW',         power_kw: 5.0,  gas: 'R-290', frigorias: 4300, tipo: 'Aerotermia', seer: 5.10 },
  { brand: 'Vaillant',    model: 'arotherm plus 7kW',         power_kw: 7.0,  gas: 'R-290', frigorias: 6020, tipo: 'Aerotermia', seer: 5.00 },
];

// ─── Coeficientes por uso ─────────────────────────────────────────────────────
const COEF_USO = [
  { key: 'residencial',  label: 'Residencial (vivienda)', coef: 100, desc: '100 W/m² estándar' },
  { key: 'oficina',      label: 'Oficina / Despacho',     coef: 120, desc: '120 W/m² con equipos' },
  { key: 'comercio',     label: 'Local comercial',        coef: 150, desc: '150 W/m² alta ocupación' },
  { key: 'restauracion', label: 'Bar / Restaurante',      coef: 175, desc: '175 W/m² cocina+público' },
  { key: 'industrial',   label: 'Industrial / Nave',      coef: 200, desc: '200 W/m² maquinaria' },
  { key: 'server',       label: 'Sala de servidores',     coef: 350, desc: '350 W/m² alta disipación' },
];

// ─── Refrigerantes ────────────────────────────────────────────────────────────
const REFRIGERANTES = [
  { key: 'R-32',   label: 'R-32',   gwp: 675,   ozone: 0,    Tc: 78.1,  Pc: 5782, color: '#3b82f6' },
  { key: 'R-410A', label: 'R-410A', gwp: 2088,  ozone: 0,    Tc: 72.1,  Pc: 4926, color: '#8b5cf6' },
  { key: 'R-290',  label: 'R-290 (Propano)', gwp: 3, ozone: 0, Tc: 96.7, Pc: 4247, color: '#10b981' },
  { key: 'R-134a', label: 'R-134a', gwp: 1430,  ozone: 0,    Tc: 101.1, Pc: 4059, color: '#f59e0b' },
  { key: 'R-407C', label: 'R-407C', gwp: 1774,  ozone: 0,    Tc: 86.7,  Pc: 4634, color: '#ef4444' },
];

// ─── Diagrama de Mollier para refrigerantes ───────────────────────────────────
// ─── Datos termodinámicos reales por refrigerante ─────────────────────────────
// Fuente: ASHRAE, NIST Webbook — datos reales para ciclo ideal típico A/A
// Te = temperatura evaporación, Tc = temperatura condensación
// h: entalpía kJ/kg, p: presión bar (absoluta)
const REF_DATA = {
  'R-32': {
    label:'R-32', gwp:675, color:'#3b82f6',
    Te:7, Tc:50, Pe:9.52, Pc:28.35,
    // Puntos del ciclo ideal (h kJ/kg): 1=salida evap, 2=salida compr, 3=salida cond, 4=salida expan
    h1:488.8, h2:537.4, h3:271.9, h4:271.9,
    // COP ideal, potencia específica
    COP_ideal: (488.8-271.9)/(537.4-488.8),
    hMin:200, hMax:580, pMin:5, pMax:40,
    Tcrit:78.1, Pcrit:57.82,
  },
  'R-410A': {
    label:'R-410A', gwp:2088, color:'#8b5cf6',
    Te:7, Tc:50, Pe:12.12, Pc:33.95,
    h1:423.5, h2:458.2, h3:275.1, h4:275.1,
    COP_ideal: (423.5-275.1)/(458.2-423.5),
    hMin:200, hMax:520, pMin:8, pMax:50,
    Tcrit:72.1, Pcrit:49.26,
  },
  'R-290': {
    label:'R-290 (Propano)', gwp:3, color:'#10b981',
    Te:7, Tc:50, Pe:7.06, Pc:18.93,
    h1:571.9, h2:630.4, h3:332.7, h4:332.7,
    COP_ideal: (571.9-332.7)/(630.4-571.9),
    hMin:250, hMax:720, pMin:4, pMax:30,
    Tcrit:96.7, Pcrit:42.47,
  },
  'R-134a': {
    label:'R-134a', gwp:1430, color:'#f59e0b',
    Te:7, Tc:50, Pe:3.08, Pc:13.18,
    h1:415.6, h2:447.8, h3:271.8, h4:271.8,
    COP_ideal: (415.6-271.8)/(447.8-415.6),
    hMin:180, hMax:510, pMin:2, pMax:20,
    Tcrit:101.1, Pcrit:40.59,
  },
  'R-407C': {
    label:'R-407C', gwp:1774, color:'#ef4444',
    Te:7, Tc:50, Pe:5.17, Pc:18.15,
    h1:430.8, h2:468.3, h3:279.4, h4:279.4,
    COP_ideal: (430.8-279.4)/(468.3-430.8),
    hMin:200, hMax:540, pMin:3, pMax:28,
    Tcrit:86.7, Pcrit:46.34,
  },
};

function safe(v, dec=2) {
  return (typeof v === 'number' && isFinite(v)) ? v.toFixed(dec) : '—';
}

function MollierRefrigerante({ refrigerante, potenciaKw }) {
  const d = REF_DATA[refrigerante] || REF_DATA['R-32'];
  const Qf = Math.max(0.1, parseFloat(potenciaKw) || 3.5); // kW frigorías

  // Ciclo con la potencia real escalada
  const hEvap  = Math.max(0.1, d.h1 - d.h4);  // kJ/kg — efecto frigorífico (mín 0.1)
  const hComp  = Math.max(0.1, d.h2 - d.h1);  // kJ/kg — trabajo compresor (mín 0.1)
  const hCond  = Math.max(0.1, d.h2 - d.h3);  // kJ/kg — calor cedido condensador
  const mRef   = hEvap > 0 ? Qf / hEvap : 0;  // protegido contra /0
  const Qc     = mRef * hCond;
  const Wcomp  = mRef * hComp;
  const COP    = hComp > 0 ? hEvap / hComp : 0;

  // SVG — coordenadas relativas al viewBox 0 0 600 320
  const VW = 600, VH = 320;
  const pad = { l: 56, r: 18, t: 32, b: 44 };
  const hRange = d.hMax - d.hMin;
  const pRange = Math.log(d.pMax) - Math.log(d.pMin);

  const toX = (hv) => {
    if (!isFinite(hv) || hRange <= 0) return pad.l;
    const x = pad.l + ((hv - d.hMin) / hRange) * (VW - pad.l - pad.r);
    return Math.max(pad.l, Math.min(VW - pad.r, isFinite(x) ? x : pad.l));
  };
  const toY = (pBar) => {
    if (!isFinite(pBar) || pBar <= 0 || pRange <= 0) return VH - pad.b;
    const p = Math.max(d.pMin * 0.5, Math.min(d.pMax * 1.5, pBar));
    const logP = Math.log(Math.max(0.001, p)) - Math.log(Math.max(0.001, d.pMin));
    const y = pad.t + (1 - logP / pRange) * (VH - pad.t - pad.b);
    return Math.max(pad.t, Math.min(VH - pad.b, isFinite(y) ? y : VH - pad.b));
  };

  // 4 puntos del ciclo
  const pts = [
    { id:'1', label:'1: Salida evap.',  h:d.h1, p:d.Pe, color:'#22d3ee', desc:`Vapor saturado seco` },
    { id:'2', label:'2: Salida compr.', h:d.h2, p:d.Pc, color:'#f97316', desc:`Vapor sobrecalentado` },
    { id:'3', label:'3: Salida cond.',  h:d.h3, p:d.Pc, color:'#a78bfa', desc:`Líquido saturado` },
    { id:'4', label:'4: Salida exp.',   h:d.h4, p:d.Pe, color:'#34d399', desc:`Mezcla líq-vapor` },
  ];

  // Curva de saturación aproximada (campana)
  const satCurve = () => {
    const pts2 = [];
    // Rama líquida
    for (let f = 0; f <= 1; f += 0.05) {
      const T = d.Te + f * (d.Tcrit - d.Te);
      const hLiq = d.h4 + f * (d.h3 - d.h4) * 0.8;
      const pSat = d.Pe * Math.exp(f * Math.log(d.Pcrit / d.Pe));
      if (isFinite(hLiq) && isFinite(pSat)) pts2.push(`${toX(hLiq)},${toY(pSat)}`);
    }
    // Punto crítico
    pts2.push(`${toX((d.h1+d.h4)/2)},${toY(d.Pcrit)}`);
    // Rama vapor
    for (let f = 1; f >= 0; f -= 0.05) {
      const hVap = d.h4 + f * (d.h1 - d.h4) * 1.05;
      const pSat = d.Pe * Math.exp(f * Math.log(d.Pcrit / d.Pe));
      if (isFinite(hVap) && isFinite(pSat)) pts2.push(`${toX(hVap)},${toY(pSat)}`);
    }
    return pts2.join(' ');
  };

  const cycleD = [
    `M ${toX(d.h1)} ${toY(d.Pe)}`,       // punto 1
    `L ${toX(d.h2)} ${toY(d.Pc)}`,       // 1→2 compresión
    `L ${toX(d.h3)} ${toY(d.Pc)}`,       // 2→3 condensación
    `L ${toX(d.h4)} ${toY(d.Pe)}`,       // 3→4 expansión
    `Z`,                                   // 4→1 evaporación
  ].join(' ');

  // Líneas de cuadrícula
  const gridH = [], gridP = [];
  for (let hv = Math.ceil(d.hMin/50)*50; hv <= d.hMax; hv += 50) gridH.push(hv);
  for (let pv = d.pMin; pv <= d.pMax; pv *= 1.5) gridP.push(parseFloat(pv.toFixed(1)));

  return (
    <div className="space-y-3">
      {/* SVG del diagrama */}
      <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
        <svg viewBox={`0 0 ${VW} ${VH}`} className="w-full" style={{minWidth:320, maxHeight:360}}>
          {/* Fondo */}
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0f172a"/>
              <stop offset="100%" stopColor="#1e293b"/>
            </linearGradient>
          </defs>
          <rect width={VW} height={VH} fill="url(#bgGrad)" rx="8"/>

          {/* Grid horizontal (presión) */}
          {gridP.map(pv => (
            <g key={pv}>
              <line x1={pad.l} y1={toY(pv)} x2={VW-pad.r} y2={toY(pv)} stroke="#1e3a5f" strokeWidth="0.5"/>
              <text x={pad.l-4} y={toY(pv)+4} fill="#475569" fontSize="8" textAnchor="end">{pv}</text>
            </g>
          ))}

          {/* Grid vertical (entalpía) */}
          {gridH.map(hv => (
            <g key={hv}>
              <line x1={toX(hv)} y1={pad.t} x2={toX(hv)} y2={VH-pad.b} stroke="#1e3a5f" strokeWidth="0.5"/>
              <text x={toX(hv)} y={VH-pad.b+14} fill="#475569" fontSize="8" textAnchor="middle">{hv}</text>
            </g>
          ))}

          {/* Curva de saturación */}
          <polyline points={satCurve()} fill="none"
            stroke={d.color} strokeWidth="2" opacity="0.75" strokeLinejoin="round"/>

          {/* Relleno zona bifásica */}
          <polygon points={satCurve()} fill={d.color} opacity="0.08"/>

          {/* Ciclo frigorífico */}
          <path d={cycleD} fill="rgba(251,191,36,0.08)"
            stroke="#fbbf24" strokeWidth="2.5" strokeLinejoin="round"/>

          {/* Flechas de dirección del ciclo */}
          {[
            { x1:toX(d.h1),   y1:toY(d.Pe), x2:toX(d.h2),   y2:toY(d.Pc) }, // compr
            { x1:toX(d.h2),   y1:toY(d.Pc), x2:toX(d.h3),   y2:toY(d.Pc) }, // cond
            { x1:toX(d.h3),   y1:toY(d.Pc), x2:toX(d.h4),   y2:toY(d.Pe) }, // exp
            { x1:toX(d.h4),   y1:toY(d.Pe), x2:toX(d.h1),   y2:toY(d.Pe) }, // evap
          ].map((seg, i) => {
            const mx = (seg.x1 + seg.x2) / 2, my = (seg.y1 + seg.y2) / 2;
            return <circle key={i} cx={mx} cy={my} r="3" fill="#fbbf24" opacity="0.6"/>;
          })}

          {/* Puntos del ciclo */}
          {pts.map(p => (
            <g key={p.id}>
              <circle cx={toX(p.h)} cy={toY(p.p)} r="7" fill={p.color} opacity="0.25"/>
              <circle cx={toX(p.h)} cy={toY(p.p)} r="4.5" fill={p.color}/>
              <text x={toX(p.h)+9} y={toY(p.p)+4} fill={p.color} fontSize="9" fontWeight="bold">{p.id}</text>
            </g>
          ))}

          {/* Etiquetas del ciclo */}
          <text x={(toX(d.h1)+toX(d.h2))/2-10} y={(toY(d.Pe)+toY(d.Pc))/2-6} fill="#f97316" fontSize="8" fontWeight="bold">COMPR.</text>
          <text x={(toX(d.h2)+toX(d.h3))/2} y={toY(d.Pc)-6} fill="#a78bfa" fontSize="8" fontWeight="bold" textAnchor="middle">CONDENSACIÓN</text>
          <text x={(toX(d.h4)+toX(d.h1))/2} y={toY(d.Pe)+14} fill="#22d3ee" fontSize="8" fontWeight="bold" textAnchor="middle">EVAPORACIÓN</text>
          <text x={toX(d.h3)-5} y={(toY(d.Pe)+toY(d.Pc))/2} fill="#34d399" fontSize="8" fontWeight="bold" textAnchor="end">EXP.</text>

          {/* Ejes */}
          <line x1={pad.l} y1={pad.t} x2={pad.l} y2={VH-pad.b} stroke="#475569" strokeWidth="1.5"/>
          <line x1={pad.l} y1={VH-pad.b} x2={VW-pad.r} y2={VH-pad.b} stroke="#475569" strokeWidth="1.5"/>

          {/* Etiquetas ejes */}
          <text x={(pad.l+VW-pad.r)/2} y={VH-4} fill="#94a3b8" fontSize="9" textAnchor="middle">Entalpía específica h (kJ/kg)</text>
          <text x="12" y={(pad.t+VH-pad.b)/2} fill="#94a3b8" fontSize="9" textAnchor="middle"
            transform={`rotate(-90 12 ${(pad.t+VH-pad.b)/2})`}>Presión (bar)</text>

          {/* Título */}
          <text x={VW/2} y="18" fill={d.color} fontSize="11" textAnchor="middle" fontWeight="bold">
            Diagrama Mollier — {d.label} | GWP: {d.gwp} | COP: {safe(COP,2)}
          </text>

          {/* Presiones Pe y Pc */}
          <text x={VW-pad.r+2} y={toY(d.Pe)+3} fill="#22d3ee" fontSize="8">{safe(d.Pe,1)} bar</text>
          <text x={VW-pad.r+2} y={toY(d.Pc)+3} fill="#f97316" fontSize="8">{safe(d.Pc,1)} bar</text>
        </svg>
      </div>

      {/* Datos de los 4 puntos del ciclo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {pts.map(p => (
          <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-center">
            <p className="text-[11px] font-bold mb-1" style={{color:p.color}}>Punto {p.id}</p>
            <p className="text-slate-200 text-xs">{p.label.split(':')[1]?.trim()}</p>
            <p className="text-slate-400 text-[10px] mt-1">h = {safe(p.h,1)} kJ/kg</p>
            <p className="text-slate-400 text-[10px]">P = {safe(p.p,2)} bar</p>
            <p className="text-slate-500 text-[10px] italic">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* KPIs del ciclo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label:'Qf — Efecto frigorífico', value:`${safe(Qf,2)} kW`,   sub:`${safe(hEvap,1)} kJ/kg`,  color:'text-cyan-400' },
          { label:'Qc — Calor condensador',  value:`${safe(Qc,2)} kW`,   sub:`${safe(hCond,1)} kJ/kg`,  color:'text-orange-400' },
          { label:'W — Compresor',           value:`${safe(Wcomp,2)} kW`, sub:`${safe(hComp,1)} kJ/kg`,  color:'text-purple-400' },
          { label:'COP real estimado',       value:safe(COP,2),           sub:`Ideal ciclo ${d.Te}/${d.Tc}°C`, color:'text-green-400' },
          { label:'Caudal másico ṁ',        value:`${safe(mRef*1000,2)} g/s`, sub:`${safe(mRef,4)} kg/s`, color:'text-blue-400' },
          { label:'T evaporación',           value:`${d.Te}°C`,           sub:`Pe = ${safe(d.Pe,2)} bar`, color:'text-cyan-300' },
          { label:'T condensación',          value:`${d.Tc}°C`,           sub:`Pc = ${safe(d.Pc,2)} bar`, color:'text-red-400' },
          { label:'GWP refrigerante',        value:d.gwp,                 sub:d.label,                    color:'text-yellow-400' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="bg-slate-800 border border-slate-700 rounded-xl p-2.5">
            <p className="text-slate-400 text-[10px]">{label}</p>
            <p className={`font-bold text-sm ${color}`}>{value}</p>
            <p className="text-slate-500 text-[10px]">{sub}</p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        Ciclo frigorífico de compresión de vapor — Datos reales {d.label} — Te={d.Te}°C / Tc={d.Tc}°C — Ref: ASHRAE/NIST
      </p>
    </div>
  );
}


export default function ACPotenciaCalc() {

  // Form
  const [superficie, setSuperficie] = useState('');
  const [uso, setUso] = useState('residencial');
  const [refrigerante, setRefrigerante] = useState('R-32');
  const [tipoMaquina, setTipoMaquina] = useState('todos');
  const [contactId, setContactId] = useState('sin_cliente');
  const [nombreSala, setNombreSala] = useState('');

  // Data
  const [contacts, setContacts] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [resultado, setResultado] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState('calc');

  // Plano IA
  const [planoFile, setPlanoFile] = useState(null);
  const [planoPreview, setPlanoPreview] = useState(null);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [analizando, setAnalizando] = useState(false);
  const [analisisResultado, setAnalisisResultado] = useState(null);
  const [analisisStep, setAnalisisStep] = useState('');
  const [zoomPlano, setZoomPlano] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    base44.entities.Contact.list('name', 500).then(setContacts).catch(() => {});
    base44.entities.Supplier.list('name', 200).then(setSuppliers).catch(() => {});
    loadHistorial();
  }, []);

  const loadHistorial = async () => {
    try {
      const all = await base44.entities.ThermalCalculation.filter({ calc_type: 'aa_superficie' });
      setHistorial(all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch { setHistorial([]); }
  };

  const calcular = () => {
    const sup = parseFloat(superficie);
    if (!sup || sup <= 0) { toast.error('Introduce una superficie válida'); return; }

    const coefData = COEF_USO.find(c => c.key === uso);
    const coef = coefData?.coef || 100;

    const watios = sup * coef;
    const kw = watios / 1000;
    const frigorias = Math.round(watios * 0.86);

    // Coeficiente de seguridad +15% para asegurar confort
    const power_kw_coef = kw * 1.15;

    // Filtrar catálogo
    const candidatos = AC_CATALOG.filter(m => {
      const gasOk = refrigerante === 'todos' || m.gas === refrigerante;
      const tipoOk = tipoMaquina === 'todos' || m.tipo === tipoMaquina;
      const potOk = m.power_kw >= power_kw_coef * 0.85 && m.power_kw <= power_kw_coef * 2.5;
      return gasOk && tipoOk && potOk;
    }).sort((a, b) => a.power_kw - b.power_kw);

    setResultado({
      superficie: sup,
      uso: coefData?.label,
      coef,
      watios,
      power_kw: parseFloat(kw.toFixed(2)),
      power_kw_coef: parseFloat(power_kw_coef.toFixed(2)),
      frigorias,
      frigoriasConCoef: Math.round(frigorias * 1.15),
      candidatos: candidatos.slice(0, 6),
      maquinaIdeal: candidatos[0],
      refrigerante,
    });
    setActiveTab('resultado');
  };

  const guardar = async () => {
    if (!resultado) return;
    setSaving(true);
    try {
      const contact = contacts.find(c => c.id === contactId);
      await base44.entities.ThermalCalculation.create({
        calc_type: 'aa_superficie',
        contact_id: contactId || null,
        contact_name: contact?.name || '',
        room_name: nombreSala || `Sala ${resultado.superficie}m²`,
        surface_m2: resultado.superficie,
        power_w: resultado.watios,
        power_kw: resultado.power_kw,
        power_kw_coef: resultado.power_kw_coef,
        frigorias: resultado.frigoriasConCoef,
        refrigerant_type: resultado.refrigerante,
        uso_type: resultado.uso,
        machine_model: resultado.maquinaIdeal?.model || '',
        machine_brand: resultado.maquinaIdeal?.brand || '',
        notes: `Superficie: ${resultado.superficie}m² | Uso: ${resultado.uso} | ${resultado.coef}W/m²`,
      });
      toast.success('Cálculo guardado correctamente');
      loadHistorial();
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const eliminarCalculo = async (id) => {
    if (!confirm('¿Eliminar este cálculo?')) return;
    setDeletingId(id);
    try {
      await base44.entities.ThermalCalculation.delete(id);
      setHistorial(h => h.filter(x => x.id !== id));
      toast.success('Cálculo eliminado');
    } catch { toast.error('Error al eliminar'); }
    setDeletingId(null);
  };

  const handlePlanoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf',
                     'image/dwg','application/acad','application/x-dwg',
                     'application/dwg','.dwg'];
    const ext = file.name.toLowerCase().split('.').pop();
    const okType = allowed.some(t => file.type === t) || ext === 'dwg' || ext === 'dxf';
    if (!okType && !['jpg','jpeg','png','pdf','dwg','dxf','webp'].includes(ext)) {
      toast.error('Formato no soportado. Usa JPG, PNG, PDF, DWG o DXF.');
      return;
    }
    setPlanoFile(file);
    setAnalisisResultado(null);
    // Preview solo para imágenes
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPlanoPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPlanoPreview(null);
    }
  };

  const analizarPlano = async () => {
    if (!planoFile) { toast.error('Sube primero un plano'); return; }
    setAnalizando(true);
    setAnalisisResultado(null);

    try {
      // PASO 1: Subir el fichero a Base44
      setAnalisisStep('Subiendo plano a la nube...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file: planoFile });

      // PASO 2: Extraer datos de estancias del plano
      setAnalisisStep('Analizando plano con IA... (puede tardar 30-60 s)');
      const ext = planoFile.name.toLowerCase().split('.').pop();
      const isDWG = ['dwg','dxf'].includes(ext);

      const schema = {
        type: 'object',
        properties: {
          escala_estimada: { type: 'string' },
          superficie_total_m2: { type: 'number' },
          estancias: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                tipo: { type: 'string', enum: ['salon','dormitorio','cocina','oficina','sala_reuniones','local_comercial','nave','otro'] },
                superficie_m2: { type: 'number' },
                alto_m: { type: 'number' },
                uso_recomendado: { type: 'string' },
                coef_wm2: { type: 'number' },
                potencia_w: { type: 'number' },
                potencia_kw: { type: 'number' },
                frigorias: { type: 'number' },
                tipo_maquina_recomendada: { type: 'string', enum: ['split_mural','split_suelo_techo','cassette','conductos','multi_split'] },
                posicion_unidad_interior: { type: 'string' },
                posicion_condensadora: { type: 'string' },
                longitud_tuberia_m: { type: 'number' },
                notas: { type: 'string' },
                modelos_recomendados: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      marca: { type: 'string' },
                      modelo: { type: 'string' },
                      potencia_kw: { type: 'number' },
                      gas_refrigerante: { type: 'string' },
                      seer: { type: 'number' },
                      precio_estimado_eur: { type: 'number' },
                      estrella: { type: 'boolean' }
                    }
                  }
                }
              }
            }
          },
          datos_conductos: {
            type: 'object',
            properties: {
              aplica: { type: 'boolean' },
              caudal_total_m3h: { type: 'number' },
              conducto_principal_mm: { type: 'string' },
              ramales: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    estancia: { type: 'string' },
                    caudal_m3h: { type: 'number' },
                    seccion_conducto_mm: { type: 'string' },
                    rejilla_impulsion_mm: { type: 'string' },
                    rejilla_retorno_mm: { type: 'string' },
                    velocidad_ms: { type: 'number' },
                    perdida_carga_pa: { type: 'number' }
                  }
                }
              }
            }
          },
          lista_materiales: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                descripcion: { type: 'string' },
                referencia: { type: 'string' },
                unidad: { type: 'string' },
                cantidad: { type: 'number' },
                precio_unitario_eur: { type: 'number' },
                precio_total_eur: { type: 'number' },
                proveedor: { type: 'string' }
              }
            }
          },
          resumen_presupuesto: {
            type: 'object',
            properties: {
              equipos_eur: { type: 'number' },
              instalacion_eur: { type: 'number' },
              materiales_eur: { type: 'number' },
              total_sin_iva_eur: { type: 'number' },
              total_con_iva_eur: { type: 'number' }
            }
          }
        }
      };

      const supplierName = suppliers.find(s => s.id === proveedorSeleccionado)?.name || 'genérico';

      const prompt = isDWG
        ? `Eres un ingeniero experto en climatización HVAC en España. Se te ha proporcionado un fichero DWG/DXF de un plano de arquitectura. Analiza el contenido vectorial del archivo y:
1. Identifica y lista TODAS las estancias habitables (excluye baños, aseos, garajes, jardines, terrazas, trasteros).
2. Estima la superficie de cada estancia en m² basándote en la escala del plano.
3. Calcula la potencia de AA necesaria usando 100 W/m² para uso residencial o el coeficiente apropiado.
4. Recomienda el tipo de máquina más adecuada para cada estancia.
5. Si hay estancias contiguas, evalúa si conviene un multi-split o sistema de conductos.
6. Proporciona la posición recomendada de las unidades interiores y la condensadora.
7. Si se recomienda conductos, calcula secciones, caudales y pérdidas de carga.
8. Lista materiales con precios de mercado España 2024. Proveedor preferido: ${supplierName}.
9. Proporciona 3 opciones de máquinas por estancia (opción econónica, intermedia, premium).
IMPORTANTE: Excluye siempre baños, garajes, jardines, terrazas.`
        : `Eres un ingeniero experto en climatización HVAC en España. Analiza este plano arquitectónico (imagen o PDF) y:
1. Identifica y lista TODAS las estancias habitables visibles. EXCLUYE baños, aseos, garajes, jardines, terrazas, trasteros y zonas de paso.
2. Estima la superficie de cada estancia en m² usando la escala del plano o proporciones visuales.
3. Calcula la potencia de AA necesaria: usa 100 W/m² para zonas residenciales, 120 para oficinas, 150 para locales.
4. Recomienda el tipo de máquina: split mural para habitaciones individuales, cassette/conductos para zonas amplias.
5. Indica la posición óptima de la unidad interior (pared, techo) y dónde situar la condensadora (fachada, terraza, cubierta).
6. Si se opta por conductos, calcula: caudal de cada estancia (m³/h = 6 renovaciones/h × volumen), sección de conducto, dimensiones de rejillas.
7. Da 3 modelos por estancia: económico, intermedio, premium (marcas Daikin/Mitsubishi/Fujitsu/Samsung/LG).
8. Lista de materiales completa con precios mercado España 2024. Proveedor: ${supplierName}.
EXCLUYE SIEMPRE: baños, aseos, garajes, jardines, terrazas.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [file_url],
        model: 'claude_sonnet_4_6',
        response_json_schema: schema,
      });

      // PASO 3: Si hay proveedores reales, buscar precios en tarifas
      setAnalisisStep('Buscando precios en tarifas de proveedor...');
      let preciosProveedor = [];
      if (proveedorSeleccionado) {
        try {
          const precios = await base44.entities.SupplierPrice.filter({
            supplier_id: proveedorSeleccionado
          });
          preciosProveedor = precios.slice(0, 500);
        } catch { preciosProveedor = []; }
      }

      setAnalisisResultado({ ...result, fileUrl: file_url, preciosProveedor, fileName: planoFile.name });
      setAnalisisStep('');
      toast.success(`Análisis completado: ${result.estancias?.length || 0} estancias analizadas`);

    } catch (err) {
      console.error(err);
      toast.error('Error al analizar el plano. Verifica el fichero e inténtalo de nuevo.');
      setAnalisisStep('');
    }
    setAnalizando(false);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <NavBar title="Cálculo de Potencia AA" />

      <div className="flex items-center gap-2 flex-wrap">
        <Thermometer className="w-6 h-6 text-red-500" />
        <h1 className="text-2xl font-bold text-gray-900">Cálculo Potencia Aire Acondicionado</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border border-gray-200 rounded-xl overflow-hidden">
        {[
          { id: 'calc',      label: 'Calcular',     icon: Calculator },
          { id: 'resultado', label: 'Resultado',    icon: Thermometer },
          { id: 'plano',     label: 'Plano IA',     icon: Upload },
          { id: 'mollier',   label: 'Mollier',      icon: Wind },
          { id: 'historial', label: 'Historial',    icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── TAB CALCULAR ── */}
      {activeTab === 'calc' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Datos de la estancia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Superficie */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Superficie de la estancia (m²) *
                </label>
                <Input
                  type="number" inputMode="decimal"
                  value={superficie}
                  onChange={e => setSuperficie(e.target.value)}
                  placeholder="ej: 25"
                  min="1"
                  className="text-lg font-semibold"
                />
              </div>

              {/* Nombre sala */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Nombre de la sala (opcional)
                </label>
                <Input
                  value={nombreSala}
                  onChange={e => setNombreSala(e.target.value)}
                  placeholder="ej: Salón, Oficina principal..."
                />
              </div>

              {/* Tipo de uso */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Tipo de uso
                </label>
                <Select value={uso} onValueChange={setUso}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COEF_USO.map(c => (
                      <SelectItem key={c.key} value={c.key}>
                        <div>
                          <p className="font-medium">{c.label}</p>
                          <p className="text-xs text-gray-400">{c.desc}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Refrigerante */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Tipo de refrigerante
                </label>
                <Select value={refrigerante} onValueChange={setRefrigerante}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFRIGERANTES.map(r => (
                      <SelectItem key={r.key} value={r.key}>
                        <div>
                          <p className="font-medium">{r.label}</p>
                          <p className="text-xs text-gray-400">GWP: {r.gwp}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de máquina */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Tipo de máquina
                </label>
                <Select value={tipoMaquina} onValueChange={setTipoMaquina}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_MAQUINA.map(t => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cliente */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  <User className="w-3.5 h-3.5 inline mr-1" />
                  Vincular con cliente (opcional)
                </label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger><SelectValue placeholder="Sin cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sin_cliente">Sin cliente</SelectItem>
                    {(contacts||[]).map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info del coeficiente elegido */}
            {superficie && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                <p className="text-blue-800 font-medium">
                  {superficie} m² × {COEF_USO.find(c => c.key === uso)?.coef || 100} W/m² =
                  <span className="text-blue-900 font-bold ml-1">
                    {((parseFloat(superficie) || 0) * (COEF_USO.find(c => c.key === uso)?.coef || 100)).toLocaleString('es-ES')} W
                  </span>
                  <span className="text-blue-600 ml-1 text-xs">(+15% coef. seguridad = {(((parseFloat(superficie)||0) * (COEF_USO.find(c=>c.key===uso)?.coef||100)) * 1.15 / 1000).toFixed(2)} kW)</span>
                </p>
              </div>
            )}

            <Button
              onClick={calcular}
              className="w-full bg-red-600 hover:bg-red-700 text-white gap-2 h-12 text-base"
            >
              <Calculator className="w-5 h-5" />
              Calcular Potencia Necesaria
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── TAB RESULTADO ── */}
      {activeTab === 'resultado' && resultado && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Potencia base', value: `${resultado.power_kw} kW`, sub: `${resultado.watios.toLocaleString('es-ES')} W`, bg: 'bg-blue-50 border-blue-200 text-blue-700' },
              { label: 'Con coef. +15%', value: `${resultado.power_kw_coef} kW`, sub: 'recomendado', bg: 'bg-red-50 border-red-200 text-red-700' },
              { label: 'Frigorías', value: resultado.frigoriasConCoef.toLocaleString('es-ES'), sub: 'frig/h', bg: 'bg-orange-50 border-orange-200 text-orange-700' },
              { label: 'Superficie', value: `${resultado.superficie} m²`, sub: resultado.uso, bg: 'bg-green-50 border-green-200 text-green-700' },
            ].map(({ label, value, sub, bg }) => (
              <div key={label} className={`border rounded-xl p-3 text-center ${bg}`}>
                <p className="text-[11px] font-medium opacity-70">{label}</p>
                <p className="text-xl font-bold">{value}</p>
                <p className="text-[11px] opacity-60">{sub}</p>
              </div>
            ))}
          </div>

          {/* Esquema de la instalación de climatización con los valores calculados */}
          <ACSystemDiagram
            power_kw={resultado.power_kw_coef}
            frigorias={resultado.frigoriasConCoef}
            gas={resultado.refrigerante}
            superficie={resultado.superficie}
            uso={resultado.uso}
            tipo={tipoMaquina}
          />

          {/* Gráfico comparativo: potencia necesaria vs recomendada vs equipos candidatos */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="w-4 h-4 text-red-500" />
                Potencia necesaria vs. equipos disponibles (kW)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={[
                    { n: 'Base', kw: resultado.power_kw, tipo: 'base' },
                    { n: 'Recom. +15%', kw: resultado.power_kw_coef, tipo: 'reco' },
                    ...resultado.candidatos.map(m => ({
                      n: `${m.brand} ${m.power_kw}kW`,
                      kw: m.power_kw,
                      tipo: (resultado.maquinaIdeal && m.model === resultado.maquinaIdeal.model) ? 'ideal' : 'maquina',
                    })),
                  ]}
                  margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
                >
                  <XAxis dataKey="n" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} unit=" kW" width={48} />
                  <Tooltip formatter={(v) => [`${v} kW`, 'Potencia']} />
                  <ReferenceLine
                    y={resultado.power_kw_coef}
                    stroke="#dc2626"
                    strokeDasharray="4 3"
                    label={{ value: 'Recomendada', position: 'insideTopRight', fontSize: 9, fill: '#dc2626' }}
                  />
                  <Bar dataKey="kw" radius={[4, 4, 0, 0]}>
                    {[
                      { n: 'Base', kw: resultado.power_kw, tipo: 'base' },
                      { n: 'Recom. +15%', kw: resultado.power_kw_coef, tipo: 'reco' },
                      ...resultado.candidatos.map(m => ({
                        tipo: (resultado.maquinaIdeal && m.model === resultado.maquinaIdeal.model) ? 'ideal' : 'maquina',
                      })),
                    ].map((d, i) => (
                      <Cell
                        key={i}
                        fill={
                          d.tipo === 'base' ? '#3b82f6'
                          : d.tipo === 'reco' ? '#ef4444'
                          : d.tipo === 'ideal' ? '#16a34a'
                          : '#f59e0b'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[10px] text-gray-400 mt-1">
                Barras verdes: equipo ideal recomendado. Ámbar: alternativas del catálogo. La línea roja marca la potencia recomendada ({resultado.power_kw_coef} kW, con +15% de seguridad).
              </p>
            </CardContent>
          </Card>

          {/* Máquinas recomendadas */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                Máquinas recomendadas para {resultado.superficie}m²
                <Badge variant="outline" className="ml-auto">{resultado.candidatos.length} opciones</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {resultado.candidatos.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {resultado.candidatos.map((m, i) => (
                    <div key={i} className={`p-3 flex items-center gap-3 ${i === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {i === 0 ? '★' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{m.brand} — {m.model}</p>
                        <p className="text-xs text-gray-500">{m.tipo} · Gas: {m.gas} · SEER: {m.seer} · {m.frigorias.toLocaleString('es-ES')} frig/h</p>
                      </div>
                      <Badge className={i === 0 ? 'bg-green-600' : 'bg-gray-200 text-gray-700'}>
                        {m.power_kw} kW
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No hay máquinas en el catálogo para estos filtros. Prueba con "Todos los tipos" o cambia el refrigerante.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guardar */}
          <div className="flex gap-2">
            <Button
              onClick={guardar}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar cálculo en cliente'}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setResultado(null); setActiveTab('calc'); }}
            >
              Nuevo cálculo
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'resultado' && !resultado && (
        <div className="text-center py-12 text-gray-400">
          <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Introduce los datos y pulsa Calcular primero</p>
          <Button variant="outline" className="mt-3" onClick={() => setActiveTab('calc')}>Ir al cálculo</Button>
        </div>
      )}

      {/* ── TAB MOLLIER ── */}
      {activeTab === 'mollier' && (
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="py-3 border-b border-slate-700">
            <CardTitle className="text-slate-100 text-sm flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              Diagrama de Mollier — Ciclo frigorífico
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="mb-3 flex gap-2 flex-wrap">
              {REFRIGERANTES.map(r => (
                <button
                  key={r.key}
                  onClick={() => setRefrigerante(r.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    refrigerante === r.key
                      ? 'text-white border-transparent'
                      : 'text-slate-400 border-slate-600 hover:border-slate-400'
                  }`}
                  style={refrigerante === r.key ? { background: r.color, borderColor: r.color } : {}}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <MollierDiagram
              refrigerante={refrigerante}
              potenciaKw={resultado?.power_kw_coef || 3.5}
              onRefrigeranteChange={setRefrigerante}
            />
          </CardContent>
        </Card>
      )}

      {/* ── TAB HISTORIAL ── */}
      {activeTab === 'historial' && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Historial de cálculos
              <Badge variant="outline" className="ml-auto">{historial.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {historial.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {historial.map(h => (
                  <div key={h.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{h.room_name || 'Cálculo AA'}</p>
                      <p className="text-xs text-gray-500">
                        {h.surface_m2}m² · {h.power_kw_coef}kW · {h.refrigerant_type}
                        {h.contact_name && <span className="ml-1 text-blue-500">· {h.contact_name}</span>}
                      </p>
                      <p className="text-xs text-gray-400">{h.machine_brand} {h.machine_model}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarCalculo(h.id)}
                      disabled={deletingId === h.id}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      {deletingId === h.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-400 text-sm">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                No hay cálculos guardados todavía
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB PLANO IA ── */}
      {activeTab === 'plano' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="py-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                <Upload className="w-4 h-4" />
                Análisis de Plano con IA — Cálculo automático de AA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm text-gray-500">
                Sube el plano (JPG, PNG, PDF, DWG, DXF) y la IA identificará todas las estancias,
                calculará potencias, recomendará máquinas y generará la lista de materiales con precios.
                <strong className="text-gray-700"> Excluye automáticamente baños, garajes, jardines y terrazas.</strong>
              </p>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  planoFile ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePlanoUpload({ target: { files: [f] } }); }}
              >
                <input ref={fileInputRef} type="file" className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf,.dwg,.dxf,.webp"
                  onChange={handlePlanoUpload}
                />
                {planoFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                    <p className="font-semibold text-green-700">{planoFile.name}</p>
                    <p className="text-xs text-green-500">{(planoFile.size / 1024).toFixed(0)} KB · Listo para analizar</p>
                    <Button variant="outline" size="sm" className="text-red-500"
                      onClick={e => { e.stopPropagation(); setPlanoFile(null); setPlanoPreview(null); setAnalisisResultado(null); }}>
                      <X className="w-3 h-3 mr-1" /> Cambiar fichero
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-10 h-10 text-gray-300 mx-auto" />
                    <p className="font-medium text-gray-600">Arrastra el plano aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-400">Formatos soportados: JPG · PNG · PDF · DWG · DXF (máx. 20 MB)</p>
                  </div>
                )}
              </div>

              {planoPreview && (
                <div className="relative">
                  <img src={planoPreview} alt="Plano"
                    className={`rounded-xl border border-gray-200 w-full cursor-zoom-in transition-all ${zoomPlano ? 'max-h-none' : 'max-h-72 object-contain'}`}
                    onClick={() => setZoomPlano(z => !z)}
                  />
                  <button className="absolute top-2 right-2 bg-white/90 rounded-lg p-1.5 shadow"
                    onClick={() => setZoomPlano(z => !z)}>
                    <ZoomIn className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    <Package className="w-3.5 h-3.5 inline mr-1" />Proveedor para precios (opcional)
                  </label>
                  <Select value={proveedorSeleccionado} onValueChange={setProveedorSeleccionado}>
                    <SelectTrigger><SelectValue placeholder="Precio de mercado genérico" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="precio_generico">Precio de mercado genérico</SelectItem>
                      {(suppliers||[]).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={analizarPlano} disabled={!planoFile || analizando}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-10">
                    {analizando
                      ? <><Loader2 className="w-4 h-4 animate-spin" />Analizando...</>
                      : <><Upload className="w-4 h-4" />Analizar plano con IA</>}
                  </Button>
                </div>
              </div>

              {analizando && analisisStep && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">{analisisStep}</p>
                    <p className="text-xs text-blue-500">Esto puede tardar 30-60 segundos...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {analisisResultado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Estancias', value: analisisResultado.estancias?.length || 0, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { label: 'Sup. total', value: `${analisisResultado.superficie_total_m2 || '—'} m²`, color: 'bg-green-50 border-green-200 text-green-700' },
                  { label: 'Total s/IVA', value: `${(analisisResultado.resumen_presupuesto?.total_sin_iva_eur||0).toLocaleString('es-ES',{maximumFractionDigits:0})} €`, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                  { label: 'Total c/IVA', value: `${(analisisResultado.resumen_presupuesto?.total_con_iva_eur||0).toLocaleString('es-ES',{maximumFractionDigits:0})} €`, color: 'bg-red-50 border-red-200 text-red-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`border rounded-xl p-3 text-center ${color}`}>
                    <p className="text-[11px] font-medium opacity-70">{label}</p>
                    <p className="text-lg font-bold">{value}</p>
                  </div>
                ))}
              </div>

              {analisisResultado.estancias?.map((est, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 border-b">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{est.nombre}</p>
                      <p className="text-xs text-gray-500">{est.superficie_m2} m² · {est.tipo_maquina_recomendada?.replace(/_/g,' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{est.potencia_kw?.toFixed(2)} kW</p>
                      <p className="text-xs text-gray-400">{est.frigorias?.toLocaleString('es-ES')} frig/h</p>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {est.posicion_unidad_interior && (
                        <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <div><p className="text-[10px] text-blue-500 font-medium">Unidad interior</p><p className="text-xs text-blue-800">{est.posicion_unidad_interior}</p></div>
                        </div>
                      )}
                      {est.posicion_condensadora && (
                        <div className="flex items-start gap-2 bg-orange-50 rounded-lg p-2">
                          <MapPin className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div><p className="text-[10px] text-orange-500 font-medium">Condensadora</p><p className="text-xs text-orange-800">{est.posicion_condensadora}</p></div>
                        </div>
                      )}
                    </div>
                    {est.modelos_recomendados?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1.5">Modelos recomendados:</p>
                        <div className="space-y-1.5">
                          {est.modelos_recomendados.map((m, mi) => (
                            <div key={mi} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${m.estrella ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.estrella ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                {m.estrella ? '★' : mi+1}
                              </span>
                              <div className="flex-1"><span className="font-semibold">{m.marca}</span> — {m.modelo}<span className="text-gray-400 ml-1">· {m.gas_refrigerante} · SEER {m.seer}</span></div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold">{m.potencia_kw} kW</p>
                                {m.precio_estimado_eur && <p className="text-gray-500">{m.precio_estimado_eur.toLocaleString('es-ES')} €</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {est.notas && <p className="text-xs text-gray-500 italic bg-gray-50 rounded-lg p-2">{est.notas}</p>}
                  </CardContent>
                </Card>
              ))}

              {analisisResultado.datos_conductos?.aplica && (
                <Card>
                  <CardHeader className="py-3 bg-indigo-50 border-b">
                    <CardTitle className="text-sm text-indigo-800">Sistema de conductos</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      {[
                        { label: 'Caudal total', val: `${analisisResultado.datos_conductos.caudal_total_m3h} m³/h` },
                        { label: 'Conducto ppal.', val: analisisResultado.datos_conductos.conducto_principal_mm },
                        { label: 'Ramales', val: analisisResultado.datos_conductos.ramales?.length || 0 },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-indigo-50 rounded-lg p-2">
                          <p className="text-[10px] text-indigo-500">{label}</p>
                          <p className="font-bold text-indigo-800">{val}</p>
                        </div>
                      ))}
                    </div>
                    {analisisResultado.datos_conductos.ramales?.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-gray-500">
                              {['Estancia','Caudal m³/h','Conducto','Rejilla imp.','Rejilla ret.','v (m/s)','ΔP (Pa)'].map(h => (
                                <th key={h} className="p-1.5 text-left">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {analisisResultado.datos_conductos.ramales.map((r, i) => (
                              <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}>
                                <td className="p-1.5 font-medium">{r.estancia}</td>
                                <td className="p-1.5">{r.caudal_m3h}</td>
                                <td className="p-1.5">{r.seccion_conducto_mm}</td>
                                <td className="p-1.5">{r.rejilla_impulsion_mm}</td>
                                <td className="p-1.5">{r.rejilla_retorno_mm}</td>
                                <td className="p-1.5">{r.velocidad_ms}</td>
                                <td className="p-1.5">{r.perdida_carga_pa}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {analisisResultado.lista_materiales?.length > 0 && (
                <Card>
                  <CardHeader className="py-3 border-b">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />Lista de materiales
                      <Badge variant="outline" className="ml-auto">{analisisResultado.lista_materiales.length} partidas</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-100 text-gray-500 uppercase text-[10px]">
                            {['Descripción','Ref.','Ud.','Cant.','P.Unit.','Total','Proveedor'].map(h => (
                              <th key={h} className="p-2 text-left">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {analisisResultado.lista_materiales.map((m, i) => (
                            <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}>
                              <td className="p-2">{m.descripcion}</td>
                              <td className="p-2 text-gray-400">{m.referencia||'—'}</td>
                              <td className="p-2">{m.unidad}</td>
                              <td className="p-2 font-medium">{m.cantidad}</td>
                              <td className="p-2">{m.precio_unitario_eur?.toLocaleString('es-ES',{minimumFractionDigits:2})} €</td>
                              <td className="p-2 font-bold">{m.precio_total_eur?.toLocaleString('es-ES',{minimumFractionDigits:2})} €</td>
                              <td className="p-2 text-blue-600">{m.proveedor||'—'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan={5} className="p-2 text-right">TOTAL SIN IVA:</td>
                            <td className="p-2 text-orange-700">{(analisisResultado.resumen_presupuesto?.total_sin_iva_eur||0).toLocaleString('es-ES',{minimumFractionDigits:2})} €</td>
                            <td></td>
                          </tr>
                          <tr className="bg-red-50 font-bold">
                            <td colSpan={5} className="p-2 text-right">TOTAL CON IVA (21%):</td>
                            <td className="p-2 text-red-700">{(analisisResultado.resumen_presupuesto?.total_con_iva_eur||0).toLocaleString('es-ES',{minimumFractionDigits:2})} €</td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {analisisResultado.resumen_presupuesto && (
                <Card>
                  <CardContent className="p-4 space-y-2">
                    <p className="font-semibold text-gray-800 mb-2">Desglose del presupuesto</p>
                    {[
                      { label: 'Equipos', val: analisisResultado.resumen_presupuesto.equipos_eur },
                      { label: 'Instalación mano de obra', val: analisisResultado.resumen_presupuesto.instalacion_eur },
                      { label: 'Materiales auxiliares', val: analisisResultado.resumen_presupuesto.materiales_eur },
                    ].filter(x => x.val).map(({ label, val }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium">{val.toLocaleString('es-ES',{minimumFractionDigits:2})} €</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total sin IVA</span>
                      <span className="text-orange-700">{(analisisResultado.resumen_presupuesto.total_sin_iva_eur||0).toLocaleString('es-ES',{minimumFractionDigits:2})} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total con IVA (21%)</span>
                      <span className="text-red-700">{(analisisResultado.resumen_presupuesto.total_con_iva_eur||0).toLocaleString('es-ES',{minimumFractionDigits:2})} €</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}