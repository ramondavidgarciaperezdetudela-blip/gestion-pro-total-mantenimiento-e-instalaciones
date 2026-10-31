import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/NavBar';
import { base44 } from '@/api/base44Client';
import { uploadFile } from '@/lib/uploadImage';
import { Printer, FileDown, Gauge, Snowflake, ArrowRightLeft, Wrench, Loader2, Droplets, Zap, AlertTriangle, Save, CheckCircle2, BookOpen, ArrowLeft, User } from 'lucide-react';
import PanelCiclo from '@/components/instrumentos/PanelCiclo';
import SimuladorCiclo from '@/components/instrumentos/SimuladorCiclo';
import { REFRIGERANT_DATABASE, estadoRefrigerante, getRefrigerantInfo } from '@/components/refrigerantData';
import { format } from 'date-fns';
import { createPageUrl } from '../utils';
import DiagnosticFailuresDiagram from '@/components/DiagnosticFailuresDiagram';
import EsquemaCircuito from '@/components/EsquemaCircuito';
import CodigosAveriaSplit from '@/components/CodigosAveriaSplit';
import EsquemaSplit from '@/components/EsquemaSplit';
import { diagnosticoClima, GASES_CLIMA, tempSaturacion, RANGOS_CLIMA, nivelRango } from '@/lib/diagnosticoClima';
import { useParametrosUrl } from '@/lib/parametrosUrl';
import { imprimirPantalla } from '@/lib/printHelper';
import BuscadorCliente from '@/components/BuscadorCliente';
import { presionesDeTrabajo } from '@/lib/presionesRefrigerante';
import { sustitucionesDe, buscarSustitucion, TIPOS } from '@/lib/equivalenciasGases';
import { DatosFicha, AvisoInflamable, CargaConvertida, ComparacionFisica, GasesParecidos, PasosConversion } from '@/components/ConversionGas';

// Presiones de referencia (bar de manómetro) de cada gas y aplicación. No están escritas a mano: salen de las
// tablas de saturación de cada gas (CoolProp), con evaporación y condensación en ROCÍO. Si el gas no tiene tabla
// de propiedades, `hay` es falso y no se compara nada.
const APP_PRESIONES = { clima: 'clima', refrigeracion: 'media', congelacion: 'baja' };
function referenciaPresiones(gas, app, tAmbiente) {
  const t = String(tAmbiente ?? '').replace(',', '.').trim();
  const amb = t !== '' && Number.isFinite(Number(t)) ? Number(t) : 30;
  const p = presionesDeTrabajo(gas, APP_PRESIONES[app] || 'clima', amb);
  const ok = p && [p.evapMin, p.evapMax, p.condMin, p.condMax].every((x) => x && !x.fueraDeTabla);
  if (!ok) return { hay: false, baja: 0, alta: 0, bajaMin: 0, bajaMax: 0, altaMin: 0, altaMax: 0, amb };
  const medio = (a, b) => Math.round(((a.relativa + b.relativa) / 2) * 10) / 10;
  return {
    hay: true, amb,
    baja: medio(p.evapMin, p.evapMax), alta: medio(p.condMin, p.condMax),
    bajaMin: p.evapMin.relativa, bajaMax: p.evapMax.relativa, altaMin: p.condMin.relativa, altaMax: p.condMax.relativa,
  };
}
// Margen de tolerancia alrededor del rango de referencia: el 10 % de la presión, y nunca menos de 0,3 bar.
const margenBar = (v) => Math.max(0.1 * Math.abs(v), 0.3);
// Para los esquemas: presiones medias de refrigeración (media temperatura, 30 °C de ambiente), o «—» sin tabla.
const refPres = (g) => { const r = referenciaPresiones(g, 'refrigeracion', 30); return r.hay ? { baja: r.baja, alta: r.alta } : { baja: '—', alta: '—' }; };
const fmtBar = (v) => Number(v).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace('-', '−');
// Lista completa de gases (base de datos), para selectores y tabla — incluye prohibidos.
const ALL_GASES = REFRIGERANT_DATABASE.map(r => r.code);
const APPS = [
  { k: 'clima', l: 'Climatización (A/C)' },
  { k: 'refrigeracion', l: 'Refrigeración (positivo)' },
  { k: 'congelacion', l: 'Congelación (negativo)' },
];

// Cuadro numérico que sale vacío, se escribe del tirón y admite decimales
// con coma o punto. Guarda la cadena (vacío = '') para conservar la lógica de
// diagnóstico que distingue "sin dato" de "cero".
const N = (v, set, ph) => (
  <Input
    type="text"
    inputMode="decimal"
    placeholder={ph}
    value={v}
    onChange={(e) => {
      const val = e.target.value.replace(',', '.');
      if (val === '' || val === '-' || /^-?\d*\.?\d*$/.test(val)) set(val);
    }}
  />
);

function EsquemaFrig({ alta, baja, colorAlta, colorBaja, titulo, lecturas, variante = 'estandar' }) {
  // lecturas (opcional): { tCond, tLiq, subenf, tEvap, tAsp, recal, tAmb, pBaja, pAlta,
  //                        tFiltroIn, tFiltroOut, dtFiltro, tValvOut, dtValv }
  const L = lecturas || {};
  const HOT = '#ef4444';   // lado de alta presión (gas caliente / líquido)
  const COLD = '#0ea5e9';  // lado de baja presión (gas frío / aspiración)
  const val = (x, u = '') => (x !== undefined && x !== null && x !== '' && !Number.isNaN(x) ? `${x}${u}` : '—');
  const filtroObstr = L.dtFiltro != null && L.dtFiltro !== '' && Math.abs(parseFloat(L.dtFiltro)) >= 3;
  const solNoAbre = L.dpSolen != null && L.dpSolen !== '' && Math.abs(parseFloat(L.dpSolen)) >= 1;
  const Punto = ({ x, y, n, color }) => (
    <g>
      <circle cx={x} cy={y} r="9" fill={color} stroke="#fff" strokeWidth="1.5" />
      <text x={x} y={y + 3} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">{n}</text>
    </g>
  );
  // Válvula de corte (símbolo de dos triángulos / pajarita) con etiqueta
  const ValvCorte = ({ x, y }) => (
    <g>
      <polygon points={`${x - 7},${y - 7} ${x},${y} ${x - 7},${y + 7}`} fill="#334155" />
      <polygon points={`${x + 7},${y - 7} ${x},${y} ${x + 7},${y + 7}`} fill="#334155" />
      <text x={x} y={y - 10} fontSize="6.5" textAnchor="middle" fill="#334155">corte</text>
    </g>
  );
  // Válvula de retención (antirretorno): círculo con flecha de un solo sentido
  const ValvReten = ({ x, y }) => (
    <g>
      <circle cx={x} cy={y} r="8" fill="#fff" stroke="#0f2740" strokeWidth="1.5" />
      <polygon points={`${x - 4},${y - 4} ${x + 4},${y} ${x - 4},${y + 4}`} fill="#0f2740" />
      <line x1={x + 4} y1={y - 5} x2={x + 4} y2={y + 5} stroke="#0f2740" strokeWidth="1.5" />
      <text x={x} y={y - 11} fontSize="6" textAnchor="middle" fill="#0f2740">retención</text>
    </g>
  );
  return (
    <svg viewBox="0 0 700 470" width="100%" style={{ maxWidth: 700, background: '#f8fafc', borderRadius: 8 }}>
      {titulo && <text x="350" y="16" fontSize="12" textAnchor="middle" fill="#0f2740" fontWeight="bold">{titulo}</text>}

      {/* Tubería lado ALTA: descarga → condensador → línea de líquido → válvula */}
      <path d="M95,198 L95,90 L235,90" fill="none" stroke={HOT} strokeWidth="4" />
      <path d="M415,90 L575,90 L575,290" fill="none" stroke={HOT} strokeWidth="4" />
      {/* Tubería lado BAJA: válvula → evaporador → aspiración */}
      <path d="M575,318 L575,380 L415,380" fill="none" stroke={COLD} strokeWidth="4" />
      <path d="M235,380 L95,380 L95,252" fill="none" stroke={COLD} strokeWidth="4" />

      {/* Flechas de sentido del flujo */}
      <polygon points="160,84 172,90 160,96" fill={HOT} />
      <polygon points="575,230 569,242 581,242" fill={HOT} />
      <polygon points="320,386 308,380 320,374" fill={COLD} />
      <polygon points="95,300 89,312 101,312" fill={COLD} />

      {/* Compresor */}
      <circle cx="95" cy="225" r="27" fill="#0f2740" />
      <text x="95" y="221" fill="#fff" fontSize="9" textAnchor="middle">COMPRE-</text>
      <text x="95" y="232" fill="#fff" fontSize="9" textAnchor="middle">SOR</text>
      {(L.compAmp || L.compRLA) && (
        <text x="95" y="266" fontSize="8" textAnchor="middle" fill="#0f2740">{val(L.compAmp, ' A')}{L.compRLA ? ` / RLA ${L.compRLA} A` : ''}</text>
      )}

      {/* Condensador (alta) */}
      <rect x="235" y="74" width="180" height="32" rx="6" fill="#fee2e2" stroke={HOT} strokeWidth="2" />
      <text x="325" y="94" fontSize="11" textAnchor="middle" fill="#991b1b" fontWeight="bold">CONDENSADOR</text>

      {/* Recibidor de líquido */}
      <rect x="558" y="118" width="34" height="52" rx="16" fill="#ffedd5" stroke="#ea580c" strokeWidth="2" />
      <text x="601" y="128" fontSize="8" fill="#7c2d12">Recibidor</text>
      <text x="601" y="138" fontSize="8" fill="#7c2d12">de líquido</text>
      <text x="601" y="150" fontSize="7.5" fill="#9a3412">ent {val(L.tRecibIn, '°')}</text>
      <text x="601" y="160" fontSize="7.5" fill="#9a3412">sal {val(L.tRecibOut, '°')}</text>
      <text x="601" y="170" fontSize="7.5" fill="#9a3412">P {val(L.pRecib, '')}</text>

      {/* Filtro deshidratador */}
      <rect x="563" y="205" width="24" height="46" rx="12" fill={filtroObstr ? '#fee2e2' : '#fef9c3'} stroke={filtroObstr ? '#dc2626' : '#ca8a04'} strokeWidth="2" />
      <text x="601" y="212" fontSize="8" fill="#713f12">Filtro FD</text>
      <text x="601" y="223" fontSize="7.5" fill="#92400e">ent {val(L.tFiltroIn, '°')}</text>
      <text x="601" y="233" fontSize="7.5" fill="#92400e">sal {val(L.tFiltroOut, '°')}</text>

      {/* Válvula solenoide de línea de líquido (bobina + cuerpo) */}
      <line x1="575" y1="251" x2="575" y2="258" stroke={solNoAbre ? '#dc2626' : '#7c3aed'} strokeWidth="1.5" />
      <rect x="568" y="258" width="14" height="9" rx="1" fill={solNoAbre ? '#dc2626' : '#7c3aed'} />
      <rect x="569" y="267" width="12" height="8" fill="#fff" stroke={solNoAbre ? '#dc2626' : '#7c3aed'} strokeWidth="1.5" />
      <text x="601" y="263" fontSize="8" fill="#6b21a8">Solenoide</text>
      <text x="601" y="273" fontSize="7.5" fill="#6b21a8">T {val(L.tSolen, '°')} · Δ {val(L.dpSolen, ' bar')}</text>

      {/* Válvula de expansión */}
      <polygon points="575,290 561,302 575,314 589,302" fill="#f59e0b" stroke="#b45309" strokeWidth="1.5" />
      <text x="601" y="298" fontSize="8" fill="#92400e">V. expansión</text>
      <text x="601" y="309" fontSize="7.5" fill="#075985">sal {val(L.tValvOut, '°')}</text>

      {/* Evaporador (baja) */}
      <rect x="235" y="364" width="180" height="32" rx="6" fill="#e0f2fe" stroke={COLD} strokeWidth="2" />
      <text x="325" y="384" fontSize="11" textAnchor="middle" fill="#075985" fontWeight="bold">EVAPORADOR</text>

      {/* Válvulas de corte del sistema (descarga, aspiración y línea de líquido) */}
      <ValvCorte x={95} y={150} />
      <ValvCorte x={150} y={380} />
      <ValvCorte x={575} y={185} />

      {/* Bulbo de la válvula de expansión: en el tubo de aspiración a la SALIDA del evaporador */}
      <ellipse cx="218" cy="380" rx="11" ry="5.5" fill="#fde68a" stroke="#b45309" strokeWidth="1.5" />
      <text x="218" y="366" fontSize="7" textAnchor="middle" fill="#92400e">bulbo {val(L.tBulbo, '°')} (sal. evap.)</text>
      <path d="M228,376 Q340,345 560,300" fill="none" stroke="#b45309" strokeWidth="1" strokeDasharray="3 2" />
      <text x="430" y="338" fontSize="6.5" fill="#b45309">capilar del bulbo → válvula</text>

      {variante === 'retencion' && (
        <g>
          {/* Válvulas de retención: entrada del compresor (aspiración) y entrada del condensador (descarga) */}
          <ValvReten x={112} y={380} />
          <ValvReten x={195} y={90} />
        </g>
      )}

      {variante === 'compensacion' && (
        <g>
          {/* Línea de igualación externa: del cuerpo de la válvula al tubo de aspiración, justo tras el bulbo */}
          <path d="M560,300 Q400,300 250,378" fill="none" stroke="#7c3aed" strokeWidth="1.4" strokeDasharray="5 3" />
          <circle cx="250" cy="378" r="3" fill="#7c3aed" />
          <text x="300" y="300" fontSize="7" fill="#7c3aed">igualación externa {val(L.pIgual, ' bar')}</text>
          <text x="300" y="309" fontSize="6.5" fill="#7c3aed">(tras el bulbo)  {val(L.tIgual, '°')}</text>
        </g>
      )}

      {/* Manómetro ALTA */}
      <rect x="150" y="120" width="94" height="40" rx="6" fill="#fff" stroke={colorAlta} strokeWidth="2" />
      <text x="197" y="136" fontSize="9" textAnchor="middle" fill="#475569">ALTA (bar)</text>
      <text x="197" y="153" fontSize="15" fontWeight="bold" textAnchor="middle" fill={colorAlta}>{alta}</text>
      {/* Manómetro BAJA */}
      <rect x="150" y="290" width="94" height="40" rx="6" fill="#fff" stroke={colorBaja} strokeWidth="2" />
      <text x="197" y="306" fontSize="9" textAnchor="middle" fill="#475569">BAJA (bar)</text>
      <text x="197" y="323" fontSize="15" fontWeight="bold" textAnchor="middle" fill={colorBaja}>{baja}</text>

      {/* Puntos clave de medición */}
      <Punto x={128} y={90} n="1" color={HOT} />
      <Punto x={490} y={90} n="2" color={HOT} />
      <Punto x={175} y={380} n="3" color={COLD} />
      <Punto x={95} y={290} n="4" color={COLD} />

      {/* Etiquetas de medida sobre el circuito */}
      <text x="128" y="72" fontSize="8.5" textAnchor="middle" fill="#991b1b">descarga</text>
      <text x="325" y="66" fontSize="8" textAnchor="middle" fill="#991b1b">T. cond. {val(L.tCond, '°')}</text>
      <text x="470" y="74" fontSize="8" textAnchor="middle" fill="#334155">T. líquido {val(L.tLiq, '°')}</text>
      <text x="325" y="414" fontSize="8" textAnchor="middle" fill="#075985">T. evap. {val(L.tEvap, '°')}</text>

      {/* Recuadro SUBENFRIAMIENTO (línea de líquido, punto 2) */}
      <rect x="415" y="140" width="80" height="30" rx="4" fill="#fef2f2" stroke="#ef4444" />
      <text x="455" y="152" fontSize="7.5" textAnchor="middle" fill="#991b1b" fontWeight="bold">SUBENFRIAM.</text>
      <text x="455" y="164" fontSize="10" textAnchor="middle" fill="#dc2626" fontWeight="bold">{val(L.subenf, '°C')}</text>
      <text x="455" y="182" fontSize="7" textAnchor="middle" fill="#991b1b">medir en la línea de líquido</text>
      {/* Recuadro Δ FILTRO (obstrucción) */}
      <rect x="415" y="196" width="80" height="30" rx="4" fill={filtroObstr ? '#fee2e2' : '#fefce8'} stroke={filtroObstr ? '#dc2626' : '#ca8a04'} />
      <text x="455" y="208" fontSize="7.5" textAnchor="middle" fill="#713f12" fontWeight="bold">Δ FILTRO</text>
      <text x="455" y="220" fontSize="10" textAnchor="middle" fill={filtroObstr ? '#dc2626' : '#a16207'} fontWeight="bold">{val(L.dtFiltro, '°C')}</text>
      {/* Recuadro RECALENTAMIENTO (aspiración, punto 4) */}
      <rect x="14" y="300" width="80" height="30" rx="4" fill="#eff6ff" stroke="#0ea5e9" />
      <text x="54" y="312" fontSize="7.5" textAnchor="middle" fill="#075985" fontWeight="bold">RECALENT.</text>
      <text x="54" y="324" fontSize="10" textAnchor="middle" fill="#0284c7" fontWeight="bold">{val(L.recal, '°C')}</text>
      <text x="54" y="342" fontSize="7.5" textAnchor="middle" fill="#075985">T. asp. {val(L.tAsp, '°')} · 15 cm antes comp.</text>
      {/* Tª ambiente */}
      <text x="95" y="360" fontSize="8" textAnchor="middle" fill="#64748b">T. amb. {val(L.tAmb, '°')}</text>

      {/* Referencia de puntos y símbolos */}
      <g fontSize="7.5" fill="#64748b">
        <text x="20" y="440">Medir: ① descarga (salida compresor)  ② línea de líquido → SUBENFRIAMIENTO  ③ evaporación (manómetro baja)</text>
        <text x="20" y="452">④ aspiración → RECALENTAMIENTO  ·  filtro y recibidor: entrada y salida  ·  ▷◁ = válvula de corte</text>
      </g>
    </svg>
  );
}

