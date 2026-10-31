import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Wrench, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { uploadImage } from '@/lib/uploadImage';
import FormularioMaquina, { prepararMaquina } from '@/components/maquinas/FormularioMaquina';
import { MAQUINA_VACIA } from '@/lib/maquinaFgas';

const MACHINE_TYPES = [
  { value: 'aire_acondicionado', label: 'Aire Acondicionado' },
  { value: 'bomba_calor', label: 'Bomba de Calor' },
  { value: 'camara_frigorifica', label: 'Cámara Frigorífica' },
  { value: 'ventilacion', label: 'Ventilación/Climatización' },
  { value: 'caldera', label: 'Caldera' },
  { value: 'aerotermia', label: 'Aerotermia' },
  { value: 'solar_fotovoltaico', label: 'Solar Fotovoltaico' },
  { value: 'solar_termico', label: 'Solar Térmico' },
  { value: 'electrico_cuadro', label: 'Cuadro Eléctrico' },
  { value: 'grupo_frio', label: 'Grupo de Frío Industrial' },
  { value: 'otro', label: 'Otro' },
];

const STATUS_COLORS = {
  operativo: 'bg-green-100 text-green-700',
  en_reparacion: 'bg-orange-100 text-orange-700',
  fuera_servicio: 'bg-red-100 text-red-700',
  baja: 'bg-gray-100 text-gray-500',
};


const EMPTY_MACHINE = { ...MAQUINA_VACIA };
const EMPTY_LOG = { date: format(new Date(), 'yyyy-MM-dd'), type: 'mantenimiento', technician: '', description: '', cost: '' };

