import { useState, useEffect } from 'react';
import { Search, RefreshCw, Info, ArrowRightLeft, Thermometer, Droplets } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import NavBar from '@/components/NavBar';

// ── Base de datos de equivalencias (ASHRAE, RSIF, fichas técnicas fabricantes) ──
const GAS_DATA = [
  // ─────────────────────────────────── R-22 ──────────────────────────────────
  { origen:'R-22', gwp_o:1810, tipo_o:'HCFC', aceite_o:'Mineral/Alkilbenceno',
    equiv:[
      { gas:'R-422D', drop:true,  aceite:'Mineral (mantener)',     vaciar:false, factor:0.90, gwp:2729, nota:'Sustituto directo. Mantener aceite mineral. Reducir carga un 10%.' },
      { gas:'R-417A', drop:true,  aceite:'Mineral (mantener)',     vaciar:false, factor:0.88, gwp:2346, nota:'Drop-in. Puede requerir ajuste en TXV.' },
      { gas:'R-407C', drop:false, aceite:'POE (ICI Emkarate RL32)', vaciar:true, factor:0.95, gwp:1774, nota:'Cambio a POE obligatorio. Hacer 3 ciclos de purga.' },
      { gas:'R-427A', drop:false, aceite:'POE',                    vaciar:true, factor:0.92, gwp:2138, nota:'Requiere POE. Compatible con mineral en bajo porcentaje.' },
      { gas:'R-454B', drop:false, aceite:'POE A2L',                vaciar:true, factor:0.85, gwp:466,  nota:'Bajo GWP A2L. Verificar compatibilidad elastómeros y motor.' },
    ]},
  // ─────────────────────────────────── R-404A ─────────────────────────────────
  { origen:'R-404A', gwp_o:3922, tipo_o:'HFC', aceite_o:'POE',
    equiv:[
      { gas:'R-448A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.95, gwp:1387, nota:'Drop-in directo. Mismo aceite POE. Ajustar supercalentamiento.' },
      { gas:'R-449A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.95, gwp:1397, nota:'Drop-in directo. Ampliamente aprobado por Bitzer, Copeland.' },
      { gas:'R-452A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.93, gwp:2140, nota:'Drop-in. GWP reducido un 45%. Aprobado RSIF.' },
      { gas:'R-507A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:1.00, gwp:3985, nota:'Compatible directo. Similar rendimiento. GWP similar.' },
      { gas:'R-454C', drop:false, aceite:'POE A2L',                 vaciar:true,  factor:0.88, gwp:146,  nota:'Muy bajo GWP. A2L leve inflamabilidad. Nueva instalación.' },
      { gas:'R-290',  drop:false, aceite:'POE específico A3',       vaciar:true,  factor:0.55, gwp:3,    nota:'Natural A3. Carga máx 150g. Solo compresor hermético compatible.' },
    ]},
  // ─────────────────────────────────── R-410A ─────────────────────────────────
  { origen:'R-410A', gwp_o:2088, tipo_o:'HFC', aceite_o:'POE',
    equiv:[
      { gas:'R-32',   drop:false, aceite:'POE (POE32)',             vaciar:true,  factor:0.70, gwp:675,  nota:'A2L leve. Carga un 30% menor. Verificar presostatos y tuberías.' },
      { gas:'R-454B', drop:false, aceite:'POE A2L',                 vaciar:true,  factor:0.75, gwp:466,  nota:'Drop-in parcial (Daikin aprobado). GWP -78%. A2L.' },
      { gas:'R-466A', drop:false, aceite:'POE',                     vaciar:true,  factor:0.78, gwp:733,  nota:'A1 no inflamable. En desarrollo comercial. Verificar disponibilidad.' },
    ]},
  // ─────────────────────────────────── R-134a ─────────────────────────────────
  { origen:'R-134a', gwp_o:1430, tipo_o:'HFC', aceite_o:'POE',
    equiv:[
      { gas:'R-513A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.97, gwp:573,  nota:'Drop-in directo. GWP -60%. Aprobado por Copeland y Danfoss.' },
      { gas:'R-1234yf',drop:false,aceite:'PAG (automoción) / POE',  vaciar:true,  factor:0.92, gwp:4,    nota:'Muy bajo GWP. A2L. Principalmente automoción. Verificar compresor.' },
      { gas:'R-450A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.97, gwp:605,  nota:'Drop-in. GWP -58%. Rendimiento similar o superior.' },
    ]},
  // ─────────────────────────────────── R-507A ─────────────────────────────────
  { origen:'R-507A', gwp_o:3985, tipo_o:'HFC', aceite_o:'POE',
    equiv:[
      { gas:'R-448A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.95, gwp:1387, nota:'Drop-in directo. Preferido para congelación.' },
      { gas:'R-449A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.95, gwp:1397, nota:'Drop-in. Aprobado ampliamente por fabricantes de compresores.' },
      { gas:'R-452A', drop:true,  aceite:'POE (mantener)',          vaciar:false, factor:0.93, gwp:2140, nota:'Reducción GWP 46%. Drop-in compatible.' },
    ]},
  // ─────────────────────────────────── R-12 (legado) ──────────────────────────
  { origen:'R-12', gwp_o:10900, tipo_o:'CFC (prohibido)', aceite_o:'Mineral',
    equiv:[
      { gas:'R-134a', drop:false, aceite:'POE (ICI RL-S32H)',       vaciar:true,  factor:0.80, gwp:1430, nota:'Cambio completo de aceite a POE. Purgar 3 veces. Cambiar filtro deshidratador.' },
      { gas:'R-413A', drop:true,  aceite:'Mineral (mantener)',       vaciar:false, factor:0.78, gwp:2053, nota:'Drop-in para R-12. Aceite mineral compatible. No apto temperaturas < -25°C.' },
    ]},
  // ─────────────────────────────────── R-502 (legado) ─────────────────────────
  { origen:'R-502', gwp_o:4657, tipo_o:'HCFC/CFC (prohibido)', aceite_o:'Mineral/AB',
    equiv:[
      { gas:'R-404A', drop:false, aceite:'POE',                     vaciar:true,  factor:0.95, gwp:3922, nota:'Cambio completo de aceite a POE. Rendimiento similar.' },
      { gas:'R-408A', drop:true,  aceite:'Mineral (mantener)',       vaciar:false, factor:0.90, gwp:3152, nota:'Drop-in para R-502. Compatible con aceite mineral.' },
      { gas:'R-448A', drop:false, aceite:'POE',                     vaciar:true,  factor:0.90, gwp:1387, nota:'Solución moderna bajo GWP. Cambio a POE requerido.' },
    ]},
  // ─────────────────────────────────── R-32 ───────────────────────────────────
  { origen:'R-32', gwp_o:675, tipo_o:'HFC A2L', aceite_o:'POE32',
    equiv:[
      { gas:'R-454B', drop:false, aceite:'POE A2L',                 vaciar:true,  factor:0.93, gwp:466,  nota:'Ambos A2L. Menor GWP. Verificar compatibilidad compresor.' },
      { gas:'R-452B', drop:false, aceite:'POE A2L',                 vaciar:true,  factor:0.95, gwp:698,  nota:'Alternativa A2L similar a R-32.' },
    ]},
  // ─────────────────────────────────── R-290 Propano ──────────────────────────
  { origen:'R-290', gwp_o:3, tipo_o:'Natural HC A3', aceite_o:'POE específico A3',
    equiv:[
      { gas:'R-600a', drop:false, aceite:'POE específico HC',       vaciar:true,  factor:0.90, gwp:3,    nota:'Isobutano. Natural A3. Solo equipos herméticos <150g diseñados para HC.' },
    ]},
  // ─────────────────────────────────── R-744 CO2 ──────────────────────────────
  { origen:'R-744', gwp_o:1, tipo_o:'Natural A1', aceite_o:'POE especial CO2',
    equiv:[
      { gas:'R-744', drop:false, aceite:'POE CO2 (Bitzer BSE60K)',   vaciar:true,  factor:1.00, gwp:1,    nota:'CO2 no tiene sustituto equivalente. Sistema diseñado específicamente.' },
    ]},
];

// Tipos de compresor → gas típico (para búsqueda)
const COMPRESORES_GAS = {
  'Bitzer 4FES':       { gases:['R-404A','R-448A','R-449A'], aceite:'Bitzer BSE55', multi:false },
  'Bitzer 4NES':       { gases:['R-404A','R-507A','R-448A'], aceite:'Bitzer BSE55', multi:false },
  'Copeland ZS':       { gases:['R-410A','R-454B'],           aceite:'Copeland Ultra 32-3MAF', multi:false },
  'Copeland ZF':       { gases:['R-404A','R-448A','R-449A'], aceite:'Copeland Ultra 32-3MAF', multi:false },
  'Copeland Scroll':   { gases:['R-410A','R-32','R-454B'],   aceite:'Copeland Ultra 32-3MAF', multi:true, nota:'Multi-refrigerante según serie' },
  'Danfoss Maneurop':  { gases:['R-404A','R-134a','R-22'],   aceite:'Fuchs Reniso Triton SEZ 32', multi:true },
  'Tecumseh AEZ':      { gases:['R-134a','R-513A'],           aceite:'POE Mobil EAL Arctic 22', multi:false },
  'Daikin Rotary':     { gases:['R-32','R-410A'],             aceite:'Daikin PA33', multi:false },
  'Mitsubishi Scroll': { gases:['R-32','R-454B'],             aceite:'Suniso 4GS/POE', multi:false },
  'Emerson Climate':   { gases:['R-410A','R-32','R-454B'],   aceite:'Emerson Ultra 32', multi:true },
};

export default function RefrigerantEquiv() {
  const [tab,     setTab]     = useState('tabla');       // tabla | calculadora | compresor
  const [busca,   setBusca]   = useState('');
  const [gasOri,  setGasOri]  = useState('R-404A');
  const [pesoOri, setPesoOri] = useState('');
  const [gasDest, setGasDest] = useState('');
  const [compBusca, setCompBusca] = useState('');
  const [compInfo, setCompInfo]   = useState(null);
  const [searching, setSearching] = useState(false);

  const todos = GAS_DATA.map(g => g.origen);

  const gasSelec = GAS_DATA.find(g => g.origen === gasOri);
  const equivSelec = gasSelec?.equiv.find(e => e.gas === gasDest);
  const pesoConvertido = pesoOri && equivSelec
    ? (parseFloat(pesoOri) * equivSelec.factor).toFixed(2) : null;

  const filtrados = GAS_DATA.filter(g =>
    g.origen.toLowerCase().includes(busca.toLowerCase()) ||
    g.equiv.some(e => e.gas.toLowerCase().includes(busca.toLowerCase()))
  );

  const buscarCompresor = async () => {
    setSearching(true);
    // Buscar en la base local primero
    const local = Object.entries(COMPRESORES_GAS).find(([k]) =>
      k.toLowerCase().includes(compBusca.toLowerCase()));
    if (local) {
      setCompInfo({ modelo: local[0], ...local[1] });
    } else {
      setCompInfo({ modelo: compBusca, gases: ['No encontrado localmente'], aceite:'Consultar fabricante', multi:false,
        nota:'Busque en la web del fabricante o consulte la placa de datos del compresor.' });
    }
    setSearching(false);
  };

  const badgeDrop = (drop) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
      drop ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
      {drop ? '✓ Drop-in' : '⚠ No drop-in'}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar title="Equivalencias de Gases" />
      {/* Info offline */}
      <div className="max-w-2xl mx-auto px-3 pt-2">
        <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-green-700">✅ Funciona sin internet — datos ASHRAE/RSIF integrados</p>
          <span className="text-xs text-green-500 font-medium">v2025.1</span>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-white shadow">
          {[['tabla','📊 Tabla'],['calculadora','⚖️ Calcular'],['compresor','🔧 Compresor']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${tab===k ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── TAB 1: TABLA COMPLETA ── */}
        {tab === 'tabla' && (
          <div className="space-y-3">
            <Input placeholder="🔍 Buscar gas (R-404A, R-22...)" value={busca} onChange={e => setBusca(e.target.value)} />
            {filtrados.map(g => (
              <div key={g.origen} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="bg-blue-900 px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-white font-bold text-lg">{g.origen}</span>
                    <span className="text-blue-300 text-xs ml-2">{g.tipo_o} · GWP {g.gwp_o.toLocaleString()}</span>
                  </div>
                  <span className="text-blue-200 text-xs">Aceite: {g.aceite_o}</span>
                </div>
                <div className="divide-y">
                  {g.equiv.map((e, i) => (
                    <div key={i} className={`p-3 ${e.drop ? 'bg-green-50' : 'bg-amber-50'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-slate-800">{e.gas}</span>
                          {badgeDrop(e.drop)}
                          <span className="text-xs text-slate-500">GWP {e.gwp}</span>
                        </div>
                        <span className="text-xs font-bold text-blue-700">×{e.factor}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <div className="flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-blue-500" />
                          <span className="text-slate-600"><b>Aceite:</b> {e.aceite}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className={`font-semibold ${e.vaciar ? 'text-red-600' : 'text-green-600'}`}>
                            {e.vaciar ? '⚠ Vaciar aceite' : '✓ Mantener aceite'}
                          </span>
                        </div>
                      </div>
                      {e.nota && <p className="text-xs text-slate-500 mt-1.5 italic">ℹ {e.nota}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── TAB 2: CALCULADORA DE PESO ── */}
        {tab === 'calculadora' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-bold text-slate-800">Conversión de carga</h2>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Gas actual</label>
                <select value={gasOri} onChange={e => { setGasOri(e.target.value); setGasDest(''); }}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm">
                  {todos.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {gasSelec && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p><b>Tipo:</b> {gasSelec.tipo_o} · <b>GWP:</b> {gasSelec.gwp_o.toLocaleString()}</p>
                  <p><b>Aceite actual:</b> {gasSelec.aceite_o}</p>
                </div>
              )}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Peso actual en sistema (kg)</label>
                <Input type="number" inputMode="decimal" step="0.1" placeholder="Ej: 3.5" value={pesoOri} onChange={e => setPesoOri(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Gas sustituto</label>
                <select value={gasDest} onChange={e => setGasDest(e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm">
                  <option value="">— Seleccionar —</option>
                  {gasSelec?.equiv.map(e => (
                    <option key={e.gas} value={e.gas}>{e.gas} {e.drop ? '(drop-in)' : '(no drop-in)'}</option>
                  ))}
                </select>
              </div>
            </div>

            {equivSelec && (
              <div className={`rounded-xl shadow overflow-hidden ${equivSelec.drop ? 'border-2 border-green-400' : 'border-2 border-amber-400'}`}>
                <div className={`px-4 py-3 ${equivSelec.drop ? 'bg-green-600' : 'bg-amber-600'}`}>
                  <p className="text-white font-bold text-lg">{gasOri} → {equivSelec.gas}</p>
                  <p className="text-white/80 text-sm">{equivSelec.drop ? '✓ Sustituto directo (Drop-in)' : '⚠ No es drop-in — ver instrucciones'}</p>
                </div>
                <div className="bg-white p-4 space-y-3">
                  {pesoConvertido && (
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-slate-500">Peso original</p>
                      <p className="text-2xl font-bold text-blue-800">{pesoOri} kg</p>
                      <ArrowRightLeft className="w-5 h-5 text-blue-400 mx-auto my-1" />
                      <p className="text-xs text-slate-500">Peso nuevo ({equivSelec.gas})</p>
                      <p className="text-3xl font-bold text-green-700">{pesoConvertido} kg</p>
                      <p className="text-xs text-slate-500 mt-1">Factor: ×{equivSelec.factor}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-xs text-slate-500">Aceite requerido</p>
                      <p className="font-semibold text-slate-800">{equivSelec.aceite}</p>
                    </div>
                    <div className={`rounded-lg p-2 ${equivSelec.vaciar ? 'bg-red-50' : 'bg-green-50'}`}>
                      <p className="text-xs text-slate-500">Cambio de aceite</p>
                      <p className={`font-bold ${equivSelec.vaciar ? 'text-red-700' : 'text-green-700'}`}>
                        {equivSelec.vaciar ? '⚠ Vaciar y cambiar' : '✓ Mantener'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 italic">ℹ {equivSelec.nota}</p>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>GWP {gasOri}: {GAS_DATA.find(g=>g.origen===gasOri)?.gwp_o.toLocaleString()}</p>
                    <p>GWP {equivSelec.gas}: {equivSelec.gwp}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: BÚSQUEDA POR COMPRESOR ── */}
        {tab === 'compresor' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl shadow p-4 space-y-3">
              <h2 className="font-bold text-slate-800">Buscar por modelo de compresor</h2>
              <p className="text-xs text-slate-500">Introduzca el modelo o referencia del compresor para conocer el gas recomendado y el aceite.</p>
              <div className="flex gap-2">
                <Input placeholder="Ej: Bitzer 4FES, Copeland ZS21..." value={compBusca}
                  onChange={e => setCompBusca(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscarCompresor()} />
                <Button onClick={buscarCompresor} disabled={!compBusca || searching}>
                  {searching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
              <div className="text-xs text-slate-400">
                <p className="font-medium mb-1">Modelos en base de datos local:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(COMPRESORES_GAS).map(k => (
                    <button key={k} onClick={() => { setCompBusca(k); }}
                      className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 hover:bg-slate-200">{k}</button>
                  ))}
                </div>
              </div>
            </div>

            {compInfo && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="bg-blue-900 px-4 py-3">
                  <p className="text-white font-bold">{compInfo.modelo}</p>
                  {compInfo.multi && <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded">Multi-refrigerante</span>}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Gases compatibles</p>
                    <div className="flex flex-wrap gap-2">
                      {compInfo.gases.map(g => (
                        <span key={g} className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full text-sm">{g}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Aceite recomendado por fabricante</p>
                    <p className="font-semibold text-slate-800">{compInfo.aceite}</p>
                  </div>
                  {compInfo.nota && <p className="text-sm text-slate-600 italic bg-slate-50 rounded p-2">ℹ {compInfo.nota}</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
