import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Camera, Trash2, Plus, Clock, MapPin, AlertCircle, Package, X } from 'lucide-react';
import { toast } from 'sonner';

export default function TechnicianFieldWork() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [stops, setStops] = useState([]);
  const [currentStopIdx, setCurrentStopIdx] = useState(0);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [showMaterialDialog, setShowMaterialDialog] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [materialForm, setMaterialForm] = useState({ name: '', quantity: 1, cost: 0 });
  const [photoInput, setPhotoInput] = useState(null);

  useEffect(() => {
    // Cargar rutas desde localStorage
    const tech = localStorage.getItem('currentTechnician') || 'tech_' + Date.now();
    localStorage.setItem('currentTechnician', tech);
    
    const storedRoute = localStorage.getItem(`route_${tech}`);
    if (storedRoute) {
      const routeStops = JSON.parse(storedRoute);
      setStops(routeStops);
      setSelectedRoute(tech);
    }
  }, []);

  const currentStop = stops[currentStopIdx];

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      if (response.data?.file_url) {
        setPhotos([...photos, response.data.file_url]);
        setPhotoInput(null);
        toast.success('Foto adjuntada');
      }
    } catch (err) {
      toast.error('Error al subir foto');
    }
  };

  const handleAddMaterial = () => {
    if (!materialForm.name.trim()) {
      toast.error('Escribe el nombre del material');
      return;
    }
    setMaterials([...materials, { ...materialForm, id: Date.now() }]);
    setMaterialForm({ name: '', quantity: 1, cost: 0 });
    toast.success('Material añadido');
  };

  const handleCompleteStop = async () => {
    if (photos.length === 0) {
      toast.error('Adjunta al menos una foto de la reparación');
      return;
    }

    // Guardar datos de la parada en localStorage
    const completedData = {
      ...currentStop,
      status: 'completed',
      completedAt: new Date().toISOString(),
      photos,
      materials,
    };
    
    const updated = [...stops];
    updated[currentStopIdx] = completedData;
    setStops(updated);
    localStorage.setItem(`route_${selectedRoute}`, JSON.stringify(updated));
    
    toast.success('Parada marcada como completada');
    
    // Ir a la siguiente parada
    if (currentStopIdx < stops.length - 1) {
      setCurrentStopIdx(currentStopIdx + 1);
      setPhotos([]);
      setMaterials([]);
    } else {
      toast.success('¡Ruta completada!');
    }
  };

  if (!currentStop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="w-full max-w-sm">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600">No hay paradas en la ruta</p>
            <p className="text-xs text-gray-400 mt-2">Crea una ruta desde el escritorio</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCompleted = stops.filter(s => s.status === 'completed').length;
  const progress = Math.round((totalCompleted / stops.length) * 100);
  const totalMaterialCost = materials.reduce((s, m) => s + (m.cost || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold">Trabajo de Campo</h1>
            <Badge variant="outline" className="bg-teal-50">{currentStopIdx + 1}/{stops.length}</Badge>
          </div>
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-teal-600 h-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{totalCompleted} de {stops.length} paradas completadas</p>
        </div>
      </div>

      {/* Parada Actual */}
      <div className="p-4 space-y-4">
        {/* Información de la parada */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">{currentStop.address}</p>
                  <p className="text-xs text-gray-600 mt-1">{currentStop.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-[10px] text-gray-500">Tipo de servicio</p>
                  <p className="text-sm font-semibold capitalize">{currentStop.serviceType}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <p className="text-[10px] text-gray-500">Duración</p>
                  <p className="text-sm font-semibold">{currentStop.duration}h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fotos de la reparación */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="w-4 h-4" /> Fotos de la reparación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square">
                    <img src={photo} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button 
              onClick={() => setShowPhotoDialog(true)}
              variant="outline" 
              className="w-full"
            >
              <Camera className="w-4 h-4 mr-2" /> Tomar foto ({photos.length})
            </Button>
          </CardContent>
        </Card>

        {/* Materiales utilizados */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4" /> Materiales utilizados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {materials.length > 0 && (
              <div className="space-y-2">
                {materials.map((mat) => (
                  <div key={mat.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{mat.name}</p>
                      <p className="text-xs text-gray-600">Cantidad: {mat.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-700">{mat.cost}€</p>
                      <button
                        onClick={() => setMaterials(materials.filter(m => m.id !== mat.id))}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold text-gray-700">Total: {totalMaterialCost}€</p>
                </div>
              </div>
            )}
            <Button 
              onClick={() => setShowMaterialDialog(true)}
              variant="outline" 
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" /> Añadir material
            </Button>
          </CardContent>
        </Card>

        {/* Botón completar parada */}
        <Button 
          onClick={handleCompleteStop}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-lg font-semibold"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Marcar como completada
        </Button>
      </div>

      {/* Dialog - Foto */}
      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjuntar foto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input 
              ref={el => setPhotoInput(el)}
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            <Button 
              onClick={() => photoInput?.click()}
              className="w-full bg-teal-600"
            >
              <Camera className="w-4 h-4 mr-2" /> Tomar foto
            </Button>
            <p className="text-xs text-gray-500 text-center">Las fotos son obligatorias para completar la parada</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog - Material */}
      <Dialog open={showMaterialDialog} onOpenChange={setShowMaterialDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir material</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Nombre del material *</label>
              <Input 
                className="mt-1"
                placeholder="Ej: Compresor, Tuerca, Aceite..."
                value={materialForm.name}
                onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Cantidad</label>
                <Input 
                  type="number"
                  min={1}
                  step={0.1}
                  className="mt-1"
                  value={materialForm.quantity}
                  onChange={e => setMaterialForm({ ...materialForm, quantity: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Coste (€)</label>
                <Input 
                  type="number"
                  min={0}
                  step={0.01}
                  className="mt-1"
                  value={materialForm.cost}
                  onChange={e => setMaterialForm({ ...materialForm, cost: parseFloat(e.target.value) })}
                />
              </div>
            </div>
            <Button 
              onClick={handleAddMaterial}
              className="w-full bg-teal-600"
            >
              <Plus className="w-4 h-4 mr-2" /> Añadir material
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}