export default function ClientMachineTab({ contactId, contactName }) {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_MACHINE);
  const [expandedLog, setExpandedLog] = useState(null);
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [logMachine, setLogMachine] = useState(null);
  const [logForm, setLogForm] = useState(EMPTY_LOG);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    load();
  }, [contactId]);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.ClientMachine.filter({ contact_id: contactId });
    setMachines(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_MACHINE);
    setDialogOpen(true);
  };

  const openEdit = (m) => {
    setEditing(m);
    setForm({ ...EMPTY_MACHINE, ...m });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('El nombre del equipo es obligatorio'); return; }
    const data = { ...prepararMaquina(form), contact_id: contactId, contact_name: contactName };
    if (editing) {
      await base44.entities.ClientMachine.update(editing.id, data);
      toast.success('Equipo actualizado');
    } else {
      await base44.entities.ClientMachine.create(data);
      toast.success('Equipo añadido');
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este equipo?')) return;
    await base44.entities.ClientMachine.delete(id);
    setMachines(machines.filter(m => m.id !== id));
    toast.success('Equipo eliminado');
  };

  const openAddLog = (machine) => {
    setLogMachine(machine);
    setLogForm(EMPTY_LOG);
    setLogDialogOpen(true);
  };

  const saveLog = async () => {
    if (!logForm.description) { toast.error('Describe el trabajo realizado'); return; }
    const newLog = { ...logForm, cost: parseFloat(logForm.cost) || 0 };
    const updatedLog = [...(logMachine.maintenance_log || []), newLog];
    await base44.entities.ClientMachine.update(logMachine.id, { maintenance_log: updatedLog });
    setLogDialogOpen(false);
    toast.success('Registro añadido al libro');
    load();
  };

  const deleteLog = async (machine, idx) => {
    const updatedLog = machine.maintenance_log.filter((_, i) => i !== idx);
    await base44.entities.ClientMachine.update(machine.id, { maintenance_log: updatedLog });
    load();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const file_url = await uploadImage(file);
      setForm(prev => ({ ...prev, photo_url: file_url }));
    } catch (err) {
      toast.error('Error al subir la foto. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) return <p className="text-center text-gray-400 py-6 text-sm">Cargando equipos...</p>;

  return (
    <div className="space-y-3 mt-2">
      <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={openNew}>
        <Plus className="w-4 h-4 mr-1" />Añadir equipo
      </Button>

      {machines.length === 0 && (
        <div className="text-center py-10 text-gray-400">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay equipos registrados para este cliente</p>
        </div>
      )}

      {machines.map(m => (
        <Card key={m.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Foto */}
              <div className="w-14 h-14 rounded-lg bg-slate-100 border flex items-center justify-center overflow-hidden flex-shrink-0">
                {m.photo_url ? (
                  <img src={m.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Wrench className="w-6 h-6 text-slate-300" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{m.name}</p>
                  <Badge className={`text-[10px] ${STATUS_COLORS[m.status]}`}>{m.status?.replace(/_/g,' ')}</Badge>
                  <Badge variant="outline" className="text-[10px]">{MACHINE_TYPES.find(t=>t.value===m.machine_type)?.label || m.machine_type}</Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {m.brand && <span>🏷 {m.brand} {m.model}</span>}
                  {m.serial_number && <span>S/N: {m.serial_number}</span>}
                  {m.location && <span>📍 {m.location}</span>}
                  {m.power_kw && <span>⚡ {m.power_kw} kW</span>}
                  {m.refrigerant_type && <span>❄️ {m.refrigerant_type}</span>}
                  {m.installation_date && <span>📅 Inst: {m.installation_date}</span>}
                  {m.next_maintenance_date && <span className="text-orange-600 font-medium">🔧 Próx: {m.next_maintenance_date}</span>}
                  {m.warranty_expiry && <span>🛡 Garantía hasta: {m.warranty_expiry}</span>}
                </div>
                {m.notes && <p className="text-xs text-gray-400 mt-1 italic">{m.notes}</p>}
              </div>

              <div className="flex flex-col gap-1 flex-shrink-0">
                <button onClick={() => openEdit(m)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(m.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Libro de mantenimiento */}
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <button
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
                  onClick={() => setExpandedLog(expandedLog === m.id ? null : m.id)}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Libro de mantenimiento ({m.maintenance_log?.length || 0} registros)
                  {expandedLog === m.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <button
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100"
                  onClick={() => openAddLog(m)}
                >
                  <Plus className="w-3 h-3" />Añadir registro
                </button>
              </div>

              {expandedLog === m.id && (
                <div className="space-y-1">
                  {(!m.maintenance_log || m.maintenance_log.length === 0) && (
                    <p className="text-xs text-gray-400 text-center py-2">Sin registros aún</p>
                  )}
                  {(m.maintenance_log || []).slice().reverse().map((log, idx) => {
                    const realIdx = (m.maintenance_log.length - 1) - idx;
                    return (
                      <div key={idx} className="bg-gray-50 rounded-lg p-2 text-xs border border-gray-100 flex items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-700">{log.date}</span>
                            <Badge variant="outline" className="text-[9px] py-0">{log.type}</Badge>
                            {log.technician && <span className="text-gray-500">👷 {log.technician}</span>}
                            {log.cost > 0 && <span className="text-green-700 font-medium">{log.cost.toFixed(2)} €</span>}
                          </div>
                          <p className="text-gray-600 mt-0.5">{log.description}</p>
                        </div>
                        <button onClick={() => deleteLog(m, realIdx)} className="text-red-300 hover:text-red-500 flex-shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Dialog crear/editar equipo */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar equipo' : 'Nuevo equipo'}{contactName ? ` — ${contactName}` : ''}</DialogTitle>
          </DialogHeader>
          <FormularioMaquina form={form} setForm={setForm} onFoto={handlePhotoUpload} subiendo={uploading} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700">{editing ? 'Actualizar equipo' : 'Guardar equipo'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog añadir registro al libro */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-md" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>📖 Añadir registro — {logMachine?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500">Fecha</label>
                <Input type="date" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Tipo</label>
                <Select value={logForm.type} onValueChange={v => setLogForm({...logForm, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mantenimiento">Mantenimiento preventivo</SelectItem>
                    <SelectItem value="reparacion">Reparación</SelectItem>
                    <SelectItem value="revision">Revisión</SelectItem>
                    <SelectItem value="instalacion">Instalación / Puesta en marcha</SelectItem>
                    <SelectItem value="recarga_gas">Recarga de gas</SelectItem>
                    <SelectItem value="limpieza">Limpieza</SelectItem>
                    <SelectItem value="urgencia">Urgencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input placeholder="Técnico responsable" value={logForm.technician} onChange={e => setLogForm({...logForm, technician: e.target.value})} />
            <textarea className="w-full border border-input rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring" placeholder="Descripción del trabajo realizado *" value={logForm.description} onChange={e => setLogForm({...logForm, description: e.target.value})} rows={3} />
            <Input type="number" placeholder="Coste (€)" value={logForm.cost} onChange={e => setLogForm({...logForm, cost: e.target.value})} />
            <Button onClick={saveLog} className="w-full bg-teal-600 hover:bg-teal-700">
              Guardar en el libro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}