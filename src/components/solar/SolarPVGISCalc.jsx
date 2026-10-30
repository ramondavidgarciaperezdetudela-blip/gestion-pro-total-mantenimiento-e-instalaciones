import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberField } from "@/components/ui/number-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Sun, Euro, Clock } from 'lucide-react';

// ─── Datos de irradiación media por latitud (HSP medias mensuales en España) ───
const IRRADIACION_ESPANA = {
  norte: { hsp: 3.8, label: 'Norte (Galicia, Asturias, País Vasco)', lat: 43 },
  centro: { hsp: 4.8, label: 'Centro (Madrid, Castilla, Aragón)', lat: 40 },
  sur: { hsp: 5.5, label: 'Sur (Andalucía, Murcia)', lat: 37 },
  levante: { hsp: 5.0, label: 'Levante (Valencia, Cataluña)', lat: 41 },
  canarias: { hsp: 5.8, label: 'Canarias', lat: 28 },
  baleares: { hsp: 5.2, label: 'Baleares', lat: 39 },
};

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ─── Factores de corrección por azimut (Sur=0° es referencia) ───
const AZIMUT_CORRECTION = {
  0: 1.0,    // Sur → máximo
  15: 0.99,
  30: 0.97,
  45: 0.94,
  60: 0.88,
  90: 0.78,  // Este/Oeste
  135: 0.65,
  180: 0.55, // Norte
};

// Interpolación lineal del factor de corrección por azimut
function getAzimutFactor(azimut) {
  const abs = Math.abs(azimut);
  const keys = Object.keys(AZIMUT_CORRECTION).map(Number).sort((a, b) => a - b);
  for (let i = 0; i < keys.length - 1; i++) {
    if (abs >= keys[i] && abs <= keys[i + 1]) {
      const t = (abs - keys[i]) / (keys[i + 1] - keys[i]);
      return AZIMUT_CORRECTION[keys[i]] * (1 - t) + AZIMUT_CORRECTION[keys[i + 1]] * t;
    }
  }
  return AZIMUT_CORRECTION[180];
}

// ─── Ángulo óptimo de inclinación según latitud ───
function getOptimalTilt(lat) { return Math.round(lat * 0.87 - 1.5); }

// ─── Factor de corrección por inclinación ───
function getTiltFactor(tilt, optimalTilt) {
  const diff = Math.abs(tilt - optimalTilt);
  if (diff <= 5) return 1.0;
  if (diff <= 10) return 0.98;
  if (diff <= 20) return 0.94;
  if (diff <= 30) return 0.88;
  if (diff <= 45) return 0.80;
  return 0.70;
}

// ─── Producción mensual media (multiplicadores estacionales) ───
const MONTHLY_FACTORS = [0.55, 0.65, 0.85, 1.05, 1.15, 1.25, 1.30, 1.25, 1.05, 0.85, 0.60, 0.50];

// ─── Tipos de cubierta y su inclinación / azimut sugeridos ───
const CUBIERTA_TYPES = [
  { value: 'plana', label: '🏢 Cubierta plana (terrado)', tilt: 10, azimut: 0, desc: 'Inclinación óptima sobre estructura a 10–15°' },
  { value: 'inclinada_1agua', label: '🏠 Tejado 1 agua (una vertiente)', tilt: 25, azimut: 0, desc: 'Orientar vertiente al sur si es posible' },
  { value: 'inclinada_2aguas_ns', label: '🏡 Tejado 2 aguas N-S (caballete)', tilt: 22, azimut: 0, desc: 'Instalar en vertiente sur. Azimut 0° (sur)' },
  { value: 'inclinada_2aguas_eo', label: '🏡 Tejado 2 aguas E-O (este-oeste)', tilt: 18, azimut: 90, desc: 'Split E-O: pérdida ~10% vs. sur' },
  { value: 'inclinada_4aguas', label: '⛪ Tejado 4 aguas (pirámide)', tilt: 20, azimut: 0, desc: 'Usar vertiente sur o más expuesta' },
  { value: 'suelo', label: '🌿 Instalación en suelo', tilt: 35, azimut: 0, desc: 'Máxima flexibilidad. Ideal para huertos solares' },
  { value: 'fachada', label: '🏗️ Fachada / BIPV', tilt: 90, azimut: 0, desc: 'Pérdida significativa. Solo si no hay otra opción' },
  { value: 'pergola', label: '🌳 Pérgola / Marquesina', tilt: 10, azimut: 0, desc: 'Inclinación mínima para limpieza natural' },
];

