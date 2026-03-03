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
import { Plus, ClipboardList, Trash2, Edit, PenLine, Eye, Phone, Send } from 'lucide-react';
import { format } from 'date-fns';
import { getNextAvailableNumber } from '../components/autoNumber';
import PrintButton from '../components/PrintButton';
import CompanyHeader from '../components/CompanyHeader';
import PhotoGallery from '../components/PhotoGallery';
import SignaturePad from '../components/SignaturePad';

const TYPES = ['clima', 'refrigeracion', 'electrico', 'solar', 'fontaneria', 'general'];

const FGAS_GWP = {
  'R-410A': 2088, 'R-32': 675, 'R-134a': 1430, 'R-404A': 3922,
  'R-407C': 1774, 'R-290': 3, 'R-449A': 1397, 'R-452A': 2140, 'R-448A': 1387
};

const EMPTY_FORM = {
  sheet_number: '', contact_id: '', contact_name: '', date: format(new Date(), 'yyyy-MM-dd'),
  type: 'clima', equipment_brand: '', equipment_model: '', serial_number: '', location: '',
  technician_name: '',
  readings_climate: { pressure_high: 0, pressure_low: 0, temp_impulsion: 0, temp_retorno: 0, temp_exterior: 0, refrigerant_type: 'R-410A', refrigerant_charge: 0, voltage: 0, amperage_compressor: 0, amperage_fan: 0, superheat: 0, subcooling: 0, fgas_equivalent_co2: 0, fgas_gwp: 2088 },
  readings_electric: { voltage_l1: 0, voltage_l2: 0, voltage_l3: 0, amperage_l1: 0, amperage_l2: 0, amperage_l3: 0, power_factor: 0, ground_resistance: 0, insulation_resistance: 0, differential_test: false, thermal_test: false },
  readings_solar: { panel_voltage: 0, panel_current: 0, inverter_output_w: 0, battery_level_pct: 0, production_kwh: 0, panel_cleaning: false, connections_ok: false },
  readings_plumbing: { water_pressure_bar: 0, temp_acs: 0, flow_lmin: 0, leaks_detected: false, filter_state: '' },
  general_tasks: '',
  observations: '', recommendations: '',
  photos_before: [], photos_after: [], photos_evaporator_plate: [], photos_condenser_plate: [],
  signature_technician: '', signature_client: '', status: 'completada'
};

