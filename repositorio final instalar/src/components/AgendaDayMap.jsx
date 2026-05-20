import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Navigation } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const createNumberedIcon = (n, color = '#2563eb') => L.divIcon({
  html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${n}</div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const PRIORITY_COLORS = { urgente: '#ef4444', alta: '#f97316', media: '#2563eb', baja: '#6b7280' };

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'es' } });
  const data = await res.json();
  if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}

export default function AgendaDayMap({ appointments, selectedDate }) {
  const [positions, setPositions] = useState({});
  const [loading, setLoading] = useState(false);

  const todayAppts = appointments
    .filter(a => a.date && isSameDay(new Date(a.date + 'T00:00:00'), selectedDate) && a.address)
    .sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));

  useEffect(() => {
    if (todayAppts.length === 0) return;
    setLoading(true);
    const toGeocode = todayAppts.filter(a => !positions[a.id]);
    if (toGeocode.length === 0) { setLoading(false); return; }

    Promise.all(
      toGeocode.map(async a => {
        const pos = await geocodeAddress(a.address);
        return { id: a.id, pos };
      })
    ).then(results => {
      const newPos = {};
      results.forEach(({ id, pos }) => { if (pos) newPos[id] = pos; });
      setPositions(prev => ({ ...prev, ...newPos }));
      setLoading(false);
    });
  }, [todayAppts.map(a => a.id).join(',')]);

  const validAppts = todayAppts.filter(a => positions[a.id]);
  const routeCoords = validAppts.map(a => positions[a.id]);

  // Calculate map center
  const center = validAppts.length > 0
    ? [
        validAppts.reduce((s, a) => s + positions[a.id][0], 0) / validAppts.length,
        validAppts.reduce((s, a) => s + positions[a.id][1], 0) / validAppts.length,
      ]
    : [40.4168, -3.7038]; // Madrid default

  const openRouteInMaps = () => {
    const waypoints = validAppts.map(a => encodeURIComponent(a.address)).join('/');
    window.open(`https://www.google.com/maps/dir/${waypoints}`, '_blank');
  };

  if (todayAppts.length === 0) return null;

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-500" />
          Mapa de ruta — {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
          <Badge className="bg-blue-100 text-blue-700 text-[10px]">{todayAppts.length} citas</Badge>
          {loading && <span className="text-[10px] text-gray-400 animate-pulse">Geocodificando...</span>}
        </CardTitle>
        {validAppts.length > 1 && (
          <button
            onClick={openRouteInMaps}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" /> Abrir en Maps
          </button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {/* Map */}
        <div className="h-64 rounded-b-xl overflow-hidden">
          <MapContainer center={center} zoom={validAppts.length > 0 ? 12 : 6} style={{ height: '100%', width: '100%' }} key={center.join(',')}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
            {routeCoords.length > 1 && (
              <Polyline positions={routeCoords} color="#2563eb" weight={3} dashArray="8,6" opacity={0.7} />
            )}
            {validAppts.map((apt, i) => (
              <Marker key={apt.id} position={positions[apt.id]} icon={createNumberedIcon(i + 1, PRIORITY_COLORS[apt.priority] || '#2563eb')}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold">{i + 1}. {apt.title}</p>
                    {apt.time_start && <p className="flex items-center gap-1"><Clock className="w-3 h-3" />{apt.time_start}h {apt.time_end && `— ${apt.time_end}h`}</p>}
                    {apt.contact_name && <p className="text-gray-600">{apt.contact_name}</p>}
                    <p className="text-gray-500">{apt.address}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Ordered list */}
        <div className="divide-y">
          {todayAppts.map((apt, i) => (
            <div key={apt.id} className="flex items-center gap-3 px-4 py-2 text-xs">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                style={{ background: PRIORITY_COLORS[apt.priority] || '#2563eb' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{apt.title}</p>
                <p className="text-gray-500 truncate">{apt.contact_name} — {apt.address}</p>
              </div>
              <span className="text-blue-600 font-bold flex-shrink-0">{apt.time_start || '--'}</span>
              {!positions[apt.id] && apt.address && (
                <span className="text-[9px] text-gray-300 flex-shrink-0">sin geocod.</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}