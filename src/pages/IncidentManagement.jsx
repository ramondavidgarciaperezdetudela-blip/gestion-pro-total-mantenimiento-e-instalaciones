import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Wrench, Calendar, Save, Edit2, Check, X, Plus, Trash2, Download } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pendiente: { color: 'bg-amber-100 text-amber-800', label: '⏳ Pendiente', icon: AlertCircle },
  en_reparacion: { color: 'bg-blue-100 text-blue-800', label: '🔧 En reparación', icon: Wrench },
  resuelto: { color: 'bg-green-100 text-green-800', label: '✅ Resuelto', icon: Check },
};

const FAILURE_TYPES = [
  { value: 'compresor', label: 'Compresor' },
  { value: 'ventilador', label: 'Ventilador' },
  { value: 'termostato', label: 'Termostato' },
  { value: 'valvula', label: 'Válvula' },
  { value: 'condensador', label: 'Condensador' },
  { value: 'evaporador', label: 'Evaporador' },
  { value: 'fugas_gas', label: 'Fugas de gas' },
  { value: 'problemas_electricos', label: 'Problemas eléctricos' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro', label: 'Otro' },
];

export default function IncidentManagement() {
  const [contacts, setContacts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [machines, setMachines] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  
  const [selectedContact, setSelectedContact] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    contact_id: '', contact_name: '', equipment_type: 'otro',
    equipment_brand: '', equipment_model: '', serial_number: '',
    failure_date: format(new Date(), 'yyyy-MM-dd'), failure_type: 'otro',
    description: '', diagnosis: '', solution: '', technician: '',
    repair_date: '', repair_hours: 0, status: 'pendiente', notes: '',
  });
  
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [editingIncident, setEditingIncident] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactsList, incidentsList, companyData, machinesList] = await Promise.all([
        base44.entities.Contact.list('-created_date', 500),
        base44.entities.EquipmentFailure.list('-failure_date', 200),
        base44.entities.CompanySettings.list(),
        base44.entities.ClientMachine?.list?.('-created_date', 100) || Promise.resolve([]),
      ]);
      
      setContacts(contactsList);
      setIncidents(incidentsList);
      if (companyData.length > 0) {
        setCompany(companyData[0]);
        if (companyData[0].technicians) setTechnicians(companyData[0].technicians);
      }
      if (machinesList.length > 0) setMachines(machinesList);
    } catch (e) {
      console.error('Error loading data:', e);
    }
    setLoading(false);
  };

  const handleSelectContact = (id) => {
    setSelectedContact(id);
    const c = contacts.find(x => x.id === id);
    if (c) setForm(f => ({ ...f, contact_id: id, contact_name: `${c.name} ${c.surname || ''}` }));
  };

  const handleSaveIncident = async () => {
    if (!form.contact_id || !form.description) {
      toast.error('Rellena campos requeridos');
      return;
    }

    try {
      if (editingId) {
        await base44.entities.EquipmentFailure.update(editingId, form);
        toast.success('Incidencia actualizada');
      } else {
        await base44.entities.EquipmentFailure.create(form);
        toast.success('Incidencia registrada');
      }
      resetForm();
      setShowForm(false);
      await loadData();
    } catch (e) {
      toast.error('Error al guardar');
    }
  };

  const handleEditIncident = (incident) => {
    setForm(incident);
    setEditingId(incident.id);
    setShowForm(true);
  };

  const handleDeleteIncident = async (id) => {
    if (!confirm('¿Eliminar esta incidencia?')) return;
    try {
      await base44.entities.EquipmentFailure.delete(id);
      toast.success('Incidencia eliminada');
      await loadData();
    } catch (e) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setForm({
      contact_id: '', contact_name: '', equipment_type: 'otro',
      equipment_brand: '', equipment_model: '', serial_number: '',
      failure_date: format(new Date(), 'yyyy-MM-dd'), failure_type: 'otro',
      description: '', diagnosis: '', solution: '', technician: '',
      repair_date: '', repair_hours: 0, status: 'pendiente', notes: '',
    });
    setEditingId(null);
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchContact = !selectedContact || inc.contact_id === selectedContact;
    const matchStatus = !filterStatus || inc.status === filterStatus;
    const matchSearch = !searchTerm || 
      inc.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.equipment_brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchContact && matchStatus && matchSearch;
  });

  const downloadIncidentReport = (incident) => {
    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte de Incidencia</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1e3a5f; padding-bottom: 15px; }
    .logo { font-size: 24px; font-weight: bold; color: #1e3a5f; }
    .subtitle { color: #666; font-size: 12px; margin-top: 5px; }
    .section { margin: 20px 0; }
    .section-title { font-size: 14px; font-weight: bold; color: white; background: #1e3a5f; padding: 8px 12px; margin-bottom: 10px; }
    .field { margin: 8px 0; display: flex; }
    .field-label { font-weight: bold; width: 180px; color: #555; }
    .field-value { flex: 1; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f0f0f0; font-weight: bold; }
    .signature-area { margin-top: 40px; height: 60px; display: flex; gap: 40px; }
    .signature { border-top: 1px solid #000; text-align: center; font-size: 12px; width: 150px; }
    .footer { margin-top: 40px; font-size: 10px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">${company?.company_name || 'Empresa'}</div>
    <div class="subtitle">REPORTE DE INCIDENCIA / AVERÍA</div>
    <div style="font-size: 11px; color: #666; margin-top: 10px;">
      Ref: ${incident.id?.substring(0, 8)} | Fecha: ${format(new Date(incident.failure_date), 'dd/MM/yyyy', { locale: es })}
    </div>
  </div>

  <div class="section">
    <div class="section-title">📋 INFORMACIÓN DEL CLIENTE</div>
    <div class="field">
      <span class="field-label">Nombre:</span>
      <span class="field-value">${incident.contact_name}</span>
    </div>
    <div class="field">
      <span class="field-label">Estado:</span>
      <span class="field-value">
        <span class="status-badge" style="${incident.status === 'resuelto' ? 'background: #d1fae5; color: #065f46;' : incident.status === 'en_reparacion' ? 'background: #dbeafe; color: #1e40af;' : 'background: #fef3c7; color: #92400e;'}">
          ${STATUS_CONFIG[incident.status]?.label || incident.status}
        </span>
      </span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔧 EQUIPO / MÁQUINA</div>
    <div class="field">
      <span class="field-label">Tipo:</span>
      <span class="field-value">${incident.equipment_type}</span>
    </div>
    <div class="field">
      <span class="field-label">Marca:</span>
      <span class="field-value">${incident.equipment_brand || '-'}</span>
    </div>
    <div class="field">
      <span class="field-label">Modelo:</span>
      <span class="field-value">${incident.equipment_model || '-'}</span>
    </div>
    <div class="field">
      <span class="field-label">Nº Serie:</span>
      <span class="field-value">${incident.serial_number || '-'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">⚠️ DESCRIPCIÓN DEL PROBLEMA</div>
    <div class="field">
      <span class="field-label">Tipo de avería:</span>
      <span class="field-value">${FAILURE_TYPES.find(f => f.value === incident.failure_type)?.label || incident.failure_type}</span>
    </div>
    <div class="field">
      <span class="field-label">Descripción:</span>
      <span class="field-value">${incident.description || '-'}</span>
    </div>
    <div class="field">
      <span class="field-label">Diagnóstico:</span>
      <span class="field-value">${incident.diagnosis || '-'}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🔨 REPARACIÓN</div>
    <div class="field">
      <span class="field-label">Técnico asignado:</span>
      <span class="field-value">${incident.technician || '-'}</span>
    </div>
    <div class="field">
      <span class="field-label">Fecha de reparación:</span>
      <span class="field-value">${incident.repair_date ? format(new Date(incident.repair_date), 'dd/MM/yyyy', { locale: es }) : '-'}</span>
    </div>
    <div class="field">
      <span class="field-label">Horas de trabajo:</span>
      <span class="field-value">${incident.repair_hours || 0} horas</span>
    </div>
    <div class="field">
      <span class="field-label">Solución aplicada:</span>
      <span class="field-value">${incident.solution || '-'}</span>
    </div>
  </div>

  ${incident.notes ? `
  <div class="section">
    <div class="section-title">📝 NOTAS ADICIONALES</div>
    <div class="field">
      <span class="field-value">${incident.notes}</span>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">📅 FECHAS</div>
    <div class="field">
      <span class="field-label">Fecha de reporte:</span>
      <span class="field-value">${format(new Date(incident.failure_date), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
    </div>
    ${incident.repair_date ? `
    <div class="field">
      <span class="field-label">Fecha de resolución:</span>
      <span class="field-value">${format(new Date(incident.repair_date), 'dd/MM/yyyy', { locale: es })}</span>
    </div>
    ` : ''}
  </div>

  <div class="signature-area">
    <div class="signature">
      <div style="padding-top: 10px;">Firma Técnico</div>
    </div>
    <div class="signature">
      <div style="padding-top: 10px;">Firma Cliente</div>
    </div>
  </div>

  <div class="footer">
    <p>Documento generado automáticamente por sistema de gestión de incidencias</p>
    <p>Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-incidencia-${incident.id?.substring(0, 8)}.html`;
    a.click();
  };

  if (loading) return <div className="p-4 text-center">Cargando...</div>;

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
          <AlertCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gestión de Incidencias</h1>
          <p className="text-sm text-gray-500">Registra, asigna y sigue el estado de averías y reparaciones</p>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="bg-gray-50">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <label className="text-xs text-gray-600 font-semibold mb-1 block">Filtrar por cliente</label>
              <Select value={selectedContact} onValueChange={handleSelectContact}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos los clientes</SelectItem>
                  {contacts.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.surname || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <label className="text-xs text-gray-600 font-semibold mb-1 block">Estado</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-48">
              <label className="text-xs text-gray-600 font-semibold mb-1 block">Buscar</label>
              <Input
                placeholder="Cliente, equipo, descripción..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-white"
              />
            </div>
            <Button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-red-600 hover:bg-red-700">
              <Plus className="w-4 h-4 mr-2" /> Nueva Incidencia
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulario */}
      {showForm && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{editingId ? '✏️ Editar' : '➕ Nueva'} Incidencia</CardTitle>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Cliente *</label>
                <Select value={form.contact_id} onValueChange={v => {
                  const c = contacts.find(x => x.id === v);
                  setForm(f => ({ ...f, contact_id: v, contact_name: c ? `${c.name} ${c.surname || ''}` : '' }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {contacts.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} {c.surname || ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo equipo</label>
                <Input value={form.equipment_type} onChange={e => setForm({...form, equipment_type: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Marca</label>
                <Input value={form.equipment_brand} onChange={e => setForm({...form, equipment_brand: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Modelo</label>
                <Input value={form.equipment_model} onChange={e => setForm({...form, equipment_model: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Nº Serie</label>
                <Input value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Fecha avería</label>
                <Input type="date" value={form.failure_date} onChange={e => setForm({...form, failure_date: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo avería</label>
                <Select value={form.failure_type} onValueChange={v => setForm({...form, failure_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FAILURE_TYPES.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Estado</label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Técnico</label>
                <Select value={form.technician} onValueChange={v => setForm({...form, technician: v})}>
                  <SelectTrigger><SelectValue placeholder="Asignar técnico" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Sin asignar</SelectItem>
                    {technicians.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Fecha reparación</label>
                <Input type="date" value={form.repair_date} onChange={e => setForm({...form, repair_date: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Horas trabajo</label>
                <Input type="number" value={form.repair_hours} onChange={e => setForm({...form, repair_hours: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Descripción *</label>
                <Textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Diagnóstico</label>
                <Textarea value={form.diagnosis} onChange={e => setForm({...form, diagnosis: e.target.value})} rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Solución</label>
                <Textarea value={form.solution} onChange={e => setForm({...form, solution: e.target.value})} rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Notas adicionales</label>
                <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSaveIncident} className="bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" /> Guardar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de incidencias */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">{filteredIncidents.length} incidencias encontradas</h2>
        </div>
        {filteredIncidents.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">Sin incidencias registradas</p>
            </CardContent>
          </Card>
        ) : (
          filteredIncidents.map(incident => {
            const statusConfig = STATUS_CONFIG[incident.status] || {};
            return (
              <Card key={incident.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-wrap justify-between items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{incident.contact_name}</h3>
                        <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
                        <span className="text-xs text-gray-500">{incident.equipment_brand} {incident.equipment_model}</span>
                      </div>
                      <p className="text-sm text-gray-700">{incident.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {format(new Date(incident.failure_date), 'dd/MM/yyyy', { locale: es })}
                        </span>
                        {incident.technician && (
                          <span className="flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> {incident.technician}
                          </span>
                        )}
                        {incident.repair_date && (
                          <span className="text-green-700 font-semibold">
                            Reparado: {format(new Date(incident.repair_date), 'dd/MM/yyyy', { locale: es })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => downloadIncidentReport(incident)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditIncident(incident)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteIncident(incident.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}