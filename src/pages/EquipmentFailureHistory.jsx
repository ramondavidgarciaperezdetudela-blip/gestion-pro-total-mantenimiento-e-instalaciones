import React, { useState, useEffect, useRef } from 'react';
import BuscadorCliente from '@/components/BuscadorCliente';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/ui/number-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wrench, Plus, Edit, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const EQUIPMENT_TYPES = ['aire_acondicionado', 'bomba_calor', 'camara_frigorifica', 'electrico', 'solar', 'fontaneria', 'otro'];
const FAILURE_TYPES = ['compresor', 'ventilador', 'termostato', 'valvula', 'condensador', 'evaporador', 'fugas_gas', 'problemas_electricos', 'mantenimiento', 'otro'];
const STATUS_OPTIONS = ['reportada', 'en_reparacion', 'reparada', 'pendiente', 'cancelada'];

const STATUS_CONFIG = {
  'reportada': { color: 'bg-red-100 text-red-800', icon: AlertCircle, label: 'Reportada' },
  'en_reparacion': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'En reparación' },
  'reparada': { color: 'bg-green-100 text-green-800', icon: CheckCircle2, label: 'Reparada' },
  'pendiente': { color: 'bg-blue-100 text-blue-800', icon: Clock, label: 'Pendiente' },
  'cancelada': { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, label: 'Cancelada' },
};

