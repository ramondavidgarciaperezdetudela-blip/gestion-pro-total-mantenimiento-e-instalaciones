import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/NavBar';
import { base44 } from '@/api/base44Client';
import { Printer, FileDown, Gauge, Snowflake, ArrowRightLeft, Wrench, Loader2, Droplets, Zap, AlertTriangle } from 'lucide-react';
import { REFRIGERANT_DATABASE, estadoRefrigerante, getRefrigerantInfo } from '@/components/refrigerantData';

// Presiones ORIENTATIVAS manométricas (bar) por refrigerante y aplicación.
const PRES = {
  'R-410A': { clima: { baja: 8.5, alta: 30 }, refrigeracion: { baja: 5.0, alta: 30 }, congelacion: { baja: 2.5, alta: 30 } },
  'R-32':   { clima: { baja: 8.5, alta: 30 }, refrigeracion: { baja: 5.0, alta: 30 }, congelacion: { baja: 2.5, alta: 30 } },
  'R-454B': { clima: { baja: 8.0, alta: 29 }, refrigeracion: { baja: 4.8, alta: 29 }, congelacion: { baja: 2.4, alta: 29 } },
  'R-134a': { clima: { baja: 3.0, alta: 12 }, refrigeracion: { baja: 1.2, alta: 12 }, congelacion: { baja: 0.3, alta: 12 } },
  'R-404A': { clima: { baja: 6.0, alta: 20 }, refrigeracion: { baja: 2.6, alta: 19 }, congelacion: { baja: 0.6, alta: 18 } },
  'R-507A': { clima: { baja: 6.2, alta: 21 }, refrigeracion: { baja: 2.7, alta: 20 }, congelacion: { baja: 0.7, alta: 19 } },
  'R-448A': { clima: { baja: 5.5, alta: 20 }, refrigeracion: { baja: 2.3, alta: 19 }, congelacion: { baja: 0.5, alta: 18 } },
  'R-449A': { clima: { baja: 5.5, alta: 20 }, refrigeracion: { baja: 2.3, alta: 19 }, congelacion: { baja: 0.5, alta: 18 } },
  'R-407C': { clima: { baja: 5.0, alta: 20 }, refrigeracion: { baja: 2.2, alta: 19 }, congelacion: { baja: 0.5, alta: 18 } },
  'R-22':   { clima: { baja: 5.0, alta: 18 }, refrigeracion: { baja: 2.0, alta: 17 }, congelacion: { baja: 0.3, alta: 16 } },
  'R-290':  { clima: { baja: 4.5, alta: 15 }, refrigeracion: { baja: 2.0, alta: 15 }, congelacion: { baja: 0.6, alta: 14 } },
  // Gases prohibidos (para instalaciones antiguas): presiones orientativas
  'R-12':   { clima: { baja: 2.0, alta: 10 }, refrigeracion: { baja: 0.8, alta: 9 },  congelacion: { baja: 0.2, alta: 8 } },
  'R-502':  { clima: { baja: 5.5, alta: 19 }, refrigeracion: { baja: 2.6, alta: 18 }, congelacion: { baja: 0.7, alta: 17 } },
};
// Lista completa de gases (base de datos), para selectores y tabla — incluye prohibidos.
const ALL_GASES = REFRIGERANT_DATABASE.map(r => r.code);
const APPS = [
  { k: 'clima', l: 'Climatización (A/C)' },
  { k: 'refrigeracion', l: 'Refrigeración (positivo)' },
  { k: 'congelacion', l: 'Congelación (negativo)' },
];

