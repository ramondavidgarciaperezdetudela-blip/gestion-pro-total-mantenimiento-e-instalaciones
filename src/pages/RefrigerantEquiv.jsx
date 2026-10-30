import { useState, useMemo, useEffect } from 'react';
import { Search, Droplets, ArrowRightLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NumberField } from '@/components/ui/number-field';
import NavBar from '@/components/NavBar';
import { idsConDatos } from '@/lib/saturacion';
import {
  origenes, sustitucionesDe, buscarSustitucion, densidadLiquido, TIPOS,
} from '@/lib/equivalenciasGases';
import {
  TarjetaSustituto, DatosFicha, CargaConvertida, ComparacionFisica, GasesParecidos, PasosConversion,
  AvisoInflamable, EtiquetaEstado,
} from '@/components/ConversionGas';

/**
 * EQUIVALENCIAS DE GASES.
 * Los datos de las conversiones (tipo, aceite, carga, estado legal) salen de `equivalenciasGases.js`; las
 * presiones y la capacidad, de las propiedades termodinámicas (CoolProp). Aquí solo se muestran.
 */

const CLASE_SELECT = 'w-full border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground';
const num = (n, d = 2) => Number(n).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

// Tipos de compresor → gas típico, aceite y CARGA DE ACEITE nominal en litros.
// La carga de aceite (litros) es ORIENTATIVA: confirma siempre en la placa o
// ficha técnica del compresor, ya que varía según modelo y cilindrada exactos.
const COMPRESORES_GAS = {
  'Bitzer 4FES':       { gases:['R-404A','R-448A','R-449A'], aceite:'Bitzer BSE55',              litros:1.5, multi:false },
  'Bitzer 4NES':       { gases:['R-404A','R-507A','R-448A'], aceite:'Bitzer BSE55',              litros:2.6, multi:false },
  'Bitzer 2EES':       { gases:['R-134a','R-404A','R-449A'], aceite:'Bitzer BSE32',              litros:0.9, multi:true },
  'Bitzer 6FE/HSK':    { gases:['R-404A','R-407F','R-448A'], aceite:'Bitzer BSE55',              litros:4.0, multi:true },
  'Copeland ZS':       { gases:['R-410A','R-454B'],           aceite:'Copeland Ultra 32-3MAF',   litros:1.3, multi:false },
  'Copeland ZB':       { gases:['R-404A','R-134a','R-448A'], aceite:'Copeland Ultra 32-3MAF',   litros:1.3, multi:true },
  'Copeland ZF':       { gases:['R-404A','R-448A','R-449A'], aceite:'Copeland Ultra 32-3MAF',   litros:1.65,multi:false },
  'Copeland Scroll':   { gases:['R-410A','R-32','R-454B'],   aceite:'Copeland Ultra 32-3MAF',   litros:1.4, multi:true, nota:'Multi-refrigerante según serie' },
  'Copeland Stream':   { gases:['R-404A','R-407F','R-448A'], aceite:'Copeland Ultra 32-3MAF',   litros:3.25,multi:true },
  'Danfoss Maneurop':  { gases:['R-404A','R-134a','R-22'],   aceite:'Fuchs Reniso Triton SEZ 32',litros:1.4, multi:true },
  'Danfoss SM/SZ':     { gases:['R-407C','R-134a','R-410A'], aceite:'Danfoss 160Z / POE 32',    litros:1.45,multi:true },
  'Tecumseh AEZ':      { gases:['R-134a','R-513A'],           aceite:'POE Mobil EAL Arctic 22',  litros:0.5, multi:false },
  'Tecumseh CAJ':      { gases:['R-404A','R-449A'],           aceite:'POE Mobil EAL Arctic 22',  litros:0.65,multi:false },
  'Daikin Rotary':     { gases:['R-32','R-410A'],             aceite:'Daikin PA33 / FVC50K',     litros:0.55,multi:false },
  'Mitsubishi Scroll': { gases:['R-32','R-454B'],             aceite:'Suniso 4GS / POE',         litros:0.9, multi:false },
  'Emerson Climate':   { gases:['R-410A','R-32','R-454B'],   aceite:'Emerson Ultra 32',          litros:1.4, multi:true },
  'Frascold S/Q':      { gases:['R-404A','R-448A','R-407F'], aceite:'Frascold POE',             litros:2.7, multi:true },
  'Dorin H/HEX':       { gases:['R-744 (CO2)','R-404A'],      aceite:'Dorin POE / CO2',          litros:2.0, multi:true, nota:'Series transcríticas para CO2' },
  'Embraco/Secop':     { gases:['R-134a','R-600a','R-290'],  aceite:'POE / Mineral según modelo',litros:0.25,multi:true, nota:'Herméticos pequeños (frío doméstico/comercial)' },
  'GMCC/Highly Rotary':{ gases:['R-32','R-410A'],             aceite:'POE FV50S',                litros:0.45,multi:false },
  'Carrier 06D/06E':   { gases:['R-22','R-407C','R-134a'],    aceite:'Mineral/POE según gas',    litros:3.8, multi:true },
  'Trane Scroll CSH':  { gases:['R-410A','R-454B'],           aceite:'POE OIL00048',             litros:1.9, multi:false },
  'Bristol H2':        { gases:['R-22','R-407C','R-404A'],    aceite:'Mineral/POE',              litros:1.2, multi:true },
  'LG Scroll/Rotary':  { gases:['R-32','R-410A'],             aceite:'POE FVC68D',               litros:0.6, multi:false },
  'Panasonic Rotary':  { gases:['R-32','R-410A','R-600a'],    aceite:'POE',                      litros:0.45,multi:true },
  'Hitachi Scroll':    { gases:['R-410A','R-32'],             aceite:'POE FV68S',                litros:1.0, multi:false },
  'Cubigel (ACC)':     { gases:['R-134a','R-600a','R-290'],   aceite:'Mineral/POE según modelo', litros:0.30,multi:true, nota:'Herméticos pequeños' },
  'Performer (Danfoss)':{ gases:['R-410A','R-407C'],          aceite:'POE 160SZ',                litros:1.55,multi:true },
};