// ─── Orientación de la vivienda ───
const ORIENTACIONES = [
  { value: '0', label: '⬆️ Fachada principal al SUR', azimut: 0 },
  { value: '45', label: '↗️ Fachada principal al SURESTE', azimut: 45 },
  { value: '-45', label: '↖️ Fachada principal al SUROESTE', azimut: -45 },
  { value: '90', label: '➡️ Fachada principal al ESTE', azimut: 90 },
  { value: '-90', label: '⬅️ Fachada principal al OESTE', azimut: -90 },
  { value: '135', label: '↘️ Fachada principal al NORESTE', azimut: 135 },
  { value: '-135', label: '↙️ Fachada principal al NOROESTE', azimut: -135 },
  { value: '180', label: '⬇️ Fachada principal al NORTE', azimut: 180 },
];

export default function SolarPVGISCalc({ totalKwp = 3.2, numPanels = 8, panelW = 400 }) {
  const [zona, setZona] = useState('centro');
  const [cubierta, setCubierta] = useState('inclinada_2aguas_ns');
  const [orientacion, setOrientacion] = useState('0');
  const [tiltManual, setTiltManual] = useState('');
  const [azimutManual, setAzimutManual] = useState('');
  const [perdidas, setPerdidas] = useState(14);
  const [precioKwh, setPrecioKwh] = useState(0.18);
  const [costeInstalacion, setCosteInstalacion] = useState('');
  const [consumoAnual, setConsumoAnual] = useState('');
  const [vidaUtil, setVidaUtil] = useState(25);
  const [interes, setInteres] = useState(2.5);
  const [autoconsumo, setAutoconsumo] = useState(70); // % de producción que se autoconsume

  const cubiertaData = CUBIERTA_TYPES.find(c => c.value === cubierta) || CUBIERTA_TYPES[0];
  const zonaData = IRRADIACION_ESPANA[zona];
  const orientData = ORIENTACIONES.find(o => o.value === orientacion) || ORIENTACIONES[0];

  const tilt = tiltManual !== '' ? parseFloat(tiltManual) : cubiertaData.tilt;
  const azimut = azimutManual !== '' ? parseFloat(azimutManual) : (cubierta === 'inclinada_2aguas_eo' ? parseInt(orientacion) + 90 : parseInt(orientacion));
  const optimalTilt = getOptimalTilt(zonaData.lat);

  const results = useMemo(() => {
    const hsp = zonaData.hsp;
    const azFactor = getAzimutFactor(azimut);
    const tiltFactor = getTiltFactor(tilt, optimalTilt);
    const lossFactor = (100 - perdidas) / 100;

    // Producción diaria base
    const dailyBaseKwh = totalKwp * hsp * azFactor * tiltFactor * lossFactor;

    // Producción mensual
    const monthly = MESES.map((m, i) => {
      const prod = dailyBaseKwh * MONTHLY_FACTORS[i] * 30;
      return { month: m, kwh: Math.round(prod), factor: MONTHLY_FACTORS[i] };
    });

    const yearlyKwh = monthly.reduce((s, m) => s + m.kwh, 0);
    const autoconsumoKwh = yearlyKwh * (autoconsumo / 100);
    const ahorroAnual = autoconsumoKwh * precioKwh;
    const excedentesKwh = yearlyKwh - autoconsumoKwh;
    const excedentesValor = excedentesKwh * 0.06; // precio compensación ~6 céntimos
    const beneficioTotal = ahorroAnual + excedentesValor;
    
    // Degradación anual del panel (~0.5% por año)
    const ahorroTotal25 = Array.from({ length: vidaUtil }, (_, i) => 
      beneficioTotal * Math.pow(0.995, i)
    ).reduce((a, b) => a + b, 0);

    // Coste estimado si no se introdujo
    const kwpPrice = 1200; // €/kWp instalado (media España 2024)
    const costeEst = totalKwp * kwpPrice;
    const coste = parseFloat(costeInstalacion) || costeEst;

    // Amortización simple
    const paybackSimple = coste / beneficioTotal;

    // VAN y TIR simplificado
    const cashFlows = [-coste, ...Array.from({ length: vidaUtil }, (_, i) => beneficioTotal * Math.pow(0.995, i))];
    const van = cashFlows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + interes / 100, i), 0);

    // ROI
    const roi = ((ahorroTotal25 - coste) / coste) * 100;

    // CO2 evitado (0.27 kg CO2/kWh red española media)
    const co2Anual = yearlyKwh * 0.27;

    // % cubierta del consumo
    const cobertura = Math.min(100, (autoconsumoKwh / consumoAnual) * 100);

    return {
      monthly, yearlyKwh, autoconsumoKwh, excedentesKwh, excedentesValor,
      ahorroAnual, beneficioTotal, coste, costeEst,
      paybackSimple, van, roi, co2Anual, cobertura,
      ahorroTotal25, azFactor, tiltFactor, lossFactor, dailyBaseKwh,
    };
  }, [zona, tilt, azimut, perdidas, precioKwh, costeInstalacion, consumoAnual, vidaUtil, interes, autoconsumo, totalKwp, zonaData]);

  const paybackColor = results.paybackSimple < 8 ? 'text-green-600' : results.paybackSimple < 12 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <h2 className="text-lg font-bold">Análisis de Rentabilidad y Amortización</h2>
        <Badge className="bg-green-100 text-green-700 text-xs">Estilo PVGIS</Badge>
      </div>

      {/* Instalación de referencia */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        <strong>Instalación calculada:</strong> {totalKwp.toFixed(2)} kWp · {numPanels} paneles × {panelW}W
      </div>

      {/* ─── PARÁMETROS ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-2 bg-blue-50"><CardTitle className="text-sm text-blue-700">🗺️ Ubicación y montaje</CardTitle></CardHeader>
          <CardContent className="p-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Zona geográfica</label>
              <Select value={zona} onValueChange={setZona}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IRRADIACION_ESPANA).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} (HSP {v.hsp}h)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Tipo de cubierta / posición de montaje</label>
              <Select value={cubierta} onValueChange={v => { setCubierta(v); setTiltManual(''); setAzimutManual(''); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CUBIERTA_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-blue-600 mt-1 bg-blue-50 p-1.5 rounded">💡 {cubiertaData.desc}</p>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Orientación de la vivienda (punto cardinal fachada principal)</label>
              <Select value={orientacion} onValueChange={setOrientacion}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORIENTACIONES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600">
                  Inclinación (°) <span className="text-blue-500">— óptima: {optimalTilt}°</span>
                </label>
                <NumberField placeholder={`${cubiertaData.tilt}° (sugerida)`} value={tiltManual} onChange={v => setTiltManual(v)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Azimut (°) <span className="text-gray-400 text-[10px]">0=Sur, 90=O, -90=E</span></label>
                <NumberField placeholder={`${cubiertaData.azimut}° (sugerido)`} value={azimutManual} onChange={v => setAzimutManual(v)} className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">Pérdidas sistema (%): temperatura + sombras + cables</label>
              <NumberField value={perdidas} onChange={v => setPerdidas(v)} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 bg-green-50"><CardTitle className="text-sm text-green-700">💶 Parámetros económicos</CardTitle></CardHeader>
          <CardContent className="p-3 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600">Precio electricidad red (€/kWh)</label>
              <NumberField value={precioKwh} onChange={v => setPrecioKwh(v)} className="mt-1" />
              <p className="text-[10px] text-gray-400 mt-0.5">Media España 2024 ≈ 0.18 €/kWh</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Coste total instalación (€) <span className="text-gray-400">— estimado: {results.costeEst.toLocaleString('es-ES')} €</span></label>
              <NumberField placeholder={`${results.costeEst.toLocaleString('es-ES')} € (estimado)`} value={costeInstalacion} onChange={v => setCosteInstalacion(v)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Consumo anual vivienda (kWh/año)</label>
              <NumberField value={consumoAnual} onChange={v => setConsumoAnual(v)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">% producción autoconsumida</label>
              <div className="flex items-center gap-2 mt-1">
                <NumberField value={autoconsumo} onChange={v => setAutoconsumo(v)} />
                <span className="text-sm font-bold text-green-600">{autoconsumo}%</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Con baterías ≈ 80-90%. Sin baterías ≈ 50-70%</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-600">Vida útil (años)</label>
                <NumberField decimals={false} value={vidaUtil} onChange={v => setVidaUtil(v)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Interés (%/año)</label>
                <NumberField value={interes} onChange={v => setInteres(v)} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── FACTORES DE CORRECCIÓN ─── */}
      <Card className="border-blue-100">
        <CardContent className="p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs">
            <div className="bg-blue-50 rounded-lg p-2">
              <p className="font-bold text-blue-700 text-base">{zonaData.hsp} h/día</p>
              <p className="text-gray-600">HSP media zona</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2">
              <p className="font-bold text-purple-700 text-base">{(results.azFactor * 100).toFixed(0)}%</p>
              <p className="text-gray-600">Factor azimut ({azimut}°)</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-2">
              <p className="font-bold text-orange-700 text-base">{(results.tiltFactor * 100).toFixed(0)}%</p>
              <p className="text-gray-600">Factor inclinación ({tilt}°)</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <p className="font-bold text-red-600 text-base">{(results.lossFactor * 100).toFixed(0)}%</p>
              <p className="text-gray-600">Factor pérdidas ({perdidas}%)</p>
            </div>
          </div>
          {Math.abs(tilt - optimalTilt) > 10 && (
            <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700">
              ⚠️ La inclinación actual ({tilt}°) difiere del óptimo ({optimalTilt}°) en más de 10°. Considera ajustar la estructura.
            </div>
          )}
          {Math.abs(azimut) > 60 && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              ⚠️ El azimut ({azimut}°) implica una pérdida de producción significativa vs. orientación sur. Considera reorientar si es posible.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── RESULTADOS PRINCIPALES ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-3 text-center">
            <Sun className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{results.yearlyKwh.toLocaleString('es-ES')}</p>
            <p className="text-xs text-gray-600">kWh producidos/año</p>
            <p className="text-[10px] text-gray-400">{results.dailyBaseKwh.toFixed(1)} kWh/día media</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-3 text-center">
            <Euro className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{results.beneficioTotal.toFixed(0)} €</p>
            <p className="text-xs text-gray-600">Ahorro/beneficio anual</p>
            <p className="text-[10px] text-gray-400">Autoconsumo + excedentes</p>
          </CardContent>
        </Card>
        <Card className={`border-blue-200 bg-blue-50`}>
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className={`text-2xl font-bold ${paybackColor}`}>{results.paybackSimple.toFixed(1)} años</p>
            <p className="text-xs text-gray-600">Amortización simple</p>
            <p className="text-[10px] text-gray-400">Payback period</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-3 text-center">
            <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-purple-700">{results.roi.toFixed(0)}%</p>
            <p className="text-xs text-gray-600">ROI ({vidaUtil} años)</p>
            <p className="text-[10px] text-gray-400">VAN: {results.van.toFixed(0)} €</p>
          </CardContent>
        </Card>
      </div>

      {/* ─── DESGLOSE ECONÓMICO ─── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="py-2 bg-green-50"><CardTitle className="text-sm text-green-700">💰 Desglose económico anual</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b"><td className="p-2 text-gray-600">Producción total</td><td className="p-2 text-right font-semibold">{results.yearlyKwh.toLocaleString('es-ES')} kWh</td></tr>
                <tr className="border-b bg-green-50"><td className="p-2 text-gray-600">Autoconsumo ({autoconsumo}%)</td><td className="p-2 text-right font-semibold text-green-700">{results.autoconsumoKwh.toFixed(0)} kWh → {results.ahorroAnual.toFixed(0)} €</td></tr>
                <tr className="border-b"><td className="p-2 text-gray-600">Excedentes vertidos red</td><td className="p-2 text-right font-semibold">{results.excedentesKwh.toFixed(0)} kWh → {results.excedentesValor.toFixed(0)} €</td></tr>
                <tr className="border-b bg-blue-50"><td className="p-2 font-bold text-blue-700">Beneficio total año 1</td><td className="p-2 text-right font-bold text-blue-700">{results.beneficioTotal.toFixed(0)} €/año</td></tr>
                <tr className="border-b"><td className="p-2 text-gray-600">Ahorro acumulado {vidaUtil} años</td><td className="p-2 text-right font-semibold">{results.ahorroTotal25.toFixed(0)} €</td></tr>
                <tr className="border-b bg-purple-50"><td className="p-2 font-bold text-purple-700">Cobertura consumo</td><td className="p-2 text-right font-bold text-purple-700">{results.cobertura.toFixed(0)}%</td></tr>
                <tr className="border-b"><td className="p-2 text-gray-600">CO₂ evitado/año</td><td className="p-2 text-right font-semibold text-green-600">{results.co2Anual.toFixed(0)} kg CO₂</td></tr>
                <tr className="border-b"><td className="p-2 text-gray-600">Coste inversión</td><td className="p-2 text-right font-semibold text-red-600">{results.coste.toLocaleString('es-ES')} €</td></tr>
                <tr className="bg-amber-50"><td className="p-2 font-bold text-amber-700">VAN ({interes}% interés)</td><td className="p-2 text-right font-bold text-amber-700">{results.van.toFixed(0)} €</td></tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ─── PRODUCCIÓN MENSUAL ─── */}
        <Card>
          <CardHeader className="py-2 bg-amber-50"><CardTitle className="text-sm text-amber-700">📅 Producción mensual estimada (kWh)</CardTitle></CardHeader>
          <CardContent className="p-3">
            <div className="space-y-1.5">
              {results.monthly.map((m, i) => {
                const maxKwh = Math.max(...results.monthly.map(x => x.kwh));
                const pct = (m.kwh / maxKwh) * 100;
                return (
                  <div key={m.month} className="flex items-center gap-2 text-xs">
                    <span className="w-6 font-medium text-gray-500">{m.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                      <div
                        className="h-4 rounded-full flex items-center justify-end pr-1"
                        style={{ width: `${pct}%`, background: `hsl(${45 - (i < 6 ? i : 11 - i) * 5}, 85%, 55%)` }}
                      >
                        <span className="text-[9px] text-white font-bold drop-shadow">{m.kwh}</span>
                      </div>
                    </div>
                    <span className="w-14 text-right font-semibold text-gray-600">{(m.kwh * precioKwh * autoconsumo / 100).toFixed(0)} €</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-2 border-t text-xs flex justify-between font-semibold">
              <span>Total año</span>
              <span className="text-amber-700">{results.yearlyKwh.toLocaleString('es-ES')} kWh</span>
              <span className="text-green-700">{results.beneficioTotal.toFixed(0)} €</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── CURVA AMORTIZACIÓN ─── */}
      <Card className="border-blue-200">
        <CardHeader className="py-2 bg-blue-50"><CardTitle className="text-sm text-blue-700">📈 Curva de amortización ({vidaUtil} años)</CardTitle></CardHeader>
        <CardContent className="p-3">
          <div className="flex items-end gap-1 h-28 overflow-x-auto">
            {Array.from({ length: Math.min(vidaUtil, 30) }, (_, i) => {
              const acumulado = Array.from({ length: i + 1 }, (_, j) => results.beneficioTotal * Math.pow(0.995, j)).reduce((a, b) => a + b, 0);
              const saldo = acumulado - results.coste;
              const maxSaldo = results.ahorroTotal25 - results.coste;
              const minSaldo = -results.coste;
              const range = maxSaldo - minSaldo;
              const pct = ((saldo - minSaldo) / range) * 100;
              const amortizado = saldo >= 0;
              return (
                <div key={i} className="flex flex-col items-center flex-1 min-w-[16px]">
                  <div className="w-full flex flex-col justify-end" style={{ height: '88px' }}>
                    <div
                      className={`w-full rounded-sm transition-all ${amortizado ? 'bg-green-500' : 'bg-red-400'}`}
                      style={{ height: `${Math.max(2, pct * 0.88)}px` }}
                      title={`Año ${i + 1}: ${saldo >= 0 ? '+' : ''}${saldo.toFixed(0)} €`}
                    />
                  </div>
                  {(i + 1) % 5 === 0 && <span className="text-[9px] text-gray-400 mt-0.5">{i + 1}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm"></span> En pérdidas</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> Amortizado</span>
            <span className="ml-auto font-semibold">Payback: <span className={paybackColor}>{results.paybackSimple.toFixed(1)} años</span></span>
          </div>
        </CardContent>
      </Card>

      {/* ─── RECOMENDACIONES ─── */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="py-2"><CardTitle className="text-sm text-green-700">✅ Recomendaciones de instalación</CardTitle></CardHeader>
        <CardContent className="p-3 space-y-1.5 text-xs text-green-900">
          <p>📐 <strong>Inclinación óptima</strong> para {zonaData.label}: <strong>{optimalTilt}°</strong> {tilt === optimalTilt ? '✓ Configurada correctamente' : `(actual: ${tilt}°, ${Math.abs(tilt - optimalTilt) <= 5 ? 'aceptable' : 'recomendamos ajustar'})`}</p>
          <p>🧭 <strong>Azimut</strong>: {azimut === 0 ? '✓ Sur perfecto — máxima producción' : azimut > 0 ? `${azimut}° hacia el Oeste — pérdida ~${((1 - results.azFactor) * 100).toFixed(0)}% vs. sur` : `${Math.abs(azimut)}° hacia el Este — pérdida ~${((1 - results.azFactor) * 100).toFixed(0)}% vs. sur`}</p>
          <p>🏗️ <strong>Tipo cubierta</strong>: {cubiertaData.label} — {cubiertaData.desc}</p>
          {autoconsumo < 70 && <p>🔋 <strong>Consejo</strong>: Con baterías podrías elevar el autoconsumo al 80-90% y mejorar la amortización en {(results.paybackSimple * 0.15).toFixed(1)} años.</p>}
          {results.paybackSimple > 12 && <p>⚠️ <strong>Atención</strong>: El payback supera 12 años. Considera revisar el precio de compra de los equipos o aumentar el autoconsumo.</p>}
          {results.van > 0 && <p>💶 <strong>VAN positivo</strong> de {results.van.toFixed(0)} €: la inversión es rentable a {vidaUtil} años con interés del {interes}%.</p>}
        </CardContent>
      </Card>
    </div>
  );
}