// Conversión orientativa: gas origen -> sustitutos (factor de carga y aceite).
const CONV = {
  'R-22':   [{ g: 'R-407C', f: 0.95, aceite: 'POE (cambiar)', vaciar: true }, { g: 'R-422D', f: 0.90, aceite: 'Mineral (mantener)', vaciar: false }, { g: 'R-438A', f: 0.90, aceite: 'Mineral (mantener)', vaciar: false }],
  'R-404A': [{ g: 'R-448A', f: 0.95, aceite: 'POE (mantener)', vaciar: false }, { g: 'R-449A', f: 0.95, aceite: 'POE (mantener)', vaciar: false }, { g: 'R-452A', f: 0.93, aceite: 'POE (mantener)', vaciar: false }],
  'R-410A': [{ g: 'R-32', f: 0.70, aceite: 'POE (cambiar)', vaciar: true }, { g: 'R-454B', f: 0.75, aceite: 'POE A2L (cambiar)', vaciar: true }],
  'R-134a': [{ g: 'R-513A', f: 0.97, aceite: 'POE (mantener)', vaciar: false }, { g: 'R-450A', f: 0.97, aceite: 'POE (mantener)', vaciar: false }],
  'R-407C': [{ g: 'R-448A', f: 0.97, aceite: 'POE (mantener)', vaciar: false }, { g: 'R-449A', f: 0.97, aceite: 'POE (mantener)', vaciar: false }],
  'R-507A': [{ g: 'R-448A', f: 0.95, aceite: 'POE (mantener)', vaciar: false }, { g: 'R-449A', f: 0.95, aceite: 'POE (mantener)', vaciar: false }],
};

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

