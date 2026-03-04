import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, Plus, Trash2, Navigation, Clock, Euro, AlertCircle, Edit2, Copy, Check, Loader, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { toast } from 'sonner';

// Fix para los íconos de leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function TecniciansRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState(null);
  const [form, setForm] = useState({ address: '', lat: 0, lng: 0, duration: 1, description: '', serviceType: 'mantenimiento', cost: 0, contactId: '' });
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [contacts, setContacts] = useState([]);
  const [showClientSelector, setShowClientSelector] = useState(false);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [optimizingRoute, setOptimizingRoute] = useState(false);
  const addressInputRef = useRef(null);

  useEffect(() => {
    // Cargamos técnicos desde CompanySettings y clientes
    Promise.all([
      base44.entities.CompanySettings.list(),
      base44.entities.Contact.list('-created_date', 300),
    ]).then(([companyData, contactsList]) => {
      if (companyData.length > 0 && companyData[0].technicians) {
        setTechnicians(companyData[0].technicians || []);
      }
      setContacts(contactsList);
    });
  }, []);

  useEffect(() => {
    if (!selectedRoute) {
      setStops([]);
      return;
    }
    const stored = localStorage.getItem(`route_${selectedRoute}`);
    setStops(stored ? JSON.parse(stored) : []);
  }, [selectedRoute]);

  const handleSelectClient = (contactId) => {
    const client = contacts.find(c => c.id === contactId);
    if (client) {
      setForm(f => ({
        ...f,
        contactId: client.id,
        address: client.address || '',
        description: `${client.name} ${client.surname || ''} - ${client.phone || ''}`,
      }));
      setShowClientSelector(false);
    }
  };

  const handleChangeAddress = () => {
    setShowClientSelector(true);
  };

  const getCoordinatesFromAddress = async (address) => {
    if (!address || address.trim().length < 5) {
      toast.error('Escribe una dirección completa');
      return;
    }
    
    setLoadingCoords(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setForm(f => ({
          ...f,
          lat: parseFloat(lat),
          lng: parseFloat(lon),
        }));
        toast.success('Coordenadas obtenidas automáticamente');
      } else {
        toast.error('No se encontró la dirección. Verifica y prueba de nuevo.');
      }
    } catch (e) {
      toast.error('Error al obtener coordenadas');
    }
    setLoadingCoords(false);
  };

  const handleSaveStop = () => {
    if (!form.address) {
      toast.error('Completa la dirección');
      return;
    }
    if (form.lat === 0 || form.lng === 0) {
      toast.error('Completa coordenadas (lat/lng)');
      return;
    }
    
    let updated;
    if (editingStop !== null) {
      updated = stops.map((s, i) => i === editingStop ? { ...form, id: form.id } : s);
    } else {
      updated = [...stops, { ...form, id: Date.now(), order: stops.length + 1 }];
    }
    setStops(updated);
    localStorage.setItem(`route_${selectedRoute}`, JSON.stringify(updated));
    setDialogOpen(false);
    setForm({ address: '', lat: 0, lng: 0, duration: 1, description: '', serviceType: 'mantenimiento', cost: 0, contactId: '' });
    setEditingStop(null);
    toast.success('Parada guardada');
  };

  const deleteStop = (idx) => {
    const updated = stops.filter((_, i) => i !== idx);
    setStops(updated.map((s, i) => ({ ...s, order: i + 1 })));
    localStorage.setItem(`route_${selectedRoute}`, JSON.stringify(updated));
  };

  const calcRouteStats = () => {
    const totalDuration = stops.reduce((s, st) => s + (st.duration || 0), 0);
    const totalCost = stops.reduce((s, st) => s + (st.cost || 0), 0);
    return { totalDuration, totalCost };
  };

  const { totalDuration, totalCost } = calcRouteStats();
  const centerCoords = stops.length > 0 ? [stops[0].lat, stops[0].lng] : [40, -4]; // Centro en España

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Navigation className="w-6 h-6 text-teal-600" /> Optimización de Rutas de Técnicos
        </h1>
        <Button onClick={() => { setEditingStop(null); setForm({ address: '', lat: 0, lng: 0, duration: 1, description: '', serviceType: 'mantenimiento', cost: 0 }); setDialogOpen(true); }} 
          disabled={!selectedRoute} className="bg-teal-600">
          <Plus className="w-4 h-4 mr-1" /> Nueva parada
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selección técnico y paradas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Técnico y Ruta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Técnico asignado</label>
              <Select value={selectedRoute || ''} onValueChange={setSelectedRoute}>
                <SelectTrigger><SelectValue placeholder="Selecciona técnico..." /></SelectTrigger>
                <SelectContent>
                  {technicians.map((t, i) => (
                    <SelectItem key={i} value={`${t}_${Date.now()}`}>{typeof t === 'string' ? t : t.name || 'Técnico'} — {format(new Date(), 'yyyy-MM-dd')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRoute && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <Card>
                    <CardContent className="p-2 text-center">
                      <p className="text-lg font-bold text-blue-600">{stops.length}</p>
                      <p className="text-[10px] text-gray-500">Paradas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-2 text-center">
                      <p className="text-lg font-bold text-green-600">{totalDuration}h</p>
                      <p className="text-[10px] text-gray-500">Duración</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-2 text-center">
                      <p className="text-lg font-bold text-orange-600">{totalCost}€</p>
                      <p className="text-[10px] text-gray-500">Gasto</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stops.length === 0 ? (
                    <p className="text-center text-gray-400 py-6">Sin paradas registradas</p>
                  ) : (
                    stops.map((stop, idx) => (
                      <div key={stop.id} className="p-2.5 bg-gray-50 rounded-lg border">
                        <div className="flex items-start gap-2">
                          <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-teal-600 text-white text-xs font-bold rounded-full">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{stop.address}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-[10px]">
                                <Clock className="w-3 h-3 mr-0.5" /> {stop.duration}h
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">
                                <Euro className="w-3 h-3 mr-0.5" /> {stop.cost}€
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{stop.serviceType}</Badge>
                            </div>
                            {stop.description && <p className="text-xs text-gray-600 mt-1">{stop.description}</p>}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => { setEditingStop(idx); setForm(stop); setDialogOpen(true); }} className="p-1 text-blue-400 hover:text-blue-600">
                              ✏️
                            </button>
                            <button onClick={() => deleteStop(idx)} className="p-1 text-red-300 hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Mapa */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Visualización de Ruta en Mapa</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {selectedRoute && stops.length > 0 ? (
              <div className="rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <MapContainer center={centerCoords} zoom={12} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                  
                  {/* Línea de ruta */}
                  {stops.length > 1 && (
                    <Polyline positions={stops.map(s => [s.lat, s.lng])} color="teal" weight={3} opacity={0.7} />
                  )}
                  
                  {/* Marcadores */}
                  {stops.map((stop, idx) => (
                    <Marker key={stop.id} position={[stop.lat, stop.lng]} icon={new L.DivIcon({
                      html: `<div style="background-color: teal; color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${idx + 1}</div>`,
                      iconSize: [36, 36],
                      className: 'custom-div-icon'
                    })}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold">{stop.address}</p>
                          <p className="text-xs">{stop.duration}h • {stop.cost}€</p>
                          <p className="text-xs text-gray-600">{stop.serviceType}</p>
                          {stop.description && <p className="text-xs mt-1">{stop.description}</p>}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <div className="h-[500px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center text-gray-400">
                  <MapPin className="w-12 h-12 mx-auto opacity-50 mb-2" />
                  <p className="text-sm">Añade paradas para ver la ruta en el mapa</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog para nueva parada */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditingStop(null); setShowClientSelector(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingStop !== null ? 'Editar' : 'Nueva'} parada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* Selector de cliente */}
            <div>
              <label className="text-xs text-gray-500 font-semibold block mb-1">👤 Seleccionar cliente</label>
              <Select value={form.contactId} onValueChange={handleSelectClient}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Buscar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin cliente vinculado</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.surname || ''} {c.address ? `- ${c.address.substring(0, 30)}...` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.address && form.contactId && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Dirección cargada del cliente
                </p>
              )}
            </div>

            {/* Dirección */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs text-gray-500 font-semibold">Dirección completa *</label>
                {form.contactId && form.address && (
                  <button 
                    onClick={handleChangeAddress}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Cambiar
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Input 
                  ref={addressInputRef}
                  className="mt-1 flex-1" 
                  placeholder="Ej: Calle Principal 123, Madrid" 
                  value={form.address} 
                  onChange={e => setForm({ ...form, address: e.target.value })}
                />
                <Button
                  onClick={() => getCoordinatesFromAddress(form.address)}
                  disabled={loadingCoords || !form.address}
                  size="sm"
                  variant="outline"
                  className="mt-1"
                  title="Obtener coordenadas desde la dirección"
                >
                  {loadingCoords ? (
                    <Loader className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Latitud *</label>
                <Input type="number" step={0.000001} className="mt-1" placeholder="40.4168" value={form.lat} onChange={e => setForm({ ...form, lat: parseFloat(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Longitud *</label>
                <Input type="number" step={0.000001} className="mt-1" placeholder="-3.7038" value={form.lng} onChange={e => setForm({ ...form, lng: parseFloat(e.target.value) })} />
              </div>
            </div>
            <p className="text-xs text-gray-400 bg-blue-50 p-2 rounded border border-blue-200">💡 Puedes obtener las coordenadas desde Google Maps haciendo clic derecho en la ubicación</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Duración (horas)</label>
                <Input type="number" min={0.5} max={24} step={0.5} className="mt-1" value={form.duration} onChange={e => setForm({ ...form, duration: parseFloat(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Costo desplazamiento (€)</label>
                <Input type="number" min={0} step={0.1} className="mt-1" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Tipo de servicio</label>
              <Select value={form.serviceType} onValueChange={v => setForm({ ...form, serviceType: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="reparacion">Reparación</SelectItem>
                  <SelectItem value="instalacion">Instalación</SelectItem>
                  <SelectItem value="revision">Revisión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Descripción / Notas</label>
              <Input className="mt-1" placeholder="Ej: Cliente María García, revisar aire acondicionado..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <Button onClick={handleSaveStop} className="w-full bg-teal-600">
              {editingStop !== null ? 'Actualizar parada' : 'Añadir parada'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}