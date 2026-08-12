import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/NavBar';
import { base44 } from '@/api/base44Client';
import { Printer, FileDown, Gauge, Snowflake, ArrowRightLeft, Wrench, Loader2, Droplets } from 'lucide-react';

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
};
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

function EsquemaFrig({ alta, baja, colorAlta, colorBaja, titulo, lecturas }) {
  // lecturas (opcional): { tCond, tLiq, subenf, tEvap, tAsp, recal, tAmb }
  const L = lecturas || {};
  const HOT = '#ef4444';   // lado de alta presión (gas caliente / líquido)
  const COLD = '#0ea5e9';  // lado de baja presión (gas frío / aspiración)
  const val = (x, u = '') => (x !== undefined && x !== null && x !== '' && !Number.isNaN(x) ? `${x}${u}` : '—');
  // Punto de medición numerado
  const Punto = ({ x, y, n, color }) => (
    <g>
      <circle cx={x} cy={y} r="9" fill={color} stroke="#fff" strokeWidth="1.5" />
      <text x={x} y={y + 3} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">{n}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 560 360" width="100%" style={{ maxWidth: 560, background: '#f8fafc', borderRadius: 8 }}>
      {titulo && <text x="280" y="16" fontSize="12" textAnchor="middle" fill="#0f2740" fontWeight="bold">{titulo}</text>}

      {/* Tubería lado ALTA (descarga → condensador → línea de líquido) */}
      <path d="M100,150 L100,70 L220,70" fill="none" stroke={HOT} strokeWidth="4" />
      <path d="M360,70 L470,70 L470,160" fill="none" stroke={HOT} strokeWidth="4" />
      {/* Tubería lado BAJA (evaporador → aspiración) */}
      <path d="M470,180 L470,285 L360,285" fill="none" stroke={COLD} strokeWidth="4" />
      <path d="M220,285 L100,285 L100,175" fill="none" stroke={COLD} strokeWidth="4" />

      {/* Flechas de sentido del flujo */}
      <polygon points="160,64 172,70 160,76" fill={HOT} />
      <polygon points="470,120 464,132 476,132" fill={HOT} />
      <polygon points="300,291 288,285 300,279" fill={COLD} />
      <polygon points="100,225 94,237 106,237" fill={COLD} />

      {/* Compresor */}
      <circle cx="100" cy="162" r="26" fill="#0f2740" />
      <text x="100" y="159" fill="#fff" fontSize="9" textAnchor="middle">COMPRE-</text>
      <text x="100" y="170" fill="#fff" fontSize="9" textAnchor="middle">SOR</text>

      {/* Condensador (alta) */}
      <rect x="220" y="54" width="140" height="32" rx="6" fill="#fee2e2" stroke={HOT} strokeWidth="2" />
      <text x="290" y="74" fontSize="11" textAnchor="middle" fill="#991b1b" fontWeight="bold">CONDENSADOR</text>

      {/* Válvula de expansión */}
      <polygon points="470,160 458,172 470,184 482,172" fill="#f59e0b" stroke="#b45309" />
      <text x="470" y="205" fontSize="8.5" textAnchor="middle" fill="#92400e">Válvula</text>
      <text x="470" y="215" fontSize="8.5" textAnchor="middle" fill="#92400e">expansión</text>

      {/* Evaporador (baja) */}
      <rect x="220" y="269" width="140" height="32" rx="6" fill="#e0f2fe" stroke={COLD} strokeWidth="2" />
      <text x="290" y="289" fontSize="11" textAnchor="middle" fill="#075985" fontWeight="bold">EVAPORADOR</text>

      {/* Manómetro ALTA */}
      <rect x="150" y="100" width="96" height="42" rx="6" fill="#fff" stroke={colorAlta} strokeWidth="2" />
      <text x="198" y="116" fontSize="9" textAnchor="middle" fill="#475569">ALTA (bar)</text>
      <text x="198" y="134" fontSize="15" fontWeight="bold" textAnchor="middle" fill={colorAlta}>{alta}</text>
      {/* Manómetro BAJA */}
      <rect x="150" y="214" width="96" height="42" rx="6" fill="#fff" stroke={colorBaja} strokeWidth="2" />
      <text x="198" y="230" fontSize="9" textAnchor="middle" fill="#475569">BAJA (bar)</text>
      <text x="198" y="248" fontSize="15" fontWeight="bold" textAnchor="middle" fill={colorBaja}>{baja}</text>

      {/* Puntos de medición numerados */}
      <Punto x={128} y={70} n="1" color={HOT} />
      <Punto x={470} y={110} n="2" color={HOT} />
      <Punto x={340} y={285} n="3" color={COLD} />
      <Punto x={100} y={210} n="4" color={COLD} />

      {/* Etiquetas de medida directamente sobre el circuito */}
      <text x="128" y="52" fontSize="8.5" textAnchor="middle" fill="#991b1b">descarga</text>
      <text x="290" y="102" fontSize="8.5" textAnchor="middle" fill="#334155">T. líquido {val(L.tLiq, '°')}</text>
      <text x="290" y="46" fontSize="8" textAnchor="middle" fill="#991b1b">T. cond. {val(L.tCond, '°')}</text>
      <text x="290" y="325" fontSize="8" textAnchor="middle" fill="#075985">T. evap. {val(L.tEvap, '°')}</text>
      {/* Recuadro SUBENFRIAMIENTO en el punto 2 (línea de líquido) */}
      <rect x="490" y="96" width="66" height="30" rx="4" fill="#fef2f2" stroke="#ef4444" />
      <text x="523" y="108" fontSize="7.5" textAnchor="middle" fill="#991b1b" fontWeight="bold">SUBENFRIAM.</text>
      <text x="523" y="120" fontSize="10" textAnchor="middle" fill="#dc2626" fontWeight="bold">{val(L.subenf, '°C')}</text>
      {/* Recuadro RECALENTAMIENTO en el punto 4 (aspiración) */}
      <rect x="16" y="196" width="66" height="30" rx="4" fill="#eff6ff" stroke="#0ea5e9" />
      <text x="49" y="208" fontSize="7.5" textAnchor="middle" fill="#075985" fontWeight="bold">RECALENT.</text>
      <text x="49" y="220" fontSize="10" textAnchor="middle" fill="#0284c7" fontWeight="bold">{val(L.recal, '°C')}</text>
      <text x="49" y="240" fontSize="7.5" textAnchor="middle" fill="#075985">T. asp. {val(L.tAsp, '°')}</text>
      {/* Tª ambiente */}
      <text x="523" y="150" fontSize="8" textAnchor="middle" fill="#64748b">T. amb. {val(L.tAmb, '°')}</text>

      {/* Referencia de puntos */}
      <g fontSize="8" fill="#64748b">
        <text x="30" y="345">① descarga  ② línea de líquido (subenfriamiento)  ③ evaporación  ④ aspiración (recalentamiento)</text>
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

  const recal = (tAsp !== '' && tEvap !== '') ? (parseFloat(tAsp) - parseFloat(tEvap)) : null;   // recalentamiento
  const subenf = (tCond !== '' && tLiq !== '') ? (parseFloat(tCond) - parseFloat(tLiq)) : null;   // subenfriamiento

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
    if (!items.length && mB != null && mA != null)
      items.push({ e: 'PARÁMETROS EN RANGO', c: '#16a34a', t: 'Presiones y recalentamiento/subenfriamiento dentro de lo orientativo. Confirma con la ficha del fabricante.' });
    return items;
  }, [pBaja, pAlta, recal, subenf, rec.baja, rec.alta, tAmb]);

  const cB = pBaja === '' ? '#64748b' : (parseFloat(pBaja) < rec.baja * 0.9 ? '#dc2626' : parseFloat(pBaja) > rec.baja * 1.1 ? '#d97706' : '#16a34a');
  const cA = pAlta === '' ? '#64748b' : (parseFloat(pAlta) < rec.alta * 0.9 ? '#dc2626' : parseFloat(pAlta) > rec.alta * 1.1 ? '#d97706' : '#16a34a');

  // ── TAB 2: conversión ──
  const [convGas, setConvGas] = useState('R-404A');
  const [convDest, setConvDest] = useState('');
  const [pesoAct, setPesoAct] = useState('');
  const [compresor, setCompresor] = useState('');
  const [compInfo, setCompInfo] = useState('');
  const [buscComp, setBuscComp] = useState(false);
  const convList = CONV[convGas] || [];
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
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500 mb-1 block">Refrigerante</label>
                  <select value={gas} onChange={(e) => setGas(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    {Object.keys(PRES).map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-slate-500 mb-1 block">Aplicación</label>
                  <select value={app} onChange={(e) => setApp(e.target.value)} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    {APPS.map(a => <option key={a.k} value={a.k}>{a.l}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-500">Recomendado orientativo — Baja: <b>{rec.baja} bar</b> · Alta: <b>{rec.alta} bar</b></p>

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

              <div><label className="text-[11px] text-slate-500 mb-1 block">T. ambiente exterior (°C)</label><div className="max-w-[160px]">{N(tAmb, setTAmb, 'Ej: 32')}</div></div>
            </div>

            <div id="diag-image-area" className="bg-white rounded-xl shadow p-4" style={{ background: '#ffffff' }}>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Snowflake className="w-4 h-4 text-sky-600" />Esquema del circuito con todas las medidas</p>
              <div className="text-[11px] text-slate-500 mb-2">Refrigerante <b>{gas}</b> · {APPS.find(a => a.k === app)?.l}</div>
              <EsquemaFrig alta={pAlta || rec.alta} baja={pBaja || rec.baja} colorAlta={cA} colorBaja={cB}
                lecturas={{
                  tEvap, tAsp, tCond, tLiq, tAmb, pBaja, pAlta,
                  recal: recal != null ? recal.toFixed(1) : '',
                  subenf: subenf != null ? subenf.toFixed(1) : '',
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
                <div><label className="text-xs text-slate-500 mb-1 block">Gas actual</label>
                  <select value={convGas} onChange={(e) => { setConvGas(e.target.value); setConvDest(''); }} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                    {Object.keys(CONV).map(g => <option key={g} value={g}>{g}</option>)}
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
            </div>

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