export default function DiagnosticoCarga() {
  const [tab, setTab] = useState('presiones');

  // ── comunes ──
  const [gas, setGas] = useState('R-410A');
  const [app, setApp] = useState('clima');
  const rec = PRES[gas]?.[app] || { baja: 0, alta: 0 };

  // ── TAB 1: presiones + temperaturas ──
  const [pBaja, setPBaja] = useState('');
  const [pAlta, setPAlta] = useState('');
  const [tEvap, setTEvap] = useState('');   // T saturación baja (manómetro baja)
  const [tAsp, setTAsp] = useState('');     // T tubo de aspiración
  const [tCond, setTCond] = useState('');   // T saturación alta (manómetro alta)
  const [tLiq, setTLiq] = useState('');     // T línea de líquido
  const [tAmb, setTAmb] = useState('');     // T ambiente
  const [tFiltroIn, setTFiltroIn] = useState('');   // T entrada filtro deshidratador
  const [tFiltroOut, setTFiltroOut] = useState(''); // T salida filtro deshidratador
  const [tValvOut, setTValvOut] = useState('');     // T salida válvula (entrada evaporador)
  const [tRecibIn, setTRecibIn] = useState('');     // T entrada recibidor de líquido
  const [tRecibOut, setTRecibOut] = useState('');   // T salida recibidor de líquido
  const [pRecib, setPRecib] = useState('');         // Presión en el recibidor de líquido (bar, opcional)
  // Compresor: marca, modelo, refrigerantes, consumo medido y amperaje nominal
  const [compMarca, setCompMarca] = useState('');
  const [compModelo, setCompModelo] = useState('');
  const [compRefrigs, setCompRefrigs] = useState(new Set());  // refrigerantes admitidos (multi)
  const [compAmp, setCompAmp] = useState('');
  const [compRLA, setCompRLA] = useState(null);     // { rla, lra, info }
  const [compBusy, setCompBusy] = useState(false);
  const toggleRefrig = (c) => setCompRefrigs(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

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
    const bajaBaja = mB != null && mB < rec.baja * 0.9;
    const altaAlta = mA != null && mA > rec.alta * 1.1;
    const altaBaja = mA != null && mA < rec.alta * 0.9;
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
    if (!items.length && mB != null && mA != null)
      items.push({ e: 'PARÁMETROS EN RANGO', c: '#16a34a', t: 'Presiones y recalentamiento/subenfriamiento dentro de lo orientativo. Confirma con la ficha del fabricante.' });
    return items;
  }, [pBaja, pAlta, recal, subenf, dtFiltro, rec.baja, rec.alta, tAmb]);

  const cB = pBaja === '' ? '#64748b' : (parseFloat(pBaja) < rec.baja * 0.9 ? '#dc2626' : parseFloat(pBaja) > rec.baja * 1.1 ? '#d97706' : '#16a34a');
  const cA = pAlta === '' ? '#64748b' : (parseFloat(pAlta) < rec.alta * 0.9 ? '#dc2626' : parseFloat(pAlta) > rec.alta * 1.1 ? '#d97706' : '#16a34a');

  // ── TAB 2: conversión ──
  const [convGas, setConvGas] = useState('R-404A');
  const [convDest, setConvDest] = useState('');
  const [pesoAct, setPesoAct] = useState('');
  const [compresor, setCompresor] = useState('');
  const [compInfo, setCompInfo] = useState('');
  const [buscComp, setBuscComp] = useState(false);
  // Sustitutos: de la tabla CONV (con factor/aceite) o, si no hay, de la base de datos.
  const convList = CONV[convGas] || (getRefrigerantInfo(convGas)?.replacement || '')
    .split(',').map(s => s.trim()).filter(Boolean)
    .map(name => {
      const g = REFRIGERANT_DATABASE.find(r => r.name.includes(name) || r.code === name)?.code || name;
      const info = getRefrigerantInfo(g);
      return { g, f: 1.0, aceite: info?.compressor_oil || 'Ver ficha', vaciar: /cambio|poe|cambiar/i.test(info?.retrofit_type || '') };
    });
  const destInfo = convList.find(x => x.g === convDest);
  const pesoNuevo = (pesoAct && destInfo) ? (parseFloat(pesoAct) * destInfo.f).toFixed(2) : null;
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
  const generarImagen = async () => {
    const node = document.getElementById('diag-image-area');
    if (!node) return;
    setImgBusy(true);
    setImgUrl('');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      // Descargar
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `diagnostico-frigorifico-${gas}.png`;
      a.click();
      // Subir para poder adjuntarla (informe / diario)
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `diagnostico-${gas}.png`, { type: 'image/png' });
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        if (file_url) setImgUrl(file_url);
      } catch { /* si no hay conexión, al menos queda la descarga */ }
    } catch {
      alert('No se pudo generar la imagen. Inténtalo de nuevo.');
    }
    setImgBusy(false);
  };

  const printAll = () => {
    const cont = document.getElementById('diag-print')?.innerHTML || '';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Diagnóstico frigorífico</title>
    <style>*{box-sizing:border-box;font-family:Arial,sans-serif}body{padding:14px;color:#111;font-size:12px}@media print{@page{size:A4;margin:12mm}}</style>
    </head><body>${cont}<script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Diagnóstico frigorífico" />
      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow text-sm">
          {[['presiones', '📟 Presiones/Temp.'], ['conversion', '🔄 Conversión'], ['averia', '🛠️ Avería']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 font-medium ${tab === k ? 'bg-blue-600 text-white' : 'text-slate-600'}`}>{l}</button>
          ))}
        </div>

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
                  <span><b>{gas} está PROHIBIDO.</b> {estadoRefrigerante(gas).reciclado === 'solo'
                    ? 'Solo se permite gas reciclado/regenerado para mantener equipos existentes; el gas virgen está prohibido. Valora convertir a un sustituto (pestaña Conversión).'
                    : 'No se permite ni reciclado. Requiere sustituir el equipo o convertir a un refrigerante permitido (pestaña Conversión).'}</span>
                </div>
              )}
              <p className="text-[11px] text-slate-500">Recomendado orientativo — Baja: <b>{rec.baja} bar</b> · Alta: <b>{rec.alta} bar</b>{PRES[gas] ? '' : ' (sin tabla orientativa para este gas)'}</p>

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

              <div><label className="text-[11px] text-slate-500 mb-1 block">T. ambiente exterior (°C)</label><div className="max-w-[160px]">{N(tAmb, setTAmb, 'Ej: 32')}</div></div>
            </div>

            <div id="diag-image-area" className="bg-white rounded-xl shadow p-4" style={{ background: '#ffffff' }}>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Snowflake className="w-4 h-4 text-sky-600" />Esquema del circuito con todas las medidas</p>
              <div className="text-[11px] text-slate-500 mb-2">Refrigerante <b>{gas}</b> · {APPS.find(a => a.k === app)?.l} · Esquema: <b>{variante === 'estandar' ? 'estándar' : variante === 'retencion' ? 'con válvulas de retención' : 'válvula de expansión con compensación'}</b></div>
              <EsquemaFrig alta={pAlta || rec.alta} baja={pBaja || rec.baja} colorAlta={cA} colorBaja={cB} variante={variante}
                lecturas={{
                  tEvap, tAsp, tCond, tLiq, tAmb, pBaja, pAlta, tFiltroIn, tFiltroOut, tValvOut,
                  tRecibIn, tRecibOut, pRecib, compAmp, tBulbo, pIgual, tIgual,
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
                  ['T. bulbo', tBulbo !== '' ? tBulbo + ' °C' : '—'],
                  ...(variante === 'compensacion' ? [
                    ['P. igualación ext.', pIgual !== '' ? pIgual + ' bar' : '—'],
                    ['T. igualación ext.', tIgual !== '' ? tIgual + ' °C' : '—'],
                  ] : []),
                  ['Compresor', [compMarca, compModelo].filter(Boolean).join(' ') || '—'],
                  ['Refrigerantes', compRefrigs.size ? [...compRefrigs].join(', ') : '—'],
                  ['Consumo medido', compAmp !== '' ? compAmp + ' A' : '—'],
                  ['Amperaje nominal (RLA)', compRLA?.rla != null ? compRLA.rla + ' A' : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded p-1.5 border border-slate-100">
                    <div className="text-slate-400 text-[9px]">{k}</div>
                    <div className="font-bold text-slate-700">{v}</div>
                  </div>
                ))}
              </div>
              {diag1.length > 0 && (
                <div className="mt-2 text-[11px] text-slate-600 border-t pt-2">
                  <b>Diagnóstico:</b> {diag1.map(d => d.e).join(' · ')}
                </div>
              )}
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

            {diag1.map((d, i) => (
              <div key={i} className="rounded-xl shadow overflow-hidden">
                <div style={{ background: d.c }} className="px-4 py-2 text-white font-bold flex items-center gap-2"><Gauge className="w-5 h-5" />{d.e}</div>
                <div className="bg-white p-3 text-sm text-slate-700">{d.t}</div>
              </div>
            ))}

            <div className="flex gap-2">
              <Button onClick={printAll} className="gap-2"><Printer className="w-4 h-4" />Imprimir</Button>
              <Button onClick={printAll} variant="outline" className="gap-2"><FileDown className="w-4 h-4" />Exportar PDF</Button>
            </div>
          </div>
        )}

        {/* TAB 2: conversión */}
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
                    {convList.map(x => <option key={x.g} value={x.g}>{x.g}</option>)}
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
                  <span><b>{convGas} está PROHIBIDO.</b> {getRefrigerantInfo(convGas)?.fgas_status || ''}. {estadoRefrigerante(convGas).reciclado === 'solo'
                    ? 'Solo se permite gas RECICLADO/REGENERADO para mantener equipos existentes (el gas virgen está prohibido). Se recomienda convertir a un sustituto.'
                    : 'NO se permite ni reciclado: hay que convertir a un refrigerante permitido o sustituir el equipo.'}</span>
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
                          <td className="p-1">{e.reciclado === 'solo' ? 'Solo reciclado' : e.reciclado === 'no' ? 'No' : '—'}</td>
                          <td className="p-1">{r.gwp}</td>
                          <td className="p-1">{r.replacement || '—'}</td>
                          <td className="p-1">{r.compressor_oil || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">⛔ Prohibido. «Solo reciclado» = únicamente gas recuperado/regenerado para equipos existentes (gas virgen prohibido).</p>
            </details>

            {destInfo && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white rounded-xl shadow p-3"><EsquemaFrig titulo={`ACTUAL · ${convGas}`} alta={PRES[convGas]?.refrigeracion?.alta ?? '—'} baja={PRES[convGas]?.refrigeracion?.baja ?? '—'} colorAlta="#2563eb" colorBaja="#16a34a" /></div>
                  <div className="bg-white rounded-xl shadow p-3"><EsquemaFrig titulo={`NUEVO · ${convDest}`} alta={PRES[convDest]?.refrigeracion?.alta ?? '—'} baja={PRES[convDest]?.refrigeracion?.baja ?? '—'} colorAlta="#7c3aed" colorBaja="#0891b2" /></div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-sm space-y-2">
                  <p><b>{convGas} → {convDest}</b></p>
                  <p>Peso de gas nuevo estimado: <b className="text-green-700">{pesoNuevo ? pesoNuevo + ' kg' : '—'}</b> (factor ×{destInfo.f})</p>
                  <p className="flex items-center gap-1"><Droplets className="w-4 h-4 text-amber-600" />Aceite: <b>{destInfo.aceite}</b> {destInfo.vaciar ? '· ⚠ Vaciar y cambiar' : '· ✓ Mantener'}</p>
                  <p className="text-[11px] text-slate-500">Recuerda: cambiar filtro deshidratador, hacer vacío y ajustar recalentamiento. Verifica compatibilidad del compresor arriba.</p>
                </div>
                <div className="flex gap-2">
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
              <div className="flex gap-2">
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