// Diagrama de Mollier (presión–entalpía) con el ciclo de refrigeración dibujado.
// Es ORIENTATIVO: la forma del ciclo se construye con los datos introducidos
// (presiones, recalentamiento y subenfriamiento) para señalar cada fase.
function MollierDiagram({ gas, baja, alta, recal, subenf }) {
  const nb = parseFloat(baja), na = parseFloat(alta);
  const yLow = 235, yHigh = 120;           // líneas de baja y alta presión
  const vaporSatX = 400, liqSatX = 220;    // cortes con la campana (baja/alta)
  const sh = Math.max(0, Math.min(70, (parseFloat(recal) || 0) * 3.5));  // recalentamiento → desplazamiento
  const sc = Math.max(0, Math.min(55, (parseFloat(subenf) || 0) * 3.5)); // subenfriamiento → desplazamiento
  const x1 = vaporSatX + sh;   // admisión al compresor (vapor recalentado, baja)
  const x2 = Math.max(x1 + 20, 445); // descarga (vapor caliente, alta)
  const x3 = liqSatX - sc;     // salida condensador (líquido subenfriado, alta)
  const x4 = x3;               // entrada evaporador (misma entalpía)
  const P = (x, y) => `${x},${y}`;
  return (
    <svg viewBox="0 0 560 340" width="100%" style={{ maxWidth: 560, background: '#ffffff', borderRadius: 8 }}>
      <text x="280" y="18" fontSize="12" textAnchor="middle" fill="#0f2740" fontWeight="bold">Diagrama de Mollier (p–h) · {gas}</text>
      {/* Ejes */}
      <line x1="55" y1="40" x2="55" y2="300" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="55" y1="300" x2="535" y2="300" stroke="#94a3b8" strokeWidth="1.5" />
      <text x="20" y="170" fontSize="9" fill="#64748b" transform="rotate(-90 20,170)">Presión (bar)</text>
      <text x="280" y="322" fontSize="9" textAnchor="middle" fill="#64748b">Entalpía h (kJ/kg) →</text>
      {/* Campana de saturación */}
      <path d="M150,300 C170,150 250,60 290,52 C330,60 430,150 470,300" fill="none" stroke="#cbd5e1" strokeWidth="2" />
      <text x="205" y="120" fontSize="8" fill="#94a3b8">líquido sat.</text>
      <text x="420" y="120" fontSize="8" fill="#94a3b8">vapor sat.</text>
      {/* Líneas de presión */}
      <line x1="55" y1={yHigh} x2="535" y2={yHigh} stroke="#fca5a5" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="55" y1={yLow} x2="535" y2={yLow} stroke="#93c5fd" strokeWidth="1" strokeDasharray="4 3" />
      <text x="60" y={yHigh - 4} fontSize="8" fill="#dc2626">Alta {na || '—'} bar</text>
      <text x="60" y={yLow - 4} fontSize="8" fill="#2563eb">Baja {nb || '—'} bar</text>
      {/* Ciclo */}
      <polyline points={`${P(x1, yLow)} ${P(x2, yHigh)} ${P(x3, yHigh)} ${P(x4, yLow)} ${P(x1, yLow)}`} fill="none" stroke="#0f2740" strokeWidth="2.5" />
      {/* Fases */}
      <text x={(x1 + x2) / 2 + 8} y={(yLow + yHigh) / 2} fontSize="9" fill="#7c3aed" fontWeight="bold">Compresión</text>
      <text x={(x2 + x3) / 2} y={yHigh - 6} fontSize="9" textAnchor="middle" fill="#dc2626" fontWeight="bold">Condensación</text>
      <text x={x3 - 6} y={(yLow + yHigh) / 2} fontSize="9" textAnchor="end" fill="#0891b2" fontWeight="bold">Expansión</text>
      <text x={(x4 + vaporSatX) / 2} y={yLow + 14} fontSize="9" textAnchor="middle" fill="#2563eb" fontWeight="bold">Evaporación</text>
      {/* Recalentamiento (vapor sat → 1) */}
      <line x1={vaporSatX} y1={yLow} x2={x1} y2={yLow} stroke="#0ea5e9" strokeWidth="4" />
      <text x={(vaporSatX + x1) / 2} y={yLow + 26} fontSize="8" textAnchor="middle" fill="#0369a1">recalent. {recal || '—'}°</text>
      {/* Subenfriamiento (3 → liquido sat) */}
      <line x1={x3} y1={yHigh} x2={liqSatX} y2={yHigh} stroke="#ef4444" strokeWidth="4" />
      <text x={(x3 + liqSatX) / 2} y={yHigh - 16} fontSize="8" textAnchor="middle" fill="#991b1b">subenf. {subenf || '—'}°</text>
      {/* Puntos del ciclo */}
      {[[x1, yLow, '1'], [x2, yHigh, '2'], [x3, yHigh, '3'], [x4, yLow, '4']].map(([x, y, n]) => (
        <g key={n}><circle cx={x} cy={y} r="7" fill="#0f2740" /><text x={x} y={y + 3} fontSize="9" fontWeight="bold" textAnchor="middle" fill="#fff">{n}</text></g>
      ))}
      <text x={x1 + 4} y={yLow - 10} fontSize="8" fill="#0f2740">1 · admisión al compresor</text>
      <text x={x2 + 4} y={yHigh - 6} fontSize="8" fill="#0f2740">2 · descarga</text>
    </svg>
  );
}

