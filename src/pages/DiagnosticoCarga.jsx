import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/NavBar';
import { Printer, FileDown, Gauge, Snowflake } from 'lucide-react';

// Presiones ORIENTATIVAS manométricas (bar) por refrigerante y aplicación.
// evap/cond típicos: Clima +5/+45 · Refrigeración -10/+45 · Congelación -30/+45.
// Son valores de PARTIDA editables: ajústalos a tus condiciones reales.
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
  { k: 'clima', l: 'Climatización (A/C)  ·  evap +5 / cond +45 °C' },
  { k: 'refrigeracion', l: 'Refrigeración (positivo)  ·  evap -10 / cond +45 °C' },
  { k: 'congelacion', l: 'Congelación (negativo)  ·  evap -30 / cond +45 °C' },
];

export default function DiagnosticoCarga() {
  const [gas, setGas] = useState('R-410A');
  const [app, setApp] = useState('clima');
  const rec = PRES[gas]?.[app] || { baja: 0, alta: 0 };

  const [recBaja, setRecBaja] = useState('');
  const [recAlta, setRecAlta] = useState('');
  const [medBaja, setMedBaja] = useState('');
  const [medAlta, setMedAlta] = useState('');
  const [recal, setRecal] = useState(''); // recalentamiento °C (opcional)

  // recomendadas efectivas (si el usuario no ha tocado, usa la tabla)
  const rBaja = recBaja !== '' ? parseFloat(recBaja) : rec.baja;
  const rAlta = recAlta !== '' ? parseFloat(recAlta) : rec.alta;
  const mBaja = medBaja !== '' ? parseFloat(medBaja) : null;
  const mAlta = medAlta !== '' ? parseFloat(medAlta) : null;

  const diag = useMemo(() => {
    if (mBaja == null || mAlta == null) return null;
    const tol = 0.10; // ±10%
    const bajaBajo = mBaja < rBaja * (1 - tol);
    const bajaAlto = mBaja > rBaja * (1 + tol);
    const altaBajo = mAlta < rAlta * (1 - tol);
    const altaAlto = mAlta > rAlta * (1 + tol);
    const recalNum = recal !== '' ? parseFloat(recal) : null;

    // Reglas orientativas de diagnóstico
    if (bajaBajo && altaBajo) {
      return { estado: 'FALTA REFRIGERANTE', color: '#dc2626', txt: 'Ambas presiones por debajo de lo recomendado: probable falta de carga (fuga o carga insuficiente). Revisa fugas y añade gas poco a poco comprobando recalentamiento.' };
    }
    if (altaAlto && !bajaBajo) {
      return { estado: 'EXCESO / CONDENSACIÓN ALTA', color: '#d97706', txt: 'Alta por encima de lo recomendado: posible sobrecarga, condensador sucio, falta de ventilación o aire/incondensables. Limpia condensador y verifica caudal de aire antes de retirar gas.' };
    }
    if (bajaAlto && altaBajo) {
      return { estado: 'REVISAR COMPRESOR/VÁLVULA', color: '#d97706', txt: 'Baja alta y alta baja: posible compresor con poca compresión o válvula de expansión demasiado abierta. Revisa recalentamiento y compresor.' };
    }
    if (recalNum != null && recalNum > 12 && bajaBajo) {
      return { estado: 'FALTA REFRIGERANTE', color: '#dc2626', txt: 'Recalentamiento alto y baja presión baja: falta de gas. Añade carga controlando el recalentamiento (objetivo ~5-8 °C).' };
    }
    if (recalNum != null && recalNum < 3) {
      return { estado: 'POSIBLE EXCESO', color: '#d97706', txt: 'Recalentamiento muy bajo: riesgo de retorno de líquido / exceso de carga. Retira gas hasta lograr ~5-8 °C de recalentamiento.' };
    }
    return { estado: 'CARGA APARENTEMENTE CORRECTA', color: '#16a34a', txt: 'Presiones dentro del margen orientativo. Confirma con recalentamiento (~5-8 °C) y subenfriamiento según fabricante.' };
  }, [mBaja, mAlta, rBaja, rAlta, recal]);

  const colorBaja = mBaja == null ? '#64748b' : (mBaja < rBaja * 0.9 ? '#dc2626' : mBaja > rBaja * 1.1 ? '#d97706' : '#16a34a');
  const colorAlta = mAlta == null ? '#64748b' : (mAlta < rAlta * 0.9 ? '#dc2626' : mAlta > rAlta * 1.1 ? '#d97706' : '#16a34a');

  const printPDF = async () => {
    const svg = document.getElementById('esquema-frig')?.outerHTML || '';
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Diagnóstico frigorífico ${gas}</title>
    <style>*{box-sizing:border-box;font-family:Arial,sans-serif}body{padding:16px;color:#111}h1{color:#0f2740;font-size:18px}
    .box{border:1px solid #cbd5e1;border-radius:8px;padding:8px 12px;margin:8px 0}
    table{width:100%;border-collapse:collapse;font-size:13px}td,th{border:1px solid #e2e8f0;padding:6px 8px;text-align:left}
    @media print{@page{size:A4;margin:12mm}}</style></head><body>
    <h1>Diagnóstico de carga — Esquema frigorífico</h1>
    <p><b>Refrigerante:</b> ${gas} · <b>Aplicación:</b> ${APPS.find(a=>a.k===app)?.l}</p>
    <div class="box">${svg}</div>
    <table><tr><th></th><th>Recomendada (orient.)</th><th>Medida</th></tr>
      <tr><td>Baja presión</td><td>${rBaja} bar</td><td>${mBaja ?? '—'} bar</td></tr>
      <tr><td>Alta presión</td><td>${rAlta} bar</td><td>${mAlta ?? '—'} bar</td></tr>
      <tr><td>Recalentamiento</td><td>~5-8 °C</td><td>${recal || '—'} °C</td></tr>
    </table>
    ${diag ? `<div class="box" style="border-color:${diag.color}"><b style="color:${diag.color}">${diag.estado}</b><br>${diag.txt}</div>` : ''}
    <p style="font-size:10px;color:#94a3b8;margin-top:10px">Valores ORIENTATIVOS. Confirma siempre con la ficha del fabricante, recalentamiento y subenfriamiento reales.</p>
    <script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`;
    const w = window.open('', '_blank'); if (w) { w.document.write(html); w.document.close(); }
  };

  // Esquema SVG del circuito con cuadros de presión
  const Esquema = () => (
    <svg id="esquema-frig" viewBox="0 0 520 260" width="100%" style={{ maxWidth: 520, background: '#f8fafc', borderRadius: 8 }}>
      {/* tuberías */}
      <rect x="40" y="30" width="440" height="200" rx="10" fill="none" stroke="#94a3b8" strokeWidth="2" />
      {/* Compresor */}
      <circle cx="40" cy="130" r="22" fill="#0f2740" /><text x="40" y="134" fill="#fff" fontSize="9" textAnchor="middle">COMP</text>
      {/* Condensador (arriba) */}
      <rect x="180" y="16" width="160" height="28" rx="6" fill="#dbeafe" stroke="#2563eb" /><text x="260" y="34" fontSize="11" textAnchor="middle" fill="#1e3a8a">CONDENSADOR</text>
      {/* Válvula expansión (derecha) */}
      <polygon points="480,120 468,130 480,140 492,130" fill="#f59e0b" /><text x="480" y="160" fontSize="8" textAnchor="middle" fill="#92400e">Expansión</text>
      {/* Evaporador (abajo) */}
      <rect x="180" y="216" width="160" height="28" rx="6" fill="#dcfce7" stroke="#16a34a" /><text x="260" y="234" fontSize="11" textAnchor="middle" fill="#166534">EVAPORADOR</text>
      {/* Cuadro ALTA (línea de descarga, arriba-izquierda) */}
      <g>
        <rect x="70" y="60" width="96" height="40" rx="6" fill="#fff" stroke={colorAlta} strokeWidth="2" />
        <text x="118" y="76" fontSize="9" textAnchor="middle" fill="#475569">ALTA (bar)</text>
        <text x="118" y="92" fontSize="14" fontWeight="bold" textAnchor="middle" fill={colorAlta}>{mAlta ?? rAlta}</text>
      </g>
      {/* Cuadro BAJA (aspiración, abajo-izquierda) */}
      <g>
        <rect x="70" y="160" width="96" height="40" rx="6" fill="#fff" stroke={colorBaja} strokeWidth="2" />
        <text x="118" y="176" fontSize="9" textAnchor="middle" fill="#475569">BAJA (bar)</text>
        <text x="118" y="192" fontSize="14" fontWeight="bold" textAnchor="middle" fill={colorBaja}>{mBaja ?? rBaja}</text>
      </g>
    </svg>
  );

  const num = (v, set, ph) => (
    <Input type="number" inputMode="decimal" step="0.1" placeholder={ph} value={v} onChange={(e) => set(e.target.value)} />
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Diagnóstico de carga (esquema frigorífico)" />
      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Refrigerante</label>
              <select value={gas} onChange={(e) => { setGas(e.target.value); setRecBaja(''); setRecAlta(''); }} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                {Object.keys(PRES).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Aplicación</label>
              <select value={app} onChange={(e) => { setApp(e.target.value); setRecBaja(''); setRecAlta(''); }} className="w-full border border-input rounded-md px-3 py-2 text-sm">
                {APPS.map(a => <option key={a.k} value={a.k}>{a.l}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Baja recomendada (bar) — editable</label>
              {num(recBaja === '' ? rec.baja : recBaja, setRecBaja, String(rec.baja))}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Alta recomendada (bar) — editable</label>
              {num(recAlta === '' ? rec.alta : recAlta, setRecAlta, String(rec.alta))}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Baja MEDIDA (bar)</label>
              {num(medBaja, setMedBaja, 'Ej: 8.0')}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Alta MEDIDA (bar)</label>
              {num(medAlta, setMedAlta, 'Ej: 30')}
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Recalentamiento (°C) — opcional</label>
              {num(recal, setRecal, 'Ej: 6')}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2"><Snowflake className="w-4 h-4 text-sky-600" />Esquema del circuito</p>
          <Esquema />
        </div>

        {diag && (
          <div className="rounded-xl shadow overflow-hidden">
            <div style={{ background: diag.color }} className="px-4 py-3 text-white font-bold flex items-center gap-2">
              <Gauge className="w-5 h-5" />{diag.estado}
            </div>
            <div className="bg-white p-4 text-sm text-slate-700">{diag.txt}</div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={printPDF} className="gap-2"><Printer className="w-4 h-4" />Imprimir</Button>
          <Button onClick={printPDF} variant="outline" className="gap-2"><FileDown className="w-4 h-4" />Exportar PDF</Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          ⚠ Las presiones recomendadas son <b>orientativas</b> (dependen de temperaturas reales de evaporación/condensación).
          Ajústalas a tus condiciones y confirma siempre el <b>recalentamiento (~5-8 °C)</b> y el <b>subenfriamiento</b> según el
          fabricante. Para valores exactos usa la <b>Regla de Refrigerantes</b> (Danfoss) del programa.
        </div>
      </div>
    </div>
  );
}