// ── Tubos de cobre frigorífico (OD pulgadas → diámetro interior aprox. mm) ─────
const TUBOS_COBRE = [
  { od:'1/4"',    id:4.8 },
  { od:'3/8"',    id:8.0 },
  { od:'1/2"',    id:10.9 },
  { od:'5/8"',    id:13.8 },
  { od:'3/4"',    id:16.6 },
  { od:'7/8"',    id:19.9 },
  { od:'1.1/8"',  id:25.6 },
  { od:'1.3/8"',  id:31.8 },
];

const ORIGENES = origenes().sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
const GASES_TUBERIA = idsConDatos();

export default function RefrigerantEquiv() {
  const [tab, setTab] = useState('tabla'); // tabla | calculadora | compresor | tuberia
  const [busca, setBusca] = useState('');
  const [gasOri, setGasOri] = useState('R-404A');
  const [pesoOri, setPesoOri] = useState('');
  const [gasDest, setGasDest] = useState('');
  const [compBusca, setCompBusca] = useState('');
  const [compInfo, setCompInfo] = useState(null);
  // Tubería
  const [tubGas, setTubGas] = useState('R-410A');
  const [tubTemp, setTubTemp] = useState(35);
  const [tubId, setTubId] = useState(8.0);
  const [tubLong, setTubLong] = useState('');

  const sustitutos = useMemo(() => sustitucionesDe(gasOri), [gasOri]);
  const ficha = gasDest ? buscarSustitucion(gasOri, gasDest) : null;

  // Si cambia el gas de origen y el destino ya no es posible, se limpia.
  useEffect(() => {
    if (gasDest && !sustitutos.some((s) => s.a === gasDest)) setGasDest('');
  }, [gasOri, gasDest, sustitutos]);

  const texto = busca.trim().toLowerCase();
  const filtrados = useMemo(() => {
    if (!texto) return ORIGENES;
    return ORIGENES.filter(
      (g) =>
        g.id.toLowerCase().includes(texto) ||
        (g.nombre || '').toLowerCase().includes(texto) ||
        sustitucionesDe(g.id).some((s) => s.a.toLowerCase().includes(texto)),
    );
  }, [texto]);

  const origenActual = ORIGENES.find((g) => g.id === gasOri);

  const irACalcular = (destino) => {
    setGasDest(destino);
    setTab('calculadora');
  };

  const buscarCompresor = () => {
    const q = compBusca.trim().toLowerCase();
    const local = Object.entries(COMPRESORES_GAS).find(([k]) => k.toLowerCase().includes(q));
    if (local) setCompInfo({ modelo: local[0], ...local[1] });
    else
      setCompInfo({
        modelo: compBusca, gases: ['No está en la base local'], aceite: 'Consulta al fabricante', multi: false,
        nota: 'Busca el modelo en la web del fabricante o mira la placa de características del compresor.',
      });
  };

  // Tubería: carga de líquido por metro = densidad del líquido · sección
  const dens = densidadLiquido(tubGas, tubTemp);
  const idNum = Number(tubId);
  const gPorMetro = dens && idNum ? dens * Math.PI * (idNum / 2000) ** 2 * 1000 : null;
  const cargaLinea = gPorMetro && tubLong > 0 ? (gPorMetro * tubLong) / 1000 : null;

  const tarjeta = 'rounded-xl border bg-card text-card-foreground p-4 space-y-3';
  const etiquetaCampo = 'text-xs text-muted-foreground mb-1 block';

  return (
    <div className="min-h-screen">
      <NavBar title="Equivalencias de Gases" />
      <div className="max-w-2xl mx-auto px-3 pt-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center justify-between">
          <p className="text-xs text-emerald-800">Funciona sin internet · presiones calculadas con CoolProp · {ORIGENES.length} gases de origen</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-3 py-3 space-y-3">
        <div className="flex rounded-xl overflow-hidden border bg-card shadow-sm" role="tablist">
          {[['tabla', 'Tabla'], ['calculadora', 'Calcular'], ['compresor', 'Compresor'], ['tuberia', 'Tubería']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-prueba={`pestana-${k}`} onClick={() => setTab(k)}
              className={`flex-1 py-2.5 text-sm font-medium transition-all ${tab === k ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* ── TABLA ── */}
        {tab === 'tabla' && (
          <div className="space-y-3" data-prueba="tab-tabla">
            <Input placeholder="Buscar gas (R-404A, R-22, R-290…)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar gas" />
            <div className="flex flex-wrap gap-1.5" data-prueba="lista-origenes">
              {filtrados.length === 0 && <p className="text-xs text-muted-foreground">Ningún gas coincide con «{busca}».</p>}
              {filtrados.map((g) => (
                <button key={g.id} type="button" onClick={() => setGasOri(g.id)} data-prueba="chip-origen" data-gas={g.id}
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${gasOri === g.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-foreground hover:bg-muted'}`}>
                  {g.id}
                </button>
              ))}
            </div>

            {origenActual && (
              <div className="rounded-xl overflow-hidden border bg-card">
                <div className="tech-panel px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-bold text-lg">{origenActual.id}</span>
                    <span className="text-xs ml-2 opacity-80">{origenActual.familia} · GWP {origenActual.gwp != null ? num(origenActual.gwp, 0) : '—'} · {origenActual.seguridad}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EtiquetaEstado estado={origenActual.estado} />
                    <span className="text-xs opacity-80">Aceite: {origenActual.aceite}</span>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    {sustitutos.length} {sustitutos.length === 1 ? 'posible sustituto' : 'posibles sustitutos'}. Primero los que se pueden usar, de la conversión más sencilla a la más compleja; los prohibidos, al final.
                    {' '}{Object.values(TIPOS).slice(0, 3).map((t) => t.etiqueta).join(' · ')}.
                  </p>
                  {sustitutos.map((s) => (
                    <TarjetaSustituto key={s.a} ficha={s} onCalcular={irACalcular} />
                  ))}
                  <GasesParecidos key={gasOri} de={gasOri} onElegir={(id) => { setGasDest(''); setBusca(''); setGasOri(id); }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── CALCULAR LA CARGA ── */}
        {tab === 'calculadora' && (
          <div className="space-y-3" data-prueba="tab-calculadora">
            <div className={tarjeta}>
              <h2 className="font-bold text-foreground">Conversión de carga</h2>
              <div>
                <label className={etiquetaCampo} htmlFor="eq-origen">Gas actual</label>
                <select id="eq-origen" value={gasOri} onChange={(e) => { setGasOri(e.target.value); setGasDest(''); }} className={CLASE_SELECT}>
                  {ORIGENES.map((g) => <option key={g.id} value={g.id}>{g.id}</option>)}
                </select>
              </div>
              <div>
                <label className={etiquetaCampo} htmlFor="eq-peso">Peso actual en el sistema (kg)</label>
                <NumberField id="eq-peso" placeholder="Ej: 3,5" value={pesoOri} onChange={setPesoOri} />
              </div>
              <div>
                <label className={etiquetaCampo} htmlFor="eq-destino">Gas sustituto</label>
                <select id="eq-destino" value={gasDest} onChange={(e) => setGasDest(e.target.value)} className={CLASE_SELECT}>
                  <option value="">— Seleccionar —</option>
                  {sustitutos.map((s) => (
                    <option key={s.a} value={s.a}>
                      {s.a} — {TIPOS[s.tipo]?.etiqueta}{s.prohibido ? ' (PROHIBIDO)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {ficha && (
              <div className={`rounded-xl border-2 overflow-hidden ${ficha.prohibido ? 'border-red-400' : ficha.tipo === 'directo' ? 'border-green-400' : 'border-amber-400'}`} data-prueba="resultado-conversion">
                <div className={`px-4 py-3 text-white ${ficha.prohibido ? 'bg-red-700' : ficha.tipo === 'directo' ? 'bg-green-700' : 'bg-amber-700'}`}>
                  <p className="font-bold text-lg flex items-center gap-2">{ficha.de} <ArrowRightLeft className="w-4 h-4" /> {ficha.a}</p>
                  <p className="text-white/90 text-sm">{TIPOS[ficha.tipo]?.etiqueta}</p>
                </div>
                <div className="bg-card p-4 space-y-3">
                  <DatosFicha ficha={ficha} />
                  <AvisoInflamable ficha={ficha} />
                  {pesoOri > 0 ? (
                    <CargaConvertida de={ficha.de} a={ficha.a} kg={pesoOri} />
                  ) : (
                    <p className="text-xs text-muted-foreground">Escribe el peso actual de gas para calcular cuánto cargar.</p>
                  )}
                  {ficha.tieneFisica && (
                    <div>
                      <div className="tech-label mb-1">Presiones y capacidad con el mismo compresor</div>
                      <ComparacionFisica de={ficha.de} a={ficha.a} />
                    </div>
                  )}
                  <PasosConversion />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── COMPRESOR ── */}
        {tab === 'compresor' && (
          <div className="space-y-3" data-prueba="tab-compresor">
            <div className={tarjeta}>
              <h2 className="font-bold text-foreground">Buscar por modelo de compresor</h2>
              <p className="text-xs text-muted-foreground">Escribe el modelo o la referencia del compresor para ver los gases habituales y el aceite.</p>
              <div className="flex gap-2">
                <Input placeholder="Ej: Bitzer 4FES, Copeland ZS…" value={compBusca} onChange={(e) => setCompBusca(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && compBusca && buscarCompresor()} aria-label="Modelo de compresor" />
                <Button onClick={buscarCompresor} disabled={!compBusca} aria-label="Buscar compresor"><Search className="w-4 h-4" /></Button>
              </div>
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Modelos de la base local:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.keys(COMPRESORES_GAS).map((k) => (
                    <button key={k} onClick={() => setCompBusca(k)} className="px-2 py-0.5 bg-muted rounded text-foreground hover:bg-accent">{k}</button>
                  ))}
                </div>
              </div>
            </div>

            {compInfo && (
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="tech-panel px-4 py-3">
                  <p className="font-bold">{compInfo.modelo}</p>
                  {compInfo.multi && <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded">Varios refrigerantes</span>}
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gases habituales</p>
                    <div className="flex flex-wrap gap-2">
                      {compInfo.gases.map((g) => <span key={g} className="bg-primary/10 text-foreground font-bold px-3 py-1 rounded-full text-sm">{g}</span>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Aceite recomendado</p>
                      <p className="font-semibold text-foreground">{compInfo.aceite}</p>
                    </div>
                    {compInfo.litros != null && (
                      <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
                        <p className="text-xs text-amber-800 mb-0.5 flex items-center gap-1"><Droplets className="w-3.5 h-3.5" />Carga de aceite</p>
                        <p className="font-bold text-amber-800">≈ {num(compInfo.litros, 2)} L</p>
                        <p className="text-[10px] text-amber-700">Orientativo: confírmalo en la placa</p>
                      </div>
                    )}
                  </div>
                  {compInfo.nota && <p className="text-sm text-foreground bg-muted rounded p-2">{compInfo.nota}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TUBERÍA ── */}
        {tab === 'tuberia' && (
          <div className="space-y-3" data-prueba="tab-tuberia">
            <div className={tarjeta}>
              <h2 className="font-bold text-foreground">Carga de gas por metro de línea de líquido</h2>
              <p className="text-xs text-muted-foreground">
                Gas que cabe en la línea de líquido según su longitud. Se calcula con la densidad real del líquido a la temperatura indicada.
              </p>
              <div>
                <label className={etiquetaCampo} htmlFor="tb-gas">Refrigerante</label>
                <select id="tb-gas" value={tubGas} onChange={(e) => setTubGas(e.target.value)} className={CLASE_SELECT}>
                  {GASES_TUBERIA.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className={etiquetaCampo} htmlFor="tb-temp">Temperatura del líquido (°C)</label>
                <NumberField id="tb-temp" placeholder="35" value={tubTemp} onChange={setTubTemp} />
              </div>
              <div>
                <label className={etiquetaCampo} htmlFor="tb-id">Diámetro de la línea de líquido</label>
                <select id="tb-id" value={tubId} onChange={(e) => setTubId(e.target.value)} className={CLASE_SELECT}>
                  {TUBOS_COBRE.map((t) => <option key={t.od} value={t.id}>{t.od} (Ø int. {num(t.id, 1)} mm)</option>)}
                </select>
              </div>
              <div>
                <label className={etiquetaCampo} htmlFor="tb-long">Longitud de la línea de líquido (m)</label>
                <NumberField id="tb-long" placeholder="Ej: 12" value={tubLong} onChange={setTubLong} />
              </div>
            </div>

            {!dens && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3" data-prueba="tuberia-fuera-rango">
                A {num(tubTemp, 0)} °C no hay datos de {tubGas}: el gas no existe como líquido a esa temperatura en la tabla. Prueba con otra temperatura.
              </p>
            )}

            {gPorMetro && (
              <div className="rounded-xl overflow-hidden border-2 border-primary/40" data-prueba="resultado-tuberia">
                <div className="tech-panel px-4 py-3"><p className="font-bold text-lg">{tubGas} · línea de líquido</p></div>
                <div className="bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                    <span className="text-sm text-foreground">Densidad del líquido a {num(tubTemp, 0)} °C</span>
                    <span className="font-bold tabular text-foreground">{num(dens, 0)} kg/m³</span>
                  </div>
                  <div className="flex items-center justify-between bg-muted rounded-lg p-3">
                    <span className="text-sm text-foreground">Carga por metro</span>
                    <span className="text-2xl font-bold tabular text-foreground" data-prueba="g-por-metro">≈ {num(gPorMetro, 0)} g/m</span>
                  </div>
                  {cargaLinea && (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <span className="text-sm text-emerald-900">Gas en {num(tubLong, 1)} m de línea</span>
                      <span className="text-3xl font-bold tabular text-emerald-800" data-prueba="kg-linea">≈ {num(cargaLinea, 3)} kg</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground bg-muted/60 rounded-lg p-3">
                    Es solo la línea de líquido, que es la que más gas aporta. La carga total del equipo es la del fabricante más este ajuste por longitud.
                    Confirma siempre con la ficha técnica del equipo.
                  </p>
                </div>
              </div>
            )}

            <div className={tarjeta}>
              <p className="text-xs font-semibold text-foreground">Diámetros de cobre habituales (orientativo)</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-foreground">
                <div className="bg-muted rounded p-2"><b>Splits pequeños (≤3,5 kW):</b> líquido 1/4", aspiración 3/8"</div>
                <div className="bg-muted rounded p-2"><b>Splits medios (3,5–7 kW):</b> líquido 1/4"–3/8", aspiración 1/2"–5/8"</div>
                <div className="bg-muted rounded p-2"><b>Comercial (7–15 kW):</b> líquido 3/8", aspiración 5/8"–7/8"</div>
                <div className="bg-muted rounded p-2"><b>Frío comercial mayor:</b> calcula con el programa del fabricante</div>
              </div>
              <p className="text-[11px] text-muted-foreground">Los diámetros dependen del fabricante, la longitud y el desnivel. Usa siempre la tabla del equipo.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
