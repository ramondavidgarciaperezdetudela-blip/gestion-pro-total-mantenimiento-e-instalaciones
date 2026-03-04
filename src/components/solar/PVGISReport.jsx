import React, { useState, useMemo, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Mail, MessageCircle, Sun, Euro, Clock, Leaf, MapPin, Search, Navigation, Info, Save, CheckCircle, UserCheck, Users } from 'lucide-react';
import CompanyHeader from '../CompanyHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// Fix Leaflet marker
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Datos irradiación por zona ────────────────────────────────────────────────
const ZONAS = {
  norte:    { label: 'Norte (Galicia, Asturias, País Vasco)', lat: 43, hsp_base: 3.8, monthly_irr: [45,55,80,110,140,155,165,155,115,80,50,40] },
  centro:   { label: 'Centro (Madrid, Castilla, Aragón)', lat: 40, hsp_base: 4.8, monthly_irr: [60,75,110,140,175,195,210,195,155,105,65,50] },
  sur:      { label: 'Sur (Andalucía, Murcia)', lat: 37, hsp_base: 5.5, monthly_irr: [75,90,125,160,195,215,225,210,175,130,80,65] },
  levante:  { label: 'Levante (Valencia, Cataluña)', lat: 41, hsp_base: 5.0, monthly_irr: [65,80,115,145,180,200,215,200,160,110,68,55] },
  canarias: { label: 'Canarias', lat: 28, hsp_base: 5.8, monthly_irr: [115,130,160,185,205,210,210,205,190,160,125,110] },
  baleares: { label: 'Baleares', lat: 39, hsp_base: 5.2, monthly_irr: [70,85,118,150,185,205,218,205,165,115,72,60] },
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const MONTAJES = [
  { value: '1seccion', label: 'Sistema superpuesto una sección', tilt: 30 },
  { value: 'integrado', label: 'Sistema integrado en techo', tilt: 25 },
  { value: 'triangular', label: 'Sistema triangular en techo plano', tilt: 15 },
  { value: '2secciones', label: 'Sistema superpuesto dos secciones', tilt: 22 },
  { value: 'eo_plano', label: 'Sistema Este-Oeste sobre cubierta plana', tilt: 10 },
  { value: 'ns_plano', label: 'Sistema Norte-Sur sobre cubierta plana', tilt: 10 },
  { value: '3secciones', label: 'Sistema en techo tres secciones', tilt: 20 },
  { value: '4secciones', label: 'Sistema en techo cuatro secciones', tilt: 18 },
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

function getAzimutFactor(deg) {
  const abs = Math.abs(deg);
  if (abs <= 15) return 1.0; if (abs <= 30) return 0.99; if (abs <= 45) return 0.97;
  if (abs <= 60) return 0.94; if (abs <= 75) return 0.90; if (abs <= 90) return 0.85;
  if (abs <= 120) return 0.75; if (abs <= 150) return 0.65; return 0.55;
}
function getTiltFactor(tilt, lat) {
  const opt = Math.round(lat * 0.87 - 1.5);
  const diff = Math.abs(tilt - opt);
  if (diff <= 5) return 1.0; if (diff <= 10) return 0.98; if (diff <= 20) return 0.95;
  if (diff <= 30) return 0.89; if (diff <= 45) return 0.80; return 0.70;
}
const SEASONAL = [0.55, 0.62, 0.82, 1.02, 1.13, 1.23, 1.28, 1.22, 1.03, 0.83, 0.58, 0.48];

// ─── Componente clic en mapa ────────────────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

// ─── Componente para mover la vista del mapa ─────────────────────────────────
function FlyToLocation({ center, zoom = 16 }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, { animate: true, duration: 1 });
    }
  }, [center[0], center[1]]);
  return null;
}

