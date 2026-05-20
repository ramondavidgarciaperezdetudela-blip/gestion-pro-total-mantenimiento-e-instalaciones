import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, Sun, Loader2, Search, RefreshCw, Compass } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Datos de irradiación media por latitud (HSP hora solar pico) y mes
function getHSPByMonth(lat) {
  // Tabla simplificada HSP para España según latitud (basada en datos PVGIS)
  const latNorm = Math.min(Math.max(lat, 36), 44); // España: 36-44N
  const factor = 1 - (latNorm - 36) * 0.025; // más al norte = menos sol
  const base = [
    2.8, 3.5, 4.6, 5.5, 6.2, 6.8, 7.2, 6.7, 5.5, 4.0, 3.0, 2.5
  ];
  return base.map(v => parseFloat((v * factor).toFixed(2)));
}

function getOptimalTilt(lat) {
  return Math.round(lat * 0.76 + 3.1);
}

function getOptimalAzimuth(lat) {
  return lat > 0 ? 180 : 0; // Sur en hemisferio norte
}

function getPeakMonth(hsp) {
  return hsp.indexOf(Math.max(...hsp));
}

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); }
  });
  return null;
}

export default function SolarSiteReport({ form, result, contact, onSiteDataChange }) {
  const [lat, setLat] = useState(form.lat || '');
  const [lng, setLng] = useState(form.lng || '');
  const [address, setAddress] = useState(form.address || (contact ? `${contact.address || ''} ${contact.city || ''}`.trim() : ''));
  const [refCatastral, setRefCatastral] = useState(form.ref_catastral || '');
  const [tilt, setTilt] = useState(form.tilt || '');
  const [azimuth, setAzimuth] = useState(form.azimuth || '');
  const [mountType, setMountType] = useState(form.mount_type || 'superpuesto_tejado');
  const [searching, setSearching] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [hsp, setHsp] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.416775, -3.70379]);
  const [markerPos, setMarkerPos] = useState(null);
  const [mapKey, setMapKey] = useState(0);
  const printRef = useRef(null);

  // Si hay cliente con ciudad, intentar cargar coords
  useEffect(() => {
    if (contact?.latitude && contact?.longitude) {
      const lt = parseFloat(contact.latitude);
      const ln = parseFloat(contact.longitude);
      setLat(lt.toFixed(6));
      setLng(ln.toFixed(6));
      setMarkerPos([lt, ln]);
      setMapCenter([lt, ln]);
      setHsp(getHSPByMonth(lt));
      setTilt(prev => prev || String(getOptimalTilt(lt)));
      setAzimuth(prev => prev || '180');
    }
  }, [contact]);

  const searchAddress = async () => {
    if (!address.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=es`);
      const data = await res.json();
      if (data.length > 0) {
        const lt = parseFloat(data[0].lat);
        const ln = parseFloat(data[0].lon);
        setLat(lt.toFixed(6));
        setLng(ln.toFixed(6));
        setMarkerPos([lt, ln]);
        setMapCenter([lt, ln]);
        setMapKey(k => k + 1);
        setHsp(getHSPByMonth(lt));
        setTilt(String(getOptimalTilt(lt)));
        setAzimuth('180');
        notifyParent(lt, ln);
      }
    } catch(e) {}
    setSearching(false);
  };

  const handleMapClick = (lt, ln) => {
    setLat(lt.toFixed(6));
    setLng(ln.toFixed(6));
    setMarkerPos([lt, ln]);
    setHsp(getHSPByMonth(lt));
    setTilt(String(getOptimalTilt(lt)));
    setAzimuth('180');
    notifyParent(lt, ln);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const lt = pos.coords.latitude;
      const ln = pos.coords.longitude;
      setLat(lt.toFixed(6));
      setLng(ln.toFixed(6));
      setMarkerPos([lt, ln]);
      setMapCenter([lt, ln]);
      setMapKey(k => k + 1);
      setHsp(getHSPByMonth(lt));
      setTilt(String(getOptimalTilt(lt)));
      setAzimuth('180');
      notifyParent(lt, ln);
    });
  };

  const notifyParent = (lt, ln) => {
    if (onSiteDataChange) onSiteDataChange({ lat: lt, lng: ln, ref_catastral: refCatastral, tilt, azimuth });
  };

  const generateAIReport = async () => {
    if (!lat || !lng) return;
    setLoadingAI(true);
    const hspData = hsp || getHSPByMonth(parseFloat(lat));
    const optTilt = getOptimalTilt(parseFloat(lat));
    const annualHSP = hspData.reduce((a, b) => a + b, 0);
    const dailyProd = result ? result.totalKwp * (annualHSP / 365) * 0.8 : 0;
    const annualProd = dailyProd * 365;

    const prompt = `Genera un informe técnico profesional completo de viabilidad solar fotovoltaica para una instalación en España con los siguientes datos:

UBICACIÓN:
- Coordenadas GPS: Latitud ${lat}°N, Longitud ${lng}°E
- Dirección: ${address || 'No especificada'}
- Referencia catastral: ${refCatastral || 'No indicada'}

DATOS DE IRRADIACIÓN MENSUAL (Horas Solar Pico - HSP):
${MONTHS.map((m, i) => `${m}: ${hspData[i]} HSP`).join(' | ')}
- Total anual: ${annualHSP.toFixed(0)} HSP/año
- Media diaria: ${(annualHSP/365).toFixed(2)} HSP/día

PARÁMETROS ÓPTIMOS DE INSTALACIÓN:
- Inclinación óptima: ${optTilt}° (calculada para latitud ${lat}°)
- Orientación óptima: Sur (azimut 180°)
- Inclinación introducida: ${tilt || optTilt}°
- Azimut introducido: ${azimuth || 180}°
- Tipo de montaje: ${mountType}

${result ? `DATOS DEL SISTEMA CALCULADO:
- Número de paneles: ${result.numPanels}
- Potencia pico total: ${result.totalKwp.toFixed(2)} kWp
- Inversor: ${result.inverterKw} kW
- Producción diaria estimada: ${result.dailyProduction.toFixed(2)} kWh/día
- Producción anual estimada: ${result.yearlyProduction.toFixed(0)} kWh/año` : ''}

INSTRUCCIONES:
Genera el informe en HTML con las siguientes secciones:
1. Resumen ejecutivo del emplazamiento
2. Análisis de irradiación solar por meses (tabla HTML con todos los datos)
3. Orientación e inclinación óptima con justificación técnica
4. Comparativa entre inclinación fija óptima vs inclinación introducida (pérdidas %)
5. Mejores meses para producción y peores meses
6. Datos técnicos de la ubicación (zona climática, radiación global horizontal)
7. Recomendaciones de instalación para este emplazamiento específico
8. Datos de referencia catastral y coordenadas GPS para documentación oficial

Usa tablas HTML, formato profesional con <h2>, <h3>, <p>, <table>. En español. Datos técnicos precisos.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: true });
      setAiReport(res);
    } catch(e) {}
    setLoadingAI(false);
  };

  const currentHsp = hsp || (lat ? getHSPByMonth(parseFloat(lat)) : null);
  const optTilt = lat ? getOptimalTilt(parseFloat(lat)) : null;
  const peakMonth = currentHsp ? getPeakMonth(currentHsp) : null;
  const annualHSP = currentHsp ? currentHsp.reduce((a, b) => a + b, 0) : 0;

  // Producción mensual estimada
  const monthlyProd = currentHsp && result ? currentHsp.map(h => (result.totalKwp * h * 0.8 * 30).toFixed(0)) : null;

  return (
    <div className="space-y-4">
      <Card className="border-amber-200">
        <CardHeader className="bg-amber-50 pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
            <MapPin className="w-4 h-4" /> Plano de situación e informe solar del emplazamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">

          {/* Búsqueda de dirección */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500">Dirección de la instalación</label>
              <div className="flex gap-1 mt-1">
                <Input value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Calle, nº, ciudad, provincia..."
                  onKeyDown={e => e.key === 'Enter' && searchAddress()} />
                <Button size="sm" onClick={searchAddress} disabled={searching} className="bg-blue-600 flex-shrink-0">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Ref. Catastral</label>
              <Input className="mt-1" value={refCatastral} onChange={e => setRefCatastral(e.target.value)} placeholder="9999999AA0000S0001ZZ" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <label className="text-xs text-gray-500">Latitud</label>
              <Input className="mt-1 font-mono text-sm" value={lat} onChange={e => { setLat(e.target.value); if (e.target.value && !isNaN(e.target.value)) setHsp(getHSPByMonth(parseFloat(e.target.value))); }} placeholder="40.4167" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Longitud</label>
              <Input className="mt-1 font-mono text-sm" value={lng} onChange={e => setLng(e.target.value)} placeholder="-3.7036" />
            </div>
            <div>
              <label className="text-xs text-gray-500">Inclinación (°)</label>
              <Input className="mt-1" type="number" value={tilt} onChange={e => setTilt(e.target.value)} placeholder={optTilt || '30'} />
              {optTilt && <p className="text-[10px] text-amber-600">Óptimo: {optTilt}°</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500">Azimut (°)</label>
              <Input className="mt-1" type="number" value={azimuth} onChange={e => setAzimuth(e.target.value)} placeholder="180 (Sur)" />
              <p className="text-[10px] text-gray-400">0=N · 90=E · 180=S · 270=O</p>
            </div>
          </div>

          <Button size="sm" variant="outline" onClick={useMyLocation} className="text-blue-600 border-blue-300">
            <MapPin className="w-3.5 h-3.5 mr-1" /> Usar mi ubicación actual
          </Button>

          {/* MAPA */}
          <div className="rounded-xl overflow-hidden border border-gray-200 shadow" style={{ height: 320 }}>
            <MapContainer
              key={mapKey}
              center={mapCenter}
              zoom={markerPos ? 15 : 6}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onLocationSelect={handleMapClick} />
              {markerPos && (
                <Marker position={markerPos}>
                  <Popup>
                    <div className="text-xs">
                      <strong>Instalación Solar</strong><br />
                      Lat: {markerPos[0].toFixed(6)}<br />
                      Lon: {markerPos[1].toFixed(6)}<br />
                      {refCatastral && <>Catastro: {refCatastral}</>}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
          <p className="text-[10px] text-gray-400">💡 Haz clic en el mapa para seleccionar la ubicación exacta de la instalación</p>

          {/* Datos de irradiación */}
          {currentHsp && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-amber-100 text-amber-800">
                  <Sun className="w-3 h-3 mr-1" /> {(annualHSP / 365).toFixed(2)} HSP/día media
                </Badge>
                <Badge className="bg-orange-100 text-orange-800">
                  {annualHSP.toFixed(0)} HSP/año
                </Badge>
                {optTilt && <Badge className="bg-blue-100 text-blue-800">
                  <Compass className="w-3 h-3 mr-1" /> Inclinación óptima: {optTilt}° — Sur
                </Badge>}
                {peakMonth !== null && <Badge className="bg-green-100 text-green-800">
                  📈 Mejor mes: {MONTHS_FULL[peakMonth]}
                </Badge>}
              </div>

              {/* Gráfico de barras HSP por mes */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Horas Solar Pico (HSP) por mes</p>
                <div className="flex items-end gap-1 h-24 bg-amber-50 rounded-lg p-2">
                  {currentHsp.map((h, i) => {
                    const maxH = Math.max(...currentHsp);
                    const heightPct = (h / maxH) * 100;
                    return (
                      <div key={i} className="flex flex-col items-center flex-1 gap-0.5">
                        <span className="text-[8px] text-amber-700 font-bold">{h}</span>
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${heightPct * 0.6}px`,
                            backgroundColor: i === peakMonth ? '#f59e0b' : '#fcd34d',
                            minHeight: 4
                          }}
                        />
                        <span className="text-[7px] text-gray-400">{MONTHS[i]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tabla detallada */}
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-amber-600 text-white">
                    <th className="border border-amber-500 p-1 text-left">Mes</th>
                    <th className="border border-amber-500 p-1 text-right">HSP/día</th>
                    <th className="border border-amber-500 p-1 text-right">HSP/mes</th>
                    {monthlyProd && <th className="border border-amber-500 p-1 text-right">Prod. est. (kWh)</th>}
                  </tr>
                </thead>
                <tbody>
                  {currentHsp.map((h, i) => (
                    <tr key={i} className={i === peakMonth ? 'bg-amber-50 font-semibold' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50')}>
                      <td className="border border-gray-200 p-1">{MONTHS_FULL[i]}</td>
                      <td className="border border-gray-200 p-1 text-right">{h}</td>
                      <td className="border border-gray-200 p-1 text-right">{(h * 30).toFixed(0)}</td>
                      {monthlyProd && <td className="border border-gray-200 p-1 text-right font-medium text-green-700">{monthlyProd[i]}</td>}
                    </tr>
                  ))}
                  <tr className="bg-amber-100 font-bold">
                    <td className="border border-amber-200 p-1">TOTAL AÑO</td>
                    <td className="border border-amber-200 p-1 text-right">{(annualHSP / 365).toFixed(2)}</td>
                    <td className="border border-amber-200 p-1 text-right">{annualHSP.toFixed(0)}</td>
                    {monthlyProd && <td className="border border-amber-200 p-1 text-right text-green-800">{monthlyProd.reduce((a, b) => parseInt(a) + parseInt(b), 0)}</td>}
                  </tr>
                </tbody>
              </table>

              {/* Análisis orientación */}
              <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-800">Análisis de inclinación y orientación</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center border border-blue-100">
                    <p className="text-[10px] text-blue-400">Inclinación óptima</p>
                    <p className="font-bold text-blue-800 text-lg">{optTilt}°</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center border border-blue-100">
                    <p className="text-[10px] text-blue-400">Orientación óptima</p>
                    <p className="font-bold text-blue-800 text-lg">Sur 180°</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center border border-blue-100">
                    <p className="text-[10px] text-blue-400">Inclinación instalada</p>
                    <p className={`font-bold text-lg ${tilt && parseInt(tilt) !== optTilt ? 'text-orange-600' : 'text-green-700'}`}>{tilt || optTilt}°</p>
                  </div>
                  <div className="bg-white rounded p-2 text-center border border-blue-100">
                    <p className="text-[10px] text-blue-400">Azimut instalado</p>
                    <p className={`font-bold text-lg ${azimuth && parseInt(azimuth) !== 180 ? 'text-orange-600' : 'text-green-700'}`}>{azimuth || 180}°</p>
                  </div>
                </div>
                {tilt && parseInt(tilt) !== optTilt && (
                  <p className="text-[10px] text-orange-600">
                    ⚠️ La inclinación introducida ({tilt}°) difiere de la óptima ({optTilt}°).
                    Pérdida estimada: ≈{Math.abs(Math.round((1 - Math.cos((Math.abs(parseInt(tilt) - optTilt) * Math.PI / 180)) * 0.5) * 100 * 0.5))}% de producción.
                  </p>
                )}
                {azimuth && parseInt(azimuth) !== 180 && (
                  <p className="text-[10px] text-orange-600">
                    ⚠️ Azimut {azimuth}° (desviación {Math.abs(parseInt(azimuth) - 180)}° del Sur).
                    Pérdida estimada por orientación: ≈{Math.round(Math.abs(parseInt(azimuth) - 180) * 0.1)}%.
                  </p>
                )}
              </div>

              {/* Coordenadas y catastro */}
              {(lat && lng) && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 border border-gray-200">
                  <p className="font-semibold text-gray-700">📍 Datos de ubicación para documentación oficial</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-400">Latitud:</span> <span className="font-mono font-medium">{lat}°N</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Longitud:</span> <span className="font-mono font-medium">{lng}°{parseFloat(lng) >= 0 ? 'E' : 'O'}</span>
                    </div>
                    {refCatastral && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Ref. Catastral:</span> <span className="font-mono font-medium text-blue-700">{refCatastral}</span>
                        <a href={`https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc1=${refCatastral.substring(0,7)}&rc2=${refCatastral.substring(7,14)}`}
                           target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 underline">Ver en Catastro ↗</a>
                      </div>
                    )}
                    {address && <div className="col-span-2"><span className="text-gray-400">Dirección:</span> <span className="font-medium">{address}</span></div>}
                  </div>
                </div>
              )}

              <Button onClick={generateAIReport} disabled={loadingAI || !lat} className="w-full bg-gradient-to-r from-amber-500 to-orange-600">
                {loadingAI
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando informe completo...</>
                  : <><Sun className="w-4 h-4 mr-2" />Generar informe solar completo con IA</>}
              </Button>
            </div>
          )}

          {!currentHsp && (
            <div className="text-center py-6 text-gray-400 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Introduce la dirección o haz clic en el mapa para obtener los datos de irradiación solar
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informe IA */}
      {aiReport && (
        <Card className="border-amber-300">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-amber-800 flex items-center gap-2">
                <Sun className="w-4 h-4" /> Informe Solar Completo — {address || `${lat}, ${lng}`}
              </CardTitle>
              <Button size="sm" variant="outline" onClick={generateAIReport} disabled={loadingAI}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />Regenerar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div
              className="text-xs"
              style={{ lineHeight: '1.6' }}
              dangerouslySetInnerHTML={{
                __html: aiReport
                  .replace(/<table/g, '<table style="border-collapse:collapse;width:100%;margin:8px 0"')
                  .replace(/<td/g, '<td style="border:1px solid #ccc;padding:4px 6px;vertical-align:top"')
                  .replace(/<th/g, '<th style="border:1px solid #ccc;padding:4px 6px;background:#f59e0b;color:white;font-weight:600"')
                  .replace(/<h2/g, '<h2 style="font-size:13px;font-weight:700;margin:14px 0 6px;color:#92400e;border-bottom:2px solid #f59e0b;padding-bottom:3px"')
                  .replace(/<h3/g, '<h3 style="font-size:11px;font-weight:600;margin:10px 0 4px;color:#374151"')
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}