export default function EquipmentFailureHistory() {
  const [contacts, setContacts] = useState([]);
  const [failures, setFailures] = useState([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const printRef = useRef(null);

  const [formData, setFormData] = useState({
    contact_id: '', contact_name: '',
    equipment_type: 'camara_frigorifica', equipment_brand: '', equipment_model: '', serial_number: '',
    failure_date: format(new Date(), 'yyyy-MM-dd'), failure_type: 'otro', description: '',
    diagnosis: '', solution: '', technician: '', repair_date: '', repair_hours: '',
    parts_used: [], total_cost: 0, status: 'reportada', photos: [], notes: ''
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Contact.list(),
      base44.entities.EquipmentFailure.list('-failure_date', 1000)
    ]).then(([c, f]) => {
      setContacts(c);
      setFailures(f);
    });
  }, []);

  const filteredFailures = selectedContact 
    ? failures.filter(f => f.contact_id === selectedContact)
    : failures;

  const handleContactChange = (contactId) => {
    const contact = contacts.find(c => c.id === contactId);
    setFormData({
      ...formData,
      contact_id: contactId,
      contact_name: contact ? `${contact.name} ${contact.surname || ''}` : ''
    });
    setSelectedContact(contactId);
  };

  const handleAddPart = () => {
    setFormData({
      ...formData,
      parts_used: [...formData.parts_used, { part_name: '', quantity: '', cost: '' }]
    });
  };

  const handleRemovePart = (index) => {
    setFormData({
      ...formData,
      parts_used: formData.parts_used.filter((_, i) => i !== index)
    });
  };

  const handleSave = async () => {
    if (!formData.contact_id) return;
    
    const dataToSave = {
      ...formData,
      total_cost: formData.parts_used.reduce((sum, p) => sum + (p.cost || 0), 0) + (formData.repair_hours * 50) // 50€/hora asumido
    };

    if (editingId) {
      await base44.entities.EquipmentFailure.update(editingId, dataToSave);
    } else {
      await base44.entities.EquipmentFailure.create(dataToSave);
    }

    const updated = await base44.entities.EquipmentFailure.list('-failure_date', 1000);
    setFailures(updated);
    setShowDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      contact_id: selectedContact, contact_name: formData.contact_name,
      equipment_type: 'camara_frigorifica', equipment_brand: '', equipment_model: '', serial_number: '',
      failure_date: format(new Date(), 'yyyy-MM-dd'), failure_type: 'otro', description: '',
      diagnosis: '', solution: '', technician: '', repair_date: '', repair_hours: '',
      parts_used: [], total_cost: 0, status: 'reportada', photos: [], notes: ''
    });
    setEditingId(null);
  };

  const handleEdit = (failure) => {
    setFormData(failure);
    setEditingId(failure.id);
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar este registro de avería?')) {
      await base44.entities.EquipmentFailure.delete(id);
      const updated = await base44.entities.EquipmentFailure.list('-failure_date', 1000);
      setFailures(updated);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wrench className="w-8 h-8 text-orange-600" />
          Historial Averías Frigoríficas
        </h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setShowDialog(true); }} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" /> Registrar Avería
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Avería' : 'Registrar Nueva Avería'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <BuscadorCliente
                contacts={contacts}
                value={formData.contact_id}
                onValueChange={handleContactChange}
                placeholder="Cliente"
              />
                <Select value={formData.equipment_type} onValueChange={v => setFormData({...formData, equipment_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Tipo equipo" /></SelectTrigger>
                  <SelectContent>{EQUIPMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Marca" value={formData.equipment_brand} onChange={e => setFormData({...formData, equipment_brand: e.target.value})} />
                <Input placeholder="Modelo" value={formData.equipment_model} onChange={e => setFormData({...formData, equipment_model: e.target.value})} />
                <Input placeholder="Nº serie" value={formData.serial_number} onChange={e => setFormData({...formData, serial_number: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold">Fecha avería</label>
                  <Input type="date" value={formData.failure_date} onChange={e => setFormData({...formData, failure_date: e.target.value})} />
                </div>
                <Select value={formData.failure_type} onValueChange={v => setFormData({...formData, failure_type: v})}>
                  <SelectTrigger><SelectValue placeholder="Tipo avería" /></SelectTrigger>
                  <SelectContent>{FAILURE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <textarea className="w-full p-2 border rounded text-sm" placeholder="Descripción de la avería" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="2" />
              <textarea className="w-full p-2 border rounded text-sm" placeholder="Diagnóstico" value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} rows="2" />
              <textarea className="w-full p-2 border rounded text-sm" placeholder="Solución aplicada" value={formData.solution} onChange={e => setFormData({...formData, solution: e.target.value})} rows="2" />

              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Técnico" value={formData.technician} onChange={e => setFormData({...formData, technician: e.target.value})} />
                <Input type="date" placeholder="Fecha reparación" value={formData.repair_date} onChange={e => setFormData({...formData, repair_date: e.target.value})} />
                <NumberField placeholder="Horas" value={formData.repair_hours} onChange={v => setFormData({...formData, repair_hours: v})} />
              </div>

              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>)}</SelectContent>
              </Select>

              <div>
                <p className="text-sm font-semibold mb-2">Piezas utilizadas</p>
                {formData.parts_used.map((part, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input placeholder="Nombre" value={part.part_name} onChange={e => { const p = [...formData.parts_used]; p[i].part_name = e.target.value; setFormData({...formData, parts_used: p}); }} />
                    <NumberField placeholder="Cantidad" value={part.quantity} onChange={v => { const p = [...formData.parts_used]; p[i].quantity = v; setFormData({...formData, parts_used: p}); }} className="w-20" />
                    <NumberField placeholder="Coste" value={part.cost} onChange={v => { const p = [...formData.parts_used]; p[i].cost = v; setFormData({...formData, parts_used: p}); }} className="w-24" />
                    <Button onClick={() => handleRemovePart(i)} variant="outline" size="sm"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                ))}
                <Button onClick={handleAddPart} variant="outline" size="sm" className="w-full">+ Añadir pieza</Button>
              </div>

              <PhotoGallery photos={formData.photos} onChange={p => setFormData({...formData, photos: p})} label="Fotos" maxPhotos={15} />

              <textarea className="w-full p-2 border rounded text-sm" placeholder="Notas adicionales" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows="2" />

              <Button onClick={handleSave} className="w-full bg-orange-600 hover:bg-orange-700">
                {editingId ? 'Actualizar' : 'Registrar'} Avería
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro por cliente */}
      <Card>
        <CardContent className="p-4">
          <BuscadorCliente
                contacts={contacts}
                value={selectedContact}
                onValueChange={setSelectedContact}
                placeholder="Filtrar por cliente..."
              />
        </CardContent>
      </Card>

      {/* Historial como diario */}
      <div className="space-y-3">
        {filteredFailures.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-gray-500">Sin registros de averías</CardContent></Card>
        ) : (
          filteredFailures.map(failure => {
            const statusConfig = STATUS_CONFIG[failure.status];
            const StatusIcon = statusConfig.icon;
            
            return (
              <Card key={failure.id} className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Información principal */}
                    <div className="md:col-span-2">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-lg">{failure.equipment_brand} {failure.equipment_model}</p>
                          <p className="text-sm text-gray-600">{failure.contact_name} • S/N: {failure.serial_number}</p>
                        </div>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" /> {statusConfig.label}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Avería ({failure.failure_type}):</span> {failure.description}</p>
                        {failure.diagnosis && <p><span className="font-semibold">Diagnóstico:</span> {failure.diagnosis}</p>}
                        {failure.solution && <p><span className="font-semibold">Solución:</span> {failure.solution}</p>}
                        
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2 pt-2 border-t">
                          <p><span className="font-semibold">Reportada:</span> {format(new Date(failure.failure_date), 'dd/MM/yyyy')}</p>
                          {failure.repair_date && <p><span className="font-semibold">Reparada:</span> {format(new Date(failure.repair_date), 'dd/MM/yyyy')}</p>}
                          {failure.technician && <p><span className="font-semibold">Técnico:</span> {failure.technician}</p>}
                          {failure.repair_hours > 0 && <p><span className="font-semibold">Horas:</span> {failure.repair_hours}h</p>}
                        </div>

                        {failure.parts_used && failure.parts_used.length > 0 && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <p className="font-semibold text-xs mb-1">Piezas:</p>
                            {failure.parts_used.map((p, i) => (
                              <p key={i} className="text-xs text-gray-700">{p.part_name} (x{p.quantity}) - {p.cost}€</p>
                            ))}
                          </div>
                        )}

                        {failure.notes && <p className="italic text-gray-600 text-xs mt-2">📝 {failure.notes}</p>}
                      </div>
                    </div>

                    {/* Coste y acciones */}
                    <div className="flex flex-col gap-2">
                      {failure.total_cost > 0 && (
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-orange-600">{failure.total_cost}€</p>
                          <p className="text-xs text-orange-700">Coste total</p>
                        </div>
                      )}

                      {failure.photos && failure.photos.length > 0 && (
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-xs font-semibold text-blue-700 mb-1">📷 {failure.photos.length} fotos</p>
                          <div className="grid grid-cols-2 gap-1">
                            {failure.photos.slice(0, 4).map((photo, i) => (
                              <img key={i} src={photo} alt="Foto avería" className="w-full h-12 object-cover rounded" />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button onClick={() => handleEdit(failure)} size="sm" variant="outline" className="flex-1">
                          <Edit className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button onClick={() => handleDelete(failure.id)} size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Botón de impresión para historial completo */}
      {filteredFailures.length > 0 && (
        <div className="mt-6" ref={printRef}>
          <CompanyHeader className="mb-4" />
          <Card>
            <CardHeader className="bg-orange-50">
              <CardTitle>Historial de Averías Frigoríficas</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600 mb-4">
                {selectedContact ? `Cliente: ${formData.contact_name}` : 'Todos los clientes'}
              </p>
              {filteredFailures.map(failure => (
                <div key={failure.id} className="mb-4 p-3 border rounded">
                  <div className="font-bold">{failure.equipment_brand} {failure.equipment_model} (S/N: {failure.serial_number})</div>
                  <div className="text-sm text-gray-600">{failure.contact_name}</div>
                  <div className="text-sm mt-2">
                    <p><strong>Avería:</strong> {failure.failure_type} - {failure.description}</p>
                    {failure.diagnosis && <p><strong>Diagnóstico:</strong> {failure.diagnosis}</p>}
                    {failure.solution && <p><strong>Solución:</strong> {failure.solution}</p>}
                    <p><strong>Fecha:</strong> {format(new Date(failure.failure_date), 'dd/MM/yyyy')} • <strong>Estado:</strong> {STATUS_CONFIG[failure.status].label}</p>
                    {failure.total_cost > 0 && <p><strong>Coste:</strong> {failure.total_cost}€</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex gap-2 mt-4">
            <PrintButton contentRef={printRef} title="Historial Averías Frigoríficas" />
          </div>
        </div>
      )}
    </div>
  );
}