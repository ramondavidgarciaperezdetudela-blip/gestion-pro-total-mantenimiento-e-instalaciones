import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ClipboardList, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';

const TYPES = ['clima', 'refrigeracion', 'electrico'];

export default function Maintenance() {
  const [sheets, setSheets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    sheet_number: '', contact_id: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'),
    type: 'clima', equipment_brand: '', equipment_model: '', serial_number: '', location: '',
    readings_climate: { pressure_high: 0, pressure_low: 0, temp_impulsion: 0, temp_retorno: 0, temp_exterior: 0, refrigerant_type: '', refrigerant_charge: 0, voltage: 0, amperage_compressor: 0, amperage_fan: 0, superheat: 0, subcooling: 0 },
    readings_electric: { voltage_l1: 0, voltage_l2: 0, voltage_l3: 0, amperage_l1: 0, amperage_l2: 0, amperage_l3: 0, power_factor: 0, ground_resistance: 0, insulation_resistance: 0, differential_test: false, thermal_test: false },
    observations: '', recommendations: '', photos_before: [], photos_after: [], photos_evaporator_plate: [], photos_condenser_plate: [], status: 'completada'
  });
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MaintenanceSheet.list('-date', 500),
      base44.entities.Contact.list()
    ]).then(([s, c]) => { setSheets(s); setContacts(c); });
  }, []);

  const handleSave = async () => {
    if (editing) {
      await base44.entities.MaintenanceSheet.update(editing.id, form);
    } else {
      await base44.entities.MaintenanceSheet.create(form);
    }
    setDialogOpen(false);
    setEditing(null);
    const s = await base44.entities.MaintenanceSheet.list('-date', 500);
    setSheets(s);
  };

  const handleEdit = (sheet) => {
    setEditing(sheet);
    setForm({
      sheet_number: sheet.sheet_number || '', contact_id: sheet.contact_id || '', contact_name: sheet.contact_name || '',
      date: sheet.date || '', type: sheet.type || 'clima', equipment_brand: sheet.equipment_brand || '',
      equipment_model: sheet.equipment_model || '', serial_number: sheet.serial_number || '', location: sheet.location || '',
      readings_climate: sheet.readings_climate || form.readings_climate,
      readings_electric: sheet.readings_electric || form.readings_electric,
      observations: sheet.observations || '', recommendations: sheet.recommendations || '',
      photos_before: sheet.photos_before || [], photos_after: sheet.photos_after || [],
      photos_evaporator_plate: sheet.photos_evaporator_plate || [],
      photos_condenser_plate: sheet.photos_condenser_plate || [], status: sheet.status || 'completada'
    });
    setDialogOpen(true);
  };

  const updateClimate = (field, value) => setForm({...form, readings_climate: {...form.readings_climate, [field]: value}});
  const updateElectric = (field, value) => setForm({...form, readings_electric: {...form.readings_electric, [field]: value}});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fichas de Mantenimiento</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600"><Plus className="w-4 h-4 mr-2" />Nueva ficha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nueva'} ficha de mantenimiento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Nº ficha" value={form.sheet_number} onChange={e => setForm({...form, sheet_number: e.target.value})} />
                <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Select value={form.contact_id} onValueChange={v => {
                const c = contacts.find(co => co.id === v);
                setForm({...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : ''});
              }}>
                <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Marca" value={form.equipment_brand} onChange={e => setForm({...form, equipment_brand: e.target.value})} />
                <Input placeholder="Modelo" value={form.equipment_model} onChange={e => setForm({...form, equipment_model: e.target.value})} />
                <Input placeholder="Nº serie" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
              </div>
              <Input placeholder="Ubicación" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />

              {(form.type === 'clima' || form.type === 'refrigeracion') && (
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-blue-700">Lecturas Clima / Refrigeración</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] text-gray-500">P. Alta (bar)</label><Input type="number" value={form.readings_climate.pressure_high} onChange={e => updateClimate('pressure_high', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">P. Baja (bar)</label><Input type="number" value={form.readings_climate.pressure_low} onChange={e => updateClimate('pressure_low', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">Tipo gas</label><Input value={form.readings_climate.refrigerant_type} onChange={e => updateClimate('refrigerant_type', e.target.value)} /></div>
                    <div><label className="text-[10px] text-gray-500">T. Impulsión °C</label><Input type="number" value={form.readings_climate.temp_impulsion} onChange={e => updateClimate('temp_impulsion', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">T. Retorno °C</label><Input type="number" value={form.readings_climate.temp_retorno} onChange={e => updateClimate('temp_retorno', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">T. Exterior °C</label><Input type="number" value={form.readings_climate.temp_exterior} onChange={e => updateClimate('temp_exterior', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">Voltaje (V)</label><Input type="number" value={form.readings_climate.voltage} onChange={e => updateClimate('voltage', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">A. Compresor</label><Input type="number" value={form.readings_climate.amperage_compressor} onChange={e => updateClimate('amperage_compressor', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">A. Ventilador</label><Input type="number" value={form.readings_climate.amperage_fan} onChange={e => updateClimate('amperage_fan', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">Recalent. °C</label><Input type="number" value={form.readings_climate.superheat} onChange={e => updateClimate('superheat', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">Subenfr. °C</label><Input type="number" value={form.readings_climate.subcooling} onChange={e => updateClimate('subcooling', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">Carga gas (kg)</label><Input type="number" value={form.readings_climate.refrigerant_charge} onChange={e => updateClimate('refrigerant_charge', parseFloat(e.target.value))} /></div>
                  </div>
                </div>
              )}

              {form.type === 'electrico' && (
                <div className="bg-yellow-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-yellow-700">Lecturas Eléctricas</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-[10px] text-gray-500">V L1</label><Input type="number" value={form.readings_electric.voltage_l1} onChange={e => updateElectric('voltage_l1', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">V L2</label><Input type="number" value={form.readings_electric.voltage_l2} onChange={e => updateElectric('voltage_l2', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">V L3</label><Input type="number" value={form.readings_electric.voltage_l3} onChange={e => updateElectric('voltage_l3', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">A L1</label><Input type="number" value={form.readings_electric.amperage_l1} onChange={e => updateElectric('amperage_l1', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">A L2</label><Input type="number" value={form.readings_electric.amperage_l2} onChange={e => updateElectric('amperage_l2', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">A L3</label><Input type="number" value={form.readings_electric.amperage_l3} onChange={e => updateElectric('amperage_l3', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">Factor potencia</label><Input type="number" value={form.readings_electric.power_factor} onChange={e => updateElectric('power_factor', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">R. Tierra (Ω)</label><Input type="number" value={form.readings_electric.ground_resistance} onChange={e => updateElectric('ground_resistance', parseFloat(e.target.value))} /></div>
                    <div><label className="text-[10px] text-gray-500">R. Aislam. (MΩ)</label><Input type="number" value={form.readings_electric.insulation_resistance} onChange={e => updateElectric('insulation_resistance', parseFloat(e.target.value))} /></div>
                  </div>
                </div>
              )}

              <Textarea placeholder="Observaciones" value={form.observations} onChange={e => setForm({...form, observations: e.target.value})} />
              <Textarea placeholder="Recomendaciones" value={form.recommendations} onChange={e => setForm({...form, recommendations: e.target.value})} />
              <PhotoGallery photos={form.photos_before} onChange={p => setForm({...form, photos_before: p})} label="Fotos antes" maxPhotos={30} />
              <PhotoGallery photos={form.photos_after} onChange={p => setForm({...form, photos_after: p})} label="Fotos después" maxPhotos={30} />
              <PhotoGallery photos={form.photos_evaporator_plate} onChange={p => setForm({...form, photos_evaporator_plate: p})} label="Placa evaporadora" maxPhotos={5} />
              <PhotoGallery photos={form.photos_condenser_plate} onChange={p => setForm({...form, photos_condenser_plate: p})} label="Placa condensadora" maxPhotos={5} />
              <Button onClick={handleSave} className="w-full bg-cyan-600">{editing ? 'Actualizar' : 'Guardar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {preview && (
            <div ref={printRef}>
              <CompanyHeader className="mb-3" />
              <h2 className="font-bold text-lg">Ficha Mantenimiento #{preview.sheet_number}</h2>
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <p><span className="text-gray-500">Cliente:</span> {preview.contact_name}</p>
                <p><span className="text-gray-500">Fecha:</span> {preview.date}</p>
                <p><span className="text-gray-500">Equipo:</span> {preview.equipment_brand} {preview.equipment_model}</p>
                <p><span className="text-gray-500">Nº serie:</span> {preview.serial_number}</p>
              </div>
              {preview.readings_climate && preview.type !== 'electrico' && (
                <div className="mt-3 text-xs">
                  <p className="font-medium mb-1">Lecturas Clima:</p>
                  <div className="grid grid-cols-3 gap-1">
                    <p>P. Alta: {preview.readings_climate.pressure_high} bar</p>
                    <p>P. Baja: {preview.readings_climate.pressure_low} bar</p>
                    <p>Gas: {preview.readings_climate.refrigerant_type}</p>
                    <p>T. Impul.: {preview.readings_climate.temp_impulsion}°C</p>
                    <p>T. Ret.: {preview.readings_climate.temp_retorno}°C</p>
                    <p>Recalent.: {preview.readings_climate.superheat}°C</p>
                    <p>Subenfr.: {preview.readings_climate.subcooling}°C</p>
                  </div>
                </div>
              )}
              {preview.observations && <p className="text-sm mt-3">{preview.observations}</p>}
              {preview.recommendations && <p className="text-sm mt-1 text-blue-600">{preview.recommendations}</p>}
            </div>
          )}
          <PrintButton contentRef={printRef} title={`Mantenimiento ${preview?.sheet_number}`} />
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {sheets.map(s => (
          <Card key={s.id} className="hover:shadow-sm cursor-pointer" onClick={() => setPreview(s)}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-cyan-500" />
                <div>
                  <p className="font-medium text-sm">#{s.sheet_number} - {s.contact_name}</p>
                  <p className="text-xs text-gray-500">{s.date} | {s.type} | {s.equipment_brand} {s.equipment_model}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={(e) => { e.stopPropagation(); handleEdit(s); }} className="p-1 text-gray-400"><Edit className="w-4 h-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); base44.entities.MaintenanceSheet.delete(s.id).then(() => setSheets(sheets.filter(x => x.id !== s.id))); }} className="p-1 text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}