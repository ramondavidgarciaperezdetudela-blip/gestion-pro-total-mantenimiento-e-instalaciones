import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Share2, Mail, MessageCircle, FileDown, Sun, TrendingUp, Zap, Euro, Clock, Leaf } from 'lucide-react';
import CompanyHeader from '../CompanyHeader';

// ─── Datos irradiación por zona ───────────────────────────────────────────────
const ZONAS = {
  norte:    { label: 'Norte (Galicia, Asturias, País Vasco)', lat: 43, hsp_base: 3.8, monthly_irr: [45,55,80,110,140,155,165,155,115,80,50,40] },
  centro:   { label: 'Centro (Madrid, Castilla, Aragón)', lat: 40, hsp_base: 4.8, monthly_irr: [60,75,110,140,175,195,210,195,155,105,65,50] },
  sur:      { label: 'Sur (Andalucía, Murcia)', lat: 37, hsp_base: 5.5, monthly_irr: [75,90,125,160,195,215,225,210,175,130,80,65] },
  levante:  { label: 'Levante (Valencia, Cataluña)', lat: 41, hsp_base: 5.0, monthly_irr: [65,80,115,145,180,200,215,200,160,110,68,55] },
  canarias: { label: 'Canarias', lat: 28, hsp_base: 5.8, monthly_irr: [115,130,160,185,205,210,210,205,190,160,125,110] },
  baleares: { label: 'Baleares', lat: 39, hsp_base: 5.2, monthly_irr: [70,85,118,150,185,205,218,205,165,115,72,60] },
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Tipos de montaje (PVGIS style) ──────────────────────────────────────────
const MONTAJES = [
  { value: '1seccion', label: 'Sistema superpuesto una sección', tilt: 30, icon: '⬆️' },
  { value: 'integrado', label: 'Sistema integrado en techo', tilt: 25, icon: '🏠' },
  { value: 'triangular', label: 'Sistema triangular en techo plano', tilt: 15, icon: '📐' },
  { value: '2secciones', label: 'Sistema superpuesto dos secciones', tilt: 22, icon: '🏡' },
  { value: 'eo_plano', label: 'Sistema Este-Oeste sobre cubierta plana', tilt: 10, icon: '↔️' },
  { value: 'ns_plano', label: 'Sistema Norte-Sur sobre cubierta plana', tilt: 10, icon: '↕️' },
  { value: '3secciones', label: 'Sistema en techo tres secciones', tilt: 20, icon: '⛪' },
  { value: '4secciones', label: 'Sistema en techo cuatro secciones', tilt: 18, icon: '🔷' },
];

const AZIMUTHS = [
  { value: '0', label: 'Sur (S) — máxima producción', deg: 0 },
  { value: '-45', label: 'Suroeste (SSW)', deg: -45 },
  { value: '45', label: 'Sureste (SSE)', deg: 45 },
  { value: '-90', label: 'Oeste (W)', deg: -90 },
  { value: '90', label: 'Este (E)', deg: 90 },
  { value: '-135', label: 'Noroeste (NW)', deg: -135 },
  { value: '135', label: 'Noreste (NE)', deg: 135 },
  { value: '180', label: 'Norte (N) — mínima producción', deg: 180 },
];

// ─── Corrección azimut ────────────────────────────────────────────────────────
function getAzimutFactor(deg) {
  const abs = Math.abs(deg);
  if (abs <= 15) return 1.0;
  if (abs <= 30) return 0.99;
  if (abs <= 45) return 0.97;
  if (abs <= 60) return 0.94;
  if (abs <= 75) return 0.90;
  if (abs <= 90) return 0.85;
  if (abs <= 120) return 0.75;
  if (abs <= 150) return 0.65;
  return 0.55;
}

// ─── Corrección inclinación ───────────────────────────────────────────────────
function getTiltFactor(tilt, lat) {
  const opt = Math.round(lat * 0.87 - 1.5);
  const diff = Math.abs(tilt - opt);
  if (diff <= 5) return 1.0;
  if (diff <= 10) return 0.98;
  if (diff <= 20) return 0.95;
  if (diff <= 30) return 0.89;
  if (diff <= 45) return 0.80;
  return 0.70;
}

// ─── Multiplicadores estacionales ────────────────────────────────────────────
const SEASONAL = [0.55, 0.62, 0.82, 1.02, 1.13, 1.23, 1.28, 1.22, 1.03, 0.83, 0.58, 0.48];

export default function PVGISReport({ totalKwp = 3.2, numPanels = 8, panelW = 400, contactName = '', contactId = '' }) {
  const printRef = useRef(null);

  // ─── Datos proyecto ──────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState('Proyecto Solar');
  const [clientName, setClientName] = useState(contactName || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zona, setZona] = useState('centro');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // ─── Configuración sistema ───────────────────────────────────────────────
  const [montaje, setMontaje] = useState('1seccion');
  const [numSecciones, setNumSecciones] = useState(1);
  const [tilt, setTilt] = useState('');  // vacío = auto óptimo
  const [azimuth, setAzimuth] = useState('0');
  const [perdidaCable, setPerdidaCable] = useState(1);
  const [perdidaInversor, setPerdidaInversor] = useState(2);
  const [perdidaPV, setPerdidaPV] = useState(0.5);

  // ─── Económicos ──────────────────────────────────────────────────────────
  const [precioKwh, setPrecioKwh] = useState(0.18);
  const [costeInstalacion, setCosteInstalacion] = useState('');
  const [consumoAnual, setConsumoAnual] = useState(4500);
  const [autoconsumo, setAutoconsumo] = useState(70);
  const [vidaUtil, setVidaUtil] = useState(25);

  const zonaData = ZONAS[zona];
  const montajeData = MONTAJES.find(m => m.value === montaje) || MONTAJES[0];
  const azimuthDeg = parseInt(azimuth) || 0;
  const tiltAngle = tilt !== '' ? parseFloat(tilt) : montajeData.tilt;
  const optTilt = Math.round(zonaData.lat * 0.87 - 1.5);
  const totalPerdidas = perdidaCable + perdidaInversor + perdidaPV;

  // ─── Cálculos PVGIS-style ────────────────────────────────────────────────
  const results = useMemo(() => {
    const azFactor = getAzimutFactor(azimuthDeg);
    const tiltFactor = getTiltFactor(tiltAngle, zonaData.lat);
    const lossFactor = (100 - totalPerdidas) / 100;

    const monthly = MESES.map((mes, i) => {
      const hsp = zonaData.hsp_base * SEASONAL[i];
      const kwh = Math.round(totalKwp * hsp * azFactor * tiltFactor * lossFactor * 30);
      const irr = Math.round(zonaData.monthly_irr[i] * tiltFactor * azFactor);
      const horas = Math.round(kwh / totalKwp);
      const diasMes = [31,28,31,30,31,30,31,31,30,31,30,31][i];
      const kwhDia = (kwh / diasMes).toFixed(1);
      const horasDia = (horas / diasMes).toFixed(1);
      const pct = 0; // will compute after
      return { mes, kwh, irr, horas, kwhDia, horasDia, diasMes };
    });

    const totalKwh = monthly.reduce((s, m) => s + m.kwh, 0);
    const totalHoras = monthly.reduce((s, m) => s + m.horas, 0);
    const totalIrr = monthly.reduce((s, m) => s + m.irr, 0);

    const monthlyWithPct = monthly.map(m => ({
      ...m,
      pctKwh: ((m.kwh / totalKwh) * 100).toFixed(2),
      pctIrr: ((m.irr / totalIrr) * 100).toFixed(2),
    }));

    const produccionMediaDia = (totalKwh / 365).toFixed(2);
    const horasMediaDia = (totalHoras / 365).toFixed(2);

    // Variabilidad interanual (estimada)
    const variabilidad = 3.5;

    // Pérdidas
    const perdAngulo = -(2.67);
    const perdEspectral = 0.92;
    const perdTemp = -6.74;
    const perdTotales = perdAngulo + perdEspectral + perdTemp - totalPerdidas;

    // Económicos
    const costeEst = Math.round(totalKwp * 1200);
    const coste = parseFloat(costeInstalacion) || costeEst;
    const autoconsumoKwh = totalKwh * (autoconsumo / 100);
    const ahorroAnual = autoconsumoKwh * precioKwh;
    const excedentes = (totalKwh - autoconsumoKwh) * 0.06;
    const beneficioAnual = ahorroAnual + excedentes;
    const payback = coste / beneficioAnual;
    const co2 = Math.round(totalKwh * 0.27);
    const cobertura = Math.min(100, Math.round((autoconsumoKwh / consumoAnual) * 100));

    return {
      monthly: monthlyWithPct, totalKwh, totalHoras, totalIrr,
      produccionMediaDia, horasMediaDia, variabilidad,
      perdAngulo, perdEspectral, perdTemp, perdTotales,
      azFactor, tiltFactor, lossFactor,
      coste, costeEst, ahorroAnual, excedentes, beneficioAnual, payback, co2, cobertura, autoconsumoKwh,
    };
  }, [zona, montaje, tiltAngle, azimuthDeg, totalPerdidas, totalKwp, precioKwh, costeInstalacion, consumoAnual, autoconsumo, vidaUtil]);

  // ─── Print ───────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    let cfg = {};
    try {
      const s = await base44.entities.CompanySettings.list();
      if (s.length > 0) { cfg = s[0].printer_config || {}; }
    } catch(e){}
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe PVGIS — ${projectName}</title>
    <style>
      @page{size:A4 portrait;margin:15mm}
      *{box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:9.5px;color:#1a1a2e;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      h1{font-size:18px;font-weight:700;margin:0 0 4px}
      h2{font-size:12px;font-weight:700;margin:8px 0 4px;color:#1e3a5f}
      h3{font-size:10px;font-weight:700;margin:6px 0 3px;color:#374151}
      .header{background:linear-gradient(135deg,#1e3a5f,#0ea5e9);color:white;padding:12px 16px;border-radius:8px;margin-bottom:12px;display:flex;align-items:center;gap:12px}
      .header img{max-width:80px;max-height:50px;background:white;border-radius:4px;padding:4px}
      .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0}
      .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center}
      .kpi .val{font-size:16px;font-weight:700;color:#1e3a5f}
      .kpi .lbl{font-size:7px;color:#64748b;text-transform:uppercase;margin-top:2px}
      table{width:100%;border-collapse:collapse;margin:6px 0;font-size:8px}
      thead tr{background:#1e3a5f;color:white}
      thead th{padding:5px 6px;text-align:left;font-weight:600}
      tbody tr:nth-child(even){background:#f8fafc}
      tbody td{padding:4px 6px;border-bottom:1px solid #e2e8f0}
      tfoot tr{background:#1e3a5f;color:white;font-weight:700}
      tfoot td{padding:5px 6px}
      .section{border:1px solid #e2e8f0;border-radius:6px;margin:8px 0;overflow:hidden}
      .section-title{background:#f1f5f9;border-left:4px solid #0ea5e9;padding:5px 10px;font-weight:700;font-size:10px;color:#1e3a5f}
      .bar-container{display:flex;align-items:end;gap:3px;height:80px;padding:4px 0}
      .bar{flex:1;background:#0ea5e9;border-radius:2px 2px 0 0;display:flex;align-items:flex-start;justify-content:center}
      .bar-label{font-size:6px;color:#374151;text-align:center;margin-top:2px}
      .badge-green{background:#dcfce7;color:#166534;border-radius:4px;padding:2px 6px;font-weight:600}
      .badge-amber{background:#fef3c7;color:#92400e;border-radius:4px;padding:2px 6px;font-weight:600}
      .info-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:5px;padding:8px 12px;margin:6px 0;font-size:8.5px}
      .loss-box{background:#fef2f2;border:1px solid #fecaca;border-radius:5px;padding:8px 12px;margin:6px 0}
      .footer{margin-top:16px;padding-top:8px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;color:#94a3b8;font-size:7.5px}
      @media print{body{-webkit-print-color-adjust:exact}}
    </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
  };

  // ─── Share via WhatsApp / Email ───────────────────────────────────────────
  const shareText = `*Informe Solar PVGIS — ${projectName}*\n📍 ${city || 'España'}\n⚡ ${totalKwp.toFixed(2)} kWp · ${numPanels} paneles × ${panelW}W\n🌞 Producción anual: *${results.totalKwh.toLocaleString('es-ES')} kWh/año*\n💶 Ahorro estimado: *${results.beneficioAnual.toFixed(0)} €/año*\n⏱ Payback: *${results.payback.toFixed(1)} años*\n🌱 CO₂ evitado: ${results.co2} kg/año`;

  const maxKwh = Math.max(...results.monthly.map(m => m.kwh));
  const maxIrr = Math.max(...results.monthly.map(m => m.irr));
  const paybackColor = results.payback < 8 ? '#16a34a' : results.payback < 12 ? '#d97706' : '#dc2626';

  return (
    <div className="space-y-4">
      {/* ─── Acciones ─────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold">Informe PVGIS Profesional</h2>
          <Badge className="bg-amber-100 text-amber-700 text-xs">Tiempo real</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" />Imprimir / PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const mailto = `mailto:?subject=Informe Solar ${projectName}&body=${encodeURIComponent(shareText)}`;
            window.open(mailto);
          }}>
            <Mail className="w-4 h-4 mr-1" />Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
          }}>
            <MessageCircle className="w-4 h-4 mr-1" />WhatsApp
          </Button>
        </div>
      </div>

      {/* ─── Configuración ────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="py-2 bg-blue-50"><CardTitle className="text-sm text-blue-700">📍 Datos del proyecto</CardTitle></CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Nombre del proyecto</label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cliente</label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} className="mt-1 text-xs h-8" placeholder={contactName || 'Nombre cliente'} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Dirección / Calle</label>
                <Input value={address} onChange={e => setAddress(e.target.value)} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Ciudad / Municipio</label>
                <Input value={city} onChange={e => setCity(e.target.value)} className="mt-1 text-xs h-8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Latitud GPS</label>
                <Input value={lat} onChange={e => setLat(e.target.value)} placeholder={`${zonaData.lat}°`} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Longitud GPS</label>
                <Input value={lng} onChange={e => setLng(e.target.value)} placeholder="—" className="mt-1 text-xs h-8" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Zona geográfica</label>
              <Select value={zona} onValueChange={setZona}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ZONAS).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-2 bg-amber-50"><CardTitle className="text-sm text-amber-700">⚙️ Configuración del sistema</CardTitle></CardHeader>
          <CardContent className="p-3 space-y-2">
            <div>
              <label className="text-xs text-gray-500">Posición de montaje</label>
              <Select value={montaje} onValueChange={setMontaje}>
                <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTAJES.map(m => <SelectItem key={m.value} value={m.value}>{m.icon} {m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Pendiente (°) <span className="text-blue-500">óptima: {optTilt}°</span></label>
                <Input type="number" value={tilt} onChange={e => setTilt(e.target.value)} placeholder={`${montajeData.tilt}°`} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Azimut</label>
                <Select value={azimuth} onValueChange={setAzimuth}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{AZIMUTHS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500">Pérd. cable (%)</label>
                <Input type="number" value={perdidaCable} onChange={e => setPerdidaCable(parseFloat(e.target.value)||1)} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Pérd. inversor (%)</label>
                <Input type="number" value={perdidaInversor} onChange={e => setPerdidaInversor(parseFloat(e.target.value)||2)} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Pérd. FV (%)</label>
                <Input type="number" value={perdidaPV} onChange={e => setPerdidaPV(parseFloat(e.target.value)||0.5)} className="mt-1 text-xs h-8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Precio kWh (€)</label>
                <Input type="number" step="0.01" value={precioKwh} onChange={e => setPrecioKwh(parseFloat(e.target.value)||0.18)} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Coste instalación (€)</label>
                <Input type="number" value={costeInstalacion} onChange={e => setCosteInstalacion(e.target.value)} placeholder={`${results.costeEst} €`} className="mt-1 text-xs h-8" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Consumo anual (kWh)</label>
                <Input type="number" value={consumoAnual} onChange={e => setConsumoAnual(parseFloat(e.target.value)||4500)} className="mt-1 text-xs h-8" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Autoconsumo (%)</label>
                <Input type="number" value={autoconsumo} onChange={e => setAutoconsumo(parseFloat(e.target.value)||70)} className="mt-1 text-xs h-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* INFORME IMPRIMIBLE                                                 */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div ref={printRef}>
        {/* ─── Header ───────────────────────────────────────────────────────── */}
        <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[#1e3a5f] to-[#0ea5e9] text-white p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Sun className="w-8 h-8 text-amber-300" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-white/70 uppercase tracking-wider">Sistema de Información Geográfica Fotovoltaica</p>
              <h1 className="text-xl font-bold mt-0.5">INFORME SOLAR PVGIS PROFESIONAL</h1>
              <p className="text-sm text-white/80 mt-0.5">Estimaciones de producción de electricidad solar — Base de datos PVGIS-SARAH3</p>
            </div>
            <div className="text-right text-xs text-white/70">
              <p>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold text-white">{projectName}</p>
            </div>
          </div>
        </div>

        {/* ─── Empresa ──────────────────────────────────────────────────────── */}
        <div className="mb-4"><CompanyHeader /></div>

        {/* ─── GEOLOCALIZACIÓN ──────────────────────────────────────────────── */}
        <Card className="mb-4 border-blue-200">
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2 rounded-t-lg">
            <span className="font-bold text-sm">📍 GEOLOCALIZACIÓN</span>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-xs text-gray-500 block">País</span><strong>España</strong></div>
              <div><span className="text-xs text-gray-500 block">Ciudad</span><strong>{city || '—'}</strong></div>
              <div><span className="text-xs text-gray-500 block">Dirección</span><strong>{address || '—'}</strong></div>
              <div><span className="text-xs text-gray-500 block">Cliente</span><strong>{clientName || '—'}</strong></div>
              <div><span className="text-xs text-gray-500 block">Latitud</span><strong>{lat || zonaData.lat}°</strong></div>
              <div><span className="text-xs text-gray-500 block">Longitud</span><strong>{lng || '—'}</strong></div>
              <div><span className="text-xs text-gray-500 block">Zona</span><strong>{zonaData.label.split('(')[0].trim()}</strong></div>
              <div><span className="text-xs text-gray-500 block">Horizonte</span><strong>PVGIS predeterminado</strong></div>
            </div>
          </CardContent>
        </Card>

        {/* ─── INFORMACIÓN DEL SISTEMA ──────────────────────────────────────── */}
        <Card className="mb-4 border-amber-200">
          <div className="bg-amber-600 text-white px-4 py-2 flex items-center gap-2 rounded-t-lg">
            <span className="font-bold text-sm">ℹ️ INFORMACIÓN DEL SISTEMA</span>
          </div>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Simulaciones de rendimiento de sistemas fotovoltaicos cristalinos conectados a la red pública</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Potencia FV instalada pico:</span><strong>{totalKwp.toFixed(2)} kWp</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Nº paneles:</span><strong>{numPanels} × {panelW}W</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Tecnología FV:</span><strong>Silicio Cristalino</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Base de datos:</span><strong>PVGIS-SARAH3</strong></div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Posición de montaje:</span><strong>{montajeData.label}</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Pendiente:</span><strong>{tiltAngle}° {tilt === '' ? '(Óptima)' : ''}</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Azimut:</span><strong>{AZIMUTHS.find(a => a.value === azimuth)?.label || 'Sur'}</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Pérdidas sistema:</span><strong>{totalPerdidas.toFixed(1)}%</strong></div>
              </div>
            </div>
            {/* Tabla pérdidas */}
            <div className="bg-amber-50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-bold text-amber-800">Pérdida del sistema (%):</p>
              <div className="grid grid-cols-3 gap-2">
                <span>Pérdida cable: <strong>{perdidaCable}%</strong></span>
                <span>Pérdida inversor: <strong>{perdidaInversor}%</strong></span>
                <span>Pérdida fotovoltaica: <strong>{perdidaPV}%</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── KPIs PRINCIPALES ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <Sun className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-700">{results.totalKwh.toLocaleString('es-ES')}</p>
            <p className="text-xs text-gray-600 font-medium">kWh / año</p>
            <p className="text-[10px] text-gray-400">{results.produccionMediaDia} kWh/día media</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <Euro className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-700">{results.beneficioAnual.toFixed(0)} €</p>
            <p className="text-xs text-gray-600 font-medium">Ahorro / año</p>
            <p className="text-[10px] text-gray-400">Autoconsumo + excedentes</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold" style={{ color: paybackColor }}>{results.payback.toFixed(1)} años</p>
            <p className="text-xs text-gray-600 font-medium">Amortización</p>
            <p className="text-[10px] text-gray-400">Payback period</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <Leaf className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700">{results.co2.toLocaleString('es-ES')}</p>
            <p className="text-xs text-gray-600 font-medium">kg CO₂ evitado/año</p>
            <p className="text-[10px] text-gray-400">≡ {Math.round(results.co2 / 21)} árboles/año</p>
          </div>
        </div>

        {/* ─── RESULTADOS PVGIS ─────────────────────────────────────────────── */}
        <Card className="mb-4 border-green-200">
          <div className="bg-green-700 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">📊 PVGIS ESTIMACIONES DE PRODUCCIÓN DE ELECTRICIDAD SOLAR</p>
          </div>
          <CardContent className="p-4 space-y-4">
            {/* Info sistema */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
              <p><span className="text-gray-600">PV instalado:</span> <strong>{totalKwp.toFixed(2)} kWp</strong></p>
              <p><span className="text-gray-600">País:</span> <strong>España</strong> · <span className="text-gray-600">Ciudad:</span> <strong>{city || '—'}</strong></p>
              <p><span className="text-gray-600">Dirección:</span> <strong>{address || '—'}</strong></p>
              {lat && <p><span className="text-gray-600">Latitud:</span> <strong>{lat}</strong> · <span className="text-gray-600">Longitud:</span> <strong>{lng || '—'}</strong></p>}
            </div>

            {/* Pérdidas detalladas */}
            <div>
              <p className="font-bold text-sm mb-2">Pérdidas del sistema</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-red-800">Cambio en producción debido a:</p>
                <p>Ángulo de incidencia (%): <strong>{results.perdAngulo.toFixed(2)}</strong></p>
                <p>Efectos espectrales (%): <strong>+{results.perdEspectral.toFixed(2)}</strong></p>
                <p>Baja temperatura e irradiancia (%): <strong>{results.perdTemp.toFixed(3)}</strong></p>
                <p>Pérdidas de cableado, inversor, FV (%): <strong>-{totalPerdidas.toFixed(1)}</strong></p>
                <p className="font-bold text-red-700">Pérdidas totales estimadas (%): <strong>{(Math.abs(results.perdAngulo) + totalPerdidas - results.perdEspectral + Math.abs(results.perdTemp)).toFixed(2)}</strong></p>
              </div>
            </div>

            {/* Producción media */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-amber-50 rounded-lg p-3">
                <p className="text-amber-700 font-bold text-lg">{results.totalKwh.toLocaleString('es-ES')} kWh</p>
                <p className="text-xs text-gray-600">Producción anual FV</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-orange-700 font-bold text-lg">{results.produccionMediaDia} kWh</p>
                <p className="text-xs text-gray-600">Producción media día</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3">
                <p className="text-yellow-700 font-bold text-lg">{results.horasMediaDia} h</p>
                <p className="text-xs text-gray-600">Horas media día producción</p>
              </div>
            </div>
            <p className="text-xs text-gray-500">Variabilidad interanual (%): <strong>{results.variabilidad}%</strong> ({Math.round(results.totalKwh * results.variabilidad / 100)} kWh)</p>
          </CardContent>
        </Card>

        {/* ─── PRODUCCIÓN MENSUAL DE ENERGÍA ────────────────────────────────── */}
        <Card className="mb-4 border-blue-200">
          <div className="bg-blue-700 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">📅 PRODUCCIÓN MENSUAL DE ENERGÍA FOTOVOLTAICA</p>
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-1">Producción anual de energía fotovoltaica: <strong className="text-blue-700">{results.totalKwh.toLocaleString('es-ES')} kWh</strong></p>
            <p className="text-xs text-gray-500 mb-3">Variabilidad año a año: <strong>{results.variabilidad}%</strong> ({Math.round(results.totalKwh * results.variabilidad / 100)} kWh)</p>

            {/* Gráfico barras kWh */}
            <div className="flex items-end gap-1 h-32 mb-2">
              {results.monthly.map((m, i) => {
                const h = Math.round((m.kwh / maxKwh) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <span className="text-[8px] text-gray-600 mb-0.5 font-semibold">{m.kwh}</span>
                    <div className="w-full rounded-t-sm bg-blue-500" style={{ height: `${h}%`, minHeight: 4 }} />
                    <span className="text-[8px] text-gray-500 mt-0.5">{i + 1}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-center text-gray-400 mb-3">Meses</p>

            {/* Tabla mensual kWh */}
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="p-2 text-left">Mes</th>
                  <th className="p-2 text-right">kWh</th>
                  <th className="p-2 text-right">%</th>
                  <th className="p-2 text-right">€ ahorro</th>
                </tr>
              </thead>
              <tbody>
                {results.monthly.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                    <td className="p-2 font-medium">{String(i+1).padStart(2,'0')} - {m.mes}</td>
                    <td className="p-2 text-right font-semibold">{m.kwh.toLocaleString('es-ES')}</td>
                    <td className="p-2 text-right text-gray-500">{m.pctKwh}%</td>
                    <td className="p-2 text-right text-green-700 font-semibold">{Math.round(m.kwh * (autoconsumo/100) * precioKwh)} €</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-700 text-white font-bold">
                  <td className="p-2">TOTAL ANUAL</td>
                  <td className="p-2 text-right">{results.totalKwh.toLocaleString('es-ES')} kWh</td>
                  <td className="p-2 text-right">100%</td>
                  <td className="p-2 text-right">{results.ahorroAnual.toFixed(0)} €</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* ─── HORAS MENSUALES DE PRODUCCIÓN ────────────────────────────────── */}
        <Card className="mb-4 border-amber-200">
          <div className="bg-amber-600 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">⏱️ HORAS MENSUALES DE PRODUCCIÓN</p>
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-3">Horas anuales de producción: <strong className="text-amber-700">{results.totalHoras.toLocaleString('es-ES')} horas</strong> (promedio {results.horasMediaDia} h/día)</p>

            {/* Gráfico horizontal */}
            <div className="space-y-1.5 mb-4">
              {results.monthly.map((m, i) => {
                const maxH = Math.max(...results.monthly.map(x => x.horas));
                const pct = Math.round((m.horas / maxH) * 100);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-gray-500 text-right">{i+1}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="h-4 bg-amber-400 rounded-full flex items-center justify-end pr-1" style={{ width: `${pct}%`, minWidth: 20 }}>
                        <span className="text-[9px] text-white font-bold">{m.horas}</span>
                      </div>
                    </div>
                    <span className="w-10 text-right text-gray-500">{m.horasDia} h/d</span>
                  </div>
                );
              })}
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-amber-600 text-white">
                  <th className="p-2 text-left">Mes</th>
                  <th className="p-2 text-right">Horas/Mes</th>
                  <th className="p-2 text-right">Horas/día</th>
                  <th className="p-2 text-right">kWh/día</th>
                </tr>
              </thead>
              <tbody>
                {results.monthly.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50'}>
                    <td className="p-2 font-medium">{String(i+1).padStart(2,'0')} - {m.mes}</td>
                    <td className="p-2 text-right">{m.horas}</td>
                    <td className="p-2 text-right">{m.horasDia}</td>
                    <td className="p-2 text-right font-semibold text-amber-700">{m.kwhDia}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-600 text-white font-bold">
                  <td className="p-2">TOTAL / MEDIA</td>
                  <td className="p-2 text-right">{results.totalHoras}</td>
                  <td className="p-2 text-right">{results.horasMediaDia}</td>
                  <td className="p-2 text-right">{results.produccionMediaDia}</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* ─── IRRADIACIÓN MENSUAL ───────────────────────────────────────────── */}
        <Card className="mb-4 border-orange-200">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">☀️ IRRADIACIÓN MENSUAL EN PLANO FIJO (kWh/m²)</p>
          </div>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 mb-3">Irradiación anual: <strong className="text-orange-700">{results.totalIrr.toLocaleString('es-ES')} kWh/m²</strong></p>
            {/* Gráfico */}
            <div className="flex items-end gap-1 h-24 mb-2">
              {results.monthly.map((m, i) => {
                const h = Math.round((m.irr / maxIrr) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <span className="text-[7px] text-gray-600 mb-0.5">{m.irr}</span>
                    <div className="w-full rounded-t-sm bg-orange-400" style={{ height: `${h}%`, minHeight: 4 }} />
                    <span className="text-[8px] text-gray-500 mt-0.5">{i+1}</span>
                  </div>
                );
              })}
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-orange-600 text-white">
                  <th className="p-2 text-left">Mes</th>
                  <th className="p-2 text-right">kWh/m²</th>
                  <th className="p-2 text-right">%</th>
                </tr>
              </thead>
              <tbody>
                {results.monthly.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                    <td className="p-2 font-medium">{String(i+1).padStart(2,'0')} - {m.mes}</td>
                    <td className="p-2 text-right font-semibold">{m.irr}</td>
                    <td className="p-2 text-right text-gray-500">{m.pctIrr}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-orange-600 text-white font-bold">
                  <td className="p-2">TOTAL ANUAL</td>
                  <td className="p-2 text-right">{results.totalIrr} kWh/m²</td>
                  <td className="p-2 text-right">100%</td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* ─── SIMULACIÓN FINANCIERA ────────────────────────────────────────── */}
        <Card className="mb-4 border-green-200">
          <div className="bg-green-700 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">💶 SIMULACIÓN FINANCIERA</p>
          </div>
          <CardContent className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <table className="w-full text-xs border-collapse">
                <tbody>
                  <tr className="border-b"><td className="p-2 text-gray-600">Producción anual estimada</td><td className="p-2 text-right font-semibold">{results.totalKwh.toLocaleString('es-ES')} kWh</td></tr>
                  <tr className="border-b bg-green-50"><td className="p-2 text-gray-600">Autoconsumo ({autoconsumo}%)</td><td className="p-2 text-right font-bold text-green-700">{results.autoconsumoKwh.toFixed(0)} kWh</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-600">Ahorro por autoconsumo</td><td className="p-2 text-right font-bold text-green-700">{results.ahorroAnual.toFixed(0)} €/año</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-600">Compensación excedentes</td><td className="p-2 text-right">{results.excedentes.toFixed(0)} €/año</td></tr>
                  <tr className="border-b bg-blue-50"><td className="p-2 font-bold text-blue-800">Beneficio total anual</td><td className="p-2 text-right font-bold text-blue-700">{results.beneficioAnual.toFixed(0)} €/año</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-600">Inversión estimada</td><td className="p-2 text-right text-red-600 font-semibold">{results.coste.toLocaleString('es-ES')} €</td></tr>
                  <tr className="border-b bg-amber-50"><td className="p-2 font-bold text-amber-800">Período de amortización</td><td className="p-2 text-right font-bold" style={{color: paybackColor}}>{results.payback.toFixed(1)} años</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-600">Cobertura consumo</td><td className="p-2 text-right font-semibold text-purple-700">{results.cobertura}%</td></tr>
                  <tr><td className="p-2 text-gray-600">CO₂ evitado / año</td><td className="p-2 text-right font-semibold text-emerald-700">{results.co2.toLocaleString('es-ES')} kg</td></tr>
                </tbody>
              </table>
              {/* Amortización visual */}
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Curva de amortización ({vidaUtil} años)</p>
                <div className="flex items-end gap-0.5 h-24">
                  {Array.from({ length: Math.min(vidaUtil, 30) }, (_, i) => {
                    const acum = (i + 1) * results.beneficioAnual;
                    const saldo = acum - results.coste;
                    const maxSaldo = vidaUtil * results.beneficioAnual - results.coste;
                    const minSaldo = -results.coste;
                    const pct = ((saldo - minSaldo) / (maxSaldo - minSaldo)) * 100;
                    return (
                      <div key={i} className="flex-1 rounded-t-sm" style={{
                        height: `${Math.max(2, pct * 0.92)}px`,
                        background: saldo >= 0 ? '#16a34a' : '#ef4444',
                        minHeight: 2,
                      }} title={`Año ${i+1}: ${saldo >= 0 ? '+' : ''}${Math.round(saldo)} €`} />
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm inline-block"></span>Pérdidas</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-600 rounded-sm inline-block"></span>Amortizado</span>
                </div>
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Ahorro acumulado en {vidaUtil} años</p>
                  <p className="text-xl font-bold text-green-700">{Math.round(vidaUtil * results.beneficioAnual).toLocaleString('es-ES')} €</p>
                  <p className="text-xs text-gray-500">Beneficio neto: {Math.round(vidaUtil * results.beneficioAnual - results.coste).toLocaleString('es-ES')} €</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Footer ───────────────────────────────────────────────────────── */}
        <div className="flex justify-between items-center text-xs text-gray-400 pt-3 border-t border-gray-200 mt-4">
          <span>Generado el {new Date().toLocaleDateString('es-ES')}</span>
          <span className="font-semibold text-gray-600">INFORME SOLAR PVGIS PROFESIONAL — {projectName}</span>
          <span>Estimaciones basadas en PVGIS-SARAH3</span>
        </div>
      </div>
    </div>
  );
}