export default function DiagnosticoCarga() {
  const [tab, setTab] = useState('presiones');

  // ── Diagnóstico de split (pestaña Clima) ────────────────────────────────
  // Va aparte del de refrigeración a propósito: en un split casi nunca hay
  // toma de alta, así que aquí el peso lo llevan el recalentamiento y el
  // salto de temperatura del aire, no las dos presiones.
  const [clGas, setClGas] = useState('R-410A');
  const [clModo, setClModo] = useState('frio');
  const [clExpansion, setClExpansion] = useState('capilar');
  const [clPBaja, setClPBaja] = useState('');
  const [clTEvap, setClTEvap] = useState('');
  const [clPAlta, setClPAlta] = useState('');
  const [clTAsp, setClTAsp] = useState('');
  const [clTDesc, setClTDesc] = useState('');
  const [clTLiq, setClTLiq] = useState('');
  const [clAireIntEntra, setClAireIntEntra] = useState('');
  const [clAireIntSale, setClAireIntSale] = useState('');
  const [clAireExtEntra, setClAireExtEntra] = useState('');
  const [clAireExtSale, setClAireExtSale] = useState('');

  const datosClima = {
    gas: clGas, modo: clModo, expansion: clExpansion,
    pBaja: clPBaja, tEvapManual: clTEvap, pAlta: clPAlta,
    tAspiracion: clTAsp, tDescarga: clTDesc, tLiquido: clTLiq,
    aireIntEntra: clAireIntEntra, aireIntSale: clAireIntSale,
    aireExtEntra: clAireExtEntra, aireExtSale: clAireExtSale,
  };
  const diagClima = useMemo(() => diagnosticoClima(datosClima),
    [clGas, clModo, clExpansion, clPBaja, clTEvap, clPAlta, clTAsp, clTDesc,
      clTLiq, clAireIntEntra, clAireIntSale, clAireExtEntra, clAireExtSale]);

  const limpiarClima = () => {
    setClPBaja(''); setClTEvap(''); setClPAlta(''); setClTAsp(''); setClTDesc('');
    setClTLiq(''); setClAireIntEntra(''); setClAireIntSale('');
    setClAireExtEntra(''); setClAireExtSale('');
  };

  // ── Contexto: cliente / orden SAT desde la URL (llegando desde una orden) ──
  // Permite guardar el diagnóstico en la ficha del cliente y, si viene de una
  // orden SAT, vincularlo automáticamente a sus apartados antes/después.
  const urlParams = useParametrosUrl();
  const urlContactId = urlParams.get('contact_id');
  const ctxSatOrderId = urlParams.get('sat_order_id');
  const [ctxContact, setCtxContact] = useState(null);
  const [ctxOrder, setCtxOrder] = useState(null);

  /*
   * El cliente se puede elegir aquí mismo.
   *
   * Antes solo se podía vincular llegando desde una orden de SAT, con el
   * cliente metido en la dirección. Si entrabas por el menú —que es lo normal
   * cuando estás delante de la máquina— no había manera de guardarlo en la
   * ficha de nadie, y el botón de guardar ni siquiera aparecía.
   *
   * Ahora manda el que se elija a mano, y si no se ha elegido ninguno se usa
   * el que venga en la dirección. Así el camino de la orden SAT sigue igual.
   */
  const [contactoElegido, setContactoElegido] = useState('');
  const [contactos, setContactos] = useState([]);
  const [cargandoContactos, setCargandoContactos] = useState(false);

  const ctxContactId = contactoElegido || urlContactId;

  // Si se llega con un cliente en la dirección —desde una orden de SAT o desde
  // su ficha—, manda ese: es una elección explícita y tiene que pisar la que
  // hubiera hecha a mano antes en esta misma pantalla.
  useEffect(() => {
    if (urlContactId) setContactoElegido(urlContactId);
  }, [urlContactId]);

  useEffect(() => {
    if (ctxSatOrderId) base44.entities.SATOrder.filter({ id: ctxSatOrderId }).then(l => setCtxOrder(l?.[0] || null)).catch(() => {});
  }, [ctxSatOrderId]);

  useEffect(() => {
    if (!ctxContactId) { setCtxContact(null); return; }
    const yaEstá = contactos.find((c) => c.id === ctxContactId);
    if (yaEstá) { setCtxContact(yaEstá); return; }
    base44.entities.Contact.filter({ id: ctxContactId })
      .then((l) => setCtxContact(l?.[0] || null))
      .catch(() => setCtxContact(null));
  }, [ctxContactId, contactos]);

  // La lista para el buscador, una sola vez y sin bloquear la pantalla.
  useEffect(() => {
    let vivo = true;
    setCargandoContactos(true);
    base44.entities.Contact.list('name', 500)
      .then((l) => { if (vivo) setContactos(l || []); })
      .catch(() => { if (vivo) setContactos([]); })
      .finally(() => { if (vivo) setCargandoContactos(false); });
    return () => { vivo = false; };
  }, []);

  // ── comunes ──
  const [gas, setGas] = useState('R-410A');
  const [app, setApp] = useState('clima');

  // ── TAB 1: presiones + temperaturas ──
  const [pBaja, setPBaja] = useState('');
  const [pAlta, setPAlta] = useState('');
  const [tEvap, setTEvap] = useState('');   // T saturación baja (manómetro baja)
  const [tAsp, setTAsp] = useState('');     // T tubo de aspiración
  const [tCond, setTCond] = useState('');   // T saturación alta (manómetro alta)
  const [tLiq, setTLiq] = useState('');     // T línea de líquido
  const [tAmb, setTAmb] = useState('');     // T ambiente
  const rec = useMemo(() => referenciaPresiones(gas, app, tAmb), [gas, app, tAmb]);
  const [tFiltroIn, setTFiltroIn] = useState('');   // T entrada filtro deshidratador
  const [tFiltroOut, setTFiltroOut] = useState(''); // T salida filtro deshidratador
  const [tValvOut, setTValvOut] = useState('');     // T salida válvula (entrada evaporador)
  const [tRecibIn, setTRecibIn] = useState('');     // T entrada recibidor de líquido
  const [tRecibOut, setTRecibOut] = useState('');   // T salida recibidor de líquido
  const [pRecib, setPRecib] = useState('');         // Presión en el recibidor de líquido (bar, opcional)
  // Válvula solenoide de línea de líquido (cámaras): control de averías
  const [tSolen, setTSolen] = useState('');         // T en la válvula solenoide (control de averías)
  const [pSolIn, setPSolIn] = useState('');         // Presión entrada solenoide
  const [pSolOut, setPSolOut] = useState('');       // Presión salida solenoide
  // Compresor: marca, modelo, refrigerantes, consumo medido y amperaje nominal
  const [compMarca, setCompMarca] = useState('');
  const [compModelo, setCompModelo] = useState('');
  const [compRefrigs, setCompRefrigs] = useState(new Set());  // refrigerantes admitidos (multi)
  const [compAmp, setCompAmp] = useState('');
  const [compRLA, setCompRLA] = useState(null);     // { rla, lra, info }
  const [compBusy, setCompBusy] = useState(false);
  const toggleRefrig = (c) => setCompRefrigs(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  // Válvula de expansión y evaporador: marca/modelo, para buscar en sus fichas
  // técnicas los valores de funcionamiento preferidos por el fabricante.
  const [valvMarca, setValvMarca] = useState('');
  const [valvModelo, setValvModelo] = useState('');
  const [evapMarca, setEvapMarca] = useState('');
  const [evapModelo, setEvapModelo] = useState('');
  const [fabValores, setFabValores] = useState(null); // { recalentamiento, subenfriamiento, presion_baja, presion_alta, aceite, notas }
  const [fabBusy, setFabBusy] = useState(false);

  // Valores de referencia orientativos (tabla de presiones + aceite del
  // refrigerante), para cuando no hay marca/modelo, la búsqueda falla por
  // falta de acceso, o no se encuentran datos del fabricante: el
  // diagnóstico de averías sigue funcionando igual con estos valores.
  const valoresReferencia = (motivo) => ({
    recalentamiento: '~5-8 °C (orientativo)',
    subenfriamiento: '~4-10 °C (orientativo)',
    presion_baja: rec.hay ? `${fmtBar(rec.bajaMin)} a ${fmtBar(rec.bajaMax)} bar` : '—',
    presion_alta: rec.hay ? `${fmtBar(rec.altaMin)} a ${fmtBar(rec.altaMax)} bar` : '—',
    aceite: getRefrigerantInfo(gas)?.compressor_oil || '—',
    notas: motivo,
  });

  const buscarValoresFabricante = async () => {
    if (!compModelo.trim() && !valvModelo.trim() && !evapModelo.trim()) {
      setFabValores(valoresReferencia('Valores de referencia genéricos para este refrigerante y aplicación (sin marca/modelo de compresor). Indica marca y modelo para una búsqueda más precisa del fabricante.'));
      return;
    }
    setFabBusy(true); setFabValores(null);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un técnico frigorista buscando en manuales y fichas técnicas de fabricante. Componentes del sistema — Compresor: ${[compMarca, compModelo].filter(Boolean).join(' ') || 'no especificado'}. Válvula de expansión: ${[valvMarca, valvModelo].filter(Boolean).join(' ') || 'no especificada'}. Evaporador: ${[evapMarca, evapModelo].filter(Boolean).join(' ') || 'no especificado'}. Refrigerante: ${gas}. Aplicación: ${APPS.find(a => a.k === app)?.l || app}. Busca (principalmente en la documentación del FABRICANTE DEL COMPRESOR, complementando con la de la válvula/evaporador si aporta datos) los valores de funcionamiento recomendados para este sistema: recalentamiento objetivo (°C), subenfriamiento objetivo (°C), presión de baja y de alta orientativas para este refrigerante (bar), tipo y carga aproximada de aceite, y cualquier límite de funcionamiento relevante (temperatura ambiente máxima, envolvente de trabajo, etc.). Si no encuentras el modelo exacto, da los valores típicos de esa familia/gama de producto e indícalo. Responde en español, de forma breve y concreta.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            recalentamiento: { type: 'string' },
            subenfriamiento: { type: 'string' },
            presion_baja: { type: 'string' },
            presion_alta: { type: 'string' },
            aceite: { type: 'string' },
            notas: { type: 'string' },
          },
        },
      });
      const tieneDatos = r && (r.recalentamiento || r.subenfriamiento || r.presion_baja || r.presion_alta || r.aceite);
      setFabValores(tieneDatos ? r : valoresReferencia('No se encontraron datos específicos del fabricante para este modelo; se muestran valores de referencia orientativos.'));
    } catch {
      setFabValores(valoresReferencia('No se pudo acceder al manual del fabricante (¿sin conexión?); se muestran valores de referencia orientativos.'));
    }
    setFabBusy(false);
  };

  // Variante del esquema: estándar / válvulas de retención / válvula de expansión con compensación
  const [variante, setVariante] = useState('estandar');
  const [tBulbo, setTBulbo] = useState('');       // T en el bulbo de la válvula
  const [pIgual, setPIgual] = useState('');       // Presión de igualación externa (compensación)
  const [tIgual, setTIgual] = useState('');       // T en la toma de igualación externa

  const recal = (tAsp !== '' && tEvap !== '') ? (parseFloat(tAsp) - parseFloat(tEvap)) : null;   // recalentamiento
  const subenf = (tCond !== '' && tLiq !== '') ? (parseFloat(tCond) - parseFloat(tLiq)) : null;   // subenfriamiento
  // Salto térmico en el filtro deshidratador: si es apreciable, está obstruido
  const dtFiltro = (tFiltroIn !== '' && tFiltroOut !== '') ? (parseFloat(tFiltroIn) - parseFloat(tFiltroOut)) : null;
  // Salto en la válvula de expansión (línea de líquido → salida válvula)
  const dtValv = (tLiq !== '' && tValvOut !== '') ? (parseFloat(tLiq) - parseFloat(tValvOut)) : null;
  // Caída de presión en la válvula solenoide (línea de líquido). Sana ≈ 0.
  const dpSolen = (pSolIn !== '' && pSolOut !== '') ? (parseFloat(pSolIn) - parseFloat(pSolOut)) : null;
  // Comparación del consumo del compresor con su amperaje nominal (RLA)
  const ampVerdict = useMemo(() => {
    if (!compRLA || compRLA.rla == null || compAmp === '') return null;
    const a = parseFloat(compAmp), rla = parseFloat(compRLA.rla);
    if (Number.isNaN(a) || Number.isNaN(rla) || rla <= 0) return null;
    if (a > rla * 1.1) return { t: 'CONSUMO ALTO', c: '#dc2626', m: `Consumo ${a} A por encima del RLA (${rla} A): sobrecarga — condensación alta, compresor forzado, baja tensión o rotor bloqueado.` };
    if (a < rla * 0.5) return { t: 'CONSUMO BAJO', c: '#d97706', m: `Consumo ${a} A muy por debajo del RLA (${rla} A): posible falta de gas, válvulas internas del compresor o poca carga.` };
    return { t: 'CONSUMO CORRECTO', c: '#16a34a', m: `Consumo ${a} A dentro del rango del RLA (${rla} A).` };
  }, [compRLA, compAmp]);
  const buscarAmperaje = async () => {
    if (!compModelo.trim()) return;
    setCompBusy(true); setCompRLA(null);
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Compresor de refrigeración/climatización modelo "${compModelo}". Indica su amperaje nominal a plena carga RLA (Rated Load Amps) y el de rotor bloqueado LRA (Locked Rotor Amps) en amperios, y una nota breve. Si no lo encuentras exacto, da un valor típico orientativo para ese tipo/potencia de compresor. Responde en español.`,
        add_context_from_internet: true,
        response_json_schema: { type: 'object', properties: { rla: { type: 'number' }, lra: { type: 'number' }, info: { type: 'string' } } },
      });
      setCompRLA({ rla: r?.rla ?? null, lra: r?.lra ?? null, info: r?.info || '' });
    } catch { setCompRLA({ rla: null, lra: null, info: 'No se pudo buscar (¿sin conexión?). Consulta la placa del compresor.' }); }
    setCompBusy(false);
  };

  const diag1 = useMemo(() => {
    const mB = pBaja !== '' ? parseFloat(pBaja) : null;
    const mA = pAlta !== '' ? parseFloat(pAlta) : null;
    const items = [];
    const bajaBaja = rec.hay && mB != null && mB < rec.bajaMin - margenBar(rec.bajaMin);
    const altaAlta = rec.hay && mA != null && mA > rec.altaMax + margenBar(rec.altaMax);
    const altaBaja = rec.hay && mA != null && mA < rec.altaMin - margenBar(rec.altaMin);
    if (recal != null && recal > 12 && (bajaBaja || (subenf != null && subenf < 3)))
      items.push({ e: 'FALTA DE REFRIGERANTE', c: '#dc2626', t: `Recalentamiento alto (${recal.toFixed(0)} °C) y subenfriamiento bajo/baja presión baja: falta carga o fuga. Detecta fugas y carga poco a poco hasta recalentamiento ~5-8 °C.` });
    if (subenf != null && subenf > 12 && (recal != null && recal < 4))
      items.push({ e: 'EXCESO DE CARGA', c: '#d97706', t: `Subenfriamiento alto (${subenf.toFixed(0)} °C) y recalentamiento bajo: sobrecarga o retorno de líquido. Retira gas hasta recalentamiento ~5-8 °C.` });
    if (recal != null && recal > 15 && subenf != null && subenf >= 5)
      items.push({ e: 'VÁLVULA DE EXPANSIÓN OBSTRUIDA / POCO ABIERTA', c: '#d97706', t: 'Recalentamiento muy alto con subenfriamiento normal/alto: válvula (TXV/EXV/capilar) obstruida o mal ajustada, o filtro deshidratador obstruido. Revisa la válvula/filtro.' });
    if (recal != null && recal < 2)
      items.push({ e: 'VÁLVULA DEMASIADO ABIERTA / INUNDACIÓN', c: '#dc2626', t: 'Recalentamiento casi nulo: válvula demasiado abierta o bulbo mal colocado; riesgo de golpe de líquido al compresor.' });
    if (altaAlta && (tAmb === '' || (subenf != null && subenf < 5)))
      items.push({ e: 'CONDENSACIÓN ALTA (CONDENSADOR/VENTILADOR)', c: '#d97706', t: 'Alta presión elevada: condensador sucio, ventilador de condensador parado/lento, poca ventilación, o incondensables/aire. Limpia condensador y verifica el ventilador y su condensador de arranque.' });
    if (bajaBaja && recal != null && recal < 6)
      items.push({ e: 'POCO CAUDAL EN EVAPORADOR', c: '#d97706', t: 'Baja presión baja con recalentamiento bajo: evaporador con hielo, filtro de aire sucio o ventilador de evaporador parado/lento (revisa su condensador).' });
    if (altaBaja && bajaBaja)
      items.push({ e: 'COMPRESOR CON POCA COMPRESIÓN', c: '#d97706', t: 'Alta baja y baja también baja: posible compresor gastado (válvulas internas) o fuga interna. Comprueba corriente y relación de compresión.' });
    if (dtFiltro != null && dtFiltro >= 3)
      items.push({ e: 'FILTRO DESHIDRATADOR OBSTRUIDO', c: '#d97706', t: `Salto de ${dtFiltro.toFixed(0)} °C entre la entrada y la salida del filtro deshidratador (frío/escarcha a la salida): filtro parcialmente obstruido que estrangula el paso de líquido. Sustitúyelo y haz vacío. En un filtro sano el salto es casi nulo (<2 °C).` });
    if (dpSolen != null && dpSolen >= 1)
      items.push({ e: 'VÁLVULA SOLENOIDE NO ABRE BIEN', c: '#d97706', t: `Caída de ${dpSolen.toFixed(1)} bar entre entrada y salida de la válvula solenoide de líquido: no abre del todo (bobina sin tensión o débil, membrana pegada u obstrucción). Con la solenoide sana la presión de entrada y salida son casi iguales. Comprueba la bobina (tensión y continuidad) y el cuerpo de la válvula.` });
    if (!items.length && mB != null && mA != null)
      items.push({ e: 'PARÁMETROS EN RANGO', c: '#16a34a', t: 'Presiones y recalentamiento/subenfriamiento dentro de lo orientativo. Confirma con la ficha del fabricante.' });
    return items;
  }, [pBaja, pAlta, recal, subenf, dtFiltro, dpSolen, rec, tAmb]);

  const colorPresion = (txt, min, max) => {
    if (txt === '' || !rec.hay) return '#64748b';
    const v = parseFloat(String(txt).replace(',', '.'));
    if (!Number.isFinite(v)) return '#64748b';
    return v < min - margenBar(min) ? '#dc2626' : v > max + margenBar(max) ? '#d97706' : '#16a34a';
  };
  const cB = colorPresion(pBaja, rec.bajaMin, rec.bajaMax);
  const cA = colorPresion(pAlta, rec.altaMin, rec.altaMax);

  // ── TAB 2: conversión ──
  const [convGas, setConvGas] = useState('R-404A');
  const [convDest, setConvDest] = useState('');
  const [pesoAct, setPesoAct] = useState('');
  const [compresor, setCompresor] = useState('');
  const [compInfo, setCompInfo] = useState('');
  const [buscComp, setBuscComp] = useState(false);
  // Sustituciones posibles desde el gas actual, con su ficha (tipo, aceite, carga, estado legal).
  const sustitutos = useMemo(() => sustitucionesDe(convGas), [convGas]);
  const fichaConv = convDest ? buscarSustitucion(convGas, convDest) : null;
  const pesoNum = parseFloat(String(pesoAct).replace(',', '.'));
  const buscarCompresor = async () => {
    if (!compresor.trim()) return;
    setBuscComp(true); setCompInfo('');
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Compresor de refrigeración "${compresor}". Indica de forma breve: gases compatibles, tipo de aceite recomendado y carga de aceite aproximada (litros). Si cambia de ${convGas} a ${convDest || 'un sustituto'}, di si hay que cambiar el aceite. Responde en español, 3-4 líneas.`,
        add_context_from_internet: true,
        response_json_schema: { type: 'object', properties: { info: { type: 'string' } } },
      });
      setCompInfo(r?.info || 'Sin datos fiables. Consulta la placa/ficha del compresor.');
    } catch { setCompInfo('No se pudo buscar (¿sin conexión?).'); }
    setBuscComp(false);
  };

  // ── TAB 3: avería por síntomas ──
  const SINTOMAS = ['No enfría', 'Enfría poco', 'Se forma hielo en el evaporador', 'Salta el térmico/magnetotérmico', 'El compresor no arranca', 'El compresor arranca y para (corto ciclo)', 'Ventilador no gira', 'Ruido anómalo', 'Alta presión muy alta', 'Baja presión muy baja', 'Fuga de aceite/gas'];
  const [sintomas, setSintomas] = useState(new Set());
  const [avResp, setAvResp] = useState('');
  const [avLoad, setAvLoad] = useState(false);
  const toggleS = (s) => setSintomas(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const diagnosticarAveria = async () => {
    if (sintomas.size === 0) return;
    setAvLoad(true); setAvResp('');
    try {
      const r = await base44.integrations.Core.InvokeLLM({
        prompt: `Actúa como técnico frigorista experto. Equipo con refrigerante ${gas}. Síntomas: ${[...sintomas].join(', ')}. Enumera las CAUSAS MÁS PROBABLES ordenadas (incluye: fallo de ventiladores y sus condensadores de arranque, condensador sucio, válvula de expansión, compresor/condensador de arranque del compresor, relé/klixon, falta o exceso de refrigerante, filtro obstruido, presostatos) y las COMPROBACIONES concretas para confirmar cada una. Responde en español, claro y en pasos.`,
        add_context_from_internet: true,
        response_json_schema: { type: 'object', properties: { diagnostico: { type: 'string' } } },
      });
      setAvResp(r?.diagnostico || 'No se pudo generar el diagnóstico.');
    } catch { setAvResp('No se pudo consultar (¿sin conexión?).'); }
    setAvLoad(false);
  };

  // ── Imagen del diagnóstico (para adjuntar al informe / diario de reparación) ──
  const [imgBusy, setImgBusy] = useState(false);
  const [imgUrl, setImgUrl] = useState('');

  // Captura el esquema + tabla de medidas como PNG (dataUrl + File), sin subirlo.
  const captureDiagImage = async () => {
    const node = document.getElementById('diag-image-area');
    if (!node) return null;
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    const dataUrl = canvas.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    const nombre = tab === 'clima' ? `diagnostico-split-${clGas}` : `diagnostico-${gas}`;
    return { dataUrl, file: new File([blob], `${nombre}.png`, { type: 'image/png' }) };
  };

  const generarImagen = async () => {
    setImgBusy(true);
    setImgUrl('');
    try {
      const cap = await captureDiagImage();
      if (!cap) return;
      // Descargar
      const a = document.createElement('a');
      a.href = cap.dataUrl;
      a.download = cap.file.name;
      a.click();
      // Subir para poder adjuntarla (informe / diario)
      try {
        const file_url = await uploadFile(cap.file);
        setImgUrl(file_url);
      } catch { /* si no hay conexión, al menos queda la descarga */ }
    } catch {
      alert('No se pudo generar la imagen. Inténtalo de nuevo.');
    }
    setImgBusy(false);
  };

  // ── Guardar el diagnóstico en la ficha del cliente (y, si viene de una
  // orden SAT, vincularlo a "antes" o "después" de la reparación) ──
  const [savingDiag, setSavingDiag] = useState(false);
  const [savedStage, setSavedStage] = useState(null); // 'antes' | 'despues' tras guardar con éxito

  /** Resumen del diagnóstico de un split, para la ficha del cliente. */
  const resumenClima = () => {
    const d = diagClima;
    const partes = [`Split ${clGas} · modo ${clModo} · expansión ${clExpansion}`];
    if (d.recalentamiento != null) partes.push(`Recalent. ${d.recalentamiento} K`);
    if (d.dtAireInterior != null) partes.push(`Salto aire interior ${d.dtAireInterior} K`);
    if (d.dtAireExterior != null) partes.push(`Salto aire exterior ${d.dtAireExterior} K`);
    if (clPBaja !== '') partes.push(`P.baja ${clPBaja} bar`);
    partes.push(d.hayAlta ? `P.alta ${clPAlta} bar` : 'sin toma de alta');
    if (d.tDescarga != null) partes.push(`Descarga ${d.tDescarga} °C`);
    const graves = d.avisos.filter(a => a.nivel === 'mal' || a.nivel === 'aviso');
    if (graves.length) partes.push(`Hallazgos: ${graves.map(a => a.titulo).join(', ')}`);
    return partes.join(' · ');
  };

  const resumenDiagnostico = () => {
    if (tab === 'clima') return resumenClima();
    const partes = [`Gas ${gas} · ${APPS.find(a => a.k === app)?.l || app}`];
    if (recal != null) partes.push(`Recalent. ${recal.toFixed(1)} °C`);
    if (subenf != null) partes.push(`Subenf. ${subenf.toFixed(1)} °C`);
    if (pBaja !== '') partes.push(`P.baja ${pBaja} bar`);
    if (pAlta !== '') partes.push(`P.alta ${pAlta} bar`);
    if (diag1.length) partes.push(`Posibles averías: ${diag1.map(d => d.e).join(', ')}`);
    return partes.join(' · ');
  };

  const valoresFabricanteTexto = () => {
    if (!fabValores) return '';
    return [
      fabValores.recalentamiento && `Recalent. fabricante: ${fabValores.recalentamiento}`,
      fabValores.subenfriamiento && `Subenf. fabricante: ${fabValores.subenfriamiento}`,
      fabValores.presion_baja && `P.baja fabricante: ${fabValores.presion_baja}`,
      fabValores.presion_alta && `P.alta fabricante: ${fabValores.presion_alta}`,
      fabValores.aceite && `Aceite: ${fabValores.aceite}`,
      fabValores.notas,
    ].filter(Boolean).join(' · ');
  };

  const datosDiagnosticoJSON = () => (tab === 'clima' ? JSON.stringify({
    tipo: 'split_clima',
    gas: clGas, modo: clModo, expansion: clExpansion,
    presiones: { baja: clPBaja, alta: clPAlta || null },
    temperaturas: {
      evaporacion: diagClima.tEvap, aspiracion: clTAsp, descarga: clTDesc,
      linea_liquido: clTLiq || null, condensacion: diagClima.tCond,
    },
    aire: {
      interior: { aspiracion: clAireIntEntra, impulsion: clAireIntSale, salto: diagClima.dtAireInterior },
      exterior: { entrada: clAireExtEntra, salida: clAireExtSale, salto: diagClima.dtAireExterior },
    },
    calculados: {
      recalentamiento: diagClima.recalentamiento,
      subenfriamiento: diagClima.subenfriamiento,
      relacion_compresion: diagClima.relacionCompresion,
      condensacion_estimada: diagClima.condensacionEstimada,
      hay_toma_alta: diagClima.hayAlta,
    },
    hallazgos: diagClima.avisos
      .filter(a => a.nivel !== 'info')
      .map(a => ({ nivel: a.nivel, titulo: a.titulo, detalle: a.texto })),
  }) : JSON.stringify({
    gas, aplicacion: app, variante,
    presiones: { baja: pBaja, alta: pAlta },
    temperaturas: { tEvap, tAsp, tCond, tLiq, tAmb, tFiltroIn, tFiltroOut, tValvOut, tRecibIn, tRecibOut, pRecib, tSolen, pSolIn, pSolOut, tBulbo, pIgual, tIgual },
    calculados: {
      recalentamiento: recal != null ? recal.toFixed(1) : null,
      subenfriamiento: subenf != null ? subenf.toFixed(1) : null,
      saltoFiltro: dtFiltro != null ? dtFiltro.toFixed(1) : null,
      caidaSolenoide: dpSolen != null ? dpSolen.toFixed(1) : null,
    },
    compresor: { marca: compMarca, modelo: compModelo, refrigerantes: [...compRefrigs], consumoMedido: compAmp, rla: compRLA?.rla ?? null, lra: compRLA?.lra ?? null },
    valvulaExpansion: { marca: valvMarca, modelo: valvModelo },
    evaporador: { marca: evapMarca, modelo: evapModelo },
    valoresFabricante: fabValores,
    posiblesAverias: diag1.map(d => ({ evento: d.e, detalle: d.t })),
  }));

  const guardarEnFicha = async () => {
    if (!ctxContactId) return;
    setSavingDiag(true);
    setSavedStage(null);
    try {
      const cap = await captureDiagImage();
      if (!cap) throw new Error('No se pudo generar la imagen del diagnóstico.');
      const file_url = await uploadFile(cap.file);

      // Primera vez que se guarda para esta orden → "antes"; si ya existe un
      // diagnóstico "antes", el siguiente guardado va a "después".
      const stage = ctxSatOrderId && ctxOrder?.diagnostic_before?.image_url ? 'despues' : 'antes';

      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const dt = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const summary = resumenDiagnostico();
      const manufacturerValuesText = valoresFabricanteTexto();
      const dataJson = datosDiagnosticoJSON();
      const title = `Diagnóstico frigorífico — ${stage === 'antes' ? 'antes' : 'después'} de la reparación — ${format(now, 'dd/MM/yyyy')}`;

      const doc = await base44.entities.ClientDocument.create({
        contact_id: ctxContactId,
        contact_name: ctxContact?.name || '',
        title,
        doc_type: 'diagnostico_frigorifico',
        file_url,
        description: JSON.stringify({ stage, summary, manufacturer_values: manufacturerValuesText, sat_order_id: ctxSatOrderId || null, data: JSON.parse(dataJson) }),
        date: format(now, 'yyyy-MM-dd'),
      });

      if (ctxSatOrderId) {
        const field = stage === 'antes' ? 'diagnostic_before' : 'diagnostic_after';
        const fieldData = { document_id: doc.id, image_url: file_url, date: dt, gas, summary, manufacturer_values: manufacturerValuesText, data_json: dataJson };
        await base44.entities.SATOrder.update(ctxSatOrderId, { [field]: fieldData });
        setCtxOrder(prev => ({ ...(prev || {}), [field]: fieldData }));
      }

      setSavedStage(stage);
    } catch (err) {
      alert('No se pudo guardar el diagnóstico en la ficha del cliente. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setSavingDiag(false);
    }
  };

  /*
   * Imprimir el diagnóstico TAL Y COMO ESTÁ EN PANTALLA.
   *
   * ─── Los tres fallos que arregla, para que no vuelvan ──────────────────────
   *
   * 1) SALÍA OTRO REFRIGERANTE. Antes se copiaba el innerHTML tal cual, y un
   *    <select> no guarda en el HTML lo que has elegido: lo guarda en una
   *    propiedad del elemento. Al copiar el HTML se perdía la elección y el
   *    navegador pintaba la PRIMERA opción de la lista. Por eso ponías R-32 y
   *    salía impreso R-410A. Lo mismo pasaba con las medidas escritas a mano:
   *    salían en blanco.
   *    Ahora cada campo se sustituye por su valor actual, en texto.
   *
   * 2) IMPRIMÍA LOS FALLOS. Se corta en la barra de botones (Imprimir,
   *    Exportar PDF, Limpiar medidas), que es hasta donde interesa. Lo que va
   *    después —las causas probables y demás— se queda fuera.
   *
   * 3) LA LEYENDA SALÍA EN GRIS. Los navegadores quitan los colores de fondo
   *    al imprimir salvo que se les diga que no. Con print-color-adjust:exact
   *    los colores de la leyenda salen como en pantalla.
   */
  /*
   * Imprimir el diagnóstico TAL Y COMO ESTÁ EN PANTALLA.
   *
   * De esto se encarga imprimirPantalla(), que se lleva los estilos del
   * programa al papel —recuadros y colores incluidos—, sustituye cada campo
   * por lo que hayas escrito o elegido, y corta en la barra de botones para
   * que los fallos no salgan impresos.
   */
  const printAll = () => {
    const panel = document.getElementById('diag-print');
    if (!panel) return;
    imprimirPantalla(panel, { titulo: `Diagnóstico frigorífico — ${gas}` });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Diagnóstico frigorífico" />
      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
        {/* Cinco pestañas no caben en una fila en el móvil: en pantalla
            estrecha van en rejilla de tres y se parten en dos filas. */}
        <div className="grid grid-cols-3 sm:grid-cols-5 rounded-xl overflow-hidden border border-slate-200 bg-white shadow text-[12px] sm:text-sm">
          {[['presiones', '📟 Presiones'], ['clima', '❄️ Clima (split)'], ['codigos', '🔢 Códigos'], ['conversion', '🔄 Conversión'], ['averia', '🛠️ Avería']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`py-2.5 px-1 font-medium border-b border-slate-100 ${tab === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{l}</button>
          ))}
        </div>

        {/* Elegir cliente. Va arriba y siempre visible: es lo primero que se
            hace cuando el diagnóstico es para la ficha de alguien. */}
        <div className="bg-white rounded-xl shadow p-3 space-y-2" data-prueba="cliente-diagnostico">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Cliente al que va este diagnóstico
              <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            {ctxContactId && (
              <Link to={createPageUrl(`ContactDetail?id=${ctxContactId}`)}
                className="text-[11px] text-indigo-700 font-semibold hover:underline whitespace-nowrap">
                Ver ficha
              </Link>
            )}
          </div>
          <BuscadorCliente
            contacts={contactos}
            value={ctxContactId || ''}
            onValueChange={(v) => setContactoElegido(v || '')}
            placeholder={cargandoContactos ? 'Cargando clientes…' : 'Escribe el nombre del cliente…'}
          />
          <p className="text-[11px] text-slate-500">
            {ctxContactId
              ? 'Al guardar, el diagnóstico y su imagen quedan en la ficha de este cliente.'
              : 'Sin cliente el diagnóstico se puede imprimir igual, pero no se guarda en ninguna ficha.'}
          </p>
        </div>

        {ctxContactId && (
          <div className="flex items-start gap-2 text-[11px] bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md p-2">
            <BookOpen className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">
              {ctxSatOrderId ? 'Vinculado a ' : 'Se guardará en la ficha de '}<b>{ctxContact?.name || 'cliente…'}</b>
              {ctxSatOrderId && <> · Orden SAT <b>{ctxOrder?.order_number ? `#${ctxOrder.order_number}` : '…'}</b></>}
              {ctxSatOrderId && (ctxOrder?.diagnostic_before?.image_url
                ? <> · ya hay un diagnóstico guardado como <b>antes de la reparación</b>; el próximo guardado se archivará como <b>después</b>.</>
                : <> · el primer diagnóstico que guardes aquí se archivará como <b>antes de la reparación</b>.</>)}
            </span>
            {ctxSatOrderId && (
              <Link to={createPageUrl(`SAT?view=${ctxSatOrderId}`)} className="flex items-center gap-1 text-indigo-700 font-semibold hover:underline whitespace-nowrap">
                <ArrowLeft className="w-3.5 h-3.5" />Volver a la orden
              </Link>
            )}
          </div>
        )}

        {/* refrigerante + aplicación (común a presiones) */}
        {tab === 'presiones' && (
          <div id="diag-print" className="space-y-3">
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs text-slate-500 mb-1 block">Refrigerante</label>
                  <select value={gas} onChange={(e) => setGas(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    {ALL_GASES.map(g => <option key={g} value={g}>{g}{estadoRefrigerante(g).prohibido ? ' ⛔' : ''}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-slate-500 mb-1 block">Aplicación</label>
                  <select value={app} onChange={(e) => setApp(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    {APPS.map(a => <option key={a.k} value={a.k}>{a.l}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-slate-500 mb-1 block">Tipo de esquema</label>
                  <select value={variante} onChange={(e) => setVariante(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    <option value="estandar">Estándar (válvula termostática)</option>
                    <option value="retencion">Con válvulas de retención</option>
                    <option value="compensacion">Válvula de expansión con compensación externa</option>
                  </select>
                </div>
              </div>
              {estadoRefrigerante(gas).prohibido && (
                <div className="flex items-start gap-2 text-[11px] bg-red-50 border border-red-200 text-red-700 rounded-md p-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><b>{gas} está PROHIBIDO.</b> No se permite ni gas virgen ni reciclado o regenerado. Requiere sustituir el equipo o convertir a un refrigerante permitido (pestaña Conversión).</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500" data-prueba="presiones-referencia">{rec.hay
                ? <>Presiones de referencia a {rec.amb} °C de ambiente — Baja: <b>{fmtBar(rec.bajaMin)} a {fmtBar(rec.bajaMax)} bar</b> · Alta: <b>{fmtBar(rec.altaMin)} a {fmtBar(rec.altaMax)} bar</b> (manómetro, calculadas con la tabla del gas)</>
                : 'Este gas no tiene tabla de propiedades en el programa: no hay presiones de referencia para comparar.'}</p>

              {/* LADO BAJA (aspiración) — recalentamiento */}
              <div className="rounded-lg border-2 border-sky-200 bg-sky-50/40 p-3 space-y-2">
                <p className="text-xs font-bold text-sky-700 flex items-center gap-1">🔵 LADO BAJA — aspiración</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Presión baja (bar)<br/><span className="text-[9px] text-slate-400">manómetro azul</span></label>{N(pBaja, setPBaja, 'Ej: 8')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. según manómetro (°C)<br/><span className="text-[9px] text-slate-400">T. saturación en la escala del manómetro</span></label>{N(tEvap, setTEvap, 'Ej: 5')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. tubo aspiración (°C)<br/><span className="text-[9px] text-slate-400">15 cm antes del compresor</span></label>{N(tAsp, setTAsp, 'Ej: 12')}</div>
                </div>
                <div className="bg-white rounded-md p-2 text-center border border-sky-200">
                  <span className="text-[11px] text-slate-500">Recalentamiento (T. aspiración − T. según manómetro) = </span>
                  <span className="font-bold text-sky-700">{recal != null ? recal.toFixed(1) + ' °C' : '—'}</span>
                  <span className="text-[9px] text-slate-400"> · objetivo ~5-8 °C</span>
                </div>
              </div>

              {/* LADO ALTA (descarga/líquido) — subenfriamiento */}
              <div className="rounded-lg border-2 border-red-200 bg-red-50/40 p-3 space-y-2">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1">🔴 LADO ALTA — descarga / líquido</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Presión alta (bar)<br/><span className="text-[9px] text-slate-400">manómetro rojo</span></label>{N(pAlta, setPAlta, 'Ej: 30')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. según manómetro (°C)<br/><span className="text-[9px] text-slate-400">T. saturación en la escala del manómetro</span></label>{N(tCond, setTCond, 'Ej: 45')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. línea de líquido (°C)<br/><span className="text-[9px] text-slate-400">salida del condensador</span></label>{N(tLiq, setTLiq, 'Ej: 40')}</div>
                </div>
                <div className="bg-white rounded-md p-2 text-center border border-red-200">
                  <span className="text-[11px] text-slate-500">Subenfriamiento (T. según manómetro − T. línea líquido) = </span>
                  <span className="font-bold text-red-700">{subenf != null ? subenf.toFixed(1) + ' °C' : '—'}</span>
                  <span className="text-[9px] text-slate-400"> · objetivo ~4-10 °C</span>
                </div>
              </div>

              {/* LÍNEA DE LÍQUIDO — filtro deshidratador y válvula de expansión */}
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50/40 p-3 space-y-2">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1">🟠 LÍNEA DE LÍQUIDO — filtro deshidratador y válvula</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. entrada filtro (°C)<br/><span className="text-[9px] text-slate-400">antes del filtro deshidratador</span></label>{N(tFiltroIn, setTFiltroIn, 'Ej: 40')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. salida filtro (°C)<br/><span className="text-[9px] text-slate-400">después del filtro</span></label>{N(tFiltroOut, setTFiltroOut, 'Ej: 39')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. salida válvula (°C)<br/><span className="text-[9px] text-slate-400">entrada del evaporador</span></label>{N(tValvOut, setTValvOut, 'Ej: 2')}</div>
                </div>
                <div className="bg-white rounded-md p-2 text-center border border-amber-200">
                  <span className="text-[11px] text-slate-500">Salto en el filtro (entrada − salida) = </span>
                  <span className={`font-bold ${dtFiltro != null && dtFiltro >= 3 ? 'text-red-600' : 'text-amber-700'}`}>{dtFiltro != null ? dtFiltro.toFixed(1) + ' °C' : '—'}</span>
                  <span className="text-[9px] text-slate-400"> · sano &lt;2 °C; si baja mucho, filtro obstruido</span>
                </div>
              </div>

              {/* VÁLVULA DE EXPANSIÓN / BULBO (y compensación externa) */}
              <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50/50 p-3 space-y-2">
                <p className="text-xs font-bold text-yellow-800 flex items-center gap-1">🔧 VÁLVULA DE EXPANSIÓN — bulbo{variante === 'compensacion' ? ' y compensación externa' : ''}</p>
                <p className="text-[10px] text-slate-500">El <b>bulbo</b> se coloca en el tubo de <b>aspiración a la salida del evaporador</b>, bien fijado y aislado (a las 4 en punto en tubos &gt; 7/8″). En el esquema se muestra dónde va conectado.</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. en el bulbo (°C)<br/><span className="text-[9px] text-slate-400">salida del evaporador</span></label>{N(tBulbo, setTBulbo, 'Ej: 12')}</div>
                  {variante === 'compensacion' && (
                    <>
                      <div><label className="text-[11px] text-slate-500 mb-1 block">Presión igualación (bar)<br/><span className="text-[9px] text-slate-400">toma de compensación externa</span></label>{N(pIgual, setPIgual, 'Ej: 8')}</div>
                      <div><label className="text-[11px] text-slate-500 mb-1 block">T. igualación (°C)<br/><span className="text-[9px] text-slate-400">en la toma de compensación</span></label>{N(tIgual, setTIgual, 'Ej: 6')}</div>
                    </>
                  )}
                </div>
                {variante === 'compensacion' && (
                  <p className="text-[10px] text-slate-500">La <b>línea de igualación externa</b> se conecta al tubo de aspiración <b>justo después del bulbo</b> (aguas abajo), para compensar la caída de presión del evaporador.</p>
                )}
              </div>

              {/* RECIBIDOR DE LÍQUIDO */}
              <div className="rounded-lg border-2 border-orange-200 bg-orange-50/40 p-3 space-y-2">
                <p className="text-xs font-bold text-orange-700 flex items-center gap-1">🛢️ RECIBIDOR DE LÍQUIDO</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. entrada recibidor (°C)<br/><span className="text-[9px] text-slate-400">del condensador al recibidor</span></label>{N(tRecibIn, setTRecibIn, 'Ej: 42')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. salida recibidor (°C)<br/><span className="text-[9px] text-slate-400">hacia el filtro/válvula</span></label>{N(tRecibOut, setTRecibOut, 'Ej: 41')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Presión recibidor (bar)<br/><span className="text-[9px] text-slate-400">opcional, si tiene toma</span></label>{N(pRecib, setPRecib, 'Ej: 30')}</div>
                </div>
              </div>

              {/* VÁLVULA SOLENOIDE de línea de líquido (cámaras) */}
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50/40 p-3 space-y-2">
                <p className="text-xs font-bold text-purple-700 flex items-center gap-1">🧲 VÁLVULA SOLENOIDE (línea de líquido)</p>
                <p className="text-[10px] text-slate-500">Habitual en cámaras: corta el paso de líquido según el termostato (pump-down). Con la bobina con tensión debe abrir y la presión de entrada y salida ser casi iguales.</p>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">T. en la solenoide (°C)<br/><span className="text-[9px] text-slate-400">control de averías</span></label>{N(tSolen, setTSolen, 'Ej: 40')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Presión entrada (bar)<br/><span className="text-[9px] text-slate-400">antes de la solenoide</span></label>{N(pSolIn, setPSolIn, 'Ej: 30')}</div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Presión salida (bar)<br/><span className="text-[9px] text-slate-400">después de la solenoide</span></label>{N(pSolOut, setPSolOut, 'Ej: 30')}</div>
                </div>
                <div className="bg-white rounded-md p-2 text-center border border-purple-200">
                  <span className="text-[11px] text-slate-500">Caída en la solenoide (entrada − salida) = </span>
                  <span className={`font-bold ${dpSolen != null && dpSolen >= 1 ? 'text-red-600' : 'text-purple-700'}`}>{dpSolen != null ? dpSolen.toFixed(1) + ' bar' : '—'}</span>
                  <span className="text-[9px] text-slate-400"> · sana ≈ 0; si cae mucho, no abre bien</span>
                </div>
              </div>

              {/* COMPRESOR — modelo, amperaje nominal y consumo medido */}
              <div className="rounded-lg border-2 border-slate-300 bg-slate-50 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> COMPRESOR — marca, modelo, refrigerantes y consumo</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Marca</label>
                    <input type="text" value={compMarca} onChange={(e) => setCompMarca(e.target.value)} placeholder="Ej: Danfoss, Copeland, Bitzer..." className="w-full border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Modelo</label>
                    <input type="text" value={compModelo} onChange={(e) => setCompModelo(e.target.value)} placeholder="Ej: NTZ068, ZB21..." className="w-full border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Refrigerantes admitidos <span className="text-[9px] text-slate-400">(multirefrigerante: marca los que admita; ⛔ = prohibido)</span></label>
                  <div className="flex flex-wrap gap-1">
                    {ALL_GASES.map(g => {
                      const on = compRefrigs.has(g); const proh = estadoRefrigerante(g).prohibido;
                      return (
                        <button key={g} type="button" onClick={() => toggleRefrig(g)}
                          className={`text-[10px] px-2 py-1 rounded-full border ${on ? 'bg-slate-700 text-white border-slate-700' : proh ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                          {g}{proh ? ' ⛔' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={buscarAmperaje} disabled={compBusy || !compModelo.trim()} className="gap-2 h-9">
                    {compBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}Buscar amperaje
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Consumo medido (A)<br/><span className="text-[9px] text-slate-400">pinza amperimétrica en la fase</span></label>{N(compAmp, setCompAmp, 'Ej: 6.5')}</div>
                  {compRLA && (
                    <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-md p-2">
                      <div>Nominal: <b>RLA {compRLA.rla != null ? compRLA.rla + ' A' : '—'}</b>{compRLA.lra != null ? ` · LRA ${compRLA.lra} A` : ''}</div>
                      {compRLA.info && <div className="text-[10px] text-slate-400 mt-0.5">{compRLA.info}</div>}
                    </div>
                  )}
                </div>
                {ampVerdict && (
                  <div className="rounded-md p-2 text-[11px] text-white font-medium" style={{ background: ampVerdict.c }}>
                    <b>{ampVerdict.t}.</b> {ampVerdict.m}
                  </div>
                )}
              </div>

              {/* VÁLVULA DE EXPANSIÓN + EVAPORADOR — búsqueda de valores del fabricante */}
              <div className="rounded-lg border-2 border-teal-300 bg-teal-50/50 p-3 space-y-2">
                <p className="text-xs font-bold text-teal-800 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> VÁLVULA DE EXPANSIÓN Y EVAPORADOR — buscar valores del fabricante</p>
                <p className="text-[10px] text-slate-500">Busca en las fichas técnicas del compresor (y de la válvula/evaporador si los indicas) el recalentamiento, subenfriamiento, presiones de trabajo y aceite <b>recomendados por el fabricante</b> para este sistema. Si no indicas marca ni modelo, se usan <b>valores de referencia orientativos</b> para que el diagnóstico funcione igualmente.</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Válvula de expansión — marca</label>
                    <input type="text" value={valvMarca} onChange={(e) => setValvMarca(e.target.value)} placeholder="Ej: Danfoss, Sporlan, Emerson..." className="w-full border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Válvula de expansión — modelo</label>
                    <input type="text" value={valvModelo} onChange={(e) => setValvModelo(e.target.value)} placeholder="Ej: TGE, TEX2..." className="w-full border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Evaporador — marca</label>
                    <input type="text" value={evapMarca} onChange={(e) => setEvapMarca(e.target.value)} placeholder="Ej: Güntner, LU-VE..." className="w-full border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                  <div><label className="text-[11px] text-slate-500 mb-1 block">Evaporador — modelo</label>
                    <input type="text" value={evapModelo} onChange={(e) => setEvapModelo(e.target.value)} placeholder="Ej: GHN..." className="w-full border border-input rounded-md px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={buscarValoresFabricante} disabled={fabBusy} className="gap-2 h-9 bg-teal-700 hover:bg-teal-800">
                    {fabBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}Buscar valores del fabricante
                  </Button>
                </div>
                {fabValores && (
                  <div className="bg-white border border-teal-200 rounded-md p-2 text-[11px] text-slate-700 space-y-1">
                    {fabValores.recalentamiento && <div>🔵 Recalentamiento recomendado: <b>{fabValores.recalentamiento}</b></div>}
                    {fabValores.subenfriamiento && <div>🔴 Subenfriamiento recomendado: <b>{fabValores.subenfriamiento}</b></div>}
                    {fabValores.presion_baja && <div>Presión baja recomendada: <b>{fabValores.presion_baja}</b></div>}
                    {fabValores.presion_alta && <div>Presión alta recomendada: <b>{fabValores.presion_alta}</b></div>}
                    {fabValores.aceite && <div className="flex items-center gap-1"><Droplets className="w-3 h-3 text-amber-600" />Aceite: <b>{fabValores.aceite}</b></div>}
                    {fabValores.notas && <div className="text-slate-500 border-t pt-1 mt-1">{fabValores.notas}</div>}
                  </div>
                )}
              </div>

              <div><label className="text-[11px] text-slate-500 mb-1 block">T. ambiente exterior (°C)</label><div className="max-w-[160px]">{N(tAmb, setTAmb, 'Ej: 32')}</div></div>
            </div>

            <div id="diag-image-area" className="bg-white rounded-xl shadow p-4" style={{ background: '#ffffff' }}>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Snowflake className="w-4 h-4 text-sky-600" />Esquema del circuito con todas las medidas</p>
              <div className="text-[11px] text-slate-500 mb-2">Refrigerante <b>{gas}</b> · {APPS.find(a => a.k === app)?.l} · Esquema: <b>{variante === 'estandar' ? 'estándar' : variante === 'retencion' ? 'con válvulas de retención' : 'válvula de expansión con compensación'}</b></div>
              <EsquemaFrig alta={pAlta || rec.alta} baja={pBaja || rec.baja} colorAlta={cA} colorBaja={cB} variante={variante}
                lecturas={{
                  tEvap, tAsp, tCond, tLiq, tAmb, pBaja, pAlta, tFiltroIn, tFiltroOut, tValvOut,
                  tRecibIn, tRecibOut, pRecib, compAmp, tBulbo, pIgual, tIgual,
                  tSolen, pSolIn, pSolOut, dpSolen: dpSolen != null ? dpSolen.toFixed(1) : '',
                  compRLA: compRLA?.rla ?? '',
                  recal: recal != null ? recal.toFixed(1) : '',
                  subenf: subenf != null ? subenf.toFixed(1) : '',
                  dtFiltro: dtFiltro != null ? dtFiltro.toFixed(1) : '',
                  dtValv: dtValv != null ? dtValv.toFixed(1) : '',
                }} />
              {/* Tabla de datos para que la imagen incluya TODAS las medidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-2 text-[11px]">
                {[
                  ['Presión baja', pBaja !== '' ? pBaja + ' bar' : '—'],
                  ['Presión alta', pAlta !== '' ? pAlta + ' bar' : '—'],
                  ['T. s/manómetro baja', tEvap !== '' ? tEvap + ' °C' : '—'],
                  ['T. s/manómetro alta', tCond !== '' ? tCond + ' °C' : '—'],
                  ['T. aspiración', tAsp !== '' ? tAsp + ' °C' : '—'],
                  ['T. línea líquido', tLiq !== '' ? tLiq + ' °C' : '—'],
                  ['Recalentamiento', recal != null ? recal.toFixed(1) + ' °C' : '—'],
                  ['Subenfriamiento', subenf != null ? subenf.toFixed(1) + ' °C' : '—'],
                  ['T. entrada filtro', tFiltroIn !== '' ? tFiltroIn + ' °C' : '—'],
                  ['T. salida filtro', tFiltroOut !== '' ? tFiltroOut + ' °C' : '—'],
                  ['Salto filtro', dtFiltro != null ? dtFiltro.toFixed(1) + ' °C' : '—'],
                  ['T. salida válvula', tValvOut !== '' ? tValvOut + ' °C' : '—'],
                  ['T. entrada recibidor', tRecibIn !== '' ? tRecibIn + ' °C' : '—'],
                  ['T. salida recibidor', tRecibOut !== '' ? tRecibOut + ' °C' : '—'],
                  ['Presión recibidor', pRecib !== '' ? pRecib + ' bar' : '—'],
                  ['T. solenoide', tSolen !== '' ? tSolen + ' °C' : '—'],
                  ['P. ent. solenoide', pSolIn !== '' ? pSolIn + ' bar' : '—'],
                  ['P. sal. solenoide', pSolOut !== '' ? pSolOut + ' bar' : '—'],
                  ['Caída solenoide', dpSolen != null ? dpSolen.toFixed(1) + ' bar' : '—'],
                  ['T. bulbo', tBulbo !== '' ? tBulbo + ' °C' : '—'],
                  ...(variante === 'compensacion' ? [
                    ['P. igualación ext.', pIgual !== '' ? pIgual + ' bar' : '—'],
                    ['T. igualación ext.', tIgual !== '' ? tIgual + ' °C' : '—'],
                  ] : []),
                  ['Compresor', [compMarca, compModelo].filter(Boolean).join(' ') || '—'],
                  ['Refrigerantes', compRefrigs.size ? [...compRefrigs].join(', ') : '—'],
                  ['Consumo medido', compAmp !== '' ? compAmp + ' A' : '—'],
                  ['Amperaje nominal (RLA)', compRLA?.rla != null ? compRLA.rla + ' A' : '—'],
                  ['Válvula de expansión', [valvMarca, valvModelo].filter(Boolean).join(' ') || '—'],
                  ['Evaporador', [evapMarca, evapModelo].filter(Boolean).join(' ') || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded p-1.5 border border-slate-100">
                    <div className="text-slate-400 text-[9px]">{k}</div>
                    <div className="font-bold text-slate-700">{v}</div>
                  </div>
                ))}
              </div>
              {fabValores && (
                <div className="mt-2 text-[11px] text-teal-700 border-t pt-2">
                  <b>Valores del fabricante:</b> {valoresFabricanteTexto()}
                </div>
              )}
              {diag1.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-600 border-t pt-2">
                  <b>Diagnóstico:</b> {diag1.map(d => d.e).join(' · ')}
                </div>
              )}

              {/* El circuito dibujado con las medidas puestas en su sitio */}
              <div className="mt-3 border-t pt-3">
                <p className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Snowflake className="w-4 h-4 text-sky-600" />Circuito frigorífico con tus medidas</p>
                <EsquemaCircuito
                  gas={gas} pBaja={pBaja} pAlta={pAlta}
                  tEvap={tEvap} tAsp={tAsp} tCond={tCond} tLiq={tLiq}
                  tFiltroIn={tFiltroIn} tFiltroOut={tFiltroOut} tValvOut={tValvOut}
                  tBulbo={tBulbo} tAmb={tAmb} variante={variante}
                />
              </div>

              {/* Panel de instrumentos: presiones, SH, SC y tendencia */}
              <PanelCiclo pBaja={pBaja} pAlta={pAlta} recal={recal} subenf={subenf} dtFiltro={dtFiltro} rec={rec} />

              {/* Simulador con mandos: mueve las presiones y ve el diagnóstico en vivo */}
              <SimuladorCiclo
                rec={rec}
                inicial={{ pBaja: parseFloat(pBaja), pAlta: parseFloat(pAlta), recal: recal ?? undefined, subenf: subenf ?? undefined }}
                onAplicar={(x) => {
                  setPBaja(String(x.pBaja)); setPAlta(String(x.pAlta));
                  if (tEvap !== '') setTAsp(String(+(parseFloat(tEvap) + x.recal).toFixed(1)));
                  if (tCond !== '') setTLiq(String(+(parseFloat(tCond) - x.subenf).toFixed(1)));
                }}
              />

              {/* Diagrama de Mollier (p–h) con el ciclo dibujado según los datos */}
              <div className="mt-3 border-t pt-3">
                <p className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><Gauge className="w-4 h-4 text-indigo-600" />Ciclo en el diagrama de Mollier</p>
                <MollierDiagram gas={gas} baja={pBaja || rec.baja} alta={pAlta || rec.alta}
                  recal={recal != null ? recal.toFixed(1) : ''} subenf={subenf != null ? subenf.toFixed(1) : ''} />
                {(() => {
                  const okRecal = recal != null && recal >= 4 && recal <= 9;
                  const okSubenf = subenf != null && subenf >= 3 && subenf <= 11;
                  const mejoras = [];
                  if (recal != null && recal > 9) mejoras.push('bajar el recalentamiento (falta carga o válvula poco abierta)');
                  if (recal != null && recal < 4) mejoras.push('subir el recalentamiento (riesgo de retorno de líquido; válvula muy abierta o sobrecarga)');
                  if (subenf != null && subenf < 3) mejoras.push('aumentar el subenfriamiento (falta de carga o condensador insuficiente)');
                  if (subenf != null && subenf > 11) mejoras.push('reducir el subenfriamiento (exceso de carga o recibidor lleno)');
                  const dentro = okRecal && okSubenf && mejoras.length === 0;
                  if (recal == null && subenf == null) return <p className="text-[11px] text-slate-400 mt-1">Introduce las temperaturas para valorar el ciclo.</p>;
                  return (
                    <div className={`mt-1 rounded-md p-2 text-[11px] ${dentro ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                      {dentro
                        ? '✅ Ciclo dentro del margen de funcionamiento (recalentamiento ~5-8 °C y subenfriamiento ~4-10 °C).'
                        : <><b>⚠ Se puede mejorar el sistema:</b> {mejoras.join('; ')}.</>}
                    </div>
                  );
                })()}
              </div>

              {/* Situación de las posibles averías (rojo / amarillo / verde).
                  No se imprime: en el papel interesa el cálculo que has hecho,
                  no el mapa de fallos posibles. Va antes de los botones, así
                  que cortar por los botones no bastaba: se marca aparte. */}
              <div className="mt-3 border-t pt-3" data-no-imprimir>
                <DiagnosticFailuresDiagram items={diag1} />
              </div>
            </div>

            {/* Generar imagen para adjuntar al informe / diario de reparación */}
            <div className="bg-white rounded-xl shadow p-3 flex flex-wrap items-center gap-2">
              <Button onClick={generarImagen} disabled={imgBusy} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {imgBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Generar imagen del diagnóstico
              </Button>
              <span className="text-[11px] text-slate-500">Crea una imagen con el esquema y todas las medidas para adjuntarla al <b>informe</b> o al <b>diario de reparación</b>.</span>
              {imgUrl && (
                <div className="w-full mt-1 flex items-center gap-2 text-[11px]">
                  <a href={imgUrl} target="_blank" rel="noopener" className="text-blue-600 underline break-all">Abrir imagen subida</a>
                  <button onClick={() => { navigator.clipboard?.writeText(imgUrl); }} className="text-slate-500 border rounded px-2 py-0.5 hover:bg-slate-50">Copiar enlace</button>
                </div>
              )}
            </div>

            {/* Guardar en la ficha del cliente (y, si viene de una orden SAT, en antes/después) */}
            {ctxContactId && (
              <div className="bg-white rounded-xl shadow p-3 flex flex-wrap items-center gap-2">
                <Button onClick={guardarEnFicha} disabled={savingDiag} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {savingDiag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar en ficha del cliente
                </Button>
                <span className="text-[11px] text-slate-500">
                  Guarda la tabla y la imagen de este diagnóstico en la ficha de <b>{ctxContact?.name || 'el cliente'}</b>
                  {ctxSatOrderId && <>, vinculado a la orden SAT como <b>{ctxOrder?.diagnostic_before?.image_url ? 'después' : 'antes'}</b> de la reparación</>}.
                </span>
                {savedStage && (
                  <div className="w-full mt-1 flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Diagnóstico guardado correctamente{ctxSatOrderId ? <> como <b>{savedStage === 'antes' ? 'antes' : 'después'} de la reparación</b> en la orden SAT</> : ''} y en la ficha del cliente.
                  </div>
                )}
              </div>
            )}

            {diag1.map((d, i) => (
              <div key={i} className="rounded-xl shadow overflow-hidden">
                <div style={{ background: d.c }} className="px-4 py-2 text-white font-bold flex items-center gap-2"><Gauge className="w-5 h-5" />{d.e}</div>
                <div className="bg-white p-3 text-sm text-slate-700">{d.t}</div>
              </div>
            ))}

            <div className="flex gap-2" data-fin-impresion>
              <Button onClick={printAll} className="gap-2"><Printer className="w-4 h-4" />Imprimir</Button>
              <Button onClick={printAll} variant="outline" className="gap-2"><FileDown className="w-4 h-4" />Exportar PDF</Button>
            </div>
          </div>
        )}

        {/* TAB 2: conversión */}
        {tab === 'clima' && (
          <div id="diag-print" className="space-y-3">
            <div className="flex items-start gap-2 text-[11px] bg-sky-50 border border-sky-200 text-sky-800 rounded-md p-2.5">
              <Snowflake className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Diagnóstico pensado para <b>splits</b>, donde casi nunca hay toma de alta.
                Aquí manda lo que sí se puede medir siempre: la <b>presión de baja</b>, la
                <b> temperatura del tubo de aspiración</b> y, sobre todo, el <b>salto de
                temperatura del aire</b> en la evaporadora y en la condensadora. Con eso se
                separa la falta de gas de una restricción, de un problema de caudal de aire
                o de un compresor que no bombea.
              </span>
            </div>

            {/* ── Máquina ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Refrigerante</label>
                  <select value={clGas} onChange={(e) => setClGas(e.target.value)}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    {GASES_CLIMA.map(g => <option key={g} value={g}>{g}{estadoRefrigerante(g).prohibido ? ' ⛔' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Está trabajando en</label>
                  <select value={clModo} onChange={(e) => setClModo(e.target.value)}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    <option value="frio">Frío</option>
                    <option value="calor">Calor (bomba de calor)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Expansión</label>
                  <select value={clExpansion} onChange={(e) => setClExpansion(e.target.value)}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    <option value="capilar">Capilar / tubo fijo</option>
                    <option value="valvula">Válvula o EEV</option>
                  </select>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">
                La expansión cambia el recalentamiento que se espera: un capilar trabaja más
                alto que una válvula. Confundirlos hace cargar de más una máquina que está sana.
              </p>
            </div>

            {/* ── Lo que se mide en el circuito ─────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-600" />En el circuito
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Presión de baja (bar)</label>
                  {N(clPBaja, setClPBaja, 'p. ej. 9,8')}
                  {tempSaturacion(clGas, clPBaja) != null && (
                    <p className="text-[10px] text-sky-700 mt-1">
                      ≈ {tempSaturacion(clGas, clPBaja)} °C de evaporación en la tabla
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">T. evaporación del manómetro (°C)</label>
                  {N(clTEvap, setClTEvap, 'la de la escala')}
                  <p className="text-[10px] text-slate-400 mt-1">Si la pones, manda esta.</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">T. tubo de aspiración (°C)</label>
                  {N(clTAsp, setClTAsp, 'tubo gordo')}
                  <p className="text-[10px] text-slate-400 mt-1">En la exterior, junto a la toma.</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">T. tubo de descarga (°C)</label>
                  {N(clTDesc, setClTDesc, 'salida compresor')}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold text-slate-600 mb-2">
                  Solo si la máquina trae toma de alta (muchos splits no la tienen)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Presión de alta (bar)</label>
                    {N(clPAlta, setClPAlta, 'opcional')}
                    {tempSaturacion(clGas, clPAlta) != null && (
                      <p className="text-[10px] text-red-700 mt-1">
                        ≈ {tempSaturacion(clGas, clPAlta)} °C de condensación
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">T. línea de líquido (°C)</label>
                    {N(clTLiq, setClTLiq, 'opcional')}
                    <p className="text-[10px] text-slate-400 mt-1">Para el subenfriamiento.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Aire en las dos unidades ──────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-sky-600" />En el aire
              </p>
              <p className="text-[11px] text-slate-500">
                Es medio diagnóstico: mide con la sonda en la rejilla, a unos centímetros,
                y con la máquina llevando ya diez minutos en marcha.
              </p>

              <div>
                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Evaporadora (unidad interior)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Aire aspiración (°C)</label>
                    {N(clAireIntEntra, setClAireIntEntra, 'retorno')}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Aire impulsión (°C)</label>
                    {N(clAireIntSale, setClAireIntSale, 'salida')}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <ValorSalto valor={diagClima.dtAireInterior}
                      rango={RANGOS_CLIMA.dtAireInterior[clModo]} etiqueta="Salto del aire" />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Condensadora (unidad exterior)</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Aire entrada (°C)</label>
                    {N(clAireExtEntra, setClAireExtEntra, 'batería')}
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Aire salida (°C)</label>
                    {N(clAireExtSale, setClAireExtSale, 'ventilador')}
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <ValorSalto valor={diagClima.dtAireExterior}
                      rango={RANGOS_CLIMA.dtAireExterior[clModo]} etiqueta="Salto del aire" />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Lo que sale ──────────────────────────────────────────── */}
            {/* Este bloque es el que se convierte en imagen para la ficha del
                cliente y para el diario de reparación. */}
            <div id="diag-image-area" className="space-y-3 bg-white rounded-xl p-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <ValorSalto valor={diagClima.recalentamiento} etiqueta="Recalentamiento"
                rango={RANGOS_CLIMA.recalentamiento[clExpansion]} />
              <ValorSalto valor={diagClima.subenfriamiento} etiqueta="Subenfriamiento"
                rango={RANGOS_CLIMA.subenfriamiento}
                vacio={diagClima.hayAlta ? '—' : 'sin alta'} />
              <ValorSalto valor={diagClima.tEvap} etiqueta="T. evaporación" unidad="°C" />
              <ValorSalto
                valor={diagClima.hayAlta ? diagClima.tCond : diagClima.condensacionEstimada}
                etiqueta={diagClima.hayAlta ? 'T. condensación' : 'T. cond. estimada'}
                unidad="°C" estimado={!diagClima.hayAlta} />
            </div>

            <EsquemaSplit {...datosClima} />

            {/* ── Qué mirar ────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow p-4 space-y-2">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-sky-600" />Qué mirar
              </p>
              {diagClima.avisos.map((a, i) => <Aviso key={i} {...a} />)}
            </div>
            </div>

            {/* Guardar en la ficha del cliente, igual que el resto */}
            {ctxContactId && (
              <div className="bg-white rounded-xl shadow p-3 flex flex-wrap items-center gap-2">
                <Button onClick={guardarEnFicha} disabled={savingDiag} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {savingDiag ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar en ficha del cliente
                </Button>
                <span className="text-[11px] text-slate-500">
                  Guarda las medidas y el esquema en la ficha de <b>{ctxContact?.name || 'el cliente'}</b>
                  {ctxSatOrderId && <>, vinculado a la orden SAT como <b>{ctxOrder?.diagnostic_before?.image_url ? 'después' : 'antes'}</b> de la reparación</>}.
                </span>
                {savedStage && (
                  <div className="w-full mt-1 flex items-center gap-2 text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-md p-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Diagnóstico guardado correctamente{ctxSatOrderId ? <> como <b>{savedStage === 'antes' ? 'antes' : 'después'} de la reparación</b> en la orden SAT</> : ''} y en la ficha del cliente.
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 flex-wrap" data-fin-impresion>
              <Button onClick={printAll} className="gap-2"><Printer className="w-4 h-4" />Imprimir</Button>
              <Button onClick={printAll} variant="outline" className="gap-2"><FileDown className="w-4 h-4" />Exportar PDF</Button>
              <Button onClick={limpiarClima} variant="outline" className="gap-2 text-red-600">Limpiar medidas</Button>
            </div>

            {/* Los códigos, aquí mismo: en un split es lo primero que se mira */}
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />Códigos de avería del display
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Si la máquina está marcando un código, empieza por aquí: te dice la familia de
                avería y por dónde tirar antes de sacar los manómetros.
              </p>
            </div>
            <CodigosAveriaSplit />
          </div>
        )}

        {tab === 'codigos' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />Códigos de avería de splits
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Los más habituales, para descifrar rápido lo que marca el display sin
                buscar el manual en la furgoneta.
              </p>
            </div>
            <CodigosAveriaSplit />
          </div>
        )}

        {tab === 'conversion' && (
          <div id="diag-print" className="space-y-3">
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500 mb-1 block">Gas actual <span className="text-[9px] text-slate-400">(⛔ = prohibido)</span></label>
                  <select value={convGas} onChange={(e) => { setConvGas(e.target.value); setConvDest(''); }} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    {ALL_GASES.map(g => <option key={g} value={g}>{g}{estadoRefrigerante(g).prohibido ? ' ⛔' : ''}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-slate-500 mb-1 block">Gas nuevo</label>
                  <select value={convDest} onChange={(e) => setConvDest(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    <option value="">— Elegir —</option>
                    {sustitutos.map(x => <option key={x.a} value={x.a}>{x.a} — {TIPOS[x.tipo]?.etiqueta}{x.prohibido ? ' (PROHIBIDO)' : ''}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-slate-500 mb-1 block">Peso de gas actual (kg)</label>{N(pesoAct, setPesoAct, 'Ej: 3.5')}</div>
                <div><label className="text-xs text-slate-500 mb-1 block">Modelo de compresor</label>
                  <div className="flex gap-2">
                    <Input value={compresor} onChange={(e) => setCompresor(e.target.value)} placeholder="Ej: Copeland ZB..." />
                    <Button onClick={buscarCompresor} disabled={buscComp || !compresor.trim()} size="sm">{buscComp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}</Button>
                  </div>
                </div>
              </div>
              {compInfo && <div className="bg-gray-50 border rounded-lg p-2 text-xs whitespace-pre-wrap">{compInfo}</div>}
              {estadoRefrigerante(convGas).prohibido && (
                <div className="flex items-start gap-2 text-[12px] bg-red-50 border border-red-200 text-red-700 rounded-md p-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span><b>{convGas} está PROHIBIDO.</b> {getRefrigerantInfo(convGas)?.fgas_status || ''}. No se permite ni gas virgen ni reciclado: hay que convertir a un refrigerante permitido o sustituir el equipo.</span>
                </div>
              )}
            </div>

            {/* Tabla completa de refrigerantes (incluidos prohibidos) */}
            <details className="bg-white rounded-xl shadow p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">📋 Ver tabla completa de refrigerantes (incluidos prohibidos)</summary>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="text-left text-slate-500 border-b">
                      <th className="p-1">Gas</th><th className="p-1">Tipo</th><th className="p-1">Estado</th>
                      <th className="p-1">Reciclado</th><th className="p-1">GWP</th><th className="p-1">Sustituto</th><th className="p-1">Aceite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REFRIGERANT_DATABASE.map(r => {
                      const e = estadoRefrigerante(r.code);
                      return (
                        <tr key={r.code} className={`border-b ${e.prohibido ? 'bg-red-50' : ''}`}>
                          <td className="p-1 font-bold">{r.code}{e.prohibido ? ' ⛔' : ''}</td>
                          <td className="p-1">{r.type}</td>
                          <td className="p-1">{e.prohibido ? <span className="text-red-600 font-semibold">Prohibido</span> : <span className="text-green-700">Permitido</span>}</td>
                          <td className="p-1">{e.reciclado === 'no' ? 'No' : '—'}</td>
                          <td className="p-1">{r.gwp}</td>
                          <td className="p-1">{r.replacement || '—'}</td>
                          <td className="p-1">{r.compressor_oil || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">⛔ Prohibido: ni gas virgen ni reciclado o regenerado.</p>
            </details>

            {!fichaConv && sustitutos.length > 0 && (
              <GasesParecidos key={convGas} de={convGas} onElegir={(id) => { setConvGas(id); setConvDest(''); }} />
            )}

            {fichaConv && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl shadow p-3"><EsquemaFrig titulo={`ACTUAL · ${convGas}`} alta={refPres(convGas).alta} baja={refPres(convGas).baja} colorAlta="#2563eb" colorBaja="#16a34a" /></div>
                  <div className="bg-white rounded-xl shadow p-3"><EsquemaFrig titulo={`NUEVO · ${convDest}`} alta={refPres(convDest).alta} baja={refPres(convDest).baja} colorAlta="#7c3aed" colorBaja="#0891b2" /></div>
                </div>
                <div className="bg-card text-card-foreground rounded-xl shadow p-4 space-y-3" data-prueba="conv-ficha">
                  <p className="font-bold text-foreground">{convGas} → {convDest} <span className="text-xs font-normal text-muted-foreground">· {TIPOS[fichaConv.tipo]?.etiqueta}</span></p>
                  <DatosFicha ficha={fichaConv} />
                  <AvisoInflamable ficha={fichaConv} />
                  {pesoNum > 0
                    ? <CargaConvertida de={convGas} a={convDest} kg={pesoNum} />
                    : <p className="text-xs text-muted-foreground">Escribe el peso de gas actual para calcular cuánto cargar.</p>}
                  {fichaConv.tieneFisica && (
                    <div>
                      <div className="tech-label mb-1">Presiones y capacidad con el mismo compresor</div>
                      <ComparacionFisica de={convGas} a={convDest} />
                    </div>
                  )}
                  <PasosConversion />
                </div>
                <div className="flex gap-2" data-fin-impresion>
                  <Button onClick={printAll} className="gap-2"><Printer className="w-4 h-4" />Imprimir</Button>
                  <Button onClick={printAll} variant="outline" className="gap-2"><FileDown className="w-4 h-4" />Exportar PDF</Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: avería por síntomas */}
        {tab === 'averia' && (
          <div id="diag-print" className="space-y-3">
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-700">Marca los síntomas (refrigerante: {gas})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {SINTOMAS.map(s => (
                  <label key={s} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1 cursor-pointer">
                    <input type="checkbox" checked={sintomas.has(s)} onChange={() => toggleS(s)} /> {s}
                  </label>
                ))}
              </div>
              <Button onClick={diagnosticarAveria} disabled={avLoad || sintomas.size === 0} className="gap-2">
                {avLoad ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}Diagnosticar avería
              </Button>
              {avResp && <div className="bg-gray-50 border rounded-lg p-3 text-sm whitespace-pre-wrap">{avResp}</div>}
            </div>
            {avResp && (
              <div className="flex gap-2" data-fin-impresion>
                <Button onClick={printAll} className="gap-2"><Printer className="w-4 h-4" />Imprimir</Button>
                <Button onClick={printAll} variant="outline" className="gap-2"><FileDown className="w-4 h-4" />Exportar PDF</Button>
              </div>
            )}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
          <ArrowRightLeft className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Herramienta de <b>ayuda al diagnóstico</b>. Presiones y valores son <b>orientativos</b> (dependen de temperaturas reales); confirma siempre con la ficha del fabricante, el recalentamiento/subenfriamiento y las mediciones eléctricas. Para P-T exactas usa la <b>Regla de Refrigerantes (Danfoss)</b>.</span>
        </div>
      </div>
    </div>
  );
}
/**
 * ValorSalto — un número medido, con su color según el rango.
 *
 * En obra se mira el color antes que la cifra: verde sigo, ámbar me fijo,
 * rojo ahí está el problema. Sin dato queda en gris, que no es lo mismo que
 * estar mal.
 */
function ValorSalto({ valor, etiqueta, rango, unidad = 'K', vacio = '—', estimado = false }) {
  const nivel = rango ? nivelRango(valor, rango) : null;
  const fondo = nivel === 'ok' ? 'bg-green-50 border-green-300 text-green-700'
    : nivel === 'aviso' ? 'bg-amber-50 border-amber-300 text-amber-700'
      : nivel === 'mal' ? 'bg-red-50 border-red-300 text-red-700'
        : 'bg-slate-50 border-slate-200 text-slate-500';
  return (
    <div className={`rounded-lg border px-2 py-1.5 text-center ${fondo} ${estimado ? 'border-dashed' : ''}`}>
      <p className="text-[10px] opacity-80 leading-tight">{etiqueta}</p>
      <p className="text-base font-bold leading-tight">
        {valor != null ? `${valor} ${unidad}` : vacio}
      </p>
      {rango && (
        <p className="text-[9px] opacity-70 leading-tight">{rango.min}–{rango.max} {unidad}</p>
      )}
      {estimado && valor != null && <p className="text-[9px] opacity-70 leading-tight">estimada</p>}
    </div>
  );
}

/** Un aviso del diagnóstico, con su color y qué hay que ir a comprobar. */
function Aviso({ nivel, titulo, texto }) {
  const estilo = nivel === 'mal' ? 'bg-red-50 border-red-200 text-red-800'
    : nivel === 'aviso' ? 'bg-amber-50 border-amber-200 text-amber-800'
      : nivel === 'ok' ? 'bg-green-50 border-green-200 text-green-800'
        : 'bg-slate-50 border-slate-200 text-slate-600';
  const icono = nivel === 'mal' ? '⛔' : nivel === 'aviso' ? '⚠️' : nivel === 'ok' ? '✅' : 'ℹ️';
  return (
    <div className={`rounded-lg border p-2.5 text-[12px] ${estilo}`}>
      <p className="font-semibold flex items-start gap-1.5">
        <span aria-hidden="true">{icono}</span>{titulo}
      </p>
      <p className="mt-0.5 leading-snug opacity-95">{texto}</p>
    </div>
  );
}