export default function Maintenance() {
  const [sheets, setSheets] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sigTechOpen, setSigTechOpen] = useState(false);
  const [sigClientOpen, setSigClientOpen] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.MaintenanceSheet.list('-date', 500),
      base44.entities.Contact.list(),
      base44.entities.CompanySettings.list(),
    ]).then(([s, c, settings]) => {
      setSheets(s);
      setContacts(c);
      if (settings[0]?.technicians) setTechnicians(settings[0].technicians);
      // Pre-calcular número para nueva ficha
      setForm(f => ({ ...f, sheet_number: getNextAvailableNumber(s.map(x => x.sheet_number || '')) }));
    });
  }, []);

  const handleSave = async () => {
    const data = { ...form };
    if (editing) {
      await base44.entities.MaintenanceSheet.update(editing.id, data);
    } else {
      const saved = await base44.entities.MaintenanceSheet.create(data);
      if (form.contact_id) {
        await base44.entities.ClientDocument.create({
          contact_id: form.contact_id,
          contact_name: form.contact_name,
          title: `Ficha Mantenimiento #${form.sheet_number} - ${form.type}`,
          doc_type: 'ficha_mantenimiento',
          date: form.date,
          description: `${form.type} | ${form.equipment_brand} ${form.equipment_model}`,
          reference_id: saved.id,
        });
      }
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    alert(editing ? '✅ Ficha actualizada correctamente' : '✅ Ficha guardada y vinculada al cliente');
    const s = await base44.entities.MaintenanceSheet.list('-date', 500);
    setSheets(s);
  };

  const handleEdit = (sheet) => {
    setEditing(sheet);
    setForm({
      sheet_number: sheet.sheet_number || '', contact_id: sheet.contact_id || '', contact_name: sheet.contact_name || '',
      date: sheet.date || '', type: sheet.type || 'clima', equipment_brand: sheet.equipment_brand || '',
      equipment_model: sheet.equipment_model || '', serial_number: sheet.serial_number || '', location: sheet.location || '',
      technician_name: sheet.technician_name || '',
      readings_climate: sheet.readings_climate || EMPTY_FORM.readings_climate,
      readings_electric: sheet.readings_electric || EMPTY_FORM.readings_electric,
      readings_solar: sheet.readings_solar || EMPTY_FORM.readings_solar,
      readings_plumbing: sheet.readings_plumbing || EMPTY_FORM.readings_plumbing,
      general_tasks: sheet.general_tasks || '',
      observations: sheet.observations || '', recommendations: sheet.recommendations || '',
      photos_before: sheet.photos_before || [], photos_after: sheet.photos_after || [],
      photos_evaporator_plate: sheet.photos_evaporator_plate || [],
      photos_condenser_plate: sheet.photos_condenser_plate || [],
      signature_technician: sheet.signature_technician || '',
      signature_client: sheet.signature_client || '',
      status: sheet.status || 'completada'
    });
    setDialogOpen(true);
  };

  const updateClimate = (field, val) => {
    const updated = { ...form.readings_climate, [field]: val };
    if (field === 'refrigerant_type') {
      updated.fgas_gwp = FGAS_GWP[val] || 0;
      updated.fgas_equivalent_co2 = ((updated.refrigerant_charge || 0) * (FGAS_GWP[val] || 0)) / 1000;
    }
    if (field === 'refrigerant_charge') {
      updated.fgas_equivalent_co2 = (val * (updated.fgas_gwp || 0)) / 1000;
    }
    setForm({ ...form, readings_climate: updated });
  };
  const updateElectric = (field, val) => setForm({ ...form, readings_electric: { ...form.readings_electric, [field]: val } });
  const updateSolar = (field, val) => setForm({ ...form, readings_solar: { ...form.readings_solar, [field]: val } });
  const updatePlumbing = (field, val) => setForm({ ...form, readings_plumbing: { ...form.readings_plumbing, [field]: val } });

  const typeColor = { clima: 'bg-blue-100 text-blue-700', refrigeracion: 'bg-cyan-100 text-cyan-700', electrico: 'bg-yellow-100 text-yellow-700', solar: 'bg-amber-100 text-amber-700', fontaneria: 'bg-teal-100 text-teal-700', general: 'bg-gray-100 text-gray-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fichas de Mantenimiento</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(EMPTY_FORM); } }}>
          <DialogTrigger asChild>
            <Button className="bg-cyan-600"><Plus className="w-4 h-4 mr-2" />Nueva ficha</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Nueva'} ficha de mantenimiento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Nº ficha" value={form.sheet_number} onChange={e => setForm({ ...form, sheet_number: e.target.value })} />
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Select value={form.contact_id} onValueChange={v => {
                const c = contacts.find(co => co.id === v);
                setForm({ ...form, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : '' });
              }}>
                <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.surname}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Marca" value={form.equipment_brand} onChange={e => setForm({ ...form, equipment_brand: e.target.value })} />
                <Input placeholder="Modelo" value={form.equipment_model} onChange={e => setForm({ ...form, equipment_model: e.target.value })} />
                <Input placeholder="Nº serie" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Ubicación" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                {technicians.length > 0 ? (
                  <div>
                    <Select value={form.technician_name} onValueChange={v => setForm({ ...form, technician_name: v === '__manual__' ? '' : v })}>
                      <SelectTrigger><SelectValue placeholder="Técnico" /></SelectTrigger>
                      <SelectContent>
                        {technicians.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        <SelectItem value="__manual__">Escribir manualmente...</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.technician_name === '' && <Input className="mt-1" placeholder="Nombre técnico" onChange={e => setForm({ ...form, technician_name: e.target.value })} />}
                  </div>
                ) : (
                  <Input placeholder="Nombre técnico" value={form.technician_name} onChange={e => setForm({ ...form, technician_name: e.target.value })} />
                )}
              </div>

              {/* Climate readings */}
              {(form.type === 'clima' || form.type === 'refrigeracion') && (
                <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-blue-700">Lecturas Clima / Refrigeración</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['pressure_high','P. Alta (bar)'],['pressure_low','P. Baja (bar)'],['voltage','Voltaje (V)'],['temp_impulsion','T. Impulsión °C'],['temp_retorno','T. Retorno °C'],['temp_exterior','T. Exterior °C'],['amperage_compressor','A. Compresor'],['amperage_fan','A. Ventilador'],['superheat','Recalent. °C'],['subcooling','Subenfr. °C'],['refrigerant_charge','Carga gas (kg)']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><Input type="number" value={form.readings_climate[f] || 0} onChange={e => updateClimate(f, parseFloat(e.target.value))} /></div>
                    ))}
                    <div>
                      <label className="text-[10px] text-gray-500">Tipo gas</label>
                      <Select value={form.readings_climate.refrigerant_type} onValueChange={v => updateClimate('refrigerant_type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.keys(FGAS_GWP).map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* F-Gas section */}
                  <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-2">
                    <p className="text-xs font-semibold text-orange-700 mb-1">🌿 Registro F-Gas (Reglamento UE 517/2014)</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-gray-500">Gas:</span> <strong>{form.readings_climate.refrigerant_type}</strong></div>
                      <div><span className="text-gray-500">GWP:</span> <strong>{form.readings_climate.fgas_gwp || FGAS_GWP[form.readings_climate.refrigerant_type] || '-'}</strong></div>
                      <div><span className="text-gray-500">CO₂ equiv.:</span> <strong>{(form.readings_climate.fgas_equivalent_co2 || 0).toFixed(3)} t</strong></div>
                    </div>
                    <p className="text-[10px] text-orange-600 mt-1">
                      {(form.readings_climate.fgas_equivalent_co2 || 0) >= 5
                        ? '⚠️ Supera 5 t CO₂eq. — Requiere certificado F-Gas y registro obligatorio'
                        : (form.readings_climate.fgas_equivalent_co2 || 0) >= 1
                        ? '⚠️ Supera 1 t CO₂eq. — Verificación anual requerida'
                        : '✅ Por debajo de umbrales de inspección obligatoria'}
                    </p>
                  </div>
                </div>
              )}

              {/* Electric readings */}
              {form.type === 'electrico' && (
                <div className="bg-yellow-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-yellow-700">Lecturas Eléctricas</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['voltage_l1','V L1'],['voltage_l2','V L2'],['voltage_l3','V L3'],['amperage_l1','A L1'],['amperage_l2','A L2'],['amperage_l3','A L3'],['power_factor','Factor potencia'],['ground_resistance','R. Tierra (Ω)'],['insulation_resistance','R. Aislam. (MΩ)']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><Input type="number" value={form.readings_electric[f] || 0} onChange={e => updateElectric(f, parseFloat(e.target.value))} /></div>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm mt-1">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_electric.differential_test} onChange={e => updateElectric('differential_test', e.target.checked)} />Test diferencial ✓</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_electric.thermal_test} onChange={e => updateElectric('thermal_test', e.target.checked)} />Test térmico ✓</label>
                  </div>
                </div>
              )}

              {/* Solar readings */}
              {form.type === 'solar' && (
                <div className="bg-amber-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-amber-700">Lecturas Sistema Solar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['panel_voltage','V Panel'],['panel_current','A Panel'],['inverter_output_w','W Inversor'],['battery_level_pct','% Batería'],['production_kwh','kWh producidos']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><Input type="number" value={form.readings_solar[f] || 0} onChange={e => updateSolar(f, parseFloat(e.target.value))} /></div>
                    ))}
                    <div><label className="text-[10px] text-gray-500">Estado filtros</label><Input value={form.readings_solar.filter_state || ''} onChange={e => updateSolar('filter_state', e.target.value)} /></div>
                  </div>
                  <div className="flex gap-4 text-sm mt-1">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_solar.panel_cleaning} onChange={e => updateSolar('panel_cleaning', e.target.checked)} />Limpieza paneles ✓</label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.readings_solar.connections_ok} onChange={e => updateSolar('connections_ok', e.target.checked)} />Conexiones OK ✓</label>
                  </div>
                </div>
              )}

              {/* Plumbing readings */}
              {form.type === 'fontaneria' && (
                <div className="bg-teal-50 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-sm text-teal-700">Lecturas Fontanería</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[['water_pressure_bar','Presión (bar)'],['temp_acs','T. ACS (°C)'],['flow_lmin','Caudal (l/min)']].map(([f,l]) => (
                      <div key={f}><label className="text-[10px] text-gray-500">{l}</label><Input type="number" value={form.readings_plumbing[f] || 0} onChange={e => updatePlumbing(f, parseFloat(e.target.value))} /></div>
                    ))}
                    <div><label className="text-[10px] text-gray-500">Estado filtros</label><Input value={form.readings_plumbing.filter_state || ''} onChange={e => updatePlumbing('filter_state', e.target.value)} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={form.readings_plumbing.leaks_detected} onChange={e => updatePlumbing('leaks_detected', e.target.checked)} />Fugas detectadas</label>
                </div>
              )}

              {/* General tasks */}
              {form.type === 'general' && (
                <Textarea placeholder="Tareas realizadas en mantenimiento general..." value={form.general_tasks} onChange={e => setForm({ ...form, general_tasks: e.target.value })} rows={4} />
              )}

              <Textarea placeholder="Observaciones" value={form.observations} onChange={e => setForm({ ...form, observations: e.target.value })} />
              <Textarea placeholder="Recomendaciones" value={form.recommendations} onChange={e => setForm({ ...form, recommendations: e.target.value })} />

              <PhotoGallery photos={form.photos_before} onChange={p => setForm({ ...form, photos_before: p })} label="Fotos antes (máx. 30)" maxPhotos={30} />
              <PhotoGallery photos={form.photos_after} onChange={p => setForm({ ...form, photos_after: p })} label="Fotos después (máx. 30)" maxPhotos={30} />
              {(form.type === 'clima' || form.type === 'refrigeracion') && <>
                <PhotoGallery photos={form.photos_evaporator_plate} onChange={p => setForm({ ...form, photos_evaporator_plate: p })} label="Placa evaporadora" maxPhotos={5} />
                <PhotoGallery photos={form.photos_condenser_plate} onChange={p => setForm({ ...form, photos_condenser_plate: p })} label="Placa condensadora" maxPhotos={5} />
              </>}

              {/* Signatures */}
              <div className="border rounded-lg p-3 space-y-2">
                <p className="font-medium text-sm">Firmas</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Técnico: {form.technician_name}</p>
                    {form.signature_technician ? (
                      <div>
                        <img src={form.signature_technician} alt="Firma técnico" className="border rounded h-16 w-full object-contain bg-white" />
                        <Button size="sm" variant="outline" className="mt-1 w-full text-xs" onClick={() => setForm({ ...form, signature_technician: '' })}>Borrar firma</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setSigTechOpen(true)}>
                        <PenLine className="w-3 h-3 mr-1" />Firmar técnico
                      </Button>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cliente: {form.contact_name}</p>
                    {form.signature_client ? (
                      <div>
                        <img src={form.signature_client} alt="Firma cliente" className="border rounded h-16 w-full object-contain bg-white" />
                        <Button size="sm" variant="outline" className="mt-1 w-full text-xs" onClick={() => setForm({ ...form, signature_client: '' })}>Borrar firma</Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="w-full" onClick={() => setSigClientOpen(true)}>
                        <PenLine className="w-3 h-3 mr-1" />Firmar cliente
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full bg-cyan-600">{editing ? 'Actualizar' : 'Guardar ficha'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Signature modals */}
      <SignaturePad open={sigTechOpen} onClose={() => setSigTechOpen(false)} title="Firma del técnico" onSave={sig => setForm({ ...form, signature_technician: sig })} />
      <SignaturePad open={sigClientOpen} onClose={() => setSigClientOpen(false)} title="Firma del cliente" onSave={sig => setForm({ ...form, signature_client: sig })} />

      {/* Preview */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {preview && (
            <div ref={printRef}>
              <CompanyHeader className="mb-3" />
              <h2 className="font-bold text-lg">Ficha Mantenimiento #{preview.sheet_number}</h2>
              <Badge className={`${typeColor[preview.type] || ''} mb-2`}>{preview.type}</Badge>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p><span className="text-gray-500">Cliente:</span> {preview.contact_name}</p>
                <p><span className="text-gray-500">Fecha:</span> {preview.date}</p>
                <p><span className="text-gray-500">Equipo:</span> {preview.equipment_brand} {preview.equipment_model}</p>
                <p><span className="text-gray-500">Nº serie:</span> {preview.serial_number}</p>
                <p><span className="text-gray-500">Ubicación:</span> {preview.location}</p>
                <p><span className="text-gray-500">Técnico:</span> {preview.technician_name}</p>
              </div>
              {preview.observations && <p className="text-sm mt-3"><strong>Obs.:</strong> {preview.observations}</p>}
              {preview.recommendations && <p className="text-sm mt-1 text-blue-700"><strong>Recom.:</strong> {preview.recommendations}</p>}
              {(preview.signature_technician || preview.signature_client) && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {preview.signature_technician && (
                    <div className="border rounded p-2 text-center">
                      <img src={preview.signature_technician} alt="Firma técnico" className="h-16 mx-auto" />
                      <p className="text-xs text-gray-500 mt-1">Técnico: {preview.technician_name}</p>
                    </div>
                  )}
                  {preview.signature_client && (
                    <div className="border rounded p-2 text-center">
                      <img src={preview.signature_client} alt="Firma cliente" className="h-16 mx-auto" />
                      <p className="text-xs text-gray-500 mt-1">Cliente: {preview.contact_name}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <PrintButton contentRef={printRef} title={`Mantenimiento ${preview?.sheet_number}`} />
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {sheets.map(s => (
          <Card key={s.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <ClipboardList className="w-5 h-5 text-cyan-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">#{s.sheet_number} — {s.contact_name}</p>
                  <p className="text-xs text-gray-500">{s.date} | {s.type} | {s.equipment_brand} {s.equipment_model}</p>
                  {s.technician_name && <p className="text-xs text-blue-600 mt-0.5">👷 {s.technician_name}</p>}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={typeColor[s.type] || 'bg-gray-100 text-gray-700'}>{s.type}</Badge>
                  <div className="flex gap-1 text-[10px]">
                    {s.signature_technician && <span title="Firmado técnico">✍️</span>}
                    {s.signature_client && <span title="Firmado cliente">👤</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mt-2 border-t pt-2 flex-wrap">
                <button onClick={() => setPreview(s)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-cyan-50 text-cyan-700 hover:bg-cyan-100">
                  <Eye className="w-3 h-3" /> Ver
                </button>
                <button onClick={() => handleEdit(s)} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
                  <Edit className="w-3 h-3" /> Editar
                </button>
                <button
                  onClick={() => {
                    const phone = s.contact_phone?.replace(/\D/g,'') || '';
                    const msg = encodeURIComponent(`Ficha Mantenimiento #${s.sheet_number}\nCliente: ${s.contact_name}\nFecha: ${s.date}\nTipo: ${s.type}\nEquipo: ${s.equipment_brand} ${s.equipment_model}\nObservaciones: ${s.observations || '-'}`);
                    window.open(phone ? `https://wa.me/34${phone}?text=${msg}` : `https://wa.me/?text=${msg}`, '_blank');
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-50 text-green-700 hover:bg-green-100">
                  <Phone className="w-3 h-3" /> WA
                </button>
                <button onClick={() => { base44.entities.MaintenanceSheet.delete(s.id).then(() => setSheets(sheets.filter(x => x.id !== s.id))); }} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-red-50 text-red-700 hover:bg-red-100 ml-auto">
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sheets.length === 0 && <p className="text-center text-gray-400 py-8">No hay fichas de mantenimiento</p>}
      </div>
    </div>
  );
}