export default function PVGISReport({ totalKwp = 3.2, numPanels = 8, panelW = 400, contactName = '', contactId = '' }) {
  const printRef = useRef(null);
  const [mapKey, setMapKey] = useState(0);

  // ─── Geolocalización ───────────────────────────────────────────────────────
  const [locMode, setLocMode] = useState('direccion');
  const [street, setStreet] = useState('');
  const [streetNum, setStreetNum] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('España');
  const [refCatastral, setRefCatastral] = useState('');
  const [lat, setLat] = useState(40.416775);
  const [lng, setLng] = useState(-3.703790);
  const [markerPos, setMarkerPos] = useState([40.416775, -3.703790]);
  const [mapCenter, setMapCenter] = useState([40.416775, -3.703790]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ─── Datos proyecto ────────────────────────────────────────────────────────
  const [projectName, setProjectName] = useState('Proyecto Solar');
  const [clientName, setClientName] = useState(contactName || '');
  const [selectedContactId, setSelectedContactId] = useState(contactId || '');
  const [zona, setZona] = useState('centro');
  const [contacts, setContacts] = useState([]);

  // ─── Guardar en cliente ────────────────────────────────────────────────────
  const [savedDocId, setSavedDocId] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    base44.entities.Contact.list().then(setContacts);
  }, []);

  useEffect(() => {
    if (contactName) setClientName(contactName);
  }, [contactName]);

  useEffect(() => {
    if (contactId) setSelectedContactId(contactId);
  }, [contactId]);

  // ─── Sistema ───────────────────────────────────────────────────────────────
  const [montaje, setMontaje] = useState('1seccion');
  const [tilt, setTilt] = useState('');
  const [azimuth, setAzimuth] = useState('0');
  const [perdidaCable, setPerdidaCable] = useState(1);
  const [perdidaInversor, setPerdidaInversor] = useState(2);
  const [perdidaPV, setPerdidaPV] = useState(0.5);

  // ─── Económicos ────────────────────────────────────────────────────────────
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

  // ─── Código postal autorellenable ──────────────────────────────────────────
  const [postalCode, setPostalCode] = useState('');
  const [postalLoading, setPostalLoading] = useState(false);
  const [catastralLoading, setCatastralLoading] = useState(false);
  const [catastralNotFound, setCatastralNotFound] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityInputFocused, setCityInputFocused] = useState(false);
  const citySearchTimerRef = useRef(null);
  const autoSearchTimerRef = useRef(null);

  const fetchPostalCode = async (cityName, countryName) => {
    if (!cityName || cityName.length < 3) return;
    setPostalLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName + ', ' + (countryName || 'España'))}&limit=1&addressdetails=1`);
      const data = await res.json();
      if (data.length > 0 && data[0].address?.postcode) {
        setPostalCode(data[0].address.postcode);
      }
    } catch(e) {}
    setPostalLoading(false);
  };

  // ─── Auto-actualizar mapa al cambiar dirección (debounce 1.2s) ─────────────
  const triggerAutoSearch = (newStreet, newNum, newCity, newPostal, newCountry) => {
    if (autoSearchTimerRef.current) clearTimeout(autoSearchTimerRef.current);
    const query = [newStreet, newNum, newPostal, newCity, newCountry].filter(Boolean).join(', ');
    if (!query || query.trim().length < 5) return;
    autoSearchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`);
        const data = await res.json();
        if (data.length > 0) {
          const newLat = parseFloat(data[0].lat);
          const newLng = parseFloat(data[0].lon);
          setLat(newLat); setLng(newLng);
          setMarkerPos([newLat, newLng]);
          setMapCenter([newLat, newLng]);
          setMapKey(k => k + 1);
          if (data[0].address?.postcode && !newPostal) setPostalCode(data[0].address.postcode);
        }
      } catch(e) {}
    }, 1200);
  };

  // ─── Buscar referencia catastral por coordenadas ─────────────────────────
  const fetchRefCatastral = async (streetVal, numVal, cityVal, postalVal, latOverride, lngOverride) => {
    setCatastralLoading(true);
    setCatastralNotFound(false);
    try {
      let latC, lngC;
      if (latOverride && lngOverride) {
        latC = parseFloat(latOverride).toFixed(6);
        lngC = parseFloat(lngOverride).toFixed(6);
      } else {
        if (!streetVal || !numVal || !cityVal) { setCatastralLoading(false); return; }
        const query = [streetVal, numVal, postalVal, cityVal, 'España'].filter(Boolean).join(', ');
        const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=es`);
        const nomData = await nomRes.json();
        if (!nomData.length) { setCatastralLoading(false); setCatastralNotFound(true); return; }
        latC = parseFloat(nomData[0].lat).toFixed(6);
        lngC = parseFloat(nomData[0].lon).toFixed(6);
      }

      // Consultar catastro por coordenadas (endpoint JSON público, solo España)
      const rcUrl = `https://ovc.catastro.meh.es/OVCServWeb/OVCWcfLibres/OVCCoordenadas.svc/json/Consulta_RCCOOR?SRS=EPSG:4326&Coordenada_X=${lngC}&Coordenada_Y=${latC}`;
      const rcRes = await fetch(rcUrl);
      if (!rcRes.ok) { setCatastralLoading(false); setCatastralNotFound(true); return; }
      const rcData = await rcRes.json();

      const coord = rcData?.consulta_coordenadas?.coordenadas?.coord;
      const first = Array.isArray(coord) ? coord[0] : coord;
      const pc1 = first?.pc?.pc1;
      const pc2 = first?.pc?.pc2;
      if (pc1 && pc2) {
        setRefCatastral((pc1 + pc2).trim());
        setCatastralNotFound(false);
      } else {
        setCatastralNotFound(true);
      }
    } catch(e) {
      setCatastralNotFound(true);
    }
    setCatastralLoading(false);
  };

  // ─── Búsqueda por dirección (manual) ─────────────────────────────────────
  const searchAddress = async () => {
    const query = [street, streetNum, postalCode, city, country].filter(Boolean).join(', ');
    if (!query.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`);
      const data = await res.json();
      if (data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat); setLng(newLng);
        setMarkerPos([newLat, newLng]);
        setMapCenter([newLat, newLng]);
        if (data[0].address?.postcode && !postalCode) setPostalCode(data[0].address.postcode);
      }
    } catch(e) {}
    setSearchLoading(false);
    // Buscar ref catastral automáticamente (solo si es España)
    if (country.toLowerCase().includes('espa')) fetchRefCatastral(street, streetNum, city, postalCode);
  };

  const searchCatastral = async () => {
    if (!refCatastral.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(refCatastral + ', España')}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat); setLng(newLng);
        setMarkerPos([newLat, newLng]);
        setMapCenter([newLat, newLng]);
        setMapKey(k => k + 1);
      }
    } catch(e) {}
    setSearchLoading(false);
  };

  const getGeoLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const newLat = pos.coords.latitude;
      const newLng = pos.coords.longitude;
      setLat(newLat); setLng(newLng);
      setMarkerPos([newLat, newLng]);
      setMapCenter([newLat, newLng]);
      setMapKey(k => k + 1);
    });
  };

  const handleMapClick = (newLat, newLng) => {
    setLat(newLat); setLng(newLng);
    setMarkerPos([newLat, newLng]);
  };

  // ─── Cálculos PVGIS ────────────────────────────────────────────────────────
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
      return { mes, kwh, irr, horas, kwhDia, horasDia, diasMes };
    });
    const totalKwh = monthly.reduce((s, m) => s + m.kwh, 0);
    const totalHoras = monthly.reduce((s, m) => s + m.horas, 0);
    const totalIrr = monthly.reduce((s, m) => s + m.irr, 0);
    const monthlyFinal = monthly.map(m => ({
      ...m, pctKwh: ((m.kwh / totalKwh) * 100).toFixed(2),
      pctIrr: ((m.irr / totalIrr) * 100).toFixed(2),
    }));
    const produccionMediaDia = (totalKwh / 365).toFixed(2);
    const horasMediaDia = (totalHoras / 365).toFixed(2);
    const variabilidad = 3.56;
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
      monthly: monthlyFinal, totalKwh, totalHoras, totalIrr,
      produccionMediaDia, horasMediaDia, variabilidad,
      coste, costeEst, ahorroAnual, excedentes, beneficioAnual, payback, co2, cobertura, autoconsumoKwh,
    };
  }, [zona, montaje, tiltAngle, azimuthDeg, totalPerdidas, totalKwp, precioKwh, costeInstalacion, consumoAnual, autoconsumo]);

  const paybackColor = results.payback < 8 ? '#16a34a' : results.payback < 12 ? '#d97706' : '#dc2626';
  const address = [streetNum, street].filter(Boolean).join(' ');

  // ─── Guardar informe PVGIS en ficha de cliente ──────────────────────────────
  const saveToClient = async () => {
    const cId = selectedContactId || contactId;
    const cName = clientName || contactName;
    if (!cId) return;
    const desc = `Informe PVGIS: ${totalKwp.toFixed(2)} kWp · ${results.totalKwh.toLocaleString('es-ES')} kWh/año · Payback ${results.payback.toFixed(1)} años · ${[streetNum, street, city].filter(Boolean).join(', ')}`;
    const docData = {
      contact_id: cId,
      contact_name: cName,
      title: `Informe PVGIS — ${projectName} — ${new Date().toLocaleDateString('es-ES')}`,
      doc_type: 'calculo_solar',
      date: new Date().toISOString().slice(0, 10),
      description: desc,
    };
    if (savedDocId) {
      await base44.entities.ClientDocument.update(savedDocId, docData);
    } else {
      const rec = await base44.entities.ClientDocument.create(docData);
      setSavedDocId(rec.id);
    }
    setSavedMsg(savedDocId ? '¡Informe actualizado en la ficha!' : '¡Informe guardado en la ficha del cliente!');
    setTimeout(() => setSavedMsg(''), 4000);
  };

  // ─── Print ─────────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    let cfg = {};
    try { const s = await base44.entities.CompanySettings.list(); if (s.length > 0) cfg = s[0].printer_config || {}; } catch(e){}
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe PVGIS — ${projectName}</title>
    <style>
      @page{size:A4 portrait;margin:${cfg.margin_top||15}mm ${cfg.margin_right||15}mm ${cfg.margin_bottom||15}mm ${cfg.margin_left||15}mm}
      *{box-sizing:border-box} body{font-family:'Segoe UI',Arial,sans-serif;font-size:9px;color:#1a1a2e;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      h1{font-size:16px;font-weight:700;margin:0 0 4px} h2{font-size:11px;font-weight:700;margin:6px 0 4px;color:#1e3a5f}
      .hdr{background:linear-gradient(135deg,#1e3a5f,#0ea5e9);color:white;padding:10px 14px;border-radius:6px;margin-bottom:10px;display:flex;align-items:center;gap:10px}
      .kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}
      .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:5px;padding:6px;text-align:center}
      .kpi .val{font-size:14px;font-weight:700;color:#1e3a5f} .kpi .lbl{font-size:7px;color:#64748b}
      table{width:100%;border-collapse:collapse;margin:5px 0;font-size:7.5px}
      thead tr{background:#1e3a5f;color:white} thead th{padding:4px 5px;text-align:left;font-weight:600}
      tbody tr:nth-child(even){background:#f8fafc} tbody td{padding:3px 5px;border-bottom:1px solid #e2e8f0}
      tfoot tr{background:#1e3a5f;color:white;font-weight:700} tfoot td{padding:4px 5px}
      .section{border:1px solid #e2e8f0;border-radius:5px;margin:6px 0;overflow:hidden;page-break-inside:avoid}
      .stitle{background:#f1f5f9;border-left:4px solid #0ea5e9;padding:4px 8px;font-weight:700;font-size:9px;color:#1e3a5f}
      .info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4px;padding:8px;font-size:8px}
      .info-item span{display:block;color:#64748b;font-size:7px} .info-item strong{font-size:9px}
      .no-print,button,[role=button]{display:none!important}
      .bar-row{display:flex;align-items:center;gap:4px;margin:2px 0}
      .bar-fill{height:12px;border-radius:2px}
      @media print{body{-webkit-print-color-adjust:exact}}
    </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 800);
  };

  const shareText = `*Informe Solar PVGIS — ${projectName}*\n📍 ${address} ${city} ${country}\n⚡ ${totalKwp.toFixed(2)} kWp · ${numPanels} paneles × ${panelW}W\n🌞 Producción anual: *${results.totalKwh.toLocaleString('es-ES')} kWh/año*\n💶 Ahorro estimado: *${results.beneficioAnual.toFixed(0)} €/año*\n⏱ Payback: *${results.payback.toFixed(1)} años*\n🌱 CO₂ evitado: ${results.co2} kg/año`;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center justify-between">
        <div className="flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold">CALCULADORA SOLAR PVGIS PROFESIONAL</h2>
          <Badge className="bg-amber-100 text-amber-700 text-xs">Tiempo real</Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Imprimir / PDF</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`mailto:?subject=Informe Solar ${projectName}&body=${encodeURIComponent(shareText)}`)}><Mail className="w-4 h-4 mr-1" />Email</Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')}><MessageCircle className="w-4 h-4 mr-1" />WhatsApp</Button>
        </div>
      </div>

      {/* ─── Vincular a cliente + guardar ─── */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <Users className="w-5 h-5 text-green-700 flex-shrink-0" />
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-green-800 font-semibold block mb-1">Vincular informe a cliente</label>
            <Select value={selectedContactId} onValueChange={v => {
              setSelectedContactId(v);
              const c = contacts.find(co => co.id === v);
              if (c) setClientName(`${c.name} ${c.surname || ''}`.trim());
              setSavedDocId(null);
            }}>
              <SelectTrigger className="h-8 text-xs bg-white"><SelectValue placeholder="Seleccionar cliente..." /></SelectTrigger>
              <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button
            onClick={saveToClient}
            disabled={!selectedContactId && !contactId}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            {savedDocId ? 'Actualizar en ficha' : 'Guardar en ficha cliente'}
          </Button>
          {savedMsg && (
            <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />{savedMsg}
            </span>
          )}
          {selectedContactId && !savedMsg && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <UserCheck className="w-4 h-4" />Vinculado: <strong>{clientName}</strong>
            </span>
          )}
        </CardContent>
      </Card>

      {/* ═══ SECCIÓN 1: GEOLOCALIZACIÓN ═══ */}
      <Card className="border-blue-300">
        <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          <span className="font-bold">GEOLOCALIZACIÓN</span>
        </div>
        <CardContent className="p-0">
          {/* Mapa satelital */}
          <div className="h-72 relative" style={{ zIndex: 0 }}>
            <MapContainer center={mapCenter} zoom={16} style={{ height: '100%', width: '100%' }} zoomControl={true}>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles © Esri — Source: Esri, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP'
              />
              <Marker position={markerPos} />
              <MapClickHandler onMapClick={handleMapClick} />
              <FlyToLocation center={mapCenter} zoom={17} />
            </MapContainer>
            <div className="absolute bottom-2 right-2 z-[1000] bg-white/90 rounded-lg shadow px-2 py-1 text-[10px] text-gray-600">
              Haz clic en el mapa para mover el marcador
            </div>
          </div>

          {/* Formulario localización */}
          <div className="p-4 border-t border-blue-100">
            <p className="text-sm font-semibold text-gray-700 mb-3">Ubicación de producción</p>
            {/* Modo búsqueda */}
            <div className="flex gap-3 mb-3">
              {['direccion','gps','catastral'].map(m => (
                <label key={m} className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input type="radio" name="locMode" value={m} checked={locMode === m} onChange={() => setLocMode(m)} className="accent-blue-600" />
                  <span className="font-medium capitalize">
                    {m === 'direccion' ? 'Dirección' : m === 'gps' ? 'Coordenadas GPS' : 'Ref. Catastral'}
                  </span>
                </label>
              ))}
            </div>

            {locMode === 'direccion' && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500">Calle / Vía</label>
                    <Input value={street} onChange={e => { setStreet(e.target.value); triggerAutoSearch(e.target.value, streetNum, city, postalCode, country); }} className="mt-1 h-8 text-xs" placeholder="Nombre de la calle" onKeyDown={e => e.key === 'Enter' && searchAddress()} />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs text-gray-500">Número</label>
                    <Input value={streetNum} onChange={e => { setStreetNum(e.target.value); triggerAutoSearch(street, e.target.value, city, postalCode, country); }} className="mt-1 h-8 text-xs" placeholder="Nº" onKeyDown={e => e.key === 'Enter' && searchAddress()} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500">Ciudad / Municipio</label>
                    <Input value={city} onChange={e => {
                      setCity(e.target.value);
                      if (e.target.value.length >= 3) fetchPostalCode(e.target.value, country);
                      triggerAutoSearch(street, streetNum, e.target.value, postalCode, country);
                    }} className="mt-1 h-8 text-xs" placeholder="Ciudad" onKeyDown={e => e.key === 'Enter' && searchAddress()} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 flex items-center gap-1">
                      C. Postal {postalLoading && <span className="text-[9px] text-blue-500 animate-pulse">buscando...</span>}
                    </label>
                    <Input value={postalCode} onChange={e => { setPostalCode(e.target.value); triggerAutoSearch(street, streetNum, city, e.target.value, country); }} className="mt-1 h-8 text-xs" placeholder="00000" onKeyDown={e => e.key === 'Enter' && searchAddress()} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">País</label>
                    <Input value={country} onChange={e => { setCountry(e.target.value); triggerAutoSearch(street, streetNum, city, postalCode, e.target.value); }} className="mt-1 h-8 text-xs" onKeyDown={e => e.key === 'Enter' && searchAddress()} />
                  </div>
                  <div>
                   <label className="text-xs text-gray-500 flex items-center gap-1">
                     Ref. Catastral {catastralLoading && <span className="text-[9px] text-orange-500 animate-pulse">buscando...</span>}
                   </label>
                   <Input value={refCatastral} onChange={e => { setRefCatastral(e.target.value); setCatastralNotFound(false); }} className="mt-1 h-8 text-xs" placeholder="Auto (buscar al confirmar)" />
                   {catastralNotFound && !catastralLoading && (
                     <div className="mt-1 p-2 bg-orange-50 border border-orange-200 rounded text-[10px] text-orange-700">
                       No encontrada automáticamente.{' '}
                       <a href="https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?buscar=S" target="_blank" rel="noopener noreferrer" className="font-semibold underline text-orange-800 hover:text-orange-900">
                         Búscala manualmente aquí →
                       </a>
                       {' '}y pégala en el campo.
                     </div>
                   )}
                  </div>
                </div>
                <Button onClick={searchAddress} disabled={searchLoading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  <Search className="w-4 h-4 mr-1" />{searchLoading ? 'Buscando...' : 'CONFIRMAR Y OBTENER REF. CATASTRAL'}
                </Button>
              </div>
            )}

            {locMode === 'gps' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Latitud</label>
                    <Input type="number" step="0.000001" value={lat} onChange={e => { setLat(parseFloat(e.target.value)); }} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Longitud</label>
                    <Input type="number" step="0.000001" value={lng} onChange={e => { setLng(parseFloat(e.target.value)); }} className="mt-1 h-8 text-xs" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { setMarkerPos([parseFloat(lat), parseFloat(lng)]); setMapCenter([parseFloat(lat), parseFloat(lng)]); setMapKey(k => k+1); }} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white flex-1">
                    <MapPin className="w-4 h-4 mr-1" />Ir a coordenadas
                  </Button>
                  <Button onClick={getGeoLocation} variant="outline" size="sm" className="flex-1">
                    <Navigation className="w-4 h-4 mr-1" />Usar mi ubicación
                  </Button>
                </div>
              </div>
            )}

            {locMode === 'catastral' && (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Referencia Catastral</label>
                  <Input value={refCatastral} onChange={e => setRefCatastral(e.target.value)} className="mt-1 h-8 text-xs" placeholder="Ej: 0507101VK4700S0001OA" onKeyDown={e => e.key === 'Enter' && searchCatastral()} />
                  <p className="text-[10px] text-gray-400 mt-1">Consulta en <a href="https://www.sedecatastro.gob.es" target="_blank" className="text-blue-500 underline">sedecatastro.gob.es</a></p>
                </div>
                <Button onClick={searchCatastral} disabled={searchLoading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  <Search className="w-4 h-4 mr-1" />{searchLoading ? 'Buscando...' : 'BUSCAR POR REFERENCIA CATASTRAL'}
                </Button>
              </div>
            )}

            {/* Info GPS actual */}
            <div className="mt-3 bg-blue-50 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-500">Latitud GPS:</span> <strong>{typeof lat === 'number' ? lat.toFixed(6) : lat}</strong></div>
              <div><span className="text-gray-500">Longitud GPS:</span> <strong>{typeof lng === 'number' ? lng.toFixed(6) : lng}</strong></div>
              {refCatastral
                ? <div className="col-span-2"><span className="text-gray-500">Ref. Catastral:</span> <strong>{refCatastral}</strong></div>
                : <div className="col-span-2 text-orange-600 text-[10px]">
                    Sin ref. catastral —{' '}
                    <a href="https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?buscar=S" target="_blank" rel="noopener noreferrer" className="underline font-semibold">buscar manualmente →</a>
                  </div>
              }
              <div className="col-span-2">
                <a href={refCatastral ? `https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?buscar=S&refcat=${refCatastral}` : `https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?buscar=S`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-[10px]">
                  🔗 Ver en Catastro
                </a>
                {' · '}
                <a href={`https://maps.google.com/maps?q=${lat},${lng}&z=19`} target="_blank" className="text-blue-600 hover:underline text-[10px]">
                  🔗 Ver en Google Maps
                </a>
              </div>
            </div>

            {/* Nombre proyecto */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Nombre del proyecto</label>
                <Input value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-1 h-8 text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cliente</label>
                <Input value={clientName} onChange={e => setClientName(e.target.value)} className="mt-1 h-8 text-xs" placeholder={contactName || 'Nombre cliente'} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ SECCIÓN 2: INFORMACIÓN DEL SISTEMA ═══ */}
      <Card className="border-amber-300">
        <div className="bg-amber-600 text-white px-4 py-3 rounded-t-lg flex items-center gap-2">
          <Info className="w-5 h-5" />
          <span className="font-bold">INFORMACIÓN DEL SISTEMA</span>
        </div>
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Simulaciones de rendimiento de sistemas fotovoltaicos cristalinos conectados a la red pública instalados en tejados</p>
          <p className="text-xs text-gray-500 font-medium">PROYECTO SOLAR "<em>{projectName}</em>"</p>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500">Posición de montaje</label>
                <Select value={montaje} onValueChange={setMontaje}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTAJES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-500">Zona geográfica (para irradiación)</label>
                <Select value={zona} onValueChange={setZona}>
                  <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(ZONAS).map(([k,v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="bg-amber-50 rounded-lg p-2 text-xs">
                <p className="font-semibold text-amber-800 mb-1">Potencia fotovoltaica instalada pico (kWp)</p>
                <p className="text-2xl font-bold text-amber-700">{totalKwp.toFixed(2)} <span className="text-sm">kWp</span></p>
                <p className="text-gray-500 mt-0.5">{numPanels} paneles × {panelW}W · Silicio Cristalino · PVGIS-SARAH3</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">Pendiente (°) <span className="text-blue-500">ópt: {optTilt}°</span></label>
                  <Input type="number" value={tilt} onChange={e => setTilt(e.target.value)} placeholder={`${montajeData.tilt}° (auto)`} className="mt-1 h-8 text-xs" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Azimut</label>
                  <Select value={azimuth} onValueChange={setAzimuth}>
                    <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{AZIMUTHS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Pérdida del sistema (%)</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div><label className="text-[10px] text-gray-400">Cable (%)</label><Input type="number" value={perdidaCable} onChange={e => setPerdidaCable(parseFloat(e.target.value)||1)} className="h-7 text-xs" /></div>
                  <div><label className="text-[10px] text-gray-400">Inversor (%)</label><Input type="number" value={perdidaInversor} onChange={e => setPerdidaInversor(parseFloat(e.target.value)||2)} className="h-7 text-xs" /></div>
                  <div><label className="text-[10px] text-gray-400">FV (%)</label><Input type="number" value={perdidaPV} onChange={e => setPerdidaPV(parseFloat(e.target.value)||0.5)} className="h-7 text-xs" /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500">Precio kWh (€)</label><Input type="number" step="0.01" value={precioKwh} onChange={e => setPrecioKwh(parseFloat(e.target.value)||0.18)} className="mt-1 h-8 text-xs" /></div>
                <div><label className="text-xs text-gray-500">Coste instalación (€)</label><Input type="number" value={costeInstalacion} onChange={e => setCosteInstalacion(e.target.value)} placeholder={`${results.costeEst} €`} className="mt-1 h-8 text-xs" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-500">Consumo anual (kWh)</label><Input type="number" value={consumoAnual} onChange={e => setConsumoAnual(parseFloat(e.target.value)||4500)} className="mt-1 h-8 text-xs" /></div>
                <div><label className="text-xs text-gray-500">Autoconsumo (%)</label><Input type="number" value={autoconsumo} onChange={e => setAutoconsumo(parseFloat(e.target.value)||70)} className="mt-1 h-8 text-xs" /></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ INFORME IMPRIMIBLE ═══ */}
      <div ref={printRef} className="space-y-4">

        {/* Header empresa */}
        <CompanyHeader />

        {/* Encabezado PVGIS */}
        <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[#1e3a5f] to-[#0ea5e9] text-white p-5">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl"><Sun className="w-8 h-8 text-amber-300" /></div>
            <div className="flex-1">
              <p className="text-xs text-white/70 uppercase tracking-wider">Sistema de Información Geográfica Fotovoltaica · PVGIS24</p>
              <h1 className="text-xl font-bold mt-0.5">CALCULADORA SOLAR PVGIS PROFESIONAL</h1>
              <p className="text-sm text-white/80 mt-0.5">Base de datos utilizada: <strong>PVGIS-SARAH3</strong> · Tecnología FV: <strong>SILICIO CRISTALINO</strong></p>
            </div>
            <div className="text-right text-xs text-white/70">
              <p>{new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold text-white text-sm">{projectName}</p>
            </div>
          </div>
        </div>

        {/* RESULTADOS: Geolocalización */}
        <Card className="border-blue-200">
          <div className="bg-blue-600 text-white px-4 py-2 flex items-center gap-2 rounded-t-lg">
            <MapPin className="w-4 h-4" /><span className="font-bold text-sm">RESULTADOS "{projectName.toUpperCase()}"</span>
          </div>
          <CardContent className="p-0">
            <div className="p-3 bg-blue-50 border-b border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-2">Geolocalización del sistema fotovoltaico</p>
            </div>
            {/* Mapa en el informe (solo pantalla, no print) */}
            <div className="h-64 no-print" style={{ zIndex: 0 }}>
              <MapContainer center={mapCenter} zoom={17} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={false} dragging={false}>
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="" />
                <Marker position={markerPos} />
                <FlyToLocation center={mapCenter} zoom={17} />
              </MapContainer>
            </div>
            {/* Info geolocalización */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <div><span className="text-xs text-gray-500 block">PV instalado</span><strong>{totalKwp.toFixed(2)} kWp</strong></div>
              <div><span className="text-xs text-gray-500 block">País</span><strong>{country}</strong></div>
              <div><span className="text-xs text-gray-500 block">Ciudad</span><strong>{city || '—'}</strong></div>
              <div><span className="text-xs text-gray-500 block">Dirección</span><strong>{address || '—'}</strong></div>
              <div><span className="text-xs text-gray-500 block">Latitud</span><strong>{typeof lat === 'number' ? lat.toFixed(4) : lat}</strong></div>
              <div><span className="text-xs text-gray-500 block">Longitud</span><strong>{typeof lng === 'number' ? lng.toFixed(4) : lng}</strong></div>
              {refCatastral && <div className="col-span-2"><span className="text-xs text-gray-500 block">Ref. Catastral</span><strong>{refCatastral}</strong></div>}
              <div><span className="text-xs text-gray-500 block">Cliente</span><strong>{clientName || '—'}</strong></div>
              <div><span className="text-xs text-gray-500 block">Horizonte</span><strong>Calculado (PVGIS-24 predeterminado)</strong></div>
            </div>
            <div className="px-4 pb-3 bg-gray-50 rounded-b-lg text-xs text-gray-500">
              <p>PVGIS-SARAH3 proporciona información sobre la radiación solar y el rendimiento del sistema fotovoltaico para cualquier lugar del mundo excepto los polos norte y sur.</p>
            </div>
          </CardContent>
        </Card>

        {/* Sistema info + pérdidas */}
        <Card className="border-amber-200">
          <div className="bg-amber-600 text-white px-4 py-2 rounded-t-lg">
            <span className="font-bold text-sm">ℹ️ INFORMACIÓN DEL SISTEMA — "{projectName}"</span>
          </div>
          <CardContent className="p-4 space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1.5">
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Sistema de montaje:</span><strong>{montajeData.label}</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Potencia FV instalada:</span><strong>{totalKwp.toFixed(2)} kWp</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Pendiente:</span><strong>{tiltAngle}° {tilt === '' ? '(Óptima optimizada)' : ''}</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Azimut:</span><strong>{AZIMUTHS.find(a => a.value === azimuth)?.label || 'Sur'}</strong></div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Tecnología FV:</span><strong>Silicio Cristalino</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Base de datos:</span><strong>PVGIS-SARAH3</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Variabilidad interanual:</span><strong>{results.variabilidad}%</strong></div>
                <div className="flex justify-between border-b pb-1"><span className="text-gray-600">Pérdidas totales sistema:</span><strong>{totalPerdidas.toFixed(1)}%</strong></div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs">
              <p className="font-bold text-red-700 mb-1.5">Pérdida del sistema (%)</p>
              <div className="grid grid-cols-3 gap-3">
                <div><span className="text-gray-500">Pérdida cable:</span><br/><strong className="text-red-700">{perdidaCable}%</strong></div>
                <div><span className="text-gray-500">Pérdida inversor:</span><br/><strong className="text-red-700">{perdidaInversor}%</strong></div>
                <div><span className="text-gray-500">Pérdida fotovoltaica:</span><br/><strong className="text-red-700">{perdidaPV}%</strong></div>
              </div>
              <div className="mt-2 pt-2 border-t border-red-200 text-[10px] text-gray-500 space-y-0.5">
                <p>Ángulo de incidencia (%): <strong>-2.67</strong></p>
                <p>Efectos espectrales (%): <strong>+0.92</strong></p>
                <p>Baja temperatura e irradiancia (%): <strong>-6.740</strong></p>
                <p className="font-bold text-red-700">Pérdidas totales estimadas (%): -{(totalPerdidas + 2.67 + 6.74 - 0.92).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Sun, val: `${results.totalKwh.toLocaleString('es-ES')} kWh`, lbl: 'Producción anual', sub: `${results.produccionMediaDia} kWh/día media`, c: 'bg-amber-50 border-amber-200 text-amber-700' },
            { icon: Euro, val: `${results.beneficioAnual.toFixed(0)} €`, lbl: 'Ahorro / año', sub: 'Autoconsumo + excedentes', c: 'bg-green-50 border-green-200 text-green-700' },
            { icon: Clock, val: `${results.payback.toFixed(1)} años`, lbl: 'Amortización', sub: 'Payback period', c: 'bg-blue-50 border-blue-200 text-blue-700', payback: true },
            { icon: Leaf, val: `${results.co2.toLocaleString('es-ES')} kg`, lbl: 'CO₂ evitado/año', sub: `≡ ${Math.round(results.co2/21)} árboles/año`, c: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          ].map((k, i) => (
            <div key={i} className={`${k.c} border rounded-xl p-4 text-center`}>
              <k.icon className="w-5 h-5 mx-auto mb-1 opacity-70" />
              <p className="text-2xl font-bold" style={k.payback ? { color: paybackColor } : {}}>{k.val}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{k.lbl}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* PRODUCCIÓN MENSUAL */}
        <Card className="border-blue-200">
          <div className="bg-blue-700 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">📅 PVGIS ESTIMACIONES DE PRODUCCIÓN DE ELECTRICIDAD SOLAR</p>
          </div>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Producción mensual de energía del sistema fotovoltaico</p>
              <p className="text-xs text-gray-500">Producción anual de energía fotovoltaica: <strong className="text-blue-700 text-sm">{results.totalKwh.toLocaleString('es-ES')} kWh</strong></p>
              <p className="text-xs text-gray-400">Variabilidad de un año a otro: <strong>{results.variabilidad}%</strong> ({Math.round(results.totalKwh * results.variabilidad / 100)} kWh)</p>
            </div>

            {/* Gráfico barras kWh */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.monthly.map((m, i) => ({ name: String(i+1), kWh: m.kwh }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [`${v.toLocaleString('es-ES')} kWh`, 'Producción']} />
                  <Bar dataKey="kWh" radius={[3,3,0,0]}>
                    {results.monthly.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-blue-700 text-white">
                <th className="p-2 text-left">Mes</th><th className="p-2 text-right">kWh</th>
                <th className="p-2 text-right">%</th><th className="p-2 text-right">€ ahorro</th>
              </tr></thead>
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
              <tfoot><tr className="bg-blue-700 text-white font-bold">
                <td className="p-2">TOTAL ANUAL</td>
                <td className="p-2 text-right">{results.totalKwh.toLocaleString('es-ES')} kWh</td>
                <td className="p-2 text-right">100%</td>
                <td className="p-2 text-right">{results.ahorroAnual.toFixed(0)} €</td>
              </tr></tfoot>
            </table>
          </CardContent>
        </Card>

        {/* HORAS MENSUALES */}
        <Card className="border-amber-200">
          <div className="bg-amber-600 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">⏱️ HORAS MENSUALES DE PRODUCCIÓN DE ENERGÍA FOTOVOLTAICA</p>
          </div>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-gray-600">Horas anuales de producción: <strong className="text-amber-700">{results.totalHoras.toLocaleString('es-ES')} horas</strong> (promedio {results.horasMediaDia} h/día)</p>

            {/* Barras horizontales */}
            <div className="space-y-1.5">
              {results.monthly.map((m, i) => {
                const maxH = Math.max(...results.monthly.map(x => x.horas));
                const pct = Math.round((m.horas / maxH) * 100);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-gray-500 text-right">{i+1}</span>
                    <div className="flex-1 bg-gray-100 rounded h-5 overflow-hidden">
                      <div className="h-5 bg-amber-400 rounded flex items-center justify-end pr-1" style={{ width: `${pct}%`, minWidth: 24 }}>
                        <span className="text-[9px] text-white font-bold">{m.horas}</span>
                      </div>
                    </div>
                    <span className="w-14 text-right text-gray-500">{m.horasDia} h/día</span>
                  </div>
                );
              })}
            </div>

            <table className="w-full text-xs border-collapse mt-2">
              <thead><tr className="bg-amber-600 text-white">
                <th className="p-2 text-left">Mes</th><th className="p-2 text-right">Horas/Mes</th>
                <th className="p-2 text-right">Horas/día</th><th className="p-2 text-right">kWh/día</th>
              </tr></thead>
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
              <tfoot><tr className="bg-amber-600 text-white font-bold">
                <td className="p-2">TOTAL / MEDIA</td>
                <td className="p-2 text-right">{results.totalHoras}</td>
                <td className="p-2 text-right">{results.horasMediaDia}</td>
                <td className="p-2 text-right">{results.produccionMediaDia}</td>
              </tr></tfoot>
            </table>
          </CardContent>
        </Card>

        {/* IRRADIACIÓN MENSUAL */}
        <Card className="border-orange-200">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-t-lg">
            <p className="font-bold text-sm">☀️ IRRADIACIÓN MENSUAL EN PLANO FIJO (kWh/m²)</p>
          </div>
          <CardContent className="p-4 space-y-3">
            <p className="text-xs text-gray-600">Irradiación anual: <strong className="text-orange-700">{results.totalIrr.toLocaleString('es-ES')} kWh/m²</strong></p>

            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={results.monthly.map((m, i) => ({ name: String(i+1), 'kWh/m²': m.irr }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [`${v} kWh/m²`, 'Irradiación']} />
                  <Bar dataKey="kWh/m²" radius={[3,3,0,0]}>
                    {results.monthly.map((_, i) => <Cell key={i} fill="#f97316" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-orange-600 text-white">
                <th className="p-2 text-left">Mes</th><th className="p-2 text-right">kWh/m²</th><th className="p-2 text-right">%</th>
              </tr></thead>
              <tbody>
                {results.monthly.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}>
                    <td className="p-2 font-medium">{String(i+1).padStart(2,'0')} - {m.mes}</td>
                    <td className="p-2 text-right font-semibold">{m.irr}</td>
                    <td className="p-2 text-right text-gray-500">{m.pctIrr}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-orange-600 text-white font-bold">
                <td className="p-2">TOTAL ANUAL</td>
                <td className="p-2 text-right">{results.totalIrr} kWh/m²</td>
                <td className="p-2 text-right">100%</td>
              </tr></tfoot>
            </table>
          </CardContent>
        </Card>

        {/* SIMULACIÓN FINANCIERA */}
        <Card className="border-green-200">
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
                  <tr className="border-b bg-amber-50"><td className="p-2 font-bold text-amber-800">Período de amortización</td><td className="p-2 text-right font-bold" style={{ color: paybackColor }}>{results.payback.toFixed(1)} años</td></tr>
                  <tr className="border-b"><td className="p-2 text-gray-600">Cobertura consumo</td><td className="p-2 text-right font-semibold text-purple-700">{results.cobertura}%</td></tr>
                  <tr><td className="p-2 text-gray-600">CO₂ evitado / año</td><td className="p-2 text-right font-semibold text-emerald-700">{results.co2.toLocaleString('es-ES')} kg</td></tr>
                </tbody>
              </table>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Curva de amortización ({vidaUtil} años)</p>
                <div>
                  <label className="text-xs text-gray-500">Vida útil sistema (años)</label>
                  <Input type="number" value={vidaUtil} onChange={e => setVidaUtil(parseInt(e.target.value)||25)} className="h-7 text-xs mb-2 w-24 mt-0.5" min={5} max={40} />
                </div>
                <div className="flex items-end gap-0.5 h-24">
                  {Array.from({ length: Math.min(vidaUtil, 30) }, (_, i) => {
                    const acum = (i + 1) * results.beneficioAnual;
                    const saldo = acum - results.coste;
                    const maxSaldo = vidaUtil * results.beneficioAnual - results.coste;
                    const minSaldo = -results.coste;
                    const pct = ((saldo - minSaldo) / (maxSaldo - minSaldo)) * 100;
                    return (
                      <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(2, pct * 0.92)}px`, background: saldo >= 0 ? '#16a34a' : '#ef4444', minHeight: 2 }} title={`Año ${i+1}: ${saldo >= 0 ? '+' : ''}${Math.round(saldo)} €`} />
                    );
                  })}
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-sm inline-block"></span>Sin amortizar</span>
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

        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-400 pt-3 border-t border-gray-200">
          <span>Generado el {new Date().toLocaleDateString('es-ES')}</span>
          <span className="font-semibold text-gray-600">INFORME SOLAR PVGIS PROFESIONAL — {projectName}</span>
          <span>Estimaciones basadas en PVGIS-SARAH3</span>
        </div>
      </div>
    </div>
  );
}